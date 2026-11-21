# Operação DEV no Windows

O ciclo local utiliza o terminal do Codex, a sessão existente do Firebase CLI e o Edge autenticado. Não depende de outro executor ou workflow de publicação. Código atual: clones oficiais em `C:\GEAPA-NOVO\repos`; configurações privadas e evidências ficam fora do Git.

## Diagnóstico antes de pedir intervenção humana

- Diferenciar o sandbox do Windows da máquina do usuário. Uma falha de escrita em `firebase-tools.json`, no cache npm ou no diretório de logs do gcloud não comprova ausência de credencial. Solicitar a execução do comando necessário pelo mecanismo de aprovação do terminal; não copiar tokens para contornar a restrição.
- Usar a identidade DEV já cadastrada, explicitamente selecionada em cada comando. Nunca trocar a conta global como efeito colateral. Não imprimir tokens, senhas ou a configuração completa das CLIs.
- Em chamadas REST com token do gcloud, enviar `x-goog-user-project: geapa-convergencia-dev`. O 403 `SERVICE_DISABLED` que menciona ausência de projeto de cota não deve ser tratado automaticamente como falta de IAM. Verificar `serviceusage.services.use`, `firebasehosting.sites.get` e `firebasehosting.sites.update` com `testIamPermissions` antes de propor concessões. Referência: https://cloud.google.com/sdk/gcloud/reference/auth/print-access-token.
- O Firebase CLI mantém sua própria sessão OAuth. Confirmar sua disponibilidade antes de pedir novo login ou propor federação. As credenciais continuam sob administração das CLIs, fora do repositório.
- Se o controle do navegador retornar `Computer Use helper already has an active request`, tentar a reconexão documentada. Confirmar ausência de tarefa concorrente antes de reiniciar somente o helper identificado. Não encerrar o Edge nem remover seus dados de sessão. Isso não é falha de Firebase Auth ou de App Check.
- Usar Node 22 do lockfile do Core para seus testes e empacotamento. O Node global pode ter outra versão. O Portal aceita Node 22–24.

## Publicação e aceitação

Produzir o build a partir de SHA versionado e overlay DEV aprovado. Comparar todos os caminhos, hashes gzip e configurações HTTP contra uma leitura atual do canal live; preservar diferenças concorrentes legítimas. A raiz `hosting.public` do arquivo temporário de publicação deve resolver para o diretório `dist/dev` verificado. Uma configuração deslocada para outro diretório muda a resolução de caminhos relativos.

Antes do deploy, registrar versão/release de rollback, identidade, revisão/configuração do Core, manifesto da candidata e recibos reutilizados. Revalidar o canal imediatamente antes da publicação. Usar o Firebase CLI já instalado com `--only hosting`, projeto e conta DEV explícitos, sem alterar Auth/IAM. Conferir inventário e bytes HTTP após publicar.

Google e e-mail/senha são métodos de autenticação DEV. Nenhum deles concede função institucional. O diagnóstico do login registra somente etapa, método e código Firebase sanitizado; a autorização posterior continua pertencendo ao Core. Homologar com Auth/App Check reais, fixtures sintéticas, notificações simuladas e concessões temporárias encerradas e conferidas. Não declarar aceite completo a partir de testes locais ou de um login isolado.

PROD requer autorização própria. Preparação de artefatos e comparação de configurações não autorizam publicação.
