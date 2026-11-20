# Reconciliação do Portal GEAPA em 20/11/2026

## Referências verificadas

| Ambiente | Versão do Hosting | Release | Hora em Cuiabá | Fontes rastreadas da publicação |
|---|---|---|---|---|
| PROD | `c8740f0b3403b0e7` | `1795198201450000` | 14h10 | `7d76751efe269eaa0d1d1b4933634083d1f9ae32` |
| DEV | `5e24796dafb7ebdc` | `1795199142240000` | 14h25 | `ad2a1817e87d4eb88ec060ceec77cbe80a8f8a63` |

O cartão **Versão atual** do console do Firebase mostrou os sufixos `03b0e7` e `b7ebdc`, os horários e as descrições das publicações extraordinária PROD e PIA DEV. Os IDs completos, o instante exato e os hashes vieram dos recibos preservados correspondentes. A consulta ao GitHub confirmou `73d1483e4da42dcbdd086b35724df596d157cf2d` na principal do Portal e `54d4eb71927fa2eb5c0de621d304e16b7266142c` na principal do Core. Os registros consultados coincidem com a auditoria.

## Reconstrução local

Em um clone completo da branch de reconciliação, execute as linhas abaixo a partir da raiz, em PowerShell. Defina `GEAPA_OVERLAY_PROD` e `GEAPA_OVERLAY_DEV` como caminhos absolutos dos dois arquivos privados. Escolha destinos novos para as duas árvores de trabalho. O npm utiliza o lockfile de cada revisão. O ensaio foi executado com Node 24 e TypeScript 5.9.3.

```powershell
git worktree add --detach ../replay-prod 7d76751efe269eaa0d1d1b4933634083d1f9ae32
git worktree add --detach ../replay-dev ad2a1817e87d4eb88ec060ceec77cbe80a8f8a63

npm --prefix ../replay-prod ci
node ../replay-prod/scripts/build.cjs --env prod --overlay "$env:GEAPA_OVERLAY_PROD"
npm run verify:hosting -- prod ../replay-prod

npm --prefix ../replay-dev ci
node ../replay-dev/scripts/build.cjs --env dev --overlay "$env:GEAPA_OVERLAY_DEV"
npm run verify:hosting -- dev ../replay-dev
```

PROD usa o esquema de 27 parâmetros. DEV usa os mesmos 27 e um parâmetro adicional para a conta sintética do fluxo extraordinário. Na árvore DEV, o esquema declara a chave adicional e o template indica as duas ocorrências que recebem o mesmo valor. Os arquivos privados permanecem fora do repositório. A verificação enumera o diretório de saída, compara cada caminho e o SHA-256 dos bytes gzip nível 9 e confere os cabeçalhos e as reescritas com o recibo de Hosting. Paths adicionais, ausências ou diferenças de conteúdo reprovam a verificação.

## Desenvolvimento e integração

A primeira linha de desenvolvimento parte da principal oficial e incorpora as telas, a normalização dos cartões, os quatro comandos e as quatro rotas de regularização de título, resumo e eixos. O contrato conserva os comandos de Frequência/RH, os procedimentos e as interações PIA. O executor DEV recupera também o salvamento de semestre. A interface continua usando as ações fornecidas pelo Core. Os dois commits históricos de release entram como ancestrais da branch. Essa organização permite compartilhar os objetos Git e usar o mesmo compilador e script de build, sem manter cópias de `dist` no repositório.

O build padrão continua acompanhando o desenvolvimento. A inclusão de `attendance-rh.mjs` em sua saída PROD conserva o trabalho da principal. O histórico PROD recompõe o inventário publicado sem esse caminho. Login Google adicional de DEV, instrumentação de App Check, composição específica de governança e tratamento da sessão têm suas versões recuperadas identificadas na matriz. Promover esses comportamentos entre ambientes constitui uma decisão posterior. As diferenças de apresentação, login e sessão entre os alvos históricos podem ser examinadas com `git diff` entre seus commits.

Na integração futura, usar um merge que conserve os ancestrais, pois o procedimento de reprodução referencia os dois commits pelos seus IDs. Se a política do repositório exigir squash, criar referências Git duráveis para os dois commits antes de remover a branch de reconciliação. Os hashes das publicações de 01/11 continuam disponíveis para seus procedimentos próprios.

A prova cobre a saída estática e as configurações HTTP registradas para essas versões. A validação de Firestore, IAM, Auth, App Check em operação e dos serviços do Core pertence a outra etapa. Os testes da branch exercitam o frontend com dados sintéticos.

[Matriz das diferenças da principal e da publicação](./matriz-portal-20261120.md)
