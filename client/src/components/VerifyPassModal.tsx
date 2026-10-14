import React, { useState } from 'react';
import { api } from '../api';
import { ShieldCheck, ShieldAlert, Search, X, CheckCircle, Clock } from 'lucide-react';

interface VerifyPassModalProps {
  onClose: () => void;
  initialToken?: string;
}

export const VerifyPassModal: React.FC<VerifyPassModalProps> = ({ onClose, initialToken = '' }) => {
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.verifyPass(token.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Pass token is invalid or does not exist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <h3 className="font-bold text-lg">Gate Pass & QR Verification</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleVerify} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter 32-character Pass Token / Scan QR..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full pl-3 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !token.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg flex items-center gap-2 shadow-sm transition"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Pass Verification Failed</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  result.valid
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {result.valid ? (
                  <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-base">
                    {result.valid ? 'VALID AUTHORIZED PASS' : 'INVALID / EXPIRED PASS'}
                  </h4>
                  <p className="text-xs">
                    Status: <span className="font-bold uppercase">{result.status}</span> | Pass #{result.applicationNumber}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Student:</span>
                    <span className="font-bold text-slate-800 text-sm">{result.studentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reg / Roll Number:</span>
                    <span className="font-mono font-bold text-slate-800">{result.regNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Department & Class:</span>
                    <span className="font-medium text-slate-700">{result.department} ({result.className})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Hostel / Residence:</span>
                    <span className="font-medium text-slate-700">{result.hostelName || 'Day Scholar'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-500 block">Destination & Purpose:</span>
                  <span className="text-slate-800 font-medium">
                    {result.destination || 'N/A'} - {result.purpose || 'N/A'}
                  </span>
                </div>

                {result.expectedReturnTime && (
                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Return Deadline:
                    </span>
                    <span className="font-bold text-rose-700">
                      {new Date(result.expectedReturnTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
