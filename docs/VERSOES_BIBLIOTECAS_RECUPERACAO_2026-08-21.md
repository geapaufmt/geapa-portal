# Versoes de bibliotecas na recuperacao de 2026-08-21

Este registro documenta o estado encontrado; ele nao afirma equivalencia entre commits Git e versoes publicadas do Google Apps Script.

| Consumidor | Biblioteca | Versao declarada |
| --- | --- | --- |
| Portal | GEAPA_CORE | 23 |
| Portal | GEAPA_ATIVIDADES | 19 |
| Portal | GEAPA_MEMBROS | 8 |
| Membros | GEAPA_CORE | 21 |
| Atividades | GEAPA_CORE | 15 |

Os manifests mantem `developmentMode: false`. Nao foi localizada no repositorio uma tabela auditavel que associe as versoes 23, 21, 19, 15 e 8 aos commits recuperados. Por isso, nenhuma versao foi alterada nesta correcao.

Antes de publicar, a equipe deve registrar, para cada biblioteca, o deployment/version ID, o commit Git correspondente e o ambiente de destino. Ate essa conciliacao, os testes DEV/HOMOLOG devem usar deployments controlados e confirmar explicitamente os contratos Core -> Membros/Atividades -> Portal.
