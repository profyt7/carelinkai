import { prisma } from '@/lib/prisma';
import { followUpRulesEngine } from './followup-rules';
import { FollowUpType, FollowUpStatus } from '@prisma/client';

export class FollowUpScheduler {
  /**
   * Schedule automatic follow-ups for an inquiry
   */
  async scheduleFollowUps(inquiryId: string): Promise<void> {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        responses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    
    if (!inquiry) {
      throw new Error('Inquiry not found');
    }
    
    // Get last contact date
    const lastContact = inquiry.responses[0]?.createdAt;
    
    // Evaluate rules
    const applicableRules = followUpRulesEngine.evaluateRules(inquiry, lastContact);
    
    // Schedule follow-ups based on rules
    for (const rule of applicableRules) {
      const scheduledFor = new Date();
      scheduledFor.setHours(scheduledFor.getHours() + rule.action.delayHours);
      
      // Check if similar follow-up already exists
      const existingFollowUp = await prisma.followUp.findFirst({
        where: {
          inquiryId,
          type: rule.action.type as FollowUpType,
          status: 'PENDING',
          scheduledFor: {
            gte: new Date(),
            lte: scheduledFor,
          },
        },
      });
      
      if (!existingFollowUp) {
        await prisma.followUp.create({
          data: {
            inquiryId,
            scheduledFor,
            type: rule.action.type as FollowUpType,
            status: 'PENDING',
            metadata: {
              rule: rule.name,
              priority: rule.action.priority,
              autoScheduled: true,
            },
          },
        });
      }
    }
  }
  
  /**
   * Schedule a manual follow-up
   */
  async scheduleManualFollowUp(
    inquiryId: string,
    scheduledFor: Date,
    type: FollowUpType,
    content?: string
  ): Promise<any> {
    return prisma.followUp.create({
      data: {
        inquiryId,
        scheduledFor,
        type,
        content,
        status: 'PENDING',
        metadata: {
          autoScheduled: false,
        },
      },
    });
  }
  
  /**
   * Cancel a follow-up
   */
  async cancelFollowUp(followUpId: string): Promise<void> {
    await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status: 'CANCELLED',
      },
    });
  }
  
  /**
   * Reschedule a follow-up
   */
  async rescheduleFollowUp(followUpId: string, newDate: Date): Promise<void> {
    await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        scheduledFor: newDate,
        status: 'PENDING',
      },
    });
  }
  
  /**
   * Get pending follow-ups that are due
   */
  async getDueFollowUps(): Promise<any[]> {
    return prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: new Date(),
        },
      },
      include: {
        inquiry: {
          include: {
            home: true,
            family: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });
  }
}

export const followUpScheduler = new FollowUpScheduler();
