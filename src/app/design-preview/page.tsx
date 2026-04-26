"use client";

import { useState } from "react";
import {
  FiHome, FiUsers, FiTrendingUp, FiFileText, FiBell, FiSettings,
  FiBarChart2, FiCalendar, FiCheckCircle, FiAlertCircle, FiPlus,
  FiSearch, FiArrowUp, FiArrowDown, FiMoreHorizontal, FiStar,
  FiShield, FiZap, FiCreditCard, FiLogOut, FiMenu,
} from "react-icons/fi";

// ─── shared mock data ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: FiHome,      label: "Dashboard",  active: true  },
  { icon: FiUsers,     label: "Residents",  active: false },
  { icon: FiFileText,  label: "Inquiries",  active: false },
  { icon: FiCalendar,  label: "Tours",      active: false },
  { icon: FiBarChart2, label: "Analytics",  active: false },
  { icon: FiShield,    label: "Compliance", active: false },
  { icon: FiCreditCard,label: "Billing",    active: false },
];

const STATS = [
  { label: "Homes",           value: "4",   trend: "+1",  up: true,  icon: FiHome      },
  { label: "Open Inquiries",  value: "12",  trend: "+3",  up: true,  icon: FiFileText  },
  { label: "Active Residents",value: "38",  trend: "-1",  up: false, icon: FiUsers     },
  { label: "Occupancy Rate",  value: "79%", trend: "+2%", up: true,  icon: FiTrendingUp},
];

const INQUIRIES = [
  { name: "Margaret T.",  home: "Sunrise Villa",     status: "NEW",              time: "2h ago"  },
  { name: "Robert K.",    home: "Lakewood Care",     status: "TOUR SCHEDULED",   time: "5h ago"  },
  { name: "Susan M.",     home: "Oak Park Gardens",  status: "CONTACTED",        time: "1d ago"  },
  { name: "David L.",     home: "Sunrise Villa",     status: "PLACEMENT ACCEPTED",time: "2d ago" },
];

const STATUS_COLORS: Record<string, string> = {
  "NEW":                 "bg-error-100 text-error-700",
  "TOUR SCHEDULED":      "bg-warning-100 text-warning-700",
  "CONTACTED":           "bg-primary-100 text-primary-700",
  "PLACEMENT ACCEPTED":  "bg-success-100 text-success-700",
};

// ─── Direction A — Warm Clinical ─────────────────────────────────────────────

function DirectionA() {
  return (
    <div className="flex h-[640px] overflow-hidden rounded-2xl border border-[#DDD8CE] shadow-lg font-sans">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: "#F5F0E8" }}>
        <div className="px-5 py-5 border-b border-[#E2DCCE]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <FiZap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-neutral-800 text-sm tracking-tight">CareLinkAI</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                item.active
                  ? "bg-white text-neutral-900 shadow-sm border border-[#E2DCCE]"
                  : "text-neutral-500 hover:bg-white/60 hover:text-neutral-700"
              }`}
            >
              <item.icon className={`h-4 w-4 flex-shrink-0 ${item.active ? "text-primary-500" : ""}`} />
              {item.label}
            </div>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-[#E2DCCE]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">CT</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-neutral-700 truncate">Chris Tolliver</div>
              <div className="text-xs text-neutral-400">Operator</div>
            </div>
            <FiLogOut className="h-4 w-4 text-neutral-400 flex-shrink-0" />
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto" style={{ background: "#FAFAF8" }}>
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[#E8E2D8]" style={{ background: "#FAFAF8" }}>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Good morning, Chris</h1>
            <p className="text-xs text-neutral-400 mt-0.5">Sunday, April 27 · 4 homes under management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input className="pl-8 pr-3 py-2 text-sm rounded-xl border border-[#E2DCCE] bg-white w-44 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-200" placeholder="Search…" />
            </div>
            <button className="relative p-2 rounded-xl border border-[#E2DCCE] bg-white text-neutral-500 hover:text-neutral-700">
              <FiBell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error-500 ring-2 ring-white" />
            </button>
          </div>
        </header>

        <div className="px-6 py-5 space-y-5">
          {/* Alert banner */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
            <FiAlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800"><strong>3 new inquiries</strong> are waiting for your response.</p>
            <button className="ml-auto text-xs font-semibold text-amber-700 whitespace-nowrap hover:underline">View →</button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E8E2D8] p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "#EEE8DD" }}>
                    <s.icon className="h-4 w-4 text-neutral-600" />
                  </div>
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${s.up ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}>
                    {s.up ? <FiArrowUp className="h-2.5 w-2.5" /> : <FiArrowDown className="h-2.5 w-2.5" />}
                    {s.trend}
                  </span>
                </div>
                <div className="text-2xl font-bold text-neutral-900 tabular-nums">{s.value}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent inquiries */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EBE2]">
              <h2 className="text-sm font-semibold text-neutral-800">Recent Inquiries</h2>
              <button className="text-xs text-primary-600 hover:underline font-medium">View all →</button>
            </div>
            <div className="divide-y divide-[#F5F0E8]">
              {INQUIRIES.map((row) => (
                <div key={row.name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FDFAF6] transition-colors">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0" style={{ background: "#E8F0FF" }}>
                    {row.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-800">{row.name}</div>
                    <div className="text-xs text-neutral-400">{row.home}</div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[row.status]}`}>{row.status}</span>
                  <span className="text-xs text-neutral-400 w-12 text-right">{row.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: FiPlus, label: "Add Home", sub: "Create new listing", color: "text-primary-600", bg: "#E8F0FF" },
              { icon: FiUsers, label: "Add Resident", sub: "Onboard new resident", color: "text-success-600", bg: "#E6F7EE" },
              { icon: FiFileText, label: "View Inquiries", sub: "Manage leads", color: "text-primary-600", bg: "#E8F0FF" },
            ].map((a) => (
              <button key={a.label} className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-[#E2DCCE] hover:border-[#C8C0B0] bg-white hover:bg-[#FDFAF6] transition-all text-left">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: a.bg }}>
                  <a.icon className={`h-4 w-4 ${a.color}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-800">{a.label}</div>
                  <div className="text-xs text-neutral-400">{a.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Direction B — SaaS Dark Sidebar ─────────────────────────────────────────

function DirectionB() {
  return (
    <div className="flex h-[640px] overflow-hidden rounded-2xl shadow-2xl font-sans">
      {/* Dark sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-neutral-950">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <FiZap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-white text-sm tracking-tight">CareLinkAI</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                item.active
                  ? "bg-primary-500 text-white"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </div>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:bg-white/5 hover:text-neutral-200 cursor-pointer">
            <FiSettings className="h-4 w-4" />
            Settings
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="h-7 w-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">CT</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-neutral-200 truncate">Chris Tolliver</div>
              <div className="text-xs text-neutral-500">Operator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Light content */}
      <main className="flex-1 overflow-y-auto bg-neutral-50">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-neutral-200">
          <div>
            <h1 className="text-base font-semibold text-neutral-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input className="pl-8 pr-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50 w-48 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400" placeholder="Search…" />
            </div>
            <button className="relative p-2 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50">
              <FiBell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error-500 ring-2 ring-white" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors">
              <FiPlus className="h-4 w-4" />
              New
            </button>
          </div>
        </header>

        <div className="px-6 py-5 space-y-5">
          {/* Stat cards — flat with border, colored top strip */}
          <div className="grid grid-cols-4 gap-4">
            {STATS.map((s, i) => {
              const accents = ["border-t-primary-500","border-t-success-500","border-t-secondary-500","border-t-warning-500"];
              const iconBgs = ["bg-primary-50 text-primary-600","bg-success-50 text-success-600","bg-secondary-100 text-secondary-600","bg-warning-50 text-warning-600"];
              return (
                <div key={s.label} className={`bg-white rounded-xl border border-neutral-200 border-t-4 ${accents[i]} p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBgs[i]}`}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    <button className="text-neutral-300 hover:text-neutral-500">
                      <FiMoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 tabular-nums">{s.value}</div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-neutral-500">{s.label}</div>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${s.up ? "text-success-600" : "text-error-600"}`}>
                      {s.up ? <FiArrowUp className="h-3 w-3" /> : <FiArrowDown className="h-3 w-3" />}
                      {s.trend}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Two-col grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Inquiries table */}
            <div className="col-span-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <h2 className="text-sm font-semibold text-neutral-900">Recent Inquiries</h2>
                <button className="text-xs font-medium text-primary-600 hover:underline">View all</button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wide">Home</th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wide">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {INQUIRIES.map((row) => (
                    <tr key={row.name} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-neutral-800">{row.name}</td>
                      <td className="px-5 py-3 text-neutral-500">{row.home}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[row.status]}`}>{row.status}</span>
                      </td>
                      <td className="px-5 py-3 text-neutral-400 text-right">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick actions panel */}
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h2 className="text-sm font-semibold text-neutral-900">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { icon: FiPlus, label: "Add Home", color: "bg-primary-500 hover:bg-primary-600" },
                  { icon: FiUsers, label: "Add Resident", color: "bg-success-500 hover:bg-success-600" },
                  { icon: FiCalendar, label: "Schedule Tour", color: "bg-secondary-500 hover:bg-secondary-600" },
                  { icon: FiShield, label: "Compliance Check", color: "bg-warning-500 hover:bg-warning-600" },
                ].map((a) => (
                  <button key={a.label} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${a.color}`}>
                    <a.icon className="h-4 w-4" />
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="px-4 pb-4">
                <div className="rounded-lg bg-primary-50 border border-primary-100 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FiAlertCircle className="h-3.5 w-3.5 text-primary-600" />
                    <span className="text-xs font-semibold text-primary-800">3 new inquiries</span>
                  </div>
                  <p className="text-xs text-primary-600">Waiting for response</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Direction C — Airy Minimal ───────────────────────────────────────────────

function DirectionC() {
  return (
    <div className="flex h-[640px] overflow-hidden rounded-2xl border border-neutral-200 bg-white font-sans">
      {/* Minimal sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col bg-white border-r border-neutral-100">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary-500 flex items-center justify-center">
              <FiZap className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-neutral-900 text-sm">CareLinkAI</span>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                item.active
                  ? "text-primary-600 font-semibold bg-primary-50"
                  : "text-neutral-400 font-medium hover:text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
              {item.label === "Inquiries" && (
                <span className="ml-auto text-xs font-semibold bg-error-100 text-error-600 rounded-full px-1.5 py-0.5">3</span>
              )}
            </div>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-bold">CT</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-neutral-800 truncate">Chris Tolliver</div>
              <div className="text-xs text-neutral-400">Operator</div>
            </div>
            <FiSettings className="h-4 w-4 text-neutral-300 flex-shrink-0" />
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        {/* Header — minimal, no background */}
        <header className="flex items-center justify-between px-8 pt-8 pb-2">
          <div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-1">Dashboard</p>
            <h1 className="text-2xl font-bold text-neutral-900">Good morning, Chris</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-300" />
              <input className="pl-8 pr-3 py-2 text-sm border border-neutral-100 rounded-lg bg-neutral-50 w-44 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-200 focus:border-primary-300" placeholder="Search…" />
            </div>
            <button className="relative p-2 text-neutral-400 hover:text-neutral-600">
              <FiBell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-error-500" />
            </button>
          </div>
        </header>

        <div className="px-8 py-6 space-y-8">
          {/* Stat cards — zero chrome */}
          <div className="grid grid-cols-4 gap-6">
            {STATS.map((s, i) => {
              const iconColors = ["text-primary-500", "text-success-500", "text-secondary-500", "text-warning-500"];
              return (
                <div key={s.label} className="group">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`h-3.5 w-3.5 ${iconColors[i]}`} />
                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{s.label}</span>
                  </div>
                  <div className="text-3xl font-bold text-neutral-900 tabular-nums">{s.value}</div>
                  <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${s.up ? "text-success-600" : "text-error-600"}`}>
                    {s.up ? <FiArrowUp className="h-3 w-3" /> : <FiArrowDown className="h-3 w-3" />}
                    {s.trend} this week
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100" />

          {/* Inquiries — clean list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-900">Recent Inquiries</h2>
              <button className="text-xs text-primary-500 hover:text-primary-700 font-medium">View all →</button>
            </div>
            <div className="space-y-1">
              {INQUIRIES.map((row) => (
                <div key={row.name} className="flex items-center gap-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 -mx-2 px-2 rounded-lg cursor-pointer transition-colors">
                  <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-500 flex-shrink-0">
                    {row.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-800">{row.name}</div>
                    <div className="text-xs text-neutral-400">{row.home}</div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[row.status]}`}>{row.status}</span>
                  <span className="text-xs text-neutral-300 w-12 text-right">{row.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions — text links style */}
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: FiPlus, label: "Add Home" },
                { icon: FiUsers, label: "Add Resident" },
                { icon: FiCalendar, label: "Schedule Tour" },
                { icon: FiFileText, label: "View Inquiries" },
              ].map((a) => (
                <button key={a.label} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all">
                  <a.icon className="h-4 w-4" />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const DIRECTIONS = [
  {
    id: "A",
    name: "Warm Clinical",
    tagline: "Care.com meets health SaaS — warm off-white backgrounds, rounded cards, human feel",
    bullets: ["Warm #FAFAF8 background", "Rounded-2xl cards with soft shadows", "Tinted sidebar (#F5F0E8)", "Approachable for families & operators"],
    component: DirectionA,
  },
  {
    id: "B",
    name: "SaaS Dark Sidebar",
    tagline: "Linear / Stripe aesthetic — charcoal sidebar, crisp white content, premium feel",
    bullets: ["Neutral-950 sidebar", "High-contrast color accents", "Table-first data density", "Signals serious operator tool"],
    component: DirectionB,
  },
  {
    id: "C",
    name: "Airy Minimal",
    tagline: "Notion / Loom aesthetic — maximum whitespace, borderless cards, typography-led",
    bullets: ["Pure white, no card shadows", "Data without chrome", "Ultra-clean stat numbers", "Works great on large monitors"],
    component: DirectionC,
  },
];

export default function DesignPreviewPage() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-2">Design Preview</p>
          <h1 className="text-3xl font-bold text-neutral-900 mb-3">3 Design Directions</h1>
          <p className="text-neutral-500 max-w-xl mx-auto text-sm">
            Each preview shows the same operator dashboard — stat cards, inquiry table, quick actions, and sidebar — in three distinct visual styles.
          </p>
        </div>

        {/* Direction sections */}
        <div className="space-y-16">
          {DIRECTIONS.map((dir) => {
            const Comp = dir.component;
            const isChosen = active === dir.id;
            return (
              <div key={dir.id}>
                {/* Section header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold">{dir.id}</span>
                      <h2 className="text-xl font-bold text-neutral-900">{dir.name}</h2>
                      {isChosen && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success-100 text-success-700 text-xs font-semibold">
                          <FiCheckCircle className="h-3 w-3" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 mb-3">{dir.tagline}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {dir.bullets.map((b) => (
                        <span key={b} className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <span className="h-1 w-1 rounded-full bg-neutral-400 inline-block" />
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setActive(isChosen ? null : dir.id)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      isChosen
                        ? "bg-success-500 text-white"
                        : "bg-neutral-900 hover:bg-neutral-700 text-white"
                    }`}
                  >
                    {isChosen ? "✓ Chosen" : `Choose Direction ${dir.id}`}
                  </button>
                </div>

                {/* Preview */}
                <div className={`transition-all duration-200 ${isChosen ? "ring-4 ring-success-400 ring-offset-2 rounded-2xl" : ""}`}>
                  <Comp />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        {active && (
          <div className="mt-12 p-6 rounded-2xl bg-neutral-900 text-white text-center">
            <h3 className="text-lg font-bold mb-1">Direction {active} selected 👍</h3>
            <p className="text-neutral-400 text-sm">
              Tell Chris which one and the full app can be restyled to match — sidebar, dashboard, forms, tables, and all.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-neutral-300 mt-8">
          /design-preview · for internal review only
        </p>
      </div>
    </div>
  );
}
