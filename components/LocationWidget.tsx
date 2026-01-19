'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

interface LocationWidgetProps {
  onLocationChange?: (coordinates: { latitude: number; longitude: number }) => void;
}

export default function LocationWidget({ onLocationChange }: LocationWidgetProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const hasRequestedLocation = useRef(false); // Track if we've already requested location
  const onLocationChangeRef = useRef(onLocationChange);

  // Keep ref updated without causing re-renders
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  const requestLocation = useCallback(async () => {
    // Don't request if we already have location
    if (hasRequestedLocation.current && location) {
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    hasRequestedLocation.current = true;
    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Call location API
          const response = await fetch(
            `/api/location?latitude=${latitude}&longitude=${longitude}`
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch location data');
          }

          const locationData: LocationData = await response.json();
          setLocation(locationData);
          setError(null);
          
          // Notify parent component of coordinates using ref to avoid dependency issues
          if (onLocationChangeRef.current) {
            onLocationChangeRef.current(locationData.coordinates);
          }
        } catch (err) {
          console.error('Location fetch error:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch location data');
          hasRequestedLocation.current = false; // Allow retry on error
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLoading(false);
        hasRequestedLocation.current = false; // Allow retry on error
        
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          
          // Detect browser and provide specific instructions
          const userAgent = navigator.userAgent.toLowerCase();
          let browserInstructions = '';
          
          if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
            browserInstructions = ' Click the lock icon in the address bar → Site settings → Location → Allow.';
          } else if (userAgent.includes('firefox')) {
            browserInstructions = ' Click the lock icon in the address bar → More Information → Permissions → Location → Allow.';
          } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
            browserInstructions = ' Safari menu → Settings → Websites → Location → Select "Allow" for this site.';
          } else if (userAgent.includes('edg')) {
            browserInstructions = ' Click the lock icon in the address bar → Site permissions → Location → Allow.';
          } else {
            browserInstructions = ' Look for a lock or information icon in your browser\'s address bar, then navigate to site permissions to enable location access.';
          }
          
          setError('Location permission denied. Please enable location access in your browser settings.' + browserInstructions);
        } else if (err.code === err.TIMEOUT) {
          setError('Location request timed out. Please try again.');
        } else {
          setError('Unable to retrieve your location. Please try again.');
        }
      },
      options
    );
  }, [location]); // Only depend on location, not onLocationChange

  useEffect(() => {
    // Only request location once on mount, or if we don't have location yet
    if (!hasRequestedLocation.current && !location) {
      requestLocation();
    }
  }, []); // Empty dependency array - only run once on mount

  if (loading) {
    return (
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="text-muted">Getting your location...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-start mb-2">
            <div className="flex-grow-1">
              <h5 className="card-title mb-2">
                <i className="bx bx-map me-2 text-primary"></i>
                Your Location
              </h5>
              <div className="alert alert-warning mb-0 small">
                <i className="bx bx-error-circle me-2"></i>
                {error || 'Unable to determine location'}
              </div>
              {permissionDenied && (
                <button
                  className="btn btn-sm btn-primary mt-2"
                  onClick={requestLocation}
                  disabled={loading}
                >
                  {loading ? 'Requesting...' : 'Request Location Permission'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex align-items-start mb-3">
          <div className="flex-grow-1">
            <h5 className="card-title mb-2">
              <i className="bx bx-map me-2 text-primary"></i>
              Your Location
            </h5>
            <div className="mb-2">
              <div className="fw-semibold">{location.city}, {location.state}</div>
              <div className="text-muted small">{location.country}</div>
            </div>
            <div className="text-muted small">
              <i className="bx bx-navigation me-1"></i>
              {location.coordinates.latitude.toFixed(4)}°N, {Math.abs(location.coordinates.longitude).toFixed(4)}°W
            </div>
          </div>
          <div className="text-end">
            <i className="bx bx-current-location fs-24 text-primary"></i>
          </div>
        </div>
        <div className="border-top pt-2">
          <div className="text-muted small">
            <i className="bx bx-time me-1"></i>
            Timezone: {location.timezone.replace('_', ' ')}
          </div>
        </div>
      </div>
    </div>
  );
}
