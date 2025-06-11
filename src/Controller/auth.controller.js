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

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Send success HTML page
    return res
      .status(200)
      .sendFile(path.join(__dirname, "../../public", "email-verified.html"));
  } catch (error) {
    console.error("Email verification error:", error);

    await createAuditLog("EMAIL_VERIFICATION_ERROR", req.params?.token, {
      error: error.message,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    // Send failure HTML page
    return res
      .status(500)
      .sendFile(
        path.join(__dirname, "../../public", "email-verification-failed.html")
      );
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
    const { email } = req.params;

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

export const updateUserPlan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { planType } = req.body;

    if (!userId || !planType) {
      return res.status(400).json({
        success: false,
        message: "User ID and plan type are required",
      });
    }

    const validPlans = ["seed", "plant", "tree"];
    const newPlan = planType.toLowerCase();

    if (!validPlans.includes(newPlan)) {
      await createAuditLog("PLAN_UPDATE_FAILED", userId, {
        reason: "Invalid plan type",
        requestedPlan: planType,
        validPlans,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
      });

      return res.status(400).json({
        success: false,
        message: `Invalid plan type. Valid plans are: ${validPlans.join(", ")}`,
      });
    }

    await createAuditLog("PLAN_UPDATE_ATTEMPT", userId, {
      requestedPlan: newPlan,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
    });

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
      },
    });

    if (!existingUser) {
      await createAuditLog("PLAN_UPDATE_FAILED", userId, {
        reason: "User not found",
        requestedPlan: newPlan,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const previousPlan = existingUser.plan;

    if (previousPlan === newPlan) {
      await createAuditLog("PLAN_UPDATE_SKIPPED", userId, {
        reason: "Plan already set to requested type",
        currentPlan: previousPlan,
        requestedPlan: newPlan,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(200).json({
        success: true,
        message: "User is already on the requested plan",
        currentPlan: previousPlan,
      });
    }

    // ✅ Perform transaction: delete old balance, create new one, update plan
    const result = await prisma.$transaction(async (tx) => {
      const oldBalance = await tx.balance.findUnique({
        where: {
          userId_plan: {
            userId,
            plan: previousPlan,
          },
        },
      });

      if (!oldBalance) {
        throw new Error("User has no existing balance for the current plan.");
      }

      const {
        balance: transferBalance,
        pendingDepositBalance: transferPendingDeposit,
        pendingWithdrawalBalance: transferPendingWithdrawal,
        rewardBalance: transferReward,
      } = oldBalance;

      // Optional: Archive audit log of old balance
      await createAuditLog("PLAN_BALANCE_ARCHIVE", userId, {
        archivedPlan: previousPlan,
        balance: transferBalance,
        pendingDepositBalance: transferPendingDeposit,
        pendingWithdrawalBalance: transferPendingWithdrawal,
        rewardBalance: transferReward,
        archivedAt: new Date().toISOString(),
      });

      // 1. Delete old balance
      await tx.balance.delete({
        where: {
          userId_plan: {
            userId,
            plan: previousPlan,
          },
        },
      });

      // 2. Create new balance with new plan
      const newBalance = await tx.balance.create({
        data: {
          userId,
          plan: newPlan,
          balance: transferBalance,
          pendingDepositBalance: transferPendingDeposit,
          pendingWithdrawalBalance: transferPendingWithdrawal,
          rewardBalance: transferReward,
        },
      });

      // 3. Update user’s plan
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          plan: newPlan,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
        },
      });

      return {
        updatedUser,
        newBalance,
        transferBalance,
        transferPendingDeposit,
        transferPendingWithdrawal,
        transferReward,
      };
    });

    // ✅ Send notification email
    try {
      await sendMail({
        to: existingUser.email,
        subject: "Plan Updated Successfully",
        html: `
          <p>Hello ${existingUser.name},</p>
          <p>Your plan has been successfully updated.</p>
          <p><strong>Previous Plan:</strong> ${previousPlan}</p>
          <p><strong>New Plan:</strong> ${newPlan}</p>
          <p><strong>Transferred Balances:</strong></p>
          <ul>
            <li>Main Balance: ${result.transferBalance.toFixed(2)}</li>
            <li>Pending Deposit: ${result.transferPendingDeposit.toFixed(2)}</li>
            <li>Pending Withdrawal: ${result.transferPendingWithdrawal.toFixed(2)}</li>
            <li>Reward Balance: ${result.transferReward.toFixed(2)}</li>
          </ul>
          <p>Your new plan benefits are now active!</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send plan update email:", emailError);
    }

    // ✅ Final audit log
    await createAuditLog("PLAN_UPDATE_SUCCESS", userId, {
      previousPlan,
      newPlan,
      userName: existingUser.name,
      userEmail: existingUser.email,
      transferredBalances: {
        balance: result.transferBalance,
        pendingDeposit: result.transferPendingDeposit,
        pendingWithdrawal: result.transferPendingWithdrawal,
        reward: result.transferReward,
      },
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    // ✅ Final response
    return res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      user: {
        id: result.updatedUser.id,
        name: result.updatedUser.name,
        email: result.updatedUser.email,
        plan: result.updatedUser.plan,
      },
      planUpdate: {
        previousPlan,
        newPlan: result.updatedUser.plan,
        transferredBalances: {
          balance: result.transferBalance,
          pendingDeposit: result.transferPendingDeposit,
          pendingWithdrawal: result.transferPendingWithdrawal,
          reward: result.transferReward,
        },
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Plan update error:", error);

    await createAuditLog("PLAN_UPDATE_ERROR", req.params?.userId || null, {
      error: error.message,
      requestedPlan: req.body?.planType,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to update plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


// Generate a time-based OTP (6 digits, valid for 10 minutes)
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Create a JWT token containing OTP information
const createStatusChangeToken = (adminId, userId, newStatus, otp) => {
  return jwt.sign(
    {
      adminId,
      userId,
      newStatus,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
};

// Verify the status change token
const verifyStatusChangeToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      valid: true,
      expired: false,
      decoded,
    };
  } catch (error) {
    return {
      valid: false,
      expired: error.message === 'jwt expired',
      decoded: null,
    };
  }
};


export const sendStatusChangeOTP = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Debug logging
    console.log(`Attempting status change for user ${userId} by admin ${adminId}`);

    await createAuditLog("STATUS_CHANGE_OTP_REQUEST", adminId, {
      targetUserId: userId,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    // Verify admin exists and has correct role
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { 
        id: true,
        email: true, 
        name: true,
        role: true
      },
    });

    // if (!admin || admin.role !== 'admin' || admin.role !== 'superadmin') {
    //   console.warn(`Admin ${adminId} does not have sufficient privileges ${admin ? `(${admin.role})` : ""}`);
    //   await createAuditLog("STATUS_CHANGE_OTP_FAILED", adminId, {
    //     reason: admin ? "Insufficient privileges" : "Admin not found",
    //     targetUserId: userId,
    //     timestamp: new Date().toISOString(),
    //     ip: req.ip || req.connection.remoteAddress,
    //   });

    //   return res.status(403).json({
    //     success: false,
    //     message: admin ? "Insufficient privileges" : "Admin not found",
    //   });
    // }

    // Check if target user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, isActive: true, email: true },
    });

    if (!user) {
      await createAuditLog("STATUS_CHANGE_OTP_FAILED", adminId, {
        reason: "User not found",
        targetUserId: userId,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate OTP and token
    const otp = generateOTP();
    const newStatus = !user.isActive;
    const statusChangeToken = createStatusChangeToken(adminId, userId, newStatus, otp);

    // Send OTP email
    await sendMail({
      to: admin.email,
      subject: "OTP for User Status Change",
      template: "statusChangeOTP",
      context: {
        adminName: admin.name,
        userName: user.name,
        userEmail: user.email,
        currentStatus: user.isActive ? "Active" : "Inactive",
        newStatus: newStatus ? "Active" : "Inactive",
        otp,
      },
    });

    await createAuditLog("STATUS_CHANGE_OTP_SENT", adminId, {
      targetUserId: userId,
      currentStatus: user.isActive,
      requestedStatus: newStatus,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to admin email",
      token: statusChangeToken,
      targetUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        currentStatus: user.isActive,
        requestedStatus: newStatus,
      },
    });

  } catch (error) {
    console.error("Status change OTP error:", error);
    
    await createAuditLog("STATUS_CHANGE_OTP_ERROR", req.user?.id || null, {
      error: error.message,
      targetUserId: req.params?.userId,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to send status change OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const verifyStatusChangeOTP = async (req, res) => {
  try {
    const { userId } = req.params;
    const { otp, token } = req.body;
    const adminId = req.user.id;

    await createAuditLog("STATUS_CHANGE_VERIFY_ATTEMPT", adminId, {
      targetUserId: userId,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    if (!otp || !token) {
      await createAuditLog("STATUS_CHANGE_VERIFY_FAILED", adminId, {
        reason: "OTP or token not provided",
        targetUserId: userId,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(400).json({
        success: false,
        message: "OTP and token are required",
      });
    }

    // Verify the token
    const verification = verifyStatusChangeToken(token);

    if (!verification.valid) {
      await createAuditLog("STATUS_CHANGE_VERIFY_FAILED", adminId, {
        reason: verification.expired ? "Token expired" : "Invalid token",
        targetUserId: userId,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(400).json({
        success: false,
        message: verification.expired ? "OTP expired" : "Invalid token",
      });
    }

    const { decoded } = verification;

    // Verify the OTP matches
    if (decoded.otp !== otp) {
      await createAuditLog("STATUS_CHANGE_VERIFY_FAILED", adminId, {
        reason: "Invalid OTP",
        targetUserId: userId,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Verify the admin and user IDs match
    if (decoded.adminId !== adminId || decoded.userId !== userId) {
      await createAuditLog("STATUS_CHANGE_VERIFY_FAILED", adminId, {
        reason: "Token mismatch with request",
        targetUserId: userId,
        tokenUserId: decoded.userId,
        tokenAdminId: decoded.adminId,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(400).json({
        success: false,
        message: "Token does not match the request",
      });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!user) {
      await createAuditLog("STATUS_CHANGE_VERIFY_FAILED", adminId, {
        reason: "User not found",
        targetUserId: userId,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: decoded.newStatus },
      select: { id: true, name: true, email: true, isActive: true },
    });

    // Send notification to user about status change
    try {
      await sendMail({
        to: user.email,
        subject: `Account ${decoded.newStatus ? "Activated" : "Deactivated"}`,
        template: "statusChangeNotification",
        context: {
          userName: user.name,
          newStatus: decoded.newStatus ? "activated" : "deactivated",
          adminName: req.user.name,
          contactEmail: process.env.SUPPORT_EMAIL || "support@example.com",
        },
      });
    } catch (emailError) {
      console.error("Failed to send status change email:", emailError);
    }

    await createAuditLog("STATUS_CHANGE_SUCCESS", adminId, {
      targetUserId: userId,
      previousStatus: user.isActive,
      newStatus: decoded.newStatus,
      adminAction: true,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      message: `User status changed to ${decoded.newStatus ? "Active" : "Inactive"}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Status change verify error:", error);

    await createAuditLog("STATUS_CHANGE_VERIFY_ERROR", req.user?.id || null, {
      error: error.message,
      targetUserId: req.params?.userId,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to verify and change status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};