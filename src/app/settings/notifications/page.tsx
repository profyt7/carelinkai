'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NotificationsSettingsPage() {
  // State for preferences
  const [preferences, setPreferences] = useState<any>(null);
  const [originalPreferences, setOriginalPreferences] = useState<any>(null);
  
  // State for role and org preferences
  const [role, setRole] = useState<string | null>(null);
  const [orgPreferences, setOrgPreferences] = useState<any>(null);
  const [orgOriginalPreferences, setOrgOriginalPreferences] = useState<any>(null);
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Org UI states
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaveSuccess, setOrgSaveSuccess] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  
  // Fetch user preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/profile/preferences');
        
        if (!response.ok) {
          throw new Error('Failed to load notification preferences');
        }
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.preferences) {
          // Store user role
          if (data.data.role) {
            setRole(data.data.role);
          }
          
          // Initialize with defaults if sections don't exist
          const prefs = data.data.preferences;
          
          // Ensure notification structure exists
          if (!prefs.notifications) {
            prefs.notifications = {};
          }
          
          // Ensure channels structure exists
          if (!prefs.notifications.channels) {
            prefs.notifications.channels = {};
          }
          
          // Ensure mentions structure exists with defaults
          if (!prefs.notifications.channels.mentions) {
            prefs.notifications.channels.mentions = {
              toast: true,
              inApp: true,
              email: true
            };
          }
          
          // Ensure digest structure exists
          if (!prefs.notifications.digest) {
            prefs.notifications.digest = {
              enabled: false,
              timeOfDay: '09:00',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              frequency: 'DAILY'
            };
          }
          
          // Ensure mutes structure exists
          if (!prefs.notifications.mutes) {
            prefs.notifications.mutes = {
              threads: []
            };
          }
          // Ensure reminders structure exists
          if (!prefs.notifications.reminders) {
            prefs.notifications.reminders = {
              channels: { email: true, push: true, sms: false },
              offsets: [1440, 60]
            };
          }
          
          setPreferences(prefs);
          setOriginalPreferences(JSON.parse(JSON.stringify(prefs))); // Deep copy for comparison
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching preferences:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPreferences();
  }, []);
  
  // Fetch operator preferences if user is an operator
  useEffect(() => {
    async function fetchOperatorPreferences() {
      if (role !== 'OPERATOR') return;
      
      try {
        const response = await fetch('/api/operator/preferences');
        
        if (!response.ok) {
          throw new Error('Failed to load operator preferences');
        }
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.preferences) {
          const prefs = data.data.preferences;
          
          // Ensure notifications structure exists
          if (!prefs.notifications) {
            prefs.notifications = {};
          }
          
          // Ensure reminders structure exists
          if (!prefs.notifications.reminders) {
            prefs.notifications.reminders = {
              channels: { email: true, push: true, sms: false },
              offsets: [1440, 60]
            };
          }
          
          setOrgPreferences(prefs);
          setOrgOriginalPreferences(JSON.parse(JSON.stringify(prefs))); // Deep copy for comparison
        } else {
          // Initialize with defaults if no preferences exist
          const defaultPrefs = {
            notifications: {
              reminders: {
                channels: { email: true, push: true, sms: false },
                offsets: [1440, 60]
              }
            }
          };
          setOrgPreferences(defaultPrefs);
          setOrgOriginalPreferences(JSON.parse(JSON.stringify(defaultPrefs)));
        }
      } catch (err) {
        setOrgError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching operator preferences:', err);
        
        // Initialize with defaults even on error
        const defaultPrefs = {
          notifications: {
            reminders: {
              channels: { email: true, push: true, sms: false },
              offsets: [1440, 60]
            }
          }
        };
        setOrgPreferences(defaultPrefs);
        setOrgOriginalPreferences(JSON.parse(JSON.stringify(defaultPrefs)));
      }
    }
    
    fetchOperatorPreferences();
  }, [role]);
  
  // Handle toggle changes for mention channels
  const handleMentionChannelToggle = (channel: 'toast' | 'inApp' | 'email') => {
    setPreferences((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        channels: {
          ...prev.notifications.channels,
          mentions: {
            ...prev.notifications.channels.mentions,
            [channel]: !prev.notifications.channels.mentions[channel]
          }
        }
      }
    }));
  };
  
  // Handle reminder channel toggle
  const handleReminderChannelToggle = (channel: 'email' | 'push' | 'sms') => {
    setPreferences((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        reminders: {
          ...prev.notifications.reminders,
          channels: {
            ...prev.notifications.reminders.channels,
            [channel]: !prev.notifications.reminders.channels[channel]
          }
        }
      }
    }));
  };

  // Handle offsets input (comma-sep numbers)
  const handleOffsetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split(',').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n) && n > 0);
    setPreferences((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        reminders: {
          ...prev.notifications.reminders,
          offsets: parts
        }
      }
    }));
  };

  // Handle org reminder channel toggle
  const handleOrgReminderChannelToggle = (channel: 'email' | 'push' | 'sms') => {
    setOrgPreferences((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        reminders: {
          ...prev.notifications.reminders,
          channels: {
            ...prev.notifications.reminders.channels,
            [channel]: !prev.notifications.reminders.channels[channel]
          }
        }
      }
    }));
  };

  // Handle org offsets input (comma-sep numbers)
  const handleOrgOffsetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split(',').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n) && n > 0);
    setOrgPreferences((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        reminders: {
          ...prev.notifications.reminders,
          offsets: parts
        }
      }
    }));
  };

  // Handle digest toggle
  const handleDigestToggle = () => {
    setPreferences((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        digest: {
          ...prev.notifications.digest,
          enabled: !prev.notifications.digest.enabled
        }
      }
    }));
  };
  
  // Handle digest time change
  const handleDigestTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        digest: {
          ...prev.notifications.digest,
          timeOfDay: e.target.value
        }
      }
    }));
  };
  
  // Handle unmuting a thread
  const handleUnmuteThread = (threadKey: string) => {
    setPreferences((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        mutes: {
          ...prev.notifications.mutes,
          threads: prev.notifications.mutes.threads.filter((t: string) => t !== threadKey)
        }
      }
    }));
  };
  
  // Save preferences
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      // Only send the notifications subtree
      const response = await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notifications: preferences.notifications
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }
      
      // Update original preferences for comparison
      setOriginalPreferences(JSON.parse(JSON.stringify(preferences)));
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error saving preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save organization preferences
  const handleOrgSave = async () => {
    setOrgSaving(true);
    setOrgError(null);
    setOrgSaveSuccess(false);
    
    try {
      // Only send the notifications subtree
      const response = await fetch('/api/operator/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notifications: orgPreferences.notifications
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save organization preferences');
      }
      
      // Update original preferences for comparison
      setOrgOriginalPreferences(JSON.parse(JSON.stringify(orgPreferences)));
      setOrgSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setOrgSaveSuccess(false);
      }, 3000);
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error saving organization preferences:', err);
    } finally {
      setOrgSaving(false);
    }
  };
  
  // Check if any changes were made
  const hasChanges = () => {
    if (!preferences || !originalPreferences) return false;
    return JSON.stringify(preferences.notifications) !== JSON.stringify(originalPreferences.notifications);
  };
  
  // Check if any org changes were made
  const hasOrgChanges = () => {
    if (!orgPreferences || !orgOriginalPreferences) return false;
    return JSON.stringify(orgPreferences.notifications) !== JSON.stringify(orgOriginalPreferences.notifications);
  };
  
  // Format thread key for display
  const formatThreadKey = (key: string) => {
    const parts = key.split(':');
    const type = parts[0] || 'Thread';
    const id = parts[1] || '';
    return `${type.charAt(0).toUpperCase() + type.slice(1)} #${id.substring(0, 8)}`;
  };

  /* -------------------------------------------------
   * Render states
   * ------------------------------------------------- */
  if (isLoading && !preferences) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-primary-500 border-neutral-200"></div>
          <span className="text-lg font-medium text-neutral-700">
            Loading preferences...
          </span>
        </div>
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="rounded-md border border-red-300 bg-red-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-red-800">
            Error loading preferences
          </h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------
   * Main view
   * ------------------------------------------------- */

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">
          Notification Preferences
        </h1>
        <Link
          href="/dashboard"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
        >
          Back to Dashboard
        </Link>
      </div>

      {preferences && (
        <div className="space-y-6">
          {/* Mentions Section */}
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h3 className="text-base font-medium text-neutral-800">@Mention Notifications</h3>
              <p className="text-sm text-neutral-500">Control how you're notified when someone mentions you</p>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="mention-toast" className="block text-sm font-medium text-neutral-700">
                      Toast Notifications
                    </label>
                    <p className="text-xs text-neutral-500">Show a temporary popup when you're mentioned</p>
                  </div>
                  <div className="relative inline-block">
                    <input
                      type="checkbox"
                      id="mention-toast"
                      checked={preferences.notifications.channels.mentions.toast}
                      onChange={() => handleMentionChannelToggle('toast')}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="mention-inapp" className="block text-sm font-medium text-neutral-700">
                      In-App Notifications
                    </label>
                    <p className="text-xs text-neutral-500">Show mentions in your notification center</p>
                  </div>
                  <div className="relative inline-block">
                    <input
                      type="checkbox"
                      id="mention-inapp"
                      checked={preferences.notifications.channels.mentions.inApp}
                      onChange={() => handleMentionChannelToggle('inApp')}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="mention-email" className="block text-sm font-medium text-neutral-700">
                      Email Notifications
                    </label>
                    <p className="text-xs text-neutral-500">Send an email when you're mentioned</p>
                  </div>
                  <div className="relative inline-block">
                    <input
                      type="checkbox"
                      id="mention-email"
                      checked={preferences.notifications.channels.mentions.email}
                      onChange={() => handleMentionChannelToggle('email')}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Daily Digest Section */}
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h3 className="text-base font-medium text-neutral-800">Daily Digest</h3>
              <p className="text-sm text-neutral-500">Receive a summary of activity at your preferred time</p>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="digest-enabled" className="block text-sm font-medium text-neutral-700">
                      Enable Daily Digest
                    </label>
                    <p className="text-xs text-neutral-500">Receive a daily email summary</p>
                  </div>
                  <div className="relative inline-block">
                    <input
                      type="checkbox"
                      id="digest-enabled"
                      checked={preferences.notifications.digest.enabled}
                      onChange={handleDigestToggle}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                {preferences.notifications.digest.enabled && (
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="digest-time" className="block text-sm font-medium text-neutral-700">
                        Delivery Time (24h format)
                      </label>
                      <p className="text-xs text-neutral-500">When to send your daily summary</p>
                    </div>
                    <div className="relative inline-block">
                      <input
                        type="text"
                        id="digest-time"
                        value={preferences.notifications.digest.timeOfDay || ''}
                        onChange={handleDigestTimeChange}
                        placeholder="HH:MM"
                        pattern="[0-9]{2}:[0-9]{2}"
                        className="w-20 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Muted Threads Section */}
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h3 className="text-base font-medium text-neutral-800">Muted Threads</h3>
              <p className="text-sm text-neutral-500">Manage conversation threads you've muted</p>
            </div>
            <div className="p-4">
              {preferences.notifications.mutes.threads.length === 0 ? (
                <p className="text-sm text-neutral-500">You haven't muted any threads yet.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-neutral-600">You won't receive notifications for these threads:</p>
                  <div className="flex flex-wrap gap-2">
                    {preferences.notifications.mutes.threads.map((thread: string) => (
                      <div 
                        key={thread}
                        className="flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs"
                      >
                        <span className="text-neutral-700">{formatThreadKey(thread)}</span>
                        <button
                          onClick={() => handleUnmuteThread(thread)}
                          className="ml-2 text-neutral-500 hover:text-neutral-700"
                          aria-label="Unmute thread"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Appointment Reminders Section */}
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h3 className="text-base font-medium text-neutral-800">Appointment Reminders</h3>
              <p className="text-sm text-neutral-500">Default channels and timing for calendar reminders</p>
            </div>
            <div className="p-4 space-y-4">
              {/* Channels */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm font-medium text-neutral-700">Email</span>
                  <input
                    type="checkbox"
                    checked={preferences.notifications.reminders.channels.email}
                    onChange={() => handleReminderChannelToggle('email')}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm font-medium text-neutral-700">Push</span>
                  <input
                    type="checkbox"
                    checked={preferences.notifications.reminders.channels.push}
                    onChange={() => handleReminderChannelToggle('push')}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm font-medium text-neutral-700">SMS</span>
                  <input
                    type="checkbox"
                    checked={preferences.notifications.reminders.channels.sms}
                    onChange={() => handleReminderChannelToggle('sms')}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              </div>
              {/* Offsets */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Reminder Offsets (minutes)
                  </label>
                  <p className="text-xs text-neutral-500">Comma-separated, e.g. 1440, 60</p>
                </div>
                <input
                  type="text"
                  value={preferences.notifications.reminders.offsets.join(', ')}
                  onChange={handleOffsetsChange}
                  className="w-52 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
          
          {/* Organization Defaults Section (Operators only) */}
          {role === 'OPERATOR' && orgPreferences && (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <h3 className="text-base font-medium text-neutral-800">Organization Defaults (Operators)</h3>
                <p className="text-sm text-neutral-500">Set default reminder preferences for your organization</p>
              </div>
              <div className="p-4 space-y-4">
                {/* Channels */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm font-medium text-neutral-700">Email</span>
                    <input
                      type="checkbox"
                      checked={orgPreferences.notifications.reminders.channels.email}
                      onChange={() => handleOrgReminderChannelToggle('email')}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm font-medium text-neutral-700">Push</span>
                    <input
                      type="checkbox"
                      checked={orgPreferences.notifications.reminders.channels.push}
                      onChange={() => handleOrgReminderChannelToggle('push')}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm font-medium text-neutral-700">SMS</span>
                    <input
                      type="checkbox"
                      checked={orgPreferences.notifications.reminders.channels.sms}
                      onChange={() => handleOrgReminderChannelToggle('sms')}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                </div>
                {/* Offsets */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">
                      Reminder Offsets (minutes)
                    </label>
                    <p className="text-xs text-neutral-500">Comma-separated, e.g. 1440, 60</p>
                  </div>
                  <input
                    type="text"
                    value={orgPreferences.notifications.reminders.offsets.join(', ')}
                    onChange={handleOrgOffsetsChange}
                    className="w-52 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                
                {/* Organization Save Button */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    {orgError && (
                      <p className="text-sm text-red-600">{orgError}</p>
                    )}
                    {orgSaveSuccess && (
                      <p className="text-sm text-green-600">Organization preferences saved successfully!</p>
                    )}
                  </div>
                  <button
                    onClick={handleOrgSave}
                    disabled={orgSaving || !hasOrgChanges()}
                    className={`rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      orgSaving || !hasOrgChanges()
                        ? 'bg-primary-400 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700'
                    }`}
                  >
                    {orgSaving ? 'Saving...' : 'Save Organization Defaults'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Save Button */}
          <div className="flex items-center justify-between">
            <div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              {saveSuccess && (
                <p className="text-sm text-green-600">Preferences saved successfully!</p>
              )}
            </div>
            <div className="flex space-x-3">
              <Link
                href="/settings/account"
                className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges()}
                className={`rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  isSaving || !hasChanges()
                    ? 'bg-primary-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
