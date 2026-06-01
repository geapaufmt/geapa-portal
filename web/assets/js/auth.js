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
    MEMBRO: 'MEMBRO',
    DIRETORIA: 'DIRETORIA',
    ADMIN: 'ADMIN'
  };
  var PERFIS_SUPORTADOS = [
    PERFIS_PORTAL.VISITANTE,
    PERFIS_PORTAL.PARTICIPANTE_EXTERNO,
    PERFIS_PORTAL.MEMBRO,
    PERFIS_PORTAL.DIRETORIA,
    'PRESIDENCIA',
    'SECRETARIA',
    'SECRETARIO',
    'COMUNICACAO',
    'CONSELHO',
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
      nomeExibicao: dados.nomeExibicao || padrao.nomeExibicao,
      rga: dados.rga || '',
      perfilPrincipal: normalizarPerfilPortal(dados.perfilPrincipal || perfisNormalizados[0] || padrao.perfilPrincipal),
      perfis: perfisNormalizados,
      cargosAtuais: Array.isArray(dados.cargosAtuais)
        ? dados.cargosAtuais.slice()
        : [],
      permissoes: Object.assign({}, PERMISSOES_PADRAO, dados.permissoes || {})
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
