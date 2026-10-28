/**
 * useEmail Hook
 * 
 * A React hook for sending emails through the CareLinkAI email API.
 * Features:
 * - Type-safe email templates
 * - Loading and error state management
 * - Support for all email types
 * - Bulk email sending capability
 * - Authentication integration
 */

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

// Base types for email requests
interface BaseEmailRequest {
  to: string | string[] | { email: string; name?: string } | Array<{ email: string; name?: string }>;
  subject: string;
  category?: string;
}

// Custom email with HTML content
interface CustomEmailRequest extends BaseEmailRequest {
  type: 'custom';
  html: string;
  text?: string;
}

// Welcome email template
interface WelcomeEmailRequest extends BaseEmailRequest {
  type: 'welcome';
  templateData: {
    firstName: string;
    lastName?: string;
    verificationUrl?: string;
  };
}

// Password reset email template
interface PasswordResetEmailRequest extends BaseEmailRequest {
  type: 'password-reset';
  templateData: {
    firstName: string;
    resetUrl: string;
    expiresInMinutes?: number;
  };
}

// General notification email template
interface NotificationEmailRequest extends BaseEmailRequest {
  type: 'notification';
  templateData: {
    firstName: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    category?: string;
  };
}

// Appointment confirmation email template
interface AppointmentEmailRequest extends BaseEmailRequest {
  type: 'appointment';
  templateData: {
    firstName: string;
    appointmentType: string;
    dateTime: string | Date;
    location?: string;
    virtualMeetingUrl?: string;
    notes?: string;
    calendarLink?: string;
  };
}

// Document shared email template
interface DocumentSharedEmailRequest extends BaseEmailRequest {
  type: 'document-shared';
  templateData: {
    firstName: string;
    sharedBy: string;
    documentName: string;
    documentUrl: string;
    message?: string;
  };
}

// Union type for all email request types
export type EmailRequest = 
  | CustomEmailRequest
  | WelcomeEmailRequest
  | PasswordResetEmailRequest
  | NotificationEmailRequest
  | AppointmentEmailRequest
  | DocumentSharedEmailRequest;

// Bulk email request type
export interface BulkEmailRequest {
  emails: EmailRequest[];
}

// Response types
export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkEmailResponse {
  success: boolean;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  results: EmailResponse[];
}

/**
 * React hook for sending emails through the CareLinkAI API
 */
export function useEmail() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<EmailResponse | BulkEmailResponse | null>(null);

  /**
   * Generic function to send any type of email
   */
  const sendEmail = useCallback(
    async (emailRequest: EmailRequest): Promise<EmailResponse> => {
      if (!session) {
        const error = 'Authentication required to send emails';
        setError(error);
        return { success: false, error };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailRequest),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send email');
        }

        setLastResponse(data);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  /**
   * Send multiple emails in bulk
   */
  const sendBulkEmails = useCallback(
    async (bulkRequest: BulkEmailRequest): Promise<BulkEmailResponse> => {
      if (!session) {
        const error = 'Authentication required to send emails';
        setError(error);
        return { 
          success: false, 
          summary: { total: 0, successful: 0, failed: 0 },
          results: [],
          error 
        } as BulkEmailResponse;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bulkRequest),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send bulk emails');
        }

        setLastResponse(data);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        return { 
          success: false,
          summary: { total: bulkRequest.emails.length, successful: 0, failed: bulkRequest.emails.length },
          results: bulkRequest.emails.map(() => ({ success: false, error: errorMessage })),
        };
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  /**
   * Send a welcome email
   */
  const sendWelcomeEmail = useCallback(
    async (
      to: string | string[],
      firstName: string,
      options?: {
        lastName?: string;
        verificationUrl?: string;
        subject?: string;
      }
    ): Promise<EmailResponse> => {
      const request: WelcomeEmailRequest = {
        type: 'welcome',
        to,
        subject: options?.subject || 'Welcome to CareLinkAI',
        templateData: {
          firstName,
          lastName: options?.lastName,
          verificationUrl: options?.verificationUrl,
        },
      };

      const response = await sendEmail(request);
      
      if (response.success) {
        toast.success(`Welcome email sent to ${Array.isArray(to) ? to.join(', ') : to}`);
      } else {
        toast.error(`Failed to send welcome email: ${response.error}`);
      }
      
      return response;
    },
    [sendEmail]
  );

  /**
   * Send a password reset email
   */
  const sendPasswordResetEmail = useCallback(
    async (
      to: string,
      firstName: string,
      resetUrl: string,
      options?: {
        expiresInMinutes?: number;
        subject?: string;
      }
    ): Promise<EmailResponse> => {
      const request: PasswordResetEmailRequest = {
        type: 'password-reset',
        to,
        subject: options?.subject || 'Reset Your CareLinkAI Password',
        templateData: {
          firstName,
          resetUrl,
          expiresInMinutes: options?.expiresInMinutes || 30,
        },
      };

      const response = await sendEmail(request);
      
      if (response.success) {
        toast.success('Password reset email sent');
      } else {
        toast.error(`Failed to send password reset email: ${response.error}`);
      }
      
      return response;
    },
    [sendEmail]
  );

  /**
   * Send a notification email
   */
  const sendNotificationEmail = useCallback(
    async (
      to: string | string[],
      subject: string,
      message: string,
      firstName: string,
      options?: {
        actionUrl?: string;
        actionText?: string;
        category?: string;
      }
    ): Promise<EmailResponse> => {
      const request: NotificationEmailRequest = {
        type: 'notification',
        to,
        subject,
        category: options?.category,
        templateData: {
          firstName,
          message,
          actionUrl: options?.actionUrl,
          actionText: options?.actionText,
          category: options?.category,
        },
      };

      const response = await sendEmail(request);
      
      if (response.success) {
        toast.success(`Notification sent to ${Array.isArray(to) ? to.join(', ') : to}`);
      } else {
        toast.error(`Failed to send notification: ${response.error}`);
      }
      
      return response;
    },
    [sendEmail]
  );

  /**
   * Send an appointment confirmation email
   */
  const sendAppointmentEmail = useCallback(
    async (
      to: string,
      firstName: string,
      appointmentType: string,
      dateTime: Date | string,
      options?: {
        location?: string;
        virtualMeetingUrl?: string;
        notes?: string;
        calendarLink?: string;
        subject?: string;
      }
    ): Promise<EmailResponse> => {
      const request: AppointmentEmailRequest = {
        type: 'appointment',
        to,
        subject: options?.subject || `Your ${appointmentType} Appointment Confirmation`,
        templateData: {
          firstName,
          appointmentType,
          dateTime,
          location: options?.location,
          virtualMeetingUrl: options?.virtualMeetingUrl,
          notes: options?.notes,
          calendarLink: options?.calendarLink,
        },
      };

      const response = await sendEmail(request);
      
      if (response.success) {
        toast.success(`Appointment confirmation sent to ${to}`);
      } else {
        toast.error(`Failed to send appointment confirmation: ${response.error}`);
      }
      
      return response;
    },
    [sendEmail]
  );

  /**
   * Send a document shared notification email
   */
  const sendDocumentSharedEmail = useCallback(
    async (
      to: string,
      firstName: string,
      sharedBy: string,
      documentName: string,
      documentUrl: string,
      options?: {
        message?: string;
        subject?: string;
      }
    ): Promise<EmailResponse> => {
      const request: DocumentSharedEmailRequest = {
        type: 'document-shared',
        to,
        subject: options?.subject || `${sharedBy} shared a document with you: ${documentName}`,
        templateData: {
          firstName,
          sharedBy,
          documentName,
          documentUrl,
          message: options?.message,
        },
      };

      const response = await sendEmail(request);
      
      if (response.success) {
        toast.success(`Document sharing notification sent to ${to}`);
      } else {
        toast.error(`Failed to send document sharing notification: ${response.error}`);
      }
      
      return response;
    },
    [sendEmail]
  );

  /**
   * Send a custom HTML email
   */
  const sendCustomEmail = useCallback(
    async (
      to: string | string[],
      subject: string,
      html: string,
      options?: {
        text?: string;
        category?: string;
      }
    ): Promise<EmailResponse> => {
      const request: CustomEmailRequest = {
        type: 'custom',
        to,
        subject,
        html,
        text: options?.text,
        category: options?.category,
      };

      const response = await sendEmail(request);
      
      if (response.success) {
        toast.success(`Email sent to ${Array.isArray(to) ? to.join(', ') : to}`);
      } else {
        toast.error(`Failed to send email: ${response.error}`);
      }
      
      return response;
    },
    [sendEmail]
  );

  /**
   * Clear any errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setError(null);
    setLastResponse(null);
    setLoading(false);
  }, []);

  return {
    // State
    loading,
    error,
    lastResponse,
    
    // Core methods
    sendEmail,
    sendBulkEmails,
    
    // Helper methods for specific email types
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendNotificationEmail,
    sendAppointmentEmail,
    sendDocumentSharedEmail,
    sendCustomEmail,
    
    // Utility methods
    clearError,
    reset,
    
    // Authentication status
    isAuthenticated: !!session,
  };
}

export default useEmail;
