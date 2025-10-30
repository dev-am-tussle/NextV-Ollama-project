// ========================================
// ROUTE IMPORTS
// ========================================

// Authentication & Authorization
import authRoutes from './auth.routes.js';
import oauthRoutes from './oauth.routes.js';
import adminAuthRoutes from './adminAuth.routes.js';
import superAdminRoutes from './superAdmin.routes.js';
import unifiedAuthRoutes from './unifiedAuth.routes.js';

// User Routes
import userModelsRoutes from './userModels.routes.js';
import categorizedModelsRoutes from './categorizedModels.routes.js';
import conversationRoutes from './conversation.routes.js';
import savedPromptsRoutes from './savedprompts.routes.js';
import filesRoutes from './files.routes.js';
import userExternalApiRoutes from './userExternalApi.routes.js';

// Admin Routes
import adminModelsRoutes from './adminModels.routes.js';
import adminUsersRoutes from './adminUsers.routes.js';
import externalApisRoutes from './externalApis.routes.js';

// Super Admin Routes
import organizationManagementRoutes from './organizationManagement.routes.js';

// Ollama & Model Routes
import ollamaRoutes from './ollama.routes.js';
import modelsRoutes from './models.routes.js';
import modelsV2Routes from './models.js';

// Onboarding & Invitations
import onboardingRoutes from './onboarding.routes.js';
import invitationRoutes from './invitation.routes.js';

// ========================================
// ROUTE CONFIGURATION
// ========================================

/**
 * Route registry with metadata
 * Each route has:
 * - path: API endpoint prefix
 * - router: Express router
 * - description: What this route group handles
 * - version: API version
 */
const routeRegistry = [
  // ========================================
  // AUTHENTICATION & AUTHORIZATION
  // ========================================
  {
    path: '/api/v1/auth',
    router: authRoutes,
    description: 'User authentication (login, register, logout)',
    version: 'v1',
    category: 'Authentication'
  },
  {
    path: '/api/v1/auth',
    router: oauthRoutes,
    description: 'OAuth integration (Microsoft, Google)',
    version: 'v1',
    category: 'Authentication'
  },
  {
    path: '/api/v1/unified-auth',
    router: unifiedAuthRoutes,
    description: 'Unified authentication endpoint',
    version: 'v1',
    category: 'Authentication'
  },
  {
    path: '/api/admin/auth',
    router: adminAuthRoutes,
    description: 'Admin authentication',
    version: 'v1',
    category: 'Authentication'
  },
  {
    path: '/api/super-admin/auth',
    router: superAdminRoutes,
    description: 'Super admin authentication',
    version: 'v1',
    category: 'Authentication'
  },

  // ========================================
  // USER ROUTES
  // ========================================
  {
    path: '/api/v1/user',
    router: userModelsRoutes,
    description: 'User model management (download, remove)',
    version: 'v1',
    category: 'User'
  },
  {
    path: '/api/v1/user',
    router: categorizedModelsRoutes,
    description: 'Categorized model access (downloaded, available, global)',
    version: 'v1',
    category: 'User'
  },
  {
    path: '/api/v1/user/external-apis',
    router: userExternalApiRoutes,
    description: 'User external API management',
    version: 'v1',
    category: 'User'
  },
  {
    path: '/api/v1/conversations',
    router: conversationRoutes,
    description: 'Chat conversations and messages',
    version: 'v1',
    category: 'User'
  },
  {
    path: '/api/v1/saved-prompts',
    router: savedPromptsRoutes,
    description: 'User saved prompts',
    version: 'v1',
    category: 'User'
  },
  {
    path: '/api/v1/files',
    router: filesRoutes,
    description: 'File upload and management',
    version: 'v1',
    category: 'User'
  },

  // ========================================
  // ADMIN ROUTES
  // ========================================
  {
    path: '/api/admin/models',
    router: adminModelsRoutes,
    description: 'Admin model catalog management',
    version: 'v1',
    category: 'Admin'
  },
  {
    path: '/api/admin/users',
    router: adminUsersRoutes,
    description: 'Admin user management',
    version: 'v1',
    category: 'Admin'
  },
  {
    path: '/api/v1/external-apis',
    router: externalApisRoutes,
    description: 'Admin external API configuration',
    version: 'v1',
    category: 'Admin'
  },

  // ========================================
  // SUPER ADMIN ROUTES
  // ========================================
  {
    path: '/api/super-admin/organizations',
    router: organizationManagementRoutes,
    description: 'Organization management',
    version: 'v1',
    category: 'Super Admin'
  },

  // ========================================
  // OLLAMA & MODEL ROUTES
  // ========================================
  {
    path: '/api/v1/models',
    router: ollamaRoutes,
    description: 'Ollama model operations (chat, generate, pull)',
    version: 'v1',
    category: 'Models'
  },
  {
    path: '/api/v1/available-models',
    router: modelsRoutes,
    description: 'Available models listing for users',
    version: 'v1',
    category: 'Models'
  },
  {
    path: '/api/models',
    router: modelsV2Routes,
    description: 'Model operations (v2 - external routing)',
    version: 'v2',
    category: 'Models'
  },

  // ========================================
  // ONBOARDING & INVITATIONS
  // ========================================
  {
    path: '/api/onboarding',
    router: onboardingRoutes,
    description: 'User onboarding flow',
    version: 'v1',
    category: 'Onboarding'
  },
  {
    path: '/api',
    router: invitationRoutes,
    description: 'User invitation system',
    version: 'v1',
    category: 'Onboarding'
  },
];

// ========================================
// ROUTE REGISTRATION FUNCTION
// ========================================

/**
 * Register all routes with the Express app
 * @param {Express.Application} app - Express app instance
 */
export default function registerRoutes(app) {
  // Group routes by category for organized logging
  const categories = {};
  routeRegistry.forEach(route => {
    if (!categories[route.category]) {
      categories[route.category] = [];
    }
    categories[route.category].push(route);
  });

  // Register routes without logging
  Object.keys(categories).forEach(category => {
    categories[category].forEach(({ path, router }) => {
      app.use(path, router);
    });
  });
}

// ========================================
// ROUTE INFORMATION EXPORT
// ========================================

/**
 * Get all registered routes information
 * Useful for documentation generation or API discovery
 */
export function getRoutesInfo() {
  return routeRegistry.map(({ path, description, version, category }) => ({
    path,
    description,
    version,
    category
  }));
}

/**
 * Get routes by category
 * @param {string} category - Category name
 */
export function getRoutesByCategory(category) {
  return routeRegistry.filter(route => route.category === category);
}

/**
 * Get routes by version
 * @param {string} version - API version (e.g., 'v1', 'v2')
 */
export function getRoutesByVersion(version) {
  return routeRegistry.filter(route => route.version === version);
}
