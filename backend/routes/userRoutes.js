import express from "express";
import { getProfile, verifyToken, login, register, getMe } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Auth routes
router.post("/login", login);
router.post("/register", register);
router.post("/verify-token", verifyToken);

// Profile routes
router.get("/profile", protect, getProfile);
router.get("/me", protect, getMe);

export default router;
