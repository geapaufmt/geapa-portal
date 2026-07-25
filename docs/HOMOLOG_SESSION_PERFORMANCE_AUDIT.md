# Auditoria do Portal HOMOLOG — sessão e desempenho

## Inventário comprovado antes da alteração

- frontend servido no canal HOMOLOG: hashes iguais ao snapshot local do commit
  `74254f3`;
- Apps Script HOMOLOG: deployment `@101`;
- Apps Script PROD preservado: deployment `@100`;
- Libraries do manifest HOMOLOG:
  - `GEAPA_CORE` 21;
  - `GEAPA_MEMBROS` 8;
  - `GEAPA_ATIVIDADES` 19;
  - todas com `developmentMode: false`;
- frontend: `ENVIRONMENT=HOMOLOG` e `DATA_ENVIRONMENT=PILOTO_DEV`;
- backend publicado: `ambiente=producao`,
  `ambientePerfilCadastral=PROD`, `ambienteDadosV2=PROD`.

Os arquivos `index.html`, `app.js`, `api.js`, `config.js` e
`service-worker.js` recebidos pela URL HOMOLOG foram comparados com os arquivos
locais e coincidiam. Portanto, o problema não era um desencontro de cache do
frontend: estava no snapshot do backend e nos contratos do Core.

Script Properties não foram modificadas. Como PROD e HOMOLOG são versões do
mesmo projeto Apps Script, uma propriedade global `GEAPA_ENV` não é fonte
suficiente para distinguir os deployments. O ambiente precisa fazer parte do
snapshot versionado do backend HOMOLOG e ser transmitido ao Core.

## Resultado do patch

- backend desta branch: HOMOLOG -> DEV;
- nenhuma constante de dados PROD permanece no backend HOMOLOG;
- cache de sessão, código, Minha situação e demais caches construídos por
  `portalCacheKey_` ficam separados por ambiente;
- uma exceção de domínio como `DOMAIN_DB_INDISPONIVEL` chega ao envelope e aos
  logs com etapa e `traceId`;
- login por código continua independente de Firebase;
- o formulário valida o código antes de resolver novamente a sessão;
- Minha situação não executa fallback operacional fora de modo TESTE;
- o navegador deduplica leituras idênticas pendentes;
- o botão Atualizar recarrega somente a rota autenticada atual.

## Validação pós-publicação necessária

Esta branch não foi publicada. Após autorização de publicação exclusiva em
HOMOLOG, coletar:

1. tempo frio e quente do envio de código;
2. tempo frio e quente de Minha situação;
3. tempo frio e quente de Membros e Correções cadastrais;
4. `traceId`, ambiente e duração por etapa;
5. confirmação de ausência de qualquer ID/linha PROD nos logs;
6. teste de duplo clique e do botão Atualizar;
7. aba anônima e PWA após ativação do cache `portal-geapa-pwa-v121`.
