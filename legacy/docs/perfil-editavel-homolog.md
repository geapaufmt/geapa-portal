# Perfil editavel e correcoes cadastrais - Portal HOMOLOG

Esta entrega existe somente na branch `codex/perfil-editavel-homolog`. O preview
usa `config.homolog.js`, o Web App Apps Script HOMOLOG e a Library `GEAPA_CORE`
em `developmentMode`. Nenhum arquivo ou deployment de producao deve ser alterado.

## Fluxo do membro

`Meu perfil` continua sendo carregado pelo backend. Telefone, Instagram,
cidade/UF, resumo academico e links permitidos podem ser editados diretamente.
O navegador nao informa `ID_PESSOA`; a ponte Apps Script resolve novamente a
pessoa pela sessao oficial e fixa `ambientePortal: HOMOLOG`.

Nome completo, CPF, RGA, data de nascimento e e-mail principal nao sao editados
diretamente. O membro envia uma solicitacao com valor atual mascarado, valor
correto e justificativa, e acompanha o status em `Minhas solicitacoes
cadastrais`.

## Gestao

`Gestao do GEAPA > Correcoes cadastrais` exige
`membros:analisar_correcoes`. A aprovacao nao aplica a alteracao: a aplicacao e
uma segunda acao explicita. Complemento e indeferimento exigem motivo publico.

O Core resolve a pessoa internamente e retorna somente nome de exibicao, RGA e
e-mail mascarados. A busca por nome, RGA ou e-mail e aplicada no backend antes
da paginacao. `ID_PESSOA`, CPF e identificadores completos nao aparecem na
listagem.

## Justificativas

`Minhas justificativas` deixou de ser uma rota do membro. O caminho legado
`#/app/justificativas` redireciona para `Minha frequencia`, onde continuam a
listagem, envio e acompanhamento. `Gestao > Justificativas` permanece ativa e
protegida por `justificativas:analisar`.

## Endpoints

- `POST /meu-perfil/atualizar`
- `POST /meu-perfil/correcoes/solicitar`
- `GET /meu-perfil/correcoes`
- `GET /admin/correcoes-cadastrais`
- `POST /admin/correcoes-cadastrais/analisar`
- `POST /admin/correcoes-cadastrais/aplicar`

Todas as mutacoes exigem chave de idempotencia, sessao valida e autorizacao
revalidada no Apps Script/Core.

## Preparacao e rollback

Antes do teste, execute o setup DEV descrito em
`geapa-core/docs/perfil-editavel-homolog.md`. Para rollback, desative
`ENABLE_PROFILE_UPDATES` em `config.homolog.js`, atualize o preview e retorne o
deployment HOMOLOG do Portal para sua versao anterior. Nao altere PROD.
