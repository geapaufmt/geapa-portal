# Cache de Login via Firestore

O Portal pode ler `portalUsers/{uid}` no Firestore depois do Firebase Auth para
abrir a interface mais rapidamente. Esse documento e apenas cache operacional:
GEAPA-CORE + PESSOAS v2 continuam sendo a fonte oficial.

## Caminho adotado no plano gratuito

Como o projeto `portal-geapa` permanece no plano Spark, nao usamos Cloud
Functions, Secret Manager, service account nem chave privada. A sincronizacao e
feita pelo Apps Script/GEAPA-CORE chamando a API REST do Firestore com:

```text
Authorization: Bearer ScriptApp.getOAuthToken()
```

O CORE grava diretamente:

```text
projects/portal-geapa/databases/(default)/documents/portalUsers/{uid}
```

No fluxo normal, essa escrita acontece automaticamente durante
`portalLoginFirebase`, logo depois que o Firebase Auth autentica o Google e o
GEAPA-CORE autoriza oficialmente a pessoa pela PESSOAS v2. O retorno do login
inclui um resumo `cacheFirestore` para diagnostico, mas falha de cache nao deve
bloquear a sessao oficial.

O backend consulta `accounts:lookup` com o ID token e, depois da resposta
valida, confere `aud`, `iss` e `sub` contra o projeto `portal-geapa` e o UID
retornado. UID e e-mail nunca sao aceitos como identidade apenas porque vieram
do navegador.

Para nao duplicar leituras caras, a sincronizacao do login reaproveita a sessao
oficial ja resolvida pelo CORE e apenas escreve o snapshot no Firestore.

Para isso, o Apps Script precisa estar autorizado com o escopo:

```text
https://www.googleapis.com/auth/datastore
```

Se o projeto Apps Script usa escopos automaticos, a primeira execucao que chama
o Firestore pode pedir nova autorizacao. Se passar a usar `oauthScopes`
explicitos no `appsscript.json`, inclua tambem `datastore` e
`script.external_request`, preservando os demais escopos ja usados pelo CORE.

## Configuracao no Apps Script

No projeto Apps Script do GEAPA-CORE, salve em Script Properties:

```text
GEAPA_CORE_FIRESTORE_PROJECT_ID=portal-geapa
GEAPA_CORE_FIRESTORE_DATABASE_ID=(default)
```

`GEAPA_CORE_FIRESTORE_DATABASE_ID` e opcional; se ausente, o CORE usa
`(default)`.

Nao ha segredo compartilhado nesse caminho. A autorizacao vem do OAuth do Apps
Script e das permissoes do usuario/projeto que executa o script no Google Cloud.

## Payload gravado

`portalUsers/{uid}` deve conter somente:

- `uid`
- `idPessoa`
- `nomePublico`
- `email`
- `emailNormalizado`
- `perfilOperacional`
- `ativo`
- `podeAcessarPortal`
- `podeLerDadosPrivados`
- `roles`
- `permissions`
- `portalAtivo`
- `perfilPortalEfetivo`
- `perfisPortal`
- `permissoes`
- `source: "PESSOAS_V2"`
- `sourceSystem: "geapa-core"`
- `sourceUpdatedAt`
- `cacheUpdatedAt`
- `cacheExpiresAt`
- `lastLoginAt`
- `provisionedAt`
- `stale`
- `staleReason`
- `schemaVersion: "portal-user-v2"`

Nao colocar RGA, CPF, telefone, data de nascimento, observacoes internas, logs,
pendencias detalhadas, corpo de e-mail, tokens, segredos, senhas, chaves
privadas, IDs sensiveis de planilhas ou qualquer dado que nao seja necessario
para abrir a interface.

## Firestore Rules

As rules continuam protegendo o acesso do front-end:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /portalUsers/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

Deploy das rules:

```text
npx firebase-tools deploy --only firestore:rules --project portal-geapa
```

Esse deploy nao publica Cloud Functions.

## Diagnostico pelo CORE

Antes e depois dos testes, execute no editor do GEAPA-CORE:

```js
corePortalDiagnosticarFirestoreUsersDev({
  includeEmails: false
})
```

Quem ainda nao autenticou aparece como `AGUARDANDO_PRIMEIRO_LOGIN_FIREBASE`.
Nao crie UID manualmente nem documento por e-mail. O primeiro login valido cria
`portalUsers/{uid}` automaticamente.

## Teste administrativo pelo CORE

Depois de configurar `GEAPA_CORE_FIRESTORE_PROJECT_ID`, execute no Apps Script:

```js
corePortalSyncFirestoreUserByEmail('email@exemplo.com', {
  uid: 'UID_FIREBASE_DO_USUARIO',
  dryRun: true
});
```

Ou:

```js
corePortalSyncFirestoreUserByIdPessoa('PESSOA-001', {
  uid: 'UID_FIREBASE_DO_USUARIO',
  dryRun: true
});
```

Retorno esperado:

```js
{
  ok: true,
  synced: false,
  writer: 'APPS_SCRIPT_FIRESTORE_REST',
  code: 'DRY_RUN'
}
```

Essas funcoes sao testes administrativos e nao substituem o fluxo seguro de
login. Para provisionamento real, use o login Firebase normal. Se retornar
`FIRESTORE_PROJECT_ID_NAO_CONFIGURADO`, falta a Script Property.
Se retornar `FIRESTORE_SYNC_FALHOU` com `401` ou `403`, confira se o Apps
Script foi autorizado com escopo `datastore` e se a Firestore API esta
habilitada no projeto `portal-geapa`.

## Leitura pelo Portal

Depois que `portalUsers/{uid}` existir, o front-end autenticado le o proprio
documento via Firebase client SDK. Se o snapshot estiver ausente, vencido ou
divergente, o Portal cai para o fluxo oficial via Apps Script/GEAPA-CORE.

O console registra `FIRESTORE_USER_PROVISIONED` quando o login conclui o sync e
`FIRESTORE_USER_PROVISION_PENDING` quando o cache falha. Neste segundo caso a
sessao oficial continua funcionando pelo Apps Script e uma nova tentativa sera
feita no proximo login.

## Ordem segura de publicacao

1. Publicar primeiro o GEAPA-CORE e criar uma versao da biblioteca.
2. Fixar essa versao no `appsscript.json` do Portal para producao; em homologacao, confirmar conscientemente o uso de `developmentMode`.
3. Publicar o Apps Script do Portal e testar um login autorizado.
4. Confirmar `FIRESTORE_USER_PROVISIONED` e os novos campos no documento proprio.
5. Somente depois publicar `firestore.rules`.
6. Por ultimo publicar o Hosting, que inclui o helper `ensureReady` e o novo contrato de cache.

Essa ordem evita aplicar Rules que exigem os campos novos enquanto o backend
ainda grava o snapshot antigo. O calendario publico
`portalActivityCalendarSnapshots/current` permanece independente de
`portalUsers` durante todo o processo.

O Portal tambem pode manter em `localStorage` um resumo visual seguro em
`geapaPortal.safeUserSummary`, sem tokens e sem dados sensiveis, apenas para
evitar a tela de login enquanto a restauracao silenciosa pelo Firebase Auth
chama `portalLogin`. O fluxo completo esta descrito em
`docs/AUTH_PERSISTENCE.md`.
