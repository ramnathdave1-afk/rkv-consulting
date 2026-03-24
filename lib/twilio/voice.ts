// TwiML generators for voice agent

const VOICE = 'Polly.Joanna'; // AWS Polly neural voice — professional female
const LANGUAGE = 'en-US';

export function generateVoiceGreeting(orgName: string, webhookBase: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${VOICE}" language="${LANGUAGE}">Thank you for calling ${orgName} property management. I'm your A.I. assistant and I can help with maintenance requests, lease questions, rent payments, and more.</Say>
  <Pause length="1"/>
  <Say voice="${VOICE}" language="${LANGUAGE}">How can I help you today?</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${webhookBase}/api/twilio/voice/process" method="POST">
    <Say voice="${VOICE}" language="${LANGUAGE}"></Say>
  </Gather>
  <Say voice="${VOICE}" language="${LANGUAGE}">I didn't catch that. Let me transfer you to our team.</Say>
  <Redirect>${webhookBase}/api/twilio/voice/transfer</Redirect>
</Response>`;
}

export function generateVoiceResponse(text: string, webhookBase: string, conversationId?: string): string {
  const actionUrl = conversationId
    ? `${webhookBase}/api/twilio/voice/process?conversation_id=${conversationId}`
    : `${webhookBase}/api/twilio/voice/process`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${VOICE}" language="${LANGUAGE}">${escapeXml(text)}</Say>
  <Pause length="1"/>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${actionUrl}" method="POST">
    <Say voice="${VOICE}" language="${LANGUAGE}">Is there anything else I can help with?</Say>
  </Gather>
  <Say voice="${VOICE}" language="${LANGUAGE}">Thank you for calling. Have a great day!</Say>
  <Hangup/>
</Response>`;
}

export function transferToHuman(staffPhone: string, message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${VOICE}" language="${LANGUAGE}">${escapeXml(message)}</Say>
  <Dial timeout="30" callerId="+15551234567">
    <Number>${staffPhone}</Number>
  </Dial>
  <Say voice="${VOICE}" language="${LANGUAGE}">I'm sorry, no one is available right now. Please leave a message after the beep and someone will call you back within the hour.</Say>
  <Record maxLength="120" action="/api/twilio/voice/voicemail" />
</Response>`;
}

export function endCall(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${VOICE}" language="${LANGUAGE}">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
}

export function generateOutboundScript(purpose: string, tenantName: string, details: string, webhookBase: string): string {
  const scripts: Record<string, string> = {
    rent_reminder: `Hi ${tenantName}, this is an automated call from your property management team. We noticed your rent payment is past due. The outstanding balance is ${details}. Would you like to make a payment over the phone, or should I send you a payment link via text?`,
    maintenance_update: `Hi ${tenantName}, this is your property management calling about your maintenance request. ${details}. Is there anything else you need regarding this work order?`,
    lease_renewal: `Hi ${tenantName}, this is your property management team. Your lease is coming up for renewal. ${details}. Would you like to discuss renewal terms?`,
    showing_confirmation: `Hi ${tenantName}, this is a reminder about your property showing today. ${details}. Will you still be able to make it?`,
  };

  const script = scripts[purpose] || `Hi ${tenantName}, this is your property management team calling. ${details}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="${VOICE}" language="${LANGUAGE}">${escapeXml(script)}</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${webhookBase}/api/twilio/voice/process" method="POST">
    <Say voice="${VOICE}" language="${LANGUAGE}"></Say>
  </Gather>
  <Say voice="${VOICE}" language="${LANGUAGE}">Thank you for your time. If you need anything, you can call or text us anytime. Goodbye!</Say>
  <Hangup/>
</Response>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
