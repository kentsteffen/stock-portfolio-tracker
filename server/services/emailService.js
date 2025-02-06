import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { withRetry } from './emailRetryService.js';

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
  const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });

  try {
    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          reject('Failed to create access token');
        }
        resolve(token);
      });
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        accessToken,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN
      }
    });

    return transporter;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await withRetry(async () => {
      const transporter = await createTransporter();
      return await transporter.sendMail({
        from: `Stock Portfolio <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      });
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Email templates
export const emailTemplates = {
  passwordReset: (resetUrl) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You have requested to reset your password. Click the link below to proceed:</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      </div>
    `
  }),

  welcomeEmail: (firstName) => ({
    subject: 'Welcome to Stock Portfolio Tracker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Stock Portfolio Tracker!</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for creating an account. We're excited to help you track your investments.</p>
        <p>To get started, you can:</p>
        <ul>
          <li>Upload your existing portfolio</li>
          <li>Add stocks manually</li>
          <li>Track your gains and losses</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
      </div>
    `
  }),

  verifyEmail: (verificationUrl) => ({
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Thank you for registering! Please click the button below to verify your email address:</p>
        <p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
        </p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `
  })
}; 