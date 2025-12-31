'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
              <FiAlertTriangle className="text-red-600 text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-800 mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-neutral-600 mb-6">
              We're sorry, but something unexpected happened. Our team has been notified and is working on a fix.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
