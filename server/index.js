import express from 'express';
import cors from 'cors';
import yahooFinance from 'yahoo-finance2';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Store stocks in memory (you might want to use a database in production)
let portfolio = [];

// Modify the portfolioDetails structure to include purchase date
let portfolioDetails = {};  // Will store quantity, cost basis, and purchase date for each symbol

// Get all stocks in portfolio
app.get('/api/portfolio', async (req, res) => {
  try {
    const stocksWithPrices = await Promise.all(
      portfolio.map(async (symbol) => {
        const quote = await yahooFinance.quote(symbol);
        const details = portfolioDetails[symbol] || { quantity: 0, costBasis: 0, purchaseDate: new Date() };
        const currentPrice = quote.regularMarketPrice;
        const totalValue = currentPrice * details.quantity;
        const costBasisTotal = details.costBasis * details.quantity;
        const totalGainLoss = totalValue - costBasisTotal;
        
        // Calculate holding period
        const holdingPeriod = new Date() - details.purchaseDate;
        const isLongTerm = holdingPeriod >= 365 * 24 * 60 * 60 * 1000; // 365 days in milliseconds

        return {
          symbol,
          lastPrice: currentPrice,
          currentValue: totalValue,
          fiftyTwoWeekRange: {
            low: quote.fiftyTwoWeekLow,
            high: quote.fiftyTwoWeekHigh
          },
          lastPriceChange: quote.regularMarketChange,
          todaysGainLossValue: quote.regularMarketChange * details.quantity,
          todaysGainLossPercent: quote.regularMarketChangePercent,
          totalGainLoss,
          totalGainLossPercent: (totalGainLoss / costBasisTotal) * 100,
          percentOfAccount: 0,
          quantity: details.quantity,
          costBasisPerShare: details.costBasis,
          costBasisTotal,
          purchaseDate: details.purchaseDate.toISOString().split('T')[0],
          capitalGainsTreatment: isLongTerm ? 'Long-term' : 'Short-term',
          daysHeld: Math.floor(holdingPeriod / (24 * 60 * 60 * 1000))
        };
      })
    );

    // Calculate total portfolio value and update percentOfAccount
    const totalPortfolioValue = stocksWithPrices.reduce((sum, stock) => sum + stock.currentValue, 0);
    const stocksWithPercentages = stocksWithPrices.map(stock => ({
      ...stock,
      percentOfAccount: (stock.currentValue / totalPortfolioValue) * 100
    }));

    res.json(stocksWithPercentages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add stock to portfolio
app.post('/api/portfolio', async (req, res) => {
  const { symbol } = req.body;
  try {
    // Verify the stock exists
    await yahooFinance.quote(symbol);
    if (!portfolio.includes(symbol)) {
      portfolio.push(symbol);
    }
    res.json({ message: 'Stock added successfully', symbol });
  } catch (error) {
    res.status(400).json({ error: 'Invalid stock symbol' });
  }
});

// Remove stock from portfolio
app.delete('/api/portfolio/:symbol', (req, res) => {
  const { symbol } = req.params;
  portfolio = portfolio.filter(stock => stock !== symbol);
  res.json({ message: 'Stock removed successfully', symbol });
});

// Update the file upload endpoint to handle formatted numbers
app.post('/api/portfolio/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.portfolio) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.portfolio;
    const content = file.data.toString();
    const lines = content.split('\n');
    
    // Clear existing portfolio
    portfolio = [];
    portfolioDetails = {};

    // Skip header row and process each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const [symbol, quantity, rawCostBasis, purchaseDate] = line.split(',').map(item => item.trim());
        
        // Clean the cost basis - remove $ and any commas
        const costBasis = rawCostBasis ? rawCostBasis.replace(/[$,]/g, '') : null;
        
        if (symbol && quantity && costBasis && purchaseDate) {
          portfolio.push(symbol);
          portfolioDetails[symbol] = {
            quantity: parseInt(quantity.replace(/,/g, '')), // Also handle commas in quantities
            costBasis: parseFloat(costBasis),
            purchaseDate: new Date(purchaseDate)
          };
        }
      }
    }

    res.json({ message: 'Portfolio uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint to check stock price
app.get('/api/stock/check/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await yahooFinance.quote(symbol);
    
    res.json({
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      companyName: quote.longName || quote.shortName
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid stock symbol or unable to fetch data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 