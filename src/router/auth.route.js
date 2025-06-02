import {
  register,
  login,
  getUserById,
  getAllUsers,
  verifyEmail,
  resendVerificationEmail,
  getProfileOfUser,
} from "../Controller/auth.controller.js";

import {
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPasswordWithOTP,
} from "../Controller/restPassword.controller.js";
import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { verifyAdminToken } from "../middleware/adminauthMiddleware.js";
const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/users", getAllUsers);
router.get("/auth/profile", authenticateToken, getProfileOfUser);
router.get("/auth/users/:id", verifyAdminToken, getUserById);
router.get("/auth/verify-email/:token", verifyEmail);
router.post("/auth/resend-verification/:email", resendVerificationEmail); // Add thi
router.post("/auth/password-reset/otp", sendPasswordResetOTP);
router.post("/auth/password-reset/verify", verifyPasswordResetOTP);
router.post("/auth/password-reset/reset", resetPasswordWithOTP);

export default router; // ✅ correct placement
