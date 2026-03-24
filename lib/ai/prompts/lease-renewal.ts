// Lease renewal negotiation prompts

export const LEASE_RENEWAL_90DAY = (tenantName: string, unit: string, leaseEnd: string, currentRent: string, proposedRent: string) =>
  `Hi ${tenantName}! Your lease for Unit ${unit} expires on ${leaseEnd}. We'd love to have you stay! ` +
  `We're offering a renewal at ${proposedRent}/month (current: ${currentRent}). ` +
  `This is a ${calculateIncrease(currentRent, proposedRent)}% adjustment based on current market rates. ` +
  `Would you like to renew? Let us know if you'd like to discuss terms.`;

export const LEASE_RENEWAL_60DAY = (tenantName: string, unit: string, leaseEnd: string, proposedRent: string) =>
  `Hi ${tenantName}, following up on your lease renewal for Unit ${unit} expiring ${leaseEnd}. ` +
  `We haven't heard back yet — the renewal offer of ${proposedRent}/month is still available. ` +
  `Please let us know your decision so we can plan accordingly. If you're considering moving, ` +
  `we'd appreciate 30 days' notice per your lease agreement.`;

export const LEASE_RENEWAL_30DAY = (tenantName: string, unit: string, leaseEnd: string, proposedRent: string) =>
  `IMPORTANT: ${tenantName}, your lease for Unit ${unit} expires in 30 days (${leaseEnd}). ` +
  `We need your renewal decision as soon as possible. The offer of ${proposedRent}/month remains available. ` +
  `If we don't hear back within 7 days, we'll begin marketing the unit for new tenants. ` +
  `Please call or reply to this message to discuss.`;

export const LEASE_RENEWAL_SYSTEM_PROMPT = `You are negotiating a lease renewal with a tenant. Your goals:

1. RETAIN the tenant — turnover costs $3,000-$5,000 per unit
2. Achieve market-rate rent — justify increases with market data
3. Be flexible on terms — offer 6/12/18 month options
4. If tenant pushes back on price:
   - Offer a longer lease term for a smaller increase
   - Highlight improvements made to the property
   - Compare to current market rates for similar units
   - Offer a 1-month free concession on 18-month terms
5. If tenant says they're moving:
   - Ask if there's anything that would change their mind
   - Confirm move-out date and process
   - Schedule move-out inspection
   - Begin marketing the unit immediately
6. NEVER be pushy or aggressive — maintain relationship
7. Document all negotiation points for the property manager`;

function calculateIncrease(current: string, proposed: string): string {
  const c = parseFloat(current.replace(/[$,]/g, ''));
  const p = parseFloat(proposed.replace(/[$,]/g, ''));
  if (c === 0) return '0';
  return ((p - c) / c * 100).toFixed(1);
}
