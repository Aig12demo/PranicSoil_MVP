import { useState, useEffect, useRef } from 'react';
import { Send, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { VoiceAgent } from './VoiceAgent';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  profileId?: string;
  isAdminView?: boolean;
}

export function ChatInterface({ profileId, isAdminView }: ChatInterfaceProps = {}) {
  const { profile } = useAuth();
  const targetProfileId = profileId || profile?.id;
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (isAdminView && targetProfileId) {
      loadChatHistory();
    } else {
      setMessages([
        {
          id: '1',
          type: 'assistant',
          content: `Hello ${profile?.full_name || 'there'}! I'm your AI agricultural consultant. I have access to your profile as a ${profile?.role} and can help you with personalized advice about soil health, crop planning, and best practices for your operation. What would you like to discuss today?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isAdminView, targetProfileId]);

  const loadChatHistory = async () => {
    if (!targetProfileId) return;

    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('profile_id', targetProfileId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setChatHistory(data);
      const historyMessages: Message[] = data.map((msg) => ({
        id: msg.id,
        type: msg.message_type as 'user' | 'assistant',
        content: msg.message_content,
        timestamp: new Date(msg.created_at),
      }));
      setMessages(historyMessages);
    }
  };
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const responseText = `This is a placeholder response. In production, this would be connected to an AI service that has context about your ${profile?.role} operation, your uploaded documents, and our agricultural knowledge base. I would provide personalized advice based on your specific situation.`;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdminView ? 'Chat History' : 'AI Assistant'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isAdminView 
              ? 'View customer chat history' 
              : `Get personalized advice for your ${profile?.role} operation`}
          </p>
        </div>
        {!isAdminView && (
          <button
            onClick={() => setShowVoiceAgent(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            title="Start voice call with AI advisor"
          >
            <Phone className="w-4 h-4" />
            Voice Call
          </button>
        )}
      </div>


      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-4 py-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-green-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-3 rounded-lg">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {!isAdminView && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send
              </button>
            </div>
          </div>
        )}
        {isAdminView && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              Admin view mode - Chat history is read-only
            </p>
          </div>
        )}
      </div>

      {showVoiceAgent && (
        <VoiceAgent 
          onClose={() => setShowVoiceAgent(false)}
          contextType="authenticated"
          userId={profile?.user_id || null}
        />
      )}
    </div>
  );
}
