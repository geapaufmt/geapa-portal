/**
 * Registro PWA do Portal GEAPA.
 *
 * O service worker cacheia apenas shell publico e assets estaticos. Chamadas ao
 * Apps Script, Firebase Auth e dados de membros continuam sempre online.
 */
(function configurarPwaPortal(global) {
  var installPromptEvent = null;
  var reloadingForUpdate = false;

  function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    global.addEventListener('load', function aoCarregarPagina() {
      navigator.serviceWorker.register('/service-worker.js')
        .then(function atualizarRegistro(registro) {
          return registro.update();
        })
        .catch(function registrarErro(erro) {
          if (global.console && typeof global.console.warn === 'function') {
            global.console.warn('[Portal GEAPA] service-worker', erro);
          }
        });
    });

    navigator.serviceWorker.addEventListener('controllerchange', function aoAtualizarControle() {
      if (reloadingForUpdate) {
        return;
      }

      reloadingForUpdate = true;
      global.location.reload();
    });
  }

  function obterBotoesInstalacao() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-install-app]'));
  }

  function alternarBotoesInstalacao(visivel) {
    obterBotoesInstalacao().forEach(function alternarBotao(botao) {
      botao.hidden = !visivel;
    });
  }

  function configurarInstalacao() {
    global.addEventListener('beforeinstallprompt', function aoAntesDeInstalar(evento) {
      evento.preventDefault();
      installPromptEvent = evento;
      alternarBotoesInstalacao(true);
    });

    document.addEventListener('click', function aoClicar(evento) {
      var botao = evento.target && evento.target.closest
        ? evento.target.closest('[data-install-app]')
        : null;

      if (!botao || !installPromptEvent) {
        return;
      }

      botao.disabled = true;
      installPromptEvent.prompt();
      installPromptEvent.userChoice.finally(function concluirInstalacao() {
        installPromptEvent = null;
        botao.disabled = false;
        alternarBotoesInstalacao(false);
      });
    });

    global.addEventListener('appinstalled', function aoInstalarApp() {
      installPromptEvent = null;
      alternarBotoesInstalacao(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', configurarInstalacao);
  } else {
    configurarInstalacao();
  }

  registrarServiceWorker();
})(window);
