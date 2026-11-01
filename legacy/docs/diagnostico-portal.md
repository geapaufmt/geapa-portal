# Diagnóstico do Portal GEAPA

Este diagnóstico registra o estado atual do repositório antes da criação da
primeira tela mockada de Atividades.

## Stack atual

O portal usa HTML, CSS e JavaScript puro, sem dependências externas e sem
processo de build.

Não foram encontrados arquivos de configuração de Jekyll, Vite, React, Astro ou
outro gerador estático. A página abre diretamente pelo arquivo `web/index.html`.

## Publicação no GitHub Pages

A publicação é feita por GitHub Actions no workflow
`.github/workflows/pages.yml`.

Configuração atual:

- branch de publicação: `main`;
- artefato publicado: pasta `web/`;
- acionamento: push na `main` ou execução manual do workflow;
- deploy: `actions/deploy-pages@v4`.

## Estrutura atual

Arquivos principais:

- `web/index.html`: página principal do portal, com tela de acesso e tela
  "Minha situação";
- `web/style.css`: estilos globais, responsivos e com identidade verde;
- `web/app.js`: cliente atual da API do Apps Script, fluxo de código por e-mail,
  restauração de sessão e renderização de "Minha situação";
- `web/manifest.json`: manifesto PWA inicial;
- `apps-script/`: backend em Apps Script;
- `docs/`: documentação de arquitetura, segurança, contrato da API, matriz de
  dados e checklist de piloto.

## Páginas existentes

Até este diagnóstico, o portal possui uma página HTML principal:

- tela de login por e-mail ou RGA;
- validação por código;
- tela "Minha situação";
- blocos de pendências, participação, Diretoria, certificados e avisos.

Não há rotas ou páginas HTML separadas em `web/pages/`.

## Pontos reaproveitáveis

- Estrutura simples e adequada para GitHub Pages.
- Separação entre front-end público e backend privado.
- Estilos responsivos já suficientes para evoluir com novas telas.
- Cliente atual já respeita a regra de não acessar planilhas diretamente.
- Fluxo de sessão com `sessionStorage` já evita novo login a cada atualização da
  página enquanto a sessão do Apps Script estiver válida.

## Riscos

- `web/app.js` concentra muitas responsabilidades e pode crescer demais se todos
  os próximos módulos forem adicionados nele.
- A tela "Minha situação" e futuras telas operacionais ainda não possuem uma
  navegação interna consolidada.
- As autorizações de perfil ainda não existem no backend para ações
  operacionais como criar atividade, editar atividade ou registrar chamada.
- Qualquer dado mockado deve continuar fictício e sem dados pessoais reais.

## Proposta de evolução

Evoluir por fases, preservando a página atual:

1. manter `web/app.js` responsável pelo fluxo de acesso e "Minha situação";
2. criar arquivos novos e pequenos em `web/assets/js/` para recursos
   operacionais novos;
3. iniciar Atividades em `MOCK_MODE`, sem chamadas reais e sem escrita;
4. documentar o contrato esperado antes da integração com Apps Script;
5. só depois conectar o módulo ao backend, com permissões, logs e validações no
   Apps Script.

Essa abordagem reduz risco de quebrar o portal já publicado e prepara o caminho
para telas futuras sem reescrever a V1.
