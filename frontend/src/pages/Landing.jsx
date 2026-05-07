import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CodeRain from '../components/CodeRain';
import ShowcaseCarousel from '../components/ShowcaseCarousel';
import { WingmanFace, WingmanWordmark } from '../components/WingmanLogo';
import { Mail, Github, X as XIcon, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';

export default function Landing() {
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, loginWithGithub } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState(null); // null | 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

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
    <div className="min-h-screen w-full flex bg-[#0a0a0c]">
      {/* LEFT */}
      <div className="relative w-full lg:w-1/2 flex flex-col">
        <CodeRain density={0.7} />
        <div className="relative z-10 px-8 pt-7">
          <WingmanWordmark />
        </div>
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-[360px] flex flex-col items-center">
            <WingmanFace size={80} />
            <h1 className="mt-6 text-[28px] font-semibold text-white tracking-tight">
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
                  className="w-full h-12 rounded-full bg-white hover:bg-gray-100 text-slate-800 flex items-center justify-center gap-3 transition-colors disabled:opacity-60 font-medium"
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
                  className="w-full h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-3 transition-colors disabled:opacity-60 font-medium border border-white/10"
                >
                  {oauthLoading === 'github' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Github className="w-5 h-5" />
                  )}
                  <span>Continue with GitHub</span>
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[12px] text-white/40">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Email */}
                <button
                  onClick={() => setMode('login')}
                  className="w-full h-12 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-2 transition-colors border border-white/10"
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">Continue with Email</span>
                </button>

                <p className="text-center text-[12px] text-white/30 pt-3">
                  By continuing, you agree to our{' '}
                  <a className="underline text-white/50" href="#">Terms of Service</a> and{' '}
                  <a className="underline text-white/50" href="#">Privacy Policy</a>.
                </p>
              </div>
            )}

            {mode !== null && (
              <form onSubmit={handleSubmit} className="w-full mt-8 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="absolute -top-2 right-0 text-white/40 hover:text-white"
                  aria-label="close"
                >
                  <XIcon className="w-4 h-4" />
                </button>
                {mode === 'signup' && (
                  <div>
                    <Label htmlFor="name" className="text-white/70">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="email" className="text-white/70">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-white/70">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-full bg-[#22a3ff] hover:bg-[#1a8de8] text-white font-medium transition-colors disabled:opacity-60"
                >
                  {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>
                <p className="text-center text-[13px] text-white/50 pt-1">
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
