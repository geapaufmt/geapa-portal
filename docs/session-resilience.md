# Sessão, edição e recuperação de operações

Implementação local `session-resilience-v1`. A implantação depende de autorização de ambiente e de homologação autenticada; testes locais não comprovam uma sessão Firebase em produção.

## Fronteiras

- Firebase continua responsável pela persistência e pelos tokens. Não há cópia manual de credenciais.
- Identidade (UID/projeto/geração) e prova institucional são estados diferentes. Renovação, rede indisponível e 429 não equivalem a logout.
- Revogação comprovada, logout e troca de identidade eliminam conteúdo privado da interface e invalidam respostas antigas.
- Uma prova vencida bloqueia ações e oculta a listagem protegida. O texto já em edição permanece na aba. A prova do leitor institucional é renovada separadamente do contexto geral ACT.
- A renovação inicia na metade da validade restante, com antecedência máxima de 30 segundos. O vencimento continua valendo durante a consulta. Não há aumento de TTL nem autorização por cache.
- Requisições concorrentes compartilham a recuperação por identidade/escopo. Repetições de leitura são limitadas; comandos não são reenviados automaticamente.

## Editor de atas

`private-drafts.mts` mantém uma cópia em memória dos campos, referências e anexos selecionados. O isolamento utiliza projeto, UID, geração e identificador do documento. A cópia não é uma ata registrada e não é fonte de autorização.

A cópia sobrevive à desmontagem do componente na mesma aba. Logout, revogação, troca de conta, descarte explícito e confirmação de salvamento eliminam a cópia pertinente. Não existe persistência de conteúdo em localStorage, sessionStorage ou IndexedDB. Fechar a aba, encerrar o navegador ou recarregar pode perder o rascunho; `beforeunload` oferece uma proteção adicional quando suportado pelo navegador.

Mudanças em outra ata atualizam a listagem sem substituir o editor. Mudanças no próprio documento preservam o texto e exigem conferência da revisão; o comando mantém CAS. A composição institucional é consultada novamente ao recuperar um rascunho.

## Operações

O journal persiste somente o seletor opaco da operação e seu digest, separado por projeto, usuário e família. O conteúdo do formulário e os tokens não são gravados no journal.

- Antes do envio: prévia e revisão continuam obrigatórias.
- Após envio incerto: manter o seletor e consultar o executor original.
- `COMPLETED`: guardar o seletor como último envio antes de remover a pendência. Consultas posteriores continuam chegando ao Core.
- `NOT_ADMITTED`: só a ausência local de seletor pode produzir esse estado local; journal indisponível gera erro de reconciliação, nunca ausência presumida de admissão. Quando há seletor, a conclusão vem do servidor.
- Pendência/conflito/erro não fecham o formulário. A resposta confirmada continua válida para a mesma identidade mesmo se a prova de leitura expirar durante o retorno.
- Troca de identidade bloqueia a apresentação da resposta, preservando a recuperação pelo proprietário.

Web Locks coordenam o journal entre abas quando disponíveis. A alternativa local evita concorrência dentro da aba; revisão, idempotência e autorização do servidor continuam obrigatórias em qualquer navegador.

## Diagnóstico

`sessionDiagnosticSnapshot()` fornece até 40 eventos em memória: marcador da implementação, geração, etapa, motivo normalizado, tempo, rota administrativa sem parâmetros, existência de edição e correlação opaca. Não há envio remoto automático, conteúdo de atas, UID, tokens ou dados pessoais. O manifesto de build identifica o commit e os hashes exatos da candidata.

## Verificação

Executar `npm ci`, `npm run verify` e `node scripts/check-reproducible.cjs`. Os testes `session-resilience`, `session-bootstrap-lifecycle`, `bootstrap-session`, `institutional-dialog-renewal`, `institutional-editor` e `member-route-restore` cobrem os efeitos assíncronos.

As páginas `tests/visual/session-soak.html` e `session-regression.html` são fixtures locais, ausentes do manifesto de Hosting. Não utilizam Firebase, contas reais ou dados institucionais. O ensaio prolongado injeta renovação lenta, falha temporária e atualização independente do acervo.

Antes da liberação, repetir com uma candidata DEV autorizada: sessão Firebase persistida, App Check Enterprise real, edição por 20 minutos, ida e volta offline, alternância de abas, revogação, confirmação incerta e recuperação do mesmo recibo. Testar Android real; viewport estreito não substitui essa prova.

## Publicação e rollback

Não aplicar o build com placeholders sobre um ambiente publicado. Produzir pacote com o overlay privado já aprovado, comparar o inventário integral atual e publicar somente diferenças autorizadas. O Core complementar distingue indisponibilidade do verificador de credenciais inválidas, sem desativar `checkRevoked`.

Rollback é de código, condicionado ao release efetivo e às operações posteriores. Não restaurar snapshots institucionais, apagar journals, remover receipts ou trocar executores com operações recuperáveis. Uma aba com edição deve concluir ou descartar conscientemente o trabalho antes da atualização.
