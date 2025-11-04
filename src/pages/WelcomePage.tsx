import { useState } from 'react';
import { MessageSquare, Sprout, Wheat, Mountain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VoiceAgent } from '../components/VoiceAgent';

export function WelcomePage() {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);

  const roles = [
    {
      id: 'gardener',
      title: 'Gardener',
      icon: Sprout,
      description: 'Home gardeners, community gardens, and urban farming',
      color: 'from-green-400 to-emerald-600',
    },
    {
      id: 'farmer',
      title: 'Farmer',
      icon: Wheat,
      description: 'Commercial farming operations and crop production',
      color: 'from-amber-400 to-orange-600',
    },
    {
      id: 'rancher',
      title: 'Rancher',
      icon: Mountain,
      description: 'Livestock operations and grazing management',
      color: 'from-red-400 to-rose-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/PRANIC SOIL Logo.png" alt="Pranic Soil" className="h-12" />
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Cultivate Healthy Soil, <br />
            <span className="text-green-600">Grow Thriving Microbiomes</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Expert agricultural consultation powered by AI. Get personalized advice for your
            gardens, farms, or ranches to build soil health from the ground up.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-700 border-2 border-green-600 rounded-lg hover:bg-green-50 font-medium transition-colors shadow-lg"
            >
              <MessageSquare className="w-5 h-5" />
              {showChat ? 'Hide Chat' : 'Chat with Us'}
            </button>
            <button
              onClick={() => setShowVoiceAgent(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-lg"
            >
              <MessageSquare className="w-5 h-5" />
              Try Voice Agent
            </button>
          </div>
        </section>

        {showChat && (
          <section className="mb-16 max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6">
            <div className="border-2 border-gray-200 rounded-lg p-4 h-96 flex items-center justify-center text-gray-500">
              <p>Chat interface coming soon - Ask about our services, pricing, and how we can help!</p>
            </div>
          </section>
        )}

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Choose Your Path
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Select your role to get started with personalized consultation services
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.id}
                  onClick={() => navigate(`/register?role=${role.id}`)}
                  className="bg-white rounded-2xl shadow-lg p-8 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group"
                >
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{role.title}</h3>
                  <p className="text-gray-600">{role.description}</p>
                  <div className="mt-6 text-green-600 font-medium flex items-center gap-2">
                    Get Started →
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-8">
            <div>
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Sign Up</h3>
              <p className="text-gray-600">Create your profile with details about your operation</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Consult</h3>
              <p className="text-gray-600">Chat with our AI assistant about your specific needs</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Grow</h3>
              <p className="text-gray-600">Implement recommendations and track your progress</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 Pranic Soil. All rights reserved.</p>
        </div>
      </footer>

      {showVoiceAgent && (
        <VoiceAgent
          onClose={() => setShowVoiceAgent(false)}
          contextType="public"
        />
      )}
    </div>
  );
}
