// const User = require('../Models/CRED_User');

// const CheckAccess = async (req, res, next) => {
//   try {
//     const currentUserId = req.payload?.id;

//     if (!currentUserId) {
//       return res.status(401).json({ success: false, message: "Unauthorized: No user ID found in token" });
//     }

//     const user = await User.findById(currentUserId);
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

  
//     if (user.role === 'admin') {
//       return next();
//     }

//     // Block unverified users
//     if (!user.isVerified) {
//       return res.status(403).json({ success: false, message: "Access denied: User not verified " });
//     }

//     next();
//   } catch (error) {
//     next(error);
//   }
// };

// module.exports = {CheckAccess};


const User = require('../Models/CRED_User');
const CheckAccess = async (req, res, next) => {
  try {
    const currentUserId = req.payload?.id;

    if (!currentUserId) {
      const error = new Error("Unauthorized: No user ID found in token");
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.role === "admin") {
      return next();
    }

    if (!user.isVerified) {
      const error = new Error("Access denied: User not verified");
      error.statusCode = 403;
      throw error;
    }

    next();
  } catch (error) {
   
    next(error); // Pass to global error handler
  }
};

module.exports = { CheckAccess };