import { useState, useEffect, useRef, useCallback } from 'react';

type AgentStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';

interface UseElevenLabsAgentReturn {
  status: AgentStatus;
  volume: number;
  isConnected: boolean;
  connect: (agentId: string) => Promise<void>;
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

  const connect = useCallback(async (agentId: string) => {
    try {
      setStatus('connecting');
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/elevenlabs-agent?action=get-signed-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ agentId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get signed URL');
      }

      const { signed_url } = await response.json();

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

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanup();
    setIsConnected(false);
    setStatus('idle');
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
