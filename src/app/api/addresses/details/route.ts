import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json(
        { error: 'placeId is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Google Maps API key is not configured' },
        { status: 500 }
      );
    }

    // Call Google Places Details API
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('fields', 'address_components,formatted_address');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('Google Places Details API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch address details' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places Details API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || 'Failed to fetch address details' },
        { status: 500 }
      );
    }

    const result = data.result;
    const addressComponents = result.address_components || [];
    const formattedAddress = result.formatted_address || '';

    // Parse address components
    let streetNumber = '';
    let route = '';
    let city = '';
    let state = '';
    let zip = '';
    let county = '';

    addressComponents.forEach((component: any) => {
      const types = component.types || [];
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        route = component.long_name;
      }
      if (types.includes('locality')) {
        city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.short_name; // Use 2-letter state code
      }
      if (types.includes('postal_code')) {
        zip = component.long_name;
      }
      if (types.includes('administrative_area_level_2')) {
        county = component.long_name;
      }
    });

    // Combine street number and route for full street address
    const streetAddress = [streetNumber, route].filter(Boolean).join(' ').trim();

    return NextResponse.json({
      formattedAddress,
      streetAddress,
      city,
      state,
      zip,
      county,
    });
  } catch (error: any) {
    console.error('Address details error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch address details' },
      { status: 500 }
    );
  }
}

