/**
 * Painel da Diretoria V2.
 *
 * A tela consome apenas o agregado enviado pelo Apps Script. O front-end nao
 * consulta planilhas, nao calcula permissao real e nao oferece acoes de escrita.
 */
(function configurarPainelDiretoriaV2(global) {
  var api = global.PortalGeapaApi;
  var ui = global.PortalGeapaUi;
  var navigation = global.PortalGeapaNavigation;
  var estado = {
    nivel: 'TODOS',
    dados: null
  };

  function iniciar() {
    if (!api || !ui || !navigation) {
      return;
    }

    document.addEventListener('portal:navigationchange', function aoNavegar(evento) {
      var rota = evento.detail && evento.detail.rota;

      if (rota && rota.id === 'painel-diretoria-v2') {
        carregar();
      }
    });

    document.addEventListener('click', function aoClicar(evento) {
      var botao = evento.target.closest('[data-painel-diretoria-nivel]');

      if (!botao) {
        return;
      }

      evento.preventDefault();
      estado.nivel = botao.getAttribute('data-painel-diretoria-nivel') || 'TODOS';
      renderizarDados();
    });

    if (typeof navigation.getRotaAtual === 'function' && navigation.getRotaAtual() === 'painel-diretoria-v2') {
      carregar();
    }
  }

  function carregar() {
    var container = obterContainer();

    if (!container) {
      return;
    }

    renderizarBase('<p class="empty-state">Carregando painel da diretoria...</p>');
    ui.mostrarLoading('Carregando painel da diretoria...');

    api.apiGet('/v2/painel-diretoria', {})
      .then(function tratarResposta(resposta) {
        if (!resposta.ok) {
          throw new Error(resposta.message || 'Nao foi possivel carregar o painel da diretoria.');
        }

        estado.dados = resposta.data || {};
        renderizarDados();
      })
      .catch(function tratarErro(erro) {
        renderizarBase(
          '<p class="empty-state readonly-error">' +
          escapar(erro.message || 'Erro controlado ao carregar o painel da diretoria.') +
          '</p>'
        );
      })
      .then(function finalizar() {
        ui.ocultarLoading();
      });
  }

  function renderizarDados() {
    var dados = estado.dados || {};
    var blocos = Array.isArray(dados.blocos) ? dados.blocos : [];
    var filtrados = filtrarBlocos(blocos, estado.nivel);

    renderizarBase([
      montarResumo(dados),
      montarAvisos(dados),
      montarFiltros(dados),
      filtrados.length
        ? '<div class="painel-diretoria-grid">' + filtrados.map(montarBloco).join('') + '</div>'
        : '<p class="empty-state readonly-empty">Nenhuma ocorrencia para o filtro selecionado.</p>'
    ].join(''));
  }

  function renderizarBase(corpo) {
    var container = obterContainer();

    if (!container) {
      return;
    }

    container.innerHTML = [
      '<p class="eyebrow">Gestao do GEAPA</p>',
      '<div class="public-content-heading">',
      '<h2>Painel da Diretoria</h2>',
      '<p class="intro">Pendencias, inconsistencias e status das rotinas V2 em modo somente leitura.</p>',
      '</div>',
      corpo
    ].join('');
  }

  function montarResumo(dados) {
    var resumo = dados.resumo || {};
    var itens = [
      ['Total', resumo.total || 0, 'INFO'],
      ['ERRO', resumo.ERRO || 0, 'ERRO'],
      ['ALERTA', resumo.ALERTA || 0, 'ALERTA'],
      ['INFO', resumo.INFO || 0, 'INFO']
    ];

    return [
      '<div class="readonly-summary painel-diretoria-summary">',
      itens.map(function montar(item) {
        return [
          '<div class="summary-item painel-diretoria-summary-item painel-nivel-' + item[2].toLowerCase() + '">',
          '<dt>' + escapar(item[0]) + '</dt>',
          '<dd>' + escapar(formatarValor(item[1])) + '</dd>',
          '</div>'
        ].join('');
      }).join(''),
      '</div>',
      '<div class="painel-diretoria-meta">',
      dados.ultimaAtualizacao
        ? '<span>Ultima atualizacao: ' + escapar(formatarValor(dados.ultimaAtualizacao)) + '</span>'
        : '<span>Ultima atualizacao indisponivel</span>',
      dados.viewsDesatualizadas
        ? '<strong class="painel-diretoria-stale">Views possivelmente desatualizadas</strong>'
        : '<strong class="painel-diretoria-ok">Views atualizadas</strong>',
      '</div>'
    ].join('');
  }

  function montarAvisos(dados) {
    var avisos = Array.isArray(dados.avisos) ? dados.avisos : [];

    if (!avisos.length) {
      return '';
    }

    return [
      '<div class="painel-diretoria-alertas">',
      avisos.map(function montar(aviso) {
        return '<p class="painel-diretoria-aviso painel-nivel-' +
          escapar(String(aviso.nivel || 'ALERTA').toLowerCase()) + '">' +
          escapar(aviso.mensagem || 'Aviso do painel V2.') +
          '</p>';
      }).join(''),
      '</div>'
    ].join('');
  }

  function montarFiltros(dados) {
    var niveis = ['TODOS'].concat(Array.isArray(dados.niveis) ? dados.niveis : ['ERRO', 'ALERTA', 'INFO']);

    return [
      '<div class="painel-diretoria-filtros" role="group" aria-label="Filtro por nivel">',
      niveis.map(function montar(nivel) {
        var ativo = estado.nivel === nivel;

        return [
          '<button type="button" class="painel-diretoria-filtro',
          ativo ? ' is-active' : '',
          '" data-painel-diretoria-nivel="' + escapar(nivel) + '">',
          escapar(nivel),
          '</button>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  function montarBloco(bloco) {
    var itens = Array.isArray(bloco.itens) ? bloco.itens : [];
    var nivel = String(bloco.nivel || 'INFO').toLowerCase();

    return [
      '<section class="painel-diretoria-bloco painel-nivel-' + escapar(nivel) + '">',
      '<div class="painel-diretoria-bloco-topo">',
      '<div>',
      '<p class="painel-diretoria-nivel">' + escapar(bloco.nivel || 'INFO') + '</p>',
      '<h3>' + escapar(bloco.titulo || 'Bloco do painel') + '</h3>',
      '</div>',
      '<strong>' + escapar(formatarValor(bloco.total || 0)) + '</strong>',
      '</div>',
      bloco.resumo ? '<p class="painel-diretoria-resumo">' + escapar(bloco.resumo) + '</p>' : '',
      bloco.desatualizado ? '<p class="painel-diretoria-desatualizado">View desatualizada ou sem horario confiavel.</p>' : '',
      itens.length ? montarItens(itens) : '<p class="painel-diretoria-vazio">Sem ocorrencias.</p>',
      '</section>'
    ].join('');
  }

  function montarItens(itens) {
    return [
      '<ul class="painel-diretoria-itens">',
      itens.map(function montar(item) {
        return [
          '<li>',
          '<div class="painel-diretoria-item-linha">',
          '<span class="painel-diretoria-chip painel-nivel-' + escapar(String(item.nivel || 'INFO').toLowerCase()) + '">' + escapar(item.nivel || 'INFO') + '</span>',
          '<strong>' + escapar(item.titulo || item.tipo || 'Ocorrencia') + '</strong>',
          '</div>',
          '<p>' + escapar(item.descricao || item.status || 'Sem detalhe adicional.') + '</p>',
          montarDetalhesItem(item),
          '</li>'
        ].join('');
      }).join(''),
      '</ul>'
    ].join('');
  }

  function montarDetalhesItem(item) {
    var partes = [];

    if (item.tipo) {
      partes.push(['Tipo', item.tipo]);
    }

    if (item.status) {
      partes.push(['Status', item.status]);
    }

    if (item.responsavelGrupo) {
      partes.push(['Responsavel', item.responsavelGrupo]);
    }

    if (item.atualizadaEm || item.ultimaAtualizacao) {
      partes.push(['Atualizacao', item.atualizadaEm || item.ultimaAtualizacao]);
    }

    if (item.linhas !== undefined && item.linhas !== null && item.linhas !== '') {
      partes.push(['Linhas', item.linhas]);
    }

    if (!partes.length) {
      return '';
    }

    return '<dl class="painel-diretoria-detalhes">' + partes.map(function montar(parte) {
      return '<div><dt>' + escapar(parte[0]) + '</dt><dd>' + escapar(formatarValor(parte[1])) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function filtrarBlocos(blocos, nivel) {
    if (!nivel || nivel === 'TODOS') {
      return blocos;
    }

    return blocos.reduce(function filtrar(acc, bloco) {
      var itens = (bloco.itens || []).filter(function verificar(item) {
        return item.nivel === nivel;
      });
      var clone = Object.assign({}, bloco);

      if (itens.length) {
        clone.itens = itens;
        clone.total = itens.length;
        acc.push(clone);
        return acc;
      }

      if (bloco.desatualizado === true && nivel === 'ALERTA') {
        acc.push(bloco);
        return acc;
      }

      if (bloco.nivel === nivel && Number(bloco.total || 0) > 0) {
        acc.push(bloco);
      }

      return acc;
    }, []);
  }

  function obterContainer() {
    return document.getElementById('placeholder-content');
  }

  function escapar(valor) {
    return ui && typeof ui.escaparHtml === 'function'
      ? ui.escaparHtml(valor)
      : String(valor || '');
  }

  function formatarValor(valor) {
    if (valor === true) {
      return 'Sim';
    }

    if (valor === false) {
      return 'Nao';
    }

    if (valor === undefined || valor === null || valor === '') {
      return '-';
    }

    return String(valor).replace(/_/g, ' ');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})(window);
