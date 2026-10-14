import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { User, AuditLog, Department, ClassItem, Hostel, AcademicYear } from '../types';
import {
  Users,
  Shield,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Building2,
  Clock,
  UserPlus,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

interface AdminDashboardProps {
  activeView: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeView }) => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<{
    departments: Department[];
    classes: ClassItem[];
    hostels: Hostel[];
    academicYears: AcademicYear[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Create User Modal state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Password@123');
  const [newUserRole, setNewUserRole] = useState<'STUDENT' | 'CLASS_ADVISOR' | 'HOD' | 'WARDEN' | 'ADMIN'>('STUDENT');
  const [newUserPhone, setNewUserPhone] = useState('');
  // Student specifics
  const [newStudentId, setNewStudentId] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newYearId, setNewYearId] = useState('');
  const [newIsHosteller, setNewIsHosteller] = useState(false);
  const [newHostelId, setNewHostelId] = useState('');
  const [newRoomNo, setNewRoomNo] = useState('');

  // CSV Import state
  const [csvText, setCsvText] = useState(
    `name,email,studentid,departmentcode,classname,academicyear,ishosteller,hostelcode,roomnumber,phone\nJohn Doe,john.doe@college.edu,2024CS104,CSE,CSE 3rd Year - Sec A,2025-2026,true,BH-1,B-205,+919988776655\nJane Smith,jane.smith@college.edu,2024CS105,CSE,CSE 3rd Year - Sec A,2025-2026,false,,,+919988776644`
  );
  const [csvResult, setCsvResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, metaData, logsData, settingsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getMetadata(),
        api.getAuditLogs(),
        api.getSettings(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setMetadata(metaData);
      setAuditLogs(logsData);
      setSettings(settingsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [activeView]);

  const handleToggleUser = async (userId: string) => {
    try {
      await api.toggleUserStatus(userId);
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        email: newUserEmail,
        name: newUserName,
        password: newUserPassword,
        role: newUserRole,
        phone: newUserPhone,
      };

      if (newUserRole === 'STUDENT') {
        payload.studentId = newStudentId;
        payload.departmentId = newDeptId || metadata?.departments[0]?.id;
        payload.classId = newClassId || metadata?.classes[0]?.id;
        payload.academicYearId = newYearId || metadata?.academicYears[0]?.id;
        payload.isHosteller = newIsHosteller;
        payload.hostelId = newIsHosteller ? newHostelId || metadata?.hostels[0]?.id : null;
        payload.roomNumber = newRoomNo;
      }

      await api.createAdminUser(payload);
      setShowCreateUser(false);
      await loadAll();
      alert('User created successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const res = await api.importStudentsCsv(csvText);
      setCsvResult(res);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'CSV Import failed');
    } finally {
      setImporting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchUser) {
      const q = searchUser.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* View 1: System Overview & Metrics */}
      {activeView === 'admin-overview' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-amber-300 mb-2">
                <Shield className="w-3.5 h-3.5" />
                <span>Administrative Master Console</span>
              </div>
              <h2 className="text-2xl font-bold">System Health & Approval Metrics</h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time overview of college applications, bottlenecks, and security audit logs
              </p>
            </div>
            <button
              onClick={loadAll}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
              title="Refresh Stats"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Accounts</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.totalUsers || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                {stats?.totalStudents || 0} Students | {stats?.totalStaff || 0} Staff
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Applications Handled</span>
              <div className="text-3xl font-extrabold text-blue-600 mt-1">{stats?.totalApplications || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">Across OD, Leave & Outpasses</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Pending In Workflows</span>
              <div className="text-3xl font-extrabold text-amber-600 mt-1">
                {(stats?.pendingAdvisor || 0) + (stats?.pendingHOD || 0) + (stats?.pendingWarden || 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Advisor: {stats?.pendingAdvisor || 0} | HOD: {stats?.pendingHOD || 0} | Warden:{' '}
                {stats?.pendingWarden || 0}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Approved Outpasses</span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-1">{stats?.approvedApps || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Overdue Returns: <strong className="text-rose-600">{stats?.overdueReturns || 0}</strong>
              </p>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
              Department Structure & Enrollment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stats?.departmentStats?.map((dept: any) => (
                <div key={dept.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm">{dept.name}</h4>
                  <div className="mt-2 text-xs text-slate-600 flex gap-4">
                    <span>Students: <strong>{dept._count.students}</strong></span>
                    <span>Classes: <strong>{dept._count.classes}</strong></span>
                    <span>Staff: <strong>{dept._count.staff}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View 2: User & Role Management */}
      {activeView === 'admin-users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">User & Role Management</h3>
              <p className="text-xs text-slate-500">Configure roles, activation status, and profile assignments</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="CLASS_ADVISOR">Class Advisor</option>
                <option value="HOD">HOD</option>
                <option value="WARDEN">Warden</option>
                <option value="ADMIN">Admin</option>
              </select>

              <button
                onClick={() => setShowCreateUser(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3">Name & Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Assigned Academic Details</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-blue-700">{u.role}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      {u.studentProfile ? (
                        <div>
                          <span>
                            ID: <strong>{u.studentProfile.studentId}</strong> | {u.studentProfile.department?.code} (
                            {u.studentProfile.class?.name})
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {u.studentProfile.isHosteller
                              ? `Hostel: ${u.studentProfile.hostel?.name}`
                              : 'Day Scholar'}
                          </span>
                        </div>
                      ) : u.staffProfile ? (
                        <span>Code: {u.staffProfile.staffCode} | {u.staffProfile.designation}</span>
                      ) : (
                        'System Administrator'
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleUser(u.id)}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          u.isActive
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Classes & Departments Structure */}
      {activeView === 'admin-structure' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
          {/* Departments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900 uppercase">Departments</h4>
            <div className="space-y-2">
              {metadata?.departments.map((d) => (
                <div key={d.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">{d.name}</div>
                  <div className="text-[11px] text-blue-600 font-mono mt-0.5">Code: {d.code}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900 uppercase">Classes & Sections</h4>
            <div className="space-y-2">
              {metadata?.classes.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">{c.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Semester {c.semester} • Section {c.section}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hostels */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900 uppercase">Hostels</h4>
            <div className="space-y-2">
              {metadata?.hostels.map((h) => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">{h.name}</div>
                  <div className="text-[11px] text-purple-600 mt-0.5">
                    Code: {h.code} • Gender: {h.gender}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View 4: CSV Student Bulk Import */}
      {activeView === 'admin-import' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-in fade-in">
          <div>
            <h3 className="font-bold text-base text-slate-900">Bulk Student CSV Import</h3>
            <p className="text-xs text-slate-500">
              Quickly register students in bulk with their department, class, and hostel assignments
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              CSV Data (Header + Rows)
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Default assigned student password will be: <strong>Password@123</strong>
            </span>
            <button
              onClick={handleImportCsv}
              disabled={importing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              {importing ? 'Processing Import...' : 'Run Import'}
            </button>
          </div>

          {csvResult && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="font-bold text-emerald-700">{csvResult.message}</div>
              {csvResult.errors && csvResult.errors.length > 0 && (
                <div className="text-rose-600 space-y-1">
                  <strong>Errors encountered:</strong>
                  {csvResult.errors.map((e: string, i: number) => (
                    <div key={i}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* View 5: Security Audit Logs */}
      {activeView === 'admin-audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Immutable Security Audit Logs</h3>
              <p className="text-xs text-slate-500">
                Chronological record of logins, role actions, workflow transitions, and administrative modifications
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">Total Entries: {auditLogs.length}</span>
          </div>

          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold sticky top-0">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action Event</th>
                  <th className="px-6 py-3">Actor / User</th>
                  <th className="px-6 py-3">Entity & ID</th>
                  <th className="px-6 py-3">IP / Client Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-900">{log.action}</td>
                    <td className="px-6 py-3">
                      {log.user ? (
                        <span>
                          {log.user.name} ({log.user.role})
                        </span>
                      ) : (
                        'System'
                      )}
                    </td>
                    <td className="px-6 py-3 text-blue-700">
                      {log.entity} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                    </td>
                    <td className="px-6 py-3 text-slate-400 truncate max-w-xs">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 6: System Settings */}
      {activeView === 'admin-settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-in fade-in">
          <div>
            <h3 className="font-bold text-base text-slate-900">System Configuration</h3>
            <p className="text-xs text-slate-500">Server-enforced parameters and institutional policies</p>
          </div>

          <div className="space-y-3">
            {settings.map((s) => (
              <div key={s.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-xs font-mono text-slate-800">{s.key}</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.description}</p>
                </div>
                <div className="font-mono text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-blue-800">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Create New User Account</h3>
              <button onClick={() => setShowCreateUser(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel David"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institutional Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. samuel@college.edu"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                >
                  <option value="STUDENT">Student</option>
                  <option value="CLASS_ADVISOR">Class Advisor</option>
                  <option value="HOD">HOD</option>
                  <option value="WARDEN">Hostel Warden</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              {newUserRole === 'STUDENT' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Student Roll / Register ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2024CS110"
                      value={newStudentId}
                      onChange={(e) => setNewStudentId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isHost"
                      checked={newIsHosteller}
                      onChange={(e) => setNewIsHosteller(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <label htmlFor="isHost" className="font-semibold text-slate-700">
                      Is Hosteller Resident?
                    </label>
                  </div>

                  {newIsHosteller && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Hostel</label>
                        <select
                          value={newHostelId}
                          onChange={(e) => setNewHostelId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                        >
                          {metadata?.hostels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Room No.</label>
                        <input
                          type="text"
                          placeholder="e.g. B-102"
                          value={newRoomNo}
                          onChange={(e) => setNewRoomNo(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
