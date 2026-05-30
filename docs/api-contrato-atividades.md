# Contrato Inicial de Atividades

Este documento descreve o contrato inicial para a tela de Atividades do Portal
GEAPA. O front-end pode usar dados mockados em desenvolvimento, mas o modo real
chama o Apps Script do portal, que valida a sessão e consulta o contrato público
somente leitura do módulo `geapa-atividades`.

A origem atual da leitura real é a base **ATIVIDADES INTERNAS GEAPA v2 - DEV**,
cadastrada no Registry pela key `ATIVIDADES_V2_DB`. A lista usa a aba
`PORTAL_ATIVIDADES_CALENDARIO` e `PORTAL_ATIVIDADES_DETALHES`, sempre em modo
somente leitura.

## Regras gerais

- O GitHub Pages nunca acessa planilhas diretamente.
- O front-end pode esconder botões por perfil, mas a autorização real deve ser
  sempre feita no Apps Script.
- Ações sensíveis como criar atividade, editar atividade, registrar chamada e
  justificar falta permanecem mockadas até existir backend validado.
- Nenhum mock deve conter dados pessoais reais.
- A leitura real de Atividades exige sessão válida do Portal GEAPA.
- O contexto enviado ao módulo usa o perfil oficial calculado pelo GEAPA-CORE a
  partir das Vigências. `SECRETARIA` é enviado como `SECRETARIO`; `DIRETORIA`
  ou `PRESIDENCIA` são enviados como `DIRETORIA`; os demais usuários seguem
  como `MEMBRO`.
- O identificador estrutural usado pelo portal é sempre `ID_ATIVIDADE`, no
  padrão `ATV-AAAA-S-NNNN`, por exemplo `ATV-2026-1-0005`.
- IDs antigos como `ID_ATIVIDADE_GLOBAL`, `ID_ATIVIDADE_LOCAL` e
  `ID_ATIVIDADE_V1` não fazem parte do contrato do portal.

## Formato de resposta

Resposta de sucesso:

```json
{
  "ok": true,
  "message": "Operação realizada com sucesso.",
  "data": {}
}
```

Resposta de erro:

```json
{
  "ok": false,
  "errorCode": "PERMISSAO_NEGADA",
  "message": "Você não tem permissão para executar esta ação."
}
```

## Listar atividades

Fluxo preferencial para a primeira renderizacao:

```text
GET /atividades/listar
```

No Apps Script atual, a acao equivalente e:

```text
acao=atividadesListar
token=sessao-temporaria
```

Depois que a lista aparecer, o Portal dispara preload assÃ­ncrono de detalhes:

```text
acao=atividadesDetalhesPreload
token=sessao-temporaria
```

O bundle continua existindo como contrato de apoio, mas nao deve bloquear a
primeira renderizacao da aba Atividades. Se um detalhe ainda nao estiver em
cache quando o usuario clicar, o Portal chama `atividadeDetalhe` somente para
aquele `ID_ATIVIDADE`.

Contrato lógico:

```text
GET /atividades/listar
```

No Apps Script atual, a implementação real poderá usar ação equivalente:

```text
acao=atividadesListar
token=sessao-temporaria
```

Resposta esperada:

```json
{
  "ok": true,
  "data": [
    {
      "idAtividade": "ATV-2026-1-0005",
      "dataAtividade": "2026-04-16",
      "diaSemana": "quinta-feira",
      "horarioInicio": "18h30",
      "horarioFim": "20h30",
      "tituloPublico": "Apresentação de Membro",
      "tipoPublico": "Apresentação",
      "subtipoAtividade": "APRESENTACAO_MEMBRO",
      "local": "Auditório 7, Xingú I",
      "formato": "PRESENCIAL",
      "classificacaoAcesso": "ABERTA",
      "publicoAlvo": "Membros",
      "contaPresenca": true,
      "contaFalta": true,
      "geraCertificado": true,
      "cargaHoraria": 2,
      "statusPublico": "REALIZADA",
      "visibilidadePortal": "MEMBROS",
      "podeVerDetalhes": true,
      "podeJustificarFalta": false,
      "podeRegistrarChamada": true,
      "podeEditar": true
    }
  ]
}
```

## Detalhar atividade

Contrato lógico:

```text
GET /atividades/detalhe?idAtividade=ATV-2026-1-0005
```

No Apps Script atual, a implementação real poderá usar ação equivalente:

```text
acao=atividadeDetalhe&idAtividade=ATV-2026-1-0005
token=sessao-temporaria
```

Resposta esperada:

```json
{
  "ok": true,
  "data": {
    "idAtividade": "ATV-2026-1-0005",
    "tituloPublico": "Apresentação de Membro",
    "descricaoPublica": "Atividade acadêmica semanal do GEAPA.",
    "dataAtividade": "2026-04-16",
    "horarioCompleto": "18h30 às 20h30",
    "local": "Auditório 7, Xingú I",
    "formato": "PRESENCIAL",
    "tipoAtividade": "ACADEMICA",
    "subtipoAtividade": "APRESENTACAO_MEMBRO",
    "classificacaoReuniao": "ORDINARIA",
    "classificacaoAcesso": "ABERTA",
    "responsavelPublico": "",
    "contaPresenca": true,
    "contaFalta": true,
    "geraCertificado": true,
    "cargaHoraria": 2,
    "statusPublico": "REALIZADA",
    "linkMaterialPublico": "",
    "linkAtaPublica": ""
  }
}
```

## Endpoints futuros

- `POST /atividades/criar`
- `POST /atividades/editar`
- `GET /atividades/chamada?idAtividade=ATV-2026-1-0005`
- `POST /atividades/registrar-chamada`
- `POST /atividades/justificar-falta`
- `GET /justificativas/minhas`
- `GET /diretoria/pendencias`

As acoes de chamada operacional ja existem em modo DEV no Web App do portal; os
demais endpoints seguem fora desta entrega.

## Chamada operacional em DEV

O Portal usa duas acoes para o registro de chamada na base Atividades v2 DEV:

```text
acao=atividadeChamada
token=sessao-temporaria
idAtividade=ATV-2026-1-0005
```

```text
acao=atividadeSalvarChamada
token=sessao-temporaria
payload={...json...}
```

O front-end exibe o botao "Registrar chamada" apenas quando o contrato de
atividades indicar `podeRegistrarChamada = true` e o perfil visual permitir. A
autorizacao real continua no Apps Script e no modulo `geapa-atividades`.

O payload de salvamento e enviado em lote, com `registros` para membros e
`externos` para convidados/externos ja presentes na chamada retornada pelo
backend. O Portal nao escreve diretamente em planilhas.

## Integração atual do portal

O Apps Script do portal chama o módulo `geapa-atividades` como biblioteca
`GEAPA_ATIVIDADES`, em modo de desenvolvimento nesta fase. As ações públicas do
Web App são:

- `atividadesBundle`
- `atividadesListar`
- `atividadesDetalhesPreload`
- `atividadeDetalhe`
- `atividadeChamada`
- `atividadeSalvarChamada`

Ambas validam a sessão temporária do portal antes de consultar atividades.

## Validações obrigatórias no backend futuro

- sessão válida;
- membro ou diretor localizado;
- perfil autorizado;
- ação permitida para o status da atividade;
- prazo válido, quando houver;
- lock para evitar concorrência;
- log de ação;
- retorno estruturado e sem dados desnecessários.
## Cache e medicao de performance

O front-end guarda o bundle de atividades em `sessionStorage` por TTL curto
de 5 minutos, usando uma chave derivada da sessao atual. Dentro desse periodo:

- abrir a aba Atividades novamente nao deve chamar o backend;
- clicar em uma atividade que ja veio no bundle nao deve chamar
  `/atividades/detalhe`;
- se um detalhe nao veio no bundle, o portal ainda usa
  `/atividades/detalhe` como fallback e atualiza o cache local.

Para medir antes/depois, abrir o console do navegador e filtrar por:

```text
GEAPA-PORTAL-PERF
```

Eventos principais:

- `atividades.lista.renderizada`: tempo ate a primeira renderizacao da lista;
- `atividades.aba.cache`: tempo ao reabrir a aba usando cache local;
- `atividades.detalhes.preload`: tempo de preload dos detalhes;
- `atividades.lista.falhou`: erro ao carregar o calendario inicial;
- `atividades.detalhe.cache`: abertura de detalhe sem nova chamada;
- `atividades.detalhe.fallback_backend`: detalhe carregado pelo endpoint antigo.
