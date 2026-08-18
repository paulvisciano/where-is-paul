// ============================================================================
// Device-Specific Flipbook Creation and Updates
// ============================================================================

/**
 * Convert style object to CSS string for cssText
 */
const styleObjectToCss = (styleObj) => {
  return Object.entries(styleObj)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value};`;
    })
    .join(' ');
};

/**
 * Create either an image or video element based on the URL.
 */
const createMediaElement = (url, alt, style, isVideoFile) => {
  if (isVideoFile && isVideoFile(url)) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.autoplay = false;
    video.loop = false;
    video.muted = false;
    video.playsInline = true;
    // Override objectFit to 'cover' for videos
    const videoStyle = { ...style, objectFit: 'cover' };
    video.style.cssText = styleObjectToCss(videoStyle);
    video.setAttribute('data-page-url', url);
    // Stop click events from bubbling to page navigation handlers
    // Use capture phase to catch all clicks including on video controls
    video.addEventListener('click', (e) => {
      e.stopPropagation();
    }, true);
    video.onerror = () => {
      // If video fails to load, try to show error or fallback
      console.warn(`Video failed to load: ${url}`);
    };
    return video;
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.style.cssText = styleObjectToCss(style);
    img.onerror = () => {};
    return img;
  }
};

/**
 * Create flipbook structure for mobile (single page view)
 */
const createMobileFlipbook = (flipbookElement, currentPages, styles) => {
  if (!styles) {
    console.error('ComicReaderFlipbook: styles object is required');
    return { leftPage: null, rightPage: null };
  }
  
  const spreadContainer = document.createElement('div');
  spreadContainer.className = 'simple-flipbook-spread';
  spreadContainer.style.cssText = styleObjectToCss(styles.spreadContainerStyle);
  
  // Create left page (full width for mobile)
  const leftPage = document.createElement('div');
  leftPage.className = 'simple-flipbook-page left-page';
  leftPage.style.cssText = styleObjectToCss(styles.mobileLeftPageStyle);
  
  spreadContainer.appendChild(leftPage);
  flipbookElement.appendChild(spreadContainer);
  
  return { leftPage, rightPage: null };
};

/**
 * Create flipbook structure for tablet/desktop (two-page spread)
 */
const createDesktopFlipbook = (flipbookElement, currentPages, styles) => {
  if (!styles) {
    console.error('ComicReaderFlipbook: styles object is required');
    return { leftPage: null, rightPage: null };
  }
  
  const spreadContainer = document.createElement('div');
  spreadContainer.className = 'simple-flipbook-spread';
  spreadContainer.style.cssText = styleObjectToCss(styles.spreadContainerStyle);
  
  // Create left page
  const leftPage = document.createElement('div');
  leftPage.className = 'simple-flipbook-page left-page';
  leftPage.style.cssText = styleObjectToCss(styles.desktopLeftPageStyle);
  
  // Create right page
  const rightPage = document.createElement('div');
  rightPage.className = 'simple-flipbook-page right-page';
  rightPage.style.cssText = styleObjectToCss(styles.desktopRightPageStyle);
  
  spreadContainer.appendChild(leftPage);
  spreadContainer.appendChild(rightPage);
  flipbookElement.appendChild(spreadContainer);
  
  return { leftPage, rightPage };
};

/**
 * Update pages for mobile (single page view)
 */
const updateMobilePages = (leftPage, pageNumber, currentPages, previousPage, nextPage, styles) => {
  if (!leftPage || !styles) return;
  
  leftPage.innerHTML = '';
  const pageIndex = pageNumber - 1; // 0-based index
  
  // Get isVideoFile function from core
  const isVideoFile = window.ComicReaderCore?.isVideoFile;
  
  // Create container for page and navigation
  const pageContainer = document.createElement('div');
  pageContainer.style.cssText = styleObjectToCss(styles.mobilePageContainerStyle);
  
  // Create page content area
  const pageContent = document.createElement('div');
  pageContent.style.cssText = styleObjectToCss(styles.mobilePageContentStyle);
  
  if (pageIndex >= 0 && pageIndex < currentPages.length) {
    const pageUrl = window.withBase ? window.withBase(currentPages[pageIndex]) : currentPages[pageIndex];
    const mediaElement = createMediaElement(
      pageUrl,
      `Page ${pageNumber}`,
      styles.mobilePageImageStyle,
      isVideoFile
    );
    pageContent.appendChild(mediaElement);
  } else {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = styleObjectToCss(styles.errorMessageStyle);
    errorDiv.textContent = `No page ${pageNumber}`;
    pageContent.appendChild(errorDiv);
  }
  
  pageContainer.appendChild(pageContent);
  leftPage.appendChild(pageContainer);

  const preload = window.ComicReaderCore?.preloadNextTwoPages;
  if (preload) preload(currentPages, pageNumber, isVideoFile);
};

/**
 * Update pages for tablet/desktop (two-page spread)
 */
const updateDesktopPages = (leftPage, rightPage, pageNumber, currentPages, previousPage, nextPage, styles) => {
  if (!leftPage || !styles) return;
  
  // Get isVideoFile function from core
  const isVideoFile = window.ComicReaderCore?.isVideoFile;
  
  // Clear existing content
  leftPage.innerHTML = '';
  if (rightPage) rightPage.innerHTML = '';
  
  const leftPageIndex = pageNumber - 1; // 0-based index for left page
  const rightPageIndex = pageNumber; // 0-based index for right page
  
  // Add left page (image or video)
  if (leftPageIndex >= 0 && leftPageIndex < currentPages.length) {
    const leftPageUrl = window.withBase ? window.withBase(currentPages[leftPageIndex]) : currentPages[leftPageIndex];
    const leftMedia = createMediaElement(
      leftPageUrl,
      `Page ${leftPageIndex + 1}`,
      styles.desktopPageImageStyle,
      isVideoFile
    );
    leftPage.appendChild(leftMedia);
  } else {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = styleObjectToCss(styles.errorMessageStyle);
    errorDiv.textContent = `No page ${leftPageIndex + 1}`;
    leftPage.appendChild(errorDiv);
  }
  
  // Add right page (image or video)
  if (rightPage && rightPageIndex >= 0 && rightPageIndex < currentPages.length) {
    const rightPageUrl = window.withBase ? window.withBase(currentPages[rightPageIndex]) : currentPages[rightPageIndex];
    const rightMedia = createMediaElement(
      rightPageUrl,
      `Page ${rightPageIndex + 1}`,
      styles.desktopPageImageStyle,
      isVideoFile
    );
    rightMedia.onerror = () => {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = styleObjectToCss(styles.errorMessageStyle);
      errorDiv.textContent = `Page ${rightPageIndex + 1} - Media failed to load`;
      rightPage.innerHTML = '';
      rightPage.appendChild(errorDiv);
    };
    rightPage.appendChild(rightMedia);
  } else if (rightPage) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = styleObjectToCss(styles.errorMessageStyle);
    errorDiv.textContent = `No page ${rightPageIndex + 1}`;
    rightPage.appendChild(errorDiv);
  }
  
  // Add click handlers for desktop navigation
  // Don't trigger navigation if clicking on video elements or their controls
  leftPage.onclick = (e) => {
    // Check if click is on a video element or video controls
    const target = e.target;
    const isVideoClick = target.tagName === 'VIDEO' || 
                         target.closest('video') !== null ||
                         target.closest('.video-controls') !== null;
    
    if (!isVideoClick) {
      e.stopPropagation();
      previousPage();
    }
  };
  if (rightPage) {
    rightPage.onclick = (e) => {
      // Check if click is on a video element or video controls
      const target = e.target;
      const isVideoClick = target.tagName === 'VIDEO' || 
                           target.closest('video') !== null ||
                           target.closest('.video-controls') !== null;
      
      if (!isVideoClick) {
        e.stopPropagation();
        nextPage();
      }
    };
  }

  const preload = window.ComicReaderCore?.preloadNextTwoPages;
  if (preload) preload(currentPages, pageNumber, isVideoFile);
};

/**
 * Create flipbook based on device type and orientation
 */
const createFlipbook = (flipbookElement, deviceType, orientation, currentPages, styles) => {
  if (!styles) {
    console.error('ComicReaderFlipbook: styles object is required');
    return { leftPage: null, rightPage: null };
  }
  
  // Portrait = single page, Landscape = two-page spread
  const useSinglePage = orientation === 'portrait';
  
  if (useSinglePage) {
    return createMobileFlipbook(flipbookElement, currentPages, styles);
  } else {
    return createDesktopFlipbook(flipbookElement, currentPages, styles);
  }
};

/**
 * Update pages based on device type and orientation
 */
const updatePages = (deviceType, orientation, leftPage, rightPage, pageNumber, currentPages, previousPage, nextPage, styles) => {
  if (!styles) {
    console.error('ComicReaderFlipbook: styles object is required');
    return;
  }
  
  // Portrait = single page, Landscape = two-page spread
  const useSinglePage = orientation === 'portrait';

  if (useSinglePage) {
    updateMobilePages(leftPage, pageNumber, currentPages, previousPage, nextPage, styles);
  } else {
    updateDesktopPages(leftPage, rightPage, pageNumber, currentPages, previousPage, nextPage, styles);
  }
};

// Export utilities
window.ComicReaderFlipbook = {
  createFlipbook,
  updatePages
};

