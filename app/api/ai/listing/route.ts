import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callClaude } from '@/lib/ai/claude';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { property_id } = body;
    if (!property_id) return NextResponse.json({ error: 'property_id required' }, { status: 400 });

    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .eq('user_id', user.id)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const typeLabel = (property.property_type || 'single_family').replace('_', ' ');
    const beds = property.bedrooms ?? 3;
    const baths = property.bathrooms ?? 2;
    const sqft = property.sqft ?? 1400;
    const rent = property.monthly_rent ?? 1800;
    const city = property.city || 'the area';
    const state = property.state || '';

    const systemPrompt = `You are a professional real estate copywriter. Generate a short, compelling rental listing. Respond with valid JSON only, no markdown, in this exact shape:
{"title": "string (e.g. 3BR/2BA Single Family in City)", "description": "string (2-4 paragraphs)", "highlights": ["string", "string", ...], "rentalTerms": {"price": "string", "deposit": "string", "leaseLength": "string"}}`;

    const userPrompt = `Property: ${typeLabel}, ${beds} bed, ${baths} bath, ${sqft} sq ft, $${rent}/month, ${property.address || ''}, ${city}, ${state}. Write a rental listing.`;

    const response = await callClaude(
      [{ role: 'user', content: userPrompt }],
      systemPrompt
    );

    const content = (response as { content?: { type: string; text: string }[] })?.content?.[0]?.text;
    if (!content) {
      return NextResponse.json({ error: 'AI did not return content' }, { status: 500 });
    }

    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    let parsed: { title: string; description: string; highlights: string[]; rentalTerms: { price: string; deposit: string; leaseLength: string } };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    return NextResponse.json({
      title: parsed.title || ` ${beds}BR/${baths}BA in ${city}`,
      description: parsed.description || '',
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      rentalTerms: parsed.rentalTerms || {
        price: `$${rent.toLocaleString()}/month`,
        deposit: `$${(rent * 1.5).toLocaleString()} (1.5x monthly rent)`,
        leaseLength: '12-month minimum lease',
      },
    });
  } catch (e) {
    console.error('[AI Listing]', e);
    return NextResponse.json({ error: 'Failed to generate listing' }, { status: 500 });
  }
}
