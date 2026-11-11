# Especificação do aplicativo de previsão do tempo

## Overview

- **Objetivo:** permitir que uma pessoa consulte o clima atual e a previsão de cinco dias para uma cidade, inclusive em dispositivos móveis.
- **Público:** pessoas que precisam consultar o tempo para planejar suas atividades.
- **Fontes:** briefing de negócio e análise em `specs/discovery.md`.

## Functional Requirements

- **RF-01 — Busca:** permitir buscar uma cidade pelo nome e identificar a localidade desejada quando houver nomes semelhantes.
- **RF-02 — Clima atual:** apresentar as condições atuais e a temperatura da cidade selecionada, identificando a localidade consultada.
- **RF-03 — Previsão:** apresentar a previsão diária para cinco dias da cidade selecionada, incluindo condições e temperaturas de cada dia.
- **RF-04 — Unidades:** permitir alternar entre Celsius e Fahrenheit em todas as temperaturas exibidas.
- **RF-05 — Estados da consulta:** informar carregamento, ausência de resultados e falhas, oferecendo nova tentativa quando apropriado.
- **RF-06 — Uso móvel:** permitir buscar, consultar e alternar unidades em dispositivos móveis.

## User Stories

- **US-01:** Como pessoa que consulta o tempo, quero buscar uma cidade para encontrar a localidade de meu interesse. (RF-01)
- **US-02:** Como pessoa que planeja sair, quero ver o clima atual para decidir como me preparar. (RF-02)
- **US-03:** Como pessoa que planeja a semana, quero ver a previsão de cinco dias para organizar minhas atividades. (RF-03)
- **US-04:** Como pessoa habituada a uma unidade de temperatura, quero alternar entre Celsius e Fahrenheit para interpretar os dados facilmente. (RF-04)
- **US-05:** Como pessoa que consulta o tempo, quero entender quando uma consulta está carregando, não encontra resultados ou falha para saber como continuar. (RF-05)
- **US-06:** Como pessoa que usa um celular, quero realizar as consultas no dispositivo móvel para acessar a previsão em qualquer lugar. (RF-06)

## Acceptance Criteria

- **US-01 / RF-01**
  - Dado um nome de cidade válido, quando a pessoa o pesquisar, então deve poder identificar e selecionar a localidade correspondente.
  - Dado que existam localidades com nomes semelhantes, quando os resultados forem apresentados, então devem conter informações suficientes para distingui-las.
- **US-02 / RF-02**
  - Dada uma cidade selecionada com dados atuais disponíveis, quando a consulta terminar, então devem ser exibidos sua identificação, a condição atual e a temperatura.
- **US-03 / RF-03**
  - Dada uma cidade selecionada com previsão disponível, quando a consulta terminar, então devem ser exibidos cinco dias identificáveis, cada um com condições e temperaturas.
- **US-04 / RF-04**
  - Dadas temperaturas em Celsius ou Fahrenheit, quando a pessoa selecionar a outra unidade, então todas as temperaturas atuais e previstas exibidas devem passar à unidade selecionada e identificá-la.
  - Dada uma unidade selecionada, quando a pessoa consultar outra cidade durante a mesma sessão, então as temperaturas devem continuar na unidade selecionada.
- **US-05 / RF-05**
  - Dada uma consulta em andamento, quando a pessoa aguardar o resultado, então deve receber uma indicação de carregamento.
  - Dada uma busca sem correspondências, quando a consulta terminar, então deve ser informada de que não há resultados e poder fazer outra busca.
  - Dada uma falha ou expiração da consulta, quando o resultado não estiver disponível, então deve receber uma mensagem compreensível e poder tentar novamente.
- **US-06 / RF-06**
  - Dado um dispositivo móvel, quando a pessoa buscar e selecionar uma cidade, consultar seus dados e alternar a unidade, então deve conseguir completar essas ações sem rolagem horizontal ou conteúdo sobreposto.

## Non-Functional Requirements

- **Responsividade:** conteúdo e controles devem se adaptar a telas móveis e maiores, preservando leitura e uso sem rolagem horizontal.
- **Acessibilidade:** controles devem ter nomes acessíveis, ser operáveis por teclado e apresentar foco visível; mensagens de estado devem ser perceptíveis a tecnologias assistivas. O nível formal de conformidade está em aberto.
- **Performance:** a interface deve indicar que a consulta está em andamento enquanto aguarda dados; metas quantitativas de tempo e condições de medição estão em aberto.
- **Confiabilidade:** falhas ou dados incompletos não devem ser apresentados como uma previsão completa e atualizada; a pessoa deve ser informada quando dados estiverem indisponíveis.
- **Clareza:** cidade, datas, condições e unidades devem ser identificáveis para evitar interpretação equivocada.

## Edge Cases

- **Busca vazia ou apenas espaços:** não iniciar uma consulta; solicitar o nome de uma cidade.
- **Cidade inexistente ou sem correspondências:** informar que não foram encontrados resultados e permitir nova busca.
- **Caracteres especiais ou acentos:** permitir nomes que os contenham; caso não haja correspondência, apresentar o estado de ausência de resultados.
- **Cidades homônimas:** apresentar informações de localização que permitam distinguir as opções antes da seleção.
- **Falha do serviço ou perda de conexão:** informar a indisponibilidade e permitir nova tentativa, sem apresentar dados antigos como resultado da nova consulta.
- **Tempo de espera esgotado:** informar que a consulta não foi concluída e permitir nova tentativa.
- **Resposta parcial:** identificar quais dados estão indisponíveis; não apresentar menos de cinco dias como uma previsão completa.
- **Consultas consecutivas:** se uma resposta anterior chegar depois de uma consulta mais recente, não substituir os dados da cidade mais recentemente selecionada.
- **Troca de unidade durante uma consulta:** exibir o resultado na unidade selecionada quando os dados forem apresentados.

## Assumptions

- A consulta depende de conexão com a internet e da disponibilidade de dados meteorológicos para a localidade escolhida.
- A pessoa seleciona uma cidade antes de consultar seus dados; não se presume uma cidade inicial.
- A unidade selecionada permanece válida durante a sessão; persistência entre visitas não está definida.
- Os requisitos não especificam quais temperaturas diárias ou informações adicionais devem ser exibidas.

## Risks

- **Indisponibilidade ou lentidão dos dados:** pode impedir consultas; mitigar com estados claros e opção de nova tentativa.
- **Dados incompletos ou imprecisos:** podem comprometer decisões; indicar indisponibilidade e não sugerir precisão ou completude inexistentes.
- **Localidades ambíguas:** podem levar à consulta da cidade errada; distinguir os resultados por informações de localização.
- **Diferenças de fuso horário e datas:** podem causar interpretação incorreta da previsão; definir a referência de datas antes da implementação.
- **Metas não definidas de performance e acessibilidade:** dificultam a validação; acordar métricas e nível de conformidade com as partes interessadas.

## Out of Scope

- Conta de usuário, autenticação e sincronização entre dispositivos.
- Alertas meteorológicos, notificações e recomendações personalizadas.
- Histórico climático e previsões além dos cinco dias solicitados.
- Consulta por localização automática, mapa ou coordenadas; inclusão depende de decisão de produto.
- Funcionamento offline e persistência de preferências entre visitas.

## Open Questions

- Quais informações compõem o clima atual, além de condição e temperatura? Há necessidade de umidade, vento ou horário de atualização?
- A previsão de cinco dias inclui o dia atual ou começa no dia seguinte? Qual fuso horário define as datas?
- Quais temperaturas diárias devem aparecer: mínima, máxima, ambas ou outra medida?
- Qual unidade deve ser selecionada inicialmente? A preferência precisa persistir entre visitas?
- Qual nível de acessibilidade deve ser atendido e quais dispositivos e navegadores devem ser oficialmente suportados?
- Quais são as metas de tempo de resposta, disponibilidade e limite de espera, e em quais condições serão medidas?
- Em caso de dados parciais, quais informações disponíveis devem continuar visíveis e como devem ser identificadas?
- Há requisitos de idioma, formato de data ou cobertura geográfica além dos explícitos no briefing?

**Prontidão:** a especificação cobre o escopo conhecido, mas as perguntas em aberto precisam ser respondidas para concluir os critérios de produto e validação.