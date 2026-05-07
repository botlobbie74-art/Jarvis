import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import Editor from '@monaco-editor/react';
import { Loader2, Plus, Sparkles, Github, Play, FileCode, Trash2, ChevronRight, Check, Hammer, Rocket } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function CodeAgentView() {
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null); // {project, files}
  const [activeFile, setActiveFile] = useState(null);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/projects');
      setProjects(data || []);
    } catch (e) {
      toast({ title: 'Failed to load projects', description: e?.response?.data?.detail || '', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadProjects(); }, []);

  const openProject = async (id) => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setActive(data);
      setActiveFile(data.files?.[0] || null);
    } catch (e) {
      toast({ title: 'Failed to open', variant: 'destructive' });
    }
  };

  const createPlan = async () => {
    if (!description.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/projects/plan', { description });
      setProjects((p) => [data, ...p]);
      setDescription('');
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
      toast({ title: 'Build complete', description: 'Code generated and saved.' });
    } catch (e) {
      toast({ title: 'Build failed', description: e?.response?.data?.detail || '', variant: 'destructive' });
    } finally { setBuilding(false); }
  };

  const saveFile = async (content) => {
    if (!active || !activeFile) return;
    try {
      await api.put(`/projects/${active.project.id}/files`, {
        path: activeFile.path, content, language: activeFile.language,
      });
      setActive((s) => ({
        ...s,
        files: s.files.map((f) => f.path === activeFile.path ? { ...f, content } : f),
      }));
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

  if (!active) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto px-8 py-10">
          <div className="flex items-center gap-3 mb-1">
            <Hammer className="w-6 h-6 text-slate-900" />
            <h1 className="text-[28px] font-semibold text-slate-900">Build with Jarvis</h1>
          </div>
          <p className="text-slate-500 mb-6">Describe an app. Jarvis plans, codes, and ships it to your Supabase + GitHub.</p>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A todo app with Supabase auth, projects, drag-and-drop sorting, dark mode."
              rows={4}
              className="w-full bg-slate-50 rounded-xl px-4 py-3 outline-none resize-none text-[14px] text-slate-800 placeholder:text-slate-400"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={createPlan}
                disabled={creating || !description.trim()}
                className="h-10 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium flex items-center gap-2 disabled:opacity-60 transition-colors"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {creating ? 'Planning...' : 'Generate detailed plan'}
              </button>
            </div>
          </div>

          <h2 className="text-[16px] font-semibold text-slate-900 mb-3">Your projects</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : projects.length === 0 ? (
            <div className="text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-xl">No projects yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                      <div className="text-[12px] text-slate-500 truncate">{p.description}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : p.status === 'building' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.status}
                        </span>
                        {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1"><Github className="w-3 h-3" />repo</a>}
                      </div>
                    </div>
                    <button onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <button onClick={() => openProject(p.id)} className="mt-3 w-full h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-medium flex items-center justify-center gap-1 transition-colors">
                    Open <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- IDE view ---
  const plan = active.project.plan || {};
  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
      <header className="px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
        <button onClick={() => setActive(null)} className="text-[13px] text-slate-500 hover:text-slate-900">← Projects</button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-slate-900 truncate">{active.project.name}</div>
          <div className="text-[11px] text-slate-500 truncate">{active.project.description}</div>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
          active.project.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : active.project.status === 'building' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
        }`}>{active.project.status}</span>
        <button
          onClick={build}
          disabled={building}
          className="h-9 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-60 transition-colors"
        >
          {building ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {building ? 'Building...' : (active.files?.length ? 'Rebuild' : 'Build')}
        </button>
        <button
          onClick={pushGithub}
          disabled={pushing || !active.files?.length}
          className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
        >
          {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
          Push to GitHub
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Plan + file tree */}
        <div className="w-[300px] border-r border-slate-200 bg-white flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-200 overflow-y-auto max-h-[40%]">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Plan</div>
            {plan.summary && <div className="text-[12px] text-slate-700 mb-2">{plan.summary}</div>}
            <ol className="space-y-1.5">
              {(plan.steps || []).map((s) => (
                <li key={s.id} className="flex items-start gap-2 text-[12px]">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{s.id}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">{s.title}</div>
                    <div className="text-slate-500 text-[11px] line-clamp-2">{s.description}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Files</div>
            {(active.files || []).length === 0 && (
              <div className="px-4 py-3 text-[12px] text-slate-400">No files yet. Click Build.</div>
            )}
            {(active.files || []).map((f) => (
              <button
                key={f.path}
                onClick={() => setActiveFile(f)}
                className={`w-full text-left px-4 py-1.5 text-[12px] flex items-center gap-2 transition-colors ${
                  activeFile?.path === f.path ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{f.path}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 bg-[#1e1e1e]">
          {activeFile ? (
            <>
              <div className="px-4 py-2 bg-[#252526] border-b border-[#1e1e1e] text-[12px] text-slate-300 flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5" />
                {activeFile.path}
                <span className="text-slate-500 text-[10px] ml-auto">{activeFile.language}</span>
              </div>
              <Editor
                height="calc(100% - 36px)"
                theme="vs-dark"
                language={activeFile.language || 'plaintext'}
                value={activeFile.content || ''}
                onChange={(v) => saveFile(v || '')}
                options={{ minimap: { enabled: false }, fontSize: 13, automaticLayout: true }}
              />
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-[14px]">
              {active.project.status === 'planning' ? (
                <div className="text-center">
                  <Rocket className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                  <div className="text-slate-300">Plan ready. Click Build to generate code.</div>
                </div>
              ) : (
                <span>Select a file</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
