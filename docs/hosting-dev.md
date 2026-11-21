# Publicação do Hosting DEV

O workflow **Hosting DEV** executa na `main` de `geapaufmt/geapa-portal`. O evento de push que instala a definição somente consulta o canal live e o tráfego do Core. O ambiente GitHub é `geapa-dev`. A conta dedicada usa OIDC de curta duração. Proteja a branch principal e a revisão de alterações em `.github/workflows` e nos scripts de publicação.

## Habilitação inicial

Neste workspace Windows, o operador autorizado pode abrir `scripts/habilitar-hosting-dev.cmd` uma única vez. O inicializador seleciona a conta DEV no SDK, mostra o inventário e oferece a instalação usando os dois arquivos privados já presentes no workspace. A alternativa abaixo usa Cloud Shell.

Um administrador do projeto `geapa-convergencia-dev` usa o Cloud Shell autenticado. No checkout revisado, execute `bash scripts/bootstrap-hosting-dev.sh --inspect`. A consulta cobre pools globais, contas de serviço e triggers globais e de `southamerica-east1`. Forneça as outras regiões utilizadas como argumentos. Se existir um executor compatível, confira seu vínculo ao repositório, permissões e acesso ao overlay antes de reutilizá-lo.

Para instalar a alternativa federada, forneça o overlay privado e o arquivo `diferencial-portal.json` ao Cloud Shell pela sessão privada. Execute uma vez `bash scripts/bootstrap-hosting-dev.sh --provision /caminho/overlay-dev.private.json /caminho/diferencial-portal.json`. Confira o projeto e os identificadores no script antes de executar. Remova as cópias locais de transferência após a instalação. O script preserva versões existentes dos secrets e valida a política do provider antes de habilitar a federação.

A identidade `portal-hosting-ci` recebe `firebasehosting.sites.get` e `firebasehosting.sites.update` neste projeto, `run.services.get` no serviço do Core DEV e leitura nos três secrets individuais. A identidade do GitHub recebe `roles/iam.workloadIdentityUser` somente nessa conta. O operador do bootstrap precisa poder criar esses recursos, habilitar APIs e estabelecer os respectivos vínculos IAM. A equipe responsável pelos testes conserva a escrita da evidência de aceite. O publicador tem somente leitura dos secrets.

## Execução

Dispare o workflow na `main` pela interface Actions ou pela API autenticada de dispatch. `inspect` consulta o provedor. `verify` produz o build nominal e compara o inventário com o release ativo. `publish` exige também o aceite intermediário e verifica os arquivos entregues por HTTPS. Os três modos se limitam ao projeto DEV.

O secret `geapa-portal-dev-overlay` recebe a configuração privada existente. O responsável técnico pela composição registra em `geapa-portal-dev-candidate` a versão do diferencial da candidata revisada, com commit completo, release anterior, revisão do Core, hash do recibo, hash do manifesto e os hashes gzip dos caminhos alterados. O executor aceita a mesma lista de caminhos do release anterior. Adições, remoções e mudanças de configuração HTTP exigem uma revisão do contrato do executor.

O executor dos testes registra em `geapa-portal-dev-acceptance` o JSON original de aceite, com `portalCommit`, `sha256ManifestoPortal`, `sha256ReciboCore`, `releaseAnterior`, `project`, `responsavel`, `decisao` e as três evidências em `verificacoes`. Publicar uma versão desse secret pressupõe a execução real das provas na sessão sintética. O bootstrap deixa o secret sem versão quando recém-criado. Uma evidência de outra candidata ou de outro release bloqueia a publicação.

O job registra a versão anterior para retorno pelo histórico do Firebase Hosting. Em caso de falha após a troca do canal, confirme o release ativo antes do retorno. Repetir a publicação do mesmo par de commit e manifesto revalida o conteúdo. Reserve o canal live para um único publicador durante a troca.
