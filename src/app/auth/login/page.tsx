/* eslint-disable react/no-unescaped-entities */

"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// Icons
import { FiMail, FiLock, FiAlertCircle } from "react-icons/fi";

type FormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  /* --------------------------------------------------------------------
   * Prevent React-hydration mismatches:
   * 1.  Render a minimalist “shell” during SSR (or immediately after an
   *     export build) that matches what the client will first hydrate.
   * 2.  Once we are certain we’re running in the browser (`mounted === true`)
   *     render the full interactive form.
   * ------------------------------------------------------------------ */
  const [mounted, setMounted] = useState(false);

  /* We only mark the component as mounted after the first client render. */
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  /* ------------------------------------------------------------
   * If user was redirected from registration (?registered=true)
   * show a friendly success banner.
   * ---------------------------------------------------------- */
  const registeredParam = searchParams.get("registered");
  /* ------------------------------------------------------------
   * If user just verified their email (?verified=true)
   * display a corresponding success banner.
   * ---------------------------------------------------------- */
  const verifiedParam = searchParams.get("verified");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Show success message only on first render if param exists
  useEffect(() => {
    if (registeredParam === "true") {
      setSuccess("Your account has been created. Please sign in below.");
      return;
    }

    if (verifiedParam === "true") {
      setSuccess("Your email has been verified. You can now sign in.");
    }
  }, [registeredParam, verifiedParam]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn("credentials", {
        redirect: true,
        callbackUrl: "/dashboard",
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        /* ------------------------------------------------------------------
         * Provide more insight in dev tools so we can quickly diagnose
         * credential issues without exposing the details to the end-user.
         * ---------------------------------------------------------------- */
        // eslint-disable-next-line no-console
        console.error("NextAuth signIn error:", result.error);

        setError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      // If redirect is handled by NextAuth, no manual navigation is needed.
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Unhandled sign-in exception:", error);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------
   * During SSR return a minimal placeholder that will be *exactly*
   * the same in the very first client render, avoiding mismatches.
   * ---------------------------------------------------------- */
  if (!mounted) {
    /* The bare minimum that still keeps page height / styling ok. */
    return <div className="min-h-screen bg-gray-50" suppressHydrationWarning />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 opacity-90"></div>
        <div className="absolute inset-0 flex flex-col justify-center items-center p-12 z-10">
          <div className="mb-8">
            <Image 
              src="/logo-white.svg" 
              alt="CareLinkAI Logo" 
              width={200} 
              height={60}
              className="mb-6"
            />
            <h1 className="text-4xl font-bold text-white mb-6">
              Welcome to CareLinkAI
            </h1>
            <p className="text-xl text-blue-100 max-w-md">
              Connect families with the perfect assisted living homes through our AI-powered matching platform.
            </p>
          </div>
          <div className="mt-12 bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-white text-lg font-medium mb-2">Why CareLinkAI?</h3>
            <ul className="text-blue-100 space-y-2">
              <li className="flex items-center">
                <span className="mr-2">✓</span> AI-powered matching for personalized care
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> HIPAA-compliant secure platform
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Streamlined placement process
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Comprehensive care management tools
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image 
              src="/logo.svg" 
              alt="CareLinkAI Logo" 
              width={180} 
              height={50} 
            />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Sign in to your account</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                <FiAlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start">
                <FiAlertCircle className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`block w-full pl-10 pr-3 py-2.5 border ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                    {...register("email", { 
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                      }
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label 
                    htmlFor="password" 
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`block w-full pl-10 pr-3 py-2.5 border ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                    {...register("password", { 
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters"
                      }
                    })}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isLoading ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {/* Google Sign-in */}
                <button
                  type="button"
                  aria-label="Sign in with Google"
                  title="Sign in with Google"
                  onClick={() => signIn("google")}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {/* Google multicolor G logo */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M21.805 10.023h-9.18v3.955h5.289c-.228 1.296-.918 2.396-1.955 3.137v2.598h3.162c1.852-1.702 2.914-4.213 2.914-7.19 0-.647-.061-1.282-.18-1.9Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12.625 22c2.571 0 4.73-.848 6.307-2.302l-3.162-2.598c-.879.588-2.004.935-3.145.935-2.416 0-4.46-1.63-5.188-3.823H4.127v2.702A9.376 9.376 0 0 0 12.626 22Z"
                      fill="#34A853"
                    />
                    <path
                      d="M7.437 14.212a5.675 5.675 0 0 1 0-3.597V7.913H4.127a9.403 9.403 0 0 0 0 8.174l3.31-2.702Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12.625 6.357c1.398 0 2.654.48 3.646 1.417l2.734-2.734C17.354 3.257 15.195 2.4 12.625 2.4A9.376 9.376 0 0 0 4.127 7.913l3.31 2.702c.729-2.193 2.773-3.823 5.188-3.823Z"
                      fill="#EA4335"
                    />
                  </svg>
                </button>

                {/* Apple Sign-in */}
                <button
                  type="button"
                  aria-label="Sign in with Apple"
                  title="Sign in with Apple"
                  onClick={() => signIn("apple")}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M16.365 1.43c0 1.14-.53 2.276-1.358 3.1-.827.823-1.972 1.403-3.124 1.323-.098-1.115.449-2.276 1.302-3.063.425-.412.966-.75 1.563-.999.598-.247 1.235-.397 1.617-.397zm4.483 16.364c-.598 1.396-.892 2.023-1.666 3.265-1.087 1.75-2.616 3.913-4.539 3.923-1.788.01-2.245-1.145-4.2-1.135-1.955.01-2.469 1.154-4.257 1.145-1.923-.01-3.52-2.02-4.607-3.77C.884 17.804-.09 13.47 1.586 10.47c.915-1.588 2.546-2.585 4.333-2.585 1.698 0 3.102 1.163 4.2 1.163 1.038 0 2.657-1.428 4.495-1.214.763.037 2.913.3 4.28 2.266-3.566 1.949-2.986 7.103.954 8.696z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link 
              href="/auth/register" 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
