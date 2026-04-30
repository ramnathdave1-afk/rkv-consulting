import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { syncFromCsv, type SyncEntityType } from '@/lib/integrations/appfolio';
import { captureException } from '@/lib/monitoring/sentry';
import { requireFeature } from '@/lib/billing/gate';

export const runtime = 'nodejs';
// CSVs can be large; allow up to 60s
export const maxDuration = 60;

const VALID_ENTITIES: SyncEntityType[] = [
  'properties',
  'units',
  'tenants',
  'leases',
  'work_orders',
];

/**
 * POST /api/integrations/appfolio/upload
 * Body: multipart/form-data with fields:
 *   - file: the CSV file
 *   - entity: one of properties|units|tenants|leases|work_orders
 *
 * Or JSON body:
 *   { entity: "...", csv: "<raw text>" }
 */
export async function POST(req: NextRequest) {
  try {
    const { user, orgId, role } = await getUserOrg();
    if (!user || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!role || !['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const gate = await requireFeature(orgId, 'pm_integrations');
    if (!gate.allowed) return gate.response;

    const contentType = req.headers.get('content-type') || '';
    let entity: string | null = null;
    let csvText = '';

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      entity = String(form.get('entity') || '');
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'Missing file' }, { status: 400 });
      }
      csvText = await file.text();
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      entity = String(body.entity || '');
      csvText = String(body.csv || '');
    } else {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data or application/json' },
        { status: 415 },
      );
    }

    if (!entity || !VALID_ENTITIES.includes(entity as SyncEntityType)) {
      return NextResponse.json(
        {
          error: `Invalid or missing entity. Must be one of: ${VALID_ENTITIES.join(', ')}`,
        },
        { status: 400 },
      );
    }
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'CSV body is empty' }, { status: 400 });
    }

    const result = await syncFromCsv(
      orgId,
      entity as SyncEntityType,
      csvText,
      'manual',
    );

    return NextResponse.json({ result });
  } catch (err) {
    captureException(err, { where: 'POST /api/integrations/appfolio/upload' });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
