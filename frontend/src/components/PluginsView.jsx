import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { PLUGIN_ICONS, PLUGIN_ACCENT } from '../data/assistants';
import { Loader2, Check, Plug } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function PluginsView() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/plugins');
      setPlugins(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (p) => {
    setPendingId(p.id);
    try {
      // Real Google OAuth
      if (p.id === 'google' && p.status !== 'connected') {
        const { data } = await api.get('/auth/google/start');
        const popup = window.open(data.auth_url, 'google-oauth', 'width=520,height=640');
        // poll until popup closes, then refresh
        const timer = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(timer);
            await load();
            setPendingId(null);
          }
        }, 800);
        return;
      }
      const action = p.status === 'connected' ? 'disconnect' : 'connect';
      await api.post('/plugins/toggle', { plugin_id: p.id, plugin_name: p.name, action });
      toast({
        title: action === 'connect' ? `${p.name} connected` : `${p.name} disconnected`,
        description: action === 'connect' ? 'Jarvis can now use this tool.' : '',
      });
      await load();
    } catch (e) {
      toast({ title: 'Failed', variant: 'destructive' });
    } finally {
      if (p.id !== 'google' || p.status === 'connected') setPendingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <Plug className="w-6 h-6 text-slate-900" />
          <h1 className="text-[28px] font-semibold text-slate-900">Plugins</h1>
        </div>
        <p className="text-slate-500 mb-8">Connect the apps Wingman should work with.</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center p-2.5"
                    style={{ background: (PLUGIN_ACCENT[p.id] || '#0f172a') + '14' }}
                  >
                    {PLUGIN_ICONS[p.id] ? (
                      <img
                        src={PLUGIN_ICONS[p.id]}
                        alt=""
                        className="w-full h-full object-contain"
                        style={{
                          filter: `brightness(0) saturate(100%) invert(0)`,
                        }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Plug className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-[12px] text-slate-500">{p.description}</div>
                  </div>
                  {p.status === 'connected' && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggle(p)}
                  disabled={pendingId === p.id}
                  className={`w-full h-10 rounded-lg text-[13px] font-medium transition-colors ${
                    p.status === 'connected'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  } disabled:opacity-60`}
                >
                  {pendingId === p.id ? 'Working...' : p.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
