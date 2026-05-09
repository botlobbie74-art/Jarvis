import React, { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { Loader2, CreditCard, Check, Crown, Zap, Sparkles, ExternalLink } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const PLAN_INFO = {
  free:    { name: 'Gratuit', color: '#64748b' },
  starter: { name: 'Starter', color: '#06b6d4' },
  pro:     { name: 'Pro', color: '#8b5cf6' },
  ultra:   { name: 'Ultra', color: '#7c3aed' },
};

const MONTHLY_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '9.99',
    description: 'Pour démarrer avec des agents IA fiables.',
    button: 'Choisir Starter',
    style: 'starter',
    features: ['1 000 crédits mensuels', 'Agents IA essentiels', 'Intégration Telegram'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '24.99',
    description: 'Le meilleur équilibre entre puissance et volume.',
    button: 'Passer Pro',
    style: 'pro',
    popular: true,
    features: ['2 500 crédits mensuels', 'Chat illimité', 'Tous les plugins', 'Support prioritaire'],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: '49.99',
    description: 'Pour les workflows intensifs et la recherche avancée.',
    button: 'Activer Ultra',
    style: 'ultra',
    features: ['5 000 crédits mensuels', 'Mode ultra intelligent', 'Recherche approfondie', 'Support VIP 24/7'],
  },
];

export default function BillingView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const [autoTopup, setAutoTopup] = useState(false);
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const paymentSuccess = params.get('success') === 'true';
  const paymentCancelled = params.get('cancelled') === 'true';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/plan');
      setData(data || {});
    } catch (e) {
      setData({});
      toast({ title: 'Impossible de charger la facturation', variant: 'destructive' });
    } finally { 
      setLoading(false); 
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const topup = async (amount) => {
    setPending(amount);
    try {
      const { data } = await api.post('/billing/topup', { amount_credits: amount });
      window.location.href = data.url;
    } catch (e) {
      toast({ title: 'Paiement impossible', description: e?.response?.data?.detail || 'Erreur pendant le paiement', variant: 'destructive' });
    } finally { setPending(null); }
  };

  const portal = async () => {
    try {
      const { data } = await api.post('/billing/portal');
      window.location.href = data.url;
    } catch (e) {
      toast({ title: 'Aucun abonnement actif', variant: 'destructive' });
    }
  };

  if (loading || !data) {
    return <div className="flex-1 flex items-center justify-center bg-[#0a0a0f]"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>;
  }

  const plan = data.plan || 'free';
  const info = PLAN_INFO[plan] || PLAN_INFO.free;
  const credits = data.credits || 0;
  const creditPrices = data.credit_prices || {};

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0f] text-white">
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <CreditCard className="w-6 h-6 text-cyan-400" />
          <h1 className="text-[28px] font-[900] tracking-tighter">Facturation</h1>
        </div>
        <p className="mb-8 text-white/45">Gérez votre forfait, vos crédits et vos recharges.</p>

        {paymentSuccess && (
          <div className="mb-6 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-[14px] font-semibold text-emerald-300">
            ✅ Paiement réussi ! Tes crédits ont été ajoutés.
          </div>
        )}

        {paymentCancelled && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[14px] font-medium text-white/70">
            Paiement annulé. Tu peux réessayer quand tu veux.
          </div>
        )}

        <div className="rounded-2xl border border-[#ffffff15] bg-[#12121a] p-6 mb-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex gap-8">
              <div >
                <div className="text-[12px] uppercase tracking-wider font-semibold text-white/35">Forfait actuel</div>
                <div className="flex items-center gap-2 mt-1">
                  <Crown className="w-5 h-5" style={{ color: info.color }} />
                  <span className="text-[24px] font-bold">{info.name}</span>
                  <span className="text-[12px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400">{data.status || 'actif'}</span>
                </div>
                {data.current_period_end && (
                  <div className="text-[13px] mt-1 text-white/35">Renouvellement le {new Date(data.current_period_end).toLocaleDateString('fr-FR')}</div>
                )}
              </div>
              <div className="border-l border-white/10 pl-8">
                <div className="text-[12px] uppercase tracking-wider font-semibold text-white/35">Solde de crédits</div>
                <div className="flex items-center gap-2 mt-1">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <span className="text-[24px] font-bold">{credits.toLocaleString()}</span>
                  <span className="text-[12px] text-white/35">crédits</span>
                </div>
                <div className="text-[13px] mt-1 text-white/35">Utilisés pour le chat IA et les générations d'apps.</div>
              </div>
            </div>
            {plan !== 'free' && (
              <button onClick={portal} className="h-9 px-4 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors bg-white/5 hover:bg-white/10 text-white border border-white/10">
                Gérer l'abonnement <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-bold">Recharger des crédits</h2>
            <label className="flex items-center gap-3 cursor-pointer rounded-full border border-[#ffffff15] bg-[#12121a] px-3 py-2 text-white/70 transition-colors hover:border-cyan-400/40">
              <input type="checkbox" checked={autoTopup} onChange={(e) => {
                setAutoTopup(e.target.checked);
                toast({ title: e.target.checked ? 'Auto-recharge activée' : 'Auto-recharge désactivée', description: 'Sous 500 crédits, Jarvis relancera une recharge de 1 000 crédits.' });
              }} className="peer sr-only" />
              <span className={`relative h-5 w-9 rounded-full transition-colors ${autoTopup ? 'bg-cyan-500' : 'bg-white/10'}`}>
                <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${autoTopup ? 'translate-x-4' : ''}`} />
              </span>
              <span className="text-[12px] font-medium">Auto-recharge</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(creditPrices).map(([amount, price]) => (
              <div key={amount} className="rounded-2xl p-6 border border-[#ffffff15] bg-[#12121a] transition-all hover:border-cyan-400/50 group">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="font-bold">{Number(amount).toLocaleString('fr-FR')} crédits</span>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-[24px] font-bold">€{price}</span>
                </div>
                <button
                  onClick={() => topup(amount)}
                  disabled={pending === amount}
                  className="w-full h-10 rounded-xl font-bold text-[14px] transition-all disabled:opacity-60 bg-white text-black hover:bg-white/90"
                >
                  {pending === amount ? 'Chargement...' : 'Acheter'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-[18px] font-bold mb-3">Forfaits mensuels</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MONTHLY_PLANS.map((monthlyPlan) => (
              <UpgradeCard
                key={monthlyPlan.id}
                plan={monthlyPlan}
                active={plan === monthlyPlan.id}
                pending={pending === monthlyPlan.id}
                onClick={() => topup(monthlyPlan.id)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6 border border-[#ffffff15] bg-[#12121a] text-center text-white/45">
          <p className="text-[13px]">
            Toutes les transactions sont sécurisées par Stripe. Les crédits mensuels sont ajoutés automatiquement à chaque renouvellement.
          </p>
        </div>
      </div>
    </div>
  );
}

const UpgradeCard = ({ plan, active, onClick, pending }) => (
  <div className={`${plan.popular ? 'pro-glow-border' : ''} h-full`}>
    <div className={`rounded-[20px] p-8 border transition-all hover:-translate-y-1 relative h-full flex flex-col ${
      plan.popular
        ? 'bg-[#12121a] border-transparent shadow-[0_0_34px_rgba(34,211,238,0.14)]'
        : 'bg-[#12121a] border-[#ffffff15] hover:border-white/25'
    } ${active ? 'ring-1 ring-cyan-400/40' : ''}`}>
    {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-[#061017] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xl shadow-cyan-500/20">LE PLUS POPULAIRE</div>}
    <div className="flex items-center gap-2 mb-3">
      {plan.popular ? <Zap className="w-5 h-5 text-cyan-400" /> : <Sparkles className="w-5 h-5 text-cyan-400" />}
      <span className="font-bold text-[18px]">{plan.name}</span>
      {active && <span className="ml-auto rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">Actif</span>}
    </div>
    <p className="mb-6 min-h-[40px] text-[14px] leading-relaxed text-white/45">{plan.description}</p>
    <div className="flex items-baseline gap-1 mb-6">
      <span className="text-[42px] font-bold">€{plan.price}</span>
      <span className="text-white/40">/mois</span>
    </div>
    <ul className="mb-8 space-y-3 flex-1">
      {plan.features.map((f) => (
        <li key={f} className="flex items-center gap-2.5 text-[14px]">
          <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span className="text-white/70">{f}</span>
        </li>
      ))}
    </ul>
    <button onClick={onClick} disabled={pending} className={`w-full h-12 rounded-xl font-bold text-[14px] transition-all disabled:opacity-60 flex items-center justify-center ${
      plan.style === 'pro'
        ? 'bg-gradient-to-r from-cyan-400 to-violet-500 text-black shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30'
        : plan.style === 'starter'
          ? 'border border-white/20 text-white hover:bg-white hover:text-black'
          : 'bg-violet-900 border border-violet-500/50 text-white hover:bg-violet-800'
    }`}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : plan.button}
    </button>
    </div>
  </div>
);
