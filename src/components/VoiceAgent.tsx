import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DynamicAvatar } from './DynamicAvatar';
import { useElevenLabsAgent } from '../hooks/useElevenLabsAgent';

interface VoiceAgentProps {
  onClose?: () => void;
}

export function VoiceAgent({ onClose }: VoiceAgentProps) {
  const [agentId, setAgentId] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const { status, volume, isConnected, connect, disconnect, error: agentError } = useElevenLabsAgent();

  const handleStart = async () => {
    if (!agentId.trim()) {
      return;
    }
    await connect(agentId.trim());
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ElevenLabs Voice Agent</h2>
          <p className="text-gray-600 mb-4 text-center">
            Connect to your ElevenLabs conversational AI agent
          </p>

          {!isStarted && (
            <div className="w-full mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent ID
              </label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Enter your ElevenLabs Agent ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-gray-500">
                Find your Agent ID in the ElevenLabs dashboard
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
                  <strong>Connected:</strong> Your ElevenLabs agent is active and listening for agricultural consultation requests.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-8">
            {!isStarted ? (
              <button
                onClick={handleStart}
                disabled={!agentId.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Start Conversation
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
