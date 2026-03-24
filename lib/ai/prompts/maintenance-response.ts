// Priority-specific maintenance response templates

export const MAINTENANCE_PROMPTS: Record<string, string> = {
  emergency: `This is a LIFE SAFETY EMERGENCY. Follow these steps:
1. If there is immediate danger (gas leak, fire, flooding, electrical sparking), instruct the tenant to call 911 first
2. Tell them to evacuate if necessary
3. Dispatch emergency vendor IMMEDIATELY — do not wait for approval
4. Notify the property manager via urgent SMS
5. Provide the tenant with the emergency vendor's direct phone number
6. Follow up within 30 minutes to confirm vendor arrival
Response tone: Calm, authoritative, action-oriented. No filler words.`,

  high: `This is an URGENT maintenance issue. Follow these steps:
1. Acknowledge the issue and reassure the tenant
2. Dispatch a vendor within 2 hours
3. Provide estimated arrival window
4. Send confirmation text with work order number
5. Schedule follow-up in 4 hours if not resolved
Response tone: Professional, empathetic, efficient.`,

  medium: `This is a STANDARD maintenance request. Follow these steps:
1. Acknowledge the issue
2. Create work order and assign to appropriate vendor category
3. Schedule within 24-48 hours
4. Provide work order number and expected timeline
5. Ask if there's a preferred time window
Response tone: Friendly, helpful, informative.`,

  low: `This is a LOW PRIORITY / COSMETIC issue. Follow these steps:
1. Acknowledge the request
2. Log the work order
3. Schedule within 5-7 business days
4. Explain timeline and set expectations
5. Offer to batch with other non-urgent items for the unit
Response tone: Friendly, transparent about timeline.`,
};

export const MAINTENANCE_CATEGORIES: Record<string, string> = {
  plumbing: 'Pipes, faucets, toilets, water heater, garbage disposal, water leaks, sewer',
  electrical: 'Outlets, switches, breakers, wiring, light fixtures, electrical panel',
  hvac: 'Air conditioning, heating, thermostat, ductwork, ventilation, furnace',
  appliance: 'Refrigerator, stove, oven, dishwasher, washer, dryer, microwave',
  pest: 'Insects, rodents, wildlife, termites, bed bugs, cockroaches',
  structural: 'Foundation, roof, walls, windows, doors, stairs, deck, balcony',
  cosmetic: 'Paint, carpet, tile, countertops, cabinets, trim, baseboards',
  safety: 'Smoke detectors, carbon monoxide, locks, security, handrails, fire extinguisher',
  general: 'Cleaning, landscaping, parking, common areas, storage, mailbox',
  turnover: 'Make-ready, deep clean, repaint, replace carpet, re-key locks',
};

export const VENDOR_DISPATCH_TEMPLATE = (vendorName: string, category: string, eta: string, woNumber: string) =>
  `Your ${category} maintenance request has been logged as work order ${woNumber}. ` +
  `${vendorName} has been assigned and will arrive ${eta}. ` +
  `They will contact you directly to confirm the appointment. ` +
  `If you need to reschedule, reply to this message or call our office.`;
