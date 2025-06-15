import express from "express";
import {
  getRewardRates,
  updateRewardRate,
  getNonRewardDays,
  createNonRewardDay,
  deleteNonRewardDay,
} from "../Controller/rewardSettings.controller.js";

const router = express.Router();
import { authenticateToken } from "../middleware/authMiddleware.js";
// Reward Rate Settings Routes
router.get("/reward-rates", authenticateToken, getRewardRates);
router.put("/reward-rates/:plan", authenticateToken, updateRewardRate);

// Non Reward Days Routes
router.get("/non-reward-days", authenticateToken, getNonRewardDays);
router.post("/non-reward-days", authenticateToken, createNonRewardDay);
router.delete("/non-reward-days/:id", authenticateToken, deleteNonRewardDay);

export default router;
