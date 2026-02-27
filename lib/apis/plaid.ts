// ── Plaid API Client (REST-based) ───────────────────────────────────────────
// Uses fetch instead of @plaid/plaid-node to avoid additional dependencies.
// Implements the core Link flow: create link token -> exchange public token -> get transactions.

// ── Types ───────────────────────────────────────────────────────────────────

export interface PlaidLinkToken {
  link_token: string
  expiration: string
  request_id: string
}

export interface PlaidAccessToken {
  access_token: string
  item_id: string
  request_id: string
}

export interface PlaidTransaction {
  transaction_id: string
  account_id: string
  amount: number
  iso_currency_code: string | null
  unofficial_currency_code: string | null
  date: string
  datetime: string | null
  authorized_date: string | null
  name: string
  merchant_name: string | null
  payment_channel: string
  category: string[] | null
  category_id: string | null
  personal_finance_category: {
    primary: string
    detailed: string
    confidence_level: string
  } | null
  pending: boolean
  location: {
    address: string | null
    city: string | null
    region: string | null
    postal_code: string | null
    country: string | null
    lat: number | null
    lon: number | null
    store_number: string | null
  } | null
}

export interface PlaidTransactionsResponse {
  accounts: PlaidAccount[]
  transactions: PlaidTransaction[]
  total_transactions: number
  request_id: string
}

export interface PlaidAccount {
  account_id: string
  balances: {
    available: number | null
    current: number | null
    limit: number | null
    iso_currency_code: string | null
    unofficial_currency_code: string | null
  }
  mask: string | null
  name: string
  official_name: string | null
  type: string
  subtype: string | null
}

export interface PlaidError {
  error_type: string
  error_code: string
  error_message: string
  display_message: string | null
  request_id: string
}

// ── Configuration ───────────────────────────────────────────────────────────

type PlaidEnvironment = 'sandbox' | 'development' | 'production'

const PLAID_BASE_URLS: Record<PlaidEnvironment, string> = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
}

function getPlaidConfig() {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET
  const env = (process.env.PLAID_ENV || 'sandbox') as PlaidEnvironment

  if (!clientId || !secret) {
    throw new Error(
      '[Plaid] Missing required environment variables: PLAID_CLIENT_ID and PLAID_SECRET'
    )
  }

  const baseUrl = PLAID_BASE_URLS[env]
  if (!baseUrl) {
    throw new Error(
      `[Plaid] Invalid PLAID_ENV "${env}". Must be one of: sandbox, development, production`
    )
  }

  return { clientId, secret, baseUrl }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function handleError(error: unknown, context: string): never {
  if (error instanceof PlaidApiError) {
    throw error
  }
  const message =
    error instanceof Error ? error.message : 'Unknown error occurred'
  console.error(`[Plaid] ${context} failed:`, error)
  throw new PlaidApiError(context, message)
}

export class PlaidApiError extends Error {
  public readonly context: string
  public readonly plaidError?: PlaidError

  constructor(context: string, message: string, plaidError?: PlaidError) {
    super(`[Plaid] ${context}: ${message}`)
    this.name = 'PlaidApiError'
    this.context = context
    this.plaidError = plaidError
  }
}

/**
 * Make an authenticated POST request to the Plaid API.
 */
async function plaidRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const { clientId, secret, baseUrl } = getPlaidConfig()

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      ...body,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const plaidError = data as PlaidError
    throw new PlaidApiError(
      endpoint,
      plaidError.error_message || `HTTP ${response.status}`,
      plaidError
    )
  }

  return data as T
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Create a Plaid Link token to initialize the Link flow on the client.
 *
 * The Link token is short-lived (4 hours) and tied to a specific user.
 * Pass it to the Plaid Link component to let the user connect their bank.
 *
 * @param userId - Your application's user ID (used by Plaid for tracking).
 * @param clientName - Display name shown in the Link UI (e.g. "RKV Consulting").
 * @returns The link token response including the token and expiration.
 */
export async function createLinkToken(
  userId: string,
  clientName: string
): Promise<PlaidLinkToken> {
  try {
    return await plaidRequest<PlaidLinkToken>('/link/token/create', {
      user: {
        client_user_id: userId,
      },
      client_name: clientName,
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    })
  } catch (error) {
    return handleError(error, 'createLinkToken')
  }
}

/**
 * Exchange a public token (from Plaid Link) for a permanent access token.
 *
 * After the user successfully links their bank account through Link,
 * you receive a public_token. Exchange it here to get an access_token
 * that can be used for ongoing data retrieval.
 *
 * IMPORTANT: Store the access_token securely. It grants access to the
 * user's financial data until the item is removed.
 *
 * @param publicToken - The public_token received from Plaid Link's onSuccess callback.
 * @returns The access token and item ID.
 */
export async function exchangePublicToken(
  publicToken: string
): Promise<PlaidAccessToken> {
  try {
    return await plaidRequest<PlaidAccessToken>('/item/public_token/exchange', {
      public_token: publicToken,
    })
  } catch (error) {
    return handleError(error, 'exchangePublicToken')
  }
}

/**
 * Fetch transactions for a linked account within a date range.
 *
 * Plaid may return paginated results. This function fetches all pages
 * and returns the complete transaction list.
 *
 * @param accessToken - The access token for the linked item.
 * @param startDate - Start date in YYYY-MM-DD format.
 * @param endDate - End date in YYYY-MM-DD format.
 * @returns Full transactions response including accounts and transactions.
 */
export async function getTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<PlaidTransactionsResponse> {
  try {
    const allTransactions: PlaidTransaction[] = []
    let totalTransactions = 0
    let accounts: PlaidAccount[] = []
    let requestId = ''
    let offset = 0
    const count = 500 // Max per request

    // Paginate through all transactions
    do {
      const response = await plaidRequest<PlaidTransactionsResponse>(
        '/transactions/get',
        {
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
          options: {
            count,
            offset,
          },
        }
      )

      accounts = response.accounts
      totalTransactions = response.total_transactions
      requestId = response.request_id
      allTransactions.push(...response.transactions)
      offset += response.transactions.length
    } while (allTransactions.length < totalTransactions)

    return {
      accounts,
      transactions: allTransactions,
      total_transactions: totalTransactions,
      request_id: requestId,
    }
  } catch (error) {
    return handleError(error, 'getTransactions')
  }
}
