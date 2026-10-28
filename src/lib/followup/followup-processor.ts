import { prisma } from '@/lib/prisma';
import { followUpScheduler } from './followup-scheduler';
import { inquiryResponseGenerator } from '../ai/inquiry-response-generator';
import { inquiryEmailService } from '../email/inquiry-email-service';
import { smsService } from '../sms/sms-service';

export class FollowUpProcessor {
  /**
   * Process all due follow-ups
   */
  async processDueFollowUps(): Promise<void> {
    const dueFollowUps = await followUpScheduler.getDueFollowUps();
    
    console.log(`Processing ${dueFollowUps.length} due follow-ups...`);
    
    for (const followUp of dueFollowUps) {
      try {
        await this.processFollowUp(followUp);
      } catch (error) {
        console.error(`Error processing follow-up ${followUp.id}:`, error);
      }
    }
  }
  
  /**
   * Process a single follow-up
   */
  async processFollowUp(followUp: any): Promise<void> {
    const { inquiry } = followUp;
    
    // Generate content if not provided
    let content = followUp.content;
    if (!content) {
      content = await inquiryResponseGenerator.generateResponseForInquiry(
        inquiry.id,
        { type: 'FOLLOW_UP' }
      );
    }
    
    // Send based on type
    let success = false;
    switch (followUp.type) {
      case 'EMAIL':
        success = await this.sendEmailFollowUp(inquiry, content);
        break;
      case 'SMS':
        success = await this.sendSMSFollowUp(inquiry, content);
        break;
      case 'PHONE_CALL':
        success = await this.schedulePhoneCall(inquiry);
        break;
      case 'TASK':
        success = await this.createTask(inquiry);
        break;
    }
    
    // Update follow-up status
    await prisma.followUp.update({
      where: { id: followUp.id },
      data: {
        status: success ? 'COMPLETED' : 'CANCELLED',
        completedAt: success ? new Date() : null,
        content: content,
      },
    });
    
    // Create response record
    if (success) {
      await prisma.inquiryResponse.create({
        data: {
          inquiryId: inquiry.id,
          content,
          type: 'AUTOMATED',
          channel: followUp.type === 'SMS' ? 'SMS' : 'EMAIL',
          sentBy: 'SYSTEM',
          sentAt: new Date(),
          status: 'SENT',
          metadata: {
            followUpId: followUp.id,
            automated: true,
          },
        },
      });
    }
  }
  
  /**
   * Send email follow-up
   */
  private async sendEmailFollowUp(inquiry: any, content: string): Promise<boolean> {
    if (!inquiry.contactEmail) {
      console.log('No email address for follow-up');
      return false;
    }
    
    return inquiryEmailService.sendInquiryResponse(
      inquiry.contactEmail,
      inquiry.contactName,
      content,
      inquiry.id
    );
  }
  
  /**
   * Send SMS follow-up
   */
  private async sendSMSFollowUp(inquiry: any, content: string): Promise<boolean> {
    if (!inquiry.contactPhone) {
      console.log('No phone number for SMS follow-up');
      return false;
    }
    
    // Check if SMS service is configured
    if (!smsService.isConfigured()) {
      console.log('SMS service not configured, skipping SMS follow-up');
      return false;
    }
    
    // Shorten content for SMS (160 characters)
    const smsContent = content.length > 160 
      ? content.substring(0, 157) + '...' 
      : content;
    
    return smsService.sendSMS(inquiry.contactPhone, smsContent);
  }
  
  /**
   * Schedule phone call (creates task for staff)
   */
  private async schedulePhoneCall(inquiry: any): Promise<boolean> {
    // Create a task for staff to call
    await prisma.followUp.create({
      data: {
        inquiryId: inquiry.id,
        scheduledFor: new Date(),
        type: 'TASK',
        content: `Call ${inquiry.contactName} at ${inquiry.contactPhone}`,
        status: 'PENDING',
      },
    });
    return true;
  }
  
  /**
   * Create task for staff
   */
  private async createTask(inquiry: any): Promise<boolean> {
    // Task already exists as the follow-up record
    return true;
  }
  
  /**
   * Update overdue follow-ups
   */
  async updateOverdueFollowUps(): Promise<void> {
    const now = new Date();
    
    await prisma.followUp.updateMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lt: now,
        },
      },
      data: {
        status: 'OVERDUE',
      },
    });
  }
}

export const followUpProcessor = new FollowUpProcessor();
