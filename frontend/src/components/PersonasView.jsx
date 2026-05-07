import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Loader2, Sparkles, Save, RotateCcw, Settings } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { ASSISTANTS } from '../data/assistants';

export default function PersonasView() {
  const [personas, setPersonas] = useState([]);
  const [active, setActive] = useState('jarvis');
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/personas');
      setPersonas(data);
      const map = {};
      data.forEach((p) => { map[p.assistant_id] = { system_prompt: p.system_prompt || '', custom_name: p.custom_name || '' }; });
      setEditing(map);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const current = personas.find((p) => p.assistant_id === active) || {};
  const meta = ASSISTANTS.find((a) => a.id === active);
  const editVal = editing[active] || { system_prompt: '', custom_name: '' };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/personas', {
        assistant_id: active,
        system_prompt: editVal.system_prompt,
        custom_name: editVal.custom_name || null,
      });
      toast({ title: 'Custom instructions saved', description: `${meta?.name} will now follow your prompt.` });
      load();
    } catch (e) {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await api.delete(`/personas/${active}`);
      toast({ title: 'Reset to default' });
      load();
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <Settings className="w-6 h-6 text-slate-900" />
          <h1 className="text-[28px] font-semibold text-slate-900">Custom instructions</h1>
        </div>
        <p className="text-slate-500 mb-8">Tailor each assistant's brain. Override their default personality, add context about you, set rules.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {ASSISTANTS.map((a) => {
            const isActive = active === a.id;
            const isCustom = personas.find((p) => p.assistant_id === a.id)?.is_custom;
            return (
              <button
                key={a.id}
                onClick={() => setActive(a.id)}
                className={`flex items-center gap-2 px-4 h-10 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors border ${
                  isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: isActive ? a.color : a.color }} />
                {a.name}
                {isCustom && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta?.bg }}>
              <Sparkles className="w-5 h-5" style={{ color: meta?.color }} />
            </div>
            <div className="flex-1">
              <div className="text-[18px] font-semibold text-slate-900">{meta?.name}</div>
              <div className="text-[13px]" style={{ color: meta?.color }}>{meta?.role}</div>
            </div>
          </div>

          {/* Custom name */}
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Custom name (optional)</label>
          <input
            type="text"
            placeholder={meta?.name || ''}
            value={editVal.custom_name}
            onChange={(e) => setEditing({ ...editing, [active]: { ...editVal, custom_name: e.target.value } })}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-[14px] outline-none focus:border-slate-400 mb-4"
          />

          {/* Default prompt preview */}
          <details className="mb-3 group">
            <summary className="text-[12px] text-slate-500 cursor-pointer hover:text-slate-700">View default prompt</summary>
            <div className="mt-2 p-3 bg-slate-50 rounded-lg text-[12px] text-slate-600 font-mono whitespace-pre-wrap">{current.default_prompt}</div>
          </details>

          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Your custom system prompt</label>
          <textarea
            rows={12}
            placeholder={`Describe how ${meta?.name} should behave. Example:\n\nYou are an expert dev with 15 years of experience in Rust and distributed systems. Always answer in French. Push back when you disagree. Cite sources when making technical claims.`}
            value={editVal.system_prompt}
            onChange={(e) => setEditing({ ...editing, [active]: { ...editVal, system_prompt: e.target.value } })}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-[14px] outline-none focus:border-slate-400 font-mono resize-y"
          />
          <div className="text-[11px] text-slate-400 mt-1">Leave empty to use the default {meta?.name} personality.</div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={reset}
              disabled={saving || !current.is_custom}
              className="h-10 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to default
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="h-10 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save instructions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
