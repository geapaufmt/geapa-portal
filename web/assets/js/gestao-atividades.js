/**
 * Camada visual do Pacote 4A.1 - Gestao de Atividades.
 *
 * Mantem a criacao fora da tela publica de Proximas atividades e reaproveita
 * o fluxo seguro ja implementado em atividades.js. Esta camada nao substitui
 * validacao real: o backend geapa-atividades continua decidindo permissoes.
 */
(function configurarGestaoAtividadesPortal(global) {
  var navigation = global.PortalGeapaNavigation;
  var auth = global.PortalGeapaAuth;
  var ui = global.PortalGeapaUi;
  var ROTA_GESTAO_ATIVIDADES = 'admin-atividades';

  function iniciarGestaoAtividades() {
    document.addEventListener('portal:navigationchange', function tratarNavegacao(evento) {
      var rota = evento.detail && evento.detail.rota;

      if (!rota) {
        return;
      }

      if (rota.id === ROTA_GESTAO_ATIVIDADES) {
        renderizarGestaoAtividades();
        return;
      }

      if (rota.id === 'atividades' || rota.id === 'historico-atividades') {
        agendarAtualizacaoBotaoCriar(false);
      }
    });

    document.addEventListener('click', function atualizarDiagnosticoAposTentativa(evento) {
      var botao = evento.target && evento.target.closest
        ? evento.target.closest('[data-create-activity]')
        : null;

      if (!botao || botao.disabled) {
        return;
      }

      agendarDiagnosticoCriacao();
    }, true);

    agendarRoteamentoInicial();
  }

  function agendarRoteamentoInicial() {
    global.setTimeout(function tratarRotaInicial() {
      var rotaAtual = navigation && typeof navigation.getRotaAtual === 'function'
        ? navigation.getRotaAtual()
        : '';

      if (rotaAtual === ROTA_GESTAO_ATIVIDADES) {
        renderizarGestaoAtividades();
        return;
      }

      if (rotaAtual === 'atividades' || rotaAtual === 'historico-atividades') {
        agendarAtualizacaoBotaoCriar(false);
      }
    }, 0);
  }

  function renderizarGestaoAtividades() {
    var app = document.getElementById('portal-app');
    var placeholder = document.getElementById('tela-placeholder');
    var container = document.getElementById('placeholder-content');
    var podeCriar = podeCriarAtividade();

    if (!app || !placeholder || !container) {
      return;
    }

    ocultarSecoesInternas();
    app.classList.remove('view-inicio', 'view-login', 'view-situacao', 'view-atividades', 'view-access-denied');
    app.classList.add('view-placeholder');
    placeholder.hidden = false;

    container.innerHTML = [
      '<p class="eyebrow">Gestao do GEAPA</p>',
      '<div class="situation-topbar">',
      '<div class="section-heading">',
      '<h2>Gestao de atividades</h2>',
      '<p class="intro">Crie, acompanhe e futuramente edite, publique, oculte ou cancele atividades oficiais do GEAPA.</p>',
      '</div>',
      '<button class="secondary-button compact-button" type="button" data-route-target="atividades">Ver proximas atividades</button>',
      '</div>',
      '<section class="activity-detail-section">',
      '<h3>Criacao segura</h3>',
      '<p class="section-note">Neste pacote, a criacao continua usando dryRun antes da gravacao real. A atividade nasce como PLANEJADA, RASCUNHO e visivel apenas para DIRETORIA.</p>',
      '<div class="presentation-card-actions">',
      '<button type="button" data-create-activity data-create-activity-admin',
      podeCriar ? '' : ' disabled',
      '>',
      podeCriar ? 'Criar atividade' : 'Criar atividade indisponivel',
      '</button>',
      '<button class="secondary-button" type="button" data-refresh-create-diagnostics>Atualizar diagnostico</button>',
      '</div>',
      '<p class="simulation-warning">A permissao visual apenas controla a interface. A permissao real continua sendo validada no backend do modulo Atividades.</p>',
      '</section>',
      '<section class="activity-detail-section">',
      '<h3>Diagnostico do botao</h3>',
      '<div id="atividade-create-diagnostics"></div>',
      '</section>',
      '<section class="activity-detail-section">',
      '<h3>Proximos pacotes</h3>',
      '<dl class="activity-detail-grid">',
      montarFato('4B', 'Edicao segura de atividades existentes'),
      montarFato('4C', 'Cancelar, ocultar, publicar e republicar'),
      montarFato('4D', 'Anexos, ata, materiais, certificados e integracoes'),
      '</dl>',
      '</section>'
    ].join('');

    registrarEventosGestao(container);
    agendarAtualizacaoBotaoCriar(true);
    atualizarDiagnosticoCriacao();
  }

  function registrarEventosGestao(container) {
    var botaoDiagnostico = container.querySelector('[data-refresh-create-diagnostics]');

    if (botaoDiagnostico) {
      botaoDiagnostico.addEventListener('click', atualizarDiagnosticoCriacao);
    }
  }

  function ocultarSecoesInternas() {
    [
      'tela-inicio',
      'tela-acesso',
      'tela-situacao',
      'tela-atividades',
      'tela-placeholder',
      'tela-acesso-negado'
    ].forEach(function ocultar(id) {
      var secao = document.getElementById(id);
      if (secao) {
        secao.hidden = true;
      }
    });
  }

  function agendarAtualizacaoBotaoCriar(visivelNaGestao) {
    global.requestAnimationFrame(function atualizar() {
      atualizarBotoesCriar(visivelNaGestao);
    });
  }

  function atualizarBotoesCriar(visivelNaGestao) {
    var podeCriar = podeCriarAtividade();

    Array.prototype.forEach.call(document.querySelectorAll('[data-create-activity]'), function atualizar(botao) {
      var ehBotaoGestao = botao.hasAttribute('data-create-activity-admin');
      var deveMostrar = ehBotaoGestao ? visivelNaGestao : false;

      botao.hidden = !deveMostrar;
      botao.disabled = !deveMostrar || !podeCriar;
      botao.title = !podeCriar
        ? 'Criacao permitida apenas para Diretoria, Secretaria ou Admin tecnico.'
        : 'Criar uma nova atividade como rascunho visivel apenas para Diretoria.';
    });
  }

  function agendarDiagnosticoCriacao() {
    global.setTimeout(atualizarDiagnosticoCriacao, 0);
  }

  function atualizarDiagnosticoCriacao() {
    var container = document.getElementById('atividade-create-diagnostics');
    var diagnostico = diagnosticarCriacaoAtividade();

    if (!container) {
      return diagnostico;
    }

    container.innerHTML = [
      '<dl class="activity-detail-grid">',
      montarFato('PortalGeapaAuth.getUsuarioAtual()', diagnostico.usuarioResumo),
      montarFato('PortalGeapaAuth.canCreateActivity()', diagnostico.canCreateActivity ? 'true' : 'false'),
      montarFato('Botao [data-create-activity].disabled', String(diagnostico.botaoDisabled)),
      montarFato('Botao [data-create-activity].hidden', String(diagnostico.botaoHidden)),
      montarFato('Sessao/perfis', diagnostico.sessaoResumo),
      montarFato('Permissoes', diagnostico.permissoesResumo || 'Nenhuma permissao informada'),
      '</dl>',
      '<p class="section-note">',
      escaparHtml(diagnostico.leitura),
      '</p>'
    ].join('');

    if (global.console && typeof global.console.debug === 'function') {
      global.console.debug('[GEAPA-PORTAL] diagnostico criar atividade', diagnostico);
    }

    return diagnostico;
  }

  function diagnosticarCriacaoAtividade() {
    var usuario = auth && typeof auth.getUsuarioAtual === 'function'
      ? auth.getUsuarioAtual()
      : {};
    var sessao = global.PortalGeapaAuthAdapter && typeof global.PortalGeapaAuthAdapter.getCurrentSession === 'function'
      ? global.PortalGeapaAuthAdapter.getCurrentSession()
      : {};
    var botao = document.querySelector('[data-create-activity-admin]') || document.querySelector('[data-create-activity]');
    var canCreate = podeCriarAtividade();
    var perfis = Array.isArray(usuario.perfisPortal)
      ? usuario.perfisPortal
      : (Array.isArray(usuario.perfis) ? usuario.perfis : []);
    var permissoes = usuario && usuario.permissoes ? usuario.permissoes : {};
    var permissoesAtivas = Object.keys(permissoes).filter(function filtrar(chave) {
      return permissoes[chave] === true;
    });
    var sessaoPerfis = Array.isArray(sessao.perfisPortal) ? sessao.perfisPortal : [];
    var sessaoPermissoes = Array.isArray(sessao.permissoes) ? sessao.permissoes : [];

    return {
      canCreateActivity: canCreate,
      botaoDisabled: botao ? botao.disabled === true : null,
      botaoHidden: botao ? botao.hidden === true : null,
      usuario: usuario,
      sessao: sessao,
      usuarioResumo: [
        usuario.nomeExibicao || 'Usuario nao resolvido',
        usuario.perfilPrincipal || usuario.perfilPortalEfetivo || 'sem perfil principal',
        perfis.length ? perfis.join(', ') : 'sem perfis'
      ].join(' | '),
      sessaoResumo: [
        sessao.perfilPortalEfetivo || 'sem perfil efetivo',
        sessaoPerfis.length ? sessaoPerfis.join(', ') : 'sem perfis de sessao'
      ].join(' | '),
      permissoesResumo: permissoesAtivas.concat(sessaoPermissoes).filter(function unico(valor, indice, lista) {
        return valor && lista.indexOf(valor) === indice;
      }).join(', '),
      leitura: canCreate
        ? 'canCreateActivity() retornou true. Se o modal nao abrir, o problema tende a estar em evento, modal, cache do navegador ou carregamento do arquivo atividades.js.'
        : 'canCreateActivity() retornou false. O problema tende a estar no perfil/permissao vindo do GEAPA Core ou da Planilha Geral.'
    };
  }

  function podeCriarAtividade() {
    return Boolean(auth && typeof auth.canCreateActivity === 'function' && auth.canCreateActivity());
  }

  function montarFato(rotulo, valor) {
    return [
      '<div>',
      '<dt>' + escaparHtml(rotulo) + '</dt>',
      '<dd>' + escaparHtml(valor || '-') + '</dd>',
      '</div>'
    ].join('');
  }

  function escaparHtml(valor) {
    if (ui && typeof ui.escaparHtml === 'function') {
      return ui.escaparHtml(valor);
    }

    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.PortalGeapaAtividadesDebug = Object.assign({}, global.PortalGeapaAtividadesDebug || {}, {
    diagnosticarCriacao: diagnosticarCriacaoAtividade,
    atualizarDiagnosticoCriacao: atualizarDiagnosticoCriacao
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarGestaoAtividades);
  } else {
    iniciarGestaoAtividades();
  }
})(window);
