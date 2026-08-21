# Versoes de bibliotecas na recuperacao de 2026-08-21

Este registro documenta o estado encontrado e a conciliacao somente leitura realizada
com as versoes publicadas do Google Apps Script. Nenhum `clasp push`, `clasp deploy`
ou alteracao remota foi executado.

| Consumidor | Biblioteca | Versao declarada |
| --- | --- | --- |
| Portal | GEAPA_CORE | 24 |
| Portal | GEAPA_ATIVIDADES | 20 |
| Portal | GEAPA_MEMBROS | 9 |
| Membros | GEAPA_CORE | 21 |
| Atividades | GEAPA_CORE | 15 |

Os manifests mantem `developmentMode: false`. Antes desta auditoria nao existia no
repositorio uma tabela verificavel que associasse essas versoes aos commits Git.
Nenhuma versao de manifest foi alterada durante a conciliacao.

## Conciliacao por conteudo

As versoes foram baixadas para diretorio temporario com `clasp clone` e comparadas
arquivo a arquivo, normalizando apenas extensao `.js`/`.gs`, BOM, quebra de linha e
espacos finais.

| Biblioteca | Versao | Descricao publicada | Correspondencia Git | Resultado |
| --- | ---: | --- | --- | --- |
| GEAPA_CORE | 21 | Evolucao cadastral, catalogos e ingressos V2 para Portal HOMOLOG | `8a67790` | 53/53 arquivos identicos |
| GEAPA_CORE | 23 | Aprovacao e aplicacao cadastral coordenada para HOMOLOG | `22eafb4` | 54/54 arquivos identicos |
| GEAPA_MEMBROS | 8 | Estados terminais, feedback de egressos e ingresso V2 para HOMOLOG | `54debb9` | 26/26 arquivos identicos |
| GEAPA_ATIVIDADES | 19 | Dominios V2 por ambiente | `500a784` | 49/49 arquivos identicos |
| GEAPA_CORE | 15 | Dominios V2 por ambiente e perfil editavel | `b335b1d` (mais proximo) | 47/50 arquivos identicos |

O Core 15 difere de `b335b1d` apenas em `20_public_exports.js`,
`37_core_profile_updates.js` e `81_core_profile_updates_tests.js`. O contrato usado
por Atividades (`coreGetDomainSpreadsheet`, `coreGetDomainSheet`, ambiente explicito
e `forWrite`) existe na versao 15; o resolvedor de dominios correspondente e identico
ao Git. Portanto a dependencia declarada e coerente para o contrato consumido, mas a
versao 15 nao possui equivalencia integral com um unico SHA localizado.

## HEAD remoto e correcoes locais

| Modulo | HEAD remoto conciliado | Correspondencia | HEAD local corrigido | Estado de publicacao |
| --- | --- | --- | --- | --- |
| Core | publicado a partir do HEAD local corrigido | `9b2d3cd` | `9b2d3cd` | versao 24 criada |
| Membros | publicado a partir do HEAD local corrigido | `f2a76e8` | `f2a76e8` | versao 9 criada |
| Atividades | publicado a partir do HEAD local corrigido | `e22a4b0` | `e22a4b0` | versao 20 criada |

Antes da publicacao da versao 9, o `Código.js` do HEAD remoto de Membros acrescentava,
em relacao ao arquivo recuperado, a rotina manual `testarDryRunsVinculoDev`. Ela nao
integrava a versao 8 publicada, nao pertencia aos contratos consumidos pelo Portal e
foi deliberadamente removida do HEAD ao publicar `f2a76e8`, evitando introduzir uma
ferramenta DEV no codigo versionado de producao.

As correcoes locais receberam novas versoes imutaveis, sem reutilizar ou sobrescrever
as versoes conciliadas: Core 24 (`9b2d3cd`), Membros 9 (`f2a76e8`) e Atividades 20
(`e22a4b0`). O manifest do Portal foi atualizado somente depois da criacao dessas
versoes, mantendo `developmentMode: false`.

## Ordem controlada para DEV/HOMOLOG

1. Publicar e conferir a nova versao do Core a partir de `9b2d3cd`.
2. Publicar e conferir Membros a partir de `f2a76e8`, mantendo Core 21 enquanto nao
   houver necessidade contratual comprovada de elevar essa dependencia.
3. Publicar e conferir Atividades a partir de `e22a4b0`, mantendo Core 15 pelo mesmo
   criterio conservador.
4. Atualizar o manifest do Portal somente para as novas versoes efetivamente criadas.
5. Executar smoke tests em DEV e depois em HOMOLOG na cadeia
   Core -> Membros/Atividades -> Portal.
6. Nao promover para PROD antes de registrar resultados, SHAs, versoes e rollback.
