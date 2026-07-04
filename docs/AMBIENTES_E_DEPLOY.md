# Ambientes e deploy do Portal GEAPA

## Modelo leve da fase 1

Esta fase usa um unico projeto Firebase (`portal-geapa`) e os projetos Apps
Script existentes. A separacao ocorre por configuracao publica, canal Hosting,
feature flags e prefixo Firestore. Nao ha novos projetos, copia integral de
planilhas ou migracao de Registry.

| Item | DEV | HOMOLOG | PROD/PILOTO |
| --- | --- | --- | --- |
| URL | local ou canal temporario | preview de PR ou canal `homolog` | `https://portal-geapa.web.app` |
| Firebase project | `portal-geapa` | `portal-geapa` | `portal-geapa` |
| Hosting channel | local/temporario | preview PR ou `homolog` | `live` |
| Config fonte | `config.dev.js` | `config.homolog.js` | `config.prod.js` |
| Firestore prefix | `environments/dev` | `environments/homolog` | vazio, preserva caminhos atuais |
| Registry/dados | DEV | DEV controlado | `PILOTO_V2_DEV_CONTROLADO` enquanto a migracao nao terminar |
| Apps Script | HEAD permitido | candidato versionado recomendado | versao fixa obrigatoria antes de PROD oficial |
| Aprovacao | desenvolvedor | Luis/diretoria/testadores | Luis ou responsavel do Environment `production` |

O endpoint Apps Script permanece igual nesta fase. HOMOLOG usa `READ_ONLY_MODE`
e flags de mutacao desligadas para impedir operacao acidental sobre dados reais.

## Configuracao publica

Nunca edite `web/assets/js/config.js` para trocar ambiente. Gere-o:

```powershell
npm run config:dev
npm run config:homolog
npm run config:prod
```

Ou informe metadados do build:

```powershell
node scripts/generate-portal-config.mjs homolog --channel homolog --version abc123
```

O gerador valida flags obrigatorias, endpoint HTTPS, projeto Firebase e chaves
proibidas. `config.js` commitado e PROD por defesa adicional.

## Feature flags

- `FIRESTORE_ENABLED`: desliga todas as leituras Firestore do Portal;
- `FIRESTORE_SNAPSHOT_ENABLED`: desliga o snapshot agregado;
- `FIRESTORE_COLLECTION_FALLBACK_ENABLED`: desliga a colecao por atividade;
- `APPS_SCRIPT_FALLBACK_ENABLED`: controla o fallback de calendario;
- `ENABLE_ACTIVITY_MANAGEMENT`: controla a rota de gestao de atividades;
- `ENABLE_JUSTIFICATIVAS`: controla rotas e novas acoes de justificativa;
- `READ_ONLY_MODE`: oculta rotas de gestao e bloqueia acoes mutaveis conhecidas
  na camada comum de API;
- `FIRESTORE_PATH_PREFIX`: seleciona o namespace Firestore.

As validacoes criticas continuam no backend. Flags do front-end organizam
experiencia e rollout, mas nao substituem autorizacao Apps Script. O bloqueio
local de escrita evita operacoes acidentais; chamadas forjadas ainda precisam
ser recusadas pelo backend.

Nesta fase, alterar uma flag publica exige gerar `config.js` e republicar o
Hosting. Override remoto sem deploy fica para a proxima fase.

## Fluxo diario

```text
feature branch
-> pull request
-> preview Firebase automatico com config HOMOLOG
-> teste pelo Luis
-> merge em homolog/develop quando necessario
-> canal homolog automatico
-> merge em main
-> workflow manual Firebase Hosting Production
-> aprovacao do Environment production
```

PR e canal HOMOLOG nunca publicam `live` e nunca publicam Firestore Rules.

## Preparacao unica no GitHub

Em `Settings -> Environments`, crie:

- `homolog`, sem aprovacao obrigatoria;
- `production`, com Luis/responsavel como required reviewer e protecao para
  branch `main`.

Ative branch protection em `main`: PR obrigatorio, ao menos uma aprovacao e
checks do preview concluídos.

## Deploy manual PROD

1. Homologue a URL de preview.
2. Confirme que `main` contem somente o candidato aprovado.
3. Abra Actions -> Firebase Hosting Production -> Run workflow.
4. Digite `PUBLICAR_PROD`.
5. Aprove o Environment `production`.
6. Confirme no rodape/console que o build e PROD e o canal e `live`.

GitHub Pages fica como fallback legado e tambem e manual. Use apenas quando a
URL Pages ainda for necessaria.

## Apps Script e Registry

Producao oficial nao pode usar biblioteca `version: "0"` ou
`developmentMode: true`. Como esta fase nao cria projetos Apps Script, a
correcao fica registrada como pendencia critica para a fase 2:

1. publicar versoes imutaveis de Core e Atividades;
2. fixar essas versoes no manifesto do Portal/Atividades;
3. criar deployment candidato para HOMOLOG;
4. promover deployment versionado para PROD;
5. manter anotados deployment IDs e versoes para rollback.

Tambem fica pendente criar `AMBIENTES_SISTEMA` no Registry. Nenhuma aba ou linha
foi criada automaticamente nesta fase.

## Diagnostico seguro

No console:

```javascript
PortalGeapaDebug.getEnvironment()
PortalGeapaDebug.getBuildInfo()
PortalGeapaDebug.getDataSources()
```

O endpoint Apps Script aparece mascarado e nenhum token ou dado pessoal e
registrado.

## Escritas com timeout e idempotencia

O front gera `requestId` e `clientSubmittedAt` para acoes mutaveis. Durante uma
submissao ou depois de timeout, o mesmo payload reutiliza o ID por ate dez
minutos. O backend pode reconhecer a solicitacao sem repetir a escrita.

- acoes simples: timeout de 30 segundos;
- uploads de material, foto ou comprovante: timeout de 90 segundos;
- em timeout, a interface e destravada e orienta o usuario a consultar a tela
  antes de reenviar;
- `userMessage` tem prioridade sobre mensagens tecnicas.

O preview HOMOLOG permanece `READ_ONLY_MODE=true`; ele valida interface,
contrato e bloqueios, mas nao deve ser usado para testar escrita real. Escritas
devem ser homologadas com `config.dev.js` em canal temporario controlado e com
dados DEV.

O pos-processamento de views, Firestore e Mail Hub ocorre pelo job do modulo
Atividades. Uma falha secundaria nao deve mudar para erro uma gravacao oficial
ja concluida no Google Sheets.

## Checklist de deploy

- [ ] Preview usa `ENVIRONMENT=HOMOLOG`.
- [ ] Preview nao publicou canal `live` nem Firestore Rules.
- [ ] Nenhum segredo foi adicionado ao front-end.
- [ ] `npm run check:configs` passou.
- [ ] Fallback Apps Script foi preservado nas telas criticas.
- [ ] Prefixo Firestore corresponde ao ambiente.
- [ ] Ambiente de dados foi conferido, especialmente o PILOTO V2.
- [ ] Bibliotecas/deployment Apps Script utilizados foram anotados.
- [ ] Plano de rollback foi revisado.
- [ ] Deploy PROD foi aprovado no GitHub Environment.
