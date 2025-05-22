// import express from "express";
// import {
//   getRewardRates,
//   updateRewardRate,
//   getNonRewardDays,
//   createNonRewardDay,
//   deleteNonRewardDay,
// } from "../Controller/rewardSettings.controller.js";
// import { authenticateUser, authorizeAdmin } from "../middleware/authMiddleware.js";

// const router = express.Router();

// // Reward Rate Settings Routes
// router.get("/reward-rates", authenticateUser, getRewardRates);
// router.put("/reward-rates/:plan", authenticateUser, authorizeAdmin, updateRewardRate);

// // Non Reward Days Routes
// router.get("/non-reward-days", authenticateUser, getNonRewardDays);
// router.post("/non-reward-days", authenticateUser, authorizeAdmin, createNonRewardDay);
// router.delete("/non-reward-days/:id", authenticateUser, authorizeAdmin, deleteNonRewardDay);

// export default router;
