import React, { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { ASSISTANTS } from '../data/assistants';
import { Send, Loader2, Sparkles, Paperclip, X as XIcon } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const BotAvatar = ({ size = 40, color = '#7CFFB2' }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <rect x="15" y="15" width="70" height="60" rx="18" fill="#0b0f17" />
    <rect x="45" y="75" width="10" height="10" fill="#0b0f17" />
    <circle cx="38" cy="45" r="6" fill={color} />
    <circle cx="62" cy="45" r="6" fill={color} />
  </svg>
);

const DONNA_ID = 'donna';

export default function ChatView({ sessionId, assistantId, onAssistantChange, onNewChat, onSessionUpdated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const assistant = ASSISTANTS.find((a) => a.id === assistantId) || ASSISTANTS[0];
  const isDonna = assistantId === DONNA_ID;

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

  const handleFileAttach = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10 MB', variant: 'destructive' });
      return;
    }
    setAttachedFile(file);
    toast({ title: `📎 ${file.name} attached`, description: 'Will be sent with your next message.' });
  };

  const send = async (e) => {
    e?.preventDefault?.();
    if (!input.trim() || sending) return;
    let sid = sessionId;
    if (!sid) {
      const { data } = await api.post('/chat/sessions', null, { params: { assistant_id: assistantId } });
      sid = data.id;
      onSessionUpdated?.();
    }

    let messageContent = input;
    if (attachedFile) {
      messageContent = `[File: ${attachedFile.name}]\n${input}`;
    }

    const userMsg = {
      id: 'tmp-' + Date.now(),
      session_id: sid,
      role: 'user',
      content: messageContent,
      assistant_id: assistantId,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    const prompt = messageContent;
    setInput('');
    setAttachedFile(null);
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('session_id', sid);
      formData.append('message', prompt);
      formData.append('assistant_id', assistantId);
      if (attachedFile) formData.append('file', attachedFile);

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
      <div className="flex-1 flex flex-col bg-[#0a0a0c]">
        <header className="px-8 py-5 border-b border-white/10 bg-black/30 backdrop-blur">
          <div className="flex items-center gap-3">
            <BotAvatar size={36} />
            <div>
              <div className="text-[15px] font-semibold text-white">{assistant.name}</div>
              <div className="text-[12px]" style={{ color: assistant.color }}>{assistant.role}</div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <BotAvatar size={90} />
          <h2 className="mt-6 text-[28px] font-semibold text-white">What can I do for you today?</h2>
          <p className="text-white/40 mt-1">Choose an assistant and start a conversation.</p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-3xl">
            {ASSISTANTS.map((a) => (
              <button
                key={a.id}
                onClick={() => { onAssistantChange(a.id); onNewChat(a.id); }}
                className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                  style={{ background: a.bg }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: a.color }} />
                </div>
                <div className="text-[14px] font-semibold text-white">{a.name}</div>
                <div className="text-[12px]" style={{ color: a.color }}>{a.role}</div>
              </button>
            ))}
          </div>
        </div>
        <ChatComposer
          input={input}
          setInput={setInput}
          send={send}
          sending={sending}
          attachedFile={attachedFile}
          onAttach={() => fileInputRef.current?.click()}
          onRemoveFile={() => setAttachedFile(null)}
          showUpload={isDonna}
        />
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0c]">
      <header className="px-8 py-4 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: assistant.bg }}
          >
            <BotAvatar size={28} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-white">{assistant.name}</div>
            <div className="text-[12px]" style={{ color: assistant.color }}>{assistant.role}</div>
          </div>
          {/* NO model selector — removed per request */}
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {loading && (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
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
                  ? 'bg-[#22a3ff] text-white rounded-br-sm'
                  : 'bg-white/5 border border-white/10 text-white/90 rounded-bl-sm'
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
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 text-[14px]">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <ChatComposer
        input={input}
        setInput={setInput}
        send={send}
        sending={sending}
        attachedFile={attachedFile}
        onAttach={() => fileInputRef.current?.click()}
        onRemoveFile={() => setAttachedFile(null)}
        showUpload={isDonna}
      />
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
    </div>
  );
}

const ChatComposer = ({ input, setInput, send, sending, attachedFile, onAttach, onRemoveFile, showUpload }) => (
  <form onSubmit={send} className="p-4 border-t border-white/10 bg-black/20">
    {attachedFile && (
      <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
        <Paperclip className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
        <span className="text-[12px] text-white/70 truncate flex-1">{attachedFile.name}</span>
        <button type="button" onClick={onRemoveFile} className="text-white/30 hover:text-white">
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    )}
    <div className="max-w-3xl mx-auto flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
      {showUpload && (
        <button
          type="button"
          onClick={onAttach}
          title="Attach file"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 mb-1"
        >
          <Paperclip className="w-4 h-4" />
        </button>
      )}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); }
        }}
        placeholder="Ask anything… (Shift+Enter for newline)"
        rows={1}
        className="flex-1 bg-transparent outline-none resize-none text-[14px] text-white placeholder:text-white/30 py-2 max-h-40"
      />
      <button
        type="submit"
        disabled={sending || !input.trim()}
        className="w-9 h-9 rounded-xl bg-[#22a3ff] hover:bg-[#1a8de8] text-white flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0 mb-1"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  </form>
);
