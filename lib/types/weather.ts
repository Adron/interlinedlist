/**
 * Weather types for API and components
 */

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  conditionIcon: string;
  high: number;
  low: number;
  humidity: number | null;
  windSpeed: number;
}

export interface HourlyPeriod {
  startTime: string;
  temperature: number;
  probabilityOfPrecipitation: number;
  shortForecast: string;
}

export interface WeeklyPeriod {
  name: string;
  startTime: string;
  isDaytime: boolean;
  temperature: number;
  probabilityOfPrecipitation: number;
  shortForecast: string;
  icon: string;
}

export interface ExtendedWeatherData extends WeatherData {
  hourly?: HourlyPeriod[];
  weekly?: WeeklyPeriod[];
  timeZone?: string;
}
