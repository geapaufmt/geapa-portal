# Contrato da API do Portal GEAPA

Este documento descreve o contrato inicial entre o front-end publico do Portal
GEAPA e o backend em Google Apps Script.

Nesta etapa, a API ja pode resolver um membro pelo `GEAPA_CORE` ou por um
cadastro de teste privado, enviar codigo real ao e-mail cadastrado e carregar a
primeira versao parcial da tela "Minha situacao". Nome, RGA, vinculo e situacao
geral podem vir do backend; frequencia, pendencias, certificados e historico
ainda ficam em preparacao.

O backend possui dois pontos de integracao com GEAPA-CORE:

- `geapaCoreBuscarMembroParaPortal(emailOuRga)`, usado no fluxo de codigo para
  localizar o e-mail cadastrado do membro;
- `geapaCoreBuscarMinhaSituacaoParaPortal(emailOuRga)`, usado para carregar a
  tela "Minha situacao".

Essas funcoes podem estar copiadas no mesmo projeto Apps Script ou expostas por
biblioteca com identificador `GEAPA_CORE`. Se essa integracao nao existir no
ambiente, a API usa `PORTAL_MEMBROS_TESTE_JSON` e monta uma resposta parcial
local como fallback.

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
    "destino": "me***@exemplo.org",
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

Resposta quando a situacao vem do GEAPA-CORE:

```json
{
  "ok": true,
  "code": "MINHA_SITUACAO_CORE",
  "message": "Minha situação carregada pelo GEAPA-CORE.",
  "data": {
    "situacao": {
      "nomeExibicao": "Membro GEAPA",
      "situacaoGeral": "Cadastro localizado",
      "vinculo": "Membro em acompanhamento",
      "dadosCadastraisReais": true,
      "blocosComplementares": "geapa-core",
      "ultimaAtualizacao": "2026-04-30T00:00:00.000Z",
      "resumo": {
        "frequencia": "Em preparação",
        "pendenciasAbertas": 1,
        "certificadosDisponiveis": 0
      },
      "pendencias": [
        {
          "tipo": "cadastro",
          "titulo": "RGA não informado",
          "descricao": "Procure a Diretoria para atualizar seu RGA no cadastro do GEAPA.",
          "severidade": "media",
          "status": "pendente"
        }
      ],
      "participacao": {
        "frequenciaGeral": "Participação e frequência serão integradas em uma próxima etapa.",
        "atividadesRecentes": [],
        "apresentacoes": {
          "periodoUltimaApresentacao": "GEAPA_2025",
          "quantidadeRealizadas": 2
        }
      },
      "diretoria": {
        "statusElegibilidade": "APTO",
        "diasComputados": 0,
        "limiteDias": 549,
        "saldoDias": 549,
        "dataLimiteEstimada": "18/05/2027"
      },
      "certificados": [],
      "avisos": [
        "Dados carregados pelo GEAPA-CORE.",
        "Frequência, certificados e histórico serão exibidos conforme forem integrados ao core."
      ]
    }
  },
  "meta": {
    "app": "Portal GEAPA",
    "modo": "placeholder",
    "versaoContrato": "v1-placeholder"
  }
}
```

As pendencias retornadas nesta etapa sao apenas cadastrais ou administrativas
objetivas. Nao devem incluir observacoes internas, motivos disciplinares,
motivos de suspensao ou avaliacao subjetiva.

O bloco `participacao.apresentacoes` usa apenas campos objetivos da aba
`Membros Atuais`: periodo da ultima apresentacao e quantidade consolidada de
apresentacoes. A coluna `QTD_APRESENTACOES_REALIZADAS` ja inclui a base legado,
entao o portal nao soma campos separados de legado. Ele nao inclui frequencia
detalhada nem lista de presenca.

O bloco `diretoria` e orientativo e usa apenas campos objetivos da aba
`Membros Atuais`: status de elegibilidade, dias computados, limite, saldo e data
limite estimada. Decisoes finais continuam sendo da Diretoria.

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
- `MEMBRO_SESSAO_NAO_ENCONTRADO`: a sessao existe, mas o cadastro associado nao
  foi encontrado pelo core nem pelo fallback de teste.

## Propriedades privadas do Apps Script

Configurar em **Project Settings > Script properties**:

```text
PORTAL_ENVIO_EMAIL_HABILITADO=true
PORTAL_EMAILS_TESTE=email1@exemplo.org,email2@exemplo.org
PORTAL_CODIGO_SALT=valor-aleatorio-longo
PORTAL_MEMBROS_TESTE_JSON=[{"emailCadastrado":"email1@exemplo.org","rga":"RGA-TESTE","nomeExibicao":"Membro de Teste","situacaoGeral":"Em simulacao","vinculo":"Membro em acompanhamento"}]
PORTAL_DIAGNOSTICO_IDENTIFICADOR=email-ou-rga-para-teste
```

Esses valores nao devem ser versionados no GitHub.

## Diagnostico interno de cadastro

Para descobrir se um cadastro esta sendo encontrado pelo `GEAPA_CORE`, pelo
fallback `PORTAL_MEMBROS_TESTE_JSON` ou se nao foi encontrado, use a funcao
manual:

```text
portalRunDiagnosticoCadastro
```

Antes de executar, configure a Script Property privada
`PORTAL_DIAGNOSTICO_IDENTIFICADOR` com o e-mail ou RGA de teste. A funcao
retorna apenas diagnostico mascarado, como origem do cadastro, e-mail mascarado,
RGA mascarado, status de envio de e-mail e se o e-mail cadastrado esta liberado
em `PORTAL_EMAILS_TESTE`.

Erros futuros deverao usar codigos estaveis, sem expor detalhes sensiveis ao
front-end.
