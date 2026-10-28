"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface OccupancyTrendChartProps {
  data: Array<{
    month: string;
    occupancyRate: number;
  }>;
}

export function OccupancyTrendChart({ data }: OccupancyTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Occupancy Trend</h3>
        <div className="h-64 flex items-center justify-center text-neutral-500">
          <p>No occupancy data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Occupancy Trend</h3>
        <p className="text-sm text-neutral-600">Last 6 months occupancy rate</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickLine={false}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickLine={false}
            label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: any) => [`${value}%`, 'Occupancy']}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            type="monotone"
            dataKey="occupancyRate"
            stroke="#0099e6"
            strokeWidth={2}
            dot={{ fill: '#0099e6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Occupancy Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
