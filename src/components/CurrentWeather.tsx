import type { CurrentWeather as CurrentWeatherType, City, Unit } from '../types/weather';
import { formatTemperature } from '../lib/temperature';
import { getWeatherIcon, getWeatherLabel } from '../lib/weatherCodes';

interface CurrentWeatherProps {
  city: City;
  current: CurrentWeatherType;
  unit: Unit;
}

interface MetricProps {
  icon: string;
  label: string;
  value: string;
}

function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="flex min-h-[4.5rem] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-3 backdrop-blur-md sm:px-4">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-lg">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.7rem] text-white/55">{label}</p>
        <p className="truncate font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

/** Seção "hero" com as condições atuais da cidade selecionada. */
export default function CurrentWeather({ city, current, unit }: CurrentWeatherProps) {
  const location = [city.admin1, city.country].filter(Boolean).join(', ');

  return (
    <section
      aria-label="Clima atual"
      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-glass backdrop-blur-xl sm:p-7 lg:p-8"
    >
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-400">
            Clima agora <span className="mx-1 text-white/25">/</span> {current.time}
          </p>
          <h2 className="break-words text-2xl font-bold sm:text-3xl">{city.name}</h2>
          {location && <p className="mt-1 text-sm text-white/55">{location}</p>}

          <div className="mt-5 flex items-center gap-3 sm:gap-5">
            <span aria-hidden="true" className="text-5xl sm:text-6xl">
              {getWeatherIcon(current.weatherCode)}
            </span>
            <span className="text-6xl font-light leading-none tabular-nums sm:text-7xl">
              {formatTemperature(current.temperature, unit)}
            </span>
          </div>
          <p className="mt-3 text-base text-white/75">{getWeatherLabel(current.weatherCode)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <Metric icon="💧" label="Umidade" value={`${Math.round(current.humidity)}%`} />
          <Metric
            icon="💨"
            label="Vento"
            value={`${Math.round(current.windSpeed)} km/h`}
          />
          <Metric
            icon="🌧️"
            label="Precipitação"
            value={`${current.precipitation} mm`}
          />
          <Metric
            icon="📊"
            label="Pressão"
            value={`${Math.round(current.pressure)} hPa`}
          />
        </div>
      </div>
    </section>
  );
}
