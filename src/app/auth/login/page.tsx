/* eslint-disable react/no-unescaped-entities */

"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { FiMail, FiLock, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

type FormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const registeredParam = searchParams.get("registered");
  const verifiedParam = searchParams.get("verified");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    if (registeredParam === "true") {
      setSuccess("Your account has been created. Please sign in below.");
      return;
    }
    if (verifiedParam === "true") {
      setSuccess("Your email has been verified. You can now sign in.");
    }
  }, [registeredParam, verifiedParam]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const handleResendVerification = async () => {
    try {
      setResendingEmail(true);
      setError(null);
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || "Verification email sent! Please check your inbox.");
        setShowVerificationHelp(false);
      } else {
        setError(data.message || "Failed to resend verification email. Please try again.");
      }
    } catch (err) {
      console.error("Resend verification error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setResendingEmail(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setShowVerificationHelp(false);
      setUserEmail(data.email);

      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        console.error("NextAuth signIn error:", result.error);
        setError(result.error);
        if (result.error.toLowerCase().includes("verify") || result.error.toLowerCase().includes("pending")) {
          setShowVerificationHelp(true);
        }
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        if (session?.user?.role === 'DISCHARGE_PLANNER') {
          router.push('/discharge-planner');
        } else if (session?.user?.role === 'OPERATOR' && (!callbackUrl || callbackUrl === '/')) {
          // Send operators to /operator so AcceptanceGate can enforce onboarding/BAA redirect
          router.push('/operator');
        } else if (callbackUrl && callbackUrl !== '/') {
          router.push(callbackUrl);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error("Unhandled sign-in exception:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-neutral-50" suppressHydrationWarning />;
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Left panel — brand gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 to-secondary-600">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="relative h-10 w-48">
            <Image
              src="/images/logo.png"
              alt="CareLinkAI"
              fill
              className="object-contain brightness-0 invert"
            />
          </div>

          {/* Hero copy */}
          <div>
            <h1 className="font-serif text-5xl font-normal text-white leading-tight mb-4">
              Care that connects.<br />Trust that lasts.
            </h1>
            <p className="text-white/75 text-lg max-w-sm leading-relaxed">
              AI-powered matching for families, caregivers, and assisted living operators — all in one platform.
            </p>

            <ul className="mt-10 space-y-3">
              {[
                "Personalized AI-powered care matching",
                "HIPAA-compliant secure platform",
                "Streamlined placement process",
                "Comprehensive care management tools",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/90 text-sm">
                  <FiCheckCircle className="flex-shrink-0 text-white/70" size={16} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Footer note */}
          <p className="text-white/50 text-xs">
            © {new Date().getFullYear()} CareLinkAI. Trusted by families across Ohio.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="relative h-10 w-40">
              <Image src="/images/logo.png" alt="CareLinkAI" fill className="object-contain" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card p-8">
            <h2 className="text-2xl font-semibold text-neutral-800 mb-1">Sign in</h2>
            <p className="text-sm text-neutral-500 mb-6">Welcome back — enter your credentials below.</p>

            {/* Error alert */}
            {error && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg flex items-start gap-2">
                <FiAlertCircle className="text-error-500 mt-0.5 flex-shrink-0" size={15} />
                <p className="text-error-700 text-sm">{error}</p>
              </div>
            )}

            {/* Verification help */}
            {showVerificationHelp && (
              <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <FiAlertCircle className="text-primary-500 mt-0.5 flex-shrink-0" size={15} />
                  <div>
                    <h3 className="text-sm font-semibold text-primary-900 mb-1">Email Verification Required</h3>
                    <p className="text-sm text-primary-800">
                      Please check your inbox for a verification link before signing in.
                    </p>
                  </div>
                </div>
                <div className="ml-5 space-y-2">
                  <ul className="text-xs text-primary-700 space-y-1 list-disc list-inside">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you used the correct email address</li>
                    <li>Wait a few minutes for the email to arrive</li>
                  </ul>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary-300 rounded-md text-xs font-medium text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendingEmail ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Sending...
                      </>
                    ) : "Resend Verification Email"}
                  </button>
                </div>
              </div>
            )}

            {/* Success alert */}
            {success && (
              <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-lg flex items-start gap-2">
                <FiCheckCircle className="text-success-500 mt-0.5 flex-shrink-0" size={15} />
                <p className="text-success-700 text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-neutral-400" size={15} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`block w-full pl-10 pr-3 py-2.5 border ${
                      errors.email ? 'border-error-300' : 'border-neutral-300'
                    } rounded-lg shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500 focus:outline-none`}
                    {...register("email", {
                      required: "Email is required",
                      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email address" },
                    })}
                  />
                </div>
                {errors.email && <p className="text-xs text-error-600">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                    Password
                  </label>
                  <Link href="/auth/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-500">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-neutral-400" size={15} />
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`block w-full pl-10 pr-3 py-2.5 border ${
                      errors.password ? 'border-error-300' : 'border-neutral-300'
                    } rounded-lg shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500 focus:outline-none`}
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 8, message: "Password must be at least 8 characters" },
                    })}
                  />
                </div>
                {errors.password && <p className="text-xs text-error-600">{errors.password.message}</p>}
              </div>

              {/* Remember me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700">
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors ${
                  isLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : "Sign in"}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-neutral-500">Or continue with</span>
              </div>
            </div>

            {/* Social sign-in */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-label="Sign in with Google"
                onClick={() => signIn("google")}
                className="w-full inline-flex justify-center items-center py-2 px-4 border border-neutral-300 rounded-lg bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21.805 10.023h-9.18v3.955h5.289c-.228 1.296-.918 2.396-1.955 3.137v2.598h3.162c1.852-1.702 2.914-4.213 2.914-7.19 0-.647-.061-1.282-.18-1.9Z" fill="#4285F4" />
                  <path d="M12.625 22c2.571 0 4.73-.848 6.307-2.302l-3.162-2.598c-.879.588-2.004.935-3.145.935-2.416 0-4.46-1.63-5.188-3.823H4.127v2.702A9.376 9.376 0 0 0 12.626 22Z" fill="#34A853" />
                  <path d="M7.437 14.212a5.675 5.675 0 0 1 0-3.597V7.913H4.127a9.403 9.403 0 0 0 0 8.174l3.31-2.702Z" fill="#FBBC05" />
                  <path d="M12.625 6.357c1.398 0 2.654.48 3.646 1.417l2.734-2.734C17.354 3.257 15.195 2.4 12.625 2.4A9.376 9.376 0 0 0 4.127 7.913l3.31 2.702c.729-2.193 2.773-3.823 5.188-3.823Z" fill="#EA4335" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Sign in with Apple"
                onClick={() => signIn("apple")}
                className="w-full inline-flex justify-center items-center py-2 px-4 border border-neutral-300 rounded-lg bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                  <path d="M16.365 1.43c0 1.14-.53 2.276-1.358 3.1-.827.823-1.972 1.403-3.124 1.323-.098-1.115.449-2.276 1.302-3.063.425-.412.966-.75 1.563-.999.598-.247 1.235-.397 1.617-.397zm4.483 16.364c-.598 1.396-.892 2.023-1.666 3.265-1.087 1.75-2.616 3.913-4.539 3.923-1.788.01-2.245-1.145-4.2-1.135-1.955.01-2.469 1.154-4.257 1.145-1.923-.01-3.52-2.02-4.607-3.77C.884 17.804-.09 13.47 1.586 10.47c.915-1.588 2.546-2.585 4.333-2.585 1.698 0 3.102 1.163 4.2 1.163 1.038 0 2.657-1.428 4.495-1.214.763.037 2.913.3 4.28 2.266-3.566 1.949-2.986 7.103.954 8.696z" />
                </svg>
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-neutral-600">
            Don't have an account?{" "}
            <Link href="/auth/register" className="font-medium text-primary-600 hover:text-primary-500">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
