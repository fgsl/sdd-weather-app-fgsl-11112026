import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const GEOCODING_RESPONSE = {
  results: [
    {
      id: 1,
      name: 'Seattle',
      country: 'Estados Unidos',
      admin1: 'Washington',
      latitude: 47.6,
      longitude: -122.33,
    },
  ],
};

const HOMONYM_RESPONSE = {
  results: [
    {
      id: 11,
      name: 'Springfield',
      country: 'Estados Unidos',
      admin1: 'Illinois',
      latitude: 39.78,
      longitude: -89.64,
    },
    {
      id: 12,
      name: 'Springfield',
      country: 'Estados Unidos',
      admin1: 'Massachusetts',
      latitude: 42.1,
      longitude: -72.59,
    },
  ],
};

const FORECAST_RESPONSE = {
  current: {
    time: '2026-06-16T12:00',
    temperature_2m: 0,
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
    precipitation_probability_max: [20, 90, 70, 10, 0],
  },
};

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('renderiza a marca e um estado vazio inicial', () => {
    render(<App />);
    expect(screen.getByText('WeatherView')).toBeInTheDocument();
    expect(screen.getByText(/busque uma cidade para começar/i)).toBeInTheDocument();
  });

  it('mostra a barra de busca e o alternador de unidade', () => {
    render(<App />);
    expect(screen.getByLabelText(/buscar cidade/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /unidade de temperatura/i })).toBeInTheDocument();
  });

  it('busca cidade e previsão pelo serviço e aplica a unidade selecionada', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(GEOCODING_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(FORECAST_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await user.type(screen.getByLabelText(/buscar cidade/i), 'Seattle');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    expect(await screen.findByRole('heading', { name: 'Seattle' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /previsão de 5 dias/i })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Nublado')).toBeInTheDocument();
    expect(screen.getByTitle('Chuva fraca')).toBeInTheDocument();
    expect(screen.getByTitle('Pancadas de chuva fracas')).toBeInTheDocument();
    expect(screen.getByText('Umidade')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('10 km/h')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '°F' }));
    expect(screen.getByText('32°')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /previsão de 5 dias/i })).toHaveTextContent('68°');
    expect(screen.getByRole('region', { name: /previsão de 5 dias/i })).toHaveTextContent('54°');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('mantém Fahrenheit ao buscar outra cidade', async () => {
    const user = userEvent.setup();
    const lisbonForecast = {
      ...FORECAST_RESPONSE,
      current: { ...FORECAST_RESPONSE.current, temperature_2m: 20 },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(GEOCODING_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(FORECAST_RESPONSE))
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              id: 2,
              name: 'Lisboa',
              country: 'Portugal',
              latitude: 38.72,
              longitude: -9.14,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(lisbonForecast));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await user.type(screen.getByLabelText(/buscar cidade/i), 'Seattle');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    await screen.findByRole('heading', { name: 'Seattle' });
    await user.click(screen.getByRole('button', { name: '°F' }));

    await user.clear(screen.getByLabelText(/buscar cidade/i));
    await user.type(screen.getByLabelText(/buscar cidade/i), 'Lisboa');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    expect(await screen.findByRole('heading', { name: 'Lisboa' })).toBeInTheDocument();
    expect(screen.getAllByText('68°')).toHaveLength(2);
  });

  it('aplica uma troca de unidade feita durante o carregamento', async () => {
    const user = userEvent.setup();
    let resolveForecast: (response: Response) => void = () => {};
    const delayedForecast = new Promise<Response>((resolve) => {
      resolveForecast = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(GEOCODING_RESPONSE))
      .mockReturnValueOnce(delayedForecast);
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await user.type(screen.getByLabelText(/buscar cidade/i), 'Seattle');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '°F' }));
    resolveForecast(jsonResponse(FORECAST_RESPONSE));

    expect(await screen.findByText('32°')).toBeInTheDocument();
  });

  it('permite escolher um homônimo pelo teclado antes de solicitar a previsão', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(HOMONYM_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(FORECAST_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await user.type(screen.getByLabelText(/buscar cidade/i), 'Springfield');
    await user.click(screen.getByRole('button', { name: /buscar/i }));

    const selectedCity = await screen.findByRole('button', { name: /Springfield.*Massachusetts/i });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    selectedCity.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Springfield' })).toBeInTheDocument();
    expect(screen.getByText(/Massachusetts, Estados Unidos/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams.get('latitude')).toBe('42.1');
  });

  it('apresenta estado vazio quando o geocoding não encontra cidades', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({})));
    render(<App />);

    await user.type(screen.getByLabelText(/buscar cidade/i), 'xyzxyz');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText(/nenhuma cidade encontrada/i)).toBeInTheDocument();
  });

  it('permite repetir a consulta de clima que falhou', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(GEOCODING_RESPONSE))
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(jsonResponse(FORECAST_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    await user.type(screen.getByLabelText(/buscar cidade/i), 'Seattle');
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    await user.click(await screen.findByRole('button', { name: /tentar novamente/i }));

    expect(await screen.findByRole('heading', { name: 'Seattle' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});