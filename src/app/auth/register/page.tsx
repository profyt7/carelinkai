/* eslint-disable react/no-unescaped-entities */

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { prefersReducedMotion } from "@/lib/animations";

// Icons
import { 
  FiMail, 
  FiLock, 
  FiUser, 
  FiPhone, 
  FiAlertCircle, 
  FiArrowRight,
  FiUsers,
  FiHome,
  FiHeart,
  FiActivity,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiMessageSquare,
  FiCheck,
  FiX,
  FiLoader
} from "react-icons/fi";

// Types from schema
type UserRole = "FAMILY" | "OPERATOR" | "CAREGIVER" | "AFFILIATE" | "PROVIDER" | "DISCHARGE_PLANNER";
type RelationshipType = "SELF" | "PARENT" | "SPOUSE" | "SIBLING" | "OTHER";
type ContactMethod = "EMAIL" | "PHONE" | "BOTH";

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  agreeToTerms: boolean;
  // New fields
  relationshipToRecipient?: RelationshipType;
  carePreferences?: string;
  preferredContactMethod?: ContactMethod;
};

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: "", color: "bg-neutral-200" };
  
  let score = 0;
  
  // Length checks
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character type checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;
  
  // Calculate percentage and label
  const percentage = Math.min((score / 6) * 100, 100);
  
  if (percentage <= 25) return { score: percentage, label: "Weak", color: "bg-red-500" };
  if (percentage <= 50) return { score: percentage, label: "Fair", color: "bg-orange-500" };
  if (percentage <= 75) return { score: percentage, label: "Good", color: "bg-yellow-500" };
  return { score: percentage, label: "Strong", color: "bg-green-500" };
};

// Password requirement checker
const checkPasswordRequirements = (password: string) => ({
  minLength: (password?.length ?? 0) >= 8,
  hasUppercase: /[A-Z]/.test(password ?? ""),
  hasLowercase: /[a-z]/.test(password ?? ""),
  hasNumber: /[0-9]/.test(password ?? ""),
  hasSpecial: /[@$!%*?&]/.test(password ?? ""),
});

// Relationship options
const relationshipOptions: { value: RelationshipType; label: string }[] = [
  { value: "SELF", label: "For myself" },
  { value: "PARENT", label: "For my parent" },
  { value: "SPOUSE", label: "For my spouse" },
  { value: "SIBLING", label: "For my sibling" },
  { value: "OTHER", label: "For someone else" },
];

// Contact method options
const contactMethodOptions: { value: ContactMethod; label: string; icon: React.ReactNode }[] = [
  { value: "EMAIL", label: "Email", icon: <FiMail className="h-4 w-4" /> },
  { value: "PHONE", label: "Phone", icon: <FiPhone className="h-4 w-4" /> },
  { value: "BOTH", label: "Both", icon: <FiMessageSquare className="h-4 w-4" /> },
];

// Role options with descriptions and icons
const roleOptions = [
  { 
    id: "FAMILY", 
    label: "Family Member", 
    description: "I'm looking for care for a loved one",
    icon: <FiHeart className="h-5 w-5" />
  },
  { 
    id: "OPERATOR", 
    label: "Care Home Operator", 
    description: "I operate an assisted living or memory care facility",
    icon: <FiHome className="h-5 w-5" />
  },
  { 
    id: "DISCHARGE_PLANNER", 
    label: "Healthcare Professional", 
    description: "I work at a hospital, rehab center, or healthcare facility",
    icon: <FiActivity className="h-5 w-5" />
  },
  { 
    id: "CAREGIVER", 
    label: "Caregiver", 
    description: "I provide care services to residents",
    icon: <FiActivity className="h-5 w-5" />
  },
  { 
    id: "PROVIDER", 
    label: "Service Provider", 
    description: "I provide professional services (transportation, home care, etc.)",
    icon: <FiActivity className="h-5 w-5" />
  },
  { 
    id: "AFFILIATE", 
    label: "Affiliate Partner", 
    description: "I refer clients to care homes",
    icon: <FiUsers className="h-5 w-5" />
  }
];

export default function RegisterPage() {
  /* --------------------------------------------------------------------
   * Prevent React-hydration mismatches:
   * 1.  Render a minimalist "shell" during SSR (or immediately after an
   *     export build) that matches what the client will first hydrate.
   * 2.  Once we are certain we're running in the browser (`mounted === true`)
   *     render the full interactive form.
   * ------------------------------------------------------------------ */
  const [mounted, setMounted] = useState(false);

  /* We only mark the component as mounted after the first client render. */
  React.useEffect(() => {
    setMounted(true);
    setReducedMotion(prefersReducedMotion());
  }, []);

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  
  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    trigger,
    setValue,
    setError,
    clearErrors,
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      role: "FAMILY",
      agreeToTerms: false,
      preferredContactMethod: "EMAIL"
    }
  });
  
  // Watch confirmPassword for mismatch validation
  const confirmPassword = watch("confirmPassword");

  // Watch form fields
  const password = watch("password");
  const currentRole = watch("role");
  const watchedPhone = watch("phone");
  const selectedContactMethod = watch("preferredContactMethod");
  
  // Calculate password strength
  const passwordStrength = useMemo(() => calculatePasswordStrength(password ?? ""), [password]);
  const passwordRequirements = useMemo(() => checkPasswordRequirements(password ?? ""), [password]);
  
  // BUG-002 FIX: Re-validate confirmPassword when password changes
  React.useEffect(() => {
    // Only validate if confirmPassword has a value (user has entered something)
    if (confirmPassword) {
      if (password !== confirmPassword) {
        setError("confirmPassword", { 
          type: "manual", 
          message: "Passwords do not match" 
        });
      } else {
        clearErrors("confirmPassword");
      }
    }
  }, [password, confirmPassword, setError, clearErrors]);
  
  // BUG-001 FIX: Trigger validation when entering step 2 to handle browser autofilled fields
  // This ensures pre-filled firstName/lastName fields are validated properly
  React.useEffect(() => {
    if (step === 2) {
      // Small delay to allow browser autofill to complete
      const timer = setTimeout(() => {
        // Get current values and manually trigger validation if fields have values
        const firstName = watch("firstName");
        const lastName = watch("lastName");
        
        // If fields have values (either typed or autofilled), trigger validation
        if (firstName || lastName) {
          trigger(["firstName", "lastName"]);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, trigger, watch]);
  
  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue("phone", formatted, { shouldValidate: true });
  };

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setApiError(null);

      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registrationData } = data;
      
      // Clean up the data - only send relationship/care fields for FAMILY role
      const cleanedData = {
        ...registrationData,
        relationshipToRecipient: data.role === "FAMILY" ? data.relationshipToRecipient : undefined,
        carePreferences: data.role === "FAMILY" ? data.carePreferences : undefined,
      };

      // Call registration API
      const response = await axios.post("/api/auth/register", cleanedData);

      // Show success message briefly
      setSuccess(true);

      // Auto-login and redirect based on role
      // Wait a moment to show success message
      setTimeout(async () => {
        try {
          // Attempt to sign in the user automatically
          const signInResult = await signIn("credentials", {
            email: data.email,
            password: data.password,
            redirect: false,
          });

          if (signInResult?.ok) {
            // Redirect based on role
            if (data.role === "FAMILY") {
              // Family users go to onboarding
              router.push("/settings/family?onboarding=true");
            } else if (data.role === "DISCHARGE_PLANNER") {
              // Discharge planners go to discharge planner portal
              router.push("/discharge-planner");
            } else {
              // Other users go to dashboard
              router.push("/dashboard");
            }
          } else {
            // If auto-login fails, redirect to login page
            router.push("/auth/login?registered=true");
          }
        } catch (signInError) {
          console.error("Auto sign-in error:", signInError);
          // Fall back to manual login
          router.push("/auth/login?registered=true");
        }
      }, 2000);
    } catch (err: any) {
      console.error("Registration error:", err);
      setApiError(
        err.response?.data?.message || 
        "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle next step in multi-step form
  const handleNextStep = async () => {
    // Validate current step fields
    let fieldsToValidate: (keyof FormData)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ["email", "password", "confirmPassword"];
      
      // BUG-002 FIX: Explicit password mismatch check before proceeding
      const currentPassword = watch("password");
      const currentConfirmPassword = watch("confirmPassword");
      
      if (currentPassword !== currentConfirmPassword) {
        setError("confirmPassword", { 
          type: "manual", 
          message: "Passwords do not match" 
        });
        return; // Block progression
      }
    } else if (step === 2) {
      fieldsToValidate = ["firstName", "lastName", "phone"];
    }
    
    const isStepValid = await trigger(fieldsToValidate);
    
    // BUG-002 FIX: Also check for any existing errors
    if (isStepValid && Object.keys(errors).filter(key => fieldsToValidate.includes(key as keyof FormData)).length === 0) {
      setStep(step + 1);
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    setStep(step - 1);
  };

  // If not mounted yet (SSR), render a simple shell
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-800">Create an Account</h1>
          </div>
        </div>
      </div>
    );
  }

  // Success state after registration
  if (success) {
    const isFamilyRole = currentRole === "FAMILY";
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-success-100 rounded-full flex items-center justify-center">
                <FiCheckCircle className="h-8 w-8 text-success-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-neutral-800">Registration Successful!</h1>
            <p className="mt-2 text-neutral-600">
              {isFamilyRole 
                ? "Welcome! Let's set up your care profile..."
                : "Your account has been created. Redirecting you..."
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-8">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center mb-6">
              <div className="h-10 w-10 rounded-md bg-primary-500 flex items-center justify-center mr-2">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-xl font-semibold text-neutral-800">CareLinkAI</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-neutral-800">Create an Account</h1>
          <p className="mt-2 text-neutral-600">
            {step === 1 && "Start by setting up your login credentials"}
            {step === 2 && "Tell us a bit about yourself"}
            {step === 3 && "Select how you'll be using CareLinkAI"}
          </p>
        </div>

        {apiError && (
          <div className="mb-6 p-3 bg-error-50 border border-error-200 rounded-md flex items-center text-error-800">
            <FiAlertCircle className="h-5 w-5 mr-2 text-error-500" />
            <span className="text-sm">{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Email and Password */}
          {step === 1 && (
            <>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    className={`form-input block w-full pl-10 py-2 rounded-md shadow-sm ${
                      errors.email ? "border-error-300 focus:ring-error-500 focus:border-error-500" : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                    }`}
                    placeholder="you@example.com"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Please enter a valid email address (e.g., name@example.com)",
                      },
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-error-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`form-input block w-full pl-10 pr-10 py-2 rounded-md shadow-sm ${
                      errors.password ? "border-error-300 focus:ring-error-500 focus:border-error-500" : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                    }`}
                    placeholder="Create a strong password"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                        message: "Password doesn't meet all requirements",
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                  </button>
                </div>
                
                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-neutral-500">Password strength:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.label === "Strong" ? "text-green-600" :
                        passwordStrength.label === "Good" ? "text-yellow-600" :
                        passwordStrength.label === "Fair" ? "text-orange-600" : "text-red-600"
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {errors.password && (
                  <p className="mt-1 text-sm text-error-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`form-input block w-full pl-10 pr-10 py-2 rounded-md shadow-sm ${
                      errors.confirmPassword ? "border-error-300 focus:ring-error-500 focus:border-error-500" : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                    }`}
                    placeholder="Re-enter your password"
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: value => value === password || "Passwords do not match",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  >
                    {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-error-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Password Requirements Checklist */}
              <div className="bg-neutral-50 p-3 rounded-md">
                <p className="text-xs text-neutral-600 font-medium mb-2">Password requirements:</p>
                <ul className="text-xs space-y-1">
                  <li className={`flex items-center ${passwordRequirements.minLength ? "text-green-600" : "text-neutral-500"}`}>
                    {passwordRequirements.minLength ? <FiCheck className="h-3 w-3 mr-1.5" /> : <FiX className="h-3 w-3 mr-1.5" />}
                    At least 8 characters long
                  </li>
                  <li className={`flex items-center ${passwordRequirements.hasUppercase ? "text-green-600" : "text-neutral-500"}`}>
                    {passwordRequirements.hasUppercase ? <FiCheck className="h-3 w-3 mr-1.5" /> : <FiX className="h-3 w-3 mr-1.5" />}
                    At least one uppercase letter (A-Z)
                  </li>
                  <li className={`flex items-center ${passwordRequirements.hasLowercase ? "text-green-600" : "text-neutral-500"}`}>
                    {passwordRequirements.hasLowercase ? <FiCheck className="h-3 w-3 mr-1.5" /> : <FiX className="h-3 w-3 mr-1.5" />}
                    At least one lowercase letter (a-z)
                  </li>
                  <li className={`flex items-center ${passwordRequirements.hasNumber ? "text-green-600" : "text-neutral-500"}`}>
                    {passwordRequirements.hasNumber ? <FiCheck className="h-3 w-3 mr-1.5" /> : <FiX className="h-3 w-3 mr-1.5" />}
                    At least one number (0-9)
                  </li>
                  <li className={`flex items-center ${passwordRequirements.hasSpecial ? "text-green-600" : "text-neutral-500"}`}>
                    {passwordRequirements.hasSpecial ? <FiCheck className="h-3 w-3 mr-1.5" /> : <FiX className="h-3 w-3 mr-1.5" />}
                    At least one special character (@$!%*?&)
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* Step 2: Personal Information */}
          {step === 2 && (
            <>
              {/* First Name Field */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-1">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    className={`form-input block w-full pl-10 py-2 rounded-md shadow-sm ${
                      errors.firstName ? "border-error-300 focus:ring-error-500 focus:border-error-500" : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                    }`}
                    placeholder="John"
                    {...register("firstName", {
                      required: "First name is required",
                      minLength: {
                        value: 2,
                        message: "First name must be at least 2 characters",
                      },
                    })}
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-sm text-error-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              {/* Last Name Field */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-1">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    className={`form-input block w-full pl-10 py-2 rounded-md shadow-sm ${
                      errors.lastName ? "border-error-300 focus:ring-error-500 focus:border-error-500" : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                    }`}
                    placeholder="Doe"
                    {...register("lastName", {
                      required: "Last name is required",
                      minLength: {
                        value: 2,
                        message: "Last name must be at least 2 characters",
                      },
                    })}
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-sm text-error-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              {/* Phone Field with Formatting */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone Number <span className="text-neutral-400">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    className={`form-input block w-full pl-10 py-2 rounded-md shadow-sm ${
                      errors.phone ? "border-error-300 focus:ring-error-500 focus:border-error-500" : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                    }`}
                    placeholder="(555) 123-4567"
                    value={watchedPhone ?? ""}
                    onChange={handlePhoneChange}
                    maxLength={14}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">US phone format: (555) 123-4567</p>
                {errors.phone && (
                  <p className="mt-1 text-sm text-error-600 flex items-center">
                    <FiAlertCircle className="h-4 w-4 mr-1" />
                    {errors.phone.message}
                  </p>
                )}
              </div>
              
              {/* Preferred Contact Method */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Preferred Contact Method
                </label>
                <div className="flex space-x-3">
                  {contactMethodOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex-1 flex items-center justify-center p-3 border rounded-md cursor-pointer transition-all ${
                        selectedContactMethod === option.value
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-neutral-300 hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        {...register("preferredContactMethod")}
                        className="sr-only"
                      />
                      <span className="mr-2">{option.icon}</span>
                      <span className="text-sm font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Relationship to Care Recipient - Only for FAMILY role */}
              {currentRole === "FAMILY" && (
                <div>
                  <label htmlFor="relationshipToRecipient" className="block text-sm font-medium text-neutral-700 mb-1">
                    Who are you looking for care for?
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiHeart className="h-5 w-5 text-neutral-400" />
                    </div>
                    <select
                      id="relationshipToRecipient"
                      className="form-select block w-full pl-10 py-2 rounded-md shadow-sm border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                      {...register("relationshipToRecipient")}
                    >
                      <option value="">Select relationship...</option>
                      {relationshipOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Care Preferences - Only for FAMILY role */}
              {currentRole === "FAMILY" && (
                <div>
                  <label htmlFor="carePreferences" className="block text-sm font-medium text-neutral-700 mb-1">
                    Care Needs or Preferences <span className="text-neutral-400">(Optional)</span>
                  </label>
                  <textarea
                    id="carePreferences"
                    rows={3}
                    className="form-textarea block w-full py-2 px-3 rounded-md shadow-sm border-neutral-300 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    placeholder="Tell us about any specific care needs, preferences, or concerns..."
                    maxLength={1000}
                    {...register("carePreferences", {
                      maxLength: {
                        value: 1000,
                        message: "Care preferences must be under 1000 characters",
                      },
                    })}
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    This helps us match you with the right care homes
                  </p>
                  {errors.carePreferences && (
                    <p className="mt-1 text-sm text-error-600 flex items-center">
                      <FiAlertCircle className="h-4 w-4 mr-1" />
                      {errors.carePreferences.message}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 3: Role Selection */}
          {step === 3 && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  I am registering as:
                </label>
                <div className="space-y-3">
                  {roleOptions.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                        currentRole === role.id
                          ? "border-primary-500 bg-primary-50"
                          : "border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      <input
                        type="radio"
                        value={role.id}
                        {...register("role", { required: true })}
                        className="form-radio mt-1 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-neutral-900 mr-2">
                            {role.label}
                          </span>
                          <span className="bg-neutral-100 rounded-full p-1">
                            {role.icon}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">{role.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="mt-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="agreeToTerms"
                      type="checkbox"
                      className={`form-checkbox h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500 ${
                        errors.agreeToTerms ? "border-error-300" : ""
                      }`}
                      {...register("agreeToTerms", {
                        required: "You must agree to the terms and conditions",
                      })}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="agreeToTerms" className="font-medium text-neutral-700">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                        Privacy Policy
                      </Link>
                    </label>
                    {errors.agreeToTerms && (
                      <p className="mt-1 text-sm text-error-600">{errors.agreeToTerms.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500"
              >
                Back
              </button>
            ) : (
              <div></div> // Empty div for spacing
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Next
                <FiArrowRight className="ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || !isValid}
                className={`flex items-center justify-center px-6 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-w-[140px] ${
                  isLoading || !isValid
                    ? "bg-primary-400 cursor-not-allowed"
                    : "bg-primary-600 hover:bg-primary-700"
                }`}
              >
                {isLoading ? (
                  <>
                    <FiLoader className="animate-spin h-4 w-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            )}
          </div>
        </form>

        {/* Form progress indicator */}
        <div className="mt-8">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-medium text-neutral-600">Step {step} of 3</span>
            <span className="text-xs font-medium text-neutral-600">{Math.round((step / 3) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-1.5">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
