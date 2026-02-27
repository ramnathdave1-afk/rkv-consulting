import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchPropertyDetail, fetchPropertyValuation, fetchAssessment } from '@/lib/apis/attom';
import { fetchRentEstimate, fetchPropertyDetails } from '@/lib/apis/rentcast';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as { address?: string };
    const address = body.address?.trim();
    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    const [attomDetail, attomValuation, attomAssessment, rentEstimate, rentcastProperty] =
      await Promise.all([
        fetchPropertyDetail(address),
        fetchPropertyValuation(address),
        fetchAssessment(address),
        fetchRentEstimate(address),
        fetchPropertyDetails(address),
      ]);

    return NextResponse.json({
      address,
      attom: {
        beds: attomDetail?.building?.rooms?.beds ?? null,
        baths: attomDetail?.building?.rooms?.bathsTotal ?? null,
        sqft: attomDetail?.building?.size?.livingSize ?? attomDetail?.building?.size?.universalSize ?? null,
        yearBuilt: attomDetail?.summary?.yearBuilt ?? null,
        lotSize: attomDetail?.lot?.lotSize1 ?? null,
        propertyType: attomDetail?.summary?.propType ?? attomDetail?.summary?.propSubType ?? null,
        estimatedValue: attomValuation?.avm?.amount?.value ?? null,
        estimatedValueHigh: attomValuation?.avm?.amount?.high ?? null,
        estimatedValueLow: attomValuation?.avm?.amount?.low ?? null,
        annualTaxes: attomAssessment?.assessment?.tax?.taxAmt ?? null,
        lastSalePrice: rentcastProperty?.lastSalePrice ?? null,
        lastSaleDate: rentcastProperty?.lastSaleDate ?? null,
        schoolDistrict: null,
        floodZone: null,
      },
      rentcast: {
        estimatedRent: rentEstimate?.price ?? null,
        rentRangeLow: rentEstimate?.priceRangeLow ?? null,
        rentRangeHigh: rentEstimate?.priceRangeHigh ?? null,
        vacancyRate: null,
        rentGrowthYoY: null,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[property/autofill]', e);
    return NextResponse.json({ error: 'Failed to autofill property data' }, { status: 500 });
  }
}

