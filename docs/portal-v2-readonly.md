# Portal V2 somente leitura

Este documento registra a etapa de consumo read-only das views V2 no Portal
GEAPA.

## Objetivo

O Portal passa a consultar, via Apps Script, resumos e views V2 ja preparados
pelo GEAPA-CORE e pelo modulo GEAPA Atividades. O frontend continua sendo
estatico no GitHub Pages e nunca acessa Google Sheets, Drive, IDs privados,
tokens ou regras criticas diretamente.

## Escopo implementado

Endpoints Apps Script adicionados:

- `minhaFrequencia`
- `minhasApresentacoes`
- `minhasJustificativas`
- `proximasAtividades`
- `historicoAtividades`
- `pendenciasDiretoria`
- `statusViewsV2`

Telas conectadas:

- Minha Frequencia
- Minhas Apresentacoes
- Minhas Justificativas
- Pendencias da Diretoria
- Status do Sistema V2

A tela existente de Atividades passa a preferir os endpoints V2 read-only para
proximas atividades e historico. Se o contrato V2 de Atividades ainda nao
estiver disponivel no ambiente Apps Script, o backend usa o contrato leve ja
existente como fallback, mantendo a validacao de sessao.

Para as telas de frequencia, apresentacoes, justificativas, pendencias e status,
o backend primeiro chama contratos read-only publicados pelo modulo
GEAPA Atividades, dono das views `PORTAL_*`. Esses contratos leem a base
Atividades v2 DEV, aplicam filtro por usuario ou perfil privilegiado e devolvem
apenas campos seguros. O fallback via Registry/GEAPA-CORE permanece apenas como
proteção temporaria quando a biblioteca de Atividades ainda nao estiver
atualizada.

## Fora de escopo

Esta etapa de leitura V2 nao implementava acoes operacionais. No Pacote 2, o
Portal passou a consumir acoes de justificativa via Apps Script e modulo
Atividades, sem escrever em planilhas diretamente. Ainda ficam fora deste fluxo:

- edicao de atividade;
- emissao de certificado;
- triggers;
- escrita direta nas bases V2 pelo front-end.

As telas mantem consulta, loading, vazio e erro controlado. A lista de
Atividades pode exibir `Justificar ausencia futura` quando o backend enviar a
flag correspondente; `Minha frequencia` e `Minhas justificativas` podem abrir o
fluxo de justificativa de falta registrada conforme permissoes do backend.

## Fluxo de dados

```text
PESSOAS_V2 / VIGENCIAS_V2 / views PORTAL_*
  -> GEAPA-CORE ou GEAPA Atividades
  -> Apps Script do Portal
  -> JSON sanitizado
  -> GitHub Pages
```

O Apps Script valida a sessao temporaria antes de consultar as views. Para
consultas individuais, envia ao Core/Atividades um contexto seguro com
`idPessoa`, e-mail, RGA, perfil e permissoes ja resolvidos pelo backend. O
frontend nao calcula permissao real; ele apenas usa a sessao retornada para
navegacao visual.

## Sanitizacao

O backend retorna allowlists por tela. Campos como CPF, e-mail de terceiros,
IDs de planilha, tokens, links privados de Drive e detalhes brutos de base nao
sao repassados.

Consultas proprias filtram por `ID_PESSOA`, RGA ou e-mail quando esses campos
existem no item retornado. A fonte preferencial, contudo, deve ser sempre um
contrato do Core/Atividades que ja entregue somente dados do usuario atual.

## Performance

As respostas V2 usam cache curto no Apps Script:

```text
PORTAL_CONFIG.cacheViewsV2Segundos = 120
```

O cache guarda apenas respostas ja filtradas para a sessao atual. A tela mostra
estado de carregamento e estado vazio para views ainda sem linhas.
