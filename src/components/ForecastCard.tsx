import type { ForecastDay, Unit } from '../types/weather';
import { formatTemperature } from '../lib/temperature';
import { getWeatherIcon, getWeatherLabel } from '../lib/weatherCodes';
import { getDayLabel, getShortDate } from '../lib/format';

interface ForecastCardProps {
  day: ForecastDay;
  index: number;
  unit: Unit;
}

/** Card de um dia da previsão. */
export default function ForecastCard({ day, index, unit }: ForecastCardProps) {
  const weatherLabel = day.weatherCode === null ? 'Condição indisponível' : getWeatherLabel(day.weatherCode);

  return (
    <li className="flex min-h-44 flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-3 text-center shadow-glass backdrop-blur-md transition-colors hover:bg-white/[0.075] sm:min-h-48 sm:p-4">
      <p className="font-semibold">{getDayLabel(day.date, index)}</p>
      <p className="text-xs text-white/70">{getShortDate(day.date)}</p>
      <span
        aria-label={weatherLabel}
        className="my-1 text-3xl"
        role="img"
        title={weatherLabel}
      >
        {day.weatherCode === null ? '—' : getWeatherIcon(day.weatherCode)}
      </span>
      <p className="text-sm tabular-nums">
        <span className="font-semibold">
          {day.max === null ? '—' : formatTemperature(day.max, unit)}
        </span>{' '}
        <span className="text-white/70">
          {day.min === null ? '—' : formatTemperature(day.min, unit)}
        </span>
      </p>
      <p className="mt-auto text-xs text-accent-400">
        💧 {day.precipitationProbability === null ? '—' : `${day.precipitationProbability}%`}
      </p>
    </li>
  );
}
