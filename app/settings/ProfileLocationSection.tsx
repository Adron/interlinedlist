'use client';

import { useState } from 'react';

interface ProfileLocationSectionProps {
  latitude: number | null;
  longitude: number | null;
}

export default function ProfileLocationSection({ latitude, longitude }: ProfileLocationSectionProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<'success' | 'error' | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const hasLocation = latitude != null && longitude != null;

  const saveCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setMessage('error');
      setErrorDetails('Geolocation is not supported by your browser.');
      return;
    }
    setSaving(true);
    setMessage(null);
    setErrorDetails(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await fetch('/api/user/update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lon }),
          });
          if (res.ok) {
            setMessage('success');
            setErrorDetails(null);
            // Small delay before reload to show success message
            setTimeout(() => {
              window.location.reload();
            }, 500);
          } else {
            const errorData = await res.json().catch(() => ({}));
            setMessage('error');
            setErrorDetails(errorData.error || 'Failed to save location. Please try again.');
          }
        } catch (err) {
          setMessage('error');
          setErrorDetails('Network error. Please check your connection and try again.');
        } finally {
          setSaving(false);
        }
      },
      (err) => {
        setSaving(false);
        setMessage('error');
        
        // Provide specific error messages based on error code
        if (err.code === err.PERMISSION_DENIED) {
          setErrorDetails('Location permission denied. Please enable location access in your browser settings and try again.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrorDetails('Location information is unavailable. Please try again.');
        } else if (err.code === err.TIMEOUT) {
          setErrorDetails('Location request timed out. Please try again.');
        } else {
          setErrorDetails('Unable to retrieve your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const clearLocation = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: null, longitude: null }),
      });
      if (res.ok) window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title mb-2">
          <i className="bx bx-map-pin me-2 text-primary"></i>
          Profile location
        </h5>
        <p className="text-muted small mb-3">
          Shown on your wall page so visitors can see your location and compare weather (e.g. &quot;Sunny there / Snowy here&quot;).
        </p>
        {hasLocation ? (
          <div className="mb-2">
            <div className="small text-muted mb-1">Saved: {latitude?.toFixed(4)}°, {longitude?.toFixed(4)}°</div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={saveCurrentLocation}
                disabled={saving}
              >
                {saving ? 'Updating...' : 'Update to current location'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={clearLocation}
                disabled={saving}
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={saveCurrentLocation}
            disabled={saving}
          >
            {saving ? 'Getting location...' : 'Use my current location'}
          </button>
        )}
        {message === 'success' && (
          <p className="text-success small mt-2 mb-0">
            <i className="bx bx-check-circle me-1"></i>
            Location saved successfully. Weather will now display for this location.
          </p>
        )}
        {message === 'error' && (
          <div className="mt-2">
            <p className="text-warning small mb-0">
              <i className="bx bx-error-circle me-1"></i>
              {errorDetails || 'Could not get or save location.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
