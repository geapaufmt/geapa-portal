# Contrato Inicial de Atividades

Este documento descreve o contrato lógico inicial para a tela de Atividades do
Portal GEAPA. Nesta fase, o front-end usa dados mockados e não chama o Apps
Script para atividades.

## Regras gerais

- O GitHub Pages nunca acessa planilhas diretamente.
- O front-end pode esconder botões por perfil, mas a autorização real deve ser
  sempre feita no Apps Script.
- Ações sensíveis como criar atividade, editar atividade, registrar chamada e
  justificar falta permanecem mockadas até existir backend validado.
- Nenhum mock deve conter dados pessoais reais.

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

Contrato lógico:

```text
GET /atividades/listar
```

No Apps Script atual, a implementação real poderá usar ação equivalente:

```text
acao=atividadesListar
```

Resposta esperada:

```json
{
  "ok": true,
  "data": [
    {
      "idAtividade": "ATV-0005",
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
GET /atividades/detalhe?idAtividade=ATV-0005
```

No Apps Script atual, a implementação real poderá usar ação equivalente:

```text
acao=atividadeDetalhe&idAtividade=ATV-0005
```

Resposta esperada:

```json
{
  "ok": true,
  "data": {
    "idAtividade": "ATV-0005",
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
- `GET /atividades/chamada?idAtividade=ATV-0005`
- `POST /atividades/registrar-chamada`
- `POST /atividades/justificar-falta`
- `GET /justificativas/minhas`
- `GET /diretoria/pendencias`

Esses endpoints não estão implementados nesta entrega.

## Validações obrigatórias no backend futuro

- sessão válida;
- membro ou diretor localizado;
- perfil autorizado;
- ação permitida para o status da atividade;
- prazo válido, quando houver;
- lock para evitar concorrência;
- log de ação;
- retorno estruturado e sem dados desnecessários.
