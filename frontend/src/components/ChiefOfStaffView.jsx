import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { Play, CheckCircle2, XCircle, Loader2, Clock, Send, ShieldAlert, Cpu } from 'lucide-react';

export default function ChiefOfStaffView() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [missions, setMissions] = useState([]);
  const [report, setReport] = useState(null);
  const [profile, setProfile] = useState(null);
  const [budgetWarning, setBudgetWarning] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/chief/profile');
      setProfile(data);
    } catch (e) {
      console.error(e);
    }
  };

  const parseAndExecute = async (force = false) => {
    if (!prompt.trim() && !force && !budgetWarning) return;
    setLoading(true);
    setMissions([]);
    setReport(null);
    
    try {
      let parsedMissions = budgetWarning?.missions_breakdown || [];
      if (!budgetWarning) {
        const { data: parseData } = await api.post('/chief/parse', { message: prompt });
        if (parseData.missions) {
          parsedMissions = parseData.missions;
        } else {
          parsedMissions = [];
        }
      }

      setBudgetWarning(null);

      // Execute
      try {
        await executeMissions(parsedMissions);
      } catch (e) {
        if (e.response?.data?.requires_confirmation) {
          setBudgetWarning(e.response.data);
          setLoading(false);
        } else if (e.response?.data?.error === 'insufficient_credits') {
          alert(e.response.data.message);
          setLoading(false);
        } else {
          throw e;
        }
      }

    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const executeMissions = async (parsedMissions) => {
    // We send POST /api/chief/execute using fetch to get the streaming response
    const token = localStorage.getItem('jarvis_token');
    const response = await fetch('/api/chief/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ missions: parsedMissions })
    });

    if (response.status === 402) {
        const data = await response.json();
        throw { response: { data } };
    }

    if (!response.ok) throw new Error('Failed to execute');

    // Setup initial state
    setMissions(parsedMissions.map(m => ({ ...m, status: 'waiting', preview: '' })));
    setLoading(false); // input done, waiting for stream

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'init') {
                // start
            } else if (data.type === 'mission_update' || data.mission_id) {
              setMissions(prev => prev.map(m => 
                m.id === data.mission_id 
                  ? { ...m, status: data.status, preview: data.preview || m.preview } 
                  : m
              ));
            } else if (data.type === 'credits_deducted') {
              // Update user credits globally if needed, or trigger event
            } else if (data.type === 'final_report') {
              setReport(data.report);
              loadProfile(); // refresh DNA
            }
          } catch (err) {
            console.error('SSE JSON error', err, line);
          }
        }
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting': return <Clock className="w-5 h-5 text-slate-400" />;
      case 'running': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'done': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className={`flex h-full w-full ${dark ? 'text-white' : 'text-slate-900'}`}>
      
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Chief of Staff</h1>
        <p className={`mb-8 ${dark ? 'text-white/50' : 'text-slate-500'}`}>
          Déléguez plusieurs missions simultanément. Jarvis les analyse et les exécute en parallèle.
        </p>

        {/* Input Area */}
        <div className={`mb-8 rounded-2xl p-4 border ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          <textarea
            className={`w-full h-32 bg-transparent resize-none outline-none text-lg ${dark ? 'placeholder:text-white/20' : 'placeholder:text-slate-400'}`}
            placeholder="Ex: Analyse les 10 derniers commentaires YouTube, génère 3 idées de vidéos, nettoie mon Gmail et ajoute un rappel pour configurer Ollama demain à 14h..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading || missions.some(m => m.status === 'running')}
          />
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
            <div className={`text-sm ${dark ? 'text-white/40' : 'text-slate-500'}`}>
              <Cpu className="inline-block w-4 h-4 mr-2" />
              Powered by Tier WORKER & ELITE
            </div>
            <button
              onClick={() => parseAndExecute(false)}
              disabled={loading || !prompt.trim() || missions.some(m => m.status === 'running')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer la mission
            </button>
          </div>
        </div>

        {/* Budget Guard Warning */}
        {budgetWarning && (
          <div className="mb-8 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold">Confirmation Requise (Budget Guard)</h3>
            </div>
            <p className="mb-4">{budgetWarning.message}</p>
            <ul className="mb-6 space-y-2 opacity-80 text-sm">
              {budgetWarning.missions_breakdown.map((m, i) => (
                <li key={i}>• {m.type} : {m.cost} crédits</li>
              ))}
            </ul>
            <div className="flex gap-4">
              <button 
                onClick={() => parseAndExecute(true)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold shadow-md hover:bg-amber-600"
              >
                Confirmer et Lancer ({budgetWarning.total_cost} crédits)
              </button>
              <button 
                onClick={() => setBudgetWarning(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-white/10 rounded-lg hover:opacity-80"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Missions Dashboard */}
        {missions.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-500" /> Dashboard d'Exécution
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missions.map(mission => (
                <div key={mission.id} className={`p-4 rounded-xl border ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm tracking-wide capitalize">{mission.type.replace(/_/g, ' ')}</span>
                    {getStatusIcon(mission.status)}
                  </div>
                  <div className="text-xs font-mono opacity-50 mb-3">Priority: {mission.priority}</div>
                  {mission.preview && (
                    <div className={`text-sm p-3 rounded-lg ${dark ? 'bg-black/50 text-white/80' : 'bg-slate-50 text-slate-700'}`}>
                      {mission.preview}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Report */}
        {report && (
          <div className={`p-6 rounded-2xl border ${dark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" /> Rapport Consolidé
            </h3>
            <p className="leading-relaxed opacity-90">{report.summary}</p>
          </div>
        )}

      </div>

      {/* Right Sidebar - User DNA */}
      <div className={`w-[300px] border-l p-6 ${dark ? 'bg-black/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
        <h2 className="font-bold tracking-tight mb-6 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" /> Mon Profil Jarvis
        </h2>
        
        {profile ? (
          <div className="space-y-6 text-sm">
            <div>
              <h4 className={`text-xs uppercase font-bold mb-2 ${dark ? 'text-white/40' : 'text-slate-500'}`}>Style d'écriture</h4>
              <p className="opacity-80 italic">"{profile.writing_style || "Apprentissage en cours..."}"</p>
            </div>
            <div>
              <h4 className={`text-xs uppercase font-bold mb-2 ${dark ? 'text-white/40' : 'text-slate-500'}`}>Patterns Détectés</h4>
              {Object.keys(profile.recurring_patterns || {}).length > 0 ? (
                <ul className="list-disc pl-4 opacity-80">
                  {Object.entries(profile.recurring_patterns).map(([k, v]) => (
                    <li key={k}>{k}: {v}</li>
                  ))}
                </ul>
              ) : (
                <p className="opacity-50">Aucun pattern récurrent.</p>
              )}
            </div>
            <div>
              <h4 className={`text-xs uppercase font-bold mb-2 ${dark ? 'text-white/40' : 'text-slate-500'}`}>Préférences</h4>
              <pre className={`p-3 rounded-lg text-xs overflow-x-auto ${dark ? 'bg-black' : 'bg-white'}`}>
                {JSON.stringify(profile.preferences || {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 opacity-50">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
      </div>

    </div>
  );
}
