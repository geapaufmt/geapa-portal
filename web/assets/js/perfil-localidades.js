/** Seletor local versionado; a validacao final permanece no Core. */
(function configurarLocalidades(global) {
  'use strict';
  var cache = null; var pending = null;
  function esc(value) { return global.PortalGeapaUi ? global.PortalGeapaUi.escaparHtml(String(value == null ? '' : value)) : String(value == null ? '' : value); }
  function load() {
    if (cache) return Promise.resolve(cache); if (pending) return pending;
    pending = fetch('/assets/data/localidades-ibge-v1.json', { cache: 'force-cache' }).then(function(response) { if (!response.ok) throw new Error('CATALOGO_LOCALIDADES_INDISPONIVEL'); return response.json(); }).then(function(data) { cache = data; return data; }).finally(function() { pending = null; });
    return pending;
  }
  function renderFields(profile) {
    var p = profile || {};
    return '<fieldset class="profile-locality-fields"><legend>Origem / naturalidade</legend><p class="section-note">Origem não representa residência atual.</p><label><span>País</span><select name="paisOrigemCodigo" data-locality-country data-selected="' + esc(p.paisOrigemCodigo || 'BR') + '" required><option value="">Carregando países...</option></select></label><div data-locality-brazil><label><span>UF de origem</span><select name="ufOrigem" data-locality-state data-selected="' + esc(p.ufOrigem || '') + '"><option value="">Selecione</option></select></label><label><span>Município de origem</span><input name="cidadeOrigem" data-locality-city value="' + esc(p.cidadeOrigem || '') + '" list="profile-municipalities" autocomplete="off"><input type="hidden" name="municipioOrigemCodigo" data-locality-city-code value="' + esc(p.municipioOrigemCodigo || '') + '"><datalist id="profile-municipalities" data-locality-city-list></datalist></label></div><div data-locality-foreign hidden><label><span>Cidade de origem</span><input name="cidadeOrigemEstrangeira" value="' + esc(p.cidadeOrigem || '') + '"></label><label><span>Região / estado / província</span><input name="regiaoOrigem" value="' + esc(p.regiaoOrigem || '') + '"></label></div><p class="section-note" data-locality-source></p></fieldset>';
  }
  function setMunicipalities(form, data) {
    var uf = form.elements.ufOrigem.value; var list = form.querySelector('[data-locality-city-list]'); var selectedCode = form.elements.municipioOrigemCodigo.value;
    var rows = data.municipalities.filter(function(item) { return item.uf === uf; });
    list.innerHTML = rows.map(function(item) { return '<option value="' + esc(item.nome) + '" data-code="' + esc(item.codigo) + '"></option>'; }).join('');
    function syncCode() { var name = form.elements.cidadeOrigem.value; var match = rows.find(function(item) { return item.nome === name; }); form.elements.municipioOrigemCodigo.value = match ? match.codigo : ''; }
    form.elements.cidadeOrigem.oninput = syncCode;
    if (selectedCode) { var selected = rows.find(function(item) { return item.codigo === selectedCode; }); if (selected) form.elements.cidadeOrigem.value = selected.nome; }
  }
  function syncCountry(form, data) {
    var brazil = form.elements.paisOrigemCodigo.value === 'BR'; form.querySelector('[data-locality-brazil]').hidden = !brazil; form.querySelector('[data-locality-foreign]').hidden = brazil;
    form.elements.ufOrigem.required = brazil; form.elements.cidadeOrigem.required = brazil; form.elements.cidadeOrigemEstrangeira.required = !brazil;
    if (!brazil) { form.elements.ufOrigem.value = ''; form.elements.municipioOrigemCodigo.value = ''; }
    if (brazil) setMunicipalities(form, data);
  }
  function hydrate(form) {
    if (!form) return Promise.resolve();
    return load().then(function(data) {
      var country = form.querySelector('[data-locality-country]'); country.innerHTML = data.countries.map(function(item) { return '<option value="' + esc(item.codigo) + '">' + esc(item.nome) + '</option>'; }).join(''); country.value = country.dataset.selected || 'BR';
      var state = form.querySelector('[data-locality-state]'); state.innerHTML = '<option value="">Selecione</option>' + data.states.map(function(item) { return '<option value="' + esc(item.sigla) + '">' + esc(item.sigla + ' — ' + item.nome) + '</option>'; }).join(''); state.value = state.dataset.selected || '';
      form.querySelector('[data-locality-source]').textContent = data.metadata.fonte + ' · catálogo ' + data.metadata.catalogoGeradoEm;
      country.addEventListener('change', function() { syncCountry(form, data); }); state.addEventListener('change', function() { form.elements.cidadeOrigem.value = ''; form.elements.municipioOrigemCodigo.value = ''; setMunicipalities(form, data); }); syncCountry(form, data);
    }).catch(function() { var source = form.querySelector('[data-locality-source]'); source.textContent = 'Catálogo oficial indisponível. A origem não poderá ser alterada agora.'; Array.from(form.elements).forEach(function(input) { if (/Origem|cidade/i.test(input.name)) input.disabled = true; }); });
  }
  function serialize(form) {
    var country = String(form.elements.paisOrigemCodigo && form.elements.paisOrigemCodigo.value || ''); var brazil = country === 'BR';
    return { paisOrigemCodigo: country, ufOrigem: brazil ? String(form.elements.ufOrigem.value || '').toUpperCase() : '', municipioOrigemCodigo: brazil ? String(form.elements.municipioOrigemCodigo.value || '') : '', cidadeOrigem: brazil ? String(form.elements.cidadeOrigem.value || '').trim() : String(form.elements.cidadeOrigemEstrangeira.value || '').trim(), regiaoOrigem: brazil ? '' : String(form.elements.regiaoOrigem.value || '').trim() };
  }
  global.PortalGeapaLocalidades = Object.freeze({ load: load, renderFields: renderFields, hydrate: hydrate, serialize: serialize });
})(window);
