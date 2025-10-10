// Admin Authentication Service
import { API_CONFIG } from "@/lib/config";

const API_BASE = API_CONFIG.baseURL;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  admin_type: 'super_admin' | 'org_admin';
  status: string;
  email_verified: boolean;
  profile: {
    phone?: string;
    department?: string;
    job_title?: string;
    avatar_url?: string;
  };
  created_at: string;
  last_login?: string;
}

export interface AdminSettings {
  id: string;
  theme: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  dashboard_preferences: {
    default_view: string;
    widgets_enabled: string[];
    refresh_interval: number;
  };
  permissions: {
    manage_users: boolean;
    manage_models: boolean;
    manage_organizations: boolean;
    view_analytics: boolean;
    system_settings: boolean;
  };
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  subscription: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'inactive' | 'suspended' | 'trial';
  };
  settings: {
    allowed_models: Array<{
      model_id: string;
      enabled: boolean;
      added_at: string;
    }>;
    limits: {
      max_users: number;
      max_concurrent_sessions: number;
      monthly_request_limit: number;
      storage_limit_mb: number;
    };
  };
}

export interface AdminLoginResponse {
  admin?: AdminUser;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
    is_super_admin?: boolean;
  };
  settings?: AdminSettings;
  organization?: Organization;
  token: string;
}

// Storage keys
const ADMIN_TOKEN_KEY = 'superAdminToken'; // Match SuperAdminLogin storage key
const ADMIN_PROFILE_KEY = 'userProfile'; // Match SuperAdminLogin storage key

// Admin authentication functions
export const adminLogin = async (email: string, password: string): Promise<AdminLoginResponse> => {
  const response = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const result = await response.json();
  
  if (result.success) {
    // Store token and profile
    localStorage.setItem(ADMIN_TOKEN_KEY, result.data.token);
    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(result.data));
    return result.data;
  } else {
    throw new Error(result.error || 'Login failed');
  }
};

export const adminLogout = async (): Promise<void> => {
  const token = getAdminToken();
  
  if (token) {
    try {
      await fetch(`${API_BASE}/admin/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
  }
  
  // Clear local storage
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_PROFILE_KEY);
};

export const getAdminToken = (): string | null => {
  // First check the unified auth token
  const unifiedToken = localStorage.getItem('authToken');
  const userType = localStorage.getItem('userType');
  
  // If user is authenticated as admin via unified auth, use that token
  if (unifiedToken && userType === 'admin') {
    return unifiedToken;
  }
  
  // Fallback to legacy admin token
  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const getAdminProfile = (): AdminLoginResponse | null => {
  const profile = localStorage.getItem(ADMIN_PROFILE_KEY);
  return profile ? JSON.parse(profile) : null;
};

export const isAdminAuthenticated = (): boolean => {
  const token = getAdminToken();
  
  // Check unified auth
  const userType = localStorage.getItem('userType');
  if (token && userType === 'admin') {
    return true;
  }
  
  // Check legacy admin auth
  const profile = getAdminProfile();
  return !!(token && profile);
};

export const isSuperAdmin = (): boolean => {
  const profile = getAdminProfile();
  // Check multiple possible ways super admin status might be stored
  return profile?.admin?.admin_type === 'super_admin' || 
         profile?.admin?.role === 'super_admin' ||
         profile?.user?.role === 'super_admin' ||
         profile?.user?.is_super_admin === true ||
         localStorage.getItem("isSuperAdmin") === "true";
};

export const isOrgAdmin = (): boolean => {
  const profile = getAdminProfile();
  return profile?.admin?.admin_type === 'org_admin';
};

// Admin API fetch helper
export const adminApiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAdminToken();
  
  if (!token) {
    throw new Error('No admin token found');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired or invalid - clear both auth systems
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_PROFILE_KEY);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('adminProfile');
    window.location.href = '/auth/login';
    throw new Error('Admin session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
};

// Admin profile management
export const fetchAdminProfile = async (): Promise<AdminLoginResponse> => {
  return adminApiFetch('/admin/auth/profile');
};

export const updateAdminProfile = async (updates: Partial<AdminUser>): Promise<AdminUser> => {
  const result = await adminApiFetch('/admin/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  
  // Update local storage
  const currentProfile = getAdminProfile();
  if (currentProfile) {
    currentProfile.admin = { ...currentProfile.admin, ...result.data };
    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(currentProfile));
  }
  
  return result.data;
};

export const changeAdminPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await adminApiFetch('/admin/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

// Dashboard stats
export const fetchAdminDashboardStats = async () => {
  return adminApiFetch('/admin/auth/dashboard/stats');
};