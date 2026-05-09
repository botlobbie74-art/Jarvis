import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Loader2, Sparkles, Save, RotateCcw, Settings } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../context/ThemeContext';
import { ASSISTANTS } from '../data/assistants';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import { Zap, Bell, Link } from 'lucide-react';

export default function PersonasView() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [personas, setPersonas] = useState([]);
  const [active, setActive] = useState('jarvis');
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [briefEnabled, setBriefEnabled] = useState(user?.morning_brief_enabled || false);

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
      toast({ title: 'Instructions enregistrées', description: `${meta?.name} suivra désormais votre prompt.` });
      load();
    } catch (e) {
      toast({ title: 'Échec de l\'enregistrement', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await api.delete(`/personas/${active}`);
      toast({ title: 'Réinitialisation effectuée' });
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
          <h1 className="text-[28px] font-[900] tracking-tighter">Paramètres de Jarvis</h1>
        </div>
        <p className={`mb-8 ${dark ? 'text-white/40' : 'text-slate-500'}`}>Personnalisez la personnalité et les instructions de vos agents IA.</p>

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
          <label className={`block text-[13px] font-medium mb-1.5 ${dark ? 'text-white/60' : 'text-slate-700'}`}>Nom personnalisé (optionnel)</label>
          <input
            type="text"
            placeholder={meta?.name || ''}
            value={editVal.custom_name}
            onChange={(e) => setEditing({ ...editing, [active]: { ...editVal, custom_name: e.target.value } })}
            className={`w-full h-10 px-3 rounded-lg border text-[14px] outline-none mb-4 ${dark ? 'bg-white/5 border-white/10 text-white focus:border-white/30' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'}`}
          />

          <label className={`block text-[13px] font-medium mb-1.5 ${dark ? 'text-white/60' : 'text-slate-700'}`}>Votre prompt système personnalisé</label>
          <textarea
            rows={12}
            placeholder={`Décrivez comment ${meta?.name} doit se comporter...`}
            value={editVal.system_prompt}
            onChange={(e) => setEditing({ ...editing, [active]: { ...editVal, system_prompt: e.target.value } })}
            className={`w-full px-4 py-3 rounded-lg border text-[14px] outline-none font-mono resize-y ${dark ? 'bg-white/5 border-white/10 text-white focus:border-white/30' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-400'}`}
          />
          <div className="text-[11px] opacity-40 mt-1">Laissez vide pour utiliser la personnalité par défaut de {meta?.name}.</div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={reset}
              disabled={saving || !current.is_custom}
              className={`h-10 px-4 rounded-lg border text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 ${dark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </button>
            <button
              onClick={save}
              disabled={saving}
              className={`h-10 px-5 rounded-lg font-medium text-[13px] flex items-center gap-1.5 transition-colors disabled:opacity-60 ${dark ? 'bg-white text-black hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Enregistrement...' : 'Enregistrer les instructions'}
            </button>
          </div>
        </div>

        {/* Morning Brief Toggle */}
        <div className={`mt-6 rounded-2xl border p-6 ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-500">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold">Morning Brief Automatique</h3>
                <p className={`text-[13px] ${dark ? 'text-white/40' : 'text-slate-500'}`}>Recevez un résumé quotidien à 8h sur Telegram (10 crédits).</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const next = !briefEnabled;
                setBriefEnabled(next);
                try {
                  await api.post('/auth/morning-brief', { enabled: next });
                  toast({ title: next ? 'Briefing activé' : 'Briefing désactivé', description: next ? 'Vous recevrez votre brief demain à 8h.' : 'Vous ne recevrez plus de brief automatique.' });
                  refreshUser();
                } catch (e) {
                  setBriefEnabled(!next);
                  toast({ title: 'Erreur', variant: 'destructive' });
                }
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${briefEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${briefEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Referral System */}
        <div className={`mt-6 rounded-2xl border p-6 ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-cyan-400/10 text-cyan-500">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold">Programme de Parrainage</h3>
              <p className={`text-[13px] ${dark ? 'text-white/40' : 'text-slate-500'}`}>Gagnez 200 crédits par ami invité.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className={`flex-1 h-11 px-4 rounded-xl border flex items-center text-[13px] font-mono ${dark ? 'bg-black border-white/10 text-white/60' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              {window.location.origin}/login?ref={user?.referral_code}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/login?ref=${user?.referral_code}`);
                toast({ title: 'Lien copié !' });
              }}
              className={`h-11 px-4 rounded-xl border text-[13px] font-medium flex items-center gap-2 transition-all ${dark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Link className="w-4 h-4" /> Copier
            </button>
          </div>
          <p className="mt-3 text-[11px] opacity-40 italic">L'invité reçoit 100 crédits/jour au lieu de 50 pour toujours.</p>
        </div>

        {/* Danger zone */}
        <div className={`mt-10 rounded-2xl border p-6 border-red-500/20 bg-red-500/5`}>
          <h3 className="text-[16px] font-bold text-red-500 mb-2">Supprimer mon compte</h3>
          <p className={`text-[13px] mb-4 ${dark ? 'text-white/40' : 'text-slate-500'}`}>
            Toutes vos données seront définitivement supprimées. Cette action est irréversible.
          </p>
          <button
            onClick={async () => {
              if (window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ?")) {
                await api.delete('/auth/delete-account');
                window.location.href = '/';
              }
            }}
            className="px-5 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-[13px] transition-all"
          >
            Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  );
}
