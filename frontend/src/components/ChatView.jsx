import React, { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { ASSISTANTS } from '../data/assistants';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const BotAvatar = ({ size = 40, color = '#7CFFB2' }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <rect x="15" y="15" width="70" height="60" rx="18" fill="#0b0f17" />
    <rect x="45" y="75" width="10" height="10" fill="#0b0f17" />
    <circle cx="38" cy="45" r="6" fill={color} />
    <circle cx="62" cy="45" r="6" fill={color} />
  </svg>
);

export default function ChatView({ sessionId, assistantId, onAssistantChange, onNewChat, onSessionUpdated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const { toast } = useToast();

  const assistant = ASSISTANTS.find((a) => a.id === assistantId) || ASSISTANTS[0];

  useEffect(() => {
    if (!sessionId) { setMessages([]); return; }
    setLoading(true);
    api.get(`/chat/sessions/${sessionId}/messages`)
      .then((r) => setMessages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (e) => {
    e?.preventDefault?.();
    if (!input.trim() || sending) return;
    let sid = sessionId;
    if (!sid) {
      // create new session implicitly
      const { data } = await api.post('/chat/sessions', null, { params: { assistant_id: assistantId } });
      sid = data.id;
      onSessionUpdated?.();
    }
    const userMsg = {
      id: 'tmp-' + Date.now(),
      session_id: sid,
      role: 'user',
      content: input,
      assistant_id: assistantId,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    const prompt = input;
    setInput('');
    setSending(true);
    try {
      const { data } = await api.post('/chat/send', { session_id: sid, message: prompt, assistant_id: assistantId });
      setMessages((m) => [...m, data]);
      onSessionUpdated?.();
    } catch (err) {
      toast({ title: 'Failed to send', description: err?.response?.data?.detail || 'try again', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!sessionId && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-white to-cyan-50/40">
        <header className="px-8 py-5 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <BotAvatar size={36} />
            <div>
              <div className="text-[15px] font-semibold text-slate-900">{assistant.name}</div>
              <div className="text-[12px]" style={{ color: assistant.color }}>{assistant.role}</div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <BotAvatar size={90} />
          <h2 className="mt-6 text-[28px] font-semibold text-slate-900">How can I help you today?</h2>
          <p className="text-slate-500 mt-1">Pick an assistant and start a conversation.</p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-3xl">
            {ASSISTANTS.map((a) => (
              <button
                key={a.id}
                onClick={() => { onAssistantChange(a.id); onNewChat(a.id); }}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border border-slate-200 transition-all text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                  style={{ background: a.bg }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: a.color }} />
                </div>
                <div className="text-[14px] font-semibold text-slate-900">{a.name}</div>
                <div className="text-[12px]" style={{ color: a.color }}>{a.role}</div>
              </button>
            ))}
          </div>
        </div>
        <ChatComposer input={input} setInput={setInput} send={send} sending={sending} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-white to-cyan-50/40">
      <header className="px-8 py-4 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: assistant.bg }}
          >
            <BotAvatar size={28} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-slate-900">{assistant.name}</div>
            <div className="text-[12px]" style={{ color: assistant.color }}>{assistant.role}</div>
          </div>
          <select
            value={assistantId}
            onChange={(e) => onAssistantChange(e.target.value)}
            className="text-[13px] bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none"
          >
            {ASSISTANTS.map((a) => (
              <option key={a.id} value={a.id}>{a.name} · {a.role}</option>
            ))}
          </select>
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {loading && (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div
                className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: assistant.bg }}
              >
                <BotAvatar size={26} />
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-slate-900 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex gap-3 justify-start">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: assistant.bg }}
            >
              <BotAvatar size={26} />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 text-[14px]">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <ChatComposer input={input} setInput={setInput} send={send} sending={sending} />
    </div>
  );
}

const ChatComposer = ({ input, setInput, send, sending }) => (
  <form onSubmit={send} className="p-4 border-t border-slate-200 bg-white">
    <div className="max-w-3xl mx-auto flex items-end gap-2 bg-slate-100 rounded-2xl px-4 py-2">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); }
        }}
        placeholder="Ask anything... (Shift+Enter for newline)"
        rows={1}
        className="flex-1 bg-transparent outline-none resize-none text-[14px] text-slate-800 placeholder:text-slate-400 py-2 max-h-40"
      />
      <button
        type="submit"
        disabled={sending || !input.trim()}
        className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center disabled:opacity-40 transition-colors"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  </form>
);
