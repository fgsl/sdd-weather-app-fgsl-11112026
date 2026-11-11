# Backlog técnico — aplicativo de previsão do tempo

**Fontes:** [plano técnico](../plans/weather-app-plan.md) e [especificação](../specs/weather-app-spec.md). A base já contém componentes e serviços: cada tarefa deve inspecionar e adaptar o código existente, não recriá-lo. As tarefas são delegáveis separadamente; dependências indicam a ordem necessária para integração, não obrigam o mesmo responsável.

**Convenções:** todas as tarefas estão pendentes. Cada tarefa de código deve incluir ou atualizar testes focados para seu comportamento; as tarefas de teste ao final complementam a cobertura integrada. Em mudanças em `src/` ou `tests/`, executar `pnpm lint`, `pnpm build` e `pnpm test`; executar também `pnpm test:e2e` quando o fluxo E2E for afetado. Registrar falhas preexistentes ou impedimentos sem ocultá-los.

Cada tarefa explicita ID, título acionável, descrição curta, critérios de aceite verificáveis, dependências, arquivos prováveis e tipo (`UI`, `Data`, `Test` ou `Infra`). Arquivos prováveis orientam a delegação e podem ser ajustados após inspeção. `Infra` também classifica decisões e documentação que não se enquadram em UI, Data ou Test; isso não transfere decisões de produto ao agente de código.

## Entrega 1 — Decisões e contratos

### T-01
- **Título:** Definir período e conteúdo da previsão.
- [ ] **Descrição:** produto decide se os cinco dias incluem hoje, o fuso, as temperaturas diárias e os dados atuais e adicionais a exibir.
- **Critérios de aceite:** decisões aprovadas e registradas na spec, com exemplos de datas e campos; sem decisão, tarefas dependentes permanecem bloqueadas. Referências: RF-02 e RF-03.
- **Dependências:** nenhuma.
- **Arquivos prováveis:** `specs/weather-app-spec.md`.
- **Tipo:** Infra.

### T-02
- **Título:** Definir políticas de apresentação e operação.
- [ ] **Descrição:** produto, com apoio técnico, decide unidade inicial, dados parciais, metas de tempo e timeout, acessibilidade, idioma, navegadores e dispositivos; confirma persistência e cobertura geográfica.
- **Critérios de aceite:** decisões e metas mensuráveis registradas na spec; alterações de escopo aprovadas antes da implementação. Referências: RF-04, RF-05, RF-06 e requisitos não funcionais.
- **Dependências:** nenhuma.
- **Arquivos prováveis:** `specs/weather-app-spec.md`.
- **Tipo:** Infra.

### T-03
- **Título:** Confirmar uso da Open-Meteo.
- [ ] **Descrição:** verificar em fontes oficiais as condições de uso, limites e atribuição para a implantação pretendida.
- **Critérios de aceite:** conclusões, fontes e restrições registradas no plano; incompatibilidades sinalizadas antes da entrega.
- **Dependências:** nenhuma.
- **Arquivos prováveis:** `plans/weather-app-plan.md`.
- **Tipo:** Infra.

### T-04
- **Título:** Preservar dados opcionais ausentes.
- [ ] **Descrição:** ajustar contratos e consumidores de campos opcionais, incluindo probabilidade de precipitação, para distinguir ausência de zero.
- **Critérios de aceite:** tipo e apresentação não tratam ausência como `0`; zero real continua válido; compilação e teste focado confirmam ambos. Referência: RF-03.
- **Dependências:** nenhuma.
- **Arquivos prováveis:** `src/types/weather.ts`, `src/services/weatherService.ts`, `src/components/ForecastCard.tsx`, `tests/unit/weatherService.test.ts`.
- **Tipo:** Data.

## Entrega 2 — Dados e funções puras

### T-05
- **Título:** Validar respostas de geocoding.
- [ ] **Descrição:** validar a estrutura e os campos necessários do geocoding, preservando a codificação e o resultado vazio.
- **Critérios de aceite:** buscas com acentos são codificadas; ausência de resultados produz lista vazia; resposta inválida gera erro tratável, sem cidades malformadas. Testar com HTTP controlado. Referências: RF-01 e RF-05.
- **Dependências:** nenhuma.
- **Arquivos prováveis:** `src/services/weatherService.ts`, `tests/unit/weatherService.test.ts`.
- **Tipo:** Data.

### T-06
- **Título:** Validar clima atual e série diária.
- [ ] **Descrição:** validar campos aprovados e séries diárias antes do mapeamento, aplicando período e fuso de T-01.
- **Critérios de aceite:** resposta completa produz cinco dias corretos; campos inválidos ou ausentes e séries incompletas não produzem previsão apresentada como completa. Testar respostas válidas e parciais. Referências: RF-02, RF-03 e RF-05.
- **Dependências:** T-01, T-04.
- **Arquivos prováveis:** `src/services/weatherService.ts`, `tests/unit/weatherService.test.ts`.
- **Tipo:** Data.

### T-07
- **Título:** Normalizar falhas do serviço.
- [ ] **Descrição:** converter falhas de rede, HTTP, JSON inválido e timeout em erros de domínio compreensíveis, conforme a política aprovada.
- **Critérios de aceite:** cada falha gera erro tratável; timeout ativo é distinguível de cancelamento por consulta substituta; testes controlam rede e temporização. Referência: RF-05.
- **Dependências:** T-02.
- **Arquivos prováveis:** `src/services/weatherService.ts`, `tests/unit/weatherService.test.ts`.
- **Tipo:** Data.

### T-08
- **Título:** Garantir datas civis sem deslocamento.
- [ ] **Descrição:** adaptar a formatação das datas diárias à data civil e ao fuso acordados, sem interpretá-las como instante UTC do dispositivo.
- **Critérios de aceite:** a data mantém o dia esperado em fusos de dispositivo diferentes; testes cobrem mudança de dia e de mês. Referência: RF-03.
- **Dependências:** T-01.
- **Arquivos prováveis:** `src/lib/format.ts`, `tests/unit/format.test.ts`.
- **Tipo:** Data.

### T-09
- **Título:** Verificar conversão de temperatura.
- [ ] **Descrição:** revisar conversão e arredondamento existentes, mantendo Celsius como representação interna.
- **Critérios de aceite:** testes cobrem conversão nos dois sentidos, valores negativos e arredondamento; nenhuma chamada de rede é necessária. Referência: RF-04.
- **Dependências:** nenhuma.
- **Arquivos prováveis:** `src/lib/temperature.ts`, `tests/unit/temperature.test.ts`.
- **Tipo:** Data.

## Entrega 3 — Orquestração

### T-10
- **Título:** Separar busca e seleção de cidade.
- [ ] **Descrição:** no hook, retornar resultados e aguardar seleção explícita antes de solicitar clima; representar estados de busca e consulta.
- **Critérios de aceite:** busca não consulta automaticamente o primeiro resultado; seleção consulta suas coordenadas; resultado vazio permanece identificável. Testar com serviço simulado. Referências: RF-01 e RF-05.
- **Dependências:** T-05.
- **Arquivos prováveis:** `src/hooks/useWeather.ts`, `tests/unit/useWeather.test.ts` (novo, se necessário).
- **Tipo:** Data.

### T-11
- **Título:** Descartar respostas obsoletas.
- [ ] **Descrição:** invalidar resultados e erros de buscas ou seleções anteriores por cancelamento e/ou identificador de requisição.
- **Critérios de aceite:** com operações resolvidas em ordem inversa, apenas a mais recente altera a tela; erro obsoleto não substitui sucesso atual. Testar buscas e seleções concorrentes. Referências: RF-01 e RF-05.
- **Dependências:** T-10.
- **Arquivos prováveis:** `src/hooks/useWeather.ts`, `tests/unit/useWeather.test.ts` (novo, se necessário).
- **Tipo:** Data.

### T-12
- **Título:** Repetir a operação que falhou.
- [ ] **Descrição:** guardar tipo e parâmetros da operação que falhou, sem associar dados da cidade anterior à nova consulta.
- **Critérios de aceite:** retry de busca repete o nome buscado mesmo após seleção anterior; retry de clima repete a cidade selecionada; dados antigos não aparecem como novos. Testar ambos. Referência: RF-05.
- **Dependências:** T-10.
- **Arquivos prováveis:** `src/hooks/useWeather.ts`, `tests/unit/useWeather.test.ts` (novo, se necessário).
- **Tipo:** Data.

## Entrega 4 — Interface e acessibilidade

### T-13
- **Título:** Validar entrada de busca.
- [ ] **Descrição:** rejeitar entrada vazia ou composta por espaços e solicitar um nome de cidade.
- **Critérios de aceite:** nenhuma consulta é disparada para entrada vazia; a mensagem é perceptível e a pessoa pode corrigir o texto; teste de componente cobre ambos. Referências: RF-01 e RF-05.
- **Dependências:** nenhuma.
- **Arquivos prováveis:** `src/components/SearchBar.tsx`, `tests/unit/SearchBar.test.tsx`.
- **Tipo:** UI.

### T-14
- **Título:** Apresentar e selecionar resultados.
- [ ] **Descrição:** integrar lista de resultados com nome, região e país disponíveis à seleção do hook.
- **Critérios de aceite:** homônimos disponíveis são distinguíveis; escolha funciona por teclado e toque e só a cidade escolhida inicia consulta; teste de componente cobre seleção. Referências: RF-01 e RF-06.
- **Dependências:** T-10.
- **Arquivos prováveis:** `src/App.tsx`, `src/components/` (lista de seleção, se necessária), `tests/unit/App.test.tsx`.
- **Tipo:** UI.

### T-15
- **Título:** Apresentar clima e previsão aprovados.
- [ ] **Descrição:** integrar campos aprovados de clima atual e cinco dias aos componentes existentes, identificando cidade e datas.
- **Critérios de aceite:** dados completos exibem cidade correta, condição e temperatura atual e cinco dias aprovados; previsão incompleta não é identificada como completa. Testar com dados controlados. Referências: RF-02 e RF-03.
- **Dependências:** T-01, T-06, T-08, T-14.
- **Arquivos prováveis:** `src/components/CurrentWeather.tsx`, `src/components/ForecastList.tsx`, `src/components/ForecastCard.tsx`, `tests/unit/App.test.tsx`.
- **Tipo:** UI.

### T-16
- **Título:** Aplicar unidade em toda a tela.
- [ ] **Descrição:** aplicar a unidade inicial aprovada e a unidade escolhida a todas as temperaturas, mantendo-a entre cidades na sessão.
- **Critérios de aceite:** alternância atualiza temperaturas e símbolos sem nova consulta; mudança durante carregamento e troca de cidade mantêm a unidade selecionada. Testar integração. Referência: RF-04.
- **Dependências:** T-02, T-09, T-15.
- **Arquivos prováveis:** `src/App.tsx`, `src/components/UnitToggle.tsx`, `src/components/CurrentWeather.tsx`, `src/components/ForecastCard.tsx`, `tests/unit/App.test.tsx`.
- **Tipo:** UI.

### T-17
- **Título:** Apresentar estados e nova tentativa.
- [ ] **Descrição:** integrar carregamento, vazio, erro e política aprovada para resposta parcial aos componentes existentes.
- **Critérios de aceite:** cada estado é identificável; erro oferece retry funcional; dados faltantes seguem a política aprovada, sem apresentar previsão parcial como completa. Testar cada estado. Referência: RF-05.
- **Dependências:** T-02, T-07, T-12, T-14.
- **Arquivos prováveis:** `src/App.tsx`, `src/components/states/`, `tests/unit/App.test.tsx`.
- **Tipo:** UI.

### T-18
- **Título:** Verificar acessibilidade e layout móvel.
- [ ] **Descrição:** ajustar rótulos, foco, anúncios de estado e layout nos tamanhos e navegadores acordados.
- **Critérios de aceite:** jornada completa é operável por teclado e toque; estados são anunciáveis; viewports acordados não apresentam sobreposição nem rolagem horizontal. Registrar verificações e limites de conformidade. Referência: RF-06.
- **Dependências:** T-02, T-14, T-16, T-17.
- **Arquivos prováveis:** `src/App.tsx`, `src/components/`, `src/styles/index.css`, `tests/unit/App.test.tsx`.
- **Tipo:** UI.

## Entrega 5 — Verificação integrada

### T-19
- **Título:** Ampliar testes unitários de serviço.
- [ ] **Descrição:** complementar testes de serviço com rede simulada para geocoding, HTTP, timeout, JSON inválido e dados incompletos.
- **Critérios de aceite:** testes cobrem sucesso, ausência, falhas e séries parciais sem rede real; `pnpm test` passa. Referências: RF-01, RF-02, RF-03 e RF-05.
- **Dependências:** T-05, T-06, T-07.
- **Arquivos prováveis:** `tests/unit/weatherService.test.ts`.
- **Tipo:** Test.

### T-20
- **Título:** Ampliar testes de estado e componentes.
- [ ] **Descrição:** complementar testes de concorrência, retry, entrada vazia e unidade durante carregamento e troca de cidade.
- **Critérios de aceite:** testes demonstram descarte de resposta obsoleta, retry correto e persistência da unidade sem consulta adicional; `pnpm test` passa. Referências: RF-01, RF-04 e RF-05.
- **Dependências:** T-11, T-12, T-13, T-16, T-17.
- **Arquivos prováveis:** `tests/unit/App.test.tsx`, `tests/unit/SearchBar.test.tsx`, `tests/unit/useWeather.test.ts` (novo, se necessário).
- **Tipo:** Test.

### T-21
- **Título:** Testar jornada E2E e dispositivo móvel.
- [ ] **Descrição:** adaptar o teste Playwright com APIs interceptadas para homônimos, seleção, clima, cinco dias, unidade, erro e retry.
- **Critérios de aceite:** jornada passa em desktop e viewport móvel acordado, sem rede externa, sobreposição ou rolagem horizontal; `pnpm test:e2e` passa. Referências: RF-01 a RF-06.
- **Dependências:** T-15, T-16, T-17, T-18.
- **Arquivos prováveis:** `tests/e2e/weather.spec.ts`, `playwright.config.ts`.
- **Tipo:** Test.

### T-22
- **Título:** Validar entrega.
- [ ] **Descrição:** conferir critérios aprovados, executar comandos obrigatórios e registrar evidências e limitações.
- **Critérios de aceite:** `pnpm lint`, `pnpm build`, `pnpm test` e `pnpm test:e2e` passam; critérios da spec são rastreados aos resultados ou bloqueios registrados sem declarar conclusão. Referências: RF-01 a RF-06 e requisitos não funcionais.
- **Dependências:** T-03, T-18, T-19, T-20, T-21.
- **Arquivos prováveis:** `tasks/weather-app-tasks.md`, `specs/weather-app-spec.md` (para conferência).
- **Tipo:** Test.

## Rastreabilidade

| Requisito | Tarefas |
| --- | --- |
| RF-01 — Busca | T-05, T-10, T-11, T-13, T-14, T-19, T-20, T-21 |
| RF-02 — Clima atual | T-01, T-06, T-15, T-19, T-21 |
| RF-03 — Previsão de cinco dias | T-01, T-04, T-06, T-08, T-15, T-19, T-21 |
| RF-04 — Unidades | T-02, T-09, T-16, T-20, T-21 |
| RF-05 — Estados da consulta | T-02, T-05, T-07, T-10, T-11, T-12, T-13, T-17, T-19, T-20, T-21 |
| RF-06 — Uso móvel | T-02, T-14, T-18, T-21 |

As tarefas T-01 e T-02 exigem decisão de produto; agentes de código não devem preencher essas decisões por conta própria. Tarefas sem dependência dessas decisões podem avançar em paralelo, respeitando a ordem indicada.