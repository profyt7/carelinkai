/**
 * Mock Mode Utilities
 * 
 * Centralized utilities for checking if mock data should be shown.
 * 
 * PRODUCTION BEHAVIOR: Mock mode is OFF by default
 * Mock mode can only be enabled via:
 * 1. Cookie: carelink_mock_mode=1 (admin runtime toggle)
 * 2. Environment variable: SHOW_SITE_MOCKS=1 (server-side only)
 * 
 * NOTE: NEXT_PUBLIC_SHOW_MOCK_DASHBOARD is IGNORED to prevent accidental enablement
 * 
 * Priority: Cookie > SHOW_SITE_MOCKS > Default (false)
 */

/**
 * Check if mock mode is enabled from a Next.js request
 * 
 * @param request - Next.js Request object or headers
 * @returns true if mock mode is enabled, false otherwise
 */
export function isMockModeEnabled(request: Request | { cookies?: any }): boolean {
  try {
    // 1) Check cookie first (runtime toggle takes precedence)
    let cookieValue = '';
    
    if (request instanceof Request) {
      // For standard Request objects, parse cookies from headers
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const mockCookie = cookies.find(c => c.startsWith('carelink_mock_mode='));
        if (mockCookie) {
          cookieValue = mockCookie.split('=')[1]?.trim().toLowerCase() || '';
        }
      }
    } else if (request.cookies?.get) {
      // For Next.js request objects with cookies API
      cookieValue = request.cookies.get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
    }
    
    // Cookie explicitly enables mock mode
    if (['1', 'true', 'yes', 'on'].includes(cookieValue)) {
      return true;
    }
    
    // Cookie explicitly disables mock mode
    if (['0', 'false', 'no', 'off'].includes(cookieValue)) {
      return false;
    }
    
    // 2) Fallback to SHOW_SITE_MOCKS environment variable only
    // NOTE: NEXT_PUBLIC_SHOW_MOCK_DASHBOARD is intentionally ignored
    const envValue = (process.env['SHOW_SITE_MOCKS'] ?? '').toString().trim().toLowerCase();
    
    return ['1', 'true', 'yes', 'on'].includes(envValue);
  } catch (error) {
    // If there's any error reading cookies/env, default to false (safe)
    console.error('Error checking mock mode:', error);
    return false;
  }
}

/**
 * Check if mock mode is enabled from server-side cookies (Next.js App Router)
 * 
 * @param cookies - Next.js cookies() function result from 'next/headers'
 * @returns true if mock mode is enabled, false otherwise
 */
export function isMockModeEnabledFromCookies(cookies: any): boolean {
  try {
    const mockCookie = cookies.get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
    
    // Cookie explicitly enables mock mode
    if (['1', 'true', 'yes', 'on'].includes(mockCookie)) {
      return true;
    }
    
    // Cookie explicitly disables mock mode
    if (['0', 'false', 'no', 'off'].includes(mockCookie)) {
      return false;
    }
    
    // Fallback to SHOW_SITE_MOCKS only
    const envValue = (process.env['SHOW_SITE_MOCKS'] ?? '').toString().trim().toLowerCase();
    
    return ['1', 'true', 'yes', 'on'].includes(envValue);
  } catch (error) {
    console.error('Error checking mock mode from cookies:', error);
    return false;
  }
}
