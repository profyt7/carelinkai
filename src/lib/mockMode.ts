/**
 * Mock Mode Utilities
 * 
 * Centralized utilities for checking if mock data should be shown.
 * Mock mode can be enabled via:
 * 1. Cookie: carelink_mock_mode=1 (set by /api/mock-mode or ?mock=1 query param)
 * 2. Environment variables: SHOW_SITE_MOCKS or NEXT_PUBLIC_SHOW_MOCK_DASHBOARD
 * 
 * Priority: Cookie > Environment > Default (false)
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
    
    const cookieEnabled = ['1', 'true', 'yes', 'on'].includes(cookieValue);
    if (cookieEnabled) {
      return true;
    }
    
    // 2) Fallback to environment variables
    const envValue = (
      process.env['SHOW_SITE_MOCKS'] ?? 
      process.env['NEXT_PUBLIC_SHOW_MOCK_DASHBOARD'] ?? 
      ''
    ).toString().trim().toLowerCase();
    
    const envEnabled = ['1', 'true', 'yes', 'on'].includes(envValue);
    
    return envEnabled;
  } catch (error) {
    // If there's any error reading cookies/env, default to false
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
    const cookieEnabled = ['1', 'true', 'yes', 'on'].includes(mockCookie);
    
    if (cookieEnabled) {
      return true;
    }
    
    // Fallback to environment variables
    const envValue = (
      process.env['SHOW_SITE_MOCKS'] ?? 
      process.env['NEXT_PUBLIC_SHOW_MOCK_DASHBOARD'] ?? 
      ''
    ).toString().trim().toLowerCase();
    
    return ['1', 'true', 'yes', 'on'].includes(envValue);
  } catch (error) {
    console.error('Error checking mock mode from cookies:', error);
    return false;
  }
}
