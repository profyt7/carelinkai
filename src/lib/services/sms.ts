import twilio from 'twilio';

let twilioClient: any = null;

function getClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env['TWILIO_ACCOUNT_SID'];
  const authToken = process.env['TWILIO_AUTH_TOKEN'];

  if (!accountSid || !authToken) {
    return null;
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

export async function sendSms({
  to,
  body
}: {
  to: string;
  body: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const from = process.env['TWILIO_FROM'];

  if (!from) {
    return {
      success: false,
      error: 'Missing Twilio FROM number (TWILIO_FROM)'
    };
  }

  const client = getClient();
  if (!client) {
    return {
      success: false,
      error: 'Missing Twilio configuration (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)'
    };
  }

  try {
    const message = await client.messages.create({
      body,
      from,
      to
    });

    return {
      success: true,
      sid: message.sid
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
}
