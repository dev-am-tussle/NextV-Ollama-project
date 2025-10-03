import { useState, useEffect } from "react";
import { buildApiUrl } from "@/lib/config";

export interface User {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  auth_providers: Array<{
    provider: string;
    linked_at: string;
  }>;
  created_at: string;
  updated_at: string;
  settings: {
    theme: string;
    default_model: string;
    avail_models: string[];
    pulled_models_count: number;
  } | null;
  stats: {
    conversations_count: number;
    saved_prompts_count: number;
    saved_files_count: number;
    pulled_models_count: number;
  };
}

export interface UsersStats {
  users: {
    total: number;
    verified: number;
    with_oauth: number;
    recent_30_days: number;
  };
  content: {
    total_conversations: number;
    total_prompts: number;
    total_files: number;
  };
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UsersStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Check if backend is reachable
  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch(buildApiUrl('/health'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return false;
    }
  };

  const fetchUsers = async (page = 1, limit = 10) => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      // First check if backend is online
      const isHealthy = await checkBackendHealth();
      setBackendOnline(isHealthy);
      
      if (!isHealthy) {
        throw new Error('Backend server is not responding. Please start the backend server.');
      }

      const response = await fetch(buildApiUrl(`/api/admin/users?page=${page}&limit=${limit}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid - redirect to login
          localStorage.removeItem('superAdminToken');
          localStorage.removeItem('isSuperAdmin');
          localStorage.removeItem('userProfile');
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch users`);
      }
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setUsers(result.data);
        setPagination(result.pagination);
        console.log(`✅ Fetched ${result.data.length} users from database`);
        setBackendOnline(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      
      if (error instanceof Error && error.message.includes('Unexpected token')) {
        setLastError('Backend server not found. Check if backend is running on correct port.');
        setBackendOnline(false);
      }
      
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsersStats = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/users/stats'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid - redirect to login
          localStorage.removeItem('superAdminToken');
          localStorage.removeItem('isSuperAdmin');
          localStorage.removeItem('userProfile');
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch stats`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch users stats:', error);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/admin/users/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh the users list
        await fetchUsers(pagination.page, pagination.limit);
        await fetchUsersStats(); // Refresh stats too
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const response = await fetch(buildApiUrl(`/api/admin/users/${id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh the users list
        await fetchUsers(pagination.page, pagination.limit);
        return true;
      } else {
        throw new Error(result.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUsersStats();
  }, []);

  return {
    users,
    stats,
    isLoading,
    backendOnline,
    lastError,
    pagination,
    refetch: () => fetchUsers(pagination.page, pagination.limit),
    fetchUsers,
    fetchUsersStats,
    deleteUser,
    updateUser
  };
};