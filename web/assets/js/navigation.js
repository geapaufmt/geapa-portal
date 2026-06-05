/**
 * Navegacao centralizada e politica visual de rotas do Portal GEAPA.
 *
 * Esta camada apenas consome perfil/permissoes vindos da sessao resolvida pelo
 * GEAPA-CORE. O Portal nao calcula cargo, vinculo, perfil institucional ou
 * permissao administrativa.
 */
(function configurarNavegacaoPortal(global) {
  var MODELO = global.PortalGeapaModel || {};
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
  var PUBLICO = [];
  var OPERACIONAIS = [PERFIS.ADMIN, PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.COMUNICACAO];
  var LOGADOS = TODOS_PERFIS;
  var GRUPOS_MENU = [
    { id: 'publico', label: 'Área Pública', ordem: 10, abertoPadrao: false },
    { id: 'meu-vinculo', label: 'Meu Vínculo', ordem: 20, abertoPadrao: false },
    { id: 'agenda', label: 'Atividades e Apresentações', ordem: 30, abertoPadrao: false },
    { id: 'gestao-geapa', label: 'Gestão do GEAPA', ordem: 40, abertoPadrao: false }
  ];
  var MOTIVOS_ACESSO = {
    NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
    PORTAL_INATIVO: 'PORTAL_INATIVO',
    PERFIL_NAO_AUTORIZADO: 'PERFIL_NAO_AUTORIZADO',
    PERMISSAO_INSUFICIENTE: 'PERMISSAO_INSUFICIENTE',
    ROTA_INEXISTENTE: 'ROTA_INEXISTENTE'
  };
  var ROTAS_PORTAL = [
    rota('inicio', 'Início', 'inicio', 'publico', 10, 'tela-inicio', 'view-inicio', false, PUBLICO, [], 'Home pública do Portal GEAPA.', 'implementado'),
    rota('sobre', 'Sobre o GEAPA', 'sobre', 'publico', 20, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Apresentação institucional pública do GEAPA.', 'placeholder'),
    rota('historia', 'História', 'historia', 'publico', 30, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Histórico público do grupo e marcos institucionais.', 'placeholder'),
    rota('diretoria-publica', 'Diretoria', 'diretoria', 'publico', 40, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Composição pública da diretoria, sem dados privados.', 'placeholder'),
    rota('normas', 'Normas', 'normas', 'publico', 50, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Normas públicas e documentos orientativos do GEAPA.', 'placeholder'),
    rota('parceiros', 'Parceiros', 'parceiros', 'publico', 60, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Instituições e parceiros públicos do GEAPA.', 'placeholder'),
    rota('atividades-abertas', 'Atividades abertas', 'atividades', 'publico', 70, 'tela-atividades', 'view-atividades', false, PUBLICO, [], 'Atividades abertas ao público ou permitidas conforme contexto.', 'implementado'),
    rota('apresentacoes-publicas', 'Apresentações públicas', 'apresentacoes', 'publico', 80, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Apresentações públicas e histórico liberado.', 'placeholder'),
    rota('processo-seletivo', 'Processo seletivo', 'processo-seletivo', 'publico', 90, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Informações públicas sobre ingresso e processo seletivo.', 'placeholder'),
    rota('contato', 'Contato', 'contato', 'publico', 100, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Canais públicos de contato do GEAPA.', 'placeholder'),
    rota('login', 'Entrar', 'login', 'publico', 110, 'tela-acesso', 'view-login', false, PUBLICO, [], 'Entrada por Google ou código temporário.', 'implementado', false),
    rota('interesse', 'Tenho interesse', 'interesse', 'publico', 120, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Formulário futuro para cadastro de interesse sem conceder acesso interno automaticamente.', 'placeholder'),

    rota('app', 'Resumo do vínculo', 'app', 'meu-vinculo', 10, 'tela-placeholder', 'view-placeholder', true, LOGADOS, ['portal:acessar'], 'Resumo personalizado do vínculo da pessoa com o GEAPA.', 'placeholder'),
    rota('meu-cadastro', 'Meu cadastro', 'app/meu-cadastro', 'meu-vinculo', 20, 'tela-placeholder', 'view-placeholder', true, LOGADOS, ['cadastro:ver_proprio'], 'Dados cadastrais próprios e classificação de vínculo.', 'placeholder'),
    rota('minha-situacao', 'Minha situação', 'app/minha-situacao', 'meu-vinculo', 30, 'tela-situacao', 'view-situacao', true, [PERFIS.MEMBRO, PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.COMUNICACAO, PERFIS.CONSELHO, PERFIS.ADMIN], ['situacao:ver_propria'], 'Tela individual do usuário logado.', 'implementado'),
    rota('frequencia', 'Minha frequência', 'app/frequencia', 'meu-vinculo', 40, 'tela-placeholder', 'view-placeholder', true, [PERFIS.MEMBRO, PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.ADMIN], ['situacao:ver_propria', 'presencas:ler'], 'Frequência própria de membro efetivo ou acesso operacional permitido.', 'placeholder'),
    rota('justificativas', 'Minhas justificativas', 'app/justificativas', 'meu-vinculo', 50, 'tela-placeholder', 'view-placeholder', true, [PERFIS.MEMBRO, PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.ADMIN], ['justificativas:ver_proprias'], 'Justificativas próprias de faltas quando aplicável ao vínculo.', 'placeholder'),
    rota('minhas-apresentacoes', 'Minhas apresentações', 'app/minhas-apresentacoes', 'meu-vinculo', 60, 'tela-placeholder', 'view-placeholder', true, [PERFIS.MEMBRO, PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.COMUNICACAO, PERFIS.CONSELHO, PERFIS.EGRESSO, PERFIS.ADMIN], ['apresentacoes:ver_propria', 'apresentacoes:ver_ate_saida'], 'Apresentações próprias ou histórico permitido pelo backend.', 'placeholder'),
    rota('certificados', 'Meus certificados', 'app/certificados', 'meu-vinculo', 70, 'tela-placeholder', 'view-placeholder', true, LOGADOS, ['certificados:ver_proprios'], 'Certificados próprios emitidos ou liberados.', 'placeholder'),
    rota('inscricoes', 'Minhas inscrições', 'app/inscricoes', 'meu-vinculo', 80, 'tela-placeholder', 'view-placeholder', true, LOGADOS, ['inscricoes:ver_proprias'], 'Inscrições próprias em atividades e processo seletivo.', 'placeholder'),
    rota('participacoes', 'Minhas participações', 'app/participacoes', 'meu-vinculo', 90, 'tela-placeholder', 'view-placeholder', true, LOGADOS, ['participacoes:ver_proprias'], 'Participações próprias em atividades permitidas.', 'placeholder'),
    rota('preferencias', 'Preferências de comunicação', 'app/preferencias', 'meu-vinculo', 100, 'tela-placeholder', 'view-placeholder', true, LOGADOS, ['comunicacoes:preferencias_proprias'], 'Preferências de comunicação e consentimentos.', 'placeholder'),

    rota('agenda', 'Próximas atividades', 'agenda', 'agenda', 10, 'tela-atividades', 'view-atividades', false, PUBLICO, [], 'Agenda permitida ao público ou ao usuário logado.', 'implementado'),
    rota('agenda-atividades', 'Calendário', 'agenda/atividades', 'agenda', 20, 'tela-atividades', 'view-atividades', false, PUBLICO, [], 'Calendário de atividades abertas, internas ou permitidas.', 'implementado'),
    rota('atividades-internas', 'Atividades internas', 'agenda/internas', 'agenda', 30, 'tela-placeholder', 'view-placeholder', true, [PERFIS.MEMBRO, PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.COMUNICACAO, PERFIS.ADMIN], ['atividades:ver_internas'], 'Atividades internas liberadas a membros e perfis autorizados.', 'placeholder'),
    rota('agenda-apresentacoes', 'Próximas apresentações', 'agenda/apresentacoes', 'agenda', 40, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Próximas apresentações públicas ou permitidas.', 'placeholder'),
    rota('historico-apresentacoes', 'Histórico de apresentações', 'agenda/historico', 'agenda', 50, 'tela-placeholder', 'view-placeholder', false, PUBLICO, [], 'Histórico público ou permitido de apresentações.', 'placeholder'),
    rota('materiais', 'Materiais disponíveis', 'agenda/materiais', 'agenda', 60, 'tela-placeholder', 'view-placeholder', true, LOGADOS, ['materiais:ver_liberados'], 'Materiais liberados conforme vínculo, inscrição ou participação.', 'placeholder'),

    rota('admin', 'Painel administrativo', 'admin', 'gestao-geapa', 10, 'tela-placeholder', 'view-placeholder', true, OPERACIONAIS, ['gestao:acessar'], 'Painel operacional conforme perfil e permissões.', 'placeholder'),
    rota('admin-membros', 'Membros', 'admin/membros', 'gestao-geapa', 20, 'tela-placeholder', 'view-placeholder', true, [PERFIS.SECRETARIA, PERFIS.DIRETORIA, PERFIS.ADMIN], ['membros:ler'], 'Consulta e operação cotidiana de membros autorizada pelo backend.', 'placeholder'),
    rota('admin-atividades', 'Atividades', 'admin/atividades', 'gestao-geapa', 30, 'tela-placeholder', 'view-placeholder', true, OPERACIONAIS, ['atividades:gerir'], 'Criação, edição e operação de atividades.', 'placeholder'),
    rota('admin-chamadas', 'Chamadas', 'admin/chamadas', 'gestao-geapa', 40, 'tela-placeholder', 'view-placeholder', true, [PERFIS.SECRETARIA, PERFIS.DIRETORIA, PERFIS.ADMIN], ['presencas:gerir'], 'Registro e acompanhamento de chamadas/presenças.', 'placeholder'),
    rota('admin-justificativas', 'Justificativas', 'admin/justificativas', 'gestao-geapa', 50, 'tela-placeholder', 'view-placeholder', true, [PERFIS.SECRETARIA, PERFIS.DIRETORIA, PERFIS.ADMIN], ['justificativas:analisar'], 'Análise operacional e decisão de justificativas conforme permissão.', 'placeholder'),
    rota('admin-apresentacoes', 'Apresentações', 'admin/apresentacoes', 'gestao-geapa', 60, 'tela-placeholder', 'view-placeholder', true, [PERFIS.SECRETARIA, PERFIS.DIRETORIA, PERFIS.ADMIN], ['apresentacoes:gerir'], 'Gestão operacional de apresentações e materiais.', 'placeholder'),
    rota('admin-comunicacao', 'Comunicação', 'admin/comunicacao', 'gestao-geapa', 70, 'tela-placeholder', 'view-placeholder', true, [PERFIS.COMUNICACAO, PERFIS.DIRETORIA, PERFIS.ADMIN], ['comunicacoes:gerir', 'mensageria:ler'], 'Conteúdo público, divulgação e materiais de comunicação.', 'placeholder'),
    rota('admin-processo-seletivo', 'Processo seletivo', 'admin/processo-seletivo', 'gestao-geapa', 80, 'tela-placeholder', 'view-placeholder', true, [PERFIS.DIRETORIA, PERFIS.SECRETARIA, PERFIS.ADMIN], ['processo_seletivo:gerir'], 'Gestão de processo seletivo e classificações autorizadas.', 'placeholder'),
    rota('admin-normas-parametros', 'Normas e parâmetros', 'admin/normas-parametros', 'gestao-geapa', 90, 'tela-placeholder', 'view-placeholder', true, [PERFIS.DIRETORIA, PERFIS.ADMIN], ['parametros:gerir'], 'Normas e parâmetros operacionais sujeitos à autorização.', 'placeholder'),
    rota('admin-configuracoes', 'Configurações', 'admin/configuracoes', 'gestao-geapa', 100, 'tela-placeholder', 'view-placeholder', true, [PERFIS.ADMIN], ['sistema:admin'], 'Configurações técnicas, integrações, usuários, segurança e logs.', 'placeholder')
  ];
  var ALIASES_ROTAS = {
    situacao: 'minha-situacao',
    'minha_situacao': 'minha-situacao',
    apresentacoes: 'apresentacoes-publicas',
    atividades: 'atividades-abertas',
    gestao: 'admin',
    diretoria: 'diretoria-publica',
    administracao: 'admin-configuracoes',
    logs: 'admin-configuracoes'
  };
  var rotaAtual = 'inicio';
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
    if (!obterRotaPorHash()) {
      irPara('inicio', { atualizarHash: false, origem: 'inicial' });
    }
    atualizarMenu();
  }

  function rota(id, label, path, grupoMenu, ordem, sectionId, viewClass, requerLogin, perfisPermitidos, permissoesNecessarias, descricao, status, mostrarNoMenu) {
    return {
      id: id,
      label: label,
      path: path,
      viewClass: viewClass,
      sectionId: sectionId,
      grupoMenu: grupoMenu,
      perfisPermitidos: perfisPermitidos || [],
      permissoesNecessarias: permissoesNecessarias || [],
      requerLogin: requerLogin === true,
      mostrarNoMenu: mostrarNoMenu !== false,
      ordem: ordem,
      descricao: descricao || '',
      status: status || 'placeholder'
    };
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

    document.addEventListener('click', function alternarGrupoMenu(evento) {
      var resumo = evento.target.closest('[data-nav-group-toggle]');
      var grupo;

      if (!resumo) {
        return;
      }

      grupo = resumo.closest('.nav-group');
      if (!grupo) {
        return;
      }

      evento.preventDefault();
      alternarGrupoNavegacao(grupo, resumo);
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

    if (!acesso.ok && acesso.reason === MOTIVOS_ACESSO.PORTAL_INATIVO && rota.id !== 'inicio') {
      rota = resolverRota('inicio');
      acesso = resolveRouteAccess(sessao, rota);
      detalhes = Object.assign({}, detalhes, {
        atualizarHash: true,
        motivo: 'portal-inativo-redirecionado',
        substituirHash: true
      });
    }

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

    if (rota.requerLogin && sessao.autenticado && sessao.portalAtivo === false) {
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
      return !rota.requerLogin ||
        !ehVisitanteTecnico(sessao) ||
        permiteFallbackVisitanteTecnico(rota);
    }

    if (!sessao.permissoes.some(ehPermissaoCanonica)) {
      return true;
    }

    return necessarias.some(function verificarPermissao(permissao) {
      return hasPermission(sessao, permissao);
    });
  }

  function ehVisitanteTecnico(sessao) {
    var perfis = sessao && Array.isArray(sessao.perfisPortal)
      ? sessao.perfisPortal
      : [];

    return sessao &&
      sessao.autenticado === true &&
      perfis.indexOf(PERFIS.VISITANTE) >= 0 &&
      perfis.length === 1;
  }

  function permiteFallbackVisitanteTecnico(rota) {
    return [
      'app',
      'meu-cadastro',
      'inscricoes',
      'preferencias'
    ].indexOf(rota.id) >= 0;
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
    var botaoSair = document.getElementById('sair');
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
        '<section class="nav-group',
        grupo.abertoPadrao === false ? '' : ' is-open',
        '">',
        '<button class="nav-group-title" type="button" data-nav-group-toggle aria-expanded="',
        grupo.abertoPadrao === false ? 'false' : 'true',
        '">',
        '<span>' + escaparHtml(grupo.label) + '</span>',
        '<span class="nav-group-arrow" aria-hidden="true">&#9662;</span>',
        '</button>',
        '<div class="nav-group-panel">',
        '<div class="nav-group-items">',
        rotasDoGrupo.map(montarBotaoMenu).join(''),
        '</div>',
        '</div>',
        '</section>'
      ].join('');
    }).join('');

    if (!nav) {
      return;
    }

    nav.innerHTML = gruposHtml || '<p class="nav-empty">Nenhuma área disponível.</p>';
    if (botaoSair) {
      botaoSair.hidden = !sessao.autenticado;
    }
    atualizarAcoesCabecalho(sessao);
    destacarRotaAtual();
  }

  function alternarGrupoNavegacao(grupo, resumo) {
    var aberto = !grupo.classList.contains('is-open');

    grupo.classList.toggle('is-open', aberto);
    resumo.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  }

  function atualizarAcoesCabecalho(sessao) {
    var acoes = document.querySelector('.header-session');

    if (!acoes) {
      return;
    }

    acoes.hidden = Boolean(sessao && sessao.autenticado);
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
    var conteudo;

    if (!container) {
      return;
    }

    conteudo = [
      '<p class="eyebrow">',
      escaparHtml(obterLabelGrupo(rota.grupoMenu)),
      '</p>',
      '<h2>',
      escaparHtml(rota.label),
      '</h2>',
      '<p class="intro">',
      escaparHtml(rota.descricao),
      '</p>'
    ];

    if (deveMostrarPoliticaVisual()) {
      conteudo = conteudo.concat([
        '<div class="route-policy-card">',
        '<h3>Política visual desta rota</h3>',
        '<dl class="route-policy-list">',
        montarLinhaPolitica('Status', rota.status === 'placeholder' ? 'Tela futura / placeholder' : rota.status),
        montarLinhaPolitica('Perfil atual', sessao.perfilPortalEfetivo || 'VISITANTE'),
        montarLinhaPolitica('Perfis permitidos', (rota.perfisPermitidos || []).join(', ')),
        montarLinhaPolitica('Permissões da rota', (rota.permissoesNecessarias || []).join(', ') || 'Nenhuma'),
        '</dl>',
        '</div>'
      ]);
    }

    container.innerHTML = conteudo.join('');
  }

  function deveMostrarPoliticaVisual() {
    var config = global.PortalGeapaConfig || {};

    return config.SHOW_ROUTE_POLICY === true || config.ROUTE_DEBUG === true;
  }

  function renderAccessDenied(rota, reason) {
    var container = document.getElementById('access-denied-content');
    var mensagem = obterMensagemAcessoNegado(reason);
    var destino = reason === MOTIVOS_ACESSO.NOT_AUTHENTICATED ? 'login' : 'inicio';
    var rotuloBotao = reason === MOTIVOS_ACESSO.NOT_AUTHENTICATED ? 'Voltar para o login' : 'Ir para o início';

    if (!container) {
      return;
    }

    container.innerHTML = [
      '<p class="eyebrow">Acesso restrito</p>',
      '<h2>',
      escaparHtml(rota.label || 'Rota indisponível'),
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
      return 'Faça login para acessar esta área.';
    }

    if (reason === MOTIVOS_ACESSO.PORTAL_INATIVO) {
      return 'Seu acesso ao Portal GEAPA está inativo no momento.';
    }

    if (reason === MOTIVOS_ACESSO.PERMISSAO_INSUFICIENTE) {
      return 'Seu perfil atual não possui permissão para acessar esta área.';
    }

    if (reason === MOTIVOS_ACESSO.ROTA_INEXISTENTE) {
      return 'Área indisponível no Portal GEAPA.';
    }

    return 'Seu perfil atual não possui acesso a esta área.';
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
      if (opcoes && opcoes.substituirHash === true && global.history && typeof global.history.replaceState === 'function') {
        global.history.replaceState(null, '', global.location.pathname + global.location.search + novoHash);
        return;
      }

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
      escaparHtml(valor || 'Não informado'),
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
