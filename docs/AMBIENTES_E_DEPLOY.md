# Ambientes Firebase e deploy do Portal GEAPA

## Projetos separados

DEV/HOMOLOG usam um projeto Firebase DEV e PROD usa outro projeto Firebase. A separacao e fisica por projeto; `FIRESTORE_PATH_PREFIX` deve permanecer vazio e caminhos como `environments/dev/*` nao sao aceitos pelas Rules.

| Item | DEV | HOMOLOG | PROD |
| --- | --- | --- | --- |
| Firebase project | projeto DEV, a confirmar | o mesmo projeto DEV | `portal-geapa` |
| Firestore path | raiz do projeto DEV | raiz do projeto DEV | raiz do projeto PROD |
| Config fonte | `config.dev.js` | `config.homolog.js` | `config.prod.js` |
| Escrita remota nesta fase | somente apos autorizacao | bloqueada/read-only | bloqueada para a migracao |
| Hosting | local/canal temporario | preview/canal homolog | live |

Os arquivos DEV/HOMOLOG versionados deixam Firestore desabilitado e usam `geapa-dev-unconfigured` como marcador inerte. Isso impede fallback acidental para PROD antes de existir configuracao autorizada.

## Preparacao da configuracao DEV

Depois que o projeto Firebase DEV for criado e autorizado, informe a configuracao web apenas no processo de geracao:

```powershell
$env:FIREBASE_DEV_WEB_CONFIG_JSON = '<json-publico-do-projeto-dev>'
npm run config:dev
```

Para HOMOLOG use a mesma variavel e `npm run config:homolog`. O gerador habilita Firestore somente quando recebe essa configuracao, rejeita `portal-geapa` em DEV/HOMOLOG e rejeita qualquer namespace.

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

Detalhes do contrato de cadastro/agenda, importacao e exportacao estao em `geapa-atividades/docs/firestore-canonical-cadastro-agenda.md`.
