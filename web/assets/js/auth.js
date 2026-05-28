/**
 * Camada simulada de perfil do Portal GEAPA.
 *
 * Estas funcoes controlam apenas a interface em MOCK_MODE. Toda permissao real
 * devera ser validada novamente no Apps Script.
 */

(function configurarAuthPortal(global) {
  function getUsuarioAtual() {
    return {
      nomeExibicao: 'Membro GEAPA',
      perfil: 'MEMBRO'
    };
  }

  function getPerfilAtual() {
    return getUsuarioAtual().perfil;
  }

  function isMembro() {
    return getPerfilAtual() === 'MEMBRO';
  }

  function isSecretario() {
    return getPerfilAtual() === 'SECRETARIO';
  }

  function isDiretoria() {
    return getPerfilAtual() === 'DIRETORIA';
  }

  function isAdminTecnico() {
    return getPerfilAtual() === 'ADMIN_TECNICO';
  }

  function canViewActivityDetails(atividade) {
    return Boolean(atividade && atividade.podeVerDetalhes);
  }

  function canCreateActivity() {
    return isSecretario() || isDiretoria() || isAdminTecnico();
  }

  function canEditActivity(atividade) {
    return Boolean(atividade && atividade.podeEditar) &&
      (isSecretario() || isDiretoria() || isAdminTecnico());
  }

  function canRegisterAttendance(atividade) {
    return Boolean(atividade && atividade.podeRegistrarChamada) &&
      (isSecretario() || isDiretoria() || isAdminTecnico());
  }

  function canJustifyAbsence(atividade) {
    return Boolean(atividade && atividade.podeJustificarFalta) && isMembro();
  }

  global.PortalGeapaAuth = {
    getUsuarioAtual: getUsuarioAtual,
    getPerfilAtual: getPerfilAtual,
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
