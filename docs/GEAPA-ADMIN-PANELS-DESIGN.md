# Redesign administrativo — Correções, Justificativas, Ciclos e semestres

Data: 01/11/2026. Base oficial: `26f66ba23fef5cbe388c9bce8b36cd767c40d6d6` do `geapaufmt/geapa-portal`. Branch local: `design/admin-panels-20261101`.

## Resultado e limite da evidência

Implementação concluída e validada localmente com os artefatos DEV e PROD gerados pelo build oficial. **76 testes aprovados, zero falhas**, instalação limpa e build reproduzível. A validação visual usou o navegador, os módulos reais compilados e respostas sintéticas em loopback; não foi uma homologação autenticada no Firebase DEV.

Não houve deploy, push, alteração do Core, Auth, policies, Firestore, Storage ou dados institucionais nesta campanha. A candidata pode seguir para revisão e homologação no ambiente publicado. A versão em produção continua preservada.

## Antes e depois

| Tela | Antes | Agora |
|---|---|---|
| Correções cadastrais | Tabela rígida e filtros sempre expostos | Cards compactos, busca visível, filtros expansíveis, resumo e análise em modal |
| Justificativas | Descrição extensa e ações dispersas por registro | Cards com contexto da atividade, busca/status por página, detalhes e análise em modal, ações no menu Opções |
| Ciclos e semestres | Listagem misturada a editores inline e grandes cards internos | Painel hierárquico, ciclo compacto, minicards internos, semestres disponíveis separados e formulários em modal |

Ciclos mantêm identificação, datas, status, revisão, configuração e quantidade de semestres. Os minicards ficam lado a lado no desktop e em uma coluna no celular; a seção vinculada pode ser recolhida. Minicards e controles internos não abrem o ciclo pai.

A edição da associação reutiliza o comando existente de ciclo. Nessa apresentação, nome e datas ficam somente leitura; a seleção de semestres é explícita, com motivo obrigatório. A edição completa continua pelo menu correspondente, respeitando o bloqueio de datas de ciclos que não estão em DRAFT. Não foi inventado um comando separado de edição de semestre.

## Componentes e preservação funcional

- `src/components/admin-panels.mts`: apresentação tipada dos DTOs de governança e interação de cards aninhados.
- `src/components/design-system.mts`: filtros locais compartilhados, fechamento seguro de modais, proteção de rascunho opt-in e bloqueio durante envio.
- `src/styles/design-system.css`: superfícies neutras, verde `#167D0A`, marrom `#5C371A`, preto `#030302`, transições de 200 ms e respeito a movimento reduzido.
- Módulos JavaScript existentes adaptados pontualmente: correções cadastrais, governança e justificativas. A variante DEV de justificativas recebeu as mesmas funções de apresentação; sua configuração específica foi preservada.
- `config/assets.json`: inclui somente o novo componente compilado. As fixtures, o servidor de prévia e as capturas não entram no Hosting.

Ações continuam baseadas em `canCreateCycle`, `canSaveSemester`, `canAnalyze`, `canApply` e `acoesGestao` já fornecidos pelo backend. Os mesmos endpoints, IDs, revisões e payloads são usados; o Core continua revalidando a autorização. A lista de correções utiliza somente valores mascarados disponibilizados pelo leitor. A revelação controlada e os comprovantes existentes continuam no detalhe.

A busca e os filtros de justificativas consideram explicitamente apenas a página autorizada carregada. Nas correções, status/campo continuam consultando a fila pelo contrato existente; a busca por pessoa continua limitada à página. Nenhum scan adicional foi introduzido.

## Verificações

- `npm ci`: instalação limpa, lockfile válido; zero vulnerabilidades reportadas pelo npm.
- `npm run verify`: typecheck, builds DEV/PROD e 76 testes aprovados.
- `node scripts/check-reproducible.cjs`: `REPRODUCIBLE_BUILD_PASS`.
- Regressões existentes de sessão, login, isolamento, respostas atrasadas, detalhes, máscaras e navegação preservadas.
- Comparadas todas as 16 combinações das quatro ações de justificativas com o renderizador anterior: mesmos contratos e IDs.
- Testadas hierarquia, ausência de associações inventadas, permissões de criação independentes, cliques internos, filtros combinados, duplo envio, erro/recuperação, resposta após troca de sessão, modal ocupado e proteção de rascunho.
- No navegador: detalhe de semestre por clique na superfície, detalhe de ciclo por teclado, Escape/retorno de foco, expansão, menus, associação e criação de semestre com captura de payload sintético, análise cadastral, filtro de justificativas e formulário existente de solicitação de ajuste.
- Perfil sintético somente leitura: sem criação de ciclos/semestres e sem formulário de análise cadastral. Isso verifica apresentação; não substitui os testes de autorização do Core.
- Desktop conferido a 1280 px; mobile a 390 px, com largura útil de 375 px onde existe barra de rolagem. Capturas de página inteira têm altura variável. Não é uma prova em aparelhos físicos ou em todos os navegadores.

Durante a validação foram corrigidos o atributo de ID do botão de detalhe de justificativa, a sincronização do módulo na variante DEV e o desbloqueio do modal após envio. Falhas deixam o formulário e suas informações disponíveis; fechamento de rascunho exige descarte explícito.

## Capturas sintéticas

| Tela | Antes desktop | Depois desktop | Depois mobile |
|---|---|---|---|
| Correções | [Antes](screenshots/admin-panels/corrections-before-desktop.jpg) | [Depois](screenshots/admin-panels/corrections-desktop.jpg) | [Mobile](screenshots/admin-panels/corrections-mobile.jpg) |
| Justificativas | [Antes](screenshots/admin-panels/justifications-before-desktop.jpg) | [Depois](screenshots/admin-panels/justifications-desktop.jpg) | [Mobile](screenshots/admin-panels/justifications-mobile.jpg) |
| Ciclos | [Antes](screenshots/admin-panels/cycles-before-desktop.jpg) | [Depois](screenshots/admin-panels/cycles-desktop.jpg) | [Mobile](screenshots/admin-panels/cycles-mobile.jpg) |

Modais: [Correção desktop](screenshots/admin-panels/correction-modal-desktop.jpg), [correção mobile](screenshots/admin-panels/correction-modal-mobile.jpg), [justificativa mobile](screenshots/admin-panels/justification-modal-mobile.jpg), [novo ciclo mobile](screenshots/admin-panels/cycle-form-mobile.jpg), [associação mobile](screenshots/admin-panels/association-modal-mobile.jpg).

As imagens anteriores usam o artefato da base oficial e as mesmas fixtures; não representam dados de pessoas reais. O cabeçalho de navegação da prévia identifica o ambiente sintético e não compõe a publicação.

## Reprodução e próximos passos

```sh
npm ci
npm run verify
node scripts/check-reproducible.cjs
npm run preview:admin
```

Abrir `http://127.0.0.1:4178/`. `?role=readonly` simula DTOs sem ações; não altera autenticação ou permissões reais. O servidor só escuta loopback e não carrega SDK Firebase nem credenciais. Os envios ficam no simulador, sem persistência institucional.

**GO para revisão da candidata.** Pendentes: integração por PR, publicação explícita em DEV e conferência autenticada do release com os leitores reais; depois, eventual publicação compatível em PROD. Não se exige nova regra ou policy para este redesign. Não se declara homologação de operações institucionais nem publicação que não ocorreram.

Rollback da interface: republicar o artefato anterior aprovado. Como não há mudança de schema, Core ou dados, não é necessário restaurar fatos institucionais.
