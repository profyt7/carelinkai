/* eslint-disable react/no-unescaped-entities */

"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";

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
  FiCheckCircle
} from "react-icons/fi";

// Types from schema
type UserRole = "FAMILY" | "OPERATOR" | "CAREGIVER" | "AFFILIATE";

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  agreeToTerms: boolean;
};

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
    id: "CAREGIVER", 
    label: "Caregiver", 
    description: "I provide care services to residents",
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
  }, []);

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    trigger,
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      role: "FAMILY",
      agreeToTerms: false
    }
  });

  // Watch password for confirmation validation
  const password = watch("password");
  const currentRole = watch("role");

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registrationData } = data;

      // Call registration API
      const response = await axios.post("/api/auth/register", registrationData);

      // Show success message
      setSuccess(true);

      // Redirect to login after successful registration
      setTimeout(() => {
        router.push("/auth/login?registered=true");
      }, 3000);
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(
        error.response?.data?.message || 
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
    } else if (step === 2) {
      fieldsToValidate = ["firstName", "lastName", "phone"];
    }
    
    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid) {
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
              Your account has been created. Redirecting you to login...
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

        {error && (
          <div className="mb-6 p-3 bg-error-50 border border-error-200 rounded-md flex items-center text-error-800">
            <FiAlertCircle className="h-5 w-5 mr-2 text-error-500" />
            <span className="text-sm">{error}</span>
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
                    className={`form-input block w-full pl-10 py-2 rounded-md shadow-sm ${
                      errors.email ? "border-error-300 focus:ring-error-500 focus:border-error-500" : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                    }`}
                    placeholder="you@example.com"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
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
                    type="password"
                    autoComplete="new-password"
                    className={`form-input block w-full pl-10 py-2 rounded-md shadow-sm ${
                      errors.password ? "border-error-300 focus:ring-error-500 focus:border-error-500" : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                    }`}
                    placeholder="••••••••"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                        message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
                      },
                    })}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
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
                    type="password"
                    autoComplete="new-password"
                    className={`form-input block w-full pl-10 py-2 rounded-md shadow-sm ${
                      errors.confirmPassword ? "border-error-300 focus:ring-error-500 focus:border-error-500" : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500"
                    }`}
                    placeholder="••••••••"
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: value => value === password || "Passwords do not match",
                    })}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-error-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Password requirements */}
              <div className="bg-neutral-50 p-3 rounded-md">
                <p className="text-xs text-neutral-600 font-medium mb-2">Password requirements:</p>
                <ul className="text-xs text-neutral-500 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• At least one uppercase letter (A-Z)</li>
                  <li>• At least one lowercase letter (a-z)</li>
                  <li>• At least one number (0-9)</li>
                  <li>• At least one special character (@$!%*?&)</li>
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
                  <p className="mt-1 text-sm text-error-600">{errors.firstName.message}</p>
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
                  <p className="mt-1 text-sm text-error-600">{errors.lastName.message}</p>
                )}
              </div>

              {/* Phone Field (Optional) */}
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
                    {...register("phone", {
                      pattern: {
                        value: /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
                        message: "Invalid phone number format",
                      },
                    })}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-error-600">{errors.phone.message}</p>
                )}
              </div>
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
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  isLoading || !isValid
                    ? "bg-primary-400 cursor-not-allowed"
                    : "bg-primary-600 hover:bg-primary-700"
                }`}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
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
