import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { PLUGIN_ICONS, PLUGIN_ACCENT } from '../data/assistants';
import { Loader2, Check, Plug, X as XIcon, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function PluginsView() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'telegram'|'slack'|'notion', ... }
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

      // Slack — show token entry modal
      if (p.id === 'slack' && p.status !== 'connected') {
        setModal({ type: 'slack', token: '' });
        setPendingId(null);
        return;
      }

      // Notion — show token entry modal
      if (p.id === 'notion' && p.status !== 'connected') {
        setModal({ type: 'notion', token: '' });
        setPendingId(null);
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
      if (!['google', 'telegram', 'slack', 'notion'].includes(p.id)) setPendingId(null);
      else if (p.id === 'google') { /* handled in callback */ }
    }
  };

  const connectSlack = async () => {
    if (!modal?.token?.trim()) return;
    try {
      await api.post('/plugins/slack/connect', { bot_token: modal.token.trim() });
      setModal(null);
      await load();
      toast({ title: 'Slack connected! 🎉', description: 'Jarvis can now send messages to your Slack.' });
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
    }
  };

  const connectNotion = async () => {
    if (!modal?.token?.trim()) return;
    try {
      await api.post('/plugins/notion/connect', { api_key: modal.token.trim() });
      setModal(null);
      await load();
      toast({ title: 'Notion connected! 🎉', description: 'Jarvis can now read and write your Notion pages.' });
    } catch (e) {
      toast({ title: 'Failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0c]">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <Plug className="w-6 h-6 text-white" />
          <h1 className="text-[28px] font-semibold text-white">Plugins</h1>
        </div>
        <p className="text-white/50 mb-8">Connect the apps Jarvis should work with.</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.map((p) => (
              <div key={p.id} className="bg-white/5 rounded-2xl border border-white/10 p-5 hover:bg-white/[0.07] transition-all">
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
                        style={{ filter: 'brightness(0) invert(1)' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Plug className="w-5 h-5 text-white/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-[12px] text-white/50">{p.description}</div>
                  </div>
                  {p.status === 'connected' && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>

                {/* Special badge for Telegram */}
                {p.id === 'telegram' && p.status !== 'connected' && (
                  <div className="mb-3 px-2 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <p className="text-[11px] text-cyan-400">
                      💬 Message Jarvis directly from Telegram
                    </p>
                  </div>
                )}

                {/* Special badge for Slack */}
                {p.id === 'slack' && p.status !== 'connected' && (
                  <div className="mb-3 px-2 py-1.5 rounded-lg bg-[#4A154B]/30 border border-[#4A154B]/40">
                    <p className="text-[11px] text-purple-300">
                      🔔 Let Jarvis send notifications to your Slack
                    </p>
                  </div>
                )}

                {/* Special badge for Notion */}
                {p.id === 'notion' && p.status !== 'connected' && (
                  <div className="mb-3 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-[11px] text-white/60">
                      📝 Let Jarvis read and update your Notion pages
                    </p>
                  </div>
                )}

                <button
                  onClick={() => toggle(p)}
                  disabled={pendingId === p.id}
                  className={`w-full h-10 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60 ${
                    p.status === 'connected'
                      ? 'bg-white/10 hover:bg-white/15 text-white'
                      : 'bg-white text-slate-900 hover:bg-white/90'
                  }`}
                >
                  {pendingId === p.id ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working...</span>
                  ) : p.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Telegram Connect Modal */}
      {modal?.type === 'telegram' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-semibold text-white">Connect Telegram</h3>
              <button onClick={() => setModal(null)} className="text-white/40 hover:text-white">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#26A5E4]/10 border border-[#26A5E4]/20">
                <div className="w-8 h-8 rounded-full bg-[#26A5E4] flex items-center justify-center text-white font-bold text-sm">1</div>
                <div>
                  <div className="text-white text-[13px] font-medium">Open Jarvis Bot on Telegram</div>
                  <a
                    href={`https://t.me/${modal.botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#26A5E4] text-[12px] flex items-center gap-1 hover:underline"
                  >
                    @{modal.botUsername} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">2</div>
                <div className="flex-1">
                  <div className="text-white text-[13px] font-medium mb-1">Send this code to the bot</div>
                  <div className="flex items-center gap-2">
                    <code className="bg-black/40 text-cyan-400 px-3 py-1.5 rounded-lg text-[15px] font-mono tracking-widest">
                      {modal.code}
                    </code>
                    <button
                      onClick={() => copyToClipboard(modal.code)}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                      <Copy className="w-3.5 h-3.5 text-white/60" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">3</div>
                <div className="text-white/60 text-[13px]">
                  Waiting for verification… <Loader2 className="w-3.5 h-3.5 animate-spin inline ml-1" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-white/30 mt-4 text-center">
              After connecting, you can message Jarvis any time from Telegram.
            </p>
          </div>
        </div>
      )}

      {/* Slack Connect Modal */}
      {modal?.type === 'slack' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-semibold text-white">Connect Slack</h3>
              <button onClick={() => setModal(null)} className="text-white/40 hover:text-white">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#4A154B]/20 border border-[#4A154B]/30">
                <p className="text-[12px] text-purple-300">
                  Create a Slack app at <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="underline">api.slack.com/apps</a>, install it to your workspace, and paste the <strong>Bot User OAuth Token</strong> (starts with <code>xoxb-</code>) below.
                </p>
              </div>

              <div>
                <label className="text-[12px] text-white/60 mb-1 block">Bot OAuth Token</label>
                <input
                  type="password"
                  placeholder="xoxb-..."
                  value={modal.token}
                  onChange={(e) => setModal((m) => ({ ...m, token: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-[13px] outline-none focus:border-white/30 placeholder:text-white/20"
                />
              </div>
            </div>

            <button
              onClick={connectSlack}
              disabled={!modal.token?.trim()}
              className="w-full mt-4 h-10 rounded-lg bg-[#4A154B] hover:bg-[#611f69] text-white text-[13px] font-medium transition-colors disabled:opacity-40"
            >
              Connect Slack
            </button>
          </div>
        </div>
      )}

      {/* Notion Connect Modal */}
      {modal?.type === 'notion' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-semibold text-white">Connect Notion</h3>
              <button onClick={() => setModal(null)} className="text-white/40 hover:text-white">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[12px] text-white/60">
                  Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="underline text-white/80">notion.so/my-integrations</a>, create a new integration, and paste the <strong>Internal Integration Secret</strong> below.
                </p>
              </div>

              <div>
                <label className="text-[12px] text-white/60 mb-1 block">Integration Secret</label>
                <input
                  type="password"
                  placeholder="secret_..."
                  value={modal.token}
                  onChange={(e) => setModal((m) => ({ ...m, token: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-[13px] outline-none focus:border-white/30 placeholder:text-white/20"
                />
              </div>
            </div>

            <button
              onClick={connectNotion}
              disabled={!modal.token?.trim()}
              className="w-full mt-4 h-10 rounded-lg bg-white hover:bg-white/90 text-slate-900 text-[13px] font-medium transition-colors disabled:opacity-40"
            >
              Connect Notion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
