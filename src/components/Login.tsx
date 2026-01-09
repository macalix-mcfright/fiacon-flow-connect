import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'login' | 'register' | 'reset'>('login');
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  // Reset State
  const [resetEmail, setResetEmail] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    const result = await authService.signIn(loginEmail, loginPassword);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setError(result.error || 'Invalid credentials or unauthorized access point.');
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if(regPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        setIsLoading(false);
        return;
    }

    const result = await authService.signUp(regEmail, regPassword, regUsername, regMobile);
    if (result.success) {
      setMessage('Registration successful! Please check your email for a confirmation link. Your account requires admin approval before you can log in.');
      setView('login'); // Switch back to login view
    } else {
      setError(result.error || 'An error occurred during registration.');
    }
    setIsLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    const result = await authService.sendPasswordResetEmail(resetEmail);
    if(result.success) {
      setMessage('If an account with that email exists, a password reset link has been sent.');
      setView('login');
    } else {
      setError(result.error || 'Failed to send reset email.');
    }
    setIsLoading(false);
  };
  
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-10 relative z-10 overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <i className="fa-solid fa-shield-halved text-9xl"></i>
        </div>
        <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30">
            <i className="fa-solid fa-layer-group text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Fiacon Flow</h1>
          <p className="text-slate-500 mt-2 font-medium">
            {view === 'login' && 'Enterprise Messaging Gateway'}
            {view === 'register' && 'Create a Secure Account'}
            {view === 'reset' && 'Reset Your Password'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm flex items-center gap-3">
            <i className="fa-solid fa-circle-exclamation"></i>
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-sm flex items-center gap-3">
            <i className="fa-solid fa-check-circle"></i>
            {message}
          </div>
        )}
        
        {view === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Identity (Email)</label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input type="email" placeholder="user@company.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-12 py-4 text-white placeholder:text-slate-600 transition-all outline-none" required />
              </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Secure Passphrase</label>
                    <button type="button" onClick={() => { setView('reset'); setError(''); setMessage(''); }} className="text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors">
                        Forgot Password?
                    </button>
                </div>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-12 py-4 text-white placeholder:text-slate-600 transition-all outline-none" required />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
              {isLoading ? (<><i className="fa-solid fa-circle-notch fa-spin"></i>Authenticating...</>) : (<><i className="fa-solid fa-arrow-right-to-bracket"></i>Authorize & Connect</>)}
            </button>
          </form>
        ) : view === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <input type="text" placeholder="e.g., marketing_team" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm" required />
            </div>
             <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mobile</label>
              <input type="text" placeholder="e.g., 09171234567" value={regMobile} onChange={(e) => setRegMobile(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
              <input type="email" placeholder="user@company.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <input type="password" placeholder="Min. 6 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm" required />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
              {isLoading ? (<><i className="fa-solid fa-circle-notch fa-spin"></i>Creating Account...</>) : (<><i className="fa-solid fa-user-plus"></i>Register</>)}
            </button>
          </form>
        ) : ( // Reset Password View
          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Enter Your Email</label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input type="email" placeholder="user@company.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-12 py-4 text-white placeholder:text-slate-600 transition-all outline-none" required />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-purple-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
              {isLoading ? (<><i className="fa-solid fa-circle-notch fa-spin"></i>Sending Link...</>) : (<><i className="fa-solid fa-key"></i>Send Recovery Link</>)}
            </button>
          </form>
        )}
        
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center gap-4">
          <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }} className="text-xs font-bold text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors">
            {view === 'login' ? 'Need an account? Register' : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;