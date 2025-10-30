/**
 * ========================================
 * CENTRALIZED CONTROLLERS REGISTRY
 * ========================================
 * 
 * Single source of truth for all controllers
 * Import any controller from: import { UserController } from '../controllers'
 */

// ========================================
// AUTHENTICATION CONTROLLERS
// ========================================
export { default as AdminAuthController } from './adminAuth.controller.js';
export { default as SuperAdminController } from './superAdmin.controller.js';
export { default as UnifiedAuthController } from './unifiedAuth.controller.js';

// ========================================
// USER CONTROLLERS
// ========================================
export { default as ModelsController } from './models.controller.js';
export { default as CategorizedModelsController } from './categorizedModels.controller.js';
export { default as UserExternalApiController } from './userExternalApi.controller.js';

// ========================================
// ADMIN CONTROLLERS
// ========================================
export { default as AdminModelsController } from './adminModels.controller.js';
export { default as AdminCombinedModelsController } from './adminCombinedModels.controller.js';
export { default as AdminUsersController } from './adminUsers.controller.js';
export { default as ExternalApisController } from './externalApis.controller.js';

// ========================================
// SUPER ADMIN CONTROLLERS
// ========================================
export { default as OrganizationManagementController } from './organizationManagement.controller.js';

// ========================================
// OLLAMA CONTROLLERS
// ========================================
export { default as OllamaControllers } from './ollama.controllers.js';

// ========================================
// ONBOARDING & INVITATIONS
// ========================================
export { default as OnboardingController } from './onboarding.controller.js';
export { default as InvitationController } from './invitation.controller.js';

/**
 * Usage Examples:
 * 
 * // Import specific controller
 * import { CategorizedModelsController } from '../controllers';
 * 
 * // Import multiple controllers
 * import { AdminModelsController, AdminUsersController } from '../controllers';
 * 
 * // Use in routes
 * router.get('/models', CategorizedModelsController.getModels);
 */
