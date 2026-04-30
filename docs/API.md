# Contrato da API do Portal GEAPA

Este documento descreve o contrato inicial entre o front-end publico do Portal
GEAPA e o backend em Google Apps Script.

Nesta etapa, a API ja pode enviar codigo real por e-mail, mas somente para
enderecos liberados em uma lista de teste nas propriedades do Apps Script. Ela
nao valida cadastro oficial e nao acessa planilhas oficiais.

## URL base

```text
https://script.google.com/macros/s/AKfycbxf-vC0VFALa45AlT1ycKJcL44EB6LiCFBwVy3LIPvrWGxyd5_1U2XKRM03_7rsh-k/exec
```

## Formato de envio

O front-end envia requisicoes `POST` como formulario simples:

```http
Content-Type: application/x-www-form-urlencoded
```

Campo obrigatorio comum:

```text
acao=<nome-da-acao>
```

Esse formato reduz complexidade de CORS nesta fase inicial.

## Envelope de resposta

Todas as respostas devem seguir este formato:

```json
{
  "ok": true,
  "code": "CODIGO_DA_RESPOSTA",
  "message": "Mensagem para exibição ou debug controlado.",
  "data": {},
  "meta": {
    "app": "Portal GEAPA",
    "modo": "placeholder",
    "versaoContrato": "v1-placeholder"
  }
}
```

Campos:

- `ok`: indica sucesso ou falha da operação.
- `code`: codigo estavel para o front-end tratar respostas.
- `message`: mensagem curta e não sensível.
- `data`: dados especificos da acao.
- `meta`: informações técnicas não sensíveis.

## GET de saude

Requisicao:

```http
GET /exec
```

Resposta esperada:

```json
{
  "ok": true,
  "code": "PORTAL_API_OK",
  "message": "API do Portal GEAPA ativa em modo placeholder.",
  "data": {
    "acoesDisponiveis": [
      "solicitarCodigo",
      "validarCodigo",
      "minhaSituacao"
    ]
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "placeholder",
    "versaoContrato": "v1-placeholder"
  }
}
```

## Acao: solicitarCodigo

Entrada:

```text
acao=solicitarCodigo
emailOuRga=valor-informado-pelo-membro
```

Resposta em modo de teste com envio habilitado:

```json
{
  "ok": true,
  "code": "CODIGO_ENVIADO_TESTE",
  "message": "Código enviado para o e-mail autorizado de teste.",
  "data": {
    "identificadorRecebido": "valor-informado-pelo-membro",
    "validadeMinutos": 10
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "placeholder",
    "versaoContrato": "v1-placeholder"
  }
}
```

## Acao: validarCodigo

Entrada:

```text
acao=validarCodigo
emailOuRga=valor-informado-pelo-membro
codigo=123456
```

Resposta em modo de teste:

```json
{
  "ok": true,
  "code": "CODIGO_VALIDADO_TESTE",
  "message": "Código validado em modo de teste.",
  "data": {
    "sessionToken": "sessao-temporaria",
    "identificadorRecebido": "valor-informado-pelo-membro"
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "placeholder",
    "versaoContrato": "v1-placeholder"
  }
}
```

## Acao: minhaSituacao

Entrada:

```text
acao=minhaSituacao
token=sessao-temporaria
```

Resposta placeholder:

```json
{
  "ok": true,
  "code": "MINHA_SITUACAO_PLACEHOLDER",
  "message": "Situação simulada carregada.",
  "data": {
    "situacao": {
      "nomeExibicao": "Membro GEAPA",
      "situacaoGeral": "Em simulação",
      "vinculo": "Membro em acompanhamento",
      "ultimaAtualizacao": "2026-04-30T00:00:00.000Z",
      "resumo": {
        "frequencia": "Simulada",
        "pendenciasAbertas": 0,
        "certificadosDisponiveis": 1
      },
      "pendencias": [],
      "participacao": {
        "frequenciaGeral": "Sem dados oficiais nesta etapa",
        "atividadesRecentes": []
      },
      "certificados": [],
      "avisos": []
    }
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "placeholder",
    "versaoContrato": "v1-placeholder"
  }
}
```

## Codigos de erro previstos

- `ACAO_OBRIGATORIA`: nenhuma acao foi enviada.
- `ACAO_NAO_RECONHECIDA`: a acao enviada nao existe.
- `REQUISICAO_INVALIDA`: a requisicao nao pode ser lida.
- `ERRO_INTERNO_PLACEHOLDER`: erro inesperado nesta etapa placeholder.
- `IDENTIFICADOR_OBRIGATORIO`: e-mail ou RGA nao foi informado.
- `IDENTIFICADOR_NAO_SUPORTADO_NESTA_ETAPA`: nesta fase, apenas e-mails de teste sao aceitos.
- `ENVIO_EMAIL_DESABILITADO`: envio real nao foi habilitado nas propriedades.
- `EMAIL_FORA_DA_LISTA_TESTE`: e-mail nao esta na lista de teste.
- `AGUARDE_NOVA_SOLICITACAO`: ha uma solicitacao recente para o mesmo e-mail.
- `DADOS_VALIDACAO_OBRIGATORIOS`: faltam identificador ou codigo.
- `CODIGO_EXPIRADO_OU_INEXISTENTE`: nao ha codigo valido no cache.
- `CODIGO_INVALIDO`: codigo informado nao confere.
- `TENTATIVAS_EXCEDIDAS`: limite de tentativas foi atingido.
- `SESSAO_OBRIGATORIA`: token de sessao nao foi informado.
- `SESSAO_INVALIDA_OU_EXPIRADA`: sessao nao existe ou expirou.

## Propriedades privadas do Apps Script

Configurar em **Project Settings > Script properties**:

```text
PORTAL_ENVIO_EMAIL_HABILITADO=true
PORTAL_EMAILS_TESTE=email1@exemplo.org,email2@exemplo.org
PORTAL_CODIGO_SALT=valor-aleatorio-longo
```

Esses valores nao devem ser versionados no GitHub.

Erros futuros deverao usar codigos estaveis, sem expor detalhes sensiveis ao
front-end.
