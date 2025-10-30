/**
 * ========================================
 * CENTRALIZED MODELS REGISTRY
 * ========================================
 * 
 * All MongoDB Mongoose models exported from one place
 * Import any model from: import { User, Organization } from '../models'
 */

// ========================================
// USER & AUTHENTICATION MODELS
// ========================================
export * from "./user.models.js";

// ========================================
// ADMIN & SUPER ADMIN MODELS
// ========================================
export * from "./admin.model.js";
export * from "./adminSettings.model.js";
export { SuperAdmin } from "./superAdmin.model.js";

// ========================================
// ORGANIZATION MODELS
// ========================================
export * from "./organization.model.js";
export * from "./invitation.model.js";

// ========================================
// MODEL MANAGEMENT
// ========================================
export * from "./availableModel.model.js";

// ========================================
// CHAT & CONVERSATIONS
// ========================================
export * from "./conversation.model.js";
export * from "./message.model.js";

// ========================================
// USER DATA
// ========================================
export * from "./savedPrompt.model.js";
export * from "./file.model.js";

/**
 * Usage Examples:
 * 
 * // Import specific models
 * import { User, Organization, AvailableModel } from '../models';
 * 
 * // Query database
 * const user = await User.findById(userId);
 * const org = await Organization.findOne({ name: 'Portal 360' });
 * 
 * // Create new document
 * const newModel = await AvailableModel.create({ name: 'llama2', ... });
 */
