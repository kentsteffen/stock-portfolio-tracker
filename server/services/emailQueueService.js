import mongoose from 'mongoose';
import { setTimeout } from 'timers/promises';
import { sendEmail } from './emailService.js';

// Email Queue Schema
const emailQueueSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  html: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: Date,
  error: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'failed', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const EmailQueue = mongoose.model('EmailQueue', emailQueueSchema);

// Queue processor
const processEmailQueue = async () => {
  try {
    // Find pending emails that haven't been attempted in the last 5 minutes
    const emails = await EmailQueue.find({
      status: { $in: ['pending', 'failed'] },
      attempts: { $lt: 5 },
      $or: [
        { lastAttempt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } },
        { lastAttempt: null }
      ]
    }).limit(5);

    for (const email of emails) {
      try {
        email.status = 'processing';
        email.lastAttempt = new Date();
        email.attempts += 1;
        await email.save();

        await sendEmail({
          to: email.to,
          subject: email.subject,
          html: email.html
        });

        email.status = 'completed';
        await email.save();
      } catch (error) {
        email.status = 'failed';
        email.error = error.message;
        await email.save();
      }
    }
  } catch (error) {
    console.error('Error processing email queue:', error);
  }
};

// Start queue processor
const startQueueProcessor = () => {
  setInterval(processEmailQueue, 30000); // Run every 30 seconds
};

// Add email to queue
export const queueEmail = async (emailData) => {
  try {
    const queuedEmail = new EmailQueue(emailData);
    await queuedEmail.save();
    return queuedEmail;
  } catch (error) {
    console.error('Error queuing email:', error);
    throw error;
  }
};

export { startQueueProcessor }; 