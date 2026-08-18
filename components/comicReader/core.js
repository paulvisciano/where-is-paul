// ============================================================================
// Comic Reader Core Logic
// ============================================================================
// Shared business logic used by all device-specific readers

// Global state manager to prevent flipbook state from being wiped
window.ComicReaderState = window.ComicReaderState || {
  flipbookCreated: false,
  episodeData: null,
  currentPage: 1,
  totalPages: 0,
  flipbookReady: false,
  isVisible: false,
  isLoading: true
};

// Function to update global state
const updateGlobalState = (updates) => {
  Object.assign(window.ComicReaderState, updates);
};

// Function to get global state
const getGlobalState = () => window.ComicReaderState;

/**
 * Parse slide index from URL hash.
 * Supports: #slug (when episodeData.pageSlugs is set), #slide-N, #page-N (1-based).
 * Returns 1-based slide number or null if invalid/absent.
 * @param {object} [episodeData] - optional; if pageSlugs array present, hash is treated as slug
 */
const parseSlideFromHash = (episodeData) => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || hash === '#') return null;
  const slug = hash.slice(1); // without #
  if (episodeData?.pageSlugs && Array.isArray(episodeData.pageSlugs)) {
    const idx = episodeData.pageSlugs.indexOf(slug);
    if (idx >= 0) return idx + 1; // 1-based
  }
  const m = hash.match(/^#(?:slide|page)-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
};

/**
 * Update URL to reflect current slide (uses replaceState to avoid history pollution).
 * Uses #slug when episodeData.pageSlugs is set, else #page-N.
 * @param {string} basePath - e.g. /moments/miami/2025-10-06/
 * @param {number} slideIndex - 0-based slide index
 * @param {object} [episodeData] - optional; if pageSlugs array present, hash is set to slug
 */
const updateUrlForSlide = (basePath, slideIndex, episodeData) => {
  if (typeof window === 'undefined') return;
  let newHash;
  if (episodeData?.pageSlugs && Array.isArray(episodeData.pageSlugs) && slideIndex >= 0 && slideIndex < episodeData.pageSlugs.length) {
    newHash = '#' + episodeData.pageSlugs[slideIndex];
  } else {
    newHash = '#page-' + (slideIndex + 1); // 1-based fallback
  }
  const newUrl = basePath.replace(/#.*$/, '') + newHash;
  const finalUrl = window.withBase ? window.withBase(newUrl) : newUrl;
  window.history.replaceState(
    { ...(window.history.state || {}), slideIndex: slideIndex + 1 },
    '',
    finalUrl
  );
};

/**
 * Check if a URL is a video file
 */
const isVideoFile = (url) => {
  if (!url || typeof url !== 'string') return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.endsWith(ext));
};

/**
 * Generate pages dynamically based on available files
 * Supports both images (PNG) and videos (MP4, WebM, etc.)
 * 
 * If episodeData.pages is provided (array of URLs), use that directly.
 * Otherwise, generate page URLs based on pageCount (defaults to PNG files).
 * 
 * To use videos, specify them in the pages array:
 * pages: [
 *   '/moments/episode/page-01.png',
 *   '/moments/episode/page-02.mp4',  // Video page
 *   '/moments/episode/page-03.png',
 *   ...
 * ]
 */
const getPages = (episodeData) => {
  if (!episodeData) {
    return [];
  }
  
  // If custom pages array is provided, use it directly
  if (episodeData.pages && Array.isArray(episodeData.pages)) {
    // For character comic book, return full page objects (image, video, bio, etc.) for CharacterSlideViewer
    if (episodeData.id === 'characters-comic-book') {
      return episodeData.pages;
    }
    return episodeData.pages;
  }
  
  // Otherwise, generate pages based on pageCount
  const basePath = episodeData.fullLink.replace(/\/$/, '');
  const pagesArray = []; // Don't include cover - it's handled separately
  
  // For new episodes, we'll need to add a pageCount property to the episode data
  // For now, use a reasonable default and let the browser handle 404s gracefully
  const maxPages = episodeData.pageCount || 50; // Default to 50, can be overridden per episode
  
  for (let i = 1; i <= maxPages; i++) {
    const pageNum = i.toString().padStart(2, '0');
    // Default to PNG files
    const pngUrl = `${basePath}/page-${pageNum}.png`;
    pagesArray.push(pngUrl);
  }
  
  return pagesArray;
};

/**
 * Resolve episode for prev/next lookup. Character comic uses id "characters-comic-book"
 * but the moment in momentsInTime has "characters-comic-book-2025-09-15" with date.
 */
const resolveEpisodeForNav = (episodeData) => {
  if (!episodeData || !window.momentsInTime) return null;
  if (episodeData.id === 'characters-comic-book') {
    const moment = window.momentsInTime.find(m => m.id === 'characters-comic-book-2025-09-15');
    return moment || episodeData;
  }
  return episodeData;
};

/**
 * Find the next episode in the series
 */
const getNextEpisode = (episodeData) => {
  const resolved = resolveEpisodeForNav(episodeData);
  if (!resolved || !window.momentsInTime) return null;

  const currentEpisodeId = resolved.id;
  const currentDate = resolved.date;
  if (currentDate == null) return null;

  const futureComics = window.momentsInTime
    .filter(moment =>
      moment.isComic &&
      moment.date > currentDate &&
      moment.id !== currentEpisodeId
    )
    .sort((a, b) => a.date - b.date);

  return futureComics.length > 0 ? futureComics[0] : null;
};

/**
 * Find the previous episode in the series
 */
const getPreviousEpisode = (episodeData) => {
  const resolved = resolveEpisodeForNav(episodeData);
  if (!resolved || !window.momentsInTime) return null;

  const currentEpisodeId = resolved.id;
  const currentDate = resolved.date;
  if (currentDate == null) return null;

  const pastComics = window.momentsInTime
    .filter(moment =>
      moment.isComic &&
      moment.date < currentDate &&
      moment.id !== currentEpisodeId
    )
    .sort((a, b) => b.date - a.date);

  return pastComics.length > 0 ? pastComics[0] : null;
};

/**
 * Find current episode from URL path
 */
const findCurrentEpisode = () => {
  // Check if this is the Character Bible route
  const currentPath = window.stripBase ? window.stripBase(window.location.pathname) : window.location.pathname;
  if ((currentPath === '/characters' || currentPath.startsWith('/characters/')) && window.currentCharacterComicBook) {
    return window.currentCharacterComicBook;
  }
  
  // Check if we have character comic book in global state
  if (window.currentCharacterComicBook && window.currentCharacterComicBook.id === 'characters-comic-book') {
    return window.currentCharacterComicBook;
  }
  
  if (!window.momentsInTime) {
    return null;
  }
  
  const currentMoment = window.momentsInTime.find(m => {
    if (!m.isComic) return false;
    const episodePath = m.fullLink.replace(/\/$/, ''); // Remove trailing slash
    return currentPath.includes(episodePath);
  });
  
  if (currentMoment) {
    return currentMoment;
  }
  
  // Fallback episode data for Bangkok Episode 20
  return {
    id: 'urban-runner-episode-20-2025-09-16',
    title: 'Urban Runner Episode 20: Comic Book Edition',
    fullLink: '/moments/bangkok/2025-09-16/',
    location: { name: 'Bangkok, Thailand' },
    date: new Date('2025-09-16T00:00:00Z')
  };
};

/**
 * Calculate page increment/decrement based on device type
 * Mobile: 1 page at a time
 * Tablet/Desktop: 2 pages at a time (2-page spreads)
 */
const getPageIncrement = (deviceType) => {
  return deviceType === 'mobile' ? 1 : 2;
};

/**
 * Preload the next 2 pages (by index). Used for:
 * - Cover: fromIndex 0 → preload first 2 pages (indices 0, 1).
 * - Viewing page N (1-based): fromIndex N → preload next 2 pages (indices N, N+1).
 * Skips video URLs.
 * Handles both URL strings and page objects (e.g. character comic: { image, video, ... }).
 */
const preloadNextTwoPages = (pages, fromIndex, isVideoFile) => {
  if (!pages || !pages.length) return;
  [fromIndex, fromIndex + 1].forEach((i) => {
    if (i < 0 || i >= pages.length) return;
    const page = pages[i];
    const url = typeof page === 'string' ? page : (page && page.image);
    if (!url || typeof url !== 'string') return;
    if (isVideoFile && isVideoFile(url)) return;
    const img = new Image();
    img.src = window.withBase ? window.withBase(url) : url;
  });
};

/**
 * Preload videos for the next 2 character comic pages (by index).
 * Creates hidden video elements with preload="auto" to start downloading.
 */
const preloadCharacterVideos = (pages, fromIndex) => {
  if (!pages || !pages.length) return;
  [fromIndex, fromIndex + 1].forEach((i) => {
    if (i < 0 || i >= pages.length) return;
    const page = pages[i];
    const url = page && page.video;
    if (!url || typeof url !== 'string') return;
    const video = document.createElement('video');
    video.preload = 'auto';
    video.src = window.withBase ? window.withBase(url) : url;
    video.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);
    video.load();
    setTimeout(() => { if (video.parentNode) video.parentNode.removeChild(video); }, 30000);
  });
};

/**
 * Export core utilities
 */
window.ComicReaderCore = {
  updateGlobalState,
  getGlobalState,
  getPages,
  getNextEpisode,
  getPreviousEpisode,
  findCurrentEpisode,
  getPageIncrement,
  isVideoFile,
  preloadNextTwoPages,
  preloadCharacterVideos,
  parseSlideFromHash,
  updateUrlForSlide
};

