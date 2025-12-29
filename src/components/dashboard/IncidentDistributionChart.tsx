"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface IncidentDistributionChartProps {
  data: Array<{
    severity: string;
    count: number;
  }>;
}

const COLORS = {
  Low: '#80D8C3',
  Medium: '#60B5FF',
  High: '#FF9149',
  Critical: '#FF6363',
};

export function IncidentDistributionChart({ data }: IncidentDistributionChartProps) {
  if (!data || data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Incident Distribution</h3>
        <div className="h-64 flex items-center justify-center text-neutral-500">
          <p>No incident data available</p>
        </div>
      </div>
    );
  }

  const filteredData = data.filter(d => d.count > 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Incident Distribution</h3>
        <p className="text-sm text-neutral-600">Incidents by severity level</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent && percent * 100).toFixed(0) || 0}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            nameKey="severity"
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.severity as keyof typeof COLORS] || '#60B5FF'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          />
          <Legend
            verticalAlign="top"
            wrapperStyle={{ fontSize: '11px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
