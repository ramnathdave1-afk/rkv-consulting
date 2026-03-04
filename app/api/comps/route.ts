import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchComparables } from '@/lib/apis/rentcast';
import { fetchSalesComparables, fetchPropertyValuation } from '@/lib/apis/attom';
import { searchListings } from '@/lib/apis/zillow';
import { geocodeAddress } from '@/lib/apis/googlemaps';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address, radius = 1 } = await req.json();
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Geocode the subject property
    const coords = await geocodeAddress(address);

    // Fetch all comp sources in parallel
    const [rentalComps, salesComps, valuation, listings] = await Promise.all([
      fetchComparables(address, radius),
      fetchSalesComparables(address),
      fetchPropertyValuation(address),
      searchListings({ location: address, status: 'ForSale' }),
    ]);

    // Normalize sales comps from ATTOM format
    const normalizedSalesComps = (salesComps || []).map((c) => ({
      address: c.address?.oneLine || '',
      salePrice: c.sale?.amount?.saleAmt || 0,
      saleDate: c.sale?.saleTransDate || '',
      beds: c.building?.rooms?.beds || 0,
      baths: c.building?.rooms?.bathsTotal || 0,
      sqft: c.building?.size?.universalSize || 0,
      pricePerSqft: c.sale?.calculation?.pricePerSizeUnit || 0,
      yearBuilt: c.building?.summary?.yearBuilt || 0,
      lat: parseFloat(c.location?.latitude || '0'),
      lng: parseFloat(c.location?.longitude || '0'),
    }));

    // Normalize rental comps from Rentcast format
    const normalizedRentalComps = (rentalComps || []).map((c) => ({
      address: c.formattedAddress || '',
      rent: c.price || 0,
      beds: c.bedrooms || 0,
      baths: c.bathrooms || 0,
      sqft: c.squareFootage || 0,
      distance: c.distance || 0,
      daysOnMarket: c.daysOnMarket || 0,
      lat: c.latitude || 0,
      lng: c.longitude || 0,
    }));

    // Normalize active listings from Zillow
    const normalizedListings = (listings?.results || []).slice(0, 20).map((l) => ({
      address: l.address || '',
      price: l.price || 0,
      beds: l.bedrooms || 0,
      baths: l.bathrooms || 0,
      sqft: l.livingArea || 0,
      daysOnMarket: l.daysOnZillow || 0,
      lat: l.latitude || 0,
      lng: l.longitude || 0,
      imgSrc: l.imgSrc || null,
      homeType: l.homeType || '',
    }));

    // Compute ARV stats
    const avmValue = valuation?.avm?.amount?.value || 0;
    const avmHigh = valuation?.avm?.amount?.high || 0;
    const avmLow = valuation?.avm?.amount?.low || 0;
    const avmPerSqft = valuation?.avm?.calculations?.perSizeUnit || 0;

    const salesPrices = normalizedSalesComps.map((c) => c.salePrice).filter((p) => p > 0);
    const compsMedian = salesPrices.length > 0
      ? salesPrices.sort((a, b) => a - b)[Math.floor(salesPrices.length / 2)]
      : 0;
    const compsAvgPsf = normalizedSalesComps.length > 0
      ? normalizedSalesComps.reduce((s, c) => s + c.pricePerSqft, 0) / normalizedSalesComps.length
      : 0;

    const rents = normalizedRentalComps.map((c) => c.rent).filter((r) => r > 0);
    const avgRent = rents.length > 0 ? rents.reduce((s, r) => s + r, 0) / rents.length : 0;
    const medianRent = rents.length > 0 ? rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)] : 0;

    return NextResponse.json({
      subject: {
        address,
        coords,
      },
      salesComps: normalizedSalesComps,
      rentalComps: normalizedRentalComps,
      activeListings: normalizedListings,
      arv: {
        fromAVM: avmValue,
        fromComps: compsMedian,
        high: avmHigh,
        low: avmLow,
        medianPricePerSqft: avmPerSqft || compsAvgPsf,
      },
      rentalStats: {
        avgRent: Math.round(avgRent),
        medianRent: Math.round(medianRent),
        compCount: rents.length,
      },
    });
  } catch (error) {
    console.error('[Comps API]', error);
    return NextResponse.json({ error: 'Failed to fetch comparables' }, { status: 500 });
  }
}
