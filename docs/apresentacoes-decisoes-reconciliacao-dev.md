# Reconciliação de decisões de Apresentações — DEV

Quando uma decisão perde a resposta HTTP, o Portal não a classifica como
falha. Ele consulta o endpoint read-only
`/v2/apresentacoes/decisoes/status` usando o mesmo `requestId`, ID da
apresentação e tipo de decisão.

- `COMPLETED`: o commit atômico foi confirmado pelo registro idempotente; a
  interface informa sucesso e recarrega a tela.
- `PROCESSING`: são feitas no máximo três consultas read-only, com intervalo
  indicado pelo backend. Persistindo o estado, a interface informa que a
  operação continua em andamento.
- `INDETERMINATE`: não há confirmação de commit. O formulário permanece
  disponível e o próximo envio reutiliza obrigatoriamente o mesmo `requestId`.

O mecanismo comum cobre `APPROVE`, `REJECT`, `REQUEST_ADJUSTMENT` e
`EDIT_APPROVE`. O endpoint exige sessão e permissão de gestão, funciona somente
em DEV/HOMOLOG e não executa writer, projeção, invalidação de cache,
notificação ou qualquer escrita.

Uma resposta normal continua seguindo o caminho anterior. A reconciliação é
acionada somente para timeout ou falha de transporte e nunca interpreta o
timeout como prova de falha do commit.
