/** Admissao administrativa de membro ingressante cujo seletivo ja foi aprovado. */
(function configurarCadastroMembros(global) {
  'use strict';
  var api = global.PortalGeapaApi; var ui = global.PortalGeapaUi; var busy = false; var invitations = []; var invitationCursor = null; var mode = "registration"; var viewEpoch = 0; var refreshInvitationsWhenReady = false;

  function enabled() {
    return !!(global.PortalGeapaConfig && global.PortalGeapaConfig.ENABLE_MEMBER_REGISTRATION === true &&
      global.PortalGeapaAuth && global.PortalGeapaAuth.hasPermissao('membros:cadastrar_novos_membros'));
  }

  function canSeeInvitations(){return enabled()||global.PortalGeapaConfig?.ENABLE_MEMBER_REGISTRATION===true&&global.PortalGeapaAuth?.hasPermissao('membros:supervisionar_ingressos');}
  function renderAction() {
    return (enabled() ? '<button class="primary-button compact-button" type="button" data-member-registration-open>Cadastrar membro aprovado</button>' : '')+(canSeeInvitations()?'<button class="secondary-button compact-button" type="button" data-member-invitations-open>Convites de ingresso</button>' : '');
  }

  function esc(value) { return ui.escaparHtml(String(value == null ? '' : value)); }
  function modal() { return document.getElementById('member-registration-modal'); }

  function ensureModal() {
    if (modal()) return modal();
    var node = document.createElement('div'); node.id = 'member-registration-modal'; node.className = 'modal-backdrop member-registration-modal'; node.hidden = true;
    node.innerHTML = '<section class="modal-panel member-registration-card" role="dialog" aria-modal="true" aria-labelledby="member-registration-title"><header class="modal-topbar"><div><p class="eyebrow">Processo seletivo ja aprovado</p><h2 id="member-registration-title">Cadastrar membro aprovado</h2></div><button type="button" class="icon-button" data-member-registration-close aria-label="Fechar">&times;</button></header><div data-member-registration-content></div></section>';
    node.setAttribute('data-geapa-protect-draft','');document.body.appendChild(node); return node;
  }

  function open() {
    if (busy) return;
    if (!enabled()) return toast('error', 'O cadastro de membros nao esta disponivel para esta sessao.');
    mode='registration';var epoch=++viewEpoch;var node = ensureModal();node.querySelector('#member-registration-title').textContent='Cadastrar membro aprovado'; show(node);
    renderForm();
  }

  function show(node){if(mode==='registration')node.setAttribute('data-geapa-protect-draft','');else node.removeAttribute('data-geapa-protect-draft');node.removeAttribute('data-geapa-dirty');global.PortalDesign.openDetailDialog(node,function(){viewEpoch++;invitations=[];invitationCursor=null;node.querySelector('[data-member-registration-content]').replaceChildren();});}
  function close() { if (busy) return; global.PortalDesign.closeDetailDialog(modal()); }
  function openInvitations(more) {
    if (!canSeeInvitations() || busy) return;
    mode='invitations';var epoch=++viewEpoch;
    var node = ensureModal(); show(node);
    node.querySelector('#member-registration-title').textContent = 'Convites de ingresso';
    if (!more) { invitations = []; invitationCursor = null; }
    renderLoading();
    api.apiGet('/admin/ingressos-membros', invitationCursor ? {cursor:invitationCursor} : {}).then(function(response) {
      if (!response || response.ok !== true) throw response || new Error('Não foi possível consultar os convites.');
      if(epoch!==viewEpoch||!canSeeInvitations())return;invitations = invitations.concat(response.data.items || []); invitationCursor = response.data.nextCursor;
      var ds=global.PortalDesign,labels=global.PortalMemberDesign.invitationLabels;
      var filters='<label>Status<select data-geapa-collection-filter><option value="">Todos</option>'+Object.entries(labels).map(function(v){return '<option value="'+esc(v[0])+'">'+esc(v[1])+'</option>';}).join('')+'</select></label>';
      content().innerHTML='<div class="geapa-admin">'+ds.collectionSearch('Buscar nos convites carregados','<div class="geapa-record-grid geapa-invitation-grid">'+invitations.map(global.PortalMemberDesign.invitationCard).join('')+'</div>','Busca e filtros consideram os convites já carregados. Use Carregar mais para consultar a próxima página.',filters)+(!invitations.length?'<p class="empty-state">Nenhum convite cadastrado.</p>':'')+'</div><div class="member-registration-feedback" data-member-registration-feedback role="status"></div><div class="portal-modal-actions">'+(invitationCursor?'<button type="button" class="secondary-button" data-member-invitations-more>Carregar mais</button>':'')+'<button type="button" class="secondary-button" data-member-registration-close>Fechar</button></div>';
      ds.mountCollectionSearch(content());
      if(content().querySelector('[data-batch-review]')){
        var batch=document.createElement('button');batch.type='button';batch.textContent='Registrar ciência dos selecionados';
        batch.addEventListener('click',async function(){
          if(busy)return;busy=true;batch.disabled=true;
          var selected=Array.from(content().querySelectorAll('[data-batch-review]:checked'));
          var count=0;
          try{
            for(var checkbox of selected){
              if(epoch!==viewEpoch||!canSeeInvitations())return;
              var item=invitations.find(function(row){return row.enrollmentId===checkbox.closest('[data-enrollment-id]').dataset.enrollmentId;});
              var answer=await api.apiPost('/admin/ingressos-membros/convite',{payload:JSON.stringify({enrollmentId:item.enrollmentId,revision:item.revision,action:'ACKNOWLEDGE',reason:'Ciência da Presidência'})});
              if(!answer.ok)throw Error(answer.message);count++;
            }
            if(epoch===viewEpoch)toast('success','Ciência registrada em '+count+' pré-cadastro(s).');
          }catch(error){if(epoch===viewEpoch)toast('error',count+' registro(s) confirmado(s). '+error.message);}
          finally{if(epoch===viewEpoch){busy=false;openInvitations(false);}}
        });content().querySelector('.portal-modal-actions').prepend(batch);
      }
    }).catch(function(error) { if(epoch===viewEpoch&&canSeeInvitations())renderError(error); });
  }
  function invitationAction(button) {
    if (!canSeeInvitations() || busy) return;
    var card = button.closest('[data-enrollment-id]'),v=invitations.find(function(v){return v.enrollmentId===card.dataset.enrollmentId;}),action=button.dataset.invitationAction;
    if (!v) return;
    var reason=action==='ACKNOWLEDGE'?'Ciência da Presidência':'Envio administrativo de convite de ingresso';
    var patch={};
    if(['CANCEL','AMEND','REQUEST_CORRECTION','RESOLVE_CORRECTION'].includes(action)){
      var field=card.querySelector('[data-invitation-cancel-reason]');
      if(!field||field.dataset.action!==action){if(field)field.parentElement.remove();modal().setAttribute('data-geapa-protect-draft','');var label=document.createElement('label');label.innerHTML='<span>Motivo ou correção cadastral</span><input type="text" maxlength="500" required data-invitation-cancel-reason>';if(action==='AMEND'){
        label.insertAdjacentHTML('afterbegin','<span>Campo a corrigir</span><select data-amend-field><option value="fullName">Nome completo</option><option value="phone">Telefone</option><option value="rga">RGA</option>'+(v.status==='ACCEPTED'?'':'<option value="email">E-mail</option>')+'</select><span>Valor correto</span><input data-amend-value maxlength="180" required>');
      }card.appendChild(label);button.textContent='Confirmar registro';label.querySelector('[data-invitation-cancel-reason]').dataset.action=action;label.querySelector('input').focus();return;}
      if(action==='AMEND'){var value=card.querySelector('[data-amend-value]');if(!value.reportValidity())return;patch={field:card.querySelector('[data-amend-field]').value,value:value.value.trim()};}
      reason=field.value; if(!reason.trim()){field.reportValidity();return;}
    }
    var epoch=viewEpoch;
    if (reason===null || !String(reason).trim()) return;
    busy=true;modal().setAttribute('aria-busy','true');var buttons=Array.from(content().querySelectorAll('button'));buttons.forEach(function(b){b.disabled=true;});
    api.apiPost('/admin/ingressos-membros/convite',{payload:JSON.stringify(Object.assign({enrollmentId:v.enrollmentId,revision:v.revision,action:action,reason:String(reason).trim()},patch))}).then(function(response){
      if(epoch!==viewEpoch)return;if(!canSeeInvitations()){refreshInvitationsWhenReady=true;return;}if(!response||response.ok!==true)throw response||new Error('Não foi possível confirmar o convite.');busy=false;modal().removeAttribute('aria-busy');modal().removeAttribute('data-geapa-dirty');toast('success',response.message);openInvitations(false);
    }).catch(function(error){if(epoch!==viewEpoch)return;if(!canSeeInvitations()){refreshInvitationsWhenReady=true;return;}var feedback=content().querySelector('[data-member-registration-feedback]');if(feedback)feedback.textContent=error.message||'Não foi possível confirmar o envio. Tente novamente para recuperar a mesma operação.';}).finally(function(){if(epoch===viewEpoch){busy=false;modal()?.removeAttribute('aria-busy');}buttons.forEach(function(b){if(b.isConnected)b.disabled=false;});});
  }
  function content() { return ensureModal().querySelector('[data-member-registration-content]'); }
  function renderLoading() { content().innerHTML = '<div class="member-registration-state">Carregando catalogos oficiais...</div>'; }
  function renderError(error) { content().innerHTML = '<div class="member-registration-state member-registration-error"><strong>Nao foi possivel preparar o cadastro</strong><p>' + esc(error && error.message || 'Catalogo indisponivel.') + '</p><button type="button" class="secondary-button" data-member-registration-retry>Tentar novamente</button></div>'; }

  function renderForm() {
    content().innerHTML = [
      '<form data-member-registration-form novalidate>',
      '<div class="member-registration-scroll">',
      '<div class="member-registration-grid">',
      field('nomeCompleto', 'Nome completo', 'text', true),
      field('emailPrincipal', 'E-mail principal', 'email', true), field('telefone', 'Telefone/WhatsApp', 'tel', true),
      field('rga', 'RGA', 'text', true),
      '<label><span>Categoria de ingresso</span><select name="categoriaIngresso" required><option value="">Selecione</option><option value="MEMBRO_INGRESSANTE">Membro ingressante</option><option value="MEMBRO_EFETIVO">Membro efetivo</option></select></label>',
      field('referenciaAprovacao', 'Referência da aprovação institucional', 'text', true),
      '</div>',

      '</div>',
      '<div class="member-registration-feedback" data-member-registration-feedback role="status" aria-live="polite"></div>',
      '<div class="portal-modal-actions"><button type="button" class="secondary-button" data-member-registration-close>Cancelar</button><button type="submit" class="primary-button" data-member-registration-submit>Salvar pré-cadastro</button></div>',
      '</form>'
    ].join('');
    var form = content().querySelector('form');
    form.elements.nomeCompleto.focus();
  }

  function field(name, label, type, required, placeholder) {
    return '<label><span>' + esc(label) + '</span><input name="' + name + '" type="' + type + '"' + (required ? ' required' : '') + (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + '></label>';
  }
  function payload(form) {
    var data = new FormData(form);
    return Object.fromEntries(['nomeCompleto','emailPrincipal','rga','telefone','categoriaIngresso','referenciaAprovacao'].map(function(name) {
      return [name, String(data.get(name) || '').trim()];
    }));
  }

  function submit(form) {
    if (busy || !enabled()) return; if (!form.reportValidity()) return;
    var epoch=viewEpoch;busy = true;modal().setAttribute('aria-busy','true'); var button = form.querySelector('[data-member-registration-submit]'); button.disabled = true; button.textContent = 'Cadastrando...';
    api.apiPost('/admin/ingressos-membros/cadastrar', { payload: JSON.stringify(payload(form)) }).then(function(response) {
      if(epoch!==viewEpoch||!enabled())return;if (!response || response.ok !== true) throw response || new Error('Nao foi possivel cadastrar.');
      modal().removeAttribute('data-geapa-dirty');content().innerHTML = '<div class="member-registration-success"><strong>Pré-cadastro registrado</strong><p>' + esc(response.message || 'O vínculo será ativado somente após o aceite e a conclusão cadastral.') + '</p><dl><dt>Protocolo do ingresso</dt><dd>' + esc(response.data && response.data.idIngresso || '') + '</dd><dt>Status</dt><dd>Aguardando convite e conclusão</dd></dl><p>O cadastro ainda não gera presenças, faltas ou obrigações.</p><button type="button" class="primary-button" data-member-registration-close>Concluir</button></div>';
      toast('success', 'Pré-cadastro salvo. Vínculo ainda não ativado.');
      document.dispatchEvent(new CustomEvent('portal:memberregistered'));
    }).catch(function(error) {
      if(epoch!==viewEpoch||!enabled())return;var feedback = form.querySelector('[data-member-registration-feedback]'); feedback.textContent = ['ADMISSION_APPROVAL_REQUIRED','HUMAN_DECISION_REQUIRED'].includes(error?.code||error?.message)?'Confira se a referência, a categoria, o RGA e o e-mail correspondem à aprovação registrada.':error && error.message || 'Não foi possível cadastrar.'; feedback.className = 'member-registration-feedback is-error';
      toast('error', feedback.textContent);
    }).then(function() { if(epoch===viewEpoch){busy=false;modal()?.removeAttribute('aria-busy');} if (button && button.isConnected) { button.disabled = false; button.textContent = 'Salvar pré-cadastro'; } });
  }

  function toast(type, message) { if (ui && ui.mostrarToast) ui.mostrarToast({ type: type, title: 'Cadastro de membro', message: message, persistent: type === 'error' }); }
  document.addEventListener('click', function(event) { var target = event.target.closest('[data-member-registration-open],[data-member-registration-close],[data-member-registration-retry],[data-member-invitations-open],[data-member-invitations-more],[data-invitation-action]'); if (!target) return; if(target.hasAttribute('data-invitation-action'))invitationAction(target);else if(target.hasAttribute('data-member-invitations-open'))openInvitations(false);else if(target.hasAttribute('data-member-invitations-more'))openInvitations(true);else if (target.hasAttribute('data-member-registration-open')) { ensureModal().querySelector('#member-registration-title').textContent='Cadastrar membro aprovado';open(); } else if (target.hasAttribute('data-member-registration-retry')) {if(mode==='invitations')openInvitations(false);else open();} else close(); });
  document.addEventListener('submit', function(event) { var form = event.target.closest('[data-member-registration-form]'); if (!form) return; event.preventDefault(); submit(form); });
  document.addEventListener('portal:members-session-ready',function(){if(refreshInvitationsWhenReady&&canSeeInvitations()&&!busy){refreshInvitationsWhenReady=false;var node=modal();if(node&&!node.hidden&&mode==='invitations')openInvitations(false);}});
  document.addEventListener('portal:act-session-cleared',function(){viewEpoch++;busy=false;refreshInvitationsWhenReady=false;invitations=[];invitationCursor=null;var node=modal();if(node){global.PortalDesign.closeDetailDialog(node,true);node.removeAttribute('aria-busy');node.querySelector('[data-member-registration-content]').replaceChildren();}document.body.classList.remove('modal-open');});
  document.addEventListener('portal:navigationchange',function(){if(modal()&&!modal().hidden)global.PortalDesign.closeDetailDialog(modal(),true);});
  global.PortalGeapaMemberRegistration = Object.freeze({ renderAction: renderAction, open: open });
})(window);
