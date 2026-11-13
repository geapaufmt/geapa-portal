# Contas de acesso no detalhe de Pessoas

O componente TypeScript `src/components/account-binding.mts` é montado pelo detalhe existente de Pessoas, com Design System, facade e sessão atuais. A importação parte de `people-directory.mts`; nenhum framework novo foi introduzido.

O botão **Associar conta de acesso** só aparece quando a resposta autorizada do Core indica `canManage=true` e `UNASSOCIATED`. Acesso ao diretório não concede a competência. Associações existentes ou revogadas são exibidas sem ação de substituição; o e-mail só aparece quando obtido pela consulta administrativa autorizada.

Fluxo: informar e-mail Google → conferir CPF/RGA e registrar referência da evidência/titularidade → **Verificar conta** → revisar a conta retornada pelo servidor → confirmação separada → **Confirmar associação**. O formulário explica a independência do e-mail de contato e não contém campo para UID. O valor do identificador é apagado do formulário após a verificação.

O serviço `member-node.mjs`, nas variantes DEV e PROD, usa Auth/App Check e endpoint do ambiente. A rota administrativa dedicada `/admin/pessoas/contas` não passa pelo preparador genérico de comandos. O contrato genérico continua bloqueando associação direta.

Somente o identificador opaco da operação é persistido, por projeto/administrador/pessoa. Reload consulta a operação anterior; resposta desconhecida oferece **Consultar resultado** e, para operação admitida, **Retomar operação**. Não há reenvio automático com novo identificador. Confirmação, retomada e verificação não são executadas durante a montagem do detalhe. Rascunhos são protegidos de renovação silenciosa e respostas antigas são descartadas após troca de identidade, navegação ou fechamento do detalhe.

Testes em `account-binding.test.cjs`, `account-binding-transport.test.cjs` e `bootstrap-session.test.cjs` cobrem visibilidade, escaping, confirmação, mensagens, facade normal, reload, armazenamento mínimo, perda de resposta e troca de identidade. Os testes do Core exercitam a transação e o comando canônico.

O build local contém placeholders privados e está fechado para publicação. A candidata não altera configurações de Auth, App Check, grants, Rules, pessoas ou dados produtivos. A habilitação e prova com conta Google sintética real em DEV são posteriores; ver `geapa-core/docs/account-binding-admin.md`.
