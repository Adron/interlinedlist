'use client';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  conditionIcon: string;
  high: number;
  low: number;
  humidity: number;
  windSpeed: number;
}

// Mock weather data - structured for easy API integration later
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

export default function WeatherWidget() {
  const weather = mockWeatherData;

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="card-title mb-1">Today's Weather</h5>
            <p className="text-muted small mb-0">
              <i className="bx bx-map-pin me-1"></i>
              {weather.location}
            </p>
          </div>
          <div className="text-end">
            <i className={`bx ${weather.conditionIcon} fs-32 text-primary`}></i>
          </div>
        </div>

        <div className="mb-3">
          <div className="d-flex align-items-baseline">
            <span className="display-4 fw-bold me-2">{weather.temperature}°</span>
            <span className="text-muted">F</span>
          </div>
          <p className="text-muted mb-0">{weather.condition}</p>
        </div>

        <div className="border-top pt-3">
          <div className="row g-3">
            <div className="col-6">
              <div className="d-flex align-items-center">
                <i className="bx bx-up-arrow-alt text-success me-2"></i>
                <div>
                  <small className="text-muted d-block">High</small>
                  <strong>{weather.high}°F</strong>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex align-items-center">
                <i className="bx bx-down-arrow-alt text-info me-2"></i>
                <div>
                  <small className="text-muted d-block">Low</small>
                  <strong>{weather.low}°F</strong>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex align-items-center">
                <i className="bx bx-droplet text-primary me-2"></i>
                <div>
                  <small className="text-muted d-block">Humidity</small>
                  <strong>{weather.humidity}%</strong>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="d-flex align-items-center">
                <i className="bx bx-wind text-secondary me-2"></i>
                <div>
                  <small className="text-muted d-block">Wind</small>
                  <strong>{weather.windSpeed} mph</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
