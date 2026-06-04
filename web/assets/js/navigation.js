/**
 * Navegacao centralizada do Portal GEAPA.
 *
 * Esta camada controla apenas a interface. Permissoes reais continuam sendo
 * validadas no Apps Script em toda acao sensivel.
 */
(function configurarNavegacaoPortal(global) {
  var SESSION_STORAGE_KEY = 'geapaPortal.sessionToken';
  var rotaAtual = 'login';
  var inicializado = false;
  var ROTAS_PORTAL = {
    login: {
      id: 'login',
      viewClass: 'view-login',
      sectionId: 'tela-acesso',
      publico: true
    },
    situacao: {
      id: 'situacao',
      label: 'Minha situacao',
      viewClass: 'view-situacao',
      sectionId: 'tela-situacao',
      exigeSessao: true,
      navSelector: '[data-voltar-situacao]'
    },
    atividades: {
      id: 'atividades',
      label: 'Atividades',
      viewClass: 'view-atividades',
      sectionId: 'tela-atividades',
      exigeSessao: true,
      navSelector: '[data-open-atividades]'
    },
    diretoria: {
      id: 'diretoria',
      label: 'Diretoria',
      exigeSessao: true,
      permissao: 'podeVerAreaDiretoria',
      navSelector: '[data-area-diretoria]',
      emBreve: true
    }
  };

  function iniciar() {
    if (inicializado || typeof document === 'undefined') {
      return;
    }

    inicializado = true;
    registrarBotoes();
    atualizarMenu();
    destacarRotaAtual();
  }

  function registrarBotoes() {
    Object.keys(ROTAS_PORTAL).forEach(function registrar(chave) {
      var rota = ROTAS_PORTAL[chave];

      if (!rota.navSelector) {
        return;
      }

      Array.prototype.forEach.call(document.querySelectorAll(rota.navSelector), function registrarBotao(botao) {
        botao.addEventListener('click', function navegar(evento) {
          if (botao.disabled) {
            return;
          }

          evento.preventDefault();
          irPara(rota.id);
        });
      });
    });
  }

  function irPara(idRota, opcoes) {
    var rota = ROTAS_PORTAL[idRota];
    var anterior = rotaAtual;
    var detalhes = opcoes || {};

    if (!rota) {
      return false;
    }

    if (!podeAcessarRota(rota)) {
      atualizarMenu();

      if (rota.exigeSessao && !temSessaoAtiva()) {
        return irPara('login', { motivo: 'sessao-ausente' });
      }

      emitirEvento('portal:navigationdenied', {
        rota: rota,
        anterior: anterior,
        motivo: detalhes.motivo || 'acesso-negado'
      });
      fecharMenu();
      return false;
    }

    aplicarRota(rota);
    rotaAtual = rota.id;
    atualizarMenu();
    destacarRotaAtual();
    fecharMenu();
    emitirEvento('portal:navigationchange', {
      rota: rota,
      anterior: anterior,
      motivo: detalhes.motivo || ''
    });

    return true;
  }

  function aplicarRota(rota) {
    var app = document.getElementById('portal-app');

    if (!app) {
      return;
    }

    Object.keys(ROTAS_PORTAL).forEach(function limpar(chave) {
      var rotaRegistrada = ROTAS_PORTAL[chave];
      var secao = rotaRegistrada.sectionId
        ? document.getElementById(rotaRegistrada.sectionId)
        : null;

      if (rotaRegistrada.viewClass) {
        app.classList.remove(rotaRegistrada.viewClass);
      }

      if (secao) {
        secao.hidden = true;
      }
    });

    if (rota.viewClass) {
      app.classList.add(rota.viewClass);
    }

    if (rota.sectionId) {
      var secaoAtiva = document.getElementById(rota.sectionId);

      if (secaoAtiva) {
        secaoAtiva.hidden = false;
      }
    }
  }

  function podeAcessarRota(rota) {
    if (!rota) {
      return false;
    }

    if (rota.publico) {
      return true;
    }

    if (rota.emBreve) {
      return false;
    }

    if (rota.exigeSessao && !temSessaoAtiva()) {
      return false;
    }

    if (rota.permissao) {
      return temPermissao(rota.permissao);
    }

    if (rota.perfis && rota.perfis.length) {
      return rota.perfis.some(temPerfil);
    }

    return true;
  }

  function atualizarMenu() {
    Object.keys(ROTAS_PORTAL).forEach(function atualizar(chave) {
      var rota = ROTAS_PORTAL[chave];

      if (!rota.navSelector) {
        return;
      }

      Array.prototype.forEach.call(document.querySelectorAll(rota.navSelector), function atualizarBotao(botao) {
        var visivel = podeMostrarBotao(rota);
        var desabilitado = rota.emBreve || !podeAcessarRota(rota);

        botao.hidden = !visivel;
        botao.disabled = desabilitado;
        botao.classList.toggle('active', rota.id === rotaAtual);
        botao.setAttribute('aria-current', rota.id === rotaAtual ? 'page' : 'false');

        if (rota.emBreve) {
          botao.title = rota.label + ' sera liberada em uma etapa futura.';
        } else if (desabilitado) {
          botao.title = 'Acesso indisponivel para o perfil atual.';
        } else {
          botao.removeAttribute('title');
        }
      });
    });
  }

  function podeMostrarBotao(rota) {
    if (!rota || rota.publico) {
      return false;
    }

    if (rota.exigeSessao && !temSessaoAtiva()) {
      return false;
    }

    if (rota.permissao) {
      return temPermissao(rota.permissao);
    }

    if (rota.perfis && rota.perfis.length) {
      return rota.perfis.some(temPerfil);
    }

    return true;
  }

  function destacarRotaAtual() {
    Object.keys(ROTAS_PORTAL).forEach(function destacar(chave) {
      var rota = ROTAS_PORTAL[chave];

      if (!rota.navSelector) {
        return;
      }

      Array.prototype.forEach.call(document.querySelectorAll(rota.navSelector), function destacarBotao(botao) {
        botao.classList.toggle('active', rota.id === rotaAtual);
        botao.setAttribute('aria-current', rota.id === rotaAtual ? 'page' : 'false');
      });
    });
  }

  function temSessaoAtiva() {
    try {
      return Boolean(global.sessionStorage.getItem(SESSION_STORAGE_KEY));
    } catch (erro) {
      return false;
    }
  }

  function temPermissao(permissao) {
    var auth = global.PortalGeapaAuth;

    return Boolean(auth && typeof auth.hasPermissao === 'function' && auth.hasPermissao(permissao));
  }

  function temPerfil(perfil) {
    var auth = global.PortalGeapaAuth;

    return Boolean(auth && typeof auth.hasPerfil === 'function' && auth.hasPerfil(perfil));
  }

  function fecharMenu() {
    var frame = document.querySelector('.portal-frame');
    var botaoMenu = document.getElementById('menu-toggle');
    var backdrop = document.querySelector('[data-close-sidebar]');

    if (frame) {
      frame.classList.remove('sidebar-open');
    }

    if (botaoMenu) {
      botaoMenu.setAttribute('aria-expanded', 'false');
      botaoMenu.setAttribute('aria-label', 'Abrir menu');
    }

    if (backdrop) {
      backdrop.hidden = true;
    }
  }

  function emitirEvento(nome, detalhe) {
    document.dispatchEvent(new CustomEvent(nome, {
      detail: detalhe
    }));
  }

  function getRotaAtual() {
    return rotaAtual;
  }

  function getRotas() {
    return Object.assign({}, ROTAS_PORTAL);
  }

  global.PortalGeapaNavigation = {
    iniciar: iniciar,
    irPara: irPara,
    atualizarMenu: atualizarMenu,
    podeAcessarRota: podeAcessarRota,
    fecharMenu: fecharMenu,
    getRotaAtual: getRotaAtual,
    getRotas: getRotas
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})(window);
