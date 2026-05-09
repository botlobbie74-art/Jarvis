import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Loader2, CreditCard, Check, Crown, Zap, Sparkles, ExternalLink } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const PLAN_INFO = {
  free:    { name: 'Free', color: '#64748b' },
  starter: { name: 'Starter', color: '#06b6d4' },
  pro:     { name: 'Pro', color: '#8b5cf6' },
};

export default function BillingView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const [autoTopup, setAutoTopup] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/plan');
      setData(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const topup = async (amount) => {
    setPending(amount);
    try {
      const { data } = await api.post('/billing/topup', { amount_credits: amount });
      window.location.href = data.url;
    } catch (e) {
      toast({ title: 'Payment failed', description: e?.response?.data?.detail || 'Error during top-up', variant: 'destructive' });
    } finally { setPending(null); }
  };

  const portal = async () => {
    try {
      const { data } = await api.post('/billing/portal');
      window.location.href = data.url;
    } catch (e) {
      toast({ title: 'No active subscription', variant: 'destructive' });
    }
  };

  if (loading || !data) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const plan = data.plan || 'free';
  const info = PLAN_INFO[plan];
  const credits = data.credits || 0;
  const creditPrices = data.credit_prices || {};

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-1">
          <CreditCard className="w-6 h-6 text-slate-900" />
          <h1 className="text-[28px] font-semibold text-slate-900">Billing & usage</h1>
        </div>
        <p className="text-slate-500 mb-8">Manage your subscription and check your monthly usage.</p>

        {/* Current plan & Credits */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex gap-8">
              <div >
                <div className="text-[12px] uppercase tracking-wider text-slate-400 font-semibold">Current plan</div>
                <div className="flex items-center gap-2 mt-1">
                  <Crown className="w-5 h-5" style={{ color: info.color }} />
                  <span className="text-[24px] font-semibold text-slate-900">{info.name}</span>
                  <span className="text-[12px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">{data.status || 'active'}</span>
                </div>
                {data.current_period_end && (
                  <div className="text-[13px] text-slate-500 mt-1">Renews on {new Date(data.current_period_end).toLocaleDateString()}</div>
                )}
              </div>
              <div className="border-l border-slate-200 pl-8">
                <div className="text-[12px] uppercase tracking-wider text-slate-400 font-semibold">Credit Balance</div>
                <div className="flex items-center gap-2 mt-1">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="text-[24px] font-semibold text-slate-900">{credits.toLocaleString()}</span>
                  <span className="text-[12px] text-slate-500">credits</span>
                </div>
                <div className="text-[13px] text-slate-500 mt-1">Used for builds & AI chat</div>
              </div>
            </div>
            {plan !== 'free' && (
              <button onClick={portal} className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-medium flex items-center gap-1.5 transition-colors">
                Manage subscription <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Credit Top-ups */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[18px] font-semibold text-slate-900">Top up Credits</h2>
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200 hover:border-amber-500 transition-colors">
              <input type="checkbox" checked={autoTopup} onChange={(e) => {
                setAutoTopup(e.target.checked);
                toast({ title: e.target.checked ? 'Auto-topup enabled' : 'Auto-topup disabled', description: 'When balance falls below 500, we will auto-recharge 1000 credits.' });
              }} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-[12px] font-medium text-slate-700">Auto-recharge (1000 credits)</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(creditPrices).map(([amount, price]) => (
              <div key={amount} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-amber-500 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-slate-900">{amount} Credits</span>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-[24px] font-bold text-slate-900">€{price}</span>
                </div>
                <button
                  onClick={() => topup(amount)}
                  disabled={pending === amount}
                  className="w-full h-10 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-medium transition-colors disabled:opacity-60"
                >
                  {pending === amount ? 'Processing...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Plans are now legacy, everything is credit-based */}
        <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200 text-center">
          <p className="text-slate-500 text-[13px]">
            We have moved to a flexible credit system. Your legacy plan is still active, but all new usage is billed via credits.
          </p>
        </div>
      </div>
    </div>
  );
}

const UpgradeCard = ({ name, price, features, onClick, pending, highlight }) => (
  <div className={`rounded-2xl p-6 border relative ${highlight ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}>
    {highlight && <div className="absolute -top-2.5 right-4 bg-cyan-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">Popular</div>}
    <div className="flex items-center gap-2 mb-2">
      {highlight ? <Zap className="w-4 h-4 text-cyan-400" /> : <Sparkles className="w-4 h-4 text-cyan-600" />}
      <span className="font-semibold">{name}</span>
    </div>
    <div className="flex items-baseline gap-1 mb-1"><span className="text-[32px] font-bold">${price}</span><span className={highlight ? 'text-slate-300' : 'text-slate-500'}>/mo</span></div>
    <ul className="my-4 space-y-1.5">
      {features.map((f) => <li key={f} className="flex items-center gap-1.5 text-[13px]"><Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{f}</li>)}
    </ul>
    <button onClick={onClick} disabled={pending} className={`w-full h-10 rounded-lg font-medium transition-colors disabled:opacity-60 ${highlight ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
      {pending ? 'Loading...' : `Upgrade to ${name}`}
    </button>
  </div>
);
