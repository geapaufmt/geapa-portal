import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {initializeFirestore,doc,getDocFromServer,collection,query,where,limit,getDocsFromServer} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {loadConfig,PROJECT} from '../physical-560120e5c1fbb33e/config.mjs';
import {devAppCheck} from './dev-app-check.mjs';
import {specializedReadersConfig} from './specialized-readers-config.mjs';

export const PUBLIC_SCHEMA_VERSION = 'geapa-public-v2.1';
export const PUBLIC_DOCUMENT_SCHEMA_VERSION = 'geapa-public-document-v1';
const ALLOWED_PAGE_IDS = ['home', 'about'];
const ALLOWED_SECTION_TYPES = ['TEXT', 'HERO', 'CTA', 'IMAGE_TEXT', 'DOCUMENT_LIST'];

function sanitizeText(v, max = 8000) {
  return String(v ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

function sanitizeUrl(v, imageOnly = false) {
  const u = String(v ?? '').trim();
  if (/[\u0000-\u0020\u007f<>"'\\]/.test(u)) return '';
  if (!imageOnly && /^#\/[a-z0-9/-]+(?:\?[a-z0-9=&_-]+)?$/i.test(u)) return u;
  return /^https:\/\/[a-z0-9.-]+(?::443)?(?:[/?#]|$)/i.test(u) && !/^https:\/\/[^/]*@/i.test(u)
    ? u.slice(0, 2000) : '';
}

function sanitizeCivilDate(v) {
  if (!v) return '';
  const text = String(v).trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    if (br) match = [text, br[3], br[2], br[1]];
  }
  if (!match) return '';
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : '';
}

export function normalizePublicSection(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('SECTION_INVALID');
  const type = String(raw.type || 'TEXT');
  if (!ALLOWED_SECTION_TYPES.includes(type)) throw Error('SECTION_TYPE_UNSUPPORTED');
  if (raw.published !== true) return null;
  const id = sanitizeText(raw.id, 100);
  if (!id) throw Error('SECTION_ID_REQUIRED');
  const order = Number(raw.order);
  if (!Number.isFinite(order)) throw Error('SECTION_ORDER_INVALID');

  return Object.freeze({
    id,
    type,
    title: sanitizeText(raw.title, 240),
    subtitle: sanitizeText(raw.subtitle, 600),
    text: type === 'DOCUMENT_LIST' ? '' : sanitizeText(raw.text, 8000),
    imageUrl: sanitizeUrl(raw.imageUrl, true),
    buttonText: sanitizeText(raw.buttonText, 100),
    buttonUrl: sanitizeUrl(raw.buttonUrl, false),
    order,
    published: true
  });
}

export function normalizePublicPage(raw, expectedId) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('PAGE_PAYLOAD_INVALID');
  if (expectedId && !ALLOWED_PAGE_IDS.includes(expectedId)) throw Error('PAGE_ID_NOT_PERMITTED');
  if (raw.schemaVersion !== PUBLIC_SCHEMA_VERSION) throw Error('SCHEMA_VERSION_MISMATCH');
  if (raw.published !== true || raw.sanitized !== true) throw Error('PAGE_NOT_PUBLIC');
  const id = sanitizeText(recordId(raw), 80);
  if (expectedId && id !== expectedId) throw Error('PAGE_ID_MISMATCH');
  if (!Array.isArray(raw.sections) || raw.sections.length > 30) throw Error('PAGE_SECTIONS_LIMIT');

  const sections = raw.sections
    .map(normalizePublicSection)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  return Object.freeze({
    id,
    schemaVersion: PUBLIC_SCHEMA_VERSION,
    published: true,
    sanitized: true,
    revision: Number(raw.revision || 0),
    title: sanitizeText(raw.title, 240),
    subtitle: sanitizeText(raw.subtitle, 600),
    sourceHash: sanitizeText(raw.sourceHash, 100),
    sections
  });
}

function recordId(raw) {
  return raw.id;
}

export function normalizeTimelineItem(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('TIMELINE_ITEM_INVALID');
  if (raw.schemaVersion !== PUBLIC_SCHEMA_VERSION) throw Error('SCHEMA_VERSION_MISMATCH');
  if (raw.published !== true || raw.sanitized !== true) return null;
  const id = sanitizeText(raw.id, 100);
  if (!id) throw Error('TIMELINE_ID_REQUIRED');
  const year = Number(raw.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw Error('TIMELINE_YEAR_INVALID');
  const order = Number(raw.order);
  if (!Number.isFinite(order)) throw Error('TIMELINE_ORDER_INVALID');

  return Object.freeze({
    id,
    schemaVersion: PUBLIC_SCHEMA_VERSION,
    published: true,
    sanitized: true,
    year,
    date: sanitizeCivilDate(raw.date),
    title: sanitizeText(raw.title, 240),
    description: sanitizeText(raw.description, 8000),
    imageUrl: sanitizeUrl(raw.imageUrl, true),
    order,
    revision: Number(raw.revision || 0),
    sourceHash: sanitizeText(raw.sourceHash, 100)
  });
}

export function normalizePublicDocument(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('PUBLIC_DOCUMENT_INVALID');
  if (raw.schemaVersion !== PUBLIC_DOCUMENT_SCHEMA_VERSION) throw Error('SCHEMA_VERSION_MISMATCH');
  if (raw.published !== true || raw.sanitized !== true || raw.status !== 'VIGENTE') return null;
  const id = sanitizeText(raw.id, 100);
  const publicUrl = sanitizeUrl(raw.publicUrl, true);
  if (!id || !publicUrl) return null;
  const year = Number(raw.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  const order = Number(raw.order);
  if (!Number.isFinite(order)) return null;

  return Object.freeze({
    id,
    schemaVersion: PUBLIC_DOCUMENT_SCHEMA_VERSION,
    published: true,
    sanitized: true,
    type: sanitizeText(raw.type, 100),
    title: sanitizeText(raw.title, 240),
    summary: sanitizeText(raw.summary, 2000),
    status: 'VIGENTE',
    year,
    publicUrl,
    order
  });
}

export function createPublicPagesReader({db, sdk}) {
  if (!db || !sdk) throw Error('READER_DEPENDENCIES_REQUIRED');
  return Object.freeze({
    async getPage(id) {
      if (!ALLOWED_PAGE_IDS.includes(id)) throw Error('PAGE_NOT_FOUND');
      const snap = await sdk.getDocFromServer(sdk.doc(db, 'publicPages/' + id));
      if (!snap.exists()) {
        const err = Error('Conteúdo da página ainda não publicado.');
        err.code = 'PAGE_NOT_PUBLISHED';
        throw err;
      }
      return normalizePublicPage(snap.data(), id);
    },
    async getPageOptional(id) {
      if (!ALLOWED_PAGE_IDS.includes(id)) throw Error('PAGE_NOT_FOUND');
      const snap = await sdk.getDocFromServer(sdk.doc(db, 'publicPages/' + id));
      if (!snap.exists()) return null;
      return normalizePublicPage(snap.data(), id);
    },
    async getTimeline() {
      const q = sdk.query(
        sdk.collection(db, 'publicTimeline'),
        sdk.where('published', '==', true),
        sdk.where('sanitized', '==', true),
        sdk.where('schemaVersion', '==', PUBLIC_SCHEMA_VERSION),
        sdk.limit(101)
      );
      const snap = await sdk.getDocsFromServer(q);
      if (snap.size > 100) throw Error('TIMELINE_LIMIT_EXCEEDED');
      return snap.docs
        .map(d => normalizeTimelineItem(d.data()))
        .filter(Boolean)
        .sort((a, b) => a.order - b.order || a.year - b.year || a.id.localeCompare(b.id));
    },
    async getDocuments() {
      const q = sdk.query(
        sdk.collection(db, 'publicDocuments'),
        sdk.where('published', '==', true),
        sdk.where('sanitized', '==', true),
        sdk.where('schemaVersion', '==', PUBLIC_DOCUMENT_SCHEMA_VERSION),
        sdk.where('status', '==', 'VIGENTE'),
        sdk.limit(101)
      );
      const snap = await sdk.getDocsFromServer(q);
      if (snap.size > 100) throw Error('DOCUMENTS_LIMIT_EXCEEDED');
      return snap.docs
        .map(d => normalizePublicDocument(d.data()))
        .filter(Boolean)
        .sort((a, b) => a.order - b.order || b.year - a.year || a.id.localeCompare(b.id));
    }
  });
}

let readyReader;
async function getReader() {
  return readyReader ??= (async () => {
    const config = await loadConfig();
    if (config.projectId !== PROJECT) throw Error('DESTINATION_INVALID');
    const app = getApps().find(a => a.name === 'GEAPA_PUBLIC_PAGES') || initializeApp(config, 'GEAPA_PUBLIC_PAGES');
    await devAppCheck(app, specializedReadersConfig.siteKey);
    const db = initializeFirestore(app, {experimentalForceLongPolling: true});
    return createPublicPagesReader({
      db,
      sdk: {doc, getDocFromServer, collection, query, where, limit, getDocsFromServer}
    });
  })().catch(e => {
    readyReader = null;
    throw e;
  });
}

export async function readPublicPage(pageId) {
  const reader = await getReader();
  return reader.getPage(pageId);
}

export async function readPublicPageOptional(pageId) {
  const reader = await getReader();
  return reader.getPageOptional(pageId);
}

export async function readPublicTimeline() {
  const reader = await getReader();
  return reader.getTimeline();
}

export async function readPublicDocuments() {
  const reader = await getReader();
  return reader.getDocuments();
}
