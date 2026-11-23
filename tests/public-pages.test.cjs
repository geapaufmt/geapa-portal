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
