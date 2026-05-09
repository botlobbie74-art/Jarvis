import React from 'react';
import { Bot, Globe, Database, Sparkles, FolderGit2, CheckCircle2, Zap } from 'lucide-react';

export default function BentoGrid({ t, dark = false }) {
  const bg = dark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200';
  const textTitle = dark ? 'text-white' : 'text-slate-900';
  const textDesc = dark ? 'text-white/60' : 'text-slate-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[300px]">
      {/* Grand Bloc (Gauche) - L'Ingénieur de Production */}
      <div className={`md:col-span-2 md:row-span-2 rounded-3xl p-8 border relative overflow-hidden group ${bg}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><FolderGit2 size={24} /></div>
            <span className={`font-semibold ${textTitle}`}>L'Ingénieur de Production</span>
          </div>
          <h3 className={`text-2xl font-bold mb-2 ${textTitle}`}>De l'idée au commit.</h3>
          <p className={`${textDesc} max-w-md`}>
            Il gère l'architecture, pas juste le code. Jarvis écrit le backend, le frontend, et pousse directement sur GitHub.
          </p>
          <div className="mt-auto flex-1 rounded-xl bg-slate-950 p-4 font-mono text-[13px] text-green-400 overflow-hidden shadow-inner border border-white/10 relative">
            <div className="absolute top-2 right-4 flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <div className="mt-4">
              <span className="text-blue-400">jarvis</span> <span className="text-purple-400">deploy</span> --prod<br/>
              <span className="text-slate-400">[1/3] Analyzing architecture...</span><br/>
              <span className="text-slate-400">[2/3] Writing components...</span><br/>
              <span className="text-slate-400">[3/3] Committing to main...</span><br/>
              ✨ <span className="text-white">Deployed successfully in 4s.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Moyen Bloc (Droite) - L'Intégrateur Workspace */}
      <div className={`md:col-span-1 md:row-span-2 rounded-3xl p-8 border relative overflow-hidden group flex flex-col ${bg}`}>
        <div className="absolute inset-0 bg-gradient-to-bl from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Database size={24} /></div>
          <span className={`font-semibold ${textTitle}`}>L'Intégrateur Workspace</span>
        </div>
        <h3 className={`text-xl font-bold mb-2 ${textTitle}`}>Votre écosystème, sous stéroïdes.</h3>
        <p className={`${textDesc} text-sm mb-6`}>
          Jarvis orchestre vos outils. Il synchronise vos données entre Google, GitHub et Slack sans que vous n'ayez à ouvrir un onglet.
        </p>
        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-6 h-6" alt="Drive" />
            <div className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="w-full h-full bg-blue-500 animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Google_Sheets.png" className="w-6 h-6 object-contain" alt="Sheets" />
            <div className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="w-full h-full bg-green-500 animate-pulse delay-75"></div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" className="w-6 h-6" alt="Gmail" />
            <div className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="w-full h-full bg-red-500 animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Petit Bloc (Gauche) - Web Intelligence */}
      <div className={`rounded-3xl p-6 border relative overflow-hidden group flex flex-col justify-between ${bg}`}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500"><Globe size={20} /></div>
            <span className={`font-semibold text-sm ${textTitle}`}>Web Intelligence</span>
          </div>
          <p className={`${textDesc} text-sm leading-relaxed`}>
            Extraction en temps réel. Jarvis lit la doc, gratte les prix, et résume la concurrence.
          </p>
        </div>
        <div className="mt-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-500 flex items-center gap-2">
          <Zap size={14} className="text-cyan-500" />
          <span>Scraping https://stripe.com/docs...</span>
        </div>
      </div>

      {/* Petit Bloc (Droite) - Background Tasks */}
      <div className={`md:col-span-2 rounded-3xl p-6 border relative overflow-hidden group flex flex-col justify-between ${bg}`}>
        <div className="flex md:flex-row flex-col gap-6 h-full items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-fuchsia-500/10 rounded-lg text-fuchsia-500"><Bot size={20} /></div>
              <span className={`font-semibold text-sm ${textTitle}`}>L'IA qui n'a pas besoin de vous.</span>
            </div>
            <p className={`${textDesc} text-sm leading-relaxed max-w-sm`}>
              Pendant que vous dormez, Jarvis analyse vos flux, prépare vos dossiers et nettoie votre backlog.
            </p>
          </div>
          <div className="w-full md:w-64 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${textTitle}`}>Briefing matinal prêt</span>
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 mb-3">
              <div className="bg-green-500 h-1.5 rounded-full w-full"></div>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Sparkles size={10} /> 12 emails triés · 3 PRs validées
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
