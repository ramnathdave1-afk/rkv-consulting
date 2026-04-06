import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── Helpers ───────────────────────────────────────────────────
function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function hoursFromNow(n: number) {
  const d = new Date();
  d.setHours(d.getHours() + n);
  return d.toISOString();
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0];
}

function randomPhone() {
  return `+1480${randomBetween(1000000, 9999999)}`;
}

// ─── Seed Data Definitions ─────────────────────────────────────

const PROPERTIES = [
  {
    name: 'Sunset Ridge Apartments',
    address_line1: '4521 W Sunset Blvd',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85043',
    property_type: 'multifamily',
    unit_count: 24,
    year_built: 2005,
    square_footage: 28800,
    lat: 33.4342,
    lng: -112.1401,
  },
  {
    name: 'Oak Park Townhomes',
    address_line1: '7890 N Scottsdale Rd',
    city: 'Scottsdale',
    state: 'AZ',
    zip: '85253',
    property_type: 'multifamily',
    unit_count: 12,
    year_built: 2012,
    square_footage: 16800,
    lat: 33.5092,
    lng: -111.9261,
  },
  {
    name: 'Desert View Residences',
    address_line1: '1234 E University Dr',
    city: 'Tempe',
    state: 'AZ',
    zip: '85281',
    property_type: 'multifamily',
    unit_count: 36,
    year_built: 1998,
    square_footage: 43200,
    lat: 33.4217,
    lng: -111.9174,
  },
  {
    name: 'Mountain Creek Villas',
    address_line1: '5678 S Power Rd',
    city: 'Mesa',
    state: 'AZ',
    zip: '85212',
    property_type: 'mixed_use',
    unit_count: 18,
    year_built: 2018,
    square_footage: 25200,
    lat: 33.3811,
    lng: -111.6787,
  },
  {
    name: 'Palm Court Studios',
    address_line1: '321 W Chandler Blvd',
    city: 'Chandler',
    state: 'AZ',
    zip: '85225',
    property_type: 'multifamily',
    unit_count: 8,
    year_built: 2020,
    square_footage: 6400,
    lat: 33.3062,
    lng: -111.8413,
  },
];

// Unit templates per property (index)
const UNIT_CONFIGS: {
  prefix: string;
  floors: number;
  perFloor: number;
  plans: { beds: number; baths: number; sqft: [number, number]; rent: [number, number] }[];
}[] = [
  // Sunset Ridge - 24 units, 3 floors x 8
  {
    prefix: '',
    floors: 3,
    perFloor: 8,
    plans: [
      { beds: 1, baths: 1, sqft: [650, 750], rent: [1050, 1200] },
      { beds: 2, baths: 1.5, sqft: [900, 1000], rent: [1350, 1500] },
      { beds: 2, baths: 2, sqft: [1050, 1150], rent: [1500, 1650] },
      { beds: 3, baths: 2, sqft: [1200, 1350], rent: [1750, 1950] },
    ],
  },
  // Oak Park - 12 units, 2 floors x 6
  {
    prefix: '',
    floors: 2,
    perFloor: 6,
    plans: [
      { beds: 2, baths: 1.5, sqft: [1000, 1100], rent: [1500, 1650] },
      { beds: 3, baths: 2, sqft: [1250, 1400], rent: [1800, 2050] },
      { beds: 3, baths: 2.5, sqft: [1350, 1450], rent: [2050, 2200] },
    ],
  },
  // Desert View - 36 units, 3 floors x 12
  {
    prefix: '',
    floors: 3,
    perFloor: 12,
    plans: [
      { beds: 0, baths: 1, sqft: [400, 500], rent: [800, 950] },
      { beds: 1, baths: 1, sqft: [600, 700], rent: [950, 1100] },
      { beds: 1, baths: 1, sqft: [700, 800], rent: [1050, 1200] },
      { beds: 2, baths: 1, sqft: [850, 950], rent: [1200, 1400] },
      { beds: 2, baths: 2, sqft: [1000, 1100], rent: [1350, 1550] },
    ],
  },
  // Mountain Creek - 18 units, A/B buildings, 3 floors x 3
  {
    prefix: 'A',
    floors: 3,
    perFloor: 3,
    plans: [
      { beds: 1, baths: 1, sqft: [700, 800], rent: [1100, 1250] },
      { beds: 2, baths: 2, sqft: [1050, 1200], rent: [1500, 1700] },
      { beds: 3, baths: 2, sqft: [1300, 1400], rent: [1850, 2100] },
    ],
  },
  // Palm Court Studios - 8 units, 2 floors x 4
  {
    prefix: '',
    floors: 2,
    perFloor: 4,
    plans: [
      { beds: 0, baths: 1, sqft: [420, 500], rent: [900, 1000] },
      { beds: 1, baths: 1, sqft: [550, 650], rent: [1050, 1200] },
    ],
  },
];

const FIRST_NAMES = [
  'Maria', 'James', 'Jennifer', 'Robert', 'Patricia', 'Michael', 'Linda', 'David',
  'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Ashley', 'Matthew',
  'Kimberly', 'Anthony', 'Emily', 'Mark', 'Donna', 'Carlos', 'Michelle', 'Jose',
  'Sandra', 'Kevin', 'Dorothy', 'Brian', 'Lisa', 'George', 'Nancy', 'Edward',
  'Betty', 'Ronald', 'Helen', 'Timothy', 'Samantha', 'Jason', 'Katherine', 'Ryan',
  'Christine', 'Jacob', 'Deborah', 'Gary',
];

const LAST_NAMES = [
  'Garcia', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Rodriguez',
  'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
  'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
  'Mitchell', 'Carter', 'Roberts', 'Patel',
];

const VENDOR_DATA = [
  { name: 'Mike Torres', company: 'Ace Plumbing', specialty: ['plumbing'], hourly_rate: 95, is_preferred: true, rating: 4.8, email: 'mike@aceplumbing.com', phone: '+14805551001' },
  { name: 'Dave Wilson', company: 'Valley Electric', specialty: ['electrical'], hourly_rate: 110, is_preferred: true, rating: 4.6, email: 'dave@valleyelectric.com', phone: '+14805551002' },
  { name: 'Carlos Mendez', company: 'Cool Air HVAC', specialty: ['hvac'], hourly_rate: 120, is_preferred: true, rating: 4.9, email: 'carlos@coolairhvac.com', phone: '+14805551003' },
  { name: 'Rick Palmer', company: 'Desert Pest Solutions', specialty: ['pest'], hourly_rate: 75, is_preferred: false, rating: 4.3, email: 'rick@desertpest.com', phone: '+14805551004' },
  { name: 'Steve Martinez', company: 'Handy Pro Services', specialty: ['general', 'cosmetic'], hourly_rate: 65, is_preferred: true, rating: 4.5, email: 'steve@handypro.com', phone: '+14805551005' },
  { name: 'Tom Jackson', company: 'SafeGuard Security', specialty: ['safety'], hourly_rate: 85, is_preferred: false, rating: 4.2, email: 'tom@safeguardsec.com', phone: '+14805551006' },
  { name: 'Paul Chen', company: 'Premier Appliance Repair', specialty: ['appliance'], hourly_rate: 90, is_preferred: true, rating: 4.7, email: 'paul@premierapp.com', phone: '+14805551007' },
  { name: 'Jim Burke', company: 'Structural Solutions Inc', specialty: ['structural'], hourly_rate: 150, is_preferred: false, rating: 4.4, email: 'jim@structsolutions.com', phone: '+14805551008' },
];

const WORK_ORDER_TEMPLATES = [
  { title: 'Leaking kitchen faucet', category: 'plumbing', priority: 'medium', description: 'Tenant reports steady drip from kitchen sink faucet. Has been getting worse over the past week.' },
  { title: 'AC not cooling properly', category: 'hvac', priority: 'high', description: 'Unit AC running but not reaching set temperature. Currently 82F inside with thermostat set to 74F.' },
  { title: 'Broken window lock', category: 'safety', priority: 'high', description: 'Lock mechanism on bedroom window is broken. Window cannot be secured.' },
  { title: 'Garbage disposal jammed', category: 'appliance', priority: 'low', description: 'Kitchen garbage disposal makes humming sound but does not spin. Reset button has been tried.' },
  { title: 'Ceiling fan wobbling', category: 'electrical', priority: 'low', description: 'Master bedroom ceiling fan wobbles significantly at all speeds. Concerned about safety.' },
  { title: 'Toilet running constantly', category: 'plumbing', priority: 'medium', description: 'Toilet in main bathroom runs continuously. Jiggling handle provides temporary fix.' },
  { title: 'Ant infestation in kitchen', category: 'pest', priority: 'medium', description: 'Small black ants appearing near kitchen sink and around baseboards. Multiple sightings daily.' },
  { title: 'Dishwasher not draining', category: 'appliance', priority: 'medium', description: 'Dishwasher leaves standing water at bottom after cycle completes. Food particles visible.' },
  { title: 'Front door deadbolt sticking', category: 'safety', priority: 'high', description: 'Deadbolt lock on front door difficult to turn. Key gets stuck intermittently.' },
  { title: 'Hot water heater making noise', category: 'plumbing', priority: 'medium', description: 'Water heater producing loud popping/knocking sounds. Hot water supply seems reduced.' },
  { title: 'Smoke detector chirping', category: 'safety', priority: 'high', description: 'Smoke detector in hallway chirping every 30 seconds. Battery replacement did not fix.' },
  { title: 'Bathroom exhaust fan not working', category: 'electrical', priority: 'low', description: 'Bathroom vent fan does not turn on. Switch clicks but no response from fan.' },
  { title: 'Drywall crack above doorframe', category: 'cosmetic', priority: 'low', description: 'Hairline crack in drywall above bedroom doorframe. Approximately 8 inches long.' },
  { title: 'Refrigerator making loud buzzing', category: 'appliance', priority: 'medium', description: 'Refrigerator producing constant loud buzzing sound. Temperature seems to be holding for now.' },
  { title: 'Patio sliding door off track', category: 'general', priority: 'medium', description: 'Sliding glass door to patio has come off its track. Difficult to open/close.' },
  { title: 'Clogged bathtub drain', category: 'plumbing', priority: 'medium', description: 'Bathtub draining very slowly. Water backs up during showers.' },
  { title: 'Light fixture flickering', category: 'electrical', priority: 'low', description: 'Kitchen overhead light flickers intermittently. New bulbs have been tried.' },
  { title: 'Stove burner not igniting', category: 'appliance', priority: 'medium', description: 'Front left burner on gas stove clicks but does not ignite. Other burners work fine.' },
  { title: 'Cracked tile in bathroom floor', category: 'cosmetic', priority: 'low', description: 'Single floor tile in bathroom has cracked. No water damage visible underneath.' },
  { title: 'AC filter replacement needed', category: 'hvac', priority: 'low', description: 'Scheduled quarterly AC filter replacement. Tenant reports reduced airflow.' },
  { title: 'Exterior door weather stripping worn', category: 'general', priority: 'low', description: 'Weather stripping around front door is worn and peeling. Light visible around door edges.' },
  { title: 'Kitchen sink sprayer broken', category: 'plumbing', priority: 'low', description: 'Pull-out sprayer on kitchen faucet no longer retracts. Hose appears stretched.' },
  { title: 'Microwave stopped working', category: 'appliance', priority: 'medium', description: 'Built-in microwave powers on but does not heat food. Display works normally.' },
  { title: 'Closet door off hinges', category: 'general', priority: 'low', description: 'Bedroom closet bifold door has come off top hinge track.' },
  { title: 'Water stain on ceiling', category: 'structural', priority: 'high', description: 'Brown water stain appearing on living room ceiling. Approximately 2 feet in diameter and growing.' },
  { title: 'Parking lot pothole', category: 'structural', priority: 'medium', description: 'Large pothole forming near building entrance. Approximately 18 inches wide.' },
  { title: 'Dryer vent blocked', category: 'general', priority: 'medium', description: 'Dryer taking multiple cycles to dry clothes. Lint buildup suspected in vent line.' },
  { title: 'Foundation crack near garage', category: 'structural', priority: 'emergency', description: 'Visible diagonal crack in foundation wall near garage entry. Crack is approximately 1/4 inch wide.' },
];

const DEAL_DATA = [
  {
    address: '8432 N 19th Ave', city: 'Phoenix', state: 'AZ', zip: '85021',
    property_type: 'single_family', bedrooms: 3, bathrooms: 2, square_footage: 1450,
    lot_size_sqft: 7200, year_built: 1978, asking_price: 285000, arv: 380000,
    repair_estimate: 45000, mao: 221000, pipeline_stage: 'analyzing',
    seller_name: 'Robert Whitfield', seller_phone: '+14805559001', seller_email: 'rwhitfield@email.com',
    seller_type: 'motivated', source: 'propstream', deal_score: 72,
    market_score: 78, risk_score: 65, location_score: 80, condition_score: 55,
    arv_confidence: 'high',
  },
  {
    address: '2915 W Camelback Rd', city: 'Phoenix', state: 'AZ', zip: '85017',
    property_type: 'multifamily', bedrooms: 6, bathrooms: 4, square_footage: 3200,
    lot_size_sqft: 9500, year_built: 1965, asking_price: 520000, arv: 720000,
    repair_estimate: 95000, mao: 409000, pipeline_stage: 'offer_sent',
    seller_name: 'Margaret Chen', seller_phone: '+14805559002', seller_email: 'mchen@email.com',
    seller_type: 'absentee', source: 'driving_for_dollars', deal_score: 85,
    market_score: 82, risk_score: 70, location_score: 88, condition_score: 60,
    arv_confidence: 'medium',
  },
  {
    address: '11274 E Cactus Rd', city: 'Scottsdale', state: 'AZ', zip: '85259',
    property_type: 'single_family', bedrooms: 4, bathrooms: 3, square_footage: 2100,
    lot_size_sqft: 12000, year_built: 1992, asking_price: 425000, arv: 560000,
    repair_estimate: 60000, mao: 332000, pipeline_stage: 'lead',
    seller_name: 'Frank Dominguez', seller_phone: '+14805559003', seller_email: null,
    seller_type: 'tax_delinquent', source: 'direct_mail', deal_score: 68,
    market_score: 85, risk_score: 55, location_score: 90, condition_score: 50,
    arv_confidence: 'medium',
  },
  {
    address: '3340 S Mill Ave', city: 'Tempe', state: 'AZ', zip: '85282',
    property_type: 'mixed_use', bedrooms: null, bathrooms: null, square_footage: 4800,
    lot_size_sqft: 8000, year_built: 1988, asking_price: 680000, arv: 920000,
    repair_estimate: 120000, mao: 524000, pipeline_stage: 'negotiating',
    seller_name: 'Valley Trust Holdings LLC', seller_phone: '+14805559004', seller_email: 'info@valleytrust.com',
    seller_type: 'estate', source: 'wholesaler', deal_score: 79,
    market_score: 90, risk_score: 60, location_score: 92, condition_score: 45,
    arv_confidence: 'low',
  },
  {
    address: '6701 W McDowell Rd', city: 'Phoenix', state: 'AZ', zip: '85035',
    property_type: 'single_family', bedrooms: 3, bathrooms: 1.5, square_footage: 1100,
    lot_size_sqft: 6000, year_built: 1972, asking_price: 195000, arv: 290000,
    repair_estimate: 55000, mao: 148000, pipeline_stage: 'under_contract',
    seller_name: 'Diana Kowalski', seller_phone: '+14805559005', seller_email: 'dkowalski@email.com',
    seller_type: 'pre_foreclosure', source: 'referral', deal_score: 82,
    market_score: 70, risk_score: 75, location_score: 65, condition_score: 58,
    arv_confidence: 'high',
  },
  {
    address: '4120 E Baseline Rd', city: 'Mesa', state: 'AZ', zip: '85206',
    property_type: 'single_family', bedrooms: 4, bathrooms: 2, square_footage: 1800,
    lot_size_sqft: 8500, year_built: 2001, asking_price: 350000, arv: 465000,
    repair_estimate: 35000, mao: 290500, pipeline_stage: 'contacted',
    seller_name: 'Samuel Okafor', seller_phone: '+14805559006', seller_email: 'sokafor@email.com',
    seller_type: 'motivated', source: 'zillow', deal_score: 74,
    market_score: 76, risk_score: 72, location_score: 78, condition_score: 70,
    arv_confidence: 'high',
  },
  {
    address: '9521 N 35th St', city: 'Phoenix', state: 'AZ', zip: '85028',
    property_type: 'single_family', bedrooms: 5, bathrooms: 3.5, square_footage: 2800,
    lot_size_sqft: 15000, year_built: 1985, asking_price: 550000, arv: 750000,
    repair_estimate: 80000, mao: 445000, pipeline_stage: 'due_diligence',
    seller_name: 'Patricia Harmon', seller_phone: '+14805559007', seller_email: 'pharmon@email.com',
    seller_type: 'estate', source: 'mls', deal_score: 88,
    market_score: 88, risk_score: 78, location_score: 95, condition_score: 62,
    arv_confidence: 'high',
  },
  {
    address: '1815 W Southern Ave', city: 'Mesa', state: 'AZ', zip: '85202',
    property_type: 'land', bedrooms: null, bathrooms: null, square_footage: null,
    lot_size_sqft: 22000, year_built: null, asking_price: 180000, arv: 320000,
    repair_estimate: 0, mao: 224000, pipeline_stage: 'dead',
    seller_name: 'Horizon Land Group', seller_phone: '+14805559008', seller_email: 'sales@horizonland.com',
    seller_type: 'other', source: 'manual', deal_score: 45,
    market_score: 60, risk_score: 40, location_score: 55, condition_score: null,
    arv_confidence: 'low',
  },
  {
    address: '2280 E Guadalupe Rd', city: 'Gilbert', state: 'AZ', zip: '85234',
    property_type: 'single_family', bedrooms: 3, bathrooms: 2, square_footage: 1600,
    lot_size_sqft: 7800, year_built: 2008, asking_price: 390000, arv: 485000,
    repair_estimate: 25000, mao: 314500, pipeline_stage: 'closed',
    seller_name: 'Yolanda Brooks', seller_phone: '+14805559009', seller_email: 'ybrooks@email.com',
    seller_type: 'motivated', source: 'referral', deal_score: 91,
    market_score: 86, risk_score: 85, location_score: 92, condition_score: 80,
    arv_confidence: 'high',
  },
  {
    address: '7455 W Peoria Ave', city: 'Peoria', state: 'AZ', zip: '85345',
    property_type: 'multifamily', bedrooms: 8, bathrooms: 6, square_footage: 4200,
    lot_size_sqft: 11000, year_built: 1980, asking_price: 620000, arv: 850000,
    repair_estimate: 110000, mao: 485000, pipeline_stage: 'analyzing',
    seller_name: 'Gerald Kim', seller_phone: '+14805559010', seller_email: 'gkim@email.com',
    seller_type: 'absentee', source: 'propstream', deal_score: 76,
    market_score: 72, risk_score: 68, location_score: 74, condition_score: 52,
    arv_confidence: 'medium',
  },
];

const CONVERSATION_TEMPLATES = [
  {
    channel: 'sms' as const,
    status: 'ai_handling' as const,
    participant_name: null, // will be filled from tenant
    messages: [
      { direction: 'inbound', sender_type: 'tenant', content: 'Hi, my kitchen faucet has been leaking for a few days. Can someone come fix it?' },
      { direction: 'outbound', sender_type: 'ai', content: 'Hello! I\'m sorry to hear about the leaking faucet. I\'ve created a maintenance request for you. Can you confirm — is the leak from the base of the faucet or from the spout?' },
      { direction: 'inbound', sender_type: 'tenant', content: 'It\'s dripping from the spout even when turned off. Getting worse' },
      { direction: 'outbound', sender_type: 'ai', content: 'Got it — a dripping spout, likely needs a new cartridge. I\'ve flagged this as medium priority. A plumber will be scheduled within 48 hours. You\'ll receive a confirmation with the appointment time. Is there anything else I can help with?' },
      { direction: 'inbound', sender_type: 'tenant', content: 'No that\'s it, thanks!' },
    ],
  },
  {
    channel: 'email' as const,
    status: 'human_handling' as const,
    participant_name: null,
    messages: [
      { direction: 'inbound', sender_type: 'tenant', content: 'I want to discuss my lease renewal. The proposed rent increase seems very high. I\'ve been a reliable tenant for 2 years and would like to negotiate.' },
      { direction: 'outbound', sender_type: 'ai', content: 'Thank you for reaching out regarding your lease renewal. I understand your concern about the proposed increase. I\'m transferring you to our property manager who can discuss renewal terms with you directly.' },
      { direction: 'outbound', sender_type: 'staff', content: 'Hi there — I\'ve reviewed your account and you\'re right, you\'ve been an excellent tenant. Let me run the numbers and get back to you with a revised offer by end of day tomorrow. Thank you for your patience.' },
    ],
  },
  {
    channel: 'sms' as const,
    status: 'closed' as const,
    participant_name: null,
    messages: [
      { direction: 'inbound', sender_type: 'tenant', content: 'What are the office hours for the leasing office this week?' },
      { direction: 'outbound', sender_type: 'ai', content: 'Our leasing office is open Monday-Friday 9AM to 6PM and Saturday 10AM to 4PM. We\'re closed on Sundays. Would you like to schedule an appointment?' },
      { direction: 'inbound', sender_type: 'tenant', content: 'No just needed to know, thanks!' },
      { direction: 'outbound', sender_type: 'ai', content: 'You\'re welcome! Feel free to reach out anytime. Have a great day!' },
    ],
  },
  {
    channel: 'web_chat' as const,
    status: 'ai_handling' as const,
    participant_name: 'Alex Rivera',
    messages: [
      { direction: 'inbound', sender_type: 'tenant', content: 'Hi, I\'m interested in the 2-bedroom unit you have available. Is it still open?' },
      { direction: 'outbound', sender_type: 'ai', content: 'Hello Alex! Yes, we have a 2-bedroom unit available. It\'s 950 sqft with 1.5 bathrooms, updated kitchen, and in-unit washer/dryer. Monthly rent is $1,450. Would you like to schedule a showing?' },
      { direction: 'inbound', sender_type: 'tenant', content: 'Yes please, do you have anything available this Saturday?' },
      { direction: 'outbound', sender_type: 'ai', content: 'Absolutely! I have openings at 10:00 AM, 11:30 AM, and 2:00 PM this Saturday. Which time works best for you?' },
      { direction: 'inbound', sender_type: 'tenant', content: '11:30 works great' },
      { direction: 'outbound', sender_type: 'ai', content: 'You\'re all set for Saturday at 11:30 AM. I\'ll send you a confirmation with the address and parking instructions. See you then!' },
    ],
  },
  {
    channel: 'sms' as const,
    status: 'ai_handling' as const,
    participant_name: null,
    messages: [
      { direction: 'inbound', sender_type: 'tenant', content: 'EMERGENCY - my unit is flooding from the upstairs bathroom!' },
      { direction: 'outbound', sender_type: 'ai', content: 'I\'m sorry to hear that! This is being treated as an emergency. Please turn off the water supply valve if you can safely access it. I\'m dispatching our emergency maintenance team immediately. What is your unit number?' },
      { direction: 'inbound', sender_type: 'tenant', content: 'Unit 205. Water is coming through the ceiling in the living room.' },
      { direction: 'outbound', sender_type: 'ai', content: 'Emergency maintenance has been notified for Unit 205. They will arrive within 30 minutes. In the meantime, please move any valuables away from the affected area. A staff member will call you shortly.' },
    ],
  },
  {
    channel: 'email' as const,
    status: 'closed' as const,
    participant_name: null,
    messages: [
      { direction: 'inbound', sender_type: 'tenant', content: 'Hi, I\'d like to add my partner to my lease. What paperwork do I need?' },
      { direction: 'outbound', sender_type: 'ai', content: 'Great question! To add someone to your lease, you\'ll need: 1) A completed rental application for the new occupant, 2) Proof of income (last 2 pay stubs), 3) Valid government-issued ID. There is a $50 application fee. Would you like me to email the application form?' },
      { direction: 'inbound', sender_type: 'tenant', content: 'Yes please, send it to this email.' },
      { direction: 'outbound', sender_type: 'ai', content: 'The application form has been sent to your email. Once completed, you can submit it at the leasing office or reply to this email with the documents attached. Processing typically takes 3-5 business days.' },
    ],
  },
];


// ─── Main Seed Function ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const summary: Record<string, number> = {};

  try {
    const supabase = createAdminClient();
    const body = await request.json().catch(() => ({}));
    const cleanFirst = body.clean === true;

    // ── Find or create org ──
    let orgId: string;
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      const { data: newOrg, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: 'RKV Consulting Demo',
          slug: 'rkvconsulting-demo',
          enabled_verticals: ['residential', 'mixed_use'],
          default_vertical: 'residential',
        })
        .select('id')
        .single();
      if (orgErr || !newOrg) throw new Error(`Failed to create org: ${orgErr?.message}`);
      orgId = newOrg.id;
    }

    // ── Optionally clean existing seed data ──
    if (cleanFirst) {
      // Delete in reverse dependency order
      const tables = [
        'messages', 'conversations', 'deal_activity', 'deal_comps', 'seller_sequences',
        'deals', 'financial_transactions', 'lease_renewal_sequences', 'showings',
        'work_orders', 'leases', 'tenants', 'units', 'vendors', 'properties',
      ];
      for (const table of tables) {
        await supabase.from(table).delete().eq('org_id', orgId);
      }
    }

    // ── 1. Properties ──
    const propertyInserts = PROPERTIES.map((p) => ({ ...p, org_id: orgId }));
    const { data: properties, error: propErr } = await supabase
      .from('properties')
      .insert(propertyInserts)
      .select('id, name, unit_count');
    if (propErr) throw new Error(`Properties: ${propErr.message}`);
    summary.properties = properties!.length;

    // ── 2. Units ──
    const unitInserts: Record<string, unknown>[] = [];
    const propertyUnits: Record<string, { id?: string; unit_number: string; market_rent: number; status: string; bedrooms: number }[]> = {};

    for (let pi = 0; pi < properties!.length; pi++) {
      const prop = properties![pi];
      const config = UNIT_CONFIGS[pi];
      const units: typeof propertyUnits[string] = [];

      // Mountain Creek has A and B buildings
      const buildings = pi === 3 ? ['A', 'B'] : [''];
      let unitIdx = 0;

      for (const bldg of buildings) {
        for (let floor = 1; floor <= config.floors; floor++) {
          for (let u = 1; u <= config.perFloor; u++) {
            if (unitIdx >= prop.unit_count) break;
            const plan = config.plans[unitIdx % config.plans.length];
            const unitNumber = bldg ? `${bldg}${floor}0${u}` : `${floor}0${u}`;

            // Status distribution: ~75% occupied, ~10% vacant, ~5% notice, ~5% make_ready, ~5% model
            const roll = Math.random();
            let status: string;
            if (roll < 0.75) status = 'occupied';
            else if (roll < 0.85) status = 'vacant';
            else if (roll < 0.90) status = 'notice';
            else if (roll < 0.95) status = 'make_ready';
            else status = 'model';

            const marketRent = randomBetween(plan.rent[0], plan.rent[1]);

            unitInserts.push({
              property_id: prop.id,
              org_id: orgId,
              unit_number: unitNumber,
              floor_plan: plan.beds === 0 ? 'Studio' : `${plan.beds}BR/${plan.baths}BA`,
              bedrooms: plan.beds,
              bathrooms: plan.baths,
              square_footage: randomBetween(plan.sqft[0], plan.sqft[1]),
              market_rent: marketRent,
              status,
            });

            units.push({ unit_number: unitNumber, market_rent: marketRent, status, bedrooms: plan.beds });
            unitIdx++;
          }
        }
      }
      propertyUnits[prop.id] = units;
    }

    const { data: insertedUnits, error: unitErr } = await supabase
      .from('units')
      .insert(unitInserts)
      .select('id, property_id, unit_number, status, market_rent, bedrooms');
    if (unitErr) throw new Error(`Units: ${unitErr.message}`);
    summary.units = insertedUnits!.length;

    // Build lookup: property_id -> units
    const unitsByProperty: Record<string, typeof insertedUnits> = {};
    for (const u of insertedUnits!) {
      if (!unitsByProperty[u.property_id]) unitsByProperty[u.property_id] = [];
      unitsByProperty[u.property_id]!.push(u);
    }

    // ── 3. Tenants ──
    const occupiedUnits = insertedUnits!.filter((u) => u.status === 'occupied' || u.status === 'notice');
    const totalTenants = Math.max(occupiedUnits.length + 8, 45); // extra for prospects/past

    const tenantInserts: Record<string, unknown>[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < totalTenants; i++) {
      let firstName: string, lastName: string, fullKey: string;
      do {
        firstName = pick(FIRST_NAMES);
        lastName = pick(LAST_NAMES);
        fullKey = `${firstName}_${lastName}`;
      } while (usedNames.has(fullKey));
      usedNames.add(fullKey);

      let status: string;
      let moveInDate: string | null = null;
      let moveOutDate: string | null = null;

      if (i < occupiedUnits.length) {
        status = occupiedUnits[i].status === 'notice' ? 'notice' : 'active';
        moveInDate = monthsAgo(randomBetween(1, 36));
        if (status === 'notice') {
          moveOutDate = daysFromNow(randomBetween(15, 45));
        }
      } else {
        const roll = Math.random();
        if (roll < 0.3) {
          status = 'prospect';
        } else if (roll < 0.5) {
          status = 'applicant';
        } else {
          status = 'past';
          moveInDate = monthsAgo(randomBetween(24, 48));
          moveOutDate = monthsAgo(randomBetween(1, 12));
        }
      }

      tenantInserts.push({
        org_id: orgId,
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: randomPhone(),
        phone_verified: status === 'active',
        status,
        source: pick(['website', 'referral', 'zillow', 'apartments.com', 'walk_in', 'ai_chat']),
        move_in_date: moveInDate,
        move_out_date: moveOutDate,
      });
    }

    const { data: tenants, error: tenErr } = await supabase
      .from('tenants')
      .insert(tenantInserts)
      .select('id, first_name, last_name, status, phone, email');
    if (tenErr) throw new Error(`Tenants: ${tenErr.message}`);
    summary.tenants = tenants!.length;

    const activeTenants = tenants!.filter((t) => t.status === 'active' || t.status === 'notice');

    // ── 4. Leases ──
    const leaseInserts: Record<string, unknown>[] = [];

    for (let i = 0; i < occupiedUnits.length && i < activeTenants.length; i++) {
      const unit = occupiedUnits[i];
      const tenant = activeTenants[i];

      // Stagger lease starts over the last 12 months
      const monthsBack = randomBetween(0, 11);
      const leaseStart = monthsAgo(monthsBack);
      const leaseEndDate = new Date(leaseStart);
      leaseEndDate.setFullYear(leaseEndDate.getFullYear() + 1);
      const leaseEnd = leaseEndDate.toISOString().split('T')[0];

      // Some leases expiring soon (within 30/60/90 days)
      let adjustedEnd = leaseEnd;
      let leaseStatus: string = 'active';

      if (i % 8 === 0) {
        // Expiring within 30 days
        adjustedEnd = daysFromNow(randomBetween(5, 30));
        leaseStatus = 'active';
      } else if (i % 8 === 1) {
        // Expiring within 60 days
        adjustedEnd = daysFromNow(randomBetween(31, 60));
        leaseStatus = 'active';
      } else if (i % 8 === 2) {
        // Expiring within 90 days
        adjustedEnd = daysFromNow(randomBetween(61, 90));
        leaseStatus = 'active';
      } else if (i % 12 === 3) {
        // Already expired
        adjustedEnd = daysAgo(randomBetween(1, 30));
        leaseStatus = 'expired';
      }

      const monthlyRent = Math.round(unit.market_rent * randomFloat(0.95, 1.05));

      leaseInserts.push({
        org_id: orgId,
        unit_id: unit.id,
        tenant_id: tenant.id,
        lease_start: leaseStart,
        lease_end: adjustedEnd,
        monthly_rent: monthlyRent,
        security_deposit: monthlyRent,
        status: leaseStatus,
        renewal_offered: i % 8 <= 2, // offered for expiring soon
        renewal_rent: i % 8 <= 2 ? Math.round(monthlyRent * 1.03) : null,
      });
    }

    const { data: leases, error: leaseErr } = await supabase
      .from('leases')
      .insert(leaseInserts)
      .select('id, unit_id, tenant_id, monthly_rent, lease_end, status');
    if (leaseErr) throw new Error(`Leases: ${leaseErr.message}`);
    summary.leases = leases!.length;

    // ── 5. Vendors ──
    const vendorInserts = VENDOR_DATA.map((v) => ({ ...v, org_id: orgId }));
    const { data: vendors, error: vendErr } = await supabase
      .from('vendors')
      .insert(vendorInserts)
      .select('id, company, specialty');
    if (vendErr) throw new Error(`Vendors: ${vendErr.message}`);
    summary.vendors = vendors!.length;

    // Build vendor lookup by specialty
    const vendorBySpecialty: Record<string, string> = {};
    for (const v of vendors!) {
      for (const s of v.specialty) {
        vendorBySpecialty[s] = v.id;
      }
    }

    // ── 6. Work Orders ──
    const woInserts: Record<string, unknown>[] = [];
    const allProperties = properties!;

    for (let i = 0; i < WORK_ORDER_TEMPLATES.length; i++) {
      const tmpl = WORK_ORDER_TEMPLATES[i];
      const prop = allProperties[i % allProperties.length];
      const propUnits = unitsByProperty[prop.id] || [];
      const unit = propUnits.length > 0 ? pick(propUnits) : null;
      const tenant = unit && unit.status === 'occupied' ? pick(activeTenants) : null;

      // Status distribution
      const statuses: string[] = ['open', 'open', 'assigned', 'assigned', 'in_progress', 'in_progress', 'completed', 'completed', 'completed', 'closed'];
      const status = pick(statuses);
      const sources: string[] = ['manual', 'tenant_portal', 'tenant_portal', 'ai_chat', 'phone', 'email'];

      const vendorId = vendorBySpecialty[tmpl.category] || null;

      woInserts.push({
        org_id: orgId,
        property_id: prop.id,
        unit_id: unit?.id || null,
        tenant_id: tenant?.id || null,
        vendor_id: status !== 'open' ? vendorId : null,
        title: tmpl.title,
        description: tmpl.description,
        category: tmpl.category,
        priority: tmpl.priority,
        status,
        source: pick(sources),
        scheduled_date: ['assigned', 'in_progress'].includes(status) ? daysFromNow(randomBetween(1, 14)) : null,
        completed_date: ['completed', 'closed'].includes(status) ? daysAgo(randomBetween(1, 30)) : null,
        cost: ['completed', 'closed'].includes(status) ? randomBetween(75, 800) : null,
      });
    }

    const { data: workOrders, error: woErr } = await supabase
      .from('work_orders')
      .insert(woInserts)
      .select('id');
    if (woErr) throw new Error(`Work Orders: ${woErr.message}`);
    summary.work_orders = workOrders!.length;

    // ── 7. Showings ──
    const vacantUnits = insertedUnits!.filter((u) => u.status === 'vacant' || u.status === 'model');
    const prospectTenants = tenants!.filter((t) => t.status === 'prospect' || t.status === 'applicant');

    const showingInserts: Record<string, unknown>[] = [];
    const showingStatuses = ['scheduled', 'confirmed', 'completed', 'completed', 'no_show', 'cancelled'];
    const showingSources = ['manual', 'ai_chat', 'website', 'phone', 'walk_in'];

    for (let i = 0; i < 12; i++) {
      const unit = vacantUnits.length > 0 ? vacantUnits[i % vacantUnits.length] : null;
      const propId = unit ? unit.property_id : allProperties[i % allProperties.length].id;
      const status = pick(showingStatuses);
      const isPast = ['completed', 'no_show'].includes(status);
      const prospect = prospectTenants.length > 0 ? prospectTenants[i % prospectTenants.length] : null;

      showingInserts.push({
        org_id: orgId,
        property_id: propId,
        unit_id: unit?.id || null,
        tenant_id: prospect?.id || null,
        prospect_name: prospect ? `${prospect.first_name} ${prospect.last_name}` : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        prospect_phone: prospect?.phone || randomPhone(),
        prospect_email: prospect?.email || `prospect${i}@email.com`,
        status,
        scheduled_at: isPast ? new Date(Date.now() - randomBetween(1, 14) * 86400000).toISOString() : hoursFromNow(randomBetween(24, 336)),
        duration_minutes: 30,
        notes: pick([null, 'Interested in 2BR units', 'Relocating from out of state', 'Looking for pet-friendly', 'Needs parking spot', 'Referred by current tenant']),
        source: pick(showingSources),
        follow_up_status: isPast ? pick(['sent', 'responded', 'applied', 'pending']) : 'pending',
        reminder_sent: isPast,
      });
    }

    const { data: showings, error: showErr } = await supabase
      .from('showings')
      .insert(showingInserts)
      .select('id');
    if (showErr) throw new Error(`Showings: ${showErr.message}`);
    summary.showings = showings!.length;

    // ── 8. Conversations & Messages ──
    const conversationIds: string[] = [];

    for (let ci = 0; ci < CONVERSATION_TEMPLATES.length; ci++) {
      const tmpl = CONVERSATION_TEMPLATES[ci];
      const tenant = activeTenants[ci % activeTenants.length];
      const prop = allProperties[ci % allProperties.length];

      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          org_id: orgId,
          tenant_id: tmpl.participant_name ? null : tenant.id,
          property_id: prop.id,
          channel: tmpl.channel,
          twilio_phone: '+14805550100',
          participant_phone: tmpl.participant_name ? randomPhone() : tenant.phone,
          participant_name: tmpl.participant_name || `${tenant.first_name} ${tenant.last_name}`,
          status: tmpl.status,
          last_message_at: new Date(Date.now() - randomBetween(0, 7) * 86400000).toISOString(),
        })
        .select('id')
        .single();

      if (convErr) throw new Error(`Conversation ${ci}: ${convErr.message}`);
      conversationIds.push(conv!.id);

      // Insert messages
      const msgInserts = tmpl.messages.map((m, mi) => ({
        conversation_id: conv!.id,
        org_id: orgId,
        direction: m.direction,
        sender_type: m.sender_type,
        content: m.content,
        channel: tmpl.channel,
        status: 'delivered',
        ai_classified_intent: m.sender_type === 'tenant' ? pick(['maintenance_request', 'lease_inquiry', 'general_question', 'emergency', 'complaint']) : null,
        created_at: new Date(Date.now() - (tmpl.messages.length - mi) * 300000 - randomBetween(0, 5) * 86400000).toISOString(),
      }));

      const { error: msgErr } = await supabase.from('messages').insert(msgInserts);
      if (msgErr) throw new Error(`Messages for conv ${ci}: ${msgErr.message}`);
    }

    summary.conversations = conversationIds.length;
    summary.messages = CONVERSATION_TEMPLATES.reduce((sum, t) => sum + t.messages.length, 0);

    // ── 9. Deals ──
    const dealInserts = DEAL_DATA.map((d) => ({
      ...d,
      org_id: orgId,
      mao_formula: '70_rule',
      score_reasoning: `Deal scored ${d.deal_score}/100. Market score: ${d.market_score}, Risk: ${d.risk_score}, Location: ${d.location_score}, Condition: ${d.condition_score || 'N/A'}. ${d.arv_confidence} ARV confidence based on comparable sales analysis.`,
      photos: [],
      metadata: {},
    }));

    const { data: deals, error: dealErr } = await supabase
      .from('deals')
      .insert(dealInserts)
      .select('id, address, pipeline_stage');
    if (dealErr) throw new Error(`Deals: ${dealErr.message}`);
    summary.deals = deals!.length;

    // Deal activity entries
    const dealActivityInserts: Record<string, unknown>[] = [];
    for (const deal of deals!) {
      dealActivityInserts.push({
        deal_id: deal.id,
        org_id: orgId,
        activity_type: 'stage_change',
        from_stage: null,
        to_stage: 'lead',
        content: 'Deal created',
        created_at: daysAgo(randomBetween(10, 60)),
      });
      if (deal.pipeline_stage !== 'lead') {
        dealActivityInserts.push({
          deal_id: deal.id,
          org_id: orgId,
          activity_type: 'stage_change',
          from_stage: 'lead',
          to_stage: deal.pipeline_stage,
          content: `Moved to ${deal.pipeline_stage.replace(/_/g, ' ')}`,
          created_at: daysAgo(randomBetween(1, 9)),
        });
      }
      dealActivityInserts.push({
        deal_id: deal.id,
        org_id: orgId,
        activity_type: 'ai_analysis',
        content: `Multi-agent analysis completed. ARV estimated from ${randomBetween(3, 6)} comparable sales within 1 mile radius. Market conditions favorable for acquisition.`,
        created_at: daysAgo(randomBetween(1, 15)),
      });
    }
    const { error: daErr } = await supabase.from('deal_activity').insert(dealActivityInserts);
    if (daErr) throw new Error(`Deal Activity: ${daErr.message}`);
    summary.deal_activities = dealActivityInserts.length;

    // ── 10. Financial Transactions ──
    const txInserts: Record<string, unknown>[] = [];
    const now = new Date();

    // Generate 3 months of data
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const txMonth = now.getMonth() - monthOffset;
      const txYear = txMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const adjustedMonth = ((txMonth % 12) + 12) % 12;

      // Rent payments for each occupied unit
      for (const lease of leases!) {
        if (lease.status !== 'active' && monthOffset > 0) continue;
        const unit = insertedUnits!.find((u) => u.id === lease.unit_id);
        if (!unit) continue;

        const txDate = new Date(txYear, adjustedMonth, randomBetween(1, 5));
        if (txDate > now) continue;

        txInserts.push({
          org_id: orgId,
          property_id: unit.property_id,
          unit_id: unit.id,
          tenant_id: lease.tenant_id,
          type: 'income',
          category: 'rent',
          amount: lease.monthly_rent,
          description: `Rent payment - ${txDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          transaction_date: txDate.toISOString().split('T')[0],
          period_month: adjustedMonth + 1,
          period_year: txYear,
        });

        // Occasional late fee
        if (Math.random() < 0.08) {
          txInserts.push({
            org_id: orgId,
            property_id: unit.property_id,
            unit_id: unit.id,
            tenant_id: lease.tenant_id,
            type: 'income',
            category: 'late_fee',
            amount: 75,
            description: 'Late payment fee',
            transaction_date: new Date(txYear, adjustedMonth, randomBetween(6, 10)).toISOString().split('T')[0],
            period_month: adjustedMonth + 1,
            period_year: txYear,
          });
        }
      }

      // Property-level expenses for each property
      for (const prop of allProperties) {
        // Repairs
        if (Math.random() < 0.6) {
          txInserts.push({
            org_id: orgId,
            property_id: prop.id,
            unit_id: null,
            tenant_id: null,
            type: 'expense',
            category: 'repair',
            amount: randomBetween(150, 2500),
            description: pick(['Plumbing repair', 'HVAC service call', 'Electrical repair', 'Appliance replacement', 'General maintenance']),
            transaction_date: new Date(txYear, adjustedMonth, randomBetween(1, 28)).toISOString().split('T')[0],
            period_month: adjustedMonth + 1,
            period_year: txYear,
          });
        }

        // Insurance (monthly)
        txInserts.push({
          org_id: orgId,
          property_id: prop.id,
          unit_id: null,
          tenant_id: null,
          type: 'expense',
          category: 'insurance',
          amount: randomBetween(400, 1200),
          description: 'Monthly property insurance premium',
          transaction_date: new Date(txYear, adjustedMonth, 1).toISOString().split('T')[0],
          period_month: adjustedMonth + 1,
          period_year: txYear,
        });

        // Management fee
        txInserts.push({
          org_id: orgId,
          property_id: prop.id,
          unit_id: null,
          tenant_id: null,
          type: 'expense',
          category: 'management_fee',
          amount: randomBetween(800, 3000),
          description: 'Property management fee',
          transaction_date: new Date(txYear, adjustedMonth, 1).toISOString().split('T')[0],
          period_month: adjustedMonth + 1,
          period_year: txYear,
        });

        // Property taxes (quarterly in month 0)
        if (monthOffset === 0) {
          txInserts.push({
            org_id: orgId,
            property_id: prop.id,
            unit_id: null,
            tenant_id: null,
            type: 'expense',
            category: 'tax',
            amount: randomBetween(2000, 8000),
            description: 'Quarterly property tax payment',
            transaction_date: new Date(txYear, adjustedMonth, 15).toISOString().split('T')[0],
            period_month: adjustedMonth + 1,
            period_year: txYear,
          });
        }

        // Utilities
        if (Math.random() < 0.5) {
          txInserts.push({
            org_id: orgId,
            property_id: prop.id,
            unit_id: null,
            tenant_id: null,
            type: 'expense',
            category: 'utility',
            amount: randomBetween(200, 900),
            description: pick(['Water/sewer', 'Common area electric', 'Trash service', 'Landscaping']),
            transaction_date: new Date(txYear, adjustedMonth, randomBetween(10, 20)).toISOString().split('T')[0],
            period_month: adjustedMonth + 1,
            period_year: txYear,
          });
        }
      }
    }

    // Insert financial transactions in batches (Supabase has row limits)
    const TX_BATCH_SIZE = 100;
    let txCount = 0;
    for (let i = 0; i < txInserts.length; i += TX_BATCH_SIZE) {
      const batch = txInserts.slice(i, i + TX_BATCH_SIZE);
      const { data: txData, error: txErr } = await supabase
        .from('financial_transactions')
        .insert(batch)
        .select('id');
      if (txErr) throw new Error(`Financial Transactions batch ${i}: ${txErr.message}`);
      txCount += txData!.length;
    }
    summary.financial_transactions = txCount;

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      org_id: orgId,
      elapsed_ms: elapsed,
      summary,
    });
  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed error:', message);
    return NextResponse.json(
      { success: false, error: message, elapsed_ms: elapsed, summary },
      { status: 500 }
    );
  }
}

// GET handler for easy testing
export async function GET() {
  return NextResponse.json({
    message: 'Seed API route. Send a POST request to populate demo data.',
    options: {
      clean: 'Set to true in request body to delete existing data before seeding. Example: {"clean": true}',
    },
  });
}
