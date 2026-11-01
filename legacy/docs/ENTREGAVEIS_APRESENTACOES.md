# Entregaveis de apresentacoes

O Portal trata separadamente titulo/eixos, slide/material e foto da reuniao.
Nenhuma tela escreve diretamente em Google Sheets ou Drive.

## Contratos

- `POST /v2/apresentacoes/material/registrar`: envia slide/material.
- `POST /v2/apresentacoes/material/revisar`: revisa slide/material.
- `POST /v2/apresentacoes/foto/registrar`: envia foto por upload ou link Drive.
- `POST /v2/apresentacoes/foto/revisar`: aprova, solicita ajuste ou dispensa foto.

`Minhas apresentacoes` usa as flags `acoesMembro` devolvidas pelo backend. A tela
de pendencias usa `acoesGestao`. Ocultar botoes no navegador nao substitui a
autorizacao no Apps Script.

## Interface

O bloco antes chamado Material aparece como `Slide/material da apresentacao`.
Foto da reuniao possui status, link e acoes proprias. Gestao -> Atividades mostra
os dois recursos separadamente no detalhe administrativo.

Estados suportados para slide e foto: `PENDENTE`, `RECEBIDO`, `REENVIADO`,
`APROVADO`, `AJUSTE_SOLICITADO`, `DISPENSADO` e `HISTORICO`. A foto aceita JPG,
JPEG, PNG e WEBP em base64, ou link de arquivo do Google Drive validado pelo
backend. O Portal nao constroi links a partir de IDs internos do Drive.

`SOLICITAR_AJUSTE` e `DISPENSAR` exigem observacao. O membro apresentador pode
enviar ou reenviar somente quando `acoesMembro` autorizar. A revisao usa apenas
`acoesGestao` e continua protegida no Apps Script e no modulo Atividades.

Atividades canceladas ou arquivadas nao mostram pendencias ativas. Depois de
qualquer envio ou revisao, o Portal invalida Minhas apresentacoes, Pendencias,
detalhes de atividade e Gestao -> Atividades para evitar payload antigo.

Depois de publicar backend e frontend, limpe o cache do Portal ou faca uma
atualizacao forcada para carregar o service worker mais recente.
