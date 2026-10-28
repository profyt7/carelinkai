"use client";

import { useState, useEffect } from "react";
import { usePWA } from "./PWAManager";
import { 
  FiBell, 
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiSend,
  FiInfo,
  FiRefreshCw
} from "react-icons/fi";
import { toast } from "react-hot-toast";

interface PushSubscriptionStatus {
  supported: boolean;
  hasSubscriptions: boolean;
  subscriptionCount: number;
}

export default function PWAPushTest() {
  // PWA context for notification permissions
  const { requestNotificationPermission } = usePWA();
  
  // State for notification test form
  const [title, setTitle] = useState("CareLink AI Test");
  const [body, setBody] = useState("This is a test notification from CareLink AI");
  const [isUrgent, setIsUrgent] = useState(false);
  
  // State for notification permission and subscription
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<PushSubscriptionStatus | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  
  // Check notification permission and subscription status on mount
  useEffect(() => {
    const checkPermission = () => {
      if (typeof Notification !== 'undefined') {
        setNotificationPermission(Notification.permission);
      }
    };
    
    checkPermission();
    checkSubscriptionStatus();
  }, []);
  
  // Check push subscription status
  const checkSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/push/send', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      } else {
        console.error('Failed to fetch subscription status');
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Enable push notifications
  const enableNotifications = async () => {
    try {
      setIsEnabling(true);
      
      // Request permission
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Push notifications enabled!');
        // Refresh subscription status
        await checkSubscriptionStatus();
      } else if (permission === 'denied') {
        toast.error('Notification permission denied by browser');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsEnabling(false);
    }
  };
  
  // Send test notification
  const sendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !body) {
      toast.error('Please provide both title and body for the notification');
      return;
    }
    
    try {
      setIsSending(true);
      
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          urgent: isUrgent,
          isTest: true,
          data: {
            url: '/dashboard',
            testId: Date.now().toString()
          }
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Test notification sent!');
      } else {
        toast.error(data.error || 'Failed to send notification');
        console.error('Notification error:', data);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsSending(false);
    }
  };
  
  // Check if push notifications are supported
  const isPushSupported = typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'PushManager' in window;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="p-4 border-b border-neutral-200">
        <h2 className="text-lg font-medium text-neutral-800 flex items-center">
          <FiBell className="mr-2" />
          Push Notification Test
        </h2>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Support Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FiInfo className="text-neutral-500 mr-2" />
            <span className="text-neutral-700">Push Support</span>
          </div>
          <div>
            {isPushSupported ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                <FiCheck className="mr-1" /> Supported
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-800">
                <FiX className="mr-1" /> Not Supported
              </span>
            )}
          </div>
        </div>
        
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FiBell className="text-neutral-500 mr-2" />
            <span className="text-neutral-700">Permission</span>
          </div>
          <div>
            {notificationPermission === 'granted' ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                <FiCheck className="mr-1" /> Granted
              </span>
            ) : notificationPermission === 'denied' ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-800">
                <FiX className="mr-1" /> Denied
              </span>
            ) : (
              <button
                onClick={enableNotifications}
                disabled={isEnabling || !isPushSupported}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnabling ? (
                  <>
                    <FiRefreshCw className="mr-1 animate-spin" /> Enabling...
                  </>
                ) : (
                  <>
                    <FiBell className="mr-1" /> Enable Notifications
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Subscription Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FiSend className="text-neutral-500 mr-2" />
            <span className="text-neutral-700">Subscription</span>
          </div>
          <div>
            {isLoading ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                <FiRefreshCw className="mr-1 animate-spin" /> Checking...
              </span>
            ) : subscriptionStatus?.hasSubscriptions ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                <FiCheck className="mr-1" /> Active ({subscriptionStatus.subscriptionCount})
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                <FiAlertTriangle className="mr-1" /> Not Subscribed
              </span>
            )}
          </div>
        </div>
        
        {/* Refresh button */}
        <div className="flex justify-end">
          <button
            onClick={checkSubscriptionStatus}
            disabled={isLoading}
            className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
          >
            <FiRefreshCw className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
        
        {/* Notification not supported warning */}
        {!isPushSupported && (
          <div className="bg-warning-50 border-l-4 border-warning-400 p-4 my-4">
            <div className="flex">
              <FiAlertTriangle className="text-warning-500 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-warning-700">
                  Push notifications are not supported in this browser or context.
                  Please use a modern browser with HTTPS enabled.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Permission denied warning */}
        {notificationPermission === 'denied' && (
          <div className="bg-error-50 border-l-4 border-error-400 p-4 my-4">
            <div className="flex">
              <FiX className="text-error-500 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-error-700">
                  Notification permission has been denied. Please enable notifications in your browser settings.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Test Notification Form */}
        {isPushSupported && notificationPermission === 'granted' && (
          <form onSubmit={sendTestNotification} className="space-y-4 mt-6">
            <h3 className="text-md font-medium text-neutral-800">Send Test Notification</h3>
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Notification Title"
                required
              />
            </div>
            
            <div>
              <label htmlFor="body" className="block text-sm font-medium text-neutral-700">
                Message
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Notification message"
                required
              />
            </div>
            
            <div className="flex items-center">
              <input
                id="urgent"
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="urgent" className="ml-2 block text-sm text-neutral-700">
                High Priority (requires interaction)
              </label>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSending || !title || !body}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <FiRefreshCw className="mr-2 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <FiSend className="mr-2" /> Send Test Notification
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
