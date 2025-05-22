// routes/authRoutes.js
import express from "express";
import {
  register,
  login,
  getUserProfile,
  verifyEmail,
} from "../Controller/auth.controller.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Auth routes
router.post("/register", register);
router.post("/login", login);
router.get("/verify-email/:token", verifyEmail);

// Protected route
router.get("/profile", authenticateUser, getUserProfile);

export default router;
