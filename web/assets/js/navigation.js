/**
 * Navegacao centralizada e politica visual de rotas do Portal GEAPA.
 *
 * Esta camada apenas consome perfil/permissoes vindos da sessao resolvida pelo
 * GEAPA-CORE. O Portal nao calcula cargo, vinculo, perfil institucional ou
 * permissao administrativa.
 */
(function configurarNavegacaoPortal(global) {
  var PERFIS = {
    ADMIN: 'ADMIN',
    DIRETORIA: 'DIRETORIA',
    SECRETARIA: 'SECRETARIA',
    COMUNICACAO: 'COMUNICACAO',
    CONSELHO: 'CONSELHO',
    MEMBRO: 'MEMBRO',
    EGRESSO: 'EGRESSO',
    COLABORADOR: 'COLABORADOR',
    EXTERNO: 'EXTERNO',
    VISITANTE: 'VISITANTE'
  };
  var TODOS_PERFIS = [
    PERFIS.ADMIN,
    PERFIS.DIRETORIA,
    PERFIS.SECRETARIA,
    PERFIS.COMUNICACAO,
    PERFIS.CONSELHO,
    PERFIS.MEMBRO,
    PERFIS.EGRESSO,
    PERFIS.COLABORADOR,
    PERFIS.EXTERNO,
    PERFIS.VISITANTE
  ];
  var GRUPOS_MENU = [
    { id: 'area-membro', label: 'Area do membro', ordem: 10 },
    { id: 'atividades', label: 'Atividades', ordem: 20 },
    { id: 'gestao', label: 'Gestao', ordem: 30 },
    { id: 'administracao', label: 'Administracao', ordem: 40 },
    { id: 'publico-geral', label: 'Publico / Geral', ordem: 50 }
  ];
  var MOTIVOS_ACESSO = {
    NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
    PORTAL_INATIVO: 'PORTAL_INATIVO',
    PERFIL_NAO_AUTORIZADO: 'PERFIL_NAO_AUTORIZADO',
    PERMISSAO_INSUFICIENTE: 'PERMISSAO_INSUFICIENTE',
    ROTA_INEXISTENTE: 'ROTA_INEXISTENTE'
  };
  var ROTAS_PORTAL = [
    {
      id: 'login',
      label: 'Login',
      path: 'login',
      viewClass: 'view-login',
      sectionId: 'tela-acesso',
      grupoMenu: 'sistema',
      perfisPermitidos: [PERFIS.VISITANTE],
      permissoesNecessarias: [],
      requerLogin: false,
      mostrarNoMenu: false,
      ordem: 0,
      descricao: 'Tela de entrada do Portal GEAPA.',
      status: 'implementado'
    },
    {
      id: 'inicio',
      label: 'Inicio',
      path: 'inicio',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'publico-geral',
      perfisPermitidos: TODOS_PERFIS,
      permissoesNecessarias: ['portal:acessar'],
      requerLogin: false,
      mostrarNoMenu: true,
      ordem: 1,
      descricao: 'Tela inicial do Portal GEAPA, preparada para apresentar atalhos e avisos gerais.',
      status: 'placeholder'
    },
    {
      id: 'minha-situacao',
      label: 'Minha situacao',
      path: 'minha-situacao',
      viewClass: 'view-situacao',
      sectionId: 'tela-situacao',
      grupoMenu: 'area-membro',
      perfisPermitidos: [PERFIS.MEMBRO, PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.COMUNICACAO, PERFIS.CONSELHO, PERFIS.ADMIN],
      permissoesNecessarias: ['situacao:ver_propria'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 10,
      descricao: 'Tela individual do usuario logado.',
      status: 'implementado'
    },
    {
      id: 'minhas-apresentacoes',
      label: 'Minhas apresentacoes',
      path: 'minhas-apresentacoes',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'area-membro',
      perfisPermitidos: [PERFIS.MEMBRO, PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.COMUNICACAO, PERFIS.CONSELHO, PERFIS.EGRESSO, PERFIS.ADMIN],
      permissoesNecessarias: ['apresentacoes:ver_propria', 'apresentacoes:ver_ate_saida'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 20,
      descricao: 'Futuro acesso a apresentacoes proprias ou permitidas pelo CORE.',
      status: 'placeholder'
    },
    {
      id: 'frequencia',
      label: 'Frequencia',
      path: 'frequencia',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'area-membro',
      perfisPermitidos: [PERFIS.MEMBRO, PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.ADMIN],
      permissoesNecessarias: ['situacao:ver_propria', 'presencas:ler', 'presencas:gerir'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 30,
      descricao: 'Futuro acesso a frequencia propria ou administrativa conforme permissao efetiva.',
      status: 'placeholder'
    },
    {
      id: 'atividades',
      label: 'Atividades',
      path: 'atividades',
      viewClass: 'view-atividades',
      sectionId: 'tela-atividades',
      grupoMenu: 'atividades',
      perfisPermitidos: TODOS_PERFIS,
      permissoesNecessarias: ['atividades:ver'],
      requerLogin: false,
      mostrarNoMenu: true,
      ordem: 10,
      descricao: 'Visualizacao de atividades permitidas conforme perfil efetivo.',
      status: 'implementado'
    },
    {
      id: 'gestao-atividades',
      label: 'Gestao de atividades',
      path: 'gestao-atividades',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'atividades',
      perfisPermitidos: [PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.COMUNICACAO, PERFIS.ADMIN],
      permissoesNecessarias: ['atividades:gerir'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 20,
      descricao: 'Placeholder para futura area de gestao de atividades.',
      status: 'placeholder'
    },
    {
      id: 'diretoria',
      label: 'Diretoria',
      path: 'diretoria',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'gestao',
      perfisPermitidos: [PERFIS.DIRETORIA, PERFIS.ADMIN],
      permissoesNecessarias: ['membros:ler', 'atividades:gerir'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 10,
      descricao: 'Area institucional para rotinas internas da diretoria do GEAPA.',
      status: 'placeholder'
    },
    {
      id: 'secretaria',
      label: 'Secretaria',
      path: 'secretaria',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'gestao',
      perfisPermitidos: [PERFIS.SECRETARIA, PERFIS.DIRETORIA, PERFIS.ADMIN],
      permissoesNecessarias: ['membros:ler', 'presencas:gerir', 'apresentacoes:gerir'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 20,
      descricao: 'Placeholder para rotinas de secretaria, frequencia e apresentacoes.',
      status: 'placeholder'
    },
    {
      id: 'comunicacao',
      label: 'Comunicacao',
      path: 'comunicacao',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'gestao',
      perfisPermitidos: [PERFIS.COMUNICACAO, PERFIS.DIRETORIA, PERFIS.ADMIN],
      permissoesNecessarias: ['atividades:gerir', 'mensageria:ler'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 30,
      descricao: 'Placeholder para comunicacao, divulgacao e mensagens permitidas.',
      status: 'placeholder'
    },
    {
      id: 'conselho',
      label: 'Conselho',
      path: 'conselho',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'gestao',
      perfisPermitidos: [PERFIS.CONSELHO, PERFIS.DIRETORIA, PERFIS.ADMIN],
      permissoesNecessarias: ['portal:acessar'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 40,
      descricao: 'Area consultiva futura. Conselho nao recebe permissoes administrativas por padrao.',
      status: 'placeholder'
    },
    {
      id: 'administracao',
      label: 'Administracao',
      path: 'administracao',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'administracao',
      perfisPermitidos: [PERFIS.ADMIN],
      permissoesNecessarias: ['sistema:admin'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 10,
      descricao: 'Area tecnica e administrativa maxima, reservada a autorizacao explicita do CORE.',
      status: 'placeholder'
    },
    {
      id: 'logs',
      label: 'Logs',
      path: 'logs',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'administracao',
      perfisPermitidos: [PERFIS.ADMIN, PERFIS.DIRETORIA],
      permissoesNecessarias: ['logs:ler'],
      requerLogin: true,
      mostrarNoMenu: true,
      ordem: 20,
      descricao: 'Placeholder para logs operacionais permitidos.',
      status: 'placeholder'
    },
    {
      id: 'historico-apresentacoes',
      label: 'Historico de apresentacoes',
      path: 'historico-apresentacoes',
      viewClass: 'view-placeholder',
      sectionId: 'tela-placeholder',
      grupoMenu: 'publico-geral',
      perfisPermitidos: TODOS_PERFIS,
      permissoesNecessarias: ['apresentacoes:ver_publicas', 'apresentacoes:ver_ate_saida'],
      requerLogin: false,
      mostrarNoMenu: true,
      ordem: 20,
      descricao: 'Futuro historico publico ou permitido de apresentacoes.',
      status: 'placeholder'
    }
  ];
  var ALIASES_ROTAS = {
    situacao: 'minha-situacao',
    'minha_situacao': 'minha-situacao',
    apresentacoes: 'minhas-apresentacoes'
  };
  var rotaAtual = 'login';
  var inicializado = false;
  var ignorarProximoHash = false;

  function iniciar() {
    if (inicializado || typeof document === 'undefined') {
      return;
    }

    inicializado = true;
    renderizarMenu();
    registrarEventos();
    sincronizarRotaComHash();
    atualizarMenu();
  }

  function registrarEventos() {
    document.addEventListener('click', function navegarPorAtributo(evento) {
      var alvo = evento.target.closest('[data-route-target]');

      if (!alvo || alvo.disabled) {
        return;
      }

      evento.preventDefault();
      irPara(alvo.getAttribute('data-route-target'));
    });

    global.addEventListener('hashchange', function navegarPorHash() {
      if (ignorarProximoHash) {
        ignorarProximoHash = false;
        return;
      }

      sincronizarRotaComHash();
    });
  }

  function sincronizarRotaComHash() {
    var idRota = obterRotaPorHash();

    if (idRota) {
      irPara(idRota, { atualizarHash: false, origem: 'hash' });
    }
  }

  function irPara(idRota, opcoes) {
    var rota = resolverRota(idRota);
    var anterior = rotaAtual;
    var detalhes = opcoes || {};
    var sessao = getSessaoAtual();
    var acesso;

    if (!rota) {
      renderAccessDenied({ label: String(idRota || 'Rota') }, MOTIVOS_ACESSO.ROTA_INEXISTENTE);
      aplicarViewAcessoNegado();
      fecharMenu();
      return false;
    }

    acesso = resolveRouteAccess(sessao, rota);

    if (!acesso.ok) {
      renderAccessDenied(rota, acesso.reason);
      aplicarViewAcessoNegado();
      atualizarMenu();
      atualizarHashDaRota(rota, detalhes);
      fecharMenu();
      emitirEvento('portal:navigationdenied', {
        rota: rota,
        anterior: anterior,
        motivo: acesso.reason,
        sessao: sessao
      });
      return false;
    }

    aplicarRota(rota);
    rotaAtual = rota.id;
    atualizarMenu();
    atualizarHashDaRota(rota, detalhes);
    fecharMenu();
    emitirEvento('portal:navigationchange', {
      rota: rota,
      anterior: anterior,
      motivo: detalhes.motivo || '',
      sessao: sessao
    });

    return true;
  }

  function aplicarRota(rota) {
    var app = document.getElementById('portal-app');

    if (!app) {
      return;
    }

    limparViews(app);

    if (rota.viewClass) {
      app.classList.add(rota.viewClass);
    }

    mostrarSecao(rota.sectionId);

    if (rota.status === 'placeholder') {
      renderPlaceholderRoute(rota, getSessaoAtual());
    }
  }

  function aplicarViewAcessoNegado() {
    var app = document.getElementById('portal-app');

    if (!app) {
      return;
    }

    limparViews(app);
    app.classList.add('view-access-denied');
    mostrarSecao('tela-acesso-negado');
  }

  function limparViews(app) {
    getRotasInternas().forEach(function limpar(rota) {
      if (rota.viewClass) {
        app.classList.remove(rota.viewClass);
      }

      if (rota.sectionId) {
        var secaoRota = document.getElementById(rota.sectionId);

        if (secaoRota) {
          secaoRota.hidden = true;
        }
      }
    });

    app.classList.remove('view-access-denied');
  }

  function mostrarSecao(sectionId) {
    var secao = sectionId ? document.getElementById(sectionId) : null;

    if (secao) {
      secao.hidden = false;
    }
  }

  function resolveRouteAccess(sessao, rota) {
    if (!rota) {
      return { ok: false, reason: MOTIVOS_ACESSO.ROTA_INEXISTENTE };
    }

    if (rota.requerLogin && !sessao.autenticado) {
      return { ok: false, reason: MOTIVOS_ACESSO.NOT_AUTHENTICATED };
    }

    if (sessao.autenticado && sessao.portalAtivo === false) {
      return { ok: false, reason: MOTIVOS_ACESSO.PORTAL_INATIVO };
    }

    if (rota.id === 'minha-situacao' && sessao.autenticado && !sessao.usuarioResolvido) {
      return { ok: true, reason: '' };
    }

    if (!hasAnyProfile(sessao, rota.perfisPermitidos || [])) {
      return { ok: false, reason: MOTIVOS_ACESSO.PERFIL_NAO_AUTORIZADO };
    }

    if (!hasRoutePermission(sessao, rota)) {
      return { ok: false, reason: MOTIVOS_ACESSO.PERMISSAO_INSUFICIENTE };
    }

    return { ok: true, reason: '' };
  }

  function hasPermission(sessao, permissao) {
    var mapa = sessao && sessao.permissoesMapa ? sessao.permissoesMapa : {};

    return mapa[permissao] === true;
  }

  function hasAnyProfile(sessao, perfis) {
    var perfisSessao = sessao && Array.isArray(sessao.perfisPortal)
      ? sessao.perfisPortal
      : [PERFIS.VISITANTE];

    if (!perfis || !perfis.length) {
      return true;
    }

    return perfis.some(function verificarPerfil(perfil) {
      return perfisSessao.indexOf(perfil) >= 0;
    });
  }

  function hasRoutePermission(sessao, rota) {
    var necessarias = rota.permissoesNecessarias || [];

    if (!necessarias.length) {
      return true;
    }

    if (!sessao || !Array.isArray(sessao.permissoes) || !sessao.permissoes.length) {
      return true;
    }

    if (!sessao.permissoes.some(ehPermissaoCanonica)) {
      return true;
    }

    return necessarias.some(function verificarPermissao(permissao) {
      return hasPermission(sessao, permissao);
    });
  }

  function ehPermissaoCanonica(permissao) {
    return String(permissao || '').indexOf(':') > 0;
  }

  function getAllowedRoutes(sessao) {
    return ROTAS_PORTAL.filter(function filtrarRota(rota) {
      return rota.mostrarNoMenu && resolveRouteAccess(sessao || getSessaoAtual(), rota).ok;
    }).sort(ordenarRotas);
  }

  function renderizarMenu() {
    var nav = document.querySelector('[data-portal-nav]');
    var sessao = getSessaoAtual();
    var rotasPermitidas = getAllowedRoutes(sessao);
    var gruposHtml = GRUPOS_MENU.sort(ordenarGrupos).map(function montarGrupo(grupo) {
      var rotasDoGrupo = rotasPermitidas.filter(function filtrarPorGrupo(rota) {
        return rota.grupoMenu === grupo.id;
      });

      if (!rotasDoGrupo.length) {
        return '';
      }

      return [
        '<section class="nav-group">',
        '<p class="nav-group-title">' + escaparHtml(grupo.label) + '</p>',
        rotasDoGrupo.map(montarBotaoMenu).join(''),
        '</section>'
      ].join('');
    }).join('');

    if (!nav) {
      return;
    }

    nav.innerHTML = gruposHtml || '<p class="nav-empty">Nenhuma area disponivel.</p>';
    destacarRotaAtual();
  }

  function montarBotaoMenu(rota) {
    return [
      '<button class="nav-button" type="button" data-route-target="',
      escaparHtml(rota.id),
      '">',
      '<span>',
      escaparHtml(rota.label),
      '</span>',
      '</button>'
    ].join('');
  }

  function atualizarMenu() {
    renderizarMenu();
    destacarRotaAtual();
  }

  function destacarRotaAtual() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-route-target]'), function destacar(botao) {
      var ativo = normalizarIdRota(botao.getAttribute('data-route-target')) === rotaAtual;

      botao.classList.toggle('active', ativo);
      botao.setAttribute('aria-current', ativo ? 'page' : 'false');
    });
  }

  function renderPlaceholderRoute(rota, sessao) {
    var container = document.getElementById('placeholder-content');

    if (!container) {
      return;
    }

    container.innerHTML = [
      '<p class="eyebrow">',
      escaparHtml(obterLabelGrupo(rota.grupoMenu)),
      '</p>',
      '<h2>',
      escaparHtml(rota.label),
      '</h2>',
      '<p class="intro">',
      escaparHtml(rota.descricao),
      '</p>',
      '<div class="route-policy-card">',
      '<h3>Politica visual desta rota</h3>',
      '<dl class="route-policy-list">',
      montarLinhaPolitica('Status', rota.status === 'placeholder' ? 'Tela futura / placeholder' : rota.status),
      montarLinhaPolitica('Perfil atual', sessao.perfilPortalEfetivo || 'VISITANTE'),
      montarLinhaPolitica('Perfis permitidos', (rota.perfisPermitidos || []).join(', ')),
      montarLinhaPolitica('Permissoes da rota', (rota.permissoesNecessarias || []).join(', ') || 'Nenhuma'),
      '</dl>',
      '</div>'
    ].join('');
  }

  function renderAccessDenied(rota, reason) {
    var container = document.getElementById('access-denied-content');
    var mensagem = obterMensagemAcessoNegado(reason);
    var destino = reason === MOTIVOS_ACESSO.NOT_AUTHENTICATED ? 'login' : 'inicio';
    var rotuloBotao = reason === MOTIVOS_ACESSO.NOT_AUTHENTICATED ? 'Voltar para o login' : 'Ir para o inicio';

    if (!container) {
      return;
    }

    container.innerHTML = [
      '<p class="eyebrow">Acesso restrito</p>',
      '<h2>',
      escaparHtml(rota.label || 'Rota indisponivel'),
      '</h2>',
      '<p class="intro">',
      escaparHtml(mensagem),
      '</p>',
      '<button class="secondary-button" type="button" data-route-target="',
      destino,
      '">',
      rotuloBotao,
      '</button>'
    ].join('');
  }

  function obterMensagemAcessoNegado(reason) {
    if (reason === MOTIVOS_ACESSO.NOT_AUTHENTICATED) {
      return 'Faca login para acessar esta area.';
    }

    if (reason === MOTIVOS_ACESSO.PORTAL_INATIVO) {
      return 'Seu acesso ao Portal GEAPA esta inativo no momento.';
    }

    if (reason === MOTIVOS_ACESSO.PERMISSAO_INSUFICIENTE) {
      return 'Seu perfil atual nao possui permissao para acessar esta area.';
    }

    if (reason === MOTIVOS_ACESSO.ROTA_INEXISTENTE) {
      return 'Area indisponivel no Portal GEAPA.';
    }

    return 'Seu perfil atual nao possui acesso a esta area.';
  }

  function getSessaoAtual() {
    var adapter = global.PortalGeapaAuthAdapter;

    if (adapter && typeof adapter.getCurrentSession === 'function') {
      return adapter.getCurrentSession();
    }

    return {
      autenticado: false,
      perfilPortalEfetivo: PERFIS.VISITANTE,
      perfisPortal: [PERFIS.VISITANTE],
      permissoes: [],
      permissoesMapa: {},
      portalAtivo: true
    };
  }

  function resolverRota(idRota) {
    var idNormalizado = normalizarIdRota(idRota);

    return ROTAS_PORTAL.find(function encontrarRota(rota) {
      return rota.id === idNormalizado || rota.path === idNormalizado;
    }) || null;
  }

  function normalizarIdRota(idRota) {
    var id = String(idRota || '').trim();

    return ALIASES_ROTAS[id] || id;
  }

  function obterRotaPorHash() {
    var hash = String(global.location.hash || '').replace(/^#\/?/, '').trim();

    if (!hash) {
      return '';
    }

    return normalizarIdRota(hash);
  }

  function atualizarHashDaRota(rota, opcoes) {
    if (opcoes && opcoes.atualizarHash === false) {
      return;
    }

    if (!rota.path || rota.id === 'login') {
      return;
    }

    var novoHash = '#/' + rota.path;

    if (global.location.hash !== novoHash) {
      ignorarProximoHash = true;
      global.location.hash = novoHash;
    }
  }

  function getRotasInternas() {
    return ROTAS_PORTAL.concat([{
      id: 'acesso-negado',
      viewClass: 'view-access-denied',
      sectionId: 'tela-acesso-negado'
    }]);
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

  function montarLinhaPolitica(titulo, valor) {
    return [
      '<div>',
      '<dt>',
      escaparHtml(titulo),
      '</dt>',
      '<dd>',
      escaparHtml(valor || 'Nao informado'),
      '</dd>',
      '</div>'
    ].join('');
  }

  function obterLabelGrupo(idGrupo) {
    var grupo = GRUPOS_MENU.find(function encontrarGrupo(item) {
      return item.id === idGrupo;
    });

    return grupo ? grupo.label : 'Portal GEAPA';
  }

  function ordenarRotas(a, b) {
    return a.ordem - b.ordem;
  }

  function ordenarGrupos(a, b) {
    return a.ordem - b.ordem;
  }

  function emitirEvento(nome, detalhe) {
    document.dispatchEvent(new CustomEvent(nome, {
      detail: detalhe
    }));
  }

  function escaparHtml(valor) {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.PortalGeapaNavigation = {
    PERFIS: PERFIS,
    GRUPOS_MENU: GRUPOS_MENU.slice(),
    MOTIVOS_ACESSO: MOTIVOS_ACESSO,
    ROTAS_PORTAL: ROTAS_PORTAL.slice(),
    iniciar: iniciar,
    irPara: irPara,
    atualizarMenu: atualizarMenu,
    canAccessRoute: function canAccessRoute(sessao, rota) {
      return resolveRouteAccess(sessao || getSessaoAtual(), rota).ok;
    },
    resolveRouteAccess: resolveRouteAccess,
    hasPermission: hasPermission,
    hasAnyProfile: hasAnyProfile,
    getAllowedRoutes: getAllowedRoutes,
    fecharMenu: fecharMenu,
    getRotaAtual: function getRotaAtual() {
      return rotaAtual;
    },
    getRotas: function getRotas() {
      return ROTAS_PORTAL.slice();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})(window);
