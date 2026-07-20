# Integracao da evolucao de membros em HOMOLOG

## Dependencias entre PRs

Ordem logica, sem merge ou publicacao nesta entrega:

1. Core [#22](https://github.com/geapaufmt/geapa-core/pull/22): modelo cadastral, catalogos, validacoes e setup DEV.
2. Membros [#19](https://github.com/geapaufmt/geapa-membros/pull/19): estados terminais e avaliacao de egresso.
3. Membros [#20](https://github.com/geapaufmt/geapa-membros/pull/20): ingresso coordenado de membros aprovados e catalogo administrativo.
4. Portal [#26](https://github.com/geapaufmt/geapa-portal/pull/26): pendentes/encerradas e detalhe terminal.
5. Portal [#27](https://github.com/geapaufmt/geapa-portal/pull/27): avaliacao voluntaria por token.
6. Portal [#28](https://github.com/geapaufmt/geapa-portal/pull/28): localidades, curso e dados academicos no perfil.
7. Portal [#29](https://github.com/geapaufmt/geapa-portal/pull/29): cadastro administrativo de membros aprovados.
8. Este PR: cache/PWA, gates de leitura, testes cruzados e checklist final.

Os PRs do Portal sao empilhados nessa ordem. Ao integrar, cada diff deve ser conferido contra a base imediatamente anterior para evitar duplicar commits.

## Setups DEV/HOMOLOG

Nenhum setup foi executado por esta entrega. A sequencia segura futura e:

1. Core, dry-run padrao:

   ```javascript
   geapaCoreSetupEvolucaoMembrosV2Dev({ ambiente: 'DEV', dryRun: true })
   ```

   Deve planejar os campos aditivos e as abas `CURSOS_CATALOGO`, `INGRESSOS_MEMBROS`, `CONVITES_AVALIACAO_EGRESSOS` e `RESPOSTAS_AVALIACAO_EGRESSOS`, as keys DEV e a permissao para ADMIN/DIRETORIA. Token futuro de escrita: `PREPARAR_EVOLUCAO_MEMBROS_V2_DEV`.

2. Membros, dry-runs de compatibilidade do fluxo de vinculo:

   ```javascript
   membersVinculoSetupSolicitacoesV2({ ambiente: 'DEV', dryRun: true })
   membersVinculoSetupEventoIdVinculoV2({ ambiente: 'DEV', dryRun: true })
   membersVinculoAuditarRegistryV2({ ambiente: 'DEV', dryRun: true })
   ```

   Se ainda houver pendencias, os tokens futuros sao `CRIAR_SOLICITACOES_VINCULO_DEV` para aba ausente, `ATUALIZAR_CABECALHOS_SOLICITACOES_VINCULO_DEV` para cabecalhos ausentes e `ADICIONAR_ID_VINCULO_EVENTOS_DEV` para a coluna aditiva. Nao executar mais de uma intencao sem novo dry-run.

3. Revisar que o plano nao apaga, reordena ou sobrescreve dados; autorizar separadamente qualquer escrita DEV.
4. Repetir todos os dry-runs depois da preparacao e exigir zero pendencias/duplicacoes.

## Ordem futura de publicacao em HOMOLOG

1. Integrar Core #22 e criar uma nova versao imutavel da Library a partir do commit integrado.
2. Fixar essa versao no branch Membros integrado; manter `developmentMode=false`; criar uma nova versao imutavel de Membros.
3. Executar e revisar os dry-runs DEV. Somente com autorizacao separada, executar os setups DEV.
4. Integrar a pilha do Portal na ordem #26, #27, #28, #29 e este PR.
5. Fixar no Apps Script HOMOLOG as novas versoes de Core e Membros, executar `clasp push` somente no projeto HOMOLOG e criar novo deployment HOMOLOG.
6. Gerar `config.js` com `npm run config:homolog` e publicar somente o canal/Hosting HOMOLOG.
7. Confirmar `portal-geapa-pwa-v120`, limpar dados do site uma vez e testar navegador normal, anonimo, PWA e celular.

## Checklist funcional

- Pendentes abrem com `Analisar`; estados terminais com `Visualizar`, sem formulario de decisao.
- Resposta voluntaria so existe por convite pos-desligamento, token unico e sem identidade na aba de respostas.
- Perfil valida pais/UF/municipio; curso e campos academicos calculados sao somente leitura.
- Cadastro administrativo aparece apenas com a nova permissao, usa catalogo ativo e nao envia ator ou IDs.
- Cadastro rapido/completo cria uma unica operacao; clique duplo nao duplica entidades.
- Falhas de e-mail nao revertem desligamento nem ingresso.
- `ENABLE_EGRESS_FEEDBACK` e `ENABLE_MEMBER_REGISTRATION` estao `true` somente em HOMOLOG e `false` em PROD.
- Login, Minha situacao, Meu perfil, solicitacoes de vinculo e notificacoes existentes continuam funcionando.
- Layout conferido em 360 px, 390 px, tablet e desktop, sem rolagem horizontal da pagina.

## Rollback de HOMOLOG

1. Desligar as duas flags em HOMOLOG.
2. Restaurar o deployment Apps Script HOMOLOG anterior e o release Hosting anterior.
3. Nao apagar filas, convites, respostas ou ingressos ja registrados.
4. Manter registros em erro para diagnostico e reprocessamento idempotente.
5. PROD nao participa deste rollback porque nao foi alterado.

## Promocao posterior unica para PROD

Somente depois da homologacao completa: preparar PRs limpos contra `main`, executar dry-runs PROD especificos que ainda deverao ser implementados/revisados, publicar novas Libraries imutaveis, manter as flags PROD desligadas durante testes de leitura, habilitar de forma controlada e executar um teste de escrita autorizado. Qualquer falha deve desligar as flags e restaurar os deployments anteriores sem excluir dados.
