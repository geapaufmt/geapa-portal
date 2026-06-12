# Conteudo Publico Editorial

Este documento registra a fronteira entre o Portal GEAPA e o GEAPA-CORE para o
conteudo publico editorial.

## Responsabilidades

O `geapa-core` e o dono da estrutura e da leitura sanitizada da planilha
`PORTAL_CONTEUDO_PUBLICO`. O portal nao cria planilhas, nao cria abas, nao altera
o Registry e nao acessa IDs fixos de planilhas.

O `geapa-portal` consome apenas o contrato publico do CORE:

```javascript
GEAPA_CORE.corePortalPublicContentBuildPublicSnapshot()
```

No backend do portal, a acao `conteudoPublicoSnapshot` chama esse contrato,
aplica cache curto e devolve um envelope padrao da API.

## Fonte Editorial

`PORTAL_CONTEUDO_PUBLICO` e um CMS editorial publico para paginas e blocos como:

- home;
- sobre;
- historia;
- parceiros;
- documentos publicos;
- configuracoes publicas;
- midias publicas;
- complementos publicos de pessoas;
- complementos publicos de gestoes/diretorias;
- configuracoes publicas de pessoas.

Ela nao e fonte oficial para:

- atividades;
- apresentacoes;
- membros;
- diretoria oficial;
- frequencia;
- permissoes.

## Pessoas Publicas E Gestoes

`PUBLIC_PESSOAS_COMPLEMENTOS` substitui a antiga modelagem especifica
`PUBLIC_DIRETORIA_COMPLEMENTOS`. A chave antiga
`PORTAL_PUBLIC_DIRETORIA_COMPLEMENTOS` deve ser tratada apenas como legado
defensivo pelo CORE enquanto o Registry estiver em transicao.

Essa modelagem nao duplica identidade, cargos ou vinculos. Ela complementa
publicamente pessoas que ja existem em `PESSOAS/PESSOAS v2` e gestoes que ja
existem em `VIGENCIAS/VIGENCIAS v2`.

Grupos publicos previstos para `PUBLIC_PESSOAS_COMPLEMENTOS`:

- `DIRETORIA`;
- `ORIENTADOR`;
- `PROFESSOR_COLABORADOR`;
- `CONSELHEIRO`;
- `MEMBRO_ATUAL`;
- `EX_MEMBRO`;
- `MEMBRO_FUNDADOR`;
- `EX_DIRETOR`;
- `COLABORADOR`;
- `DESTAQUE_INSTITUCIONAL`.

Membros e ex-membros so devem aparecer publicamente com autorizacao explicita de
publicacao. O portal nunca deve exibir CPF, telefone, e-mail pessoal, RGA, data
de nascimento, observacoes internas, frequencia, justificativas, penalidades,
suspensao ou desligamento.

Destinos publicos futuros previstos:

- `publicBoard/current`;
- `publicBoard/history`;
- `publicPeople/orientadores`;
- `publicPeople/membros`;
- `publicPeople/memoria`;
- `publicPages/diretoria`;
- `publicPages/historicoDiretorias`;
- `publicPages/orientadores`;
- `publicPages/memoriaInstitucional`.

## Agenda Publica

Proximas atividades e proximas apresentacoes continuam vindo dos modulos
oficiais, especialmente `geapa-atividades` e suas views/contratos `PORTAL_*`.
Elas nao devem ser editadas como linhas principais da planilha editorial.

No futuro, atividades e apresentacoes publicas podem entrar em um snapshot
publico ou em Firestore como agenda sanitizada, mas a fonte oficial permanece no
modulo de dominio.

## Firestore

Firestore ainda nao esta implementado nesta etapa. Quando entrar, deve funcionar
como espelho publico rapido, nao como fonte principal do sistema.

Fluxo esperado futuro:

```text
Planilhas oficiais / CMS -> GEAPA-CORE e modulos -> snapshot publico -> Firestore -> Portal
```

## Backend Do Portal

Arquivo:

```text
apps-script/06_public_content_consumer.gs
```

Funcoes principais:

- `portalConteudoPublicoSnapshot(options)`;
- `portalConteudoPublicoDiagnostics()`.

A primeira pode ser chamada pelo Web App via:

```text
acao=conteudoPublicoSnapshot
```

`forceRefresh=true` pode ser usado em teste para ignorar o cache curto.

## Front-end

Arquivo:

```text
web/assets/js/public-content.js
```

O modulo expoe `window.PortalGeapaPublicContent` com funcoes de leitura:

- `carregarSnapshotConteudoPublico(options)`;
- `carregarPaginaPublica(slug, options)`;
- `carregarHomePublica(options)`;
- `carregarDiretoriaPublica(options)`;
- `carregarPessoasPublicas(options)`;
- `carregarGestoesPublicas(options)`;
- `carregarParceirosPublicos(options)`;
- `carregarDocumentosPublicos(options)`;
- `carregarAtividadesPublicas()`;
- `carregarApresentacoesPublicas()`.

As funcoes de atividades e apresentacoes retornam erro controlado por enquanto,
porque a agenda publica nao pertence ao CMS editorial. Ela deve vir do modulo
`geapa-atividades`.

O modulo usa `sessionStorage` com TTL curto e fallback local vazio para manter a
interface resiliente se o backend estiver indisponivel.

Rotas publicas atualmente ligadas ao snapshot editorial:

- `inicio`, usando `pages.home`;
- `sobre`, usando `pages.sobre`;
- `historia`, usando `pages.historia`;
- `parceiros`, usando `pages.parceiros`;
- `documentos`, usando `documents`;
- `diretoria`, usando `managementComplements`, `peopleComplements` e legado
  `boardComplements`;
- `orientadores`, usando `peopleComplements`;
- `membros`, usando `peopleComplements`.

As rotas de pessoas podem aparecer vazias ate o CORE publicar as novas funcoes
de leitura de `PUBLIC_PESSOAS_COMPLEMENTOS`,
`PUBLIC_GESTOES_COMPLEMENTOS` e `PUBLIC_PESSOAS_CONFIG`.

## Seguranca

O CORE ja retorna apenas linhas publicaveis e sanitizadas. Mesmo assim, o portal
nao deve acrescentar colunas extras nem tentar reconstruir dados sensiveis.

Nunca expor no front-end:

- dados reais de membros;
- RGA de terceiros;
- e-mail privado;
- presencas;
- faltas;
- justificativas;
- permissoes;
- IDs privados de planilhas;
- tokens ou credenciais.
