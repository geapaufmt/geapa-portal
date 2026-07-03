# Rollback do Portal GEAPA

Objetivo: recuperar a URL dos membros em poucos minutos, sem alterar dados
oficiais em Sheets.

## Hosting quebrado

1. Abra Firebase Console -> Hosting -> Release history.
2. Localize a ultima release estavel do canal `live`.
3. Use Rollback nessa release.
4. Feche e reabra o Portal para renovar o service worker.

Alternativamente, reverta o commit, gere `config.prod.js` e execute novamente o
workflow manual de producao.

## Desligar Firestore

Em `config.prod.js`, defina:

```javascript
FIRESTORE_ENABLED: false,
APPS_SCRIPT_FALLBACK_ENABLED: true
```

Gere `config.js`, valide e publique o Hosting. Para desligar apenas o snapshot,
use `FIRESTORE_SNAPSHOT_ENABLED: false`. Para evitar leitura documento a
documento, desligue tambem `FIRESTORE_COLLECTION_FALLBACK_ENABLED`.

## Voltar ao endpoint Apps Script anterior

Reverta `GEAPA_API_BASE_URL` em `config.prod.js` para o deployment ID estavel,
gere `config.js` e publique. Nunca edite somente o arquivo gerado.

## Firestore Rules

Rules nao sao publicadas pelos workflows de Hosting. Para voltar:

1. reverta `firestore.rules` para o commit estavel;
2. revise o diff;
3. execute manualmente:

```powershell
npx.cmd firebase-tools deploy --only firestore:rules --project portal-geapa
```

## Tela Atividades quebrada

1. Confirme `PortalGeapaDebug.getBuildInfo()`.
2. Confirme `PortalGeapaDebug.getDataSources()`.
3. Desligue Firestore e preserve `APPS_SCRIPT_FALLBACK_ENABLED=true`.
4. Se persistir, faça rollback da release Hosting.

## Login quebrado

1. Nao altere `portalUsers` ou PESSOAS V2 durante o incidente.
2. Confirme endpoint Apps Script e Firebase project no build info.
3. Faça rollback do Hosting.
4. Se o erro estiver no backend, selecione uma versao/deployment Apps Script
   anterior pelo editor e atualize `config.prod.js` somente depois de testar.

## Apps Script falhando

1. Identifique as versoes de Core e Atividades usadas pelo deployment.
2. Volte o manifesto para versoes imutaveis conhecidas.
3. Crie nova versao do projeto consumidor.
4. Atualize o deployment existente para essa versao, preservando a URL.

Enquanto Portal e Atividades usarem `version: "0"`, o rollback de biblioteca nao
e deterministico. Essa e a principal pendencia critica da fase 2.

## Identificacao rapida

```javascript
PortalGeapaDebug.getEnvironment()
PortalGeapaDebug.getBuildInfo()
PortalGeapaDebug.getDataSources()
```

Registre em cada release aprovada: commit, `PORTAL_VERSION`, canal Hosting,
endpoint Apps Script e versoes das bibliotecas.
