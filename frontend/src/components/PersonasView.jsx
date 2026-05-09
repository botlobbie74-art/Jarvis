import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Loader2, Sparkles, Save, RotateCcw, Settings } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../context/ThemeContext';
import { ASSISTANTS } from '../data/assistants';
import { t } from '../lib/i18n';

export default function PersonasView() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
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
    <div className={`flex-1 overflow-y-auto ${dark ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <Settings className={`w-6 h-6 ${dark ? 'text-white' : 'text-slate-900'}`} />
          <h1 className="text-[28px] font-[900] tracking-tighter">{t('settings_title')}</h1>
        </div>
        <p className={`mb-8 ${dark ? 'text-white/40' : 'text-slate-500'}`}>{t('settings_desc')}</p>

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
                  isActive 
                    ? dark ? 'bg-white text-black border-white' : 'bg-slate-900 text-white border-slate-900' 
                    : dark ? 'bg-white/5 text-white/60 border-white/10 hover:border-white/40' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: a.color }} />
                {a.name}
                {isCustom && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </button>
            );
          })}
        </div>

        <div className={`rounded-2xl border p-6 ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta?.bg }}>
              <Sparkles className="w-5 h-5" style={{ color: meta?.color }} />
            </div>
            <div className="flex-1">
              <div className="text-[18px] font-semibold">{meta?.name}</div>
              <div className="text-[13px]" style={{ color: meta?.color }}>{meta?.role}</div>
            </div>
          </div>

          {/* Custom name */}
          <label className={`block text-[13px] font-medium mb-1.5 ${dark ? 'text-white/60' : 'text-slate-700'}`}>Custom name (optional)</label>
          <input
            type="text"
            placeholder={meta?.name || ''}
            value={editVal.custom_name}
            onChange={(e) => setEditing({ ...editing, [active]: { ...editVal, custom_name: e.target.value } })}
            className={`w-full h-10 px-3 rounded-lg border text-[14px] outline-none mb-4 ${dark ? 'bg-white/5 border-white/10 text-white focus:border-white/30' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'}`}
          />

          {/* Default prompt preview */}
          <details className="mb-3 group">
            <summary className={`text-[12px] cursor-pointer hover:underline ${dark ? 'text-white/30' : 'text-slate-500'}`}>View default prompt</summary>
            <div className={`mt-2 p-3 rounded-lg text-[12px] font-mono whitespace-pre-wrap ${dark ? 'bg-white/5 text-white/50' : 'bg-slate-50 text-slate-600'}`}>{current.default_prompt}</div>
          </details>

          <label className={`block text-[13px] font-medium mb-1.5 ${dark ? 'text-white/60' : 'text-slate-700'}`}>Your custom system prompt</label>
          <textarea
            rows={12}
            placeholder={`Describe how ${meta?.name} should behave...`}
            value={editVal.system_prompt}
            onChange={(e) => setEditing({ ...editing, [active]: { ...editVal, system_prompt: e.target.value } })}
            className={`w-full px-4 py-3 rounded-lg border text-[14px] outline-none font-mono resize-y ${dark ? 'bg-white/5 border-white/10 text-white focus:border-white/30' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'}`}
          />
          <div className="text-[11px] opacity-40 mt-1">Leave empty to use the default {meta?.name} personality.</div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={reset}
              disabled={saving || !current.is_custom}
              className={`h-10 px-4 rounded-lg border text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 ${dark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to default
            </button>
            <button
              onClick={save}
              disabled={saving}
              className={`h-10 px-5 rounded-lg font-medium text-[13px] flex items-center gap-1.5 transition-colors disabled:opacity-60 ${dark ? 'bg-white text-black hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
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
