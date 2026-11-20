# Diferenças em relação à principal em 20/11/2026

Base comparada: `73d1483e4da42dcbdd086b35724df596d157cf2d`. Os manifestos em `releases/20261120` contêm o caminho e o SHA-256 gzip de cada arquivo, inclusive os coincidentes. As tabelas identificam a fonte vencedora de cada diferença. A coincidência de um objeto comprova os bytes e não determina autoria nem a primeira introdução da mudança.

As diferenças abaixo ficam reproduzíveis no respectivo commit de release. Na ponta de desenvolvimento foram integrados o fluxo extraordinário nos cartões, formulários, sessão e contratos, e a rota DEV de semestre. Os demais itens mantêm seu comportamento identificável na revisão de cada ambiente.

## PROD

| Caminho oficial | Fonte versionada | Origem conferida | Função na publicação |
|---|---|---|---|
| `/assets/act-command/act-flow-contracts.mjs` | `src/services/act-flow-contracts.mjs` | fonte estática de entrega `theme-extraordinary-20261120` | Expõe as rotas e tipos de comando aceitos pelo fluxo de atividades e apresentações. |
| `/assets/act-command/act-flow-executor-routes.json` | `src/services/act-flow-executor-routes.json` | fonte estática de entrega `theme-extraordinary-20261120` | Seleciona as rotas atendidas pelo executor do ambiente. DEV inclui o salvamento de semestre. |
| `/assets/act-command/command-contract.mjs` | `src/services/command-contract.mjs` | fonte estática de entrega `theme-extraordinary-20261120` | Valida o envelope dos comandos extraordinários de tema e os tipos aceitos na versão. |
| `/assets/act-command/member-operations.mjs` | `src/services/member-operations.mjs` | commit do checkpoint `b1722dd07218` | Mantém o catálogo de operações de membros aplicado antes da integração mais recente de Frequência/RH. |
| `/assets/act-command/specialized-readers-config.mjs` | `src/services/specialized-readers-config.mjs` | objeto Git `b3cb609d9f06` | Seleciona os leitores especializados disponíveis na composição de produção. |
| `/assets/act-ui/admin-navigation.mjs` | `src/components/admin-navigation.mts` | commit do checkpoint `b1722dd07218` | Preserva o menu administrativo que antecede o agrupamento Vigências da principal. |
| `/assets/act-ui/admin-panels.mjs` | `src/components/admin-panels.mts` | fonte TypeScript do Git `f906579ec88c` | Preserva os painéis administrativos e o editor de ciclos da publicação. |
| `/assets/act-ui/admin-solicitacoes-vinculo.js` | `src/modules/admin-solicitacoes-vinculo.js` | commit do checkpoint `b1722dd07218` | Preserva a interface de solicitações de vínculo da publicação. |
| `/assets/act-ui/atividades.js` | `src/modules/atividades.js` | objeto Git `ab957d28439c` | Preserva o módulo de atividades e chamada da composição PROD. |
| `/assets/act-ui/board-competencies.mjs` | `src/components/board-competencies.mts` | commit do checkpoint `b1722dd07218` | Mantém a apresentação de competências da diretoria compatível com esta publicação. |
| `/assets/act-ui/board-procedures.mjs` | `src/components/board-procedures.mts` | commit do checkpoint `b1722dd07218` | Recompõe os procedimentos e deliberações eletrônicas específicos desta edição. |
| `/assets/act-ui/design-system.css` | `src/styles/design-system.css` | objeto Git `59f9a0190d06` | Recupera as regras visuais da composição PROD. |
| `/assets/act-ui/design-system.mjs` | `src/components/design-system.mts` | commit do checkpoint `b1722dd07218` | Recompõe os controles e diálogos utilizados pelos componentes desta edição. |
| `/assets/act-ui/functional-governance.mjs` | `src/modules/functional-governance.mjs` | objeto Git `718daa49e9f2` | Mantém a interface de governança funcional vigente na publicação. |
| `/assets/act-ui/institutional-directory.mjs` | `src/components/institutional-directory.mts` | commit do checkpoint `b1722dd07218` | Mantém o diretório institucional compatível com a governança publicada. |
| `/assets/act-ui/institutional-governance-search.mjs` | `src/components/institutional-governance-search.mts` | commit do checkpoint `b1722dd07218` | Preserva a pesquisa e os filtros de governança da edição. |
| `/assets/act-ui/institutional-governance.mjs` | `src/components/institutional-governance.mts` | commit do checkpoint `b1722dd07218` | Recupera a navegação e edição dos registros de governança da edição. |
| `/assets/act-ui/institutional-minutes.mjs` | `src/components/institutional-minutes.mts` | commit do checkpoint `b1722dd07218` | Recupera a edição das atas e o tratamento de rascunhos da edição. |
| `/assets/act-ui/institutional-norms.mjs` | `src/components/institutional-norms.mts` | commit do checkpoint `b1722dd07218` | Recupera a interface de normas e registros documentais da edição. |
| `/assets/act-ui/model-frequency-editor.mjs` | `src/components/model-frequency-editor.mts` | commit do checkpoint `b1722dd07218` | Mantém o editor de regras de frequência da composição PROD. |
| `/assets/act-ui/portal-v2-readonly.js` | `src/modules/portal-v2-readonly.js` | fonte estática de entrega `theme-extraordinary-20261120` | Integra ações da regularização de tema aos cartões e ao registro documental. |
| `/assets/physical-560120e5c1fbb33e/act-session.mjs` | `src/session/act-session.mjs` | fonte estática de entrega `theme-extraordinary-20261120` | Preserva o ciclo de contexto da sessão e o encaminhamento das ações disponíveis no ambiente. |
| `/assets/physical-560120e5c1fbb33e/app.mjs` | `src/session/app.mjs` | commit do checkpoint `b1722dd07218` | Mantém o bootstrap publicado. Em DEV recupera a composição da correção de oscilação da sessão. |
| `/assets/physical-560120e5c1fbb33e/bootstrap-state.mjs` | `src/session/bootstrap-state.mjs` | commit do checkpoint `b1722dd07218` | Reproduz as transições de estado do carregamento e da sessão. |
| `/assets/physical-560120e5c1fbb33e/navigation.mjs` | `src/session/navigation.mjs` | commit do checkpoint `b1722dd07218` | Mantém a navegação compatível com o conjunto de telas publicado em PROD. |
| `/assets/act-ui/theme-extraordinary.mjs` | `src/components/theme-extraordinary.mts` | commit do checkpoint `b1722dd07218` | Recupera o TypeScript dos formulários de autorização, revogação e registro posterior. |
| `/assets/act-ui/attendance-rh.mjs` | `src/components/attendance-rh.mts` | Apenas na principal comparada | Central de Frequência/RH preservada no desenvolvimento. A publicação PROD tem 146 caminhos. |

## DEV

| Caminho oficial | Fonte versionada | Origem conferida | Função na publicação |
|---|---|---|---|
| `/assets/act-command/act-flow-contracts.mjs` | `config/variants/dev/src/services/act-flow-contracts.mjs` | objeto Git `fa78fb15090e` | Expõe as rotas e tipos de comando aceitos pelo fluxo de atividades e apresentações. |
| `/assets/act-command/act-flow-executor-routes.json` | `config/variants/dev/src/services/act-flow-executor-routes.json` | commit do checkpoint `0db704d1bcbc` | Seleciona as rotas atendidas pelo executor do ambiente. DEV inclui o salvamento de semestre. |
| `/assets/act-command/command-contract.mjs` | `src/services/command-contract.mjs` | objeto Git `04588b21843e` | Valida o envelope dos comandos extraordinários de tema e os tipos aceitos na versão. |
| `/assets/act-command/dev-app-check.mjs` | `src/services/dev-app-check.mjs` | fonte estática de entrega `browser-app-check-dev-20261103` | Preserva a instrumentação de fases do App Check específica da publicação DEV. |
| `/assets/act-command/dev-scope.mjs` | `config/variants/dev/src/services/dev-scope.mjs.template` | template recuperado e parametrizado `account-binding-admin-20261111` | Reconstitui a seleção da fixture de DEV e parametriza seu identificador fora do Git. |
| `/assets/act-ui/board-procedures.mjs` | `src/components/board-procedures.mts` | commit do checkpoint `0db704d1bcbc` | Recompõe os procedimentos e deliberações eletrônicas específicos desta edição. |
| `/assets/act-ui/design-system.mjs` | `src/components/design-system.mts` | commit do checkpoint `0db704d1bcbc` | Recompõe os controles e diálogos utilizados pelos componentes desta edição. |
| `/assets/act-ui/institutional-directory.mjs` | `src/components/institutional-directory.mts` | fonte TypeScript do Git `7683c7deb2ea` | Mantém o diretório institucional compatível com a governança publicada. |
| `/assets/act-ui/institutional-governance-search.mjs` | `src/components/institutional-governance-search.mts` | commit do checkpoint `0db704d1bcbc` | Preserva a pesquisa e os filtros de governança da edição. |
| `/assets/act-ui/institutional-governance.mjs` | `src/components/institutional-governance.mts` | commit do checkpoint `0db704d1bcbc` | Recupera a navegação e edição dos registros de governança da edição. |
| `/assets/act-ui/institutional-minutes.mjs` | `src/components/institutional-minutes.mts` | commit do checkpoint `0db704d1bcbc` | Recupera a edição das atas e o tratamento de rascunhos da edição. |
| `/assets/act-ui/institutional-norms.mjs` | `src/components/institutional-norms.mts` | fonte TypeScript do Git `af66418aecc5` | Recupera a interface de normas e registros documentais da edição. |
| `/assets/act-ui/portal-design.css` | `src/styles/portal-design.css` | objeto Git `52568511234a` | Recupera a folha de estilos e a apresentação do portal servido em DEV. |
| `/assets/act-ui/portal-v2-readonly.js` | `config/variants/dev/src/modules/portal-v2-readonly.js` | objeto Git `6ea34947d3e4` | Integra ações da regularização de tema aos cartões e ao registro documental. |
| `/assets/act-ui/theme-extraordinary.mjs` | `src/components/theme-extraordinary.mts` | fonte TypeScript do Git `6e24c11ff906` | Recupera o TypeScript dos formulários de autorização, revogação e registro posterior. |
| `/assets/physical-560120e5c1fbb33e/act-session.mjs` | `src/session/act-session.mjs` | commit do checkpoint `0db704d1bcbc` | Preserva o ciclo de contexto da sessão e o encaminhamento das ações disponíveis no ambiente. |
| `/assets/physical-560120e5c1fbb33e/app.mjs` | `src/session/app.mjs` | fonte estática de entrega `session-oscillation-20261116` | Mantém o bootstrap publicado. Em DEV recupera a composição da correção de oscilação da sessão. |
| `/assets/physical-560120e5c1fbb33e/auth-persistence.mjs` | `src/session/auth-persistence.mjs` | objeto Git `c3bae8cf85db` | Inicializa o resolvedor de popup do Firebase também em DEV, mantendo a restauração de sessão. |
| `/assets/physical-560120e5c1fbb33e/bootstrap-state.mjs` | `src/session/bootstrap-state.mjs` | objeto Git `62c63adbf630` | Reproduz as transições de estado do carregamento e da sessão. |
| `/assets/physical-560120e5c1fbb33e/browser-services.mjs` | `src/session/browser-services.mjs` | objeto Git `19bc82c186f6` | Disponibiliza a entrada Google no adaptador de serviços de DEV. |
| `/assets/physical-560120e5c1fbb33e/login.mjs` | `src/session/login.mjs` | objeto Git `99be68786075` | Mantém em DEV os caminhos de login por senha e Google e o tratamento de falhas. |
| `/index.html` | `config/variants/dev/public/index.html` | objeto Git `e0a7e38a8cb2` | Conserva a página inicial e a política de conteúdo compatíveis com o login Google em DEV. |
