/**
 * Tela inicial de Atividades do Portal GEAPA.
 *
 * Esta entrega trabalha apenas com dados mockados. A integracao real devera
 * passar pelo Apps Script e validar permissoes no backend.
 */

(function configurarAtividadesPortal(global) {
  var api = global.PortalGeapaApi;
  var auth = global.PortalGeapaAuth;
  var ui = global.PortalGeapaUi;

  function iniciarAtividades() {
    var telaAtividades = document.getElementById('tela-atividades');
    var lista = document.getElementById('atividades-lista');
    var status = document.getElementById('atividades-status');
    var modal = document.getElementById('atividade-modal');
    var botoesAbrir = document.querySelectorAll('[data-open-atividades]');
    var botoesVoltar = document.querySelectorAll('[data-voltar-situacao]');
    var botaoFecharModal = document.getElementById('fechar-atividade-modal');

    if (!telaAtividades || !lista || !status || !modal || !api || !auth || !ui) {
      return;
    }

    Array.prototype.forEach.call(botoesAbrir, function registrarBotao(botao) {
      botao.addEventListener('click', function abrirAtividades() {
        mostrarTelaAtividades();
        carregarAtividades(lista, status);
      });
    });

    Array.prototype.forEach.call(botoesVoltar, function registrarBotao(botao) {
      botao.addEventListener('click', mostrarTelaSituacaoOuAcesso);
    });

    botaoFecharModal.addEventListener('click', fecharModal);
    modal.addEventListener('click', function fecharAoClicarFora(event) {
      if (event.target === modal) {
        fecharModal();
      }
    });
    document.addEventListener('keydown', function fecharComEsc(event) {
      if (event.key === 'Escape' && !modal.hidden) {
        fecharModal();
      }
    });
  }

  function mostrarTelaAtividades() {
    var app = document.getElementById('portal-app');
    var telaAcesso = document.getElementById('tela-acesso');
    var telaSituacao = document.getElementById('tela-situacao');
    var telaAtividades = document.getElementById('tela-atividades');

    app.classList.remove('view-login', 'view-situacao');
    app.classList.add('view-atividades');
    telaAcesso.hidden = true;
    telaSituacao.hidden = true;
    telaAtividades.hidden = false;
  }

  function mostrarTelaSituacaoOuAcesso() {
    var app = document.getElementById('portal-app');
    var telaAcesso = document.getElementById('tela-acesso');
    var telaSituacao = document.getElementById('tela-situacao');
    var telaAtividades = document.getElementById('tela-atividades');
    var possuiSessao = false;

    try {
      possuiSessao = Boolean(window.sessionStorage.getItem('geapaPortal.sessionToken'));
    } catch (erro) {
      possuiSessao = false;
    }

    app.classList.remove('view-login', 'view-situacao', 'view-atividades');
    telaAtividades.hidden = true;

    if (possuiSessao) {
      app.classList.add('view-situacao');
      telaAcesso.hidden = true;
      telaSituacao.hidden = false;
      return;
    }

    app.classList.add('view-login');
    telaAcesso.hidden = false;
    telaSituacao.hidden = true;
  }

  function carregarAtividades(lista, status) {
    lista.innerHTML = '<p class="empty-state">Carregando atividades...</p>';
    status.textContent = 'Buscando atividades em modo de demonstração.';

    api.apiGet('/atividades/listar', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Não foi possível carregar atividades.');
        }

        renderizarAtividades(lista, resposta.data || []);
        status.textContent = 'Dados simulados. Nenhuma atividade real foi consultada.';
      })
      .catch(function tratarErro(erro) {
        lista.innerHTML = '<p class="empty-state">' + ui.escaparHtml(erro.message) + '</p>';
        status.textContent = 'Falha ao carregar atividades.';
      });
  }

  function renderizarAtividades(container, atividades) {
    if (!atividades.length) {
      container.innerHTML = '<p class="empty-state">Nenhuma atividade disponível nesta etapa.</p>';
      return;
    }

    container.innerHTML = atividades.map(function montarAtividade(atividade) {
      return [
        '<article class="activity-card" data-id-atividade="' + ui.escaparHtml(atividade.idAtividade) + '">',
        '<div class="activity-card-main">',
        '<div>',
        '<p class="activity-date">' + ui.escaparHtml(ui.formatarData(atividade.dataAtividade)) + ' · ' + ui.escaparHtml(atividade.diaSemana) + '</p>',
        '<h3>' + ui.escaparHtml(atividade.tituloPublico) + '</h3>',
        '<p class="activity-meta">' + ui.escaparHtml(atividade.horarioInicio + ' às ' + atividade.horarioFim) + ' · ' + ui.escaparHtml(atividade.local) + '</p>',
        '</div>',
        '<span class="status-pill">' + ui.escaparHtml(ui.formatarRotulo(atividade.statusPublico)) + '</span>',
        '</div>',
        '<dl class="activity-facts">',
        montarFato('Tipo', atividade.tipoPublico),
        montarFato('Formato', ui.formatarRotulo(atividade.formato)),
        montarFato('Presença', ui.formatarBooleano(atividade.contaPresenca)),
        montarFato('Falta', ui.formatarBooleano(atividade.contaFalta)),
        montarFato('Certificado', ui.formatarBooleano(atividade.geraCertificado)),
        montarFato('Carga horária', atividade.cargaHoraria + ' h'),
        '</dl>',
        '<div class="activity-actions">',
        montarBotaoDetalhes(atividade),
        montarBotaoMock('Registrar chamada', auth.canRegisterAttendance(atividade)),
        montarBotaoMock('Editar', auth.canEditActivity(atividade)),
        montarBotaoMock('Justificar falta', auth.canJustifyAbsence(atividade)),
        '</div>',
        '</article>'
      ].join('');
    }).join('');

    Array.prototype.forEach.call(
      container.querySelectorAll('[data-activity-details]'),
      function registrarDetalhe(botao) {
        botao.addEventListener('click', function abrirDetalhe() {
          carregarDetalheAtividade(botao.getAttribute('data-activity-details'));
        });
      }
    );
  }

  function montarFato(rotulo, valor) {
    return [
      '<div>',
      '<dt>' + ui.escaparHtml(rotulo) + '</dt>',
      '<dd>' + ui.escaparHtml(valor || '-') + '</dd>',
      '</div>'
    ].join('');
  }

  function montarBotaoDetalhes(atividade) {
    if (!auth.canViewActivityDetails(atividade)) {
      return '';
    }

    return [
      '<button class="secondary-button compact-button" type="button" data-activity-details="',
      ui.escaparHtml(atividade.idAtividade),
      '">Ver detalhes</button>'
    ].join('');
  }

  function montarBotaoMock(rotulo, permitido) {
    if (!permitido) {
      return '';
    }

    return '<button class="secondary-button compact-button" type="button" disabled>' +
      ui.escaparHtml(rotulo) +
      '</button>';
  }

  function carregarDetalheAtividade(idAtividade) {
    api.apiGet('/atividades/detalhe', {
      idAtividade: idAtividade
    }).then(function tratarResposta(resposta) {
      if (!resposta.ok) {
        throw new Error(resposta.message || 'Não foi possível carregar detalhes.');
      }

      abrirModal(resposta.data);
    }).catch(function tratarErro(erro) {
      abrirModal({
        tituloPublico: 'Erro ao carregar atividade',
        descricaoPublica: erro.message
      });
    });
  }

  function abrirModal(detalhe) {
    var modal = document.getElementById('atividade-modal');
    var conteudo = document.getElementById('atividade-modal-content');

    conteudo.innerHTML = [
      '<p class="eyebrow">' + ui.escaparHtml(detalhe.idAtividade || 'Atividade') + '</p>',
      '<h3>' + ui.escaparHtml(detalhe.tituloPublico || 'Atividade') + '</h3>',
      '<p class="section-note">' + ui.escaparHtml(detalhe.descricaoPublica || '') + '</p>',
      '<dl class="activity-detail-grid">',
      montarFato('Data', ui.formatarData(detalhe.dataAtividade)),
      montarFato('Horário', detalhe.horarioCompleto),
      montarFato('Local', detalhe.local),
      montarFato('Formato', ui.formatarRotulo(detalhe.formato)),
      montarFato('Tipo', ui.formatarRotulo(detalhe.tipoAtividade)),
      montarFato('Subtipo', ui.formatarRotulo(detalhe.subtipoAtividade)),
      montarFato('Reunião', ui.formatarRotulo(detalhe.classificacaoReuniao)),
      montarFato('Acesso', ui.formatarRotulo(detalhe.classificacaoAcesso)),
      montarFato('Responsável', detalhe.responsavelPublico || 'Não informado'),
      montarFato('Conta presença', ui.formatarBooleano(detalhe.contaPresenca)),
      montarFato('Conta falta', ui.formatarBooleano(detalhe.contaFalta)),
      montarFato('Gera certificado', ui.formatarBooleano(detalhe.geraCertificado)),
      montarFato('Carga horária', detalhe.cargaHoraria ? detalhe.cargaHoraria + ' h' : '-'),
      montarFato('Status', ui.formatarRotulo(detalhe.statusPublico)),
      '</dl>',
      '<p class="section-note">Materiais e atas públicas serão exibidos quando a integração real estiver disponível.</p>'
    ].join('');

    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function fecharModal() {
    var modal = document.getElementById('atividade-modal');

    modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarAtividades);
  } else {
    iniciarAtividades();
  }
})(window);
