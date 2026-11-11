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

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (isFiniteNumber(value)) return value;
  return invalidResponse();
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
  if (!isRecord(value) || typeof value.time !== 'string' || value.time.trim() === '') {
    return invalidResponse();
  }

  return {
    time: value.time,
    temperature: nullableNumber(value.temperature_2m),
    humidity: nullableNumber(value.relative_humidity_2m),
    windSpeed: nullableNumber(value.wind_speed_10m),
    pressure: nullableNumber(value.surface_pressure),
    precipitation: nullableNumber(value.precipitation),
    weatherCode: nullableNumber(value.weather_code),
  };
}

function mapForecast(value: unknown): ForecastDay[] {
  if (!isRecord(value)) return invalidResponse();

  const { time, weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max } =
    value;
  if (!Array.isArray(time) || time.length !== 5) return invalidResponse();
  const series = [weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max];
  if (series.some((items) => items !== undefined && items !== null && !Array.isArray(items))) {
    return invalidResponse();
  }
  if (series.some((items) => Array.isArray(items) && items.length > 5)) return invalidResponse();

  const weatherCodes = Array.isArray(weather_code) ? weather_code : [];
  const maximums = Array.isArray(temperature_2m_max) ? temperature_2m_max : [];
  const minimums = Array.isArray(temperature_2m_min) ? temperature_2m_min : [];
  const precipitation = Array.isArray(precipitation_probability_max) ? precipitation_probability_max : [];

  return time.map((date, index): ForecastDay => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return invalidResponse();
    return {
      date,
      weatherCode: nullableNumber(weatherCodes[index]),
      max: nullableNumber(maximums[index]),
      min: nullableNumber(minimums[index]),
      precipitationProbability: nullableNumber(precipitation[index]),
    };
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