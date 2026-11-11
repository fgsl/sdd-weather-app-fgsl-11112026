# Arquitetura do Weather App

Este documento descreve a arquitetura da aplicação **SDD Weather App**: visão geral, tecnologias e versões, organização do código, classes e componentes, fluxos de dados, estados da interface, tratamento de erros, estratégia de testes e publicação no GitHub Pages.

Fonte da verdade: o código em `src/`. O plano em [plans/weather-app-plan.md](/workspaces/sdd-weather-app-fgsl-11112026/plans/weather-app-plan.md) foi a referência inicial, mas algumas decisões evoluíram (ver [Pontos de atenção](#12-pontos-de-atenção)).

## 1. Visão geral

O Weather App é uma **Single Page Application (SPA)** que roda inteiramente no navegador. O usuário busca uma cidade, escolhe um resultado e vê o clima atual e a previsão de 5 dias. Os dados vêm da API pública [Open-Meteo](https://open-meteo.com/), que não exige chave de API.

Características principais:

- **Sem backend próprio**: a aplicação chama diretamente as APIs Open-Meteo.
- **Estado local**: não há Redux, Context global nem persistência. O estado vive em `App` e no hook `useWeather`.
- **Temperaturas em Celsius internamente**: a conversão para Fahrenheit acontece só na apresentação, e trocar a unidade não gera nova requisição.
- **Cancelamento de requisições**: cada operação usa `AbortController`, evitando que respostas antigas sobrescrevam resultados novos.

## 2. Tecnologias e versões

As versões abaixo são as fixadas em [package.json](/workspaces/sdd-weather-app-fgsl-11112026/package.json).

| Categoria | Tecnologia | Versão | Uso no projeto |
|-----------|------------|--------|----------------|
| Linguagem | TypeScript | 6.0.3 | Tipagem em modo `strict` |
| UI | React | 19.2.7 | Componentes e hooks |
| UI | react-dom | 19.2.7 | Renderização no DOM |
| Build | Vite | 8.0.16 | Dev server e build de produção |
| Build | @vitejs/plugin-react | 6.0.2 | Suporte a React no Vite |
| Estilo | Tailwind CSS | 3.4.19 | Estilos utilitários (tema dark glassmorphism) |
| Estilo | PostCSS | 8.5.15 | Pipeline do Tailwind |
| Estilo | Autoprefixer | 10.5.0 | Prefixos de CSS |
| Testes unitários | Vitest | 4.1.9 | Runner de testes |
| Testes unitários | @vitest/coverage-v8 | 4.1.9 | Cobertura de código |
| Testes unitários | @testing-library/react | 16.3.2 | Renderização e queries de componentes |
| Testes unitários | @testing-library/jest-dom | 6.9.1 | Matchers de DOM |
| Testes unitários | @testing-library/user-event | 14.6.1 | Simulação de interações do usuário |
| Testes unitários | jsdom | 29.1.1 | Ambiente DOM para o Vitest |
| Testes E2E | @playwright/test | 1.61.0 | Testes end-to-end (Desktop Chrome e iPhone 13) |
| Qualidade | Biome | 2.5.0 | Lint e formatação |
| Tipos | @types/react | 19.2.17 | Tipagem do React |
| Tipos | @types/react-dom | 19.2.3 | Tipagem do react-dom |
| Tipos | @types/node | 26.0.0 | Tipagem do Node.js |
| Pacotes | pnpm | 11.8.0 | Gerenciador de pacotes (campo `packageManager`) |
| Runtime | Node.js | `>=22` (ver nota) | Execução de build e testes |
| CI/CD | GitHub Actions | — | Validação de artefatos SDD e deploy no Pages |
| Hospedagem | GitHub Pages | — | Publicação do site e do app |
| API | Open-Meteo Geocoding | v1 | Busca de cidades |
| API | Open-Meteo Forecast | v1 | Clima atual e previsão diária |

> **Nota sobre Node.js:** o arquivo [.nvmrc](/workspaces/sdd-weather-app-fgsl-11112026/.nvmrc) indica `20`, mas o campo `engines` do [package.json](/workspaces/sdd-weather-app-fgsl-11112026/package.json) exige `>=22`. O projeto segue o `engines`. Recomenda-se alinhar o `.nvmrc` para `22`.

## 3. Estrutura de pastas

```text
.
├── src/
│   ├── main.tsx              # Ponto de entrada (createRoot + StrictMode)
│   ├── App.tsx               # Composição da tela e estado da unidade
│   ├── components/           # Um componente por arquivo
│   ├── hooks/
│   │   └── useWeather.ts     # Máquina de estados e orquestração das requisições
│   ├── services/
│   │   └── weatherService.ts # Acesso às APIs Open-Meteo
│   ├── lib/                  # Funções puras: temperatura, formatação, códigos do tempo
│   └── types/
│       └── weather.ts        # Contratos de domínio compartilhados
├── tests/
│   ├── unit/                 # Testes Vitest + Testing Library
│   ├── e2e/                  # Testes Playwright
│   └── setup.ts              # Setup do Vitest (jest-dom)
├── docs/                     # Página raiz publicada no GitHub Pages
├── diagrams/                 # Fontes Mermaid (.mmd) e imagens (.png) dos diagramas
├── specs/                    # Especificação do produto
├── plans/                    # Plano técnico
├── tasks/                    # Backlog de tarefas
├── .github/
│   ├── agents/               # Agentes do fluxo SDD
│   ├── instructions/         # Convenções aplicadas por padrão de arquivo
│   ├── prompts/              # Prompts de produção por fase
│   └── workflows/            # CI: validações e deploy do Pages
├── vite.config.ts
├── tsconfig*.json
├── biome.json
└── playwright.config.ts
```

Convenções (conforme [.github/copilot-instructions.md](/workspaces/sdd-weather-app-fgsl-11112026/.github/copilot-instructions.md)):

- Componentes React em `src/components/`, um por arquivo.
- Acesso a dados isolado em `src/services/`.
- Hooks reutilizáveis em `src/hooks/`.
- Tipos compartilhados em `src/types/`.
- Funções puras e testáveis; efeitos colaterais não escondidos.
- Estados de **loading**, **erro** e **vazio** sempre tratados.

## 4. Visão de componentes e camadas

![Diagrama de componentes e camadas](/workspaces/sdd-weather-app-fgsl-11112026/diagrams/01-componentes.png)

Fonte: [diagrams/01-componentes.mmd](/workspaces/sdd-weather-app-fgsl-11112026/diagrams/01-componentes.mmd)

As camadas são:

1. **Apresentação** (`App.tsx`, `components/`): renderiza a tela e captura eventos.
2. **Orquestração** (`hooks/useWeather.ts`): decide quando buscar, cancelar, repetir e qual estado exibir.
3. **Serviço** (`services/weatherService.ts`): faz as chamadas HTTP, valida respostas e converte para o domínio.
4. **Domínio e utilitários** (`types/`, `lib/`): contratos e funções puras, sem dependência de React.

A dependência é unidirecional: componentes e hook dependem de `types/` e `lib/`, mas `lib/` e `types/` não conhecem React nem o serviço.

## 5. Modelo de classes (UML)

![Diagrama de classes](/workspaces/sdd-weather-app-fgsl-11112026/diagrams/02-classes.png)

Fonte: [diagrams/02-classes.mmd](/workspaces/sdd-weather-app-fgsl-11112026/diagrams/02-classes.mmd)

Observações sobre o modelo:

- O projeto é **funcional**: não há classes de domínio. Itens marcados como `«interface»` e `«module»` representam tipos TypeScript e módulos. As únicas classes são os erros, que estendem `Error`.
- `WeatherServiceError` carrega um `code` do tipo `WeatherServiceErrorCode` (`network`, `http`, `timeout` ou `invalid-response`). A UI usa esse código para escolher a mensagem.
- `WeatherRequestCancelledError` sinaliza cancelamento intencional (nova busca ou desmontagem). O hook a trata como não erro.
- `WeatherData` agrega `City`, `CurrentWeather` e `ForecastDay[]`.

### Contratos de domínio (`src/types/weather.ts`)

- `City`: `id`, `name`, `country`, `admin1`, `latitude`, `longitude`.
- `CurrentWeather`: `time`, `temperature` (°C), `humidity`, `windSpeed`, `pressure`, `precipitation`, `weatherCode`.
- `ForecastDay`: `date`, `min`, `max` (°C), `weatherCode`, `precipitationProbability`.
- `WeatherData`: `city`, `current`, `forecast`.

## 6. Fluxos de dados

![Diagrama de sequência do fluxo de dados](/workspaces/sdd-weather-app-fgsl-11112026/diagrams/03-fluxo-dados.png)

Fonte: [diagrams/03-fluxo-dados.mmd](/workspaces/sdd-weather-app-fgsl-11112026/diagrams/03-fluxo-dados.mmd)

Fluxo principal, em três etapas:

1. **Busca de cidade**: `SearchBar` envia o nome → `useWeather.search` abre um `AbortController` → `weatherService.searchCities` chama `GET https://geocoding-api.open-meteo.com/v1/search` (`name`, `count=5`, `language=pt`, `format=json`) → resultados vão para `CityResults`.
2. **Seleção**: o usuário escolhe uma cidade em `CityResults` → `selectCity` cancela a requisição anterior → `weatherService.getWeather` chama `GET https://api.open-meteo.com/v1/forecast`.
3. **Clima**: a resposta é validada e mapeada para `WeatherData` (temperaturas em Celsius) → `CurrentWeatherView` e `ForecastList` exibem os dados convertidos pela unidade atual, usando `lib/`.

Parâmetros do forecast:

- `current`: `temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`, `surface_pressure`, `precipitation`, `weather_code`.
- `daily`: `weather_code`, `temperature_2m_max`, `temperature_2m_min`, `precipitation_probability_max`.
- `forecast_days=5`, `timezone=auto`.

Troca de unidade: `UnitToggle` altera o `unit` em `App`, e os componentes reconvertem os valores já armazenados. Nenhuma requisição é feita.

## 7. Máquina de estados do hook

![Diagrama de estados do useWeather](/workspaces/sdd-weather-app-fgsl-11112026/diagrams/04-estados-usewather.png)

Fonte: [diagrams/04-estados-usewather.mmd](/workspaces/sdd-weather-app-fgsl-11112026/diagrams/04-estados-usewather.mmd)

Estados (`WeatherStatus`): `idle`, `loading`, `results`, `success`, `error` e `empty`.

- `loading` é usado tanto na busca de cidades quanto no carregamento do clima.
- `results` mostra a lista de cidades para escolha. `empty` indica busca sem resultados.
- `success` mostra o clima. `error` mostra a mensagem de erro com ação de nova tentativa.
- O hook guarda `lastOperation` (busca ou seleção de cidade) para que `retry()` repita a última ação.

## 8. Tratamento de erros e cancelamento

| Situação | Origem | Tratamento |
|----------|--------|------------|
| Falha de rede | `fetch` rejeita | `WeatherServiceError` com `code: network` |
| Resposta HTTP não OK | `response.ok === false` | `WeatherServiceError` com `code: http` |
| Tempo limite | Sem resposta em 10 s | `WeatherServiceError` com `code: timeout` |
| Payload inválido | Validação falha no mapeamento | `WeatherServiceError` com `code: invalid-response` |
| Nova operação antes do fim da anterior | Usuário interage de novo | `AbortController.abort()`; `WeatherRequestCancelledError` é ignorado pelo hook |
| Desmontagem do componente | Cleanup do efeito | Cancela a requisição em andamento |

O timeout de 10 segundos é implementado no `weatherService` com `AbortController`.

## 9. Testes

Estratégia (derivada de [specs/weather-app-spec.md](/workspaces/sdd-weather-app-fgsl-11112026/specs/weather-app-spec.md) e do plano):

- **Unitários** (`tests/unit/`, Vitest + Testing Library + jsdom): componentes, hook, serviço e funções de `lib/`. O serviço é testado com `fetch` simulado.
- **E2E** (`tests/e2e/`, Playwright): fluxo completo com dois projetos, Desktop Chrome e iPhone 13.
- Configuração: bloco `test` em `vite.config.ts`, `tests/setup.ts` e `playwright.config.ts`.

Checklist antes de concluir mudanças em `src/` ou `tests/`:

```bash
pnpm lint
pnpm build
pnpm test
```

## 10. Build, configuração e publicação

### Build

- `pnpm build` executa `tsc -b && vite build`: checagem de tipos e, depois, o bundle.
- `vite.config.ts` define `base` como `process.env.VITE_BASE ?? '/'`. Assim, o mesmo código é publicado em um subcaminho sem alteração.

### GitHub Pages

O workflow [.github/workflows/pages-site.yml](/workspaces/sdd-weather-app-fgsl-11112026/.github/workflows/pages-site.yml) roda em `push` na `main` (e manualmente, via `workflow_dispatch`):

1. Faz o build do app com `VITE_BASE=/<repo>/app/`.
2. Monta a pasta `_site`: o conteúdo de `docs/` na raiz e o `dist/` em `app/`.
3. Publica com `actions/deploy-pages`.

URLs resultantes:

- Site: `https://fgsl.github.io/sdd-weather-app-fgsl-11112026/`
- App: `https://fgsl.github.io/sdd-weather-app-fgsl-11112026/app/`

Pré-requisito: em **Settings → Pages**, a fonte deve ser **GitHub Actions**.

### Validação de artefatos do fluxo SDD

Os workflows [validate-spec.yml](/workspaces/sdd-weather-app-fgsl-11112026/.github/workflows/validate-spec.yml), [validate-plan.yml](/workspaces/sdd-weather-app-fgsl-11112026/.github/workflows/validate-plan.yml) e [validate-tasks.yml](/workspaces/sdd-weather-app-fgsl-11112026/.github/workflows/validate-tasks.yml) verificam a estrutura de `specs/`, `plans/` e `tasks/`. Por exemplo, `validate-tasks.yml` exige pelo menos 6 identificadores `T-NN`.

## 11. Decisões de arquitetura

| Decisão | Motivo |
|---------|--------|
| SPA sem backend | O Open-Meteo é público e sem chave; um backend seria custo sem ganho funcional |
| Estado local com hook, sem biblioteca global | O escopo é pequeno; `useWeather` concentra a lógica assíncrona |
| Celsius como fonte, conversão na apresentação | Troca de unidade instantânea e sem requisição extra |
| `AbortController` por requisição | Evita condição de corrida entre buscas e seleções |
| Erros tipados (`WeatherServiceError.code`) | A UI escolhe a mensagem sem interpretar textos de erro |
| Serviço separado do hook | Permite testar a integração HTTP sem React |
| `base` configurável por variável de ambiente | Mesmo código serve em `/` (dev) e em `/<repo>/app/` (Pages) |

## 12. Pontos de atenção

1. **Node.js**: `.nvmrc` (`20`) diverge de `engines` (`>=22`). Alinhar para `22`.
2. **Plano desatualizado**: [plans/weather-app-plan.md](/workspaces/sdd-weather-app-fgsl-11112026/plans/weather-app-plan.md) afirma que a primeira cidade é selecionada automaticamente. O código exige seleção explícita em `CityResults`. Atualizar o plano ou o código.
3. **Prop `disabled` não utilizada**: `SearchBar` aceita `disabled`, mas `App.tsx` nunca a passa.
4. **Favicon ausente**: [index.html](/workspaces/sdd-weather-app-fgsl-11112026/index.html) referencia `/vite.svg`, que não existe no repositório (não há pasta `public/`). O navegador registra 404.
5. **Nomes repetidos**: `CurrentWeather` é tipo em `types/weather.ts` e componente em `components/CurrentWeather.tsx`. No diagrama de classes, o componente aparece como `CurrentWeatherView`.
6. **Build altera arquivo rastreado**: `tsconfig.app.tsbuildinfo` muda a cada `pnpm build`. Não versionar essa alteração por engano.

## 13. Referências

- Open-Meteo Geocoding API: <https://open-meteo.com/en/docs/geocoding-api>
- Open-Meteo Forecast API: <https://open-meteo.com/en/docs>
- Especificação: [specs/weather-app-spec.md](/workspaces/sdd-weather-app-fgsl-11112026/specs/weather-app-spec.md)
- Plano: [plans/weather-app-plan.md](/workspaces/sdd-weather-app-fgsl-11112026/plans/weather-app-plan.md)
- Tarefas: [tasks/weather-app-tasks.md](/workspaces/sdd-weather-app-fgsl-11112026/tasks/weather-app-tasks.md)
