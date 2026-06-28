/**
 * Utilitarios publicos de interface do Portal GEAPA.
 */

(function configurarUiPortal(global) {
  var LOADER_SVG_URL = 'assets/img/geapa-loader-brain.svg';
  var TOAST_DURACAO_PADRAO_MS = 6500;
  var loadingCount = 0;
  var loaderSvgPromise = null;
  var toastSequence = 0;
  var toastTimers = {};

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

  function normalizarFeedbackResposta(resposta, opcoes) {
    var origem = resposta || {};
    var data = origem.data && typeof origem.data === 'object' ? origem.data : {};
    var meta = origem.meta && typeof origem.meta === 'object' ? origem.meta : {};
    var config = opcoes || {};
    var warnings = origem.warnings || origem.avisos || data.warnings || data.avisos || meta.warnings || meta.avisos || [];
    var fieldErrors = origem.fieldErrors || data.fieldErrors || {};
    var nextActions = origem.nextActions || data.nextActions || meta.nextActions || [];

    return {
      ok: origem.ok === true,
      message: String(origem.message || origem.mensagem || data.message || data.mensagem || config.fallbackMessage || '').trim(),
      data: data,
      warnings: normalizarListaFeedback(warnings),
      fieldErrors: fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : {},
      nextActions: normalizarListaFeedback(nextActions),
      code: String(origem.code || origem.errorCode || '').trim()
    };
  }

  function obterMensagemErroAmigavel(feedback, fallback) {
    var dados = feedback || {};
    var mensagem = String(dados.message || '').trim();

    if (Object.keys(dados.fieldErrors || {}).length) {
      return 'Nao foi possivel concluir a acao. Verifique os campos destacados.';
    }

    if (!mensagem || mensagemEhTecnica(mensagem)) {
      return fallback || 'Nao foi possivel concluir a acao. Tente novamente.';
    }

    return mensagem;
  }

  function mensagemEhTecnica(mensagem) {
    return /(referenceerror|typeerror|syntaxerror|exception|stack trace|\bat\s+[^ ]+\s*\(|\.gs:\d+|internal server error|erro_api|failed to fetch|networkerror|load failed)/i.test(mensagem);
  }

  function normalizarListaFeedback(valor) {
    if (Array.isArray(valor)) {
      return valor.filter(Boolean);
    }

    return valor ? [valor] : [];
  }

  function mostrarToast(opcoes) {
    var config = typeof opcoes === 'string' ? { message: opcoes } : (opcoes || {});
    var region = obterRegiaoToast();
    var id = String(config.id || 'portal-toast-' + (++toastSequence));
    var toast = region ? region.querySelector('[data-toast-id="' + escaparSeletor(id) + '"]') : null;
    var tipo = normalizarTipoFeedback(config.type || 'info');

    if (!region || !config.message) {
      return '';
    }

    if (!toast) {
      toast = document.createElement('article');
      toast.setAttribute('data-toast-id', id);
      region.appendChild(toast);
    }

    limparTimerToast(id);
    toast.className = 'portal-toast portal-toast-' + tipo;
    toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = montarConteudoFeedback(config, true);

    var botaoFechar = toast.querySelector('[data-toast-close]');
    if (botaoFechar) {
      botaoFechar.addEventListener('click', function fechar() {
        removerToast(id);
      });
    }

    if (config.persistent !== true && !(tipo === 'error' && config.critical === true)) {
      toastTimers[id] = setTimeout(function expirar() {
        removerToast(id);
      }, Number(config.durationMs) > 0 ? Number(config.durationMs) : TOAST_DURACAO_PADRAO_MS);
    }

    return id;
  }

  function atualizarToast(id, opcoes) {
    var config = Object.assign({}, opcoes || {}, { id: id });
    return mostrarToast(config);
  }

  function removerToast(id) {
    var region = obterRegiaoToast();
    var toast = region ? region.querySelector('[data-toast-id="' + escaparSeletor(id) + '"]') : null;

    limparTimerToast(id);
    if (toast) {
      toast.remove();
    }
  }

  function limparTimerToast(id) {
    if (toastTimers[id]) {
      clearTimeout(toastTimers[id]);
      delete toastTimers[id];
    }
  }

  function obterRegiaoToast() {
    if (typeof document === 'undefined') {
      return null;
    }

    var region = document.getElementById('portal-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'portal-toast-region';
      region.className = 'portal-toast-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-relevant', 'additions text');
      document.body.appendChild(region);
    }

    return region;
  }

  function mostrarMensagemPersistente(alvo, opcoes) {
    var container = typeof alvo === 'string' ? document.querySelector(alvo) : alvo;
    var config = opcoes || {};

    if (!container) {
      return null;
    }

    container.innerHTML = '<div class="portal-feedback portal-feedback-' + normalizarTipoFeedback(config.type || 'info') + '" role="' +
      ((config.type || '') === 'error' ? 'alert' : 'status') + '" aria-live="polite">' +
      montarConteudoFeedback(config, false) +
      '</div>';
    container.hidden = false;
    return container.firstElementChild;
  }

  function limparMensagemPersistente(alvo) {
    var container = typeof alvo === 'string' ? document.querySelector(alvo) : alvo;

    if (container) {
      container.innerHTML = '';
      container.hidden = true;
    }
  }

  function montarConteudoFeedback(config, comFechar) {
    var titulo = config.title ? '<strong class="portal-feedback-title">' + escaparHtml(config.title) + '</strong>' : '';
    var mensagem = '<p class="portal-feedback-message">' + escaparHtml(config.message || '') + '</p>';
    var detalhes = normalizarListaFeedback(config.details).filter(Boolean);
    var detalhesHtml = detalhes.length
      ? '<ul class="portal-feedback-details">' + detalhes.map(function montar(item) {
        return '<li>' + escaparHtml(obterTextoFeedback(item)) + '</li>';
      }).join('') + '</ul>'
      : '';
    var acoes = normalizarListaFeedback(config.actions).filter(Boolean);
    var acoesHtml = acoes.length
      ? '<div class="portal-feedback-actions">' + acoes.map(montarAcaoFeedback).join('') + '</div>'
      : '';
    var fechar = comFechar
      ? '<button class="portal-toast-close" type="button" data-toast-close aria-label="Fechar notificacao">&times;</button>'
      : '';

    return fechar + '<div class="portal-feedback-body">' + titulo + mensagem + detalhesHtml + acoesHtml + '</div>';
  }

  function montarAcaoFeedback(acao) {
    if (typeof acao === 'string') {
      return '<span>' + escaparHtml(acao) + '</span>';
    }

    var atributos = Object.keys((acao || {}).attributes || {}).filter(function permitir(chave) {
      return /^(data|aria)-[a-z0-9-]+$/.test(chave);
    }).map(function montar(chave) {
      return ' ' + escaparHtml(chave) + '="' + escaparHtml(acao.attributes[chave]) + '"';
    }).join('');
    return '<button class="' + escaparHtml(acao.className || 'secondary-button compact-button') + '" type="button"' +
      atributos + '>' + escaparHtml(acao.label || 'Continuar') + '</button>';
  }

  function obterTextoFeedback(item) {
    if (typeof item === 'string') {
      return item;
    }

    return item && (item.message || item.mensagem || item.label || item.rotulo || item.action || item.acao)
      ? String(item.message || item.mensagem || item.label || item.rotulo || item.action || item.acao)
      : '';
  }

  function aplicarErrosCampos(form, fieldErrors) {
    if (!form) {
      return [];
    }

    limparErrosCampos(form);
    var mensagens = [];

    Object.keys(fieldErrors || {}).forEach(function aplicar(nome) {
      var campo = form.elements && form.elements[nome];
      var mensagem = obterTextoFeedback(fieldErrors[nome]);

      if (!mensagem) {
        return;
      }

      mensagens.push(mensagem);
      if (!campo || !campo.setAttribute) {
        return;
      }

      var idErro = 'field-error-' + String(nome).replace(/[^a-zA-Z0-9_-]/g, '-') + '-' + (++toastSequence);
      var erro = document.createElement('span');
      erro.className = 'field-error-message';
      erro.id = idErro;
      erro.setAttribute('data-field-error', nome);
      erro.textContent = mensagem;
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', juntarIds(campo.getAttribute('aria-describedby'), idErro));
      campo.insertAdjacentElement('afterend', erro);
    });

    return mensagens;
  }

  function limparErrosCampos(form) {
    Array.prototype.forEach.call(form.querySelectorAll('[data-field-error]'), function remover(erro) {
      erro.remove();
    });
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid="true"]'), function limpar(campo) {
      var descricoes = String(campo.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(function manter(id) { return id && id.indexOf('field-error-') !== 0; });
      campo.removeAttribute('aria-invalid');
      if (descricoes.length) {
        campo.setAttribute('aria-describedby', descricoes.join(' '));
      } else {
        campo.removeAttribute('aria-describedby');
      }
    });
  }

  function juntarIds(atual, novoId) {
    return String(atual || '').split(/\s+/).filter(Boolean).concat([novoId]).join(' ');
  }

  function normalizarTipoFeedback(tipo) {
    var normalizado = String(tipo || '').toLowerCase();
    return ['success', 'info', 'warning', 'error', 'pending'].indexOf(normalizado) >= 0
      ? normalizado
      : 'info';
  }

  function escaparSeletor(valor) {
    if (global.CSS && typeof global.CSS.escape === 'function') {
      return global.CSS.escape(valor);
    }

    return String(valor).replace(/["\\]/g, '\\$&');
  }

  global.PortalGeapaUi = {
    escaparHtml: escaparHtml,
    formatarRotulo: formatarRotulo,
    formatarData: formatarData,
    formatarBooleano: formatarBooleano,
    mostrarLoading: mostrarLoading,
    ocultarLoading: ocultarLoading,
    atualizarMensagemLoading: atualizarMensagemLoading,
    normalizarFeedbackResposta: normalizarFeedbackResposta,
    obterMensagemErroAmigavel: obterMensagemErroAmigavel,
    mostrarToast: mostrarToast,
    atualizarToast: atualizarToast,
    removerToast: removerToast,
    mostrarMensagemPersistente: mostrarMensagemPersistente,
    limparMensagemPersistente: limparMensagemPersistente,
    aplicarErrosCampos: aplicarErrosCampos,
    limparErrosCampos: limparErrosCampos
  };
})(window);
