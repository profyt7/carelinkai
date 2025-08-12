"use client";

import { useState } from "react";
import { FiSmartphone, FiBell, FiInfo, FiDownload, FiSettings } from "react-icons/fi";
import PWAStatus from "@/components/pwa/PWAStatus";
import PWAPushTest from "@/components/pwa/PWAPushTest";
import PWAInstallButton from "@/components/pwa/PWAInstallButton";
import { usePWA } from "@/components/pwa/PWAManager";

export default function PWASettingsPage() {
  const { isPWA, isOnline, isUpdateAvailable, updateApp } = usePWA();
  const [activeTab, setActiveTab] = useState("status");

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-800 mb-2">
          Progressive Web App Settings
        </h1>
        <p className="text-neutral-600">
          Manage your CareLink AI app installation, notifications, and offline access
        </p>
      </div>

      {/* Info box for non-PWA users */}
      {!isPWA && (
        <div className="bg-primary-50 border-l-4 border-primary-500 p-4 mb-6">
          <div className="flex">
            <FiInfo className="h-5 w-5 text-primary-500 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-primary-800">
                Install CareLink AI as an app
              </h3>
              <p className="mt-1 text-sm text-primary-700">
                Get a better experience with offline access, push notifications, and faster loading times.
              </p>
              <div className="mt-3">
                <PWAInstallButton 
                  variant="primary" 
                  size="md"
                  showLabel={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab("status")}
            className={`py-3 px-4 text-sm font-medium ${
              activeTab === "status"
                ? "border-b-2 border-primary-500 text-primary-600"
                : "text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <FiSmartphone className="inline mr-2" />
            App Status
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`py-3 px-4 text-sm font-medium ${
              activeTab === "notifications"
                ? "border-b-2 border-primary-500 text-primary-600"
                : "text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <FiBell className="inline mr-2" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`py-3 px-4 text-sm font-medium ${
              activeTab === "about"
                ? "border-b-2 border-primary-500 text-primary-600"
                : "text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            }`}
          >
            <FiInfo className="inline mr-2" />
            About PWA
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="space-y-6">
        {/* Status Tab */}
        {activeTab === "status" && (
          <div>
            <h2 className="text-lg font-medium text-neutral-800 mb-4">App Status</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="col-span-2">
                <PWAStatus />
              </div>
              
              {isUpdateAvailable && (
                <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <FiDownload className="h-5 w-5 text-blue-500 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">
                        Update available
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        A new version of CareLink AI is available.
                      </p>
                      <button
                        onClick={updateApp}
                        className="mt-3 inline-flex items-center px-3 py-1.5 border border-blue-700 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        Update Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div>
            <h2 className="text-lg font-medium text-neutral-800 mb-4">Push Notifications</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="col-span-2">
                <PWAPushTest />
              </div>
              
              <div className="col-span-2 bg-neutral-50 border border-neutral-200 rounded-md p-4">
                <h3 className="text-md font-medium text-neutral-800 mb-2">About Notifications</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  CareLink AI uses push notifications to keep you updated about:
                </p>
                <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1 ml-2">
                  <li>New inquiries and responses</li>
                  <li>Messages from caregivers and families</li>
                  <li>Appointment reminders and schedule changes</li>
                  <li>Important document updates</li>
                  <li>System announcements</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* About PWA Tab */}
        {activeTab === "about" && (
          <div>
            <h2 className="text-lg font-medium text-neutral-800 mb-4">About Progressive Web Apps</h2>
            
            <div className="prose prose-sm max-w-none">
              <p>
                Progressive Web Apps (PWAs) combine the best of web and mobile apps, 
                offering a fast, reliable, and engaging experience.
              </p>
              
              <h3>Benefits of using CareLink AI as a PWA:</h3>
              
              <ul>
                <li>
                  <strong>Works offline:</strong> Access key features even without an internet connection
                </li>
                <li>
                  <strong>Fast loading:</strong> Loads instantly from your home screen
                </li>
                <li>
                  <strong>Push notifications:</strong> Stay updated with real-time alerts
                </li>
                <li>
                  <strong>App-like experience:</strong> Fullscreen interface without browser controls
                </li>
                <li>
                  <strong>Always updated:</strong> Always use the latest version
                </li>
                <li>
                  <strong>Safe and secure:</strong> Uses HTTPS for secure data transfer
                </li>
              </ul>
              
              <h3>How to install:</h3>
              
              <p>
                Look for the install button in the header or use your browser's install option.
                On iOS, tap the share button and select "Add to Home Screen".
              </p>
              
              <div className="mt-4">
                <PWAInstallButton 
                  variant="primary" 
                  size="md"
                  showLabel={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
