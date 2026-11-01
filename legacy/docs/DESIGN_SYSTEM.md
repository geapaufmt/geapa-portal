# Design System do Portal GEAPA

Este guia registra os padroes visuais reutilizaveis do Portal GEAPA. O objetivo e manter as telas internas consistentes, leves e responsivas sem mover regras de negocio para o front-end.

## Tokens

### Cores

- `--green-950`: texto institucional escuro.
- `--green-800`, `--green-700`, `--green-600`: hierarquia principal verde.
- `--green-100`, `--green-050`: fundos sutis e areas de apoio.
- `--geapa-brown`: acento marrom institucional.
- `--border`: borda verde suave.
- `--warning-bg`, `--warning-border`: avisos.
- `--white`: superficie principal.

### Espacamento

- `--portal-panel-padding`: padding responsivo dos paineis internos.
- `--portal-header-height`: altura logica do cabecalho usada por sidebar e backdrop.
- `--portal-header-divider-height`: espessura da linha marrom do cabecalho, hoje `5px`.

### Bordas e sombras

- `--portal-panel-radius`: raio padrao de paineis, hoje `8px`.
- `--portal-panel-border`: borda suave de painel.
- `--shadow`, `--shadow-soft`, `--shadow-strong`: sombras para painel, itens e cabecalho.

## Estrutura de pagina

Use o cabecalho reutilizavel em telas internas:

```html
<header class="portal-page-header">
  <div class="portal-page-heading">
    <p class="portal-page-eyebrow">Gestao do GEAPA</p>
    <h2 class="portal-page-title">Membros</h2>
    <p class="portal-page-description">Resumo operacional permitido pelo backend.</p>
  </div>
  <span class="portal-page-badge portal-page-badge--readonly">Somente leitura</span>
</header>
```

## Paineis

Classes principais:

- `portal-page-panel`: painel branco com borda, sombra e faixa superior verde/marrom.
- `portal-page-panel--dense`: painel mais compacto.
- `portal-page-panel--editorial`: painel com respiro maior.

As classes antigas `situation-panel`, `public-home-panel` e `access-panel` continuam compativeis e compartilham a mesma base visual.

## Filtros

Use:

- `portal-filter-panel`: conteiner do bloco de filtros.
- `portal-filter-grid`: grid de campos no desktop.
- `portal-filter-grid--primary`: busca principal sempre visivel.
- `portal-filter-advanced`: filtros avancados recolhiveis no celular.
- `portal-filter-actions`: botoes do bloco.
- `portal-results-summary`: resumo de resultados.

## Tabelas

Tabelas somente leitura usam `readonly-table-wrap` e `readonly-table`. O cabecalho fica sticky quando houver rolagem vertical, e linhas possuem hover/focus suave sem alterar navegacao por teclado.

## Feedback e carregamento

Use o spinner institucional do GEAPA:

- Global: `window.PortalGeapaUi.mostrarLoading(mensagem)` e `ocultarLoading()`.
- Local: `window.PortalGeapaUi.montarLoadingLocal(mensagem)` seguido de `hidratarLoadersLocais(container)`.

O asset oficial e `assets/img/geapa-loader-brain.svg`. Nao criar spinners circulares genericos.

## Badges

Variações disponiveis:

- `portal-badge--success`
- `portal-badge--warning`
- `portal-badge--danger`
- `portal-badge--neutral`
- `portal-badge--readonly`
- `portal-badge--dev`

As mesmas variações podem ser usadas com `portal-page-badge`.

## Orientacao para novas telas

- Comece com `portal-page-header` e `portal-page-panel`.
- Preserve dados e permissoes vindos do backend.
- Prefira estados locais de loading para listas, tabelas e cards.
- Use o loader global apenas para operacoes que bloqueiam a tela inteira.
- Em celulares, mantenha busca principal visivel, filtros avancados recolhiveis e botoes com area de toque confortavel.
