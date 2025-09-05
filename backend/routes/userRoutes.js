import express from "express";
import { getProfile } from "../controllers/userController.js";
import verifyFirebaseToken from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/profile", verifyFirebaseToken, getProfile);

export default router;
