import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CodeRain from '../components/CodeRain';
import ShowcaseCarousel from '../components/ShowcaseCarousel';
import { WingmanFace, WingmanWordmark } from '../components/WingmanLogo';
import { Mail, Github, Apple, Facebook, X as XIcon } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';

export default function Landing() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState(null); // null | 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

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

  const stub = (provider) =>
    toast({ title: `${provider} OAuth coming soon`, description: 'Use Email for now.' });

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* LEFT */}
      <div className="relative w-full lg:w-1/2 flex flex-col">
        <CodeRain density={0.7} />
        <div className="relative z-10 px-8 pt-7">
          <WingmanWordmark />
        </div>
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-[360px] flex flex-col items-center">
            <WingmanFace size={80} />
            <h1 className="mt-6 text-[28px] font-semibold text-slate-900 tracking-tight">
              Introducing Jarvis
            </h1>
            <p className="mt-1 text-[20px] font-medium" style={{ color: '#22a3ff' }}>
              your autonomous AI engineer.
            </p>

            {mode === null && (
              <div className="w-full mt-8 space-y-3">
                <button
                  onClick={() => stub('Google')}
                  className="w-full h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-3 transition-colors"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                    alt=""
                    className="w-5 h-5 bg-white rounded-full p-0.5"
                  />
                  <span className="font-medium">Continue with Google</span>
                </button>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    onClick={() => stub('GitHub')}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  >
                    <Github className="w-5 h-5 text-slate-800" />
                  </button>
                  <button
                    onClick={() => stub('Apple')}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  >
                    <Apple className="w-5 h-5 text-slate-800" />
                  </button>
                  <button
                    onClick={() => stub('Facebook')}
                    className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  >
                    <Facebook className="w-5 h-5 text-slate-800" />
                  </button>
                </div>
                <button
                  onClick={() => setMode('login')}
                  className="w-full h-12 mt-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">Continue with Email</span>
                </button>
                <p className="text-center text-[12px] text-slate-500 pt-4">
                  By continuing, you agree to our<br />
                  <a className="underline" href="#">Terms of Service</a> and{' '}
                  <a className="underline" href="#">Privacy Policy</a>.
                </p>
              </div>
            )}

            {mode !== null && (
              <form onSubmit={handleSubmit} className="w-full mt-8 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="absolute -top-2 right-0 text-slate-400 hover:text-slate-700"
                  aria-label="close"
                >
                  <XIcon className="w-4 h-4" />
                </button>
                {mode === 'signup' && (
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors disabled:opacity-60"
                >
                  {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>
                <p className="text-center text-[13px] text-slate-600 pt-1">
                  {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                    className="font-medium underline"
                    style={{ color: '#22a3ff' }}
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
