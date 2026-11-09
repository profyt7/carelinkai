/* eslint-disable react/no-unescaped-entities */

"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import SocialSignIn from "@/components/auth/SocialSignIn";
import { OAUTH_SIGNIN_ENABLED } from "@/lib/auth-ui/oauth";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { FiMail, FiLock, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { errorSummary } from '@/lib/log-safe';

type FormData = {
  email: string;
  password: string;
  twoFactorCode?: string;
};

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const registeredParam = searchParams.get("registered");
  const verifiedParam = searchParams.get("verified");
  const verifyParam = searchParams.get("verify");
  const emailParam = searchParams.get("email");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  // P0-2: second step — shown when the server answers TWO_FACTOR_REQUIRED. No session exists until the code is accepted.
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);

  useEffect(() => {
    // Post-registration: an account starts PENDING and CANNOT sign in until the
    // emailed verification link is clicked. Guide the user to verify rather than
    // (misleadingly) telling them to sign in. Surface the resend control too.
    if (verifyParam === "1") {
      setSuccess(
        emailParam
          ? `Account created. We've sent a verification link to ${emailParam} — please verify your email before signing in.`
          : "Account created. We've sent you a verification link — please verify your email before signing in."
      );
      if (emailParam) setUserEmail(emailParam);
      setShowVerificationHelp(true);
      return;
    }
    if (registeredParam === "true") {
      // Legacy entry point — still gated on verification, so don't imply "just sign in".
      setSuccess("Account created. Please verify your email before signing in — check your inbox for the verification link.");
      setShowVerificationHelp(true);
      return;
    }
    if (verifiedParam === "true") {
      setSuccess("Your email has been verified. You can now sign in.");
    }
  }, [registeredParam, verifiedParam, verifyParam, emailParam]);

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
      console.error("Resend verification error:", errorSummary(err));
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
        ...(needsTwoFactor && data.twoFactorCode ? { twoFactorCode: data.twoFactorCode.trim() } : {}),
      });

      if (result?.error === "TWO_FACTOR_REQUIRED") {
        setNeedsTwoFactor(true);
        setIsLoading(false);
        return;
      }

      if (result?.error) {
        console.error('NextAuth signIn error');
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
      console.error("Unhandled sign-in exception:", errorSummary(err));
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
                "HIPAA-aligned secure platform",
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

              {needsTwoFactor && (
                <div className="space-y-1.5">
                  <label htmlFor="twoFactorCode" className="block text-sm font-medium text-neutral-700">
                    Authentication code
                  </label>
                  <input
                    id="twoFactorCode"
                    type="text"
                    inputMode="text"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="6-digit code or backup code"
                    className="block w-full px-3 py-2.5 border border-neutral-300 rounded-lg shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
                    {...register("twoFactorCode", { required: "Enter the code from your authenticator app" })}
                  />
                  <p className="text-xs text-neutral-500">Open your authenticator app, or use one of your backup codes.</p>
                  {errors.twoFactorCode && <p className="text-xs text-error-600">{errors.twoFactorCode.message}</p>}
                </div>
              )}

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
                ) : needsTwoFactor ? "Verify and sign in" : "Sign in"}
              </button>
            </form>

            {/* Google / Apple: hidden until OAuth providers are configured (see src/lib/auth-ui/oauth.ts). */}
            {OAUTH_SIGNIN_ENABLED && <SocialSignIn />}
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
