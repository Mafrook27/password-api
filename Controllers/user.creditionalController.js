const Credential = require('../Models/Credential');
const RootInstance = require('../Models/Root_ins');
const SubInstance = require('../Models/Sub_ins');
const Audit = require('../Models/Audit');
const User = require('../Models/CRED_User');
const logger = require('../util/Logger');
const { encrypt,decrypt,getDisplayCredential,getDecryptedCredential } = require('../util/cryptography');
const { getClientIP } = require('../util/clientIp');


const userCredentialController = {
  // GET /credentials - User's credentials only
getCredentials: async (req, res, next) => {
 try {
    const userId = req.payload.id;
    const { search: rawSearch, type: rawType, page = 1, limit = 5 } = req.query;

    const search = Array.isArray(rawSearch) ? rawSearch[0] : rawSearch?.trim();
    const type = Array.isArray(rawType) ? rawType[0] : rawType?.trim();

    const currentUser = await User.findById(userId).lean();
    if (!currentUser) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    const baseAccessFilter = {
      $or: [
        { createdBy: userId },
        { sharedWith: userId }
      ]
    };

    // ----- Dynamic Search Filters -----
    const orFilters = [];
    let rootQuery = {}; 

    if (search && type) {
      rootQuery.$and = [
        { serviceName: { $regex: search, $options: 'i' } },
        { type }
      ];
    } else if (search) {
      rootQuery.serviceName = { $regex: search, $options: 'i' };
    } else if (type) {
      rootQuery.type = type;
    }

    const subQuery = search
      ? { name: { $regex: search, $options: 'i' } }
      : null;

    const [rootInstances, subInstances] = await Promise.all([
      RootInstance.find(rootQuery).select('_id'),
      subQuery ? SubInstance.find(subQuery).select('_id') : []
    ]);

    const rootIds = rootInstances.map(r => r._id);
    const subIds = subInstances.map(s => s._id);

    if (rootIds.length > 0) orFilters.push({ rootInstance: { $in: rootIds } });
    if (subIds.length > 0) orFilters.push({ subInstance: { $in: subIds } });

    // ----- Final Filter -----
    const finalFilter = orFilters.length > 0
      ? { $and: [baseAccessFilter, { $or: orFilters }] }
      : baseAccessFilter;

    // ----- Pagination Setup -----
    const parsedLimit = Math.max(parseInt(limit), 1);
    const parsedPage = Math.max(parseInt(page), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    // ----- Fetch Matching Credentials -----
    const [credentials, total] = await Promise.all([
      Credential.find(finalFilter)
        .populate('rootInstance', 'serviceName type')
        .populate('subInstance', 'name')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),

      Credential.countDocuments(finalFilter)
    ]);

    const displayCredentials = credentials.map(cred => getDisplayCredential(cred));

    // ----- Response -----
    res.json({
      success: true,
      count: credentials.length,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
      data: { credentials: displayCredentials }
    });

  } catch (error) {
    logger.error('getCredentials', { message: error.message, stack: error.stack });
    next(error);
  }
},

  // GET /credentials/:id - Get credential 
  getCredential: async (req, res, next) => {
    try {
      const credentialId = req.params.id;
      const userId = req.payload.id;
      if (!userId ) {
             throw new Error('User ID is required');
            }
             if (!credentialId ) {
           throw new Error('Credential ID is required');
            }

         const credential = await Credential.findById(credentialId)
        .populate('rootInstance', 'serviceName type')
        .populate('subInstance', 'name')
        .populate('createdBy', 'name email')
        .populate('sharedWith', 'name email');

      if (!credential) {
        const error = new Error('Credential not found');
        error.statusCode = 404;
        throw error;
      }

      // Check access - user can only access if owner or shared with
      const isOwner = credential.createdBy._id.toString() === userId;
      const isShared = credential.sharedWith.some(user => user._id.toString() === userId);

      if (!isOwner && !isShared) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }

      // Log view if shared user (not owner)
      if (isShared && !isOwner) {
        await Audit.create({
          user: userId,
          credential: credentialId,
          credentialOwner: credential.createdBy._id,
          serviceName: credential.rootInstance.serviceName, 
          action: 'view',
          ipAddress: getClientIP(req).address,
          userAgent: req.get('User-Agent')
        });
      }

      const displaycred = getDisplayCredential(credential);
      res.json({
        success: true,
        data: { displaycred },
      });

    } catch (error) {
      logger.error('getCredential wihtout filter ', { message: error.message, stack: error.stack });
      next(error);
    } },

  // POST /credentials - Create credential
createCredential: async (req, res, next) => {
  try {
    const userId = req.payload.id;
    const { 
      serviceName,
      type,
      subInstanceName,
      username,
      password,
      url,
      notes
     
    } = req.body;

    // Always use the logged-in admin's ID as the credential owner
    const credentialOwnerId = userId;

    logger.info('Admin creating credential', { 
      adminId: userId, 
      serviceName, 
      subInstanceName 
    });

    let rootInstance = await RootInstance.findOne({
      serviceName: serviceName,
      type: type,
      createdBy: credentialOwnerId
    });

    if (!rootInstance) {
      rootInstance = await RootInstance.create({
        serviceName: serviceName,
        type: type || 'other',
        createdBy: credentialOwnerId,
        subInstances: []
      });
    }

    let subInstance = await SubInstance.findOne({
      name: subInstanceName,
      rootInstance: rootInstance._id,
      createdBy: credentialOwnerId
    });

    if (!subInstance) {
      subInstance = await SubInstance.create({
        name: subInstanceName,
        rootInstance: rootInstance._id,
        createdBy: credentialOwnerId,
        credentials: []
      });

      await RootInstance.findByIdAndUpdate(
        rootInstance._id,
        { $push: { subInstances: subInstance._id } }
      );
    }

    const credential = await Credential.create({
      rootInstance: rootInstance._id,
      subInstance: subInstance._id,
      createdBy: credentialOwnerId,
      username: encrypt(username),
      password: encrypt(password),
      url: url || 'www.exmplelink',
      notes: notes || '// no notes'
    });

    await SubInstance.findByIdAndUpdate(
      subInstance._id,
      { $push: { credentials: credential._id } }
    );

    const populatedCredential = await Credential.findById(credential._id)
      .populate('rootInstance', 'serviceName type')
      .populate('subInstance', 'name')
      .populate('createdBy', 'name email');

    const displayCredential = getDisplayCredential(populatedCredential);

    // Log admin action
    await Audit.create({
      user: userId,
      credential: credential._id,
      credentialOwner: credentialOwnerId,
      serviceName: serviceName,
      action: 'create',
      ipAddress:getClientIP(req).address,
      userAgent: req.get('User-Agent'),
    
    });

    res.status(201).json({
      success: true,
      data: { credential: displayCredential },
      message: 'Credential created successfully'
    });

  } catch (error) {
  
    next(error);
  }
},

  // PUT /credentials/:id - Update credential 
  updateCredential: async (req, res, next) => {
    try {
      const credentialId = req.params.id;
      const userId = req.payload.id;

      const {
        serviceName,
        type,
        subInstanceName,
        username,
        password,
        url,
        notes
      } = req.body;

      const credential = await Credential.findById(credentialId)
        .populate('rootInstance', 'serviceName type');

      if (!credential) {
        const error = new Error('Credential not found');
        error.statusCode = 404;
        throw error;
      }

      // Only owner can update (admin logic removed)
      const isOwner = credential.createdBy.toString() === userId;
      if (!isOwner) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }

      let rootInstance = credential.rootInstance;
      let subInstance = credential.subInstance;

      if (serviceName || type) {
        rootInstance = await RootInstance.findOne({
          serviceName: serviceName || credential.rootInstance.serviceName,
          type: type || credential.rootInstance.type,
          createdBy: userId
        });

        if (!rootInstance) {
          rootInstance = await RootInstance.create({
            serviceName: serviceName || credential.rootInstance.serviceName,
            type: type || credential.rootInstance.type,
            createdBy: userId,
            subInstances: []
          });
        }

        if (!rootInstance._id.equals(credential.rootInstance._id)) {
          await RootInstance.findByIdAndUpdate(
            credential.rootInstance._id,
            { $pull: { subInstances: subInstance._id } }
          );
        }
      }

      if (subInstanceName) {
        subInstance = await SubInstance.findOne({
          name: subInstanceName,
          rootInstance: rootInstance._id,
          createdBy: userId
        });

        if (!subInstance) {
          subInstance = await SubInstance.create({
            name: subInstanceName,
            rootInstance: rootInstance._id,
            createdBy: userId,
            credentials: []
          });

          await RootInstance.findByIdAndUpdate(
            rootInstance._id,
            { $push: { subInstances: subInstance._id } }
          );
        }

        if (!subInstance._id.equals(credential.subInstance)) {
          await SubInstance.findByIdAndUpdate(
            credential.subInstance,
            { $pull: { credentials: credentialId } }
          );
        }
      }

      credential.username = username ? encrypt(username) : credential.username;
      credential.password = password ? encrypt(password) : credential.password;
      credential.url = url !== undefined ? url : credential.url;
      credential.notes = notes !== undefined ? notes : credential.notes;
      credential.rootInstance = rootInstance._id;
      credential.subInstance = subInstance._id;

      await credential.save();

      await SubInstance.findByIdAndUpdate(
        subInstance._id,
        { $addToSet: { credentials: credentialId } }
      );

      await Audit.create({
        user: userId,
        credential: credentialId,
        credentialOwner: credential.createdBy,
        serviceName: rootInstance.serviceName,
        action: 'update',
        ipAddress: getClientIP(req).address,
        userAgent: req.get('User-Agent')
      });

      const updatedCredential = await Credential.findById(credentialId)
        .populate('rootInstance', 'serviceName type')
        .populate('subInstance', 'name')
        .populate('createdBy', 'name email')
        .populate('sharedWith', 'name email');

      const displayCredential = getDisplayCredential(updatedCredential);
      logger.info('Updated credential', displayCredential);

      res.json({
        success: true,
        data: { credential: displayCredential },
        message: 'Credential updated successfully'
      });

    } catch (error) {
      next(error);
    }
  },

  // DELETE /credentials/:id - Delete credential 
  deleteCredential: async (req, res, next) => {
    try {
      const credentialId = req.params.id;
      const userId = req.payload.id;

      const credential = await Credential.findById(credentialId)
        .populate('rootInstance', 'serviceName type');

      if (!credential) {
        const error = new Error('Credential not found');
        error.statusCode = 404;
        throw error;
      }

      // Only owner can delete (admin logic removed)
      const isOwner = credential.createdBy.toString() === userId;
      if (!isOwner) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }

      await SubInstance.findByIdAndUpdate(
        credential.subInstance,
        { $pull: { credentials: credentialId } }
      );

      await Credential.findByIdAndDelete(credentialId);

      const subInstanceCreds = await Credential.countDocuments({ 
        subInstance: credential.subInstance 
      });
      
      if (subInstanceCreds === 0) {
        await SubInstance.findByIdAndDelete(credential.subInstance);
        
        const rootInstanceSubs = await SubInstance.countDocuments({ 
          rootInstance: credential.rootInstance._id 
        });
        
        if (rootInstanceSubs === 0) {
          await RootInstance.findByIdAndDelete(credential.rootInstance._id);
        }
      }

      await Audit.create({
        user: userId,
        credential: credentialId,
        credentialOwner: credential.createdBy,
        serviceName: credential.rootInstance.serviceName, 
        action: 'delete',
        ipAddress:getClientIP(req).address,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Credential deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  },

  // POST /credentials/:id/share - Share credential
  shareCredential: async (req, res, next) => {
    try {
      const credentialId = req.params.id;
      const userId = req.payload.id;
      const { userId: targetUserId } = req.body;

      const credential = await Credential.findById(credentialId)
        .populate('rootInstance', 'serviceName type');

      if (!credential) {
        const error = new Error('Credential not found');
        error.statusCode = 404;
        throw error;
      }

      // Only owner can share (admin logic removed)
      const isOwner = credential.createdBy.toString() === userId;
      if (!isOwner) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }

      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      if (targetUserId === userId) {
        const error = new Error('Cannot share with yourself');
        error.statusCode = 400;
        throw error;
      }

      if (credential.sharedWith.includes(targetUserId)) {
        const error = new Error('Already shared with this user');
        error.statusCode = 409;
        throw error;
      }

      credential.sharedWith.push(targetUserId);
      await credential.save();

      await Audit.create({
        user: userId,
        credential: credentialId,
        credentialOwner: credential.createdBy,
        serviceName: credential.rootInstance.serviceName, 
        action: 'share',
        targetUser: targetUserId,
        ipAddress: getClientIP(req).address,
        userAgent: req.get('User-Agent')
      });

      const updatedCredential = await Credential.findById(credentialId)
        .populate('sharedWith', 'name email');

      res.json({
        success: true,
        data: { credential: updatedCredential },
        message: 'Credential shared successfully'
      });

    } catch (error) {
      next(error);
    }
  },

  // DELETE /credentials/:id/share/:userId - Revoke access
  revokeAccess: async (req, res, next) => {
    try {
      const credentialId = req.params.id;
      const targetUserId = req.params.userId;
      const userId = req.payload.id;

      const credential = await Credential.findById(credentialId)
        .populate('rootInstance', 'serviceName type');

      if (!credential) {
        const error = new Error('Credential not found');
        error.statusCode = 404;
        throw error;
      }

      // Only owner can revoke (admin logic removed)
      const isOwner = credential.createdBy.toString() === userId;
      if (!isOwner) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }

      if (!credential.sharedWith.includes(targetUserId)) {
        const error = new Error('Not shared with this user');
        error.statusCode = 404;
        throw error;
      }

      credential.sharedWith = credential.sharedWith.filter(
        id => id.toString() !== targetUserId
      );
      await credential.save();

      await Audit.create({
        user: userId,
        credential: credentialId,
        credentialOwner: credential.createdBy,
        serviceName: credential.rootInstance.serviceName,
        action: 'revoke',
        targetUser: targetUserId,
        ipAddress:getClientIP(req).address,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Access revoked successfully'
      });

    } catch (error) {
      next(error);
    }
  },

  // GET /credentials/:id/audit-logs 
  getAuditLogs: async (req, res, next) => {
    try {
      const credentialId = req.params.id;
      const userId = req.payload.id;
      const { page = 1, limit = 5 } = req.query;

      const credential = await Credential.findById(credentialId);
      if (!credential) {
        const error = new Error('Credential not found');
        error.statusCode = 404;
        throw error;
      }

      // Only owner can view audit logs (admin logic removed)
      const isOwner = credential.createdBy.toString() === userId;
      if (!isOwner) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }

      const parsedLimit = Math.max(parseInt(limit), 1);
      const parsedPage = Math.max(parseInt(page), 1);
      const skip = (parsedPage - 1) * parsedLimit;

      const [auditLogs, total] = await Promise.all([
        Audit.find({ credential: credentialId })
          .populate('user', 'name email')
          .populate('targetUser', 'name email')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parsedLimit),

        Audit.countDocuments({ credential: credentialId })
      ]);

      res.json({
        success: true,
        count: auditLogs.length,
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        data: { auditLogs }
      });

    } catch (error) {
      next(error);
    }
  },

  // GET /credentials/:id/decrypt 
  getCredentialDecrypted: async (req, res, next) => {
    try {
      const credentialId = req.params.id;
      const userId = req.payload.id;

      const credential = await Credential.findById(credentialId);
      if (!credential) {
        const error = new Error('Credential not found');
        error.statusCode = 404;
        throw error;
      }

      const isOwner = credential.createdBy.toString() === userId;
      const isSharedWith = credential.sharedWith?.map(id => id.toString()).includes(userId);

      if (!isOwner && !isSharedWith) {
        const error = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }

      const decryptedUsername = decrypt(credential.username);
      const decryptedPassword = decrypt(credential.password);

      const populatedCredential = await Credential.findById(credentialId)
        .populate('rootInstance', 'serviceName type')
        .populate('subInstance', 'name')
        .populate('createdBy', 'name email');

      const credentialObj = populatedCredential.toObject();
      const decryptedCredential = {
        ...credentialObj,
        username: decryptedUsername,
        password: decryptedPassword
      };

      await Audit.create({
        user: userId,
        credential: credentialId,
        credentialOwner: credential.createdBy,
        serviceName: credential.rootInstance?.serviceName || 'Unknown',
        action: 'decrypt',
        ipAddress:getClientIP(req).address,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: { credential: decryptedCredential }
      });

    } catch (error) {
      logger.error('getCredentialDecrypted', { message: error.message, stack: error.stack });
      next(error);
    }
  }
};

module.exports = userCredentialController;