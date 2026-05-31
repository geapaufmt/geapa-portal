# Migracao para Firebase Hosting e Firebase Auth

Este documento registra a primeira etapa da migracao do Portal GEAPA para
Firebase. O objetivo desta etapa e permitir validacao progressiva, sem remover o
fluxo por codigo nem publicar mudancas em producao sem conferencia manual.

## Escopo implementado

- Firebase Hosting configurado para publicar somente a pasta `web/`.
- Workflows de GitHub Actions para preview em pull requests e deploy em `main`.
- `firebaseConfig` publico registrado em `web/assets/js/config.js`.
- Botao "Entrar com Google" no front-end.
- Modulo estatico com Firebase Auth usando Google Sign-In.
- Acao `portalLogin` no Apps Script.
- Validacao do Firebase ID Token no backend via Identity Toolkit REST API.
- Conversao do login Firebase em sessao curta do Portal GEAPA.

O fluxo antigo por codigo continua disponivel como fallback durante a migracao.

## Configuracao privada obrigatoria

Configurar em **Apps Script > Project Settings > Script properties**:

```text
GEAPA_FIREBASE_WEB_API_KEY=api-key-publica-do-firebase-web
```

Essa chave e a mesma `apiKey` do `firebaseConfig`. Ela nao e uma chave privada,
mas deve ser restringida no Google Cloud/Firebase para os servicos e dominios
esperados.

Configurar em **GitHub > Settings > Secrets and variables > Actions**:

```text
FIREBASE_SERVICE_ACCOUNT_PORTAL_GEAPA
```

O valor deve ser o JSON da service account usado pelo workflow de deploy. Esse
JSON nunca deve ser salvo no repositorio.

## Dominios autorizados

No Firebase Authentication, liberar os dominios usados pelo portal:

- `portal-geapa.firebaseapp.com`;
- `portal-geapa.web.app`;
- dominio personalizado, quando existir;
- dominio atual do GitHub Pages, enquanto o fallback estiver em teste.

## Deploy manual

Depois de autenticar a Firebase CLI em uma maquina confiavel:

```text
firebase deploy --only hosting
```

O deploy automatico em `main` usa o workflow
`.github/workflows/firebase-hosting-merge.yml`.

## Fluxo de autenticacao

1. O membro clica em "Entrar com Google".
2. O Firebase Auth autentica a conta Google no navegador.
3. O front-end chama `user.getIdToken()`.
4. O token e enviado para o Apps Script na acao `portalLogin`.
5. O Apps Script valida o token no Firebase.
6. O Apps Script cruza o e-mail validado com o GEAPA-CORE/base oficial.
7. Se autorizado, o Apps Script cria uma sessao curta do Portal.
8. As demais telas continuam usando a sessao curta atual.

O ID Token completo nao deve ser salvo em `localStorage`, planilha ou logs.

## Pendencias antes de producao ampla

- Confirmar `GEAPA_FIREBASE_WEB_API_KEY` no Apps Script publicado.
- Confirmar secret `FIREBASE_SERVICE_ACCOUNT_PORTAL_GEAPA` no GitHub.
- Confirmar dominios autorizados no Firebase Authentication.
- Validar usuario autorizado, usuario nao cadastrado e usuario desativado.
- Fixar contrato definitivo de autorizacao no GEAPA-CORE.
- Decidir se o workflow antigo de GitHub Pages sera mantido ou removido.
- Revisar se "Atividades" continuara protegida por login ou tera endpoint
  publico separado.
- Validar o PWA leve descrito em `docs/PWA.md`.
