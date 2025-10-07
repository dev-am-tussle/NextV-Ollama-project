// Organization Management Service
import { adminApiFetch } from "./adminAuth";

export interface OrganizationStats {
  admin_count: number;
  employee_count: number;
  active_employees: number;
  allowed_models_count: number;
}

export interface OrganizationWithStats {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  verified: boolean;
  onboarding_completed: boolean;
  subscription: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'inactive' | 'suspended' | 'trial';
    trial_ends_at?: string;
    billing_cycle: 'monthly' | 'yearly';
    next_billing_date?: string;
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
    default_employee_settings: {
      theme: string;
      default_model: string;
      can_save_prompts: boolean;
      can_upload_files: boolean;
    };
    features: {
      analytics_enabled: boolean;
      file_sharing_enabled: boolean;
      custom_prompts_enabled: boolean;
      api_access_enabled: boolean;
    };
  };
  created_by: {
    _id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  stats: OrganizationStats;
}

export interface OrganizationAdmin {
  _id: string;
  name: string;
  email: string;
  role: string;
  admin_type: 'org_admin';
  status: 'active' | 'inactive' | 'suspended';
  email_verified: boolean;
  profile: {
    phone?: string;
    department?: string;
    job_title?: string;
    avatar_url?: string;
  };
  created_at: string;
  last_login?: string;
  settings_id?: any;
}

export interface OrganizationEmployee {
  _id: string;
  name: string;
  email: string;
  role: 'employee';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  employee_details: {
    department?: string;
    job_title?: string;
    employee_id?: string;
    hired_date?: string;
    invited_by?: {
      _id: string;
      name: string;
      email: string;
    };
    invitation_accepted_at?: string;
  };
  created_at: string;
  settings_id?: any;
}

export interface OrganizationDetails {
  organization: OrganizationWithStats;
  admins: OrganizationAdmin[];
  employees: OrganizationEmployee[];
  stats: {
    total_employees: number;
    active_employees: number;
    pending_employees: number;
    admin_count: number;
    allowed_models_count: number;
  };
}

export interface CreateOrganizationData {
  name: string;
  slug?: string;
  description?: string;
  admin_email: string;
  admin_name: string;
  admin_password: string;
  settings?: {
    limits?: {
      max_users?: number;
      max_concurrent_sessions?: number;
      monthly_request_limit?: number;
      storage_limit_mb?: number;
    };
    default_employee_settings?: {
      theme?: string;
      default_model?: string;
      can_save_prompts?: boolean;
      can_upload_files?: boolean;
    };
    features?: {
      analytics_enabled?: boolean;
      file_sharing_enabled?: boolean;
      custom_prompts_enabled?: boolean;
      api_access_enabled?: boolean;
    };
  };
}

// Organization Management API calls
export const fetchOrganizations = async (page = 1, limit = 10) => {
  return adminApiFetch(`/api/super-admin/organizations?page=${page}&limit=${limit}`);
};

export const fetchOrganizationById = async (id: string): Promise<{ success: boolean; data: OrganizationDetails }> => {
  return adminApiFetch(`/api/super-admin/organizations/${id}`);
};

export const createOrganization = async (data: CreateOrganizationData) => {
  return adminApiFetch('/api/super-admin/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateOrganization = async (id: string, updates: Partial<OrganizationWithStats>) => {
  return adminApiFetch(`/api/super-admin/organizations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteOrganization = async (id: string) => {
  return adminApiFetch(`/api/super-admin/organizations/${id}`, {
    method: 'DELETE',
  });
};

export const assignModelsToOrganization = async (organizationId: string, modelIds: string[]) => {
  return adminApiFetch(`/api/super-admin/organizations/${organizationId}/models`, {
    method: 'POST',
    body: JSON.stringify({ model_ids: modelIds }),
  });
};

export const fetchOrganizationEmployees = async (organizationId: string, page = 1, limit = 10) => {
  return adminApiFetch(`/api/super-admin/organizations/${organizationId}/employees?page=${page}&limit=${limit}`);
};

// Model Management Functions
export const fetchAvailableModels = async () => {
  return adminApiFetch('/api/super-admin/organizations/available-models');
};

export const fetchOrganizationModels = async (organizationId: string) => {
  return adminApiFetch(`/api/super-admin/organizations/${organizationId}/models`);
};

// Admin Management Functions
export const fetchOrganizationAdmins = async (organizationId: string, page = 1, limit = 10) => {
  return adminApiFetch(`/api/super-admin/organizations/${organizationId}/admins?page=${page}&limit=${limit}`);
};

export const createOrganizationAdmin = async (organizationId: string, adminData: {
  name: string;
  email: string;
  password: string;
  permissions?: any;
}) => {
  return adminApiFetch(`/api/super-admin/organizations/${organizationId}/admins`, {
    method: 'POST',
    body: JSON.stringify(adminData),
  });
};

export const updateAdmin = async (adminId: string, updateData: any) => {
  return adminApiFetch(`/api/super-admin/organizations/admins/${adminId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
};

export const resetAdminPassword = async (adminId: string, newPassword: string) => {
  return adminApiFetch(`/api/super-admin/organizations/admins/${adminId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ new_password: newPassword }),
  });
};

export const deleteAdmin = async (adminId: string) => {
  return adminApiFetch(`/api/super-admin/organizations/admins/${adminId}`, {
    method: 'DELETE',
  });
};

// Helper functions for organization data
export const getOrganizationStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'inactive':
      return 'text-gray-600 bg-gray-100';
    case 'suspended':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getSubscriptionStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'trial':
      return 'text-blue-600 bg-blue-100';
    case 'inactive':
      return 'text-gray-600 bg-gray-100';
    case 'suspended':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const formatSubscriptionPlan = (plan: string): string => {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
};

export const calculateTrialDaysRemaining = (trialEndsAt?: string): number => {
  if (!trialEndsAt) return 0;
  const trialEnd = new Date(trialEndsAt);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};