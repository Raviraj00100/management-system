import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FilePlus,
  Files,
  CheckSquare,
  Clock,
  History,
  Users,
  Building2,
  FileSpreadsheet,
  ShieldAlert,
  Settings,
  Bell,
  UserCheck,
  Compass,
  Briefcase,
  Hospital,
  KeyRound,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, pendingCount = 0 }) => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }

  let items: NavItem[] = [];

  if (role === 'STUDENT') {
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'my-applications', label: 'My Applications', icon: Files },
      { id: 'new-od', label: 'Apply for OD', icon: Briefcase },
      { id: 'new-leave', label: 'Apply for Leave', icon: Hospital },
      { id: 'new-outpass', label: 'Hostel Outpass', icon: Compass },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'Profile & Settings', icon: KeyRound },
    ];
  } else if (role === 'CLASS_ADVISOR') {
    items = [
      { id: 'advisor-queue', label: 'Advisor Queue', icon: CheckSquare, badge: pendingCount },
      { id: 'advisor-history', label: 'Class Applications', icon: History },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'Profile & Settings', icon: KeyRound },
    ];
  } else if (role === 'HOD') {
    items = [
      { id: 'hod-queue', label: 'HOD Queue', icon: CheckSquare, badge: pendingCount },
      { id: 'hod-history', label: 'Department Records', icon: Files },
      { id: 'hod-reports', label: 'Department Analytics', icon: LayoutDashboard },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'Profile & Settings', icon: KeyRound },
    ];
  } else if (role === 'WARDEN') {
    items = [
      { id: 'warden-queue', label: 'Outpass Approval', icon: CheckSquare, badge: pendingCount },
      { id: 'gate-register', label: 'Gate Movement Tracker', icon: Clock },
      { id: 'warden-history', label: 'Hostel Outpass Records', icon: History },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'Profile & Settings', icon: KeyRound },
    ];
  } else if (role === 'ADMIN') {
    items = [
      { id: 'admin-overview', label: 'System Overview', icon: LayoutDashboard },
      { id: 'admin-users', label: 'User & Role Management', icon: Users },
      { id: 'admin-structure', label: 'Classes & Departments', icon: Building2 },
      { id: 'admin-import', label: 'CSV Student Import', icon: FileSpreadsheet },
      { id: 'admin-audit', label: 'Security Audit Logs', icon: ShieldAlert },
      { id: 'admin-settings', label: 'System Settings', icon: Settings },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'Profile & Settings', icon: KeyRound },
    ];
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 no-print">
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {role.replace('_', ' ')} Navigation
        </div>

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-blue-700' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* College Session Capsule */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Active Session</span>
        </div>
        <div>Academic Year: 2025-2026</div>
        <div>Workflow: Strict Server-Enforced</div>
      </div>
    </aside>
  );
};
