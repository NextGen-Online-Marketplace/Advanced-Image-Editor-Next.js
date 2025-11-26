import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const input = searchParams.get('input') || '';

    if (!input.trim() || input.length < 2) {
      return NextResponse.json({ predictions: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Google Maps API key is not configured' },
        { status: 500 }
      );
    }

    // Call Google Places Autocomplete API
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input.trim());
    url.searchParams.set('key', apiKey);
    url.searchParams.set('types', 'address'); // Restrict to addresses only

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('Google Places API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch address suggestions' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      const predictions = (data.predictions || []).map((prediction: any) => ({
        place_id: prediction.place_id,
        description: prediction.description,
      }));

      return NextResponse.json({ predictions });
    } else {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || 'Failed to fetch address suggestions' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Address autocomplete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch address suggestions' },
      { status: 500 }
    );
  }
}

