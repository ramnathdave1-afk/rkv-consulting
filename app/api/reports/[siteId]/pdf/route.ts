import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReportHTML } from '@/lib/pdf/generate';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch site data
  const { data: site } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  // Fetch score
  const { data: score } = await supabase
    .from('site_scores')
    .select('*')
    .eq('site_id', siteId)
    .order('scored_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch substation
  let substation = null;
  if (site.nearest_substation_id) {
    const { data } = await supabase
      .from('substations')
      .select('*')
      .eq('id', site.nearest_substation_id)
      .single();
    substation = data;
  }

  const generatedAt = new Date().toISOString();
  const html = generateReportHTML({ site, score, substation, generatedAt });

  // Try Puppeteer PDF generation
  try {
    const chromiumMod = await import('@sparticuz/chromium');
    const chromium = chromiumMod.default;
    const puppeteerMod = await import('puppeteer-core');
    const puppeteer = puppeteerMod.default;

    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await browser.close();

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="meridian-node-${site.name.replace(/\s+/g, '-').toLowerCase()}-report.pdf"`,
      },
    });
  } catch {
    // Fallback: return HTML report for browser rendering
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="meridian-node-${site.name.replace(/\s+/g, '-').toLowerCase()}-report.html"`,
      },
    });
  }
}
