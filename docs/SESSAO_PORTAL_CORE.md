# Sessao do Portal com GEAPA-CORE

Este documento define o contrato esperado entre o Portal GEAPA e o GEAPA-CORE
para identidade, perfis e permissoes do usuario atual.

O Portal nao calcula vinculo, cargo, perfil institucional nem permissao. A fonte
de verdade e o GEAPA-CORE. O front-end apenas consome a sessao resolvida para
montar menu, proteger rotas visualmente e exibir mensagens de acesso negado.
Qualquer autorizacao real continua obrigatoriamente no Apps Script/backend.

## Objeto canonico

O CORE deve retornar a sessao resolvida em `data.sessao` sempre que uma acao
precisar atualizar a navegacao do Portal.

```json
{
  "autenticado": true,
  "idPessoa": "PES-0001",
  "nomeExibicao": "Membro GEAPA",
  "email": "membro@example.org",
  "perfilPortalEfetivo": "MEMBRO",
  "perfisPortal": ["MEMBRO"],
  "permissoes": ["portal:acessar", "situacao:ver_propria"],
  "portalAtivo": true,
  "tipoVinculoAtual": "MEMBRO",
  "statusVinculoAtual": "ATIVO",
  "cargoFuncaoAtual": "",
  "cargosAtuais": []
}
```

Campos obrigatorios para autorizacao visual:

- `autenticado`: indica se ha usuario validado.
- `idPessoa`: identificador interno seguro da pessoa.
- `nomeExibicao`: nome seguro para exibicao.
- `perfilPortalEfetivo`: perfil principal ja resolvido pelo CORE.
- `perfisPortal`: perfis efetivos ja resolvidos pelo CORE.
- `permissoes`: permissoes efetivas no formato canonico `dominio:acao`.
- `portalAtivo`: se o usuario pode acessar o Portal.

Campos complementares:

- `email`: e-mail autenticado ou e-mail seguro para exibicao controlada.
- `tipoVinculoAtual`: vinculo atual ja resolvido pelo CORE.
- `statusVinculoAtual`: status atual do vinculo.
- `cargoFuncaoAtual`: resumo textual de cargo ou funcao atual.
- `cargosAtuais`: lista segura de cargos/funcoes atuais, quando util para UI.

## Compatibilidade aceita pelo front-end

Durante a migracao, o front-end tambem aceita nomes legados para nao quebrar as
telas existentes:

- `data.sessao`, preferencial.
- `data.session`, legado temporario.
- `data.usuarioAtual`, legado temporario.
- `data.situacao.sessao`, quando a acao for `minhaSituacao`.
- `data.situacao.usuario`, bloco legado normalizado pelo Portal.

O ponto unico dessa adaptacao e `web/assets/js/auth-adapter.js`, apoiado por
`web/assets/js/auth.js` e pela normalizacao em `web/app.js`.

## Regras que nao pertencem ao Portal

O Portal pode:

- verificar se a sessao tem perfil permitido para uma rota;
- verificar se a sessao tem permissao efetiva retornada pelo CORE;
- esconder itens de menu;
- bloquear acesso direto por hash;
- mostrar mensagem amigavel de acesso negado.

O Portal nao pode:

- decidir se alguem e membro ativo lendo planilha;
- decidir se alguem e diretoria olhando cargo bruto;
- conceder `ADMIN` por conta propria;
- calcular permissoes a partir de `CARGOS_CONFIG`;
- ler `PORTAL_PERMISSOES` diretamente, salvo se isso vier por API segura do CORE.

## ADMIN

`ADMIN` deve vir de autorizacao explicita do CORE. Cargo de diretoria,
secretaria, comunicacao ou conselho nao concede `ADMIN` automaticamente.

## Funcoes futuras do CORE

Quando disponivel, o Portal deve consumir uma funcao publica equivalente a:

```text
corePortalResolverUsuarioAtual(sessionToken)
```

Essa funcao deve devolver a sessao canonica ja filtrada e pronta para o Portal.
Se o nome definitivo mudar, a troca deve ficar isolada no Apps Script/API e no
adapter de sessao do front-end, sem alterar a matriz de rotas.

## Relacao com rotas protegidas

A matriz de rotas fica em `web/assets/js/navigation.js`. O guard usa a sessao
resolvida para aplicar:

- `requerLogin`;
- `portalAtivo`;
- `perfisPermitidos`;
- `permissoesNecessarias`.

Rotas sem acesso nao aparecem no menu e tambem sao bloqueadas quando acessadas
diretamente por hash.
