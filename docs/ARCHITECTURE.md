# Fronteira Portal / Core

O Portal contém navegação, formulários, componentes, Design System e clientes de API. O Core contém domínio, contratos, autorização e operações transacionais. O navegador não é fonte de vínculo, função, revisão ou permissão.

`config/assets.json` mapeia fontes editáveis às URLs estáveis do Hosting. Três componentes `.mts` são compilados com TypeScript fixado no lockfile; módulos JavaScript recuperados do release permanecem editáveis sem transformação. As variantes DEV preservam seus próprios endpoints e configuração Firebase.

Os módulos de frontend antes mantidos em `portal-integration` do checkpoint Core passam a ser mantidos aqui. Não copiar alterações de volta para criar duas fontes editáveis concorrentes. O checkpoint original permanece como evidência histórica; a sequência de desenvolvimento passa pelo PR deste repositório.

O diretório `legacy` não é carregado pelo Portal moderno nem incluído no artefato. Repositórios `geapa-membros` e `geapa-atividades` preservam compatibilidade e histórico; regras novas pertencem ao Core.

O build não concede autoridade. Seletores nominais privados são parâmetros de ambiente, continuam sujeitos a Auth, App Check e autorização do Core. Uma prévia sem esses parâmetros não deve ser tratada como release operacional.
