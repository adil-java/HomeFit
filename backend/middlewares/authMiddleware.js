import firebaseService from '../services/firebase.service.js';
import prisma from '../config/db.js';
import { verifyToken as verifyCustomJwt } from '../utils/jwtHelper.js';

const AUTH_BOOTSTRAP_POST_PATHS = new Set(['/register', '/login', '/verify-token']);

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
    console.log('[Auth DEBUG] protect middleware called for:', req.method, req.path);
    console.log('[Auth DEBUG] Authorization header present:', !!req.headers.authorization);

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
      console.log('[Auth DEBUG] Token extracted (first 50 chars):', token?.substring(0, 50) + '...');
    }

    if (!token) {
      console.log('[Auth DEBUG] No token provided');
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route',
      });
    }

    try {
      console.log('[Auth DEBUG] Attempting Firebase token verification...');
      const firebaseUser = await firebaseService.verifyToken(token);
      console.log('[Auth DEBUG] Firebase user verified:', firebaseUser.uid, firebaseUser.email);
      
      // For auth bootstrap routes, allow the controller to create/sync the user
      if (req.method === 'POST' && AUTH_BOOTSTRAP_POST_PATHS.has(req.path)) {
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
      console.log('[Auth DEBUG] Checking for user in database with UID:', firebaseUser.uid);
      let dbUser = await prisma.user.findUnique({
        where: { firebaseUid: firebaseUser.uid }
      });
      console.log('[Auth DEBUG] Database user found:', !!dbUser, dbUser?.id);

      if (!dbUser) {
        // Auto-provision user from Firebase token to avoid authorization deadlocks
        console.log('[Auth DEBUG] Auto-provisioning new user from Firebase data');
        dbUser = await prisma.user.create({
          data: {
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email || `${firebaseUser.uid}@no-email.local`,
            name:
              firebaseUser.displayName ||
              firebaseUser.email?.split('@')[0] ||
              'User',
            phoneNumber: firebaseUser.phoneNumber,
            photoURL: firebaseUser.photoURL,
            role: firebaseUser.email?.toLowerCase().includes('admin')
              ? 'ADMIN'
              : 'CUSTOMER',
          },
        });
        console.log('[Auth DEBUG] New user created in DB:', dbUser.id);
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
      console.log('[Auth DEBUG] User set on request, proceeding to next middleware');

      next();
    } catch (error) {
      console.error('[Auth DEBUG] Token verification failed:', error.code, error.message);
      console.error('[Auth DEBUG] Full verification error:', error);
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

    req.user = payload;
    next();
  } catch (error) {
    console.error('Custom admin JWT verification error:', error);
    return res.status(500).json({ success: false, error: 'Server error during admin JWT verification' });
  }
};

export { protect, checkAdmin, checkSeller, adminVerify, adminJwtVerify };
export default verifyFirebaseToken;
