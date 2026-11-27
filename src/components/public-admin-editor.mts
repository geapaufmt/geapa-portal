import {esc,header} from './design-system.mjs';
import {
  PUBLIC_SCHEMA_VERSION,
  parsePublicPage,
  parseTimelineItem,
  renderPublicPageHtml,
  renderHomeEditorialHtml,
  renderTimelineHtml,
  type EditorialSection
} from './public-pages.mjs';

export type PageId = 'home' | 'about';
export type EditorTab = 'home' | 'about' | 'timeline' | 'history';

export interface CanonicalPageRecord {
  schemaVersion: string;
  id: PageId;
  revision: number;
  draftRevision: number;
  publishedRevision: number;
  hasDraft: boolean;
  published: boolean;
  draft: { title: string; subtitle: string; sections: EditorialSection[]; sourceHash?: string } | null;
  publishedSnapshot: { title: string; subtitle: string; sections: EditorialSection[]; sourceHash?: string } | null;
  updatedAt: number | null;
  updatedByPersonId: string | null;
}

export interface CanonicalTimelineRecord {
  schemaVersion: string;
  id: string;
  revision: number;
  draftRevision: number;
  publishedRevision: number;
  hasDraft: boolean;
  published: boolean;
  draft: { year: number; date: string; title: string; description: string; imageUrl: string; order: number } | null;
  publishedSnapshot: { year: number; date: string; title: string; description: string; imageUrl: string; order: number } | null;
  updatedAt: number | null;
  updatedByPersonId: string | null;
}

export interface EditorialHistoryEvent {
  operationId: string;
  action: string;
  targetId: string;
  revisionBefore: number;
  revisionAfter: number;
  actorPersonId: string;
  actorUid: string;
  at: number;
  summary: string;
  snapshotHash: string;
  snapshot?: unknown;
}

export interface EditorialAdminView {
  schemaVersion: 'editorial-admin-view-v1';
  controlRevision: number;
  epoch: number;
  canManagePages: boolean;
  canManageTimeline: boolean;
  pages: Partial<Record<PageId, CanonicalPageRecord>>;
  timeline: { revision: number; items: CanonicalTimelineRecord[] };
  history: {
    home: EditorialHistoryEvent[];
    about: EditorialHistoryEvent[];
    timeline: EditorialHistoryEvent[];
  };
  validUntil: number;
}

type EditablePageDraft = {
  title: string;
  subtitle: string;
  sections: EditorialSection[];
};

type EditableTimelineDraft = {
  id: string | null;
  year: number;
  date: string;
  title: string;
  description: string;
  imageUrl: string;
  order: number;
};

type Host = Window & {
  PortalGeapaNavigation?: {
    getRotaAtual: () => string;
    getRequestedRoute?: () => string;
  };
  PortalGeapaApi?: {
    apiGet: (route: string, params: Record<string, unknown>) => Promise<{ ok: boolean; data?: EditorialAdminView; code?: string; errorCode?: string; message?: string }>;
    apiPost: (route: string, params: { payload: string }) => Promise<{ ok: boolean; data?: any; code?: string; errorCode?: string; message?: string }>;
  };
  PortalDevContext?: {
    authenticated?: boolean;
    accessPending?: boolean;
    act?: {
      available?: boolean;
      validUntil?: number;
      navigation?: { routes?: Record<string, boolean>; validUntil?: number };
    };
  };
  PortalPublicAdmin?: {
    isEnabled: () => boolean;
    getAccessStatus: () => string;
    renderAccessGate: (target: HTMLElement | null) => void;
  };
};

const ROUTE_ID = 'admin-conteudo-publico';
const PAGE_TYPES: Record<PageId, string[]> = {
  home: ['HERO', 'TEXT', 'CTA', 'IMAGE_TEXT'],
  about: ['HERO', 'TEXT', 'IMAGE_TEXT', 'CTA']
};
const SECTION_LABELS: Record<string, string> = {
  TEXT: 'Texto editorial',
  HERO: 'Destaque inicial',
  CTA: 'Chamada para ação',
  IMAGE_TEXT: 'Imagem e texto',
  DOCUMENT_LIST: 'Lista automática de documentos'
};
const ACTION_LABELS: Record<string, string> = {
  PAGE_SAVE_DRAFT: 'Rascunho salvo',
  PAGE_PUBLISH: 'Publicado',
  PAGE_UNPUBLISH: 'Despublicado',
  TIMELINE_SAVE_DRAFT: 'Marco salvo em rascunho',
  TIMELINE_PUBLISH: 'Marco publicado',
  TIMELINE_UNPUBLISH: 'Marco despublicado',
  TIMELINE_REORDER: 'Linha do tempo reordenada'
};

interface EditorState {
  tab: EditorTab;
  view: EditorialAdminView | null;
  pageDraft: EditablePageDraft | null;
  timelineItems: CanonicalTimelineRecord[];
  timelineDraft: EditableTimelineDraft | null;
  selectedTimelineRevision: number;
  dirty: boolean;
  orderDirty: boolean;
  busy: boolean;
  loading: boolean;
  needsRecovery: boolean;
  message: string;
  messageKind: 'status' | 'alert';
  previewHtml: string;
  previewTitle: string;
  generation: number;
}

const state: EditorState = {
  tab: 'home',
  view: null,
  pageDraft: null,
  timelineItems: [],
  timelineDraft: null,
  selectedTimelineRevision: 0,
  dirty: false,
  orderDirty: false,
  busy: false,
  loading: false,
  needsRecovery: false,
  message: '',
  messageKind: 'status',
  previewHtml: '',
  previewTitle: '',
  generation: 0
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const active = (): boolean => typeof window !== 'undefined' && (window as Host).PortalGeapaNavigation?.getRotaAtual() === ROUTE_ID;
const root = (): HTMLElement | null => (typeof document === 'undefined' ? null : document.getElementById('public-admin-content'));

function getAccessStatus(): string {
  const ctx = (window as Host).PortalDevContext;
  if (!ctx?.authenticated) return 'SIGNED_OUT';
  if (ctx.accessPending || !ctx.act) return 'CHECKING';
  const nav = ctx.act.navigation;
  if (ctx.act.available && nav?.routes?.[ROUTE_ID] === true && (nav.validUntil || 0) > Date.now()) {
    return 'ALLOWED';
  }
  return 'DENIED';
}

function renderAccessGate(target: HTMLElement | null): void {
  if (!target) return;
  const status = getAccessStatus();
  const pending = status === 'CHECKING' || status === 'ALLOWED';
  const login = status === 'SIGNED_OUT';
  const msg = pending
    ? 'Verificando autorização editorial no Core…'
    : login
      ? 'Entre no Portal para acessar a gestão editorial de conteúdo público.'
      : 'Seu acesso atual não habilita a gestão editorial de conteúdo público.';
  target.innerHTML =
    `<div data-public-editor-access="${esc(status)}"><p class="eyebrow">Gestão · Conteúdo Público</p>` +
    `<h2>Conteúdo Público</h2><p class="intro" role="status" aria-live="polite">${esc(msg)}</p>` +
    (login ? '<button class="secondary-button" type="button" data-route-target="login">Entrar no Portal</button>' : '') +
    '<button class="secondary-button" type="button" data-route-target="inicio">Ir para o início</button></div>';
}

function defaultPageDraft(pageId: PageId): EditablePageDraft {
  return {
    title: pageId === 'home' ? 'Destaques do GEAPA' : 'Sobre o GEAPA',
    subtitle: pageId === 'home' ? 'Atividades, estudos e projetos em agroecologia.' : 'Grupo de Estudos em Agroecologia e Produção Agroecológica da UFMT.',
    sections: [
      {
        id: 'sec_principal',
        type: 'HERO',
        title: pageId === 'home' ? 'Bem-vindo ao GEAPA' : 'Quem somos',
        subtitle: '',
        text: 'Conteúdo editorial em preparação.',
        imageUrl: '',
        buttonText: 'Conheça os eixos temáticos',
        buttonUrl: '#/eixos-tematicos',
        order: 1,
        published: true
      }
    ]
  };
}

function syncDraftFromView(tab: EditorTab): void {
  state.dirty = false;
  state.orderDirty = false;
  state.previewHtml = '';
  state.previewTitle = '';
  if (!state.view) {
    state.pageDraft = null;
    state.timelineItems = [];
    state.timelineDraft = null;
    return;
  }
  if (tab === 'home' || tab === 'about') {
    const rec = state.view.pages[tab];
    const source = rec?.draft || rec?.publishedSnapshot;
    state.pageDraft = source
      ? clone({ title: source.title, subtitle: source.subtitle || '', sections: source.sections || [] })
      : defaultPageDraft(tab);
    state.timelineDraft = null;
  } else if (tab === 'timeline') {
    state.pageDraft = null;
    state.timelineItems = clone(state.view.timeline.items || []);
    if (state.timelineDraft?.id) {
      const match = state.timelineItems.find(i => i.id === state.timelineDraft?.id);
      if (match) {
        selectTimelineRecord(match);
      } else {
        state.timelineDraft = null;
      }
    }
  } else {
    state.pageDraft = null;
    state.timelineDraft = null;
  }
}

function selectTimelineRecord(rec: CanonicalTimelineRecord): void {
  const src = rec.draft || rec.publishedSnapshot;
  state.selectedTimelineRevision = rec.revision;
  state.timelineDraft = src
    ? {
        id: rec.id,
        year: src.year,
        date: src.date || '',
        title: src.title,
        description: src.description,
        imageUrl: src.imageUrl || '',
        order: src.order
      }
    : { id: rec.id, year: new Date().getFullYear(), date: '', title: '', description: '', imageUrl: '', order: 1 };
  state.dirty = false;
  state.previewHtml = '';
  state.previewTitle = '';
}

function renderSectionEditor(s: EditorialSection, index: number, total: number, pageId: PageId): string {
  const prefix = `sections.${index}.`;
  const types = PAGE_TYPES[pageId];
  return (
    `<article class="editor-section" data-section-index="${index}">` +
    `<header><h3>Bloco ${index + 1}</h3><div class="editor-actions">` +
    `<button type="button" data-editor-action="section-up" data-index="${index}" ${index === 0 || state.busy ? 'disabled' : ''}>Subir</button>` +
    `<button type="button" data-editor-action="section-down" data-index="${index}" ${index >= total - 1 || state.busy ? 'disabled' : ''}>Descer</button>` +
    `<button type="button" data-editor-action="section-remove" data-index="${index}" ${total <= 1 || state.busy ? 'disabled' : ''}>Remover</button>` +
    `</div></header>` +
    `<div class="editor-grid">` +
    `<label>Formato<select data-field="${prefix}type">${types.map(t => `<option value="${esc(t)}"${s.type === t ? ' selected' : ''}>${esc(SECTION_LABELS[t] || t)}</option>`).join('')}</select></label>` +
    `<label class="editor-check"><input type="checkbox" data-field="${prefix}published"${s.published ? ' checked' : ''}> Incluir ao publicar</label>` +
    `<label>Título<input type="text" maxlength="240" data-field="${prefix}title" value="${esc(s.title)}"></label>` +
    `<label>Subtítulo<input type="text" maxlength="600" data-field="${prefix}subtitle" value="${esc(s.subtitle || '')}"></label>` +
    `</div>` +
    `<label>Texto<textarea rows="4" maxlength="8000" data-field="${prefix}text">${esc(s.text || '')}</textarea></label>` +
    `<label>Link HTTPS da imagem<input type="url" maxlength="2000" placeholder="https://firebasestorage.googleapis.com/..." data-field="${prefix}imageUrl" value="${esc(s.imageUrl || '')}"></label>` +
    `<div class="editor-grid">` +
    `<label>Texto do botão<input type="text" maxlength="100" data-field="${prefix}buttonText" value="${esc(s.buttonText || '')}"></label>` +
    `<label>Destino do botão (HTTPS ou #/rota)<input type="text" maxlength="2000" placeholder="#/eixos-tematicos ou https://..." data-field="${prefix}buttonUrl" value="${esc(s.buttonUrl || '')}"></label>` +
    `</div></article>`
  );
}

function renderPageEditor(pageId: PageId): string {
  const rec = state.view?.pages[pageId];
  const draft = state.pageDraft;
  if (!draft) return '';
  const hasSavedSource = !!(rec && (rec.revision > 0 || rec.hasDraft || rec.publishedSnapshot));
  const isPublished = rec?.published === true;
  const revLabel = rec ? `revisão ${rec.revision}` : 'revisão 0';
  const statusSummary = `${isPublished ? 'Publicado' : 'Não publicado'} · ${revLabel}${rec?.hasDraft ? ' · rascunho privado salvo' : ''}`;
  const layoutNotice = pageId === 'home'
    ? 'A identidade visual fixa do Portal (título principal, botões de entrada/ingresso e cartões de acesso rápido) permanece preservada. Os blocos editados abaixo são exibidos como destaques editoriais públicos quando publicados.'
    : 'Edite os blocos institucionais de apresentação do GEAPA. Equipe, Eixos Temáticos e Documentos/Normas mantêm fontes oficiais próprias e não são duplicados aqui.';

  return (
    `<div class="editor-status" role="status">${esc(statusSummary)}</div>` +
    `<p class="geapa-board-notice">${esc(layoutNotice)}</p>` +
    `<form id="public-editor-form" data-geapa-protect-draft data-geapa-dirty="${state.dirty ? 'true' : 'false'}">` +
    `<fieldset${state.busy ? ' disabled' : ''}>` +
    `<label>Título editorial<input type="text" maxlength="240" required data-field="title" value="${esc(draft.title)}"></label>` +
    `<label>Subtítulo editorial<textarea rows="2" maxlength="600" data-field="subtitle">${esc(draft.subtitle)}</textarea></label>` +
    draft.sections.map((s, i) => renderSectionEditor(s, i, draft.sections.length, pageId)).join('') +
    `<div class="editor-actions"><button type="button" data-editor-action="section-add" ${draft.sections.length >= 30 || state.busy ? 'disabled' : ''}>Adicionar bloco</button></div>` +
    `</fieldset>` +
    `<div class="editor-actions editor-toolbar">` +
    `<button type="submit" data-editor-action="save" ${state.busy ? 'disabled' : ''}>Salvar rascunho</button>` +
    `<button type="button" data-editor-action="preview" ${state.dirty || !hasSavedSource || state.busy ? 'disabled' : ''}>Pré-visualizar rascunho</button>` +
    `<button type="button" data-editor-action="publish" ${state.dirty || !hasSavedSource || state.busy ? 'disabled' : ''}>Publicar</button>` +
    `<button type="button" data-editor-action="unpublish" ${state.dirty || !isPublished || state.busy ? 'disabled' : ''}>Despublicar</button>` +
    `<button type="button" data-editor-action="verify" ${state.busy ? 'disabled' : ''}>Conferir página pública</button>` +
    `<button type="button" data-editor-action="reload" ${state.busy ? 'disabled' : ''}>Recarregar</button>` +
    `</div>` +
    `<p class="editor-dirty" role="status">${state.dirty ? 'Há alterações locais não salvas. Salve o rascunho antes de pré-visualizar ou publicar.' : 'Rascunho privado e publicação pública são mantidos separadamente no Core.'}</p>` +
    `</form>`
  );
}

function renderTimelineEditor(): string {
  const items = state.timelineItems;
  const listHtml =
    `<div class="editor-actions">` +
    `<button type="button" data-editor-action="timeline-new" ${state.busy ? 'disabled' : ''}>Novo marco histórico</button>` +
    `<button type="button" data-editor-action="timeline-reorder" ${state.dirty || !state.orderDirty || state.busy ? 'disabled' : ''}>Salvar e publicar ordem</button>` +
    `<button type="button" data-editor-action="verify" ${state.busy ? 'disabled' : ''}>Conferir linha do tempo pública</button>` +
    `<button type="button" data-editor-action="reload" ${state.busy ? 'disabled' : ''}>Recarregar</button>` +
    `</div>` +
    (items.length
      ? items.map((item, idx) => {
          const data = item.draft || item.publishedSnapshot;
          return (
            `<article class="editor-timeline-row" data-timeline-row="${esc(item.id)}">` +
            `<div><strong>${esc(data?.year ?? '')} · ${esc(data?.title || item.id)}</strong>` +
            `<p>${item.published ? 'Publicado' : 'Rascunho privado'}${item.hasDraft && item.published ? ' (alteração pendente)' : ''} · revisão ${item.revision}</p></div>` +
            `<div class="editor-actions">` +
            `<button type="button" data-editor-action="timeline-edit" data-id="${esc(item.id)}" ${state.busy ? 'disabled' : ''}>Editar</button>` +
            `<button type="button" data-editor-action="timeline-up" data-index="${idx}" ${idx === 0 || state.busy ? 'disabled' : ''}>Subir</button>` +
            `<button type="button" data-editor-action="timeline-down" data-index="${idx}" ${idx >= items.length - 1 || state.busy ? 'disabled' : ''}>Descer</button>` +
            `</div></article>`
          );
        }).join('')
      : '<p>Nenhum marco histórico cadastrado ainda. Clique em "Novo marco histórico" para iniciar.</p>');

  const d = state.timelineDraft;
  if (!d) return listHtml;
  const rec = d.id ? items.find(i => i.id === d.id) : null;
  const isNew = !rec;
  const isPublished = rec?.published === true;
  const formHtml =
    `<hr><div class="editor-status" role="status">${isNew ? 'Novo marco histórico (ainda não salvo)' : `${isPublished ? 'Publicado' : 'Não publicado'} · revisão ${rec.revision}${rec.hasDraft ? ' · rascunho salvo' : ''}`}</div>` +
    `<form id="public-editor-form" data-geapa-protect-draft data-geapa-dirty="${state.dirty ? 'true' : 'false'}">` +
    `<fieldset${state.busy ? ' disabled' : ''}>` +
    `<div class="editor-grid">` +
    `<label>Ano (1900–2200)<input type="number" min="1900" max="2200" step="1" required data-tfield="year" value="${esc(d.year)}"></label>` +
    `<label>Data civil (opcional)<input type="date" data-tfield="date" value="${esc(d.date)}"></label>` +
    `</div>` +
    `<label>Título do marco<input type="text" maxlength="240" required data-tfield="title" value="${esc(d.title)}"></label>` +
    `<label>Descrição<textarea rows="4" maxlength="8000" required data-tfield="description">${esc(d.description)}</textarea></label>` +
    `<div class="editor-grid">` +
    `<label>Link HTTPS da imagem<input type="url" maxlength="2000" placeholder="https://firebasestorage.googleapis.com/..." data-tfield="imageUrl" value="${esc(d.imageUrl)}"></label>` +
    `<label>Ordem<input type="number" min="0" max="10000" step="1" data-tfield="order" value="${esc(d.order)}"></label>` +
    `</div></fieldset>` +
    `<div class="editor-actions editor-toolbar">` +
    `<button type="submit" data-editor-action="save" ${state.busy ? 'disabled' : ''}>${isNew ? 'Criar rascunho' : 'Salvar rascunho'}</button>` +
    `<button type="button" data-editor-action="preview" ${state.dirty || isNew || state.busy ? 'disabled' : ''}>Pré-visualizar rascunho</button>` +
    `<button type="button" data-editor-action="publish" ${state.dirty || isNew || state.busy ? 'disabled' : ''}>Publicar</button>` +
    `<button type="button" data-editor-action="unpublish" ${state.dirty || !isPublished || state.busy ? 'disabled' : ''}>Despublicar</button>` +
    `</div>` +
    `<p class="editor-dirty" role="status">${state.dirty ? 'Há alterações locais não salvas. Salve o rascunho antes de pré-visualizar ou publicar.' : 'Alterações em marcos permanecem privadas até você clicar em Publicar.'}</p>` +
    `</form>`;
  return listHtml + formHtml;
}

function renderHistoryTab(): string {
  const h = state.view?.history;
  if (!h) return '<p>Nenhum histórico carregado.</p>';
  const groups: [string, EditorialHistoryEvent[]][] = [
    ['Página Início', h.home || []],
    ['Página Sobre o GEAPA', h.about || []],
    ['Linha do Tempo (História)', h.timeline || []]
  ];
  return groups.map(([label, events]) =>
    `<section class="editor-section"><h3>${esc(label)}</h3>` +
    (events.length
      ? events.map(ev => {
          const when = ev.at ? new Date(ev.at).toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' }) : '—';
          return (
            `<article class="editor-timeline-row">` +
            `<div><strong>${esc(ACTION_LABELS[ev.action] || ev.action)}</strong> · revisão ${ev.revisionBefore} → ${ev.revisionAfter}` +
            `<p>${esc(ev.summary)}</p>` +
            `<small>Responsável: ${esc(ev.actorPersonId)} · Em: ${esc(when)} · Operação: ${esc(ev.operationId)}</small>` +
            (ev.snapshot ? `<details><summary>Snapshot da versão</summary><pre>${esc(JSON.stringify(ev.snapshot, null, 2))}</pre></details>` : '') +
            `</div></article>`
          );
        }).join('')
      : '<p>Nenhuma operação registrada até o momento.</p>') +
    `</section>`
  ).join('');
}

export function renderEditorialShell(): string {
  if (!state.view && state.loading) {
    return header('Gestão Editorial', 'Conteúdo Público', '', '', 'Gestão do GEAPA') + '<p role="status">Carregando dados editoriais do Core…</p>';
  }
  const tabs: [EditorTab, string, boolean][] = [
    ['home', 'Início', !!state.view?.canManagePages],
    ['about', 'Sobre o GEAPA', !!state.view?.canManagePages],
    ['timeline', 'História / Linha do tempo', !!state.view?.canManageTimeline],
    ['history', 'Histórico de versões', true]
  ];
  const visibleTabs = tabs.filter(t => t[2]);
  if (visibleTabs.length && !visibleTabs.some(t => t[0] === state.tab)) {
    state.tab = visibleTabs[0]![0];
  }

  let body = '';
  if (state.view) {
    if (state.tab === 'home' || state.tab === 'about') body = renderPageEditor(state.tab);
    else if (state.tab === 'timeline') body = renderTimelineEditor();
    else body = renderHistoryTab();
  }

  return (
    header('Gestão Editorial', 'Início, Sobre o GEAPA e Linha do Tempo. Rascunhos ficam privados até publicação autorizada.', '<button type="button" data-editor-action="recover">Verificar último envio</button>', '', 'Gestão do GEAPA') +
    `<nav class="editor-tabs" aria-label="Seções editoriais">${visibleTabs.map(([id, label]) =>
      `<button type="button" data-editor-tab="${esc(id)}" aria-current="${state.tab === id ? 'page' : 'false'}"${state.busy ? ' disabled' : ''}>${esc(label)}</button>`
    ).join('')}</nav>` +
    `<p class="editor-message" role="${state.messageKind}" aria-live="polite">${esc(state.message)}</p>` +
    (state.needsRecovery ? `<div class="editor-reconciliation"><button type="button" data-editor-action="recover" ${state.busy ? 'disabled' : ''}>Recuperar operação anterior</button></div>` : '') +
    body +
    `<section class="editor-preview" id="public-editor-preview" aria-label="Pré-visualização privada"${state.previewHtml ? '' : ' hidden'}>` +
    (state.previewHtml ? `<h2>${esc(state.previewTitle)}</h2>${state.previewHtml}` : '') +
    `</section>`
  );
}

function render(): void {
  const target = root();
  if (!target || !active()) return;
  const status = getAccessStatus();
  if (status !== 'ALLOWED') {
    renderAccessGate(target);
    return;
  }
  target.innerHTML = renderEditorialShell();
}

function setMessage(message: string, kind: 'status' | 'alert' = 'status'): void {
  state.message = message;
  state.messageKind = kind;
}

function confirmDiscard(): boolean {
  if (!state.dirty && !state.orderDirty) return true;
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm('Descartar alterações locais ainda não salvas nesta tela?');
  }
  return true;
}

async function callEditorApi(phase: 'preview' | 'execute' | 'status', payload: unknown): Promise<any> {
  const api = (window as Host).PortalGeapaApi;
  if (!api) throw Object.assign(Error('Sessão indisponível.'), { code: 'AUTH_REQUIRED' });
  const r = await api.apiPost('/admin/conteudo-publico/editar', { payload: JSON.stringify({ phase, payload }) });
  if (!r.ok) {
    throw Object.assign(Error(r.message || 'Não foi possível concluir a operação.'), { code: r.errorCode || r.code || 'COMMAND_RECONCILIATION_REQUIRED' });
  }
  return r.data;
}

async function load(): Promise<void> {
  if (!active() || getAccessStatus() !== 'ALLOWED' || state.loading) return;
  const api = (window as Host).PortalGeapaApi;
  if (!api) return;
  const epoch = ++state.generation;
  state.loading = true;
  setMessage('Carregando conteúdo editorial…');
  render();
  try {
    const r = await api.apiGet('/admin/conteudo-publico', {});
    if (epoch !== state.generation || !active()) return;
    if (!r.ok || !r.data) {
      setMessage(r.message || 'Não foi possível consultar o conteúdo editorial.', 'alert');
      return;
    }
    state.view = r.data;
    syncDraftFromView(state.tab);
    setMessage('');
    state.needsRecovery = false;
  } catch (e: unknown) {
    if (epoch !== state.generation) return;
    setMessage(e instanceof Error ? e.message : 'Erro ao consultar conteúdo editorial.', 'alert');
  } finally {
    if (epoch === state.generation) {
      state.loading = false;
      render();
    }
  }
}

async function runCommand(input: Record<string, unknown>, successText: string): Promise<void> {
  if (state.busy || getAccessStatus() !== 'ALLOWED') return;
  const epoch = state.generation;
  state.busy = true;
  state.needsRecovery = false;
  setMessage('Validando e enviando operação editorial…');
  render();
  try {
    const prep = await callEditorApi('preview', input);
    if (epoch !== state.generation) return;
    if (!prep?.request) throw Object.assign(Error('Pré-validação inválida.'), { code: 'SCHEMA_UNSUPPORTED' });
    const exec = await callEditorApi('execute', prep.request);
    if (epoch !== state.generation) return;
    if (exec?.state === 'COMPLETED') {
      state.dirty = false;
      state.orderDirty = false;
      state.previewHtml = '';
      state.previewTitle = '';
      if (exec.action === 'TIMELINE_SAVE_DRAFT' && exec.targetId && state.timelineDraft) {
        state.timelineDraft.id = exec.targetId;
      }
      setMessage(`${successText} (Recibo ${exec.operationId})`);
      const refreshed = await (window as Host).PortalGeapaApi?.apiGet('/admin/conteudo-publico', {});
      if (epoch === state.generation && refreshed?.ok && refreshed.data) {
        state.view = refreshed.data;
        syncDraftFromView(state.tab);
        setMessage(`${successText} (Recibo ${exec.operationId})`);
      }
      return;
    }
    state.needsRecovery = true;
    setMessage('Operação pendente de confirmação. Use "Verificar último envio" antes de repetir.', 'alert');
  } catch (e: unknown) {
    if (epoch !== state.generation) return;
    const code = (e as { code?: string })?.code || '';
    if (code === 'REVISION_CONFLICT') {
      setMessage('A revisão mudou em outra sessão. Seu texto local foi preservado; recarregue antes de reenviar.', 'alert');
    } else if (['PREVIOUS_OPERATION_COMPLETED', 'COMMAND_PENDING', 'COMMAND_RECONCILIATION_REQUIRED', 'REQUEST_TIMEOUT'].includes(code)) {
      state.needsRecovery = true;
      setMessage('Não foi possível confirmar o envio anterior. Clique em "Verificar último envio" para recuperar o estado real.', 'alert');
    } else {
      setMessage(e instanceof Error ? e.message : 'Operação recusada.', 'alert');
    }
  } finally {
    if (epoch === state.generation) {
      state.busy = false;
      render();
    }
  }
}

async function recoverPending(): Promise<void> {
  if (state.busy || getAccessStatus() !== 'ALLOWED') return;
  const epoch = state.generation;
  state.busy = true;
  setMessage('Verificando último envio registrado…');
  render();
  try {
    const res = await callEditorApi('status', {});
    if (epoch !== state.generation) return;
    if (res?.state === 'COMPLETED') {
      state.needsRecovery = false;
      setMessage(`Operação anterior confirmada (${ACTION_LABELS[res.action] || res.action}, revisão ${res.revision}).`);
      const refreshed = await (window as Host).PortalGeapaApi?.apiGet('/admin/conteudo-publico', {});
      if (epoch === state.generation && refreshed?.ok && refreshed.data) {
        state.view = refreshed.data;
        syncDraftFromView(state.tab);
      }
    } else if (res?.state === 'NOT_ADMITTED') {
      state.needsRecovery = false;
      setMessage('Nenhuma operação pendente ou admitida encontrada.');
    } else {
      state.needsRecovery = true;
      setMessage(`Estado atual da operação: ${res?.state || 'PENDENTE'}.`, 'alert');
    }
  } catch (e: unknown) {
    if (epoch !== state.generation) return;
    setMessage(e instanceof Error ? e.message : 'Não foi possível consultar o último envio.', 'alert');
  } finally {
    if (epoch === state.generation) {
      state.busy = false;
      render();
    }
  }
}

async function verifyPublic(): Promise<void> {
  if (state.busy) return;
  const epoch = state.generation;
  state.busy = true;
  setMessage('Consultando projeção pública diretamente no servidor…');
  render();
  try {
    const url = '/assets/act-command/public-pages.mjs';
    const service = await import(url);
    if (state.tab === 'home' || state.tab === 'about') {
      const page = await service.readPublicPageOptional(state.tab);
      if (epoch !== state.generation) return;
      if (!page) {
        state.previewTitle = 'Consulta pública atual';
        state.previewHtml = '<p role="status">Esta página não está publicada publicamente neste momento.</p>';
        setMessage('Consulta pública concluída: página não publicada.');
      } else {
        state.previewTitle = `Publicação atual · revisão ${page.revision}`;
        state.previewHtml = state.tab === 'home' ? renderHomeEditorialHtml(page) : renderPublicPageHtml(page);
        setMessage(`Publicação pública confirmada (revisão ${page.revision}).`);
      }
    } else if (state.tab === 'timeline') {
      const items = await service.readPublicTimeline();
      if (epoch !== state.generation) return;
      state.previewTitle = `Linha do tempo pública (${items.length} marcos publicados)`;
      state.previewHtml = renderTimelineHtml(items);
      setMessage(`Consulta pública concluída (${items.length} marco(s) publicado(s)).`);
    }
  } catch (e: unknown) {
    if (epoch !== state.generation) return;
    setMessage(e instanceof Error ? e.message : 'Falha ao consultar projeção pública.', 'alert');
  } finally {
    if (epoch === state.generation) {
      state.busy = false;
      render();
    }
  }
}

function previewDraft(): void {
  if (state.dirty) return;
  if (state.tab === 'home' || state.tab === 'about') {
    const rec = state.view?.pages[state.tab];
    const source = rec?.draft || rec?.publishedSnapshot;
    if (!source) return;
    const synthetic = parsePublicPage({
      id: state.tab,
      schemaVersion: PUBLIC_SCHEMA_VERSION,
      published: true,
      sanitized: true,
      revision: rec.revision,
      title: source.title,
      subtitle: source.subtitle || '',
      sourceHash: source.sourceHash || 'preview',
      sections: (source.sections || []).filter(s => s.published === true)
    }, state.tab);
    state.previewTitle = `Pré-visualização privada do rascunho · ${rec.published ? 'Atualmente publicado' : 'Ainda não publicado'}`;
    state.previewHtml = state.tab === 'home' ? renderHomeEditorialHtml(synthetic) : renderPublicPageHtml(synthetic);
    setMessage('Pré-visualização gerada somente nesta aba. Nenhum conteúdo público foi alterado.');
    render();
  } else if (state.tab === 'timeline' && state.timelineDraft?.id) {
    const rec = state.timelineItems.find(i => i.id === state.timelineDraft?.id);
    const src = rec?.draft || rec?.publishedSnapshot;
    if (!rec || !src) return;
    const item = parseTimelineItem({
      id: rec.id,
      schemaVersion: PUBLIC_SCHEMA_VERSION,
      published: true,
      sanitized: true,
      year: src.year,
      date: src.date || '',
      title: src.title,
      description: src.description,
      imageUrl: src.imageUrl || '',
      order: src.order,
      revision: rec.revision,
      sourceHash: 'preview'
    });
    state.previewTitle = 'Pré-visualização privada do marco histórico';
    state.previewHtml = item ? renderTimelineHtml([item]) : '<p>Marco vazio.</p>';
    setMessage('Pré-visualização gerada somente nesta aba. Nenhum conteúdo público foi alterado.');
    render();
  }
}

function updateDirtyIndicator(): void {
  const form = root()?.querySelector<HTMLElement>('#public-editor-form');
  if (form) form.dataset.geapaDirty = state.dirty ? 'true' : 'false';
  const note = root()?.querySelector('.editor-dirty');
  if (note) note.textContent = state.dirty ? 'Há alterações locais não salvas. Salve o rascunho antes de pré-visualizar ou publicar.' : 'Rascunho privado e publicação pública são mantidos separadamente no Core.';
  root()?.querySelectorAll<HTMLButtonElement>('[data-editor-action="preview"],[data-editor-action="publish"],[data-editor-action="unpublish"]').forEach(btn => {
    if (state.dirty) btn.disabled = true;
  });
  const preview = document.getElementById('public-editor-preview');
  if (preview && state.dirty) preview.hidden = true;
}

function handleFieldChange(target: Element): void {
  if (!active() || state.busy) return;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    const pageField = target.dataset.field;
    if (pageField && state.pageDraft) {
      const parts = pageField.split('.');
      if (parts[0] === 'title') state.pageDraft.title = target.value;
      else if (parts[0] === 'subtitle') state.pageDraft.subtitle = target.value;
      else if (parts[0] === 'sections' && parts.length === 3) {
        const sec = state.pageDraft.sections[Number(parts[1])];
        const key = parts[2] as keyof EditorialSection;
        if (sec) {
          if (key === 'published' && target instanceof HTMLInputElement) sec.published = target.checked;
          else if (key === 'order') sec.order = Number(target.value);
          else (sec as unknown as Record<string, unknown>)[key] = target.value;
        }
      }
      state.dirty = true;
      state.previewHtml = '';
      updateDirtyIndicator();
      return;
    }

    const tField = target.dataset.tfield;
    if (tField && state.timelineDraft) {
      const key = tField as keyof EditableTimelineDraft;
      if (key === 'year' || key === 'order') state.timelineDraft[key] = Number(target.value);
      else if (key === 'date' || key === 'title' || key === 'description' || key === 'imageUrl') state.timelineDraft[key] = target.value;
      state.dirty = true;
      state.previewHtml = '';
      updateDirtyIndicator();
    }
  }
}

async function handleAction(action: string, el: HTMLElement): Promise<void> {
  if (!active() || getAccessStatus() !== 'ALLOWED') return;
  if (action === 'recover') {
    await recoverPending();
    return;
  }
  if (action === 'verify') {
    await verifyPublic();
    return;
  }
  if (action === 'reload') {
    if (confirmDiscard()) await load();
    return;
  }
  if (action === 'preview') {
    previewDraft();
    return;
  }
  if (state.tab === 'home' || state.tab === 'about') {
    const rec = state.view?.pages[state.tab];
    const rev = rec?.revision ?? 0;
    if (action.startsWith('section-') && state.pageDraft) {
      const idx = Number(el.dataset.index);
      const list = state.pageDraft.sections;
      if (action === 'section-add' && list.length < 30) {
        list.push({ id: `sec_${Date.now().toString(36)}_${list.length + 1}`, type: 'TEXT', title: '', subtitle: '', text: '', imageUrl: '', buttonText: '', buttonUrl: '', order: list.length + 1, published: true });
      } else if (action === 'section-remove' && list.length > 1) {
        list.splice(idx, 1);
      } else if (action === 'section-up' && idx > 0) {
        [list[idx - 1], list[idx]] = [list[idx]!, list[idx - 1]!];
      } else if (action === 'section-down' && idx < list.length - 1) {
        [list[idx + 1], list[idx]] = [list[idx]!, list[idx + 1]!];
      }
      list.forEach((s, i) => { s.order = i + 1; });
      state.dirty = true;
      state.previewHtml = '';
      render();
      return;
    }
    if (action === 'save' && state.pageDraft) {
      const content = {
        title: state.pageDraft.title.trim(),
        subtitle: state.pageDraft.subtitle.trim(),
        sections: state.pageDraft.sections.map((s, i) => ({
          id: s.id || `sec_${i + 1}`,
          type: s.type || 'TEXT',
          title: (s.title || '').trim(),
          subtitle: (s.subtitle || '').trim(),
          text: (s.text || '').trim(),
          imageUrl: (s.imageUrl || '').trim(),
          buttonText: (s.buttonText || '').trim(),
          buttonUrl: (s.buttonUrl || '').trim(),
          order: i + 1,
          published: s.published === true
        }))
      };
      await runCommand({ action: 'PAGE_SAVE_DRAFT', pageId: state.tab, expectedRevision: rev, content }, 'Rascunho salvo no Core sem alterar a publicação.');
    } else if (action === 'publish') {
      await runCommand({ action: 'PAGE_PUBLISH', pageId: state.tab, expectedRevision: rev }, 'Página publicada com segurança.');
    } else if (action === 'unpublish') {
      await runCommand({ action: 'PAGE_UNPUBLISH', pageId: state.tab, expectedRevision: rev }, 'Página despublicada. O rascunho e o histórico foram preservados.');
    }
    return;
  }

  if (state.tab === 'timeline') {
    if (action === 'timeline-new') {
      if (!confirmDiscard()) return;
      state.selectedTimelineRevision = 0;
      state.timelineDraft = {
        id: null,
        year: new Date().getFullYear(),
        date: '',
        title: '',
        description: '',
        imageUrl: '',
        order: state.timelineItems.length + 1
      };
      state.dirty = true;
      state.previewHtml = '';
      render();
      return;
    }
    if (action === 'timeline-edit') {
      if (!confirmDiscard()) return;
      const item = state.timelineItems.find(i => i.id === el.dataset.id);
      if (item) {
        selectTimelineRecord(item);
        render();
      }
      return;
    }
    if (action === 'timeline-up' || action === 'timeline-down') {
      const idx = Number(el.dataset.index);
      const target = idx + (action === 'timeline-up' ? -1 : 1);
      if (target >= 0 && target < state.timelineItems.length) {
        const [moved] = state.timelineItems.splice(idx, 1);
        state.timelineItems.splice(target, 0, moved!);
        state.orderDirty = true;
        render();
      }
      return;
    }
    if (action === 'timeline-reorder') {
      await runCommand({
        action: 'TIMELINE_REORDER',
        expectedIndexRevision: state.view?.timeline.revision ?? 0,
        items: state.timelineItems.map(i => ({ id: i.id, expectedRevision: i.revision }))
      }, 'Ordem da linha do tempo atualizada.');
      return;
    }
    if (!state.timelineDraft) return;
    if (action === 'save') {
      await runCommand({
        action: 'TIMELINE_SAVE_DRAFT',
        itemId: state.timelineDraft.id,
        expectedRevision: state.timelineDraft.id ? state.selectedTimelineRevision : 0,
        expectedIndexRevision: state.view?.timeline.revision ?? 0,
        content: {
          year: Number(state.timelineDraft.year),
          date: state.timelineDraft.date.trim(),
          title: state.timelineDraft.title.trim(),
          description: state.timelineDraft.description.trim(),
          imageUrl: state.timelineDraft.imageUrl.trim(),
          order: Number(state.timelineDraft.order)
        }
      }, 'Rascunho do marco salvo.');
    } else if (action === 'publish' && state.timelineDraft.id) {
      await runCommand({
        action: 'TIMELINE_PUBLISH',
        itemId: state.timelineDraft.id,
        expectedRevision: state.selectedTimelineRevision
      }, 'Marco histórico publicado.');
    } else if (action === 'unpublish' && state.timelineDraft.id) {
      await runCommand({
        action: 'TIMELINE_UNPUBLISH',
        itemId: state.timelineDraft.id,
        expectedRevision: state.selectedTimelineRevision
      }, 'Marco histórico despublicado.');
    }
  }
}

export function resetEditorialStateForTest(): void {
  state.tab = 'home';
  state.view = null;
  state.pageDraft = null;
  state.timelineItems = [];
  state.timelineDraft = null;
  state.selectedTimelineRevision = 0;
  state.dirty = false;
  state.orderDirty = false;
  state.busy = false;
  state.loading = false;
  state.needsRecovery = false;
  state.message = '';
  state.previewHtml = '';
  state.previewTitle = '';
}

export function setEditorialViewForTest(view: EditorialAdminView): void {
  state.view = view;
  syncDraftFromView(state.tab);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  (window as Host).PortalPublicAdmin = Object.freeze({
    isEnabled: () => true,
    getAccessStatus,
    renderAccessGate
  });

  document.addEventListener('portal:navigationchange', () => {
    state.generation++;
    if (active()) void load();
    else if (root()) root()!.replaceChildren();
  });

  document.addEventListener('portal:act-context-ready', () => {
    if (active() && !state.view && !state.loading) void load();
    else if (active()) render();
  });

  document.addEventListener('portal:act-session-cleared', () => {
    state.generation++;
    resetEditorialStateForTest();
    root()?.replaceChildren();
  });

  document.addEventListener('input', e => {
    if (e.target instanceof Element && root()?.contains(e.target)) handleFieldChange(e.target);
  });

  document.addEventListener('change', e => {
    if (e.target instanceof Element && root()?.contains(e.target)) handleFieldChange(e.target);
  });

  document.addEventListener('submit', e => {
    if (e.target instanceof HTMLFormElement && e.target.id === 'public-editor-form' && root()?.contains(e.target)) {
      e.preventDefault();
      void handleAction('save', e.target);
    }
  });

  document.addEventListener('click', e => {
    if (!active() || !(e.target instanceof Element)) return;
    const tabBtn = e.target.closest<HTMLElement>('[data-editor-tab]');
    if (tabBtn && root()?.contains(tabBtn)) {
      if (!state.busy && confirmDiscard()) {
        state.tab = tabBtn.dataset.editorTab as EditorTab;
        syncDraftFromView(state.tab);
        render();
      }
      return;
    }
    const actionBtn = e.target.closest<HTMLElement>('[data-editor-action]');
    if (actionBtn && root()?.contains(actionBtn) && !actionBtn.hasAttribute('disabled')) {
      const action = actionBtn.dataset.editorAction || '';
      if (action === 'save') return; // handled by form submit or explicit button
      void handleAction(action, actionBtn);
    }
  });

  window.addEventListener('beforeunload', e => {
    if ((state.dirty || state.orderDirty) && active()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  if (active()) void load();
}
