# Rotas Protegidas do Portal GEAPA

Este documento descreve a politica visual de navegacao do Portal GEAPA.

O Portal nao le planilhas diretamente e nao calcula vinculo, cargo, perfil ou
permissao institucional. A fonte de verdade continua sendo o GEAPA-CORE. O
front-end apenas consome a sessao resolvida e aplica essa informacao na
navegacao, no menu e no bloqueio visual de rotas.

## Fontes de decisao

- `PORTAL_PERFIS`: define os perfis possiveis no ecossistema.
- `PORTAL_PERMISSOES`: fonte oficial das permissoes efetivas.
- `PESSOAS_RESUMO_OPERACIONAL`: base operacional futura para identidade,
  vinculo atual, perfil calculado e portal ativo.
- `VIGENCIAS_RESUMO_ATUAL`: base operacional futura para cargos e funcoes
  atuais.
- `CARGOS_CONFIG`: pode indicar qual perfil um cargo gera, mas nao deve ser
  fonte final de permissoes no Portal.

`ADMIN` nao e concedido automaticamente por cargo de diretoria. O perfil
administrativo deve vir de autorizacao explicita do CORE.

## Implementacao no front-end

- Matriz de rotas: `web/assets/js/navigation.js`.
- Adapter temporario de sessao: `web/assets/js/auth-adapter.js`.
- Perfil/permissoes em memoria: `web/assets/js/auth.js`.
- Placeholders protegidos: secao reutilizavel `#tela-placeholder`.
- Acesso negado: secao reutilizavel `#tela-acesso-negado`.

O adapter atual aceita a sessao resolvida em `data.sessao` e tambem usa
`PortalGeapaAuth.getUsuarioAtual()` com o token em `sessionStorage` como
compatibilidade temporaria. Quando existir uma funcao como
`corePortalResolverUsuarioAtual`, a troca deve acontecer no adapter, nao
espalhada pelo app. O contrato detalhado esta em `docs/SESSAO_PORTAL_CORE.md`.

## Perfis previstos

- `ADMIN`
- `DIRETORIA`
- `SECRETARIA`
- `COMUNICACAO`
- `CONSELHO`
- `MEMBRO`
- `EGRESSO`
- `COLABORADOR`
- `EXTERNO`
- `VISITANTE`

Regras importantes:

- `EGRESSO` tem acesso limitado e regras historicas devem ser resolvidas no
  backend, por exemplo apresentacoes ate a data de saida.
- `COLABORADOR` tem acesso limitado a fluxos permitidos.
- `EXTERNO` deve acessar apenas areas publicas ou proprias quando existirem.
- `CONSELHO` nao recebe permissoes administrativas por padrao.
- `ADMIN` depende de autorizacao explicita vinda do CORE.

## Grupos do menu

Grupos vazios nao aparecem no menu.

- Area do membro: Minha situacao, Minhas apresentacoes, Frequencia.
- Atividades: Atividades, Gestao de atividades.
- Gestao: Diretoria, Secretaria, Comunicacao, Conselho.
- Administracao: Administracao, Logs.
- Publico / Geral: Inicio, Historico de apresentacoes.

Rotas sem acesso nao aparecem no menu. Tentativas diretas via hash ou JS passam
pelo mesmo guard.

## Matriz inicial

| Rota | Grupo | Perfis | Permissoes | Status |
| --- | --- | --- | --- | --- |
| `inicio` | Publico / Geral | Todos | `portal:acessar` | Placeholder |
| `minha-situacao` | Area do membro | MEMBRO, DIRETORIA, SECRETARIA, COMUNICACAO, CONSELHO, ADMIN | `situacao:ver_propria` | Implementada |
| `minhas-apresentacoes` | Area do membro | MEMBRO, DIRETORIA, SECRETARIA, COMUNICACAO, CONSELHO, EGRESSO, ADMIN | `situacao:ver_propria`, `apresentacoes:ver_propria`, `apresentacoes:ver_ate_saida` | Implementada V2 com acoes de titulo/eixos e material |
| `frequencia` | Area do membro | MEMBRO, DIRETORIA, SECRETARIA, ADMIN | `situacao:ver_propria`, `presencas:ler` | Implementada, read-only V2 |
| `justificativas` | Area do membro | MEMBRO, DIRETORIA, SECRETARIA, ADMIN | `situacao:ver_propria`, `justificativas:ver_proprias` | Implementada V2 com envio de justificativa |
| `atividades` | Atividades | Todos | `atividades:ver` | Implementada |
| `gestao-atividades` | Atividades | DIRETORIA, SECRETARIA, COMUNICACAO, ADMIN | `atividades:gerir` | Placeholder |
| `diretoria` | Gestao | DIRETORIA, ADMIN | `membros:ler`, `atividades:gerir` | Placeholder |
| `secretaria` | Gestao | SECRETARIA, DIRETORIA, ADMIN | `membros:ler`, `presencas:gerir`, `apresentacoes:gerir` | Placeholder |
| `comunicacao` | Gestao | COMUNICACAO, DIRETORIA, ADMIN | `atividades:gerir`, `mensageria:ler` | Placeholder |
| `admin-justificativas` | Gestao | SECRETARIA, DIRETORIA, ADMIN | `justificativas:analisar` | Implementada V2 para analise de justificativas |
| `admin-apresentacoes` | Gestao | SECRETARIA, DIRETORIA, ADMIN | `apresentacoes:gerir` | Implementada V2 para revisao de titulo/eixos e material |
| `painel-diretoria-v2` | Gestao | DIRETORIA, SECRETARIA, ADMIN, ADMIN_TECNICO | `diretoria:painel_v2`, `diretoria:pendencias`, `sistema:status_v2`, `sistema:admin`, `atividades:gerir`, `membros:ler`, `justificativas:analisar` | Implementada, read-only V2 |
| `pendencias-diretoria` | Gestao | DIRETORIA, SECRETARIA, ADMIN | `diretoria:pendencias`, `membros:ler`, `atividades:gerir`, `justificativas:analisar` | Implementada, read-only V2 |
| `status-v2` | Gestao | DIRETORIA, SECRETARIA, ADMIN | `sistema:status_v2`, `sistema:admin`, `atividades:gerir`, `membros:ler` | Implementada, read-only V2 |
| `conselho` | Gestao | CONSELHO, DIRETORIA, ADMIN | `portal:acessar` | Placeholder |
| `administracao` | Administracao | ADMIN | `sistema:admin` | Placeholder |
| `logs` | Administracao | ADMIN, DIRETORIA | `logs:ler` | Placeholder |

O contrato oficial agora espera permissoes canonicas no formato `dominio:acao`
em `data.sessao.permissoes`. Para respostas legadas que ainda nao tragam
permissoes canonicas, a politica visual tolera perfis permitidos para nao
bloquear a V1 do Portal. Quando a sessao traz permissoes canonicas, o guard
exige que a rota tenha ao menos uma permissao efetiva correspondente.

## Motivos de bloqueio

- `NOT_AUTHENTICATED`: "Faca login para acessar esta area."
- `PORTAL_INATIVO`: "Seu acesso ao Portal GEAPA esta inativo no momento."
- `PERFIL_NAO_AUTORIZADO`: "Seu perfil atual nao possui acesso a esta area."
- `PERMISSAO_INSUFICIENTE`: "Seu perfil atual nao possui permissao para acessar esta area."
- `ROTA_INEXISTENTE`: "Area indisponivel no Portal GEAPA."

## Cenarios manuais

1. MEMBRO comum: ve Minha situacao, Atividades e Minhas apresentacoes; nao ve
   Diretoria ou Administracao.
2. DIRETORIA: ve Minha situacao, Atividades, Diretoria, Gestao de atividades e
   Logs quando o CORE conceder permissao efetiva; nao vira ADMIN automaticamente.
3. SECRETARIA: ve Secretaria e rotas operacionais permitidas; nao ve
   Administracao.
4. COMUNICACAO: ve Comunicacao e atividades permitidas; nao ve Secretaria ou
   Administracao.
5. CONSELHO: ve Conselho e areas permitidas; nao recebe permissoes
   administrativas por padrao.
6. EGRESSO: ve areas limitadas; nao ve frequencia interna, diretoria ou gestao.
   Regras de apresentacoes ate a saida devem ser aplicadas no backend/CORE.
7. VISITANTE: ve apenas Inicio e Atividades publicas quando essas rotas forem
   expostas publicamente. Apresentacoes nao têm aba separada; aparecem como
   dados vinculados as atividades.
8. ADMIN: ve as areas administrativas quando o perfil/permissao vier do CORE.

## Como adicionar uma nova rota protegida

1. Adicionar a rota na matriz `ROTAS_PORTAL` em `web/assets/js/navigation.js`.
2. Informar `id`, `label`, `path`, `viewClass`, `sectionId`, `grupoMenu`,
   `perfisPermitidos`, `permissoesNecessarias`, `requerLogin`, `mostrarNoMenu`,
   `ordem`, `descricao` e `status`.
3. Se a tela real ainda nao existir, usar `view-placeholder` e
   `sectionId: "tela-placeholder"`.
4. Se a tela carregar dados, escutar o evento `portal:navigationchange`.
5. Revalidar qualquer leitura ou escrita no Apps Script/CORE.

## Rotas V2 somente leitura

As rotas `frequencia`, `minhas-apresentacoes`, `justificativas`,
`admin-apresentacoes`, `pendencias-diretoria` e `status-v2` usam a tela reutilizavel
`#tela-placeholder` com renderizacao em `web/assets/js/portal-v2-readonly.js`.
A rota `painel-diretoria-v2` usa o mesmo placeholder, mas renderiza o painel
agregado em `web/assets/js/painel-diretoria-v2.js`. O bloqueio visual continua
no `navigation.js`, mas a autorizacao real e o filtro de dados acontecem no
Apps Script.

Membro comum recebe apenas dados proprios. Rotas de diretoria dependem de
perfil/permissao enviados pelo backend; o frontend nao deriva cargo, diretoria
ou permissao a partir de dados locais.
