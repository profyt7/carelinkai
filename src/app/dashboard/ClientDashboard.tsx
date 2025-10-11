"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSession } from "next-auth/react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { FiChevronRight, FiCreditCard, FiMoreHorizontal } from "react-icons/fi";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const mockData = {
  bookings: {
    total: "$5,281.52",
    unpaid: "$1,525.50",
    upcoming: "$3,756.02",
    lastDays: 30,
    completed: {
      total: "$2,062.52",
      value: "$1,629.70",
    },
    pending: {
      total: "$1,692.22",
      lastDays: 30,
    },
  },
  expenses: {
    total: "$80,000",
    lastMonth: "Last month",
    breakdown: [
      { label: "Meals & supplies", value: "$58,126", color: "#26c777" },
      { label: "Rent & mortgage", value: "$16,235", color: "#0099e6" },
      { label: "Administration", value: "$5,239", color: "#e6b400" },
      { label: "Travel expenses", value: "$1,239", color: "#e92c2c" },
    ],
  },
  bankAccounts: {
    primary: {
      name: "ANZ",
      balance: "$12,435.65",
      inQuickbooks: "$4,987.43",
      toReview: 94,
      daysAgo: 3,
    },
    secondary: {
      name: "Mastercard",
      balance: "$3,435.65",
      inQuickbooks: "$157.72",
      toReview: 94,
      daysAgo: 7,
    },
  },
  profitLoss: {
    total: "$20,000",
    month: "March",
    income: "$100,000",
    expenses: "$80,000",
    toReview: 8,
    longReview: 15,
  },
  placements: {
    total: "$15,940.65",
    lastMonth: "Last month",
    quarters: ["Q1", "Q2", "Q3", "Q4"],
    values: [5000, 8000, 12000, 15940],
  },
  occupancy: {
    current: 85,
    target: 95,
    available: 3,
  },
  caregivers: {
    active: 12,
    onCall: 5,
    shifts: {
      filled: 42,
      open: 3,
    },
  },
};

export default function ClientDashboard() {
  const { data: session } = useSession();

  const displayName =
    session?.user?.firstName || session?.user?.name?.split(" ")[0] || "User";

  const expensesChartData = {
    labels: mockData.expenses.breakdown.map((item) => item.label),
    datasets: [
      {
        data: mockData.expenses.breakdown.map((item) =>
          parseFloat(item.value.replace(/[^0-9.-]+/g, ""))
        ),
        backgroundColor: mockData.expenses.breakdown.map((item) => item.color),
        borderColor: mockData.expenses.breakdown.map((item) => item.color),
        borderWidth: 1,
        hoverOffset: 4,
      },
    ],
  };

  const placementsChartData = {
    labels: mockData.placements.quarters,
    datasets: [
      {
        label: "Placements",
        data: mockData.placements.values,
        fill: false,
        borderColor: "#0099e6",
        tension: 0.1,
        pointBackgroundColor: "#0099e6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { usePointStyle: true, boxWidth: 8 },
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "$" + (value as number).toLocaleString();
          },
        },
      },
    },
    plugins: { legend: { display: false } },
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-4 md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-800">
              Welcome back, {displayName}
            </h2>
            <p className="text-neutral-500">
              Here's what's happening with your care home today
            </p>
          </div>

          <div className="flex items-center mt-4 md:mt-0">
            <div className="flex items-center mr-4">
              <span className="text-sm text-neutral-500 mr-2">Privacy</span>
              <div className="relative inline-block w-10 align-middle select-none">
                <input
                  type="checkbox"
                  name="toggle"
                  id="toggle"
                  className="sr-only"
                  defaultChecked
                />
                <label
                  htmlFor="toggle"
                  className="block h-6 overflow-hidden rounded-full bg-neutral-300 cursor-pointer"
                >
                  <span className="block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out translate-x-4"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <section className="dashboard-section col-span-1">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">BOOKINGS</h3>
            </div>

            <div className="space-y-4">
              <div className="card">
                <div className="mb-2 text-sm text-neutral-500">
                  {mockData.bookings.unpaid} Unpaid • Last {mockData.bookings.lastDays} days
                </div>
                <div className="text-2xl font-bold text-neutral-800">{mockData.bookings.total}</div>
                <div className="flex justify-between mt-4">
                  <div>
                    <div className="text-sm text-neutral-500">Pending</div>
                    <div className="font-semibold">{mockData.bookings.upcoming}</div>
                    <div className="text-xs text-neutral-500">Not due yet</div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="card flex-1">
                  <div className="text-sm text-neutral-500">
                    {mockData.bookings.pending.total} Paid • Last {mockData.bookings.pending.lastDays} days
                  </div>
                  <div className="text-xl font-bold text-neutral-800 mt-2">{mockData.bookings.completed.total}</div>
                  <div className="text-xs text-neutral-500 mt-1">Not deposited</div>
                </div>

                <div className="card flex-1">
                  <div className="text-xl font-bold text-neutral-800">{mockData.bookings.completed.value}</div>
                  <div className="text-xs text-neutral-500 mt-1">Deposited</div>
                  <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                    Completed
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-section col-span-1">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">EXPENSES</h3>
              <div className="text-sm">
                <select className="form-select py-1 pl-2 pr-8 text-sm border-neutral-300 rounded-md">
                  <option>Last month</option>
                  <option>This month</option>
                  <option>Last quarter</option>
                </select>
              </div>
            </div>

            <div className="card">
              <div className="text-2xl font-bold text-neutral-800">{mockData.expenses.total}</div>
              <div className="text-sm text-neutral-500 mb-2">Last month</div>

              <div className="flex">
                <div className="w-1/2 h-40">
                  <Doughnut data={expensesChartData} options={chartOptions} />
                </div>

                <div className="w-1/2 space-y-3 pl-2">
                  {mockData.expenses.breakdown.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                      <div className="flex-1">
                        <div className="text-xs text-neutral-500">{item.label}</div>
                        <div className="text-sm font-medium">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-section col-span-1">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">BANK ACCOUNTS</h3>
              <button className="text-neutral-400 hover:text-neutral-600">
                <FiMoreHorizontal size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{mockData.bankAccounts.primary.name}</div>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-neutral-500 mr-1">Bank balance</span>
                      <span className="font-semibold">{mockData.bankAccounts.primary.balance}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-neutral-500 mr-1">in CareLinkAI</span>
                      <span className="font-semibold">{mockData.bankAccounts.primary.inQuickbooks}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {mockData.bankAccounts.primary.toReview} to review
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {mockData.bankAccounts.primary.daysAgo} days ago
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{mockData.bankAccounts.secondary.name}</div>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-neutral-500 mr-1">Bank balance</span>
                      <span className="font-semibold">{mockData.bankAccounts.secondary.balance}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-neutral-500 mr-1">in CareLinkAI</span>
                      <span className="font-semibold">{mockData.bankAccounts.secondary.inQuickbooks}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {mockData.bankAccounts.secondary.toReview} to review
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {mockData.bankAccounts.secondary.daysAgo} days ago
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center">
                  Connect accounts
                </button>

                <button className="flex items-center text-sm text-neutral-600 hover:text-neutral-800">
                  Go to register
                  <FiChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          </section>

          <section className="dashboard-section col-span-1">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">PROFIT & LOSS</h3>
              <div className="text-sm">
                <select className="form-select py-1 pl-2 pr-8 text-sm border-neutral-300 rounded-md">
                  <option>Last month</option>
                  <option>This month</option>
                  <option>Last quarter</option>
                </select>
              </div>
            </div>

            <div className="card">
              <div className="text-2xl font-bold text-neutral-800">{mockData.profitLoss.total}</div>
              <div className="text-sm text-neutral-500 mb-4">Net income for {mockData.profitLoss.month}</div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Income</div>
                    <div className="flex items-center">
                      <div className="text-sm font-medium">{mockData.profitLoss.income}</div>
                      <div className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                        {mockData.profitLoss.toReview} to review
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-success-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Expenses</div>
                    <div className="flex items-center">
                      <div className="text-sm font-medium">{mockData.profitLoss.expenses}</div>
                      <div className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                        {mockData.profitLoss.longReview} to review
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: "80%" }} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-section col-span-1">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">PLACEMENTS</h3>
              <div className="text-sm">
                <select className="form-select py-1 pl-2 pr-8 text-sm border-neutral-300 rounded-md">
                  <option>Last month</option>
                  <option>This month</option>
                  <option>Last quarter</option>
                </select>
              </div>
            </div>

            <div className="card">
              <div className="text-2xl font-bold text-neutral-800">{mockData.placements.total}</div>
              <div className="text-sm text-neutral-500 mb-4">Last month</div>

              <div className="h-48">
                <Line data={placementsChartData} options={lineChartOptions} />
              </div>
            </div>
          </section>

          <section className="dashboard-section col-span-1">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">DISCOVER MORE</h3>
              <button className="text-sm text-primary-600 hover:text-primary-700">Hide</button>
            </div>

            <div className="card">
              <div className="mb-4">
                <h4 className="font-medium mb-2">Save with low card fees</h4>
                <p className="text-sm text-neutral-600">
                  Accept resident payments with lower transaction fees
                </p>
              </div>

              <div className="flex items-center mb-4">
                <div className="h-16 w-16 mr-4 flex items-center justify-center bg-primary-50 rounded-lg">
                  <FiCreditCard size={24} className="text-primary-600" />
                </div>

                <div className="flex-1">
                  <p className="text-sm">
                    Benefit from low card transaction fees with CarePay that start at 1.7% + $0.30 per transaction.
                  </p>
                </div>
              </div>

              <button className="btn btn-primary w-full">Get access to low fees</button>

              <div className="flex justify-center mt-4">
                <div className="flex space-x-1">
                  <button className="h-2 w-2 rounded-full bg-primary-500" />
                  <button className="h-2 w-2 rounded-full bg-neutral-300" />
                  <button className="h-2 w-2 rounded-full bg-neutral-300" />
                  <button className="h-2 w-2 rounded-full bg-neutral-300" />
                  <button className="h-2 w-2 rounded-full bg-neutral-300" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">OCCUPANCY</h3>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold text-neutral-800">{mockData.occupancy.current}%</div>
                  <div className="text-sm text-neutral-500">Current occupancy</div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-neutral-800">{mockData.occupancy.available}</div>
                  <div className="text-sm text-neutral-500">Beds available</div>
                </div>
              </div>

              <div className="mb-2 flex justify-between text-sm">
                <span>Current</span>
                <span>Target: {mockData.occupancy.target}%</span>
              </div>

              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-success-500 rounded-full"
                  style={{ width: `${(mockData.occupancy.current / mockData.occupancy.target) * 100}%` }}
                />
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h3 className="dashboard-section-title">CAREGIVER STATS</h3>
            </div>

            <div className="card">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-neutral-500">Active Caregivers</div>
                  <div className="text-2xl font-bold text-neutral-800">{mockData.caregivers.active}</div>
                </div>

                <div>
                  <div className="text-sm text-neutral-500">On-Call Today</div>
                  <div className="text-2xl font-bold text-neutral-800">{mockData.caregivers.onCall}</div>
                </div>

                <div>
                  <div className="text-sm text-neutral-500">Shifts Filled</div>
                  <div className="text-2xl font-bold text-success-600">{mockData.caregivers.shifts.filled}</div>
                </div>

                <div>
                  <div className="text-sm text-neutral-500">Open Shifts</div>
                  <div className="text-2xl font-bold text-error-500">{mockData.caregivers.shifts.open}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-200">
                <button className="btn btn-secondary w-full">View Schedule</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
