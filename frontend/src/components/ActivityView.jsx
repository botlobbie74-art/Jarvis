import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Activity, Loader2, Sparkles, Code2, Mail, CheckCircle2, Zap } from 'lucide-react';
import { JarvisFace, JarvisWordmark } from './JarvisLogo';
import { useNavigate } from 'react-router-dom';

export default function ActivityView() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/activity');
        setActivities(data);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type) => {
    if (type.includes('build')) return <Code2 className="w-4 h-4 text-blue-400" />;
    if (type.includes('email')) return <Mail className="w-4 h-4 text-amber-400" />;
    if (type.includes('referral')) return <Zap className="w-4 h-4 text-cyan-400" />;
    if (type.includes('new_user')) return <Sparkles className="w-4 h-4 text-purple-400" />;
    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  };

  const getLabel = (type) => {
    if (type.includes('build')) return 'Application buildée';
    if (type.includes('email')) return 'Email traité';
    if (type.includes('referral')) return 'Nouveau parrainage';
    if (type.includes('new_user')) return 'Nouvel utilisateur rejoint Jarvis';
    if (type.includes('task')) return 'Mission accomplie';
    return type;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="border-b border-white/10 bg-[#0d0d14]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <JarvisFace size={24} />
            <JarvisWordmark />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[12px] font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            LIVE ACTIVITY
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-[32px] font-[900] tracking-tighter mb-2">Preuve Sociale Jarvis</h1>
          <p className="text-white/40 text-[15px]">Activités en temps réel sur la plateforme (anonymisé).</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-white/20" /></div>
        ) : (
          <div className="space-y-4">
            {activities.map((a, i) => (
              <div 
                key={a.id} 
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 animate-slide-in-bottom"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  {getIcon(a.event_type)}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-medium">{getLabel(a.event_type)}</div>
                  <div className="text-[11px] text-white/30 uppercase tracking-widest font-bold mt-0.5">
                    {new Date(a.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-[10px] text-white/20 font-mono">
                  #{a.id.split('-')[0]}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 p-8 rounded-[32px] bg-gradient-to-br from-indigo-500 to-purple-600 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
          <h2 className="text-[24px] font-bold mb-4 relative z-10">Prêt à déléguer votre vie ?</h2>
          <button 
            onClick={() => navigate('/login?signup=1')}
            className="h-12 px-8 rounded-xl bg-white text-black font-bold text-[14px] transition-transform group-hover:scale-105 relative z-10"
          >
            Commencer gratuitement
          </button>
        </div>
      </div>
    </div>
  );
}
