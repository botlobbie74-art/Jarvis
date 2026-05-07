import React, { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { Send, Loader2, Paperclip, X as XIcon, Hammer } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../context/ThemeContext';

const BotAvatar = ({ size = 40, dark = true }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <rect x="15" y="15" width="70" height="60" rx="18" fill={dark ? "#0b0f17" : "#f1f5f9"} />
    <rect x="45" y="75" width="10" height="10" fill={dark ? "#0b0f17" : "#f1f5f9"} />
    <circle cx="38" cy="45" r="6" fill="#22a3ff" />
    <circle cx="62" cy="45" r="6" fill="#22a3ff" />
  </svg>
);

export default function ChatView({ sessionId, onNewChat, onSessionUpdated, onOpenBuilder }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [builderAction, setBuilderAction] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  useEffect(() => {
    if (!sessionId) { setMessages([]); return; }
    setLoading(true);
    api.get(`/chat/sessions/${sessionId}/messages`)
      .then(({ data }) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const handleFileAttach = (e) => {
    const f = e.target.files?.[0];
    if (f) { setAttachedFile(f); toast({ title: `📎 ${f.name} attached` }); }
    e.target.value = '';
  };

  const send = async (e) => {
    e?.preventDefault();
    if (!input.trim() && !attachedFile) return;

    let sid = sessionId;
    if (!sid) {
      try {
        const { data } = await api.post('/chat/sessions', null, { params: { assistant_id: 'jarvis' } });
        sid = data.id;
        onSessionUpdated?.();
      } catch { return; }
    }

    let messageContent = input;
    if (attachedFile) messageContent = `[File: ${attachedFile.name}]\n${input}`;

    const userMsg = { id: 'tmp-' + Date.now(), session_id: sid, role: 'user', content: messageContent, assistant_id: 'jarvis', created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setAttachedFile(null);
    setSending(true);
    try {
      const { data } = await api.post('/chat/send', { session_id: sid, message: messageContent, assistant_id: 'jarvis' });

      // Check if the response contains a builder action
      if (data.builder_action) {
        setBuilderAction(data.builder_action);
      }

      setMessages((m) => [...m, data]);
      onSessionUpdated?.();
    } catch (err) {
      toast({ title: 'Failed to send', description: err?.response?.data?.detail || 'try again', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const dismissBuilderAction = () => setBuilderAction(null);

  const executeBuilderAction = () => {
    if (builderAction) {
      onOpenBuilder?.(builderAction);
      setBuilderAction(null);
    }
  };

  if (!sessionId && messages.length === 0) {
    return (
      <div className={`flex-1 flex flex-col ${dark ? 'bg-[#0a0a0c]' : 'bg-white'}`}>
        <header className={`px-8 py-5 border-b backdrop-blur flex items-center gap-3 ${dark ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-slate-50/50'}`}>
          <BotAvatar size={36} dark={dark} />
          <div>
            <div className={`text-[15px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>Jarvis</div>
            <div className="text-[12px] text-[#22a3ff]">Your autonomous AI engineer</div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <BotAvatar size={90} dark={dark} />
          <h2 className={`mt-6 text-[28px] font-semibold text-center ${dark ? 'text-white' : 'text-slate-900'}`}>What can I do for you today?</h2>
          <p className={`mt-2 text-center max-w-sm ${dark ? 'text-white/40' : 'text-slate-500'}`}>Ask me anything — I can build apps, write code, review your projects, or just chat.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              "Where is my project at?",
              "Build me a todo app",
              "Explain my latest project",
              "Add a feature to my app",
            ].map((s) => (
              <button key={s} onClick={() => setInput(s)} className={`px-4 py-2 rounded-full text-[13px] transition-colors border ${dark ? 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <ChatComposer input={input} setInput={setInput} send={send} sending={sending} attachedFile={attachedFile} onAttach={() => fileInputRef.current?.click()} onRemoveFile={() => setAttachedFile(null)} dark={dark} />
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${dark ? 'bg-[#0a0a0c]' : 'bg-white'}`}>
      <header className={`px-8 py-4 border-b backdrop-blur flex items-center gap-3 ${dark ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-slate-50/50'}`}>
        <BotAvatar size={32} dark={dark} />
        <div className="flex-1">
          <div className={`text-[15px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>Jarvis</div>
          <div className="text-[12px] text-[#22a3ff]">Your autonomous AI engineer</div>
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {loading && <div className="flex justify-center py-8"><Loader2 className={`w-5 h-5 animate-spin ${dark ? 'text-white/30' : 'text-slate-300'}`} /></div>}
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${dark ? 'bg-[#0d1a2b]' : 'bg-slate-100'}`}>
                <BotAvatar size={26} dark={dark} />
              </div>
            )}
            <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
              m.role === 'user'
                ? 'bg-[#22a3ff] text-white rounded-br-sm'
                : dark ? 'bg-white/5 border border-white/10 text-white/90 rounded-bl-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
            }`}>
              <div className="whitespace-pre-wrap">{m.role === 'assistant' ? (m.display_content || m.content) : m.content}</div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex gap-3 justify-start">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-[#0d1a2b]' : 'bg-slate-100'}`}><BotAvatar size={26} dark={dark} /></div>
            <div className={`rounded-2xl rounded-bl-sm px-4 py-3 ${dark ? 'bg-white/5 border border-white/10' : 'bg-slate-100'}`}>
              <div className="flex gap-1">
                <span className={`w-2 h-2 rounded-full animate-bounce ${dark ? 'bg-white/40' : 'bg-slate-400'}`} style={{ animationDelay: '0ms' }} />
                <span className={`w-2 h-2 rounded-full animate-bounce ${dark ? 'bg-white/40' : 'bg-slate-400'}`} style={{ animationDelay: '120ms' }} />
                <span className={`w-2 h-2 rounded-full animate-bounce ${dark ? 'bg-white/40' : 'bg-slate-400'}`} style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Builder action banner */}
        {builderAction && (
          <div className="flex justify-start">
            <div className={`border rounded-2xl rounded-bl-sm px-4 py-3 text-[13px] max-w-[70%] ${dark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Hammer className="w-3.5 h-3.5" />
                <span className="font-medium">Builder action ready</span>
              </div>
              <p className={`text-[12px] mb-3 ${dark ? 'text-white/60' : 'text-slate-600'}`}>{builderAction.description}</p>
              <div className="flex gap-2">
                <button onClick={executeBuilderAction} className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-[12px] font-medium rounded-lg transition-colors">
                  Open in Builder
                </button>
                <button onClick={dismissBuilderAction} className={`px-3 py-1.5 text-[12px] rounded-lg transition-colors ${dark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ChatComposer input={input} setInput={setInput} send={send} sending={sending} attachedFile={attachedFile} onAttach={() => fileInputRef.current?.click()} onRemoveFile={() => setAttachedFile(null)} dark={dark} />
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
    </div>
  );
}

const ChatComposer = ({ input, setInput, send, sending, attachedFile, onAttach, onRemoveFile, dark }) => (
  <form onSubmit={send} className={`p-4 border-t ${dark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white'}`}>
    {attachedFile && (
      <div className={`max-w-3xl mx-auto mb-2 flex items-center gap-2 px-3 py-2 border rounded-lg ${dark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
        <Paperclip className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
        <span className="text-[12px] truncate flex-1">{attachedFile.name}</span>
        <button type="button" onClick={onRemoveFile} className={`${dark ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}><XIcon className="w-3.5 h-3.5" /></button>
      </div>
    )}
    <div className={`max-w-3xl mx-auto flex items-end gap-2 border rounded-2xl px-4 py-2 ${dark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
      <button type="button" onClick={onAttach} title="Attach file" className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 mb-1 ${dark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'}`}>
        <Paperclip className="w-4 h-4" />
      </button>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
        placeholder="Ask Jarvis anything… (Shift+Enter for newline)"
        rows={1}
        className={`flex-1 bg-transparent outline-none resize-none text-[14px] py-2 max-h-40 ${dark ? 'text-white placeholder:text-white/30' : 'text-slate-800 placeholder:text-slate-400'}`}
      />
      <button type="submit" disabled={sending || !input.trim()} className="w-9 h-9 rounded-xl bg-[#22a3ff] hover:bg-[#1a8de8] text-white flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0 mb-1">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  </form>
);

