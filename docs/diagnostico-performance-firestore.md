# Diagnostico de performance e prontidao para Firestore

Data do checkup: 2026-06-30.

Repositorios analisados:

- `geapa-portal`;
- `geapa-atividades`;
- `geapa-core`.

## 1. Resumo executivo

O Portal ja possui uma base adequada para evoluir para Firestore como cache/read
model. A lista de atividades e os detalhes usam views `PORTAL_*`, o bundle e
leve por padrao, os detalhes sao carregados sob demanda e existem caches no
navegador, no Apps Script do Portal e no modulo Atividades.

Firestore nao deve ser implementado antes dos ajustes abaixo:

1. Tornar seletiva a atualizacao das views. Hoje varias escritas simples chamam
   `atividadesV2_atualizarViewsPortal_`, que rematerializa seis views em serie.
2. Reduzir leituras integrais nas rotas privadas. Minha frequencia, Minhas
   apresentacoes e Minhas justificativas ainda cruzam abas operacionais inteiras
   antes de filtrar o usuario.
3. Formalizar a invalidacao entre as tres camadas de cache. Uma escrita pode
   limpar o cache do modulo e do Portal Apps Script, mas deixar outra sessao ou
   um `sessionStorage` com dados antigos.
4. Definir versao, data da fonte e expiracao em todos os read models.
5. Definir regras Firestore para dados privados. As regras atuais cobrem apenas
   a leitura do proprio documento em `portalUsers/{uid}`.

O maior gargalo de escrita nao e a gravacao da linha operacional. E o
pos-processamento sincrono que reabre fontes, recalcula pendencias globais e
substitui todas as views antes de responder.

Prioridades:

| Prioridade | Ajuste | Motivo |
| --- | --- | --- |
| P0 | Atualizacao seletiva/adiada de views | Reduz o maior custo sincrono das escritas |
| P0 | Instrumentar escritas e rematerializacao por etapa | Permite medir antes de migrar |
| P1 | Read models privados por `ID_PESSOA` | Evita varreduras integrais nas telas Meu vinculo |
| P1 | Contrato unico de versao e stale/fallback | Evita Firestore servir payload incompativel |
| P1 | Matriz central de invalidacao | Reduz dados antigos entre as tres camadas de cache |
| P2 | Read models administrativos segmentados | Evita listas globais e payloads excessivos |
| P2 | Fila de pos-processamento | Retira views, cache e notificacoes do tempo de resposta |

Este checkup nao implementa Firestore, nao altera regras de negocio e nao
remove views nem fallbacks existentes.

## 2. Arquitetura observada

Fluxo atual:

1. O navegador chama apenas o Apps Script do Portal.
2. O Portal valida a sessao e monta o contexto autorizado pelo Core.
3. O Portal chama funcoes publicas de `GEAPA_ATIVIDADES`.
4. O modulo Atividades le views ou abas operacionais da base V2.
5. Escritas criticas usam `LockService`, atualizam a fonte oficial e registram
   auditoria.
6. Views `PORTAL_*` continuam sendo materializacoes reconstruiveis.

Fronteiras que devem ser preservadas:

- Planilhas V2 e Apps Script sao a fonte oficial.
- Firestore sera cache/read model e, futuramente, fila de operacoes.
- O navegador nao acessa Sheets ou Drive diretamente.
- Autorizacao continua no Core e no Apps Script.
- `PORTAL_APRESENTACOES` nao e contrato ativo e nao deve voltar como
  dependencia.

## 3. Mapa de leituras e endpoints

As funcoes de backend abaixo sao as funcoes publicas chamadas pelo Portal ou os
wrappers equivalentes existentes no modulo Atividades.

| Tela/fluxo | Front-end e chamada | Rota / entrada Apps Script | Backend e fonte principal | Cache e observacao | Classificacao |
| --- | --- | --- | --- | --- | --- |
| Proximas atividades, Calendario e Historico | `web/assets/js/atividades.js`: `carregarAtividades` / `carregarBundleAtividades` | `GET /atividades/listar` -> `portalListarAtividades`; fallback `GET /atividades/bundle` -> `portalAtividadesBundle` | `atividadesV2_portalGetCalendario` / bundle leve; `PORTAL_ATIVIDADES_CALENDARIO`, fallback `Atividades` | Memoria + `sessionStorage` 5 min, cache Portal e cache Atividades. Uma chamada inicial e preloads ociosos | `OK_PARA_FIRESTORE` |
| Detalhe de atividade | `buscarDetalheAtividade` | `GET /atividades/detalhe` -> `portalDetalheAtividade` | `atividades_buscarDetalheParaPortal` / `atividadesV2_portalGetDetalhesAtividade`; `PORTAL_ATIVIDADES_DETALHES`, fallback operacional | Cache por atividade e contexto; requisicoes em voo sao deduplicadas | `OK_PARA_FIRESTORE` |
| Preload de detalhes | `iniciarPreloadDetalhesAtividades` | `GET /atividades/detalhes-preload` -> `portalPrecarregarDetalhesAtividades` | Detalhes materializados, somente apos a primeira renderizacao | Concorrencia 2, intervalo de 350 ms, pausa durante chamada | `PRECISA_AJUSTE_LEVE` |
| Minha frequencia | `web/assets/js/portal-v2-readonly.js` | `GET /v2/minha-frequencia` -> `portalMinhaFrequenciaV2` | `atividadesV2_portalGetMinhaFrequencia`; le `Atividades`, `Atividades_Presencas_Registros` e `Atividades_Justificativas`, depois filtra o membro | Cache privado curto. O contrato detalhado nao usa apenas `PORTAL_FREQUENCIA_MEMBROS` | `PRECISA_AJUSTE_ANTES_FIRESTORE` |
| Minhas apresentacoes | `portal-v2-readonly.js` | `GET /v2/minhas-apresentacoes` -> `portalMinhasApresentacoesV2` | `atividadesV2_portalGetMinhasApresentacoes`; cruza `Atividades`, `Atividades_Apresentacoes`, `Atividades_Arquivos` e config | Cache privado curto; filtro por pessoa ocorre no backend | `PRECISA_AJUSTE_ANTES_FIRESTORE` |
| Pendencias de apresentacoes | `portal-v2-readonly.js` | `GET /v2/apresentacoes/pendencias` -> `portalApresentacoesPendenciasDiretoriaV2` | `atividadesV2_portalListarPendenciasApresentacoesDiretoria`; filtra e agrupa `PORTAL_PENDENCIAS_DIRETORIA` por apresentacao | Cache de gestao 90 s; um card por apresentacao | `PRECISA_AJUSTE_LEVE` |
| Minhas justificativas | `portal-v2-readonly.js` | `GET /v2/minhas-justificativas` -> `portalMinhasJustificativasV2` | `atividadesV2_portalGetMinhasJustificativas`; justificativas, presencas e atividades operacionais | Cache privado curto; leitura precisa ser materializada por pessoa | `PRECISA_AJUSTE_ANTES_FIRESTORE` |
| Configuracao de justificativas | `portal-v2-readonly.js` e `atividades.js` | `GET /v2/justificativas/config` -> `portalJustificativasConfigV2` | `atividadesV2_portalGetJustificativasConfig` | Cache front-end 20 min; payload pequeno | `OK_PARA_FIRESTORE` |
| Justificativas para analise | `portal-v2-readonly.js` | `GET /v2/justificativas/pendencias` -> `portalJustificativasPendenciasDiretoriaV2` | `atividadesV2_portalListarJustificativasPendentesDiretoria`; filtra `Atividades_Justificativas` | Leitura global operacional; deve virar read model de gestao | `PRECISA_AJUSTE_ANTES_FIRESTORE` |
| Pendencias da Diretoria | `portal-v2-readonly.js` | `GET /v2/pendencias-diretoria` -> `portalPendenciasDiretoriaV2` | `atividadesV2_portalGetPendenciasDiretoria`; `PORTAL_PENDENCIAS_DIRETORIA` | Cache curto de gestao | `OK_PARA_FIRESTORE` |
| Painel da Diretoria | `web/assets/js/painel-diretoria-v2.js`: `carregarPainel` | `GET /v2/painel-diretoria` -> `portalApiGetPainelDiretoriaV2` | Agrega pendencias e status vindos do Atividades | Uma chamada HTTP, duas fontes internas, cache agregado no Portal | `PRECISA_AJUSTE_LEVE` |
| Status das views | `portal-v2-readonly.js` | `GET /v2/status-views` -> `portalStatusViewsV2` | `atividadesV2_portalGetStatusViews`; `PORTAL_STATUS_ATIVIDADES` | Payload pequeno e materializado | `OK_PARA_FIRESTORE` |
| Gestao de atividades - lista | `web/assets/js/admin-atividades.js`: `loadActivities` | `GET /admin/atividades` -> `portalListarAtividadesAdmin` | `atividadesV2_portalAdminListarAtividades`; cruza atividades, apresentacoes, arquivos e config | Front-end recarrega ao abrir e depois de escritas; sem TTL persistente | `PRECISA_AJUSTE_ANTES_FIRESTORE` |
| Gestao de atividades - detalhe | `admin-atividades.js`: `openDetail` | `GET /admin/atividades/detalhe` -> `portalDetalheAtividadeAdmin` | Detalhe operacional, envolvidos, apresentacoes, arquivos e acoes recentes | Cache apenas em memoria da pagina | `PRECISA_AJUSTE_LEVE` |
| Chamada operacional | `atividades.js`: `abrirChamadaAtividade` | `GET /atividades/chamada` -> `portalBuscarChamadaAtividade` | `atividadesV2_portalGetChamada`; atividade, membros Core, rascunho/presencas e status | Caches curtos e diagnostico de etapas. Exige consistencia e autorizacao fortes | `RISCO_ALTO` para leitura direta no Firestore |

### Chamadas redundantes e volume

- A lista inicial esta correta: usa calendario leve, nao detalhes completos.
- O preload e oportunista e controlado, mas deve ser desativado quando Firestore
  entregar detalhes suficientemente rapidos ou quando o navegador estiver em
  conexao limitada.
- O painel da Diretoria faz uma chamada do navegador, mas o Apps Script agrega
  duas consultas internas. Um documento agregado eliminaria essa duplicacao.
- Telas privadas ainda pagam o custo de abrir e percorrer fontes operacionais
  completas em cache miss.
- A gestao administrativa filtra em memoria e pode crescer de forma nao linear
  conforme atividades, apresentacoes e arquivos aumentarem.
- Nao foi encontrada dependencia de Gmail em tempo real nas leituras do Portal.
  Links do Drive sao apenas retornados pelo backend.

## 4. Mapa de escritas

As estimativas abaixo sao qualitativas. O repositorio ja possui marcadores de
performance, mas ainda nao ha uma serie historica por rota que permita publicar
percentis confiaveis.

| Acao | Rota / backend | Escritas e etapas | Gargalo provavel | Classificacao e recomendacao |
| --- | --- | --- | --- | --- |
| Enviar/editar titulo e eixos | `/v2/apresentacoes/titulo-eixo/enviar`; `atividadesV2_portalEnviarTituloEixoApresentacao` | Lock, le bundle, atualiza Atividades/Apresentacoes, auditoria, recalcula views e caches | Rematerializacao global apos escrita pequena | `ESCRITA_COM_MATERIALIZACAO_PESADA`; candidata a fila para pos-processamento |
| Aprovar/solicitar ajuste/reprovar titulo e eixos | Rotas de revisao/reprovacao; funcoes de revisao | Lock, atualiza status e observacoes, logs, refresh global | Pendencias e todas as views sao recalculadas | `CANDIDATA_A_FILA_FIRESTORE` apos a decisao canonica |
| Enviar/reenviar slide | `/v2/apresentacoes/material/registrar`; `atividadesV2_portalRegistrarMaterialApresentacao` | Upload/copia no Drive, atualiza Apresentacoes/Arquivos, auditoria, refresh global | Drive + rematerializacao no mesmo request | `CANDIDATA_A_PROCESSAMENTO_ASSINCRONO`; upload permanece sincrono, pos-processamento nao |
| Revisar/dispensar slide | `/v2/apresentacoes/material/revisar` | Lock, status, logs, refresh global | Atualizacao global desproporcional | `CANDIDATA_A_FILA_FIRESTORE` para pos-processamento |
| Enviar/reenviar foto | `/v2/apresentacoes/foto/registrar`; `atividadesV2_portalRegistrarFotoReuniao` | Drive, `Atividades_Arquivos`, auditoria, refresh global | Upload e materializacao acoplados | `CANDIDATA_A_PROCESSAMENTO_ASSINCRONO`, em modelo hibrido |
| Revisar/dispensar foto | `/v2/apresentacoes/foto/revisar` | Lock, status do arquivo, logs e refresh | Recalculo global | `CANDIDATA_A_FILA_FIRESTORE` para pos-processamento |
| Enviar justificativa | `/v2/justificativas/enviar`; `atividadesV2_portalEnviarJustificativa` | Valida prazo/propriedade, upload opcional, grava Justificativas e eventualmente Presencas, logs, views | Upload opcional e refresh global | `PRECISA_OTIMIZACAO_ANTES_FIRESTORE`; gravacao canonica sincrona, views/mail assincronos |
| Analisar justificativa | `/v2/justificativas/analisar`; `atividadesV2_portalAnalisarJustificativa` | Lock, decisao, atualiza Justificativas/Presencas, logs, views | Decisao e rematerializacao acopladas | `ESCRITA_COM_MATERIALIZACAO_PESADA`; decisao fica sincrona por enquanto |
| Criar atividade | `/atividades/modelo/criar` ou `/atividades/criar`; criacao V2 | Dry-run, confirmacao, lock, append em Atividades e relacionamentos, auditoria, refresh | Validacao e identidade precisam de lock; refresh ocorre antes da resposta final | `PRECISA_OTIMIZACAO_ANTES_FIRESTORE`; criacao continua sincrona, pos-processamento pode sair do request |
| Editar atividade | `/admin/atividades/salvar`; admin V2 | Lock, valida campos, batch/update, auditoria, refresh | View global apos alteracao localizada | `ESCRITA_COM_MATERIALIZACAO_PESADA`; manter escrita canonica sincrona |
| Publicar/ocultar/cancelar/reabrir | Rotas `/admin/atividades/{acao}` | Lock, transicao de estado, logs, invalidacao e refresh | Regra sensivel e rematerializacao global | `PRECISA_OTIMIZACAO_ANTES_FIRESTORE`; transicao sincrona, read models assincronos |
| Salvar rascunho de chamada | `/atividades/chamada/salvar`, `operacao=SALVAR` | Snapshot em `Portal_Acoes`, log e cache da chamada | Baixo; nao grava frequencia | `ESCRITA_SINCRONA_OK` |
| Finalizar/reabrir chamada | Mesma rota, `FINALIZAR`/`REABRIR` | Revalida membros Core, upsert de presencas, promove previas, status, logs e caches | Consistencia, lock e volume de membros | `ESCRITA_SINCRONA_OK`; Firestore recebe apenas read model eventual |

### Diagnostico da rematerializacao

`atividadesV2_atualizarViewsPortal_` atualiza sequencialmente:

1. `PORTAL_ATIVIDADES_CALENDARIO`;
2. `PORTAL_ATIVIDADES_DETALHES`;
3. `PORTAL_FREQUENCIA_MEMBROS`;
4. `PORTAL_JUSTIFICATIVAS`;
5. `PORTAL_PENDENCIAS_DIRETORIA`;
6. `PORTAL_STATUS_ATIVIDADES`.

Cada etapa pode reabrir a base e reler fontes que ja foram lidas por outra
etapa. Pendencias e status sao os casos mais caros porque dependem de varios
conjuntos operacionais. Para uma alteracao de titulo, por exemplo, recalcular
frequencia e justificativas nao e necessario.

Recomendacao:

- criar uma matriz `tipoAcao -> views afetadas`;
- permitir materializacao por `ID_ATIVIDADE` e `ID_PESSOA` quando aplicavel;
- responder depois da escrita canonica e auditoria;
- processar views, read models, cache e e-mail como pos-processamento idempotente;
- manter uma rotina completa de reconciliacao para corrigir divergencias.

## 5. Instrumentacao de performance

Nao e necessario criar outro utilitario. O arquivo
`geapa-atividades/28_portal_performance.gs` ja oferece inicio, marcas, fim,
diagnostico anexado a resposta, cache JSON e logs `GEAPA-PORTAL-PERF`.

O front-end de Atividades tambem mede tempo percebido, bytes aproximados e
etapas devolvidas pelo backend.

Lacunas antes de Firestore:

- falta um `traceId` comum entre Portal Apps Script e Atividades;
- o log nao possui chave de configuracao global explicita;
- escritas nao marcam consistentemente upload, lock, escrita, views, cache e
  resposta;
- faltam metricas agregadas por rota, cache hit/miss e percentis;
- nao ha identificacao segura e padronizada do ator/contexto em todas as
  marcas.

Extensao recomendada, sem substituir o utilitario atual:

- Script Property `ATIVIDADES_V2_PERF_LOG_ENABLED=SIM|NAO`;
- `traceId` gerado na entrada do Portal e repassado ao modulo;
- metadados seguros: rota, acao, perfil, hash do ator, `idAtividade` e
  `idApresentacao` quando necessarios;
- marcas: sessao, cache, planilha, validacao, lock, escrita, Drive, views,
  invalidacao e resposta;
- amostragem configuravel para leituras frequentes;
- nunca registrar token, CPF, telefone, arquivo/base64, texto de justificativa
  ou conteudo de e-mail.

## 6. Caches atuais

| Camada | Uso atual | Beneficio | Risco / recomendacao |
| --- | --- | --- | --- |
| Front-end Atividades | Memoria e `sessionStorage`, chave versionada, TTL de 5 min | Troca de telas quase instantanea | Invalidar por evento de escrita e por `schemaVersion`; nao depender apenas de TTL |
| Front-end telas privadas | Memoria, TTL de 60 s e stale-while-revalidate | Boa resposta ao voltar para a tela | Nao exibir stale de outro usuario; limpar sempre em troca/logout de sessao |
| Front-end eixos/config | Memoria, TTL de 20 min | Evita chamadas repetidas de dados quase estaticos | Versionar quando contrato mudar |
| Front-end admin | Lista recarregada; detalhe em memoria | Simples e coerente depois da escrita | Adotar TTL curto/ETag quando houver read model, sem esconder atualizacao administrativa |
| Portal Apps Script | `CacheService` por sessao/perfil para lista, bundle, detalhe e V2 | Evita chamadas repetidas ao modulo | Ha chaves e versoes distintas; centralizar matriz de invalidacao |
| Modulo Atividades | Calendario/detalhes 300 s, config 600 s, privados/pendencias 90 s, chamada 300 s | Reduz abertura de planilhas | Invalidacao global pode ser excessiva; invalidacao incompleta gera stale em outra sessao |
| Core | Sessao/perfil e snapshot Firestore `portalUsers/{uid}` | Reduz custo de resolucao do usuario | Documentar uma unica versao do schema; codigo atual usa `portal-user-v1` |
| Service worker | Cache estatico versionado (`portal-geapa-pwa-v64` no checkup) | Inicializacao rapida e offline basico | Atualizar a versao a cada asset de producao; nao cachear respostas privadas |

Firestore deve complementar, e depois reduzir, os caches de dados. Ele nao deve
ser colocado como uma quarta camada opaca. A ordem recomendada e:

1. memoria/sessionStorage;
2. Firestore valido e nao expirado;
3. Apps Script como fallback e autoridade de autorizacao;
4. atualizacao do read model em segundo plano.

## 7. Avaliacao das views `PORTAL_*`

| View | Destino sugerido | Granularidade | Dados/regras | Prontidao |
| --- | --- | --- | --- | --- |
| `PORTAL_ATIVIDADES_CALENDARIO` | `portalActivities/{idAtividade}` | Um documento por atividade; indice/manifeste opcional por ciclo | Somente campos publicos/restritos ja sanitizados; filtrar visibilidade | Pronta apos metadados de schema |
| `PORTAL_ATIVIDADES_DETALHES` | `portalActivityDetails/{idAtividade}` | Um documento por atividade | Nao incluir IDs Drive internos desnecessarios; links somente quando autorizados | Pronta apos metadados e regras |
| `PORTAL_PENDENCIAS_DIRETORIA` | `portalDirectorPending/{idPendencia}` ou agregado particionado | Documento por pendencia; resumo separado | Somente gestao. Inicialmente pode ser lida pelo Apps Script, nao diretamente pelo cliente | Pronta com regras de gestao |
| `PORTAL_STATUS_ATIVIDADES` | `portalReadModels/activities_status` | Documento pequeno unico | Sem dados pessoais; inclui saude, geracao e atraso | Pronta |
| `PORTAL_FREQUENCIA_MEMBROS` | `portalMemberFrequency/{idPessoa}` com ciclos em mapa/subcolecao | Um membro por documento; dividir se crescer | Privado. A view atual e resumida e nao substitui todos os registros detalhados | Precisa novo materializador detalhado |
| `PORTAL_JUSTIFICATIVAS` | `portalMemberJustifications/{idPessoa}` ou subcolecao | Por membro e justificativa | Nao expor observacao interna nem documento privado sem autorizacao | Precisa separar contrato pessoal e de gestao |
| Apresentacoes do membro | `portalMemberPresentations/{idPessoa}` | Um documento por membro ou subcolecao por apresentacao | Derivar de Atividades/Detalhes/Arquivos; nao criar `PORTAL_APRESENTACOES` | Precisa materializador por pessoa |
| Pendencias de apresentacoes | `portalPresentationPending/{idApresentacao}` | Um card por apresentacao | Gestao; manter blocos e acoes autorizadas vindas do backend | Ajuste leve |
| `PORTAL_APRESENTACOES` | Nenhum | Nenhuma | Nao e contrato ativo | Nao migrar |

Campos obrigatorios em todos os read models:

- `schemaVersion`;
- `sourceUpdatedAt`;
- `cacheUpdatedAt` ou `materializedAt`;
- `expiresAt` ou politica de stale documentada;
- `generationId`/checksum opcional para reconciliacao;
- origem da view/materializador.

O fallback para Apps Script deve permanecer enquanto Firestore estiver
indisponivel, expirado, com `schemaVersion` desconhecida ou com geracao
incompleta.

## 8. Plano de Firestore para leitura

### Fase 0 - preparar sem mudar o cliente

1. Medir p50/p95 por rota e por etapa durante pelo menos um ciclo de uso.
2. Implementar atualizacao seletiva das views atuais.
3. Definir schemas, regras, TTL e reconciliacao.
4. Resolver a divergencia documental de `portal-user-v1`/`portal-user-v2`.
5. Criar diagnostico de paridade Planilha -> view -> read model.

### Fase 1 - dados de baixo risco

- `portalActivities/{idAtividade}`;
- `portalActivityDetails/{idAtividade}`;
- `portalReadModels/activities_status`;
- resumos nao sensiveis do calendario.

O cliente tenta Firestore, valida versao/expiracao e usa Apps Script no erro.
Detalhes continuam sob demanda. Nao criar um documento unico gigante para todo
o calendario.

### Fase 2 - dados privados e administrativos

- `portalMemberPresentations/{idPessoa}`;
- `portalMemberFrequency/{idPessoa}`;
- `portalMemberJustifications/{idPessoa}`;
- `portalPresentationPending/{idApresentacao}`;
- `portalDirectorPending/{idPendencia}`.

Requisitos:

- mapeamento confiavel `Firebase uid -> ID_PESSOA` mantido pelo Core;
- regras por usuario e claims/perfil, ou leitura administrativa mediada pelo
  Apps Script;
- nenhum documento pessoal indexavel publicamente;
- payloads sem observacoes internas, e-mails desnecessarios ou IDs privados de
  Drive.

### Estrategia de fallback

1. Firestore valido: renderizar imediatamente.
2. Firestore stale dentro de tolerancia: renderizar com atualizacao silenciosa.
3. Firestore ausente/invalido: chamar Apps Script.
4. Apps Script retorna dado novo: atualizar o cliente e agendar/reconciliar o
   read model no backend.
5. Falha em ambos: estado de erro controlado, sem usar dados de outro usuario.

## 9. Plano conceitual de fila de escrita

Firestore nao deve se tornar a fonte oficial. A fila representa uma solicitacao
idempotente que sera validada e aplicada pelo Apps Script/worker autorizado.

Colecao sugerida: `portalWriteQueue/{idOperacao}`.

Campos minimos:

```text
tipoOperacao
status: PENDENTE | PROCESSANDO | PROCESSADO | ERRO | CANCELADO
uid
idPessoa
idAtividade
idApresentacao
payloadSanitizado
idempotencyKey
schemaVersion
criadoEm
iniciadoEm
processadoEm
tentativas
leaseAte
erroCodigo
erroResumo
resultadoRef
```

Cuidados:

- nao colocar token, base64, arquivo, observacao interna ou dados sensiveis na
  fila;
- validar novamente sessao, perfil, propriedade e estado no consumidor;
- usar idempotencia e lease para impedir processamento duplo;
- gravar auditoria na fonte oficial;
- somente marcar `PROCESSADO` depois da escrita canonica;
- separar falha de escrita de falha de materializacao/notificacao;
- criar rotina de reconciliacao e dead-letter operacional.

Boas candidatas iniciais, depois da otimizacao:

- envio e revisao de titulo/eixos;
- solicitacao de ajuste;
- revisao/dispensa de material e foto;
- pos-processamento de justificativa ja gravada;
- materializacao de views/read models e notificacoes.

Devem permanecer sincronas por enquanto:

- upload real para Drive;
- criacao de atividade;
- transicao operacional sensivel;
- finalizacao/reabertura de chamada;
- qualquer operacao que dependa de lock e resposta imediata de conflito.

Modelo hibrido recomendado para upload:

1. validar e salvar o arquivo no Drive;
2. gravar a referencia canonica na planilha;
3. responder sucesso com o ID da entidade;
4. enfileirar views, read models, cache e notificacao.

## 10. Mail Hub

O Core ja possui a infraestrutura correta:

- `GEAPA_CORE.coreMailQueueOutgoing(contract)`;
- `GEAPA_CORE.coreMailProcessOutbox()`.

O modulo Atividades ja usa o Mail Hub em rotinas de justificativas,
apresentacoes, presencas e atividades gerais. As novas acoes de Portal
analisadas nao enfileiram notificacao de forma consistente no mesmo fluxo.

Nao criar nova outbox. Cada notificacao deve ser enfileirada somente depois da
escrita canonica bem-sucedida, com `correlationId`/chave idempotente. O
processamento da outbox deve ocorrer fora do tempo de resposta sempre que a
regra nao exigir envio imediato.

Eventos candidatos:

| Evento | Destino sugerido | Momento |
| --- | --- | --- |
| Titulo/eixos enviados | Grupo revisor | Depois da gravacao canonica |
| Titulo/eixos aprovados ou devolvidos | Apresentador | Depois da decisao |
| Slide/foto enviados | Grupo revisor | Depois do arquivo e referencia persistidos |
| Slide/foto aprovados, dispensados ou com ajuste | Apresentador | Depois da decisao |
| Justificativa enviada | Grupo revisor, quando exigir analise | Depois da gravacao |
| Justificativa deferida/indeferida/ajuste | Membro | Depois da decisao e efeito na presenca |
| Criacao/alteracao relevante de atividade | Responsaveis definidos pela regra | Depois da transacao, nunca antes |

Contrato sugerido deve conter template/evento, destinatarios resolvidos pelo
backend, referencias da entidade, `correlationId` e dados minimos de template.
Nao incluir texto integral de justificativa no log ou na fila.

## 11. Plano de otimizacao antes do Firestore

### Obrigatorio

- Atualizacao seletiva de views por tipo de escrita.
- Instrumentacao de todas as escritas com `traceId` e chave liga/desliga.
- Read models privados por `ID_PESSOA`, sem full scan por request.
- Matriz unica de invalidacao entre front-end, Portal Apps Script e Atividades.
- Schemas versionados, expiracao e fallback documentados.
- Regras Firestore para usuario proprio e gestao.
- Reconciliacao e idempotencia para materializadores e futura fila.

### Recomendado

- Cache/index por `ID_ATIVIDADE`, `ID_APRESENTACAO` e `ID_PESSOA` no backend.
- Reutilizar uma leitura de fontes durante uma rodada completa de views.
- Evitar limpar caches nao afetados pela escrita.
- Particionar listas administrativas por ciclo/status e paginar.
- Criar metricas de cache hit/miss, bytes e p50/p95.
- Manter painel agregado como um unico read model pequeno.

### Opcional

- Desativar preload de detalhes em conexao limitada.
- Usar atualizacao stale-while-revalidate tambem na lista administrativa.
- Criar manifestos pequenos por ciclo para reduzir consultas do calendario.

## 12. Checklist de aceite para iniciar Firestore

- [ ] p50/p95 medidos para lista, detalhe, telas privadas e escritas.
- [ ] Nenhuma escrita simples rematerializa views nao relacionadas.
- [ ] Views completas ainda podem ser reconstruidas por rotina de reconciliacao.
- [ ] `schemaVersion`, `sourceUpdatedAt`, `cacheUpdatedAt` e expiracao definidos.
- [ ] Firestore continua read model, nunca fonte oficial.
- [ ] Fallback Apps Script testado para ausencia, stale e schema desconhecido.
- [ ] Regras impedem membro de ler documento de outra pessoa.
- [ ] Gestao nao e liberada por inferencia no front-end.
- [ ] `portalUsers/{uid}` e os novos read models usam versoes documentadas.
- [ ] Dados sensiveis e IDs Drive desnecessarios nao sao materializados.
- [ ] Cache de outro usuario e removido em logout/troca de sessao.
- [ ] Matriz de invalidacao cobre as tres camadas atuais.
- [ ] Fila possui idempotencia, lease, tentativas e auditoria.
- [ ] Uploads nao armazenam base64 no Firestore.
- [ ] Chamada e transicoes sensiveis permanecem sincronas.
- [ ] Mail Hub do Core e reutilizado; nenhuma nova outbox foi criada.
- [ ] Diagnostico de paridade Planilha -> view -> Firestore implementado.
- [ ] Rollback para leitura exclusiva pelo Apps Script documentado.

## 13. Conclusao

As leituras publicas de atividades estao proximas do ponto ideal para uma
primeira fase de Firestore. O calendario, os detalhes e o status podem ser
materializados com baixo risco, desde que exista versao, expiracao e fallback.

As telas privadas e administrativas ainda precisam de read models segmentados.
Migrar essas telas antes de resolver o full scan apenas esconderia o custo no
materializador e aumentaria o risco de vazamento de escopo.

Nas escritas, o ganho principal virara antes do Firestore: separar a transacao
canonica do pos-processamento global. Depois disso, Firestore se encaixa de
forma natural como read model e fila idempotente, preservando Planilhas V2,
Apps Script, views `PORTAL_*` e Mail Hub como componentes oficiais do sistema.
