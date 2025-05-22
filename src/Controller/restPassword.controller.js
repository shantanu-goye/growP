// auth.controller.js
import redis from '../utils/redisClient.js';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { sendMail } from '../utils/emailService.js';

const prisma = new PrismaClient();

/**
 * Step 1: Validate email and DOB, then send OTP
 * Requires email and date of birth for verification before sending OTP
 */
export const sendPasswordResetOTP = async (req, res) => {
  const { email, dob } = req.body;
  
  try {
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Verify user exists and DOB matches
    if (!user || new Date(user.dob).toISOString().split('T')[0] !== new Date(dob).toISOString().split('T')[0]) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const ttl = 600; // 10 minutes
    
    // Store OTP in Redis with expiration
    await redis.set(`otp:${user.id}`, otp, 'EX', ttl);
    
    // Send OTP via email
    await sendMail({
      to: user.email,
      subject: 'Password Reset OTP',
      template: 'passwordReset',
      context: { 
        name: user.name, 
        otp, 
        expirationMinutes: ttl / 60 
      },
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'OTP sent to your email', 
      userId: user.id 
    });
  } catch (error) {
    console.error('Error in sendPasswordResetOTP:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process password reset request' 
    });
  }
};

/**
 * Step 2: Verify OTP and set new password
 * Requires userId, OTP, and new password
 */
export const verifyOTPAndResetPassword = async (req, res) => {
  const { userId, otp, newPassword } = req.body;
  
  try {
    // Get stored OTP from Redis
    const storedOTP = await redis.get(`otp:${userId}`);
    
    // Check if OTP exists and is valid
    if (!storedOTP) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP expired or not found' 
      });
    }
    
    if (storedOTP !== otp) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    await prisma.user.update({ 
      where: { id: userId }, 
      data: { password: hashedPassword } 
    });
    
    // Delete the used OTP
    await redis.del(`otp:${userId}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Password reset successful' 
    });
  } catch (error) {
    console.error('Error in verifyOTPAndResetPassword:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password' 
    });
  }
};

// Routes setup example (for reference)
/*
// auth.routes.js
import express from 'express';
import { sendPasswordResetOTP, verifyOTPAndResetPassword } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/password-reset/request', sendPasswordResetOTP);
router.post('/password-reset/verify', verifyOTPAndResetPassword);

export default router;