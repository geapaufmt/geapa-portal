# Testes manuais de performance - Atividades

Este roteiro valida concorrencia de preloads, fallback de detalhes e prioridade
da chamada operacional no Portal GEAPA.

## Preparacao

1. Abrir o Portal com hard refresh.
2. Abrir DevTools > Console.
3. Filtrar por `GEAPA-PORTAL-PERF`.
4. Limpar o console antes de cada teste.

## Teste A - chamada com preloads pausados

1. Abrir `Atividades > Proximas atividades`.
2. Assim que a lista aparecer, abrir a chamada da atividade
   `ATV-2026-1-0028`.
3. Confirmar que aparecem logs como:
   - `atividades.detalhe.preload_pausado_chamada_ativa`
   - `atividades.detalhe.preload_skip_chamada_ativa`
   - `atividades.chamada.carregada`
4. Registrar do log `atividades.chamada.carregada`:
   - `tempoMs`
   - `tempoBackendMs`
   - `payloadBytes`
   - `totalParticipantes`
   - `etapasBackend`

Resultado esperado: a chamada nao deve competir com novos preloads enquanto
carrega.

## Teste B - lista com preloads oportunistas

1. Recarregar a pagina.
2. Abrir `Atividades > Proximas atividades`.
3. Nao abrir chamada imediatamente.
4. Observar os logs de detalhes.

Resultado esperado:

- no maximo 2 `atividades.detalhe.preload_unitario` simultaneos;
- nenhum `idAtividade` deve gerar dois `fallback_backend` simultaneos;
- se detalhe e preload pedirem o mesmo ID, deve aparecer
  `atividades.detalhe.inflight_reuse`.

## Teste C - fallback deduplicado

1. Abrir o detalhe de uma atividade que ainda nao esta no cache.
2. Clicar rapidamente de novo no mesmo card ou abrir outra acao que peça o
   mesmo detalhe.
3. Observar o console.

Resultado esperado: apenas a primeira chamada deve registrar
`atividades.detalhe.fallback_backend`; as demais devem reaproveitar a promise em
voo com `atividades.detalhe.inflight_reuse`.

## Interpretacao

Se `tempoBackendMs` da chamada continuar alto mesmo com preloads pausados, o
gargalo remanescente esta no backend `geapa-atividades` ou nas consultas que ele
faz ao `geapa-core`. Se o tempo cair claramente quando a chamada nao concorre
com preloads, o gargalo era congestionamento provocado pelo front-end.
