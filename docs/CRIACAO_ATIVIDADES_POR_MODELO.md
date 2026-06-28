# Criacao de atividades por modelo homologado

O Portal GEAPA deixou de usar tipo, subtipo e regras de frequencia livres no formulario normal. O usuario autorizado seleciona um modelo de `Atividades_Config` e informa apenas os dados concretos da ocorrencia.

## Rotas

- `GET /atividades/modelos`;
- `GET /atividades/modelo?idConfig=...`;
- `GET /atividades/modelo/membros-apresentadores?idConfig=...&referencia=...`;
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
- mostra feedback pendente durante validacao/criacao;
- mostra toast de sucesso e resultado persistente com ID, status operacional,
  publicacao e visibilidade;
- oferece `Abrir atividade` e `Criar outra` depois da criacao real;
- destaca `fieldErrors` junto aos campos e mantem um resumo no modal.

A rota antiga `/atividades/criar` permanece no Apps Script por compatibilidade, mas a interface normal usa somente as rotas por modelo.

Depois do sucesso, o Portal invalida o cache local de atividades e recarrega a
lista sem exigir atualizacao manual. Avisos retornados pelo backend continuam
visiveis no bloco persistente.

### Apresentacao de membro

Para `APRESENTACAO_MEMBRO`, o formulario mostra apenas data, horarios, formato, local e o seletor `Membro apresentador *`. Titulo, descricoes, eixos, material, tipo/papel/e-mail/instituicao da pessoa e responsavel interno nao sao solicitados no agendamento.

O seletor consulta o backend e usa `ID_PESSOA` como chave. Nome e RGA servem para exibicao/conferencia; e-mail, tipo `MEMBRO` e papel `APRESENTADOR` sao preenchidos internamente no payload. O backend revalida a pessoa, gera o titulo inicial e atribui a responsabilidade a `Secretaria GEAPA`.

Membros com apresentacao ativa no mesmo ciclo GEAPA aparecem indisponiveis, mesmo que a apresentacao esteja em outro semestre do ciclo. O rotulo informa o ID institucional, por exemplo `Ja agendado no ciclo GEAPA_2026`. O Portal nao concede excecao: o backend retorna `EXCECAO_NECESSARIA` para tratamento futuro. Titulo/eixos e material seguem como pendencias posteriores do fluxo de apresentacao.

A ordenacao recebida do backend mantem elegiveis antes dos nao elegiveis e usa RGA dentro de cada grupo. O Portal nao calcula ciclo por ano ou semestre; apenas exibe `idCiclo`, `rotuloCiclo` e a situacao resolvidos pelo backend.

## Homologacao

Validar `APRESENTACAO_MEMBRO`, `PALESTRA`, `ABERTURA_PERIODO` e `FECHAMENTO_PERIODO`, incluindo usuario sem permissao, modelo inativo e tentativa de adulterar regra sensivel. Para apresentacao de membro, confirmar que existe apenas um campo `tipoPessoaPrincipal`, que o seletor preenche `ID_PESSOA`, que titulo/eixo/material nao bloqueiam o agendamento e que membro ja agendado exige excecao. Depois da criacao, confirmar a atualizacao da agenda, historico e detalhes.
