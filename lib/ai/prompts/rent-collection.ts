// 3-tier rent collection escalation prompts

export const RENT_REMINDER_FRIENDLY = (tenantName: string, amount: string, dueDate: string, unit: string) =>
  `Hi ${tenantName}! Just a friendly reminder that your rent of ${amount} for Unit ${unit} was due on ${dueDate}. ` +
  `If you've already sent it, please disregard this message. If not, you can pay online through your tenant portal or send a check. Let me know if you have any questions!`;

export const RENT_REMINDER_FIRM = (tenantName: string, amount: string, daysLate: number, unit: string, lateFee: string) =>
  `Hi ${tenantName}, this is a follow-up regarding your rent payment of ${amount} for Unit ${unit}, which is now ${daysLate} days past due. ` +
  `A late fee of ${lateFee} has been applied per your lease agreement. Please submit payment as soon as possible to avoid additional fees. ` +
  `If you're experiencing financial difficulty, please contact our office to discuss payment options.`;

export const RENT_REMINDER_FINAL = (tenantName: string, amount: string, totalDue: string, unit: string, daysLate: number) =>
  `IMPORTANT NOTICE: ${tenantName}, your rent for Unit ${unit} is now ${daysLate} days past due. ` +
  `Total balance due including late fees: ${totalDue}. ` +
  `Per your lease agreement, failure to pay within the next 3 business days may result in formal eviction proceedings. ` +
  `Please contact our office immediately at your earliest convenience to resolve this matter. Payment plans may be available.`;

export function getRentCollectionTier(daysLate: number): 'friendly' | 'firm' | 'final' {
  if (daysLate <= 5) return 'friendly';
  if (daysLate <= 15) return 'firm';
  return 'final';
}

export const RENT_COLLECTION_SYSTEM_PROMPT = `You are a property management rent collection assistant. Your goal is to collect rent while maintaining a positive tenant relationship.

Rules:
- NEVER threaten or use aggressive language
- ALWAYS offer payment options when appropriate
- If tenant mentions financial hardship, offer to discuss payment plans
- If tenant disputes the amount, log the dispute and escalate to management
- If tenant becomes hostile, de-escalate and offer to have a manager call back
- Document every interaction for legal compliance
- Follow Fair Housing Act — never discriminate based on protected classes
- After 30 days late, recommend formal notice process to property manager`;
