import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Application, ApplicationType } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Briefcase,
  Hospital,
  Compass,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  Home,
  GraduationCap,
} from 'lucide-react';

interface StudentDashboardProps {
  onOpenCreate: (type: ApplicationType) => void;
  onOpenDetails: (appId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onOpenCreate,
  onOpenDetails,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

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
  }, []);

  const total = applications.length;
  const pending = applications.filter((a) =>
    ['PENDING_CLASS_ADVISOR', 'PENDING_HOD', 'PENDING_WARDEN', 'RETURNED_FOR_CORRECTION'].includes(a.status)
  ).length;
  const approved = applications.filter((a) =>
    ['APPROVED', 'OUTPASS_ISSUED', 'RETURNED_TO_HOSTEL'].includes(a.status)
  ).length;
  const rejected = applications.filter((a) => a.status === 'REJECTED').length;

  const filtered = applications.filter((a) => {
    if (filterType !== 'ALL' && a.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.applicationNumber.toLowerCase().includes(q) ||
        (a.eventName && a.eventName.toLowerCase().includes(q)) ||
        (a.destination && a.destination.toLowerCase().includes(q)) ||
        (a.purpose && a.purpose.toLowerCase().includes(q)) ||
        (a.reason && a.reason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const sp = user?.studentProfile;

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Profile Card */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-blue-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
            <span>Authorized Student Account</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome, {user?.name}!</h2>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Submit permission requests, monitor live 4-stage approval workflow status, and download authorized digital gate passes.
          </p>
        </div>

        {/* Profile Pill Details */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-xl text-xs space-y-1.5 shrink-0 min-w-[240px]">
          <div className="flex items-center gap-2">
            <UserIcon className="w-3.5 h-3.5 text-blue-300" />
            <span>Roll No: <strong className="font-mono text-white">{sp?.studentId || 'N/A'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-blue-300" />
            <span>{sp?.department?.code} ({sp?.class?.name})</span>
          </div>
          <div className="flex items-center gap-2">
            <Home className="w-3.5 h-3.5 text-blue-300" />
            <span>{sp?.isHosteller ? `${sp?.hostel?.name} (Room ${sp?.roomNumber})` : 'Day Scholar'}</span>
          </div>
        </div>
      </div>

      {/* Metrics Counter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requests</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{pending}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{approved}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{rejected}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Request Creation Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onOpenCreate('OD')}
          className="p-5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-2xl shadow-sm text-left transition group flex items-start justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Briefcase className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-700">Request On Duty (OD)</h4>
            <p className="text-xs text-slate-500 mt-1">
              For workshops, paper presentations, hackathons, and sports events.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 mt-1 group-hover:translate-x-1 transition" />
        </button>

        <button
          onClick={() => onOpenCreate('LEAVE')}
          className="p-5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-2xl shadow-sm text-left transition group flex items-start justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Hospital className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-700">Request Leave</h4>
            <p className="text-xs text-slate-500 mt-1">
              For personal, medical, or emergency leaves from class.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 mt-1 group-hover:translate-x-1 transition" />
        </button>

        <button
          onClick={() => onOpenCreate('OUTPASS')}
          disabled={!sp?.isHosteller}
          className={`p-5 bg-white border rounded-2xl shadow-sm text-left transition group flex items-start justify-between ${
            sp?.isHosteller
              ? 'hover:bg-blue-50/50 border-slate-200 hover:border-blue-400'
              : 'opacity-60 cursor-not-allowed border-slate-200'
          }`}
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Compass className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-700">Hostel Outpass</h4>
            <p className="text-xs text-slate-500 mt-1">
              {sp?.isHosteller
                ? 'Day out or overnight campus exit with Warden approval.'
                : 'Only available to hosteller residents.'}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 mt-1 group-hover:translate-x-1 transition" />
        </button>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Your Permission Applications</h3>
            <p className="text-xs text-slate-500">Track current review status and view verified history</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search requests..."
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
                <option value="ALL">All Types</option>
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
            <span>Loading applications...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-semibold text-sm text-slate-700">No applications found</h4>
            <p className="text-xs text-slate-400">You haven't submitted any requests matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3">Pass / Request #</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Event / Purpose / Destination</th>
                  <th className="px-6 py-3">Schedule / Dates</th>
                  <th className="px-6 py-3">Current Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
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
                      <span className="font-bold text-slate-800">{item.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 truncate max-w-xs">
                        {item.eventName || item.reason || item.destination}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {item.purpose || item.leaveType || item.outpassType}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {item.startDate ? (
                        <>
                          {new Date(item.startDate).toLocaleDateString()} -{' '}
                          {new Date(item.endDate || '').toLocaleDateString()}
                        </>
                      ) : item.departureTime ? (
                        <>
                          {new Date(item.departureTime).toLocaleDateString()} (Return:{' '}
                          {new Date(item.expectedReturnTime || '').toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          )
                        </>
                      ) : (
                        'N/A'
                      )}
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
                        className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition"
                      >
                        View Details
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
