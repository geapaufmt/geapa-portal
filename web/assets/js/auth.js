/**
 * Camada de perfil do Portal GEAPA.
 *
 * Estas funcoes controlam apenas a interface. Toda permissao real deve ser
 * validada novamente no Apps Script antes de qualquer acao sensivel.
 */

(function configurarAuthPortal(global) {
  var usuarioAtual = montarUsuarioPadrao();

  function montarUsuarioPadrao() {
    return {
      nomeExibicao: 'Membro GEAPA',
      perfilPrincipal: 'MEMBRO',
      perfis: ['MEMBRO'],
      cargosAtuais: [],
      permissoes: {
        podeVerAreaDiretoria: false,
        podeGerenciarAtividades: false,
        podeRegistrarChamada: false,
        podeEditarAtividade: false,
        podeAnalisarJustificativas: false,
        podeGerenciarCertificados: false,
        podeGerenciarComunicacao: false,
        podeGerenciarConfiguracoes: false
      }
    };
  }

  function setUsuarioAtual(usuario) {
    var dados = usuario || {};
    var padrao = montarUsuarioPadrao();

    usuarioAtual = {
      id: dados.id || '',
      nomeExibicao: dados.nomeExibicao || padrao.nomeExibicao,
      rga: dados.rga || '',
      perfilPrincipal: dados.perfilPrincipal || padrao.perfilPrincipal,
      perfis: Array.isArray(dados.perfis) && dados.perfis.length
        ? dados.perfis.slice()
        : padrao.perfis,
      cargosAtuais: Array.isArray(dados.cargosAtuais)
        ? dados.cargosAtuais.slice()
        : [],
      permissoes: Object.assign({}, padrao.permissoes, dados.permissoes || {})
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
    return getUsuarioAtual().perfilPrincipal || 'MEMBRO';
  }

  function hasPerfil(perfil) {
    var desejado = String(perfil || '').trim().toUpperCase();
    var perfis = getUsuarioAtual().perfis || [];

    return perfis.some(function verificarPerfil(item) {
      return String(item || '').trim().toUpperCase() === desejado;
    });
  }

  function hasPermissao(permissao) {
    var permissoes = getUsuarioAtual().permissoes || {};

    return permissoes[permissao] === true;
  }

  function isMembro() {
    return hasPerfil('MEMBRO');
  }

  function isSecretario() {
    return hasPerfil('SECRETARIA') || hasPerfil('SECRETARIO');
  }

  function isDiretoria() {
    return hasPerfil('DIRETORIA') || hasPerfil('PRESIDENCIA');
  }

  function isAdminTecnico() {
    return hasPerfil('ADMIN') ||
      hasPerfil('ADMIN_TECNICO') ||
      hasPermissao('podeGerenciarConfiguracoes');
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
    setUsuarioAtual: setUsuarioAtual,
    limparUsuarioAtual: limparUsuarioAtual,
    getUsuarioAtual: getUsuarioAtual,
    getPerfilAtual: getPerfilAtual,
    hasPerfil: hasPerfil,
    hasPermissao: hasPermissao,
    isMembro: isMembro,
    isSecretario: isSecretario,
    isDiretoria: isDiretoria,
    isAdminTecnico: isAdminTecnico,
    canViewActivityDetails: canViewActivityDetails,
    canCreateActivity: canCreateActivity,
    canEditActivity: canEditActivity,
    canRegisterAttendance: canRegisterAttendance,
    canJustifyAbsence: canJustifyAbsence
  };
})(window);
