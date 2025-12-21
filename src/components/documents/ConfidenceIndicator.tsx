'use client';

import React from 'react';

interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'bar' | 'gauge' | 'badge';
}

export default function ConfidenceIndicator({
  confidence,
  showLabel = true,
  size = 'md',
  variant = 'bar',
}: ConfidenceIndicatorProps) {
  const getColor = () => {
    if (confidence >= 85) return { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-500' };
    if (confidence >= 70) return { bg: 'bg-yellow-500', text: 'text-yellow-700', border: 'border-yellow-500' };
    return { bg: 'bg-red-500', text: 'text-red-700', border: 'border-red-500' };
  };

  const getLabel = () => {
    if (confidence >= 85) return 'High Confidence';
    if (confidence >= 70) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const colors = getColor();
  const sizeClasses = {
    sm: { height: 'h-1.5', text: 'text-xs', width: 'w-20' },
    md: { height: 'h-2', text: 'text-sm', width: 'w-32' },
    lg: { height: 'h-3', text: 'text-base', width: 'w-48' },
  };

  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${sizeClasses[size].text} font-medium border ${colors.border} ${colors.text} bg-opacity-10`}
      >
        <span className={`w-2 h-2 rounded-full ${colors.bg}`}></span>
        {confidence.toFixed(1)}%
      </span>
    );
  }

  if (variant === 'gauge') {
    // Circular gauge
    const radius = size === 'sm' ? 20 : size === 'md' ? 30 : 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (confidence / 100) * circumference;
    const svgSize = radius * 2 + 10;

    return (
      <div className="inline-flex flex-col items-center gap-1">
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={colors.text.replace('text-', 'text-')}
            strokeLinecap="round"
          />
          <text
            x={svgSize / 2}
            y={svgSize / 2}
            textAnchor="middle"
            dy="0.3em"
            className={`${sizeClasses[size].text} font-bold transform rotate-90`}
            fill="currentColor"
          >
            {confidence.toFixed(0)}%
          </text>
        </svg>
        {showLabel && (
          <span className={`${sizeClasses[size].text} ${colors.text} font-medium`}>
            {getLabel()}
          </span>
        )}
      </div>
    );
  }

  // Default: bar variant
  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={`${sizeClasses[size].text} font-medium ${colors.text}`}>
            {getLabel()}
          </span>
          <span className={`${sizeClasses[size].text} font-bold ${colors.text}`}>
            {confidence.toFixed(1)}%
          </span>
        </div>
      )}
      <div className={`${sizeClasses[size].width} ${sizeClasses[size].height} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${sizeClasses[size].height} ${colors.bg} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${confidence}%` }}
        ></div>
      </div>
    </div>
  );
}
