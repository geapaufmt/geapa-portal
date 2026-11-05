# Gestão de Atas — interface V1

Componente TypeScript: `src/components/institutional-minutes.mts`, montado por `institutional-governance.mts` em Gestão Institucional → Governança e deliberações. Reutiliza Design System, modal acessível, Auth/App Check, cliente de edição institucional e recuperação do último envio. Não introduz framework nem armazenamento manual de credenciais.

## Fluxos

Listagem com busca e situação; cadastro em modal; composição canônica consultada pelo Core; presença/ausência de todos os diretores; prévia e confirmação explícita; submissão, correção com trecho/motivo, nova revisão, assinatura ou ciência, arquivamento e histórico. Permissões e ações vêm do leitor, com nova validação no envio.

As referências documentais apontam para arquivos já existentes no Drive, com hash e evidência. A V1 não implementa upload de anexos nem altera acesso a arquivos. Retificação abre outro cadastro vinculado; o original arquivado não é editado.

O documento distingue assinaturas dos presentes e ciências dos ausentes. Aprovar texto não significa votar deliberações. A confirmação é eletrônica interna, sem certificação ICP-Brasil. Publicação pública continua fechada.

## Sessão, acessibilidade e impressão

O formulário não fecha antes de confirmação canônica. Envio incerto orienta consultar o último envio. Durante um modal de ata, a consulta institucional é renovada pelo mesmo leitor autenticado; mudança de autoridade/dados invalida a apresentação. Uma perda de contexto mostra revalidação, em vez de tela vazia.

Escape, retorno de foco, proteção de formulário alterado, prevenção de duplo envio e aria-live reutilizam o padrão comum. Layout inspecionado em 1280×900 e 390×844, sem overflow horizontal da ata.

`Exportar PDF / imprimir` cria representação de impressão somente da ata autorizada, usa `window.print()` e remove a representação após impressão. O usuário escolhe Salvar como PDF no navegador. O navegador integrado da homologação não permitiu concluir a gravação do arquivo; a prova física dessa etapa permanece pendente em navegador com impressão suportada. Não declarar PDF exportado apenas porque o botão apareceu.

## Validação e distribuição

`npm ci --ignore-scripts`, verificação TypeScript/build, 226 testes e reprodução dos artefatos passaram. `tests/institutional-minutes.test.cjs` verifica escaping, estados, separação de manifestações, contrato usado e preservação dos registros históricos. A transação e as negativas institucionais são testadas no Core.

Fluxo real DEV concluído com contas sintéticas: registrar, encaminhar, solicitar correção, revisar, reencaminhar, assinar, registrar ciência e arquivar. Recarga preservou a versão definitiva. Após encerrar as permissões temporárias, o Portal recusou a consulta sintética.

Não há deploy automático nem ativação PROD. Evidências privadas e capturas de testes não integram o repositório público. O pacote DEV final da campanha alterou somente os módulos de governança, atas, diretório institucional e seu CSS; os demais arquivos de Hosting e a configuração foram preservados.
