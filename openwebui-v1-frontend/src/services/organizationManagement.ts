// Organization Management Service
import { adminApiFetch } from "./adminAuth";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

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
  email_verified: boolean;
  organization_id: string;
  employee_details: {
    department?: string;
    job_title?: string;
    employee_id?: string;
    manager_id?: string;
    hired_date?: string;
    invited_by?: {
      _id: string;
      name: string;
      email: string;
    };
    invitation_accepted_at?: string;
  };
  created_at: string;
  updated_at: string;
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

export const fetchOrganizationBySlug = async (slug: string): Promise<{ success: boolean; data: OrganizationWithStats }> => {
  // First get all organizations and find by slug
  const orgsResponse = await adminApiFetch('/api/super-admin/organizations?limit=100');
  if (orgsResponse.success && orgsResponse.data) {
    const org = orgsResponse.data.find((o: any) => o.slug === slug);
    if (org) {
      return { success: true, data: org };
    }
  }
  return { success: false, data: null };
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

export const fetchEmployeesByOrgSlug = async (orgSlug: string, page = 1, limit = 50) => {
  try {
    // For org admins, use the admin users endpoint which filters by their organization
    const response = await adminApiFetch(`/api/admin/users?page=${page}&limit=${limit}`);
    
    if (response.success && response.data) {
      // Transform the response to match the expected format
      return {
        success: true,
        data: response.data.map((user: any) => ({
          _id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'employee',
          status: user.status || 'active',
          email_verified: user.email_verified,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login: user.last_login,
          employee_details: user.employee_details || {},
          settings: user.settings
        })),
        pagination: response.pagination
      };
    }
    
    return { success: false, error: 'Failed to fetch employees' };
  } catch (error) {
    console.error('Error fetching employees by org slug:', error);
    return { success: false, error: 'Failed to fetch employees' };
  }
};

// Model Management Functions
export const fetchAvailableModels = async () => {
  console.log('📞 Calling API: /api/super-admin/organizations/available-models');
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

// Employee management API functions
export interface CreateEmployeeData {
  name: string;
  email: string;
  department?: string;
  job_title?: string;
  employee_id?: string;
  hired_date?: string;
}

export interface BulkCreateEmployeeData {
  users: CreateEmployeeData[];
  organization_id: string;
}

export const createEmployee = async (
  organizationId: string, 
  employeeData: CreateEmployeeData
): Promise<ApiResponse<OrganizationEmployee>> => {
  try {
    const payload = {
      ...employeeData,
      role: 'employee',
      organization_id: organizationId,
      employee_details: {
        department: employeeData.department,
        job_title: employeeData.job_title,
        employee_id: employeeData.employee_id,
        hired_date: employeeData.hired_date
      }
    };

    const response = await adminApiFetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create employee');
    }

    const result = await response.json();
    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error) {
    console.error('Error creating employee:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create employee'
    };
  }
};

export const createBulkEmployees = async (
  organizationId: string,
  employees: CreateEmployeeData[]
): Promise<ApiResponse<{ created: number; failed: number; results: any }>> => {
  try {
    const payload = {
      users: employees,
      organization_id: organizationId
    };

    const response = await adminApiFetch('/api/admin/users/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create employees');
    }

    const result = await response.json();
    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error) {
    console.error('Error creating bulk employees:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create employees'
    };
  }
};

// Helper function to create employee from slug
export const createEmployeeByOrgSlug = async (
  orgSlug: string,
  employeeData: CreateEmployeeData
): Promise<ApiResponse<OrganizationEmployee>> => {
  try {
    // First get the organization by slug
    const orgResponse = await fetchOrganizationBySlug(orgSlug);
    if (!orgResponse.success || !orgResponse.data) {
      return {
        success: false,
        error: 'Organization not found'
      };
    }

    // Create the employee
    return await createEmployee(orgResponse.data._id, employeeData);
  } catch (error) {
    console.error('Error creating employee by org slug:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create employee'
    };
  }
};

export const createBulkEmployeesByOrgSlug = async (
  orgSlug: string,
  employees: CreateEmployeeData[]
): Promise<ApiResponse<{ created: number; failed: number; results: any }>> => {
  try {
    // First get the organization by slug
    const orgResponse = await fetchOrganizationBySlug(orgSlug);
    if (!orgResponse.success || !orgResponse.data) {
      return {
        success: false,
        error: 'Organization not found'
      };
    }

    // Create the employees
    return await createBulkEmployees(orgResponse.data._id, employees);
  } catch (error) {
    console.error('Error creating bulk employees by org slug:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create employees'
    };
  }
};