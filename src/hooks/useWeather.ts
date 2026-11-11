import { useEffect, useRef, useState } from 'react';
import type { City, WeatherData } from '../types/weather';
import {
  getWeather,
  searchCities,
  WeatherRequestCancelledError,
  WeatherServiceError,
} from '../services/weatherService';

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

interface UseWeatherResult {
  status: WeatherStatus;
  data: WeatherData | null;
  cities: City[];
  error: string | null;
  query: string;
  search: (name: string) => Promise<void>;
  selectCity: (city: City) => Promise<void>;
  retry: () => Promise<void>;
}

/**
 * Hook de orquestração: busca cidades, seleciona uma e carrega o clima.
 * Expõe uma máquina de estados simples (idle/loading/success/error/empty).
 */
export function useWeather(): UseWeatherResult {
  const [status, setStatus] = useState<WeatherStatus>('idle');
  const [data, setData] = useState<WeatherData | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const activeRequest = useRef<AbortController | null>(null);
  const lastOperation = useRef<{ type: 'search'; query: string } | { type: 'weather'; city: City } | null>(
    null,
  );

  useEffect(() => () => activeRequest.current?.abort(), []);

  function startRequest(): AbortController {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    return controller;
  }

  function isCurrentRequest(controller: AbortController): boolean {
    return activeRequest.current === controller && !controller.signal.aborted;
  }

  async function loadWeather(city: City, controller = startRequest()): Promise<void> {
    lastOperation.current = { type: 'weather', city };
    setStatus('loading');
    setError(null);
    setData(null);
    try {
      const weather = await getWeather(city, controller.signal);
      if (!isCurrentRequest(controller)) return;
      setData(weather);
      setStatus('success');
    } catch (requestError) {
      if (requestError instanceof WeatherRequestCancelledError || !isCurrentRequest(controller)) return;
      setStatus('error');
      setError(toMessage(requestError));
    }
  }

  async function search(name: string): Promise<void> {
    const trimmed = name.trim();
    setQuery(trimmed);
    if (!trimmed) return;

    const controller = startRequest();
    lastOperation.current = { type: 'search', query: trimmed };
    setStatus('loading');
    setError(null);
    setCities([]);
    setData(null);
    try {
      const results = await searchCities(trimmed, controller.signal);
      if (!isCurrentRequest(controller)) return;
      setCities(results);
      if (results.length === 0) {
        setStatus('empty');
        return;
      }
      const city = results[0];
      if (city) await loadWeather(city, controller);
    } catch (requestError) {
      if (requestError instanceof WeatherRequestCancelledError || !isCurrentRequest(controller)) return;
      setStatus('error');
      setError(toMessage(requestError));
    }

  }

  async function selectCity(city: City): Promise<void> {
    await loadWeather(city);
  }

  async function retry(): Promise<void> {
    const operation = lastOperation.current;
    if (operation?.type === 'weather') await loadWeather(operation.city);
    else if (operation?.type === 'search') await search(operation.query);
  }

  return { status, data, cities, error, query, search, selectCity, retry };
}

function toMessage(err: unknown): string {
  if (err instanceof WeatherServiceError) return err.message;
  return 'Algo deu errado. Tente novamente.';
}
