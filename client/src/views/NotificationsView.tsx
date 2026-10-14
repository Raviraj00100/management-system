import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Notification } from '../types';
import { Bell, Check, Clock, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

interface NotificationsViewProps {
  onOpenDetails: (appId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onOpenDetails }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAll = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleItemClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await api.markNotificationRead(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
    }
    if (notif.link && notif.link.startsWith('/applications/')) {
      const id = notif.link.replace('/applications/', '');
      onOpenDetails(id);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notifications & Alerts</h2>
          <p className="text-xs text-slate-500">Live updates regarding application review milestones</p>
        </div>
        <button
          onClick={handleMarkAll}
          className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg font-medium transition"
        >
          Mark all as read
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <Bell className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs">No notifications yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`py-4 px-3 rounded-xl flex items-start justify-between gap-4 transition cursor-pointer hover:bg-slate-50 ${
                !n.isRead ? 'bg-blue-50/50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    n.type === 'SUCCESS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : n.type === 'DANGER'
                      ? 'bg-rose-100 text-rose-700'
                      : n.type === 'WARNING'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {n.type === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : n.type === 'DANGER' ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-xs text-slate-900">{n.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {n.link && (
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
