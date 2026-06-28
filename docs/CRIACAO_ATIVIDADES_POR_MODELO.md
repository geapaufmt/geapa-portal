# Criacao de atividades por modelo homologado

O Portal GEAPA deixou de usar tipo, subtipo e regras de frequencia livres no formulario normal. O usuario autorizado seleciona um modelo de `Atividades_Config` e informa apenas os dados concretos da ocorrencia.

## Rotas

- `GET /atividades/modelos`;
- `GET /atividades/modelo?idConfig=...`;
- `POST /atividades/modelo/validar`;
- `POST /atividades/modelo/criar`.

O Apps Script valida a sessao, resolve o contexto pelo GEAPA_CORE e chama o modulo `geapa-atividades`. O navegador nao acessa planilhas nem define permissao, tipo, subtipo, presenca, falta, certificado, justificativa, acesso ou publicacao.

## Interface

O formulario:

- agrupa modelos por `GRUPO_MODELO`;
- mostra os padroes aplicados;
- exibe eixo e pessoa principal conforme o modelo;
- envia primeiro um dry-run;
- exige confirmacao do usuario;
- reenvia o token temporario para a criacao real.

A rota antiga `/atividades/criar` permanece no Apps Script por compatibilidade, mas a interface normal usa somente as rotas por modelo.

## Homologacao

Validar `APRESENTACAO_MEMBRO`, `PALESTRA`, `ABERTURA_PERIODO` e `FECHAMENTO_PERIODO`, incluindo usuario sem permissao, modelo inativo e tentativa de adulterar regra sensivel. Depois da criacao, confirmar a atualizacao da agenda, historico e detalhes.
