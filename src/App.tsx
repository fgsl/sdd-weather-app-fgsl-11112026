import { useState } from 'react';
import type { Unit, WeatherData } from './types/weather';
import { mockWeatherData } from './services/mockWeather';
import SearchBar from './components/SearchBar';
import UnitToggle from './components/UnitToggle';
import CurrentWeather from './components/CurrentWeather';
import ForecastList from './components/ForecastList';
import EmptyState from './components/states/EmptyState';

/**
 * WeatherView — aplicação completa de previsão do tempo.
 *
 * Construída ao longo do treinamento de Spec-Driven Development com GitHub
 * Copilot, do briefing à entrega.
 */
export default function App() {
  const [data, setData] = useState<WeatherData | null>(mockWeatherData[0] ?? null);
  const [query, setQuery] = useState('');
  const [unit, setUnit] = useState<Unit>('celsius');

  function searchMockCity(cityName: string) {
    setQuery(cityName);
    const normalizedName = cityName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
    const match = mockWeatherData.find((weather) => {
      const normalizedCity = weather.city.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
      return normalizedCity === normalizedName;
    });

    setData(match ?? null);
  }

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
            <SearchBar onSearch={searchMockCity} />
            <div className="lg:justify-self-end">
              <UnitToggle unit={unit} onChange={setUnit} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:py-10 lg:px-6">
        {data ? (
          <>
            <CurrentWeather city={data.city} current={data.current} unit={unit} />
            <ForecastList forecast={data.forecast} unit={unit} />
          </>
        ) : (
          <EmptyState
            title={`Nenhuma cidade encontrada para "${query}"`}
            hint="Tente Seattle, Lisboa ou São Paulo."
          />
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-white/40 lg:px-6">
        Dados demonstrativos para Seattle, Lisboa e São Paulo.
      </footer>
    </div>
  );
}
