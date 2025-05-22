import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMail } from '../utils/emailService.js';
const prisma = new PrismaClient();

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || crypto.randomBytes(16).toString('hex');
const ALGORITHM = 'aes-256-cbc';

// Encryption functions
const encryptData = (text) => {
  const iv = Buffer.from(ENCRYPTION_IV, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptData = (encryptedText) => {
  try {
    const iv = Buffer.from(ENCRYPTION_IV, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Registration Controller
export const register = async (req, res) => {
  try {
    const { name, email, password, accountNumber, ifceCode, panNumber, adharnumber, phoneNumber,dob } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber }, { accountNumber }] }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email, phone number, or account number'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const encryptedAccountNumber = encryptData(accountNumber);
    const encryptedIfceCode = encryptData(ifceCode);
    const encryptedPanNumber = encryptData(panNumber);
    const encryptedAdharnumber = encryptData(adharnumber);
    const customerId = `CUS${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;

    const newUser = await prisma.user.create({
      data: {
        name,
        dob,
        email,
        password: hashedPassword,
        customerId,
        accountNumber: encryptedAccountNumber,
        ifceCode: encryptedIfceCode,
        panNumber: encryptedPanNumber,
        adharnumber: encryptedAdharnumber,
        phoneNumber,
      }
    });
    const balance = prisma.balance.create({
        data:{
            userId:newUser.id
        }
    })

    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email and phone.',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Login Controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact support.'
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, customerId: user.customerId },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '24h' }
    );

    if (user.firstLogin) {
      await prisma.user.update({
        where: { id: user.id },
        data: { firstLogin: false }
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword,
      firstLogin: user.firstLogin
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Profile Controller
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { balances: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const decryptedUser = {
      ...user,
      accountNumber: decryptData(user.accountNumber),
      ifceCode: decryptData(user.ifceCode),
      panNumber: decryptData(user.panNumber),
      adharnumber: decryptData(user.adharnumber),
      password: undefined
    };

    return res.status(200).json({ success: true, user: decryptedUser });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

// Verification Controllers
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = token;

    await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};
