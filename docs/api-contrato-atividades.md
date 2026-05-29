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

Fluxo preferencial do Portal:

```text
GET /atividades/bundle
```

No Apps Script atual, a acao equivalente e:

```text
acao=atividadesBundle
token=sessao-temporaria
```

Resposta esperada:

```json
{
  "ok": true,
  "data": {
    "calendario": [],
    "detalhesPorId": {},
    "ultimaAtualizacao": "2026-05-29T12:00:00.000Z"
  }
}
```

O bundle deve ser a primeira tentativa da aba Atividades. Ele reduz chamadas
repetidas porque entrega a lista e os detalhes seguros por `ID_ATIVIDADE` em
uma unica requisicao. Se o contrato `atividadesV2_portalGetAtividadesBundle`
ainda nao existir no modulo `geapa-atividades`, o portal mantem fallback para
`atividadesListar` e `atividadeDetalhe`.

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

Esses endpoints não estão implementados nesta entrega.

## Integração atual do portal

O Apps Script do portal chama o módulo `geapa-atividades` como biblioteca
`GEAPA_ATIVIDADES`, em modo de desenvolvimento nesta fase. As ações públicas do
Web App são:

- `atividadesBundle`
- `atividadesListar`
- `atividadeDetalhe`

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

- `atividades.aba.bundle`: tempo da primeira carga da aba via bundle;
- `atividades.aba.cache`: tempo ao reabrir a aba usando cache local;
- `atividades.aba.fallback_lista`: tempo quando o bundle nao esta disponivel;
- `atividades.detalhe.cache`: abertura de detalhe sem nova chamada;
- `atividades.detalhe.fallback_backend`: detalhe carregado pelo endpoint antigo.
