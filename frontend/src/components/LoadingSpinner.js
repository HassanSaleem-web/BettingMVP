import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-gray-600">Loading data...</p>
      <p className="text-sm text-gray-500 mt-2">This might take a few moments</p>
    </div>
  );
};

export default LoadingSpinner; 