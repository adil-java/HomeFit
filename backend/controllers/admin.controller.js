import prisma from '../config/db.js';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateToken,verifyToken } from '../utils/jwtHelper.js';


// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update user role (admin only)
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!Object.values(Role).includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: id},
      data: { role }
    });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'cant update role Server Error' });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id: id}
    });
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get user by ID (admin only)
export const getUserById = async (req, res) => {
  const { id } = req.params;
 console.log("📥 Received ID:", id);
  try {
    const user = await prisma.user.findUnique({
      where: { id:id },
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
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log("👤 Retrieved User:", user);
    res.status(200).json({ success: true, data: user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    console.log("Received ID:", id);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Admin login (if needed)
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;
try {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        return res.status(401).json({ success: false, message: 'no user found' });
    }

    // Check password
    // const isMatch = await bcrypt.compare(password, user.firebaseUid);
    const isMatch = password === user.firebaseUid; // Since firebaseUid is being used as password hash
    if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials password' });
    }

    // Check if user is admin
    if (user.role !== Role.ADMIN) {
        return res.status(403).json({ success: false, message: 'Access denied: Not an admin' });
    }

  
    // Generate token
    const token = generateToken({ id: user.id, role: user.role });

    return res.status(200).json({
        success: true,
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
    });
} catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
}

};
export const allSellers = async (req, res) => {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: Role.SELLER }, // ✅ Correct role
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(200).json({ success: true, data: sellers });
  } catch (error) {
    console.error('Get all sellers error:', error);
    res.status(500).json({ success: false, message: 'Cannot get all sellers. Server Error.' });
  }
};

