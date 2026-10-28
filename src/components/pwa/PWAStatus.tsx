"use client";

import { useState } from "react";
import { usePWA } from "./PWAManager";
import { 
  FiWifi, 
  FiWifiOff, 
  FiDownload, 
  FiRefreshCw, 
  FiBell, 
  FiSmartphone, 
  FiCheck, 
  FiX,
  FiInfo,
  FiSettings
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import PWAInstallButton from "./PWAInstallButton";

interface PWAStatusProps {
  className?: string;
  compact?: boolean;
}

export default function PWAStatus({ 
  className = "", 
  compact = false 
}: PWAStatusProps) {
  const { 
    isOnline,
    isPWA,
    isInstallable,
    isUpdateAvailable,
    updateApp,
    requestNotificationPermission,
    offlineMode
  } = usePWA();
  
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | null>(
    typeof Notification !== 'undefined' ? Notification.permission : null
  );
  
  // Request notification permission
  const handleRequestNotifications = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationStatus(permission);
      
      if (permission === 'granted') {
        toast.success('Notifications enabled!');
      } else if (permission === 'denied') {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    }
  };
  
  // Handle app update
  const handleUpdate = async () => {
    try {
      await updateApp();
      toast.success('Updating application...');
    } catch (error) {
      console.error('Error updating app:', error);
      toast.error('Failed to update application');
    }
  };
  
  // If compact mode, show minimal status
  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center">
          {isOnline ? (
            <FiWifi className="text-success-500" />
          ) : (
            <FiWifiOff className="text-error-500" />
          )}
        </div>
        
        {isUpdateAvailable && (
          <button 
            onClick={handleUpdate}
            className="flex items-center text-primary-500 hover:text-primary-600"
            title="Update available"
          >
            <FiRefreshCw />
          </button>
        )}
        
        {!isPWA && isInstallable && (
          <PWAInstallButton showLabel={false} variant="text" />
        )}
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-neutral-200 ${className}`}>
      <div className="p-4 border-b border-neutral-200">
        <h2 className="text-lg font-medium text-neutral-800 flex items-center">
          <FiSmartphone className="mr-2" />
          App Status
        </h2>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Installation status */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <FiSmartphone className="text-neutral-500 mr-2" />
            <span className="text-neutral-700">Installation</span>
          </div>
          <div>
            {isPWA ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                <FiCheck className="mr-1" /> Installed
              </span>
            ) : isInstallable ? (
              <PWAInstallButton size="sm" />
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                Not Available
              </span>
            )}
          </div>
        </div>
        
        {/* Connection status */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {isOnline ? (
              <FiWifi className="text-neutral-500 mr-2" />
            ) : (
              <FiWifiOff className="text-neutral-500 mr-2" />
            )}
            <span className="text-neutral-700">Connection</span>
          </div>
          <div>
            {isOnline ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                <FiCheck className="mr-1" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                Offline
              </span>
            )}
          </div>
        </div>
        
        {/* Update status */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <FiRefreshCw className="text-neutral-500 mr-2" />
            <span className="text-neutral-700">Updates</span>
          </div>
          <div>
            {isUpdateAvailable ? (
              <button
                onClick={handleUpdate}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 hover:bg-primary-200"
              >
                <FiRefreshCw className="mr-1" /> Update Now
              </button>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                <FiCheck className="mr-1" /> Up to date
              </span>
            )}
          </div>
        </div>
        
        {/* Notification status */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <FiBell className="text-neutral-500 mr-2" />
            <span className="text-neutral-700">Notifications</span>
          </div>
          <div>
            {notificationStatus === 'granted' ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                <FiCheck className="mr-1" /> Enabled
              </span>
            ) : notificationStatus === 'denied' ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-800">
                <FiX className="mr-1" /> Blocked
              </span>
            ) : (
              <button
                onClick={handleRequestNotifications}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 hover:bg-primary-200"
              >
                <FiBell className="mr-1" /> Enable
              </button>
            )}
          </div>
        </div>
        
        {/* Offline readiness */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <FiSettings className="text-neutral-500 mr-2" />
            <span className="text-neutral-700">Offline Ready</span>
          </div>
          <div>
            {offlineMode.isOfflineReady ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                <FiCheck className="mr-1" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                <FiInfo className="mr-1" /> In Progress
              </span>
            )}
          </div>
        </div>
        
        {/* Cached routes */}
        <div className="mt-4">
          <div className="flex items-center mb-2">
            <FiInfo className="text-neutral-500 mr-2" />
            <span className="text-neutral-700 text-sm font-medium">Available Offline</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {offlineMode.cachedRoutes.map((route) => (
              <span 
                key={route} 
                className="inline-block px-2 py-1 rounded-md text-xs bg-neutral-100 text-neutral-600"
              >
                {route}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
