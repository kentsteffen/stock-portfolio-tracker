import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PriceRangeSlider from './PriceRangeSlider';

// Simple refresh icon component
const RefreshIcon = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

const formatNumber = (number, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [newStock, setNewStock] = useState('');
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [sortField, setSortField] = useState('symbol');
  const [sortDirection, setSortDirection] = useState('asc');
  const [stockCheck, setStockCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

  const fetchPortfolio = async (showLoadingState = false) => {
    if (showLoadingState) {
      setIsRefreshing(true);
    }
    
    try {
      const response = await axios.get('http://localhost:5001/api/portfolio', {
        withCredentials: true
      });
      setPortfolio(response.data);
      setLastRefreshTime(new Date());
      setError('');
    } catch (err) {
      setError('Failed to fetch portfolio');
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolio();
      const interval = setInterval(fetchPortfolio, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const checkStock = async (e) => {
    e.preventDefault();
    if (!newStock) return;

    try {
      const response = await axios.get(`http://localhost:5001/api/stock/check/${newStock.toUpperCase()}`, {
        withCredentials: true
      });
      setStockCheck(response.data);
      setError('');
    } catch (err) {
      setError('Invalid stock symbol or unable to fetch data');
      setStockCheck(null);
    }
  };

  const removeStock = async (symbol) => {
    try {
      await axios.delete(`http://localhost:5001/api/portfolio/${symbol}`, {
        withCredentials: true
      });
      fetchPortfolio();
    } catch (err) {
      setError('Failed to remove stock');
    }
  };

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setError('');
    setFileError('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setFileError('Please select a file');
      return;
    }

    if (!selectedFile.name.endsWith('.csv')) {
      setFileError('Please upload a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('portfolio', selectedFile);

    try {
      await axios.post('http://localhost:5001/api/portfolio/upload', formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setFileError('');
      setSelectedFile(null);
      fetchPortfolio();
    } catch (err) {
      setFileError('Failed to upload portfolio file');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="px-6 py-4 bg-gray-50 text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
      style={{ textAlign: field === 'symbol' ? 'left' : 'right' }}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end gap-2">
        <span>{children}</span>
        <span className="text-gray-400">
          {sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </div>
    </th>
  );

  const calculateRangePercentage = (stock) => {
    const { low, high } = stock.fiftyTwoWeekRange;
    const current = stock.lastPrice;
    return ((current - low) / (high - low)) * 100;
  };

  const sortedPortfolio = [...portfolio].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'fiftyTwoWeekRange') {
      aValue = calculateRangePercentage(a);
      bValue = calculateRangePercentage(b);
    } else if (typeof aValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    } else if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const formatRefreshTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleRefresh = () => {
    fetchPortfolio(true);
  };

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
                    onChange={handleFileSelect}
                    onClick={(e) => e.target.value = null}
                  />
                </label>
                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Upload
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Portfolio</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  Last updated: {formatRefreshTime(lastRefreshTime)}
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded
                    ${isRefreshing 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                    } transition-colors duration-200`}
                >
                  <RefreshIcon 
                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4">Loading portfolio...</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="divide-x divide-gray-200">
                      <SortableHeader field="symbol">Symbol</SortableHeader>
                      <SortableHeader field="lastPrice">Last Price</SortableHeader>
                      <SortableHeader field="currentValue">Current Value</SortableHeader>
                      <SortableHeader field="fiftyTwoWeekRange">
                        52-Week Range
                        {sortField === 'fiftyTwoWeekRange' && (
                          <span className="text-xs text-gray-500 ml-1">
                            (% to high)
                          </span>
                        )}
                      </SortableHeader>
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
                    {sortedPortfolio.map((stock, index) => (
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
                          <PriceRangeSlider 
                            low={stock.fiftyTwoWeekRange.low}
                            high={stock.fiftyTwoWeekRange.high}
                            current={stock.lastPrice}
                          />
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 