import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { StudentDashboard } from './views/StudentDashboard';
import { StaffDashboard } from './views/StaffDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import { NotificationsView } from './views/NotificationsView';
import { ProfileView } from './views/ProfileView';
import { CreateApplicationModal } from './views/CreateApplicationModal';
import { ApplicationDetailsModal } from './views/ApplicationDetailsModal';
import { VerifyPassModal } from './components/VerifyPassModal';
import { ApplicationType } from './types';
import { Clock } from 'lucide-react';

const MainPortal: React.FC = () => {
  const { user, loading } = useAuth();

  // Selected tab based on role
  const getDefaultTab = () => {
    if (!user) return 'login';
    if (user.role === 'STUDENT') return 'dashboard';
    if (user.role === 'CLASS_ADVISOR') return 'advisor-queue';
    if (user.role === 'HOD') return 'hod-queue';
    if (user.role === 'WARDEN') return 'warden-queue';
    if (user.role === 'ADMIN') return 'admin-overview';
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [createType, setCreateType] = useState<ApplicationType | null>(null);
  const [showVerify, setShowVerify] = useState<boolean>(false);

  // Sync default tab on user change
  React.useEffect(() => {
    if (user) {
      setCurrentTab(getDefaultTab());
    }
  }, [user?.role, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-sm font-semibold">Initializing College Permission Portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const handleSelectTab = (tab: string) => {
    if (tab === 'new-od') {
      setCreateType('OD');
    } else if (tab === 'new-leave') {
      setCreateType('LEAVE');
    } else if (tab === 'new-outpass') {
      setCreateType('OUTPASS');
    } else {
      setCurrentTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        onOpenVerify={() => setShowVerify(true)}
        onNavigateTab={(tab) => setCurrentTab(tab)}
        onOpenDetails={(id) => setSelectedAppId(id)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar currentTab={currentTab} onSelectTab={handleSelectTab} />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* Student Views */}
          {user.role === 'STUDENT' && (
            <>
              {(currentTab === 'dashboard' || currentTab === 'my-applications') && (
                <StudentDashboard
                  onOpenCreate={(type) => setCreateType(type)}
                  onOpenDetails={(id) => setSelectedAppId(id)}
                  onNavigateTab={(tab) => setCurrentTab(tab)}
                />
              )}
            </>
          )}

          {/* Staff Views (Class Advisor, HOD, Warden) */}
          {['CLASS_ADVISOR', 'HOD', 'WARDEN'].includes(user.role) && (
            <StaffDashboard
              activeView={currentTab}
              onOpenDetails={(id) => setSelectedAppId(id)}
            />
          )}

          {/* Admin Views */}
          {user.role === 'ADMIN' && <AdminDashboard activeView={currentTab} />}

          {/* Common Views */}
          {currentTab === 'notifications' && (
            <NotificationsView onOpenDetails={(id) => setSelectedAppId(id)} />
          )}

          {currentTab === 'profile' && <ProfileView />}
        </main>
      </div>

      {/* Modals */}
      {createType && (
        <CreateApplicationModal
          initialType={createType}
          onClose={() => setCreateType(null)}
          onSuccess={(id) => {
            setCreateType(null);
            setSelectedAppId(id);
          }}
        />
      )}

      {selectedAppId && (
        <ApplicationDetailsModal
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
          onRefresh={() => {}}
        />
      )}

      {showVerify && <VerifyPassModal onClose={() => setShowVerify(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainPortal />
    </AuthProvider>
  );
}
