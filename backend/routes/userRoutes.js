import express from "express";
import { getProfile, verifyToken, login, register, getMe, applyForSeller, getAllSellerApplications, acceptSellerApplication, rejectSellerApplication } from "../controllers/userController.js";
import { protect, checkAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Auth routes (public)
router.post("/login", protect, login);
router.post("/register", protect, register);
router.post("/verify-token", protect, verifyToken);

// Profile routes
router.get("/profile", protect, getProfile);
router.get("/me", protect, getMe);

// Seller application routes
router.post("/apply-seller", protect, applyForSeller);

// Admin routes for managing seller applications
router.get("/admin/seller-applications", protect, checkAdmin, getAllSellerApplications);
router.put("/admin/seller-applications/:applicationId/accept", protect, checkAdmin, acceptSellerApplication);
router.put("/admin/seller-applications/:applicationId/reject", protect, checkAdmin, rejectSellerApplication);

export default router;
