import { NextRequest, NextResponse } from 'next/server';
import { sendCampaign } from '@/lib/campaigns/sender';
import { captureException } from '@/lib/monitoring/sentry';

/**
 * POST /api/campaigns/[id]/send — Trigger sending a campaign.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await sendCampaign(id);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    captureException(err, { route: 'campaigns/[id]/send' });
    return NextResponse.json(
      { error: err.message || 'Failed to send campaign' },
      { status: 500 },
    );
  }
}
