// Unified authentication service for both admin and user login
import apiFetch from "@/lib/api";

export interface LoginRequest {
  email: string;
  password: string;
  userType: 'admin' | 'user';
}

export interface LoginResponse {
  success: boolean;
  data: {
    userType: 'admin' | 'user';
    token: string;
    redirectTo: string;
    admin?: {
      id: string;
      name: string;
      email: string;
      role: string;
      admin_type: string;
      status: string;
      email_verified: boolean;
      profile: any;
      created_at: string;
      last_login: string;
    };
    user?: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      created_at: string;
      last_login: string;
    };
    organization?: {
      id: string;
      name: string;
      slug?: string;
      status: string;
      subscription: any;
    };
    settings?: any;
  };
  message: string;
}

export interface ProfileResponse {
  success: boolean;
  data: {
    userType: 'admin' | 'user';
    admin?: {
      id: string;
      name: string;
      email: string;
      role: string;
      admin_type: string;
      status: string;
      email_verified: boolean;
      profile: any;
      created_at: string;
      last_login: string;
    };
    user?: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      created_at: string;
      last_login: string;
    };
    organization?: {
      id: string;
      name: string;
      slug?: string;
      status: string;
      subscription: any;
      settings: any;
    };
    settings?: any;
  };
}

// Unified login function
export async function unifiedLogin(email: string, password: string, userType: 'admin' | 'user'): Promise<LoginResponse> {
  try {
    const response = await apiFetch('/unified-auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        userType
      })
    }) as LoginResponse;

    if (response.success && response.data.token) {
      // Store authentication data based on user type
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userType', response.data.userType);
      
      if (response.data.userType === 'admin') {
        localStorage.setItem('adminProfile', JSON.stringify(response.data.admin));
        if (response.data.organization) {
          localStorage.setItem('adminOrganization', JSON.stringify(response.data.organization));
        }
      } else {
        localStorage.setItem('authProfile', JSON.stringify(response.data.user));
      }
      
      if (response.data.settings) {
        localStorage.setItem('userSettings', JSON.stringify(response.data.settings));
      }
    }

    return response;
  } catch (error: any) {
    console.error('Unified login error:', error);
    throw new Error(error.message || `${userType} login failed`);
  }
}

// Get unified profile
export async function getUnifiedProfile(): Promise<ProfileResponse> {
  try {
    const response = await apiFetch('/unified-auth/profile', {
      method: 'GET'
    }) as ProfileResponse;
    return response;
  } catch (error: any) {
    console.error('Get unified profile error:', error);
    throw new Error(error.message || 'Failed to get profile');
  }
}

// Unified logout
export async function unifiedLogout(): Promise<void> {
  try {
    await apiFetch('/unified-auth/logout', {
      method: 'POST'
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear all authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('authProfile');
    localStorage.removeItem('adminProfile');
    localStorage.removeItem('adminOrganization');
    localStorage.removeItem('userSettings');
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('authToken');
  const userType = localStorage.getItem('userType');
  return !!(token && userType);
}

// Get current user type
export function getCurrentUserType(): 'admin' | 'user' | null {
  return localStorage.getItem('userType') as 'admin' | 'user' | null;
}

// Get stored admin profile
export function getStoredAdminProfile() {
  const adminProfile = localStorage.getItem('adminProfile');
  return adminProfile ? JSON.parse(adminProfile) : null;
}

// Get stored user profile
export function getStoredUserProfile() {
  const authProfile = localStorage.getItem('authProfile');
  const userProfile = authProfile ? JSON.parse(authProfile) : null;
  
  // Return the user profile with organization data if available
  if (userProfile) {
    return {
      ...userProfile,
      // Ensure organization is at the top level for compatibility
      organization: userProfile.organization || null
    };
  }
  
  return null;
}

// Get stored organization
export function getStoredOrganization() {
  const organization = localStorage.getItem('adminOrganization');
  return organization ? JSON.parse(organization) : null;
}

// Check if user is admin
export function isAdmin(): boolean {
  return getCurrentUserType() === 'admin';
}

// Check if user is super admin
export function isSuperAdmin(): boolean {
  const adminProfile = getStoredAdminProfile();
  return adminProfile?.admin_type === 'super_admin';
}

// Check if user is org admin
export function isOrgAdmin(): boolean {
  const adminProfile = getStoredAdminProfile();
  return adminProfile?.admin_type === 'org_admin';
}