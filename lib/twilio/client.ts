import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

let _client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!_client) {
    _client = twilio(accountSid, authToken);
  }
  return _client;
}

export async function sendSMS(
  to: string,
  from: string,
  body: string
): Promise<{ sid: string; status: string }> {
  const client = getClient();
  const message = await client.messages.create({ to, from, body });
  return { sid: message.sid, status: message.status };
}

export function validateRequest(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}

export async function purchasePhoneNumber(
  areaCode: string
): Promise<{ phoneNumber: string; sid: string }> {
  const client = getClient();
  const available = await client.availablePhoneNumbers('US').local.list({
    areaCode: parseInt(areaCode),
    smsEnabled: true,
    voiceEnabled: true,
    limit: 1,
  });

  if (available.length === 0) {
    throw new Error(`No phone numbers available for area code ${areaCode}`);
  }

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    smsUrl: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/twilio/incoming`,
    smsMethod: 'POST',
    statusCallback: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/twilio/status`,
    statusCallbackMethod: 'POST',
  });

  return { phoneNumber: purchased.phoneNumber, sid: purchased.sid };
}

export async function configureWebhook(
  phoneSid: string,
  webhookBaseUrl: string
): Promise<void> {
  const client = getClient();
  await client.incomingPhoneNumbers(phoneSid).update({
    smsUrl: `${webhookBaseUrl}/api/twilio/incoming`,
    smsMethod: 'POST',
    statusCallback: `${webhookBaseUrl}/api/twilio/status`,
    statusCallbackMethod: 'POST',
  });
}
