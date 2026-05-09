import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Plug, Sparkles, ArrowRight, ShieldCheck, Cpu, Globe, Rocket, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { JarvisFace, JarvisWordmark } from '../components/JarvisLogo';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { t } from '../lib/i18n';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pending, setPending] = useState(null);

  const handleAction = async (planId) => {
    if (!user) {
      navigate('/login?signup=1' + (planId ? `&plan=${planId}` : ''));
      return;
    }
    
    setPending(planId);
    try {
      const { data } = await api.post('/billing/topup', { amount_credits: planId });
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la création de la session de paiement.");
    } finally {
      setPending(null);
    }
  };

  const PLANS = [
    {
      id: 'starter',
      name: 'Starter',
      price: '9.99',
      oldPrice: '19.99',
      desc: 'Pour les constructeurs occasionnels.',
      features: [
        { text: '1,000 crédits mensuels', icon: <Zap className="w-4 h-4 text-amber-500" /> },
        { text: 'Plugins Google + GitHub', icon: <Plug className="w-4 h-4 text-cyan-400" /> },
        { text: '5 déploiements GitHub', icon: <Rocket className="w-4 h-4 text-emerald-400" /> },
        { text: 'Intégration Telegram', icon: <Globe className="w-4 h-4 text-blue-400" /> },
      ],
      button: 'Démarrer',
      highlight: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '24.99',
      oldPrice: '39.99',
      desc: 'Le choix des créateurs ambitieux.',
      features: [
        { text: '2,500 crédits mensuels', icon: <Zap className="w-4 h-4 text-amber-500" /> },
        { text: 'Chief of Staff Engine', icon: <Cpu className="w-4 h-4 text-cyan-400" />, badge: 'NEW' },
        { text: 'Chat illimité', icon: <Sparkles className="w-4 h-4 text-fuchsia-400" /> },
        { text: 'Toutes les intégrations', icon: <Plug className="w-4 h-4 text-cyan-400" /> },
        { text: 'Support prioritaire', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
      ],
      button: 'Passer Pro',
      highlight: true,
    },
    {
      id: 'ultra',
      name: 'Ultra',
      price: '49.99',
      oldPrice: '79.99',
      desc: 'Puissance maximale pour experts.',
      features: [
        { text: '5,000 crédits mensuels', icon: <Zap className="w-4 h-4 text-amber-500" /> },
        { text: 'Deep Research Mode', icon: <Globe className="w-4 h-4 text-cyan-400" /> },
        { text: 'User DNA Engine', icon: <Cpu className="w-4 h-4 text-fuchsia-400" />, badge: 'BETA' },
        { text: 'Agents 24/7 Illimités', icon: <Rocket className="w-4 h-4 text-emerald-400" /> },
        { text: 'Chief of Staff Engine', icon: <Cpu className="w-4 h-4 text-cyan-400" />, badge: 'NEW' },
      ],
      button: 'Mode Ultra',
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-cyan-500/30">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#0d0d14]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <JarvisFace size={32} />
            <JarvisWordmark />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-[14px] font-medium text-white/60 hover:text-white transition-colors">Connexion</button>
            <button onClick={() => navigate('/login?signup=1')} className="px-5 h-10 rounded-xl bg-white text-black font-bold text-[14px] hover:bg-white/90 transition-all">Essai gratuit</button>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6 text-center mb-20">
          <h1 className="text-[56px] md:text-[72px] font-[900] tracking-tighter leading-tight mb-6">
            Choisissez votre <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-violet-500">puissance</span>
          </h1>
          <p className="text-[18px] md:text-[20px] text-[#8888a0] max-w-2xl mx-auto">
            Jarvis s'adapte à vos ambitions. Changez de plan à tout moment pour débloquer plus d'intelligence.
          </p>
        </div>

        {/* CARDS */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {PLANS.map((p) => (
            <div key={p.id} className={p.highlight ? 'pro-glow-border h-full' : ''}>
              <div className={`rounded-[20px] p-8 border transition-all duration-500 flex flex-col h-full ${
                p.highlight 
                  ? 'bg-[#12121a] border-transparent card-shadow-cyan scale-[1.05] z-10' 
                  : 'bg-[#12121a] border-white/10 hover:border-white/20'
              }`}>
                <div className="mb-8">
                  <h3 className="text-[20px] font-bold mb-2">{p.name}</h3>
                  <p className="text-[#8888a0] text-[14px]">{p.desc}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[48px] font-black tracking-tighter">€{p.price}</span>
                    <span className="text-[#8888a0] text-[16px]">/mois</span>
                  </div>
                  <div className="text-red-500/80 text-[14px] line-through font-medium ml-1">
                    €{p.oldPrice}
                  </div>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-[14px] text-white/90">
                      <div className="flex-shrink-0">{f.icon}</div>
                      <span className="flex-1 leading-tight">{f.text}</span>
                      {f.badge && (
                        <span className={`flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                          f.badge === 'NEW' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-fuchsia-500/20 text-fuchsia-400'
                        }`}>
                          {f.badge}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleAction(p.id)}
                  disabled={!!pending}
                  className={`w-full h-12 rounded-xl font-bold text-[15px] transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                    p.id === 'pro'
                      ? 'bg-gradient-to-r from-cyan-400 to-violet-500 text-black shadow-xl shadow-cyan-500/20'
                      : p.id === 'starter'
                        ? 'border border-white hover:bg-white hover:text-black'
                        : 'bg-violet-900 border border-violet-500/50 hover:bg-violet-800'
                  }`}
                >
                  {pending === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : p.button}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* WHY JARVIS STATS */}
        <div className="max-w-5xl mx-auto px-6 mt-40">
          <div className="text-center mb-16">
            <h2 className="text-[32px] font-bold tracking-tight">Pourquoi Jarvis ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            {[
              { val: '96%', label: 'Marge reversée en puissance IA', sub: 'On ne gagne pas sur les tokens, on gagne sur votre succès.' },
              { val: '20+', label: 'Missions automatisées par mois', sub: 'Libérez 40h de travail manuel par mois en mode Pro.' },
              { val: '6', label: 'Agents en parallèle', sub: 'Chaque mission mobilise une équipe IA spécialisée.' },
            ].map((s, i) => (
              <div key={i} className="space-y-3">
                <div className="text-[54px] font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-white/20 leading-none">
                  {s.val}
                </div>
                <div className="text-[16px] font-bold text-cyan-400">{s.label}</div>
                <p className="text-[#8888a0] text-[13px] leading-relaxed">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto px-6 mt-40">
          <h2 className="text-[24px] font-bold mb-8 text-center">Questions fréquentes</h2>
          <div className="space-y-4">
            <FaqItem 
              q="C'est quoi un crédit ?" 
              a="Les crédits alimentent le cerveau de vos agents. Chaque appel à un modèle d'IA (Claude, GPT-4o, Llama) consomme un petit montant selon sa complexité. Un abonnement Pro offre assez de crédits pour environ 20 missions complexes ou 1000 messages de chat." 
            />
            <FaqItem 
              q="Puis-je changer de plan ?" 
              a="Absolument. Vous pouvez upgrader ou downgrader à tout moment. Si vous upgradez, la différence sera calculée au prorata." 
            />
            <FaqItem 
              q="Que se passe-t-il si j'utilise tous mes crédits ?" 
              a="Pas de panique ! Vous pouvez recharger des crédits à la demande (Top-up) sans changer d'abonnement, ou attendre le renouvellement de votre cycle mensuel." 
            />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 bg-[#08080c]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale">
            <JarvisFace size={24} />
            <JarvisWordmark />
          </div>
          <div className="text-[#8888a0] text-[13px]">
            © 2026 Jarvis Intelligence Corp. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all cursor-pointer ${open ? 'bg-[#0d0d14] border-white/20' : 'bg-[#0d0d14] border-white/5 hover:border-white/10'}`} onClick={() => setOpen(!open)}>
      <div className="p-5 flex items-center justify-between">
        <span className="font-bold text-[15px]">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-[#8888a0]" /> : <ChevronDown className="w-4 h-4 text-[#8888a0]" />}
      </div>
      {open && (
        <div className="px-5 pb-5 text-[#8888a0] text-[14px] leading-relaxed animate-in fade-in slide-in-from-top-1">
          {a}
        </div>
      )}
    </div>
  );
}
