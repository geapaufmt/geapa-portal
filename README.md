# Portal GEAPA

O **Portal GEAPA** e o portal web institucional para membros do GEAPA. Ele sera
hospedado gratuitamente pelo **GitHub Pages**, mas o GitHub Pages sera usado
somente para a interface visual publica.

Os dados reais do GEAPA devem permanecer no ecossistema Google da conta
institucional, especialmente Google Apps Script, Google Sheets, Google Drive e
Gmail.

## Arquitetura decidida

```text
GitHub Pages
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
- Manifesto PWA inicial em `web/manifest.json`.
- Cliente de API em `web/app.js`, sem segredos e sem acesso direto a planilhas.
- Backend em Google Apps Script com envio de codigo controlado por lista de
  teste.
- Integracao inicial com `GEAPA_CORE` como biblioteca Apps Script.
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
|-- docs/
|   |-- ARCHITECTURE.md
|   `-- SECURITY.md
|-- apps-script/
|   |-- appsscript.json
|   |-- 00_config.gs
|   |-- 01_auth_codigo.gs
|   |-- 02_minha_situacao.gs
|   |-- 03_webapp.gs
|   `-- 99_tests.gs
`-- web/
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

## Como publicar no GitHub Pages

1. Acesse o repositorio no GitHub.
2. Entre em **Settings > Pages**.
3. Em **Build and deployment**, escolha **GitHub Actions**.
4. Salve a configuracao.
5. A cada push na branch `main`, o workflow `.github/workflows/pages.yml`
   publica somente a pasta `web/`.

O GitHub Pages deve publicar somente o conteudo publico da pasta `web/`.

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

## Proximos passos

- Definir no GEAPA-CORE o contrato oficial dos blocos de frequencia,
  pendencias, certificados e historico.
- Integrar gradualmente esses blocos na tela "Minha situacao".
- Trocar a biblioteca `GEAPA_CORE` de modo desenvolvimento para uma versao fixa
  antes de uso amplo.
- Garantir que cada membro receba somente os proprios dados.
