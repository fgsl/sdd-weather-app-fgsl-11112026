import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getWeather,
  searchCities,
  WeatherRequestCancelledError,
} from '../../src/services/weatherService';
import type { City } from '../../src/types/weather';

const CITY: City = {
  id: 1,
  name: 'Seattle',
  country: 'Estados Unidos',
  admin1: 'Washington',
  latitude: 47.6,
  longitude: -122.33,
};

const GEOCODING_RESULT = {
  id: 1,
  name: 'São Paulo',
  country: 'Brasil',
  admin1: 'São Paulo',
  latitude: -23.55,
  longitude: -46.63,
};

const FORECAST_RESPONSE = {
  current: {
    time: '2026-06-16T12:00',
    temperature_2m: 18,
    relative_humidity_2m: 80,
    wind_speed_10m: 10,
    surface_pressure: 1015,
    precipitation: 0,
    weather_code: 3,
  },
  daily: {
    time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'],
    weather_code: [3, 61, 80, 1, 0],
    temperature_2m_max: [20, 19, 22, 24, 25],
    temperature_2m_min: [12, 11, 13, 14, 15],
    precipitation_probability_max: [20, 90, 70, 10, null],
  },
};

function mockFetchOnce(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

describe('weatherService', () => {
  beforeEach(() => vi.restoreAllMocks());

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('searchCities', () => {
    it('codifica cidades com acentos e valida resultados de geocoding', async () => {
      const fetchSpy = mockFetchOnce({ results: [GEOCODING_RESULT] });
      vi.stubGlobal('fetch', fetchSpy);

      const cities = await searchCities('São Paulo');
      const url = new URL(String(fetchSpy.mock.calls[0]?.[0]));

      expect(url.searchParams.get('name')).toBe('São Paulo');
      expect(url.searchParams.get('count')).toBe('5');
      expect(url.searchParams.get('language')).toBe('pt');
      expect(cities[0]).toMatchObject({ name: 'São Paulo', latitude: -23.55 });
    });

    it('retorna lista vazia quando não há correspondências', async () => {
      vi.stubGlobal('fetch', mockFetchOnce({}));
      await expect(searchCities('xyzxyz')).resolves.toEqual([]);
    });

    it('não consulta para entrada vazia', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      await expect(searchCities('   ')).resolves.toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it.each([
      ['objeto inválido', null],
      ['results não é uma lista', { results: {} }],
      ['cidade sem coordenada', { results: [{ ...GEOCODING_RESULT, latitude: 'inválida' }] }],
    ])('rejeita %s com erro tratável', async (_label, body) => {
      vi.stubGlobal('fetch', mockFetchOnce(body));
      await expect(searchCities('São Paulo')).rejects.toMatchObject({
        name: 'WeatherServiceError',
        code: 'invalid-response',
      });
    });
  });

  describe('getWeather', () => {
    it('mapeia clima atual e cinco dias, preservando probabilidade ausente', async () => {
      const fetchSpy = mockFetchOnce(FORECAST_RESPONSE);
      vi.stubGlobal('fetch', fetchSpy);

      const result = await getWeather(CITY);
      const url = new URL(String(fetchSpy.mock.calls[0]?.[0]));

      expect(url.searchParams.get('latitude')).toBe(String(CITY.latitude));
      expect(url.searchParams.get('longitude')).toBe(String(CITY.longitude));
      expect(url.searchParams.get('forecast_days')).toBe('5');
      expect(url.searchParams.get('timezone')).toBe('auto');
      expect(result.current.temperature).toBe(18);
      expect(result.forecast).toHaveLength(5);
      expect(result.forecast[4]?.precipitationProbability).toBeNull();
    });

    it('preserva campos meteorológicos ausentes para a UI exibir como indisponíveis', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({ ...FORECAST_RESPONSE, current: { ...FORECAST_RESPONSE.current, temperature_2m: null } }),
      );
      const result = await getWeather(CITY);
      expect(result.current.temperature).toBeNull();
    });

    it('preserva valores parciais, mas não aceita menos de cinco datas', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          ...FORECAST_RESPONSE,
          daily: {
            ...FORECAST_RESPONSE.daily,
            temperature_2m_min: FORECAST_RESPONSE.daily.temperature_2m_min.slice(0, 4),
          },
        }),
      );
      const result = await getWeather(CITY);
      expect(result.forecast).toHaveLength(5);
      expect(result.forecast[4]?.min).toBeNull();

      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          ...FORECAST_RESPONSE,
          daily: { ...FORECAST_RESPONSE.daily, time: FORECAST_RESPONSE.daily.time.slice(0, 4) },
        }),
      );
      await expect(getWeather(CITY)).rejects.toMatchObject({ code: 'invalid-response' });
    });

    it('rejeita respostas HTTP não-ok e JSON inválido', async () => {
      vi.stubGlobal('fetch', mockFetchOnce({}, false));
      await expect(getWeather(CITY)).rejects.toMatchObject({ code: 'http' });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, json: async () => Promise.reject(new Error('JSON inválido')) }),
      );
      await expect(getWeather(CITY)).rejects.toMatchObject({ code: 'invalid-response' });
    });

    it('normaliza falhas de rede', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      await expect(getWeather(CITY)).rejects.toMatchObject({ code: 'network' });
    });

    it('distingue timeout de cancelamento solicitado pelo chamador', async () => {
      vi.useFakeTimers();
      const fetchSpy = vi.fn((_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
      );
      vi.stubGlobal('fetch', fetchSpy);

      const timedRequest = searchCities('Seattle');
      const timedExpectation = expect(timedRequest).rejects.toMatchObject({ code: 'timeout' });
      await vi.advanceTimersByTimeAsync(10_000);
      await timedExpectation;

      const controller = new AbortController();
      const cancelledRequest = searchCities('Seattle', controller.signal);
      const cancellationExpectation = expect(cancelledRequest).rejects.toBeInstanceOf(
        WeatherRequestCancelledError,
      );
      controller.abort();
      await cancellationExpectation;
    });
  });
});