import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { ASSISTANTS } from '../data/assistants';
import { WingmanFace } from '../components/WingmanLogo';
import { Plus, MessageSquare, Puzzle, ListChecks, LogOut, Send, Loader2, Trash2, Sparkles, Hammer, CreditCard, Settings as SettingsIcon, Sun, Moon, Zap } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import PluginsView from '../components/PluginsView';
import TasksView from '../components/TasksView';
import ChatView from '../components/ChatView';
import CodeAgentView from '../components/CodeAgentView';
import BillingView from '../components/BillingView';
import PersonasView from '../components/PersonasView';

export default function Dashboard() {
  const { user, logout, loading, refreshUser } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const dark = theme === 'dark';

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [loading, user, navigate]);

  const loadSessions = async () => {
    try {
      const { data } = await api.get('/chat/sessions');
      setSessions(data);
      if (!activeSessionId && data.length) setActiveSessionId(data[0].id);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => { 
    if (user) {
      loadSessions(); 
      const t = setInterval(refreshUser, 30000);
      return () => clearInterval(t);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const newChat = async () => {
    try {
      const { data } = await api.post('/chat/sessions', null, { params: { assistant_id: 'jarvis' } });
      setSessions((s) => [data, ...s]);
      setActiveSessionId(data.id);
      setView('chat');
    } catch (e) {
      toast({ title: 'Could not create chat', variant: 'destructive' });
    }
  };

  const deleteSession = async (id) => {
    try {
      await api.delete(`/chat/sessions/${id}`);
      setSessions((s) => s.filter((x) => x.id !== id));
      if (activeSessionId === id) setActiveSessionId(null);
    } catch (e) {}
  };

  if (loading || !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-black' : 'bg-white'}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${dark ? 'text-white/30' : 'text-slate-200'}`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${dark ? 'bg-black' : 'bg-white'}`}>
      {/* Sidebar */}
      <aside className={`w-[280px] border-r flex flex-col ${dark ? 'bg-black border-white/10' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`p-4 border-b flex items-center gap-2 ${dark ? 'border-white/10' : 'border-slate-200'}`}>
          <WingmanFace size={36} />
          <div className="flex-1">
            <div className={`text-[14px] font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Jarvis</div>
            <div className={`text-[11px] ${dark ? 'text-white/40' : 'text-slate-500'}`}>Autonomous AI</div>
          </div>
          <button onClick={toggle} className={`p-1.5 rounded-lg transition-colors ${dark ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'}`}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="px-3 py-3 space-y-1">
          {[
            { id: 'chat', icon: MessageSquare, label: 'Chats' },
            { id: 'builder', icon: Hammer, label: 'Build apps' },
            { id: 'plugins', icon: Puzzle, label: 'Plugins' },
            { id: 'tasks', icon: ListChecks, label: 'Background tasks' },
            { id: 'billing', icon: CreditCard, label: 'Billing' },
            { id: 'personas', icon: SettingsIcon, label: 'Custom instructions' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-colors ${
                view === id
                  ? dark ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'
                  : dark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="px-3 pb-2 flex items-center justify-between">
          <span className={`text-[11px] uppercase tracking-wider font-semibold ${dark ? 'text-white/30' : 'text-slate-400'}`}>Recent chats</span>
          <button
            onClick={() => newChat()}
            className={`${dark ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors`}
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {sessions.length === 0 && (
            <div className={`text-[12px] px-3 py-4 ${dark ? 'text-white/30' : 'text-slate-400'}`}>No chats yet. Click + to start.</div>
          )}
          {sessions.map((s) => {
            const a = ASSISTANTS.find((x) => x.id === s.assistant_id) || ASSISTANTS[0];
            const active = s.id === activeSessionId && view === 'chat';
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSessionId(s.id); setView('chat'); }}
                className={`group w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-[13px] mb-1 transition-colors ${
                  active
                    ? dark ? 'bg-white/10' : 'bg-slate-200/50'
                    : dark ? 'hover:bg-white/5' : 'hover:bg-slate-200/30'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: a.bg }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: a.color }} />
                </div>
                <span className={`truncate flex-1 ${active ? dark ? 'text-white' : 'text-slate-900 font-medium' : dark ? 'text-white/70' : 'text-slate-600'}`}>{s.title}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${dark ? 'text-white/30 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        <div className={`px-4 py-3 mx-3 mb-4 rounded-2xl border flex items-center justify-between ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className={`text-[12px] font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{user.credits?.toLocaleString() || 0}</span>
          </div>
          <button onClick={() => setView('billing')} className="text-[10px] font-bold uppercase tracking-wider text-[#22a3ff] hover:opacity-80 transition-opacity">Top up</button>
        </div>

        <div className={`p-3 border-t flex items-center gap-3 ${dark ? 'border-white/10' : 'border-slate-200'}`}>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#22a3ff] text-white text-[12px]">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className={`text-[13px] font-medium truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{user.name}</div>
            <div className={`text-[11px] truncate ${dark ? 'text-white/40' : 'text-slate-500'}`}>{user.email}</div>
          </div>
          <button onClick={logout} className={`${dark ? 'text-white/30 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`} title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {view === 'chat' && (
          <ChatView
            sessionId={activeSessionId}
            onNewChat={newChat}
            onSessionUpdated={loadSessions}
            onOpenBuilder={(action) => {
              setView('builder');
              // Pass action to builder via sessionStorage so CodeAgentView can pick it up
              if (action?.description) sessionStorage.setItem('jarvis_builder_prompt', action.description);
            }}
          />
        )}
        {view === 'plugins' && <PluginsView />}
        {view === 'tasks' && <TasksView />}
        {view === 'builder' && <CodeAgentView />}
        {view === 'billing' && <BillingView />}
        {view === 'personas' && <PersonasView />}
      </main>
    </div>
  );
}
