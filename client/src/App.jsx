import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Add this helper function near the top of the file, after imports
const formatNumber = (number, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

function App() {
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState('');
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [sortField, setSortField] = useState('symbol');
  const [sortDirection, setSortDirection] = useState('asc');
  const [stockCheck, setStockCheck] = useState(null);

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API_URL}/portfolio`);
      setStocks(response.data);
    } catch (err) {
      setError('Failed to fetch stocks');
    }
  };

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const checkStock = async (e) => {
    e.preventDefault();
    if (!newStock) return;

    try {
      const response = await axios.get(`${API_URL}/stock/check/${newStock.toUpperCase()}`);
      setStockCheck(response.data);
      setError('');
    } catch (err) {
      setError('Invalid stock symbol or unable to fetch data');
      setStockCheck(null);
    }
  };

  const removeStock = async (symbol) => {
    try {
      await axios.delete(`${API_URL}/portfolio/${symbol}`);
      fetchStocks();
    } catch (err) {
      setError('Failed to remove stock');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setFileError('Please select a file');
      return;
    }
    setSelectedFile(file);

    // Check if it's a CSV file
    if (!file.name.endsWith('.csv')) {
      setFileError('Please upload a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('portfolio', file);

    try {
      await axios.post(`${API_URL}/portfolio/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setFileError('');
      setSelectedFile(null);
      fetchStocks();
    } catch (err) {
      setFileError('Failed to upload portfolio file');
    }
  };

  // Add sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Add function to sort stocks
  const sortedStocks = [...stocks].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle nested objects (like fiftyTwoWeekRange)
    if (sortField === 'fiftyTwoWeekRange') {
      aValue = a[sortField].low;
      bValue = b[sortField].low;
    }

    // Handle numeric values
    if (typeof aValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Handle strings
    if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  // Create a reusable header component
  const SortableHeader = ({ field, children }) => (
    <th
      className="px-6 py-4 bg-gray-50 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
      style={{ textAlign: field === 'symbol' ? 'left' : 'right' }}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end gap-2">
        <span>{children}</span>
        <span className="text-gray-400">
          {sortField === field ? (
            sortDirection === 'asc' ? '↑' : '↓'
          ) : '↕'}
        </span>
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto w-full">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Stock Portfolio Tracker</h1>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {fileError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {fileError}
              </div>
            )}

            {stockCheck && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                <div className="font-medium">{stockCheck.companyName} ({stockCheck.symbol})</div>
                <div className="flex gap-4 mt-1">
                  <span>Price: ${formatNumber(stockCheck.price)}</span>
                  <span className={stockCheck.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    Change: ${formatNumber(stockCheck.change)} ({formatNumber(stockCheck.changePercent)}%)
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-8">
              <form onSubmit={checkStock} className="flex-1 mr-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    placeholder="Enter stock symbol"
                    className="flex-1 px-4 py-2 border rounded"
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Check Stock
                  </button>
                </div>
              </form>

              <div className="flex items-center gap-4">
                <label className="relative cursor-pointer bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                  <span>{selectedFile ? selectedFile.name : 'Choose Portfolio File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                    onClick={(e) => e.target.value = null}
                  />
                </label>
                {selectedFile && (
                  <span className="text-sm text-gray-600">
                    Selected: {selectedFile.name}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="divide-x divide-gray-200">
                    <SortableHeader field="symbol">Symbol</SortableHeader>
                    <SortableHeader field="lastPrice">Last Price</SortableHeader>
                    <SortableHeader field="currentValue">Current Value</SortableHeader>
                    <SortableHeader field="fiftyTwoWeekRange">52-Week Range</SortableHeader>
                    <SortableHeader field="lastPriceChange">Last Price Change</SortableHeader>
                    <SortableHeader field="todaysGainLossValue">Today's G/L ($)</SortableHeader>
                    <SortableHeader field="todaysGainLossPercent">Today's G/L (%)</SortableHeader>
                    <SortableHeader field="totalGainLoss">Total G/L ($)</SortableHeader>
                    <SortableHeader field="totalGainLossPercent">Total G/L (%)</SortableHeader>
                    <SortableHeader field="percentOfAccount">% of Account</SortableHeader>
                    <SortableHeader field="quantity">Quantity</SortableHeader>
                    <SortableHeader field="costBasisPerShare">Cost/Share</SortableHeader>
                    <SortableHeader field="costBasisTotal">Cost Basis Total</SortableHeader>
                    <SortableHeader field="purchaseDate">Purchase Date</SortableHeader>
                    <SortableHeader field="daysHeld">Days Held</SortableHeader>
                    <SortableHeader field="capitalGainsTreatment">Capital Gains</SortableHeader>
                    <th className="px-6 py-4 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedStocks.map((stock, index) => {
                    console.log(`${stock.symbol} totalGainLoss:`, stock.totalGainLoss);
                    return (
                      <tr 
                        key={stock.symbol}
                        className={`divide-x divide-gray-200 hover:bg-gray-50 transition-colors duration-150
                          ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {stock.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${formatNumber(stock.lastPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${formatNumber(stock.currentValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${formatNumber(stock.fiftyTwoWeekRange.low)} - ${formatNumber(stock.fiftyTwoWeekRange.high)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium
                          ${stock.lastPriceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${formatNumber(stock.lastPriceChange)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium
                          ${stock.todaysGainLossValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${formatNumber(stock.todaysGainLossValue)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium
                          ${stock.todaysGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatNumber(stock.todaysGainLossPercent)}%
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium
                          ${stock.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${formatNumber(stock.totalGainLoss)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium
                          ${stock.totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatNumber(stock.totalGainLossPercent)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatNumber(stock.percentOfAccount)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {formatNumber(stock.quantity, 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          ${formatNumber(stock.costBasisPerShare)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          ${formatNumber(stock.costBasisTotal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {stock.purchaseDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {formatNumber(stock.daysHeld, 0)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium
                          ${stock.capitalGainsTreatment === 'Long-term' ? 'text-green-600' : 'text-blue-600'}`}>
                          {stock.capitalGainsTreatment}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => removeStock(stock.symbol)}
                            className="text-red-600 hover:text-red-900 font-medium transition-colors duration-200"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 