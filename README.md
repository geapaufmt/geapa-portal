# Portal GEAPA

O **Portal GEAPA** e o portal web institucional para membros do GEAPA. A
hospedagem principal esta em migracao para **Firebase Hosting**, mantendo o
GitHub como fonte do codigo e o Apps Script como backend/API.

Os dados reais do GEAPA devem permanecer no ecossistema Google da conta
institucional, especialmente Google Apps Script, Google Sheets, Google Drive e
Gmail.

## Arquitetura decidida

```text
Firebase Hosting
  Hospeda apenas o front-end estatico: HTML, CSS, JavaScript, manifesto PWA,
  textos institucionais e arquivos publicos.

Google Apps Script
  Funciona como API/backend do portal. Valida identidade, sessao e permissoes
  antes de retornar qualquer dado.

Google Sheets
  Armazena dados oficiais do GEAPA. O navegador nunca acessa essas planilhas
  diretamente.

Google Drive
  Armazena documentos, arquivos e recursos institucionais.

Gmail / Apps Script
  Envia códigos de acesso, avisos e e-mails automáticos.
```

Regra central: **o front-end chama somente endpoints do Apps Script**. Toda
consulta real a planilhas, documentos e regras de autorizacao deve acontecer no
backend.

## Objetivo desta etapa

- Preparar o portal para hospedagem estatica no GitHub Pages.
- Iniciar a migracao para Firebase Hosting e Firebase Authentication.
- Manter o backend separado em `apps-script/`.
- Criar documentacao clara sobre arquitetura e seguranca.
- Testar o fluxo de acesso por codigo enviado ao e-mail cadastrado.
- Manter o front-end como cliente publico da API em Apps Script.
- Carregar a primeira versao parcial da tela "Minha situacao", com dados
  cadastrais basicos resolvidos pelo backend.
- Manter frequencia, pendencias, certificados e historico fora da integracao
  ate que o contrato definitivo exista no GEAPA-CORE.

## Escopo atual

- Interface publica em `web/`.
- Cache seguro `portalUsers/{uid}` no Firestore, gravado pelo GEAPA-CORE via
  Apps Script/Firestore REST, sem Cloud Functions.
- Manifesto PWA inicial em `web/manifest.json`.
- Cliente de API em `web/app.js`, sem segredos e sem acesso direto a planilhas.
- Firebase Auth com Google Sign-In em migracao, sempre validado pelo Apps
  Script antes de liberar a sessao do portal.
- Backend em Google Apps Script com envio de codigo controlado por lista de
  teste.
- Integracao inicial com `GEAPA_CORE` como biblioteca Apps Script.
- Sessao oficial do Portal resolvida preferencialmente por
  `corePortalResolverUsuarioAtual`.
- Tela inicial de Atividades com leitura segura via Apps Script e fallback de
  mock para desenvolvimento, sem escrita real.
- Tela `Gestao -> Atividades` para perfis autorizados, com listagem de
  rascunhos, detalhe sob demanda, edicao segura e acoes administrativas
  validadas pelo backend V2 DEV.
- Diagnostico interno de cadastro para testes no editor do Apps Script.
- Documentacao de arquitetura e seguranca.

## Fora do escopo nesta etapa

- Senha de acesso.
- Painel da Diretoria.
- Edicao de dados.
- Upload direto de arquivos.
- Notificacoes push.
- Acesso real a planilhas.
- IDs sensiveis de planilhas.
- Tokens, chaves privadas ou bases de dados reais de membros no repositorio.

## Estrutura do repositorio

```text
geapa-portal/
|-- README.md
|-- .clasp.example.json
|-- .firebaserc
|-- firebase.json
|-- firestore.rules
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- API.md
|   |-- FIREBASE_MIGRATION.md
|   |-- FIRESTORE_LOGIN_CACHE.md
|   |-- PUBLIC_CONTENT.md
|   |-- api-contrato-atividades.md
|   |-- DATA_MATRIX.md
|   |-- diagnostico-portal.md
|   |-- fases-portal.md
|   |-- PILOT_CHECKLIST.md
|   |-- ROTAS_PROTEGIDAS.md
|   |-- SESSAO_PORTAL_CORE.md
|   `-- SECURITY.md
|-- apps-script/
|   |-- appsscript.json
|   |-- 00_config.gs
|   |-- 01_auth_codigo.gs
|   |-- 02_minha_situacao.gs
|   |-- 03_membros.gs
|   |-- 03_webapp.gs
|   |-- 04_atividades.gs
|   `-- 99_tests.gs
`-- web/
    |-- assets/
    |   `-- js/
    |       |-- api.js
    |       |-- atividades.js
    |       |-- auth.js
    |       |-- config.js
    |       `-- ui.js
    |-- index.html
    |-- style.css
    |-- app.js
    `-- manifest.json
```

## Como testar localmente

Abra o arquivo abaixo em um navegador:

```text
web/index.html
```

A tela funciona apenas com HTML, CSS e JavaScript. O front-end chama a API
publicada do Apps Script para solicitar codigo, validar codigo e carregar a
primeira versao parcial de "Minha situacao".

O login com Google usa Firebase Auth e precisa ser testado em um dominio
autorizado no Firebase Authentication. Para testes locais, sirva a pasta `web/`
por HTTP e libere o dominio correspondente no Firebase quando necessario.

A tela **Atividades** pode ser aberta pelo botão "Atividades" depois do login.
Em modo real, ela exige sessão válida e chama o Apps Script, que por sua vez
consulta o contrato público somente leitura do módulo `geapa-atividades`.
Nesta etapa, a leitura real aponta para a base **ATIVIDADES INTERNAS GEAPA v2 -
DEV**, pela key `ATIVIDADES_V2_DB`, usando `ID_ATIVIDADE` no padrão
`ATV-AAAA-S-NNNN`.

Depois do login, o portal tambem pode receber do GEAPA-CORE o bloco seguro
`sessao`, documentado em `docs/SESSAO_PORTAL_CORE.md`. Esse bloco informa perfil
efetivo, perfis, permissoes e estado de acesso ja resolvidos pelo backend. O
front-end usa esses dados apenas para organizar navegacao e rotas protegidas;
qualquer autorizacao real continua sendo validada no Apps Script.

## Como publicar no Firebase Hosting

O Firebase Hosting publica somente o conteudo publico da pasta `web/`.

Deploy manual:

```text
firebase deploy --only hosting
```

## Firestore no plano Spark

O cache operacional `portalUsers/{uid}` e gravado pelo GEAPA-CORE via Apps
Script/Firestore REST, usando `ScriptApp.getOAuthToken()`. Nao usamos Cloud
Functions, Secret Manager, service account nem chave privada.

O Apps Script atualiza esse cache automaticamente em `portalLoginFirebase` apos
o Firebase Auth autenticar o Google e o GEAPA-CORE autorizar a pessoa pela
PESSOAS v2.

Deploy manual das rules:

```text
npx firebase-tools deploy --only firestore:rules --project portal-geapa
```

Depois, configure no Apps Script do GEAPA-CORE:

```text
GEAPA_CORE_FIRESTORE_PROJECT_ID=portal-geapa
GEAPA_CORE_FIRESTORE_DATABASE_ID=(default)
```

Detalhes do contrato e autorizacao OAuth: [Cache de Login via Firestore](docs/FIRESTORE_LOGIN_CACHE.md).

O deploy automatico em `main` usa
`.github/workflows/firebase-hosting-merge.yml`. Pull requests recebem preview
por `.github/workflows/firebase-hosting-pull-request.yml`.

Configure no GitHub Actions o secret:

```text
FIREBASE_SERVICE_ACCOUNT_PORTAL_GEAPA
```

## Publicacao legada no GitHub Pages

1. Acesse o repositorio no GitHub.
2. Entre em **Settings > Pages**.
3. Em **Build and deployment**, escolha **GitHub Actions**.
4. Salve a configuracao.
5. A cada push na branch `main`, o workflow `.github/workflows/pages.yml`
   publica somente a pasta `web/`.

O GitHub Pages deve publicar somente o conteudo publico da pasta `web/`.
Durante a migracao, ele pode continuar como fallback ate o Firebase Hosting ser
validado.

## Deploy do Apps Script

O arquivo `.clasp.json` local deve apontar `rootDir` para `apps-script`, para que
o `clasp push` envie apenas o backend e nao envie os arquivos do front-end.

Por seguranca, `.clasp.json` fica no `.gitignore`, pois pode conter o `scriptId`
real do projeto. Use `.clasp.example.json` como modelo ao configurar uma nova
maquina.

## Documentacao complementar

- [Arquitetura](docs/ARCHITECTURE.md)
- [Seguranca](docs/SECURITY.md)
- [Contrato da API](docs/API.md)
- [Contrato inicial de atividades](docs/api-contrato-atividades.md)
- [Migracao Firebase](docs/FIREBASE_MIGRATION.md)
- [Cache de Login via Firestore](docs/FIRESTORE_LOGIN_CACHE.md)
- [Conteudo publico editorial](docs/PUBLIC_CONTENT.md)
- [PWA](docs/PWA.md)
- [Matriz de dados](docs/DATA_MATRIX.md)
- [Checklist de piloto](docs/PILOT_CHECKLIST.md)
- [Diagnostico do portal](docs/diagnostico-portal.md)
- [Fases de evolucao](docs/fases-portal.md)

## Proximos passos

- Inspecionar `geapa-atividades` e definir o contrato real para listagem e
  detalhes de atividades.
- Ampliar no GEAPA-CORE as fontes oficiais dos blocos de atividades,
  frequencia detalhada, certificados e historico.
- Integrar gradualmente esses blocos na tela "Minha situacao" conforme o core
  disponibilizar dados confiaveis.
- Trocar a biblioteca `GEAPA_CORE` de modo desenvolvimento para uma versao fixa
  antes de uso amplo.
- Garantir que cada membro receba somente os proprios dados.
