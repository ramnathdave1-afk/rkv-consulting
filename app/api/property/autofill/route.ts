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

    const hasAttom = !!process.env.ATTOM_API_KEY;

    // Only call ATTOM if key is configured; always call Rentcast
    const [attomDetail, attomValuation, attomAssessment, rentEstimate, rentcastProperty] =
      await Promise.all([
        hasAttom ? fetchPropertyDetail(address) : Promise.resolve(null),
        hasAttom ? fetchPropertyValuation(address) : Promise.resolve(null),
        hasAttom ? fetchAssessment(address) : Promise.resolve(null),
        fetchRentEstimate(address),
        fetchPropertyDetails(address),
      ]);

    // Flat structure consumed by DealForm's handleAutoFill
    // Prefer ATTOM data, fall back to Rentcast property details
    return NextResponse.json({
      address,
      estimatedValue:
        attomValuation?.avm?.amount?.value ?? rentcastProperty?.lastSalePrice ?? null,
      afterRepairValue: attomValuation?.avm?.amount?.high ?? null,
      monthlyRent: rentEstimate?.price ?? null,
      propertyType:
        attomDetail?.summary?.propType
        ?? attomDetail?.summary?.propSubType
        ?? rentcastProperty?.propertyType
        ?? null,
      beds: attomDetail?.building?.rooms?.beds ?? rentcastProperty?.bedrooms ?? null,
      baths: attomDetail?.building?.rooms?.bathsTotal ?? rentcastProperty?.bathrooms ?? null,
      sqft:
        attomDetail?.building?.size?.livingSize
        ?? attomDetail?.building?.size?.universalSize
        ?? rentcastProperty?.squareFootage
        ?? null,
      yearBuilt: attomDetail?.summary?.yearBuilt ?? rentcastProperty?.yearBuilt ?? null,
      lotSize: attomDetail?.lot?.lotSize1 ?? rentcastProperty?.lotSize ?? null,
      annualTaxes: attomAssessment?.assessment?.tax?.taxAmt ?? null,
      lastSalePrice: rentcastProperty?.lastSalePrice ?? null,
      lastSaleDate: rentcastProperty?.lastSaleDate ?? null,
      rentRangeLow: rentEstimate?.priceRangeLow ?? null,
      rentRangeHigh: rentEstimate?.priceRangeHigh ?? null,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[property/autofill]', e);
    return NextResponse.json({ error: 'Failed to autofill property data' }, { status: 500 });
  }
}

