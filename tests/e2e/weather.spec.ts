import { test, expect, type Page } from '@playwright/test';

const geocoding = {
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

const springfieldResults = {
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

const forecast = {
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

async function mockApis(page: Page, forecastLatitudes: string[] = []) {
  await page.route('**/geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: geocoding }),
  );
  await page.route('**/api.open-meteo.com/**', (route) => {
    forecastLatitudes.push(new URL(route.request().url()).searchParams.get('latitude') ?? '');
    return route.fulfill({ json: forecast });
  });
}

test('fluxo completo: buscar → clima atual → previsão → trocar unidade', async ({ page }) => {
  const forecastLatitudes: string[] = [];
  await mockApis(page, forecastLatitudes);
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('Seattle');
  await page.getByRole('button', { name: /buscar/i }).click();
  await page.getByRole('button', { name: /Seattle.*Washington/i }).click();

  await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();
  const forecastRegion = page.getByRole('region', { name: /previsão de 5 dias/i });
  await expect(forecastRegion).toBeVisible();
  await expect(forecastRegion.getByRole('listitem')).toHaveCount(5);
  await expect(forecastRegion.getByTitle('Chuva fraca')).toBeVisible();
  await expect(forecastRegion.getByText('20°')).toBeVisible();

  // 0°C exibido; após trocar para °F deve virar 32°.
  await expect(page.getByText('0°').first()).toBeVisible();
  await page.getByRole('button', { name: '°F' }).click();
  await expect(page.getByText('32°').first()).toBeVisible();
  await expect(forecastRegion).toContainText('68°');
  expect(forecastLatitudes).toHaveLength(1);
});

test('homônimos podem ser diferenciados e selecionados pelo teclado', async ({ page }) => {
  const forecastLatitudes: string[] = [];
  await page.route('**/geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: springfieldResults }),
  );
  await page.route('**/api.open-meteo.com/**', (route) => {
    forecastLatitudes.push(new URL(route.request().url()).searchParams.get('latitude') ?? '');
    return route.fulfill({ json: forecast });
  });
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('Springfield');
  await page.getByRole('button', { name: /buscar/i }).click();

  const massachusetts = page.getByRole('button', { name: /Springfield.*Massachusetts/i });
  await expect(massachusetts).toBeVisible();
  expect(forecastLatitudes).toHaveLength(0);
  await massachusetts.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText('Massachusetts, Estados Unidos')).toBeVisible();
  expect(forecastLatitudes).toEqual(['42.1']);
});

test('viewport mobile permite selecionar um homônimo por toque', async ({ page }) => {
  const forecastLatitudes: string[] = [];
  await page.route('**/geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: springfieldResults }),
  );
  await page.route('**/api.open-meteo.com/**', (route) => {
    forecastLatitudes.push(new URL(route.request().url()).searchParams.get('latitude') ?? '');
    return route.fulfill({ json: forecast });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('Springfield');
  await page.getByRole('button', { name: /buscar/i }).tap();
  const illinois = page.getByRole('button', { name: /Springfield.*Illinois/i });
  await expect(illinois).toBeVisible();
  await illinois.tap();

  await expect(page.getByText('Illinois, Estados Unidos')).toBeVisible();
  expect(forecastLatitudes).toEqual(['39.78']);
});

test('mantém Fahrenheit ao consultar outra cidade', async ({ page }) => {
  const forecastLatitudes: string[] = [];
  await page.route('**/geocoding-api.open-meteo.com/**', (route) => {
    const query = new URL(route.request().url()).searchParams.get('name');
    const result =
      query === 'Lisboa'
        ? {
            results: [
              {
                id: 2,
                name: 'Lisboa',
                country: 'Portugal',
                latitude: 38.72,
                longitude: -9.14,
              },
            ],
          }
        : geocoding;
    return route.fulfill({ json: result });
  });
  await page.route('**/api.open-meteo.com/**', (route) => {
    const latitude = new URL(route.request().url()).searchParams.get('latitude') ?? '';
    forecastLatitudes.push(latitude);
    const response =
      latitude === '38.72'
        ? { ...forecast, current: { ...forecast.current, temperature_2m: 20 } }
        : forecast;
    return route.fulfill({ json: response });
  });
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('Seattle');
  await page.getByRole('button', { name: /buscar/i }).click();
  await page.getByRole('button', { name: /Seattle.*Washington/i }).click();
  await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();
  await page.getByRole('button', { name: '°F' }).click();
  await page.getByLabel(/buscar cidade/i).fill('Lisboa');
  await page.getByRole('button', { name: /buscar/i }).click();
  await page.getByRole('button', { name: /Lisboa, Portugal/i }).click();

  await expect(page.getByRole('heading', { name: 'Lisboa' })).toBeVisible();
  await expect(page.getByText('68°').first()).toBeVisible();
  expect(forecastLatitudes).toEqual(['47.6', '38.72']);
});

test('estado vazio quando a cidade não existe', async ({ page }) => {
  await page.route('**/geocoding-api.open-meteo.com/**', (route) => route.fulfill({ json: {} }));
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('xyzxyz');
  await page.getByRole('button', { name: /buscar/i }).click();

  await expect(page.getByText(/nenhuma cidade encontrada/i)).toBeVisible();
});

test('viewport mobile renderiza o fluxo principal', async ({ page }) => {
  const forecastLatitudes: string[] = [];
  await mockApis(page, forecastLatitudes);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('Seattle');
  await page.getByRole('button', { name: /buscar/i }).click();
  await page.getByRole('button', { name: /Seattle.*Washington/i }).tap();
  await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();
  await page.getByRole('button', { name: '°F' }).tap();
  await expect(page.getByText('32°').first()).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(forecastLatitudes).toHaveLength(1);
});
