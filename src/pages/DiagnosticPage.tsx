import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw } from 'lucide-react';

export function DiagnosticPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: any = {};

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      diagnostics.session = {
        exists: !!session,
        user_id: session?.user?.id,
        email: session?.user?.email,
        error: sessionError?.message
      };

      if (session?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        diagnostics.profile = {
          found: !!profileData,
          data: profileData,
          error: profileError ? {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code
          } : null
        };

        if (profileData) {
          const { data: farmData, error: farmError } = await supabase
            .from('farms')
            .select('*')
            .eq('profile_id', profileData.id)
            .maybeSingle();

          diagnostics.farm = {
            found: !!farmData,
            data: farmData,
            error: farmError ? {
              message: farmError.message,
              details: farmError.details,
              hint: farmError.hint,
              code: farmError.code
            } : null
          };
        }
      }

      const { count: profileCount, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      diagnostics.profileCount = {
        count: profileCount,
        error: countError?.message
      };

    } catch (err) {
      diagnostics.unexpectedError = err instanceof Error ? err.message : String(err);
    }

    setResults(diagnostics);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">System Diagnostics</h1>

        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="mb-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Run Diagnostics
            </>
          )}
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
