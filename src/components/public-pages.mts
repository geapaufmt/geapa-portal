import {esc,header,badge} from './design-system.mjs';

export const PUBLIC_SCHEMA_VERSION = 'geapa-public-v2.1';
export const PUBLIC_DOCUMENT_SCHEMA_VERSION = 'geapa-public-document-v1';
const ALLOWED_PAGE_IDS = ['home', 'about'];
const ALLOWED_SECTION_TYPES = ['TEXT', 'HERO', 'CTA', 'IMAGE_TEXT', 'DOCUMENT_LIST'];

export interface EditorialSection {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  text?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  order: number;
  published: boolean;
}

export interface PublicPage {
  id: string;
  schemaVersion: string;
  published: boolean;
  sanitized: boolean;
  revision: number;
  title: string;
  subtitle: string;
  sourceHash: string;
  sections: EditorialSection[];
}

export interface TimelineItem {
  id: string;
  schemaVersion: string;
  published: boolean;
  sanitized: boolean;
  year: number;
  date?: string;
  title: string;
  description: string;
  imageUrl?: string;
  order: number;
  revision: number;
  sourceHash: string;
}

export interface PublicDocumentItem {
  id: string;
  schemaVersion: string;
  published: boolean;
  sanitized: boolean;
  type: string;
  title: string;
  summary: string;
  status: string;
  year: number;
  publicUrl: string;
  order: number;
}

function sanitizeText(v: unknown, max = 8000): string {
  return String(v ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

function sanitizeUrl(v: unknown, imageOnly = false): string {
  const u = String(v ?? '').trim();
  if (/[\u0000-\u0020\u007f<>"'\\]/.test(u)) return '';
  if (!imageOnly && /^#\/[a-z0-9/-]+(?:\?[a-z0-9=&_-]+)?$/i.test(u)) return u;
  return /^https:\/\/[a-z0-9.-]+(?::443)?(?:[/?#]|$)/i.test(u) && !/^https:\/\/[^/]*@/i.test(u)
    ? u.slice(0, 2000)
    : '';
}

function sanitizeCivilDate(v: unknown): string {
  if (!v) return '';
  const text = String(v).trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoMatch) {
    const d = new Date(`${text}T12:00:00Z`);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text ? text : '';
  }
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (brMatch) {
    const iso = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    const d = new Date(`${iso}T12:00:00Z`);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : '';
  }
  return '';
}

export function parsePublicSection(raw: unknown): EditorialSection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('SECTION_INVALID');
  const record = raw as Record<string, unknown>;
  const type = String(record['type'] || 'TEXT');
  if (!ALLOWED_SECTION_TYPES.includes(type)) throw Error('SECTION_TYPE_UNSUPPORTED');
  if (record['published'] !== true) return null;
  const id = sanitizeText(record['id'], 100);
  if (!id) throw Error('SECTION_ID_REQUIRED');
  const order = Number(record['order']);
  if (!Number.isFinite(order)) throw Error('SECTION_ORDER_INVALID');

  return Object.freeze({
    id,
    type,
    title: sanitizeText(record['title'], 240),
    subtitle: sanitizeText(record['subtitle'], 600),
    text: type === 'DOCUMENT_LIST' ? '' : sanitizeText(record['text'], 8000),
    imageUrl: sanitizeUrl(record['imageUrl'], true),
    buttonText: sanitizeText(record['buttonText'], 100),
    buttonUrl: sanitizeUrl(record['buttonUrl'], false),
    order,
    published: true
  });
}

export function parsePublicPage(raw: unknown, expectedId?: string): PublicPage {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('PAGE_PAYLOAD_INVALID');
  const record = raw as Record<string, unknown>;
  if (expectedId && !ALLOWED_PAGE_IDS.includes(expectedId)) throw Error('PAGE_ID_NOT_PERMITTED');
  if (record['schemaVersion'] !== PUBLIC_SCHEMA_VERSION) throw Error('SCHEMA_VERSION_MISMATCH');
  if (record['published'] !== true || record['sanitized'] !== true) throw Error('PAGE_NOT_PUBLIC');
  const id = sanitizeText(record['id'], 80);
  if (expectedId && id !== expectedId) throw Error('PAGE_ID_MISMATCH');
  const sectionsRaw = record['sections'];
  if (!Array.isArray(sectionsRaw) || sectionsRaw.length > 30) throw Error('PAGE_SECTIONS_LIMIT');

  const sections = sectionsRaw
    .map(parsePublicSection)
    .filter((s): s is EditorialSection => s !== null)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  return Object.freeze({
    id,
    schemaVersion: PUBLIC_SCHEMA_VERSION,
    published: true,
    sanitized: true,
    revision: Number(record['revision'] || 0),
    title: sanitizeText(record['title'], 240),
    subtitle: sanitizeText(record['subtitle'], 600),
    sourceHash: sanitizeText(record['sourceHash'], 100),
    sections
  });
}

export function parseTimelineItem(raw: unknown): TimelineItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('TIMELINE_ITEM_INVALID');
  const record = raw as Record<string, unknown>;
  if (record['schemaVersion'] !== PUBLIC_SCHEMA_VERSION) throw Error('SCHEMA_VERSION_MISMATCH');
  if (record['published'] !== true || record['sanitized'] !== true) return null;
  const id = sanitizeText(record['id'], 100);
  if (!id) throw Error('TIMELINE_ID_REQUIRED');
  const year = Number(record['year']);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw Error('TIMELINE_YEAR_INVALID');
  const order = Number(record['order']);
  if (!Number.isFinite(order)) throw Error('TIMELINE_ORDER_INVALID');

  return Object.freeze({
    id,
    schemaVersion: PUBLIC_SCHEMA_VERSION,
    published: true,
    sanitized: true,
    year,
    date: sanitizeCivilDate(record['date']),
    title: sanitizeText(record['title'], 240),
    description: sanitizeText(record['description'], 8000),
    imageUrl: sanitizeUrl(record['imageUrl'], true),
    order,
    revision: Number(record['revision'] || 0),
    sourceHash: sanitizeText(record['sourceHash'], 100)
  });
}

export function parsePublicDocument(raw: unknown): PublicDocumentItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('PUBLIC_DOCUMENT_INVALID');
  const record = raw as Record<string, unknown>;
  if (record['schemaVersion'] !== PUBLIC_DOCUMENT_SCHEMA_VERSION) throw Error('SCHEMA_VERSION_MISMATCH');
  if (record['published'] !== true || record['sanitized'] !== true || record['status'] !== 'VIGENTE') return null;
  const id = sanitizeText(record['id'], 100);
  const publicUrl = sanitizeUrl(record['publicUrl'], true);
  if (!id || !publicUrl) return null;
  const year = Number(record['year']);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  const order = Number(record['order']);
  if (!Number.isFinite(order)) return null;

  return Object.freeze({
    id,
    schemaVersion: PUBLIC_DOCUMENT_SCHEMA_VERSION,
    published: true,
    sanitized: true,
    type: sanitizeText(record['type'], 100),
    title: sanitizeText(record['title'], 240),
    summary: sanitizeText(record['summary'], 2000),
    status: 'VIGENTE',
    year,
    publicUrl,
    order
  });
}

export function renderSectionHtml(s: EditorialSection): string {
  const isImage = Boolean(s.imageUrl && /^https:\/\//.test(s.imageUrl));
  const hasButton = Boolean(s.buttonText && s.buttonUrl);
  const buttonExternal = Boolean(s.buttonUrl && /^https:\/\//.test(s.buttonUrl));

  let body = '';
  if (s.title) body += `<h3>${esc(s.title)}</h3>`;
  if (s.subtitle) body += `<p class="geapa-record-subtitle">${esc(s.subtitle)}</p>`;
  if (s.text) body += `<p class="geapa-record-text">${esc(s.text)}</p>`;
  if (isImage) {
    body += `<div class="geapa-record-media"><img src="${esc(s.imageUrl)}" alt="${esc(s.title)}" loading="lazy" referrerpolicy="no-referrer"></div>`;
  }
  if (hasButton) {
    body += `<div class="geapa-record-actions"><a class="secondary-button" href="${esc(s.buttonUrl)}"${buttonExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(s.buttonText)}</a></div>`;
  }

  const typeClass = `geapa-section-${s.type.toLowerCase().replaceAll('_', '-')}`;
  return `<article class="geapa-record geapa-editorial-card ${typeClass}" data-section-id="${esc(s.id)}">${body}</article>`;
}

export function renderPublicPageHtml(page: PublicPage): string {
  const renderedSections = page.sections.map(renderSectionHtml).join('');
  return `<div class="geapa-public-page" data-public-page="${esc(page.id)}">${renderedSections || '<p>Nenhum conteúdo publicado nesta seção.</p>'}</div>`;
}

export function renderHomeEditorialHtml(page: PublicPage): string {
  const headerHtml = page.title
    ? `<header class="geapa-home-editorial-head"><h2>${esc(page.title)}</h2>${page.subtitle ? `<p>${esc(page.subtitle)}</p>` : ''}</header>`
    : '';
  return `<section class="geapa-home-editorial-section" aria-label="Destaques institucionais">${headerHtml}${renderPublicPageHtml(page)}</section>`;
}

export function renderTimelineHtml(items: TimelineItem[]): string {
  if (!items.length) {
    return '<p role="status">Nenhum marco institucional publicado na linha do tempo.</p>';
  }

  const cards = items.map(item => {
    const isImage = Boolean(item.imageUrl && /^https:\/\//.test(item.imageUrl));
    const dateFormatted = item.date ? `<small class="geapa-timeline-date">${esc(item.date)}</small>` : '';
    return `<article class="geapa-record geapa-timeline-card" data-timeline-id="${esc(item.id)}"><div class="geapa-timeline-badge">${badge(item.year, true)}${dateFormatted}</div><h3>${esc(item.title)}</h3><p class="geapa-record-text">${esc(item.description)}</p>${isImage ? `<div class="geapa-record-media"><img src="${esc(item.imageUrl)}" alt="${esc(item.title)}" loading="lazy" referrerpolicy="no-referrer"></div>` : ''}</article>`;
  }).join('');

  return `<div class="geapa-timeline-grid">${cards}</div>`;
}

export function renderPublicDocumentsHtml(items: PublicDocumentItem[]): string {
  if (!items.length) {
    return '<p role="status" class="geapa-public-empty">Nenhum documento normativo público vigente está disponível no momento.</p>';
  }

  const cards = items.map(item =>
    `<article class="geapa-record geapa-document-card" data-document-id="${esc(item.id)}"><div class="geapa-timeline-badge">${badge(item.status, true)}<small>${esc(item.type)} · ${esc(item.year)}</small></div><h3>${esc(item.title)}</h3>${item.summary ? `<p class="geapa-record-text">${esc(item.summary)}</p>` : ''}<div class="geapa-record-actions"><a class="secondary-button" href="${esc(item.publicUrl)}" target="_blank" rel="noopener noreferrer">Abrir documento público</a></div></article>`
  ).join('');

  return `<div class="geapa-record-grid">${cards}</div>`;
}

type Host = Window & {
  PortalGeapaNavigation?: {
    getRotaAtual: () => string;
  };
};

let generation = 0;
const route = (): string => (typeof window === 'undefined' ? '' : (window as Host).PortalGeapaNavigation?.getRotaAtual() || '');
const active = (): boolean => ['inicio', 'sobre', 'historia', 'normas'].includes(route());

async function load(): Promise<void> {
  const currentRoute = route();
  if (!active()) return;

  const epoch = ++generation;

  if (currentRoute === 'inicio') {
    const homeEl = document.getElementById('home-editorial-content');
    if (!homeEl) return;
    try {
      const url = '/assets/act-command/public-pages.mjs';
      const service = await import(url);
      const pageData: PublicPage | null = await service.readPublicPageOptional('home');
      if (epoch !== generation || route() !== 'inicio') return;
      if (!pageData || !pageData.sections.length) {
        homeEl.hidden = true;
        homeEl.replaceChildren();
        homeEl.removeAttribute('data-home-editorial-published');
        return;
      }
      homeEl.innerHTML = renderHomeEditorialHtml(pageData);
      homeEl.hidden = false;
      homeEl.dataset.homeEditorialPublished = 'true';
    } catch {
      if (epoch === generation && route() === 'inicio') {
        homeEl.hidden = true;
        homeEl.replaceChildren();
        homeEl.removeAttribute('data-home-editorial-published');
      }
    }
    return;
  }

  const el = document.getElementById('placeholder-content');
  if (!el) return;
  el.textContent = 'Consultando informações institucionais…';

  try {
    const url = '/assets/act-command/public-pages.mjs';
    const service = await import(url);

    if (currentRoute === 'sobre') {
      try {
        const pageData: PublicPage = await service.readPublicPage('about');
        if (epoch !== generation || route() !== 'sobre') return;

        el.innerHTML =
          header(
            pageData.title || 'Sobre o GEAPA',
            pageData.subtitle || 'Grupo de Estudos em Agroecologia e Produção Agroecológica da UFMT.',
            '<button type="button" data-public-refresh>Atualizar</button>',
            'sobre-heading',
            'Área Pública'
          ) +
          '<nav class="geapa-public-shortcuts" aria-label="Navegação rápida"><a href="#/historia">História / Linha do tempo</a> · <a href="#/eixos-tematicos">Eixos temáticos</a> · <a href="#/equipe">Equipe</a> · <a href="#/documentos">Documentos e normas</a></nav>' +
          renderPublicPageHtml(pageData);
      } catch (inner: unknown) {
        if (epoch !== generation || route() !== 'sobre') return;
        const code = (inner as {code?: string})?.code;
        if (code === 'PAGE_NOT_PUBLISHED') {
          el.innerHTML =
            header('Sobre o GEAPA', 'Grupo de Estudos em Agroecologia e Produção Agroecológica da UFMT.', '<button type="button" data-public-refresh>Atualizar</button>', 'sobre-heading', 'Área Pública') +
            '<nav class="geapa-public-shortcuts" aria-label="Navegação rápida"><a href="#/historia">História / Linha do tempo</a> · <a href="#/eixos-tematicos">Eixos temáticos</a> · <a href="#/equipe">Equipe</a> · <a href="#/documentos">Documentos e normas</a></nav>' +
            '<p role="status" class="geapa-public-empty">Conteúdo institucional ainda não publicado nesta seção.</p>';
          return;
        }
        throw inner;
      }
    } else if (currentRoute === 'historia') {
      const timelineItems: TimelineItem[] = await service.readPublicTimeline();
      if (epoch !== generation || route() !== 'historia') return;

      el.innerHTML =
        header(
          'História e Linha do Tempo',
          'Conheça a trajetória e os principais marcos históricos do GEAPA.',
          '<button type="button" data-public-refresh>Atualizar</button>',
          'historia-heading',
          'Área Pública'
        ) +
        renderTimelineHtml(timelineItems);
    } else if (currentRoute === 'normas') {
      const documents: PublicDocumentItem[] = await service.readPublicDocuments();
      if (epoch !== generation || route() !== 'normas') return;

      el.innerHTML =
        header(
          'Documentos e normas',
          'Instrumentos normativos e documentos públicos vigentes do GEAPA.',
          '<button type="button" data-public-refresh>Atualizar</button>',
          'normas-heading',
          'Área Pública'
        ) +
        '<p class="geapa-board-notice">Somente instrumentos públicos vigentes publicados oficialmente aparecem nesta página.</p>' +
        renderPublicDocumentsHtml(documents);
    }
  } catch {
    if (epoch === generation && active()) {
      el.innerHTML =
        '<p role="alert">Conteúdo institucional temporariamente indisponível. Você pode continuar navegando pelo Portal.</p>' +
        '<button type="button" class="secondary-button" data-public-refresh>Tentar novamente</button>';
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('portal:navigationchange', () => {
    generation++;
    if (active()) void load();
  });

  document.addEventListener('portal:public-content-updated', () => {
    generation++;
    if (active()) void load();
  });

  document.addEventListener('click', e => {
    if (!active() || !(e.target instanceof Element)) return;
    if (e.target.closest('[data-public-refresh]')) {
      void load();
    }
  });

  if (active()) void load();
}
