# Estabilizacao da leitura de atividades

Aplicacao baseada em `geapa-atividades/docs/performance-diagnostico-portal.md`.

## O que foi alterado

- O detalhe individual passou a usar `PORTAL_ATIVIDADES_DETALHES` como fonte
  preferencial e a recorrer a `Atividades` somente quando a view estiver
  ausente ou sem linhas.
- Calendario e detalhe agora informam origem, cache hit/miss, tamanho aproximado
  do payload e diagnostico de etapas.
- A ponte Apps Script do Portal preserva a telemetria devolvida por
  `GEAPA_ATIVIDADES` no `meta` da resposta.
- O cache de leitura no navegador foi versionado e fortalecido para calendario
  e `detalhesPorId`.
- Alteracoes administrativas notificam a tela de atividades para invalidar o
  cache local relacionado.
- Os assets foram versionados para evitar reutilizacao do JavaScript anterior.

Nenhuma regra de negocio ou escrita oficial foi alterada.

## Endpoints e telas

| Uso | Rota do Portal | Funcao no Portal | Funcao no Atividades |
| --- | --- | --- | --- |
| Lista/calendario leve | `GET /atividades/listar` | `portalListarAtividades` | `atividadesV2_portalGetCalendario` |
| Detalhe sob demanda | `GET /atividades/detalhe` | `portalDetalheAtividade` | `atividades_buscarDetalheParaPortal` |
| Preload opcional | `GET /atividades/detalhes-preload` | `portalPrecarregarDetalhesAtividades` | `atividadesV2_portalGetAtividadesDetalhes` |

As telas Proximas atividades e Historico de atividades compartilham a lista
leve. Os dados completos nao fazem parte da primeira requisicao.

## Carregamento atual

1. Ao abrir Atividades, o front-end procura um calendario valido na memoria ou
   no `sessionStorage`.
2. Em cache miss, chama apenas `/atividades/listar`.
3. A lista e renderizada antes de qualquer detalhe completo.
4. O detalhe e buscado quando o usuario clica em `Ver detalhes`.
5. Depois da primeira renderizacao, ate dois detalhes prioritarios podem ser
   preparados em segundo plano, com concorrencia limitada e pausa durante a
   chamada operacional.
6. Requisicoes simultaneas do mesmo detalhe sao deduplicadas.

Nao ha leitura de Drive ou Gmail na abertura da aba. Links publicos ja
materializados podem aparecer no detalhe devolvido pelo backend.

## Cache no sessionStorage

- Chave atual: `geapaPortal.atividadesLeitura.v10.<hash>`.
- TTL: 5 minutos.
- O hash considera a identidade segura disponivel e o perfil efetivo.
- O token e apenas usado para confirmar que ha sessao; ele nao e armazenado na
  chave nem no payload do cache.
- O payload guarda `calendario`, `detalhesPorId`, modo e ultima atualizacao.
- Um calendario vazio continua sendo um resultado valido.
- Um cache que contenha apenas detalhe nao e confundido com calendario ja
  carregado.
- JSON vencido, incompleto ou corrompido e removido e ignorado.
- Criacao, edicao, publicacao, ocultacao, cancelamento, reabertura, finalizacao
  de chamada e mudancas de apresentacao invalidam o cache relacionado.

## Fontes e fallback

Calendario:

- fonte: `PORTAL_ATIVIDADES_CALENDARIO`;
- cache do modulo: `portal:v2:atividades:calendario:*`.

Detalhe:

- fonte preferencial: `PORTAL_ATIVIDADES_DETALHES`;
- fallback: aba operacional `Atividades`, somente quando a view estiver ausente
  ou vazia;
- cache por `ID_ATIVIDADE + contexto`:
  `portal:v2:atividades:atividade:detalhes:*`.

O fallback nao cruza `Atividades_Apresentacoes` durante o clique. A view e o
caminho que entrega apresentacoes e envolvidos ja materializados.

## Como medir

Em `DEV`, o navegador registra no console:

```text
[GEAPA-PORTAL-PERF] atividades.lista.renderizada
[GEAPA-PORTAL-PERF] atividades.aba.cache
[GEAPA-PORTAL-PERF] atividades.detalhe.cache_sessao
[GEAPA-PORTAL-PERF] atividades.detalhe.fallback_backend
```

Os registros informam, conforme o fluxo:

- `tempoMs` e `tempoPrimeiraRenderizacaoMs`;
- `tempoBackendMs`;
- `origemCache`: memoria, `sessionStorage` ou backend;
- `origemBackend`: cache, view ou aba de fallback;
- `cacheHitBackend`;
- `payloadBytes`;
- quantidade de etapas do backend.

Os endpoints do modulo devolvem:

```js
{
  cacheHit: false,
  origem: "PORTAL_ATIVIDADES_DETALHES",
  payloadBytes: 1234,
  performance: {
    totalMs: 45,
    etapas: []
  }
}
```

Teste manual de backend:

```js
atividadesV2_runTestePortalPerformanceDev()
```

O teste limpa os caches usados pelo cenario, executa calendario e detalhe duas
vezes e informa se os segundos acessos vieram de cache.

## Validacao manual recomendada

1. Abrir DevTools e limpar o `sessionStorage` da origem do Portal.
2. Abrir Atividades e confirmar uma chamada para `/atividades/listar`.
3. Confirmar que nao ha chamada de detalhe antes da primeira renderizacao.
4. Clicar em uma atividade e confirmar `/atividades/detalhe`.
5. Fechar e abrir o mesmo detalhe e confirmar origem de cache.
6. Voltar para outra aba e reabrir Atividades dentro de 5 minutos.
7. Confirmar `atividades.aba.cache` com origem `memoria` ou `sessionStorage`.
8. Executar uma acao administrativa em DEV e confirmar que a proxima abertura
   consulta dados novos.

## Lacunas fora deste pacote

- Firestore e fila Firestore;
- Mail Hub, e-mails e notificacoes;
- otimizacao ou alteracao de qualquer escrita;
- mudanca de regras de visibilidade, permissao ou negocio;
- substituicao das views `PORTAL_*`;
- remocao do fallback operacional;
- nova estrutura oficial de dados.

## Proximos passos

1. Medir p50 e p95 da lista e do detalhe em uso DEV real.
2. Acompanhar taxa de cache hit e tamanho dos payloads por alguns ciclos.
3. Verificar periodicamente a atualizacao de
   `PORTAL_ATIVIDADES_CALENDARIO` e `PORTAL_ATIVIDADES_DETALHES`.
4. Investigar somente depois os read models privados e a rematerializacao de
   views, em pacote separado.
