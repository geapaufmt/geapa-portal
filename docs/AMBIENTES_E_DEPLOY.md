# Ambientes Firebase e deploy do Portal GEAPA

## Projetos separados

DEV/HOMOLOG usam um projeto Firebase DEV e PROD usa outro projeto Firebase. A separacao e fisica por projeto; `FIRESTORE_PATH_PREFIX` deve permanecer vazio e caminhos como `environments/dev/*` nao sao aceitos pelas Rules.

| Item | DEV | HOMOLOG | PROD |
| --- | --- | --- | --- |
| Firebase project | `geapa-dev` | `geapa-dev` | `portal-geapa` |
| Firestore path | raiz do projeto DEV | raiz do projeto DEV | raiz do projeto PROD |
| Config fonte | `config.dev.js` | `config.homolog.js` | `config.prod.js` |
| Apps Script API | obrigatoria via `GEAPA_DEV_API_BASE_URL` | deployment HOMOLOG/DEV | deployment PROD |
| Escrita remota nesta fase | somente apos autorizacao | bloqueada/read-only | bloqueada para a migracao |
| Hosting | local/canal temporario | preview/canal homolog | live |

Os arquivos DEV/HOMOLOG versionados deixam Firestore desabilitado e usam `geapa-dev-unconfigured` como marcador inerte. Isso impede fallback acidental para PROD antes de existir configuracao autorizada.

## Preparacao da configuracao DEV

Depois que o projeto Firebase DEV for criado e autorizado, informe a configuracao web apenas no processo de geracao:

```powershell
$env:GEAPA_DEV_API_BASE_URL = '<url-exec-do-apps-script-dev>'
$env:FIREBASE_DEV_WEB_CONFIG_JSON = '<json-publico-do-projeto-dev>'
npm run config:dev
```

`config.dev.js` nao contem endpoint Apps Script. O gerador exige
`GEAPA_DEV_API_BASE_URL`, rejeita a URL do deployment PROD e valida o formato
`https://script.google.com/macros/s/<deployment-id>/exec`. Para HOMOLOG use a
mesma configuracao Firebase e `npm run config:homolog`; o endpoint HOMOLOG ja e
uma fonte versionada separada. O gerador habilita Firestore somente quando
recebe a configuracao Firebase, rejeita `portal-geapa` em DEV/HOMOLOG e rejeita
qualquer namespace.

## Backend Apps Script DEV/HOMOLOG existente

A consulta somente leitura com `clasp deployments` em 2026-08-22 confirmou que
o projeto Apps Script local possui deployments imutaveis separados:

- PROD: versao `100`, deployment ID iniciado por `AKfycbxf-...`;
- HOMOLOG/DEV: versao `111`, com Core 30, Atividades 22 e Membros 12;
- URL HOMOLOG/DEV reutilizavel:
  `https://script.google.com/macros/s/AKfycbxyUPuu4tb9mkAys5jwDiBxtgE-g4YYOdaid0qNMrVw5i2oWh_Uyv2BHFAQGJPYdnA2/exec`.

Os dois deployments pertencem ao mesmo projeto Apps Script, mas apontam para
versoes diferentes. Assim, eles compartilham o conjunto de Script Properties;
a separacao depende obrigatoriamente do ambiente fixado na versao publicada e
dos nomes `*_DEV_*`. A versao 111 e o endpoint DEV atual sem
alterar o deployment PROD 100. Isso e isolamento por deployment, nao por projeto
Apps Script fisicamente separado.

### Reproduzir o pacote Apps Script DEV

O backend versionado permanece com `producao/PROD` como perfil default. O perfil
declarativo [`profiles/apps-script.dev.json`](../profiles/apps-script.dev.json)
fixa separadamente `homologacao/DEV`, Core 30, Atividades 22 e Membros 12. Para
validar ou gerar o pacote sem alterar a fonte PROD, execute:

```powershell
npm run check:apps-script-dev
npm run apps-script:dev
```

O segundo comando gera `build/apps-script/dev`, que e ignorado pelo Git. O
gerador valida que as Libraries usam versoes imutaveis com
`developmentMode:false`, que somente as propriedades Firebase/Core DEV sao
lidas e que configuracao ausente, ambiente invalido ou project IDs divergentes
falham de forma fechada. O comando nao executa `clasp`, deploy ou operacao
remota.

Antes de qualquer teste remoto, um GET de smoke somente leitura deve confirmar
`PORTAL_API_OK` e `meta.ambiente: DEV`. Se essa confirmacao falhar, nao execute
login, escrita, sincronizacao ou acao operacional.

Com `GEAPA_DEV_API_BASE_URL` definida, execute o preflight somente leitura:

```powershell
npm run check:apps-script-dev-endpoint
```

O script rejeita o endpoint PROD, faz apenas um GET sem parametros e exige
`ok: true`, `code: PORTAL_API_OK` e ambiente efetivo `DEV`.

No Apps Script DEV, somente estas propriedades participam do fluxo migrado:

```text
GEAPA_FIREBASE_DEV_WEB_API_KEY=<api-key-publica-do-projeto-geapa-dev>
GEAPA_FIREBASE_DEV_PROJECT_ID=geapa-dev
GEAPA_CORE_FIRESTORE_DEV_PROJECT_ID=geapa-dev
GEAPA_CORE_FIRESTORE_DEV_DATABASE_ID=(default)
```

Propriedades sem sufixo de ambiente nao sao fallback. A API nova do Core rejeita
ambiente ausente, projeto ausente, DEV e PROD iguais e qualquer escrita PROD.

Se no futuro for exigido isolamento fisico por projeto Apps Script, crie um novo
projeto `Portal GEAPA DEV`, configure um `.clasp.json` local e ignorado apenas no
diretorio de trabalho DEV, fixe o backend em `DEV`, use somente as Libraries e
Script Properties DEV, publique uma nova implantacao Web App e informe sua URL
somente por `GEAPA_DEV_API_BASE_URL`. Nao reutilize Script ID, propriedades,
deployment ID ou credenciais de PROD. Essa criacao/publicacao exige autorizacao
explicita e nao e executada pelos scripts locais deste repositorio.

No Core Apps Script, as propriedades independentes sao:

```text
GEAPA_CORE_FIRESTORE_DEV_PROJECT_ID=<projeto-dev>
GEAPA_CORE_FIRESTORE_DEV_DATABASE_ID=(default)
GEAPA_CORE_FIRESTORE_PROD_PROJECT_ID=portal-geapa
GEAPA_CORE_FIRESTORE_PROD_DATABASE_ID=(default)
```

As propriedades antigas sem `DEV`/`PROD` nao sao fallback das APIs novas.

## Emulator Suite

O teste local usa o project ID ficticio `demo-geapa-dev`; por ser um demo project, tentativas de atingir servicos nao emulados falham. Execute:

```powershell
npm run test:firestore-emulator
```

O wrapper isola a configuracao do CLI no workspace, usa Firestore em `127.0.0.1:8080` e encerra o emulador ao final. Nenhum login ou project ID remoto e necessario.

## Provisionamento de `portalUsers/{uid}`

Depois que o backend valida o ID token, o Portal envia ao Core a identidade
Firebase e a sessao oficial. Um e-mail Firebase que seja alias do e-mail
canonico pode ser aceito somente quando o proprio Core o resolve novamente para
a mesma `idPessoa`. O snapshot usa o e-mail autenticado, mantendo o UID e a
validacao do cache privado consistentes.

A resposta `cacheFirestore` preserva codigos diagnosticos seguros em
`backendCode` e `firestoreStatus`; mensagens internas do Firestore nao sao
expostas ao navegador. Logs de provisionamento recebem `ambiente` explicitamente
e nunca devem cair em `PORTAL_LOG_ACESSOS` PROD durante uma execucao DEV.

## Rules e indexes

`firestore.rules` e `firestore.indexes.json` estao preparados, mas nao devem ser publicados nesta tarefa. A `.firebaserc` nao possui alias `default` nem `dev`; somente o alias explicito `prod` permanece. Isso faz comandos sem `--project` falharem em vez de escolherem PROD implicitamente.

Antes do primeiro deploy remoto no projeto DEV, e obrigatorio:

1. obter autorizacao explicita;
2. confirmar o project ID DEV;
3. adicionar um alias local `dev` apontando para esse projeto;
4. repetir `npm run test:firestore-emulator`;
5. revisar o diff de Rules/indexes;
6. executar o deploy com `--project <project-id-dev>` explicito.

Nenhuma Rule, index, Hosting, Script Property ou dado remoto foi alterado pela implementacao local.

Os workflows de preview e HOMOLOG exigem disparo manual e confirmacao textual. Eles usam `FIREBASE_DEV_PROJECT_ID`, `FIREBASE_DEV_WEB_CONFIG_JSON` e `FIREBASE_SERVICE_ACCOUNT_GEAPA_DEV`; nenhum deles aponta para `portal-geapa`.

## Compatibilidade temporaria

O Portal ainda le `portalUsers`, `portalActivities` e `portalActivityCalendarSnapshots` na raiz do projeto correto. Esses caminhos sao caches/read models derivados. As collections canonicas novas do piloto sao `activities` e `activityPrivate`; a segunda nunca e acessivel pelo navegador.

Com `FIRESTORE_CANONICAL_ACTIVITIES_ENABLED=true`, calendario e lista consultam
`activities where ativo == true`. O enriquecimento vindo do backend possui uma
whitelist limitada aos campos dos dominios ainda legados (presenca,
apresentacoes e permissoes operacionais). Ele nao pode substituir titulo, data,
horario, local, status, visibilidade ou hashes canonicos. O detalhe carregado
pelo backend recebe por cima o resumo canonico ja presente no cache do Portal.

Valide essa precedencia antes de empacotar o frontend:

```powershell
npm run test:firestore-canonical-authority
```

O navegador nunca consulta `activityPrivate`; dados internos continuam sendo
lidos somente pelo backend Apps Script autorizado.

Detalhes do contrato de cadastro/agenda, importacao e exportacao estao em `geapa-atividades/docs/firestore-canonical-cadastro-agenda.md`.
