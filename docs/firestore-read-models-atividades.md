# Firestore read model de Atividades

## Leitura do Portal

O Portal tenta primeiro ler o documento publico agregado
`portalActivityCalendarSnapshots/current`. Essa leitura exige somente a
configuracao Firebase e nao depende de Firebase Auth ou de `portalUsers/{uid}`.

O snapshot deve possuir:

- `source: PORTAL_ATIVIDADES_CALENDARIO`;
- `schemaVersion: portal-activity-calendar-snapshot-v1`;
- `datasetComplete: true`;
- `stale` diferente de `true`;
- `atividades` como array nao vazio;
- `total` igual ao tamanho do array;
- `cacheUpdatedAt` dentro do TTL configurado.

Se o snapshot estiver ausente, invalido ou vencido, o Portal tenta a colecao
autenticada `portalActivities`. Se essa leitura tambem falhar, usa o endpoint
Apps Script `/atividades/listar`.

O documento aceito deve possuir:

- `source: PORTAL_ATIVIDADES_CALENDARIO`;
- `schemaVersion: portal-activity-calendar-v3`;
- `ativoNoReadModel` diferente de `false`;
- `stale` diferente de `true`;
- `cacheUpdatedAt` ou `sourceUpdatedAt` dentro do TTL configurado.

Documentos com `syncScope: ID` podem atualizar itens de um conjunto previamente
materializado. Para considerar a colecao como calendário completo, o cliente
exige ao menos um documento vigente com `datasetComplete: true` e
`syncScope: FULL`. Sem essa evidencia, usa `APPS_SCRIPT_FALLBACK` com o codigo
`FIRESTORE_DATASET_PARCIAL`.

O TTL inicial e controlado por `FIRESTORE_ACTIVITIES_TTL_MS`, com default de
seis horas.

Se a colecao estiver vazia, nao houver documento completo e vigente, o usuario
nao estiver autenticado ou a leitura falhar, a tela usa imediatamente o
endpoint Apps Script `/atividades/listar`. Documentos antigos, parciais ou
vencidos sao ignorados. Documentos com `ativoNoReadModel=false` ou `stale=true`
tambem sao sempre ignorados.

O console registra a origem sem dados pessoais:

- `FIRESTORE_SNAPSHOT`, normalmente com `readsEstimados: 1`;
- `FIRESTORE_COLLECTION`, com `readsEstimados` igual ao total lido;
- `APPS_SCRIPT_FALLBACK`

Detalhes, chamada, frequencia, justificativas e qualquer escrita continuam no
Apps Script.

Depois da primeira renderizacao pelo Firestore, o Portal consulta
`/atividades/listar` em segundo plano e substitui o calendario pelo contrato
autenticado. Esse enriquecimento restaura metadados operacionais e individuais,
como `statusChamadaRotulo`, `podeJustificarAusenciaFutura` e o estado de uma
justificativa previa. Esses campos nao devem ser gravados no read model
compartilhado do Firestore.

## Rules

`portalUsers/{uid}` mantem leitura exclusiva do proprio usuario e nenhuma
escrita pelo front-end. `portalActivities/{idAtividade}` permite leitura somente
quando:

- existe Firebase Auth;
- existe `portalUsers/{uid}`;
- `portalUsers/{uid}.portalAtivo == true`.

O front-end nunca escreve em `portalActivities`.

`portalActivityCalendarSnapshots/current` permite leitura publica apenas desse
ID fixo e nunca permite escrita pelo front-end. O documento contem somente o
calendario publico agregado; dados individuais continuam protegidos.

`cacheExpiresAt` de `portalUsers` ainda e armazenado como string no contrato
atual. Por isso a expiracao nao e comparada com `request.time` nesta versao das
Rules; a validade continua sendo verificada no cliente e pelo Core.

Publicacao manual das Rules:

```powershell
npx.cmd firebase-tools deploy --only firestore:rules --project portal-geapa
```

Esse comando nao cria ou publica Cloud Functions.

## Homologacao

1. Executar `atividadesV2_runSyncFirestoreCalendarioCompletoDev()` no
   `geapa-atividades`.
2. Conferir `portalActivityCalendarSnapshots/current` com
   `datasetComplete=true`, `total > 0` e array `atividades` sem dados pessoais.
3. Publicar as Rules manualmente.
4. Entrar com usuario sem `portalUsers/{uid}`, abrir Proximas atividades e
   confirmar `FIRESTORE_SNAPSHOT` e `readsEstimados: 1` no console.
5. Entrar com usuario autenticado, invalidar temporariamente o snapshot em DEV
   e confirmar `FIRESTORE_COLLECTION`.
6. Bloquear a rede do Firestore ou reduzir o TTL e confirmar
   `APPS_SCRIPT_FALLBACK`.
7. Confirmar que detalhes, chamada e justificativas continuam chegando pelo
   Apps Script depois da primeira renderizacao.

Firestore permanece cache. Sheets V2 + Apps Script continuam sendo a fonte
oficial e o ponto de autorizacao para acoes sensiveis.
