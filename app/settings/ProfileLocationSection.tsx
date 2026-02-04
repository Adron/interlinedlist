'use client';

import { useState } from 'react';

interface ProfileLocationSectionProps {
  latitude: number | null;
  longitude: number | null;
}

export default function ProfileLocationSection({ latitude, longitude }: ProfileLocationSectionProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<'success' | 'error' | null>(null);

  const hasLocation = latitude != null && longitude != null;

  const saveCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setMessage('error');
      return;
    }
    setSaving(true);
    setMessage(null);
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
            window.location.reload();
          } else {
            setMessage('error');
          }
        } catch {
          setMessage('error');
        } finally {
          setSaving(false);
        }
      },
      () => {
        setMessage('error');
        setSaving(false);
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
        {message === 'success' && <p className="text-success small mt-2 mb-0">Location saved.</p>}
        {message === 'error' && <p className="text-warning small mt-2 mb-0">Could not get or save location.</p>}
      </div>
    </div>
  );
}
