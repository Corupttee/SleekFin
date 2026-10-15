import { dom } from '../../shared/runtime.js';

const STORAGE_KEY = 'abyssfin:dashboard-sidebar-hidden';
const HIDDEN_CLASS = 'abyssfin-sidebar-hidden';
const DASHBOARD_REGEX = /(?:^|\/)(?:dashboard|configurationpage|metadata)(?:\/|$|\?|#)/i;

const SIDEBAR_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>';
const CHEVRON_RIGHT_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
const CHEVRON_LEFT_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';

export function isDashboardRoute() {
  const hash = (window.location.hash || '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase();
  return (
    DASHBOARD_REGEX.test(hash) ||
    DASHBOARD_REGEX.test(path) ||
    Boolean(document.body?.classList.contains('dashboardDocument')) ||
    Boolean(document.querySelector('#dashboardPage, .editPageSidebar, .MuiDrawer-docked'))
  );
}

function getStoredHidden() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function setStoredHidden(hidden) {
  try {
    localStorage.setItem(STORAGE_KEY, hidden ? 'true' : 'false');
  } catch {}
}

export function createSidebarFeature() {
  let headerButton = null;
  let floatingButton = null;
  let drawerCollapseButton = null;
  let keyHandler = null;
  let stopWatching = null;
  let scheduleTimer = null;

  function setHidden(hidden) {
    setStoredHidden(hidden);
    document.documentElement.classList.toggle(HIDDEN_CLASS, hidden);
    updateButtons(hidden);
  }

  function toggle() {
    const isCurrentlyHidden = document.documentElement.classList.contains(HIDDEN_CLASS);
    setHidden(!isCurrentlyHidden);
  }

  function updateButtons(hidden) {
    if (headerButton) {
      headerButton.classList.toggle('is-sidebar-hidden', hidden);
      headerButton.title = hidden ? 'Show Sidebar (Ctrl+B)' : 'Hide Sidebar (Ctrl+B)';
      headerButton.setAttribute('aria-expanded', String(!hidden));
    }
    if (floatingButton) {
      floatingButton.classList.toggle('is-visible', hidden);
    }
  }

  function ensureHeaderButton() {
    if (headerButton && dom.isConnected(headerButton)) return;

    const container =
      document.querySelector('header.MuiAppBar-root .MuiToolbar-root') ||
      document.querySelector('.skinHeader .headerLeft') ||
      document.querySelector('.skinHeader') ||
      document.querySelector('.headerTop');

    if (!container) return;

    headerButton = dom.element(`
      <button type="button" class="abyssfin-sidebar-toggle-btn abyssfin-sidebar-header-toggle" title="Toggle Sidebar (Ctrl+B)" aria-label="Toggle Sidebar">
        <span class="abyssfin-sidebar-toggle-icon">${SIDEBAR_ICON_SVG}</span>
        <span class="abyssfin-sidebar-toggle-text">Sidebar</span>
      </button>
    `);

    headerButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    const brandOrMenu =
      container.querySelector('.mainDrawerButton, button:has(svg[data-testid="MenuIcon"]), .headerButton-menu, a[href*="home"]') ||
      container.firstElementChild;

    if (brandOrMenu && brandOrMenu.nextSibling) {
      container.insertBefore(headerButton, brandOrMenu.nextSibling);
    } else {
      container.appendChild(headerButton);
    }

    const hidden = document.documentElement.classList.contains(HIDDEN_CLASS);
    updateButtons(hidden);
  }

  function ensureFloatingButton() {
    if (floatingButton && dom.isConnected(floatingButton)) return;

    floatingButton = dom.element(`
      <button type="button" class="abyssfin-sidebar-floating-toggle" title="Show Sidebar (Ctrl+B)" aria-label="Show Sidebar">
        <span class="abyssfin-sidebar-floating-icon">${CHEVRON_RIGHT_SVG}</span>
        <span class="abyssfin-sidebar-floating-text">Sidebar</span>
      </button>
    `);

    floatingButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setHidden(false);
    });

    document.body.appendChild(floatingButton);
    const hidden = document.documentElement.classList.contains(HIDDEN_CLASS);
    updateButtons(hidden);
  }

  function ensureDrawerCollapseButton() {
    const drawerPaper =
      document.querySelector('.MuiDrawer-docked .MuiDrawer-paper') ||
      document.querySelector('.editPageSidebar') ||
      document.querySelector('.sidebar.content-secondary');

    if (!drawerPaper) return;
    if (drawerPaper.querySelector('.abyssfin-sidebar-collapse-bar')) return;

    const collapseBar = dom.element(`
      <div class="abyssfin-sidebar-collapse-bar">
        <button type="button" class="abyssfin-sidebar-collapse-btn" title="Collapse Sidebar (Ctrl+B)">
          <span class="abyssfin-sidebar-collapse-icon">${CHEVRON_LEFT_SVG}</span>
          <span class="abyssfin-sidebar-collapse-text">Hide Sidebar</span>
        </button>
      </div>
    `);

    collapseBar.querySelector('button').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setHidden(true);
    });

    drawerPaper.insertBefore(collapseBar, drawerPaper.firstElementChild);
    drawerCollapseButton = collapseBar;
  }

  function reconcile() {
    const onDashboard = isDashboardRoute();
    if (!onDashboard) {
      document.documentElement.classList.remove(HIDDEN_CLASS);
      if (headerButton) {
        headerButton.remove();
        headerButton = null;
      }
      if (floatingButton) {
        floatingButton.remove();
        floatingButton = null;
      }
      if (drawerCollapseButton) {
        drawerCollapseButton.remove();
        drawerCollapseButton = null;
      }
      document.querySelectorAll('.abyssfin-sidebar-collapse-bar').forEach((el) => el.remove());
      return;
    }

    const storedHidden = getStoredHidden();
    document.documentElement.classList.toggle(HIDDEN_CLASS, storedHidden);

    ensureHeaderButton();
    ensureFloatingButton();
    ensureDrawerCollapseButton();
    updateButtons(storedHidden);
  }

  function scheduleReconcile() {
    if (scheduleTimer) return;
    scheduleTimer = window.setTimeout(() => {
      scheduleTimer = null;
      reconcile();
    }, 50);
  }

  function start() {
    const storedHidden = getStoredHidden();
    if (isDashboardRoute()) {
      document.documentElement.classList.toggle(HIDDEN_CLASS, storedHidden);
    }

    keyHandler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'b' && isDashboardRoute()) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', keyHandler);

    stopWatching = dom.watchSpa(scheduleReconcile, {
      events: ['hashchange', 'popstate', 'pageshow', 'load'],
      viewshow: true,
    });

    reconcile();
  }

  function stop() {
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (stopWatching) {
      stopWatching();
      stopWatching = null;
    }
    if (scheduleTimer) {
      window.clearTimeout(scheduleTimer);
      scheduleTimer = null;
    }
    if (headerButton) {
      headerButton.remove();
      headerButton = null;
    }
    if (floatingButton) {
      floatingButton.remove();
      floatingButton = null;
    }
    if (drawerCollapseButton) {
      drawerCollapseButton.remove();
      drawerCollapseButton = null;
    }
    document.querySelectorAll('.abyssfin-sidebar-collapse-bar').forEach((el) => el.remove());
    document.documentElement.classList.remove(HIDDEN_CLASS);
  }

  return { reconcile, start, stop, toggle };
}
