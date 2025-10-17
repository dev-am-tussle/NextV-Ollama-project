import axios from 'axios';
import { getAuthToken } from './auth';

// Create axios instance with custom config
const VITE_API_URL = import.meta.env.VITE_API_URL;

export const axiosInstance = axios.create({
  baseURL: VITE_API_URL, 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Use project's auth helper so we look up the correct storage key
    const token = getAuthToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
    } else {
      // no token: ensure headers still include JSON content-type
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle 401 when it is an authenticated user session failure
    if (error.response?.status === 401 && error.config?.url) {
      const token = getAuthToken();
      if (token) {
        // token exists but server rejected it -> force logout
        try {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authProfile');
          localStorage.removeItem('userType');
          localStorage.removeItem('userOrganization');
        } catch (_) {}
        // redirect to login route
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);