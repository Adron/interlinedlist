'use client';

import { useState, useEffect } from 'react';
import LocationWidget from './LocationWidget';
import WeatherWidget from './WeatherWidget';

interface ProfileUser {
  displayName: string | null;
  username: string;
  latitude: number | null;
  longitude: number | null;
}

interface UserWallSidebarProps {
  profileUser: ProfileUser;
  /** Show "Your location" and comparison when the viewer is logged in */
  showViewerLocation?: boolean;
}

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  conditionIcon: string;
}

export default function UserWallSidebar({ profileUser, showViewerLocation = false }: UserWallSidebarProps) {
  const [viewerCoords, setViewerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [theirLocationName, setTheirLocationName] = useState<string | null>(null);
  const [theirWeather, setTheirWeather] = useState<WeatherData | null>(null);
  const [viewerWeather, setViewerWeather] = useState<WeatherData | null>(null);
  const [theirLoading, setTheirLoading] = useState(false);
  const [theirError, setTheirError] = useState<string | null>(null);

  const displayName = profileUser.displayName || profileUser.username;
  const hasTheirLocation = profileUser.latitude != null && profileUser.longitude != null;

  // Fetch profile user's location name and weather when they have coords
  useEffect(() => {
    if (!hasTheirLocation) return;

    let cancelled = false;
    setTheirLoading(true);
    setTheirError(null);

    const run = async () => {
      try {
        const locRes = await fetch(
          `/api/location?latitude=${profileUser.latitude}&longitude=${profileUser.longitude}`
        );
        if (cancelled) return;
        if (locRes.ok) {
          const locData = await locRes.json();
          setTheirLocationName(`${locData.city}, ${locData.state}`);
        }
      } catch {
        if (!cancelled) setTheirLocationName('Unknown');
      }

      try {
        const weatherRes = await fetch(
          `/api/weather?latitude=${profileUser.latitude}&longitude=${profileUser.longitude}`
        );
        if (cancelled) return;
        if (weatherRes.ok) {
          const w = await weatherRes.json();
          setTheirWeather({ location: w.location, temperature: w.temperature, condition: w.condition, conditionIcon: w.conditionIcon });
        } else {
          setTheirError('Weather unavailable');
        }
      } catch {
        if (!cancelled) setTheirError('Weather unavailable');
      } finally {
        if (!cancelled) setTheirLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [profileUser.latitude, profileUser.longitude, hasTheirLocation]);

  // When viewer coords change, fetch viewer's weather for comparison
  useEffect(() => {
    if (!viewerCoords || !showViewerLocation) {
      setViewerWeather(null);
      return;
    }

    let cancelled = false;
    fetch(`/api/weather?latitude=${viewerCoords.latitude}&longitude=${viewerCoords.longitude}`)
      .then((r) => r.ok ? r.json() : null)
      .then((w) => {
        if (!cancelled && w) {
          setViewerWeather({ location: w.location, temperature: w.temperature, condition: w.condition, conditionIcon: w.conditionIcon });
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [viewerCoords?.latitude, viewerCoords?.longitude, showViewerLocation]);

  return (
    <div className="d-block">
      {/* Their location */}
      <div className="card mb-3">
        <div className="card-body">
          <h5 className="card-title mb-2">
            <i className="bx bx-map me-2 text-primary"></i>
            {displayName}&apos;s Location
          </h5>
          {!hasTheirLocation ? (
            <p className="text-muted small mb-0">Location not set</p>
          ) : theirLoading ? (
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="text-muted small">Loading...</span>
            </div>
          ) : theirError ? (
            <p className="text-warning small mb-0">{theirError}</p>
          ) : (
            <>
              <div className="mb-2">
                <div className="fw-semibold small">{theirLocationName || '—'}</div>
              </div>
              {theirWeather && (
                <div className="d-flex align-items-center gap-2 small">
                  <i className={`bx ${theirWeather.conditionIcon} text-primary`}></i>
                  <span>{theirWeather.condition}</span>
                  <span className="text-muted">{theirWeather.temperature}°F</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Your location (viewer) - only when logged in */}
      {showViewerLocation && (
        <>
          <LocationWidget onLocationChange={setViewerCoords} />
          <WeatherWidget latitude={viewerCoords?.latitude} longitude={viewerCoords?.longitude} />
        </>
      )}

      {/* Comparison: "Sunny there / Snowy here" */}
      {showViewerLocation && theirWeather && viewerWeather && (
        <div className="card mt-3">
          <div className="card-body py-2">
            <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap small">
              <span className="text-muted">There</span>
              <i className={`bx ${theirWeather.conditionIcon} text-primary`}></i>
              <span>{theirWeather.condition}</span>
              <span className="text-muted">/</span>
              <span className="text-muted">Here</span>
              <i className={`bx ${viewerWeather.conditionIcon} text-secondary`}></i>
              <span>{viewerWeather.condition}</span>
            </div>
            <p className="text-center text-muted small mb-0 mt-1">
              {theirWeather.condition} there / {viewerWeather.condition} here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
