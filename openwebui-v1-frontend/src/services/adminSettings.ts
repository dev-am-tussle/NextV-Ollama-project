// Admin Settings Service
// This service handles all admin-related API calls and local storage

export interface BrandingSettings {
  logoName: string;
  titleName: string;
  primaryColor: string;
  buttonTextColor: string;
}

export interface AdminSettings {
  branding: BrandingSettings;
  // Add more admin settings here as needed
  // security: SecuritySettings;
  // users: UserSettings;
  // system: SystemSettings;
}

const ADMIN_SETTINGS_KEY = 'admin_settings';

// Default settings
const defaultAdminSettings: AdminSettings = {
  branding: {
    logoName: 'TussleAI',
    titleName: 'Tussle - AI',
    primaryColor: '#61dafbaa',
    buttonTextColor: '#ffffff',
  },
};

// Get admin settings from localStorage
export const getAdminSettings = (): AdminSettings => {
  try {
    const stored = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return {
        ...defaultAdminSettings,
        ...parsed,
        branding: {
          ...defaultAdminSettings.branding,
          ...parsed.branding,
        },
      };
    }
  } catch (error) {
    console.error('Error loading admin settings:', error);
  }
  
  return defaultAdminSettings;
};

// Save admin settings to localStorage (and later to backend)
export const saveAdminSettings = async (settings: AdminSettings): Promise<void> => {
  try {
    // Save to localStorage first
    localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
    
    // TODO: Send to backend API
    // await api.post('/admin/settings', settings);
    
    // Apply branding changes to document
    applyBrandingSettings(settings.branding);
    
  } catch (error) {
    console.error('Error saving admin settings:', error);
    throw new Error('Failed to save admin settings');
  }
};

// Get only branding settings
export const getBrandingSettings = (): BrandingSettings => {
  return getAdminSettings().branding;
};

// Save only branding settings
export const saveBrandingSettings = async (branding: BrandingSettings): Promise<void> => {
  const currentSettings = getAdminSettings();
  await saveAdminSettings({
    ...currentSettings,
    branding,
  });
};

// Apply branding settings to the document
export const applyBrandingSettings = (branding: BrandingSettings): void => {
  try {
    // Update CSS custom properties for better color application
    const root = document.documentElement;
    
    // Convert hex to RGB for better CSS variable support
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
      if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `${r} ${g} ${b}`;
      }
      return '97 218 251'; // fallback to default
    };
    
    const buttonTextRgb = hexToRgb(branding.buttonTextColor);
    const primaryRgb = hexToRgb(branding.primaryColor);
    
    // Set CSS custom properties for comprehensive theming
    root.style.setProperty('--primary', primaryRgb);
    root.style.setProperty('--primary-rgb', primaryRgb);
    root.style.setProperty('--color-primary', branding.primaryColor);
    
    // Button-specific colors
    root.style.setProperty('--btn-primary-bg', branding.primaryColor);
    root.style.setProperty('--btn-primary-text', branding.buttonTextColor);
    root.style.setProperty('--btn-primary-text-rgb', buttonTextRgb);
    
    // Logo and accent colors
    root.style.setProperty('--logo-color', branding.primaryColor);
    root.style.setProperty('--accent', primaryRgb);
    
    // Update document title
    if (branding.titleName && branding.titleName !== 'Tussle - AI') {
      document.title = `${branding.titleName}`;
    }
    
    // Log for debugging
    console.log('Applied branding settings:', {
      primaryColor: branding.primaryColor,
      buttonTextColor: branding.buttonTextColor,
      logoName: branding.logoName,
      titleName: branding.titleName
    });
    
  } catch (error) {
    console.error('Error applying branding settings:', error);
  }
};

// Initialize branding settings on app startup
export const initializeBrandingSettings = (): void => {
  const settings = getAdminSettings();
  applyBrandingSettings(settings.branding);
};

// Check if user has admin privileges (placeholder for now)
export const hasAdminAccess = (): boolean => {
  // TODO: Implement proper admin access check
  // For now, return true for all authenticated users
  return true;
};

// Reset branding settings to defaults
export const resetBrandingToDefaults = async (): Promise<void> => {
  await saveBrandingSettings(defaultAdminSettings.branding);
};

// Get default branding settings
export const getDefaultBrandingSettings = (): BrandingSettings => {
  return { ...defaultAdminSettings.branding };
};

export default {
  getAdminSettings,
  saveAdminSettings,
  getBrandingSettings,
  saveBrandingSettings,
  applyBrandingSettings,
  initializeBrandingSettings,
  hasAdminAccess,
  resetBrandingToDefaults,
  getDefaultBrandingSettings,
};