import React from 'react';

const ScoreRing = ({ score }) => {
  // Calculate the circle's circumference and offset
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-32 h-32">
        {/* Background circle */}
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          {/* Score circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="#3b82f6"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 1s ease-in-out',
            }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-gray-800">{score}</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-600">Overall Score</p>
    </div>
  );
};

export default ScoreRing;