'use client';

import { useState } from 'react';
import LocationWidget from './LocationWidget';
import WeatherWidget from './WeatherWidget';

interface RightSidebarProps {
  showLocation?: boolean;
}

export default function RightSidebar({ showLocation = false }: RightSidebarProps) {
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleLocationChange = (coords: { latitude: number; longitude: number }) => {
    setCoordinates(coords);
  };

  return (
    <>
      {showLocation && <LocationWidget onLocationChange={handleLocationChange} />}
      <WeatherWidget latitude={coordinates?.latitude} longitude={coordinates?.longitude} />
    </>
  );
}
