import { dom, h, item, render, useState } from '../../shared/runtime.js';

const PORTAL_ID = 'abyssfin-preview-portal';
const HOVER_DELAY_MS = 280;
const HIDE_DELAY_MS = 200;
const MEDIA_PREVIEW_TYPES = new Set(['Movie', 'Series', 'Episode', 'Trailer', 'MusicVideo', 'Video']);

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function HeartIcon({ filled = false }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function isTouchDevice() {
  if (isTvLayout()) return false;
  return (
    ('ontouchstart' in window && window.innerWidth <= 1024) ||
    window.innerWidth <= 768 ||
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

export function isTvLayout() {
  return (
    document.documentElement.classList.contains('layout-tv') ||
    document.body.classList.contains('layout-tv') ||
    /tv|tizen|webos|viera|smarttv|googletv|appletv/i.test(navigator.userAgent)
  );
}

export function isPreviewableCard(card) {
  if (!card) return false;

  // NEVER preview collection folders, library cards, or user views under My Media
  if (
    card.matches(
      '.homeLibraryButton, [data-type="CollectionFolder"], [data-type="UserView"], [data-type="Folder"], [data-type="Channel"], [data-type="Person"], [data-type="Genre"]'
    )
  ) {
    return false;
  }

  if (
    card.closest(
      '.homeLibraryButtonContainer, .homeSectionsContainer .verticalSection:has([data-type="CollectionFolder"]), #divVirtualFolders, .section0, .myMediaSection'
    )
  ) {
    return false;
  }

  const type = card.dataset.type;
  if (type && !MEDIA_PREVIEW_TYPES.has(type)) {
    return false;
  }

  return true;
}

export function extractMediaMeta(mediaItem) {
  if (!mediaItem) return null;

  const type = mediaItem.Type === 'Series' ? 'TV Show' : mediaItem.Type === 'Movie' ? 'Movie' : mediaItem.Type || '';
  const rating = mediaItem.OfficialRating || mediaItem.CustomRating || mediaItem.InheritedParentRating || '';

  let duration = '';
  if (mediaItem.Type === 'Series') {
    const seasons = mediaItem.ChildCount || 1;
    duration = `${seasons} Season${seasons > 1 ? 's' : ''}`;
  } else {
    duration = item.formatRuntime(mediaItem.RunTimeTicks);
  }

  let resolution = '';
  let isHdr = false;
  let audio = '';

  const streams = mediaItem.MediaStreams || [];
  const videoStream = streams.find((s) => s.Type === 'Video');
  if (videoStream) {
    const width = videoStream.Width || 0;
    const height = videoStream.Height || 0;
    if (width >= 3800 || height >= 2100) resolution = '4K';
    else if (width >= 1200 || height >= 700) resolution = 'HD';

    if (
      videoStream.VideoRange?.includes('HDR') ||
      videoStream.VideoRangeType?.includes('HDR') ||
      videoStream.ColorTransfer === 'smpte2084'
    ) {
      isHdr = true;
    }
  } else if (mediaItem.Width >= 3800) {
    resolution = '4K';
  } else if (mediaItem.Width >= 1200) {
    resolution = 'HD';
  }

  const audioStream = streams.find((s) => s.Type === 'Audio');
  if (audioStream) {
    const title = (audioStream.Title || '').toLowerCase();
    const codec = (audioStream.Codec || '').toLowerCase();
    const profile = (audioStream.Profile || '').toLowerCase();
    if (title.includes('atmos') || profile.includes('atmos') || codec === 'truehd') {
      audio = 'Spatial Audio';
    } else if (audioStream.Channels >= 6) {
      audio = '5.1';
    } else if (audioStream.Channels >= 8) {
      audio = '7.1';
    }
  }

  const genres = (mediaItem.Genres || []).slice(0, 3);
  const backdropUrl =
    item.imageUrl(mediaItem, 'Backdrop', { maxWidth: 1280 }) ||
    item.imageUrl(mediaItem, 'Primary', { maxWidth: 800 });

  const logoUrl = item.imageUrl(mediaItem, 'Logo', { maxWidth: 600 });
  const communityScore = Number(mediaItem.CommunityRating || 0);

  return {
    id: mediaItem.Id,
    name: mediaItem.Name,
    type,
    rating,
    duration,
    resolution,
    isHdr,
    audio,
    genres,
    backdropUrl,
    logoUrl,
    overview: mediaItem.Overview || mediaItem.Taglines?.[0] || '',
    communityScore: communityScore > 0 ? communityScore.toFixed(1) : '',
    isFavorite: Boolean(mediaItem.UserData?.IsFavorite),
    isPlayed: Boolean(mediaItem.UserData?.Played),
  };
}

export function playMediaItem(mediaItem) {
  if (!mediaItem?.Id) return;

  const pm = window.playbackManager || window.PlaybackManager;
  if (pm?.play) {
    try {
      pm.play({ ids: [mediaItem.Id] });
      return;
    } catch (e) {
      console.warn('[AbyssFin] playbackManager.play failed, falling back', e);
    }
  }

  const card = document.querySelector(`.card[data-id="${mediaItem.Id}"]`);
  if (card) {
    const playBtn = card.querySelector('.cardOverlayButton-centered, .cardOverlayFab-primary, [data-action="play"]');
    if (playBtn) {
      playBtn.click();
      return;
    }
  }

  openMediaDetails(mediaItem);
}

export function openMediaDetails(mediaItem) {
  const serverId = mediaItem.ServerId || (window.ApiClient?.serverId?.()) || '';
  const hash = `#/details?id=${mediaItem.Id}${serverId ? `&serverId=${serverId}` : ''}`;
  if (window.appRouter?.showItem) {
    window.appRouter.showItem(mediaItem.Id, serverId);
  } else if (window.appRouter?.show) {
    window.appRouter.show(hash.slice(1));
  } else {
    window.location.hash = hash;
  }
}

export async function toggleMediaFavorite(mediaItem, onChange) {
  const client = window.ApiClient;
  const userId = client?.getCurrentUserId?.();
  if (!client || !userId || !mediaItem?.Id) return;

  const current = Boolean(mediaItem.UserData?.IsFavorite);
  const next = !current;
  if (!mediaItem.UserData) mediaItem.UserData = {};
  mediaItem.UserData.IsFavorite = next;
  onChange(next);

  try {
    await client.updateFavoriteStatus(userId, mediaItem.Id, next);
  } catch {
    mediaItem.UserData.IsFavorite = current;
    onChange(current);
  }
}

export async function toggleMediaPlayed(mediaItem, onChange) {
  const client = window.ApiClient;
  const userId = client?.getCurrentUserId?.();
  if (!client || !userId || !mediaItem?.Id) return;

  const current = Boolean(mediaItem.UserData?.Played);
  const next = !current;
  if (!mediaItem.UserData) mediaItem.UserData = {};
  mediaItem.UserData.Played = next;
  onChange(next);

  try {
    if (next) {
      await client.markPlayed(userId, mediaItem.Id, new Date().toISOString());
    } else {
      await client.markUnplayed(userId, mediaItem.Id);
    }
  } catch {
    mediaItem.UserData.Played = current;
    onChange(current);
  }
}

function calculateDesktopPosition(cardRect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const targetWidth = Math.min(Math.max(cardRect.width * 1.22, 290), 380, viewportWidth - 40);
  let left = cardRect.left + (cardRect.width - targetWidth) / 2;

  if (cardRect.left < 80) {
    left = Math.max(20, cardRect.left - 10);
  } else if (cardRect.right > viewportWidth - 80) {
    left = Math.min(viewportWidth - targetWidth - 20, cardRect.right - targetWidth + 10);
  }

  if (left < 20) left = 20;
  if (left + targetWidth > viewportWidth - 20) {
    left = viewportWidth - targetWidth - 20;
  }

  let top = cardRect.top - 20;
  const estimatedHeight = 350;

  if (top < 20) {
    top = 20;
  } else if (top + estimatedHeight > viewportHeight - 20) {
    top = Math.max(20, viewportHeight - estimatedHeight - 20);
  }

  return { left: Math.round(left), top: Math.round(top), width: Math.round(targetWidth) };
}

export function CardPreviewPopOver({ item: mediaItem, meta, position, onEnter, onLeave, onClose }) {
  const [favorite, setFavorite] = useState(meta.isFavorite);
  const [played, setPlayed] = useState(meta.isPlayed);

  return (
    <div
      class="abyssfin-preview-popover"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div
        class="abyssfin-preview-media"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
          openMediaDetails(mediaItem);
        }}
      >
        {meta.backdropUrl ? (
          <img class="abyssfin-preview-backdrop" src={meta.backdropUrl} alt={meta.name} />
        ) : (
          <div class="abyssfin-preview-backdrop-fallback" />
        )}
        <div class="abyssfin-preview-vignette" />

        <div class="abyssfin-preview-title-wrap">
          {meta.logoUrl ? (
            <img class="abyssfin-preview-logo" src={meta.logoUrl} alt={meta.name} />
          ) : (
            <span class="abyssfin-preview-title-text">{meta.name}</span>
          )}
        </div>

        <button
          type="button"
          class="abyssfin-preview-sound-btn"
          title="Audio preview"
          onClick={(e) => e.stopPropagation()}
        >
          <VolumeIcon />
        </button>
      </div>

      <div class="abyssfin-preview-body">
        <div class="abyssfin-preview-actions">
          <button
            type="button"
            class="abyssfin-btn-play itemAction"
            data-action="play"
            data-id={mediaItem.Id}
            data-type={mediaItem.Type}
            data-mediatype={mediaItem.MediaType || 'Video'}
            title="Play"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
              playMediaItem(mediaItem);
            }}
          >
            <PlayIcon />
          </button>

          <button
            type="button"
            class={`abyssfin-btn-action ${played ? 'is-active' : ''}`}
            title={played ? 'Watched' : 'Mark as Watched'}
            onClick={(e) => {
              e.stopPropagation();
              toggleMediaPlayed(mediaItem, setPlayed);
            }}
          >
            {played ? <CheckIcon /> : <PlusIcon />}
          </button>

          <button
            type="button"
            class={`abyssfin-btn-action ${favorite ? 'is-favorite is-active' : ''}`}
            title={favorite ? 'In favourites' : 'Add to favourites'}
            onClick={(e) => {
              e.stopPropagation();
              toggleMediaFavorite(mediaItem, setFavorite);
            }}
          >
            <HeartIcon filled={favorite} />
          </button>

          <button
            type="button"
            class="abyssfin-btn-action abyssfin-btn-more"
            title="More Info"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
              openMediaDetails(mediaItem);
            }}
          >
            <ChevronDownIcon />
          </button>
        </div>

        <div class="abyssfin-preview-meta-row">
          {meta.type && <span class="abyssfin-meta-type">{meta.type}</span>}
          {meta.rating && <span class="abyssfin-badge-rating">{meta.rating}</span>}
          {meta.duration && <span class="abyssfin-meta-duration">{meta.duration}</span>}
          {meta.resolution && <span class="abyssfin-badge-pill">{meta.resolution}</span>}
          {meta.isHdr && <span class="abyssfin-badge-pill">HDR</span>}
          {meta.audio && <span class="abyssfin-badge-pill abyssfin-badge-audio">{meta.audio}</span>}
        </div>

        {meta.genres.length > 0 && (
          <div class="abyssfin-preview-genres">
            {meta.genres.map((genre, idx) => (
              <span key={genre} class="abyssfin-genre-item">
                {idx > 0 && <span class="abyssfin-genre-bullet">•</span>}
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CardPreviewBottomSheet({ item: mediaItem, meta, onClose }) {
  const [favorite, setFavorite] = useState(meta.isFavorite);
  const [played, setPlayed] = useState(meta.isPlayed);

  return (
    <div class="abyssfin-sheet-container">
      <div class="abyssfin-sheet-backdrop" onClick={onClose} />
      <div class="abyssfin-sheet-panel">
        <div class="abyssfin-sheet-handle-bar">
          <div class="abyssfin-sheet-handle" />
          <button type="button" class="abyssfin-sheet-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div
          class="abyssfin-sheet-media"
          onClick={() => {
            onClose();
            openMediaDetails(mediaItem);
          }}
        >
          {meta.backdropUrl ? (
            <img class="abyssfin-sheet-backdrop-img" src={meta.backdropUrl} alt={meta.name} />
          ) : (
            <div class="abyssfin-sheet-fallback-img" />
          )}
          <div class="abyssfin-sheet-vignette" />
          <div class="abyssfin-sheet-title-box">
            {meta.logoUrl ? (
              <img class="abyssfin-sheet-logo" src={meta.logoUrl} alt={meta.name} />
            ) : (
              <span class="abyssfin-sheet-title-text">{meta.name}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          class="abyssfin-sheet-play-btn"
          onClick={() => {
            playMediaItem(mediaItem);
            onClose();
          }}
        >
          <PlayIcon />
          <span>Play</span>
        </button>

        <div class="abyssfin-sheet-actions">
          <button
            type="button"
            class={`abyssfin-sheet-icon-btn ${favorite ? 'is-active is-favorite' : ''}`}
            onClick={() => toggleMediaFavorite(mediaItem, setFavorite)}
          >
            <HeartIcon filled={favorite} />
            <span>{favorite ? 'In favourites' : 'Favourites'}</span>
          </button>

          <button
            type="button"
            class={`abyssfin-sheet-icon-btn ${played ? 'is-active' : ''}`}
            onClick={() => toggleMediaPlayed(mediaItem, setPlayed)}
          >
            <CheckIcon />
            <span>{played ? 'Watched' : 'Mark Watched'}</span>
          </button>

          <button
            type="button"
            class="abyssfin-sheet-icon-btn"
            onClick={() => {
              onClose();
              openMediaDetails(mediaItem);
            }}
          >
            <InfoIcon />
            <span>Details</span>
          </button>
        </div>

        <div class="abyssfin-preview-meta-row" style={{ marginTop: '14px' }}>
          {meta.type && <span class="abyssfin-meta-type">{meta.type}</span>}
          {meta.rating && <span class="abyssfin-badge-rating">{meta.rating}</span>}
          {meta.duration && <span class="abyssfin-meta-duration">{meta.duration}</span>}
          {meta.resolution && <span class="abyssfin-badge-pill">{meta.resolution}</span>}
          {meta.isHdr && <span class="abyssfin-badge-pill">HDR</span>}
          {meta.audio && <span class="abyssfin-badge-pill abyssfin-badge-audio">{meta.audio}</span>}
        </div>

        {meta.overview && <p class="abyssfin-sheet-overview">{meta.overview}</p>}

        {meta.genres.length > 0 && (
          <div class="abyssfin-preview-genres">
            {meta.genres.map((genre, idx) => (
              <span key={genre} class="abyssfin-genre-item">
                {idx > 0 && <span class="abyssfin-genre-bullet">•</span>}
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function createCardPreviewFeature(cache) {
  let portalElement = null;
  let showTimer = 0;
  let hideTimer = 0;
  let activeCard = null;
  let activeId = null;
  let isPointerInPopover = false;
  let tvFocusTimer = 0;
  let tvFocusedId = null;

  function ensurePortal() {
    if (!portalElement || !dom.isConnected(portalElement)) {
      portalElement = document.getElementById(PORTAL_ID);
      if (!portalElement) {
        portalElement = document.createElement('div');
        portalElement.id = PORTAL_ID;
        document.body.appendChild(portalElement);
      }
    }
    return portalElement;
  }

  function closePreview() {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    window.clearTimeout(tvFocusTimer);
    showTimer = 0;
    hideTimer = 0;
    tvFocusTimer = 0;
    activeCard = null;
    activeId = null;
    tvFocusedId = null;
    isPointerInPopover = false;
    if (portalElement) {
      render(null, portalElement);
    }
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (!isPointerInPopover) {
        closePreview();
      }
    }, HIDE_DELAY_MS);
  }

  async function resolveMediaItem(id) {
    if (cache.has(id) && cache.get(id)) return cache.get(id);

    const client = window.ApiClient;
    const userId = client?.getCurrentUserId?.();
    if (!client || !userId) return null;

    try {
      const mediaItem = await client.getItem(userId, id);
      cache.set(id, mediaItem);
      return mediaItem;
    } catch {
      return null;
    }
  }

  async function showDesktopPopover(card, id) {
    if (!card || !dom.isConnected(card) || !isPreviewableCard(card)) return;

    const mediaItem = await resolveMediaItem(id);
    if (!mediaItem || activeId !== id) return;

    const meta = extractMediaMeta(mediaItem);
    if (!meta) return;

    const rect = card.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const position = calculateDesktopPosition(rect);
    const portal = ensurePortal();

    render(
      <CardPreviewPopOver
        item={mediaItem}
        meta={meta}
        position={position}
        onEnter={() => {
          isPointerInPopover = true;
          window.clearTimeout(hideTimer);
        }}
        onLeave={() => {
          isPointerInPopover = false;
          scheduleHide();
        }}
        onClose={closePreview}
      />,
      portal
    );
  }

  async function showMobileBottomSheet(card, id) {
    if (!isPreviewableCard(card)) return;

    const mediaItem = await resolveMediaItem(id);
    if (!mediaItem) return;

    const meta = extractMediaMeta(mediaItem);
    if (!meta) return;

    const portal = ensurePortal();
    render(<CardPreviewBottomSheet item={mediaItem} meta={meta} onClose={closePreview} />, portal);
  }

  function onPointerEnter(event) {
    if (isTouchDevice() || isTvLayout()) return;

    const card = event.target.closest('.card[data-id]');
    if (!card || !isPreviewableCard(card)) return;

    const id = card.dataset.id;
    if (!id) return;

    window.clearTimeout(hideTimer);
    window.clearTimeout(showTimer);

    activeCard = card;
    activeId = id;

    showTimer = window.setTimeout(() => {
      if (activeCard === card && activeId === id) {
        showDesktopPopover(card, id);
      }
    }, HOVER_DELAY_MS);
  }

  function onPointerLeave(event) {
    if (isTouchDevice() || isTvLayout()) return;

    const card = event.target.closest('.card[data-id]');
    if (!card) return;

    window.clearTimeout(showTimer);
    scheduleHide();
  }

  function onCardClick(event) {
    // DO NOT intercept desktop clicks!
    if (!isTouchDevice()) return;

    const card = event.target.closest ? event.target.closest('.card[data-id]') : null;
    // Never intercept non-media items (e.g. My Media collection folders)
    if (!card || !isPreviewableCard(card)) return;

    // Ignore real controls, but allow the main card link to open the sheet on first tap.
    if (event.target.closest('button, input, select, textarea, .cardOverlayButton, .cardOverlayFab-primary, .cardOverlayButton-centered, .cardOverlayButtonIcon')) return;

    const id = card.dataset.id;
    if (!id) return;

    event.preventDefault();
    event.stopPropagation();
    showMobileBottomSheet(card, id);
  }

  function showTvPopover(card, id) {
    if (!card || !dom.isConnected(card) || !isPreviewableCard(card)) return;
    resolveMediaItem(id).then((mediaItem) => {
      if (!mediaItem || tvFocusedId !== id || !dom.isConnected(card)) return;
      const meta = extractMediaMeta(mediaItem);
      if (!meta) return;
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const position = calculateDesktopPosition(rect);
      const portal = ensurePortal();
      render(
        <CardPreviewPopOver
          item={mediaItem}
          meta={meta}
          position={position}
          onEnter={() => window.clearTimeout(hideTimer)}
          onLeave={() => scheduleHide()}
          onClose={closePreview}
        />,
        portal
      );
    });
  }

  function onCardFocus(event) {
    if (!isTvLayout()) return;
    const card = event.target.closest ? event.target.closest('.card[data-id]') : null;
    if (!card || !isPreviewableCard(card)) return;
    window.clearTimeout(tvFocusTimer);
    window.clearTimeout(hideTimer);
    try {
      card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch {
      // scrollIntoView may be unavailable on older TV browsers.
    }
  }

  function onCardBlur(event) {
    if (!isTvLayout()) return;
    window.clearTimeout(tvFocusTimer);
    tvFocusTimer = 0;
    tvFocusedId = null;
    scheduleHide();
  }

  function onTvKeyDown(event) {
    if (!isTvLayout()) return;
    if (event.key === 'Escape' || event.keyCode === 461) {
      tvFocusedId = null;
      closePreview();
    }
  }

  let started = false;

  function start() {
    if (started) return;
    started = true;

    document.addEventListener('pointerenter', onPointerEnter, true);
    document.addEventListener('pointerleave', onPointerLeave, true);
    document.addEventListener('click', onCardClick, true);
    document.addEventListener('focusin', onCardFocus, true);
    document.addEventListener('focusout', onCardBlur, true);
    document.addEventListener('keydown', onTvKeyDown, true);
    window.addEventListener('scroll', closePreview, { passive: true, capture: true });
    window.addEventListener('wheel', closePreview, { passive: true });
    window.addEventListener('hashchange', closePreview, { passive: true });
    window.addEventListener('popstate', closePreview, { passive: true });
  }

  function stop() {
    started = false;
    document.removeEventListener('pointerenter', onPointerEnter, true);
    document.removeEventListener('pointerleave', onPointerLeave, true);
    document.removeEventListener('click', onCardClick, true);
    document.removeEventListener('focusin', onCardFocus, true);
    document.removeEventListener('focusout', onCardBlur, true);
    document.removeEventListener('keydown', onTvKeyDown, true);
    window.clearTimeout(tvFocusTimer);
    tvFocusTimer = 0;
    tvFocusedId = null;
    window.removeEventListener('scroll', closePreview, { passive: true, capture: true });
    window.removeEventListener('wheel', closePreview, { passive: true });
    window.removeEventListener('hashchange', closePreview, { passive: true });
    window.removeEventListener('popstate', closePreview, { passive: true });
    closePreview();
    if (portalElement) {
      portalElement.remove();
      portalElement = null;
    }
  }

  return { start, stop, closePreview };
}
