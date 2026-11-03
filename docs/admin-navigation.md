# Navegação administrativa e descoberta institucional

`src/components/admin-navigation.mts` organiza links de rotas existentes em Pessoas, Atividades e Gestão Institucional. O menu lateral mantém os módulos e as páginas independentes; os links antigos continuam registrados em `src/session/navigation.mjs`. Não há carregamento paralelo das seções.

O Core acrescenta `navigation` ao contexto ACT: `schemaVersion`, `director`, `validUntil` e permissões de seção. A condição de diretor usa a identificação institucional e as funções canônicas vigentes. `board` ou `DEV_ADMIN` não comprovam, isoladamente, uma função diretiva. As indicações de seção apenas restringem os guards existentes; nunca concedem autorização. Leitores e comandos continuam revalidando identidade, função, capability, policy, recurso e estado no backend.

Para diretores vigentes, o catálogo explícito de funcionalidades administrativas seguras pode mostrar controles indisponíveis. `restricted(label, reason)` gera um botão desabilitado, cadeado e botão separado de explicação. Não inclua URLs de execução, dados privados nem ferramentas técnicas no catálogo. O modal reutiliza o gerenciamento de foco/Escape do Design System. O acesso a Perfis e permissões é oferecido somente quando a rota é autorizada. Não atribua competências a um cargo sem informação canônica.

`renderSections` utiliza links, `aria-current` e rolagem horizontal responsiva. `sideRoutes` reutiliza o registro de rotas. `isModuleActive` mantém o módulo destacado ao abrir uma seção. Os menus de atividades preservam as ações retornadas pelo Core; opções adicionais de descoberta são sempre desabilitadas.

A renovação de contexto emite `portal:act-context-ready`, mesmo sem alteração de capabilities. Isso restaura a navegação após a renovação sem recarregar o conteúdo ou disparar consultas de seções bloqueadas. Logout, expiração e troca de sessão invalidam a descoberta. Nenhum token é armazenado pelo componente.

Validação: `npm ci`, `npm run verify`. A prévia `tests/visual/navigation.html` contém somente dados sintéticos e não pertence ao inventário de Hosting. Publicação substitui apenas os assets aprovados e preserva configuração, overlays e demais arquivos da versão corrente.
