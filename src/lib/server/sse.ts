/**
 * Server-Sent Events (SSE) implementation for Next.js route handlers
 * 
 * This module provides a lightweight in-memory pub/sub system for SSE
 * that works with Next.js route handlers running in the Node.js runtime.
 * It uses web streams for compatibility and doesn't depend on Node-specific APIs.
 */

// Store subscribers by topic
const subscribers = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Format a message as an SSE event
 * 
 * @param event - The event name
 * @param data - Optional data to include with the event (will be JSON stringified)
 * @returns Encoded SSE message as Uint8Array
 */
function formatSSE(event: string, data?: any): Uint8Array {
  let message = `event: ${event}\n`;
  
  if (data !== undefined) {
    message += `data: ${JSON.stringify(data)}\n`;
  }
  
  message += '\n';
  
  // Convert string to Uint8Array using TextEncoder
  return new TextEncoder().encode(message);
}

/**
 * Send a comment line for keep-alive purposes
 * 
 * @param controller - Stream controller to send the heartbeat to
 */
export function sendHeartbeat(controller: ReadableStreamDefaultController): void {
  try {
    controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
  } catch (error) {
    // If we can't send a heartbeat, the connection is likely dead
    console.error("Failed to send heartbeat, connection may be closed", error);
  }
}

/**
 * Subscribe to one or more topics
 * 
 * @param topics - Array of topic names to subscribe to
 * @param controller - ReadableStream controller to send events to
 * @returns Object with unsubscribe method
 */
export function subscribe(
  topics: string[],
  controller: ReadableStreamDefaultController
): { unsubscribe: () => void } {
  // Add controller to each topic's subscriber set
  for (const topic of topics) {
    if (!subscribers.has(topic)) {
      subscribers.set(topic, new Set());
    }
    
    subscribers.get(topic)!.add(controller);
  }
  
  // Return unsubscribe function that removes this controller from all topics
  return {
    unsubscribe: () => {
      for (const topic of topics) {
        const topicSubscribers = subscribers.get(topic);
        if (topicSubscribers) {
          topicSubscribers.delete(controller);
          
          // Clean up empty subscriber sets
          if (topicSubscribers.size === 0) {
            subscribers.delete(topic);
          }
        }
      }
    }
  };
}

/**
 * Publish an event to all subscribers of a topic
 * 
 * @param topic - Topic name to publish to
 * @param event - Event name
 * @param data - Optional data to include with the event
 */
export function publish(topic: string, event: string, data?: any): void {
  const topicSubscribers = subscribers.get(topic);
  
  if (!topicSubscribers || topicSubscribers.size === 0) {
    return; // No subscribers for this topic
  }
  
  // Format the SSE message once
  const message = formatSSE(event, data);
  
  // Send to all subscribers, removing any that error
  const deadControllers = new Set<ReadableStreamDefaultController>();
  
  for (const controller of topicSubscribers) {
    try {
      controller.enqueue(message);
    } catch (error) {
      // If enqueue fails, the controller is likely dead
      console.error(`Failed to send event to subscriber: ${error}`);
      deadControllers.add(controller);
    }
  }
  
  // Clean up dead controllers
  if (deadControllers.size > 0) {
    for (const controller of deadControllers) {
      topicSubscribers.delete(controller);
    }
    
    // Clean up empty subscriber sets
    if (topicSubscribers.size === 0) {
      subscribers.delete(topic);
    }
  }
}

/**
 * Get the current number of subscribers for a topic
 * 
 * @param topic - Topic name
 * @returns Number of subscribers
 */
export function getSubscriberCount(topic: string): number {
  return subscribers.get(topic)?.size || 0;
}
