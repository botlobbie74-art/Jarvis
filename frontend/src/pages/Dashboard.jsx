import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { ASSISTANTS } from '../data/assistants';
import { WingmanFace } from '../components/WingmanLogo';
import { Plus, MessageSquare, Puzzle, ListChecks, LogOut, Send, Loader2, Trash2, Sparkles, Hammer, CreditCard } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import PluginsView from '../components/PluginsView';
import TasksView from '../components/TasksView';
import ChatView from '../components/ChatView';
import CodeAgentView from '../components/CodeAgentView';
import BillingView from '../components/BillingView';

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState('chat');
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeAssistant, setActiveAssistant] = useState('jarvis');

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

  useEffect(() => { if (user) loadSessions(); }, [user]);

  const newChat = async (assistantId) => {
    try {
      const { data } = await api.post('/chat/sessions', null, { params: { assistant_id: assistantId || activeAssistant } });
      setSessions((s) => [data, ...s]);
      setActiveSessionId(data.id);
      setActiveAssistant(data.assistant_id);
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <WingmanFace size={36} />
          <div>
            <div className="text-[14px] font-bold text-slate-900">Jarvis</div>
            <div className="text-[11px] text-slate-500">Autonomous AI</div>
          </div>
        </div>

        <div className="px-3 py-3 space-y-1">
          <button
            onClick={() => setView('chat')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-colors ${
              view === 'chat' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Chats
          </button>
          <button
            onClick={() => setView('builder')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-colors ${
              view === 'builder' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Hammer className="w-4 h-4" /> Build apps
          </button>
          <button
            onClick={() => setView('plugins')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-colors ${
              view === 'plugins' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Puzzle className="w-4 h-4" /> Plugins
          </button>
          <button
            onClick={() => setView('tasks')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-colors ${
              view === 'tasks' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ListChecks className="w-4 h-4" /> Background tasks
          </button>
          <button
            onClick={() => setView('billing')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-colors ${
              view === 'billing' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Billing
          </button>
        </div>

        <div className="px-3 pb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Recent chats</span>
          <button
            onClick={() => newChat()}
            className="text-slate-500 hover:text-slate-900 transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {sessions.length === 0 && (
            <div className="text-[12px] text-slate-400 px-3 py-4">No chats yet. Click + to start.</div>
          )}
          {sessions.map((s) => {
            const a = ASSISTANTS.find((x) => x.id === s.assistant_id) || ASSISTANTS[0];
            const active = s.id === activeSessionId && view === 'chat';
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSessionId(s.id); setActiveAssistant(s.assistant_id); setView('chat'); }}
                className={`group w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-[13px] mb-1 transition-colors ${
                  active ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: a.bg }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: a.color }} />
                </div>
                <span className="truncate flex-1 text-slate-700">{s.title}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-200 flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-slate-900 text-white text-[12px]">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-slate-900 truncate">{user.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-slate-900" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {view === 'chat' && (
          <ChatView
            sessionId={activeSessionId}
            assistantId={activeAssistant}
            onAssistantChange={setActiveAssistant}
            onNewChat={newChat}
            onSessionUpdated={loadSessions}
          />
        )}
        {view === 'plugins' && <PluginsView />}
        {view === 'tasks' && <TasksView />}
        {view === 'builder' && <CodeAgentView />}
        {view === 'billing' && <BillingView />}
      </main>
    </div>
  );
}
