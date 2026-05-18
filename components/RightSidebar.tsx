'use client';

import { useState, useEffect } from 'react';
import ClockWidget from './ClockWidget';
import WeatherWidget from './WeatherWidget';

interface RightSidebarProps {
  latitude?: number;
  longitude?: number;
}

export default function RightSidebar({ latitude, longitude }: RightSidebarProps) {
  const hasUserCoords = latitude !== undefined && longitude !== undefined;

  const [geoCoords, setGeoCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoLocating, setGeoLocating] = useState(!hasUserCoords);

  useEffect(() => {
    if (hasUserCoords) return;

    if (!navigator.geolocation) {
      setGeoLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoLocating(false);
      },
      () => {
        setGeoLocating(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }, [hasUserCoords]);

  const weatherLat = hasUserCoords ? latitude : geoCoords?.latitude;
  const weatherLon = hasUserCoords ? longitude : geoCoords?.longitude;

  return (
    <div className="sidebar-weather-panel">
      <ClockWidget />
      {geoLocating ? (
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="text-muted">Detecting your location...</span>
            </div>
          </div>
        </div>
      ) : weatherLat !== undefined && weatherLon !== undefined ? (
        <WeatherWidget latitude={weatherLat} longitude={weatherLon} />
      ) : null}
    </div>
  );
}
