const express = require('express');
const router = express.Router();
const userRoutes = require('./user.routes');
const authRoutes= require('./authRoutes');
const adminroutes = require('./admin.Routes');

// --- auth route ---
router.use('/auth',authRoutes);
// ---- USER SIDE ----

router.use('/users', userRoutes);


// ---- ADMIN SIDE ----

router.use('/admin', adminroutes);

//--- Activity Logs Route ---




module.exports = router;
