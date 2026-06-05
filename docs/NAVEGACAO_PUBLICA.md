# Navegacao Publica e Areas do Portal

O Portal GEAPA deve abrir pela home publica. Login nao e a porta de entrada
principal: ele e exigido apenas quando a pessoa deseja criar ou acompanhar
vinculo, acessar dados proprios, participar de fluxos restritos ou operar a
gestao.

## Grupos Do Menu

A matriz visual de rotas fica em `web/assets/js/navigation.js` e organiza o
menu em quatro grupos recolhiveis:

- Area Publica
- Meu Vinculo
- Atividades e Apresentacoes
- Gestao do GEAPA

Rotas vazias ou sem acesso nao aparecem. Tentativas diretas via hash continuam
passando pelo mesmo guard visual.

## Modelo Visual

O vocabulario central de interface fica em `web/assets/js/portal-model.js`.
Esse arquivo define:

- `tipoPessoa`: publico, participante externo, professor ou membro;
- `perfilPortal`: visitante, membro, comunicacao, secretaria, diretoria ou admin;
- `vinculoGeapa`: interessado, participante externo, professor, membro efetivo,
  membro suspenso, ex-membro e estados relacionados;
- `permissoesExtras`: permissoes operacionais de interface.

O Portal nao calcula essas classificacoes a partir de planilhas. A fonte oficial
continua sendo o GEAPA-CORE e os modulos do ecossistema.

## Regras De Entrada

- Pessoa sem login acessa a Area Publica.
- Pessoa autenticada sem cadastro completo permanece como `VISITANTE` tecnico.
- Participante externo nao recebe area interna automaticamente.
- Rotas de Meu Vinculo exigem login e dados filtrados pelo backend.
- Rotas de Gestao exigem perfil operacional ou permissao efetiva.

## Incremento Atual

O incremento inicial entrega:

- home publica como rota padrao;
- botao Entrar separado da pagina inicial;
- menu lateral em quatro grupos recolhiveis;
- rotas publicas abertas;
- rotas internas preservando guard central;
- placeholders para areas ainda nao implementadas.

As acoes sensiveis continuam dependendo de validacao no Apps Script, GEAPA-CORE
e modulos especializados.
