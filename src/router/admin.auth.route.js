import express from "express";
import {
  registerAdmin,
  loginAdmin,
  verifyOtp,
  getAdminProfile,
} from "../Controller/admin.auth.controller.js";
import { verifyAdminToken } from "../middleware/adminauthMiddleware.js";

const router = express.Router();

router.post("/register", verifyAdminToken, registerAdmin); // Only super admin
router.post("/login", loginAdmin);
router.post("/verify-otp", verifyOtp);
router.get("/profile", verifyAdminToken, getAdminProfile);

export default router;
