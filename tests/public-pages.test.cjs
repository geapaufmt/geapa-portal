const {test} = require('node:test');
const a = require('node:assert/strict');

const loadUI = () => import('../build/typescript/public-pages.mjs');

test('public pages parser normalizes sections, escapes unsafe markup and validates URLs', async () => {
  const {parsePublicPage, parsePublicSection} = await loadUI();

  const unsafeSection = {
    id: 'sec-1',
    type: 'HERO',
    title: 'Título Seguro <script>alert(1)</script>',
    subtitle: 'Subtítulo <b>negrito</b>',
    text: 'Texto explicativo com <style>corpo</style>',
    imageUrl: 'javascript:alert(1)',
    buttonText: 'Clique Aqui',
    buttonUrl: '#/sobre',
    order: 1,
    published: true
  };

  const normalized = parsePublicSection(unsafeSection);
  a.equal(normalized.id, 'sec-1');
  a.equal(normalized.type, 'HERO');
  a(!normalized.title.includes('<script>'));
  a(!normalized.subtitle.includes('<b>'));
  a(!normalized.text.includes('<style>'));
  a.equal(normalized.imageUrl, ''); // javascript: URL rejeitada
  a.equal(normalized.buttonUrl, '#/sobre'); // rota interna aceita

  const page = {
    id: 'about',
    schemaVersion: 'geapa-public-v2.1',
    published: true,
    sanitized: true,
    revision: 3,
    title: 'Sobre o GEAPA',
    subtitle: 'Grupo de Estudos',
    sourceHash: 'sha256b64:test-hash',
    sections: [unsafeSection]
  };

  const normalizedPage = parsePublicPage(page, 'about');
  a.equal(normalizedPage.id, 'about');
  a.equal(normalizedPage.revision, 3);
  a.equal(normalizedPage.sections.length, 1);
});

test('public pages parser rejects unpublished or unpermitted pages and enforces limits', async () => {
  const {parsePublicPage} = await loadUI();

  a.throws(() => parsePublicPage({id: 'private', published: false}, 'private'), /PAGE_ID_NOT_PERMITTED/);

  const unpublished = {
    id: 'home',
    schemaVersion: 'geapa-public-v2.1',
    published: false,
    sanitized: true,
    sections: []
  };
  a.throws(() => parsePublicPage(unpublished, 'home'), /PAGE_NOT_PUBLIC/);

  const oversized = {
    id: 'home',
    schemaVersion: 'geapa-public-v2.1',
    published: true,
    sanitized: true,
    sections: Array.from({length: 31}, (_, i) => ({
      id: `s-${i}`,
      type: 'TEXT',
      order: i,
      published: true
    }))
  };
  a.throws(() => parsePublicPage(oversized, 'home'), /PAGE_SECTIONS_LIMIT/);
});

test('timeline normalization validates civil dates without timezone drift and sorts records', async () => {
  const {parseTimelineItem} = await loadUI();

  const item1 = parseTimelineItem({
    id: 'MARCO-1',
    schemaVersion: 'geapa-public-v2.1',
    published: true,
    sanitized: true,
    year: 2024,
    date: '15/03/2024',
    title: 'Fundação',
    description: 'Início das atividades',
    order: 1
  });
  a.equal(item1.year, 2024);
  a.equal(item1.date, '2024-03-15'); // Data civil convertida sem deslocamento

  const item2 = parseTimelineItem({
    id: 'MARCO-2',
    schemaVersion: 'geapa-public-v2.1',
    published: true,
    sanitized: true,
    year: 2026,
    date: '2026-09-08',
    title: 'Revisão Regimental',
    description: 'Aprovação da nova minuta',
    order: 2
  });
  a.equal(item2.year, 2026);
  a.equal(item2.date, '2026-09-08');

  // Anos inválidos rejeitados
  a.throws(() => parseTimelineItem({id: 'M', schemaVersion: 'geapa-public-v2.1', published: true, sanitized: true, year: 1800}), /TIMELINE_YEAR_INVALID/);
});

test('public pages UI renders sections and timeline cards escaping markup', async () => {
  const {renderSectionHtml, renderPublicPageHtml, renderTimelineHtml} = await loadUI();

  const html = renderSectionHtml({
    id: 's-1',
    type: 'TEXT',
    title: 'Título & Teste <script>',
    subtitle: 'Subtítulo "com aspas"',
    text: 'Texto regular',
    buttonText: 'Ver mais',
    buttonUrl: '#/sobre',
    order: 1,
    published: true
  });

  a(html.includes('&amp;'));
  a(html.includes('&lt;script&gt;'));
  a(html.includes('&quot;com aspas&quot;'));
  a(html.includes('href="#/sobre"'));

  const timelineHtml = renderTimelineHtml([
    {
      id: 'MARCO-1',
      schemaVersion: 'geapa-public-v2.1',
      published: true,
      sanitized: true,
      year: 2026,
      date: '2026-09-09',
      title: 'Marco Histórico',
      description: 'Descrição do marco',
      order: 1,
      revision: 1,
      sourceHash: 'hash-1'
    }
  ]);

  a(timelineHtml.includes('2026'));
  a(timelineHtml.includes('2026-09-09'));
  a(timelineHtml.includes('Marco Histórico'));
});

test('home editorial renderer, public documents parser/renderer, and optional reader respect strict visibility and sanitization', async () => {
  const fs = require('fs');
  const p = require('path');
  const vm = require('vm');
  const {parsePublicDocument, renderHomeEditorialHtml, renderPublicDocumentsHtml} = await loadUI();
  const svcSource = fs.readFileSync(p.resolve(__dirname, '../src/services/public-pages.mjs'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/export /g, '');
  const svcCtx = vm.createContext({loadConfig: () => ({}), PROJECT: 'test', devAppCheck: async () => '', specializedReadersConfig: {}, initializeApp: () => ({}), getApps: () => [], initializeFirestore: () => ({}), doc: () => ({}), getDocFromServer: async () => ({}), collection: () => ({}), query: () => ({}), where: () => ({}), limit: () => ({}), getDocsFromServer: async () => ({}), URL, TextEncoder});
  vm.runInContext(svcSource, svcCtx);
  const svc = {createPublicPagesReader: svcCtx.createPublicPagesReader};

  const homeHtml = renderHomeEditorialHtml({
    id: 'home',
    schemaVersion: 'geapa-public-v2.1',
    published: true,
    sanitized: true,
    revision: 2,
    title: 'Destaques <script>x</script>',
    subtitle: 'Comunidade agroecológica',
    sourceHash: 'h1',
    sections: [
      {
        id: 'sec-1',
        type: 'HERO',
        title: 'Semana da Agroecologia',
        subtitle: 'Inscrições abertas',
        text: 'Participe das oficinas na UFMT.',
        imageUrl: 'https://firebasestorage.googleapis.com/v0/b/portal/o/hero.jpg',
        buttonText: 'Ver eixos',
        buttonUrl: '#/eixos-tematicos',
        order: 1,
        published: true
      }
    ]
  });

  a(homeHtml.includes('geapa-home-editorial-section'));
  a(homeHtml.includes('Destaques '));
  a(!homeHtml.includes('<script>'));
  a(homeHtml.includes('Semana da Agroecologia'));
  a(homeHtml.includes('href="#/eixos-tematicos"'));
  a(renderHomeEditorialHtml({id: 'home', schemaVersion: 'geapa-public-v2.1', published: true, sanitized: true, revision: 1, title: '', subtitle: '', sourceHash: '', sections: []}).includes('Nenhum conteúdo publicado nesta seção.'));

  a.equal(parsePublicDocument({id: 'd1', schemaVersion: 'geapa-public-document-v1', published: false, sanitized: true, status: 'VIGENTE', year: 2026, order: 1, publicUrl: 'https://example.org/a.pdf'}), null);
  a.equal(parsePublicDocument({id: 'd2', schemaVersion: 'geapa-public-document-v1', published: true, sanitized: true, status: 'REVOGADO', year: 2026, order: 1, publicUrl: 'https://example.org/a.pdf'}), null);
  a.equal(parsePublicDocument({id: 'd3', schemaVersion: 'geapa-public-document-v1', published: true, sanitized: true, status: 'VIGENTE', year: 2026, order: 1, publicUrl: 'javascript:alert(1)'}), null);

  const validDoc = parsePublicDocument({
    id: 'reg-2026',
    schemaVersion: 'geapa-public-document-v1',
    published: true,
    sanitized: true,
    type: 'REGIMENTO',
    title: 'Regimento Interno <img src=x>',
    summary: 'Norma vigente do GEAPA',
    status: 'VIGENTE',
    year: 2026,
    publicUrl: 'https://firebasestorage.googleapis.com/v0/b/portal/o/regimento.pdf',
    order: 1
  });
  a(validDoc);
  a.equal(validDoc.status, 'VIGENTE');
  a(!validDoc.title.includes('<img'));

  const docsHtml = renderPublicDocumentsHtml([validDoc]);
  a(docsHtml.includes('geapa-document-card'));
  a(docsHtml.includes('VIGENTE'));
  a(docsHtml.includes('Regimento Interno'));
  a(renderPublicDocumentsHtml([]).includes('Nenhum documento normativo público vigente'));

  const documentFilters = [];
  const mockReader = svc.createPublicPagesReader({
    db: {},
    sdk: {
      doc: (_db, path) => ({path}),
      collection: (_db, path) => ({path}),
      where: (...args) => { documentFilters.push(args); return {where:args}; },
      limit: n => ({limit: n}),
      query: (...args) => ({query: args}),
      getDocFromServer: async () => ({exists: () => false}),
      getDocsFromServer: async () => ({
        size: 2,
        docs: [
          {data: () => ({id: 'd-revoked', schemaVersion: 'geapa-public-document-v1', published: true, sanitized: true, status: 'REVOGADO', type: 'ATA', title: 'Antiga', summary: '', year: 2023, publicUrl: 'https://example.org/old.pdf', order: 1})},
          {data: () => ({id: 'd-ok', schemaVersion: 'geapa-public-document-v1', published: true, sanitized: true, status: 'VIGENTE', type: 'ESTATUTO', title: 'Estatuto GEAPA', summary: 'Vigente', year: 2026, publicUrl: 'https://firebasestorage.googleapis.com/v0/b/portal/o/est.pdf', order: 2})}
        ]
      })
    }
  });
  a.equal(await mockReader.getPageOptional('home'), null);
  const loadedDocs = await mockReader.getDocuments();
  a(documentFilters.some(([field, op, value]) => field === 'status' && op === '==' && value === 'VIGENTE'));
  a.equal(loadedDocs.length, 1);
  a.equal(loadedDocs[0].id, 'd-ok');
});

test('public routes sobre, historia, normas stay open while admin-conteudo-publico enforces server hints', () => {
  const fs = require('fs');
  const p = require('path');
  const vm = require('vm');
  const window = {
    location: {hash: ''},
    addEventListener() {},
    PortalDevContext: {authenticated: false, accessPending: false}
  };
  const document = {readyState: 'loading', addEventListener() {}};
  const ctx = vm.createContext({window, document, accessIsPending: () => false});
  const source = fs.readFileSync(p.resolve(__dirname, '../src/session/navigation.mjs'), 'utf8').replace(/^import .*;\r?\n/, '');
  vm.runInContext(source, ctx);
  const nav = window.PortalGeapaNavigation;
  const route = id => nav.getRotas().find(v => v.id === id);

  for (const pubId of ['inicio', 'sobre', 'historia', 'normas']) {
    a.equal(nav.resolveRouteAccess({}, route(pubId)).ok, true);
  }
  a.equal(nav.resolveRouteAccess({}, route('admin-conteudo-publico')).ok, false);

  window.PortalDevContext = {
    authenticated: true,
    act: {
      available: true,
      navigation: {
        schemaVersion: 'admin-navigation-hints-v1',
        validUntil: Date.now() + 60000,
        routes: {'admin-conteudo-publico': false}
      }
    }
  };
  a.equal(nav.resolveRouteAccess({}, route('admin-conteudo-publico')).ok, false);

  window.PortalDevContext.act.navigation.routes['admin-conteudo-publico'] = true;
  a.equal(nav.resolveRouteAccess({}, route('admin-conteudo-publico')).ok, true);

  window.PortalDevContext.act.navigation.validUntil = Date.now() - 1;
  a.equal(nav.resolveRouteAccess({}, route('admin-conteudo-publico')).ok, false);

  const appSource = fs.readFileSync(p.resolve(__dirname, '../src/session/app.mjs'), 'utf8');
  a(appSource.includes("requested!=='admin-conteudo-publico'"));
});

test('DEV and PROD HTML preserve Home fixed layout, include editorial scripts, and restrict img-src CSP', () => {
  const fs = require('fs');
  const p = require('path');
  for (const rel of ['public/index.html', 'config/variants/dev/public/index.html', 'dist/prod/index.html', 'dist/dev/index.html']) {
    const html = fs.readFileSync(p.resolve(__dirname, '..', rel), 'utf8');
    a(html.includes("img-src 'self' data: https://firebasestorage.googleapis.com;"), rel);
    a(!html.includes("img-src 'self' data: https:;"), rel);
    a(html.includes('<section class="public-home-panel geapa-page" id="tela-inicio"'), rel);
    a(html.includes('data-route-target="login"'), rel);
    a(html.includes('data-route-target="processo-seletivo"'), rel);
    a(html.includes('class="public-home-grid"'), rel);
    a(html.includes('id="home-editorial-content"'), rel);
    a(html.includes('/assets/act-ui/public-pages.mjs'), rel);
    a(html.includes('/assets/act-ui/public-admin-editor.mjs'), rel);
  }
});
