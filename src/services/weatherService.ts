import type { City, CurrentWeather, ForecastDay, WeatherData } from '../types/weather';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 10_000;

export type WeatherServiceErrorCode = 'network' | 'http' | 'timeout' | 'invalid-response';

/** Erro tipado da camada de dados, com mensagem amigável ao usuário. */
export class WeatherServiceError extends Error {
  constructor(
    message: string,
    readonly code: WeatherServiceErrorCode,
  ) {
    super(message);
    this.name = 'WeatherServiceError';
  }
}

/** Cancelamento por uma consulta substituta não é exibido como falha ao usuário. */
export class WeatherRequestCancelledError extends Error {
  constructor() {
    super('A consulta foi substituída por uma solicitação mais recente.');
    this.name = 'WeatherRequestCancelledError';
  }
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  if (signal?.aborted) throw new WeatherRequestCancelledError();

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new WeatherServiceError('A requisição demorou demais. Tente novamente.', 'timeout');
    }
    if (signal?.aborted || isAbortError(error)) throw new WeatherRequestCancelledError();
    throw new WeatherServiceError('Falha de rede. Verifique sua conexão.', 'network');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new WeatherServiceError('O serviço retornou uma resposta inválida.', 'invalid-response');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function invalidResponse(): never {
  throw new WeatherServiceError('O serviço retornou dados incompletos ou inválidos.', 'invalid-response');
}

function mapGeocodingResults(data: unknown): City[] {
  if (!isRecord(data)) return invalidResponse();
  if (!('results' in data)) return [];
  if (!Array.isArray(data.results)) return invalidResponse();

  return data.results.map((result): City => {
    const id = isRecord(result) ? result.id : undefined;
    if (
      !isRecord(result) ||
      !isFiniteNumber(id) ||
      !Number.isInteger(id) ||
      typeof result.name !== 'string' ||
      result.name.trim() === '' ||
      !isOptionalString(result.country) ||
      !isOptionalString(result.admin1) ||
      !isFiniteNumber(result.latitude) ||
      !isFiniteNumber(result.longitude)
    ) {
      return invalidResponse();
    }

    return {
      id,
      name: result.name,
      country: result.country ?? '',
      ...(result.admin1 ? { admin1: result.admin1 } : {}),
      latitude: result.latitude,
      longitude: result.longitude,
    };
  });
}

/** Busca cidades por nome e devolve lista vazia quando não há correspondências. */
export async function searchCities(name: string, signal?: AbortSignal): Promise<City[]> {
  const query = name.trim();
  if (!query) return [];

  const params = new URLSearchParams({ name: query, count: '5', language: 'pt', format: 'json' });
  const response = await fetchWithTimeout(`${GEOCODING_URL}?${params.toString()}`, signal);
  if (!response.ok) {
    throw new WeatherServiceError('Não foi possível buscar a cidade. Tente novamente.', 'http');
  }

  return mapGeocodingResults(await readJson(response));
}

function mapCurrent(value: unknown): CurrentWeather {
  if (
    !isRecord(value) ||
    typeof value.time !== 'string' ||
    value.time.trim() === '' ||
    !isFiniteNumber(value.temperature_2m) ||
    !isFiniteNumber(value.relative_humidity_2m) ||
    !isFiniteNumber(value.wind_speed_10m) ||
    !isFiniteNumber(value.surface_pressure) ||
    !isFiniteNumber(value.precipitation) ||
    !isFiniteNumber(value.weather_code)
  ) {
    return invalidResponse();
  }

  return {
    time: value.time,
    temperature: value.temperature_2m,
    humidity: value.relative_humidity_2m,
    windSpeed: value.wind_speed_10m,
    pressure: value.surface_pressure,
    precipitation: value.precipitation,
    weatherCode: value.weather_code,
  };
}

function mapForecast(value: unknown): ForecastDay[] {
  if (!isRecord(value)) return invalidResponse();

  const { time, weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max } =
    value;
  if (
    !Array.isArray(time) ||
    !Array.isArray(weather_code) ||
    !Array.isArray(temperature_2m_max) ||
    !Array.isArray(temperature_2m_min) ||
    !Array.isArray(precipitation_probability_max)
  ) {
    return invalidResponse();
  }

  const series = [time, weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max];
  if (series.some((items) => items.length !== 5)) return invalidResponse();

  return time.map((date, index): ForecastDay => {
    const weatherCode = weather_code[index];
    const max = temperature_2m_max[index];
    const min = temperature_2m_min[index];
    const precipitationProbability = precipitation_probability_max[index];
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !isFiniteNumber(weatherCode) ||
      !isFiniteNumber(max) ||
      !isFiniteNumber(min) ||
      !(precipitationProbability === null || isFiniteNumber(precipitationProbability))
    ) {
      return invalidResponse();
    }

    return { date, weatherCode, max, min, precipitationProbability };
  });
}

/** Busca o clima atual e cinco dias de previsão para uma cidade. */
export async function getWeather(city: City, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current:
      'temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation,weather_code',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '5',
    timezone: 'auto',
  });

  const response = await fetchWithTimeout(`${FORECAST_URL}?${params.toString()}`, signal);
  if (!response.ok) {
    throw new WeatherServiceError('Não foi possível carregar o clima. Tente novamente.', 'http');
  }

  const data = await readJson(response);
  if (!isRecord(data)) return invalidResponse();

  return {
    city,
    current: mapCurrent(data.current),
    forecast: mapForecast(data.daily),
  };
}