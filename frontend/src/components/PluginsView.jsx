import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { PLUGIN_ICONS, PLUGIN_ACCENT } from '../data/assistants';
import { Loader2, Check, Plug, X as XIcon, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../context/ThemeContext';
import { t } from '../lib/i18n';

export default function PluginsView() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'telegram', ... }
  const { toast } = useToast();
  const { theme } = useTheme();
  const dark = theme === 'dark';

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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: 'Copied!', description: 'Paste it in the bot chat.' })
    );
  };

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

      // Real GitHub OAuth
      if (p.id === 'github' && p.status !== 'connected') {
        const { data } = await api.get('/auth/github/start');
        const popup = window.open(data.auth_url, 'github-oauth', 'width=520,height=640');
        const timer = setInterval(async () => {
          if (popup?.closed) { clearInterval(timer); await load(); setPendingId(null); }
        }, 800);
        return;
      }

      // Telegram — show connect modal
      if (p.id === 'telegram' && p.status !== 'connected') {
        const { data } = await api.get('/plugins/telegram/link-code');
        setModal({ type: 'telegram', code: data.code, botUsername: data.bot_username });
        setPendingId(null);
        const timer = setInterval(async () => {
          const res = await api.get('/plugins/telegram/status').catch(() => null);
          if (res?.data?.status === 'connected') {
            clearInterval(timer);
            setModal(null);
            await load();
            toast({ title: 'Telegram connected! 🎉', description: 'You can now message Jarvis on Telegram.' });
          }
        }, 2000);
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
      if (!['google', 'telegram'].includes(p.id)) setPendingId(null);
      else if (p.id === 'google') { /* handled in callback */ }
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto ${dark ? 'bg-[#0a0a0c]' : 'bg-white'}`}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <Plug className={`w-6 h-6 ${dark ? 'text-white' : 'text-slate-900'}`} />
          <h1 className={`text-[28px] font-[900] tracking-tighter ${dark ? 'text-white' : 'text-slate-900'}`}>{t('plugins_title')}</h1>
        </div>
        <p className={`${dark ? 'text-white/40' : 'text-slate-500'} mb-8`}>{t('plugins_desc')}</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className={`w-6 h-6 animate-spin ${dark ? 'text-white/30' : 'text-slate-200'}`} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.map((p) => (
              <div key={p.id} className={`rounded-2xl border transition-all ${dark ? 'bg-white/5 border-white/10 hover:bg-white/[0.07]' : 'bg-slate-50 border-slate-200 hover:shadow-md'}`}>
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center p-2.5"
                      style={{ background: (PLUGIN_ACCENT[p.id] || '#ffffff') + '20' }}
                    >
                      {PLUGIN_ICONS[p.id] ? (
                        <img
                          src={PLUGIN_ICONS[p.id]}
                          alt=""
                          className="w-full h-full object-contain"
                          style={{ filter: dark ? 'brightness(0) invert(1)' : 'none' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <Plug className={`w-5 h-5 ${dark ? 'text-white/50' : 'text-slate-400'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                      <div className={`text-[12px] ${dark ? 'text-white/50' : 'text-slate-500'}`}>{p.description}</div>
                    </div>
                    {p.status === 'connected' && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  {p.id === 'telegram' && p.status !== 'connected' && (
                    <div className={`mb-3 px-2 py-1.5 rounded-lg border ${dark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-100 text-cyan-600'}`}>
                      <p className="text-[11px]">
                        💬 Message Jarvis directly from Telegram
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => toggle(p)}
                    disabled={pendingId === p.id}
                    className={`w-full h-10 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60 ${
                      p.status === 'connected'
                        ? dark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        : dark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {pendingId === p.id ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working...</span>
                    ) : p.status === 'connected' ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Telegram Connect Modal */}
      {modal?.type === 'telegram' && (
        <div className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${dark ? 'bg-black/70' : 'bg-slate-900/40'}`}>
          <div className={`border rounded-2xl p-6 max-w-md w-full ${dark ? 'bg-[#111114] border-white/10' : 'bg-white border-slate-200 shadow-2xl'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-[18px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>Connect Telegram</h3>
              <button onClick={() => setModal(null)} className={`${dark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#26A5E4]/10 border border-[#26A5E4]/20 text-[#26A5E4] font-bold text-[14px]`}>
                <Sparkles className="w-4 h-4" /> Telegram Bot
              </div>
              
              <div className="space-y-2">
                <p className={`text-[15px] font-medium ${dark ? 'text-white/80' : 'text-slate-700'}`}>
                  Open the bot and send this code:
                </p>
                <div className="flex items-center justify-center gap-3">
                  <code className={`px-5 py-2.5 rounded-2xl text-[24px] font-mono font-bold tracking-[0.2em] shadow-xl ${dark ? 'bg-white text-black' : 'bg-slate-900 text-white'}`}>
                    {modal.code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(modal.code)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${dark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <a
                href={`https://t.me/${modal.botUsername}?start=${modal.code}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 h-12 rounded-full bg-[#26A5E4] hover:bg-[#2088bc] text-white font-bold text-[15px] transition-all shadow-lg shadow-[#26A5E4]/30"
              >
                Go to @{modal.botUsername} <ExternalLink className="w-4 h-4" />
              </a>

              <div className={`flex items-center justify-center gap-2 text-[13px] opacity-40 ${dark ? 'text-white' : 'text-slate-500'}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verification en cours...
              </div>
            </div>

            <p className={`text-[11px] mt-4 text-center ${dark ? 'text-white/30' : 'text-slate-400'}`}>
              After connecting, you can message Jarvis any time from Telegram.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

