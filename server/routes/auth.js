import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Token from '../models/Token.js';
import { sendEmail, emailTemplates } from '../services/emailService.js';
import { auth } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Add verification middleware
const requireVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user.isVerified) {
      return res.status(403).json({ 
        error: 'Email not verified',
        message: 'Please verify your email address before continuing'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Register user
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty(),
  body('lastName').notEmpty()
], async (req, res) => {
  try {
    console.log('processing Register');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;
    
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    user = new User({
      email,
      password,
      firstName,
      lastName,
      verificationToken,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    await user.save();

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    
    try {
      await sendEmail({
        to: user.email,
        ...emailTemplates.verifyEmail(verificationUrl)
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't expose email error to client, but log it
      // Consider implementing a queue system for failed emails
    }

    res.json({ 
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user._id 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { 
        id: user._id.toString(), // Ensure ID is a string
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for:', email, 'User ID:', user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendEmail({
      to: email,
      ...emailTemplates.passwordReset(resetUrl)
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a token refresh endpoint
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify token exists in database
    const tokenDoc = await Token.findOne({ token: refreshToken });
    if (!tokenDoc) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Verify and decode refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Generate new access token
    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, {
      expiresIn: '15m'
    });

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Add logout endpoint to invalidate refresh tokens
router.post('/logout', auth, async (req, res) => {
  try {
    const refreshToken = req.header('Refresh-Token');
    if (refreshToken) {
      await Token.deleteOne({ token: refreshToken });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add email verification endpoint
router.get('/verify-email/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification token',
        message: 'Please request a new verification email'
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // Send welcome email after verification
    try {
      await sendEmail({
        to: user.email,
        ...emailTemplates.welcomeEmail(user.firstName)
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add resend verification email endpoint
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    
    await sendEmail({
      to: user.email,
      ...emailTemplates.verifyEmail(verificationUrl)
    });

    res.json({ message: 'Verification email resent' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      isAuthenticated: true
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a route to check token validity
router.get('/verify-token', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'No token found' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ valid: true, userId: user._id });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export { router as default }; 