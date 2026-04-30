# Portal GEAPA

O **Portal GEAPA** será um app web simples para membros do GEAPA consultarem informações próprias, começando pela tela **Minha situação no GEAPA**.

Esta V1 prepara apenas a base do repositório, os contratos iniciais e a interface simulada. Não há autenticação real, integração com planilhas oficiais, envio de e-mail ou uso de dados sensíveis neste primeiro momento.

## Objetivo da V1

- Criar a estrutura inicial do portal web.
- Preparar os arquivos do backend em Google Apps Script.
- Definir funções placeholder para o futuro fluxo de acesso por código temporário.
- Criar uma interface inicial simples, responsiva e sem dependências externas.
- Documentar a arquitetura prevista para futuras diretorias manterem o projeto com segurança.

## Escopo

- Portal web simples para membros.
- Apps Script como API/backend.
- Futuro login por e-mail ou RGA com código temporário enviado por e-mail.
- Futuro endpoint para retornar apenas os dados do próprio membro.
- Tela futura **Minha situação no GEAPA**.
- Futuro consumo de dados das planilhas oficiais por meio do GEAPA-CORE.

## Fora do escopo nesta etapa

- Senha de acesso.
- Aplicativo publicado em loja.
- Painel completo da Diretoria.
- Edição de dados pela Diretoria.
- Upload direto de arquivos.
- Notificações push.
- Integração real com planilhas.
- IDs reais de planilhas, e-mails sensíveis, tokens ou chaves privadas.
- Autenticação funcional completa.

## Arquitetura prevista

```text
web/
  Interface web/PWA simples, aberta pelo navegador do membro.

apps-script/
  Backend publicado como Web App do Google Apps Script.

GEAPA-CORE
  Fonte futura para leitura padronizada dos dados oficiais do GEAPA.

Planilhas oficiais
  Base institucional de dados, acessada futuramente somente pelo backend.
```

Fluxo previsto:

1. O membro informa e-mail ou RGA no portal.
2. O backend verifica se há cadastro correspondente.
3. O backend envia um código temporário para o e-mail cadastrado.
4. O membro informa o código recebido.
5. O backend valida o código e retorna um token temporário.
6. O portal usa o token para consultar apenas a situação do próprio membro.
7. O backend busca os dados oficiais via GEAPA-CORE e retorna somente o necessário para a tela **Minha situação**.

Na V1, esse fluxo existe apenas como contrato e simulação.

## Contratos iniciais

Funções placeholder no Apps Script:

- `portalSolicitarCodigo(emailOuRga)`
- `portalValidarCodigo(emailOuRga, codigo)`
- `portalMinhaSituacao(token)`
- `portalDebugMinhaSituacaoPorRga(rga)`

Essas funções ainda não fazem validação real, não enviam e-mails e não acessam planilhas.

## Estrutura do repositório

```text
geapa-portal/
├── README.md
├── .clasp.example.json
├── apps-script/
│   ├── appsscript.json
│   ├── 00_config.gs
│   ├── 01_auth_codigo.gs
│   ├── 02_minha_situacao.gs
│   ├── 03_webapp.gs
│   └── 99_tests.gs
└── web/
    ├── index.html
    ├── style.css
    └── app.js
```

## Como abrir a interface local

Abra o arquivo `web/index.html` em um navegador. A tela atual é estática e usa apenas simulações locais em `web/app.js`.

## Deploy do Apps Script

O arquivo `.clasp.json` local deve apontar `rootDir` para `apps-script`, para que o `clasp push` envie apenas o backend em Apps Script e nao envie os arquivos do frontend estatico em `web/`.

Por seguranca, `.clasp.json` fica no `.gitignore`, pois pode conter o `scriptId` real do projeto. Use `.clasp.example.json` como modelo ao configurar uma nova maquina.

## Próximos passos

- Definir o contrato final entre o portal web e o Web App do Apps Script.
- Criar armazenamento seguro para códigos temporários.
- Implementar envio de código para o e-mail cadastrado.
- Integrar a leitura de dados oficiais via GEAPA-CORE.
- Garantir que cada token consulte somente dados do próprio membro.
- Adicionar testes de contrato para os endpoints do Apps Script.
- Avaliar arquivos de PWA, como `manifest.webmanifest` e service worker, quando a experiência offline/instalável for priorizada.
