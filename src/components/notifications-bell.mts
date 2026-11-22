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
  readAt?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationsData {
  personId?: string;
  unreadCount: number;
  notifications: NotificationItem[];
}

export interface NotificationsBellOptions {
  nav?: { irPara?(route: string): void; fecharMenu?(): void };
  context?: () => { authenticated?: boolean; accessPending?: boolean };
  api?: {
    apiGet(route: string, params?: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; message?: string }>;
    apiPost?(route: string, params?: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; message?: string }>;
  };
}

export function formatNotificationDate(isoString: string): string {
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

  return `<article class="notification-item${unreadClass}" data-id="${esc(item.id)}">` +
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
  let activeEpoch = 0;

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
    (panel.querySelector('button') as HTMLElement | null)?.focus();
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
    if (items.length === 0) {
      list.innerHTML = '<p class="notifications-empty">Nenhuma notificação no momento.</p>';
      if (markAllBtn) markAllBtn.disabled = true;
      return;
    }
    list.innerHTML = items.map(renderNotificationItem).join('');
    if (markAllBtn) markAllBtn.disabled = unreadCount === 0;
  };

  const getApi = () => options.api || (window as unknown as { PortalGeapaApi?: typeof options.api }).PortalGeapaApi;

  const refresh = async () => {
    const epoch = ++activeEpoch;
    const api = getApi();
    if (!api?.apiGet) return;
    try {
      const res = await api.apiGet('/meu-vinculo/notificacoes', {});
      if (epoch !== activeEpoch) return;
      if (res && res.ok && res.data) {
        const data = res.data as NotificationsData;
        items = Array.isArray(data.notifications) ? data.notifications : [];
        updateBadge(typeof data.unreadCount === 'number' ? data.unreadCount : items.filter(i => !i.read).length);
        renderList();
      }
    } catch {
      // In case of error, preserve state or handle silently
    }
  };

  const markRead = async (id: string) => {
    const epoch = activeEpoch;
    const item = items.find(i => i.id === id);
    if (!item || item.read) return;
    item.read = true;
    item.readAt = new Date().toISOString();
    updateBadge(unreadCount - 1);
    renderList();

    const api = getApi();
    if (api?.apiGet) {
      try {
        const res = await api.apiGet('/meu-vinculo/notificacoes', { action: 'MARK_READ', notificationId: id });
        if (epoch !== activeEpoch) return;
        if (res?.ok && res.data && typeof (res.data as { unreadCount?: number }).unreadCount === 'number') {
          updateBadge((res.data as { unreadCount: number }).unreadCount);
        }
      } catch {
        // Rollback on network failure if needed
      }
    }
  };

  const markAllRead = async () => {
    const epoch = activeEpoch;
    if (unreadCount === 0) return;
    for (const item of items) {
      item.read = true;
      item.readAt = new Date().toISOString();
    }
    updateBadge(0);
    renderList();

    const api = getApi();
    if (api?.apiGet) {
      try {
        const res = await api.apiGet('/meu-vinculo/notificacoes', { action: 'MARK_ALL_READ' });
        if (epoch !== activeEpoch) return;
        if (res?.ok && res.data && typeof (res.data as { unreadCount?: number }).unreadCount === 'number') {
          updateBadge((res.data as { unreadCount: number }).unreadCount);
        }
      } catch {
        // Rollback on network failure if needed
      }
    }
  };

  const clear = () => {
    activeEpoch++;
    items = [];
    updateBadge(0);
    renderList();
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
    const c = options.context?.() || {};
    host.hidden = !c.authenticated;
    if (host.hidden) {
      clear();
    } else {
      void refresh();
    }
  };

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
