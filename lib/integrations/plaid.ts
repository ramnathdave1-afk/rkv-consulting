/**
 * Plaid API Integration Stub
 * Bank account verification for tenant rent payment ACH.
 * Income verification for lead qualification.
 */

const PLAID_API_URL = process.env.PLAID_ENV === 'production'
  ? 'https://production.plaid.com'
  : process.env.PLAID_ENV === 'development'
    ? 'https://development.plaid.com'
    : 'https://sandbox.plaid.com';

function plaidHeaders() {
  return {
    'Content-Type': 'application/json',
    'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
    'PLAID-SECRET': process.env.PLAID_SECRET || '',
  };
}

export interface PlaidLinkToken {
  link_token: string;
  expiration: string;
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  balance_available: number | null;
  balance_current: number | null;
}

export interface IncomeVerification {
  verified: boolean;
  annual_income: number | null;
  income_sources: { name: string; amount: number; frequency: string }[];
}

export async function createLinkToken(userId: string, products: string[] = ['auth']): Promise<PlaidLinkToken> {
  const response = await fetch(`${PLAID_API_URL}/link/token/create`, {
    method: 'POST',
    headers: plaidHeaders(),
    body: JSON.stringify({
      user: { client_user_id: userId },
      client_name: 'RKV Consulting',
      products,
      country_codes: ['US'],
      language: 'en',
    }),
  });

  if (!response.ok) throw new Error(`Plaid link token error: ${response.status}`);
  const data = await response.json();
  return { link_token: data.link_token, expiration: data.expiration };
}

export async function exchangePublicToken(publicToken: string): Promise<{ access_token: string; item_id: string }> {
  const response = await fetch(`${PLAID_API_URL}/item/public_token/exchange`, {
    method: 'POST',
    headers: plaidHeaders(),
    body: JSON.stringify({ public_token: publicToken }),
  });

  if (!response.ok) throw new Error(`Plaid token exchange error: ${response.status}`);
  const data = await response.json();
  return { access_token: data.access_token, item_id: data.item_id };
}

export async function getAccounts(accessToken: string): Promise<PlaidAccount[]> {
  const response = await fetch(`${PLAID_API_URL}/accounts/get`, {
    method: 'POST',
    headers: plaidHeaders(),
    body: JSON.stringify({ access_token: accessToken }),
  });

  if (!response.ok) throw new Error(`Plaid accounts error: ${response.status}`);
  const data = await response.json();

  return (data.accounts || []).map((a: Record<string, unknown>) => ({
    account_id: a.account_id,
    name: a.name,
    type: a.type,
    subtype: a.subtype,
    mask: a.mask,
    balance_available: (a.balances as { available: number | null })?.available,
    balance_current: (a.balances as { current: number | null })?.current,
  }));
}

export async function getIdentityVerification(accessToken: string): Promise<IncomeVerification> {
  // Uses Plaid Income product
  const response = await fetch(`${PLAID_API_URL}/credit/bank_income/get`, {
    method: 'POST',
    headers: plaidHeaders(),
    body: JSON.stringify({ access_token: accessToken }),
  });

  if (!response.ok) {
    return { verified: false, annual_income: null, income_sources: [] };
  }

  const data = await response.json();
  const items = data.bank_income?.bank_income_accounts || [];
  const sources = items.flatMap((item: Record<string, unknown>) =>
    ((item as { income_sources?: { name: string; total_amount: number; pay_frequency: string }[] }).income_sources || []).map((s) => ({
      name: s.name,
      amount: s.total_amount,
      frequency: s.pay_frequency,
    }))
  );

  const annualIncome = sources.reduce((sum: number, s: { amount: number; frequency: string }) => {
    const multiplier = s.frequency === 'MONTHLY' ? 12 : s.frequency === 'BI_WEEKLY' ? 26 : s.frequency === 'WEEKLY' ? 52 : 1;
    return sum + s.amount * multiplier;
  }, 0);

  return { verified: true, annual_income: annualIncome, income_sources: sources };
}
