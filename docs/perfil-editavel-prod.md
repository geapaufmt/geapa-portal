# Perfil editavel e correcoes cadastrais - PROD

O backend foi publicado com `GEAPA_CORE` v12 e Portal Apps Script v89. A
ativacao visual permanece protegida por `ENABLE_PROFILE_UPDATES=false` ate a
infraestrutura cadastral PROD cumprir os pre-requisitos abaixo.

## Contrato de ambiente

O Apps Script define `PORTAL_CONFIG.ambientePerfilCadastral = PROD`. Esse valor
e capturado na versao imutavel usada pelo deployment e nunca vem do navegador.
O wrapper repassa ao Core apenas o ambiente resolvido no backend.

O frontend habilita as acoes quando:

- `ENVIRONMENT` e `PROD` ou `HOMOLOG`;
- `ENABLE_PROFILE_UPDATES` e `true` depois da liberacao operacional;
- a sessao backend contem as permissoes exigidas.

O Core continua revalidando sessao, propriedade e permissao em todas as
escritas. O frontend nao escolhe `ID_PESSOA` nem concede acesso administrativo.

## Bloqueio operacional atual

O Registry possui `PESSOAS_V2_BASE` e
`PESSOAS_V2_SOLICITACOES_ATUALIZACAO_CADASTRAL` apenas em `DEV`. O Core v12
recusa fallback de `PROD` para `DEV` ou `ALL`, portanto a feature nao pode ser
ativada antes de existir uma base V2 oficial registrada em `PROD`.

Ordem para liberar a feature:

1. registrar a `PESSOAS_V2_BASE` oficial com ambiente `PROD`;
2. executar o setup PROD do Core em dry-run;
3. executar o setup real com a confirmacao dedicada;
4. executar `geapaCoreRunTestesAtualizacaoCadastral()`;
5. alterar `ENABLE_PROFILE_UPDATES` para `true`;
6. publicar novamente somente o Firebase Hosting.

## Validacao

```powershell
npm.cmd run test:profile-prod
npm.cmd run test:profile-homolog
npm.cmd run test:minha-situacao-route
npm.cmd run check:configs
```

O deployment PROD atual e `@89`; HOMOLOG permanece em `@88`. Enquanto a flag
estiver desligada, o perfil continua em modo de leitura e a rota administrativa
de correcoes cadastrais nao e exibida.

## Rollback futuro

- retornar o deployment Apps Script PROD para `@87`;
- restaurar a release Firebase anterior;
- manter o Portal apontando para Core v11;
- preservar solicitacoes ja registradas como trilha auditavel.
