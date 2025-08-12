/**
 * Email Templates for CareLinkAI
 * 
 * This file contains all email templates used throughout the application.
 * Templates are HIPAA-compliant and designed for healthcare communications.
 * Each template includes both HTML and text versions for accessibility.
 * 
 * Templates follow best practices:
 * - No PHI (Protected Health Information) in subject lines
 * - Clear sender identification
 * - Professional healthcare styling
 * - Mobile-responsive design
 * - Accessibility considerations
 */

// Email template interface
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Common colors and styling variables
const colors = {
  primary: '#0066cc',
  secondary: '#6c757d',
  success: '#28a745',
  light: '#f8f9fa',
  dark: '#343a40',
  white: '#ffffff',
  lightGray: '#e9ecef',
};

const fontFamily = 'Arial, Helvetica, sans-serif';

// Common HTML header and footer for consistent branding
const htmlHeader = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CareLinkAI</title>
  <style>
    body {
      font-family: ${fontFamily};
      line-height: 1.6;
      color: ${colors.dark};
      margin: 0;
      padding: 0;
      background-color: ${colors.lightGray};
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: ${colors.white};
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 1px solid ${colors.lightGray};
    }
    .content {
      padding: 20px 0;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: ${colors.secondary};
      padding: 20px 0;
      border-top: 1px solid ${colors.lightGray};
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: ${colors.primary};
      color: ${colors.white} !important;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin: 20px 0;
    }
    .secondary-button {
      display: inline-block;
      padding: 10px 20px;
      background-color: ${colors.secondary};
      color: ${colors.white} !important;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin: 20px 0;
    }
    .info {
      background-color: ${colors.lightGray};
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    a {
      color: ${colors.primary};
      text-decoration: underline;
    }
    h1, h2, h3 {
      color: ${colors.primary};
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: ${colors.primary};">CareLinkAI</h1>
    </div>
    <div class="content">
`;

const htmlFooter = `
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} CareLinkAI. All rights reserved.</p>
      <p>This message contains confidential information and is intended only for the individual named.</p>
      <p>If you are not the intended recipient, you should not disseminate, distribute or copy this email.</p>
      <p>Please notify the sender immediately by email if you have received this email by mistake and delete this email from your system.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Email Verification Template
 * 
 * @param name User's name
 * @param verificationUrl URL for email verification
 * @param expiryHours Hours until the verification link expires
 * @param isResend Whether this is a resend of the verification email
 * @returns Email template with subject, HTML, and text versions
 */
export function getEmailVerificationTemplate(
  name: string,
  verificationUrl: string,
  expiryHours: number = 24,
  isResend: boolean = false
): EmailTemplate {
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() + expiryHours);
  
  const subject = `${isResend ? 'Reminder: ' : ''}Verify Your CareLinkAI Account`;
  
  const html = `${htmlHeader}
      <h2>${isResend ? 'Reminder: ' : ''}Verify Your Email Address</h2>
      <p>Hello${name ? ` ${name}` : ''},</p>
      <p>Thank you for creating a CareLinkAI account. To ensure the security of your account and to activate all features, please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      
      <div class="info">
        <p>This verification link will expire in ${expiryHours} hours (${expiryTime.toLocaleString()}).</p>
        <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      </div>
      
      <p>If you did not create a CareLinkAI account, please disregard this email or contact our support team if you have concerns.</p>
      
      <p>Thank you,<br>The CareLinkAI Team</p>
  ${htmlFooter}`;
  
  const text = `
${isResend ? 'REMINDER: ' : ''}VERIFY YOUR CARELINKAI ACCOUNT

Hello${name ? ` ${name}` : ''},

Thank you for creating a CareLinkAI account. To ensure the security of your account and to activate all features, please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in ${expiryHours} hours (${expiryTime.toLocaleString()}).

If you did not create a CareLinkAI account, please disregard this email or contact our support team if you have concerns.

Thank you,
The CareLinkAI Team

© ${new Date().getFullYear()} CareLinkAI. All rights reserved.
This message contains confidential information and is intended only for the individual named.
If you are not the intended recipient, you should not disseminate, distribute or copy this email.
  `;
  
  return { subject, html, text };
}

/**
 * Password Reset Template
 * 
 * @param name User's name
 * @param resetUrl URL for password reset
 * @param expiryMinutes Minutes until the reset link expires
 * @returns Email template with subject, HTML, and text versions
 */
export function getPasswordResetTemplate(
  name: string,
  resetUrl: string,
  expiryMinutes: number = 30
): EmailTemplate {
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + expiryMinutes);
  
  const subject = `Reset Your CareLinkAI Password`;
  
  const html = `${htmlHeader}
      <h2>Password Reset Request</h2>
      <p>Hello${name ? ` ${name}` : ''},</p>
      <p>We received a request to reset the password for your CareLinkAI account. To create a new password, please click the button below:</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      
      <div class="info">
        <p>This password reset link will expire in ${expiryMinutes} minutes (${expiryTime.toLocaleString()}).</p>
        <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      </div>
      
      <p>If you did not request a password reset, please ignore this email or contact our support team immediately if you believe your account may have been compromised.</p>
      
      <p>For security reasons, this link can only be used once. It will lead you to a page where you can set a new password.</p>
      
      <p>Thank you,<br>The CareLinkAI Team</p>
  ${htmlFooter}`;
  
  const text = `
RESET YOUR CARELINKAI PASSWORD

Hello${name ? ` ${name}` : ''},

We received a request to reset the password for your CareLinkAI account. To create a new password, please click the link below:

${resetUrl}

This password reset link will expire in ${expiryMinutes} minutes (${expiryTime.toLocaleString()}).

If you did not request a password reset, please ignore this email or contact our support team immediately if you believe your account may have been compromised.

For security reasons, this link can only be used once. It will lead you to a page where you can set a new password.

Thank you,
The CareLinkAI Team

© ${new Date().getFullYear()} CareLinkAI. All rights reserved.
This message contains confidential information and is intended only for the individual named.
If you are not the intended recipient, you should not disseminate, distribute or copy this email.
  `;
  
  return { subject, html, text };
}

/**
 * Two-Factor Authentication Setup Template
 * 
 * @param name User's name
 * @param setupTime Time when 2FA was set up
 * @returns Email template with subject, HTML, and text versions
 */
export function get2FASetupTemplate(
  name: string,
  setupTime: Date = new Date()
): EmailTemplate {
  const subject = `Two-Factor Authentication Enabled on Your CareLinkAI Account`;
  
  const html = `${htmlHeader}
      <h2>Two-Factor Authentication Enabled</h2>
      <p>Hello${name ? ` ${name}` : ''},</p>
      <p>This email confirms that two-factor authentication (2FA) has been successfully enabled on your CareLinkAI account.</p>
      
      <div class="info">
        <p><strong>Time of Change:</strong> ${setupTime.toLocaleString()}</p>
      </div>
      
      <p>With 2FA enabled, your account now has an additional layer of security. Each time you sign in, you'll need to provide:</p>
      <ol>
        <li>Your password</li>
        <li>A verification code from your authenticator app</li>
      </ol>
      
      <p>If you did not enable two-factor authentication on your account, please contact our support team immediately as your account may have been compromised.</p>
      
      <p>Thank you for helping keep your CareLinkAI account secure.</p>
      
      <p>Thank you,<br>The CareLinkAI Team</p>
  ${htmlFooter}`;
  
  const text = `
TWO-FACTOR AUTHENTICATION ENABLED ON YOUR CARELINKAI ACCOUNT

Hello${name ? ` ${name}` : ''},

This email confirms that two-factor authentication (2FA) has been successfully enabled on your CareLinkAI account.

Time of Change: ${setupTime.toLocaleString()}

With 2FA enabled, your account now has an additional layer of security. Each time you sign in, you'll need to provide:
1. Your password
2. A verification code from your authenticator app

If you did not enable two-factor authentication on your account, please contact our support team immediately as your account may have been compromised.

Thank you for helping keep your CareLinkAI account secure.

Thank you,
The CareLinkAI Team

© ${new Date().getFullYear()} CareLinkAI. All rights reserved.
This message contains confidential information and is intended only for the individual named.
If you are not the intended recipient, you should not disseminate, distribute or copy this email.
  `;
  
  return { subject, html, text };
}

/**
 * Account Status Change Template
 * 
 * @param name User's name
 * @param newStatus New account status
 * @param reason Reason for status change (optional)
 * @returns Email template with subject, HTML, and text versions
 */
export function getAccountStatusChangeTemplate(
  name: string,
  newStatus: string,
  reason?: string
): EmailTemplate {
  const statusMap: Record<string, { title: string, description: string }> = {
    ACTIVE: {
      title: 'Your CareLinkAI Account is Now Active',
      description: 'Your account has been activated and you now have full access to all features of CareLinkAI.'
    },
    PENDING: {
      title: 'Your CareLinkAI Account is Pending Approval',
      description: 'Your account is currently pending approval. You will receive another email once your account has been reviewed.'
    },
    SUSPENDED: {
      title: 'Your CareLinkAI Account Has Been Suspended',
      description: 'Your account has been temporarily suspended. During this time, you will not be able to access CareLinkAI services.'
    },
    DEACTIVATED: {
      title: 'Your CareLinkAI Account Has Been Deactivated',
      description: 'Your account has been deactivated. If you believe this was done in error, please contact our support team.'
    }
  };
  
  const statusInfo = statusMap[newStatus] || {
    title: 'Your CareLinkAI Account Status Has Changed',
    description: `Your account status has been updated to ${newStatus}.`
  };
  
  const subject = statusInfo.title;
  
  const html = `${htmlHeader}
      <h2>${statusInfo.title}</h2>
      <p>Hello${name ? ` ${name}` : ''},</p>
      <p>${statusInfo.description}</p>
      
      ${reason ? `
      <div class="info">
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
      ` : ''}
      
      <p>If you have any questions about this change or need assistance, please contact our support team.</p>
      
      <div style="text-align: center;">
        <a href="mailto:support@carelinkai.com" class="secondary-button">Contact Support</a>
      </div>
      
      <p>Thank you,<br>The CareLinkAI Team</p>
  ${htmlFooter}`;
  
  const text = `
${statusInfo.title.toUpperCase()}

Hello${name ? ` ${name}` : ''},

${statusInfo.description}

${reason ? `Reason: ${reason}

` : ''}If you have any questions about this change or need assistance, please contact our support team at support@carelinkai.com.

Thank you,
The CareLinkAI Team

© ${new Date().getFullYear()} CareLinkAI. All rights reserved.
This message contains confidential information and is intended only for the individual named.
If you are not the intended recipient, you should not disseminate, distribute or copy this email.
  `;
  
  return { subject, html, text };
}

/**
 * Login Notification Template
 * 
 * @param name User's name
 * @param loginTime Time of login
 * @param ipAddress IP address used for login
 * @param deviceInfo Device information
 * @param location Approximate location (city/country)
 * @returns Email template with subject, HTML, and text versions
 */
export function getLoginNotificationTemplate(
  name: string,
  loginTime: Date = new Date(),
  ipAddress: string = 'Unknown',
  deviceInfo: string = 'Unknown device',
  location: string = 'Unknown location'
): EmailTemplate {
  const subject = `New Sign-In to Your CareLinkAI Account`;
  
  const html = `${htmlHeader}
      <h2>New Sign-In Detected</h2>
      <p>Hello${name ? ` ${name}` : ''},</p>
      <p>We detected a new sign-in to your CareLinkAI account. If this was you, no action is needed.</p>
      
      <div class="info">
        <p><strong>Time:</strong> ${loginTime.toLocaleString()}</p>
        <p><strong>Device:</strong> ${deviceInfo}</p>
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>IP Address:</strong> ${ipAddress}</p>
      </div>
      
      <p>If you don't recognize this activity, please secure your account immediately by:</p>
      <ol>
        <li>Changing your password</li>
        <li>Enabling two-factor authentication if you haven't already</li>
        <li>Contacting our support team</li>
      </ol>
      
      <div style="text-align: center;">
        <a href="https://carelinkai.com/account/security" class="button">Review Account Security</a>
      </div>
      
      <p>Thank you,<br>The CareLinkAI Team</p>
  ${htmlFooter}`;
  
  const text = `
NEW SIGN-IN TO YOUR CARELINKAI ACCOUNT

Hello${name ? ` ${name}` : ''},

We detected a new sign-in to your CareLinkAI account. If this was you, no action is needed.

Time: ${loginTime.toLocaleString()}
Device: ${deviceInfo}
Location: ${location}
IP Address: ${ipAddress}

If you don't recognize this activity, please secure your account immediately by:
1. Changing your password
2. Enabling two-factor authentication if you haven't already
3. Contacting our support team

You can review your account security at: https://carelinkai.com/account/security

Thank you,
The CareLinkAI Team

© ${new Date().getFullYear()} CareLinkAI. All rights reserved.
This message contains confidential information and is intended only for the individual named.
If you are not the intended recipient, you should not disseminate, distribute or copy this email.
  `;
  
  return { subject, html, text };
}

/**
 * Welcome Template
 * 
 * @param name User's name
 * @param role User's role in the system
 * @param verificationUrl URL for email verification (if needed)
 * @returns Email template with subject, HTML, and text versions
 */
export function getWelcomeTemplate(
  name: string,
  role: string = 'user',
  verificationUrl?: string
): EmailTemplate {
  const roleSpecificContent: Record<string, { greeting: string, nextSteps: string[] }> = {
    FAMILY: {
      greeting: 'Welcome to CareLinkAI! We're here to help you find the perfect care solution for your loved one.',
      nextSteps: [
        'Complete your family profile',
        'Add information about your loved one's care needs',
        'Browse available assisted living homes',
        'Schedule tours with homes that match your needs'
      ]
    },
    OPERATOR: {
      greeting: 'Welcome to CareLinkAI! We're excited to partner with you to showcase your assisted living homes.',
      nextSteps: [
        'Complete your operator profile',
        'Add your assisted living homes to the platform',
        'Upload photos and details about your facilities',
        'Set up your availability for tours and inquiries'
      ]
    },
    CAREGIVER: {
      greeting: 'Welcome to CareLinkAI! We're glad to have you join our network of professional caregivers.',
      nextSteps: [
        'Complete your caregiver profile',
        'Upload your credentials and certifications',
        'Set your availability and service areas',
        'Browse open positions at assisted living homes'
      ]
    },
    ADMIN: {
      greeting: 'Welcome to CareLinkAI! You've been granted administrator access to the platform.',
      nextSteps: [
        'Familiarize yourself with the admin dashboard',
        'Review pending approvals and verifications',
        'Set up system configurations',
        'Monitor platform activity and reports'
      ]
    },
    AFFILIATE: {
      greeting: 'Welcome to CareLinkAI! We're excited to have you as an affiliate partner.',
      nextSteps: [
        'Complete your affiliate profile',
        'Access your unique referral links',
        'Review the commission structure',
        'Start sharing CareLinkAI with your network'
      ]
    }
  };
  
  const normalizedRole = role.toUpperCase();
  const content = roleSpecificContent[normalizedRole] || {
    greeting: 'Welcome to CareLinkAI! We're glad to have you join our community.',
    nextSteps: [
      'Complete your profile',
      'Explore the platform features',
      'Set your notification preferences',
      'Reach out to our support team if you need assistance'
    ]
  };
  
  const subject = `Welcome to CareLinkAI`;
  
  const html = `${htmlHeader}
      <h2>Welcome to CareLinkAI!</h2>
      <p>Hello${name ? ` ${name}` : ''},</p>
      <p>${content.greeting}</p>
      
      <h3>Next Steps:</h3>
      <ol>
        ${content.nextSteps.map(step => `<li>${step}</li>`).join('\n        ')}
      </ol>
      
      ${verificationUrl ? `
      <p>To get started, please verify your email address:</p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      ` : `
      <div style="text-align: center;">
        <a href="https://carelinkai.com/dashboard" class="button">Go to Dashboard</a>
      </div>
      `}
      
      <p>If you have any questions or need assistance, our support team is here to help.</p>
      
      <p>Thank you for choosing CareLinkAI. We look forward to supporting you on this journey.</p>
      
      <p>Best regards,<br>The CareLinkAI Team</p>
  ${htmlFooter}`;
  
  const text = `
WELCOME TO CARELINKAI

Hello${name ? ` ${name}` : ''},

${content.greeting}

Next Steps:
${content.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

${verificationUrl ? `
To get started, please verify your email address:
${verificationUrl}
` : `
Visit your dashboard at: https://carelinkai.com/dashboard
`}

If you have any questions or need assistance, our support team is here to help.

Thank you for choosing CareLinkAI. We look forward to supporting you on this journey.

Best regards,
The CareLinkAI Team

© ${new Date().getFullYear()} CareLinkAI. All rights reserved.
This message contains confidential information and is intended only for the individual named.
If you are not the intended recipient, you should not disseminate, distribute or copy this email.
  `;
  
  return { subject, html, text };
}

/**
 * System Notification Template
 * 
 * @param name User's name
 * @param title Notification title
 * @param message Notification message
 * @param actionUrl URL for the primary action (optional)
 * @param actionText Text for the action button (optional)
 * @returns Email template with subject, HTML, and text versions
 */
export function getSystemNotificationTemplate(
  name: string,
  title: string,
  message: string,
  actionUrl?: string,
  actionText: string = 'View Details'
): EmailTemplate {
  const subject = `CareLinkAI Notification: ${title}`;
  
  const html = `${htmlHeader}
      <h2>${title}</h2>
      <p>Hello${name ? ` ${name}` : ''},</p>
      <p>${message}</p>
      
      ${actionUrl ? `
      <div style="text-align: center;">
        <a href="${actionUrl}" class="button">${actionText}</a>
      </div>
      ` : ''}
      
      <p>Thank you,<br>The CareLinkAI Team</p>
  ${htmlFooter}`;
  
  const text = `
CARELINKAI NOTIFICATION: ${title}

Hello${name ? ` ${name}` : ''},

${message}

${actionUrl ? `
${actionText}: ${actionUrl}
` : ''}

Thank you,
The CareLinkAI Team

© ${new Date().getFullYear()} CareLinkAI. All rights reserved.
This message contains confidential information and is intended only for the individual named.
If you are not the intended recipient, you should not disseminate, distribute or copy this email.
  `;
  
  return { subject, html, text };
}
