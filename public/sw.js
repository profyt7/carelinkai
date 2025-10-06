/**
 * CareLink AI - Service Worker
 * Provides offline functionality, background sync, and push notifications
 */

// Cache names with versioning for better cache management
const CACHE_NAMES = {
  static: 'carelink-static-v2',
  dynamic: 'carelink-dynamic-v2',
  pages: 'carelink-pages-v2',
  images: 'carelink-images-v2',
  api: 'carelink-api-v2'
};

// Maximum entries per cache to avoid uncontrolled growth
const CACHE_LIMITS = {
  [CACHE_NAMES.static]: 100,
  [CACHE_NAMES.dynamic]: 150,
  [CACHE_NAMES.pages]: 60,
  [CACHE_NAMES.images]: 100,
  [CACHE_NAMES.api]: 80
};

// Assets to pre-cache during installation
const CORE_ASSETS = [
  '/',
  '/dashboard',
  '/search',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png',
  '/icons/favicon.ico'
];

// API endpoints to cache
const API_ROUTES = [
  '/api/homes',
  '/api/caregivers',
  '/api/dashboard/stats'
];

// Routes that should always try the network first
const NETWORK_FIRST_ROUTES = [
  '/api/inquiries',
  '/api/messages',
  '/dashboard/inquiries'
];

// Routes that should use stale-while-revalidate
const STALE_WHILE_REVALIDATE_ROUTES = [
  '/search',
  '/api/search'
];

/**
 * Helper function to determine which caching strategy to use based on the request
 */
function getStrategy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // API requests that should use network first
  if (NETWORK_FIRST_ROUTES.some(route => pathname.includes(route))) {
    return 'network-first';
  }

  // Routes that should use stale-while-revalidate
  if (STALE_WHILE_REVALIDATE_ROUTES.some(route => pathname.includes(route))) {
    return 'stale-while-revalidate';
  }

  // Static assets should use cache first
  if (pathname.match(/\.(js|css|woff2?|ttf|eot)$/)) {
    return 'cache-first';
  }

  // Images should use cache first with longer max-age
  if (pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
    return 'cache-first-long';
  }

  // API requests should use stale-while-revalidate by default
  if (pathname.includes('/api/')) {
    return 'stale-while-revalidate';
  }

  // HTML pages should use network first with cache fallback
  return 'network-first';
}

/**
 * Cache first strategy - try cache first, then network
 */
async function cacheFirst(request, cacheName = CACHE_NAMES.static, maxAgeSeconds = 86400) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check if the cached response has expired
    const cachedAt = cachedResponse.headers.get('sw-cached-at');
    if (cachedAt) {
      const ageInSeconds = (Date.now() - new Date(cachedAt).getTime()) / 1000;
      if (ageInSeconds < maxAgeSeconds) {
        return cachedResponse;
      }
    } else {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);
    const clonedResponse = networkResponse.clone();
    
    // Cache the fresh response
    const cache = await caches.open(cacheName);
    
    // Add a custom header to track when this response was cached
    const responseToCache = new Response(clonedResponse.body, {
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers: new Headers(clonedResponse.headers)
    });
    responseToCache.headers.set('sw-cached-at', new Date().toISOString());
    
    cache.put(request, responseToCache);

    // Trim cache if it grows beyond limit
    trimCache(cacheName).catch(err =>
      console.error('[Service Worker] trimCache error:', err)
    );
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    
    // If we have a cached response, return it even if expired
    const fallbackCachedResponse = await caches.match(request);
    if (fallbackCachedResponse) {
      return fallbackCachedResponse;
    }
    
    // If it's an HTML request, return the offline page
    if (request.headers.get('Accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    // Otherwise, return a 504 Gateway Timeout
    return new Response('Network error happened', {
      status: 504,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Network first strategy - try network first, fall back to cache
 */
async function networkFirst(request, cacheName = CACHE_NAMES.pages) {
  try {
    const networkResponse = await fetch(request);
    const clonedResponse = networkResponse.clone();
    
    // Cache the fresh response
    const cache = await caches.open(cacheName);
    cache.put(request, clonedResponse);
    
    return networkResponse;
  } catch (error) {
    console.log('Network request failed, falling back to cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's an HTML request, return the offline page
    if (request.headers.get('Accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    // Otherwise, return a 504 Gateway Timeout
    return new Response('Network error happened', {
      status: 504,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Stale while revalidate - return from cache, then update cache from network
 */
async function staleWhileRevalidate(request, cacheName = CACHE_NAMES.dynamic) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      const clonedResponse = networkResponse.clone();
      caches.open(cacheName)
        .then(cache => cache.put(request, clonedResponse))
        .catch(err => console.error('Failed to update cache:', err));
      return networkResponse;
    })
    .catch(error => {
      console.error('Fetch failed in stale-while-revalidate:', error);
      // We don't throw here because we're handling this asynchronously
    });
  
  // Return the cached response immediately, or wait for the network response
  return cachedResponse || fetchPromise;
}

/**
 * Trim a cache to its maximum size, deleting the oldest entries.
 */
async function trimCache(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;

  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  if (requests.length <= limit) return;

  // Delete oldest entries (FIFO)
  const deletePromises = requests
    .slice(0, requests.length - limit)
    .map(req => cache.delete(req));
  await Promise.all(deletePromises);
  console.log(
    `[Service Worker] Trimmed cache ${cacheName} to ${limit} items (removed ${deletePromises.length})`
  );
}

/**
 * Install event - cache core assets
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then(cache => {
        console.log('[Service Worker] Pre-caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate the new service worker immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Pre-cache failed:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  // Get all cache keys
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => {
            // Delete caches that aren't in our current version
            if (!Object.values(CACHE_NAMES).includes(name)) {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => {
        // Claim clients to take control immediately
        return self.clients.claim();
      })
      .catch(error => {
        console.error('[Service Worker] Cache cleanup failed:', error);
      })
  );
});

/**
 * Fetch event - handle network requests with appropriate strategies
 */
self.addEventListener('fetch', event => {
  // Only handle GET requests; skip POST/PUT/PATCH/DELETE to avoid Cache.put errors
  if (event.request.method !== 'GET') {
    return;
  }
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Handle API requests
  const strategy = getStrategy(event.request);
  
  switch (strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(event.request, CACHE_NAMES.static));
      break;
    case 'cache-first-long':
      event.respondWith(cacheFirst(event.request, CACHE_NAMES.images, 604800)); // 7 days
      break;
    case 'network-first':
      event.respondWith(networkFirst(event.request, CACHE_NAMES.pages));
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(event.request, CACHE_NAMES.dynamic));
      break;
    default:
      event.respondWith(networkFirst(event.request));
  }
});

/**
 * Background sync for offline form submissions
 */
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync event:', event.tag);
  
  if (event.tag === 'inquiry-submission') {
    event.waitUntil(syncInquiryData());
  } else if (event.tag === 'message-send') {
    event.waitUntil(syncMessageData());
  } else if (event.tag === 'update-user-profile') {
    event.waitUntil(syncUserProfileData());
  }
});

/**
 * Sync inquiry data that was saved while offline
 */
async function syncInquiryData() {
  try {
    const db = await openIndexedDB();
    const pendingInquiries = await db.getAll('pendingInquiries');
    
    console.log(`[Service Worker] Syncing ${pendingInquiries.length} pending inquiries`);
    
    const syncPromises = pendingInquiries.map(async inquiry => {
      try {
        const response = await fetch('/api/inquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(inquiry.data)
        });
        
        if (response.ok) {
          // Remove from IndexedDB if successful
          await db.delete('pendingInquiries', inquiry.id);
          console.log(`[Service Worker] Successfully synced inquiry ${inquiry.id}`);
          
          // Show a notification that the inquiry was sent
          await showNotification('Inquiry Sent', {
            body: 'Your inquiry has been successfully submitted.',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-96x96.png',
            data: {
              inquiryId: inquiry.id
            }
          });
        } else {
          throw new Error(`Server responded with ${response.status}`);
        }
      } catch (error) {
        console.error(`[Service Worker] Failed to sync inquiry ${inquiry.id}:`, error);
        // Keep it in IndexedDB to try again later
      }
    });
    
    await Promise.all(syncPromises);
  } catch (error) {
    console.error('[Service Worker] Error in syncInquiryData:', error);
  }
}

/**
 * Sync message data that was saved while offline
 */
async function syncMessageData() {
  try {
    const db = await openIndexedDB();
    const pendingMessages = await db.getAll('pendingMessages');
    
    console.log(`[Service Worker] Syncing ${pendingMessages.length} pending messages`);
    
    const syncPromises = pendingMessages.map(async message => {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message.data)
        });
        
        if (response.ok) {
          // Remove from IndexedDB if successful
          await db.delete('pendingMessages', message.id);
          console.log(`[Service Worker] Successfully synced message ${message.id}`);
        } else {
          throw new Error(`Server responded with ${response.status}`);
        }
      } catch (error) {
        console.error(`[Service Worker] Failed to sync message ${message.id}:`, error);
        // Keep it in IndexedDB to try again later
      }
    });
    
    await Promise.all(syncPromises);
  } catch (error) {
    console.error('[Service Worker] Error in syncMessageData:', error);
  }
}

/**
 * Sync user profile data that was saved while offline
 */
async function syncUserProfileData() {
  try {
    const db = await openIndexedDB();
    const pendingProfiles = await db.getAll('pendingProfiles');
    
    console.log(`[Service Worker] Syncing ${pendingProfiles.length} pending profile updates`);
    
    const syncPromises = pendingProfiles.map(async profile => {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profile.data)
        });
        
        if (response.ok) {
          // Remove from IndexedDB if successful
          await db.delete('pendingProfiles', profile.id);
          console.log(`[Service Worker] Successfully synced profile ${profile.id}`);
        } else {
          throw new Error(`Server responded with ${response.status}`);
        }
      } catch (error) {
        console.error(`[Service Worker] Failed to sync profile ${profile.id}:`, error);
        // Keep it in IndexedDB to try again later
      }
    });
    
    await Promise.all(syncPromises);
  } catch (error) {
    console.error('[Service Worker] Error in syncUserProfileData:', error);
  }
}

/**
 * Helper function to open IndexedDB
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CareLinkOfflineDB', 1);
    
    request.onerror = event => {
      reject('IndexedDB error: ' + request.error);
    };
    
    request.onsuccess = event => {
      const db = request.result;
      
      const dbWrapper = {
        getAll: (storeName) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        },
        delete: (storeName, id) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      };
      
      resolve(dbWrapper);
    };
    
    request.onupgradeneeded = event => {
      const db = request.result;
      
      // Create object stores if they don't exist
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
}

/**
 * Push notification event handler
 */
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  let notificationData = {};
  
  try {
    notificationData = event.data.json();
  } catch (error) {
    // If the data isn't JSON, use the text as the body
    notificationData = {
      title: 'CareLink AI',
      body: event.data ? event.data.text() : 'New notification'
    };
  }
  
  const title = notificationData.title || 'CareLink AI';
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: notificationData.badge || '/icons/badge-96x96.png',
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    vibrate: [100, 50, 100],
    timestamp: notificationData.timestamp || Date.now()
  };
  
  event.waitUntil(showNotification(title, options));
});

/**
 * Helper function to show notifications
 */
async function showNotification(title, options) {
  try {
    // Check if we have permission
    const permission = await self.registration.pushManager.permissionState({ userVisibleOnly: true });
    
    if (permission === 'granted') {
      return self.registration.showNotification(title, options);
    } else {
      console.log('[Service Worker] Notification permission not granted');
    }
  } catch (error) {
    console.error('[Service Worker] Error showing notification:', error);
  }
}

/**
 * Notification click event handler
 */
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  let urlToOpen = '/dashboard';
  
  // Handle different notification types
  if (notificationData.type === 'inquiry') {
    urlToOpen = `/dashboard/inquiries/${notificationData.inquiryId}`;
  } else if (notificationData.type === 'message') {
    urlToOpen = `/messages/${notificationData.conversationId}`;
  } else if (notificationData.type === 'home') {
    urlToOpen = `/homes/${notificationData.homeId}`;
  } else if (notificationData.url) {
    urlToOpen = notificationData.url;
  }
  
  // Handle notification action buttons
  if (event.action === 'view') {
    // Use the URL from above
  } else if (event.action === 'dismiss') {
    return; // Just close the notification
  } else if (event.action === 'respond') {
    urlToOpen = `/messages/compose?to=${notificationData.senderId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(error => {
        console.error('[Service Worker] Error handling notification click:', error);
      })
  );
});

/**
 * Periodic background sync for data updates
 */
self.addEventListener('periodicsync', event => {
  console.log('[Service Worker] Periodic Sync:', event.tag);
  
  if (event.tag === 'update-content') {
    event.waitUntil(updateCachedContent());
  } else if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNewNotifications());
  }
});

/**
 * Update cached content in the background
 */
async function updateCachedContent() {
  try {
    // Update frequently changing content
    const urlsToUpdate = [
      '/api/dashboard/stats',
      '/api/inquiries',
      '/api/messages/unread'
    ];
    
    const updatePromises = urlsToUpdate.map(async url => {
      try {
        const cache = await caches.open(CACHE_NAMES.api);
        const request = new Request(url);
        
        // Fetch fresh data
        const response = await fetch(request);
        
        if (response.ok) {
          // Update the cache
          await cache.put(request, response.clone());
          console.log(`[Service Worker] Updated cache for ${url}`);
        }
      } catch (error) {
        console.error(`[Service Worker] Failed to update cache for ${url}:`, error);
      }
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('[Service Worker] Error in updateCachedContent:', error);
  }
}

/**
 * Check for new notifications in the background
 */
async function checkForNewNotifications() {
  try {
    const response = await fetch('/api/notifications/check', {
      headers: {
        'X-Background-Fetch': '1'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.hasNew) {
      // Show a notification about new content
      await showNotification('New Updates', {
        body: `You have ${data.unreadMessages} unread messages and ${data.newInquiries} new inquiry updates.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        data: {
          url: '/dashboard'
        },
        actions: [
          {
            action: 'view',
            title: 'View Updates'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      });
    }
  } catch (error) {
    console.error('[Service Worker] Error checking for notifications:', error);
  }
}

/**
 * Handle service worker updates
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Log service worker version for debugging
console.log('[Service Worker] Version 1.0.1 loaded');
