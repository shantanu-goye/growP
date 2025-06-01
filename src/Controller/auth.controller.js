import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { sendMail } from "../utils/emailService.js";

const prisma = new PrismaClient();

const ENCRYPTION_KEY_ENV = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-cbc";

let ENCRYPTION_KEY_BUFFER;
if (
  ENCRYPTION_KEY_ENV &&
  Buffer.from(ENCRYPTION_KEY_ENV, "hex").length === 32
) {
  ENCRYPTION_KEY_BUFFER = Buffer.from(ENCRYPTION_KEY_ENV, "hex");
} else {
  console.warn(
    "ENCRYPTION_KEY environment variable not set or invalid. Using a default key for demonstration. THIS IS NOT SECURE FOR PRODUCTION!"
  );
  ENCRYPTION_KEY_BUFFER = Buffer.from(
    "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    "hex"
  );
}

const encryptData = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decryptData = (encryptedText) => {
  try {
    if (!encryptedText) {
      return null;
    }
    const [ivHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !encrypted) {
      console.error(
        "Invalid encrypted data format during decryption:",
        encryptedText
      );
      return null;
    }

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY_BUFFER,
      iv
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

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

    await createAuditLog("USER_REGISTRATION_ATTEMPT", null, {
      email,
      phoneNumber,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    });

    const existingUserByEmailOrPhone = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber }],
      },
    });

    if (existingUserByEmailOrPhone) {
      await createAuditLog("USER_REGISTRATION_FAILED", null, {
        reason: "User already exists (email or phone)",
        email,
        phoneNumber,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(400).json({
        success: false,
        message: "User already exists with this email or phone number.",
      });
    }

    const allUsers = await prisma.user.findMany({
      select: { accountNumber: true },
    });

    const isAccountNumberTaken = allUsers.some((user) => {
      const decryptedStoredAccountNumber = user.accountNumber
        ? decryptData(user.accountNumber)
        : null;
      return decryptedStoredAccountNumber === accountNumber;
    });

    if (isAccountNumberTaken) {
      await createAuditLog("USER_REGISTRATION_FAILED", null, {
        reason: "User already exists (account number)",
        email,
        phoneNumber,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(400).json({
        success: false,
        message: "User already exists with this account number.",
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
        accountNumber: encryptData(accountNumber),
        ifscCode: encryptData(ifscCode),
        panNumber: encryptData(panNumber),
        aadhaarNumber: encryptData(aadhaarNumber),
      },
    });

    await prisma.balance.create({
      data: {
        userId: newUser.id,
        plan: "seed",
      },
    });

    await sendMail({
      to: newUser.email,
      subject: "Welcome! Verify Your Email",
      html: `<p>Hello ${newUser.name},</p>
            <p>Thank you for registering. Please 
            <a href="https://app.growp.in/api/v1/user/auth/verify-email/${newUser.id}">
            verify your email</a>.</p>`,
    });

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

    await createAuditLog("USER_LOGIN_ATTEMPT", null, {
      email,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
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

    let isFirstLogin = false;
    if (user.firstLogin) {
      await prisma.user.update({
        where: { id: user.id },
        data: { firstLogin: false },
      });
      isFirstLogin = true;
    }

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
    const requestingUserId = req.user?.id;

    await createAuditLog("USER_DATA_ACCESS_ATTEMPT", requestingUserId, {
      targetUserId: id,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        balances: true,
        deposits: {
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
        withdrawals: {
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
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
      accountNumber: user.accountNumber
        ? decryptData(user.accountNumber)
        : null,
      ifscCode: user.ifscCode ? decryptData(user.ifscCode) : null,
      panNumber: user.panNumber ? decryptData(user.panNumber) : null,
      aadhaarNumber: user.aadhaarNumber
        ? decryptData(user.aadhaarNumber)
        : null,
      password: undefined,
    };

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
    const requestingUserId = req.user?.id;

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
      accountNumber: user.accountNumber
        ? decryptData(user.accountNumber)
        : null,
      ifscCode: user.ifscCode ? decryptData(user.ifscCode) : null,
      panNumber: user.panNumber ? decryptData(user.panNumber) : null,
      aadhaarNumber: user.aadhaarNumber
        ? decryptData(user.aadhaarNumber)
        : null,
      password: undefined,
    }));

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
    const { token } = req.params;

    await createAuditLog("EMAIL_VERIFICATION_ATTEMPT", token, {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    const updatedUser = await prisma.user.update({
      where: { id: token },
      data: { isEmailVerified: true },
    });

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

export const getProfileOfUser = async (req, res) => {
  const { id } = req.user;
  console.log(req.user);
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },

      include: {
        balances: true,
        deposits: {
          orderBy: { createdAt: "desc" },
          take: 5, // recent deposits
        },
        withdrawals: {
          orderBy: { createdAt: "desc" },
          take: 5, // recent withdrawals
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,

        isFirstLogin: user.firstLogin,
        createdAt: user.createdAt,
        balances: user.balances,
        recentDeposits: user.deposits,
        recentWithdrawals: user.withdrawals,
        recentTransactions: user.transactions ?? [],
        isFirstLogin: user.firstLogin,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

// In your auth.controller.js
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email parameter is required",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with this email not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Send verification email
    await sendMail({
      to: user.email,
      subject: "Verify Your Email",
      html: `<p>Please verify your email by clicking this link:</p>
            <a href="${process.env.BASE_URL}/api/v1/user/auth/verify-email/${user.id}">
              Verify Email
            </a>`,
    });

    return res.status(200).json({
      success: true,
      message: "Verification email resent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
