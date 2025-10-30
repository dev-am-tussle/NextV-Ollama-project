/**
 * ========================================
 * CENTRALIZED MIDDLEWARE REGISTRY
 * ========================================
 * 
 * Single source of truth for all middleware functions
 * Import any middleware from: import { authenticateToken } from '../middleware'
 */

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================
export { authenticateToken, getUserProfile } from './auth.js';

// ========================================
// ROLE-BASED AUTHORIZATION
// ========================================
export { 
  requireAdmin,
  requireSuperAdmin,
  requireAdminOrSuperAdmin,
  checkPermission 
} from './roleAuth.js';

// ========================================
// SUPER ADMIN SPECIFIC
// ========================================
export { authenticateSuperAdmin } from './superAdminAuth.js';

/**
 * Usage Examples:
 * 
 * // In routes file
 * import { authenticateToken, requireAdmin } from '../middleware';
 * 
 * // Protected route
 * router.get('/admin/dashboard', authenticateToken, requireAdmin, controller.getDashboard);
 * 
 * // Chain multiple middleware
 * router.post('/admin/users', 
 *   authenticateToken, 
 *   requireAdminOrSuperAdmin, 
 *   controller.createUser
 * );
 */
