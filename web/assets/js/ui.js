/**
 * Utilitarios publicos de interface do Portal GEAPA.
 */

(function configurarUiPortal(global) {
  function escaparHtml(valor) {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatarRotulo(valor) {
    var texto = String(valor || '')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();

    if (!texto) {
      return '';
    }

    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function formatarData(valor) {
    var data = new Date(valor + 'T00:00:00');

    if (Number.isNaN(data.getTime())) {
      return valor || '';
    }

    return data.toLocaleDateString('pt-BR');
  }

  function formatarBooleano(valor) {
    return valor ? 'Sim' : 'Não';
  }

  global.PortalGeapaUi = {
    escaparHtml: escaparHtml,
    formatarRotulo: formatarRotulo,
    formatarData: formatarData,
    formatarBooleano: formatarBooleano
  };
})(window);
