import { NextRequest, NextResponse } from 'next/server';
import { triggerCollection } from '@/lib/delinquency/collection-engine';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rentPaymentId, channels } = body;

    if (!rentPaymentId) {
      return NextResponse.json({ error: 'rentPaymentId is required' }, { status: 400 });
    }

    const validChannels = (channels || ['sms']).filter((c: string) =>
      ['sms', 'voice'].includes(c)
    );

    if (validChannels.length === 0) {
      return NextResponse.json({ error: 'At least one valid channel (sms/voice) required' }, { status: 400 });
    }

    const result = await triggerCollection(ORG_ID, rentPaymentId, validChannels);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Collection failed' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Collection API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
