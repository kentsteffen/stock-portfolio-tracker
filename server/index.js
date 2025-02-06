import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import yahooFinance from 'yahoo-finance2';
import authRoutes from './routes/auth.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { validateEnv } from './config/validateEnv.js';
import { startQueueProcessor } from './services/emailQueueService.js';
import cookieParser from 'cookie-parser';
import portfolioRoutes from './routes/portfolio.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';
import User from './models/User.js';
import { auth } from './middleware/auth.js';

dotenv.config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

const app = express();
const PORT = process.env.PORT || 5001;

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log('\n=== New Request ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Content-Type:', req.headers['content-type']);
  
  // Capture the original response.json
  const originalJson = res.json;
  res.json = function(body) {
    console.log('Response body:', body);
    return originalJson.call(this, body);
  };
  
  next();
});

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
}));

// Cookie parser
app.use(cookieParser());

// Conditional body parsing middleware
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  // Skip body parsing for multipart requests
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  
  // For JSON requests
  if (contentType.includes('application/json')) {
    express.json()(req, res, next);
    return;
  }
  
  // For URL-encoded requests
  if (contentType.includes('application/x-www-form-urlencoded')) {
    express.urlencoded({ extended: true })(req, res, next);
    return;
  }
  
  next();
});

// File upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Add connection event handlers
mongoose.connection.on('disconnected', () => {
  console.log('Lost MongoDB connection. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://query2.finance.yahoo.com"]
    }
  }
}));

// Set cookie options
app.use((req, res, next) => {
  res.cookie('token', req.cookies.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  next();
});

// Test route to verify Express is working
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Auth routes
app.use('/api/auth', (req, res, next) => {
  console.log('Auth route hit:', req.path);
  next();
}, authRoutes);

// Store stocks in memory (you might want to use a database in production)
let portfolio = [];

// Modify the portfolioDetails structure to include purchase date
let portfolioDetails = {};  // Will store quantity, cost basis, and purchase date for each symbol

// Helper function to calculate days between dates
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  return Math.round(Math.abs((date1 - date2) / oneDay));
};

// Helper function to get stock data from Yahoo Finance
const getStockData = async (symbol) => {
  try {
    const quote = await yahooFinance.quote(symbol);
    return {
      lastPrice: quote.regularMarketPrice,
      lastPriceChange: quote.regularMarketChange,
      fiftyTwoWeekRange: {
        low: quote.fiftyTwoWeekLow,
        high: quote.fiftyTwoWeekHigh
      }
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
};

// Get portfolio route with calculated fields
app.get('/api/portfolio', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current stock data for all symbols
    const enrichedPortfolio = await Promise.all(user.portfolio.map(async (item) => {
      try {
        const stockData = await getStockData(item.symbol);
        if (!stockData) {
          throw new Error(`Failed to fetch data for ${item.symbol}`);
        }

        const currentValue = item.quantity * stockData.lastPrice;
        const costBasisPerShare = item.costBasis;
        const costBasisTotal = item.quantity * costBasisPerShare;
        const totalGainLoss = currentValue - costBasisTotal;
        const totalGainLossPercent = (totalGainLoss / costBasisTotal) * 100;
        const todaysGainLossValue = item.quantity * stockData.lastPriceChange;
        const todaysGainLossPercent = (stockData.lastPriceChange / stockData.lastPrice) * 100;
        const daysHeld = daysBetween(new Date(), new Date(item.purchaseDate));
        
        return {
          symbol: item.symbol,
          lastPrice: stockData.lastPrice,
          currentValue,
          fiftyTwoWeekRange: stockData.fiftyTwoWeekRange,
          lastPriceChange: stockData.lastPriceChange,
          todaysGainLossValue,
          todaysGainLossPercent,
          totalGainLoss,
          totalGainLossPercent,
          percentOfAccount: 0, // Will calculate after getting all values
          quantity: item.quantity,
          costBasisPerShare,
          costBasisTotal,
          purchaseDate: new Date(item.purchaseDate).toLocaleDateString(),
          daysHeld,
          capitalGainsTreatment: daysHeld >= 365 ? 'Long-term' : 'Short-term'
        };
      } catch (error) {
        console.error(`Error processing ${item.symbol}:`, error);
        return null;
      }
    }));

    // Filter out any failed items and calculate percentOfAccount
    const validPortfolio = enrichedPortfolio.filter(item => item !== null);
    const totalAccountValue = validPortfolio.reduce((sum, item) => sum + item.currentValue, 0);
    
    const finalPortfolio = validPortfolio.map(item => ({
      ...item,
      percentOfAccount: (item.currentValue / totalAccountValue) * 100
    }));

    res.json(finalPortfolio);
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add stock to portfolio
app.post('/api/portfolio', auth, async (req, res) => {
  const { symbol } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify the stock exists
    await yahooFinance.quote(symbol);
    if (!user.portfolio.some(stock => stock.symbol === symbol)) {
      user.portfolio.push({ symbol, quantity: 0, costBasis: 0, purchaseDate: new Date() });
    }
    res.json({ message: 'Stock added successfully', symbol });
  } catch (error) {
    res.status(400).json({ error: 'Invalid stock symbol' });
  }
});

// Remove stock from portfolio
app.delete('/api/portfolio/:symbol', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const symbol = req.params.symbol.toUpperCase();
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.portfolio = user.portfolio.filter(item => item.symbol !== symbol);
    await user.save();
    
    res.json({ message: 'Stock removed successfully' });
  } catch (error) {
    console.error('Remove stock error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update the file upload endpoint to handle formatted numbers
app.post('/api/portfolio/upload', auth, async (req, res) => {
  try {
    console.log('Processing file upload...');
    console.log('Files in request:', req.files);
    console.log('Auth user:', req.user);
    
    if (!req.files || !req.files.portfolio) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Use _id instead of userId since we have the full user object
    const userId = req.user._id;
    console.log('Looking up user with ID:', userId);

    const user = await User.findById(userId);
    console.log('Found user:', user ? 'yes' : 'no');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const file = req.files.portfolio;
    console.log('Processing file:', file.name);
    
    const content = file.data.toString();
    const lines = content.split('\n');
    
    // Clear existing portfolio
    user.portfolio = [];

    // Skip header row and process each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const [symbol, quantity, rawCostBasis, purchaseDate] = line.split(',').map(item => item.trim());
        const costBasis = rawCostBasis ? rawCostBasis.replace(/[$,]/g, '') : null;
        
        if (symbol && quantity && costBasis && purchaseDate) {
          user.portfolio.push({
            symbol,
            quantity: parseInt(quantity.replace(/,/g, '')),
            costBasis: parseFloat(costBasis),
            purchaseDate: new Date(purchaseDate)
          });
        }
      }
    }

    await user.save();
    console.log('Portfolio updated successfully');
    res.json({ message: 'Portfolio uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint to check stock price
app.get('/api/stock/check/:symbol', auth, async (req, res) => {
  try {
    const quote = await yahooFinance.quote(req.params.symbol.toUpperCase());
    res.json({
      symbol: quote.symbol,
      companyName: quote.longName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid stock symbol or unable to fetch data' });
  }
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Start the email queue processor
startQueueProcessor();

// Mount routes with explicit paths
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', (req, res, next) => {
  console.log('Portfolio route hit:', {
    method: req.method,
    path: req.path,
    contentType: req.headers['content-type']
  });
  next();
}, portfolioRoutes);

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.path);
  res.status(404).json({ error: 'Route not found' });
});

// Debug route to list all registered routes
app.get('/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json(routes);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    error: 'Server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`\n=== Server Initialization ===`);
  console.log(`Server running on port ${PORT}`);
  console.log('Upload directory:', uploadsDir);
  console.log('Routes mounted:');
  console.log('- /api/auth');
  console.log('- /api/portfolio');
  
  // Log all registered routes
  console.log('\nRegistered routes:');
  app._router.stack.forEach(r => {
    if (r.route && r.route.path) {
      console.log(`${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

export { app }; 