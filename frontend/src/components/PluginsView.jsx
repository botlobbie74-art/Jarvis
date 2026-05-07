import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { PLUGIN_ICONS, PLUGIN_ACCENT } from '../data/assistants';
import { Loader2, Check, Plug, X as XIcon } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function PluginsView() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [waModal, setWaModal] = useState(null); // {qr, status}
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
        const timer = setInterval(async () => {
          if (popup?.closed) { clearInterval(timer); await load(); setPendingId(null); }
        }, 800);
        return;
      }
      // WhatsApp QR flow
      if (p.id === 'whatsapp' && p.status !== 'connected') {
        await api.post('/whatsapp/start');
        setWaModal({ qr: null, status: 'init' });
        // poll status until ready
        const timer = setInterval(async () => {
          try {
            const { data } = await api.get('/whatsapp/status');
            setWaModal({ qr: data.qr, status: data.status });
            if (data.status === 'connected') { clearInterval(timer); setWaModal(null); await load(); setPendingId(null); toast({ title: 'WhatsApp connected' }); }
          } catch (_) {}
        }, 2000);
        return;
      }
      if (p.id === 'whatsapp' && p.status === 'connected') {
        await api.post('/whatsapp/logout');
        await load(); setPendingId(null);
        toast({ title: 'WhatsApp disconnected' });
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
      toast({ title: 'Failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
    } finally {
      if (p.id !== 'google' && p.id !== 'whatsapp') setPendingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <Plug className="w-6 h-6 text-slate-900" />
          <h1 className="text-[28px] font-semibold text-slate-900">Plugins</h1>
        </div>
        <p className="text-slate-500 mb-8">Connect the apps Jarvis should work with.</p>

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

      {/* WhatsApp QR modal */}
      {waModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-slate-900">Connect WhatsApp</h3>
              <button onClick={() => { setWaModal(null); setPendingId(null); }} className="text-slate-400 hover:text-slate-900">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[13px] text-slate-600 mb-4">
              Open WhatsApp on your phone → Settings → Linked devices → Link a device → scan the QR below.
            </p>
            <div className="flex items-center justify-center bg-slate-50 rounded-xl p-6 min-h-[280px]">
              {waModal.qr ? (
                <img src={waModal.qr} alt="QR code" className="w-64 h-64" />
              ) : (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
                  <div className="text-[13px] text-slate-500">Initializing WhatsApp session...</div>
                </div>
              )}
            </div>
            <div className="text-center mt-3 text-[11px] text-slate-500">Status: {waModal.status}</div>
          </div>
        </div>
      )}
    </div>
  );
}
