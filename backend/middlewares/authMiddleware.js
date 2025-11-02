import firebaseService from '../services/firebase.service.js';
import prisma from '../config/db.js';
import { verifyToken as verifyCustomJwt } from '../utils/jwtHelper.js';

const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const user = await firebaseService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};


// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }

    try {
      const firebaseUser = await firebaseService.verifyToken(token);
      
      // For registration, we don't need to check if user exists in database
      if (req.path === '/register' && req.method === 'POST') {
        req.user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          phoneNumber: firebaseUser.phoneNumber,
          role: 'customer' // Default role for new users
        };
        return next();
      }

      // For all other protected routes, check if user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { firebaseUid: firebaseUser.uid }
      });

      if (!dbUser) {
        return res.status(401).json({
          success: false,
          error: 'User not found in database',
        });
      }

      req.user = {
        id: dbUser.id,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        phoneNumber: firebaseUser.phoneNumber,
        role: dbUser.role || 'customer',
      };

      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed',
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Not authorized as an admin',
    });
  }
};

// Middleware to check if user is seller
const checkSeller = (req, res, next) => {
  if (req.user && (req.user.role === 'SELLER' || req.user.role === 'ADMIN')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Not authorized as a seller',
    });
  }
};
const adminVerify = async (req, res, next) => {
  try {
    await protect(req, res, async () => {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized as an admin',
        });
      }
      next();
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during admin verification',
    });
  }
}
// Middleware to verify custom JWT for admin panel
const adminJwtVerify = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const token = parts[1];

    const payload = verifyCustomJwt(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    if (payload.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Not authorized as an admin' });
    }

    req.user = payload; // { id, email, role }
    next();
  } catch (error) {
    console.error('Custom admin JWT verification error:', error);
    return res.status(500).json({ success: false, error: 'Server error during admin JWT verification' });
  }
};

export { protect, checkAdmin, checkSeller, adminVerify, adminJwtVerify };
export default verifyFirebaseToken;
