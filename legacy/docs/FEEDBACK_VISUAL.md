# Feedback visual de acoes

O Portal usa `PortalGeapaUi` como camada unica para feedback de escrita. O
componente nao decide permissao nem resultado: ele apenas apresenta o envelope
recebido do Apps Script.

## Tipos

- `success`: acao concluida;
- `info`: informacao sem bloqueio;
- `warning`: acao concluida com aviso ou estado que exige atencao;
- `error`: acao nao concluida;
- `pending`: requisicao ainda em processamento.

Toasts usam `aria-live`, desaparecem automaticamente e podem ser atualizados
pelo mesmo ID. Um toast `pending` fica persistente somente durante a requisicao.
Erros importantes tambem sao exibidos dentro do modal ou tela, onde permanecem
ate a proxima acao ou navegacao.

## Envelope consumido

```json
{
  "ok": true,
  "message": "Acao concluida.",
  "data": {},
  "warnings": [],
  "fieldErrors": {},
  "nextActions": []
}
```

`PortalGeapaUi.normalizarFeedbackResposta` aceita temporariamente os aliases
`mensagem` e `avisos`, inclusive quando vierem em `data` ou `meta`. Mensagens
com aparencia de stack trace ou excecao sao substituidas por texto amigavel.

## Fluxos integrados

- criacao de atividade por modelo: pendente, erro por campo, sucesso persistente,
  ID/status e atualizacao da agenda;
- envio de titulo/eixos: pendente, erro por campo, sucesso e proxima acao;
- aprovacao, devolucao para ajuste e reprovacao de titulo/eixos: feedback
  persistente na tela de gestao e recarga das pendencias.

Edicao, publicacao, ocultacao e cancelamento de atividade devem usar a mesma
camada quando seus comandos forem expostos pelo Portal. Esses comandos ainda nao
possuem rota ou botao ativo neste repositorio; o componente nao cria endpoints
nem simula resultado de backend.

## Checagem manual

1. Submeter criacao com campos obrigatorios vazios e confirmar resumo mais erro
   junto aos campos.
2. Criar atividade e confirmar toast, ID/status, `Abrir atividade`, `Criar outra`
   e lista atualizada.
3. Enviar titulo/eixos e confirmar mensagem de pendencia de analise.
4. Aprovar, solicitar ajuste e reprovar proposta; confirmar mensagem especifica
   e card atualizado sem reload manual.
5. Simular `warnings`, `fieldErrors` e `nextActions` no mock e confirmar que o
   conteudo aparece sem HTML vindo do backend.
