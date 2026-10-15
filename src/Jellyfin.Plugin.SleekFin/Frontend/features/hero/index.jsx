import { dom, h, render } from '../../shared/runtime.js';
import { Hero } from './Hero.jsx';
import { applySettings } from './settings.js';
import { loadEntries, loadSettings } from './source.js';

const WINDOW_EVENTS = ['hashchange', 'popstate', 'pageshow'];
const SETTINGS_EVENT = 'sleekfin:hero-settings-changed';
const ROOT_BOOT_LOADING_CLASS = 'sleekfin-hero-boot-loading';
const ROOT_LOADING_CLASS = 'sleekfin-hero-loading';
const ROOT_MOUNTED_CLASS = 'sleekfin-hero-mounted';
const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});

features.hero?.stop?.();

const state = {
  enabled: document.documentElement.dataset.sleekfinHeroEnabled === 'true',
  failedHost: null,
  generation: 0,
  loadingTimer: 0,
  mount: null,
  readyFrame: 0,
  reconcileTimer: 0,
  started: false,
  stopWatching: null,
};

function finishLoading() {
  window.clearTimeout(state.loadingTimer);
  state.loadingTimer = 0;
  document.documentElement.classList.remove(ROOT_BOOT_LOADING_CLASS, ROOT_LOADING_CLASS);
}

function prepareLoading() {
  const root = document.documentElement;
  if (root.classList.contains(ROOT_BOOT_LOADING_CLASS) || (state.loadingTimer && root.classList.contains(ROOT_LOADING_CLASS))) return;
  root.classList.add(ROOT_LOADING_CLASS);
  state.loadingTimer = window.setTimeout(finishLoading, 4000);
}

function routeKind() {
  const rawHash = (window.location.hash || '').replace(/^#\/?/, '');
  const path = rawHash.split('?')[0].toLowerCase();
  if (path === '' || path === 'home' || path === 'home.html' || path === 'index.html') {
    const queryIndex = window.location.hash.indexOf('?');
    const params = queryIndex >= 0 ? new URLSearchParams(window.location.hash.slice(queryIndex)) : null;
    const tab = params?.get('tab');
    if (!tab || tab === '0') return 'home';
    return '';
  }
  if (path.includes('movies')) return 'movies';
  if (path.includes('tvshows') || path.includes('tvrecommended') || path.includes('series') || path.includes('shows')) return 'series';
  return '';
}

function isHomeRoute() {
  return routeKind() !== '';
}

function findHost() {
  const kind = routeKind();
  if (!kind) return null;
  const selectors = kind === 'home' ? [
    '#indexPage #homeTab.is-active .sections',
    '#indexPage #homeTab .sections',
    '#indexPage:not(.hide) .sections',
    '#indexPage .sections',
    '#homeTab .sections',
    '#indexPage .homeSectionsContainer',
    '.sections.homeSectionsContainer',
    '.homeSectionsContainer',
  ] : [
    '#moviesPage:not(.hide) .pageContent',
    '#tvshowsPage:not(.hide) .pageContent',
    '#tvRecommendedPage:not(.hide) .pageContent',
    '#moviesPage .pageContent',
    '#tvshowsPage .pageContent',
    '#tvRecommendedPage .pageContent',
    '#moviesPage:not(.hide)',
    '#tvshowsPage:not(.hide)',
    '#tvRecommendedPage:not(.hide)',
  ];
  for (let i = 0; i < selectors.length; i++) {
    const el = Array.from(document.querySelectorAll(selectors[i])).find(dom.isVisible);
    if (el) return { element: el, kind };
  }
  return null;
}

function removeMount() {
  if (!state.mount) return;
  window.cancelAnimationFrame(state.readyFrame);
  state.readyFrame = 0;
  render(null, state.mount);
  state.mount.remove();
  state.mount = null;
  document.documentElement.classList.remove(ROOT_MOUNTED_CLASS);
}

function unmount() {
  state.generation += 1;
  state.failedHost = null;
  removeMount();
}

function createRoot(host, kind) {
  // Jellyfin's customized items container is upgraded only when its `is` attribute is parsed.
  const root = dom.element('<div is="emby-itemscontainer" class="sleekfin-hero itemsContainer" data-contextmenu="false" data-multiselect="false" data-state="loading"></div>');
  if (kind && kind !== 'home') root.classList.add('sleekfin-hero--library');
  root.dataset.library = kind || 'home';
  if (host.element) {
    const container = host.element;
    if (kind && kind !== 'home') {
      container.insertBefore(root, container.firstChild);
    } else {
      container.parentNode.insertBefore(root, container);
    }
  } else {
    host.parentNode.insertBefore(root, host);
  }
  state.mount = root;
  document.documentElement.classList.add(ROOT_MOUNTED_CLASS);
  finishLoading();
  if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') {
    window.CustomElements.upgradeSubtree(root);
  }
  return root;
}

function renderHero(root, entries, settings) {
  if (state.mount !== root || !dom.isConnected(root) || !isHomeRoute()) return;

  render(h(Hero, { entries, root, settings }), root);
  state.readyFrame = window.requestAnimationFrame(() => {
    state.readyFrame = 0;
    if (state.mount === root && dom.isConnected(root)) root.dataset.state = 'ready';
  });
}

function mount(host) {
  const client = window.ApiClient;
  const generation = ++state.generation;
  const kind = host.kind || 'home';
  const root = createRoot(host, kind);
  loadSettings(client)
    .then((settings) => {
      if (generation !== state.generation || state.mount !== root || !dom.isConnected(root)) return null;
      state.enabled = settings.enabled;
      if (!settings.enabled) {
        removeMount();
        return null;
      }
      applySettings(root, settings);
      return loadEntries(client, settings).then((entries) => ({ entries, settings }));
    })
    .then((result) => {
      if (!result || generation !== state.generation) return;
      if (result.entries.length) {
        renderHero(root, result.entries, result.settings);
      } else {
        state.failedHost = host.element;
        removeMount();
      }
    })
    .catch(() => {
      if (generation === state.generation) {
        state.failedHost = host.element;
        removeMount();
      }
    });
}

function reconcile() {
  if (!state.started || !window.ApiClient) return;

  const host = findHost();
  if (!host) {
    unmount();
    return;
  }
  if (state.enabled === false) {
    finishLoading();
    removeMount();
    return;
  }
  const hostEl = host.element;
  if (state.mount && dom.isConnected(state.mount)) {
    const kind = state.mount.dataset.library || 'home';
    if (kind === 'home' && state.mount.nextElementSibling === hostEl) return;
    if (kind !== 'home' && hostEl.contains(state.mount) && state.mount.dataset.library === host.kind) return;
  }
  if (state.failedHost === hostEl) return;

  unmount();
  mount(host);
}

function scheduleReconcile() {
  const home = isHomeRoute();
  const loading = home && state.enabled !== false && !dom.isConnected(state.mount);
  if (!loading) finishLoading();
  else prepareLoading();
  if (state.reconcileTimer) return;
  state.reconcileTimer = window.setTimeout(() => {
    state.reconcileTimer = 0;
    reconcile();
  }, 0);
}

function reloadSettings() {
  if (!state.started) return;
  state.enabled = null;
  unmount();
  scheduleReconcile();
}

function start() {
  if (state.started) return;

  state.started = true;
  state.stopWatching = dom.watchSpa(scheduleReconcile, {
    events: WINDOW_EVENTS,
    viewshow: true,
  });
  window.addEventListener(SETTINGS_EVENT, reloadSettings);
  scheduleReconcile();
}

function stop() {
  state.started = false;
  window.clearTimeout(state.reconcileTimer);
  state.reconcileTimer = 0;
  state.stopWatching?.();
  state.stopWatching = null;
  window.removeEventListener(SETTINGS_EVENT, reloadSettings);
  unmount();
  finishLoading();
}

features.hero = { start, stop };

start();
