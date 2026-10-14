import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Application } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  CheckSquare,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogOut,
  LogIn,
  TrendingUp,
  Building,
} from 'lucide-react';

interface StaffDashboardProps {
  onOpenDetails: (appId: string) => void;
  activeView: string; // 'advisor-queue' | 'advisor-history' | 'hod-queue' | 'hod-history' | 'hod-reports' | 'warden-queue' | 'gate-register' | 'warden-history'
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onOpenDetails, activeView }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchApps = async () => {
    setLoading(true);
    try {
      const data = await api.getApplications();
      setApplications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [activeView]);

  if (!user) return null;

  // Determine stage requirement
  const myStage = user.role; // 'CLASS_ADVISOR', 'HOD', 'WARDEN'

  // Queue applications: those currently at user's stage awaiting their action
  const queueApps = applications.filter(
    (a) => a.currentStage === myStage && ['PENDING_CLASS_ADVISOR', 'PENDING_HOD', 'PENDING_WARDEN'].includes(a.status)
  );

  // Gate register applications (for Warden): outpass issued or overdue
  const activeGateOutpasses = applications.filter(
    (a) => a.type === 'OUTPASS' && (a.status === 'OUTPASS_ISSUED' || a.status === 'OVERDUE_RETURN')
  );

  const overdueOutpasses = activeGateOutpasses.filter(
    (a) => a.expectedReturnTime && new Date(a.expectedReturnTime) < new Date()
  );

  // Filter logic
  let displayApps = applications;

  if (activeView.includes('queue')) {
    displayApps = queueApps;
  } else if (activeView === 'gate-register') {
    displayApps = activeGateOutpasses;
  }

  const filtered = displayApps.filter((a) => {
    if (filterType !== 'ALL' && a.type !== filterType) return false;
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.applicationNumber.toLowerCase().includes(q) ||
        a.studentName.toLowerCase().includes(q) ||
        a.studentRegNo.toLowerCase().includes(q) ||
        (a.eventName && a.eventName.toLowerCase().includes(q)) ||
        (a.destination && a.destination.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleQuickReturn = async (appId: string) => {
    try {
      await api.outpassAction(appId, 'RETURNED_TO_HOSTEL');
      await fetchApps();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              {user.role.replace('_', ' ')} PORTAL
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500">{user.staffProfile?.designation || 'Staff Member'}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {user.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {user.role === 'CLASS_ADVISOR' && 'Assigned Class: CSE 3rd Year - Section A'}
            {user.role === 'HOD' && 'Department: Computer Science & Engineering'}
            {user.role === 'WARDEN' && 'Hostel: Ganga Boys Hostel (BH-1)'}
          </p>
        </div>

        {/* Counter Summary Pills */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center min-w-[110px]">
            <span className="text-[10px] text-amber-800 uppercase font-bold block">Awaiting Action</span>
            <span className="text-xl font-bold text-amber-700">{queueApps.length}</span>
          </div>

          {user.role === 'WARDEN' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center min-w-[110px]">
              <span className="text-[10px] text-red-800 uppercase font-bold block">Overdue Returns</span>
              <span className="text-xl font-bold text-red-700">{overdueOutpasses.length}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-[110px]">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Handled</span>
            <span className="text-xl font-bold text-slate-800">{applications.length}</span>
          </div>
        </div>
      </div>

      {/* Special View: HOD Reports / Analytics */}
      {activeView === 'hod-reports' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Department OD Requests</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {applications.filter((a) => a.type === 'OD').length}
              </div>
              <p className="text-xs text-slate-400 mt-2">Active symposium and hackathon participations</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Approved</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {applications.filter((a) => a.status === 'APPROVED').length}
              </div>
              <p className="text-xs text-slate-400 mt-2">Completed and sanctioned permissions</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Avg Turnaround Time</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">2.4 Hours</div>
              <p className="text-xs text-slate-400 mt-2">Class Advisor to HOD completion</p>
            </div>
          </div>
        </div>
      )}

      {/* Special View: Warden Gate Movement Tracker */}
      {activeView === 'gate-register' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Hostel Gate Register (Live Movements)</h3>
              <p className="text-xs text-slate-500">Track students currently outside campus and record their returns</p>
            </div>
            {overdueOutpasses.length > 0 && (
              <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded-full text-xs font-bold animate-pulse flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {overdueOutpasses.length} Overdue Return Alerts!
              </span>
            )}
          </div>

          {activeGateOutpasses.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              All resident students are currently checked in at the hostel.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeGateOutpasses.map((item) => {
                const isOverdue = item.expectedReturnTime && new Date(item.expectedReturnTime) < new Date();
                return (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{item.studentName}</span>
                        <span className="font-mono text-xs text-slate-500">({item.studentRegNo})</span>
                        <StatusBadge status={item.status} size="sm" />
                        {isOverdue && (
                          <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded">
                            LATE / OVERDUE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Destination: <strong>{item.destination}</strong> | Contact:{' '}
                        <span className="font-mono">{item.emergencyContact}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Departed:{' '}
                        {item.departureTime ? new Date(item.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}{' '}
                        • Due Return:{' '}
                        <strong className={isOverdue ? 'text-rose-600' : 'text-slate-700'}>
                          {item.expectedReturnTime ? new Date(item.expectedReturnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenDetails(item.id)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300"
                      >
                        Pass Info
                      </button>
                      <button
                        onClick={() => handleQuickReturn(item.id)}
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Log Hostel Entry</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Applications Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              {activeView.includes('queue') ? 'Pending Approval Queue' : 'Complete Applications Register'}
            </h3>
            <p className="text-xs text-slate-500">
              {activeView.includes('queue')
                ? 'Review and decide on applications currently awaiting your stage'
                : 'All historical and current applications within your jurisdiction'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="OD">On Duty (OD)</option>
                <option value="LEAVE">Leave</option>
                <option value="OUTPASS">Hostel Outpass</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading queue data...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-semibold text-sm text-slate-700">Queue is clear!</h4>
            <p className="text-xs text-slate-400">No applications currently match your filters or stage.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3">Pass #</th>
                  <th className="px-6 py-3">Student Name & Roll No</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Particulars / Reason</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onOpenDetails(item.id)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-blue-700">
                      {item.applicationNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{item.studentName}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {item.studentRegNo} ({item.className})
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">{item.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 truncate max-w-xs">
                        {item.eventName || item.reason || item.destination}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {item.destination && `Destination: ${item.destination}`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(item.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${
                          item.currentStage === user.role
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {item.currentStage === user.role ? 'Review & Decide' : 'View Record'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
