import { useState } from 'react';
import type { Unit } from './types/weather';
import { useWeather } from './hooks/useWeather';
import CityResults from './components/CityResults';
import SearchBar from './components/SearchBar';
import UnitToggle from './components/UnitToggle';
import CurrentWeather from './components/CurrentWeather';
import ForecastList from './components/ForecastList';
import LoadingState from './components/states/LoadingState';
import ErrorState from './components/states/ErrorState';
import EmptyState from './components/states/EmptyState';

/**
 * WeatherView — aplicação completa de previsão do tempo.
 *
 * Construída ao longo do treinamento de Spec-Driven Development com GitHub
 * Copilot, do briefing à entrega.
 */
export default function App() {
  const { status, data, cities, error, query, search, selectCity, retry } = useWeather();
  const [unit, setUnit] = useState<Unit>('celsius');

  return (
    <div className="min-h-screen text-white">
      <header className="border-b border-white/10 bg-night-900/45 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-4 px-4 py-4 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_minmax(18rem,32rem)] lg:px-6">
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-3 text-white no-underline">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-xl border border-sun/25 bg-sun/10 text-xl text-sun"
              >
                ☀️
              </span>
              <span className="text-lg font-bold tracking-wide">WeatherView</span>
            </a>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <SearchBar onSearch={search} />
            <div className="lg:justify-self-end">
              <UnitToggle unit={unit} onChange={setUnit} />
            </div>
          </div>
        </div>
      </header>

      <main
        aria-busy={status === 'loading'}
        className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:py-10 lg:px-6"
      >
        {status === 'idle' && (
          <EmptyState title="Busque uma cidade para começar" hint="Ex.: Lisboa, São Paulo…" />
        )}
        {status === 'loading' && <LoadingState />}
        {status === 'results' && <CityResults cities={cities} onSelect={selectCity} />}
        {status === 'empty' && (
          <EmptyState
            title={`Nenhuma cidade encontrada para "${query}"`}
            hint="Verifique a grafia e tente novamente."
          />
        )}
        {status === 'error' && error && <ErrorState message={error} onRetry={retry} />}
        {status === 'success' && data && (
          <>
            <CurrentWeather city={data.city} current={data.current} unit={unit} />
            <ForecastList forecast={data.forecast} unit={unit} />
          </>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-white/65 lg:px-6">
        Dados meteorológicos por{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-accent-400 hover:underline">
          Open-Meteo
        </a>
      </footer>
    </div>
  );
}
