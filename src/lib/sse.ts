/**
 * Server-Sent Events (SSE) utility for real-time updates
 * 
 * This is a stub implementation to satisfy imports during build.
 * Full SSE functionality can be implemented later as needed.
 */

export interface SSEEvent {
  type: string;
  [key: string]: any;
}

/**
 * Publish an event to a channel
 * @param channel - Channel identifier (e.g., "family:123")
 * @param event - Event data to publish
 */
export function publish(channel: string, event: SSEEvent): void {
  // Stub implementation - logs event but doesn't actually publish
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SSE] Publishing to ${channel}:`, event);
  }
  
  // TODO: Implement actual SSE publishing when needed
  // This could involve:
  // - Maintaining a Map of active connections per channel
  // - Broadcasting events to all subscribed clients
  // - Handling connection lifecycle
}

/**
 * Subscribe to events on a channel
 * @param channel - Channel identifier
 * @param callback - Function to call when events are received
 */
export function subscribe(channel: string, callback: (event: SSEEvent) => void): () => void {
  // Stub implementation - returns no-op unsubscribe function
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SSE] Subscribed to ${channel}`);
  }
  
  // Return unsubscribe function
  return () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SSE] Unsubscribed from ${channel}`);
    }
  };
}

export default {
  publish,
  subscribe,
};
