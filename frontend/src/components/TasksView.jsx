import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Loader2, Plus, ListChecks, Trash2, Clock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Input } from './ui/input';
import { useTheme } from '../context/ThemeContext';

export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState('');
  const { toast } = useToast();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks');
      setTasks(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.post('/tasks', { title, schedule, plugins: [] });
      setTitle(''); setSchedule('');
      toast({ title: 'Task created', description: 'Jarvis will run it in the background.' });
      load();
    } catch (err) {
      toast({ title: 'Failed to create', variant: 'destructive' });
    }
  };

  const remove = async (id) => {
    await api.delete(`/tasks/${id}`);
    load();
  };

  return (
    <div className={`flex-1 overflow-y-auto ${dark ? 'bg-[#0a0a0c]' : 'bg-slate-50'}`}>
      <div className="max-w-3xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <ListChecks className={`w-6 h-6 ${dark ? 'text-white' : 'text-slate-900'}`} />
          <h1 className={`text-[28px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>Background tasks</h1>
        </div>
        <p className={`${dark ? 'text-white/50' : 'text-slate-500'} mb-8`}>Recurring jobs Jarvis runs for you in the background.</p>

        <form onSubmit={create} className={`rounded-2xl border p-5 mb-6 ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="e.g. Summarize emails and draft replies"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={dark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}
              />
            </div>
            <Input
              placeholder="Schedule e.g. daily 8am"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className={dark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}
            />
          </div>
          <button
            type="submit"
            className={`mt-3 h-10 px-4 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-colors ${dark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
          >
            <Plus className="w-4 h-4" /> Add task
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className={`w-5 h-5 animate-spin ${dark ? 'text-white/30' : 'text-slate-400'}`} /></div>
        ) : tasks.length === 0 ? (
          <div className={`text-center py-16 ${dark ? 'text-white/20' : 'text-slate-400'}`}>No background tasks yet.</div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className={`rounded-xl border p-4 flex items-center gap-3 ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[14px] font-medium truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{t.title}</div>
                  <div className={`text-[12px] ${dark ? 'text-white/40' : 'text-slate-500'}`}>{t.schedule || 'on demand'}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  {t.status}
                </span>
                <button onClick={() => remove(t.id)} className={`${dark ? 'text-white/30 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

