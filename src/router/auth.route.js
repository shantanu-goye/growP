import {
  register,
  login,
  getUserById,
  getAllUsers,
  verifyEmail,
} from "../Controller/auth.controller.js";
import { Router } from "express";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/users", getAllUsers);
router.get("/auth/users/:id", getUserById);
router.get("/auth/verify-email/:token", verifyEmail);

export default router; // ✅ correct placement
