import {
  register,
  login,
  getUserById,
  getAllUsers,
  verifyEmail,
  getProfileOfUser,
} from "../Controller/auth.controller.js";

import {
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPasswordWithOTP,
} from "../Controller/restPassword.controller.js";
import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/users", getAllUsers);
router.get("/auth/profile", authenticateToken, getProfileOfUser);
router.get("/auth/users/:id", getUserById);
router.get("/auth/verify-email/:token", verifyEmail);
router.post("/auth/password-reset/otp", sendPasswordResetOTP);
router.post("/auth/password-reset/verify", verifyPasswordResetOTP);
router.post("/auth/password-reset/reset", resetPasswordWithOTP);

export default router; // ✅ correct placement
