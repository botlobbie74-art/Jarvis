import React, { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { Send, Loader2, Paperclip, X as XIcon, Hammer, MessageSquare, Mic, MousePointer2, Zap, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../context/ThemeContext';
import { JarvisFace } from './JarvisLogo';

const BotAvatar = ({ size = 40, dark = true, color = "#22a3ff" }) => (
  <div className="flex items-center justify-center" style={{ width: size, height: size }}>
    <JarvisFace size={size * 0.8} />
  </div>
);

const ROLE_COLORS = {
  'ceo': { bg: 'bg-amber-500/5', text: 'text-amber-400', border: 'border-amber-500/10', icon: 'text-amber-400' },
  'planner': { bg: 'bg-amber-500/5', text: 'text-amber-400', border: 'border-amber-500/10', icon: 'text-amber-400' },
  'cto': { bg: 'bg-indigo-500/5', text: 'text-indigo-400', border: 'border-indigo-500/10', icon: 'text-indigo-400' },
  'architect': { bg: 'bg-indigo-500/5', text: 'text-indigo-400', border: 'border-indigo-500/10', icon: 'text-indigo-400' },
  'backend': { bg: 'bg-blue-500/5', text: 'text-blue-400', border: 'border-blue-500/10', icon: 'text-blue-400' },
  'frontend': { bg: 'bg-fuchsia-500/5', text: 'text-fuchsia-400', border: 'border-fuchsia-500/10', icon: 'text-fuchsia-400' },
  'security': { bg: 'bg-rose-500/5', text: 'text-rose-400', border: 'border-rose-500/10', icon: 'text-rose-400' },
  'infra': { bg: 'bg-emerald-500/5', text: 'text-emerald-400', border: 'border-emerald-500/10', icon: 'text-emerald-400' },
  'ux': { bg: 'bg-orange-500/5', text: 'text-orange-400', border: 'border-orange-500/10', icon: 'text-orange-400' },
  'pm': { bg: 'bg-orange-500/5', text: 'text-orange-400', border: 'border-orange-500/10', icon: 'text-orange-400' },
  'qa': { bg: 'bg-emerald-500/5', text: 'text-emerald-400', border: 'border-emerald-500/10', icon: 'text-emerald-400' },
  'tester': { bg: 'bg-emerald-500/5', text: 'text-emerald-400', border: 'border-emerald-500/10', icon: 'text-emerald-400' },
  'jarvis': { bg: 'bg-sky-500/5', text: 'text-sky-400', border: 'border-sky-500/10', icon: 'text-sky-400' },
};

export default function ChatView({ sessionId, onOpenBuilder, onSessionUpdated }) {
  const { user, refreshUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [ultraMode, setUltraMode] = useState(false);
  const [preference, setPreference] = useState('balanced');
  const [sending, setSending] = useState(false);
  const isOutOfCredits = (user?.credits || 0) <= 0;
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [builderAction, setBuilderAction] = useState(null);
  const [proactiveAction, setProactiveAction] = useState(null);
  const [recording, setRecording] = useState(false);
  const [magicEdit, setMagicEdit] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleMsg = (e) => {
      if (e.data && e.data.type === 'magic-edit-selection') {
        setInput(`Edit this element: ${e.data.selector} (${e.data.text})\nMake it ...`);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, []);

  useEffect(() => {
    // Notify iframe of magic edit state
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(ifrm => {
      ifrm.contentWindow?.postMessage({ type: 'set-magic-edit', enabled: magicEdit }, '*');
    });
  }, [magicEdit]);
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

  const send = async (e, overrideMessage = null) => {
    e?.preventDefault();
    const draftInput = overrideMessage ?? input;
    if (!draftInput.trim() && !attachedFile) return;

    let sid = sessionId;
    if (!sid) {
      try {
        const { data } = await api.post('/chat/sessions', null, { params: { assistant_id: 'jarvis' } });
        sid = data.id;
        onSessionUpdated?.();
      } catch { return; }
    }

    let messageContent = draftInput;
    if (attachedFile && !overrideMessage) messageContent = `[File: ${attachedFile.name}]\n${draftInput}`;

    const userMsg = { id: 'tmp-' + Date.now(), session_id: sid, role: 'user', content: messageContent, assistant_id: 'jarvis', created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setAttachedFile(null);
    setSending(true);
    try {
      // 0. TOOL VERIFICATION
      setMessages(prev => [...prev, { 
        id: 'verify-' + Date.now(), 
        role: 'assistant', 
        content: "🔌 Vérification des outils...",
        metadata: { agent_type: 'worker' }
      }]);
      const { data: toolStatus } = await api.get('/tools/check');
      const toolMsg = Object.values(toolStatus).map(t => t.message).join(' ');
      setMessages(prev => prev.map(m => m.id?.startsWith('verify-') ? { ...m, content: `🔌 Vérification des outils...\n${toolMsg}` } : m));
      await new Promise(r => setTimeout(r, 800));

      // 1. SILENT MISSION DETECTION
      setSending(true);
      const { data: parseData } = await api.post('/chief/parse', { message: messageContent });
      
      if (parseData.missions && parseData.missions.length >= 2) {
        // TRIGGER CHIEF OF STAFF ENGINE
        const missionsWithIds = parseData.missions.map(m => ({ ...m, id: Math.random().toString(36).substr(2, 9), status: 'pending' }));
        setMessages((m) => [...m, { 
          id: 'cos-' + Date.now(), 
          role: 'assistant', 
          content: "Compris. Je lance une série de missions pour répondre à votre demande.",
          metadata: { agent_type: 'chief' },
          missions: missionsWithIds
        }]);
        
        // Execute missions
        try {
          const response = await fetch(`${api.defaults.baseURL}/chief/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('jarvis_token')}` },
            body: JSON.stringify({ missions: missionsWithIds })
          });
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.trim().startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.trim().substring(6));
                  if (data.mission_id && data.status) {
                    setMessages(prev => prev.map(m => {
                      if (m.missions) {
                        return {
                          ...m,
                          missions: m.missions.map(mis => mis.id === data.mission_id ? { ...mis, status: data.status, preview: data.preview } : mis)
                        };
                      }
                      return m;
                    }));
                  } else if (data.type === 'final_report') {
                    setMessages(prev => prev.map(m => {
                      if (!m.missions) return m;
                      return {
                        ...m,
                        content: data.report?.summary || m.content,
                        metadata: {
                          ...(m.metadata || {}),
                          post_completion_suggestions: data.suggestions || []
                        }
                      };
                    }));
                  }
                } catch (e) {}
              }
            }
          }
          refreshUser();
        } catch (e) {
          toast({ title: 'Chief of Staff Error', variant: 'destructive' });
        }
      } else {
        // NORMAL CHAT PATH
        const { data } = await api.post('/chat/send', { 
          session_id: sid, 
          message: messageContent, 
          assistant_id: 'jarvis',
          ultra: ultraMode,
          preference: preference
        });

        // Check for special actions
        if (data.builder_action) setBuilderAction(data.builder_action);
        if (data.metadata?.proactive_action) setProactiveAction(data.metadata.proactive_action);

        setMessages((m) => [...m, data]);
      }
      onSessionUpdated?.();
      refreshUser();
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

  const executeProactiveAction = async () => {
    if (!proactiveAction) return;
    try {
      await api.post('/chat/approve-proactive', proactiveAction);
      toast({ title: 'Task Approved', description: proactiveAction.description });
      setProactiveAction(null);
    } catch (e) {
      toast({ title: 'Failed to approve', variant: 'destructive' });
    }
  };

  const dismissProactiveAction = () => setProactiveAction(null);

  const executeSuggestion = (suggestion) => {
    if (!suggestion?.action) return;
    send(null, suggestion.action);
  };

  if (!sessionId && messages.length === 0) {
    return (
      <div className={`flex-1 flex flex-col ${dark ? 'bg-black' : 'bg-white'}`}>
        <header className={`px-8 py-5 border-b backdrop-blur flex items-center gap-3 ${dark ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-slate-50/50'}`}>
          <BotAvatar size={36} dark={dark} />
          <div>
            <div className={`text-[15px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>Jarvis</div>
            <div className="text-[12px] text-[#22a3ff]">Votre ingénieur IA autonome</div>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <BotAvatar size={90} dark={dark} />
          <h2 className={`mt-6 text-[28px] font-semibold text-center ${dark ? 'text-white' : 'text-slate-900'}`}>Que puis-je faire pour vous aujourd'hui ?</h2>
          <p className={`mt-2 text-center max-w-sm ${dark ? 'text-white/40' : 'text-slate-500'}`}>Posez-moi n'importe quelle question — je peux créer des apps, consulter vos stats YouTube, créer des Google Sheets ou gérer vos plugins.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              "Où en est mon projet ?",
              "Crée-moi une app todo",
              "Explique mon dernier projet",
              "Ajoute une fonctionnalité",
            ].map((s) => (
              <button 
                key={s} 
                onClick={() => setInput(s)} 
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all border ${
                  dark 
                    ? 'bg-white/[0.03] border-white/5 text-white/40 hover:text-white hover:bg-white/[0.08] hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.03)]' 
                    : 'bg-slate-50 border-slate-200/50 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-md'
                }`}
              >
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

  const toggleMagicEdit = () => {
    setMagicEdit(!magicEdit);
    toast({ title: !magicEdit ? 'Magic Edit ON' : 'Magic Edit OFF', description: !magicEdit ? 'Click elements in preview to edit them.' : 'Standard preview mode.' });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', blob, 'voice.wav');
        setSending(true);
        try {
          const { data } = await api.post('/voice/transcribe', formData);
          setInput(data.text);
          // Optional: automatically send? Let's just set input for now.
        } catch (e) {
          toast({ title: 'Transcription failed', variant: 'destructive' });
        } finally { setSending(false); }
      };
      recorder.start();
      setRecording(true);
    } catch (e) {
      toast({ title: 'Microphone access denied', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className={`flex-1 flex flex-col ${dark ? 'bg-black' : 'bg-white'}`}>
      <header className={`px-8 py-4 border-b backdrop-blur flex items-center gap-3 ${dark ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-slate-50/50'}`}>
        <BotAvatar size={32} dark={dark} />
        <div className="flex-1">
          <div className={`text-[15px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>Jarvis</div>
          <div className="text-[12px] text-[#22a3ff]">Votre agent IA personnel</div>
        </div>
        <button onClick={toggleMagicEdit} className={`h-8 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${magicEdit ? 'bg-cyan-500 text-white shadow-lg' : dark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500'}`}>
          <MousePointer2 className="w-3.5 h-3.5" />
          MAGIC EDIT
        </button>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {loading && <div className="flex justify-center py-8"><Loader2 className={`w-5 h-5 animate-spin ${dark ? 'text-white/30' : 'text-slate-300'}`} /></div>}
        {messages.map((m) => {
          const metadata = m.metadata || {};
          const role = metadata.agent_type || 'jarvis';
          const colors = ROLE_COLORS[role.toLowerCase()] || ROLE_COLORS.jarvis;
          
          return (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center transition-colors ${dark ? 'bg-[#0d1a2b]' : 'bg-slate-100'} ${colors.border} border`}>
                  {metadata.agent_type === 'builder' ? <Hammer className="w-5 h-5 text-indigo-400" /> : <BotAvatar size={26} dark={dark} color={colors.icon} />}
                </div>
              )}
              <div className="flex flex-col max-w-[80%] gap-1">
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${colors.text}`}>{role}</span>
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed transition-all ${
                  m.role === 'user'
                    ? 'bg-[#22a3ff] text-white rounded-br-sm shadow-lg shadow-sky-500/10'
                    : dark 
                      ? `${colors.bg} border ${colors.border} text-white/90 rounded-bl-sm shadow-xl` 
                      : `${colors.bg.replace('/10', '/5')} border ${colors.border} text-slate-800 rounded-bl-sm shadow-sm`
                }`}>
                  <div className="whitespace-pre-wrap">{m.role === 'assistant' ? (m.display_content || m.content) : m.content}</div>
                  
                  {m.missions && (
                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {m.missions.map(mis => (
                        <div key={mis.id} className={`flex items-center gap-3 p-3 rounded-xl border ${dark ? 'bg-black/40 border-white/5' : 'bg-white/50 border-slate-200'}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            mis.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 
                            mis.status === 'running' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/30'
                          }`}>
                            {mis.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                             mis.status === 'done' ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="text-[12px] font-bold uppercase tracking-wider opacity-40">{mis.type}</div>
                              {mis.status === 'done' && mis.cost && (
                                <div className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                  <Zap className="w-2.5 h-2.5 fill-amber-500" /> -{mis.cost}
                                </div>
                              )}
                            </div>
                            <div className="text-[13px] font-medium truncate">{mis.preview || 'En attente...'}</div>
                          </div>
                          {mis.status === 'done' && <div className="text-[10px] font-bold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10 uppercase">TERMINÉ</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {m.role === 'assistant' && metadata.post_completion_suggestions?.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-white/10 pt-4">
                      {metadata.post_completion_suggestions.slice(0, 3).map((suggestion, idx) => (
                        <button
                          key={`${m.id}-suggestion-${idx}`}
                          type="button"
                          onClick={() => executeSuggestion(suggestion)}
                          className={`text-left rounded-xl border px-3 py-3 transition-all hover:-translate-y-0.5 ${
                            dark
                              ? 'bg-black/30 border-white/10 hover:border-cyan-400/40 hover:bg-cyan-400/10'
                              : 'bg-white/70 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50'
                          }`}
                        >
                          <div className="text-[18px] leading-none mb-2">{suggestion.icon || '✨'}</div>
                          <div className={`text-[12px] font-bold leading-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{suggestion.title}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

        {/* Proactive action banner */}
        {proactiveAction && (
          <div className="flex justify-start ml-12">
            <div className={`border rounded-2xl rounded-bl-sm px-5 py-4 text-[13px] max-w-[85%] shadow-2xl transition-all animate-in slide-in-from-left-2 duration-300 ${dark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <span className="font-bold uppercase tracking-tight text-[11px]">Suggestion Proactive</span>
                  <div className="text-[14px] font-semibold leading-none">Dois-je continuer ?</div>
                </div>
              </div>
              <p className={`text-[13px] mb-4 leading-relaxed ${dark ? 'text-white/70' : 'text-slate-600'}`}>{proactiveAction.description}</p>
              <div className="flex gap-3">
                <button onClick={executeProactiveAction} className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-white text-[13px] font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-500/20">
                  Oui, continuer
                </button>
                <button onClick={dismissProactiveAction} className={`px-5 py-2 text-[13px] font-medium rounded-xl transition-colors ${dark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>
                  Non, merci
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Builder action banner */}
        {builderAction && (
          <div className="flex justify-start ml-12">
            <div className={`border rounded-2xl rounded-bl-sm px-5 py-4 text-[13px] max-w-[85%] shadow-2xl transition-all animate-in slide-in-from-left-2 duration-300 ${dark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Hammer className="w-4 h-4 text-cyan-500" />
                </div>
                <div>
                  <span className="font-bold uppercase tracking-tight text-[11px]">Jarvis Builder</span>
                  <div className="text-[14px] font-semibold leading-none">Intervention du Builder requise</div>
                </div>
              </div>
              <p className={`text-[13px] mb-4 leading-relaxed ${dark ? 'text-white/70' : 'text-slate-600'}`}>{builderAction.description}</p>
              <div className="flex gap-3">
                <button onClick={executeBuilderAction} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-[13px] font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-cyan-500/20">
                  Initialiser le Builder
                </button>
                <button onClick={dismissBuilderAction} className={`px-5 py-2 text-[13px] font-medium rounded-xl transition-colors ${dark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>
                  Refuser
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ChatComposer 
        input={input} setInput={setInput} send={send} sending={sending} 
        attachedFile={attachedFile} onAttach={() => fileInputRef.current?.click()} onRemoveFile={() => setAttachedFile(null)} 
        recording={recording} onStartRecording={startRecording} onStopRecording={stopRecording}
        dark={dark} 
        user={user}
        preference={preference}
        setPreference={setPreference}
        ultraMode={ultraMode}
        setUltraMode={setUltraMode}
      />
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
    </div>
  );
}

const ChatComposer = ({ 
  input, setInput, send, sending, attachedFile, onAttach, onRemoveFile, 
  recording, onStartRecording, onStopRecording, dark, user,
  preference, setPreference, ultraMode, setUltraMode 
}) => {
  const isOutOfCredits = (user?.credits || 0) <= 0;
  return (
    <form onSubmit={send} className={`p-4 border-t ${dark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white'}`}>
      {isOutOfCredits && (
        <div className="max-w-3xl mx-auto mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center animate-pulse">
          <p className="text-[14px] font-bold text-amber-500 mb-3">Plus de crédits disponibles</p>
          <button 
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-billing'))}
            className="px-6 h-9 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold text-[13px] shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 transition-transform"
          >
            Recharger des crédits
          </button>
        </div>
      )}
      {attachedFile && (
        <div className={`max-w-3xl mx-auto mb-2 flex items-center gap-2 px-3 py-2 border rounded-lg ${dark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
          <Paperclip className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="text-[12px] truncate flex-1">{attachedFile.name}</span>
          <button type="button" onClick={onRemoveFile} className={`${dark ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}><XIcon className="w-3.5 h-3.5" /></button>
        </div>
      )}
      <div className={`max-w-3xl mx-auto relative group ${isOutOfCredits ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        <div className={`absolute -inset-1 rounded-[22px] bg-gradient-to-r from-blue-500 to-fuchsia-600 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-500`} />
        <div className={`relative flex items-end gap-2 border rounded-[20px] px-4 py-3 shadow-2xl transition-all duration-300 backdrop-blur-xl ${
          dark 
            ? 'bg-black/60 border-white/5 group-focus-within:border-white/10' 
            : 'bg-white/80 border-slate-200 group-focus-within:border-slate-300'
        }`}>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={onAttach} title="Attach file" className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${dark ? 'text-white/20 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}>
              <Paperclip className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center gap-1 group/prefs relative">
               <button type="button" title={`Current mode: ${preference}`} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${preference !== 'balanced' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400'}`}>
                 <Zap className="w-4 h-4" />
               </button>
               <div className="absolute bottom-full left-0 mb-2 hidden group-hover/prefs:flex flex-col bg-slate-900 border border-white/10 rounded-xl p-1 shadow-2xl z-50">
                 {['balanced', 'quality', 'speed', 'cost'].map(p => (
                   <button key={p} type="button" onClick={() => setPreference(p)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-left transition-colors ${preference === p ? 'bg-cyan-500 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                     {p}
                   </button>
                 ))}
               </div>
            </div>
          </div>
          <button type="button" onMouseDown={onStartRecording} onMouseUp={onStopRecording} onMouseLeave={onStopRecording}
            title="Hold to speak" 
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${recording ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse' : dark ? 'text-white/20 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}>
            <Mic className="w-4 h-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
            placeholder={isOutOfCredits ? "Plus de crédits" : "Quelle est la prochaine directive ?"}
            disabled={isOutOfCredits}
            rows={1}
            className={`flex-1 bg-transparent outline-none resize-none text-[15px] font-medium py-2 max-h-40 ${dark ? 'text-white placeholder:text-white/20' : 'text-slate-800 placeholder:text-slate-400'}`}
          />
          <div className="flex items-center gap-2 mb-1 mr-1">
             <button type="button" onClick={() => setUltraMode(!ultraMode)} title="Toggle Ultra High Performance Mode" className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${ultraMode ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-500/20 scale-110' : dark ? 'bg-white/5 text-white/20 hover:text-white' : 'bg-slate-100 text-slate-400'}`}>
               <Sparkles className={`w-4 h-4 ${ultraMode ? 'animate-pulse' : ''}`} />
             </button>
             <button type="submit" disabled={sending || !input.trim() || isOutOfCredits} className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center disabled:opacity-20 transition-all transform active:scale-90 shadow-lg shadow-blue-500/20">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
