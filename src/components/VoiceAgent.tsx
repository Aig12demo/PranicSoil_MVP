import { useState, useEffect } from 'react';
import { X, Mic, AlertCircle, Info } from 'lucide-react';
import { DynamicAvatar } from './DynamicAvatar';
import { useElevenLabsAgent } from '../hooks/useElevenLabsAgent';
import { checkMicrophonePermission, getBrowserInstructions } from '../utils/mediaPermissions';

interface VoiceAgentProps {
  onClose?: () => void;
  contextType?: 'public' | 'authenticated';
  userId?: string | null;
}

export function VoiceAgent({ onClose, contextType = 'public', userId = null }: VoiceAgentProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const { status, volume, isConnected, connect, disconnect, error: agentError } = useElevenLabsAgent();

  const handleStart = async () => {
    const permissionCheck = await checkMicrophonePermission();

    if (permissionCheck.status === 'unsupported') {
      return;
    }

    if (permissionCheck.status === 'denied') {
      setShowPermissionHelp(true);
      return;
    }

    setIsStarted(true);
    await connect(contextType, userId);
  };

  const handleStop = () => {
    disconnect();
    setIsStarted(false);
  };

  useEffect(() => {
    const checkPermission = async () => {
      const result = await checkMicrophonePermission();
      setPermissionChecked(true);
      if (result.status === 'denied' && result.error) {
        setShowPermissionHelp(true);
      }
    };
    checkPermission();

    return () => {
      disconnect();
    };
  }, [disconnect]);

  const getErrorDetails = (error: string | null) => {
    if (!error) return null;

    if (error.includes('PERMISSION_DENIED')) {
      return {
        title: 'Microphone Access Denied',
        message: error.split(': ')[1] || error,
        showHelp: true,
      };
    }

    if (error.includes('NO_MICROPHONE')) {
      return {
        title: 'No Microphone Found',
        message: error.split(': ')[1] || error,
        showHelp: false,
      };
    }

    if (error.includes('MICROPHONE_BUSY')) {
      return {
        title: 'Microphone In Use',
        message: error.split(': ')[1] || error,
        showHelp: false,
      };
    }

    if (error.includes('UNSUPPORTED_BROWSER')) {
      return {
        title: 'Browser Not Supported',
        message: error.split(': ')[1] || error,
        showHelp: false,
      };
    }

    if (error.includes('INSECURE_CONTEXT')) {
      return {
        title: 'Secure Connection Required',
        message: error.split(': ')[1] || error,
        showHelp: false,
      };
    }

    return {
      title: 'Connection Error',
      message: error,
      showHelp: false,
    };
  };

  const errorDetails = getErrorDetails(agentError);
  const browserInfo = getBrowserInstructions();

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
              <DynamicAvatar
                status={status === 'connected' ? 'listening' : status as 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error'}
                volume={volume}
              />
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

            {status === 'error' && errorDetails && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-900 font-semibold mb-1">{errorDetails.title}</p>
                    <p className="text-red-800 text-sm mb-3">{errorDetails.message}</p>
                    {errorDetails.showHelp && (
                      <button
                        onClick={() => setShowPermissionHelp(true)}
                        className="text-red-700 text-sm underline hover:text-red-900"
                      >
                        How do I enable microphone access?
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showPermissionHelp && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-blue-900 font-semibold mb-2">Enable Microphone Access in {browserInfo.browser}</p>
                    <p className="text-blue-800 text-sm mb-3">{browserInfo.instructions}</p>
                    <p className="text-blue-800 text-sm mb-3">
                      After enabling microphone access, refresh this page and try again.
                    </p>
                    <button
                      onClick={() => setShowPermissionHelp(false)}
                      className="text-blue-700 text-sm font-medium hover:text-blue-900"
                    >
                      Got it
                    </button>
                  </div>
                </div>
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
                disabled={!permissionChecked}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Mic className="w-5 h-5" />
                {permissionChecked ? 'Start Voice Conversation' : 'Checking permissions...'}
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
