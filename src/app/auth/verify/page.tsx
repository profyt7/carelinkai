"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FiAlertCircle, FiCheckCircle, FiLoader, FiMail } from "react-icons/fi";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle");
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Verify token when component mounts if token is present
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    // Explicitly return undefined so all code paths have a return statement
    return undefined;
  }, [countdown]);

  // Function to verify the token
  async function verifyToken(verificationToken: string) {
    setIsVerifying(true);
    setVerificationStatus("idle");
    setMessage("");

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus("success");
        setMessage(data.message || "Your email has been verified successfully!");
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
          router.push("/auth/login?verified=true");
        }, 5000);
      } else {
        setVerificationStatus("error");
        setMessage(data.message || "Verification failed. The token may be invalid or expired.");
      }
    } catch (error) {
      setVerificationStatus("error");
      setMessage("An error occurred during verification. Please try again.");
      console.error("Verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  }

  // Function to resend verification email
  async function resendVerificationEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || isResending || countdown > 0) return;

    setIsResending(true);
    setResendStatus("idle");
    setMessage("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendStatus("success");
        setMessage(data.message || "Verification email has been resent. Please check your inbox.");
        setEmail("");
        setCountdown(60); // Set a 60-second cooldown
      } else {
        setResendStatus("error");
        setMessage(data.message || "Failed to resend verification email.");
      }
    } catch (error) {
      setResendStatus("error");
      setMessage("An error occurred. Please try again.");
      console.error("Resend verification error:", error);
    } finally {
      setIsResending(false);
    }
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
              Email Verification
            </h1>
            <p className="text-xl text-blue-100 max-w-md">
              Thank you for verifying your email address. This helps us ensure the security of your account.
            </p>
          </div>
          <div className="mt-12 bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-white text-lg font-medium mb-2">Why verify your email?</h3>
            <ul className="text-blue-100 space-y-2">
              <li className="flex items-center">
                <span className="mr-2">✓</span> Confirm your account ownership
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Receive important notifications
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Enhance your account security
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Access all platform features
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - Verification Content */}
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
            {/* Token verification section */}
            {token && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Email Verification
                </h2>
                
                {isVerifying ? (
                  <div className="text-center py-8">
                    <FiLoader className="animate-spin text-blue-500 text-4xl mx-auto mb-4" />
                    <p className="text-gray-600">Verifying your email...</p>
                  </div>
                ) : verificationStatus === "success" ? (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                      <FiCheckCircle className="text-green-500 text-3xl" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">Verification Successful!</h3>
                    <p className="text-gray-600 mb-4">{message}</p>
                    <p className="text-sm text-gray-500">Redirecting to login page in 5 seconds...</p>
                    <Link 
                      href="/auth/login?verified=true" 
                      className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Go to Login
                    </Link>
                  </div>
                ) : verificationStatus === "error" ? (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                      <FiAlertCircle className="text-red-500 text-3xl" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">Verification Failed</h3>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <p className="text-gray-600 mb-4">
                      Please try again or request a new verification email below.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Resend verification section */}
            {(!token || verificationStatus === "error") && (
              <div className={token ? "mt-8 pt-8 border-t border-gray-200" : ""}>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {!token ? "Email Verification" : "Resend Verification Email"}
                </h2>
                <p className="text-gray-600 mb-6">
                  {!token 
                    ? "Enter your email address to verify your account or request a new verification email."
                    : "Request a new verification email by entering your email address below."}
                </p>

                {resendStatus === "success" && (
                  <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-md flex items-start">
                    <FiCheckCircle className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-green-700 text-sm">{message}</p>
                  </div>
                )}

                {resendStatus === "error" && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                    <FiAlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{message}</p>
                  </div>
                )}

                <form onSubmit={resendVerificationEmail} className="space-y-5">
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isResending || countdown > 0}
                      className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        (isResending || countdown > 0) ? "opacity-75 cursor-not-allowed" : ""
                      }`}
                    >
                      {isResending ? (
                        <>
                          <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                          Sending...
                        </>
                      ) : countdown > 0 ? (
                        `Resend in ${countdown}s`
                      ) : (
                        "Send Verification Email"
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-600">
                    Already verified? {" "}
                    <Link 
                      href="/auth/login" 
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
