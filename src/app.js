import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import xssClean from "xss-clean";
import mongoSanitize from "express-mongo-sanitize";
import { startRewardCronJob } from "./lib/rewardJob.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------- MIDDLEWARES -------------------

// Enable CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // Adjust for production
    credentials: true,
  })
);

// Set secure HTTP headers
app.use(helmet());

// Log HTTP requests
app.use(morgan("dev"));

// Limit repeated requests to public APIs
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  })
);

// Parse incoming JSON payloads
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Prevent XSS attacks
app.use(xssClean());

// Prevent NoSQL injection
app.use(mongoSanitize());

// ------------------- ROUTES -------------------

app.get("/", (req, res) => {
  res.send("Express ES6 app running with dotenv!");
});

// Background Cron Job
startRewardCronJob();

// Routes
import authRoutes from "./router/auth.route.js";
app.use("/api/v1/user", authRoutes);

// ------------------- ERROR HANDLING (optional) -------------------

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// ------------------- SERVER -------------------

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
