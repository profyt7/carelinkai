import { useState, useEffect } from 'react';
import { usePWA } from '../components/pwa/PWAManager';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

// Types for the hook
interface OfflineFormData {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  data: any;
  timestamp: number;
}

interface AppNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

type InstallPromptType = 'banner' | 'modal' | 'card' | 'inline';

interface InstallPromptOptions {
  type?: InstallPromptType;
  position?: 'top' | 'bottom' | 'inline';
  showDismiss?: boolean;
}

interface UsePWAFeaturesReturn {
  // Basic PWA state
  isOnline: boolean;
  isPWA: boolean;
  isInstallable: boolean;
  isUpdateAvailable: boolean;
  
  // Offline capabilities
  offlineMode: {
    isOfflineReady: boolean;
    cachedRoutes: string[];
  };
  
  // Form submission
  submitForm: <T>(endpoint: string, method: 'POST' | 'PUT' | 'PATCH', data: T) => Promise<{
    success: boolean;
    message: string;
    offline: boolean;
    data?: any;
    error?: any;
  }>;
  
  getPendingSubmissions: () => Promise<OfflineFormData[]>;
  clearPendingSubmission: (id: string) => Promise<boolean>;
  
  // Notifications
  requestNotificationPermission: () => Promise<NotificationPermission>;
  showNotification: (options: AppNotificationOptions) => Promise<boolean>;
  getNotificationPermission: () => NotificationPermission | null;
  
  // Installation
  installApp: () => Promise<void>;
  showInstallPrompt: (options?: InstallPromptOptions) => void;
  hideInstallPrompt: () => void;
  
  // Updates
  updateApp: () => Promise<void>;
  checkForUpdates: () => Promise<boolean>;
}

/**
 * Custom hook for using PWA features throughout the app
 */
export function usePWAFeatures(): UsePWAFeaturesReturn {
  const pwa = usePWA();
  const [installPromptVisible, setInstallPromptVisible] = useState<boolean>(false);
  const [installPromptOptions, setInstallPromptOptions] = useState<InstallPromptOptions>({
    type: 'banner',
    position: 'bottom',
    showDismiss: true,
  });

  /**
   * Submit a form with offline support
   * If online, submits directly to the server
   * If offline, stores in IndexedDB for later submission
   */
  const submitForm = async <T>(
    endpoint: string, 
    method: 'POST' | 'PUT' | 'PATCH', 
    data: T
  ) => {
    try {
      // If online, try to submit directly
      if (pwa.isOnline) {
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const responseData = await response.json();
        return {
          success: true,
          message: 'Form submitted successfully',
          offline: false,
          data: responseData,
        };
      } else {
        // If offline, store for later submission
        const formData: OfflineFormData = {
          id: uuidv4(),
          endpoint,
          method,
          data,
          timestamp: Date.now(),
        };

        // Determine which sync tag to use based on endpoint
        let syncTag = 'form-submission';
        
        if (endpoint.includes('/inquiries')) {
          syncTag = 'inquiry-submission';
        } else if (endpoint.includes('/messages')) {
          syncTag = 'message-send';
        } else if (endpoint.includes('/profile')) {
          syncTag = 'update-user-profile';
        }

        // Register for background sync
        const registered = await pwa.registerBackgroundSync(syncTag, formData);

        return {
          success: true,
          message: registered 
            ? 'Form saved for submission when back online' 
            : 'Form saved offline, but background sync is not available',
          offline: true,
          data: { id: formData.id },
        };
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // If error occurs while online, try to save offline
      if (pwa.isOnline) {
        try {
          const formData: OfflineFormData = {
            id: uuidv4(),
            endpoint,
            method,
            data,
            timestamp: Date.now(),
          };
          
          // Determine sync tag
          const syncTag = endpoint.includes('/inquiries') 
            ? 'inquiry-submission' 
            : endpoint.includes('/messages')
              ? 'message-send'
              : 'form-submission';
              
          await pwa.registerBackgroundSync(syncTag, formData);
          
          return {
            success: true,
            message: 'Server error occurred, but form saved for later submission',
            offline: true,
            data: { id: formData.id },
            error,
          };
        } catch (offlineError) {
          return {
            success: false,
            message: 'Failed to submit form and could not save offline',
            offline: false,
            error: offlineError,
          };
        }
      }
      
      return {
        success: false,
        message: 'Failed to submit form',
        offline: pwa.isOnline ? false : true,
        error,
      };
    }
  };

  /**
   * Get all pending form submissions from IndexedDB
   */
  const getPendingSubmissions = async (): Promise<OfflineFormData[]> => {
    try {
      // Open IndexedDB
      const db = await openDB();
      
      // Get all pending submissions from all stores
      const inquiries = await getAllFromStore(db, 'pendingInquiries');
      const messages = await getAllFromStore(db, 'pendingMessages');
      const profiles = await getAllFromStore(db, 'pendingProfiles');
      
      return [...inquiries, ...messages, ...profiles];
    } catch (error) {
      console.error('Error getting pending submissions:', error);
      return [];
    }
  };

  /**
   * Clear a pending submission from IndexedDB
   */
  const clearPendingSubmission = async (id: string): Promise<boolean> => {
    try {
      // Open IndexedDB
      const db = await openDB();
      
      // Try to delete from each store
      const stores = ['pendingInquiries', 'pendingMessages', 'pendingProfiles'];
      let deleted = false;
      
      for (const storeName of stores) {
        try {
          await deleteFromStore(db, storeName, id);
          deleted = true;
          break;
        } catch (error) {
          // Item not in this store, try next one
        }
      }
      
      return deleted;
    } catch (error) {
      console.error('Error clearing pending submission:', error);
      return false;
    }
  };

  /**
   * Request notification permission and register for push notifications
   */
  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    return pwa.requestNotificationPermission();
  };

  /**
   * Get current notification permission
   */
  const getNotificationPermission = (): NotificationPermission | null => {
    if (typeof Notification === 'undefined') {
      return null;
    }
    return Notification.permission;
  };

  /**
   * Show a notification
   */
  const showNotification = async (options: AppNotificationOptions): Promise<boolean> => {
    try {
      // Check if notifications are supported
      if (typeof Notification === 'undefined') {
        console.warn('Notifications are not supported in this environment');
        return false;
      }

      // Check permission
      const permission = Notification.permission;
      
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // Build DOM-compatible NotificationOptions
      const notifOptions: NotificationOptions = {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/badge-96x96.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
      };

      // `image` is not yet part of the TS lib definition in some environments.
      if (options.image) {
        (notifOptions as any).image = options.image;
      }

      // Show notification
      const notification = new Notification(options.title, notifOptions);

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        // Focus current window or open home
        try {
          if (typeof window !== 'undefined' && window.focus) {
            window.focus();
          }
          // Optionally navigate to home
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        } catch {
          /* no-op */
        }
      };

      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  };

  /**
   * Show install prompt
   */
  const showInstallPrompt = (options?: InstallPromptOptions) => {
    if (pwa.isInstallable && !pwa.isPWA) {
      setInstallPromptOptions({
        ...installPromptOptions,
        ...options,
      });
      setInstallPromptVisible(true);
    } else {
      console.warn('App is not installable or is already installed');
    }
  };

  /**
   * Hide install prompt
   */
  const hideInstallPrompt = () => {
    setInstallPromptVisible(false);
  };

  /**
   * Check for app updates
   */
  const checkForUpdates = async (): Promise<boolean> => {
    try {
      // If service worker is registered and has an update, return true
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        for (const registration of registrations) {
          if (registration.waiting) {
            // Update available
            return true;
          }
          
          // Check for updates
          await registration.update();
          
          if (registration.waiting) {
            // Update found
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  };

  /**
   * Helper function to open IndexedDB
   */
  const openDB = async () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('CareLinkOfflineDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('pendingInquiries')) {
          db.createObjectStore('pendingInquiries', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('pendingMessages')) {
          db.createObjectStore('pendingMessages', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('pendingProfiles')) {
          db.createObjectStore('pendingProfiles', { keyPath: 'id' });
        }
      };
    });
  };

  /**
   * Helper function to get all items from an IndexedDB store
   */
  const getAllFromStore = async (db: IDBDatabase, storeName: string): Promise<OfflineFormData[]> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result;
        // Map to common format
        const formattedItems = items.map((item: any) => ({
          id: item.id,
          endpoint: item.data?.endpoint || '',
          method: item.data?.method || 'POST',
          data: item.data,
          timestamp: item.timestamp || Date.now(),
        }));
        resolve(formattedItems);
      };
      
      request.onerror = () => reject(request.error);
    });
  };

  /**
   * Helper function to delete an item from an IndexedDB store
   */
  const deleteFromStore = async (db: IDBDatabase, storeName: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // Return the hook API
  return {
    // Basic PWA state
    isOnline: pwa.isOnline,
    isPWA: pwa.isPWA,
    isInstallable: pwa.isInstallable,
    isUpdateAvailable: pwa.isUpdateAvailable,
    
    // Offline capabilities
    offlineMode: pwa.offlineMode,
    
    // Form submission
    submitForm,
    getPendingSubmissions,
    clearPendingSubmission,
    
    // Notifications
    requestNotificationPermission,
    showNotification,
    getNotificationPermission,
    
    // Installation
    installApp: pwa.installApp,
    showInstallPrompt,
    hideInstallPrompt,
    
    // Updates
    updateApp: pwa.updateApp,
    checkForUpdates,
  };
}

export default usePWAFeatures;
