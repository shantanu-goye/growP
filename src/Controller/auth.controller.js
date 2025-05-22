import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/emailService.js";

const prisma = new PrismaClient();

// Encryption Config
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const ENCRYPTION_IV =
  process.env.ENCRYPTION_IV || crypto.randomBytes(16).toString("hex");
const ALGORITHM = "aes-256-cbc";

// Encryption Helpers
const encryptData = (text) => {
  const iv = Buffer.from(ENCRYPTION_IV, "hex");
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

const decryptData = (encryptedText) => {
  try {
    const iv = Buffer.from(ENCRYPTION_IV, "hex");
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

// Audit Log Helper
const createAuditLog = async (action, userId = null, metadata = {}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        metadata,
      },
    });
  } catch (error) {
    console.error("Audit log creation failed:", error);
    // Don't throw error to avoid breaking main functionality
  }
};

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      accountNumber,
      ifscCode,
      panNumber,
      aadhaarNumber,
      phoneNumber,
      dob,
    } = req.body;

    // Log registration attempt
    await createAuditLog("USER_REGISTRATION_ATTEMPT", null, {
      email,
      phoneNumber,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    });

    // Check if user exists by email or phoneNumber or encrypted accountNumber
    const encryptedAccountNumber = encryptData(accountNumber);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phoneNumber },
          { accountNumber: encryptedAccountNumber },
        ],
      },
    });

    if (existingUser) {
      // Log failed registration attempt
      await createAuditLog("USER_REGISTRATION_FAILED", null, {
        reason: "User already exists",
        email,
        phoneNumber,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(400).json({
        success: false,
        message:
          "User already exists with this email, phone number, or account number",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        dob: new Date(dob),
        phoneNumber,
        customerId: `CUS${Date.now().toString().slice(-8)}${Math.floor(
          Math.random() * 1000
        )}`,
        accountNumber: encryptedAccountNumber,
        ifscCode: encryptData(ifscCode),
        panNumber: encryptData(panNumber),
        aadhaarNumber: encryptData(aadhaarNumber),
      },
    });

    // Create initial balance with proper plan field
    await prisma.balance.create({
      data: {
        userId: newUser.id,
        plan: "seed", // Added required plan field
      },
    });

    // Send verification email
    await sendMail({
      to: newUser.email,
      subject: "Welcome! Verify Your Email",
      html: `<p>Hello ${newUser.name},</p><p>Thank you for registering. Please <a href="${process.env.BASE_URL}/verify-email/${newUser.id}">verify your email</a>.</p>`,
    });

    // Log successful registration
    await createAuditLog("USER_REGISTRATION_SUCCESS", newUser.id, {
      customerId: newUser.customerId,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return res.status(201).json({
      success: true,
      message: "Registration successful. Check email for verification.",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Log registration error
    await createAuditLog("USER_REGISTRATION_ERROR", null, {
      error: error.message,
      email: req.body?.email,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Log login attempt
    await createAuditLog("USER_LOGIN_ATTEMPT", null, {
      email,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Log failed login - user not found
      await createAuditLog("USER_LOGIN_FAILED", null, {
        reason: "User not found",
        email,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Log failed login - invalid password
      await createAuditLog("USER_LOGIN_FAILED", user.id, {
        reason: "Invalid password",
        email,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isEmailVerified) {
      // Log failed login - email not verified
      await createAuditLog("USER_LOGIN_FAILED", user.id, {
        reason: "Email not verified",
        email,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(403).json({
        success: false,
        message: "Please verify your email first.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        customerId: user.customerId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Handle first login
    let isFirstLogin = false;
    if (user.firstLogin) {
      await prisma.user.update({
        where: { id: user.id },
        data: { firstLogin: false },
      });
      isFirstLogin = true;
    }

    // Log successful login
    await createAuditLog("USER_LOGIN_SUCCESS", user.id, {
      customerId: user.customerId,
      email: user.email,
      isFirstLogin,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    });

    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);

    // Log login error
    await createAuditLog("USER_LOGIN_ERROR", null, {
      error: error.message,
      email: req.body?.email,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user?.id; // Assuming user info is added by auth middleware

    // Log user data access attempt
    await createAuditLog("USER_DATA_ACCESS_ATTEMPT", requestingUserId, {
      targetUserId: id,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    const user = await prisma.user.findUnique({
      where: { id },
      include: { balances: true },
    });

    if (!user) {
      // Log failed access - user not found
      await createAuditLog("USER_DATA_ACCESS_FAILED", requestingUserId, {
        reason: "User not found",
        targetUserId: id,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const decryptedUser = {
      ...user,
      accountNumber: decryptData(user.accountNumber),
      ifscCode: decryptData(user.ifscCode),
      panNumber: decryptData(user.panNumber),
      aadhaarNumber: decryptData(user.aadhaarNumber),
      password: undefined,
    };

    // Log successful user data access
    await createAuditLog("USER_DATA_ACCESS_SUCCESS", requestingUserId, {
      targetUserId: id,
      targetCustomerId: user.customerId,
      dataFields: ["profile", "balances", "personalInfo"],
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      user: decryptedUser,
    });
  } catch (error) {
    console.error("Fetch user error:", error);

    // Log user data access error
    await createAuditLog("USER_DATA_ACCESS_ERROR", req.user?.id, {
      error: error.message,
      targetUserId: req.params?.id,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const requestingUserId = req.user?.id; // Assuming admin user info is added by auth middleware

    // Log bulk user data access attempt
    await createAuditLog("BULK_USER_DATA_ACCESS_ATTEMPT", requestingUserId, {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    });

    const users = await prisma.user.findMany({
      include: { balances: true },
    });

    const decryptedUsers = users.map((user) => ({
      ...user,
      accountNumber: decryptData(user.accountNumber),
      ifscCode: decryptData(user.ifscCode),
      panNumber: decryptData(user.panNumber),
      aadhaarNumber: decryptData(user.aadhaarNumber),
      password: undefined,
    }));

    // Log successful bulk user data access
    await createAuditLog("BULK_USER_DATA_ACCESS_SUCCESS", requestingUserId, {
      userCount: users.length,
      dataFields: ["profile", "balances", "personalInfo"],
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      users: decryptedUsers,
    });
  } catch (error) {
    console.error("Fetch users error:", error);

    // Log bulk user data access error
    await createAuditLog("BULK_USER_DATA_ACCESS_ERROR", req.user?.id, {
      error: error.message,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params; // This is actually the user ID based on your implementation

    // Log email verification attempt
    await createAuditLog("EMAIL_VERIFICATION_ATTEMPT", token, {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    const updatedUser = await prisma.user.update({
      where: { id: token },
      data: { isEmailVerified: true },
    });

    // Log successful email verification
    await createAuditLog("EMAIL_VERIFICATION_SUCCESS", token, {
      customerId: updatedUser.customerId,
      email: updatedUser.email,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    // Log email verification error
    await createAuditLog("EMAIL_VERIFICATION_ERROR", req.params?.token, {
      error: error.message,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(500).json({
      success: false,
      message: "Email verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
