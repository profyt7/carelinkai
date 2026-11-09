"use client";

/**
 * Google / Apple sign-in buttons. Rendered only when OAUTH_SIGNIN_ENABLED is on
 * (src/lib/auth-ui/oauth.ts). Kept for later: turning the flag on is not enough,
 * the matching NextAuth providers must also be added to src/lib/auth.ts.
 */
import { signIn } from "next-auth/react";

export default function SocialSignIn() {
  return (
    <>
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
    </>
  );
}
