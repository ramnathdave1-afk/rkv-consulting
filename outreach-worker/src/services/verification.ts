import { createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('verification');

export type VerificationResult = 'valid' | 'invalid' | 'catch-all' | 'unknown';

/**
 * STUB: Verify an email address using ZeroBounce (or configured service).
 * TODO: Implement with real EMAIL_VERIFY_API_KEY.
 *
 * Would call: GET https://api.zerobounce.net/v2/validate
 *   ?api_key=KEY&email=EMAIL&ip_address=
 *
 * Returns: valid, invalid, catch-all, or unknown
 */
export async function verifyEmail(email: string): Promise<VerificationResult> {
  log.warn(`Email verification is a stub - returning 'valid' for ${email}`);

  // TODO: Implement real verification
  // const service = process.env.EMAIL_VERIFY_SERVICE || 'zerobounce';
  // const apiKey = process.env.EMAIL_VERIFY_API_KEY;
  //
  // if (service === 'zerobounce') {
  //   const response = await fetch(
  //     `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${email}&ip_address=`
  //   );
  //   const data = await response.json();
  //   switch (data.status) {
  //     case 'valid': return 'valid';
  //     case 'invalid': return 'invalid';
  //     case 'catch-all': return 'catch-all';
  //     default: return 'unknown';
  //   }
  // }

  return 'valid';
}

/**
 * STUB: Batch verify a list of email addresses.
 */
export async function verifyEmailBatch(
  emails: string[]
): Promise<Map<string, VerificationResult>> {
  log.warn(`Batch verification is a stub - returning 'valid' for ${emails.length} emails`);

  const results = new Map<string, VerificationResult>();
  for (const email of emails) {
    results.set(email, 'valid');
  }
  return results;
}
