'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Mail,
  Shield,
  Bell,
  ToggleLeft,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Server,
  Clock,
  Lock,
  Globe,
} from 'lucide-react';

interface SettingsState {
  general: {
    siteName: string;
    contactEmail: string;
    supportPhone: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    fromEmail: string;
    fromName: string;
    sendWelcomeEmail: boolean;
    sendNotificationEmails: boolean;
  };
  features: {
    enableTwoFactor: boolean;
    enableAuditLogs: boolean;
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableTourScheduling: boolean;
    enableDocumentUpload: boolean;
    enableMessaging: boolean;
    enableReporting: boolean;
  };
  security: {
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    requirePasswordChange: boolean;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
  };
  notifications: {
    emailAlerts: boolean;
    inAppNotifications: boolean;
    leadAssignmentNotify: boolean;
    inquiryResponseNotify: boolean;
    systemMaintenanceNotify: boolean;
    dailyDigestEnabled: boolean;
    dailyDigestTime: string;
  };
  maintenance: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    allowAdminAccess: boolean;
  };
}

type SettingsCategory = keyof SettingsState;

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsCategory>('general');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (category: SettingsCategory) => {
    if (!settings) return;
    setSaving(category);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          settings: settings[category],
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSuccess(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const updateSetting = <K extends SettingsCategory>(
    category: K,
    key: keyof SettingsState[K],
    value: SettingsState[K][keyof SettingsState[K]]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    });
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Globe },
    { id: 'email' as const, label: 'Email', icon: Mail },
    { id: 'features' as const, label: 'Features', icon: ToggleLeft },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'maintenance' as const, label: 'Maintenance', icon: Server },
  ];

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load settings</p>
          <button
            onClick={fetchSettings}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7" />
            System Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure system-wide settings and preferences
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">General Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settings.general.siteName}
                    onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={settings.general.contactEmail}
                    onChange={(e) => updateSetting('general', 'contactEmail', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Support Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.general.supportPhone}
                    onChange={(e) => updateSetting('general', 'supportPhone', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.general.timezone}
                    onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.general.dateFormat}
                    onChange={(e) => updateSetting('general', 'dateFormat', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Format
                  </label>
                  <select
                    value={settings.general.timeFormat}
                    onChange={(e) => updateSetting('general', 'timeFormat', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="12h">12-hour (AM/PM)</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('general')}
                  disabled={saving === 'general'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving === 'general' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save General Settings
                </button>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={settings.email.smtpHost}
                    onChange={(e) => updateSetting('email', 'smtpHost', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="smtp.example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settings.email.smtpPort}
                    onChange={(e) => updateSetting('email', 'smtpPort', parseInt(e.target.value) || 587)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={settings.email.fromEmail}
                    onChange={(e) => updateSetting('email', 'fromEmail', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={settings.email.fromName}
                    onChange={(e) => updateSetting('email', 'fromName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.email.smtpSecure}
                    onChange={(e) => updateSetting('email', 'smtpSecure', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Use secure connection (TLS/SSL)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.email.sendWelcomeEmail}
                    onChange={(e) => updateSetting('email', 'sendWelcomeEmail', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Send welcome email to new users</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.email.sendNotificationEmails}
                    onChange={(e) => updateSetting('email', 'sendNotificationEmails', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Send notification emails</span>
                </label>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('email')}
                  disabled={saving === 'email'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving === 'email' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Email Settings
                </button>
              </div>
            </div>
          )}

          {/* Feature Toggles */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Feature Toggles</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Enable or disable system features</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'enableTwoFactor', label: 'Two-Factor Authentication', desc: 'Allow users to enable 2FA for their accounts' },
                  { key: 'enableAuditLogs', label: 'Audit Logging', desc: 'Track all user actions and system events' },
                  { key: 'enableAnalytics', label: 'Analytics Dashboard', desc: 'Show analytics and reporting features' },
                  { key: 'enableNotifications', label: 'Notifications', desc: 'Enable in-app and email notifications' },
                  { key: 'enableTourScheduling', label: 'Tour Scheduling', desc: 'Allow families to schedule tours' },
                  { key: 'enableDocumentUpload', label: 'Document Upload', desc: 'Allow document uploads and sharing' },
                  { key: 'enableMessaging', label: 'Messaging System', desc: 'Enable internal messaging between users' },
                  { key: 'enableReporting', label: 'Custom Reports', desc: 'Allow generation of custom reports' },
                ].map((feature) => (
                  <div
                    key={feature.key}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.features[feature.key as keyof typeof settings.features] as boolean}
                        onChange={(e) =>
                          updateSetting('features', feature.key as keyof typeof settings.features, e.target.checked)
                        }
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="block font-medium text-gray-900 dark:text-white">{feature.label}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('features')}
                  disabled={saving === 'features'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving === 'features' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Feature Settings
                </button>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={settings.security.sessionTimeoutMinutes}
                    onChange={(e) => updateSetting('security', 'sessionTimeoutMinutes', parseInt(e.target.value) || 60)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value) || 5)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Lockout Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={settings.security.lockoutDurationMinutes}
                    onChange={(e) => updateSetting('security', 'lockoutDurationMinutes', parseInt(e.target.value) || 30)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value) || 8)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Password Requirements</h4>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.security.passwordRequireUppercase}
                    onChange={(e) => updateSetting('security', 'passwordRequireUppercase', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Require uppercase letters</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.security.passwordRequireNumbers}
                    onChange={(e) => updateSetting('security', 'passwordRequireNumbers', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Require numbers</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.security.passwordRequireSpecialChars}
                    onChange={(e) => updateSetting('security', 'passwordRequireSpecialChars', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Require special characters</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.security.requirePasswordChange}
                    onChange={(e) => updateSetting('security', 'requirePasswordChange', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Require periodic password change</span>
                </label>
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('security')}
                  disabled={saving === 'security'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving === 'security' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Security Settings
                </button>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.emailAlerts}
                    onChange={(e) => updateSetting('notifications', 'emailAlerts', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enable email alerts</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.inAppNotifications}
                    onChange={(e) => updateSetting('notifications', 'inAppNotifications', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enable in-app notifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.leadAssignmentNotify}
                    onChange={(e) => updateSetting('notifications', 'leadAssignmentNotify', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Notify on lead assignment</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.inquiryResponseNotify}
                    onChange={(e) => updateSetting('notifications', 'inquiryResponseNotify', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Notify on inquiry response</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notifications.systemMaintenanceNotify}
                    onChange={(e) => updateSetting('notifications', 'systemMaintenanceNotify', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Notify about system maintenance</span>
                </label>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Daily Digest</h4>
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={settings.notifications.dailyDigestEnabled}
                    onChange={(e) => updateSetting('notifications', 'dailyDigestEnabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enable daily digest email</span>
                </label>
                {settings.notifications.dailyDigestEnabled && (
                  <div className="ml-7">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Send at
                    </label>
                    <input
                      type="time"
                      value={settings.notifications.dailyDigestTime}
                      onChange={(e) => updateSetting('notifications', 'dailyDigestTime', e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('notifications')}
                  disabled={saving === 'notifications'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving === 'notifications' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Notification Settings
                </button>
              </div>
            </div>
          )}

          {/* Maintenance Mode */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Server className="w-5 h-5" />
                Maintenance Mode
              </h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  <strong>Warning:</strong> Enabling maintenance mode will prevent regular users from accessing the system.
                </p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.maintenance.maintenanceMode}
                    onChange={(e) => updateSetting('maintenance', 'maintenanceMode', e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Enable Maintenance Mode</span>
                </label>
                {settings.maintenance.maintenanceMode && (
                  <div className="ml-7 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Maintenance Message
                      </label>
                      <textarea
                        value={settings.maintenance.maintenanceMessage}
                        onChange={(e) => updateSetting('maintenance', 'maintenanceMessage', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Message to display to users..."
                      />
                    </div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.maintenance.allowAdminAccess}
                        onChange={(e) => updateSetting('maintenance', 'allowAdminAccess', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">Allow admin access during maintenance</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => saveSettings('maintenance')}
                  disabled={saving === 'maintenance'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving === 'maintenance' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Maintenance Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
