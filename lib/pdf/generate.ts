import type { Site, SiteScore, Substation } from '@/lib/types';

interface ReportData {
  site: Site;
  score: SiteScore | null;
  substation: Substation | null;
  generatedAt: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#00D4AA';
  if (score >= 60) return '#22C55E';
  if (score >= 40) return '#F59E0B';
  if (score >= 20) return '#EF4444';
  return '#8B95A5';
}

function scoreBar(value: number, color: string): string {
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
      <div style="flex:1;height:6px;background:#1A2030;border-radius:3px;overflow:hidden;">
        <div style="width:${value}%;height:100%;background:${color};border-radius:3px;"></div>
      </div>
      <span style="font-size:13px;font-weight:700;color:${color};min-width:28px;text-align:right;">${value}</span>
    </div>
  `;
}

export function generateReportHTML(data: ReportData): string {
  const { site, score, substation, generatedAt } = data;
  const stageLabels: Record<string, string> = {
    prospect: 'Prospect',
    due_diligence: 'Due Diligence',
    loi: 'LOI',
    under_contract: 'Under Contract',
    closed: 'Closed',
  };

  const dimensions = score
    ? [
        { label: 'Grid', value: score.grid_score, color: '#3B82F6' },
        { label: 'Land', value: score.land_score, color: '#22C55E' },
        { label: 'Risk', value: score.risk_score, color: '#EF4444' },
        { label: 'Market', value: score.market_score, color: '#F59E0B' },
        { label: 'Connectivity', value: score.connectivity_score, color: '#8A00FF' },
      ]
    : [];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #06080C;
      color: #E2E8F0;
      padding: 40px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(139,149,165,0.15);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .brand {
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #00D4AA;
      font-weight: 600;
    }
    .site-name {
      font-size: 24px;
      font-weight: 700;
      margin-top: 4px;
      color: #F1F5F9;
    }
    .meta {
      font-size: 11px;
      color: #8B95A5;
      margin-top: 4px;
    }
    .stage-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      background: rgba(0,212,170,0.15);
      color: #00D4AA;
      border: 1px solid rgba(0,212,170,0.3);
    }
    .score-hero {
      text-align: center;
      padding: 24px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(139,149,165,0.1);
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .score-hero .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #8B95A5; }
    .score-hero .value { font-size: 48px; font-weight: 800; margin-top: 4px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(139,149,165,0.1);
      border-radius: 10px;
      padding: 16px;
    }
    .card-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #8B95A5;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .card-value { font-size: 14px; color: #F1F5F9; font-weight: 500; }
    .card-sub { font-size: 11px; color: #8B95A5; margin-top: 2px; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid rgba(139,149,165,0.1);
      font-size: 10px;
      color: #4A5568;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Meridian Node</div>
      <div class="site-name">${site.name}</div>
      <div class="meta">${site.state}${site.county ? `, ${site.county}` : ''} &bull; <span class="stage-badge">${stageLabels[site.pipeline_stage] || site.pipeline_stage}</span></div>
    </div>
    <div style="text-align:right;">
      <div class="meta">Generated ${new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div class="meta">Report ID: ${site.id.slice(0, 8)}</div>
    </div>
  </div>

  ${score ? `
  <div class="score-hero">
    <div class="label">Composite Score</div>
    <div class="value" style="color:${getScoreColor(score.composite_score)}">${score.composite_score}</div>
  </div>

  <div class="grid-3">
    ${dimensions.map((d) => `
    <div class="card">
      <div class="card-title">${d.label}</div>
      ${scoreBar(d.value, d.color)}
    </div>
    `).join('')}
  </div>
  ` : '<div class="card" style="margin-bottom:24px;"><div class="card-title">Score</div><div class="card-value" style="color:#8B95A5;">No score data available</div></div>'}

  <div class="grid-2">
    <div class="card">
      <div class="card-title">Location</div>
      <div class="card-value">${site.state}${site.county ? `, ${site.county}` : ''}</div>
      <div class="card-sub">${site.lat?.toFixed(4)}, ${site.lng?.toFixed(4)}</div>
      ${site.acreage ? `<div class="card-sub">${site.acreage} acres</div>` : ''}
      ${site.zoning ? `<div class="card-sub">Zoning: ${site.zoning}</div>` : ''}
    </div>

    <div class="card">
      <div class="card-title">Target Capacity</div>
      <div class="card-value" style="font-size:28px;font-weight:800;">${site.target_capacity || '—'} <span style="font-size:13px;color:#8B95A5;">MW</span></div>
    </div>
  </div>

  ${substation ? `
  <div class="card" style="margin-bottom:24px;">
    <div class="card-title">Grid Connection</div>
    <div class="grid-2" style="margin-bottom:0;">
      <div>
        <div class="card-sub">Substation</div>
        <div class="card-value">${substation.name}</div>
      </div>
      <div>
        <div class="card-sub">Utility</div>
        <div class="card-value">${substation.utility || '—'}</div>
      </div>
      <div>
        <div class="card-sub">Capacity</div>
        <div class="card-value">${substation.capacity_mw}MW total &bull; ${substation.available_mw}MW available</div>
      </div>
      <div>
        <div class="card-sub">Voltage</div>
        <div class="card-value">${substation.voltage_kv}kV</div>
      </div>
      ${site.distance_to_substation_mi ? `
      <div>
        <div class="card-sub">Distance</div>
        <div class="card-value">${site.distance_to_substation_mi.toFixed(1)} miles</div>
      </div>` : ''}
    </div>
  </div>
  ` : ''}

  ${site.notes ? `
  <div class="card">
    <div class="card-title">Notes</div>
    <div class="card-value">${site.notes}</div>
  </div>
  ` : ''}

  <div class="footer">
    Meridian Node by RKV Consulting LLC &bull; Confidential &bull; ${new Date(generatedAt).getFullYear()}
  </div>
</body>
</html>`;
}
