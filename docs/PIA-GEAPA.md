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

## 9. Estabilização após a reconciliação de 20/11/2026

Base do Portal `8780de7`, base do Core `0ddd2b7`. A Fase 1 foi integrada pelos PRs Portal #45 e Core #43. A execução pós-merge do Core em `main` passou. As quatro subabas, os rascunhos internos e a confirmação compartilhada já existem nessa base.

### Matriz de decisões

| Operação e classe | Exigência e origem | Resultado para quem opera |
| --- | --- | --- |
| Ata e rascunho interno elegível · rotineira | Integridade de revisão e recibo | Fase 1 implementada. Salvar solicita prévia e execução seladas. O motivo é opcional dentro da fronteira canônica. O Portal antigo segue aceito e o Core antigo conserva a revisão explícita de rascunhos. |
| Edição de PDFs de ata ou registro · rotineira | Proteção contra perda de trabalho | Corrigida. Mover dois PDFs com legenda igual ou vazia aciona o aviso de descarte. Voltar à ordem original limpa o aviso se os demais campos coincidirem. A comparação usa ID do arquivo existente ou SHA-256 do novo arquivo, na ordem do editor. |
| Criação de atividade em rascunho · rotineira | Confirmação de interface repetia a escolha de criar | Fase 1 implementada. Uma ação humana inicia a gravação. A edição ou regularização de atividade realizada segue o contrato próprio. |
| Modelos, planejamento, ciclos e semestres · relevante | Aprovação, vigência e integridade das associações | Mantidas as etapas de aprovação de modelo e plano, e a revisão dos vínculos ao ciclo. Corrigida a recuperação de falha de leitura em Ciclos e Semestres. Um botão repete a consulta na mesma subaba, como já ocorre na Diretoria. |
| Cadastros e vínculos · relevante ou crítica conforme o efeito | Identidade, transição e fundamento exigidos pelo contrato | Fase 1 apresenta os reforços condicionais. Preservar a conferência de identidade e a decisão competente nas alterações de vínculo. |
| Documento da providência de RH · relevante ou crítica conforme a ação | Requisito do domínio de Membros | Corrigida a duplicação no formulário. A resposta autorizada traz um booleano por ação em `documentRequiredByAction`. A seleção abre o campo obrigatório. Ausência, tipo inválido ou ação fora da lista bloqueiam o envio daquela ação e explicam como atualizar. |
| Assinatura, ciência, voto, defesa e decisão de Diretoria · crítica | Manifestações distintas, autoria e histórico | Preservadas. Eventual dispensa de fundamentos específicos depende de deliberação e identificação da norma vigente. A minuta NC02 continua fora da base de decisão. |
| Encerramento de chamada ou efetivação de desligamento · crítica | Efeito sobre direitos, autorização e documentação | Não se recomenda reunir apuração, decisão e execução em um clique. Mantidas a confirmação correspondente e a validação do Core. |

### Vigências e ensaio de interface

Ciclos e Semestres usam o leitor de ciclos. Cargos e Histórico usam o de Diretoria. A navegação anterior permanece identificada na seção 5. Os testes cobrem restrição por área e expiração da autorização. Em falha de leitura de ciclos, o painel limpa a seleção anterior, anuncia o erro e oferece uma nova consulta. O retorno à mesma subaba foi exercitado com uma falha sintética seguida de sucesso.

O ensaio em Edge usou os módulos compilados e os dados sintéticos de `tests/visual/pia.html`. Nas larguras de 390 e 1280 px, as quatro rotas renderizaram em sequência, com quatro chamadas locais no total por largura e sem transbordamento horizontal do documento. A comparação visual adicional de Semestres no celular e Histórico na área de trabalho mostrou a subaba selecionada, opções, registros e filtros. A fixture também pode ser aberta em Windows com `npm run preview:admin` e a URL `http://127.0.0.1:4178/pia.html`.

### Homologação e promoção

| Componente | DEV registrado em 20/11 | PROD registrado em 20/11 |
| --- | --- | --- |
| Hosting | `5e24796dafb7ebdc`, 148 arquivos, edição com PIA | `c8740f0b3403b0e7`, 146 arquivos, menu anterior a Vigências e fluxo extraordinário de tema |
| Executor Core | `geapacommanddevpilot-00167-joc` | `geapacommand-00053-puc` |
| Worker de consequências | `geapacommanddevpilotboardconsequences-00005-jem` | `geapacommandboardconsequences-00003-xox` |

Essas identificações vêm dos recibos reconciliados. A tentativa de atualizar a consulta do Hosting recebeu erro de autenticação nos dois projetos. A prévia compilada desta campanha gera 148 arquivos DEV e 147 PROD. A última publicação PROD registrada contém 146. O inventário da candidata inclui o módulo de RH. **Com a composição atual, o PIA requer revisão do pacote compartilhado.** Um lançamento exclusivo exigiria uma composição isolada e uma nova prova de compatibilidade. A diferença de contagem por si só não identifica todos os arquivos alterados.

1. Revisar os dois PRs e o contrato aditivo. Antes de autorizar um ambiente, reconferir no provedor versão de Hosting, configuração HTTP, revisões e tráfego dos serviços. Registrar os identificadores de retorno e o estado dos processos recuperáveis. Conferir as referências de origem em `docs/reconciliacao-20261120.md`, `docs/matriz-portal-20261120.md` e, no Core, `docs/reconciliacao-gen2-20261120.md`.
2. Reexecutar os testes transacionais em projeto de demonstração. Verificar autoria, decisão, rejeição sem documento obrigatório, consulta sem permissão, conflito de revisão e recuperação pelo recibo. A lista e o histórico devem permanecer consultáveis com versões anteriores. O Portal novo bloqueia a gravação de RH quando falta o campo do Core.
3. Sob autorização específica para DEV, homologar primeiro o leitor/executor do Core e depois o Portal. Conferir registros de teste autorizados, troca de conta e expiração da sessão. Exercitar rascunho, descarte e reversão de PDFs, as quatro subabas e os links antigos. Confirmar os fluxos de frequência e de título/eixos já existentes. Registrar aprovação das três frentes para a composição compartilhada.
4. Gerar artefatos a partir dos commits aprovados com os lockfiles e overlays privados de cada destino. Comparar inventário, hashes, cabeçalhos, rewrites e rotas com a publicação do destino. Conservar a versão anterior e o pacote associado. Condicionar PROD à homologação, às regressões transacionais, à compatibilidade do rollback e à autorização explícita de PROD.
5. Após publicação autorizada, conferir os identificadores efetivamente servidos e fazer verificações de leitura e navegação. Em regressão visual, restaurar o Hosting anterior. Para o Core, verificar compatibilidade dos registros já gravados e das operações pendentes com o executor anterior antes de mover tráfego. Preservar dados, recibos e auditoria. Se a recuperação depender da versão nova, manter esse executor até concluir ou reconciliar as operações.

### Reprodução dos testes pendentes no Windows

O Portal passou em 381 testes e na verificação de build reproduzível. O Core passou em 1.127 testes de runtime, quatro suítes de domínio e empacotamento local. Os 22 testes condicionais de emulador ficaram pendentes. O Java falhou na conexão de loopback durante a inicialização do Firestore.

Para reproduzir, usar Node 22 e Java 21, na pasta `backend/functions-node` do Core. Executar `npm ci` e `npm run build` no commit da candidatura. O comando abaixo usa um arquivo temporário de configuração, regras fechadas para clientes e apenas o emulador Firestore. Os testes exercitam o transporte com identidades sintéticas. Executar em PowerShell numa máquina com loopback liberado e a porta 8187 disponível.

```powershell
$piaTemp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ("pia-firestore-" + [guid]::NewGuid()))
$piaConfig = Join-Path $piaTemp.FullName 'firebase.json'
Set-Content (Join-Path $piaTemp.FullName 'firestore.rules') "rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{doc=**} { allow read, write: if false; } } }" -Encoding ascii
Set-Content $piaConfig '{"firestore":{"rules":"firestore.rules"},"emulators":{"firestore":{"host":"127.0.0.1","port":8187},"ui":{"enabled":false}}}' -Encoding ascii
$groups = 'AGENDA','ATTENDANCE','BINDING','CAPACITY_SCANNER','CYCLE_PARAMETERS','INSTITUTIONAL','MODEL_FREQUENCY','PEOPLE','PROJECTION','RH','THEME'
foreach ($group in $groups) { Set-Item "env:GEAPA_${group}_EMULATOR_TEST" '1' }
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8187'
& .\node_modules\.bin\firebase.cmd emulators:exec --only firestore --project demo-geapa-functions-local --config $piaConfig 'node --test --test-concurrency=1 test/*.test.cjs'
```

Conferir o código de saída e o relatório de testes, incluindo as suítes condicionais. Falha de autorização, campo documental incompatível, perda de rascunho, regressão de uma frente compartilhada, ausência de evidência transacional ou rollback incompatível bloqueiam a promoção.
