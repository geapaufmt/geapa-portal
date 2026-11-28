// Notification center bell and dropdown component.
import {esc} from './design-system.mjs';

export interface NotificationItem {
  id: string;
  personId?: string;
  revision?: number;
  event: string;
  title: string;
  body: string;
  targetRoute?: string;
  category?: string;
  read: boolean;
  readAt?: number | null;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface NotificationsData {
  personId?: string;
  unreadCount: number;
  schemaVersion: string;
  revision: number;
  items: NotificationItem[];
}

export interface NotificationsBellOptions {
  nav?: { irPara?(route: string): void; fecharMenu?(): void };
  context?: () => { authenticated?: boolean; accessPending?: boolean; identityScope?: string | null; act?: {available?: boolean} | null; members?: {restrictedTracking?: boolean} | null };
  api?: {
    apiGet(route: string, params?: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; message?: string }>;
    apiPost?(route: string, params?: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; message?: string }>;
  };
}

export function formatNotificationDate(isoString: number | string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', {
      timeZone: 'America/Cuiaba',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export function renderNotificationItem(item: NotificationItem): string {
  const unreadClass = item.read ? '' : ' unread';
  const dateFormatted = formatNotificationDate(item.createdAt);
  const routeBtn = item.targetRoute
    ? `<button type="button" class="notification-item-route" data-route-target="${esc(item.targetRoute)}">Ver detalhes</button>`
    : '';
  const markBtn = !item.read
    ? `<button type="button" class="notification-item-mark" data-mark-read="${esc(item.id)}" aria-label="Marcar como lida">Marcar como lida</button>`
    : '';
  const actionsHtml = (routeBtn || markBtn)
    ? `<div class="notification-item-actions">${routeBtn}${markBtn}</div>`
    : '';

  return `<article role="listitem" class="notification-item${unreadClass}" data-id="${esc(item.id)}">` +
    `<div class="notification-item-header">` +
      `<strong class="notification-item-title">${esc(item.title)}</strong>` +
      (dateFormatted ? `<time class="notification-item-date">${esc(dateFormatted)}</time>` : '') +
    `</div>` +
    `<p class="notification-item-body">${esc(item.body)}</p>` +
    actionsHtml +
  `</article>`;
}

export function setupNotificationsBell(options: NotificationsBellOptions = {}) {
  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const host = el('notifications-menu');
  const button = el<HTMLButtonElement>('notifications-toggle');
  const panel = el('notifications-panel');
  const badge = el('notifications-badge');
  const list = el('notifications-list');
  const markAllBtn = el<HTMLButtonElement>('notifications-mark-all');

  if (!host || !button || !panel || !badge || !list) {
    return {
      open: () => {},
      close: () => {},
      refresh: async () => {},
      clear: () => {},
      markRead: async () => {},
      markAllRead: async () => {},
      updateBadge: () => {},
      getItems: () => [],
      getUnreadCount: () => 0
    };
  }

  let items: NotificationItem[] = [];
  let unreadCount = 0;
  let revision = 0;
  let version = 0;
  let scope = '';
  let writing = false;
  let warning = '';
  const feedback = document.createElement('p');
  feedback.setAttribute('role','status');
  feedback.hidden = true;
  list.before(feedback);
  panel.tabIndex = -1;
  panel.setAttribute('role','region');
  const currentScope = () => {
    const c = options.context?.();
    return c?.authenticated && !c.accessPending && c.act?.available && !c.members?.restrictedTracking ? c.identityScope || '' : '';
  };

  const close = (focus = false) => {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (focus) button.focus();
  };

  const open = () => {
    const personalPanel = el('personal-panel');
    if (personalPanel && !personalPanel.hidden) {
      personalPanel.hidden = true;
      el<HTMLButtonElement>('personal-toggle')?.setAttribute('aria-expanded', 'false');
    }
    options.nav?.fecharMenu?.();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    (panel.querySelector<HTMLElement>('button:not(:disabled)') || panel).focus();
  };

  const updateBadge = (count: number) => {
    unreadCount = Math.max(0, count);
    if (unreadCount > 0) {
      badge.hidden = false;
      badge.textContent = String(unreadCount);
      button.setAttribute('aria-label', `Notificações (${unreadCount} não lidas)`);
    } else {
      badge.hidden = true;
      badge.textContent = '0';
      button.setAttribute('aria-label', 'Notificações');
    }
  };

  const renderList = () => {
    feedback.textContent = warning;
    feedback.hidden = !warning;
    if (items.length === 0) {
      list.innerHTML = warning ? '' : '<p class="notifications-empty">Nenhuma notificação no momento.</p>';
      if (markAllBtn) markAllBtn.disabled = true;
      return;
    }
    list.innerHTML = items.map(renderNotificationItem).join('');
    if (markAllBtn) markAllBtn.disabled = writing || unreadCount === 0;
  };

  const getApi = () => options.api || (window as unknown as { PortalGeapaApi?: typeof options.api }).PortalGeapaApi;

  const valid = (ticket: number) => ticket === version && !!scope && scope === currentScope();
  const apply = (res: {ok: boolean; data?: unknown} | undefined) => {
    const data = res?.data as Partial<NotificationsData> | undefined;
    if (!res?.ok || data?.schemaVersion !== 'member-notification-view-v1' || !Array.isArray(data.items) ||
        typeof data.revision !== 'number' || !Number.isSafeInteger(data.revision) || data.revision < 0 ||
        data.items.length > 100 || !data.items.every(i => i && typeof i.id === 'string' && /^[a-f0-9]{32}$/.test(i.id) &&
          typeof i.title === 'string' && typeof i.body === 'string' && typeof i.read === 'boolean' && Number.isSafeInteger(i.createdAt)) ||
        data.unreadCount !== data.items.filter(i => !i.read).length) throw Error('Invalid notification response');
    revision = data.revision;
    items = data.items;
    warning = '';
    updateBadge(data.unreadCount);
    renderList();
  };
  const unavailable = (message: string) => {
    items = [];
    warning = message;
    updateBadge(0);
    renderList();
  };
  const refresh = async () => {
    if (!scope || writing || scope !== currentScope()) return;
    const ticket = ++version;
    try {
      const res = await getApi()?.apiGet('/meu-vinculo/notificacoes', {});
      if (valid(ticket)) apply(res);
    } catch {
      if (valid(ticket)) unavailable('Não foi possível consultar as notificações. Reabra o painel para tentar novamente.');
    }
  };
  const mark = async (params: Record<string,unknown>) => {
    if (!scope || scope !== currentScope() || writing) return;
    const ticket = ++version;
    writing = true;
    const restoreFocus = panel.contains(document.activeElement);
    list.querySelectorAll<HTMLButtonElement>('[data-mark-read]').forEach(b => b.disabled = true);
    if (markAllBtn) markAllBtn.disabled = true;
    try {
      const res = await getApi()?.apiPost?.('/meu-vinculo/notificacoes/leitura',params);
      if (valid(ticket)) apply(res);
    } catch {
      if (valid(ticket)) unavailable('Leitura sem confirmação. Reabra o painel para consultar o estado atual.');
    } finally {
      if (valid(ticket)) {
        writing = false;
        renderList();
        if (restoreFocus && !panel.hidden && (document.activeElement === document.body || panel.contains(document.activeElement)))
          (panel.querySelector<HTMLElement>('button:not(:disabled)') || panel).focus();
      }
    }
  };
  const markRead = async (id: string) => {
    if (items.some(i => i.id === id && !i.read)) await mark({action:'MARK_READ',notificationId:id});
  };
  const markAllRead = async () => {
    if (unreadCount) await mark({action:'MARK_ALL_READ',expectedRevision:revision});
  };
  const clear = () => {
    ++version;
    scope = '';
    writing = false;
    unavailable('');
    close(false);
    host.hidden = true;
  };

  button.addEventListener('click', () => {
    if (panel.hidden) {
      open();
      void refresh();
    } else {
      close();
    }
  });

  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      void markAllRead();
    });
  }

  list.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const markBtn = target.closest<HTMLButtonElement>('[data-mark-read]');
    if (markBtn && markBtn.dataset.markRead) {
      e.stopPropagation();
      void markRead(markBtn.dataset.markRead);
      return;
    }
    const routeBtn = target.closest<HTMLButtonElement>('[data-route-target]');
    if (routeBtn) {
      close();
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (!host.contains(e.target as Node)) close();
  });

  document.addEventListener('focusin', (e) => {
    if (!host.contains(e.target as Node)) close();
  });

  panel.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const focusable = [...panel.querySelectorAll<HTMLButtonElement>('button:not([hidden]):not([disabled])')];
    const index = focusable.indexOf(document.activeElement as HTMLButtonElement);
    if (focusable.length === 0) return;
    if (e.key === 'Home') focusable[0]?.focus();
    else if (e.key === 'End') focusable[focusable.length - 1]?.focus();
    else if (e.key === 'ArrowDown') focusable[(index + 1) % focusable.length]?.focus();
    else if (e.key === 'ArrowUp') focusable[(index - 1 + focusable.length) % focusable.length]?.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      e.preventDefault();
      close(true);
    }
  });

  const update = () => {
    const next = currentScope();
    if (next === scope && next) return;
    clear();
    if (next) {
      scope = next;
      host.hidden = false;
      void refresh();
    }
  };
  document.addEventListener('portal:act-session-cleared', clear);
  document.addEventListener('portal:act-session-suspended', clear);
  document.addEventListener('portal:act-context-ready', update);
  const refreshVisible = () => { if (!document.hidden) void refresh(); };
  document.addEventListener('visibilitychange', refreshVisible);
  window.setInterval(refreshVisible, 300000);

  document.addEventListener('portal:menuupdated', update);
  document.addEventListener('portal:navigationchange', () => {
    close();
  });

  update();

  return {
    open,
    close,
    refresh,
    clear,
    markRead,
    markAllRead,
    updateBadge,
    getItems: () => [...items],
    getUnreadCount: () => unreadCount
  };
}
