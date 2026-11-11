import type { City } from '../types/weather';

interface CityResultsProps {
  cities: City[];
  onSelect: (city: City) => void;
}

/** Lista resultados distinguíveis e selecionáveis por teclado ou toque. */
export default function CityResults({ cities, onSelect }: CityResultsProps) {
  return (
    <section aria-label="Resultados da busca" aria-live="polite">
      <h2 className="mb-3 text-lg font-semibold">Selecione uma cidade</h2>
      <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] backdrop-blur-md">
        {cities.map((city) => {
          const location = [city.admin1, city.country].filter(Boolean).join(', ');
          const accessibleName = [city.name, location].filter(Boolean).join(', ');

          return (
            <li key={city.id}>
              <button
                type="button"
                aria-label={accessibleName}
                onClick={() => onSelect(city)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-white/[0.07] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-400"
              >
                <span className="font-semibold text-white">{city.name}</span>
                <span className="text-right text-sm text-white/70">
                  {location || 'Localização não informada'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}