import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import { api } from '../api';
import {
  Bell,
  LogOut,
  User as UserIcon,
  Shield,
  QrCode,
  Check,
  ChevronDown,
  Building,
} from 'lucide-react';

interface NavbarProps {
  onOpenVerify: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenDetails: (appId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenVerify, onNavigateTab, onOpenDetails }) => {
  const { user, logout, login } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState<boolean>(false);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      // silent
    }
  };

  const handleQuickSwitch = async (email: string) => {
    try {
      await login({ email, password: 'Password@123' });
      setShowRoleSwitcher(false);
    } catch (err: any) {
      alert(`Login failed: ${err.message}`);
    }
  };

  const roleBadgeColor = {
    STUDENT: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    CLASS_ADVISOR: 'bg-blue-50 text-blue-800 border-blue-300',
    HOD: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    WARDEN: 'bg-purple-50 text-purple-800 border-purple-300',
    ADMIN: 'bg-amber-50 text-amber-900 border-amber-300',
  }[user?.role || 'STUDENT'];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-md">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-900 tracking-tight block">
              College Permission Portal
            </span>
            <span className="text-[11px] text-slate-500 font-medium block -mt-0.5">
              OD, Leave & Hostel Outpass System
            </span>
          </div>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Gate QR Verification trigger */}
          <button
            onClick={onOpenVerify}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition"
            title="Scan or Verify Gate Pass Token"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>Verify Pass</span>
          </button>

          {/* Quick Role Switcher for Evaluation */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Switch Persona</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Test Personas (1-Click Switch)
                </div>
                <button
                  onClick={() => handleQuickSwitch('student.alex@college.edu')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <strong className="block text-slate-800">Alex Kumar (Student A)</strong>
                    <span className="text-slate-500 text-[10px]">Hosteller, Ganga Boys Hostel</span>
                  </div>
                  {user?.email === 'student.alex@college.edu' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
                <button
                  onClick={() => handleQuickSwitch('student.priya@college.edu')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <strong className="block text-slate-800">Priya Sharma (Student B)</strong>
                    <span className="text-slate-500 text-[10px]">Hosteller, Kaveri Girls Hostel</span>
                  </div>
                  {user?.email === 'student.priya@college.edu' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
                <button
                  onClick={() => handleQuickSwitch('advisor.cse@college.edu')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between border-t border-slate-100"
                >
                  <div>
                    <strong className="block text-slate-800">Prof. S. Ranganathan</strong>
                    <span className="text-blue-600 text-[10px]">Class Advisor (CSE 3-A)</span>
                  </div>
                  {user?.email === 'advisor.cse@college.edu' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
                <button
                  onClick={() => handleQuickSwitch('hod.cse@college.edu')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <strong className="block text-slate-800">Dr. K. Meenakshi</strong>
                    <span className="text-indigo-600 text-[10px]">HOD (CSE Dept)</span>
                  </div>
                  {user?.email === 'hod.cse@college.edu' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
                <button
                  onClick={() => handleQuickSwitch('warden.ganga@college.edu')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <strong className="block text-slate-800">Mr. R. Sundaram</strong>
                    <span className="text-purple-600 text-[10px]">Hostel Warden (Ganga BH-1)</span>
                  </div>
                  {user?.email === 'warden.ganga@college.edu' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
                <button
                  onClick={() => handleQuickSwitch('admin@college.edu')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between border-t border-slate-100"
                >
                  <div>
                    <strong className="block text-slate-800">Dr. Arthur Vance</strong>
                    <span className="text-amber-700 text-[10px]">Administrator</span>
                  </div>
                  {user?.email === 'admin@college.edu' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs);
                fetchNotifs();
              }}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.link && n.link.startsWith('/applications/')) {
                            const id = n.link.replace('/applications/', '');
                            onOpenDetails(id);
                          }
                          setShowNotifs(false);
                        }}
                        className={`p-3 text-xs hover:bg-slate-50 transition cursor-pointer ${
                          !n.isRead ? 'bg-blue-50/40 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">{n.title}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      onNavigateTab('notifications');
                      setShowNotifs(false);
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Capsule */}
          <div className="flex items-center gap-3 pl-2 sm:border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold text-slate-800 block truncate max-w-[140px]">
                {user?.name}
              </span>
              <span className={`inline-block border px-2 py-0.2 rounded-full text-[10px] font-semibold ${roleBadgeColor}`}>
                {user?.role.replace('_', ' ')}
              </span>
            </div>

            <button
              onClick={() => onNavigateTab('profile')}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 transition"
              title="Profile & Settings"
            >
              <UserIcon className="w-4 h-4" />
            </button>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Secure Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
