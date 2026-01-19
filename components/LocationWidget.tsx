'use client';

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

// Mock location data - structured for easy API integration later
const mockLocationData: LocationData = {
  city: 'San Francisco',
  state: 'California',
  country: 'United States',
  coordinates: {
    latitude: 37.7749,
    longitude: -122.4194,
  },
  timezone: 'America/Los_Angeles',
};

export default function LocationWidget() {
  const location = mockLocationData;

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
