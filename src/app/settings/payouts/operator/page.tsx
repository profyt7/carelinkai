"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { 
  FiDollarSign, 
  FiExternalLink, 
  FiCheck, 
  FiAlertCircle,
  FiLoader,
  FiArrowRight,
  FiCreditCard,
  FiCheckCircle,
  FiXCircle,
  FiInfo
} from "react-icons/fi";

// Payout request schema for validation
const payoutRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
});

export default function OperatorPayoutsSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State for Connect account status
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
  });
  const [errors, setErrors] = useState<any>({});
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Fetch Connect account status
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/settings/payouts/operator");
      return;
    }
    
    if (status === "authenticated" && session?.user?.role === "OPERATOR") {
      fetchConnectStatus();
    } else {
      setStatusLoading(false);
    }
  }, [status, router, session]);
  
  // Fetch Connect account status
  const fetchConnectStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await fetch("/api/operator/payouts/connect/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch Connect status");
      }
      
      const data = await res.json();
      setConnectStatus(data);
    } catch (error) {
      console.error("Error fetching Connect status:", error);
      setMessage({
        type: "error",
        text: "Failed to load Connect account status. Please try again.",
      });
    } finally {
      setStatusLoading(false);
    }
  };
  
  // Start or continue Connect onboarding
  const handleStartOnboarding = async () => {
    try {
      setOnboardingLoading(true);
      const res = await fetch("/api/operator/payouts/connect/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error("Failed to start Connect onboarding");
      }
      
      const data = await res.json();
      
      // Redirect to Stripe Connect onboarding
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No onboarding URL returned");
      }
    } catch (error) {
      console.error("Error starting Connect onboarding:", error);
      setMessage({
        type: "error",
        text: "Failed to start Connect onboarding. Please try again.",
      });
      setOnboardingLoading(false);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field if exists
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle numeric input changes
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === "" ? "" : Number(value);
    setFormData((prev) => ({ ...prev, [name]: numValue }));
    
    // Clear error for this field if exists
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Validate form data
  const validateForm = () => {
    try {
      // Validate payout request data
      payoutRequestSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: any = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          fieldErrors[path] = err.message;
        });
        
        setErrors(fieldErrors);
      }
      return false;
    }
  };
  
  // Handle payout request submission
  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert amount string to number for validation
    const formDataWithNumberAmount = {
      ...formData,
      amount: formData.amount === "" ? "" : Number(formData.amount),
    };
    
    // Validate form
    if (!validateForm()) {
      setMessage({
        type: "error",
        text: "Please correct the errors in the form.",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const res = await fetch("/api/operator/payouts/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formDataWithNumberAmount),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to request payout");
      }
      
      // Reset form
      setFormData({
        amount: "",
        description: "",
      });
      
      setMessage({
        type: "success",
        text: "Payout request submitted successfully!",
      });
    } catch (error: any) {
      console.error("Error requesting payout:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to request payout. Please try again.",
      });
    } finally {
      setLoading(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
  };
  
  // If loading, show loading state
  if (statusLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <FiLoader className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-lg font-medium text-neutral-700">Loading payouts...</span>
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
            <Link href="/auth/login?callbackUrl=/settings/payouts/operator" className="text-primary-600 hover:underline">
              sign in
            </Link>{" "}
            to view your payout settings.
          </p>
        </div>
      </div>
    );
  }
  
  // If user is not an operator, show message
  if (session?.user?.role !== "OPERATOR") {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-800">Operator Payout Settings</h1>
          <Link
            href="/settings/profile"
            className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            Back to Profile
          </Link>
        </div>
        
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FiInfo className="h-16 w-16 text-neutral-400" />
              <h2 className="mt-4 text-xl font-medium text-neutral-800">Feature Not Available</h2>
              <p className="mt-2 max-w-md text-neutral-600">
                Operator payout settings are only available for users with the operator role. Please visit your profile settings to manage your account.
              </p>
              <Link
                href="/settings/profile"
                className="mt-6 inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
              >
                Go to Profile Settings
                <FiArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-800">Operator Payout Settings</h1>
        <Link
          href="/settings/profile"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
        >
          Back to Profile
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
      
      <div className="overflow-hidden rounded-lg bg-white shadow">
        {/* Connect Account Status */}
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-neutral-800">Stripe Connect Account</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Connect your bank account to receive payouts for your operator services.
          </p>
        </div>
        
        <div className="bg-white px-4 py-5 sm:p-6">
          {connectStatus?.connected ? (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-md font-medium text-neutral-800">Account Status</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <div className="flex items-center">
                    {connectStatus.detailsSubmitted ? (
                      <FiCheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <FiXCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="ml-2 text-sm font-medium">Details Submitted</span>
                  </div>
                </div>
                
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <div className="flex items-center">
                    {connectStatus.chargesEnabled ? (
                      <FiCheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <FiXCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="ml-2 text-sm font-medium">Charges Enabled</span>
                  </div>
                </div>
                
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <div className="flex items-center">
                    {connectStatus.payoutsEnabled ? (
                      <FiCheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <FiXCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="ml-2 text-sm font-medium">Payouts Enabled</span>
                  </div>
                </div>
              </div>
              
              {(!connectStatus.detailsSubmitted || !connectStatus.payoutsEnabled) && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleStartOnboarding}
                    disabled={onboardingLoading}
                    className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    {onboardingLoading ? (
                      <>
                        <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiExternalLink className="mr-2 h-4 w-4" />
                        Continue Account Setup
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-sm text-neutral-500">
                    Your account setup is incomplete. Please continue the onboarding process to enable payouts.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-md font-medium text-neutral-800">No Connected Account</h3>
              <p className="mt-2 text-sm text-neutral-500">
                You don't have a Stripe Connect account yet. Connect your bank account to receive payouts.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleStartOnboarding}
                  disabled={onboardingLoading}
                  className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {onboardingLoading ? (
                    <>
                      <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiExternalLink className="mr-2 h-4 w-4" />
                      Connect Bank Account
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Payout Request Form - only show if account is fully set up */}
          {connectStatus?.connected && connectStatus.payoutsEnabled && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-neutral-800">Request Payout</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Request a payout to your connected bank account.
              </p>
              
              <form onSubmit={handlePayoutRequest} className="mt-4">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="amount" className="block text-sm font-medium text-neutral-700">
                      Amount ($)
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500">
                        <FiDollarSign className="h-4 w-4" />
                      </span>
                      <input
                        type="number"
                        name="amount"
                        id="amount"
                        min="0.01"
                        step="0.01"
                        value={formData.amount}
                        onChange={handleNumericChange}
                        className="block w-full rounded-none rounded-r-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                    )}
                  </div>
                  
                  <div className="col-span-6">
                    <label htmlFor="description" className="block text-sm font-medium text-neutral-700">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      name="description"
                      id="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="e.g., Monthly commission"
                    />
                  </div>
                  
                  <div className="col-span-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      {loading ? (
                        <>
                          <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FiCreditCard className="mr-2 h-4 w-4" />
                          Request Payout
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
      
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
