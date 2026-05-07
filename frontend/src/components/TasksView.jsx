import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Loader2, Plus, ListChecks, Trash2, Clock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Input } from './ui/input';

export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [schedule, setSchedule] = useState('');
  const { toast } = useToast();

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
      toast({ title: 'Task created', description: 'Wingman will run it in the background.' });
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
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <ListChecks className="w-6 h-6 text-slate-900" />
          <h1 className="text-[28px] font-semibold text-slate-900">Background tasks</h1>
        </div>
        <p className="text-slate-500 mb-8">Recurring jobs Wingman runs for you in the background.</p>

        <form onSubmit={create} className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="e.g. Summarize emails and draft replies"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <Input
              placeholder="Schedule e.g. daily 8am"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="mt-3 h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add task
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-slate-400 py-16">No background tasks yet.</div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-slate-900 truncate">{t.title}</div>
                  <div className="text-[12px] text-slate-500">{t.schedule || 'on demand'}</div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  {t.status}
                </span>
                <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500">
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
