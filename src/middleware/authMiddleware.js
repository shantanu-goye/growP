import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    await createAuditLog("AUTH_TOKEN_MISSING", null, {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      path: req.path,
    });
    return res
      .status(401)
      .json({ success: false, message: "Authentication token required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        customerId: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      await createAuditLog("AUTH_TOKEN_INVALID", decoded.id, {
        reason: "User not found for token",
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        path: req.path,
      });
      return res
        .status(403)
        .json({
          success: false,
          message: "Invalid token or user no longer exists.",
        });
    }

    if (!user.isEmailVerified) {
      await createAuditLog("AUTH_TOKEN_INVALID", user.id, {
        reason: "Email not verified",
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        path: req.path,
      });
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Email not verified. Please verify your email to access this resource.",
        });
    }

    req.user = user;
    await createAuditLog("AUTH_TOKEN_SUCCESS", user.id, {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      path: req.path,
    });
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    await createAuditLog("AUTH_TOKEN_INVALID", null, {
      reason: error.message,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      path: req.path,
    });
    return res
      .status(403)
      .json({ success: false, message: "Invalid or expired token." });
  }
};
