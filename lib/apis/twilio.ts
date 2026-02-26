import twilio from 'twilio'

// ── Client Setup ────────────────────────────────────────────────────────────

const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
const authToken = process.env.TWILIO_AUTH_TOKEN || ''
const fromNumber = process.env.TWILIO_PHONE_NUMBER || ''

const client = twilio(accountSid, authToken)

// ── Response Types ──────────────────────────────────────────────────────────

export interface SMSResult {
  sid: string
  to: string
  from: string
  body: string
  status: string
  dateCreated: Date
  direction: string
  price: string | null
  errorCode: number | null
  errorMessage: string | null
}

export interface CallResult {
  sid: string
  to: string
  from: string
  status: string
  startTime: Date | null
  endTime: Date | null
  duration: string | null
  direction: string
  price: string | null
  phoneNumberSid: string
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Send an SMS message via Twilio.
 * @param to   - Destination phone number in E.164 format (e.g. +14155551234).
 * @param body - The text content of the message.
 */
export async function sendSMS(
  to: string,
  body: string
): Promise<SMSResult | null> {
  try {
    const message = await client.messages.create({
      to,
      from: fromNumber,
      body,
    })

    return {
      sid: message.sid,
      to: message.to,
      from: message.from,
      body: message.body,
      status: message.status,
      dateCreated: message.dateCreated,
      direction: message.direction,
      price: message.price,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
    }
  } catch (error) {
    console.error('[Twilio] sendSMS failed:', error)
    return null
  }
}

/**
 * Initiate an outbound phone call via Twilio.
 * @param to    - Destination phone number in E.164 format.
 * @param twiml - TwiML instructions for the call (e.g. "<Response><Say>Hello</Say></Response>").
 */
export async function makeCall(
  to: string,
  twiml: string
): Promise<CallResult | null> {
  try {
    const call = await client.calls.create({
      to,
      from: fromNumber,
      twiml,
    })

    return {
      sid: call.sid,
      to: call.to,
      from: call.from,
      status: call.status,
      startTime: call.startTime,
      endTime: call.endTime,
      duration: call.duration,
      direction: call.direction,
      price: call.price,
      phoneNumberSid: call.phoneNumberSid,
    }
  } catch (error) {
    console.error('[Twilio] makeCall failed:', error)
    return null
  }
}
