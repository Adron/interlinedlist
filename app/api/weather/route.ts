import { NextRequest, NextResponse } from 'next/server';
import { USER_AGENT } from '@/lib/config/app';

export const dynamic = 'force-dynamic';

const NOAA_BASE_URL = 'https://api.weather.gov';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  conditionIcon: string;
  high: number;
  low: number;
  humidity: number | null;
  windSpeed: number;
}

// Map weather conditions to Boxicons
function getWeatherIcon(condition: string): string {
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) {
    return 'bx-sun';
  } else if (lowerCondition.includes('cloud')) {
    if (lowerCondition.includes('partly') || lowerCondition.includes('partially')) {
      return 'bx-cloud';
    }
    return 'bx-cloud';
  } else if (lowerCondition.includes('rain')) {
    return 'bx-cloud-rain';
  } else if (lowerCondition.includes('snow')) {
    return 'bx-cloud-snow';
  } else if (lowerCondition.includes('thunder') || lowerCondition.includes('lightning')) {
    return 'bx-cloud-lightning';
  } else if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) {
    return 'bx-cloud';
  }
  
  return 'bx-cloud'; // Default
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

    // Step 1: Get grid forecast endpoint from /points
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
        { error: 'Failed to fetch weather data' },
        { status: pointsResponse.status === 404 ? 404 : 500 }
      );
    }

    const pointsData = await pointsResponse.json();
    
    // Extract location name from properties
    const locationName = pointsData.properties?.relativeLocation?.properties?.city || 
                        pointsData.properties?.relativeLocation?.properties?.state || 
                        'Unknown Location';

    // Get forecast endpoint
    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
      return NextResponse.json(
        { error: 'Forecast endpoint not available for this location' },
        { status: 404 }
      );
    }

    // Step 2: Get forecast data
    const forecastResponse = await fetch(forecastUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!forecastResponse.ok) {
      console.error('NOAA forecast API error:', forecastResponse.status, forecastResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch forecast data' },
        { status: forecastResponse.status === 404 ? 404 : 500 }
      );
    }

    const forecastData = await forecastResponse.json();
    const periods = forecastData.properties?.periods || [];

    if (periods.length === 0) {
      return NextResponse.json(
        { error: 'No forecast data available' },
        { status: 404 }
      );
    }

    // Get current period (first period)
    const currentPeriod = periods[0];
    
    // Find today's high and low from periods
    let high = currentPeriod.temperature;
    let low = currentPeriod.temperature;
    
    // Look through periods to find today's high/low
    // Periods alternate between day and night, and have isDaytime flag
    const todayPeriods = periods.filter((p: any) => {
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const periodStart = new Date(p.startTime);
      periodStart.setHours(0, 0, 0, 0);
      return periodStart.getTime() === today.getTime();
    });

    if (todayPeriods.length > 0) {
      const dayTemps = todayPeriods
        .map((p: any) => p.temperature)
        .filter((t: number) => !isNaN(t));
      if (dayTemps.length > 0) {
        high = Math.max(...dayTemps);
        low = Math.min(...dayTemps);
      }
    } else {
      // Fallback: use first few periods
      const firstFewPeriods = periods.slice(0, 4);
      const temps = firstFewPeriods
        .map((p: any) => p.temperature)
        .filter((t: number) => !isNaN(t));
      if (temps.length > 0) {
        high = Math.max(...temps);
        low = Math.min(...temps);
      }
    }

    // Extract wind speed (format: "10 to 15 mph" or "15 mph")
    const windSpeedText = currentPeriod.windSpeed || '0 mph';
    const windSpeedMatch = windSpeedText.match(/(\d+)/);
    const windSpeed = windSpeedMatch ? parseInt(windSpeedMatch[1]) : 0;

    // Humidity may not be available in forecast, set to null
    const humidity = currentPeriod.relativeHumidity?.value || null;

    const weatherData: WeatherData = {
      location: locationName,
      temperature: currentPeriod.temperature,
      condition: currentPeriod.shortForecast || currentPeriod.detailedForecast || 'Unknown',
      conditionIcon: getWeatherIcon(currentPeriod.shortForecast || ''),
      high,
      low,
      humidity,
      windSpeed,
    };

    return NextResponse.json(weatherData, { status: 200 });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
