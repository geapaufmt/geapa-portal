# Latencia das decisoes canonicas de Apresentacoes em DEV

## Escopo

Este diagnostico cobre somente o Portal DEV/HOMOLOG. PROD continua sem a
telemetria detalhada e sem alteracao de comportamento.

## Cadeia auditada

1. `enviarRevisaoTitulo()` e `executarPostApresentacao()` em
   `web/assets/js/portal-v2-readonly.js` recebem a acao administrativa.
2. `PortalGeapaApi.apiPost()` e `chamarAppsScriptAction()` em
   `web/assets/js/api.js` fazem um unico `fetch` para o Web App do Portal.
3. `doPost()` e `portalExecutarAcao_()` em `apps-script/03_webapp.gs`
   despacham a action.
4. `portalMontarContextoViewsV2_()` valida token, sessao Core e permissao.
5. `portalExecutarAcaoApresentacaoAtividadesV2_()` chama a biblioteca
   GEAPA_ATIVIDADES.
6. `atividadesV2_portalRunPresentationAction_()` aplica lock, idempotencia e
   auditoria `Portal_Acoes`.
7. O writer canonico le o par, revalida as preconditions e confirma o commit
   atomico em `presentations`, `presentationPrivate` e
   `presentationDecisionRequests`.
8. `atividadesV2_presentationsOperationalPostCanonicalWriteDev_()` conclui a
   projecao critica Firestore -> `Atividades_Apresentacoes` e invalida cache.
9. O Portal normaliza o envelope e entrega a resposta HTTP.
10. O frontend encerra o indicador de processamento assim que recebe a
    resposta. A releitura da tela ocorre uma vez, em segundo plano, e nao
    bloqueia a confirmacao da mutation.

Nao existem polling, retry ou backoff no frontend desse fluxo.

## Causa encontrada

A medicao anterior de GEAPA_ATIVIDADES terminava antes da projecao, cache e
retorno ao Portal. Portanto os cerca de 8 segundos reportados nao eram o tempo
ate a resposta HTTP.

Depois do commit, a projecao relia os dois documentos que o commit acabara de
confirmar e executava ate seis chamadas individuais de escrita em Sheets. Em
seguida, a primeira recomposicao da Gestao, com cache invalidado, lia a view
legada e fazia duas leituras completas do Firestore. A leitura de
`presentationPrivate` nao alimentava nenhum campo daquela tela.

`CANONICAL_POST_WRITE_BLOCKED` e apenas o status de auditoria que impede o job
legado de assumir autoridade. Nao existe espera, polling ou retry associado a
esse status.

## Correcao

- O par de documentos futuros, ja confirmado pelo commit transacional, e
  transportado internamente e de forma nao enumeravel para a projecao.
- A projecao valida schema e `sourceHash`, mas nao repete as duas leituras REST.
- Campos contiguos da projecao sao persistidos em blocos com `setValues`.
- A Gestao consulta somente `presentations`; `presentationPrivate` permanece
  backend-only e e exigido nos writers e validacoes transacionais.
- O refresh continua unico e assincrono em relacao ao sucesso da mutation.

Nenhum guard, precondition, hash, idempotencia, projecao ou invalidacao de
cache foi removido.

## Timeouts encontrados

- mutation normal do Portal: 30.000 ms;
- leitura do Portal: 35.000 ms;
- upload: 90.000 ms;
- lock de actions/projecao/transacao: ate 30.000 ms;
- smoke do endpoint DEV: 15.000 ms.

O timeout de escrita nao foi aumentado. A prioridade e reduzir o caminho
critico e medir a resposta real.

## Telemetria DEV

O mesmo `requestId` correlaciona:

- frontend: F0 a F8;
- backend Portal/Atividades: B0 a B11.

Os registros contem somente codigo da etapa, timestamp, duracao, action e
`requestId`. Titulo, eixo, e-mail, RGA, justificativas e observacoes privadas
nao sao registrados.

Para decisoes canonicas DEV, P0 a P6 tambem sao transportados ao modulo
Atividades como uma seed estritamente sanitizada. Atividades agrega P7 a P15,
incorpora P16 a P20 devolvidos pelo Core e persiste snapshots na collection
tecnica `presentationDecisionTraces`. A collection e indexada pelo hash do
requestId, nao e fonte de verdade e nao existe no fluxo PROD.

Esse transporte torna o trace recuperavel mesmo quando o Web App usa projeto
GCP padrao, o Cloud Logging da execucao nao esta disponivel ou o navegador
abandona a resposta por timeout. A falha do trace nao altera o resultado da
decisao.

No navegador, as amostras ficam temporariamente em
`window.__PortalGeapaDevPresentationTimings` e tambem aparecem no console com
o prefixo `GEAPA-PRESENTATIONS-DEV-TIMING`.

## Fast path DEV antes de P7

A medicao correlacionada de 31/08/2026 mostrou 28.659 ms entre F1 e P7. No
codigo do Portal existe apenas uma dependencia remota nesse intervalo: a
revalidacao da sessao no Core quando o snapshot curto associado ao token nao
esta mais no `CacheService`. O snapshot tinha TTL de 180 segundos e nao era
renovado quando a Gestao de Apresentacoes o utilizava; uma decisao iniciada
depois desse intervalo voltava ao resolvedor completo do Core.

Classificacao do caminho:

| etapa | classe | decisao |
| --- | --- | --- |
| parse do POST, requestId e trace P0/P1 | A | preservar antes da action |
| existencia do token temporario | A | preservar |
| snapshot Core por token | A | usar primeiro |
| revalidacao autoritativa no Core em cache miss | A | preservar fail-closed |
| identidade, portal ativo e permissao | A | preservar |
| parse e campos minimos do payload | A | preservar |
| contexto minimo, correlationId e seed P0-P6 | A | preservar |
| normalizacao da resposta e invalidacao de cache funcional | B | continuam depois de Atividades |
| renovacao do snapshot Core usado pela Gestao | B | executada depois da chamada a Atividades |
| segunda leitura da mesma chave de sessao | C | removida somente no fast path DEV |
| lookup de membro legado depois de uma sessao Core valida | C | removido somente no fast path DEV |

`apresentacoesPendenciasDiretoria` renova o mesmo snapshot curto depois de
concluir sua leitura. As actions de decisao consomem esse snapshot, validam as
mesmas permissoes e entram imediatamente em Atividades. O TTL, o resolvedor
autoritativo, as regras, os writers e PROD nao foram alterados.
