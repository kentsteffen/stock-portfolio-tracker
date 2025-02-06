import express from 'express';
import { EmailQueue } from '../services/emailQueueService.js';

const router = express.Router();

// Admin middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get email queue stats
router.get('/email-queue/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await EmailQueue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgAttempts: { $avg: '$attempts' }
        }
      }
    ]);

    const last24Hours = await EmailQueue.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      stats,
      last24Hours,
      totalEmails: await EmailQueue.countDocuments()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get email queue entries with pagination and filtering
router.get('/email-queue', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { to: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const emails = await EmailQueue.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await EmailQueue.countDocuments(query);

    res.json({
      emails,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Retry failed emails
router.post('/email-queue/retry', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    await EmailQueue.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { status: 'pending' },
        $unset: { error: 1 }
      }
    );
    res.json({ message: 'Emails queued for retry' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retry emails' });
  }
});

export default router; 