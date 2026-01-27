"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiLock, FiEye, FiEyeOff, FiCheck, FiAlertCircle, FiArrowLeft } from "react-icons/fi";

type FormData = {
  password: string;
  confirmPassword: string;
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenChecking, setTokenChecking] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const password = watch("password", "");

  // Password strength requirements
  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /[0-9]/.test(password) },
    { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const allRequirementsMet = requirements.every((req) => req.met);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        setTokenChecking(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-reset-token?token=${token}`);
        const data = await response.json();
        setTokenValid(data.valid);
      } catch {
        setTokenValid(false);
      } finally {
        setTokenChecking(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (data: FormData) => {
    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking token
  if (tokenChecking) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3978FC] mx-auto mb-4"></div>
        <p className="text-slate-500">Verifying reset link...</p>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <FiAlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid or Expired Link</h2>
        <p className="text-slate-500 mb-6">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-block w-full py-3 px-4 bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white font-semibold rounded-lg hover:opacity-90 transition-all text-center"
        >
          Request New Reset Link
        </Link>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <FiCheck className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset Successfully</h2>
        <p className="text-slate-500 mb-6">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Link
          href="/auth/login"
          className="block w-full py-3 px-4 bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white font-semibold rounded-lg hover:opacity-90 transition-all text-center"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#7253B7]/10 rounded-full mb-4">
          <FiLock className="w-8 h-8 text-[#7253B7]" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset Your Password</h1>
        <p className="text-slate-500">Enter your new password below.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <FiAlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* New Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiLock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-[#3978FC] focus:border-transparent transition-colors ${
                errors.password ? "border-red-300 bg-red-50" : "border-slate-300 bg-white"
              }`}
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <FiEyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              ) : (
                <FiEye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
          )}

          {/* Password Requirements */}
          {password && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-medium text-slate-600 mb-2">Password Requirements:</p>
              <ul className="space-y-1">
                {requirements.map((req, index) => (
                  <li
                    key={index}
                    className={`flex items-center text-xs ${
                      req.met ? "text-green-600" : "text-slate-400"
                    }`}
                  >
                    {req.met ? (
                      <FiCheck className="w-3 h-3 mr-2" />
                    ) : (
                      <span className="w-3 h-3 mr-2 rounded-full border border-slate-300" />
                    )}
                    {req.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiLock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-[#3978FC] focus:border-transparent transition-colors ${
                errors.confirmPassword ? "border-red-300 bg-red-50" : "border-slate-300 bg-white"
              }`}
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === password || "Passwords do not match",
              })}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <FiEyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              ) : (
                <FiEye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !allRequirementsMet}
          className="w-full py-3 px-4 bg-gradient-to-r from-[#3978FC] to-[#7253B7] text-white font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#3978FC] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Resetting Password...
            </>
          ) : (
            "Reset Password"
          )}
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center text-sm text-[#3978FC] hover:text-[#7253B7] font-medium transition-colors"
        >
          <FiArrowLeft className="mr-2" />
          Back to Login
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#3978FC]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#7253B7]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="relative h-12 w-48 mx-auto">
              <Image
                src="/images/logo.png"
                alt="CareLinkAI"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <Suspense
            fallback={
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3978FC] mx-auto mb-4"></div>
                <p className="text-slate-500">Loading...</p>
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500">
          Need help?{" "}
          <Link href="/contact" className="text-[#3978FC] hover:underline font-medium">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
