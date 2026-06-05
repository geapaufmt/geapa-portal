/**
 * Adapter temporario de sessao do Portal GEAPA.
 *
 * Quando o GEAPA-CORE expuser um resolvedor publico de usuario atual, este
 * arquivo deve ser o ponto unico de troca. O Portal nao calcula vinculo, cargo,
 * perfil institucional nem permissoes: apenas consome o usuario ja resolvido.
 */
(function configurarPortalAuthAdapter(global) {
  var SESSION_STORAGE_KEY = 'geapaPortal.sessionToken';
  var sessaoResolvida = null;

  function getCurrentSession() {
    if (sessaoResolvida) {
      return normalizarSessaoResolvida(sessaoResolvida);
    }

    var usuario = obterUsuarioAtual();
    var autenticado = Boolean(lerTokenSessao());
    var permissoes = normalizarPermissoes(usuario.permissoes);
    var perfis = normalizarPerfis(usuario.perfis, usuario.perfilPrincipal, autenticado);

    return {
      autenticado: autenticado,
      usuarioResolvido: usuarioEstaResolvido(usuario),
      idPessoa: usuario.idPessoa || usuario.id || '',
      nomeExibicao: usuario.nomeExibicao || (autenticado ? 'Usuario GEAPA' : 'Visitante'),
      email: usuario.email || '',
      perfilPortalEfetivo: usuario.perfilPrincipal || 'VISITANTE',
      perfisPortal: perfis,
      permissoes: permissoes.lista,
      permissoesMapa: permissoes.mapa,
      portalAtivo: autenticado ? usuario.portalAtivo !== false : true,
      tipoVinculoAtual: usuario.tipoVinculoAtual || '',
      statusVinculoAtual: usuario.statusVinculoAtual || '',
      cargoFuncaoAtual: usuario.cargoFuncaoAtual || '',
      cargosAtuais: Array.isArray(usuario.cargosAtuais) ? usuario.cargosAtuais.slice() : []
    };
  }

  function setResolvedSession(sessao) {
    sessaoResolvida = sessao || null;
  }

  function clearResolvedSession() {
    sessaoResolvida = null;
  }

  function normalizarSessaoResolvida(sessao) {
    var dados = sessao || {};
    var ok = dados.ok !== false;
    var autenticado = ok && dados.autenticado !== false && Boolean(lerTokenSessao());
    var perfilPrincipal = dados.perfilPortalEfetivo || dados.perfilPrincipal || dados.perfilPortal || '';
    var permissoes = normalizarPermissoes(dados.permissoes || dados.permissoesEfetivas);

    return {
      autenticado: autenticado,
      usuarioResolvido: ok,
      idPessoa: dados.idPessoa || dados.id || '',
      nomeExibicao: dados.nomeExibicao || (autenticado ? 'Usuario GEAPA' : 'Visitante'),
      email: dados.email || '',
      perfilPortalEfetivo: perfilPrincipal || 'VISITANTE',
      perfisPortal: normalizarPerfis(dados.perfisPortal || dados.perfis, perfilPrincipal, autenticado),
      permissoes: permissoes.lista,
      permissoesMapa: permissoes.mapa,
      portalAtivo: autenticado ? dados.portalAtivo !== false : false,
      tipoVinculoAtual: dados.tipoVinculoAtual || '',
      statusVinculoAtual: dados.statusVinculoAtual || '',
      cargoFuncaoAtual: dados.cargoFuncaoAtual || '',
      cargosAtuais: Array.isArray(dados.cargosAtuais) ? dados.cargosAtuais.slice() : []
    };
  }

  function obterUsuarioAtual() {
    var auth = global.PortalGeapaAuth;

    if (auth && typeof auth.getUsuarioAtual === 'function') {
      return auth.getUsuarioAtual() || {};
    }

    return {};
  }

  function usuarioEstaResolvido(usuario) {
    if (!usuario) {
      return false;
    }

    return Boolean(
      usuario.id ||
      usuario.idPessoa ||
      usuario.rga ||
      usuario.email ||
      (usuario.nomeExibicao && usuario.nomeExibicao !== 'Visitante')
    );
  }

  function lerTokenSessao() {
    try {
      return global.sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
    } catch (erro) {
      return '';
    }
  }

  function normalizarPerfis(perfis, perfilPrincipal, autenticado) {
    var saida = [];

    if (Array.isArray(perfis)) {
      perfis.forEach(function guardarPerfil(perfil) {
        var normalizado = String(perfil || '').trim().toUpperCase();

        if (normalizado && saida.indexOf(normalizado) < 0) {
          saida.push(normalizado);
        }
      });
    }

    if (perfilPrincipal) {
      var principal = String(perfilPrincipal).trim().toUpperCase();

      if (principal && saida.indexOf(principal) < 0) {
        saida.push(principal);
      }
    }

    if (!saida.length) {
      saida.push('VISITANTE');
    }

    return saida;
  }

  function normalizarPermissoes(permissoes) {
    var mapa = {};

    if (Array.isArray(permissoes)) {
      permissoes.forEach(function guardarPermissao(permissao) {
        if (permissao) {
          mapa[String(permissao).trim()] = true;
        }
      });
    } else {
      Object.keys(permissoes || {}).forEach(function copiarPermissao(chave) {
        if (permissoes[chave] === true) {
          mapa[chave] = true;
        }
      });
    }

    return {
      lista: Object.keys(mapa),
      mapa: mapa
    };
  }

  global.PortalGeapaAuthAdapter = {
    getCurrentSession: getCurrentSession,
    setResolvedSession: setResolvedSession,
    clearResolvedSession: clearResolvedSession
  };
})(window);
