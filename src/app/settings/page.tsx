"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiUser, FiShield, FiBell, FiDollarSign, FiFileText, FiSmartphone } from "react-icons/fi";

export default function SettingsIndexPage() {
  const { data: session } = useSession();
  const role = String(session?.user?.role || "").toUpperCase();

  const payoutsHref = role === "OPERATOR" || role === "ADMIN" ? "/settings/payouts/operator" : "/settings/payouts";

  const cards = [
    { href: "/settings/profile", title: "Profile", desc: "Personal info, photo", icon: <FiUser className="h-5 w-5" /> },
    { href: "/settings/account", title: "Account", desc: "Password, security", icon: <FiShield className="h-5 w-5" /> },
    { href: "/settings/notifications", title: "Notifications", desc: "Email & in-app", icon: <FiBell className="h-5 w-5" /> },
    { href: payoutsHref, title: "Payouts", desc: "Payments & transfers", icon: <FiDollarSign className="h-5 w-5" /> },
    ...(role === "CAREGIVER" ? [
      { href: "/settings/credentials", title: "Credentials", desc: "Licenses & docs", icon: <FiFileText className="h-5 w-5" /> },
    ] : []),
    { href: "/settings/pwa", title: "App & Devices", desc: "Install & devices", icon: <FiSmartphone className="h-5 w-5" /> },
  ];

  return (
    <DashboardLayout title="Settings" showSearch={false}>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-1 text-neutral-600">Manage your profile, account, notifications, and more.</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded-lg border border-neutral-200 bg-white p-4 hover:border-primary-300 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-neutral-100 p-2 text-neutral-700 group-hover:text-primary-700">
                  {c.icon}
                </div>
                <div>
                  <div className="font-medium text-neutral-900">{c.title}</div>
                  <div className="text-sm text-neutral-500">{c.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
