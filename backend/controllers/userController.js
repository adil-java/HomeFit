import prisma from '../config/db.js';
import { Role } from '@prisma/client';

// Helper function to create or update user in database
const createOrUpdateUser = async (firebaseUser) => {
  try {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid }
    });

    if (!user) {
      // Create new user in database
      user = await prisma.user.create({
        data: {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          phoneNumber: firebaseUser.phoneNumber,
          photoURL: firebaseUser.photoURL,
          role: firebaseUser.email?.includes('admin') ? Role.ADMIN : Role.CUSTOMER
        }
      });
      console.log('New user created in database:', user.id);
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { firebaseUid: firebaseUser.uid },
        data: {
          email: firebaseUser.email,
          name: firebaseUser.displayName || user.name,
          phoneNumber: firebaseUser.phoneNumber || user.phoneNumber,
          photoURL: firebaseUser.photoURL || user.photoURL,
        }
      });
      console.log('User updated in database:', user.id);
    }

    return user;
  } catch (error) {
    console.error('Database user operation error:', error);
    throw error;
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { firebaseUid: req.user.uid },
      include: {
        addresses: true,
        cart: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        wishlist: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found in database"
      });
    }

    res.json({
      success: true,
      message: "User profile fetched successfully",
      user: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile"
    });
  }
};

// Verify Firebase token and get user info
export const verifyToken = async (req, res) => {
  try {
    // Create or update user in database
    const user = await createOrUpdateUser(req.user);
    
    res.json({
      success: true,
      message: "Token verified successfully",
      user: user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: "Token verification failed"
    });
  }
};

// Login endpoint (for token verification)
export const login = async (req, res) => {
  try {
    // Create or update user in database
    const user = await createOrUpdateUser(req.user);
    
    res.json({
      success: true,
      message: "Login successful",
      user: user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: "Login failed"
    });
  }
};

// Register endpoint (for token verification after signup)
export const register = async (req, res) => {
  try {
    // Create new user in database
    const user = await createOrUpdateUser(req.user);
    
    res.json({
      success: true,
      message: "Registration successful",
      user: user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: "Registration failed"
    });
  }
};

// Get current user details (me endpoint)
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { firebaseUid: req.user.uid },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        phoneNumber: true,
        photoURL: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      message: "User details fetched successfully",
      data: user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user details"
    });
  }
};
