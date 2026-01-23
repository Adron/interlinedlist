import { NextRequest, NextResponse } from 'next/server';
import { USER_AGENT } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

const NOAA_BASE_URL = 'https://api.weather.gov';

interface LocationData {
  city: string;
  state: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude' },
        { status: 400 }
      );
    }

    // Call NOAA /points endpoint
    const pointsUrl = `${NOAA_BASE_URL}/points/${lat},${lon}`;
    const pointsResponse = await fetch(pointsUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!pointsResponse.ok) {
      console.error('NOAA points API error:', pointsResponse.status, pointsResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch location data' },
        { status: pointsResponse.status === 404 ? 404 : 500 }
      );
    }

    const pointsData = await pointsResponse.json();
    const properties = pointsData.properties || {};

    // Extract location information
    const relativeLocation = properties.relativeLocation?.properties || {};
    const city = relativeLocation.city || 'Unknown';
    const state = relativeLocation.state || 'Unknown';
    
    // Extract timezone
    const timezone = properties.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Extract coordinates from geometry if available, otherwise use request params
    let finalLat = lat;
    let finalLon = lon;
    
    if (pointsData.geometry?.coordinates) {
      // GeoJSON format: [longitude, latitude]
      finalLon = pointsData.geometry.coordinates[0];
      finalLat = pointsData.geometry.coordinates[1];
    }

    const locationData: LocationData = {
      city,
      state,
      country: 'United States', // NOAA API is US-only
      coordinates: {
        latitude: finalLat,
        longitude: finalLon,
      },
      timezone,
    };

    return NextResponse.json(locationData, { status: 200 });
  } catch (error) {
    console.error('Location API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
