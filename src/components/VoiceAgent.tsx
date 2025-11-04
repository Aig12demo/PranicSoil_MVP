import { useState, useEffect } from 'react';
import { X, Mic } from 'lucide-react';
import { DynamicAvatar } from './DynamicAvatar';
import { useElevenLabsAgent } from '../hooks/useElevenLabsAgent';

interface VoiceAgentProps {
  onClose?: () => void;
  contextType?: 'public' | 'authenticated';
  userId?: string | null;
}

export function VoiceAgent({ onClose, contextType = 'public', userId = null }: VoiceAgentProps) {
  const [isStarted, setIsStarted] = useState(false);
  const { status, volume, isConnected, connect, disconnect, error: agentError } = useElevenLabsAgent();

  const handleStart = async () => {
    await connect(contextType, userId);
    setIsStarted(true);
  };

  const handleStop = () => {
    disconnect();
    setIsStarted(false);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}

        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {contextType === 'public' ? 'Talk to Pranic Soil' : 'AI Agricultural Advisor'}
          </h2>
          <p className="text-gray-600 mb-4 text-center">
            {contextType === 'public'
              ? 'Have a conversation about our services and how we can help you'
              : 'Get personalized advice for your farming operation'}
          </p>

          {!isStarted && (
            <div className="w-full mb-8 text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-12 h-12 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                {contextType === 'public'
                  ? 'Start a voice conversation to learn about our services for gardeners, farmers, and ranchers.'
                  : 'Your AI advisor has access to your profile and can provide personalized recommendations.'}
              </p>
            </div>
          )}

          {isStarted && (
            <div className="mb-8">
              <DynamicAvatar status={status} volume={volume} />
            </div>
          )}

          <div className="w-full space-y-4">
            {status === 'connecting' && (
              <div className="text-center">
                <p className="text-gray-600">Connecting to ElevenLabs...</p>
              </div>
            )}

            {status === 'connected' && (
              <div className="text-center">
                <p className="text-green-600 font-medium flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                  Connected! Agent is ready
                </p>
              </div>
            )}

            {status === 'listening' && (
              <div className="text-center">
                <p className="text-green-600 font-medium flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                  Listening... Speak now
                </p>
              </div>
            )}

            {status === 'speaking' && (
              <div className="text-center">
                <p className="text-blue-600 font-medium flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  Agent is speaking...
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <p className="text-red-600 font-medium">
                  Error: {agentError || 'Connection failed'}
                </p>
              </div>
            )}

            {isConnected && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Connected:</strong> {contextType === 'public'
                    ? 'Ask me anything about Pranic Soil services!'
                    : 'I have access to your profile and am ready to provide personalized advice.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-8">
            {!isStarted ? (
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg flex items-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Start Voice Conversation
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
              >
                End Conversation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
