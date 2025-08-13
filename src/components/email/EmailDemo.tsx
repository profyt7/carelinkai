/**
 * Email Demo Component
 * 
 * A comprehensive demo component for testing the email functionality in CareLinkAI.
 * This component showcases different email types, provides forms for testing,
 * and displays email history/logs.
 */

import React, { useState, useEffect } from 'react';
import { useEmail } from '@/hooks/useEmail';
import type { EmailResponse } from '@/hooks/useEmail';
import { Tab } from '@headlessui/react';
import { FiMail, FiSend, FiAlertCircle, FiCalendar, FiFile, FiCode, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';

// Tab types for the email demo
type EmailTab = 'welcome' | 'notification' | 'appointment' | 'document' | 'custom' | 'history';

// Interface for email history entries
interface EmailHistoryEntry {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export default function EmailDemo() {
  // Use the email hook
  const {
    loading,
    error,
    lastResponse,
    sendWelcomeEmail,
    sendNotificationEmail,
    sendAppointmentEmail,
    sendDocumentSharedEmail,
    sendCustomEmail,
    isAuthenticated,
  } = useEmail();

  // State for email history
  const [emailHistory, setEmailHistory] = useState<EmailHistoryEntry[]>([]);
  
  // State for the selected tab
  const [selectedTab, setSelectedTab] = useState<EmailTab>('welcome');

  // Form states for each email type
  const [welcomeForm, setWelcomeForm] = useState({
    recipient: '',
    firstName: '',
    lastName: '',
    verificationUrl: `${
      typeof window !== 'undefined' ? window.location.origin : ''
    }/verify?token=demo-token-123`,
  });

  const [notificationForm, setNotificationForm] = useState({
    recipient: '',
    subject: 'Important Update from CareLinkAI',
    message: 'We have an important update regarding your account.',
    firstName: '',
    actionUrl: `${
      typeof window !== 'undefined' ? window.location.origin : ''
    }/dashboard`,
    actionText: 'View Details',
    category: 'account',
  });

  const [appointmentForm, setAppointmentForm] = useState({
    recipient: '',
    firstName: '',
    appointmentType: 'Care Consultation',
    dateTime: format(new Date().setDate(new Date().getDate() + 3), "yyyy-MM-dd'T'HH:mm"),
    location: 'CareLinkAI Office, Suite 200',
    virtualMeetingUrl: 'https://meet.carelinkai.com/demo-meeting',
    notes: 'Please bring any relevant medical records.',
    isVirtual: true,
  });

  const [documentForm, setDocumentForm] = useState({
    recipient: '',
    firstName: '',
    sharedBy: 'CareLinkAI Team',
    documentName: 'Care Assessment Report',
    documentUrl: `${
      typeof window !== 'undefined' ? window.location.origin : ''
    }/documents/demo-document`,
    message: 'Here is the care assessment report we discussed.',
  });

  const [customForm, setCustomForm] = useState({
    recipient: '',
    subject: 'Custom Email from CareLinkAI',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h1 style="color: #3b82f6; margin-bottom: 20px;">CareLinkAI Custom Email</h1>
  <p style="margin-bottom: 16px;">Hello,</p>
  <p style="margin-bottom: 16px;">This is a custom HTML email from CareLinkAI. You can use this to test the custom email functionality.</p>
  <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
    <p style="margin: 0; font-weight: bold;">This is a sample notification box</p>
    <p style="margin: 8px 0 0 0;">You can customize this email with your own HTML content.</p>
  </div>
  <a href="${
      typeof window !== 'undefined' ? window.location.origin : ''
    }" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Visit CareLinkAI</a>
  <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">This is a demo email sent from the CareLinkAI Email Demo component.</p>
</div>`,
  });

  // Add to email history when an email is sent
  const addToHistory = (
    type: string,
    recipient: string,
    subject: string,
    response: EmailResponse
  ) => {
    const newEntry: EmailHistoryEntry = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      recipient,
      subject,
      timestamp: new Date(),
      success: response.success,
      error: response.error,
    };

    setEmailHistory(prevHistory => [newEntry, ...prevHistory]);
  };

  // Handle form submissions for each email type
  const handleWelcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { recipient, firstName, lastName, verificationUrl } = welcomeForm;
    const response = await sendWelcomeEmail(recipient, firstName, {
      lastName,
      verificationUrl,
    });
    addToHistory('welcome', recipient, 'Welcome to CareLinkAI', response);
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { recipient, subject, message, firstName, actionUrl, actionText, category } = notificationForm;
    const response = await sendNotificationEmail(recipient, subject, message, firstName, {
      actionUrl,
      actionText,
      category,
    });
    addToHistory('notification', recipient, subject, response);
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      recipient,
      firstName,
      appointmentType,
      dateTime,
      location,
      virtualMeetingUrl,
      notes,
      isVirtual,
    } = appointmentForm;

    const response = await sendAppointmentEmail(
      recipient,
      firstName,
      appointmentType,
      new Date(dateTime),
      {
        location: isVirtual ? undefined : location,
        virtualMeetingUrl: isVirtual ? virtualMeetingUrl : undefined,
        notes,
      }
    );
    addToHistory('appointment', recipient, `${appointmentType} Appointment Confirmation`, response);
  };

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { recipient, firstName, sharedBy, documentName, documentUrl, message } = documentForm;
    const response = await sendDocumentSharedEmail(
      recipient,
      firstName,
      sharedBy,
      documentName,
      documentUrl,
      { message }
    );
    addToHistory('document', recipient, `${sharedBy} shared a document with you: ${documentName}`, response);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { recipient, subject, html } = customForm;
    const response = await sendCustomEmail(recipient, subject, html);
    addToHistory('custom', recipient, subject, response);
  };

  // Clear email history
  const clearHistory = () => {
    setEmailHistory([]);
  };

  // Tabs configuration (memoized to maintain stable reference)
  const tabs = React.useMemo(() => ([
    { key: 'welcome', label: 'Welcome Email', icon: <FiMail /> },
    { key: 'notification', label: 'Notification', icon: <FiAlertCircle /> },
    { key: 'appointment', label: 'Appointment', icon: <FiCalendar /> },
    { key: 'document', label: 'Document Sharing', icon: <FiFile /> },
    { key: 'custom', label: 'Custom HTML', icon: <FiCode /> },
    { key: 'history', label: 'Email History', icon: <FiClock /> },
  ]), []);

  // Safely compute currently selected tab index
  const selectedTabIndex = React.useMemo(() => {
    const i = tabs.findIndex(t => t.key === selectedTab);
    return i >= 0 ? i : 0;
  }, [tabs, selectedTab]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Email Notification System</h2>

      {!isAuthenticated ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-6">
          <p className="text-yellow-700 flex items-center">
            <FiAlertCircle className="mr-2" />
            You need to be signed in to send emails. Please sign in to test the email functionality.
          </p>
        </div>
      ) : null}

      <Tab.Group
        selectedIndex={selectedTabIndex}
        onChange={(index) =>
          setSelectedTab((tabs[index]?.key as EmailTab) || 'welcome')
        }
      >
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-50 p-1 mb-6">
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                ${selected
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-blue-700 hover:bg-blue-100 hover:text-blue-800'
                } flex items-center justify-center transition-all`
              }
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-2">
          {/* Welcome Email Form */}
          <Tab.Panel>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Welcome Email</h3>
              <form onSubmit={handleWelcomeSubmit} className="space-y-4">
                <div>
                  <label htmlFor="welcome-recipient" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email*
                  </label>
                  <input
                    type="email"
                    id="welcome-recipient"
                    value={welcomeForm.recipient}
                    onChange={(e) => setWelcomeForm({ ...welcomeForm, recipient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="welcome-firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name*
                  </label>
                  <input
                    type="text"
                    id="welcome-firstName"
                    value={welcomeForm.firstName}
                    onChange={(e) => setWelcomeForm({ ...welcomeForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="welcome-lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="welcome-lastName"
                    value={welcomeForm.lastName}
                    onChange={(e) => setWelcomeForm({ ...welcomeForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="welcome-verificationUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Verification URL
                  </label>
                  <input
                    type="text"
                    id="welcome-verificationUrl"
                    value={welcomeForm.verificationUrl}
                    onChange={(e) => setWelcomeForm({ ...welcomeForm, verificationUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isAuthenticated}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      (loading || !isAuthenticated) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend className="mr-2" />
                        Send Welcome Email
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Tab.Panel>

          {/* Notification Email Form */}
          <Tab.Panel>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Notification Email</h3>
              <form onSubmit={handleNotificationSubmit} className="space-y-4">
                <div>
                  <label htmlFor="notification-recipient" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email*
                  </label>
                  <input
                    type="email"
                    id="notification-recipient"
                    value={notificationForm.recipient}
                    onChange={(e) => setNotificationForm({ ...notificationForm, recipient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="notification-firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name*
                  </label>
                  <input
                    type="text"
                    id="notification-firstName"
                    value={notificationForm.firstName}
                    onChange={(e) => setNotificationForm({ ...notificationForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="notification-subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject*
                  </label>
                  <input
                    type="text"
                    id="notification-subject"
                    value={notificationForm.subject}
                    onChange={(e) => setNotificationForm({ ...notificationForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="notification-message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message*
                  </label>
                  <textarea
                    id="notification-message"
                    rows={3}
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="notification-actionUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Action URL
                    </label>
                    <input
                      type="text"
                      id="notification-actionUrl"
                      value={notificationForm.actionUrl}
                      onChange={(e) => setNotificationForm({ ...notificationForm, actionUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="notification-actionText" className="block text-sm font-medium text-gray-700 mb-1">
                      Action Text
                    </label>
                    <input
                      type="text"
                      id="notification-actionText"
                      value={notificationForm.actionText}
                      onChange={(e) => setNotificationForm({ ...notificationForm, actionText: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="notification-category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="notification-category"
                    value={notificationForm.category}
                    onChange={(e) => setNotificationForm({ ...notificationForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="account">Account</option>
                    <option value="billing">Billing</option>
                    <option value="care">Care</option>
                    <option value="family">Family</option>
                    <option value="facility">Facility</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isAuthenticated}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      (loading || !isAuthenticated) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend className="mr-2" />
                        Send Notification
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Tab.Panel>

          {/* Appointment Email Form */}
          <Tab.Panel>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Appointment Confirmation</h3>
              <form onSubmit={handleAppointmentSubmit} className="space-y-4">
                <div>
                  <label htmlFor="appointment-recipient" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email*
                  </label>
                  <input
                    type="email"
                    id="appointment-recipient"
                    value={appointmentForm.recipient}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, recipient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="appointment-firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name*
                  </label>
                  <input
                    type="text"
                    id="appointment-firstName"
                    value={appointmentForm.firstName}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="appointment-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Appointment Type*
                  </label>
                  <select
                    id="appointment-type"
                    value={appointmentForm.appointmentType}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="Care Consultation">Care Consultation</option>
                    <option value="Facility Tour">Facility Tour</option>
                    <option value="Family Meeting">Family Meeting</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Assessment">Assessment</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="appointment-dateTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time*
                  </label>
                  <input
                    type="datetime-local"
                    id="appointment-dateTime"
                    value={appointmentForm.dateTime}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, dateTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="appointment-isVirtual"
                      checked={appointmentForm.isVirtual}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, isVirtual: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="appointment-isVirtual" className="ml-2 block text-sm font-medium text-gray-700">
                      Virtual Meeting
                    </label>
                  </div>
                </div>
                {appointmentForm.isVirtual ? (
                  <div>
                    <label htmlFor="appointment-virtualUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Virtual Meeting URL*
                    </label>
                    <input
                      type="text"
                      id="appointment-virtualUrl"
                      value={appointmentForm.virtualMeetingUrl}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, virtualMeetingUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required={appointmentForm.isVirtual}
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="appointment-location" className="block text-sm font-medium text-gray-700 mb-1">
                      Location*
                    </label>
                    <input
                      type="text"
                      id="appointment-location"
                      value={appointmentForm.location}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required={!appointmentForm.isVirtual}
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="appointment-notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="appointment-notes"
                    rows={3}
                    value={appointmentForm.notes}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isAuthenticated}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      (loading || !isAuthenticated) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend className="mr-2" />
                        Send Appointment Confirmation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Tab.Panel>

          {/* Document Sharing Email Form */}
          <Tab.Panel>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Document Sharing Notification</h3>
              <form onSubmit={handleDocumentSubmit} className="space-y-4">
                <div>
                  <label htmlFor="document-recipient" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email*
                  </label>
                  <input
                    type="email"
                    id="document-recipient"
                    value={documentForm.recipient}
                    onChange={(e) => setDocumentForm({ ...documentForm, recipient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="document-firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name*
                  </label>
                  <input
                    type="text"
                    id="document-firstName"
                    value={documentForm.firstName}
                    onChange={(e) => setDocumentForm({ ...documentForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="document-sharedBy" className="block text-sm font-medium text-gray-700 mb-1">
                    Shared By*
                  </label>
                  <input
                    type="text"
                    id="document-sharedBy"
                    value={documentForm.sharedBy}
                    onChange={(e) => setDocumentForm({ ...documentForm, sharedBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="document-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name*
                  </label>
                  <input
                    type="text"
                    id="document-name"
                    value={documentForm.documentName}
                    onChange={(e) => setDocumentForm({ ...documentForm, documentName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="document-url" className="block text-sm font-medium text-gray-700 mb-1">
                    Document URL*
                  </label>
                  <input
                    type="text"
                    id="document-url"
                    value={documentForm.documentUrl}
                    onChange={(e) => setDocumentForm({ ...documentForm, documentUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="document-message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="document-message"
                    rows={3}
                    value={documentForm.message}
                    onChange={(e) => setDocumentForm({ ...documentForm, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isAuthenticated}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      (loading || !isAuthenticated) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend className="mr-2" />
                        Send Document Notification
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Tab.Panel>

          {/* Custom HTML Email Form */}
          <Tab.Panel>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Send Custom HTML Email</h3>
              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div>
                  <label htmlFor="custom-recipient" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email*
                  </label>
                  <input
                    type="email"
                    id="custom-recipient"
                    value={customForm.recipient}
                    onChange={(e) => setCustomForm({ ...customForm, recipient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="custom-subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject*
                  </label>
                  <input
                    type="text"
                    id="custom-subject"
                    value={customForm.subject}
                    onChange={(e) => setCustomForm({ ...customForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="custom-html" className="block text-sm font-medium text-gray-700 mb-1">
                    HTML Content*
                  </label>
                  <textarea
                    id="custom-html"
                    rows={10}
                    value={customForm.html}
                    onChange={(e) => setCustomForm({ ...customForm, html: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                  <div className="border border-gray-300 rounded-md p-4 bg-white">
                    <div dangerouslySetInnerHTML={{ __html: customForm.html }} />
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isAuthenticated}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      (loading || !isAuthenticated) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend className="mr-2" />
                        Send Custom Email
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Tab.Panel>

          {/* Email History/Logs */}
          <Tab.Panel>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Email History</h3>
                <button
                  onClick={clearHistory}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Clear History
                </button>
              </div>
              
              {emailHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiMail className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm">No emails have been sent yet.</p>
                  <p className="text-sm">Use the forms above to send emails and track them here.</p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6">Type</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">Recipient</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">Subject</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">Time</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {emailHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {entry.type === 'welcome' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Welcome</span>}
                            {entry.type === 'notification' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Notification</span>}
                            {entry.type === 'appointment' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Appointment</span>}
                            {entry.type === 'document' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Document</span>}
                            {entry.type === 'custom' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Custom</span>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{entry.recipient}</td>
                          <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">{entry.subject}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {format(entry.timestamp, 'MMM d, yyyy h:mm a')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {entry.success ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={entry.error}>
                                Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* Error display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-1">Error</h4>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
