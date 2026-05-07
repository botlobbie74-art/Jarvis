import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CodeRain from '../components/CodeRain';
import ShowcaseCarousel from '../components/ShowcaseCarousel';
import { WingmanFace, WingmanWordmark } from '../components/WingmanLogo';
import { Mail, Github, X as XIcon, Loader2, Sun, Moon } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';

export default function Landing() {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, loginWithGithub } = useAuth();
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const [mode, setMode] = useState(null); // null | 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

  const dark = theme === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') await signup(name, email, password);
      else await login(email, password);
      navigate('/app');
    } catch (err) {
      toast({
        title: 'Authentication failed',
        description: err?.response?.data?.detail || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setOauthLoading('google');
    try {
      await loginWithGoogle();
      // Redirect happens via Supabase OAuth flow
    } catch (err) {
      toast({ title: 'Google login failed', description: 'Please try again', variant: 'destructive' });
      setOauthLoading(null);
    }
  };

  const handleGithub = async () => {
    setOauthLoading('github');
    try {
      await loginWithGithub();
    } catch (err) {
      toast({ title: 'GitHub login failed', description: 'Please try again', variant: 'destructive' });
      setOauthLoading(null);
    }
  };

  return (
    <div className={`min-h-screen w-full flex ${dark ? 'bg-[#0a0a0c]' : 'bg-white'}`}>
      {/* LEFT */}
      <div className="relative w-full lg:w-1/2 flex flex-col">
        {dark && <CodeRain density={0.7} />}
        <div className="relative z-10 px-8 pt-7 flex items-center justify-between">
          <WingmanWordmark dark={dark} />
          <button onClick={toggle} className={`p-2 rounded-lg transition-colors ${dark ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}>
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-[360px] flex flex-col items-center">
            <WingmanFace size={80} />
            <h1 className={`mt-6 text-[28px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
              Introducing Jarvis
            </h1>
            <p className="mt-1 text-[20px] font-medium" style={{ color: '#22a3ff' }}>
              your autonomous AI engineer.
            </p>

            {mode === null && (
              <div className="w-full mt-8 space-y-3">
                {/* Google OAuth — real */}
                <button
                  onClick={handleGoogle}
                  disabled={!!oauthLoading}
                  className={`w-full h-12 rounded-full flex items-center justify-center gap-3 transition-colors disabled:opacity-60 font-medium border ${
                    dark ? 'bg-white hover:bg-gray-100 text-slate-800 border-transparent' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                      alt=""
                      className="w-5 h-5"
                    />
                  )}
                  <span>Continue with Google</span>
                </button>

                {/* GitHub OAuth — real */}
                <button
                  onClick={handleGithub}
                  disabled={!!oauthLoading}
                  className={`w-full h-12 rounded-full flex items-center justify-center gap-3 transition-colors disabled:opacity-60 font-medium border ${
                    dark ? 'bg-slate-800 hover:bg-slate-700 text-white border-white/10' : 'bg-slate-900 hover:bg-slate-800 text-white border-transparent'
                  }`}
                >
                  {oauthLoading === 'github' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Github className="w-5 h-5" />
                  )}
                  <span>Continue with GitHub</span>
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className={`flex-1 h-px ${dark ? 'bg-white/10' : 'bg-slate-200'}`} />
                  <span className={`text-[12px] ${dark ? 'text-white/40' : 'text-slate-400'}`}>or</span>
                  <div className={`flex-1 h-px ${dark ? 'bg-white/10' : 'bg-slate-200'}`} />
                </div>

                {/* Email */}
                <button
                  onClick={() => setMode('login')}
                  className={`w-full h-12 rounded-full flex items-center justify-center gap-2 transition-colors border ${
                    dark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">Continue with Email</span>
                </button>

                <p className={`text-center text-[12px] pt-3 ${dark ? 'text-white/30' : 'text-slate-400'}`}>
                  By continuing, you agree to our{' '}
                  <a className={`underline ${dark ? 'text-white/50' : 'text-slate-600'}`} href="#">Terms of Service</a> and{' '}
                  <a className={`underline ${dark ? 'text-white/50' : 'text-slate-600'}`} href="#">Privacy Policy</a>.
                </p>
              </div>
            )}

            {mode !== null && (
              <form onSubmit={handleSubmit} className="w-full mt-8 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className={`absolute -top-2 right-0 ${dark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                  aria-label="close"
                >
                  <XIcon className="w-4 h-4" />
                </button>
                {mode === 'signup' && (
                  <div>
                    <Label htmlFor="name" className={dark ? 'text-white/70' : 'text-slate-600'}>Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={`${dark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-white border-slate-200 text-slate-900'}`}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="email" className={dark ? 'text-white/70' : 'text-slate-600'}>Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`${dark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <Label htmlFor="password" className={dark ? 'text-white/70' : 'text-slate-600'}>Password</Label>
                  <Input
                    id="password"
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${dark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-full bg-[#22a3ff] hover:bg-[#1a8de8] text-white font-medium transition-colors disabled:opacity-60"
                >
                  {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>
                <p className={`text-center text-[13px] pt-1 ${dark ? 'text-white/50' : 'text-slate-500'}`}>
                  {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                    className="font-medium underline text-[#22a3ff]"
                  >
                    {mode === 'signup' ? 'Sign in' : 'Sign up'}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="hidden lg:block w-1/2 p-3">
        <ShowcaseCarousel />
      </div>
    </div>
  );
}

