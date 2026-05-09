import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, ArrowRight, Zap, Code2, Plug, Github, MessageSquare, Calendar, Hammer, Bot, Globe } from 'lucide-react';
import { JarvisFace, JarvisWordmark } from '../components/JarvisLogo';
import { t } from '../lib/i18n';

export default function MarketingHome() {
  const navigate = useNavigate();

  const PRICING = [
    {
      id: 'starter', name: 'Starter', price: '9.99', tagline: t('pricing_starter_tag'),
      cta: t('hero_start'), highlight: false,
      features: [t('pricing_starter_f1'), t('pricing_starter_f2'), t('pricing_starter_f3'), t('pricing_starter_f4'), t('pricing_starter_f5')],
    },
    {
      id: 'pro', name: 'Pro', price: '24.99', tagline: t('pricing_pro_tag'),
      cta: t('pricing_pro_cta'), highlight: true, badge: t('pricing_popular'),
      features: [t('pricing_pro_f1'), t('pricing_pro_f2'), t('pricing_pro_f3'), t('pricing_pro_f4'), t('pricing_pro_f5'), t('pricing_pro_f6')],
    },
    {
      id: 'ultra', name: 'Ultra', price: '49.99', tagline: t('pricing_ultra_tag'),
      cta: t('pricing_ultra_cta'), highlight: false,
      features: [t('pricing_ultra_f1'), t('pricing_ultra_f2'), t('pricing_ultra_f3'), t('pricing_ultra_f4'), t('pricing_ultra_f5'), t('pricing_ultra_f6')],
    },
  ];

  const INTEGRATIONS = [
    { title: t('int_business'), desc: t('int_business_desc'), icon: '💳', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { title: t('int_comm'), desc: t('int_comm_desc'), icon: '💬', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { title: t('int_intel'), desc: t('int_intel_desc'), icon: '🧠', color: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100' },
    { title: t('int_multiplier'), desc: t('int_multiplier_desc'), icon: '⚡', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  ];

  const HOW = [
    { n: 1, title: t('how_1_title'), desc: t('how_1_desc'), color: 'from-blue-500 to-cyan-500' },
    { n: 2, title: t('how_2_title'), desc: t('how_2_desc'), color: 'from-cyan-500 to-emerald-500' },
    { n: 3, title: t('how_3_title'), desc: t('how_3_desc'), color: 'from-emerald-500 to-amber-500' },
    { n: 4, title: t('how_4_title'), desc: t('how_4_desc'), color: 'from-amber-500 to-fuchsia-500' },
  ];

  const FAQ = [
    { q: t('faq_1_q'), a: t('faq_1_a') },
    { q: t('faq_2_q'), a: t('faq_2_a') },
    { q: t('faq_3_q'), a: t('faq_3_a') },
    { q: t('faq_4_q'), a: t('faq_4_a') },
    { q: t('faq_5_q'), a: t('faq_5_a') },
  ];

  const dark = true; // Forced dark for brand consistency
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-cyan-500/30">
      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-[#0d0d14]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}><JarvisFace size={28} /><JarvisWordmark /></div>
          <div className="hidden md:flex items-center gap-6 ml-10 text-[14px] text-white/50">
            <a href="#features" className="hover:text-white transition-colors">{t('nav_features')}</a>
            <a href="#how" className="hover:text-white transition-colors">{t('nav_how')}</a>
            <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">{t('nav_pricing')}</button>
            <a href="#faq" className="hover:text-white transition-colors">{t('nav_faq')}</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate('/login')} className="text-[14px] text-white/70 hover:text-white px-3 h-9 transition-colors">Connexion</button>
            <button onClick={() => navigate('/login?signup=1')} className="bg-[#0a0a0f] hover:bg-[#0a0a0f]/90 text-black font-bold text-[14px] h-10 px-6 rounded-xl transition-all">Essai gratuit</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-24 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,0.08),transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[#0a0a0f]/5 border border-white/10 rounded-full px-4 py-1.5 text-[13px] font-medium text-white/70 mb-10 hover:bg-[#0a0a0f]/10 transition-colors cursor-default">
            <Sparkles className="w-4 h-4 text-cyan-500" /> Jarvis OS 2.0
          </div>
          <h1 className="text-[54px] md:text-[80px] font-[900] tracking-tighter text-white leading-[1.0] mb-8">
            {t('hero_badge').split('.')[0]}.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#22a3ff] via-[#8b5cf6] to-[#f59e0b] animate-gradient-x">
              {t('hero_badge').split('.')[1] ? t('hero_badge').split('.')[1].trim() + '.' : ''}
            </span>
          </h1>
          <p className="mt-8 text-[20px] md:text-[22px] text-[#8888a0] max-w-2xl mx-auto leading-relaxed">
            {t('hero_p')}
          </p>
          <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login?signup=1')} className="h-14 px-10 rounded-full bg-[#0d0d14] border-white/10 text-white font-bold text-[16px] flex items-center gap-2 transition-all hover:scale-105 shadow-2xl shadow-slate-900/20">
              {t('hero_start')} <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#how" className="h-14 px-10 rounded-full border border-white/10 hover:border-slate-500 text-white font-bold text-[16px] flex items-center transition-all bg-[#0a0a0f]">
              {t('hero_how')}
            </a>
          </div>
          <div className="mt-20 flex items-center justify-center gap-10 text-[13px] font-medium text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Enterprise Grade</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Zero configuration</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Full Ownership</span>
          </div>
        </div>
      </section>

      {/* FEATURES - BENTO GRID */}
      <section id="features" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-20">
            <div className="inline-block px-3 py-1 rounded-lg bg-cyan-900/30 text-cyan-400 text-[12px] font-bold uppercase tracking-wider mb-6">Cognitive System</div>
            <h2 className="text-[48px] md:text-[64px] font-bold text-white tracking-tighter leading-[0.95]">
              {t('features_title')}<br />
              <span className="text-slate-500">{t('features_subtitle')}</span>
            </h2>
            <p className="mt-8 text-[#8888a0] text-[18px] max-w-2xl leading-relaxed">
              {t('features_desc')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            {/* Grand Bloc (Gauche) - L'Ingénieur de Production */}
            <div className="md:col-span-2 md:row-span-2 rounded-[40px] bg-[#12121a] text-white p-12 overflow-hidden relative group border border-white/10 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-[#0a0a0f]/5 rounded-2xl backdrop-blur-md border border-white/10 text-cyan-400">
                    <Code2 size={32} />
                  </div>
                  <span className="font-bold text-slate-500 uppercase tracking-widest text-[14px]">{t('feat_builder_title')}</span>
                </div>
                <h3 className="text-[42px] font-bold mb-4 leading-tight">{t('feat_builder_title_copy') || "De l'idée au commit."}</h3>
                <p className="text-[#8888a0] text-[18px] leading-relaxed max-w-md">{t('feat_builder_desc')}</p>
                
                <div className="mt-auto rounded-2xl bg-[#0a0a0f] p-6 font-mono text-[13px] text-cyan-400 overflow-hidden border border-white/5 shadow-inner relative group-hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center gap-1.5 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <p className="text-[#8888a0] italic mb-2"># jarvis build --platform production</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Architecture: Cloud-Native Microservices</p>
                  <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Frontend: React 19 + Tailwind 4</p>
                  <p className="flex items-center gap-2 text-white animate-pulse">● Deploying to GitHub...</p>
                </div>
              </div>
            </div>

            {/* Moyen Bloc (Droite) - L'Intégrateur Workspace */}
            <div className="md:col-span-1 md:row-span-2 rounded-[40px] bg-[#12121a] border border-white/10 p-10 relative overflow-hidden group shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-900/30 rounded-2xl text-indigo-400">
                    <Plug size={28} />
                  </div>
                  <span className="font-bold text-indigo-400 uppercase tracking-widest text-[14px]">{t('feat_workspace_title')}</span>
                </div>
                <h3 className="text-[28px] font-bold text-white mb-4 leading-tight">{t('feat_workspace_title_copy') || "Votre écosystème, sous stéroïdes."}</h3>
                <p className="text-[#8888a0] text-[16px] leading-relaxed">{t('feat_workspace_desc')}</p>
                
                <div className="mt-auto space-y-4">
                  {[
                    { img: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg', color: 'bg-blue-500', delay: '0' },
                    { img: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Google_Sheets.png', color: 'bg-green-500', delay: '75' },
                    { img: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg', color: 'bg-red-500', delay: '150' }
                  ].map((tool, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a0a0f] border border-white/5 shadow-sm transform group-hover:-translate-x-2 transition-transform" style={{ transitionDelay: `${tool.delay}ms` }}>
                      <img src={tool.tool_img || tool.img} className="w-6 h-6 object-contain" alt="" />
                      <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full ${tool.color} animate-pulse`} style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Petit Bloc (Bas Gauche) - Web Intelligence */}
            <div className="rounded-[40px] bg-[#12121a] border border-white/10 p-8 shadow-lg relative overflow-hidden group hover:border-cyan-900 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-cyan-900/30 rounded-2xl text-cyan-400">
                  <Globe size={24} />
                </div>
                <span className="font-bold text-cyan-400 uppercase tracking-widest text-[12px]">{t('feat_web_title')}</span>
              </div>
              <h3 className="text-[22px] font-bold text-white mb-3">{t('feat_web_title_copy') || "Intelligence Web"}</h3>
              <p className="text-[#8888a0] text-[15px] leading-relaxed">{t('feat_web_desc')}</p>
              <div className="absolute -bottom-2 -right-2 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Globe size={80} className="text-cyan-900" />
              </div>
            </div>

            {/* Petit Bloc (Bas Droite) - Background Tasks */}
            <div className="md:col-span-2 rounded-[40px] bg-[#12121a] border border-white/10 p-8 relative overflow-hidden group hover:bg-[#161622] transition-colors shadow-sm">
              <div className="flex md:flex-row flex-col gap-8 h-full items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-[#0a0a0f]/5 rounded-2xl text-white">
                      <Zap size={24} />
                    </div>
                    <span className="font-bold text-slate-500 uppercase tracking-widest text-[12px]">{t('feat_background_title')}</span>
                  </div>
                  <h3 className="text-[22px] font-bold text-white mb-3">{t('feat_background_title_copy') || "Autonomie en arrière-plan"}</h3>
                  <p className="text-[#8888a0] text-[15px] leading-relaxed max-w-sm">{t('feat_background_desc')}</p>
                </div>
                <div className="w-full md:w-72 bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 shadow-xl transform group-hover:scale-105 transition-transform">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[14px] font-bold text-white">Morning Briefing</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 text-[10px] font-bold">READY</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-emerald-500"></div>
                    </div>
                    <p className="text-[12px] text-[#8888a0]">Jarvis processed 24 tasks while you were away.</p>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-900/20 flex items-center justify-center"><MessageSquare size={14} className="text-indigo-400" /></div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-900/20 flex items-center justify-center"><Check size={14} className="text-emerald-400" /></div>
                      <div className="w-8 h-8 rounded-lg bg-amber-900/20 flex items-center justify-center"><Calendar size={14} className="text-amber-400" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="py-24 bg-[#0d0d14] text-white relative overflow-hidden border-t border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.05),transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-[36px] md:text-[48px] font-bold tracking-tight mb-4">{t('int_title')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {INTEGRATIONS.map((integ, i) => (
              <div key={i} className={`p-6 rounded-2xl border bg-[#0a0a0f]/5 backdrop-blur-sm border-white/10`}>
                <div className="text-3xl mb-4">{integ.icon}</div>
                <h3 className="text-[18px] font-bold mb-2 text-white">{integ.title}</h3>
                <p className="text-[14px] text-[#8888a0] leading-relaxed">{integ.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[13px] uppercase tracking-wider text-cyan-400 font-semibold mb-2">{t('nav_how')}</div>
            <h2 className="text-[40px] font-semibold text-white tracking-tight">{t('how_title')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {HOW.map((s) => (
              <div key={s.n} className="group relative">
                <div className="absolute -inset-4 bg-[#0a0a0f]/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} text-white font-bold text-[22px] flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}>
                  {s.n}
                </div>
                <div className="text-[20px] font-bold text-white mb-2">{s.title}</div>
                <div className="text-[15px] text-[#8888a0] leading-relaxed">{s.desc}</div>
                {s.n < 4 && (
                  <div className="hidden md:block absolute top-7 left-[calc(100%+16px)] w-[calc(100%-48px)] h-px bg-white/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 bg-[#0d0d14]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[13px] uppercase tracking-wider text-cyan-400 font-semibold mb-2">{t('nav_pricing')}</div>
            <h2 className="text-[40px] font-semibold text-white tracking-tight">{t('pricing_title')}</h2>
            <p className="text-[#8888a0] mt-2 text-[15px]">{t('pricing_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRICING.map((p) => (
              <div key={p.id} className={`relative rounded-2xl p-7 border ${
                p.highlight ? 'bg-white text-[#0a0a0f] border-white shadow-2xl md:scale-[1.02]' : 'bg-[#12121a] border-white/10'
              }`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">{p.badge}</div>
                )}
                <div className={`text-[14px] font-semibold ${p.highlight ? 'text-cyan-700' : 'text-cyan-400'}`}>{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-[44px] font-bold tracking-tight">${p.price}</span>
                  <span className={p.highlight ? 'text-slate-500' : 'text-[#8888a0]'}>/mo</span>
                </div>
                <div className={`text-[14px] mb-6 ${p.highlight ? 'text-slate-600' : 'text-[#8888a0]'}`}>{p.tagline}</div>
                <button
                  onClick={() => navigate(p.id === 'free' ? '/login?signup=1' : `/login?signup=1&plan=${p.id}`)}
                  className={`w-full h-11 rounded-full font-medium transition-colors mb-6 ${
                    p.highlight ? 'bg-[#0a0a0f] text-white hover:bg-black' : 'bg-[#0a0a0f] text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {p.cta}
                </button>
                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[14px]">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.highlight ? 'text-cyan-700' : 'text-emerald-500'}`} />
                      <span className={p.highlight ? 'text-[#0a0a0f]' : 'text-slate-300'}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-[13px] uppercase tracking-wider text-cyan-600 font-semibold mb-2">{t('nav_faq')}</div>
            <h2 className="text-[40px] font-semibold text-white tracking-tight">{t('nav_faq_title')}</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="group bg-[#12121a] rounded-xl border border-white/10 p-5 cursor-pointer">
                <summary className="font-semibold text-white flex items-center justify-between list-none">
                  {f.q}
                  <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="text-[14px] text-[#8888a0] mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-slate-900/50 border-t border-b border-white/5 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-[44px] font-semibold tracking-tight">{t('cta_title')}</h2>
          <p className="text-slate-300 mt-3 text-[16px]">{t('cta_subtitle')}</p>
          <button onClick={() => navigate('/login?signup=1')} className="mt-8 h-12 px-6 rounded-full bg-white hover:bg-slate-200 text-[#0a0a0f] font-medium inline-flex items-center gap-2 transition-colors">
            {t('hero_start')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-white/5 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-[12px] text-[#8888a0]">
          <div className="flex items-center gap-2"><JarvisFace size={20} /><span className="font-semibold text-white">Jarvis</span><span>· Autonomous AI</span></div>
          <div>&copy; {new Date().getFullYear()} Jarvis Agent. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
