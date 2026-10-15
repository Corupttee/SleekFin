import { normalizeSettings } from './settings.js';

const ITEM_FIELDS = 'Overview,Genres,DateCreated,ProductionYear,PremiereDate,CommunityRating,OfficialRating,RunTimeTicks,ChildCount,Taglines';

export function loadSettings(client) {
  return client.ajax({
    type: 'GET',
    url: client.getUrl('SleekFin/Hero/Settings'),
    dataType: 'json',
  }).then(normalizeSettings).catch(() => normalizeSettings({ enabled: true }));
}

function itemQuery(client, options) {
  const query = Object.assign({}, options, {
    EnableTotalRecordCount: false,
    Fields: ITEM_FIELDS,
    ImageTypeLimit: 1,
    Limit: 10,
    Recursive: true,
  });
  return client.getItems(client.getCurrentUserId(), query).then((result) => result.Items || []);
}

export function currentLibraryScope() {
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  const params = queryIndex >= 0 ? new URLSearchParams(hash.slice(queryIndex)) : new URLSearchParams();
  const topParentId = params.get('topParentId') || params.get('parentId') || params.get('id') || '';
  const path = hash.replace(/^#\/?/, '').split('?')[0].toLowerCase();
  if (path.includes('movies')) return { kind: 'movies', topParentId };
  if (path.includes('tv') || path.includes('shows') || path.includes('series')) return { kind: 'series', topParentId };
  return { kind: 'home', topParentId };
}

function scopedQuery(client, base) {
  const scope = currentLibraryScope();
  const query = Object.assign({}, base);
  if (scope.topParentId) query.ParentId = scope.topParentId;
  if (scope.kind === 'movies' && !query.IncludeItemTypes) query.IncludeItemTypes = 'Movie';
  if (scope.kind === 'series' && !query.IncludeItemTypes) query.IncludeItemTypes = 'Series,Episode';
  return query;
}

function loadSource(client, source) {
  const scope = currentLibraryScope();
  switch (source) {
    case 'ContinueWatching':
      return itemQuery(client, scopedQuery(client, {
        Filters: 'IsResumable',
        IncludeItemTypes: scope.kind === 'movies' ? 'Movie' : scope.kind === 'series' ? 'Episode' : 'Movie,Episode',
        SortBy: 'DatePlayed',
        SortOrder: 'Descending',
      }));
    case 'NextUp':
      if (scope.kind === 'movies') return Promise.resolve([]);
      return client
        .getNextUpEpisodes({
          EnableTotalRecordCount: false,
          Fields: ITEM_FIELDS,
          Limit: 10,
          ParentId: scope.topParentId || undefined,
          UserId: client.getCurrentUserId(),
        })
        .then((result) => result.Items || []);
    case 'LatestMovies':
      if (scope.kind === 'series') return Promise.resolve([]);
      return itemQuery(client, scopedQuery(client, {
        IncludeItemTypes: 'Movie',
        SortBy: 'DateCreated',
        SortOrder: 'Descending',
      }));
    case 'LatestShows':
      if (scope.kind === 'movies') return Promise.resolve([]);
      return itemQuery(client, scopedQuery(client, {
        IncludeItemTypes: 'Series',
        SortBy: 'DateCreated',
        SortOrder: 'Descending',
      }));
    case 'Favorites':
      return itemQuery(client, scopedQuery(client, {
        Filters: 'IsFavorite',
        IncludeItemTypes: scope.kind === 'movies' ? 'Movie' : scope.kind === 'series' ? 'Series' : 'Movie,Series',
        SortBy: 'SortName',
        SortOrder: 'Ascending',
      }));
    default:
      return Promise.resolve([]);
  }
}

function shuffle(items) {
  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const value = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = value;
  }
  return shuffled;
}

function collect(client, settings) {
  return Promise.all(settings.contentOrder.map((source) => loadSource(client, source).catch(() => []))).then((sources) => {
    const seen = new Set();
    const items = [];
    sources.forEach((sourceItems) => {
      sourceItems.forEach((item) => {
        const identity = item.Type === 'Episode' && item.SeriesId ? item.SeriesId : item.Id;
        if (identity && !seen.has(identity)) {
          seen.add(identity);
          items.push(item);
        }
      });
    });
    return (settings.randomized ? shuffle(items) : items).slice(0, settings.slidesShown);
  });
}

function prepare(client, item) {
  const displayPromise = item.Type === 'Episode' && item.SeriesId ? client.getItem(client.getCurrentUserId(), item.SeriesId).catch(() => item) : Promise.resolve(item);
  return displayPromise.then((displayItem) => ({ display: displayItem, play: item }));
}

export function loadEntries(client, settings) {
  if (!settings.contentOrder.length) return Promise.resolve([]);
  return collect(client, settings).then((items) => Promise.all(items.map((item) => prepare(client, item))));
}
