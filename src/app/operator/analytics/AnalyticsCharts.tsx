"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface Props {
  occupancyRate: number;
  totalOcc: number;
  totalCapacity: number;
  homesCount: number;
  funnelStatuses: string[];
  funnelCounts: number[];
  range: string;
}

export default function AnalyticsCharts({
  occupancyRate,
  totalOcc,
  totalCapacity,
  homesCount,
  funnelStatuses,
  funnelCounts,
  range,
}: Props) {
  const donutData = {
    labels: ["Occupied", "Vacant"],
    datasets: [
      {
        data: [totalOcc, Math.max(totalCapacity - totalOcc, 0)],
        backgroundColor: ["#26c777", "#e2e8f0"],
        borderWidth: 0,
      },
    ],
  };

  const funnelData = {
    labels: funnelStatuses,
    datasets: [{
      label: 'Inquiries',
      data: funnelCounts,
      backgroundColor: '#0099e6',
    }],
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="card">
        <div className="text-sm text-neutral-500">Occupancy</div>
        <div className="mt-2 flex items-center gap-4">
          <div className="donut-chart-container">
            <Doughnut data={donutData} options={{ cutout: '70%', plugins: { legend: { display: false } } }} />
            <div className="donut-chart-label">
              <div className="donut-chart-value">{occupancyRate}%</div>
              <div className="donut-chart-title">Occupied</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Homes</div>
            <div className="text-xl font-semibold">{homesCount}</div>
            <div className="text-xs text-neutral-500 mt-1">Capacity</div>
            <div className="text-xl font-semibold">{totalCapacity}</div>
          </div>
        </div>
      </div>
      <div className="card sm:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Inquiry Funnel</div>
          <div className="text-xs text-neutral-500">Range: {range}</div>
        </div>
        <div className="chart-container">
          <Bar
            data={funnelData}
            options={{
              plugins: { legend: { display: false } },
              scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
            }}
          />
        </div>
      </div>
    </div>
  );
}
