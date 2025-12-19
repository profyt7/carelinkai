export const responseTemplates = {
  INITIAL_INQUIRY: {
    subject: 'Thank you for your inquiry - CareLinkAI',
    prompt: 'Generate a warm, welcoming initial response to a family inquiry about senior care.',
  },
  
  URGENT_INQUIRY: {
    subject: 'URGENT: We\'re here to help - CareLinkAI',
    prompt: 'Generate an urgent but calm response acknowledging the time-sensitive nature of their inquiry.',
  },
  
  FOLLOW_UP_NO_RESPONSE: {
    subject: 'Following up on your senior care inquiry',
    prompt: 'Generate a gentle follow-up for an inquiry that hasn\'t received a response.',
  },
  
  TOUR_SCHEDULED: {
    subject: 'Your tour is confirmed - CareLinkAI',
    prompt: 'Generate a confirmation message for a scheduled tour with helpful preparation tips.',
  },
  
  ADDITIONAL_INFO: {
    subject: 'Additional information about senior care options',
    prompt: 'Generate an informative response providing additional details about care options.',
  },
};

export function getTemplateForInquiry(inquiry: any): string {
  if (inquiry.urgency === 'URGENT') {
    return 'URGENT_INQUIRY';
  }
  
  if (inquiry.status === 'NEW') {
    return 'INITIAL_INQUIRY';
  }
  
  if (inquiry.status === 'TOUR_SCHEDULED') {
    return 'TOUR_SCHEDULED';
  }
  
  return 'INITIAL_INQUIRY';
}
