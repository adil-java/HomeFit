import express from "express";
import { getProfile, verifyToken, login, register, getMe, applyForSeller, getAllSellerApplications, acceptSellerApplication, rejectSellerApplication, getCurrentSellerApplication } from "../controllers/userController.js";
import { protect, checkAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.post("/login", protect, login);
router.post("/register", protect, register);
router.post("/verify-token", protect, verifyToken);


router.get("/profile", protect, getProfile);
router.get("/me", protect, getMe);

router.post("/apply-seller", protect, applyForSeller);

router.get("/seller-application/status", protect, getCurrentSellerApplication);


router.get("/admin/seller-applications", protect, checkAdmin, getAllSellerApplications);
router.put("/admin/seller-applications/:applicationId/accept", protect, checkAdmin, acceptSellerApplication);
router.put("/admin/seller-applications/:applicationId/reject", protect, checkAdmin, rejectSellerApplication);

export default router;
