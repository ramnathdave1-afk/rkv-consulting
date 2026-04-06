export const DEFAULT_CHECKLIST_ITEMS = [
  { type: 'keys_issued', label: 'Keys Issued to Tenant', sort: 1 },
  { type: 'utilities_transferred', label: 'Utilities Transferred', sort: 2 },
  { type: 'inspection_complete', label: 'Move-In Inspection Complete', sort: 3 },
  { type: 'welcome_packet_sent', label: 'Welcome Packet Delivered', sort: 4 },
  { type: 'emergency_contacts_collected', label: 'Emergency Contacts Collected', sort: 5 },
  { type: 'parking_assigned', label: 'Parking Space Assigned', sort: 6 },
  { type: 'mailbox_assigned', label: 'Mailbox Key/Access Assigned', sort: 7 },
] as const;

export type ChecklistItemType = (typeof DEFAULT_CHECKLIST_ITEMS)[number]['type'];
