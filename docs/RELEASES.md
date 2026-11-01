# Build, revisão e publicação

1. Desenvolver na branch de integração a partir do head oficial, preservando alterações posteriores.
2. Executar instalação limpa, typecheck, testes e build determinístico. O CI tem somente `contents: read` e não publica previews ou PROD.
3. Gerar um release privado com `node scripts/build.cjs --overlay <arquivo-fora-do-repositorio>`; `config/private-parameters.json` define as chaves, sem publicar valores.
4. Revisar `build/<ambiente>-manifest.json`, commit, inventário e hashes. Conservar o overlay e o pacote em armazenamento privado controlado. Não enviar `dist` para artefatos públicos do GitHub.
5. Integrar por PR com gates aprovados. Merge não dispara publicação.
6. Somente com autorização explícita, publicar o diretório `dist/<ambiente>` aprovado usando `config/<ambiente>.firebase.json` e projeto explícito. O arquivo de configuração é resolvido a partir de `config`, portanto seu `public` aponta para `../dist/<ambiente>`.
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
