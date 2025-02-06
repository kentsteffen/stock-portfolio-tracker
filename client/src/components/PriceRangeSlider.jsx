import React, { useState } from 'react';

const PriceRangeSlider = ({ low, high, current }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Calculate percentage position for current price
  const percentage = ((current - low) / (high - low)) * 100;
  
  // Calculate distances from high and low
  const fromLow = ((current - low) / low * 100).toFixed(1);
  const fromHigh = ((high - current) / high * 100).toFixed(1);
  
  // Calculate which third of the range we're in
  const getMarkerColor = (percent) => {
    if (percent <= 33.33) {
      return 'bg-red-500'; // Bottom third - red
    } else if (percent <= 66.66) {
      return 'bg-yellow-500'; // Middle third - yellow
    } else {
      return 'bg-green-500'; // Top third - green
    }
  };

  // Get the appropriate color class
  const markerColorClass = getMarkerColor(percentage);
  
  return (
    <div className="flex items-center gap-2 w-full relative">
      <span className="text-xs text-gray-600">${low.toFixed(2)}</span>
      <div 
        className="relative flex-1 h-1 bg-gray-200 rounded"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Range bar */}
        <div 
          className="absolute h-full bg-blue-500 rounded"
          style={{ 
            left: '0%',
            width: '100%',
            opacity: 0.2
          }}
        />
        {/* Current price marker */}
        <div 
          className={`absolute w-2 h-3 -mt-1 transform -translate-x-1/2 transition-colors duration-300 ${markerColorClass}`}
          style={{ 
            left: `${Math.min(Math.max(percentage, 0), 100)}%`
          }}
        />
        
        {/* Tooltip */}
        {showTooltip && (
          <div 
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-10"
            style={{ 
              left: `${Math.min(Math.max(percentage, 0), 100)}%`
            }}
          >
            <div className="flex flex-col gap-1">
              <div>Current: ${current.toFixed(2)}</div>
              <div className="flex justify-between gap-4">
                <span className="text-red-400">+{fromLow}% from low</span>
                <span className="text-green-400">-{fromHigh}% from high</span>
              </div>
              <div className="text-gray-400 text-center">
                {percentage.toFixed(1)}% of range
              </div>
            </div>
            {/* Tooltip arrow */}
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"
            />
          </div>
        )}
      </div>
      <span className="text-xs text-gray-600">${high.toFixed(2)}</span>
    </div>
  );
};

export default PriceRangeSlider; 