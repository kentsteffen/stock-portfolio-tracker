import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware - checking token');
    const token = req.cookies.token;
    
    if (!token) {
      console.log('No token found');
      return res.status(401).json({ error: 'Please authenticate' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded:', decoded);
      
      // Find user by id
      const user = await User.findById(decoded.id);
      console.log('User found:', user ? 'yes' : 'no');
      
      if (!user) {
        console.log('User not found in database');
        return res.status(401).json({ error: 'User not found' });
      }

      // Store user info directly on the request object
      req.userId = user._id;
      req.userEmail = user.email;
      req.user = user;
      
      console.log('Auth middleware - success, user attached to request:', {
        userId: req.userId,
        userEmail: req.userEmail
      });
      
      next();
    } catch (e) {
      console.error('Token verification failed:', e);
      return res.status(401).json({ error: 'Please authenticate' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

export { auth }; 