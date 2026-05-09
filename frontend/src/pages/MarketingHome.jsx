import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, ArrowRight, Zap, Code2, Plug, Github, MessageSquare, Calendar, Hammer, Bot, Globe } from 'lucide-react';
import { WingmanFace, WingmanWordmark } from '../components/WingmanLogo';

const PRICING = [
  {
    id: 'starter', name: 'Starter', price: '9.99', tagline: 'For occasional tasks',
    cta: 'Get started', highlight: false,
    features: ['1,000 Credits included / month', 'Pay as you go top-ups', 'Google + GitHub plugins', '5 GitHub repo pushes', 'Telegram integration'],
  },
  {
    id: 'pro', name: 'Pro', price: '24.99', tagline: 'For solo builders',
    cta: 'Start building', highlight: true, badge: 'Most popular',
    features: ['2,500 Credits included / month', 'Unlimited chat', 'All plugins (Telegram)', 'Unlimited GitHub pushes', 'Priority email support', 'Background tasks'],
  },
  {
    id: 'ultra', name: 'Ultra', price: '49.99', tagline: 'For power users',
    cta: 'Go Ultra', highlight: false,
    features: ['5,000 Credits included / month', 'Unlimited chat', 'Ultra-Smart Mode', 'Deep Research access', 'Priority chat support', 'Early access to new features'],
  },
];

const FEATURES = [
  { icon: Bot, title: 'Autonomous AI engineer', desc: 'Describe an app. Jarvis plans, codes, tests, and pushes it to GitHub — without a single line from you.' },
  { icon: Globe, title: 'Web search built in', desc: 'Jarvis browses the web for you — finds answers, scrapes pages, summarizes articles, fact-checks before acting.' },
  { icon: Calendar, title: 'Runs your tasks', desc: 'Background jobs that summarize emails, prep your morning briefing, follow up on leads — while you sleep.' },
  { icon: Plug, title: 'Connected Google Workspace', desc: 'Reads your Sheets, drafts your Docs, schedules in Calendar, finds files in Drive — with one OAuth click.' },
  { icon: Hammer, title: 'Built-in IDE', desc: 'Real Monaco editor (the engine behind VS Code) lives inside Jarvis. Edit any generated file, save in one click.' },
  { icon: Zap, title: 'Multi-LLM router', desc: 'Routes every task to the best free model — Gemini Flash for planning, Mistral Codestral for code, Groq Llama for chat. Auto-fallback on quota.' },
  { icon: MessageSquare, title: 'Telegram bot', desc: 'Message Jarvis directly from Telegram. Get replies, run tasks, ship code — without opening the app.' },
  { icon: Code2, title: 'Code shipped to your GitHub', desc: 'Every project gets its own repo on your account. Open the PR, deploy from there, own the code.' },
  { icon: Sparkles, title: '5 specialized assistants', desc: 'Jarvis (tech), Judy (sales), Alfred (exec), Venus (content), Donna (personal) — each with their own brain.' },
];

const HOW = [
  { n: 1, title: 'Concept', desc: 'Share your vision in plain English or French. Jarvis deeply understands complex business logic and intent.', color: 'from-blue-400 to-cyan-400' },
  { n: 2, title: 'Architect', desc: 'Jarvis generates a multi-phase technical blueprint, architecting every component before writing a single line.', color: 'from-cyan-400 to-emerald-400' },
  { n: 3, title: 'Execute', desc: 'Our specialized AI agents build your application file-by-file with production-grade code and robust logic.', color: 'from-emerald-400 to-amber-400' },
  { n: 4, title: 'Deploy', desc: 'One click pushes your full project to a clean GitHub repository, ready for production and scaling.', color: 'from-amber-400 to-fuchsia-400' },
];

const FAQ = [
  { q: 'Do I need to provide my own API keys?', a: 'No. Jarvis runs on our own high-performance infrastructure. You get instant access to the best models without any setup.' },
  { q: 'Where does the generated code live?', a: 'In your own GitHub account. We create the repo, you own it forever.' },
  { q: 'Can Jarvis read my Google Sheets / Docs?', a: 'Yes — connect Google in Plugins. Jarvis can read, write and act on your behalf with OAuth scopes you approve.' },
  { q: 'How does the Telegram integration work?', a: 'Connect your account in Plugins, then message @JarvisBot on Telegram. Your messages are routed directly to your AI assistant.' },
  { q: 'Cancel anytime?', a: 'Yes. Manage everything from the Stripe customer portal — one click cancel.' },
];

export default function MarketingHome() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center">
          <div className="flex items-center gap-2"><WingmanFace size={28} /><WingmanWordmark /></div>
          <div className="hidden md:flex items-center gap-6 ml-10 text-[14px] text-slate-600">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate('/login')} className="text-[14px] text-slate-700 hover:text-slate-900 px-3 h-9">Sign in</button>
            <button onClick={() => navigate('/login?signup=1')} className="bg-slate-900 hover:bg-slate-800 text-white text-[14px] h-9 px-4 rounded-full transition-colors">Get started</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-24 border-b border-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,163,255,0.05),transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-900/5 border border-slate-200 rounded-full px-4 py-1.5 text-[13px] font-medium text-slate-700 mb-10 hover:bg-slate-900/10 transition-colors cursor-default">
            <Sparkles className="w-4 h-4 text-cyan-500" /> Professional AI Infrastructure
          </div>
          <h1 className="text-[64px] md:text-[96px] font-[800] tracking-tighter text-slate-900 leading-[0.95] mb-8">
            Your Digital Twin.<br />
            <span className="text-slate-400">Not a Bot.</span>
          </h1>
          <p className="mt-8 text-[20px] md:text-[22px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Scale your productivity, not your workload. The first autonomous AI agent that actually <span className="text-slate-900 font-semibold">understands your business</span> before it speaks.
          </p>
          <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login?signup=1')} className="h-14 px-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[16px] flex items-center gap-2 transition-all hover:scale-105 shadow-2xl shadow-slate-900/20">
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#how" className="h-14 px-10 rounded-full border border-slate-200 hover:border-slate-400 text-slate-900 font-bold text-[16px] flex items-center transition-all bg-white">
              See how it works
            </a>
          </div>
          <div className="mt-20 flex items-center justify-center gap-10 text-[13px] font-medium text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Enterprise Grade</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Zero configuration</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Full Ownership</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-20">
            <div className="inline-block px-3 py-1 rounded-lg bg-red-50 text-red-600 text-[12px] font-bold uppercase tracking-wider mb-6">Visual Intelligence</div>
            <h2 className="text-[48px] md:text-[64px] font-bold text-slate-900 tracking-tighter leading-[0.95]">
              Jarvis doesn't just read text.<br />
              <span className="text-slate-400">He understands your vision.</span>
            </h2>
            <p className="mt-8 text-slate-500 text-[18px] max-w-2xl leading-relaxed">
              It transcribes your ideas, analyzes the context, and plans the entire architecture before composing a single word. The result? Projects that feel eerily human.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {FEATURES.slice(0, 3).map((f) => (
              <div key={f.title} className="group">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 transform group-hover:rotate-6">
                  <f.icon className="w-6 h-6" />
                </div>
                <div className="text-[20px] font-bold text-slate-900 mb-3">{f.title}</div>
                <div className="text-[15px] text-slate-500 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[13px] uppercase tracking-wider text-cyan-600 font-semibold mb-2">How it works</div>
            <h2 className="text-[40px] font-semibold text-slate-900 tracking-tight">From idea to GitHub in 4 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {HOW.map((s) => (
              <div key={s.n} className="group relative">
                <div className="absolute -inset-4 bg-slate-50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} text-white font-bold text-[22px] flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}>
                  {s.n}
                </div>
                <div className="text-[20px] font-bold text-slate-900 mb-2">{s.title}</div>
                <div className="text-[15px] text-slate-600 leading-relaxed">{s.desc}</div>
                {s.n < 4 && (
                  <div className="hidden md:block absolute top-7 left-[calc(100%+16px)] w-[calc(100%-48px)] h-px bg-slate-100" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[13px] uppercase tracking-wider text-cyan-600 font-semibold mb-2">Pricing</div>
            <h2 className="text-[40px] font-semibold text-slate-900 tracking-tight">Simple, fair, no surprises</h2>
            <p className="text-slate-600 mt-2 text-[15px]">Choose the plan that fits your pace. Upgrade as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRICING.map((p) => (
              <div key={p.id} className={`relative rounded-2xl p-7 border ${
                p.highlight ? 'bg-slate-900 text-white border-slate-900 shadow-2xl md:scale-[1.02]' : 'bg-white border-slate-200'
              }`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">{p.badge}</div>
                )}
                <div className={`text-[14px] font-semibold ${p.highlight ? 'text-cyan-300' : 'text-cyan-600'}`}>{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-[44px] font-bold tracking-tight">${p.price}</span>
                  <span className={p.highlight ? 'text-slate-300' : 'text-slate-500'}>/mo</span>
                </div>
                <div className={`text-[14px] mb-6 ${p.highlight ? 'text-slate-300' : 'text-slate-500'}`}>{p.tagline}</div>
                <button
                  onClick={() => navigate(p.id === 'free' ? '/login?signup=1' : `/login?signup=1&plan=${p.id}`)}
                  className={`w-full h-11 rounded-full font-medium transition-colors mb-6 ${
                    p.highlight ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {p.cta}
                </button>
                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[14px]">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.highlight ? 'text-cyan-300' : 'text-emerald-500'}`} />
                      <span className={p.highlight ? 'text-slate-200' : 'text-slate-700'}>{f}</span>
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
            <div className="text-[13px] uppercase tracking-wider text-cyan-600 font-semibold mb-2">FAQ</div>
            <h2 className="text-[40px] font-semibold text-slate-900 tracking-tight">Common questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="group bg-slate-50 rounded-xl border border-slate-200 p-5 cursor-pointer">
                <summary className="font-semibold text-slate-900 flex items-center justify-between list-none">
                  {f.q}
                  <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="text-[14px] text-slate-600 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-[44px] font-semibold tracking-tight">Ready to ship faster?</h2>
          <p className="text-slate-300 mt-3 text-[16px]">Join the builders who let Jarvis do the heavy lifting.</p>
          <button onClick={() => navigate('/login?signup=1')} className="mt-8 h-12 px-6 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-medium inline-flex items-center gap-2 transition-colors">
            Start building <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-[12px] text-slate-500">
          <div className="flex items-center gap-2"><WingmanFace size={20} /><span className="font-semibold text-slate-700">Jarvis</span><span>· Autonomous AI</span></div>
          <div>&copy; {new Date().getFullYear()} Jarvis Agent. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
