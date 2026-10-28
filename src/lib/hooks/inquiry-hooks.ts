import { followUpScheduler } from '../followup/followup-scheduler';

/**
 * Hook to run after inquiry is created
 */
export async function afterInquiryCreated(inquiryId: string): Promise<void> {
  try {
    // Schedule automatic follow-ups based on rules
    await followUpScheduler.scheduleFollowUps(inquiryId);
    console.log(`Auto-scheduled follow-ups for inquiry ${inquiryId}`);
  } catch (error) {
    console.error('Error in afterInquiryCreated hook:', error);
    // Don't throw - we don't want to fail the inquiry creation if follow-up scheduling fails
  }
}

/**
 * Hook to run after inquiry stage changes
 */
export async function afterInquiryStageChanged(
  inquiryId: string,
  newStage: string
): Promise<void> {
  try {
    // Re-evaluate and schedule follow-ups for new stage
    await followUpScheduler.scheduleFollowUps(inquiryId);
    console.log(`Re-scheduled follow-ups for inquiry ${inquiryId} (stage: ${newStage})`);
  } catch (error) {
    console.error('Error in afterInquiryStageChanged hook:', error);
    // Don't throw - we don't want to fail the stage update if follow-up scheduling fails
  }
}

/**
 * Hook to run after inquiry is updated
 */
export async function afterInquiryUpdated(
  inquiryId: string,
  oldData: any,
  newData: any
): Promise<void> {
  try {
    // Check if stage changed
    if (oldData.stage !== newData.stage) {
      await afterInquiryStageChanged(inquiryId, newData.stage);
    }
    
    // Check if urgency changed
    if (oldData.urgency !== newData.urgency) {
      await followUpScheduler.scheduleFollowUps(inquiryId);
      console.log(`Re-scheduled follow-ups for inquiry ${inquiryId} (urgency changed to: ${newData.urgency})`);
    }
  } catch (error) {
    console.error('Error in afterInquiryUpdated hook:', error);
  }
}
