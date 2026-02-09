'use client';

import WeatherWidget from './WeatherWidget';
import { DEFAULT_WEATHER_LOCATION } from '@/lib/config/weather';

interface RightSidebarProps {
  latitude?: number;
  longitude?: number;
}

export default function RightSidebar({ latitude, longitude }: RightSidebarProps) {
  // Determine coordinates with fallback to San Francisco
  const getWeatherCoordinates = () => {
    // Priority 1: User's saved location
    if (latitude !== null && latitude !== undefined && 
        longitude !== null && longitude !== undefined) {
      return { latitude, longitude };
    }
    
    // Priority 2: San Francisco default (for logged-in users)
    return { 
      latitude: DEFAULT_WEATHER_LOCATION.latitude, 
      longitude: DEFAULT_WEATHER_LOCATION.longitude 
    };
  };

  const coords = getWeatherCoordinates();

  return <WeatherWidget latitude={coords.latitude} longitude={coords.longitude} />;
}
