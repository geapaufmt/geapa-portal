# Persistencia de login do Portal GEAPA

Este fluxo permite que o Portal GEAPA reabra no mesmo dispositivo sem pedir
novo popup, codigo ou acao manual sempre que o Firebase Auth ainda reconhecer o
usuario Google.

## Camadas

### Firebase Auth persistente

`web/assets/js/firebase-auth.js` usa `browserLocalPersistence`. Essa camada
mantem o usuario Google autenticado no navegador e deve ser acionada
silenciosamente por `onAuthStateChanged`/`currentUser`.

`signInWithPopup` e `signInWithRedirect` ficam restritos ao clique em
`Entrar com Google`.

### Sessao curta do Portal

O token curto retornado pelo Apps Script/GEAPA-CORE continua salvo apenas em
`sessionStorage`, na chave:

```text
geapaPortal.sessionToken
```

Esse token nao deve ser salvo em `localStorage`. Ao fechar aba/navegador, a
sessao curta pode sumir; nesse caso, o Portal usa o usuario Firebase persistido
para chamar `portalLogin` silenciosamente com `usuarioFirebase.getIdToken()`.

### Cache visual seguro

O Portal pode salvar um resumo minimo em `localStorage`, na chave:

```text
geapaPortal.safeUserSummary
```

Esse resumo serve somente para evitar a tela de login como estado final durante
a restauracao e para exibir uma interface inicial enquanto a validacao oficial
roda.

Campos permitidos:

- `schemaVersion`
- `idPessoa`
- `nomeExibicao`
- `email` mascarado ou vazio
- `rga`
- `perfilPortalEfetivo`
- `perfisPortal`
- `portalAtivo`
- `modoAcesso`
- `motivoBloqueio`
- `mensagemBloqueio`
- `tipoVinculoAtual`
- `statusVinculoAtual`
- `cargoFuncaoAtual`
- `cacheUpdatedAt`
- `cacheExpiresAt`

Campos proibidos:

- token Firebase
- `sessionToken` do Portal
- CPF
- telefone
- data de nascimento
- observacoes internas
- pendencias detalhadas
- dados de frequencia
- logs
- segredos, chaves ou URLs sensiveis

Quando aplicado, esse resumo marca a sessao visual com:

```text
origemSessao = LOCAL_SAFE_CACHE
validacaoOficialPendente = true
```

A navegacao protegida nao deve liberar acoes sensiveis enquanto
`validacaoOficialPendente` estiver ativo.

### Firestore cache

Se existir `portalUsers/{uid}`, o Portal tenta ler o snapshot via client SDK do
Firebase. Esse documento tambem e cache operacional; a fonte normativa continua
sendo GEAPA-CORE + PESSOAS v2.

O projeto permanece compatível com Firebase Spark. A sincronizacao do Firestore
e feita pelo Apps Script/GEAPA-CORE via REST, sem Cloud Functions.

### Validacao oficial

Toda abertura persistente ainda chama `portalLogin` no Apps Script/GEAPA-CORE
com o ID token atual do Firebase.

Se o CORE confirmar acesso:

1. o Portal salva uma nova sessao curta em `sessionStorage`;
2. substitui a sessao visual pela sessao oficial;
3. atualiza o resumo seguro sem tokens.

Se o CORE negar acesso:

1. o Portal limpa a sessao curta;
2. remove `geapaPortal.safeUserSummary`;
3. limpa o contexto visual;
4. mostra a tela de acesso com mensagem de autorizacao alterada.

O resumo seguro usa schema versionado. Mudancas em regra de acesso, como a
entrada de `PORTAL_MODO_ACESSO = TESTE` ou `MEMBROS_ATIVOS`, devem invalidar
resumos antigos para obrigar nova validacao oficial pelo Core. O Portal nao
mantem whitelist local de e-mails e nao decide se `PORTAL_EMAILS_TESTE` se
aplica; essa decisao pertence ao GEAPA-CORE.

## Logout

Ao clicar em `Sair`, o Portal deve limpar:

- `sessionStorage`;
- `geapaPortal.safeUserSummary`;
- contexto visual local;
- Firebase Auth via `signOut`.

Em dispositivo publico, a orientacao operacional e sempre usar `Sair` ao
finalizar o uso.
