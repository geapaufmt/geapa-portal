# Painel da Diretoria V2

## Objetivo

O painel `Gestao do GEAPA > Painel da Diretoria` consolida pendencias,
inconsistencias e status das rotinas V2 para acompanhamento operacional, sem
permitir edicao direta das bases.

## Fonte de dados

O front-end chama somente `/v2/painel-diretoria`, que envia a acao
`painelDiretoriaV2` ao Apps Script. O navegador nao acessa Google Sheets,
Drive, IDs internos de planilha nem linhas brutas.

O Apps Script valida a sessao, exige perfil/permissao adequada e agrega dados a
partir dos contratos read-only ja expostos para:

- pendencias da diretoria;
- status das views V2.

Quando uma fonte V2 nao estiver disponivel, o painel retorna aviso controlado
em `data.avisos` e mantem os blocos restantes renderizaveis.

## Acesso

A rota visual permite apenas perfis enviados pelo backend como `DIRETORIA`,
`SECRETARIA`, `ADMIN` ou `ADMIN_TECNICO`.

O endpoint revalida a autorizacao real e aceita pelo menos uma destas
permissoes canonicas:

- `diretoria:painel_v2`;
- `diretoria:pendencias`;
- `sistema:status_v2`;
- `sistema:admin`;
- `atividades:gerir`;
- `membros:ler`;
- `justificativas:analisar`.

Membro comum e visitante nao autenticado devem receber bloqueio antes de dados
privados serem retornados.

## Blocos

O contrato retorna `data.blocos` com os blocos:

- `atividadesSemChamada`;
- `apresentacoesPendentes`;
- `justificativasPendentes`;
- `membrosFrequenciaCritica`;
- `inconsistenciasCadastrais`;
- `errosCargosFuncoes`;
- `ultimaExecucaoJobs`;
- `statusViewsPortal`.

Cada bloco informa `nivel` (`ERRO`, `ALERTA` ou `INFO`), `total`, `resumo`,
`desatualizado` e uma lista limitada de itens sanitizados. Itens nao devem
expor CPF, e-mail, tokens, IDs de planilha ou dados pessoais desnecessarios.

## Estados de tela

A tela implementa:

- loading durante a chamada ao backend;
- erro controlado quando a API falha;
- estado vazio por bloco e por filtro;
- filtros simples por nivel (`TODOS`, `ERRO`, `ALERTA`, `INFO`);
- indicacao de ultima atualizacao;
- destaque quando alguma view parece desatualizada.

## Fora do escopo

Esta versao nao resolve inconsistencias, nao defere justificativas, nao edita
atividades, nao envia e-mails, nao gera certificados, nao cria triggers e nao
escreve nas bases V2.
