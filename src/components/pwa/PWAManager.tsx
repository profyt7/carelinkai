"use client";

import React, { useState, useEffect, useContext, createContext } from "react";
import type { ReactNode } from "react";
import { toast } from "react-hot-toast";
import { FiWifi, FiWifiOff, FiDownload, FiRefreshCw, FiBell } from "react-icons/fi";

// Define types for PWA context
interface PWAContextType {
  isOnline: boolean;
  isPWA: boolean;
  isInstallable: boolean;
  isUpdateAvailable: boolean;
  installApp: () => Promise<void>;
  updateApp: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  registerBackgroundSync: (tag: string, data: any) => Promise<boolean>;
  offlineMode: {
    isOfflineReady: boolean;
    cachedRoutes: string[];
  };
}

// Create context for PWA features
const PWAContext = createContext<PWAContextType | undefined>(undefined);

// Custom hook to use PWA context
export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
};

interface PWAManagerProps {
  children: ReactNode;
}

// IndexedDB helper for background sync
const openDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("CareLinkOfflineDB", 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Create stores for different types of offline data
      if (!db.objectStoreNames.contains("pendingInquiries")) {
        db.createObjectStore("pendingInquiries", { keyPath: "id", autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains("pendingMessages")) {
        db.createObjectStore("pendingMessages", { keyPath: "id", autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains("pendingProfiles")) {
        db.createObjectStore("pendingProfiles", { keyPath: "id", autoIncrement: true });
      }
    };
  });
};

// Main PWA Manager component
export default function PWAManager({ children }: PWAManagerProps) {
  // State for PWA features
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isPWA, setIsPWA] = useState<boolean>(false);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [offlineMode, setOfflineMode] = useState({
    isOfflineReady: false,
    cachedRoutes: ["/dashboard", "/search", "/dashboard/inquiries", "/messages"]
  });

  // Effect to register service worker
  useEffect(() => {
    const registerServiceWorker = async () => {
      /**
       * ------------------------------------------------------------------
       * ⚠  DEVELOPMENT SAFEGUARD
       * ------------------------------------------------------------------
       * During local development the service-worker can easily get into an
       * inconsistent state (e.g. caching stale chunks) which results in the
       * page rendering without CSS/JS – exactly the "unstyled HTML" you saw.
       *
       * To avoid this headache we simply do NOT register the SW when
       * `process.env.NODE_ENV !== "production"`, unless the developer
       * explicitly forces it by adding `?enable-sw` to the URL.
       *
       * This keeps the fast-refresh / HMR experience intact while still
       * allowing us to test the SW in production builds or when explicitly
       * requested.
       * ------------------------------------------------------------------
       */
      const isDev = process.env.NODE_ENV !== "production";
      const forceEnable =
        typeof window !== "undefined" &&
        window.location.search.includes("enable-sw");

      if (isDev && !forceEnable) {
        console.info(
          "[PWAManager] Skipping service-worker registration in development mode."
        );
        return;
      }

      try {
        if (!("serviceWorker" in navigator)) {
          console.warn("[PWAManager] Service workers are not supported in this browser.");
          return;
        }

        // Register sw.js in the public root
        const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
        console.log("[PWAManager] Service-Worker registered:", reg);

        // Save registration so other hooks can use it
        setRegistration(reg);

        // Immediately check for an updated SW
        try { await reg.update(); } catch {}

        // If there is already a waiting worker, an update is ready
        if (reg.waiting) {
          setIsUpdateAvailable(true);
        }

        // Listen for new workers
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New update available
                setIsUpdateAvailable(true);
                toast.custom((t) => (
                  <div
                    className={`${t.visible ? "animate-enter" : "animate-leave"} bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}
                  >
                    <FiRefreshCw className="text-primary-500 mr-2" />
                    <span className="text-sm">New version available – refresh to update.</span>
                  </div>
                ));
              }
            });
          }
        });

        // Listen for messages from the SW (e.g. caching completed)
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "CACHE_READY") {
            setOfflineMode((prev) => ({ ...prev, isOfflineReady: true }));
          }
        });
      } catch (err) {
        console.error("[PWAManager] Service-Worker registration failed:", err);
      }
    };
    
    registerServiceWorker();
  }, []);

  // Effect to detect PWA mode
  useEffect(() => {
    // Check if running as installed PWA
    const isPWAMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.matchMedia('(display-mode: minimal-ui)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsPWA(isPWAMode);
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsPWA(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Effect to handle beforeinstallprompt event for install button
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Update UI to show install button
      setIsInstallable(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Effect to handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("You're back online");
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}>
          <div className="flex items-center">
            <div className="flex-shrink-0 text-success-500">
              <FiWifi size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-900">
                You're back online
              </p>
            </div>
          </div>
        </div>
      ), { duration: 3000 });
      
      // Trigger background sync when back online
      if (registration && 'sync' in registration) {
        try {
          (registration as any).sync.register('sync-inquiries');
          (registration as any).sync.register('sync-messages');
        } catch (error) {
          console.error('Background sync registration failed:', error);
        }
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log("You're offline. Some features may be limited until you're back online");
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}>
          <div className="flex items-center">
            <div className="flex-shrink-0 text-error-500">
              <FiWifiOff size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-900">
                You're offline
              </p>
              <p className="text-sm text-neutral-500">
                Some features may be limited until you're back online
              </p>
            </div>
          </div>
        </div>
      ), { duration: 5000 });
    };
    
    // Set initial online status
    setIsOnline(navigator.onLine);
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [registration]);

  // Function to install the app
  const installApp = async () => {
    if (!deferredPrompt) {
      console.log('Can\'t install: No deferred prompt available');
      return;
    }
    
    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      
      // Reset the deferred prompt variable
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        toast.success('App installation started');
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error installing app:', error);
      toast.error('Failed to install app');
    }
  };

  // Function to update the app
  const updateApp = async () => {
    if (!registration) return;
    
    try {
      if (registration.waiting) {
        // Send message to service worker to skip waiting and activate new version
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload the page to load the new version
        window.location.reload();
      } else {
        // If no waiting worker, try to update manually
        await registration.update();
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating app:', error);
      toast.error('Failed to update app');
    }
  };

  // Function to request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      toast.error('This browser does not support notifications');
      return 'denied' as NotificationPermission;
    }
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        toast.success('Notification permission granted');
        
        // Subscribe to push notifications if service worker is available
        if (registration && 'pushManager' in registration) {
          try {
            const subscribeOptions = {
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(
                process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] || ''
              ),
            };
            
            const subscription = await registration.pushManager.subscribe(subscribeOptions);
            
            // Send subscription to server
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ subscription }),
            });
            
            console.log('Push notification subscription successful');
          } catch (error) {
            console.error('Error subscribing to push notifications:', error);
          }
        }
      } else {
        console.error('Notification permission denied');
        toast.error('Notification permission denied');
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied' as NotificationPermission;
    }
  };

  // Function to register background sync
  const registerBackgroundSync = async (tag: string, data: any) => {
    if (!isOnline) {
      try {
        // Store data in IndexedDB for later sync
        const db = await openDB();
        let storeName = '';
        
        // Determine which store to use based on tag
        switch (tag) {
          case 'inquiry-submission':
            storeName = 'pendingInquiries';
            break;
          case 'message-send':
            storeName = 'pendingMessages';
            break;
          case 'update-user-profile':
            storeName = 'pendingProfiles';
            break;
          default:
            throw new Error(`Unknown sync tag: ${tag}`);
        }
        
        // Add data to store
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise<void>((resolve, reject) => {
          const request = store.add({
            data,
            timestamp: new Date().toISOString(),
          });
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        
        // Register sync if supported
        if (registration && 'sync' in registration) {
          await (registration as any).sync.register(tag);
          console.log('Your data will be sent when you\'re back online');
          toast.success('Your data will be sent when you\'re back online');
          return true;
        } else {
          console.warn('Background sync not supported, please try again when online');
          toast('Background sync not supported, please try again when online');
          return false;
        }
      } catch (error) {
        console.error('Error registering background sync:', error);
        toast.error('Failed to save data for offline use');
        return false;
      }
    } else {
      // If online, no need for background sync
      return false;
    }
  };

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  // Create context value
  const contextValue: PWAContextType = {
    isOnline,
    isPWA,
    isInstallable,
    isUpdateAvailable,
    installApp,
    updateApp,
    requestNotificationPermission,
    registerBackgroundSync,
    offlineMode,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* Install prompt banner */}
      {isInstallable && !isPWA && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-neutral-200 p-4 flex items-center justify-between z-50 safe-bottom">
          <div>
            <h3 className="font-medium text-neutral-800">Install CareLink AI</h3>
            <p className="text-sm text-neutral-600">Add to your home screen for a better experience</p>
          </div>
          <button
            onClick={installApp}
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md flex items-center transition-colors"
          >
            <FiDownload className="mr-2" />
            Install
          </button>
        </div>
      )}
      
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-warning-500 text-white text-center py-1 text-sm z-50">
          <div className="flex items-center justify-center">
            <FiWifiOff size={14} className="mr-1" />
            <span>You're offline. Some features may be limited.</span>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}
