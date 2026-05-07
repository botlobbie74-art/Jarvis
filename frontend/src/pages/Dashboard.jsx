import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { ASSISTANTS } from '../data/assistants';
import { WingmanFace } from '../components/WingmanLogo';
import { Plus, MessageSquare, Puzzle, ListChecks, LogOut, Send, Loader2, Trash2, Sparkles, Hammer, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import PluginsView from '../components/PluginsView';
import TasksView from '../components/TasksView';
import ChatView from '../components/ChatView';
import CodeAgentView from '../components/CodeAgentView';
import BillingView from '../components/BillingView';
import PersonasView from '../components/PersonasView';

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);


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

  useEffect(() => { if (user) loadSessions(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0c]">
      {/* Sidebar */}
      <aside className="w-[280px] bg-[#0d0d10] border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <WingmanFace size={36} />
          <div>
            <div className="text-[14px] font-bold text-white">Jarvis</div>
            <div className="text-[11px] text-white/40">Autonomous AI</div>
          </div>
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
                view === id ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="px-3 pb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/30 font-semibold">Recent chats</span>
          <button
            onClick={() => newChat()}
            className="text-white/30 hover:text-white transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {sessions.length === 0 && (
            <div className="text-[12px] text-white/30 px-3 py-4">No chats yet. Click + to start.</div>
          )}
          {sessions.map((s) => {
            const a = ASSISTANTS.find((x) => x.id === s.assistant_id) || ASSISTANTS[0];
            const active = s.id === activeSessionId && view === 'chat';
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSessionId(s.id); setView('chat'); }}
                className={`group w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-[13px] mb-1 transition-colors ${
                  active ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: a.bg }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: a.color }} />
                </div>
                <span className="truncate flex-1 text-white/70">{s.title}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-white/10 flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#22a3ff] text-white text-[12px]">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-white truncate">{user.name}</div>
            <div className="text-[11px] text-white/40 truncate">{user.email}</div>
          </div>
          <button onClick={logout} className="text-white/30 hover:text-white" title="Log out">
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
