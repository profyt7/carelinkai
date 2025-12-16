/**
 * Tour Notification Service
 * 
 * Handles all tour-related notifications:
 * - Tour confirmation emails
 * - Tour reminders (24h, 2h before)
 * - Cancellation notifications
 * - Rescheduling notifications
 * 
 * For MVP: Logs to console (can integrate real email service later)
 */

interface TourDetails {
  tourId: string;
  homeName: string;
  homeAddress: string;
  confirmedTime: Date;
  familyName: string;
  familyEmail: string;
  operatorName: string;
  operatorEmail: string;
  familyNotes?: string;
  operatorNotes?: string;
}

/**
 * Send tour confirmation email to family and operator
 */
export async function sendTourConfirmationEmail(tour: TourDetails): Promise<void> {
  console.log("\n========== TOUR CONFIRMATION EMAIL ==========");
  console.log("TO: Family");
  console.log(`Email: ${tour.familyEmail}`);
  console.log(`Subject: Your Tour at ${tour.homeName} is Confirmed`);
  console.log("\n--- Email Body (Family) ---");
  console.log(generateFamilyConfirmationEmail(tour));
  console.log("\n===========================================\n");

  console.log("\n========== TOUR CONFIRMATION EMAIL ==========");
  console.log("TO: Operator");
  console.log(`Email: ${tour.operatorEmail}`);
  console.log(`Subject: New Tour Scheduled at ${tour.homeName}`);
  console.log("\n--- Email Body (Operator) ---");
  console.log(generateOperatorConfirmationEmail(tour));
  console.log("\n===========================================\n");

  // TODO: In production, integrate with email service (SendGrid, AWS SES, etc.)
  // Example:
  // await emailService.send({
  //   to: tour.familyEmail,
  //   subject: `Your Tour at ${tour.homeName} is Confirmed`,
  //   html: generateFamilyConfirmationEmail(tour),
  // });
}

/**
 * Send tour reminder (24 hours before)
 */
export async function sendTour24HourReminder(tour: TourDetails): Promise<void> {
  console.log("\n========== 24-HOUR TOUR REMINDER ==========");
  console.log("TO: Family");
  console.log(`Email: ${tour.familyEmail}`);
  console.log(`Subject: Reminder: Tour Tomorrow at ${tour.homeName}`);
  console.log("\n--- Email Body ---");
  console.log(generate24HourReminderEmail(tour));
  console.log("\n===========================================\n");

  // TODO: Integrate with email service
}

/**
 * Send tour reminder (2 hours before)
 */
export async function sendTour2HourReminder(tour: TourDetails): Promise<void> {
  console.log("\n========== 2-HOUR TOUR REMINDER ==========");
  console.log("TO: Family");
  console.log(`Email: ${tour.familyEmail}`);
  console.log(`Subject: Tour Starting Soon at ${tour.homeName}`);
  console.log("\n--- Email Body ---");
  console.log(generate2HourReminderEmail(tour));
  console.log("\n===========================================\n");

  // TODO: Integrate with email service
}

/**
 * Send tour cancellation email
 */
export async function sendTourCancellationEmail(
  tour: TourDetails,
  cancelledBy: "family" | "operator",
  reason?: string
): Promise<void> {
  console.log("\n========== TOUR CANCELLATION EMAIL ==========");
  console.log(`TO: ${cancelledBy === "family" ? "Operator" : "Family"}`);
  console.log(
    `Email: ${cancelledBy === "family" ? tour.operatorEmail : tour.familyEmail}`
  );
  console.log(`Subject: Tour Cancelled at ${tour.homeName}`);
  console.log("\n--- Email Body ---");
  console.log(generateCancellationEmail(tour, cancelledBy, reason));
  console.log("\n===========================================\n");

  // TODO: Integrate with email service
}

/**
 * Send tour rescheduling email
 */
export async function sendTourReschedulingEmail(
  oldTour: TourDetails,
  newTime: Date
): Promise<void> {
  console.log("\n========== TOUR RESCHEDULING EMAIL ==========");
  console.log("TO: Family & Operator");
  console.log(`Emails: ${oldTour.familyEmail}, ${oldTour.operatorEmail}`);
  console.log(`Subject: Tour Rescheduled at ${oldTour.homeName}`);
  console.log("\n--- Email Body ---");
  console.log(generateReschedulingEmail(oldTour, newTime));
  console.log("\n===========================================\n");

  // TODO: Integrate with email service
}

/**
 * Email template generators
 */

function generateFamilyConfirmationEmail(tour: TourDetails): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Tour is Confirmed! 🎉</h1>
    </div>
    <div class="content">
      <p>Dear ${tour.familyName},</p>
      
      <p>Great news! Your tour at <strong>${tour.homeName}</strong> has been confirmed.</p>
      
      <div class="details">
        <h3>Tour Details:</h3>
        <p><strong>Date & Time:</strong> ${formatDateTime(tour.confirmedTime)}</p>
        <p><strong>Location:</strong> ${tour.homeName}<br/>${tour.homeAddress}</p>
        ${tour.familyNotes ? `<p><strong>Your Notes:</strong> ${tour.familyNotes}</p>` : ""}
      </div>
      
      <h3>What to Expect:</h3>
      <ul>
        <li>Plan to arrive 5-10 minutes early</li>
        <li>Bring a list of questions you'd like to ask</li>
        <li>Feel free to take notes or photos during the tour</li>
        <li>Meet with staff and see the facilities</li>
      </ul>
      
      <p>We'll send you reminder emails 24 hours and 2 hours before your tour.</p>
      
      <p>If you need to cancel or reschedule, please let us know as soon as possible.</p>
      
      <a href="#" class="button">View Tour Details</a>
      
      <p>Looking forward to seeing you!</p>
    </div>
    <div class="footer">
      <p>CareLinkAI - Making senior care simple</p>
      <p>Questions? Contact us at support@carelinkai.com</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateOperatorConfirmationEmail(tour: TourDetails): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .button { display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Tour Scheduled</h1>
    </div>
    <div class="content">
      <p>Hello ${tour.operatorName},</p>
      
      <p>A new tour has been scheduled at <strong>${tour.homeName}</strong>.</p>
      
      <div class="details">
        <h3>Tour Details:</h3>
        <p><strong>Date & Time:</strong> ${formatDateTime(tour.confirmedTime)}</p>
        <p><strong>Family:</strong> ${tour.familyName}</p>
        <p><strong>Contact:</strong> ${tour.familyEmail}</p>
        ${tour.familyNotes ? `<p><strong>Family Notes:</strong> ${tour.familyNotes}</p>` : ""}
      </div>
      
      <h3>Preparation Checklist:</h3>
      <ul>
        <li>Review family notes and special requests</li>
        <li>Prepare tour materials and brochures</li>
        <li>Ensure facility areas are ready for viewing</li>
        <li>Brief staff about the scheduled tour</li>
      </ul>
      
      <a href="#" class="button">Manage Tour</a>
      
      <p>Good luck with your tour!</p>
    </div>
    <div class="footer">
      <p>CareLinkAI Operator Dashboard</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generate24HourReminderEmail(tour: TourDetails): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 8px; 
               border-left: 4px solid #F59E0B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tour Reminder: Tomorrow!</h1>
    </div>
    <div class="content">
      <p>Dear ${tour.familyName},</p>
      
      <p>This is a friendly reminder that your tour is scheduled for tomorrow.</p>
      
      <div class="details">
        <h3>Tour Details:</h3>
        <p><strong>Date & Time:</strong> ${formatDateTime(tour.confirmedTime)}</p>
        <p><strong>Location:</strong> ${tour.homeName}<br/>${tour.homeAddress}</p>
      </div>
      
      <p><strong>Tips for your tour:</strong></p>
      <ul>
        <li>Arrive 5-10 minutes early</li>
        <li>Bring your list of questions</li>
        <li>Take notes during the tour</li>
      </ul>
      
      <p>See you tomorrow!</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generate2HourReminderEmail(tour: TourDetails): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .alert { background-color: #FEE2E2; color: #991B1B; padding: 15px; margin: 15px 0; 
             border-radius: 8px; border-left: 4px solid #EF4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Tour Starting Soon!</h1>
    </div>
    <div class="content">
      <p>Dear ${tour.familyName},</p>
      
      <div class="alert">
        <h3>Your tour starts in about 2 hours!</h3>
        <p><strong>Time:</strong> ${formatDateTime(tour.confirmedTime)}</p>
        <p><strong>Location:</strong> ${tour.homeName}<br/>${tour.homeAddress}</p>
      </div>
      
      <p>We look forward to seeing you soon!</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateCancellationEmail(
  tour: TourDetails,
  cancelledBy: "family" | "operator",
  reason?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6B7280; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tour Cancelled</h1>
    </div>
    <div class="content">
      <p>This tour has been cancelled:</p>
      
      <p><strong>Date & Time:</strong> ${formatDateTime(tour.confirmedTime)}</p>
      <p><strong>Location:</strong> ${tour.homeName}</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      
      <p>If you'd like to reschedule, please contact us.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateReschedulingEmail(oldTour: TourDetails, newTime: Date): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #8B5CF6; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tour Rescheduled</h1>
    </div>
    <div class="content">
      <p>Your tour has been rescheduled:</p>
      
      <p><strong>Previous Time:</strong> ${formatDateTime(oldTour.confirmedTime)}</p>
      <p><strong>New Time:</strong> ${formatDateTime(newTime)}</p>
      <p><strong>Location:</strong> ${oldTour.homeName}</p>
      
      <p>See you at the new time!</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Helper function to format date and time
 */
function formatDateTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return date.toLocaleString("en-US", options);
}

/**
 * Schedule reminder notifications
 * (This would typically be called by a background job/cron)
 */
export async function scheduleReminders(tourId: string, confirmedTime: Date): Promise<void> {
  const now = new Date();
  const tour24HBefore = new Date(confirmedTime.getTime() - 24 * 60 * 60 * 1000);
  const tour2HBefore = new Date(confirmedTime.getTime() - 2 * 60 * 60 * 1000);

  console.log(`\n[Tour Reminders] Scheduled for tour ${tourId}:`);
  console.log(`  - 24h reminder: ${tour24HBefore.toLocaleString()}`);
  console.log(`  - 2h reminder: ${tour2HBefore.toLocaleString()}`);

  // TODO: In production, use a job scheduler (Bull, AWS SQS, etc.)
  // Example:
  // await scheduler.schedule({
  //   jobType: 'tour-reminder-24h',
  //   runAt: tour24HBefore,
  //   data: { tourId }
  // });
}
