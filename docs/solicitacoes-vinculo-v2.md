# Solicitações voluntárias de vínculo V2 no Portal

O Portal é somente consumidor. A sessão é validada no Apps Script, o ambiente
`DEV` ou `PROD` vem de `portalResolverAmbienteDadosV2_()` e o GEAPA Membros
repete identidade e autorização. O navegador nunca envia pessoa ou vínculo
como alvo confiável.

Na primeira entrega, `ENABLE_VINCULO_REQUESTS` fica `true` apenas em
`config.homolog.js` e `false` em PROD. O bloco do membro integra a tela Minha
Situação; apenas a Diretoria/Secretaria autorizada recebe a subárea
Gestão do GEAPA > Membros > Solicitações de vínculo.

## Ordem de publicação futura

1. mesclar e publicar uma versão imutável do Core;
2. fixar essa versão no manifest do Membros, removendo qualquer
   `developmentMode`, e publicar uma versão imutável do Membros;
3. atualizar o manifest do Portal para essa nova versão do Membros;
4. configurar no snapshot Apps Script HOMOLOG `ambienteDadosV2: DEV` e
   `ambientePerfilCadastral: HOMOLOG`;
5. confirmar as entradas DEV do Registry e executar apenas os setups
   previamente revisados, fora desta entrega;
6. publicar backend e frontend apenas em HOMOLOG, gerar `config:homolog` e
   validar cache `portal-geapa-pwa-v113`;
7. manter PROD com a feature desligada até nova promoção formal.

O manifest desta branch referencia a versão imutável já existente do Membros
somente para manter o projeto válido. Ela deve ser substituída pela nova versão
que contiver os contratos V2 antes de qualquer teste funcional em HOMOLOG.
