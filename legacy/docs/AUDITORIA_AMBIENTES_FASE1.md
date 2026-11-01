# Auditoria de ambientes - fase 1

Data da auditoria: 2026-07-03. Esta auditoria usa o codigo dos repositorios e o
inventario de Registry informado para a fase; nenhuma planilha foi alterada.

## Portal e endpoints atuais

O front-end usa um unico endpoint publico do Apps Script, configurado por
`GEAPA_API_BASE_URL`. As acoes enviadas a esse endpoint incluem:

- autenticacao e sessao: `portalLogin`, `minhaSituacao`;
- atividades: `atividadesListar`, `atividadesBundle`, `atividadeDetalhe`;
- chamada: `atividadeChamada`, `atividadeSalvarChamada`;
- frequencia, justificativas e apresentacoes do proprio usuario;
- operacoes administrativas de atividades, apresentacoes e painel V2.

O deployment atual e o mesmo nos antigos perfis DEV/PILOTO. Esta fase nao cria
novo projeto Apps Script nem troca o endpoint usado por membros.

## Firebase e Firestore

- projeto Firebase: `portal-geapa`;
- Hosting principal: canal `live`;
- `portalUsers/{uid}`: privado para o proprio usuario;
- `portalActivities/{idAtividade}`: privado para usuario ativo;
- `portalActivityCalendarSnapshots/current`: leitura publica, sem escrita web;
- nenhuma colecao permite escrita pelo navegador.

Os caminhos `environments/dev/*` e `environments/homolog/*` passam a ser
aceitos pelas Rules, mas esta fase nao move nem copia dados existentes.

## Deploys encontrados

- `firebase-hosting-merge.yml` publicava `live` em todo push para `main`;
- `firebase-hosting-pull-request.yml` ja criava preview de PR;
- `pages.yml` publicava GitHub Pages em todo push para `main`.

A fase 1 remove o deploy automatico de `live` e Pages. Preview de PR continua
automatico, usando configuracao HOMOLOG. Producao passa a exigir
`workflow_dispatch`, confirmacao textual e o GitHub Environment `production`.

## Configuracoes hardcoded encontradas

`web/assets/js/config.js` continha ambiente, endpoint Apps Script, projeto
Firebase e TTLs. Ele passa a ser gerado a partir de `config.dev.js`,
`config.homolog.js` ou `config.prod.js`.

## Registry e bases

Inventario inicial informado:

| Ambiente | Recursos conhecidos |
| --- | --- |
| PROD | `PORTAL_CONFIG`, `PORTAL_PERFIS`, `PORTAL_PERMISSOES`, `PORTAL_LOG_ACESSOS`, `ATIVIDADES_GERAL`, `MAIL_SAIDA`, `NORMAS_PARAMETROS_OPERACIONAIS`, `PORTAL_PUBLIC_*` |
| DEV | `ATIVIDADES_V2_DB`, `ATIVIDADES_V2_PORTAL_CALENDARIO`, `ATIVIDADES_V2_PORTAL_ATIVIDADES_DETALHES`, `PESSOAS_V2_*` |

Como partes do Portal de membros ainda consomem V2 DEV, `config.prod.js` marca
`DATA_ENVIRONMENT=PILOTO_V2_DEV_CONTROLADO`. Nao houve migracao de Registry.

## Apps Script

- Portal usa `GEAPA_CORE` e `GEAPA_ATIVIDADES` em `version: "0"` e
  `developmentMode: true`;
- Atividades usa `GEAPA_CORE` nas mesmas condicoes;
- Core nao possui bibliotecas externas no manifesto.

Esse estado e permitido somente em DEV. Fixar versoes das bibliotecas e manter
deployments candidatos/estaveis e uma pendencia critica da proxima fase e um
bloqueio para declarar o ambiente oficialmente PROD, embora a URL atual possa
continuar operando como PILOTO controlado.
