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


export const verifyToken = async (req, res) => {
  try {

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

export const login = async (req, res) => {
  try {
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

export const register = async (req, res) => {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists"
      });
    }

    const user = await createOrUpdateUser(req.user);
    
    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: user
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 'P2002') {
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
    console.error('Get me error:', error);
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
    console.error("Apply for seller error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit seller application",
    });
  }
};


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
    console.error('Get all seller applications error:', error);
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
    console.error('Accept seller application error:', error);
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
    console.error('Reject seller application error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to reject seller application"
    });
  }
};
