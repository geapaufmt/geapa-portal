# PIA-GEAPA — Padrão de Interações Administrativas

Fase 1 · 20/11/2026 · especificação e diagnóstico da implementação.

Princípio: rigor nos registros, simplicidade nas operações. O Core continua sendo a única autoridade para regras, autorizações e efeitos institucionais.

## 1. Classificação das interações

| Classe | Apresentação | Controles preservados |
| --- | --- | --- |
| Rotineira, reversível, sem efeito institucional | Salvar diretamente, com estado de envio e resultado explícito | Validação canônica, revisão, autorização, selo, recibo, auditoria e recuperação |
| Efeito administrativo relevante | Uma conferência dos efeitos e uma confirmação da decisão | Competência, fundamentos, documentos e precondições do Core |
| Crítica ou que afeta direitos | Confirmação reforçada proporcional ao efeito | Todas as manifestações, consentimentos, quóruns e decisões distintas exigidas |

A quantidade de etapas internas não determina a quantidade de cliques. O Portal pode obter a prévia selada e enviá-la automaticamente para uma operação rotineira. Não pode fabricar justificativa, trocar o conteúdo selado nem reenviar uma operação cujo resultado esteja incerto.

Rastreabilidade (autor, data, revisão, antes/depois) não é justificativa. Fundamentação normativa e justificativa de decisão continuam obrigatórias onde o contrato e o contexto institucional exigem.

## 2. Contrato compartilhado de confirmação e descarte

`design-system.mts` oferece `confirmAdministrative({title, message, confirmLabel, cancelLabel, parent})`, que retorna uma promessa booleana. É um componente de apresentação; não concede autorização.

- A camada é anexada ao corpo da página, fora do formulário e de sua rolagem; ocupa o viewport e centraliza a confirmação.
- Usa `role=alertdialog`, título associado, `aria-modal`, foco inicial seguro e contenção do Tab/Shift+Tab no diálogo superior.
- Esc ou clique no fundo cancelam o descarte. Continuar restaura foco sem deslocar a página e mantém a rolagem dos elementos do editor.
- O editor fica inerte enquanto a confirmação está aberta. Uma tentativa repetida de fechar não cria outro aviso.
- `aria-busy=true` impede fechamento ordinário e descarte, inclusive se o envio começar depois da abertura da confirmação.
- O encerramento de sessão continua podendo limpar os diálogos e seus dados privados.
- `data-geapa-protect-draft` habilita a comparação de valores iniciais com entradas atuais, incluindo seletores e checkboxes. Reverter uma edição para os valores iniciais remove o aviso. Carregamento inicial assíncrono estabelece a base antes da edição.
- Alterações programáticas fora dos controles precisam continuar sinalizando `data-geapa-dirty`; o componente não interpreta conteúdo de domínio nem observa armazenamento privado.
- O chamador deve conservar sua validação canônica, invalidar prévias quando o conteúdo mudar e consultar o recibo quando o resultado do envio não for confirmado.

Não usar confirmações nativas adicionais depois desse componente. Não remover declarações que representem manifestações distintas. A proteção de descarte trata o fechamento dos editores; não substitui os mecanismos de encerramento/revalidação de sessão.

## 3. Diagnóstico e decisões da Fase 1

Fontes consultadas: Regimento oficial, versão declarada vigente desde 14/05/2026; NC01/2025; cópias documentais oficiais disponíveis no workspace; contratos atuais do Core, Membros e Atividades. A NC02/2026 Rev05 e propostas de revisão não fundamentam esta fase. Nenhuma regra de frequência, apresentação, penalidade, mandato ou quórum foi alterada.

| Fluxo / exigência | Classificação | Decisão implementada ou preservada |
| --- | --- | --- |
| Aviso de descarte dentro da rolagem | Redundante / inadequação de interface | Modal compartilhado, visível e com opção segura |
| Motivo obrigatório para novo rascunho interno | Restrição técnica excessiva | Opcional somente na fronteira explícita de rascunho sem efeito institucional, validada no Core |
| Motivo para conferência documental, vínculo histórico, revisão formal ou retificação | Operacionalmente justificável; pode envolver fundamento institucional | Mantido; não abrangido pela exceção editorial |
| Prévia selada antes de executar gravação | Tecnicamente necessária | Mantida; executada sem nova decisão humana apenas para rascunho rotineiro |
| Checkbox genérico + revisar + confirmar a mesma manifestação em ata | Redundante | Removido apenas o checkbox que não integrava o payload; manifestação, versão e confirmação final preservadas |
| Composição da Diretoria na data da ata e presença de cada pessoa | Normativa / integridade documental | Consulta canônica e participação explícita preservadas; nenhuma pessoa/presença presumida |
| Número e título da ata | Repetição operacional | Título inicial sugerido a partir do número; editável, sem sobrescrever título autoral |
| Redação assistida | Operacionalmente justificável | Mantém somente fatos preenchidos; substituição do texto usa confirmação compartilhada |
| Texto integral e campos estruturados da ata | Documental e tecnicamente necessária | Mantidos; organização em blocos, sem deduzir deliberações |
| Fotografias, anexos e vínculos normativos | Complexidade opcional | Agrupados em seções expansíveis; validações mantidas quando utilizados |
| Aceite, voto, defesa, ciência, assinatura e apuração de procedimento | Normativamente obrigatória ou manifestação distinta | Não consolidados entre si; contratos de procedimentos preservados |
| Documentos complementares de procedimentos | Operacionalmente justificável / opcional | Exibidos sob demanda, sem remover vínculos ou integridade |
| Confirmação para criar atividade em rascunho após prévia canônica | Redundante | Removida confirmação humana adicional; validação e criação canônicas permanecem |
| Finalização de chamada com pessoas sem marcação | Crítica: pode registrar faltas | Confirmação preservada e padronizada; bloqueio de tentativa concorrente durante a confirmação |
| Documento em providências RH | Normativa conforme a providência | Obrigatório e expandido para advertência formal, comunicação e desligamento; opcional expansível nas demais |
| Fundamento, decisão competente e confirmação em RH | Normativa / integridade | Preservados integralmente; limite calculado nunca desliga alguém automaticamente |
| Transição normativa, conferência de função e justificativa reforçada de vínculo | Condicionalmente necessária | Apresentadas somente nas condições já informadas pelo contrato; validações e payload preservados |
| Duas entradas para ciclos/semestres e Diretoria | Redundância de navegação | Uma entrada Vigências, quatro subabas e guardas independentes |

## 4. Fronteira de salvamento direto

O Core informa `routineDraftSaveEnabled: true` na consulta autorizada de governança. Essa sinalização informa suporte do contrato, sem ampliar permissões.

A ausência de motivo é aceita apenas quando a entrada e, se existente, o registro anterior estão em `documentaryState=DRAFT`, não há vínculo com ata histórica, não há retificação e a ata anterior está em `minutes.state=DRAFT`. Motivos não vazios continuam sujeitos aos limites anteriores. Demais situações mantêm o motivo obrigatório. Aprovação, assinatura, ciência, publicação e arquivamento não foram alterados.

O Portal conserva o comportamento anterior quando o Core não informa o novo suporte. Para rascunhos elegíveis, uma submissão obtém a prévia e executa exatamente a requisição selada, sem alterar autor, hash ou revisão. Erro mantém os campos e orienta a recuperação do último envio. Histórico e auditoria registram motivo vazio literalmente, nunca texto genérico em nome do usuário.

## 5. Vigências

| Subaba | URL | Guarda e serviço reutilizados |
| --- | --- | --- |
| Ciclos de atividades | `#/admin/vigencias` | `admin-ciclos-semestres`; `/admin/ciclos-semestres` |
| Semestres letivos | `#/admin/vigencias/semestres` | Mesma guarda de ciclos, inclusive negativa/expiração de hints; mesmo leitor |
| Cargos e competências | `#/admin/vigencias/cargos` | `diretoria-competencias`; `/admin/diretoria-competencias` |
| Histórico de Diretorias | `#/admin/vigencias/diretorias` | Mesma guarda de Diretoria, inclusive negativa/expiração; mesmo leitor |

Os endereços anteriores `#/admin/ciclos-semestres` e `#/admin/diretoria-competencias` continuam resolvendo as áreas correspondentes. `#/admin/vigencias/ciclos` é um alias explícito. O destino inicial pode selecionar Cargos se o usuário só possuir acesso à Diretoria; isso não libera Ciclos ou Semestres. O menu usa a primeira subaba autorizada e mantém Vigências ativo nas quatro rotas.

As subabas reutilizam os cards, formulários, histórico, políticas de apresentação de opções restritas e serviços existentes. Só o leitor da subaba ativa é chamado. Não há nova coleção, endpoint, cadastro, cache ou regra de acesso. A subaba Semestres inclui os associados e os ainda não associados. Os ciclos conservam seus vínculos, parâmetros e planejamento.

## 6. Comparação das operações

| Operação | Antes | Depois |
| --- | --- | --- |
| Rascunho interno elegível | Motivo obrigatório + revisar + confirmar | Motivo opcional + salvar; mesma prévia e execução internas |
| Manifestação de ata | Checkbox genérico + revisar + confirmar | Revisar + confirmar; manifestação/assinatura específica e justificativa preservadas |
| Criação de atividade em rascunho | Criar + confirmação nativa depois da validação | Criar; validação e requisição selada mantidas |
| Título inicial da ata | Digitar número e título | Digitar número; conferir/editar título sugerido |
| Opções de vínculo | Transição e reforços apresentados em todas as ações | Controles conforme ação e exigências canônicas |
| Acesso a vigências | Duas entradas com abas internas distintas | Uma entrada, quatro subabas com URL própria |

## 7. Fase 2 — propostas não implementadas

1. Dispensar motivos em assinaturas, ciências, encaminhamentos ou decisões que hoje os exigem: requer esclarecimento institucional antes de mudar os contratos dessas manifestações.
2. Substituir deliberação, aceite, assinatura, quórum ou defesa por registro direto: depende da norma efetivamente aprovada e da competência correspondente.
3. Alterar frequência, faltas, abonos, penalidades, desligamentos, suspensão, certificação ou apresentação anual: excluído desta fase.
4. Aplicar novos prazos, modalidades ou mecanismos previstos exclusivamente na minuta NC02: continua bloqueado até aprovação e configuração canônica.
5. Alterar cargos, mandatos ou limites de permanência: não implementado.

Esses itens são oportunidades condicionais, não autorizações nem efeitos já habilitados.

## 8. Validação e publicação

Testes reproduzíveis: `npm run verify`, `node scripts/check-reproducible.cjs`, `tests/pia-interactions.test.cjs` e `tests/pia-draft-flows.test.cjs`. Fixture visual: servidor loopback de `tests/visual/serve.cjs`, página `/pia.html`. A fixture usa DTOs e respostas sintéticas e não é incluída no manifesto de Hosting.

O Core possui os testes `pia-drafts.test.cjs` e os ensaios de governança/atas no emulador. As evidências e contagens efetivamente executadas constam do relatório de fechamento da campanha. Teste local não é prova de publicação ou de Auth/App Check reais em DEV compartilhado.

Esta fase não executa PROD. Uma publicação futura deve verificar o estado do destino, a compatibilidade do par Core/Portal, campanhas concorrentes e rollback. A interface mantém o modo anterior se publicada antes do suporte do Core; o uso do modo simplificado requer o Core correspondente.
