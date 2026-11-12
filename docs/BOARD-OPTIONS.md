# Diretoria: descoberta de operações

O menu Opções de Cargos e Competências utiliza `header()` e os controles de restrição do Design System. As nove entradas apresentam oito tipos de proposta e a consulta de procedimentos. Os formulários continuam em Governança; não há executor novo.

O leitor `board-competencies-v1` aceita o campo opcional `actionCatalog`, com versão `board-action-catalog-v1`, validade e itens resolvidos pelo Core. O catálogo é apresentação, nunca prova de autorização. Sem catálogo válido, as entradas permanecem bloqueadas. Cargo exibido, contagem de permissões e cache não habilitam ações.

O Core resolve função vigente, policy nominal, capacidade de propor, controles, gestão e consulta de Governança. O pedido voluntário carrega apenas a própria pessoa e função. Requisitos do destinatário, aceite, fundamento e efetivação continuam nos comandos existentes. Permitir abrir uma proposta não equivale a permitir efetivá-la.

Itens bloqueados têm botão desabilitado e explicação separada acessível por teclado e toque. Não abrem formulários nem fazem consultas protegidas. A consulta de Perfis e permissões é oferecida pela explicação somente quando a navegação autoriza essa rota.

O encaminhamento revalida tipo, gestão, pessoa e função contra o catálogo atual de Governança antes de preencher o formulário. Contexto consumido ou limpo por mudança de sessão não é reaproveitado. Revisão, confirmação e autorização no servidor permanecem obrigatórias.

Validação local: `npm run verify`; prévia sintética em `tests/visual/board-options.html`, servida pelo servidor de fixtures. Cenários Diretor, Presidência e Controle fechado não usam Firebase nem identidades reais. Não são prova de autenticação produtiva e não são publicados no Hosting.

Publicação incremental: Core compatível primeiro; depois `board-competencies.mjs`, `board-procedures.mjs` e `design-system.css`. Nenhuma policy, regra, dado ou configuração de autenticação faz parte deste delta. Revalidar o manifesto privado e a versão efetiva antes da promoção. PROD exige autorização específica.
