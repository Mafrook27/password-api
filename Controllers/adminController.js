const User = require('../Models/CRED_User');
const Credential = require('../Models/Credential');
const Audit = require('../Models/Audit');
const bcrypt = require("bcryptjs");
const logger = require('../util/Logger');
const mongoose = require('mongoose');


const adminController ={



  //POST /api/admin/adduser
createUser: async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      const error = new Error('Missing required fields: name, email, password');
      error.statusCode = 400;
      throw error;
    }

    // Check if user already exists
    const exists = await User.findOne({ email });
    if (exists) {
      const error = new Error('Email already exists');
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || 'user',       
      isVerified: true           
    });

    // Response
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        }
      }
    });

    logger.info(`Admin created user: ${user.email} with role: ${user.role}`);
  } catch (error) {
    next(error);
  }
},


 // GET /api/admin/users 
  getAllUsers: async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const parsedLimit = Math.max(parseInt(limit), 1);
      const parsedPage = Math.max(parseInt(page), 1);
      const skip = (parsedPage - 1) * parsedLimit;

      const [users, total] = await Promise.all([
        User.find()
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        User.countDocuments()
      ]);

      res.json({
        success: true,
        count: users.length,
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        data: { users }
      });
    } catch (error) {
      logger.error('getAllUsers', { message: error.message, stack: error.stack });
      next(error);
    }
  },

  // GET /api/admin/users/:id 
  getUserProfile: async (req, res, next) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id).select('-password');
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      logger.error('adminGetUserProfile', { message: error.message, stack: error.stack });
      next(error);
    }
  },

  // PUT /api/admin/users/:id
  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, email } = req.body;

      const user = await User.findById(id);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if email exists (if changing email)
      if (email && email !== user.email) {
        const emailExists = await User.findOne({ 
          email, 
          _id: { $ne: id }
        });
        if (emailExists) {
          const error = new Error('Email already exists');
          error.statusCode = 409;
          throw error;
        }
        user.email = email;
      }

      if (name !== undefined) user.name = name;
      
      await user.save();

      const updatedUser = await User.findById(id).select('-password');

      res.json({
        success: true,
        data: { user: updatedUser },
        message: 'User updated successfully'
      });
    } catch (error) {
      logger.error('adminUpdateUser', { message: error.message, stack: error.stack });
      next(error);
    }
  },

  // DELETE /api/admin/users/:id - Delete any user 
  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;

      const user = await User.findByIdAndDelete(id);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
      
      logger.info('adminDeletedUser', { userId: id, performedBy: req.user._id });
    } catch (error) {
      logger.error('adminDeleteUser', { message: error.message, stack: error.stack });
      next(error);
    }
  },

  // PUT /api/admin/users/:id/role - Change user role 
  changeUserRole: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await User.findByIdAndUpdate(
        id,
        { role },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      res.json({
        success: true,
        data: { user },
        message: 'User role updated successfully'
      });
    } catch (error) {
      logger.error('changeUserRole', { message: error.message, stack: error.stack });
      next(error);
    }
  },

  // GET /api/admin/users/:id/stats - Get user stats 
  getUserStats: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      const stats = {
        totalUsers: await User.countDocuments(),
        totalCredentials: await Credential.countDocuments(),
        activeUsers: await User.countDocuments({ 
          lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
        }),
        recentActivities: await Audit.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
      };

      res.json({
        success: true,
        data: { stats }
      });
      
      logger.info('adminFetchedStats', { targetUserId: id, performedBy: req.user._id });
    } catch (error) {
      logger.error('adminGetUserStats', { message: error.message, stack: error.stack });
      next(error);
    }
  },

  // POST /api/admin/users/:id/change-password 
  changeUserPassword: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      const user = await User.findById(id);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      res.json({
        success: true,
        message: 'User password changed successfully'
      });
      
      logger.info('adminChangedUserPassword', { targetUserId: id, performedBy: req.user._id });
    } catch (error) {
      logger.error('adminChangeUserPassword', { message: error.message, stack: error.stack });
      next(error);
    }
  },

 approveUser: async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    console.log("User to approve:", user); // Debugging line
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    user.isVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.email} approved successfully.`,
    });
  } catch (error) {
 logger.error('addUseraccess ', { message: error.message, stack: error.stack })

    next(error);
    
  }
},










// bulkToggleVerification : async (req, res, next) => {
//   try {
//     const { updates } = req.body;

//     if (!Array.isArray(updates)) {
//       const error = new Error("Payload must be an array of updates");
//       error.statusCode = 400;
//       throw error;
//     }

//     // Validate each user before bulkWrite
//     const results = [];
//     const bulkOps = [];

//     for (const { id, isVerified } of updates) {
//       try {
//         const user = await User.findById(id);
//         if (!user) {
//           results.push({ id, status: 'not found' });
//           continue;
//         }

//         bulkOps.push({
//           updateOne: {
//             filter: { _id: id },
//             update: { $set: { isVerified } }
//           }
//         });

//         results.push({ id, status: 'queued' });
//       } catch (err) {
//         results.push({ id, status: 'error', message: err.message });
//       }
//     }

//     const bulkResult = bulkOps.length > 0 ? await User.bulkWrite(bulkOps) : null;

//     // Update statuses for successfully modified users
//     if (bulkResult) {
//       results.forEach(entry => {
//         if (entry.status === 'queued') entry.status = 'updated';
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: `${bulkResult?.modifiedCount || 0} users updated`,
//       results
//     });
//   } catch (error) {
//     logger.error('bulkToggleVerification', { message: error.message, stack: error.stack });
//     next(error);
//   }
// },


}



module.exports = adminController;