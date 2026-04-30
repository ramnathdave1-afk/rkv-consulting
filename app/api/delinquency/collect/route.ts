import { NextRequest, NextResponse } from 'next/server';
import { triggerCollection } from '@/lib/delinquency/collection-engine';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { captureException } from '@/lib/monitoring/sentry';

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await getUserOrg();
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const result = await triggerCollection(orgId, rentPaymentId, validChannels);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Collection failed' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    captureException(err, { route: 'delinquency/collect' });
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
