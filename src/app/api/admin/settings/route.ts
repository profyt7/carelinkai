import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

// Default settings structure
const DEFAULT_SETTINGS = {
  general: {
    siteName: 'CareLinkAI',
    contactEmail: 'support@carelinkai.com',
    supportPhone: '',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  email: {
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    fromEmail: 'noreply@carelinkai.com',
    fromName: 'CareLinkAI',
    sendWelcomeEmail: true,
    sendNotificationEmails: true,
  },
  features: {
    enableTwoFactor: true,
    enableAuditLogs: true,
    enableAnalytics: true,
    enableNotifications: true,
    enableTourScheduling: true,
    enableDocumentUpload: true,
    enableMessaging: true,
    enableReporting: true,
  },
  security: {
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    requirePasswordChange: false,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
  },
  notifications: {
    emailAlerts: true,
    inAppNotifications: true,
    leadAssignmentNotify: true,
    inquiryResponseNotify: true,
    systemMaintenanceNotify: true,
    dailyDigestEnabled: false,
    dailyDigestTime: '09:00',
  },
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage: 'System is under maintenance. Please try again later.',
    allowAdminAccess: true,
  },
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all settings from database
    const dbSettings = await prisma.systemSettings.findMany();
    
    // Build settings object from database values, falling back to defaults
    const settings: Record<string, Record<string, unknown>> = {};
    
    // Initialize with defaults
    for (const [category, values] of Object.entries(DEFAULT_SETTINGS)) {
      settings[category] = { ...values };
    }
    
    // Override with database values
    for (const setting of dbSettings) {
      if (settings[setting.category]) {
        settings[setting.category][setting.key] = setting.value;
      }
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category, settings: categorySettings } = body;

    if (!category || !categorySettings || typeof categorySettings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Required: category, settings' },
        { status: 400 }
      );
    }

    // Validate category exists in defaults
    if (!DEFAULT_SETTINGS[category as keyof typeof DEFAULT_SETTINGS]) {
      return NextResponse.json(
        { error: 'Invalid settings category' },
        { status: 400 }
      );
    }

    // Update each setting in the category
    const updates: Array<Promise<unknown>> = [];
    const changedSettings: string[] = [];

    for (const [key, value] of Object.entries(categorySettings)) {
      // Verify the key exists in default settings for this category
      const defaultCategory = DEFAULT_SETTINGS[category as keyof typeof DEFAULT_SETTINGS];
      if (key in defaultCategory) {
        changedSettings.push(key);
        updates.push(
          prisma.systemSettings.upsert({
            where: { key: `${category}.${key}` },
            create: {
              key: `${category}.${key}`,
              value: value as object,
              category,
              description: `${category} - ${key}`,
            },
            update: {
              value: value as object,
              updatedAt: new Date(),
            },
          })
        );
      }
    }

    await Promise.all(updates);

    // Log the settings update
    await createAuditLogFromRequest(
      request,
      AuditAction.UPDATE,
      'SYSTEM_SETTINGS',
      `settings-${category}`,
      session.user.id,
      { category, changedSettings }
    );

    return NextResponse.json({ 
      success: true, 
      message: `${category} settings updated successfully`,
      updatedFields: changedSettings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
