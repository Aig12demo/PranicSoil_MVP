import { useState, useEffect } from 'react';
import { X, Mic, AlertCircle, Info } from 'lucide-react';
import { DynamicAvatar } from './DynamicAvatar';
import { useElevenLabsAgent } from '../hooks/useElevenLabsAgent';
import { getBrowserInstructions } from '../utils/mediaPermissions';

interface VoiceAgentProps {
  onClose?: () => void;
  contextType?: 'public' | 'authenticated';
  userId?: string | null;
}

export function VoiceAgent({ onClose, contextType = 'public', userId = null }: VoiceAgentProps) {
  // 🚨 DEBUG: Log component props on every render
  console.log(`%c🎭 VoiceAgent Component Rendered`, 'background: #ff00ff; color: #fff; font-weight: bold; padding: 4px 8px;');
  console.log(`   contextType: ${contextType}`);
  console.log(`   userId: ${userId}`);
  console.log(`   onClose: ${typeof onClose}`);
  
  const [isStarted, setIsStarted] = useState(false);
  const [showPermissionRequest, setShowPermissionRequest] = useState(true);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [wasConnected, setWasConnected] = useState(false);
  const { status, volume, isConnected, connect, disconnect, error: agentError } = useElevenLabsAgent();

  // Track if we ever successfully connected
  useEffect(() => {
    if (isConnected) {
      setWasConnected(true);
    }
  }, [isConnected]);

  // Log helpful reminder on mount
  useEffect(() => {
    console.log('%c🎤 Voice Agent Component MOUNTED', 'font-size: 16px; font-weight: bold; color: #10b981; background: #000; padding: 4px;');
    console.log(`   Context: ${contextType}, UserId: ${userId}`);
    console.log('%cWatch this console for detailed connection info!', 'color: #6b7280;');
    console.log('%cIf the connection closes quickly, look for "🔌 Close code" and "Close reason" messages', 'color: #6b7280;');
    
    return () => {
      console.log('%c🎤 Voice Agent Component UNMOUNTING', 'font-size: 16px; font-weight: bold; color: #ff0000; background: #000; padding: 4px;');
      console.log(`   Was using context: ${contextType}`);
    };
  }, [contextType, userId]);

  const handleRequestPermission = async () => {
    setShowPermissionRequest(false);
    setIsStarted(true);
    const result = await connect(contextType, userId);

    if (result === false) {
      setIsStarted(false);
    }
  };

  const handleTryAgain = async () => {
    setShowPermissionHelp(false);
    setIsStarted(true);
    const result = await connect(contextType, userId);

    if (result === false) {
      setIsStarted(false);
    }
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

  useEffect(() => {
    if (agentError && agentError.includes('PERMISSION_DENIED')) {
      setShowPermissionHelp(true);
      setShowPermissionRequest(false);
    }
  }, [agentError]);

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

          {!isStarted && showPermissionRequest && (
            <div className="w-full mb-8">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-12 h-12 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {contextType === 'public'
                    ? 'Start a voice conversation to learn about our services for gardeners, farmers, and ranchers.'
                    : 'Your AI advisor has access to your profile and can provide personalized recommendations.'}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-blue-900 font-semibold mb-2">Microphone Access Required</p>
                    <p className="text-blue-800 text-sm mb-4">
                      This voice conversation feature needs access to your microphone. When you click "Allow Microphone Access" below, your browser will ask for permission.
                    </p>
                    <p className="text-blue-700 text-sm">
                      Your privacy is important - we only access your microphone during active voice conversations.
                    </p>
                  </div>
                </div>
              </div>
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

            {status === 'idle' && wasConnected && isStarted && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-900 font-semibold mb-1">Connection Closed</p>
                    <p className="text-yellow-800 text-sm mb-3">
                      The voice conversation ended unexpectedly. This usually happens due to timeout settings.
                    </p>
                    <p className="text-yellow-700 text-sm">
                      Check the browser console (F12) for details, or try speaking sooner after clicking "Allow Microphone Access".
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && errorDetails && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-900 font-semibold mb-1">{errorDetails.title}</p>
                    <p className="text-red-800 text-sm mb-3">{errorDetails.message}</p>
                    {errorDetails.showHelp && !showPermissionHelp && (
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
                    <p className="text-blue-900 font-semibold mb-2">Enable Microphone in Browser Settings</p>
                    <p className="text-blue-800 text-sm mb-3">
                      It looks like microphone access was blocked. You can enable it in your browser settings.
                    </p>
                    <p className="text-blue-800 text-sm mb-1 font-medium">Instructions for {browserInfo.browser}:</p>
                    <p className="text-blue-800 text-sm mb-4">{browserInfo.instructions}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleTryAgain}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => setShowPermissionHelp(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
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
            {!isStarted && showPermissionRequest ? (
              <button
                onClick={handleRequestPermission}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg flex items-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Allow Microphone Access
              </button>
            ) : isStarted && isConnected ? (
              <button
                onClick={handleStop}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg"
              >
                End Conversation
              </button>
            ) : isStarted && wasConnected && !isConnected ? (
              <button
                onClick={handleRequestPermission}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg flex items-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Try Again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
