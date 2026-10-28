/**
 * Client-Side Error Handling Utilities
 * Provides consistent error display and handling on the frontend
 */

import toast from 'react-hot-toast';
import type { ApiErrorResponse } from './api-errors';

/**
 * Extract user-friendly error message from API response
 */
export function getErrorMessage(error: unknown): string {
  // Handle API error responses
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = error as ApiErrorResponse;
    return apiError.error.message;
  }

  // Handle Response objects
  if (error instanceof Response) {
    return `Request failed with status ${error.status}`;
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred';
}

/**
 * Display error toast notification
 */
export function showErrorToast(error: unknown, fallbackMessage?: string) {
  const message = getErrorMessage(error) || fallbackMessage || 'Something went wrong';
  toast.error(message);
}

/**
 * Display success toast notification
 */
export function showSuccessToast(message: string) {
  toast.success(message);
}

/**
 * Display info toast notification
 */
export function showInfoToast(message: string) {
  toast(message, {
    icon: 'ℹ️',
  });
}

/**
 * Display loading toast with promise
 */
export function showLoadingToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error?: string;
  }
): Promise<T> {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (err) => getErrorMessage(err) || messages.error || 'Operation failed',
  });
}

/**
 * Handle API errors and display appropriate feedback
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw errorData;
  }

  return response.json();
}
