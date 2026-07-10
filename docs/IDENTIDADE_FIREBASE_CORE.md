# Consistencia de identidade Firebase e GEAPA-CORE

## Regra central

O Portal so combina uma sessao privada quando as identidades disponiveis sao
consistentes:

- Firebase Auth: `uid` e e-mail verificado;
- `portalUsers/{uid}`: UID, e-mail normalizado, `idPessoa`, validade e acesso;
- sessao GEAPA-CORE: e-mail, `idPessoa`, perfil e origem oficial.

O guard `PortalGeapaIdentityGuard.verificarConsistenciaIdentidadePortal()`
compara esses contratos. Divergencia retorna
`IDENTITY_MISMATCH_FIREBASE_CORE`, bloqueia o fast path, limpa sessao/cache
local e encerra o Firebase Auth antes de exigir novo login.

Quando o e-mail autenticado no Firebase e um identificador oficial alternativo
da mesma pessoa, o Core pode devolver o `EMAIL_PRINCIPAL`. Nesse caso, o backend
marca `IDENTITY_ALIAS_CORE_CONFIRMADO` somente depois de resolver o e-mail do
token para uma `ID_PESSOA` valida. O navegador nao aceita essa diferenca sem a
confirmacao explicita do backend e continua comparando UID e `ID_PESSOA`.

## Login por codigo

Antes de `solicitarCodigo`, o Portal aguarda o primeiro estado do Firebase. O
metodo alternativo por codigo e sempre isolado: se houver Firebase Auth atual,
registra `FIREBASE_SIGNOUT_BEFORE_CORE_LOGIN`, limpa o estado anterior e faz
sign-out, independentemente de o e-mail coincidir.

Login por codigo sem Firebase e valido como sessao Core, mas nao provisiona
Firestore:

```text
authMode = CORE_CODE_ONLY
portalUsersProvisionamento = NAO_EXECUTADO_SEM_FIREBASE_UID
code = PROVISION_SKIP_SEM_FIREBASE_AUTH
```

Para criar ou atualizar `portalUsers/{uid}`, o usuario deve escolher diretamente
`Entrar com Google`.

## Fast path

O fast path exige documento valido, ativo, nao stale e correspondente ao
Firebase atual. Havendo sessao Core oficial, exige tambem o mesmo `idPessoa` ou
e-mail normalizado. Sem sessao Core, registra `FAST_PATH_SEM_SESSAO_CORE` e faz
revalidacao oficial imediatamente.

O resumo visual de `localStorage` nao concede acesso sozinho.

## Provisionamento

Sucesso so e registrado quando o backend recebeu e validou ID token/UID e o
Core confirmou `synced === true`:

- `PROVISION_OK`;
- `PROVISION_ALREADY_VALID`;
- `PROVISION_UPDATED`.

Demais resultados:

- `PROVISION_SKIP_SEM_FIREBASE_AUTH`;
- `PROVISION_DENY_IDENTITY_MISMATCH`;
- `PROVISION_DENY_EMAIL_NAO_ENCONTRADO`;
- `PROVISION_ERROR_FIRESTORE_WRITE_FAILED`.

O navegador continua sem permissao de escrita em `portalUsers`.

## Diagnostico

```js
PortalGeapaDebugAuth.getStatus()
PortalGeapaDebugAuth.printStatus()
```

O status separa Firebase, sessao Core, consistencia, documento esperado,
`authMode` e provisionamento. Para validar o contrato Apps Script, execute
`portalRunTesteContratoProvisionamentoFirestoreUser()` no editor.

## Homologacao manual

1. Com o Firebase autenticado como uma pessoa, solicitar codigo para outro
   e-mail. Confirmar `FIREBASE_SIGNOUT_BEFORE_CORE_LOGIN`, login Core concluido
   e `authMode = CORE_CODE_ONLY`, sem `PROVISION_OK`.
2. Entrar com Firebase proprio e usuario existente no Core. Confirmar documento
   `portalUsers/{uid}`, `identityConsistency.code = OK` e modo
   `FIREBASE_PLUS_CORE`.
3. Reabrir o Portal com Firebase e sessao Core da mesma pessoa. Confirmar fast
   path, `IDENTITY_MATCH_OK` e revalidacao oficial em segundo plano.
