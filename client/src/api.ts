import { Application, User, Notification, AuditLog, Department, ClassItem, Hostel, AcademicYear } from './types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('token');
    // If not on login page, can reload to login
    if (window.location.pathname !== '/login') {
      // dispatch custom event or reload
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data as T;
}

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async changePassword(passwords: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(passwords),
    });
    return handleResponse(res);
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    }).catch(() => {});
    localStorage.removeItem('token');
  },

  // Applications
  async getApplications(params?: { status?: string; type?: string; search?: string }): Promise<Application[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/applications?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getApplication(id: string): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createApplication(data: any): Promise<Application> {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async approveApplication(id: string, remarks?: string): Promise<{ message: string; application: Application }> {
    const res = await fetch(`${API_BASE}/applications/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ remarks }),
    });
    return handleResponse(res);
  },

  async rejectApplication(id: string, reason: string): Promise<{ message: string; application: Application }> {
    const res = await fetch(`${API_BASE}/applications/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  async returnApplication(id: string, remarks: string): Promise<{ message: string; application: Application }> {
    const res = await fetch(`${API_BASE}/applications/${id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ remarks }),
    });
    return handleResponse(res);
  },

  async resubmitApplication(id: string): Promise<{ message: string; application: Application }> {
    const res = await fetch(`${API_BASE}/applications/${id}/resubmit`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async cancelApplication(id: string): Promise<{ message: string; application: Application }> {
    const res = await fetch(`${API_BASE}/applications/${id}/cancel`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async outpassAction(id: string, action: 'OUTPASS_ISSUED' | 'RETURNED_TO_HOSTEL'): Promise<{ message: string; application: Application }> {
    const res = await fetch(`${API_BASE}/applications/${id}/outpass-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ action }),
    });
    return handleResponse(res);
  },

  async verifyPass(token: string): Promise<any> {
    const res = await fetch(`${API_BASE}/applications/verify-pass/${token}`);
    return handleResponse(res);
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: { ...getAuthHeader() },
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: { ...getAuthHeader() },
    });
  },

  // Admin
  async getAdminStats(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getAdminUsers(params?: { role?: string; search?: string }): Promise<User[]> {
    const query = new URLSearchParams();
    if (params?.role) query.append('role', params.role);
    if (params?.search) query.append('search', params.search);
    const res = await fetch(`${API_BASE}/admin/users?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createAdminUser(data: any): Promise<User> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async toggleUserStatus(id: string): Promise<{ message: string; user: User }> {
    const res = await fetch(`${API_BASE}/admin/users/${id}/toggle-status`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getMetadata(): Promise<{
    departments: Department[];
    classes: ClassItem[];
    hostels: Hostel[];
    academicYears: AcademicYear[];
  }> {
    const res = await fetch(`${API_BASE}/admin/metadata`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async assignRole(data: { staffProfileId: string; roleType: string; targetId: string; academicYearId: string }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/assign-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async importStudentsCsv(csvData: string): Promise<{ message: string; importedCount: number; errors: string[] }> {
    const res = await fetch(`${API_BASE}/admin/import-students-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ csvData }),
    });
    return handleResponse(res);
  },

  async getAuditLogs(params?: { action?: string; entity?: string; search?: string }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.entity) query.append('entity', params.entity);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/admin/audit-logs?${query.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getSettings(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateSetting(key: string, value: string, description?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ key, value, description }),
    });
    return handleResponse(res);
  },

  // Document Upload
  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/uploads`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse(res);
  },
};
