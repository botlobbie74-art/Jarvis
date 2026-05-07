import React, { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import Editor from '@monaco-editor/react';
import { Loader2, Sparkles, Github, Play, FileCode, Trash2, ChevronRight, Hammer, Rocket, FilePlus, FilePenLine, Layers, Smartphone, Globe, Lightbulb, Paperclip, ArrowUp, Sun, Moon, X as XIcon } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../context/ThemeContext';

const MODES = [
  { id: 'fullstack', label: 'Full-stack app', icon: Layers, prompt: 'Build me a SaaS app for...' },
  { id: 'mobile',    label: 'Mobile app',     icon: Smartphone, prompt: 'Build me a mobile app for...' },
  { id: 'landing',   label: 'Landing page',   icon: Globe, prompt: 'Build me a landing page for...' },
  { id: 'brainstorm',label: 'Brainstorm',     icon: Lightbulb, prompt: 'Brainstorm ideas about...' },
];

export default function CodeAgentView() {
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [pState, setPState] = useState(null);
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('fullstack');
  const [creating, setCreating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [pushing, setPushing] = useState(false);
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
      let fullDesc = `[${MODES.find((m) => m.id === mode)?.label}] ${description}`;
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
      <div className={`flex-1 overflow-y-auto relative ${theme === 'dark' ? 'bg-[#0a0a0c] text-white' : 'bg-slate-50 text-slate-900'}`}>
        {/* Floating letters background (only dark) */}
        {theme === 'dark' && (
          <div className="absolute inset-0 grain-bg pointer-events-none" />
        )}

        {/* Top right: theme toggle */}
        <div className="absolute top-4 right-6 z-20">
          <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'}`}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-10">
          <h1 className={`text-center font-semibold tracking-tight ${theme === 'dark' ? 'text-white glow-text' : 'text-slate-900'}`} style={{ fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1.05 }}>
            What can I do for you today?
          </h1>

          {/* Mode tabs */}
          <div className={`mt-12 flex justify-center gap-1 p-1 rounded-2xl mx-auto w-fit ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'}`}>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); if (!description) setDescription(''); }}
                className={`flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-medium transition-colors ${
                  mode === m.id
                    ? theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'
                    : theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <m.icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className={`mt-3 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
            {attachedFile && (
              <div className={`flex items-center gap-2 px-4 pt-3 pb-0`}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] ${theme === 'dark' ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border border-cyan-200 text-cyan-700'}`}>
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="ml-1 opacity-60 hover:opacity-100">
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) createPlan(); }}
              placeholder={MODES.find((m) => m.id === mode)?.prompt}
              rows={5}
              className={`w-full px-5 py-4 bg-transparent outline-none resize-none text-[15px] ${theme === 'dark' ? 'text-white placeholder:text-white/30' : 'text-slate-800 placeholder:text-slate-400'}`}
            />
            <div className={`flex items-center justify-between px-3 py-2 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <button
                  title="Attach a file or screenshot as context"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${theme === 'dark' ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
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
                <span className={`text-[11px] px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  Auto-routed to best free model
                </span>
              </div>
              <button
                onClick={createPlan}
                disabled={creating || !description.trim()}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${theme === 'dark' ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
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
    <div className={`flex-1 flex flex-col min-h-0 ${dark ? 'bg-[#0a0a0c]' : 'bg-slate-50'}`}>
      <header className={`px-6 py-3 border-b flex items-center gap-3 ${dark ? 'bg-[#111114] border-white/10' : 'bg-white border-slate-200'}`}>
        <button onClick={() => setActive(null)} className={`text-[13px] ${dark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>← Projects</button>
        <div className="flex-1 min-w-0">
          <div className={`text-[14px] font-semibold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{active.project.name}</div>
          <div className={`text-[11px] truncate ${dark ? 'text-white/50' : 'text-slate-500'}`}>{active.project.description}</div>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
          active.project.status === 'ready' ? dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
          : active.project.status === 'building' ? dark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700'
          : dark ? 'bg-white/5 text-white/60' : 'bg-slate-100 text-slate-600'
        }`}>{active.project.status}</span>
        <button onClick={build} disabled={building}
          className={`h-9 px-3 rounded-lg text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-60 transition-colors ${dark ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
          {building ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {building ? 'Building...' : (active.files?.length ? 'Rebuild' : 'Build')}
        </button>
        <button onClick={pushGithub} disabled={pushing || !active.files?.length}
          className={`h-9 px-3 rounded-lg text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors ${dark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}>
          {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />} Push to GitHub
        </button>
        <button onClick={toggle} className={`w-9 h-9 rounded-full flex items-center justify-center ${dark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white border border-slate-200 hover:bg-slate-100'}`}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Plan + activity */}
        <div className={`w-[320px] border-r flex flex-col min-h-0 ${dark ? 'bg-[#111114] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className={`p-4 border-b overflow-y-auto max-h-[35%] ${dark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className={`text-[11px] uppercase tracking-wider font-semibold mb-2 ${dark ? 'text-white/40' : 'text-slate-400'}`}>Plan</div>
            {plan.summary && <div className={`text-[12px] mb-2 ${dark ? 'text-white/70' : 'text-slate-700'}`}>{plan.summary}</div>}
            <ol className="space-y-1.5">
              {(plan.steps || []).map((s) => (
                <li key={s.id} className="flex items-start gap-2 text-[12px]">
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 ${dark ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-600'}`}>{s.id}</span>
                  <div className="min-w-0">
                    <div className={`font-medium truncate ${dark ? 'text-white/90' : 'text-slate-800'}`}>{s.title}</div>
                    <div className={`text-[11px] line-clamp-2 ${dark ? 'text-white/40' : 'text-slate-500'}`}>{s.description}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className={`px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider font-semibold ${dark ? 'text-white/40' : 'text-slate-400'}`}>Files</div>
            {(active.files || []).length === 0 && (
              <div className={`px-4 py-3 text-[12px] ${dark ? 'text-white/40' : 'text-slate-400'}`}>No files yet. Click Build.</div>
            )}
            {(active.files || []).map((f) => (
              <button key={f.path} onClick={() => setActiveFile(f)}
                className={`w-full text-left px-4 py-1.5 text-[12px] flex items-center gap-2 transition-colors ${
                  activeFile?.path === f.path
                    ? dark ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'
                    : dark ? 'text-white/70 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                }`}>
                <FileCode className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{f.path}</span>
              </button>
            ))}

            <div className={`px-4 pt-4 pb-1 text-[11px] uppercase tracking-wider font-semibold border-t mt-2 ${dark ? 'text-white/40 border-white/10' : 'text-slate-400 border-slate-100'}`}>
              Activity {pState?.current_phase && <span className={`ml-1 normal-case ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>· {pState.current_phase}</span>}
            </div>
            {jobs.slice(0, 30).map((j) => {
              const actions = j.result?.actions || [];
              if (actions.length > 0) return actions.map((a, i) => (
                <div key={`${j.id}-${i}`} className={`px-4 py-1.5 flex items-center gap-2 ${dark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} rounded mx-1`}>
                  {a.action === 'created' ? <FilePlus className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <FilePenLine className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />}
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${a.action === 'created' ? 'text-emerald-500' : 'text-cyan-500'}`}>{a.action}</span>
                  <code className={`text-[11px] font-mono truncate flex-1 ${dark ? 'text-fuchsia-400' : 'text-fuchsia-600'}`}>{a.path}</code>
                </div>
              ));
              return (
                <div key={j.id} className="px-4 py-1.5 text-[11px] flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${j.status === 'done' ? 'bg-emerald-500' : j.status === 'processing' ? 'bg-amber-500 animate-pulse' : j.status === 'failed' ? 'bg-red-500' : 'bg-slate-300'}`} />
                  <span className={`font-medium capitalize ${dark ? 'text-white/80' : 'text-slate-700'}`}>{j.agent_type}</span>
                  <span className={`truncate flex-1 ${dark ? 'text-white/40' : 'text-slate-400'}`}>{j.status}</span>
                </div>
              );
            })}

            {/* Suggestions to continue */}
            {suggestions.length > 0 && (
              <div className="px-2 pt-4 pb-4">
                <div className={`px-2 pb-2 text-[11px] uppercase tracking-wider font-semibold ${dark ? 'text-white/40' : 'text-slate-400'}`}>Continue</div>
                {suggestions.slice(0, 5).map((s, i) => (
                  <button key={i} onClick={() => { setActive(null); applySuggestion(s); }}
                    className={`w-full text-left px-3 py-2 mx-1 my-1 rounded-lg text-[12px] transition-colors ${dark ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20' : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200'}`}>
                    <Sparkles className="w-3 h-3 inline mr-1.5" />{s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className={`flex-1 min-w-0 ${dark ? 'bg-[#0a0a0c]' : 'bg-[#1e1e1e]'}`}>
          {activeFile ? (
            <>
              <div className={`px-4 py-2 border-b text-[12px] flex items-center gap-2 ${dark ? 'bg-[#111114] border-white/10 text-white/70' : 'bg-[#252526] border-[#1e1e1e] text-slate-300'}`}>
                <FileCode className="w-3.5 h-3.5" />{activeFile.path}
                <span className={`text-[10px] ml-auto ${dark ? 'text-white/40' : 'text-slate-500'}`}>{activeFile.language}</span>
              </div>
              <Editor height="calc(100% - 36px)" theme="vs-dark" language={activeFile.language || 'plaintext'} value={activeFile.content || ''} onChange={(v) => saveFile(v || '')} options={{ minimap: { enabled: false }, fontSize: 13, automaticLayout: true }} />
            </>
          ) : (
            <div className={`h-full flex items-center justify-center text-[14px] ${dark ? 'text-white/40' : 'text-slate-500'}`}>
              {active.project.status === 'planning' ? (
                <div className="text-center">
                  <Rocket className={`w-10 h-10 mx-auto mb-3 ${dark ? 'text-white/30' : 'text-slate-400'}`} />
                  <div className={dark ? 'text-white/60' : 'text-slate-300'}>Plan ready. Click Build to generate code.</div>
                </div>
              ) : <span>Select a file</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
