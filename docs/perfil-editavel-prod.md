# Perfil editavel e correcoes cadastrais - PROD

O fluxo foi homologado com `GEAPA_CORE` v18 e promovido para uma nova versao
imutavel do Portal Apps Script PROD. O frontend PROD usa
`ENABLE_PROFILE_UPDATES=true` somente depois da homologacao do fluxo completo
de gravacao e reconciliacao.

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

## Estado operacional

- Registry e bases V2 DEV/PROD auditados;
- aba `SOLICITACOES_ATUALIZACAO_CADASTRAL` disponivel em PROD;
- Core v18 reduz as leituras do fluxo cadastral para a fila e a fonte oficial
  estritamente necessaria;
- homologacao confirmou gravacao, resposta de sucesso e exibicao da
  solicitacao sem timeout;
- o backend continua impedindo fallback entre DEV e PROD.

## Validacao

```powershell
npm.cmd run test:profile-prod
npm.cmd run test:profile-homolog
npm.cmd run test:minha-situacao-route
npm.cmd run check:configs
```

O deployment `@89` permanece disponivel como rollback. A versao PROD promovida
deve usar Core v18, ambiente cadastral `PROD` e `developmentMode=false`.

## Rollback futuro

- retornar o deployment Apps Script PROD para `@89`;
- restaurar no Hosting `ENABLE_PROFILE_UPDATES=false`;
- manter o Core v18 publicado; o rollback do Portal nao exige apagar a Library;
- preservar solicitacoes ja registradas como trilha auditavel.
