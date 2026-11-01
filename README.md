# Portal GEAPA

Frontend oficial: TypeScript incremental e JavaScript, sem framework. Firebase Hosting entrega o Portal; Firebase Auth e App Check autenticam as chamadas ao Core canônico em Cloud Functions Gen2. Firestore e Storage são acessados somente pelos contratos autorizados. Google Sheets não é autoridade operacional.

## Desenvolvimento

Node 22, npm e Git:

```sh
npm ci
npm run verify
node scripts/check-reproducible.cjs
```

O build padrão cria `dist/dev` e `dist/prod` como **prévia fechada**, sem seletores nominais privados. Não publicar essa prévia. Não há deploy automático nem credenciais de deploy no CI.

## Estrutura

- `src/components`: componentes TypeScript (`.mts`), incluindo Design System e menus.
- `src/modules`: interfaces existentes de Atividades, Apresentações, Frequência e Membros.
- `src/session`: Firebase Auth, persistência, bootstrap, revalidação e isolamento.
- `src/services`: clientes de API, comandos, recuperação e Storage.
- `src/styles` e `public`: estilos, identidade e recursos estáticos.
- `config`: inventário de URLs, variantes por ambiente e parâmetros privados sem valores.
- `tests`, `scripts`: regressões de interface, compilação e integridade.
- `releases`: hashes verificáveis das versões publicadas.
- `legacy`: fontes e instruções anteriores preservadas exclusivamente para referência. Não são o caminho de build/deploy atual.

TypeScript é o padrão para componentes novos. JavaScript existente permanece quando a conversão não traz benefício imediato. Identidade: verde `#167D0A`, marrom `#5C371A`, preto `#030302`.

As URLs antigas dos assets são preservadas pelo inventário de build, mesmo quando a fonte foi reorganizada. Não inferir regras de negócio ou permissões no frontend: ações, máscaras e decisões vêm do Core e são revalidadas no envio.

Leia [arquitetura](docs/ARCHITECTURE.md), [releases](docs/RELEASES.md) e [convergência](docs/CONVERGENCE.md). Nunca usar `legacy/web` ou um checkpoint antigo para substituir a versão publicada.
