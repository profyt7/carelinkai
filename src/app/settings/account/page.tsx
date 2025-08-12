"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { 
  FiUser, 
  FiLock, 
  FiShield, 
  FiAlertCircle,
  FiCheck,
  FiLoader,
  FiMail,
  FiEye,
  FiEyeOff,
  FiSave,
  FiBell,
  FiSlash,
  FiLogOut,
  FiAlertTriangle
} from "react-icons/fi";

// Password schema for validation
const passwordSchema = z.object({
  currentPassword: z.string().min(8, "Current password must be at least 8 characters"),
  newPassword: z.string().min(8, "New password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(8, "Please confirm your new password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Notification preferences schema
const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  securityAlerts: z.boolean(),
  marketingEmails: z.boolean(),
  accountUpdates: z.boolean(),
});

export default function AccountSettings() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  // State for account data
  const [accountData, setAccountData] = useState<any>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  
  // Form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    securityAlerts: true,
    marketingEmails: false,
    accountUpdates: true,
  });
  const [errors, setErrors] = useState<any>({});
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  
  // Fetch account data
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/settings/account");
      return;
    }
    
    if (status === "authenticated") {
      fetchAccountData();
    }
  }, [status, router]);
  
  // Fetch account data from API
  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile/account", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch account data");
      }
      
      const data = await res.json();
      
      if (data.success) {
        setAccountData(data.data);
        setTwoFactorEnabled(data.data.twoFactorEnabled || false);
        setNotificationPreferences({
          emailNotifications: data.data.preferences?.emailNotifications ?? true,
          securityAlerts: data.data.preferences?.securityAlerts ?? true,
          marketingEmails: data.data.preferences?.marketingEmails ?? false,
          accountUpdates: data.data.preferences?.accountUpdates ?? true,
        });
        
        if (data.data.activeSessions) {
          setActiveSessions(data.data.activeSessions);
        }
      }
    } catch (error) {
      console.error("Error fetching account data:", error);
      setMessage({
        type: "error",
        text: "Failed to load account data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle password form input changes
  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field if exists
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  /* ----------------------------
   * Resolve profile image (if any)
   * ---------------------------- */
  const profileImage: string | null = (() => {
    const img = session?.user?.profileImageUrl;
    if (!img) return null;
    if (typeof img === "string") return img;
    // object format: prefer medium > thumbnail > large
    return img.medium || img.thumbnail || img.large || null;
  })();

  /* ---------- DEBUG: inspect profile image values ---------- */
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[Account Settings] session.user.profileImageUrl:", session?.user?.profileImageUrl);
    // eslint-disable-next-line no-console
    console.log("[Account Settings] resolved profileImage:", profileImage);
  }

  // Handle notification preferences changes
  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNotificationPreferences((prev) => ({ ...prev, [name]: checked }));
  };
  
  // Validate password form
  const validatePasswordForm = () => {
    try {
      passwordSchema.parse(passwordData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: any = {};
        error.errors.forEach((err) => {
          fieldErrors[err.path.join(".")] = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      setMessage({
        type: "error",
        text: "Please correct the errors in the form.",
      });
      return;
    }
    
    try {
      setChangingPassword(true);
      
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({
          type: "success",
          text: "Password changed successfully!",
        });
        
        // Clear form
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to change password.",
        });
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setMessage({
        type: "error",
        text: "An error occurred while changing your password.",
      });
    } finally {
      setChangingPassword(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
  };
  
  // Handle 2FA toggle
  const handleToggle2FA = async () => {
    try {
      setSaving(true);
      
      const res = await fetch("/api/profile/2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: !twoFactorEnabled,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTwoFactorEnabled(!twoFactorEnabled);
        setMessage({
          type: "success",
          text: `Two-factor authentication ${!twoFactorEnabled ? "enabled" : "disabled"} successfully!`,
        });
        
        // Update session
        await update();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to update two-factor authentication.",
        });
      }
    } catch (error) {
      console.error("Error updating 2FA:", error);
      setMessage({
        type: "error",
        text: "An error occurred while updating two-factor authentication.",
      });
    } finally {
      setSaving(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
  };
  
  // Handle notification preferences save
  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      
      const res = await fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferences: notificationPreferences,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({
          type: "success",
          text: "Notification preferences saved successfully!",
        });
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to save notification preferences.",
        });
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage({
        type: "error",
        text: "An error occurred while saving your preferences.",
      });
    } finally {
      setSaving(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
  };
  
  // Handle logout from all devices
  const handleLogoutAllDevices = async () => {
    try {
      setSaving(true);
      
      const res = await fetch("/api/profile/sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({
          type: "success",
          text: "Successfully logged out from all other devices!",
        });
        
        // Update sessions list
        setActiveSessions([]);
        
        // Update session
        await update();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to logout from all devices.",
        });
      }
    } catch (error) {
      console.error("Error logging out from all devices:", error);
      setMessage({
        type: "error",
        text: "An error occurred while logging out from all devices.",
      });
    } finally {
      setSaving(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
  };
  
  // Handle account deactivation
  const handleDeactivateAccount = async () => {
    try {
      setSaving(true);
      
      const res = await fetch("/api/profile/deactivate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({
          type: "success",
          text: "Account deactivated successfully. You will be logged out.",
        });
        
        // Redirect to logout after 2 seconds
        setTimeout(() => {
          router.push("/auth/logout");
        }, 2000);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Failed to deactivate account.",
        });
      }
    } catch (error) {
      console.error("Error deactivating account:", error);
      setMessage({
        type: "error",
        text: "An error occurred while deactivating your account.",
      });
    } finally {
      setSaving(false);
      setShowDeactivateModal(false);
    }
  };
  
  // If loading, show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-lg font-medium text-neutral-700">Loading account settings...</span>
        </div>
      </div>
    );
  }
  
  // If not authenticated, show message
  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800">Authentication Required</h1>
          <p className="mt-2 text-neutral-600">
            Please{" "}
            <Link href="/auth/login?callbackUrl=/settings/account" className="text-primary-600 hover:underline">
              sign in
            </Link>{" "}
            to view your account settings.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Account Settings</h1>
        <Link
          href="/dashboard"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
        >
          Back to Dashboard
        </Link>
      </div>
      
      {message.text && (
        <div
          className={`mb-6 rounded-md p-4 ${
            message.type === "error"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          <div className="flex items-center">
            {message.type === "error" ? (
              <FiAlertCircle className="mr-2 h-5 w-5" />
            ) : (
              <FiCheck className="mr-2 h-5 w-5" />
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left column - Account summary */}
        <div className="md:col-span-1">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-neutral-800">Account Summary</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt="Profile photo"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-primary-100 flex items-center justify-center">
                    <FiUser className="h-6 w-6 text-primary-600" />
                  </div>
                )}
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-neutral-800">
                    {session?.user?.name}
                  </h4>
                  <p className="text-sm text-neutral-500">{session?.user?.email}</p>
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-neutral-700">Account Status</div>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Active
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-neutral-700">Two-Factor Auth</div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    twoFactorEnabled
                      ? "bg-green-100 text-green-800"
                      : "bg-neutral-100 text-neutral-800"
                  }`}>
                    {twoFactorEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-neutral-700">Last Login</div>
                  <span className="text-sm text-neutral-500">
                    {accountData?.lastLogin 
                      ? new Date(accountData.lastLogin).toLocaleDateString() 
                      : "Unknown"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-neutral-700">Account Created</div>
                  <span className="text-sm text-neutral-500">
                    {accountData?.createdAt 
                      ? new Date(accountData.createdAt).toLocaleDateString() 
                      : "Unknown"}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <Link
                  href="/settings/profile"
                  className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  <FiUser className="mr-2 h-4 w-4" />
                  View Profile Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column - Settings */}
        <div className="md:col-span-2 space-y-6">
          {/* Password section */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-neutral-800">Change Password</h3>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="px-4 py-5 sm:p-6 space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-neutral-700">
                    Current Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="currentPassword"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordInputChange}
                      className="block w-full pl-10 pr-10 border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter your current password"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="text-neutral-400 hover:text-neutral-500 focus:outline-none"
                      >
                        {showCurrentPassword ? (
                          <FiEyeOff className="h-5 w-5" />
                        ) : (
                          <FiEye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700">
                    New Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordInputChange}
                      className="block w-full pl-10 pr-10 border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter your new password"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-neutral-400 hover:text-neutral-500 focus:outline-none"
                      >
                        {showNewPassword ? (
                          <FiEyeOff className="h-5 w-5" />
                        ) : (
                          <FiEye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                  )}
                  <p className="mt-1 text-xs text-neutral-500">
                    Password must be at least 8 characters and include uppercase, lowercase, 
                    number, and special character.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
                    Confirm New Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordInputChange}
                      className="block w-full pl-10 pr-10 border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Confirm your new password"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-neutral-400 hover:text-neutral-500 focus:outline-none"
                      >
                        {showConfirmPassword ? (
                          <FiEyeOff className="h-5 w-5" />
                        ) : (
                          <FiEye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
              <div className="bg-neutral-50 px-4 py-3 text-right sm:px-6">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {changingPassword ? (
                    <>
                      <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <FiSave className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* Two-factor authentication */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-neutral-800">Two-Factor Authentication</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FiShield className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h4 className="text-lg font-medium text-neutral-800">
                    {twoFactorEnabled ? "Two-Factor Authentication is enabled" : "Enhance your account security"}
                  </h4>
                  <p className="mt-1 text-sm text-neutral-500">
                    {twoFactorEnabled
                      ? "Your account is protected with an additional layer of security. When signing in, you'll need to provide a verification code."
                      : "Add an extra layer of security to your account. When enabled, you'll be required to enter a verification code in addition to your password when signing in."}
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleToggle2FA}
                      disabled={saving}
                      className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        twoFactorEnabled
                          ? "border-red-300 bg-white text-red-700 hover:bg-red-50"
                          : "border-transparent bg-primary-600 text-white hover:bg-primary-700"
                      }`}
                    >
                      {saving ? (
                        <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                      ) : twoFactorEnabled ? (
                        <FiSlash className="mr-2 h-4 w-4" />
                      ) : (
                        <FiShield className="mr-2 h-4 w-4" />
                      )}
                      {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Notification preferences */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-neutral-800">Notification Preferences</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailNotifications"
                    name="emailNotifications"
                    type="checkbox"
                    checked={notificationPreferences.emailNotifications}
                    onChange={handleNotificationChange}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="emailNotifications" className="font-medium text-neutral-700">
                    Email Notifications
                  </label>
                  <p className="text-neutral-500">Receive notifications via email</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="securityAlerts"
                    name="securityAlerts"
                    type="checkbox"
                    checked={notificationPreferences.securityAlerts}
                    onChange={handleNotificationChange}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="securityAlerts" className="font-medium text-neutral-700">
                    Security Alerts
                  </label>
                  <p className="text-neutral-500">Receive alerts about suspicious activities</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="marketingEmails"
                    name="marketingEmails"
                    type="checkbox"
                    checked={notificationPreferences.marketingEmails}
                    onChange={handleNotificationChange}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="marketingEmails" className="font-medium text-neutral-700">
                    Marketing Emails
                  </label>
                  <p className="text-neutral-500">Receive promotional emails and updates</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="accountUpdates"
                    name="accountUpdates"
                    type="checkbox"
                    checked={notificationPreferences.accountUpdates}
                    onChange={handleNotificationChange}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="accountUpdates" className="font-medium text-neutral-700">
                    Account Updates
                  </label>
                  <p className="text-neutral-500">Receive important updates about your account</p>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {saving ? (
                    <>
                      <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiBell className="mr-2 h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Session management */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-neutral-800">Session Management</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <p className="text-sm text-neutral-500 mb-4">
                Manage your active sessions across devices. You can log out from all devices except your current one.
              </p>
              
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleLogoutAllDevices}
                  disabled={saving}
                  className="inline-flex items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  {saving ? (
                    <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FiLogOut className="mr-2 h-4 w-4" />
                  )}
                  Log Out From All Other Devices
                </button>
              </div>
            </div>
          </div>
          
          {/* Danger zone */}
          <div className="overflow-hidden rounded-lg bg-red-50 shadow">
            <div className="border-b border-red-200 bg-red-100 px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-red-800">Danger Zone</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FiAlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h4 className="text-lg font-medium text-red-800">Deactivate Account</h4>
                  <p className="mt-1 text-sm text-red-700">
                    Once you deactivate your account, all your data will be inaccessible. This action cannot be undone.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowDeactivateModal(true)}
                      className="inline-flex items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <FiSlash className="mr-2 h-4 w-4" />
                      Deactivate Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Deactivate account modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FiAlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-neutral-900">Deactivate Account</h3>
                    <div className="mt-2">
                      <p className="text-sm text-neutral-500">
                        Are you sure you want to deactivate your account? All of your data will be permanently removed
                        and cannot be recovered. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-neutral-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleDeactivateAccount}
                  disabled={saving}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {saving ? (
                    <>
                      <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Deactivate"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-base font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
        <Link
          href="/settings/profile"
          className="text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          Profile Settings
        </Link>
        
        <Link
          href="/dashboard"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-500"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
