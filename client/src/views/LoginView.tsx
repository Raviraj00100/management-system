import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Building, Lock, Mail, Shield, ArrowRight, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('Password@123');
    setError(null);
    setLoading(true);
    try {
      await login({ email: userEmail, password: 'Password@123' });
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotMsg(res.message);
    } catch (err: any) {
      setForgotMsg('Password reset instructions sent if email exists.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4">
          <Building className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          College Permission Portal
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Institutional OD, Leave & Hostel Outpass Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl px-4 sm:px-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
          {/* Left Column: Login Form */}
          <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">Sign in to your account</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your institutional email and password to access the portal
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institutional Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. student.alex@college.edu"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                Role-Based Access Control Active
              </span>
              <span>v1.0 Production Ready</span>
            </div>
          </div>

          {/* Right Column: Demo Switcher Card */}
          <div className="md:col-span-5 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-sm text-slate-900">1-Click Demo Evaluation</h4>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Select any user below to authenticate instantly and explore role-specific permissions and workflows:
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('student.alex@college.edu')}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 bg-white transition group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 group-hover:text-blue-700">
                      Alex Kumar (Student A)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      STUDENT
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Hosteller, Ganga Boys Hostel</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('student.priya@college.edu')}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 bg-white transition group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 group-hover:text-blue-700">
                      Priya Sharma (Student B)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      STUDENT
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Hosteller, Kaveri Girls Hostel</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('advisor.cse@college.edu')}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 bg-white transition group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 group-hover:text-blue-700">
                      Prof. S. Ranganathan
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      ADVISOR
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Class Advisor (CSE 3-A)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('hod.cse@college.edu')}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 bg-white transition group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 group-hover:text-blue-700">
                      Dr. K. Meenakshi
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      HOD
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Head of Dept, CSE</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('warden.ganga@college.edu')}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 bg-white transition group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 group-hover:text-blue-700">
                      Mr. R. Sundaram
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      WARDEN
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Warden, Ganga Boys Hostel</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@college.edu')}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 bg-white transition group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 group-hover:text-blue-700">
                      Dr. Arthur Vance
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      ADMIN
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Institutional Administrator</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-mono">
                Master password: Password@123
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="font-bold text-base text-slate-900 mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter your college email address to request password reset assistance.
            </p>

            {forgotMsg ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{forgotMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="name@college.edu"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition"
                >
                  Send Reset Request
                </button>
              </form>
            )}

            <button
              onClick={() => {
                setShowForgot(false);
                setForgotMsg(null);
              }}
              className="w-full mt-2 py-2 text-xs text-slate-500 hover:text-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
