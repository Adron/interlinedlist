import { NextRequest, NextResponse } from 'next/server';
import { USER_AGENT } from '@/lib/config/app';
import type { ExtendedWeatherData, HourlyPeriod, WeeklyPeriod } from '@/lib/types/weather';

export const dynamic = 'force-dynamic';

const NOAA_BASE_URL = 'https://api.weather.gov';
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 100;

interface WeatherCacheEntry {
  data: ExtendedWeatherData;
  expiresAt: number;
}

const weatherCache = new Map<string, WeatherCacheEntry>();
const weatherCacheKeysByAccess: string[] = [];

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

function getWeatherCacheKey(gridId: string, gridX: number, gridY: number): string {
  return `${gridId}-${gridX}-${gridY}`;
}

function getCachedWeather(key: string): ExtendedWeatherData | null {
  const entry = weatherCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) weatherCache.delete(key);
    return null;
  }
  // Move to end for LRU
  const idx = weatherCacheKeysByAccess.indexOf(key);
  if (idx >= 0) weatherCacheKeysByAccess.splice(idx, 1);
  weatherCacheKeysByAccess.push(key);
  return entry.data;
}

function setWeatherCache(key: string, data: ExtendedWeatherData): void {
  while (weatherCache.size >= MAX_CACHE_ENTRIES && weatherCacheKeysByAccess.length > 0) {
    const oldest = weatherCacheKeysByAccess.shift();
    if (oldest) weatherCache.delete(oldest);
  }
  weatherCacheKeysByAccess.push(key);
  weatherCache.set(key, {
    data,
    expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const extended = searchParams.get('extended') === 'true';
    const refresh = searchParams.get('refresh') === 'true';

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
        Accept: 'application/json',
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
    const props = pointsData.properties || {};

    // Extract location name from properties
    const locationName =
      props.relativeLocation?.properties?.city ||
      props.relativeLocation?.properties?.state ||
      'Unknown Location';

    // Derive cache key from gridpoint
    const gridId = props.gridId || props.cwa || 'unknown';
    const gridX = props.gridX ?? 0;
    const gridY = props.gridY ?? 0;
    const cacheKey = getWeatherCacheKey(gridId, gridX, gridY);

    // Check cache (only when extended and not forcing refresh)
    if (extended && !refresh) {
      const cached = getCachedWeather(cacheKey);
      if (cached) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    // Get forecast endpoint
    const forecastUrl = props.forecast;
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
        Accept: 'application/json',
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

    const todayPeriods = periods.filter((p: { startTime: string }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const periodStart = new Date(p.startTime);
      periodStart.setHours(0, 0, 0, 0);
      return periodStart.getTime() === today.getTime();
    });

    if (todayPeriods.length > 0) {
      const dayTemps = todayPeriods
        .map((p: { temperature: number }) => p.temperature)
        .filter((t: number) => !isNaN(t));
      if (dayTemps.length > 0) {
        high = Math.max(...dayTemps);
        low = Math.min(...dayTemps);
      }
    } else {
      const firstFewPeriods = periods.slice(0, 4);
      const temps = firstFewPeriods
        .map((p: { temperature: number }) => p.temperature)
        .filter((t: number) => !isNaN(t));
      if (temps.length > 0) {
        high = Math.max(...temps);
        low = Math.min(...temps);
      }
    }

    // Extract wind speed
    const windSpeedText = currentPeriod.windSpeed || '0 mph';
    const windSpeedMatch = windSpeedText.match(/(\d+)/);
    const windSpeed = windSpeedMatch ? parseInt(windSpeedMatch[1]) : 0;

    const humidity = currentPeriod.relativeHumidity?.value ?? null;
    const timeZone = props.timeZone || 'America/Los_Angeles';

    const baseWeatherData: ExtendedWeatherData = {
      location: locationName,
      temperature: currentPeriod.temperature,
      condition: currentPeriod.shortForecast || currentPeriod.detailedForecast || 'Unknown',
      conditionIcon: getWeatherIcon(currentPeriod.shortForecast || ''),
      high,
      low,
      humidity,
      windSpeed,
      timeZone,
    };

    // Fetch hourly forecast when extended
    if (extended) {
      const forecastHourlyUrl = props.forecastHourly;
      if (forecastHourlyUrl) {
        try {
          const hourlyResponse = await fetch(forecastHourlyUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              Accept: 'application/json',
            },
          });

          if (hourlyResponse.ok) {
            const hourlyData = await hourlyResponse.json();
            const hourlyPeriods = hourlyData.properties?.periods || [];
            baseWeatherData.hourly = hourlyPeriods.slice(0, 25).map(
              (p: {
                startTime: string;
                temperature: number;
                probabilityOfPrecipitation?: { value?: number };
                shortForecast?: string;
              }) =>
                ({
                  startTime: p.startTime,
                  temperature: p.temperature,
                  probabilityOfPrecipitation: p.probabilityOfPrecipitation?.value ?? 0,
                  shortForecast: p.shortForecast || '',
                }) satisfies HourlyPeriod
            );
          }
        } catch (err) {
          console.warn('Forecast hourly fetch failed:', err);
        }
      }

      // Add weekly periods from forecast
      baseWeatherData.weekly = periods.map(
        (p: {
          name: string;
          startTime: string;
          isDaytime: boolean;
          temperature: number;
          probabilityOfPrecipitation?: { value?: number };
          shortForecast?: string;
          icon?: string;
        }) =>
          ({
            name: p.name,
            startTime: p.startTime,
            isDaytime: p.isDaytime,
            temperature: p.temperature,
            probabilityOfPrecipitation: p.probabilityOfPrecipitation?.value ?? 0,
            shortForecast: p.shortForecast || '',
            icon: p.icon || '',
          }) satisfies WeeklyPeriod
      );

      setWeatherCache(cacheKey, baseWeatherData);
    }

    return NextResponse.json(baseWeatherData, { status: 200 });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
