# Cadastro administrativo de membros aprovados

## Escopo

Esta entrega inicia o fluxo somente depois da aprovacao institucional do ingresso. O Portal nao recebe inscricoes, notas, entrevistas, classificacao ou decisoes de processo seletivo.

O botao `Cadastrar novo membro` aparece apenas quando `ENABLE_MEMBER_REGISTRATION=true` e a sessao possui `membros:cadastrar_novos_membros`. O Apps Script e o modulo Membros repetem a autorizacao e resolvem ator e ambiente no backend.

Cadastro rapido e cadastro completo enviam o mesmo contrato. O navegador nao envia `ID_PESSOA`, `ID_VINCULO`, ator, periodo de ingresso no curso ou semestre atual calculado. Cursos sao lidos de `CURSOS_CATALOGO`; localidades usam o catalogo IBGE versionado e continuam validadas no Core.

## Riscos e protecoes

- A escrita depende dos setups DEV de Pessoas V2 e da Library Membros contendo os contratos de ingresso.
- Clique duplo reutiliza a mesma chave de idempotencia e o botao permanece desabilitado durante a chamada.
- Falha do convite nao reverte o cadastro; a fila registra a etapa para reprocessamento.
- `config.prod.js` mantem a feature desabilitada e o backend rejeita ambiente diferente de DEV.

## Homologacao

1. Publique primeiro as branches dependentes do Core e Membros em versoes imutaveis de HOMOLOG.
2. Execute apenas os dry-runs documentados e, depois de conferir o plano, os setups DEV autorizados.
3. Atualize o projeto Apps Script HOMOLOG para as versoes fixas das Libraries.
4. Publique o backend e o Hosting HOMOLOG desta pilha de PRs.
5. Entre com usuario ADMIN ou DIRETORIA que possua a nova permissao.
6. Confira o catalogo de cursos e execute um cadastro controlado com e-mail/RGA exclusivos de DEV.
7. Confirme uma unica linha na fila, entidades V2 unicas, vinculo ativo, evento homologado, resumo recalculado e convite enfileirado.
8. Repita o envio com a mesma chave somente em teste automatizado; a interface bloqueia clique duplo.

## Rollback

Desative `ENABLE_MEMBER_REGISTRATION` em HOMOLOG e restaure o Hosting/backend anterior. Nao apague linhas ja registradas. Reprocesse ingressos com erro somente depois de diagnosticar a etapa gravada.

PROD nao foi alterado, publicado ou preparado por esta entrega.
