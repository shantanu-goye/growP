import express from "express";
import {
  getRewardRates,
  updateRewardRate,
  getNonRewardDays,
  createNonRewardDay,
  deleteNonRewardDay,
} from "../Controller/rewardSettings.controller.js";
import { verifyAdminToken } from "../middleware/adminauthMiddleware.js";
const router = express.Router();

// Reward Rate Settings Routes
router.get("/reward-rates", verifyAdminToken, getRewardRates);
router.put("/reward-rates/:plan", verifyAdminToken, updateRewardRate);

// Non Reward Days Routes
router.get("/non-reward-days", verifyAdminToken, getNonRewardDays);
router.post("/non-reward-days", verifyAdminToken, createNonRewardDay);
router.delete("/non-reward-days/:id", verifyAdminToken, deleteNonRewardDay);

export default router;
