const express = require('express');
const router = express.Router();
const adminUserController = require('../Controllers/adminController');
const adminCredentialController = require('../Controllers/admin.creditionalController');
const activitylog=require('../Controllers/activitylog');
const commonController = require('../Controllers/commonController');
const { authenticateToken } = require('../Middleware/authenticateToken');
const {requireAdmin} = require('../Middleware/Authoize');
const { validate } = require('../Middleware/validate');
const { changePasswordSchema } = require('../validations/userValidation');
const { createCredentialSchema, updateCredentialSchema } = require('../validations/credentialValidation');
const { track } = require('../util/track');
router.use(authenticateToken, requireAdmin);


// User 
router.get('/users', track('ADMIN_READ_ALL_USERS'), adminUserController.getAllUsers);
router.post('/users', track('ADMIN_CREATE_USER'), adminUserController.createUser); 
router.get('/users/permission/:id', track('ADMIN_APPROVE_USER'), adminUserController.approveUser);
router.get('/users/:id', track('ADMIN_READ_USER_PROFILE'), adminUserController.getUserProfile);
router.put('/users/:id', track('ADMIN_UPDATE_USER'), adminUserController.updateUser);
router.delete('/users/:id', track('ADMIN_DELETE_USER'), adminUserController.deleteUser);
router.put('/users/:id/role', track('ADMIN_CHANGE_USER_ROLE'), adminUserController.changeUserRole);
router.get('/users/:id/stats', track('ADMIN_READ_USER_STATS'), adminUserController.getUserStats);
router.post('/users/:id/change-password', track('ADMIN_CHANGE_USER_PASSWORD'), adminUserController.changeUserPassword);

// Common routes for admin
router.get('/users-list', track('ADMIN_READ_USER_LIST'), commonController.getUserList);
router.post('/change-password', track('ADMIN_CHANGE_PASSWORD'), validate(changePasswordSchema), commonController.changePassword);

// Credential
router.get('/credentials', track('ADMIN_READ_ALL_CREDENTIALS'), adminCredentialController.getAllCredentials);
router.post('/credentials', track('ADMIN_CREATE_CREDENTIAL'), validate(createCredentialSchema), adminCredentialController.createCredential);
router.get('/credentials/:id', track('ADMIN_READ_CREDENTIAL'), adminCredentialController.getCredential);
router.put('/credentials/:id', track('ADMIN_UPDATE_CREDENTIAL'), validate(updateCredentialSchema), adminCredentialController.updateCredential);
router.delete('/credentials/:id', track('ADMIN_DELETE_CREDENTIAL'), adminCredentialController.deleteCredential);
router.get('/credentials/:id/decrypt', track('ADMIN_DECRYPT_CREDENTIAL'), adminCredentialController.getCredentialDecrypted);
router.get('/credentials/:id/audit-logs', track('ADMIN_READ_CREDENTIAL_AUDIT_LOGS'), adminCredentialController.getAuditLogs);
router.get('/audit-logs', track('ADMIN_READ_ALL_AUDIT_LOGS'), adminCredentialController.getAllAuditLogs);
router.get('/activity-logs', activitylog.getActivityLogs);


module.exports = router;












/**
 * @swagger
 * tags:
 *   - name: Admin - User Management
 *     description: Admin operations for managing users (view all users, update, delete, change roles, approve users)
 *   - name: Admin - Credential Management
 *     description: Admin operations for managing all credentials across the system
 *   - name: Admin - Common
 *     description: Common admin operations (user list, change own password)
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Retrieve paginated list of all users in the system with filtering options. Admins can view all registered users.
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *         example: 10
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                   description: Number of users in current page
 *                 total:
 *                   type: integer
 *                   example: 100
 *                   description: Total number of users
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           role:
 *                             type: string
 *                             enum: [user, admin]
 *                             example: "user"
 *                           isVerified:
 *                             type: boolean
 *                             example: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T00:00:00.000Z"
 *                           lastLogin:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Access denied - Requires admin role
 *       500:
 *         description: Server error
 */

// routes/adminRoutes.js

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create new user (Admin only)
 *     description: Create a new user account with admin privileges. Admin can set the user role and the account is automatically verified.
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the user
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address (must be unique)
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: User's password (will be hashed)
 *                 example: "tempPass123"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *                 description: User role (defaults to 'user' if not provided)
 *                 example: "user"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not an admin
 *       409:
 *         description: Conflict - Email already exists
 *       500:
 *         description: Server error
 */








/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user profile (Admin only)
 *     description: Retrieve detailed profile information for any user in the system
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update user (Admin only)
 *     description: Update any user's profile information (name, email)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Name"
 *               email:
 *                 type: string
 *                 example: "updated@example.com"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     description: Permanently delete any user from the system
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Change user role (Admin only)
 *     description: Change a user's role between 'user' and 'admin'. Use this to promote users to admin or demote admins to regular users.
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 description: New role for the user
 *                 example: "admin"
 *           examples:
 *             promoteToAdmin:
 *               summary: Promote user to admin
 *               value:
 *                 role: "admin"
 *             demoteToUser:
 *               summary: Demote admin to user
 *               value:
 *                 role: "user"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         role:
 *                           type: string
 *                           example: "admin"
 *                 message:
 *                   type: string
 *                   example: "User role updated to admin successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Requires admin role
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/users/{id}/stats:
 *   get:
 *     summary: Get user stats (Admin only)
 *     description: Retrieve detailed statistics for any user including credentials count and activity metrics
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                           example: 100
 *                         totalCredentials:
 *                           type: integer
 *                           example: 500
 *                         activeUsers:
 *                           type: integer
 *                           example: 75
 *                         recentActivities:
 *                           type: integer
 *                           example: 200
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/users/{id}/change-password:
 *   post:
 *     summary: Change user password (Admin only)
 *     description: Admin can reset any user's password without requiring the old password
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: "newSecurePassword123"
 *     responses:
 *       200:
 *         description: User password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User password changed successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/users/permission/{id}:
 *   get:
 *     summary: Approve user (Admin only)
 *     description: Approve a pending user registration to grant them access to the system
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User user@example.com approved successfully."
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/users-list:
 *   get:
 *     summary: Get user list for dropdowns (Admin)
 *     description: Retrieve simplified list of all users (ID, name, email) for use in dropdowns and selection
 *     tags: [Admin - Common]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Requires admin role
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/change-password:
 *   post:
 *     summary: Change own password (Admin)
 *     description: Admin can change their own password by providing old and new passwords
 *     tags: [Admin - Common]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: Current password
 *                 example: "CurrentP@ssw0rd123"
 *               newPassword:
 *                 type: string
 *                 description: New password (minimum 6 characters)
 *                 example: "NewSecureP@ssw0rd456"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Incorrect old password
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/credentials:
 *   get:
 *     summary: Get all credentials (Admin only)
 *     description: Retrieve paginated list of all credentials in the system with search and filter options
 *     tags: [Admin - Credential Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by service name or sub instance name
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by credential type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of credentials per page
 *     responses:
 *       200:
 *         description: List of credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 total:
 *                   type: integer
 *                   example: 100
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 5
 *                 totalPages:
 *                   type: integer
 *                   example: 20
 *                 data:
 *                   type: object
 *                   properties:
 *                     credentials:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Credential'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/credentials:
 *   post:
 *     summary: Create credential (Admin only)
 *     description: Admin can create credentials for their own account. The credential will be automatically associated with the authenticated admin user.
 *     tags: [Admin - Credential Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceName
 *               - type
 *               - subInstanceName
 *               - username
 *               - password
 *             properties:
 *               serviceName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Name of the service
 *                 example: "AWS Console"
 *               type:
 *                 type: string
 *                 enum: [banking, email, cloud, social, development, database, payment, hosting, communication, other]
 *                 default: other
 *                 description: Type of credential
 *                 example: "cloud"
 *               subInstanceName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Sub-instance name
 *                 example: "Production Environment"
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Username or email (will be encrypted)
 *                 example: "admin@company.com"
 *               password:
 *                 type: string
 *                 minLength: 1
 *                 description: Password (will be encrypted)
 *                 example: "SecureP@ssw0rd123"
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Service URL (optional)
 *                 example: "https://console.aws.amazon.com"
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Additional notes (optional)
 *                 example: "Production AWS admin account"
 *     responses:
 *       201:
 *         description: Credential created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     credential:
 *                       $ref: '#/components/schemas/Credential'
 *                 message:
 *                   type: string
 *                   example: "Credential created successfully"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["\"serviceName\" is required", "\"password\" is required"]
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Server error
 */









/**
 * @swagger
 * /api/admin/credentials/{id}:
 *   get:
 *     summary: Get any credential (Admin only)
 *     description: Retrieve details of any credential in the system (password remains encrypted)
 *     tags: [Admin - Credential Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Credential ID
 *     responses:
 *       200:
 *         description: Credential details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     displaycred:
 *                       $ref: '#/components/schemas/Credential'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Credential not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/credentials/{id}:
 *   put:
 *     summary: Update any credential (Admin only)
 *     description: Update any credential's information in the system
 *     tags: [Admin - Credential Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Credential ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceName:
 *                 type: string
 *                 example: "Updated Service"
 *               type:
 *                 type: string
 *                 example: "updated_type"
 *               subInstanceName:
 *                 type: string
 *                 example: "Updated Sub Instance"
 *               username:
 *                 type: string
 *                 example: "updated@example.com"
 *               password:
 *                 type: string
 *                 example: "updatedPassword123"
 *               url:
 *                 type: string
 *                 example: "https://updated.com"
 *               notes:
 *                 type: string
 *                 example: "Updated notes"
 *     responses:
 *       200:
 *         description: Credential updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     credential:
 *                       $ref: '#/components/schemas/Credential'
 *                 message:
 *                   type: string
 *                   example: "Credential updated successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Credential not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/credentials/{id}:
 *   delete:
 *     summary: Delete any credential (Admin only)
 *     description: Permanently delete any credential from the system
 *     tags: [Admin - Credential Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Credential ID
 *     responses:
 *       200:
 *         description: Credential deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Credential deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Credential not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/credentials/{id}/decrypt:
 *   get:
 *     summary: Get decrypted credential (Admin only)
 *     description: Retrieve credential with decrypted password (creates audit log entry)
 *     tags: [Admin - Credential Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Credential ID
 *     responses:
 *       200:
 *         description: Decrypted credential details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     credential:
 *                       $ref: '#/components/schemas/Credential'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Credential not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/credentials/{id}/audit-logs:
 *   get:
 *     summary: Get credential audit logs (Admin only)
 *     description: Retrieve all audit logs for a specific credential (who accessed, modified, or deleted it)
 *     tags: [Admin - Credential Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Credential ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of logs per page
 *     responses:
 *       200:
 *         description: Credential audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 total:
 *                   type: integer
 *                   example: 10
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 5
 *                 totalPages:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: object
 *                   properties:
 *                     auditLogs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Credential not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get all audit logs (Admin only)
 *     description: Retrieve system-wide audit logs with filtering options by user, credential, or owner
 *     tags: [Admin - Credential Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of logs per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: credentialId
 *         schema:
 *           type: string
 *         description: Filter by credential ID
 *       - in: query
 *         name: credentialOwner
 *         schema:
 *           type: string
 *         description: Filter by credential owner ID
 *     responses:
 *       200:
 *         description: All audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     auditLogs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */

/**    
 * 
 * 
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "user_id_123"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         role:
 *           type: string
 *           enum: [admin, user]
 *           example: "user"
 *         isVerified:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00.000Z"
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00.000Z"
 *       required:
 *         - _id
 *         - name
 *         - email
 *         - role
 *         - isVerified
 *         - createdAt
 *
 *     Credential:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "cred_id_123"
 *         rootInstance:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "root_id_123"
 *             serviceName:
 *               type: string
 *               example: "Google"
 *             type:
 *               type: string
 *               example: "email"
 *         subInstance:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "sub_id_123"
 *             name:
 *               type: string
 *               example: "Main Account"
 *         createdBy:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "user_id_123"
 *             name:
 *               type: string
 *               example: "John Doe"
 *             email:
 *               type: string
 *               example: "john@example.com"
 *         sharedWith:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 example: "user_id_456"
 *               name:
 *                 type: string
 *                 example: "Jane Smith"
 *               email:
 *                 type: string
 *                 example: "jane@example.com"
 *         username:
 *           type: string
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           example: "encrypted_password"
 *         url:
 *           type: string
 *           example: "https://google.com"
 *         notes:
 *           type: string
 *           example: "Main email account"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00.000Z"
 *       required:
 *         - _id
 *         - rootInstance
 *         - subInstance
 *         - createdBy
 *         - username
 *         - password
 *         - createdAt
 *         - updatedAt
 *
 *     AuditLog:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "audit_id_123"
 *         user:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "user_id_123"
 *             name:
 *               type: string
 *               example: "John Doe"
 *             email:
 *               type: string
 *               example: "john@example.com"
 *         credential:
 *           type: string
 *           example: "cred_id_123"
 *         credentialOwner:
 *           type: string
 *           example: "user_id_456"
 *         serviceName:
 *           type: string
 *           example: "Google"
 *         action:
 *           type: string
 *           enum: [create, update, delete, decrypt]
 *           example: "create"
 *         ipAddress:
 *           type: string
 *           example: "192.168.1.1"
 *         userAgent:
 *           type: string
 *           example: "Mozilla/5.0..."
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00.000Z"
 *         notes:
 *           type: string
 *           example: "Created by admin"
 *       required:
 *         - _id
 *         - user
 *         - credential
 *         - credentialOwner
 *         - action
 *         - timestamp
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
  // routes/adminRoutes.js

/**
 * @swagger
 * /api/admin/activity-logs:
 *   get:
 *     summary: Get activity logs (Admin only)
 *     description: Retrieve paginated activity logs with filtering options
 *     tags: [Admin - Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *       - in: query
 *         name: isslow
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: iserror
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: startdate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: enddate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 */
