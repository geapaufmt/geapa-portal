# Solicitações voluntárias de vínculo V2 no Portal

O Portal é somente consumidor. A sessão é validada no Apps Script, o ambiente
`DEV` ou `PROD` vem de `portalResolverAmbienteDadosV2_()` e o GEAPA Membros
repete identidade e autorização. O navegador nunca envia pessoa ou vínculo
como alvo confiável.

Na primeira entrega, `ENABLE_VINCULO_REQUESTS` fica `true` apenas em
`config.homolog.js` e `false` em PROD. O bloco do membro integra a tela Minha
Situação; apenas a Diretoria/Secretaria autorizada recebe a subárea
Gestão do GEAPA > Membros > Solicitações de vínculo.

## Ordem de publicação e estado atual

1. Core mesclado e publicado na versão imutável 19;
2. Membros fixado no Core 19, sem `developmentMode`, e publicado na versão
   imutável 5;
3. manifest do Portal fixado no Core 19 e Membros 5, ambos sem
   `developmentMode`;
4. configurar no snapshot Apps Script HOMOLOG `ambienteDadosV2: DEV` e
   `ambientePerfilCadastral: HOMOLOG`;
5. confirmar as entradas DEV do Registry e executar apenas os setups
   previamente revisados, fora desta entrega;
6. publicar backend e frontend apenas em HOMOLOG, gerar `config:homolog` e
   validar cache `portal-geapa-pwa-v113`;
7. manter PROD com a feature desligada até nova promoção formal.

O manifest desta branch já referencia as versões que contêm os contratos V2.
Isso não publica nem habilita o Portal PROD.
