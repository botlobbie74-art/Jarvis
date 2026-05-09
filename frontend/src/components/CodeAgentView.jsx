import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';
import { Loader2, Sparkles, Github, Play, FileCode, Trash2, ChevronRight, Rocket, Paperclip, ArrowUp, Sun, Moon, X as XIcon, Download, Check, ChevronDown, ChevronUp, RefreshCw, ExternalLink } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../context/ThemeContext';

const ROLE_COLORS = {
  'ceo': { dot: 'bg-amber-400', text: 'text-amber-400', label: 'CEO' },
  'planner': { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Planner' },
  'cto': { dot: 'bg-purple-400', text: 'text-purple-400', label: 'CTO' },
  'architect': { dot: 'bg-purple-400', text: 'text-purple-400', label: 'Architect' },
  'backend': { dot: 'bg-blue-400', text: 'text-blue-400', label: 'Backend' },
  'frontend': { dot: 'bg-pink-400', text: 'text-pink-400', label: 'Frontend' },
  'security': { dot: 'bg-red-400', text: 'text-red-400', label: 'Security' },
  'infra': { dot: 'bg-cyan-400', text: 'text-cyan-400', label: 'Infra' },
  'ux': { dot: 'bg-orange-400', text: 'text-orange-400', label: 'UX' },
  'pm': { dot: 'bg-orange-400', text: 'text-orange-400', label: 'PM' },
  'qa': { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'QA' },
  'tester': { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Tester' },
  'reviewer': { dot: 'bg-sky-400', text: 'text-sky-400', label: 'Reviewer' },
  'jarvis': { dot: 'bg-sky-400', text: 'text-sky-400', label: 'Jarvis' },
};

export default function CodeAgentView() {
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [pState, setPState] = useState(null);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attachedFile, setAttachedFile] = useState(null);
  const [planOpen, setPlanOpen] = useState(true);
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showRepoMenu, setShowRepoMenu] = useState(false);
  const [autoBuild, setAutoBuild] = useState(true);
  const [ultraMode, setUltraMode] = useState(false);
  const [view, setView] = useState('preview'); // 'preview' or 'code'
  const [deployModal, setDeployModal] = useState(false);
  const [deploySubdomain, setDeploySubdomain] = useState('');
  const [deployResult, setDeployResult] = useState(null);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const { toast } = useToast();
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/projects');
      setProjects(data || []);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => {
    loadProjects();
    const prompt = sessionStorage.getItem('jarvis_builder_prompt');
    if (prompt) { sessionStorage.removeItem('jarvis_builder_prompt'); setDescription(prompt); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openProject = async (id) => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setActive(data);
      setPlanOpen(true);
      try {
        const [s, j] = await Promise.all([api.get(`/projects/${id}/state`), api.get(`/projects/${id}/jobs`)]);
        setPState(s.data); setJobs(j.data || []);
      } catch (_) {}
      loadPreview(id);
    } catch (e) { toast({ title: 'Failed to open', variant: 'destructive' }); }
  };

  const loadPreview = async (pid) => {
    setPreviewLoading(true);
    try {
      const res = await api.get(`/projects/${pid}/preview`, { responseType: 'text' });
      const blob = new Blob([res.data], { type: 'text/html' });
      setPreviewSrc(URL.createObjectURL(blob));
    } catch (_) {
      setPreviewSrc('');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Poll for updates
  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => {
      try {
        const [s, j] = await Promise.all([
          api.get(`/projects/${active.project.id}/state`),
          api.get(`/projects/${active.project.id}/jobs`)
        ]);
        setPState(s.data);
        const newJobs = j.data || [];
        setJobs(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newJobs)) {
            return newJobs;
          }
          return prev;
        });
      } catch (_) {}
    }, 3000);
    return () => clearInterval(t);
  }, [active?.project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [jobs]);

  // Refresh preview when build completes
  useEffect(() => {
    if (active && pState?.current_phase === 'review') {
      loadPreview(active.project.id);
    }
  }, [pState?.current_phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const createPlan = async () => {
    if (!description.trim()) return;
    setCreating(true);
    try {
      let fullDesc = description;
      if (attachedFile) fullDesc += `\n\n[Attached file: ${attachedFile.name}]`;
      const { data } = await api.post('/projects/plan', { description: fullDesc, ultra: ultraMode });
      setProjects((p) => [data, ...p]);
      setDescription('');
      setAttachedFile(null);
      await openProject(data.id);
      if (autoBuild) {
        toast({ title: 'Plan ready', description: 'Starting auto-build in 2 seconds...' });
        setTimeout(() => {
          api.post(`/projects/${data.id}/build`).catch(()=>{});
        }, 2000);
      } else {
        toast({ title: 'Plan ready', description: 'Review the plan, then build.' });
      }
    } catch (e) {
      toast({ title: 'Plan failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const build = async () => {
    if (!active) return;
    setBuilding(true);
    setPreviewSrc('');
    try {
      await api.post(`/projects/${active.project.id}/build`, { ultra: ultraMode });
      await openProject(active.project.id);
      toast({ title: 'Build complete' });
    } catch (e) {
      toast({ title: 'Build failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
    } finally { setBuilding(false); }
  };

  const pushGithub = async () => {
    setPushing(true);
    setDeployResult(null);
    try {
      const { data } = await api.post(`/projects/${active.project.id}/push-github`, { subdomain: deploySubdomain });
      setDeployResult(data);
      toast({ title: 'Deploy Successful!' });
    } catch (e) {
      toast({ title: 'Deployment failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
      setDeployModal(false);
    } finally { setPushing(false); }
  };

  const downloadZip = async () => {
    if (!active) return;
    try {
      const response = await api.get(`/projects/${active.project.id}/download-zip`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', `${active.project.name || 'project'}.zip`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (e) { toast({ title: 'Download failed', variant: 'destructive' }); }
  };

  const remove = async (id) => {
    await api.delete(`/projects/${id}`);
    if (active?.project?.id === id) setActive(null);
    loadProjects();
  };

  // ============ HOME ============
  if (!active) {
    return (
      <div className={`flex-1 overflow-y-auto relative ${dark ? 'bg-black text-white' : 'bg-white text-slate-900'}`}>
        {dark && <div className="absolute inset-0 grain-bg pointer-events-none opacity-50" />}
        <div className="absolute top-4 right-6 z-20">
          <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${dark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'}`}>
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-10">
          <h1 className={`text-center font-[800] tracking-tighter ${dark ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: 'clamp(44px, 8vw, 96px)', lineHeight: 0.95 }}>
            Forging<br />
            <span className="text-slate-400">the future.</span>
          </h1>
          <div className={`mt-16 rounded-3xl border shadow-2xl transition-all ${dark ? 'bg-[#0a0a0c] border-white/10' : 'bg-white border-slate-200'}`}>
            {attachedFile && (
              <div className="flex items-center gap-2 px-6 pt-5 pb-0">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] ${dark ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border border-cyan-200 text-cyan-700'}`}>
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px] font-medium">{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="ml-1 opacity-60 hover:opacity-100"><XIcon className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) createPlan(); }}
              placeholder="Describe the app or feature you want to build..."
              rows={4}
              className={`w-full px-6 py-6 bg-transparent outline-none resize-none text-[18px] leading-relaxed ${dark ? 'text-white placeholder:text-white/20' : 'text-slate-800 placeholder:text-slate-400'}`}
            />
            <div className={`flex items-center justify-between px-4 py-3 border-t ${dark ? 'border-white/5' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <button title="Attach file" onClick={() => fileInputRef.current?.click()}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${dark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  <Paperclip className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setAttachedFile(f); toast({ title: `${f.name} attached` }); }
                  }} />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoBuild} onChange={(e) => setAutoBuild(e.target.checked)} className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-500 bg-white/10" />
                  <span className={`text-[12px] font-medium ${dark ? 'text-white/60' : 'text-slate-500'}`}>Auto-Build</span>
                </label>
                <div className={`w-px h-4 ${dark ? 'bg-white/10' : 'bg-slate-200'}`} />
                <button onClick={() => toast({ title: 'Ultra Smart is Coming Soon', description: 'This mode will use GPT-4, Claude 3.5 and Gemini Pro for massive projects.' })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all border ${dark ? 'bg-white/5 border-white/10 text-white/30' : 'bg-slate-50 border-slate-200 text-slate-400'} opacity-60 cursor-help`}>
                  <Sparkles className="w-3 h-3" />
                  <span className="text-[10px] font-bold">ULTRA (SOON)</span>
                </button>
              </div>
              <button onClick={createPlan} disabled={creating || !description.trim()}
                className={`h-11 px-6 rounded-full flex items-center gap-2 transition-colors disabled:opacity-40 font-semibold text-[14px] ${dark ? 'bg-white text-black hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                {creating ? 'Planning...' : 'Build App'}
              </button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['SaaS dashboard', 'AI chat app', 'E-commerce store', 'Notes app', 'Portfolio site'].map((t) => (
              <button key={t} onClick={() => setDescription(`Build me a ${t.toLowerCase()}`)}
                className={`px-3 h-8 rounded-full text-[12px] transition-colors ${dark ? 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}>
                {t}
              </button>
            ))}
          </div>
          {projects.length > 0 && (
            <div className="mt-16">
              <h2 className={`text-[14px] font-semibold mb-3 ${dark ? 'text-white/80' : 'text-slate-900'}`}>Recent projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.slice(0, 8).map((p) => (
                  <div key={p.id} className={`rounded-xl border p-4 transition-colors ${dark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${dark ? 'bg-white/10' : 'bg-slate-900 text-white'}`}>
                        <FileCode className={`w-5 h-5 ${dark ? 'text-cyan-400' : 'text-white'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                      </div>
                      <button onClick={() => remove(p.id)} className={`${dark ? 'text-white/40 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={() => openProject(p.id)}
                      className={`mt-3 w-full h-9 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1 transition-colors ${dark ? 'bg-white/5 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
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

  // ============ PROJECT VIEW ============
  const plan = active.project.plan || {};
  const planSteps = plan.steps || [];
  const activeJobs = jobs.filter(j => j.status === 'processing');

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${dark ? 'bg-[#030305]' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`px-5 py-3 border-b flex items-center gap-3 sticky top-0 z-50 backdrop-blur-xl ${dark ? 'bg-black/80 border-white/10' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
        <button onClick={() => setActive(null)} className={`text-[13px] font-medium transition-opacity hover:opacity-100 ${dark ? 'text-white/40' : 'text-slate-500'}`}>← Projects</button>
        <div className={`h-5 w-px ${dark ? 'bg-white/10' : 'bg-slate-200'}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-[15px] font-semibold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{active.project.name}</div>
        </div>

        {activeJobs.length > 0 && (
          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] ${dark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{activeJobs.length} agent{activeJobs.length > 1 ? 's' : ''} working</span>
          </div>
        )}

        <button onClick={build} disabled={building || active.files?.length > 0}
          className={`h-9 px-4 rounded-xl text-[13px] font-semibold flex items-center gap-2 disabled:opacity-60 disabled:hidden transition-all ${dark ? 'bg-white text-black hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
          {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {building ? 'Building...' : 'Build'}
        </button>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <button onClick={() => setView('preview')} className={`h-8 px-3 rounded-lg text-[12px] font-semibold transition-all ${view === 'preview' ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>Preview</button>
          <button onClick={() => setView('code')} className={`h-8 px-3 rounded-lg text-[12px] font-semibold transition-all ${view === 'code' ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>Code</button>
          <button onClick={downloadZip} className="h-8 px-3 rounded-lg text-[12px] font-semibold text-slate-500 hover:text-slate-700 transition-all flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />ZIP</button>
          <a href={active.project.github_url} target="_blank" rel="noopener noreferrer" className={`h-8 px-3 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 ${active.project.github_url ? 'text-slate-500 hover:text-slate-700' : 'hidden'}`}>
            <Github className="w-3.5 h-3.5" />GitHub
          </a>
          <button onClick={() => { setDeployModal(true); setDeployResult(null); }} disabled={pushing} className="h-8 px-4 rounded-lg text-[12px] font-bold bg-slate-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-all flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5" />
            Deploy
          </button>
        </div>

        <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${dark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white border border-slate-200 hover:bg-slate-100'}`}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Body: chat left, preview right */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: activity feed with floating plan */}
        <div className={`w-[380px] flex-shrink-0 flex flex-col min-h-0 border-r relative overflow-hidden ${dark ? 'bg-[#050507] border-white/10' : 'bg-white border-slate-200'}`}>

          {/* Floating collapsible plan */}
          <div className={`absolute top-4 left-4 right-4 z-20 rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden transition-all ${dark ? 'border-white/10 bg-[#050507]/95' : 'border-slate-200 bg-white/95'}`}>
            <button
              onClick={() => setPlanOpen(!planOpen)}
              className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${dark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                <span className={`text-[13px] font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>Jarvis Builder</span>
                {planSteps.length > 0 && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${dark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-500'}`}>
                    {planSteps.filter(s => active.files?.some(f => s.files?.includes(f.path))).length}/{planSteps.length} steps
                  </span>
                )}
              </div>
              {planOpen ? <ChevronUp className={`w-4 h-4 ${dark ? 'text-white/40' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${dark ? 'text-white/40' : 'text-slate-400'}`} />}
            </button>

            {planOpen && planSteps.length > 0 && (
              <div className={`max-h-[160px] overflow-y-auto custom-scrollbar px-4 pb-4`}>
                {plan.summary && (
                  <p className={`text-[12px] leading-relaxed mb-3 px-1 ${dark ? 'text-white/50' : 'text-slate-500'}`}>{plan.summary}</p>
                )}
                <div className="space-y-2">
                  {planSteps.map((s) => {
                    const colors = ROLE_COLORS[s.agent_type?.toLowerCase()] || ROLE_COLORS.jarvis;
                    const isProcessing = jobs.some(j => j.agent_type === s.agent_type && j.status === 'processing');
                    const isDone = active.files?.some(f => s.files?.includes(f.path));
                    return (
                      <div key={s.id} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                        isProcessing ? dark ? 'bg-white/5 border border-white/10' : 'bg-blue-50 border border-blue-100'
                        : isDone ? dark ? 'bg-emerald-500/5' : 'bg-emerald-50/50' : ''
                      }`}>
                        <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${
                          isDone ? 'bg-emerald-500' : isProcessing ? `${colors.dot.replace('bg-', 'bg-')}/20` : dark ? 'bg-white/5' : 'bg-slate-100'
                        }`}>
                          {isDone ? <Check className="w-3 h-3 text-white" /> : isProcessing ? <Loader2 className={`w-3 h-3 animate-spin ${colors.text}`} /> : <span className={`text-[10px] font-bold ${dark ? 'text-white/30' : 'text-slate-400'}`}>{s.id}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[12px] font-semibold ${isDone ? dark ? 'text-white/60' : 'text-slate-500' : dark ? 'text-white' : 'text-slate-800'}`}>{s.title}</div>
                          <div className={`text-[11px] mt-0.5 ${dark ? 'text-white/30' : 'text-slate-400'}`}>{s.agent_type}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {planOpen && planSteps.length === 0 && active.project.status === 'planning' && (
              <div className="px-5 pb-4">
                <p className={`text-[12px] ${dark ? 'text-white/40' : 'text-slate-500'}`}>{plan.summary || 'Plan generated. Ready to build.'}</p>
                <button onClick={build} disabled={building}
                  className="mt-3 w-full h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors">
                  {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {building ? 'Building...' : 'Start Building'}
                </button>
              </div>
            )}
          </div>

          {/* Activity feed / chat */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pt-[240px]">
            <div className="px-4 py-3 space-y-2">
              {jobs.length === 0 && !building && (
                <div className={`text-center py-12 ${dark ? 'text-white/20' : 'text-slate-300'}`}>
                  <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-[13px]">Activity will appear here</p>
                </div>
              )}               {(() => {
              )}
              {(() => {
                const elements = [];
                let currentGroup = null;

                const flushGroup = () => {
                  if (!currentGroup) return;
                  const colors = ROLE_COLORS[currentGroup.role] || ROLE_COLORS.jarvis;
                  elements.push(
                    <details key={`group-${currentGroup.id}`} className={`group p-3 rounded-xl ${dark ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'bg-slate-50 hover:bg-slate-100'} transition-all cursor-pointer border border-transparent hover:border-white/5`}>
                      <summary className="flex items-center gap-3 list-none">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dark ? 'bg-white/5' : 'bg-white shadow-sm border border-slate-100'}`}>
                          <WingmanFace size={16} />
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest ${colors.text}`}>{colors.label}</div>
                            <div className={`text-[12px] font-semibold ${dark ? 'text-white/80' : 'text-slate-700'}`}>{currentGroup.type} {currentGroup.paths.length} file{currentGroup.paths.length > 1 ? 's' : ''}</div>
                          </div>
                          <ChevronDown className="w-3 h-3 opacity-20 group-open:rotate-180 transition-transform ml-1" />
                          <span className={`text-[10px] ml-auto font-mono opacity-20`}>{new Date(currentGroup.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </summary>
                      <div className="mt-3 pl-11 space-y-1.5 pb-2">
                        {currentGroup.paths.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                            <code className={`text-[11px] font-mono truncate ${dark ? 'text-blue-400/60' : 'text-blue-600'}`}>{p}</code>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                  currentGroup = null;
                };

                jobs.forEach((j) => {
                  const actions = j.result?.actions || [];
                  const role = j.agent_type?.toLowerCase() || 'jarvis';
                  
                  if (actions.length > 0) {
                    const actionType = actions[0].action;
                    const paths = actions.map(a => a.path);

                    if (currentGroup && currentGroup.role === role && currentGroup.type === actionType) {
                      currentGroup.paths.push(...paths);
                    } else {
                      flushGroup();
                      currentGroup = { id: j.id, role, type: actionType, paths, time: j.finished_at };
                    }
                  } else {
                    flushGroup();
                    const colors = ROLE_COLORS[role] || ROLE_COLORS.jarvis;
                    elements.push(
                      <div key={j.id} className={`flex items-start gap-3 px-3 py-3 rounded-xl ${dark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'} transition-colors`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dark ? 'bg-white/5' : 'bg-white shadow-sm border border-slate-100'}`}>
                          <WingmanFace size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-[11px] font-bold ${colors.text}`}>{colors.label}</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              j.status === 'done' ? 'bg-emerald-400'
                              : j.status === 'processing' ? 'bg-amber-400 animate-pulse'
                              : j.status === 'failed' ? 'bg-red-400' : 'bg-slate-300'
                            }`} />
                          </div>
                          <p className={`text-[11px] leading-relaxed ${dark ? 'text-white/60' : 'text-slate-600'}`}>{j.payload?.purpose || j.payload?.path || j.payload?.instruction || '...'}</p>
                        </div>
                      </div>
                    );
                  }
                });
                flushGroup();
                return elements;
              })()})}

              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#1a1a2e]">
          {/* Preview toolbar */}
          <div className={`px-4 py-2.5 flex items-center gap-3 border-b ${dark ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] ${dark ? 'bg-white/5 border border-white/5 text-white/40' : 'bg-slate-100 text-slate-500'}`}>
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{active.project.name} — live preview</span>
            </div>
            <button onClick={() => loadPreview(active.project.id)} disabled={previewLoading}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${dark ? 'text-white/40 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              <RefreshCw className={`w-4 h-4 ${previewLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Preview iframe */}
          <div className="flex-1 relative">
            {previewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-10">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-3" />
                  <p className="text-[13px] text-white/40">Loading preview...</p>
                </div>
              </div>
            )}

            {previewSrc ? (
              <iframe
                src={previewSrc}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
                title="App Preview"
              />
            ) : building ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center max-w-xs px-8">
                  <div className="flex gap-2 justify-center mb-6">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                    ))}
                  </div>
                  <p className="text-[14px] font-medium text-white/60">Building your app...</p>
                  <p className="text-[12px] text-white/30 mt-1">Agents are working on your project</p>
                </div>
              </div>
            ) : !active.files?.length ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center max-w-xs px-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                    <Rocket className="w-7 h-7 text-white/30" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-white mb-2">Ready to build</h3>
                  <p className="text-[13px] text-white/40 mb-6">Your plan is set. Hit build to start generating your app.</p>
                  <button onClick={build}
                    className="h-10 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-[13px] font-semibold flex items-center gap-2 mx-auto transition-colors">
                    <Play className="w-4 h-4" />Build App
                  </button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center">
                  <p className="text-[13px] text-white/30 mb-3">Preview not available</p>
                  <button onClick={() => loadPreview(active.project.id)}
                    className={`h-9 px-4 rounded-lg text-[13px] flex items-center gap-2 mx-auto transition-colors ${dark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                    <RefreshCw className="w-4 h-4" />Load Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Deploy Modal */}
      {deployModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl border p-8 ${dark ? 'bg-[#0a0a0c] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            {!deployResult ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold tracking-tight">Deploy to Production</h3>
                    <p className={`text-[13px] opacity-40`}>Your app will be live on Vercel</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest opacity-40 mb-2">Subdomain</label>
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${dark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} focus-within:ring-2 focus-within:ring-blue-500/50`}>
                      <input 
                        value={deploySubdomain} 
                        onChange={(e) => setDeploySubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="my-awesome-app" 
                        className="bg-transparent outline-none flex-1 text-[15px] font-medium" 
                      />
                      <span className="text-[14px] font-bold opacity-30">.jarvisagent.app</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeployModal(false)}
                    className={`flex-1 h-12 rounded-xl font-bold text-[14px] transition-colors ${dark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={pushGithub}
                    disabled={pushing || !deploySubdomain}
                    className="flex-[2] h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-30 transition-all"
                  >
                    {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                    {pushing ? 'Deploying...' : 'Confirm Deploy'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 animate-in zoom-in-50 duration-500">
                  <Check className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-[22px] font-[800] tracking-tighter mb-2">Build Successful!</h3>
                <p className={`text-[14px] opacity-40 mb-8`}>Your app is live and ready for the world.</p>
                
                <div className={`p-4 rounded-2xl mb-8 border ${dark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[11px] font-bold uppercase tracking-widest opacity-30 mb-1">Live URL</div>
                  <a href={deployResult.live_url} target="_blank" rel="noopener noreferrer" className="text-[16px] font-bold text-blue-500 hover:underline break-all">
                    {deployResult.live_url}
                  </a>
                </div>

                <button 
                  onClick={() => setDeployModal(false)}
                  className="w-full h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-[14px] transition-opacity hover:opacity-90"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
