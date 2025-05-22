import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendMail } from '../utils/emailService.js';

const prisma = new PrismaClient();

// In-memory store for OTPs (or use Redis for production)
const otpStore = new Map();

// Register Admin - Only Super Admin can create Admins
export const registerAdmin = async (req, res) => {
  try {
    const requesterId = req.admin.id;
    const requester = await prisma.admin.findUnique({ where: { id: requesterId } });

    if (!requester || requester.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only super admins can create admins' });
    }

    const { name, email, password, role = 'admin' } = req.body;

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.admin.create({
      data: { name, email, password: hashedPassword, role }
    });

    return res.status(201).json({ success: true, message: 'Admin created successfully', admin: { ...newAdmin, password: undefined } });
  } catch (error) {
    console.error('Register Admin Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create admin', error: error.message });
  }
};

// Login Admin - Sends OTP
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Generate and send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const ttl = 5 * 60 * 1000; // 5 minutes
    const expiresAt = Date.now() + ttl;

    otpStore.set(email, { otp, expiresAt });

    await sendMail({
      to: admin.email,
      subject: 'Admin Login OTP',
      template: 'passwordReset',
      context: {
        name: admin.name,
        otp,
        expirationMinutes: ttl / 60000,
      },
    });

    return res.status(200).json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

// Verify OTP & Generate Token
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const stored = otpStore.get(email);
    if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    otpStore.delete(email);

    const admin = await prisma.admin.findUnique({ where: { email } });
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '12h' }
    );

    return res.status(200).json({ success: true, message: 'OTP verified', token });
  } catch (error) {
    console.error('OTP Verify Error:', error);
    return res.status(500).json({ success: false, message: 'OTP verification failed', error: error.message });
  }
};

// Get Profile
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    return res.status(200).json({ success: true, admin });
  } catch (error) {
    console.error('Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message });
  }
};
