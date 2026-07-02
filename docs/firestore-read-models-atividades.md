# Firestore read model de Atividades

## Leitura do Portal

O Portal tenta ler `portalActivities` pelo Firebase client SDK depois que o
Firebase Auth possui usuario atual. O modulo `firestore-activities.js` reutiliza
a mesma instancia Firebase do login.

O documento aceito deve possuir:

- `source: PORTAL_ATIVIDADES_CALENDARIO`;
- `schemaVersion: portal-activity-calendar-v2`;
- `datasetComplete: true`;
- `cacheUpdatedAt` ou `sourceUpdatedAt` dentro do TTL configurado.

O TTL inicial e controlado por `FIRESTORE_ACTIVITIES_TTL_MS`, com default de
seis horas.

Se a colecao estiver vazia, nao houver documento completo e vigente, o usuario
nao estiver autenticado ou a leitura falhar, a tela usa imediatamente o
endpoint Apps Script `/atividades/listar`. Documentos antigos, parciais ou
vencidos sao ignorados.

O console registra a origem sem dados pessoais:

- `FIRESTORE`
- `APPS_SCRIPT_FALLBACK`

Detalhes, chamada, frequencia, justificativas e qualquer escrita continuam no
Apps Script.

## Rules

`portalUsers/{uid}` mantem leitura exclusiva do proprio usuario e nenhuma
escrita pelo front-end. `portalActivities/{idAtividade}` permite leitura somente
quando:

- existe Firebase Auth;
- existe `portalUsers/{uid}`;
- `portalUsers/{uid}.portalAtivo == true`.

O front-end nunca escreve em `portalActivities`.

`cacheExpiresAt` de `portalUsers` ainda e armazenado como string no contrato
atual. Por isso a expiracao nao e comparada com `request.time` nesta versao das
Rules; a validade continua sendo verificada no cliente e pelo Core.

Publicacao manual das Rules:

```powershell
npx.cmd firebase-tools deploy --only firestore:rules --project portal-geapa
```

Esse comando nao cria ou publica Cloud Functions.

## Homologacao

1. Materializar o calendario completo em DEV pelo `geapa-atividades`, sem
   informar `limit` nem `idAtividade`.
2. Publicar as Rules manualmente.
3. Entrar no Portal com usuario cujo `portalUsers/{uid}.portalAtivo` seja `true`.
4. Abrir Proximas atividades e confirmar origem `FIRESTORE` no console.
5. Bloquear a rede do Firestore ou reduzir o TTL e confirmar
   `APPS_SCRIPT_FALLBACK`.
6. Confirmar que detalhes e acoes continuam chegando pelo Apps Script.

Firestore permanece cache. Sheets V2 + Apps Script continuam sendo a fonte
oficial e o ponto de autorizacao para acoes sensiveis.
