'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_WEATHER_LOCATION } from '@/lib/config/weather';
import type { ExtendedWeatherData } from '@/lib/types/weather';
import RainNext60 from './weather/RainNext60';
import RainToday from './weather/RainToday';
import WeekForecast from './weather/WeekForecast';

interface WeatherWidgetProps {
  latitude?: number;
  longitude?: number;
}

// Mock weather data - fallback for non-logged-in users
const mockWeatherData: ExtendedWeatherData = {
  location: DEFAULT_WEATHER_LOCATION.name,
  temperature: 72,
  condition: 'Partly Cloudy',
  conditionIcon: 'bx-cloud',
  high: 75,
  low: 65,
  humidity: 68,
  windSpeed: 12,
};

export default function WeatherWidget({ latitude, longitude }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<ExtendedWeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(
    async (forceRefresh = false) => {
      if (latitude === undefined || longitude === undefined) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          extended: 'true',
        });
        if (forceRefresh) params.set('refresh', 'true');

        const response = await fetch(`/api/weather?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch weather data');
        }

        const weatherData: ExtendedWeatherData = await response.json();
        setWeather(weatherData);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      } finally {
        setLoading(false);
      }
    },
    [latitude, longitude]
  );

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) {
      setWeather(null);
      return;
    }
    fetchWeather();
  }, [fetchWeather, latitude, longitude]);

  // Use mock data only if weather fetch failed and coordinates are not available
  // Otherwise, use fetched weather or show loading/error state
  const displayWeather = weather || mockWeatherData;
  const isMockData = !weather && (latitude === undefined || longitude === undefined);

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="text-muted">Loading weather...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isMockData) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-warning mb-0 small">
            <i className="bx bx-error-circle me-2"></i>
            {error}
          </div>
        </div>
      </div>
    );
  }

  const refreshButton = (
    <button
      type="button"
      className="btn btn-link btn-sm p-0 text-muted"
      onClick={() => fetchWeather(true)}
      disabled={loading}
      title="Refresh weather"
      aria-label="Refresh weather"
    >
      <i className={`bx bx-recycle ${loading ? 'bx-spin' : ''}`}></i>
    </button>
  );

  return (
    <>
      <div className="card">
        <div className="card-body py-2 px-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <p className="text-muted small mb-0">
                <i className="bx bx-map-pin me-1"></i>
                {displayWeather.location}
              </p>
            </div>
            <div className="d-flex align-items-center gap-1">
              {refreshButton}
              <i className={`bx ${displayWeather.conditionIcon} fs-32 text-primary`}></i>
            </div>
          </div>

          <div className="mb-2">
            <div className="d-flex align-items-baseline">
              <span className="display-5 fw-bold me-1">{displayWeather.temperature}°</span>
              <span className="text-muted small">F</span>
            </div>
            <p className="text-muted mb-0 small">{displayWeather.condition}</p>
          </div>

          <div className="border-top pt-2">
            <div className="row g-2">
              <div className="col-6">
                <div className="d-flex align-items-center">
                  <i className="bx bx-up-arrow-alt text-success me-2"></i>
                  <div>
                    <small className="text-muted d-block">High</small>
                    <strong>{displayWeather.high}°F</strong>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex align-items-center">
                  <i className="bx bx-down-arrow-alt text-info me-2"></i>
                  <div>
                    <small className="text-muted d-block">Low</small>
                    <strong>{displayWeather.low}°F</strong>
                  </div>
                </div>
              </div>
              {displayWeather.humidity !== null && (
                <div className="col-6">
                  <div className="d-flex align-items-center">
                    <i className="bx bx-droplet text-primary me-2"></i>
                    <div>
                      <small className="text-muted d-block">Humidity</small>
                      <strong>{displayWeather.humidity}%</strong>
                    </div>
                  </div>
                </div>
              )}
              <div className={displayWeather.humidity !== null ? 'col-6' : 'col-12'}>
                <div className="d-flex align-items-center">
                  <i className="bx bx-wind text-secondary me-2"></i>
                  <div>
                    <small className="text-muted d-block">Wind</small>
                    <strong>{displayWeather.windSpeed} mph</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {weather?.hourly && weather.hourly.length > 0 && (
        <RainNext60 hourly={weather.hourly} onRefresh={() => fetchWeather(true)} refreshing={loading} />
      )}
      {weather?.hourly && weather.hourly.length > 0 && (
        <RainToday hourly={weather.hourly} onRefresh={() => fetchWeather(true)} refreshing={loading} />
      )}
      {weather?.weekly && weather.weekly.length > 0 && (
        <WeekForecast weekly={weather.weekly} onRefresh={() => fetchWeather(true)} refreshing={loading} />
      )}
    </>
  );
}
