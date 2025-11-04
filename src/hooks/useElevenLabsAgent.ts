import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type AgentStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';

interface UseElevenLabsAgentReturn {
  status: AgentStatus;
  volume: number;
  isConnected: boolean;
  connect: (contextType: 'public' | 'authenticated', userId?: string | null) => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

export function useElevenLabsAgent(): UseElevenLabsAgentReturn {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [volume, setVolume] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const volumeIntervalRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const playAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

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
    } catch (err) {
      console.error('Error playing audio:', err);
      isPlayingRef.current = false;
      playNextChunk();
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

  const connect = useCallback(async (contextType: 'public' | 'authenticated', userId?: string | null) => {
    try {
      setStatus('connecting');
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (contextType === 'authenticated') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/elevenlabs-agent`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'get-signed-url' }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get signed URL');
      }

      const { signed_url, session_id } = await response.json();
      sessionIdRef.current = session_id;
      startTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ws = new WebSocket(signed_url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to ElevenLabs');
        setStatus('connected');
        setIsConnected(true);
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
            console.log('ElevenLabs message:', message);

            if (message.type === 'interruption') {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              if (audioContextRef.current) {
                await audioContextRef.current.close();
                audioContextRef.current = null;
              }
              setStatus('listening');
              setVolume(0);
            }
          }
        } catch (err) {
          console.error('Error processing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error occurred');
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setStatus('idle');
        cleanup();
      };

    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setStatus('error');
    }
  }, [playNextChunk]);

  const startAudioStreaming = (stream: MediaStream, ws: WebSocket) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    };

    mediaRecorder.start(100);
    setStatus('listening');
  };

  const cleanup = () => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setVolume(0);
  };

  const disconnect = useCallback(async () => {
    if (sessionIdRef.current && startTimeRef.current) {
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
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
