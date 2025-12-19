import { InquiryStage, InquiryUrgency, InquirySource } from '@prisma/client';

export interface FollowUpRule {
  name: string;
  description: string;
  conditions: {
    stage?: InquiryStage[];
    urgency?: InquiryUrgency[];
    source?: InquirySource[];
    daysAfterInquiry?: number;
    daysAfterLastContact?: number;
    noResponseDays?: number;
  };
  action: {
    type: 'EMAIL' | 'SMS' | 'PHONE_CALL' | 'TASK';
    delayHours: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    content?: string;
  };
}

export const defaultFollowUpRules: FollowUpRule[] = [
  // Rule 1: Immediate follow-up for urgent inquiries
  {
    name: 'Urgent Inquiry Immediate Follow-up',
    description: 'Send immediate follow-up for urgent inquiries',
    conditions: {
      stage: ['NEW'],
      urgency: ['URGENT'],
      daysAfterInquiry: 0,
    },
    action: {
      type: 'SMS',
      delayHours: 1, // 1 hour after inquiry
      priority: 'HIGH',
    },
  },
  
  // Rule 2: First follow-up for new inquiries (24 hours)
  {
    name: 'New Inquiry First Follow-up',
    description: 'First follow-up 24 hours after initial contact',
    conditions: {
      stage: ['CONTACTED'],
      daysAfterLastContact: 1,
    },
    action: {
      type: 'EMAIL',
      delayHours: 24,
      priority: 'MEDIUM',
    },
  },
  
  // Rule 3: Second follow-up (3 days)
  {
    name: 'Second Follow-up',
    description: 'Follow-up if no response after 3 days',
    conditions: {
      stage: ['CONTACTED'],
      noResponseDays: 3,
    },
    action: {
      type: 'EMAIL',
      delayHours: 72,
      priority: 'MEDIUM',
    },
  },
  
  // Rule 4: Third follow-up (7 days)
  {
    name: 'Third Follow-up',
    description: 'Final follow-up after 7 days',
    conditions: {
      stage: ['CONTACTED'],
      noResponseDays: 7,
    },
    action: {
      type: 'EMAIL',
      delayHours: 168,
      priority: 'LOW',
    },
  },
  
  // Rule 5: Tour reminder (1 day before)
  {
    name: 'Tour Reminder',
    description: 'Reminder 1 day before scheduled tour',
    conditions: {
      stage: ['TOUR_SCHEDULED'],
    },
    action: {
      type: 'SMS',
      delayHours: 24,
      priority: 'HIGH',
    },
  },
  
  // Rule 6: Post-tour follow-up
  {
    name: 'Post-Tour Follow-up',
    description: 'Follow-up 1 day after tour',
    conditions: {
      stage: ['TOUR_SCHEDULED'],
      daysAfterLastContact: 2,
    },
    action: {
      type: 'EMAIL',
      delayHours: 48,
      priority: 'HIGH',
    },
  },
  
  // Rule 7: High urgency no response
  {
    name: 'High Urgency No Response',
    description: 'Quick follow-up for high urgency with no response',
    conditions: {
      urgency: ['HIGH'],
      noResponseDays: 2,
    },
    action: {
      type: 'SMS',
      delayHours: 48,
      priority: 'HIGH',
    },
  },
];

export class FollowUpRulesEngine {
  private rules: FollowUpRule[];
  
  constructor(customRules?: FollowUpRule[]) {
    this.rules = customRules || defaultFollowUpRules;
  }
  
  /**
   * Evaluate which rules apply to an inquiry
   */
  evaluateRules(inquiry: any, lastContact?: Date): FollowUpRule[] {
    const applicableRules: FollowUpRule[] = [];
    const now = new Date();
    
    for (const rule of this.rules) {
      if (this.ruleMatches(rule, inquiry, lastContact, now)) {
        applicableRules.push(rule);
      }
    }
    
    // Sort by priority
    return applicableRules.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.action.priority] - priorityOrder[a.action.priority];
    });
  }
  
  /**
   * Check if a rule matches an inquiry
   */
  private ruleMatches(
    rule: FollowUpRule,
    inquiry: any,
    lastContact: Date | undefined,
    now: Date
  ): boolean {
    const { conditions } = rule;
    
    // Check stage
    if (conditions.stage && !conditions.stage.includes(inquiry.stage)) {
      return false;
    }
    
    // Check urgency
    if (conditions.urgency && !conditions.urgency.includes(inquiry.urgency)) {
      return false;
    }
    
    // Check source
    if (conditions.source && !conditions.source.includes(inquiry.source)) {
      return false;
    }
    
    // Check days after inquiry
    if (conditions.daysAfterInquiry !== undefined) {
      const daysSinceInquiry = this.daysBetween(inquiry.createdAt, now);
      if (daysSinceInquiry < conditions.daysAfterInquiry) {
        return false;
      }
    }
    
    // Check days after last contact
    if (conditions.daysAfterLastContact !== undefined && lastContact) {
      const daysSinceContact = this.daysBetween(lastContact, now);
      if (daysSinceContact < conditions.daysAfterLastContact) {
        return false;
      }
    }
    
    // Check no response days
    if (conditions.noResponseDays !== undefined && lastContact) {
      const daysSinceContact = this.daysBetween(lastContact, now);
      if (daysSinceContact < conditions.noResponseDays) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Get recommended follow-up schedule for an inquiry
   */
  getFollowUpSchedule(inquiry: any): Date[] {
    const schedule: Date[] = [];
    const rules = this.evaluateRules(inquiry);
    
    for (const rule of rules) {
      const followUpDate = new Date();
      followUpDate.setHours(followUpDate.getHours() + rule.action.delayHours);
      schedule.push(followUpDate);
    }
    
    return schedule;
  }
}

export const followUpRulesEngine = new FollowUpRulesEngine();
