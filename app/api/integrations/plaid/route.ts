import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createLinkToken,
  exchangePublicToken,
  getTransactions,
  PlaidApiError,
  type PlaidTransaction,
} from '@/lib/apis/plaid'

// ── Types ───────────────────────────────────────────────────────────────────

type PlaidAction = 'create_link_token' | 'exchange_token' | 'get_transactions'

interface PlaidRequestBody {
  action: PlaidAction
  public_token?: string
  access_token?: string
  start_date?: string
  end_date?: string
}

interface TransactionCategory {
  category: string
  scheduleELine: string
  confidence: number
}

interface CategorizedTransaction extends PlaidTransaction {
  ai_category?: TransactionCategory | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Call the AI categorization endpoint for a single transaction.
 * Returns null on failure so one bad categorization doesn't break the batch.
 */
async function categorizeTransaction(
  transaction: PlaidTransaction,
  origin: string
): Promise<TransactionCategory | null> {
  try {
    const response = await fetch(
      `${origin}/api/ai/categorize-transaction`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: transaction.name || transaction.merchant_name || 'Unknown',
          amount: Math.abs(transaction.amount),
          type: transaction.amount < 0 ? 'income' : 'expense',
        }),
      }
    )

    if (!response.ok) {
      console.warn(
        `[Plaid Route] Categorization failed for transaction ${transaction.transaction_id}:`,
        response.status
      )
      return null
    }

    return (await response.json()) as TransactionCategory
  } catch (error) {
    console.warn(
      `[Plaid Route] Categorization error for transaction ${transaction.transaction_id}:`,
      error
    )
    return null
  }
}

/**
 * Categorize transactions in batches to avoid overwhelming the AI endpoint.
 */
async function categorizeTransactionsBatch(
  transactions: PlaidTransaction[],
  origin: string,
  batchSize: number = 5
): Promise<CategorizedTransaction[]> {
  const results: CategorizedTransaction[] = []

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)
    const categorized = await Promise.all(
      batch.map(async (txn) => {
        const category = await categorizeTransaction(txn, origin)
        return { ...txn, ai_category: category }
      })
    )
    results.push(...categorized)
  }

  return results
}

// ── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Authenticate user via Supabase
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PlaidRequestBody = await req.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      )
    }

    // ── Create Link Token ─────────────────────────────────────────────────
    if (action === 'create_link_token') {
      const linkToken = await createLinkToken(user.id, 'RKV Consulting')

      return NextResponse.json({
        link_token: linkToken.link_token,
        expiration: linkToken.expiration,
      })
    }

    // ── Exchange Public Token ─────────────────────────────────────────────
    if (action === 'exchange_token') {
      const { public_token } = body

      if (!public_token) {
        return NextResponse.json(
          { error: 'Missing required field: public_token' },
          { status: 400 }
        )
      }

      const tokenResponse = await exchangePublicToken(public_token)

      // Store the access token and item ID in Supabase for the user
      const { error: upsertError } = await supabase
        .from('plaid_items')
        .upsert(
          {
            user_id: user.id,
            item_id: tokenResponse.item_id,
            access_token: tokenResponse.access_token,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'item_id' }
        )

      if (upsertError) {
        console.error('[Plaid Route] Failed to store access token:', upsertError)
        // Still return success - the token exchange worked, storage is secondary
      }

      return NextResponse.json({
        item_id: tokenResponse.item_id,
        // Never return the access_token to the client
        stored: !upsertError,
      })
    }

    // ── Get Transactions ──────────────────────────────────────────────────
    if (action === 'get_transactions') {
      const { access_token, start_date, end_date } = body

      if (!access_token) {
        return NextResponse.json(
          { error: 'Missing required field: access_token' },
          { status: 400 }
        )
      }

      // Default date range: last 30 days
      const endDate =
        end_date || new Date().toISOString().split('T')[0]
      const startDate =
        start_date ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return NextResponse.json(
          { error: 'Dates must be in YYYY-MM-DD format' },
          { status: 400 }
        )
      }

      const transactionsResponse = await getTransactions(
        access_token,
        startDate,
        endDate
      )

      // Auto-categorize each transaction using the AI endpoint
      const origin = req.nextUrl.origin
      const categorizedTransactions = await categorizeTransactionsBatch(
        transactionsResponse.transactions,
        origin
      )

      return NextResponse.json({
        accounts: transactionsResponse.accounts,
        transactions: categorizedTransactions,
        total_transactions: transactionsResponse.total_transactions,
      })
    }

    // ── Unknown Action ────────────────────────────────────────────────────
    return NextResponse.json(
      {
        error: `Unknown action: "${action}". Valid actions: create_link_token, exchange_token, get_transactions`,
      },
      { status: 400 }
    )
  } catch (error) {
    // Handle Plaid-specific errors with more detail
    if (error instanceof PlaidApiError) {
      console.error('[Plaid Route] Plaid API error:', error.message, error.plaidError)
      return NextResponse.json(
        {
          error: error.plaidError?.display_message || 'Plaid service error',
          plaid_error_code: error.plaidError?.error_code || null,
          plaid_error_type: error.plaidError?.error_type || null,
        },
        { status: 502 }
      )
    }

    console.error('[Plaid Route] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process Plaid request' },
      { status: 500 }
    )
  }
}
