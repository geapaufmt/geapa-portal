/** Formulario publico por token, sem expor identidade do egresso. */
(function configurarAvaliacaoEgresso(global) {
  'use strict';
  var container = function() { return document.getElementById('avaliacao-egresso-content'); };
  var esc = function(value) { return global.PortalGeapaUi ? global.PortalGeapaUi.escaparHtml(String(value == null ? '' : value)) : String(value == null ? '' : value); };
  function featureEnabled() { return !!(global.PortalGeapaConfig && global.PortalGeapaConfig.ENABLE_EGRESS_FEEDBACK === true); }
  function tokenFromHash() { var match = String(global.location.hash || '').match(/[?&]token=([^&]+)/); try { return match ? decodeURIComponent(match[1]) : ''; } catch (error) { return ''; } }
  function errorMessage(code, fallback) {
    var messages = { CONVITE_AVALIACAO_RESPONDIDO: 'Esta avaliação já foi respondida. Obrigado pela participação.', CONVITE_AVALIACAO_EXPIRADO: 'Este convite expirou.', CONVITE_AVALIACAO_INVALIDO: 'Este convite é inválido.', AVALIACAO_EGRESSO_INDISPONIVEL: 'A avaliação está indisponível neste momento.' };
    return messages[String(code || '')] || fallback || 'Não foi possível validar o convite.';
  }
  function renderForm() {
    container().innerHTML = '<div class="situation-topbar"><div><p class="eyebrow">Participação voluntária</p><h2 id="egress-feedback-title">Conte-nos sobre sua experiência no GEAPA</h2></div></div><p class="section-note">Sua resposta é voluntária e não interfere em vínculo, certificado ou qualquer direito.</p><form class="egress-feedback-form" data-egress-feedback-form><label>Nota geral de 1 a 5<select name="notaGeral" required><option value="">Selecione</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label><label>O que mais contribuiu positivamente para sua experiência?<textarea name="aspectosPositivos" rows="4" maxlength="3000"></textarea></label><label>O que poderia ter sido melhor?<textarea name="aspectosAMelhorar" rows="4" maxlength="3000"></textarea></label><label>Que sugestão você deixaria para as próximas gestões?<textarea name="sugestoes" rows="4" maxlength="3000"></textarea></label><label>Motivo complementar do desligamento (opcional)<textarea name="motivoDesligamentoComplementar" rows="3" maxlength="1500"></textarea></label><label class="profile-confirmation"><input type="checkbox" name="autorizaUsoAnonimo"> Autorizo o uso anônimo de trechos desta avaliação.</label><label>Depoimento autorizado (opcional)<textarea name="depoimentoAutorizado" rows="4" maxlength="3000"></textarea></label><p class="portal-feedback" data-egress-feedback-status hidden></p><button class="primary-button" type="submit">Enviar avaliação</button></form>';
  }
  async function load() {
    var target = container(); if (!target) return;
    if (!featureEnabled()) { target.innerHTML = '<p class="portal-feedback is-error">A avaliação está indisponível neste ambiente.</p>'; return; }
    var token = tokenFromHash(); if (!token) { target.innerHTML = '<p class="portal-feedback is-error">Este convite é inválido.</p>'; return; }
    target.innerHTML = '<p class="empty-state">Validando convite...</p>';
    var response = await global.PortalGeapaApi.apiGet('/avaliacao-egresso/consultar', { payload: JSON.stringify({ token: token }) });
    if (!response.ok) { target.innerHTML = '<p class="portal-feedback is-error">' + esc(errorMessage(response.code || response.errorCode, response.message)) + '</p>'; return; }
    renderForm();
  }
  async function submit(event) {
    event.preventDefault(); var form = event.target; var token = tokenFromHash(); var values = Object.fromEntries(new FormData(form).entries());
    var button = form.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Enviando...';
    var payload = { token: token, notaGeral: Number(values.notaGeral), aspectosPositivos: values.aspectosPositivos, aspectosAMelhorar: values.aspectosAMelhorar, sugestoes: values.sugestoes, motivoDesligamentoComplementar: values.motivoDesligamentoComplementar, autorizaUsoAnonimo: !!form.elements.autorizaUsoAnonimo.checked, depoimentoAutorizado: values.depoimentoAutorizado };
    try { var response = await global.PortalGeapaApi.apiPost('/avaliacao-egresso/responder', { payload: JSON.stringify(payload) }); if (!response.ok) throw response; container().innerHTML = '<p class="portal-feedback is-success">Obrigado por compartilhar sua experiência com o GEAPA.</p>'; }
    catch (error) { var status = form.querySelector('[data-egress-feedback-status]'); status.hidden = false; status.classList.add('is-error'); status.textContent = errorMessage(error.code || error.errorCode, error.message); button.disabled = false; button.textContent = 'Enviar avaliação'; }
  }
  document.addEventListener('portal:navigationchange', function(event) { if (event.detail && event.detail.rota && event.detail.rota.id === 'avaliacao-egresso') load(); });
  document.addEventListener('submit', function(event) { if (event.target.matches('[data-egress-feedback-form]')) submit(event); });
  if (global.__PORTAL_EGRESS_TEST__) global.__PortalEgressTestHooks = Object.freeze({ tokenFromHash: tokenFromHash, errorMessage: errorMessage, featureEnabled: featureEnabled });
})(window);
