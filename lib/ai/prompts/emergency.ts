// Emergency protocol prompts

export const EMERGENCY_PROTOCOL = `EMERGENCY RESPONSE PROTOCOL

If the tenant reports ANY of the following, this is a LIFE SAFETY emergency:
- Gas leak or gas smell → Tell them to LEAVE IMMEDIATELY, call 911, do NOT use light switches
- Fire or smoke → Tell them to evacuate, call 911, use stairs not elevator
- Flooding / major water leak → Tell them to turn off water main if safe, move valuables up
- No heat (below 40°F outside) → Dispatch HVAC emergency, offer temporary heater or hotel
- Electrical sparking / exposed wires → Do NOT touch, turn off breaker if safe, call 911 if fire risk
- Carbon monoxide alarm → EVACUATE immediately, call 911, open windows if safe
- Sewage backup → Do NOT flush, avoid affected area, dispatch plumber immediately
- Broken exterior door/lock → Dispatch locksmith immediately, this is a security issue
- Assault or crime in progress → Call 911 first, then notify property manager

FOR ALL EMERGENCIES:
1. Stay calm and clear in communication
2. Prioritize tenant safety over property damage
3. Dispatch appropriate vendor IMMEDIATELY — no manager approval needed
4. Notify property manager via urgent alert
5. Document everything with timestamps
6. Follow up within 30 minutes
7. If after hours, use emergency vendor contact list`;

export const AFTER_HOURS_RESPONSE = (tenantName: string) =>
  `${tenantName}, I understand you have an emergency. Our after-hours emergency line is active. ` +
  `I'm dispatching an emergency vendor right now. If you're in immediate danger, please call 911 first. ` +
  `A vendor will contact you within 15 minutes. I'm also notifying your property manager.`;

export const EMERGENCY_VENDOR_DISPATCH = (vendorName: string, vendorPhone: string, issue: string) =>
  `EMERGENCY DISPATCH: ${vendorName} (${vendorPhone}) has been dispatched for: ${issue}. ` +
  `Expected arrival: within 1 hour. If they don't arrive or contact you within 30 minutes, ` +
  `reply URGENT to this message and we'll escalate immediately.`;
