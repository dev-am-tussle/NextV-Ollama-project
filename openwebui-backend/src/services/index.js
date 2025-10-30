/**
 * ========================================
 * CENTRALIZED SERVICES REGISTRY
 * ========================================
 * 
 * Single source of truth for all service modules
 * Import any service from: import { OllamaService } from '../services'
 */

// ========================================
// AUTHENTICATION SERVICES
// ========================================
export * as AuthService from './auth.service.js';
export * as OAuthService from './oauth.service.js';
export * as SuperAdminService from './superAdmin.service.js';

// ========================================
// CHAT & MESSAGING SERVICES
// ========================================
export * as ChatService from './chat.service.js';
export * as ExternalChatService from './externalChat.service.js';

// ========================================
// OLLAMA & MODEL SERVICES
// ========================================
export * as OllamaService from './ollama.service.js';
export * as ModelManagementService from './modelManagement.service.js';

// ========================================
// ONBOARDING & NOTIFICATIONS
// ========================================
export * as OnboardingService from './onboarding.service.js';
export * as SendGridService from './sendgrid.service.js';

// ========================================
// SETTINGS & CONFIGURATION
// ========================================
export * as SettingsService from './settings.service.js';

// ========================================
// MODEL PROVIDERS (External)
// ========================================
export { default as ModelProviders } from './modelProviders/index.js';

/**
 * Usage Examples:
 * 
 * // Import entire service
 * import { OllamaService } from '../services';
 * await OllamaService.pullModel('llama2');
 * 
 * // Import specific functions
 * import { OllamaService } from '../services';
 * const { pullModel, listModels } = OllamaService;
 * 
 * // Use in controllers
 * import { ChatService, OllamaService } from '../services';
 * const response = await OllamaService.generateChat(messages);
 */
