/**
 * Gestao administrativa de Atividades V2.
 *
 * O front-end renderiza contratos sanitizados. Permissao, modelo e campos
 * editaveis sao sempre revalidados no backend antes de qualquer escrita.
 */
(function configurarGestaoAtividades(global) {
  var api = global.PortalGeapaApi;
  var ui = global.PortalGeapaUi;
  var navigation = global.PortalGeapaNavigation;
  var state = {
    active: false,
    loading: false,
    activities: [],
    filterOptions: {},
    details: {},
    filters: {}
  };

  function start() {
    if (!api || !ui || !navigation) return;
    document.addEventListener('portal:navigationchange', function onNavigation(event) {
      var route = event.detail && event.detail.rota;
      state.active = !!(route && route.id === 'admin-atividades');
      if (state.active) loadActivities(false);
    });
    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('change', handleFilterChange);
    document.addEventListener('input', handleFilterInput);
    document.addEventListener('portal:atividade-criada', function onActivityCreated(event) {
      state.details = {};
      var activity = event.detail && event.detail.atividade || {};
      toast('success', 'Atividade ' + (activity.idAtividade || '') + ' criada como rascunho.');
      if (state.active) loadActivities(true);
    });
    document.addEventListener('portal:apresentacoes-atualizadas', function onPresentationsUpdated() {
      state.details = {};
      if (state.active) loadActivities(true);
    });
    if (typeof navigation.getRotaAtual === 'function' && navigation.getRotaAtual() === 'admin-atividades') {
      state.active = true;
      loadActivities(false);
    }
  }

  function loadActivities(background) {
    var container = getContainer();
    if (!container || state.loading) return;
    state.loading = true;
    if (!background) renderShell('<p class="empty-state">Carregando atividades administrativas...</p>');
    api.apiGet('/admin/atividades', { filtros: JSON.stringify({}) })
      .then(function onResponse(response) {
        if (!response.ok) throw new Error(response.message || 'Nao foi possivel carregar as atividades.');
        var data = response.data || {};
        state.activities = Array.isArray(data.atividades) ? data.atividades : [];
        state.filterOptions = data.opcoesFiltros || {};
        renderContent();
      })
      .catch(function onError(error) {
        renderShell('<p class="empty-state readonly-error">' + escape(adminErrorMessage(error, 'Erro ao carregar atividades.')) + '</p>');
      })
      .then(function done() { state.loading = false; });
  }

  function renderShell(content) {
    var container = getContainer();
    if (!container || !state.active) return;
    container.innerHTML = [
      '<p class="eyebrow">Gestao do GEAPA</p>',
      '<div class="admin-activities-heading">',
      '<div><h2>Atividades</h2><p class="intro">Revise rascunhos e gerencie atividades criadas por modelo.</p></div>',
      '<button class="secondary-button compact-button" type="button" data-create-activity>Criar atividade</button>',
      '</div>',
      '<div class="portal-feedback-slot" data-admin-activities-feedback hidden></div>',
      content
    ].join('');
  }

  function renderContent() {
    var filtered = filterActivities(state.activities, state.filters);
    renderShell([
      renderFilters(),
      '<div class="admin-activities-summary"><strong>' + filtered.length + '</strong><span>atividade(s) encontrada(s)</span></div>',
      renderTable(filtered)
    ].join(''));
  }

  function renderFilters() {
    var options = state.filterOptions || {};
    return [
      '<form class="admin-activities-filters" data-admin-activity-filters>',
      filterText('texto', 'Buscar', 'ID, titulo, modelo ou pessoa'),
      filterSelect('statusOperacional', 'Status operacional', options.statusOperacionais),
      filterSelect('statusPublicacao', 'Publicacao', options.statusPublicacao),
      filterSelect('visibilidade', 'Visibilidade', options.visibilidades),
      filterSelect('ciclo', 'Ciclo', options.ciclos),
      filterSelect('modelo', 'Modelo', options.modelos),
      filterSelect('tipo', 'Tipo', options.tipos),
      filterSelect('subtipo', 'Subtipo', options.subtipos),
      filterSelect('pendencia', 'Pendencia', ['TITULO_EIXO', 'MATERIAL', 'FOTO_REUNIAO']),
      '<button class="secondary-button compact-button" type="button" data-admin-clear-filters>Limpar filtros</button>',
      '</form>'
    ].join('');
  }

  function filterText(name, label, placeholder) {
    return '<label><span>' + escape(label) + '</span><input type="search" name="' + name + '" value="' + escape(state.filters[name] || '') + '" placeholder="' + escape(placeholder) + '"></label>';
  }

  function filterSelect(name, label, values) {
    var selected = String(state.filters[name] || '');
    var list = Array.isArray(values) ? values : [];
    return [
      '<label><span>' + escape(label) + '</span><select name="' + name + '">',
      '<option value="">Todos</option>',
      list.map(function option(value) {
        return '<option value="' + escape(value) + '"' + (String(value) === selected ? ' selected' : '') + '>' + escape(formatLabel(value)) + '</option>';
      }).join(''),
      '</select></label>'
    ].join('');
  }

  function renderTable(items) {
    if (!items.length) return '<p class="empty-state">Nenhuma atividade corresponde aos filtros.</p>';
    return [
      '<div class="readonly-table-wrap admin-activities-table-wrap">',
      '<table class="readonly-table admin-activities-table">',
      '<thead><tr><th>Atividade</th><th>Data</th><th>Modelo</th><th>Status</th><th>Pendencias</th><th><span class="sr-only">Acoes</span></th></tr></thead>',
      '<tbody>',
      items.map(function row(item) {
        return [
          '<tr>',
          '<td><strong>' + escape(item.tituloPublico || 'Atividade') + '</strong><small>' + escape(item.idAtividade) + '</small>',
          item.nomePessoaPrincipalPublico ? '<small>' + escape(item.nomePessoaPrincipalPublico) + '</small>' : '',
          '</td>',
          '<td>' + escape(ui.formatarData(item.dataAtividade)) + '<small>' + escape([item.horarioInicio, item.horarioFim].filter(Boolean).join(' - ')) + '</small></td>',
          '<td>' + escape(item.nomeModeloPortal || formatLabel(item.subtipoAtividade)) + '<small>' + escape(item.idConfigModelo || '') + '</small></td>',
          '<td><span class="admin-status-chip">' + escape(formatLabel(item.statusOperacional)) + '</span><small>' + escape(formatLabel(item.statusPublicacaoPortal)) + ' / ' + escape(formatLabel(item.visibilidadePortal)) + '</small></td>',
          '<td>' + renderPending(getActivePendencies(item)) + '</td>',
          '<td><div class="admin-row-actions">',
          '<button class="secondary-button compact-button" type="button" data-admin-open="' + escape(item.idAtividade) + '">Abrir</button>',
          renderQuickActions(item),
          '</div></td>',
          '</tr>'
        ].join('');
      }).join(''),
      '</tbody></table></div>'
    ].join('');
  }

  function renderPending(pending) {
    var items = Array.isArray(pending) ? pending : [];
    return items.length ? items.map(function(item) {
      return '<span class="admin-pending-chip">' + escape(formatLabel(item)) + '</span>';
    }).join('') : '<span class="section-note">Sem pendencias</span>';
  }

  function renderQuickActions(item) {
    var operational = String(item.statusOperacional || '').toUpperCase();
    var publication = String(item.statusPublicacaoPortal || '').toUpperCase();
    if (operational === 'CANCELADA' || operational === 'ARQUIVADA') {
      return '<button class="secondary-button compact-button" type="button" data-admin-state-action="reabrir" data-id-atividade="' + escape(item.idAtividade) + '">Reabrir</button>';
    }
    if (publication === 'PUBLICADA') {
      return '<button class="secondary-button compact-button" type="button" data-admin-state-action="ocultar" data-id-atividade="' + escape(item.idAtividade) + '">Ocultar</button>';
    }
    return '<button class="secondary-button compact-button" type="button" data-admin-state-action="publicar" data-id-atividade="' + escape(item.idAtividade) + '">Publicar</button>';
  }

  function handleClick(event) {
    if (!state.active) return;
    var openButton = event.target.closest('[data-admin-open]');
    var actionButton = event.target.closest('[data-admin-state-action]');
    var clearButton = event.target.closest('[data-admin-clear-filters]');
    var closeButton = event.target.closest('[data-admin-modal-close]');
    if (openButton) return openDetail(openButton.getAttribute('data-admin-open'));
    if (actionButton) return executeStateAction(actionButton.getAttribute('data-admin-state-action'), actionButton.getAttribute('data-id-atividade'));
    if (clearButton) { state.filters = {}; renderContent(); return; }
    if (closeButton) closeModal();
  }

  function handleFilterChange(event) {
    if (!state.active || !event.target.closest('[data-admin-activity-filters]')) return;
    state.filters[event.target.name] = event.target.value;
    renderContent();
  }

  function handleFilterInput(event) {
    if (!state.active || event.target.name !== 'texto' || !event.target.closest('[data-admin-activity-filters]')) return;
    state.filters.texto = event.target.value;
    renderContent();
    var input = document.querySelector('[data-admin-activity-filters] [name="texto"]');
    if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  }

  function handleSubmit(event) {
    var form = event.target.closest('[data-admin-activity-edit-form]');
    if (!form) return;
    event.preventDefault();
    saveEdit(form);
  }

  function openDetail(idAtividade, force) {
    if (!idAtividade) return;
    if (!force && state.details[idAtividade]) return renderDetail(state.details[idAtividade]);
    openModal('Gestao da atividade', '<p class="empty-state">Carregando detalhe administrativo...</p>');
    api.apiGet('/admin/atividades/detalhe', { idAtividade: idAtividade })
      .then(function onResponse(response) {
        if (!response.ok) throw new Error(response.message || 'Nao foi possivel carregar o detalhe.');
        state.details[idAtividade] = response.data || {};
        renderDetail(state.details[idAtividade]);
      })
      .catch(showModalError);
  }

  function renderDetail(detail) {
    var activity = detail.atividade || {};
    var editable = Array.isArray(detail.camposEditaveis) ? detail.camposEditaveis : [];
    var content = [
      '<p class="eyebrow">' + escape(activity.idAtividade || 'Atividade') + '</p>',
      '<div class="admin-detail-status"><strong>' + escape(activity.tituloPublico || 'Atividade') + '</strong><span>' + escape(formatLabel(activity.statusOperacional)) + ' / ' + escape(formatLabel(activity.statusPublicacaoPortal)) + '</span></div>',
      '<form class="admin-activity-edit-form" data-admin-activity-edit-form>',
      '<input type="hidden" name="idAtividade" value="' + escape(activity.idAtividade || '') + '">',
      renderEditableFields(activity, editable),
      '<div class="admin-form-actions"><button class="secondary-button" type="button" data-admin-modal-close>Fechar</button><button type="submit">Salvar edicao</button></div>',
      '</form>',
      renderProtectedFields(activity, detail.modeloAplicado),
      renderRelations(detail),
      '<div class="admin-detail-actions">',
      detail.podePublicar ? '<button type="button" data-admin-state-action="publicar" data-id-atividade="' + escape(activity.idAtividade) + '">Publicar</button>' : '',
      '<button class="secondary-button" type="button" data-admin-state-action="ocultar" data-id-atividade="' + escape(activity.idAtividade) + '">Ocultar</button>',
      '<button class="secondary-button admin-danger-button" type="button" data-admin-state-action="cancelar" data-id-atividade="' + escape(activity.idAtividade) + '">Cancelar atividade</button>',
      detail.podeReabrir ? '<button class="secondary-button" type="button" data-admin-state-action="reabrir" data-id-atividade="' + escape(activity.idAtividade) + '">Reabrir como rascunho</button>' : '',
      '</div>'
    ].join('');
    openModal('Gestao da atividade', content);
  }

  function renderEditableFields(activity, editable) {
    function has(name) { return editable.indexOf(name) >= 0; }
    var fields = [];
    if (has('tituloPublico')) fields.push(textField('tituloPublico', 'Titulo publico', activity.tituloPublico));
    if (has('descricaoPublica')) fields.push(textareaField('descricaoPublica', 'Descricao publica', activity.descricaoPublica));
    if (has('descricaoInterna')) fields.push(textareaField('descricaoInterna', 'Descricao interna', activity.descricaoInterna));
    if (has('dataAtividade')) fields.push(textField('dataAtividade', 'Data', activity.dataAtividade, 'date'));
    if (has('horarioInicio')) fields.push(textField('horarioInicio', 'Horario inicial', normalizeTimeInput(activity.horarioInicio), 'time'));
    if (has('horarioFim')) fields.push(textField('horarioFim', 'Horario final', normalizeTimeInput(activity.horarioFim), 'time'));
    if (has('local')) fields.push(textField('local', 'Local', activity.local));
    if (has('formato')) fields.push(selectField('formato', 'Formato', ['PRESENCIAL', 'REMOTO', 'HIBRIDO'], activity.formato));
    if (has('responsavelInterno')) fields.push(textField('responsavelInterno', 'Responsavel interno', activity.responsavelInterno));
    if (has('publicoAlvo')) fields.push(textField('publicoAlvo', 'Publico-alvo', activity.publicoAlvo));
    if (has('observacoes')) fields.push(textareaField('observacoes', 'Observacoes internas', activity.observacoes));
    return '<div class="admin-activity-form-grid">' + fields.join('') + '</div>';
  }

  function renderProtectedFields(activity, model) {
    var values = [
      ['Modelo', activity.nomeModeloPortal || (model && model.nomeModeloPortal)],
      ['ID do modelo', activity.idConfigModelo],
      ['Tipo', activity.tipoAtividade], ['Subtipo', activity.subtipoAtividade],
      ['Acesso', activity.classificacaoAcesso], ['Conta presenca', activity.contaPresenca],
      ['Conta falta', activity.contaFalta], ['Gera certificado', activity.geraCertificado],
      ['Carga horaria', activity.cargaHoraria]
    ];
    return '<section class="admin-protected-fields"><h3>Regras herdadas do modelo</h3><dl>' + values.map(function(item) {
      return '<div><dt>' + escape(item[0]) + '</dt><dd>' + escape(formatLabel(item[1]) || '-') + '</dd></div>';
    }).join('') + '</dl><p class="section-note">Esses campos sao protegidos e exigem fluxo proprio para alteracao.</p></section>';
  }

  function renderRelations(detail) {
    var activity = detail.atividade || {};
    var presentations = Array.isArray(detail.apresentacoes) ? detail.apresentacoes : [];
    var involved = Array.isArray(detail.envolvidos) ? detail.envolvidos : [];
    var pending = getActivePendencies({
      statusOperacional: activity.statusOperacional,
      pendencias: Array.isArray(detail.pendencias) ? detail.pendencias : []
    });
    return [
      '<section class="admin-related-data"><h3>Vinculos e pendencias</h3>',
      '<p><strong>Apresentacoes:</strong> ' + presentations.length + ' &nbsp; <strong>Envolvidos:</strong> ' + involved.length + '</p>',
      presentations.map(function(presentation) {
        return '<article class="admin-related-file"><strong>' + escape(presentation.idApresentacao || 'Apresentacao') + '</strong>' +
          '<div><span>Slide: ' + escape(formatLabel(presentation.statusMaterial || 'PENDENTE')) + '</span>' +
          (presentation.linkMaterial ? '<a class="secondary-button compact-button" href="' + escape(presentation.linkMaterial) + '" target="_blank" rel="noopener noreferrer">Abrir slide</a>' : '') + '</div>' +
          '<div><span>Foto da reuniao: ' + escape(formatLabel(presentation.statusFotoReuniao || 'PENDENTE')) + '</span>' +
          (presentation.linkFotoReuniao ? '<a class="secondary-button compact-button" href="' + escape(presentation.linkFotoReuniao) + '" target="_blank" rel="noopener noreferrer">Abrir foto</a>' : '') + '</div>' +
          '</article>';
      }).join(''),
      pending.length ? '<div>' + pending.map(function(item) { return '<span class="admin-pending-chip">' + escape(formatLabel(item.tipo)) + ': ' + escape(formatLabel(item.status)) + '</span>'; }).join('') + '</div>' : '<p class="section-note">Sem pendencias vinculadas.</p>',
      '</section>'
    ].join('');
  }

  function saveEdit(form) {
    var data = new FormData(form);
    var id = String(data.get('idAtividade') || '');
    var fields = {};
    data.forEach(function(value, key) { if (key !== 'idAtividade') fields[key] = value; });
    setFormBusy(form, true);
    api.apiPost('/admin/atividades/salvar', { payload: JSON.stringify({ idAtividade: id, campos: fields }) })
      .then(function onResponse(response) {
        if (!response.ok) throw response;
        delete state.details[id];
        notificarAtividadesAtualizadas(id, 'SALVAR');
        toast('success', response.message || 'Atividade atualizada.');
        closeModal();
        loadActivities(true);
      })
      .catch(function onError(error) {
        var message = error && error.message ? error.message : 'Nao foi possivel salvar a atividade.';
        var fieldErrors = error && error.data && error.data.fieldErrors ? error.data.fieldErrors : {};
        if (Object.keys(fieldErrors).length && ui.aplicarErrosCampos) {
          ui.aplicarErrosCampos(form, fieldErrors);
        }
        toast('error', message);
      })
      .then(function done() { setFormBusy(form, false); });
  }

  function executeStateAction(action, idAtividade) {
    if (!idAtividade) return;
    var messages = {
      publicar: 'Publicar esta atividade no Portal?',
      ocultar: 'Ocultar esta atividade do Portal?',
      cancelar: 'Cancelar esta atividade sem apagar seus dados?',
      reabrir: 'Reabrir esta atividade como rascunho?'
    };
    if (!global.confirm(messages[action] || 'Confirmar esta acao?')) return;
    api.apiPost('/admin/atividades/' + action, { payload: JSON.stringify({ idAtividade: idAtividade }) })
      .then(function onResponse(response) {
        if (!response.ok) throw response;
        delete state.details[idAtividade];
        notificarAtividadesAtualizadas(idAtividade, action.toUpperCase());
        toast('success', response.message || 'Acao concluida.');
        closeModal();
        loadActivities(true);
      })
      .catch(function onError(error) { toast('error', error && error.message ? error.message : 'Nao foi possivel concluir a acao.'); });
  }

  function filterActivities(items, filters) {
    return (items || []).filter(function(item) {
      if (filters.statusOperacional && item.statusOperacional !== filters.statusOperacional) return false;
      if (filters.statusPublicacao && item.statusPublicacaoPortal !== filters.statusPublicacao) return false;
      if (filters.visibilidade && item.visibilidadePortal !== filters.visibilidade) return false;
      if (filters.ciclo && item.ciclo !== filters.ciclo) return false;
      if (filters.modelo && item.idConfigModelo !== filters.modelo) return false;
      if (filters.tipo && item.tipoAtividade !== filters.tipo) return false;
      if (filters.subtipo && item.subtipoAtividade !== filters.subtipo) return false;
      if (filters.pendencia && getActivePendencies(item).indexOf(filters.pendencia) < 0) return false;
      if (filters.texto) {
        var search = String(filters.texto).toLowerCase();
        var text = [item.idAtividade, item.tituloPublico, item.nomeModeloPortal, item.nomePessoaPrincipalPublico].join(' ').toLowerCase();
        if (text.indexOf(search) < 0) return false;
      }
      return true;
    });
  }

  function notificarAtividadesAtualizadas(idAtividade, acao) {
    document.dispatchEvent(new CustomEvent('portal:atividades-atualizadas', {
      detail: {
        idAtividade: String(idAtividade || ''),
        acao: String(acao || '')
      }
    }));
  }

  function getActivePendencies(item) {
    var status = String((item || {}).statusOperacional || '').toUpperCase();
    if (['CANCELADA', 'CANCELADO', 'ARQUIVADA', 'ARQUIVADO'].indexOf(status) >= 0) return [];
    return Array.isArray((item || {}).pendencias) ? item.pendencias : [];
  }

  function textField(name, label, value, type) {
    return '<label><span>' + escape(label) + '</span><input type="' + (type || 'text') + '" name="' + name + '" value="' + escape(value || '') + '"></label>';
  }

  function textareaField(name, label, value) {
    return '<label class="admin-field-wide"><span>' + escape(label) + '</span><textarea name="' + name + '" rows="3">' + escape(value || '') + '</textarea></label>';
  }

  function selectField(name, label, values, selected) {
    return '<label><span>' + escape(label) + '</span><select name="' + name + '">' + values.map(function(value) {
      return '<option value="' + escape(value) + '"' + (value === selected ? ' selected' : '') + '>' + escape(formatLabel(value)) + '</option>';
    }).join('') + '</select></label>';
  }

  function openModal(title, content) {
    var modal = document.getElementById('atividade-modal');
    var titleNode = document.getElementById('atividade-modal-title');
    var contentNode = document.getElementById('atividade-modal-content');
    if (!modal || !contentNode) return;
    if (titleNode) titleNode.textContent = title;
    contentNode.innerHTML = content;
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    var modal = document.getElementById('atividade-modal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  function showModalError(error) {
    openModal('Gestao da atividade', '<p class="empty-state readonly-error">' + escape(adminErrorMessage(error, 'Erro ao carregar detalhe.')) + '</p><button class="secondary-button" type="button" data-admin-modal-close>Fechar</button>');
  }

  function setFormBusy(form, busy) {
    Array.prototype.forEach.call(form.querySelectorAll('button, input, select, textarea'), function(control) { control.disabled = !!busy; });
  }

  function normalizeTimeInput(value) { return String(value || '').trim().replace('h', ':'); }
  function adminErrorMessage(error, fallback) {
    var code = String(error && (error.code || error.errorCode) || '').toUpperCase();
    var message = String(error && error.message || '');
    if (code === 'ACAO_NAO_RECONHECIDA' || /acao nao reconhecida/i.test(message.normalize ? message.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : message)) {
      return 'O backend publicado ainda nao possui a gestao de atividades. Atualize o Apps Script e publique uma nova versao da API.';
    }
    return message || fallback;
  }
  function formatLabel(value) { return ui.formatarRotulo ? ui.formatarRotulo(value || '') : String(value || ''); }
  function toast(type, message) { ui.mostrarToast({ type: type, message: message }); }
  function escape(value) { return ui.escaparHtml(String(value === null || value === undefined ? '' : value)); }
  function getContainer() { return document.getElementById('placeholder-content'); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
