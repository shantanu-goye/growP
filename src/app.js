import express from "express";
import dotenv from "dotenv";
// import { startRewardCronJob } from "./lib/rewardJob.js";
import adminRoutes from "./router/admin.auth.route.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Express ES6 app running with dotenv!");
});
// startRewardCronJob();

import authRoutes from "./router/auth.route.js";
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
