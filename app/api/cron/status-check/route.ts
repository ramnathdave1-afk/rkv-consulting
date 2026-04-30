/**
 * Background uptime checker.
 *
 * Hits the public health endpoint, persists per-component results in
 * `status_history`, and opens a `status_incidents` row when any component
 * has been 'down' for 3+ consecutive checks (and there is no open incident
 * yet for that component).
 *
 * Schedule: every minute via vercel.json crons. NOTE: Vercel free tier does
 * not allow per-minute crons — see README for external uptime monitor
 * recommendations (Better Stack, UptimeRobot).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronAuth } from '@/lib/auth/cron';
import { captureException, captureMessage } from '@/lib/monitoring/sentry';
import { fireDownAlert, fireRecoveryAlert } from '@/lib/monitoring/alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPONENTS = ['database', 'auth', 'email', 'sms', 'payments', 'ai'] as const;
type Component = (typeof COMPONENTS)[number];

type HealthResponse = {
  overall_status: string;
  components: Record<Component, { status: 'operational' | 'degraded' | 'down'; latency_ms?: number; error?: string }>;
  timestamp: string;
};

const FAILURE_THRESHOLD = 3;

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

export async function GET(request: NextRequest) {
  const unauthorized = verifyCronAuth(request);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  captureMessage('cron:status-check:start', 'info');

  try {
    // 1. Hit our own health endpoint
    const res = await fetch(`${baseUrl()}/api/status/health`, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'rkv-status-cron/1.0' },
    });

    if (!res.ok) {
      throw new Error(`health endpoint returned ${res.status}`);
    }
    const health = (await res.json()) as HealthResponse;

    const supabase = createAdminClient();

    // 2. Persist a status_history row per component
    const historyRows = COMPONENTS.map((c) => ({
      component: c,
      status: health.components[c].status,
      latency_ms: health.components[c].latency_ms ?? null,
      error: health.components[c].error ?? null,
    }));
    const { error: insertErr } = await supabase.from('status_history').insert(historyRows);
    if (insertErr) {
      captureException(insertErr, { where: 'insert status_history' });
    }

    // 3. For each component, check the last N rows. If 3+ consecutive 'down',
    //    open an incident (idempotent — only if no unresolved incident exists).
    const incidentsCreated: string[] = [];
    const incidentsResolved: string[] = [];

    for (const component of COMPONENTS) {
      const current = health.components[component];

      // Look at the last FAILURE_THRESHOLD entries, not counting the row we
      // just inserted (we'll fetch including it via timestamp ordering).
      const { data: recent } = await supabase
        .from('status_history')
        .select('status, error, recorded_at')
        .eq('component', component)
        .order('recorded_at', { ascending: false })
        .limit(FAILURE_THRESHOLD);

      const recentRows = recent ?? [];
      const allDown =
        recentRows.length >= FAILURE_THRESHOLD &&
        recentRows.every((r) => r.status === 'down');

      // Find any currently-open incident affecting this component
      const { data: openIncidents } = await supabase
        .from('status_incidents')
        .select('id, affected_components, updates, status')
        .is('resolved_at', null)
        .contains('affected_components', [component]);

      const hasOpenIncident = (openIncidents ?? []).length > 0;

      if (allDown && !hasOpenIncident) {
        // Open a new incident
        const { data: created, error: incErr } = await supabase
          .from('status_incidents')
          .insert({
            title: `${component} is experiencing an outage`,
            status: 'investigating',
            severity: component === 'database' ? 'critical' : 'major',
            affected_components: [component],
            updates: [
              {
                timestamp: new Date().toISOString(),
                status: 'investigating',
                message: `Detected ${FAILURE_THRESHOLD} consecutive failed checks. ${current.error ?? ''}`.trim(),
              },
            ],
          })
          .select('id')
          .single();
        if (incErr) {
          captureException(incErr, { where: 'open incident', component });
        } else if (created) {
          incidentsCreated.push(created.id);
          await fireDownAlert(component, current.error ?? 'unknown', FAILURE_THRESHOLD);
        }
      } else if (!allDown && hasOpenIncident && current.status === 'operational') {
        // Auto-resolve incidents when component is operational again
        for (const inc of openIncidents ?? []) {
          const updates = Array.isArray(inc.updates) ? inc.updates : [];
          await supabase
            .from('status_incidents')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString(),
              updates: [
                ...updates,
                {
                  timestamp: new Date().toISOString(),
                  status: 'resolved',
                  message: 'Component is operational again. Auto-resolved by uptime monitor.',
                },
              ],
            })
            .eq('id', inc.id);
          incidentsResolved.push(inc.id);
          await fireRecoveryAlert(component);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      duration_ms: Date.now() - startedAt,
      overall_status: health.overall_status,
      incidents_created: incidentsCreated,
      incidents_resolved: incidentsResolved,
    });
  } catch (err) {
    captureException(err, { where: 'cron:status-check' });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
