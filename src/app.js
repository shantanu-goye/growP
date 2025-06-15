import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

// import { startRewardCronJob } from "./lib/rewardJob.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------- MIDDLEWARES -------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Enable CORS

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://app.growp.in",
      "https://admin.growp.in",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Set secure HTTP headers
app.use(helmet());

// Log HTTP requests
app.use(morgan("dev"));

// Limit repeated requests to public APIs
// app.use(
//   rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 500, // Limit each IP to 100 requests per windowMs
//     message: "Too many requests from this IP, please try again later.",
//   })
// );

// Parse incoming JSON payloads
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// ------------------- ROUTES -------------------

app.get("/", (req, res) => {
  res.send("Express ES6 app running with dotenv!");
});
// startRewardCronJob();

// Routes
import authRoutes from "./router/auth.route.js";
import adminRoutes from "./router/admin.auth.route.js";
import tranasctionRoute from "./router/transaction.route.js";
import rewardSettingRoute from "./router/rewardSettings.route.js";
import notifcationRouter from "./router/notification.route.js";
import { startRewardCronJob, creditDailyRewards } from "./lib/rewardJob.js";

startRewardCronJob(); // Start the reward cron job
creditDailyRewards(); // Uncomment to run immediately for testing
app.use("/api/v1/user", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/transactions", tranasctionRoute);
app.use("/api/v1/rewardRatesettings", rewardSettingRoute);
app.use("/api/v1/notification", notifcationRouter);
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
