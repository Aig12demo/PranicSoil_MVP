import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type AgentStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';

interface UseElevenLabsAgentReturn {
  status: AgentStatus;
  volume: number;
  isConnected: boolean;
  connect: (contextType: 'public' | 'authenticated', userId?: string | null) => Promise<boolean>;
  disconnect: () => void;
  error: string | null;
}

// 🔒 GLOBAL SINGLETON: Prevent multiple voice agents from running simultaneously
let globalActiveConnection: WebSocket | null = null;
let globalConnectionContext: string | null = null;
let globalHookInstanceId: string | null = null;
let globalConnectionLock: boolean = false; // Prevents concurrent connection attempts
let globalLockAcquiredAt: number = 0; // Timestamp when lock was acquired

export function useElevenLabsAgent(): UseElevenLabsAgentReturn {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [volume, setVolume] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate TRULY unique instance ID (timestamp + random for guaranteed uniqueness)
  const instanceIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const volumeIntervalRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Log instance creation ONCE on mount (not on every render)
  useEffect(() => {
    console.log(`%c🆔 Hook instance MOUNTED: [${instanceIdRef.current}]`, 'background: #222; color: #bada55; font-weight: bold; padding: 2px 4px;');
    console.log(`🌍 Global lock status: ${globalConnectionLock ? '🔒 LOCKED' : '🔓 UNLOCKED'}`);
    console.log(`🌍 Global active instance: ${globalHookInstanceId ? `[${globalHookInstanceId}]` : 'None'}`);
    console.log(`🌍 Global connection exists: ${globalActiveConnection ? 'YES' : 'NO'}`);
    
    // Cleanup on unmount
    return () => {
      console.log(`%c💀 Hook instance UNMOUNTING: [${instanceIdRef.current}]`, 'background: #ff0000; color: #fff; font-weight: bold; padding: 2px 4px;');
      // Force cleanup if this is the active instance
      if (globalHookInstanceId === instanceIdRef.current) {
        console.log(`🚨 [${instanceIdRef.current}] Was active - forcing cleanup on unmount`);
        if (globalActiveConnection) {
          try {
            globalActiveConnection.close();
          } catch (e) {
            console.error('Error closing on unmount:', e);
          }
        }
        globalActiveConnection = null;
        globalConnectionContext = null;
        globalHookInstanceId = null;
        globalConnectionLock = false;
        globalLockAcquiredAt = 0;
      }
    };
  }, []);

  const playAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    // 🔧 Prevent duplicate playback
    if (isPlayingRef.current) {
      console.warn('⚠️ Already playing audio, skipping duplicate chunk');
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      // 🔧 Handle PCM 16-bit audio from ElevenLabs (most common format)
      const sampleRate = 24000; // ElevenLabs typically uses 24kHz
      const pcm16 = new Int16Array(audioData);
      
      // Create audio buffer
      const audioBuffer = audioContextRef.current.createBuffer(1, pcm16.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      
      // Convert Int16 to Float32 for Web Audio API
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        isPlayingRef.current = false;
        setStatus('listening');
        setVolume(0);
        playNextChunk();
      };

      setStatus('speaking');
      isPlayingRef.current = true;

      const simulateVolume = () => {
        if (isPlayingRef.current) {
          setVolume(Math.random() * 0.5 + 0.3);
        }
      };
      volumeIntervalRef.current = window.setInterval(simulateVolume, 100);

      source.start(0);
      console.log('🔊 Playing audio chunk (single playback path)');
    } catch (err) {
      console.error('Error playing PCM audio, trying alternative decode:', err);
      // Try alternative: decode as regular audio format
      try {
        const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        source.onended = () => {
          isPlayingRef.current = false;
          setStatus('listening');
          setVolume(0);
          playNextChunk();
        };

        setStatus('speaking');
        isPlayingRef.current = true;

        const simulateVolume = () => {
          if (isPlayingRef.current) {
            setVolume(Math.random() * 0.5 + 0.3);
          }
        };
        volumeIntervalRef.current = window.setInterval(simulateVolume, 100);

        source.start(0);
        console.log('🔊 Playing audio chunk (alternative decode)');
      } catch (err2) {
        console.error('Error with alternative audio decode:', err2);
        isPlayingRef.current = false;
        playNextChunk();
      }
    }
  }, []);

  const playNextChunk = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
      const nextChunk = audioQueueRef.current.shift();
      if (nextChunk) {
        playAudioChunk(nextChunk);
      }
    }
  }, [playAudioChunk]);

  const connect = useCallback(async (contextType: 'public' | 'authenticated', _userId?: string | null): Promise<boolean> => {
    try {
      console.log(`%c🚨 [${instanceIdRef.current}] CONNECT CALLED`, 'background: #ff6600; color: #fff; font-weight: bold; padding: 2px 4px;');
      
      // Add a tiny random delay (0-50ms) to prevent race conditions from React StrictMode double-mounting
      const randomDelay = Math.random() * 50;
      console.log(`   Waiting ${randomDelay.toFixed(1)}ms before lock check (race prevention)...`);
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      
      console.log(`   Context: ${contextType}, UserId: ${_userId}`);
      console.log(`   Current lock status: ${globalConnectionLock ? '🔒 LOCKED' : '🔓 UNLOCKED'}`);
      console.log(`   Current global instance: ${globalHookInstanceId || 'None'}`);
      console.log(`   Lock acquired at: ${globalLockAcquiredAt}`);
      
      // 🔒 CONNECTION LOCK with race condition protection
      const now = Date.now();
      const lockAge = now - globalLockAcquiredAt;
      
      // If lock is held and was acquired recently (< 10 seconds), block this attempt
      if (globalConnectionLock && lockAge < 10000) {
        console.log(`%c🚫 [${instanceIdRef.current}] BLOCKED - Lock held by [${globalHookInstanceId}] for ${lockAge}ms`, 'background: #ff0000; color: #fff; font-weight: bold; padding: 4px 8px;');
        return false;
      }
      
      // If lock is stale (>10 seconds), force release it
      if (globalConnectionLock && lockAge >= 10000) {
        console.warn(`⚠️ [${instanceIdRef.current}] Stale lock detected (${lockAge}ms old), forcing release`);
        globalConnectionLock = false;
      }
      
      // Acquire the lock with timestamp
      globalConnectionLock = true;
      globalLockAcquiredAt = now;
      console.log(`%c🔐 [${instanceIdRef.current}] ACQUIRED CONNECTION LOCK at ${now}`, 'background: #00ff00; color: #000; font-weight: bold; padding: 2px 4px;');
      
      // 🔒 SINGLETON CHECK: Close any other active global connection
      if (globalActiveConnection && globalHookInstanceId !== instanceIdRef.current) {
        console.warn(`⚠️ [${instanceIdRef.current}] Closing previous global connection from [${globalHookInstanceId}] (Context: ${globalConnectionContext})`);
        try {
          globalActiveConnection.close();
        } catch (e) {
          console.error('Error closing previous global connection:', e);
        }
        globalActiveConnection = null;
        globalConnectionContext = null;
        globalHookInstanceId = null;
      }
      
      // Validate context matches user state
      if (contextType === 'authenticated' && !_userId) {
        console.error(`❌ [${instanceIdRef.current}] BLOCKED: Cannot use authenticated agent without userId`);
        throw new Error('Authenticated context requires userId');
      }
      
      if (contextType === 'public' && _userId) {
        console.warn(`⚠️ [${instanceIdRef.current}] WARNING: Public agent being used with userId - this should not happen`);
      }
      
      // Clean up any existing connection first
      if (wsRef.current) {
        console.log(`⚠️ [${instanceIdRef.current}] Closing existing WebSocket connection before creating new one`);
        wsRef.current.close();
        wsRef.current = null;
      }
      
      cleanup();
      
      setStatus('connecting');
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('UNSUPPORTED_BROWSER: Your browser does not support microphone access. Please use Chrome, Firefox, Safari, or Edge.');
      }

      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('INSECURE_CONTEXT: Microphone access requires HTTPS or localhost.');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            throw new Error('PERMISSION_DENIED: Microphone access was denied. Please click "Allow" when your browser asks for permission, or enable it in your browser settings.');
          }
          if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            throw new Error('NO_MICROPHONE: No microphone found. Please connect a microphone and try again.');
          }
          if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            throw new Error('MICROPHONE_BUSY: Your microphone is being used by another application. Please close other applications and try again.');
          }
          throw new Error(`MICROPHONE_ERROR: ${err.message}`);
        }
        throw new Error('MICROPHONE_ERROR: Failed to access microphone.');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Debug logging
      console.log('🔍 Debug: Supabase URL:', supabaseUrl);
      console.log('🔍 Debug: Function URL:', `${supabaseUrl}/functions/v1/elevenlabs-agent`);
      console.log('🔍 Debug: Context type:', contextType);
      console.log('🔍 Debug: User ID:', _userId);
      console.log('🔍 Debug: IS AUTHENTICATED:', contextType === 'authenticated');
      console.log('🔍 Debug: IS PUBLIC:', contextType === 'public');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey, // Required for Supabase Edge Functions
      };

      // 🔑 Supabase requires Authorization header - use appropriate token
      if (contextType === 'authenticated') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('🔍 Debug: Using authenticated session with access token');
        } else {
          console.warn('⚠️ Authenticated context requested but no session found!');
          throw new Error('Authentication required but no valid session');
        }
      } else {
        // Public access - use anon key (required by Supabase)
        headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
        console.log('🔍 Debug: Public access - using anon key');
      }

      console.log('🔍 Debug: Calling edge function...');
      const response = await fetch(
        `${supabaseUrl}/functions/v1/elevenlabs-agent`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            action: 'get-signed-url',
            contextType: contextType // ✅ Explicitly tell edge function which context
          }),
        }
      );

      if (!response.ok) {
        console.error('❌ Debug: Response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Debug: Raw error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.error('❌ Debug: Error data:', errorData);
          throw new Error(errorData.error || `Failed to get signed URL (${response.status})`);
        } catch (e) {
          console.error('❌ Debug: Could not parse error as JSON');
          throw new Error(`Failed to get signed URL (${response.status}): ${errorText}`);
        }
      }

      console.log('✅ Debug: Got response from edge function');
      const responseData = await response.json();
      console.log('📦 Response data:', responseData);
      
      const { signed_url, session_id, conversation_context, context_type } = responseData;
      sessionIdRef.current = session_id;
      startTimeRef.current = Date.now();

      console.log('🔍 Server confirmed context type:', context_type);
      console.log('🔍 Conversation context from server:', conversation_context);

      const connectionId = Math.random().toString(36).substring(7);
      console.log(`🔗 [${instanceIdRef.current}] Creating WebSocket connection [${connectionId}] for context: ${context_type}`);
      
      const ws = new WebSocket(signed_url);
      wsRef.current = ws;
      
      // 🔒 Register with global singleton
      globalActiveConnection = ws;
      globalConnectionContext = context_type;
      globalHookInstanceId = instanceIdRef.current;
      console.log(`🔒 [${instanceIdRef.current}] Registered as global active connection (Context: ${context_type})`);

      ws.onopen = () => {
        console.log(`✅ [${instanceIdRef.current}] WebSocket connected to ElevenLabs [${connectionId}] - Context: ${context_type}`);
        
        // 🔓 Release connection lock on successful connection
        globalConnectionLock = false;
        console.log(`🔓 [${instanceIdRef.current}] Released connection lock`);
        
        setStatus('connected');
        setIsConnected(true);
        
        // ElevenLabs requires an initial configuration message
        // Note: Cannot override prompt - must be configured in ElevenLabs dashboard
        const initMessage = {
          type: 'conversation_initiation_client_data',
          conversation_config_override: {}
        };
        
        console.log('📤 Sending init message to ElevenLabs:', initMessage);
        console.log('💡 Note: Configure agent prompt in ElevenLabs dashboard');
        console.log('💡 Suggested prompt:', conversation_context);
        ws.send(JSON.stringify(initMessage));
        
        startAudioStreaming(stream, ws);
      };

      ws.onmessage = async (event) => {
        try {
          if (event.data instanceof Blob) {
            const arrayBuffer = await event.data.arrayBuffer();
            audioQueueRef.current.push(arrayBuffer);
            playNextChunk();
          } else {
            const message = JSON.parse(event.data);
            console.log('📨 ElevenLabs message type:', message.type);
            
            // Log full message for important types
            if (['conversation_ended', 'conversation.ended', 'error', 'agent_response'].includes(message.type)) {
              console.log('📨 Full message:', message);
            }
            
            // Handle conversation initiation response
            if (message.type === 'conversation_initiation_metadata') {
              console.log('✅ Conversation initialized successfully');
              console.log('🔍 Agent ID being used (check this matches your ElevenLabs config):', message.conversation_id || 'N/A');
            }

            // 🔧 FIX: Handle ALL audio through the queue system to prevent duplication
            let audioData: ArrayBuffer | null = null;
            
            // Check agent_response first (most common format)
            if (message.type === 'agent_response' && message.agent_response_event?.audio_base_64) {
              console.log('💬 Agent is responding with audio');
              const audioBase64 = message.agent_response_event.audio_base_64;
              
              // Decode base64 to binary
              const binaryString = atob(audioBase64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              audioData = bytes.buffer;
              setStatus('speaking');
            }
            // Check audio event (alternative format)
            else if (message.type === 'audio' || message.audio_event?.audio_base_64) {
              console.log(`🔊 Received audio message [${connectionId}] - Context: ${context_type}`);
              const audioBase64 = message.audio_event?.audio_base_64 || message.audio_base_64;
              
              if (audioBase64) {
                console.log('🔊 Decoding audio, length:', audioBase64.length);
                
                // Decode base64 to binary (PCM 16-bit)
                const binaryString = atob(audioBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                audioData = bytes.buffer;
              }
            }
            
            // 🔧 Add audio to queue if found (only one path, no duplication)
            if (audioData) {
              console.log('🔊 Adding audio chunk to queue (single playback path)');
              audioQueueRef.current.push(audioData);
              playNextChunk();
              if (status !== 'speaking') {
                setStatus('speaking');
              }
            }

            // Handle text response from agent (no audio, just text)
            if (message.type === 'agent_chat_response_part') {
              const textContent = message.text_response_part?.text || '';
              console.log('💬 Agent text response:', textContent);
              if (!isPlayingRef.current && status !== 'speaking') {
                setStatus('speaking');
              }
            }
            
            // Handle user transcript (confirmation your speech was heard)
            if (message.type === 'user_transcript') {
              const transcript = message.user_transcription_event?.user_transcript || '';
              console.log('🎤 Your speech:', transcript);
            }

            // Handle ping/pong
            if (message.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong', event_id: message.ping_event.event_id }));
            }

            if (message.type === 'interruption') {
              console.log('🔄 Agent interrupted');
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              if (audioContextRef.current) {
                await audioContextRef.current.close();
                audioContextRef.current = null;
              }
              setStatus('listening');
              setVolume(0);
            }

            if (message.type === 'conversation_ended' || message.type === 'conversation.ended') {
              console.error('🛑 CONVERSATION ENDED BY ELEVENLABS!');
              console.error('🛑 Full message:', JSON.stringify(message, null, 2));
              console.error('🛑 This is an ElevenLabs agent configuration issue!');
              console.error('🛑 Check your agent settings for timeout values');
            }

            if (message.type === 'error') {
              console.error('❌ ElevenLabs error:', message);
            }
          }
        } catch (err) {
          console.error('Error processing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error(`❌ [${instanceIdRef.current}] WebSocket error:`, err);
        
        // 🔓 Release connection lock on error
        if (globalConnectionLock) {
          globalConnectionLock = false;
          console.log(`🔓 [${instanceIdRef.current}] Released connection lock (WebSocket error)`);
        }
        
        setError('Connection error occurred');
        setStatus('error');
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed [${connectionId}] - Context: ${context_type}`);
        console.log('🔌 Close code:', event.code);
        console.log('🔌 Close reason:', event.reason || 'No reason provided');
        console.log('🔌 Was clean:', event.wasClean);
        
        if (event.code === 1000) {
          console.log('✅ Normal closure');
        } else if (event.code === 1006) {
          console.log('⚠️ Abnormal closure - connection lost');
        } else {
          console.log('⚠️ Unexpected closure code');
        }
        
        setIsConnected(false);
        setStatus('idle');
        cleanup();
      };

      return true;
    } catch (err) {
      // 🔓 Release connection lock on error
      globalConnectionLock = false;
      console.log(`🔓 [${instanceIdRef.current}] Released connection lock (error case)`);
      
      console.error('❌ Connection error:', err);
      console.error('❌ Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Failed to connect',
        stack: err instanceof Error ? err.stack : undefined
      });
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      setStatus('error');
      cleanup();
      return false;
    }
  }, [playNextChunk]);

  const startAudioStreaming = (stream: MediaStream, ws: WebSocket) => {
    // Create separate audio context for recording (don't reuse playback context)
    if (!recordingAudioContextRef.current) {
      recordingAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000, // ElevenLabs expects 16kHz
      });
    }
    
    const audioContext = recordingAudioContextRef.current;
    
    // Resume context if suspended (important for Chrome)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    // Store references to prevent garbage collection
    mediaStreamSourceRef.current = source;
    audioProcessorRef.current = processor;
    
    let chunkCount = 0;
    
    processor.onaudioprocess = (e) => {
      chunkCount++;
      
      // Log first chunk to confirm processor is working
      if (chunkCount === 1) {
        console.log('🎤 First audio chunk captured! Processor is working!');
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (PCM 16-bit)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // ElevenLabs expects audio in JSON message format with base64
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        const audioMessage = {
          user_audio_chunk: base64Audio
        };
        
        ws.send(JSON.stringify(audioMessage));
        
        // Log every 50th chunk to avoid spam
        if (chunkCount % 50 === 0) {
          console.log(`🎤 Sent ${chunkCount} audio chunks, WebSocket state: ${ws.readyState}`);
        }
      } else {
        if (chunkCount % 50 === 0) {
          console.warn(`⚠️ Audio chunk ${chunkCount} NOT sent - WebSocket not open (state: ${ws.readyState})`);
        }
      }
    };
    
    source.connect(processor);
    
    // Must connect to destination for processor to work, but keep it silent
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, audioContext.currentTime); // Completely mute
    processor.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    console.log('🎤 Audio streaming started (PCM 16-bit, 16kHz, JSON format)');
    console.log('🎤 Audio context state:', audioContext.state);
    console.log('🎤 Microphone muted (gain = 0) - you will NOT hear yourself');
    console.log('🎤 Waiting for first audio chunk...');
    setStatus('listening');
  };

  const cleanup = () => {
    console.log(`🧹 [${instanceIdRef.current}] Cleanup called`);
    
    // 🔒 Clear global singleton if we own it
    if (globalHookInstanceId === instanceIdRef.current) {
      console.log(`🔓 [${instanceIdRef.current}] Clearing global active connection and releasing lock`);
      globalActiveConnection = null;
      globalConnectionContext = null;
      globalHookInstanceId = null;
      globalConnectionLock = false;
      globalLockAcquiredAt = 0;
    }
    
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    // Disconnect audio processor and source
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }

    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (recordingAudioContextRef.current) {
      recordingAudioContextRef.current.close();
      recordingAudioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setVolume(0);
  };

  const disconnect = useCallback(async () => {
    console.log(`🔌 [${instanceIdRef.current}] Disconnect called`);
    
    if (sessionIdRef.current && startTimeRef.current) {
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const { data: { session } } = await supabase.auth.getSession();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        };

        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        } else {
          headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
        }

        await fetch(
          `${supabaseUrl}/functions/v1/elevenlabs-agent`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              action: 'end-conversation',
              session_id: sessionIdRef.current,
              duration_seconds: durationSeconds,
            }),
          }
        );
      } catch (err) {
        console.error('Error ending conversation:', err);
      }
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanup();
    setIsConnected(false);
    setStatus('idle');
    sessionIdRef.current = null;
    startTimeRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    volume,
    isConnected,
    connect,
    disconnect,
    error,
  };
}
