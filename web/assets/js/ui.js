/**
 * Utilitarios publicos de interface do Portal GEAPA.
 */

(function configurarUiPortal(global) {
  var LOADER_SVG_URL = 'assets/img/geapa-loader-brain.svg';
  var loadingCount = 0;
  var loaderSvgPromise = null;

  function escaparHtml(valor) {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatarRotulo(valor) {
    var texto = String(valor || '')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();

    if (!texto) {
      return '';
    }

    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function formatarData(valor) {
    var data = new Date(valor + 'T00:00:00');

    if (Number.isNaN(data.getTime())) {
      return valor || '';
    }

    return data.toLocaleDateString('pt-BR');
  }

  function formatarBooleano(valor) {
    return valor ? 'Sim' : 'Não';
  }

  function mostrarLoading(mensagem) {
    var overlay = obterOverlayLoading();

    if (!overlay) {
      return;
    }

    loadingCount += 1;
    atualizarMensagemLoading(mensagem || 'Carregando...');
    overlay.hidden = false;
    overlay.setAttribute('aria-busy', 'true');
    carregarSvgLoader();
  }

  function ocultarLoading() {
    var overlay = obterOverlayLoading();

    loadingCount = Math.max(loadingCount - 1, 0);

    if (!overlay || loadingCount > 0) {
      return;
    }

    overlay.hidden = true;
    overlay.setAttribute('aria-busy', 'false');
    atualizarMensagemLoading('Carregando...');
  }

  function atualizarMensagemLoading(mensagem) {
    var texto = document.getElementById('portal-global-loading-message');

    if (!texto) {
      return;
    }

    texto.textContent = mensagem || 'Carregando...';
  }

  function obterOverlayLoading() {
    if (typeof document === 'undefined') {
      return null;
    }

    return document.getElementById('portal-global-loading');
  }

  function carregarSvgLoader() {
    var destino = document.querySelector('[data-loader-svg]');

    if (!destino || destino.querySelector('svg')) {
      return Promise.resolve();
    }

    if (loaderSvgPromise) {
      return loaderSvgPromise;
    }

    loaderSvgPromise = fetch(LOADER_SVG_URL)
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error('SVG do loader indisponivel.');
        }

        return resposta.text();
      })
      .then(function inserirSvg(svg) {
        if (svg.indexOf('<svg') < 0) {
          throw new Error('Arquivo de loader invalido.');
        }

        destino.innerHTML = svg;
        prepararSvgInjetado(destino.querySelector('svg'));
      })
      .catch(function manterFallback() {
        loaderSvgPromise = null;
      });

    return loaderSvgPromise;
  }

  function prepararSvgInjetado(svg) {
    if (!svg) {
      return;
    }

    svg.classList.add('geapa-loader-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }

  global.PortalGeapaUi = {
    escaparHtml: escaparHtml,
    formatarRotulo: formatarRotulo,
    formatarData: formatarData,
    formatarBooleano: formatarBooleano,
    mostrarLoading: mostrarLoading,
    ocultarLoading: ocultarLoading,
    atualizarMensagemLoading: atualizarMensagemLoading
  };
})(window);
