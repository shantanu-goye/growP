import redis from "../db/db.js"
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { sendMail } from "../utils/emailService.js";

const prisma = new PrismaClient();

export const sendPasswordResetOTP = async (req, res) => {
  const { email, dob } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || new Date(user.dob).toISOString().split("T")[0] !== new Date(dob).toISOString().split("T")[0]) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const ttl = 600; // 10 minutes

    await redis.set(`otp:${user.id}`, otp, "EX", ttl);

    await sendMail({
      to: user.email,
      subject: "Password Reset OTP",
      html: `<p>Hi ${user.name},</p><p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      userId: user.id,
    });
  } catch (error) {
    console.error("Error in sendPasswordResetOTP:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const verifyPasswordResetOTP = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const storedOTP = await redis.get(`otp:${userId}`);

    if (!storedOTP) {
      return res.status(400).json({ 
        success: false, 
        message: "OTP expired or not found" 
      });
    }

    if (storedOTP !== otp) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid OTP" 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "OTP verified successfully" 
    });
  } catch (error) {
    console.error("Error in verifyPasswordResetOTP:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const resetPasswordWithOTP = async (req, res) => {
  const { userId, otp, newPassword } = req.body;

  try {
    const storedOTP = await redis.get(`otp:${userId}`);

    if (!storedOTP || storedOTP !== otp) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid or expired OTP" 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await redis.del(`otp:${userId}`);

    return res.status(200).json({ 
      success: true, 
      message: "Password reset successful" 
    });
  } catch (error) {
    console.error("Error in resetPasswordWithOTP:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};