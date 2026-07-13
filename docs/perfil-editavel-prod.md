# Perfil editavel e correcoes cadastrais - preparacao PROD

Esta branch prepara o Portal para producao sem executar `clasp push`, criar
versao Apps Script, atualizar deployment, fazer merge ou publicar Firebase.

## Contrato de ambiente

O Apps Script define `PORTAL_CONFIG.ambientePerfilCadastral = PROD`. Esse valor
e capturado na versao imutavel usada pelo deployment e nunca vem do navegador.
O wrapper repassa ao Core apenas o ambiente resolvido no backend.

O frontend habilita as acoes quando:

- `ENVIRONMENT` e `PROD` ou `HOMOLOG`;
- `ENABLE_PROFILE_UPDATES` e `true`;
- a sessao backend contem as permissoes exigidas.

O Core continua revalidando sessao, propriedade e permissao em todas as
escritas. O frontend nao escolhe `ID_PESSOA` nem concede acesso administrativo.

## Dependencia planejada

O manifesto reserva `GEAPA_CORE` v12 com `developmentMode=false`. A versao 12
ainda nao deve ser consumida ou enviada pelo `clasp` antes de ser publicada no
Core apos revisao. A ordem futura obrigatoria e:

1. executar setup PROD do Core em dry-run;
2. executar setup real somente apos aprovacao;
3. publicar e testar Core v12;
4. executar `clasp push` no Portal;
5. criar nova versao do Portal;
6. atualizar apenas o deployment PROD;
7. somente depois promover o frontend Firebase.

## Validacao

```powershell
npm.cmd run test:profile-prod
npm.cmd run test:profile-homolog
npm.cmd run test:minha-situacao-route
npm.cmd run check:configs
```

O deployment PROD atual deve permanecer em `@87` durante a revisao. O merge da
branch tambem deve permanecer bloqueado ate a Library v12 existir e o setup
PROD ter sido validado.

## Rollback futuro

- retornar o deployment Apps Script PROD para `@87`;
- restaurar a release Firebase anterior;
- manter o Portal apontando para Core v11;
- preservar solicitacoes ja registradas como trilha auditavel.
