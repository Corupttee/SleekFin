import { Button, Facts, h, item, useState } from '../../shared/runtime.js';

export function HeroSlide({ entry, active, settings, index = 0, library = 'home' }) {
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const displayItem = entry.display;
  const logoUrl = item.imageUrl(displayItem, 'Logo');
  const backdropUrl = item.imageUrl(displayItem, 'Backdrop');
  const showLogo = settings.titleTreatment !== 'Text' && logoUrl && !logoFailed;
  const showText = settings.titleTreatment !== 'Logo' && !showLogo;
  const rating = Number(displayItem.CommunityRating || 0);
  const facts = [];
  const genres = (displayItem.Genres || []).slice(0, 2);
  genres.forEach((genre) => facts.push({ text: genre }));
  const year = item.year(displayItem);
  if (year) facts.push({ text: year });
  const runtime = item.formatRuntime(displayItem.RunTimeTicks) || (displayItem.Type === 'Series' && displayItem.ChildCount ? `${displayItem.ChildCount} Season${displayItem.ChildCount > 1 ? 's' : ''}` : '');
  if (runtime) facts.push({ text: runtime });
  if (displayItem.OfficialRating) facts.push({ text: displayItem.OfficialRating });
  if (rating > 0) facts.push({ className: 'sleekfin-hero-score', icon: 'star', text: rating.toFixed(1) });

  const created = displayItem.DateCreated ? new Date(displayItem.DateCreated).getTime() : 0;
  const isRecent = created > 0 && Date.now() - created < 45 * 24 * 3600 * 1000;
  const libraryLabel = library === 'movies' ? 'Movies' : library === 'series' ? 'Shows' : displayItem.Type === 'Series' ? 'Shows' : 'Movies';
  const topRank = index < 10 ? index + 1 : 0;

  return (
    <section class="sleekfin-hero-slide" data-active={active ? 'true' : 'false'}>
      {backdropUrl && <img class="sleekfin-hero-backdrop" src={backdropUrl} data-loaded={backdropLoaded ? 'true' : 'false'} onLoad={() => setBackdropLoaded(true)} />}
      <div class="sleekfin-hero-vignette" />
      <div class="sleekfin-hero-seam" />
      <div class="sleekfin-hero-content">
        <div class="sleekfin-hero-stack">
          <div class="sleekfin-hero-title-box">
            {showLogo && <img class="sleekfin-hero-title-logo" src={logoUrl} data-loaded={logoLoaded ? 'true' : 'false'} onLoad={() => setLogoLoaded(true)} onError={() => setLogoFailed(true)} />}
            {showText && <span class="sleekfin-hero-title">{displayItem.Name || ''}</span>}
          </div>
          <div class="sleekfin-hero-facts">
            <Facts values={facts} />
          </div>
          {displayItem.Overview && <p class="sleekfin-hero-description">{displayItem.Overview}</p>}
          <div class="sleekfin-hero-actions">
            <Button {...item.actionAttributes(entry.play, 'play')} variant="primary" icon="play" label="Play" />
            <Button {...item.actionAttributes(displayItem, 'link')} variant="control" icon="info" label="More Info" />
          </div>
        </div>
        <div class="sleekfin-hero-badges">
          {isRecent && <span class="sleekfin-hero-badge sleekfin-hero-badge-recent"><span class="sleekfin-hero-badge-dot" />Recently Added</span>}
          {topRank > 0 && <span class="sleekfin-hero-badge sleekfin-hero-badge-top"><span class="sleekfin-hero-badge-top10">TOP 10</span>#{topRank} in {libraryLabel}</span>}
        </div>
      </div>
    </section>
  );
}
