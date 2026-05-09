import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';
import { ASSISTANTS } from '../data/assistants';
import { JarvisFace, JarvisWordmark } from '../components/JarvisLogo';
import { Plus, MessageSquare, Puzzle, ListChecks, LogOut, Send, Loader2, Trash2, Sparkles, Hammer, CreditCard, Settings as SettingsIcon, Sun, Moon, Zap } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import PluginsView from '../components/PluginsView';
import TasksView from '../components/TasksView';
import ChatView from '../components/ChatView';
import CodeAgentView from '../components/CodeAgentView';
import BillingView from '../components/BillingView';
import PersonasView from '../components/PersonasView';
import { t } from '../lib/i18n';

export default function Dashboard() {
  const { user, logout, loading, refreshUser } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [view, setView] = useState(() => location.pathname === '/app/billing' ? 'billing' : 'chat');
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const dark = theme === 'dark';

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (location.pathname === '/app/billing') setView('billing');
  }, [location.pathname]);

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
      const h = () => setView('billing');
      window.addEventListener('open-billing', h);
      return () => { clearInterval(t); window.removeEventListener('open-billing', h); };
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
      <aside className={`w-[260px] border-r flex flex-col backdrop-blur-xl ${dark ? 'bg-black/80 border-white/5' : 'bg-slate-50/80 border-slate-200'}`}>
        <div className={`p-6 flex items-center justify-between ${dark ? 'text-white' : 'text-slate-900'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg">
              <JarvisFace size={20} />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold tracking-tight">Jarvis</div>
              <div className={`text-[10px] uppercase tracking-widest font-medium opacity-40`}>Autonomous AI</div>
            </div>
          </div>
          <button onClick={toggle} className={`p-1.5 rounded-lg transition-all ${dark ? 'text-white/20 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'}`}>
            {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="p-4 border-b border-white/10">
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Zap className="w-5 h-5 fill-cyan-400/20" />
                  <span className="text-[20px] font-bold">{user.credits?.toLocaleString() || 0}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-50">crédits</span>
              </div>
            </div>
            <button 
              onClick={() => setView('billing')}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:scale-[1.02] active:scale-[0.98] text-[#451a03] font-[900] text-[13px] flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:animate-shimmer" />
              <div className="w-5 h-5 rounded-full bg-[#451a03]/10 flex items-center justify-center">
                <Zap className="w-3 h-3 text-[#451a03] fill-[#451a03]" />
              </div>
              Recharger des crédits
            </button>
          </div>
        </div>

        <div className="px-3 py-4 space-y-0.5">
          {[
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'builder', icon: Hammer, label: 'Build' },
            { id: 'plugins', icon: Puzzle, label: 'Plugins' },
            { id: 'tasks', icon: ListChecks, label: 'Habitudes' },
            { id: 'billing', icon: CreditCard, label: 'Facturation' },
            { id: 'personas', icon: SettingsIcon, label: 'Paramètres' },
          ].map(({ id, icon: Icon, label }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`group relative w-full flex items-center gap-3 px-3 h-9 rounded-md text-[13px] font-medium transition-all ${
                  active
                    ? dark ? 'text-white bg-white/5' : 'text-slate-900 bg-slate-200/50'
                    : dark ? 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                {active && (
                  <div className="absolute left-0 w-0.5 h-4 bg-blue-500 rounded-full" />
                )}
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${active ? 'text-blue-500' : ''}`} /> 
                {label}
              </button>
            );
          })}
        </div>

        <div className="px-3 pb-2 flex items-center justify-between">
          <span className={`text-[11px] uppercase tracking-wider font-semibold ${dark ? 'text-white/30' : 'text-slate-400'}`}>Conversations récentes</span>
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
            <div className={`text-[12px] px-4 py-8 text-center italic opacity-30 ${dark ? 'text-white' : 'text-slate-600'}`}>
              Vos prochains projets apparaîtront ici.
            </div>
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
