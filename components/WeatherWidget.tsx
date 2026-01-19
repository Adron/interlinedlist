'use client';

import { useState, useEffect } from 'react';

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

interface WeatherWidgetProps {
  latitude?: number;
  longitude?: number;
}

// Mock weather data - fallback for non-logged-in users
const mockWeatherData: WeatherData = {
  location: 'San Francisco, CA',
  temperature: 72,
  condition: 'Partly Cloudy',
  conditionIcon: 'bx-cloud',
  high: 75,
  low: 65,
  humidity: 68,
  windSpeed: 12,
};

export default function WeatherWidget({ latitude, longitude }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if coordinates are provided
    if (latitude === undefined || longitude === undefined) {
      setWeather(null);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/weather?latitude=${latitude}&longitude=${longitude}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch weather data');
        }

        const weatherData: WeatherData = await response.json();
        setWeather(weatherData);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [latitude, longitude]);

  // Use mock data if no coordinates provided (non-logged-in users)
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

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="card-title mb-1">Today's Weather</h5>
            <p className="text-muted small mb-0">
              <i className="bx bx-map-pin me-1"></i>
              {displayWeather.location}
            </p>
          </div>
          <div className="text-end">
            <i className={`bx ${displayWeather.conditionIcon} fs-32 text-primary`}></i>
          </div>
        </div>

        <div className="mb-3">
          <div className="d-flex align-items-baseline">
            <span className="display-4 fw-bold me-2">{displayWeather.temperature}°</span>
            <span className="text-muted">F</span>
          </div>
          <p className="text-muted mb-0">{displayWeather.condition}</p>
        </div>

        <div className="border-top pt-3">
          <div className="row g-3">
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
  );
}
