/**
 * Authentication and authorization helpers for Family inquiry submission
 */

import { Session } from "next-auth";

export type InquiryAuthCheck = {
  canSubmit: boolean;
  reason?: string;
  redirectUrl?: string;
  actionRequired?: "login" | "register" | "upgrade_role";
};

/**
 * Check if a user can submit an inquiry/lead
 * @param session - NextAuth session object
 * @param currentUrl - Current page URL (for return after login)
 * @returns Authorization check result with reason and redirect URL
 */
export function canSubmitInquiry(
  session: Session | null,
  currentUrl?: string
): InquiryAuthCheck {
  // Case 1: Not authenticated
  if (!session || !session.user) {
    return {
      canSubmit: false,
      reason: "You must be logged in to submit an inquiry.",
      redirectUrl: `/auth/login${currentUrl ? `?callbackUrl=${encodeURIComponent(currentUrl)}` : ""}`,
      actionRequired: "login",
    };
  }

  // Case 2: Wrong role (not FAMILY)
  if (session.user.role !== "FAMILY") {
    return {
      canSubmit: false,
      reason: "Only family members can submit care inquiries. Please register as a family member to continue.",
      actionRequired: "upgrade_role",
    };
  }

  // Case 3: All checks passed
  return {
    canSubmit: true,
  };
}

/**
 * Get user-friendly error message for inquiry submission failure
 */
export function getInquiryErrorMessage(authCheck: InquiryAuthCheck): string {
  if (authCheck.canSubmit) {
    return "";
  }

  return authCheck.reason || "You cannot submit inquiries at this time.";
}
