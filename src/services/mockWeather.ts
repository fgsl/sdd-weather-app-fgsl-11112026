import type { WeatherData } from '../types/weather';

function dateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeForecast(
  entries: Array<[number, number, number, number]>,
): WeatherData['forecast'] {
  return entries.map(([max, min, weatherCode, precipitationProbability], index) => ({
    date: dateOffset(index),
    max,
    min,
    weatherCode,
    precipitationProbability,
  }));
}

export const mockWeatherData: WeatherData[] = [
  {
    city: {
      id: 1,
      name: 'Seattle',
      country: 'Estados Unidos',
      admin1: 'Washington',
      latitude: 47.6,
      longitude: -122.33,
    },
    current: {
      temperature: 0,
      weatherCode: 3,
      humidity: 80,
      windSpeed: 10,
      pressure: 1015,
      precipitation: 0,
      time: '12:00',
    },
    forecast: makeForecast([
      [20, 12, 3, 20],
      [19, 11, 61, 90],
      [22, 13, 80, 70],
      [24, 14, 1, 10],
      [25, 15, 0, 0],
    ]),
  },
  {
    city: {
      id: 2,
      name: 'Lisboa',
      country: 'Portugal',
      latitude: 38.72,
      longitude: -9.14,
    },
    current: {
      temperature: 22,
      weatherCode: 1,
      humidity: 48,
      windSpeed: 14,
      pressure: 1018,
      precipitation: 0,
      time: '12:00',
    },
    forecast: makeForecast([
      [24, 17, 1, 0],
      [23, 16, 2, 5],
      [22, 15, 3, 15],
      [25, 17, 0, 0],
      [26, 18, 1, 0],
    ]),
  },
  {
    city: {
      id: 3,
      name: 'São Paulo',
      country: 'Brasil',
      admin1: 'São Paulo',
      latitude: -23.55,
      longitude: -46.63,
    },
    current: {
      temperature: 24,
      weatherCode: 61,
      humidity: 72,
      windSpeed: 8,
      pressure: 1012,
      precipitation: 1.2,
      time: '12:00',
    },
    forecast: makeForecast([
      [25, 18, 61, 65],
      [26, 18, 3, 20],
      [27, 19, 2, 15],
      [25, 18, 80, 70],
      [26, 17, 1, 10],
    ]),
  },
];