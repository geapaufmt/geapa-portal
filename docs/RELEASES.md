# Build, revisão e publicação

1. Desenvolver na branch de integração a partir do head oficial, preservando alterações posteriores.
2. Executar instalação limpa, typecheck, testes e build determinístico. O CI tem somente `contents: read` e não publica previews ou PROD.
3. Gerar um release privado com `node scripts/build.cjs --overlay <arquivo-fora-do-repositorio>`; `config/private-parameters.json` define as chaves, sem publicar valores.
4. Revisar `build/<ambiente>-manifest.json`, commit, inventário e hashes. Conservar o overlay e o pacote em armazenamento privado controlado. Não enviar `dist` para artefatos públicos do GitHub.
5. Integrar por PR com gates aprovados. Merge não dispara publicação.
6. Para DEV ou PROD, após autorização do destino, usar a raiz do checkout como diretório de trabalho. Ler todo o JSON de `config/<ambiente>.firebase.json`, substituir somente `hosting.public` por `dist/<ambiente>` e gravar o resultado em um JSON temporário UTF-8 na raiz do checkout, fora de `dist`. Executar `firebase deploy --only hosting --project <projeto-do-destino> --account <conta-autorizada> --config <arquivo-temporário>` e remover o arquivo em `finally`. Passar o modelo em `config/` diretamente ao CLI faz o diretório público ficar fora da raiz de publicação.
7. Conferir release ID, hashes entregues e verificações de leitura. Preservar o release anterior como opção de rollback de Hosting. Não restaurar dados ou alterar contratos do Core como parte de rollback visual.

Os workflows Firebase/Pages antigos estão arquivados em `legacy/workflows` com extensão `.disabled`; nenhum usa secrets ou executa publicação na configuração ativa. Eventuais ambientes protegidos/credenciais remotos não foram modificados nesta campanha.

## Reprodução da publicação de referência

```sh
node scripts/build.cjs --overlay <overlay-privado-validado>
node scripts/verify-published.cjs dev
node scripts/verify-published.cjs prod
```

Os manifestos públicos contêm hashes e IDs de release, não o overlay. Sem acesso autorizado ao overlay, o código e a prévia são reproduzíveis, mas os arquivos nominais não podem ser idênticos à publicação. Isso é uma separação deliberada de configuração privada, não uma fonte de código ausente.

Após qualquer alteração legítima de fontes, criar novo manifesto; não alterar o registro histórico para fazer uma comparação passar. A cadeia é: commit de fonte + lockfile + configuração privada identificada + manifesto de hashes → release Firebase.

Para campanhas DEV com o executor retomar-dev.ps1, use scripts/publicacao-dev.ps1 -Campanha <diretorio>. O diretorio contem as referencias aprovadas, os manifestos, a candidata privada e os recibos de recuperacao especificos da campanha. Depois de um upload confirmado use -SomenteConferir. Esse modo so consulta o ambiente e verifica os bytes servidos pelo Hosting. O aceite autenticado dos fluxos funcionais exige uma sessao sintetica autorizada.

Antes de trocar o Hosting, o responsável registra o aceite real em aceite-intermediario-dev.json, na pasta privada da campanha. O executor verifica project (geapa-convergencia-dev), releaseAnterior (nome completo do release live), sha256ReciboCore (SHA-256 hexadecimal minúsculo dos bytes de core-dev-publicado.json), decisao (APROVADO) e responsavel. Em verificacoes, contratoDocumentalRH, recusaSemEscopo e recuperacaoPeloProprietario exigem aprovado booleano verdadeiro e evidencia com a referência privada do resultado observado. A aprovação é uma declaração do responsável. O executor não gera essa declaração. A conferência de um Hosting já publicado continua disponível.
