import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { User, Lock, CheckCircle, AlertCircle, Shield } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setMsg({ type: 'success', text: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  const sp = user.studentProfile;
  const stp = user.staffProfile;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500 font-mono">{user.email}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Full Name</span>
            <span className="font-semibold text-slate-800">{user.name}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Contact Phone</span>
            <span className="font-mono text-slate-800">{user.phone || 'N/A'}</span>
          </div>

          {sp && (
            <>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Student Register No</span>
                <span className="font-mono font-bold text-blue-800">{sp.studentId}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Department & Class</span>
                <span className="font-semibold text-slate-800">
                  {sp.department?.name} ({sp.class?.name})
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Hostel Residence</span>
                <span className="font-semibold text-slate-800">
                  {sp.isHosteller ? `${sp.hostel?.name} - Room ${sp.roomNumber}` : 'Day Scholar'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Parent / Guardian Contact</span>
                <span className="font-mono text-slate-800">{sp.parentPhone || 'N/A'}</span>
              </div>
            </>
          )}

          {stp && (
            <>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Staff Code</span>
                <span className="font-mono font-bold text-blue-800">{stp.staffCode}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Designation</span>
                <span className="font-semibold text-slate-800">{stp.designation}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <Lock className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-base text-slate-900">Security & Password</h3>
        </div>

        {msg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password *</label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
