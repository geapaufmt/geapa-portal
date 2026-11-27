# Desenvolvimento do Portal GEAPA

- Este repositório é a fonte oficial do frontend moderno. `legacy/` é histórico, não autoridade de publicação.
- Novos componentes e funcionalidades: TypeScript incremental, sem novo framework ou reescrita geral.
- Reutilizar Design System, menus, serviços Auth/App Check e clientes de API existentes.
- Regras institucionais, capabilities, policies, CAS e autorização pertencem a `geapaufmt/geapa-core`. Não duplicá-las aqui.
- Preservar logout explícito, restauração Firebase, revogação, isolamento de contas/ambientes, journals e recuperação pelo executor original.
- Executar `npm ci`, `npm run verify` e `node scripts/check-reproducible.cjs` antes do PR.
- Não versionar overlays nominais, tokens, credenciais, dados institucionais ou evidências privadas. Os placeholders de `config/private-parameters.json` têm valores somente fora do Git.
- Sem deploy automático. Publicação requer artefato identificado, testes, revisão e autorização explícita do ambiente. PR/merge não autoriza deploy.
- Nunca criar fatos institucionais em PROD para testar interface. Não mudar policies ou dados nesta campanha de frontend.
- Não apagar checkpoints, não fazer force-push e não restaurar um main antigo sobre uma publicação mais recente.

## Eficiência de contexto e tratamento de legado

- `geapa-core` e `geapa-portal` são os únicos repositórios operacionais do GEAPA.
- Consultar prioritariamente os arquivos diretamente relacionados à tarefa.
- Evitar leituras integrais dos repositórios, auditorias abrangentes e investigações repetitivas sem necessidade concreta.
- Consultar repositórios arquivados, documentação histórica e checkpoints somente quando houver necessidade específica.
- Não utilizar implementações legadas como autoridade operacional ou normativa.
- Priorizar simplicidade, reutilização, eliminação de redundâncias e manutenção de uma única fonte de autoridade.
- Carregar contexto complementar progressivamente, conforme a necessidade da tarefa.
- Preservar os controles de segurança, integridade, autorização, testes e rastreabilidade existentes.
