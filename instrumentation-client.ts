// This file configures the initialization of Bugsnag on the browser.
// The config you add here will be used whenever a user loads a page in their browser.
import { initializeBugsnagClient } from '@/lib/bugsnag-client';

// Initialize Bugsnag client on page load
if (typeof window !== 'undefined') {
  initializeBugsnagClient();
}
