/**
 * Camada de perfil do Portal GEAPA.
 *
 * Estas funcoes controlam apenas a interface. Toda permissao real deve ser
 * validada novamente no Apps Script antes de qualquer acao sensivel.
 */

(function configurarAuthPortal(global) {
  var PERFIS_PORTAL = {
    VISITANTE: 'VISITANTE',
    PARTICIPANTE_EXTERNO: 'PARTICIPANTE_EXTERNO',
    EXTERNO: 'EXTERNO',
    COLABORADOR: 'COLABORADOR',
    EGRESSO: 'EGRESSO',
    MEMBRO: 'MEMBRO',
    DIRETORIA: 'DIRETORIA',
    SECRETARIA: 'SECRETARIA',
    COMUNICACAO: 'COMUNICACAO',
    CONSELHO: 'CONSELHO',
    ADMIN: 'ADMIN'
  };
  var PERFIS_SUPORTADOS = [
    PERFIS_PORTAL.VISITANTE,
    PERFIS_PORTAL.PARTICIPANTE_EXTERNO,
    PERFIS_PORTAL.EXTERNO,
    PERFIS_PORTAL.COLABORADOR,
    PERFIS_PORTAL.EGRESSO,
    PERFIS_PORTAL.MEMBRO,
    PERFIS_PORTAL.DIRETORIA,
    'PRESIDENCIA',
    PERFIS_PORTAL.SECRETARIA,
    'SECRETARIO',
    PERFIS_PORTAL.COMUNICACAO,
    PERFIS_PORTAL.CONSELHO,
    'ASSESSORIA',
    PERFIS_PORTAL.ADMIN,
    'ADMIN_TECNICO'
  ];
  var PERMISSOES_PADRAO = {
    podeVerAreaDiretoria: false,
    podeGerenciarAtividades: false,
    podeRegistrarChamada: false,
    podeEditarAtividade: false,
    podeAnalisarJustificativas: false,
    podeGerenciarCertificados: false,
    podeGerenciarComunicacao: false,
    podeGerenciarConfiguracoes: false
  };
  var usuarioAtual = montarUsuarioPadrao();

  function montarUsuarioPadrao() {
    return {
      nomeExibicao: 'Visitante',
      perfilPrincipal: PERFIS_PORTAL.VISITANTE,
      perfis: [PERFIS_PORTAL.VISITANTE],
      cargosAtuais: [],
      portalAtivo: false,
      permissoes: Object.assign({}, PERMISSOES_PADRAO)
    };
  }

  function setUsuarioAtual(usuario) {
    var dados = usuario || {};
    var padrao = montarUsuarioPadrao();
    var perfisNormalizados = Array.isArray(dados.perfis) && dados.perfis.length
      ? removerDuplicados(dados.perfis.map(normalizarPerfilPortal))
      : padrao.perfis;

    usuarioAtual = {
      id: dados.id || '',
      idPessoa: dados.idPessoa || dados.id || '',
      nomeExibicao: dados.nomeExibicao || padrao.nomeExibicao,
      email: dados.email || '',
      rga: dados.rga || '',
      perfilPrincipal: normalizarPerfilPortal(dados.perfilPrincipal || perfisNormalizados[0] || padrao.perfilPrincipal),
      perfis: perfisNormalizados,
      cargosAtuais: Array.isArray(dados.cargosAtuais)
        ? dados.cargosAtuais.slice()
        : [],
      portalAtivo: dados.portalAtivo !== false,
      tipoVinculoAtual: dados.tipoVinculoAtual || '',
      statusVinculoAtual: dados.statusVinculoAtual || '',
      cargoFuncaoAtual: dados.cargoFuncaoAtual || '',
      permissoes: normalizarPermissoesUsuario(dados.permissoes)
    };

    return usuarioAtual;
  }

  function limparUsuarioAtual() {
    usuarioAtual = montarUsuarioPadrao();
  }

  function getUsuarioAtual() {
    return usuarioAtual;
  }

  function getPerfilAtual() {
    return getUsuarioAtual().perfilPrincipal || PERFIS_PORTAL.VISITANTE;
  }

  function normalizarPerfilPortal(perfil) {
    var normalizado = String(perfil || PERFIS_PORTAL.VISITANTE).trim().toUpperCase();

    return PERFIS_SUPORTADOS.indexOf(normalizado) >= 0
      ? normalizado
      : PERFIS_PORTAL.VISITANTE;
  }

  function removerDuplicados(valores) {
    var vistos = {};
    var saida = [];

    valores.forEach(function guardar(valor) {
      var normalizado = normalizarPerfilPortal(valor);

      if (!normalizado || vistos[normalizado]) {
        return;
      }

      vistos[normalizado] = true;
      saida.push(normalizado);
    });

    return saida.length ? saida : [PERFIS_PORTAL.VISITANTE];
  }

  function hasPerfil(perfil) {
    var desejado = String(perfil || '').trim().toUpperCase();
    var perfis = getUsuarioAtual().perfis || [];

    if (!desejado || PERFIS_SUPORTADOS.indexOf(desejado) < 0) {
      return false;
    }

    return perfis.some(function verificarPerfil(item) {
      return String(item || '').trim().toUpperCase() === desejado;
    });
  }

  function hasPermissao(permissao) {
    var permissoes = getUsuarioAtual().permissoes || {};

    return permissoes[permissao] === true;
  }

  function normalizarPermissoesUsuario(permissoes) {
    var normalizadas = Object.assign({}, PERMISSOES_PADRAO);

    if (Array.isArray(permissoes)) {
      permissoes.forEach(function guardarPermissao(permissao) {
        if (permissao) {
          normalizadas[String(permissao).trim()] = true;
        }
      });

      return normalizadas;
    }

    Object.keys(permissoes || {}).forEach(function copiarPermissao(chave) {
      normalizadas[chave] = permissoes[chave] === true;
    });

    return normalizadas;
  }

  function isMembro() {
    return hasPerfil(PERFIS_PORTAL.MEMBRO);
  }

  function isVisitante() {
    return hasPerfil(PERFIS_PORTAL.VISITANTE);
  }

  function isParticipanteExterno() {
    return hasPerfil(PERFIS_PORTAL.PARTICIPANTE_EXTERNO);
  }

  function isSecretario() {
    return hasPerfil('SECRETARIA') || hasPerfil('SECRETARIO');
  }

  function isDiretoria() {
    return hasPerfil('DIRETORIA') || hasPerfil('PRESIDENCIA');
  }

  function isAdminTecnico() {
    return hasPerfil(PERFIS_PORTAL.ADMIN) ||
      hasPerfil('ADMIN_TECNICO') ||
      hasPermissao('podeGerenciarConfiguracoes');
  }

  function isAdmin() {
    return isAdminTecnico();
  }

  function canViewActivityDetails(atividade) {
    return Boolean(atividade && atividade.podeVerDetalhes);
  }

  function canCreateActivity() {
    return hasPermissao('podeGerenciarAtividades') ||
      isSecretario() ||
      isDiretoria() ||
      isAdminTecnico();
  }

  function canEditActivity(atividade) {
    return Boolean(atividade && atividade.podeEditar) &&
      (hasPermissao('podeEditarAtividade') || isSecretario() || isDiretoria() || isAdminTecnico());
  }

  function canRegisterAttendance(atividade) {
    var usuarioPodeRegistrar = hasPermissao('podeRegistrarChamada') ||
      hasPermissao('podeGerenciarAtividades') ||
      isSecretario() ||
      isDiretoria() ||
      isAdminTecnico();
    var atividadeAceitaChamada = Boolean(
      atividade &&
      (
        atividade.podeRegistrarChamada ||
        atividade.contaPresenca ||
        atividade.contaFalta
      )
    );

    return usuarioPodeRegistrar && atividadeAceitaChamada;
  }

  function canJustifyAbsence(atividade) {
    return Boolean(atividade && atividade.podeJustificarFalta) && isMembro();
  }

  global.PortalGeapaAuth = {
    PERFIS_PORTAL: PERFIS_PORTAL,
    normalizarPerfilPortal: normalizarPerfilPortal,
    setUsuarioAtual: setUsuarioAtual,
    limparUsuarioAtual: limparUsuarioAtual,
    getUsuarioAtual: getUsuarioAtual,
    getPerfilAtual: getPerfilAtual,
    hasPerfil: hasPerfil,
    hasPermissao: hasPermissao,
    isVisitante: isVisitante,
    isParticipanteExterno: isParticipanteExterno,
    isMembro: isMembro,
    isSecretario: isSecretario,
    isDiretoria: isDiretoria,
    isAdmin: isAdmin,
    isAdminTecnico: isAdminTecnico,
    canViewActivityDetails: canViewActivityDetails,
    canCreateActivity: canCreateActivity,
    canEditActivity: canEditActivity,
    canRegisterAttendance: canRegisterAttendance,
    canJustifyAbsence: canJustifyAbsence
  };
})(window);
