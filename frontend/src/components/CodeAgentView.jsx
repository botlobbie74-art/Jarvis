import React, { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import Editor from '@monaco-editor/react';
import { Loader2, Sparkles, Github, Play, FileCode, Trash2, ChevronRight, Hammer, Rocket, FilePlus, FilePenLine, Layers, Smartphone, Globe, Lightbulb, Paperclip, ArrowUp, Sun, Moon, X as XIcon, Download, ChevronDown, Check } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../context/ThemeContext';

const ROLE_COLORS = {
  'ceo': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: 'text-amber-500' },
  'planner': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: 'text-amber-500' },
  'cto': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', icon: 'text-purple-500' },
  'architect': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', icon: 'text-purple-500' },
  'backend': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', icon: 'text-blue-500' },
  'frontend': { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/20', icon: 'text-pink-500' },
  'security': { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', icon: 'text-red-500' },
  'infra': { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/20', icon: 'text-cyan-500' },
  'ux': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', icon: 'text-orange-500' },
  'pm': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', icon: 'text-orange-500' },
  'qa': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: 'text-emerald-500' },
  'tester': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: 'text-emerald-500' },
  'jarvis': { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20', icon: 'text-sky-500' },
};

export default function CodeAgentView() {
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [pState, setPState] = useState(null);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const { theme, toggle } = useTheme();

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/projects');
      setProjects(data || []);
    } catch (e) {} finally { setLoading(false); }
  };
  useEffect(() => {
    loadProjects();
    // Check if Jarvis sent a builder instruction from chat
    const prompt = sessionStorage.getItem('jarvis_builder_prompt');
    if (prompt) {
      sessionStorage.removeItem('jarvis_builder_prompt');
      setDescription(prompt);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openProject = async (id) => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setActive(data);
      setActiveFile(data.files?.[0] || null);
      try {
        const [s, j] = await Promise.all([api.get(`/projects/${id}/state`), api.get(`/projects/${id}/jobs`)]);
        setPState(s.data); setJobs(j.data || []);
      } catch (_) {}
      // Generate continuation suggestions
      try {
        const sugRes = await api.post(`/projects/${id}/suggest`);
        setSuggestions(sugRes.data?.suggestions || []);
      } catch (_) { setSuggestions([]); }
    } catch (e) { toast({ title: 'Failed to open', variant: 'destructive' }); }
  };

  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => {
      try {
        const [s, j] = await Promise.all([api.get(`/projects/${active.project.id}/state`), api.get(`/projects/${active.project.id}/jobs`)]);
        setPState(s.data); setJobs(j.data || []);
      } catch (_) {}
    }, 2500);
    return () => clearInterval(t);
  }, [active?.project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createPlan = async () => {
    if (!description.trim()) return;
    setCreating(true);
    try {
      let fullDesc = description;
      if (attachedFile) {
        fullDesc += `\n\n[Attached file: ${attachedFile.name} — incorporate its context into the plan]`;
      }
      const { data } = await api.post('/projects/plan', { description: fullDesc });
      setProjects((p) => [data, ...p]);
      setDescription('');
      setAttachedFile(null);
      await openProject(data.id);
      toast({ title: 'Plan ready', description: 'Review the plan, then build.' });
    } catch (e) {
      toast({ title: 'Plan failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const build = async () => {
    if (!active) return;
    setBuilding(true);
    try {
      await api.post(`/projects/${active.project.id}/build`);
      await openProject(active.project.id);
      toast({ title: 'Build complete' });
    } catch (e) {
      toast({ title: 'Build failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
    } finally { setBuilding(false); }
  };

  const saveFile = async (content) => {
    if (!active || !activeFile) return;
    try {
      await api.put(`/projects/${active.project.id}/files`, { path: activeFile.path, content, language: activeFile.language });
      setActive((s) => ({ ...s, files: s.files.map((f) => f.path === activeFile.path ? { ...f, content } : f) }));
      setActiveFile((f) => ({ ...f, content }));
    } catch (e) {}
  };

  const pushGithub = async () => {
    setPushing(true);
    try {
      const { data } = await api.post(`/projects/${active.project.id}/push-github`);
      toast({ title: 'Pushed to GitHub', description: data.github_url });
      await openProject(active.project.id);
    } catch (e) {
      toast({ title: 'GitHub push failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
    } finally { setPushing(false); }
  };

  const downloadZip = async () => {
    if (!active) return;
    setDownloading(true);
    try {
      const response = await api.get(`/projects/${active.project.id}/download-zip`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${active.project.name || 'project'}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally { setDownloading(false); }
  };

  const remove = async (id) => {
    await api.delete(`/projects/${id}`);
    if (active?.project?.id === id) setActive(null);
    loadProjects();
  };

  const applySuggestion = (s) => {
    setDescription(s);
  };

  // ============ HOME (no project open) ============
  if (!active) {
    return (
      <div className={`flex-1 overflow-y-auto relative ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-slate-900'}`}>
        {/* Floating letters background (only dark) */}
        {theme === 'dark' && (
          <div className="absolute inset-0 grain-bg pointer-events-none opacity-50" />
        )}

        {/* Top right: theme toggle */}
        <div className="absolute top-4 right-6 z-20">
          <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'}`}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-10">
          <h1 className={`text-center font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 'clamp(40px, 7vw, 84px)', lineHeight: 1.05 }}>
            What can I do for you today?
          </h1>

          {/* Composer */}
          <div className={`mt-16 rounded-3xl border shadow-2xl transition-all ${theme === 'dark' ? 'bg-[#0a0a0c] border-white/10' : 'bg-white border-slate-200'}`}>
            {attachedFile && (
              <div className={`flex items-center gap-2 px-6 pt-5 pb-0`}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] ${theme === 'dark' ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border border-cyan-200 text-cyan-700'}`}>
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px] font-medium">{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="ml-1 opacity-60 hover:opacity-100">
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) createPlan(); }}
              placeholder="Describe the app or feature you want to build..."
              rows={4}
              className={`w-full px-6 py-6 bg-transparent outline-none resize-none text-[18px] leading-relaxed ${theme === 'dark' ? 'text-white placeholder:text-white/20' : 'text-slate-800 placeholder:text-slate-400'}`}
            />
            <div className={`flex items-center justify-between px-4 py-3 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <button
                  title="Attach a file or screenshot as context"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${theme === 'dark' ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setAttachedFile(f); toast({ title: `📎 ${f.name} attached`, description: 'Context will be included in the plan.' }); }
                  }}
                />
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Autonomous Agent Active</span>
                </div>
              </div>
              <button
                onClick={createPlan}
                disabled={creating || !description.trim()}
                className={`h-11 px-6 rounded-full flex items-center gap-2 transition-colors disabled:opacity-40 font-semibold text-[14px] ${theme === 'dark' ? 'bg-white text-black hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                {creating ? 'Planning...' : 'Generate App'}
              </button>
            </div>
          </div>

          {/* Quick start templates */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['SaaS dashboard', 'AI chat app', 'E-commerce store', 'Notes app', 'Portfolio site'].map((t) => (
              <button
                key={t}
                onClick={() => setDescription(`Build me a ${t.toLowerCase()}`)}
                className={`px-3 h-8 rounded-full text-[12px] transition-colors ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Recent projects */}
          {projects.length > 0 && (
            <div className="mt-16">
              <h2 className={`text-[14px] font-semibold mb-3 ${theme === 'dark' ? 'text-white/80' : 'text-slate-900'}`}>Recent projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.slice(0, 8).map((p) => (
                  <div key={p.id} className={`rounded-xl border p-4 transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-900 text-white'}`}>
                        <FileCode className={`w-5 h-5 ${theme === 'dark' ? 'text-cyan-400' : 'text-white'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                        <div className={`text-[12px] truncate ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>{p.description}</div>
                      </div>
                      <button onClick={() => remove(p.id)} className={`${theme === 'dark' ? 'text-white/40 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={() => openProject(p.id)} className={`mt-3 w-full h-9 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1 transition-colors ${theme === 'dark' ? 'bg-white/5 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                      Open <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ IDE VIEW (project open) ============
  const plan = active.project.plan || {};
  const dark = theme === 'dark';
  return (
    <div className={`flex-1 flex flex-col min-h-0 ${dark ? 'bg-[#030305]' : 'bg-slate-50'}`}>
      <header className={`px-6 py-4 border-b flex items-center gap-4 sticky top-0 z-50 backdrop-blur-xl ${dark ? 'bg-black/80 border-white/10' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
        <button onClick={() => setActive(null)} className={`text-[13px] font-bold transition-opacity hover:opacity-100 ${dark ? 'text-white/40' : 'text-slate-500'}`}>← PROJECTS</button>
        <div className="flex-1 min-w-0 mx-2">
          <div className={`text-[17px] font-black tracking-tight truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{active.project.name}</div>
          <div className={`text-[11px] truncate font-medium opacity-50 tracking-wide ${dark ? 'text-white' : 'text-slate-900'}`}>{active.project.description}</div>
        </div>
        
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/5">
          {['CEO', 'CTO', 'PM', 'QA'].map((role) => {
            const colors = ROLE_COLORS[role.toLowerCase()] || ROLE_COLORS.jarvis;
            return (
              <div key={role} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 cursor-default ${colors.bg} ${colors.border} ${colors.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full shadow-lg ${colors.text.replace('text-', 'bg-')}`} />
                {role}
              </div>
            );
          })}
        </div>

        <div className="h-8 w-[1px] bg-white/10 mx-2" />

        <button onClick={build} disabled={building}
          className={`h-11 px-6 rounded-2xl text-[14px] font-black flex items-center gap-2.5 disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl ${dark ? 'bg-white text-black hover:bg-white/90 shadow-white/5' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}>
          {building ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Play className="w-4.5 h-4.5" />}
          {building ? 'SYSTEM BOOTING...' : (active.files?.length ? 'REFABRICATE' : 'INITIALIZE SYSTEM')}
        </button>

        <div className="relative">
          <button onClick={() => setShowRepoDropdown(!showRepoDropdown)} disabled={pushing || !active.files?.length}
            className={`h-11 px-4 rounded-2xl text-[14px] font-bold flex items-center gap-2.5 disabled:opacity-50 transition-all hover:bg-white/10 ${dark ? 'bg-white/5 text-white border border-white/10' : 'bg-slate-100 text-slate-800'}`}>
            <Github className="w-5 h-5" /> 
            {selectedRepo ? selectedRepo : 'DEPLOY'}
          </button>
          {showRepoDropdown && (
            <div className={`absolute top-full right-0 mt-3 w-72 rounded-3xl border shadow-3xl z-50 overflow-hidden backdrop-blur-2xl transition-all animate-in zoom-in-95 ${dark ? 'bg-black/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
              <div className="p-2.5">
                <button onClick={() => { setSelectedRepo(null); pushGithub(); setShowRepoDropdown(false); }} className={`w-full text-left px-4 py-3 rounded-2xl text-[13px] font-bold flex items-center justify-between transition-all ${dark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <Rocket className="w-4 h-4" />
                    </div>
                    <span>Create Fresh Repository</span>
                  </div>
                  {!selectedRepo && <Check className="w-4 h-4 text-emerald-500" />}
                </button>
                <div className={`px-4 py-3 mt-1 text-[10px] uppercase tracking-[0.2em] font-black ${dark ? 'text-white/20' : 'text-slate-400'}`}>ACTIVE REPOS</div>
                <button onClick={() => { setSelectedRepo(active.project.name); setShowRepoDropdown(false); }} className={`w-full text-left px-4 py-3 rounded-2xl text-[13px] font-bold flex items-center justify-between transition-all ${dark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                   <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Github className="w-4 h-4" />
                    </div>
                    <span className="truncate max-w-[120px]">{active.project.name}</span>
                  </div>
                  {selectedRepo === active.project.name && <Check className="w-4 h-4 text-emerald-500" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={toggle} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-white/10 ${dark ? 'bg-white/5 text-white' : 'bg-white border border-slate-200 hover:bg-slate-100'}`}>
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Plan + activity */}
        <div className={`w-[400px] border-r flex flex-col min-h-0 relative ${dark ? 'bg-[#050507] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className={`p-6 border-b overflow-y-auto max-h-[50%] custom-scrollbar ${dark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <div className={`text-[10px] uppercase tracking-[0.3em] font-black ${dark ? 'text-white/30' : 'text-slate-400'}`}>STRATEGIC MAP</div>
                <div className={`text-[18px] font-black ${dark ? 'text-white' : 'text-slate-900'}`}>System Protocol</div>
              </div>
              <div className={`text-[11px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-black border border-emerald-500/20 uppercase tracking-widest`}>Authorized</div>
            </div>
            
            {plan.summary && (
              <div className={`p-4 rounded-3xl mb-6 text-[13px] font-medium leading-relaxed border ${dark ? 'bg-white/[0.02] border-white/5 text-white/70' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                <div className="flex items-center gap-2 mb-1 opacity-50">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-black tracking-widest">CEO Mission Vision</span>
                </div>
                {plan.summary}
              </div>
            )}
            
            <div className="space-y-6 relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-cyan-500/50 via-purple-500/50 to-pink-500/50 opacity-20" />
              
              {(plan.steps || []).map((s, idx) => {
                const colors = ROLE_COLORS[s.agent_type?.toLowerCase()] || ROLE_COLORS.jarvis;
                const isProcessing = jobs.some(j => j.agent_type === s.agent_type && j.status === 'processing');
                const isDone = active.files?.some(f => s.files?.includes(f.path));
                
                return (
                  <div key={s.id} className={`relative pl-12 transition-all duration-500 ${isDone ? 'opacity-100' : isProcessing ? 'opacity-100 scale-105' : 'opacity-40'}`}>
                    <div className={`absolute left-0 top-0.5 w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all z-10 shadow-2xl ${
                      isDone ? 'bg-emerald-500 border-emerald-500 text-white rotate-12 scale-110' 
                      : isProcessing ? `${colors.bg} ${colors.border} animate-pulse scale-110 shadow-${colors.text.split('-')[1]}-500/20`
                      : dark ? 'bg-black border-white/10 text-white/20' : 'bg-white border-slate-200 text-slate-300'
                    }`}>
                      {isDone ? <Check className="w-5 h-5" /> : <span className={`text-[13px] font-black ${isProcessing ? colors.text : ''}`}>{s.id}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`font-black text-[14px] truncate tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{s.title}</div>
                        <div className={`text-[9px] px-2 py-0.5 rounded-lg border font-black uppercase tracking-widest ${colors.bg} ${colors.border} ${colors.text}`}>{s.agent_type || 'SYS'}</div>
                      </div>
                      <div className={`text-[12.5px] leading-relaxed font-medium ${dark ? 'text-white/40' : 'text-slate-500'}`}>{s.description}</div>
                      {isProcessing && (
                        <div className="mt-2 flex items-center gap-2">
                           <Loader2 className={`w-3 h-3 animate-spin ${colors.text}`} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>Agent Synchronizing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/[0.02]">
            <div className="sticky top-0 z-20 backdrop-blur-md px-6 pt-5 pb-3">
               <div className={`text-[10px] uppercase tracking-[0.4em] font-black ${dark ? 'text-white/20' : 'text-slate-400'}`}>MANIFESTED ARCHITECTURE</div>
            </div>
            
            <div className="px-3 space-y-1">
              {(active.files || []).map((f) => (
                <button key={f.path} onClick={() => setActiveFile(f)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-[13px] flex items-center gap-4 transition-all group ${
                    activeFile?.path === f.path
                      ? dark ? 'bg-white/10 text-white shadow-2xl scale-[1.02] border border-white/10' : 'bg-slate-900 text-white shadow-xl scale-[1.02]'
                      : dark ? 'text-white/50 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeFile?.path === f.path ? 'bg-cyan-500/20' : dark ? 'bg-white/5 group-hover:bg-white/10' : 'bg-slate-200'}`}>
                    <FileCode className={`w-5 h-5 transition-all ${activeFile?.path === f.path ? 'text-cyan-400 rotate-12 scale-110' : 'text-inherit opacity-40'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-bold tracking-tight">{f.path.split('/').pop()}</div>
                    <div className="text-[10px] opacity-30 truncate font-mono tracking-tighter uppercase">{f.path}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-all ${activeFile?.path === f.path ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                </button>
              ))}
            </div>

            <div className={`px-6 pt-8 pb-3 border-t mt-6 ${dark ? 'border-white/10' : 'border-slate-100'}`}>
               <div className="flex items-center justify-between">
                  <div className={`text-[10px] uppercase tracking-[0.4em] font-black ${dark ? 'text-white/20' : 'text-slate-400'}`}>REAL-TIME PULSE</div>
                  {pState?.current_phase && <div className={`text-[9px] font-black px-2 py-0.5 rounded-full ${dark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600'}`}>{pState.current_phase.toUpperCase()}</div>}
               </div>
            </div>
            
            <div className="px-4 pb-10 space-y-3">
              {jobs.slice(0, 30).map((j) => {
                const actions = j.result?.actions || [];
                const role = j.agent_type?.toLowerCase() || 'jarvis';
                const colors = ROLE_COLORS[role] || ROLE_COLORS.jarvis;
                
                if (actions.length > 0) return actions.map((a, i) => (
                  <div key={`${j.id}-${i}`} className={`p-4 rounded-3xl border flex flex-col gap-3 transition-all hover:scale-[1.02] shadow-sm hover:shadow-xl ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${colors.bg} ${colors.text} border ${colors.border}`}>
                           {a.action === 'created' ? <FilePlus className="w-4 h-4" /> : <FilePenLine className="w-4 h-4" />}
                        </div>
                        <div>
                           <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${colors.text}`}>{a.action}</div>
                           <div className={`text-[12px] font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{j.agent_type} Specialist</div>
                        </div>
                      </div>
                      <span className="text-[9px] opacity-20 font-black tracking-widest">{new Date(j.finished_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="bg-black/40 p-2.5 rounded-2xl border border-white/5">
                       <code className={`text-[12px] font-mono break-all leading-tight ${dark ? 'text-fuchsia-400' : 'text-fuchsia-600'}`}>{a.path}</code>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${colors.text.replace('text-', 'bg-')} shadow-${colors.text.split('-')[1]}-500/50`} />
                         <span className={`text-[9px] font-black uppercase tracking-widest ${colors.text}`}>SYSTEM VERIFIED</span>
                      </div>
                      {j.result?.provider && <span className="text-[9px] font-black text-white/10 uppercase italic">{j.result.provider}</span>}
                    </div>
                  </div>
                ));
                return (
                  <div key={j.id} className={`p-4 rounded-3xl border flex items-center gap-4 transition-all ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${j.status === 'done' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' : j.status === 'processing' ? 'bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]' : j.status === 'failed' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[12px] font-black uppercase tracking-widest ${colors.text}`}>{j.agent_type}</span>
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${j.status === 'processing' ? 'text-amber-500' : dark ? 'text-white/20' : 'text-slate-400'}`}>{j.status}</span>
                      </div>
                      <div className="text-[11px] font-medium opacity-40 truncate">{j.payload?.purpose || j.payload?.path || 'Executing mission protocol...'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className={`flex-1 min-w-0 ${dark ? 'bg-[#050508]' : 'bg-[#1e1e1e]'}`}>
          {activeFile ? (
            <div className="h-full flex flex-col">
              <div className={`px-8 py-4 border-b text-[13px] flex items-center gap-4 sticky top-0 z-20 backdrop-blur-md ${dark ? 'bg-black/40 border-white/10 text-white/70' : 'bg-[#252526] border-[#1e1e1e] text-slate-300'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${dark ? 'bg-white/10 border border-white/10' : 'bg-white/10'}`}>
                  <FileCode className="w-4.5 h-4.5 text-cyan-400" />
                </div>
                <div>
                  <div className="font-mono font-bold tracking-tight text-[15px]">{activeFile.path.split('/').pop()}</div>
                  <div className="text-[10px] opacity-40 font-mono tracking-tighter uppercase">{activeFile.path}</div>
                </div>
                <div className="h-6 w-[1px] bg-white/10 mx-2" />
                <span className={`text-[10px] uppercase font-black tracking-[0.2em] px-3 py-1 rounded-full border border-white/5 bg-white/5 ${dark ? 'text-white/40' : 'text-slate-500'}`}>{activeFile.language}</span>
                
                <div className="ml-auto flex items-center gap-6">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <span className="text-[10px] font-black tracking-[0.1em] opacity-40 uppercase">LIVE SYNC ACTIVE</span>
                   </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor height="100%" theme="vs-dark" language={activeFile.language || 'plaintext'} value={activeFile.content || ''} onChange={(v) => saveFile(v || '')} 
                  options={{ 
                    minimap: { enabled: true, scale: 1, renderCharacters: false }, 
                    fontSize: 15, 
                    lineNumbers: 'on',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    cursorStyle: 'line',
                    cursorBlinking: 'smooth',
                    automaticLayout: true,
                    fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                    padding: { top: 30, bottom: 30 },
                    scrollbar: {
                      vertical: 'visible',
                      horizontal: 'visible',
                      useShadows: false,
                      verticalHasArrows: false,
                      horizontalHasArrows: false,
                      verticalScrollbarSize: 10,
                      horizontalScrollbarSize: 10
                    }
                  }} />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center relative overflow-hidden bg-[#020204]">
               {/* Advanced Grid background */}
               <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#22a3ff 1px, transparent 1px), linear-gradient(90deg, #22a3ff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
               <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at center, transparent 0%, #020204 70%)' }} />
               
               <div className="text-center relative z-10 max-w-md px-10 animate-in fade-in zoom-in duration-700">
                  <div className="relative mb-10 group cursor-default">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full transition-all group-hover:bg-cyan-500/40" />
                    <div className={`w-28 h-28 mx-auto rounded-[2.5rem] flex items-center justify-center shadow-3xl relative z-10 border transition-all group-hover:rotate-6 ${dark ? 'bg-black/50 border-white/10' : 'bg-white border-slate-200'}`}>
                       <Rocket className={`w-12 h-12 ${dark ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                  </div>
                  <h3 className={`text-[28px] font-black mb-3 tracking-tighter ${dark ? 'text-white' : 'text-slate-900'}`}>SYSTEM STANDBY</h3>
                  <p className={`text-[15px] leading-relaxed font-medium ${dark ? 'text-white/40' : 'text-slate-500'}`}>
                    {active.project.status === 'planning' 
                      ? "Strategic operational plan finalized. System awaiting initialization command to begin multi-agent construction sequence." 
                      : "The architecture manifest is ready for review. Select a terminal file to begin strategic modifications."}
                  </p>
                  {active.project.status === 'planning' && (
                    <button onClick={build} className="mt-10 h-14 px-10 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-black text-[15px] tracking-widest transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_30px_rgba(34,163,255,0.3)] flex items-center gap-3 mx-auto uppercase">
                      <Hammer className="w-5 h-5" /> Initialize Construction
                    </button>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
