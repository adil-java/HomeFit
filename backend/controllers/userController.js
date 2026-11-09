import prisma from '../config/db.js';
import { uploadImageDataUri } from '../utils/cloudinary.js';
import { Role } from '@prisma/client';
import logger from '../utils/logger.js';

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
          // Never grant roles based on email text; promote users explicitly.
          role: Role.CUSTOMER
        }
      });
      logger.debug('New user created in database:', user.id);
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { firebaseUid: firebaseUser.uid },
        // Profile edits made in the app (PUT /me) win: Firebase values only
        // fill fields that are still empty.
        data: {
          email: firebaseUser.email,
          name: user.name || firebaseUser.displayName,
          phoneNumber: user.phoneNumber || firebaseUser.phoneNumber,
          photoURL: user.photoURL || firebaseUser.photoURL,
        }
      });
      logger.debug('User updated in database:', user.id);
    }

    return user;
  } catch (error) {
    logger.error('Database user operation error:', error);
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
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile"
    });
  }
};


export const verifyToken = async (req, res) => {
  try {

    const user = await createOrUpdateUser(req.user);
    
    res.json({
      success: true,
      message: "Token verified successfully",
      user: user
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: "Token verification failed"
    });
  }
};

export const login = async (req, res) => {
  try {
    const user = await createOrUpdateUser(req.user);
    
    res.json({
      success: true,
      message: "Login successful",
      user: user
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: "Login failed"
    });
  }
};

export const register = async (req, res) => {
  try {
    // Check if user already exists by Firebase UID (not email)
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: req.user.uid }
    });

    if (existingUser) {
      // User already exists, return the existing user data
      return res.status(200).json({
        success: true,
        message: "User already registered",
        user: existingUser
      });
    }

    // Create new user using the helper function
    const user = await createOrUpdateUser(req.user);
    
    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: user
    });
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error.code === 'P2002') {
      // Unique constraint violation - user might already exist
      // Try to find and return existing user
      try {
        const existingUser = await prisma.user.findUnique({
          where: { firebaseUid: req.user.uid }
        });
        if (existingUser) {
          return res.status(200).json({
            success: true,
            message: "User already registered",
            user: existingUser
          });
        }
      } catch (findError) {
        logger.error('Error finding existing user:', findError);
      }
      
      return res.status(400).json({
        success: false,
        error: "User with this email already exists"
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Registration failed"
    });
  }
};

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
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user details"
    });
  }
};


export const applyForSeller = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;

    let user = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid },
    });

    if (!user) {

     return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const {
      businessName,
      businessType,
      description,
      phone,
      address,
      website,
      taxId,
      businessLicense,
    } = req.body;


    const existingApplication = await prisma.sellerApplication.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: "You already have a pending or approved seller application",
      });
    }


    const application = await prisma.sellerApplication.create({
      data: {
        userId: user.id, 
        businessName,
        businessType,
        description,
        phone,
        address,
        website,
        taxId,
        businessLicense,
        status: "PENDING",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Seller application submitted successfully",
      application,
    });
  } catch (error) {
    logger.error("Apply for seller error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit seller application",
    });
  }
};

export const getCurrentSellerApplication = async (req, res) => {
  try {
    const firebaseUid = req.user.uid;

    let user = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // First check for any existing application regardless of status
    const application = await prisma.sellerApplication.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: {
        submittedAt: 'desc' // Get the most recent application
      },
    });

    if (!application) {
      return res.json({
        success: true,
        application: null,
        message: "You don't have any seller applications yet."
      });
    }

    let message = "";
    switch(application.status) {
      case 'PENDING':
        message = "Your seller application is currently under review. We'll notify you once a decision has been made.";
        break;
      case 'APPROVED':
        message = "Congratulations! Your seller application has been approved. You can now start selling on our platform.";
        break;
      case 'REJECTED':
        message = "We're sorry, but your seller application has been rejected. Please contact support for more information.";
        break;
      default:
        message = "Your seller application status is: " + application.status;
    }

    res.json({
      success: true,
      application,
      message,
    });
  } catch (error) {
    logger.error("Get current seller application error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch current seller application",
    });
  }
}

export const getAllSellerApplications = async (req, res) => {
  try {
    const applications = await prisma.sellerApplication.findMany({
      where: {
        status: {
          in: ['PENDING', 'APPROVED', 'REJECTED']
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            firebaseUid: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    res.json({
      success: true,
      applications: applications
    });
  } catch (error) {
    logger.error('Get all seller applications error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch seller applications"
    });
  }
};

export const acceptSellerApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { adminNotes } = req.body;

    const application = await prisma.sellerApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found"
      });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: "Application has already been reviewed"
      });
    }

    const updatedApplication = await prisma.sellerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'APPROVED',
        reviewedBy: req.user.uid,
        reviewedAt: new Date(),
        adminNotes: adminNotes || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await prisma.user.update({
      where: { id: application.userId },
      data: { role: 'SELLER' }
    });

    res.json({
      success: true,
      message: "Seller application approved successfully",
      application: updatedApplication
    });
  } catch (error) {
    logger.error('Accept seller application error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to approve seller application"
    });
  }
};

export const rejectSellerApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { adminNotes } = req.body;

    const application = await prisma.sellerApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found"
      });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: "Application has already been reviewed"
      });
    }

    const updatedApplication = await prisma.sellerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        reviewedBy: req.user.uid,
        reviewedAt: new Date(),
        adminNotes: adminNotes || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: "Seller application rejected",
      application: updatedApplication
    });
  } catch (error) {
    logger.error('Reject seller application error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to reject seller application"
    });
  }
};


// @desc    Update the signed-in user's own profile (name, phone, photo)
// @route   PUT /api/users/me
// @access  Private
const PHOTO_DATA_URI = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const updateMe = async (req, res) => {
  try {
    const { name, phoneNumber, photo } = req.body || {};
    const data = {};

    if (name !== undefined) {
      const clean = String(name).trim().replace(/\s+/g, ' ');
      if (clean.length < 2 || clean.length > 60) {
        return res.status(400).json({ success: false, error: 'Please enter a name between 2 and 60 characters' });
      }
      data.name = clean;
    }

    if (phoneNumber !== undefined) {
      const clean = String(phoneNumber).trim();
      if (clean && (clean.replace(/[^\d]/g, '').length < 7 || clean.length > 20 || !/^[+\d\s()-]+$/.test(clean))) {
        return res.status(400).json({ success: false, error: 'Please enter a valid phone number' });
      }
      data.phoneNumber = clean || null;
    }

    if (photo !== undefined && photo !== null) {
      if (typeof photo !== 'string' || !PHOTO_DATA_URI.test(photo)) {
        return res.status(400).json({ success: false, error: 'Please choose a JPG, PNG or WebP photo' });
      }
      const bytes = Math.floor((photo.length - photo.indexOf(',') - 1) * 0.75);
      if (bytes > MAX_PHOTO_BYTES) {
        return res.status(400).json({ success: false, error: 'That photo is too large. Please choose one under 5 MB' });
      }
      const uploaded = await uploadImageDataUri(photo, 'avatars');
      data.photoURL = uploaded.url;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, email: true, name: true, phoneNumber: true, photoURL: true, role: true },
    });

    res.json({ success: true, user });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Could not update your profile. Please try again.' });
  }
};
