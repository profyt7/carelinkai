'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  eventId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to Sentry with React component stack
    Sentry.withScope((scope) => {
      scope.setTag('error.boundary', 'component');
      scope.setExtra('componentStack', errorInfo.componentStack);
      scope.setLevel('error');
      const eventId = Sentry.captureException(error);
      this.setState({ eventId });
    });
    
    console.error('[ErrorBoundary] Error caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, eventId: undefined });
  };

  handleFeedback = () => {
    if (this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

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
              We're sorry, but something unexpected happened. Our team has been
              notified and is working on a fix.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <FiRefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="flex items-center justify-center gap-2 border border-neutral-300 bg-white text-neutral-700 px-6 py-3 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
              >
                <FiHome className="w-4 h-4" />
                Go to Homepage
              </button>
              {this.state.eventId && (
                <button
                  onClick={this.handleFeedback}
                  className="text-sm text-neutral-500 hover:text-neutral-700 underline"
                >
                  Report this issue
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
