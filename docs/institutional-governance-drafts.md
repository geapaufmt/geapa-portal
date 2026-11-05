# Governança: rascunhos administrativos

O componente TypeScript `src/components/institutional-governance.mts` integra a seção existente Gestão Institucional → Governança e deliberações. Reutiliza Design System, modal acessível, Auth/App Check e o cliente institucional. Não há acesso direto do navegador ao Firestore para escrever os registros.

O leitor canônico fornece rascunhos, histórico e `canEdit`. A interface não concede capacidades nem decide aprovação documental. A edição aceita data desconhecida, estados documentais restritos, referência à ata original e até dez documentos de apoio. Cada envio passa por prévia e confirmação. Resultado ambíguo exige consulta do último envio; não há repetição automática da alteração.

Rascunho, aprovação formal, publicação e vigência são apresentados separadamente. Referências não comprovadas aparecem como pendentes. Atas históricas continuam abaixo dos rascunhos, sem alteração por esse editor.

O modal preserva foco, Escape e proteção durante envio. O fechamento captura a instância antes de acionar o callback do Design System, evitando perder a referência ao remover o modal. A lista é recarregada após recibo confirmado; alterações locais não são tratadas como sucesso do servidor.

Validação: testes de renderização, ausência de campos de aprovação/publicação, escape de conteúdo, compilação TypeScript, build reproduzível e prova autenticada DEV de criação e edição com persistência. Capturas e recibos privados não pertencem ao repositório.

Nenhuma habilitação produtiva decorre da presença do componente. A publicação e as permissões de PROD permanecem dependentes de autorização específica.
