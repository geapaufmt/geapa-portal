# Diretório administrativo de Pessoas

A rota administrativa preferida é `#/admin/pessoas`. `#/admin/membros` permanece um alias; o diretório público continua separado.

O frontend usa o sinal canônico `members.canReadPeople` apenas para escolher o leitor. A autorização efetiva ocorre novamente no Core, com `PEOPLE_DIRECTORY_READ`, função/vínculo vigentes, escopo de pessoas e máscaras. Sem esse sinal, permanece o contrato de Membros previamente autorizado; não há ampliação automática.

- `src/components/people-directory.mts`: cards, filtros e corpo do modal, sem regras institucionais.
- `src/modules/admin-membros.js`: paginação e estados da consulta, integração com serviços existentes, cancelamento lógico de respostas antigas.
- `/admin/pessoas`: `query`, `category`, `state`, `role`, `order`, `page`, `pageSize` e snapshot opcional nas páginas seguintes.
- `/admin/pessoas/detalhe`: somente `personId`.
- Busca, ordenação e filtros são resolvidos no backend; o navegador recebe somente a página autorizada.
- Campos ausentes da máscara são omitidos; nenhuma categoria é inferida pela ausência de vínculo.
- Contatos, documentos, nascimento e dados privados não integram esse leitor geral. Os procedimentos de correção já existentes continuam separados.
- O snapshot rejeita paginação sobre um conjunto alterado; logout invalida as respostas e fecha o detalhe.

TypeScript incremental, Design System e serviços Auth/App Check existentes. `npm ci`, `npm run verify`, `node scripts/check-reproducible.cjs`. Evidências e manifestos nominais não pertencem ao repositório.

Publicação do código não autoriza ativar o novo escopo em PROD. Os testes visuais locais não substituem a prova autenticada em DEV.
