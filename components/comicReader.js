// Comic Reader Component
// Note: Core logic and utilities are loaded from separate files:
// - components/comicReader/core.js (shared utilities, global state)
// - components/comicReader/deviceDetection.js (device detection)
// - components/comicReader/styles.js (device-specific styles)
// - components/comicReader/flipbook.js (device-specific flipbook creation)
// - components/comicReader/navigation.js (device-specific navigation)
// - components/comicReader/render.js (device-specific render functions)

// Get utilities from loaded modules
const { updateGlobalState, getGlobalState, getPages: coreGetPages, getNextEpisode: coreGetNextEpisode, getPreviousEpisode: coreGetPreviousEpisode, findCurrentEpisode, parseSlideFromHash, updateUrlForSlide } = window.ComicReaderCore || {};
const { createFlipbook: createFlipbookUtil, updatePages: updatePagesUtil } = window.ComicReaderFlipbook || {};
const { getNextPageNumber, getPreviousPageNumber, shouldGoBackToCover, createSwipeHandlers } = window.ComicReaderNavigation || {};
const { 
  renderHeaderButtons, 
  renderCover, 
  renderLoading, 
  renderError, 
  renderFlipbook, 
  renderDesktopControls, 
  renderMobileNavigation, 
  renderContainer,
  renderCoverNavigation,
  renderImmersiveV4,
  renderCharacterSlideViewer
} = window.ComicReaderRender || {};

window.ComicReader = ({ content, onClose }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(0);
  const [showCover, setShowCover] = React.useState(true);
  const [flipbookReady, setFlipbookReady] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const [episodeData, setEpisodeData] = React.useState(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showControls, setShowControls] = React.useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);
  const [isSlidesSwitching, setIsSlidesSwitching] = React.useState(false);
  const [showMobileControls, setShowMobileControls] = React.useState(false);
  const [initialSlideIndex, setInitialSlideIndex] = React.useState(null);
  const isInitializedRef = React.useRef(false);
  const flipbookRef = React.useRef(null);
  const flipbookCreatedRef = React.useRef(false);
  const coverRef = React.useRef(null);
  const containerRef = React.useRef(null); // Ref for the comic-episode-container
  const swiperRef = React.useRef(null); // Ref for Swiper instance (comic cover carousel)
  const swiperContainerRef = React.useRef(null); // Ref for Swiper container element
  const currentPageRef = React.useRef(1);
  const overlayRef = React.useRef(null);
  
  // Use device detection hook
  const deviceType = window.ComicReaderDeviceDetection?.useDeviceType 
    ? window.ComicReaderDeviceDetection.useDeviceType() 
    : 'desktop'; // Fallback to desktop if not loaded
  
  // Use orientation detection hook
  const orientation = window.ComicReaderDeviceDetection?.useOrientation 
    ? window.ComicReaderDeviceDetection.useOrientation() 
    : 'landscape'; // Fallback to landscape if not loaded
  
  // Derived device flags for convenience
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';
  
  // Determine view mode based on orientation (portrait = single page, landscape = two-page)
  const useSinglePage = orientation === 'portrait';

  // Comic Reader 4.0: immersive mode (cover + pages + video) instead of flipbook
  const isV4Episode = episodeData && (episodeData.comicReaderVersion === 4 || episodeData.immersiveComic === true);
  // Character comic book: "The People in My Life" with slide viewer (image, video, narrative per character)
  const isCharacterComicBook = episodeData && episodeData.id === 'characters-comic-book';
  
  React.useEffect(() => {
    if (!isV4Episode && !isCharacterComicBook) {
      setIsVideoPlaying(false);
      setIsSlidesSwitching(false);
    }
  }, [isV4Episode, isCharacterComicBook]);

  // Reset mobile controls visibility when returning to cover
  React.useEffect(() => {
    if (showCover) setShowMobileControls(false);
  }, [showCover]);
  
  // Keep ref in sync with state
  React.useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Touch/swipe gesture handling for mobile and tablets
  // Will be created after nextPage/previousPage are defined
  
  

  // Get episode data from content prop, global state, or momentsInTime
  React.useEffect(() => {
    const isCharacterComicPost = content && (content.postId === 'characters-comic-book' || content.postId === 'characters-comic-book-2025-09-15');
    // First, check if content prop has character comic book data (only on initial load or when already on character comic; don't overwrite when user navigated to another episode via Swiper)
    const isOnCharacterComic = episodeData && (episodeData.id === 'characters-comic-book' || episodeData.id === 'characters-comic-book-2025-09-15');
    if (isCharacterComicPost && window.currentCharacterComicBook && (!episodeData || isOnCharacterComic)) {
      setEpisodeData(window.currentCharacterComicBook);
      updateGlobalState({ episodeData: window.currentCharacterComicBook });
      return;
    }
    
    // Check if content prop has episode data directly
    if (content && content.isComic && content.pages && !episodeData) {
      // Create episode data from content for character comic book
      if (content && (content.postId === 'characters-comic-book' || content.postId === 'characters-comic-book-2025-09-15')) {
        const characterComicData = {
          id: 'characters-comic-book',
          title: content.title,
          isComic: true,
          fullLink: content.fullLink || '/characters/comic-book',
          cover: content.cover,
          pages: content.pages,
          pageCount: content.pageCount || content.pages.length
        };
        setEpisodeData(characterComicData);
        updateGlobalState({ episodeData: characterComicData });
        return;
      }
    }
    
    // When content has postId for a different comic, look up the moment and use it (initial load only; don't overwrite when user has switched covers in Swiper)
    if (content && content.postId && !isCharacterComicPost && !episodeData && window.momentsInTime) {
      const moment = window.momentsInTime.find(m => m.id === content.postId);
      if (moment && moment.isComic) {
        setEpisodeData(moment);
        updateGlobalState({ episodeData: moment });
        return;
      }
    }
    
    const globalState = getGlobalState();
    
    // If we already have episode data in global state, use it
    if (globalState.episodeData && !episodeData) {
      setEpisodeData(globalState.episodeData);
      return;
    }
    
    // Check for character comic book in global window (only when we're not opening a different comic)
    if (window.currentCharacterComicBook && !episodeData && (!content || isCharacterComicPost)) {
      setEpisodeData(window.currentCharacterComicBook);
      updateGlobalState({ episodeData: window.currentCharacterComicBook });
      return;
    }
    
    if (window.momentsInTime && !episodeData && findCurrentEpisode) {
      const currentMoment = findCurrentEpisode();
      if (currentMoment) {
        setEpisodeData(currentMoment);
        updateGlobalState({ episodeData: currentMoment });
      }
    }
  }, [episodeData, content]);

  // Prevent episode data from being reset once it's set
  React.useEffect(() => {
    // Episode data is set and should not be reset
  }, [episodeData]);
  
  const [pages, setPages] = React.useState([]);
  
  // Update pages when episode data changes
  React.useEffect(() => {
    if (!coreGetPages || !episodeData) return;
    const newPages = coreGetPages(episodeData);
    setPages(newPages);
    setTotalPages(newPages.length);
    updateGlobalState({ totalPages: newPages.length });
  }, [episodeData]);

  // When cover is shown, preload the first 2 pages so they're ready when the user opens the book
  React.useEffect(() => {
    if (!showCover || !pages.length) return;
    const preload = window.ComicReaderCore?.preloadNextTwoPages;
    const isVideoFile = window.ComicReaderCore?.isVideoFile;
    if (preload && isVideoFile) preload(pages, 0, isVideoFile);
    if (episodeData?.id === 'characters-comic-book') {
      const preloadVideos = window.ComicReaderCore?.preloadCharacterVideos;
      if (preloadVideos) preloadVideos(pages, 0);
    }
  }, [showCover, pages, episodeData]);

  // Helper to get pages (for use in functions)
  const getPages = () => {
    if (!coreGetPages || !episodeData) return [];
    return coreGetPages(episodeData);
  };
  
  // Helper to get next episode
  const getNextEpisode = () => {
    if (!coreGetNextEpisode || !episodeData) return null;
    return coreGetNextEpisode(episodeData);
  };

  const getPreviousEpisode = () => {
    if (!coreGetPreviousEpisode || !episodeData) return null;
    return coreGetPreviousEpisode(episodeData);
  };

  // Fullscreen toggle function
  // Fullscreens the overlay (entire comic reader) so slides/swiper stay visible and swipeable
  const toggleFullscreen = () => {
    if (!overlayRef.current) return;
    if (!document.fullscreenElement) {
      overlayRef.current.requestFullscreen({ navigationUI: 'hide' }).then(() => setIsFullscreen(true)).catch(err => {
        console.log('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Listen for fullscreen changes (when user presses Esc)
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  React.useEffect(() => {
    // Handle keyboard navigation
    const handleKeyDown = (e) => {
      switch(e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          // If on cover, navigate to previous episode's cover
          if (showCover) {
            loadPreviousEpisode();
          } else {
            previousPage();
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault(); // Prevent space bar scrolling
          // If on cover, navigate to next episode's cover
          if (showCover) {
            loadNextEpisode();
          } else {
            nextPage();
          }
          break;
        case 'Enter':
          e.preventDefault();
          // If on cover, open the comic (go to first page)
          if (showCover) {
            openComicBook();
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          e.preventDefault();
          // If in fullscreen, exit fullscreen first (browser will handle it)
          // If not in fullscreen, go back to cover if viewing pages, or close if on cover
          if (!isFullscreen) {
            if (showCover) {
              handleClose();
            } else {
              goBackToCover();
            }
          }
          // Note: if in fullscreen, browser's Esc handler will exit fullscreen
          // and our fullscreenchange listener will update the state
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFullscreen, showCover]);

  // Helper function to get all comic episodes sorted by date
  const getAllComicEpisodes = React.useCallback(() => {
    if (!window.momentsInTime) {
      return [];
    }
    return window.momentsInTime
      .filter(moment => moment.isComic)
      .sort((a, b) => a.date - b.date);
  }, []);

  // Function to scroll to a specific episode by ID (exposed globally for timeline clicks)
  const scrollToEpisode = React.useCallback((episodeId) => {
    if (!showCover || !swiperRef.current) return false;
    const allEpisodes = getAllComicEpisodes();
    const targetIndex = allEpisodes.findIndex(ep => ep.id === episodeId);
    if (targetIndex !== -1 && swiperRef.current.activeIndex !== targetIndex) {
      isSwiperUpdatingRef.current = true;
      swiperRef.current.slideTo(targetIndex, 400);
      setTimeout(() => { isSwiperUpdatingRef.current = false; }, 500);
      return true;
    }
    return false;
  }, [showCover, getAllComicEpisodes]);

  // Expose scrollToEpisode globally so timeline can trigger it
  React.useEffect(() => {
    window.scrollComicToEpisode = scrollToEpisode;
    return () => {
      delete window.scrollComicToEpisode;
    };
  }, [scrollToEpisode]);

  const isSwiperUpdatingRef = React.useRef(false);

  // Initialize Swiper carousel (freemode + grab cursor) for comic covers
  // https://swiperjs.com/demos#freemode https://swiperjs.com/demos#grab-cursor
  React.useEffect(() => {
    if (!episodeData || !showCover) return;
    if (typeof window.Swiper === 'undefined') return;

    // Resolve episode index: character comic uses id "characters-comic-book" but moment has "characters-comic-book-2025-09-15"
    const getCurrentEpisodeIndex = () => {
      const all = getAllComicEpisodes();
      let idx = all.findIndex(ep => ep.id === episodeData.id);
      if (idx === -1 && episodeData.id === 'characters-comic-book') {
        idx = all.findIndex(ep => ep.id === 'characters-comic-book-2025-09-15');
      }
      return idx;
    };

    if (swiperRef.current && !isSwiperUpdatingRef.current) {
      const allEpisodes = getAllComicEpisodes();
      const currentIndex = getCurrentEpisodeIndex();
      if (currentIndex !== -1 && swiperRef.current.activeIndex !== currentIndex) {
        swiperRef.current.slideTo(currentIndex, 400);
      }
      return;
    }

    const initSwiper = () => {
      if (!swiperContainerRef.current) return;
      if (swiperRef.current) {
        swiperRef.current.destroy(true, true);
        swiperRef.current = null;
      }

      const allEpisodes = getAllComicEpisodes();
      if (allEpisodes.length === 0) return;
      const currentIndex = getCurrentEpisodeIndex();
      if (currentIndex === -1) return;

      const slides = swiperContainerRef.current.querySelectorAll('.swiper-slide');
      if (slides.length !== allEpisodes.length) {
        setTimeout(initSwiper, 50);
        return;
      }

      const swiper = new window.Swiper(swiperContainerRef.current, {
        freeMode: { enabled: true, sticky: true },
        grabCursor: true,
        allowTouchMove: true,
        simulateTouch: true,
        touchRatio: 1,
        preventClicks: false,
        preventClicksPropagation: false,
        slidesPerView: 1,
        spaceBetween: 0,
        speed: 400,
        initialSlide: currentIndex,
        keyboard: { enabled: false },
        on: {
          slideChangeTransitionEnd: function() {
            const idx = this.activeIndex;
            const newEpisode = allEpisodes[idx];
            const currentId = episodeData?.id;
            const newId = newEpisode?.id;
            if (!newEpisode || newId === currentId) return;
            if (newId === 'characters-comic-book-2025-09-15' && currentId === 'characters-comic-book') return;
            isSwiperUpdatingRef.current = true;
            if (window.zoomCallback) window.zoomCallback(newEpisode);
            if (window.handleTimelineClick) window.handleTimelineClick(newEpisode);
            setCurrentPage(1);
            currentPageRef.current = 1;
            setShowCover(true);
            setFlipbookReady(false);
            flipbookCreatedRef.current = false;
            const episodeToSet = (newId === 'characters-comic-book-2025-09-15' && window.currentCharacterComicBook)
              ? window.currentCharacterComicBook
              : newEpisode;
            setEpisodeData(episodeToSet);
            updateGlobalState({
              episodeData: newEpisode,
              currentPage: 1,
              flipbookCreated: false,
              flipbookReady: false,
              isLoading: false,
              isVisible: true
            });
            setIsVisible(true);
            window.history.pushState({ momentId: newEpisode.id }, '', window.withBase ? window.withBase(newEpisode.fullLink) : newEpisode.fullLink);
            setTimeout(() => { isSwiperUpdatingRef.current = false; }, 100);
          }
        }
      });
      swiperRef.current = swiper;
    };

    requestAnimationFrame(() => requestAnimationFrame(initSwiper));
    return () => {
      if (swiperRef.current && !isSwiperUpdatingRef.current) {
        swiperRef.current.destroy(true, true);
        swiperRef.current = null;
      }
    };
  }, [episodeData, showCover, getAllComicEpisodes]);

  // When orientation or device type changes, recalc cover Swiper dimensions and stay on current comic
  React.useEffect(() => {
    if (!showCover || !swiperRef.current) return;
    const swiper = swiperRef.current;
    const allEpisodes = getAllComicEpisodes();
    if (allEpisodes.length === 0) return;
    // Use the slide that's currently visible so we don't switch comics when orientation changes
    const currentIndex = Math.min(swiper.activeIndex, allEpisodes.length - 1);
    const indexToKeep = currentIndex >= 0 ? currentIndex : 0;
    const episodeToKeep = allEpisodes[indexToKeep];

    if (typeof swiper.update === 'function') {
      swiper.update();
    }
    // Keep the same comic visible after resize (Swiper can jump to another slide on update)
    if (swiper.activeIndex !== indexToKeep) {
      isSwiperUpdatingRef.current = true;
      swiper.slideTo(indexToKeep, 0);
      setTimeout(() => { isSwiperUpdatingRef.current = false; }, 100);
    }
    // Keep episodeData in sync with the visible slide (e.g. if state was overwritten on re-render)
    const effectiveEpisode = (episodeToKeep?.id === 'characters-comic-book-2025-09-15' && window.currentCharacterComicBook)
      ? window.currentCharacterComicBook
      : episodeToKeep;
    const isSameEpisode = episodeData?.id === episodeToKeep?.id ||
      (episodeData?.id === 'characters-comic-book' && episodeToKeep?.id === 'characters-comic-book-2025-09-15');
    if (!isSameEpisode) {
      setEpisodeData(effectiveEpisode);
      updateGlobalState({ episodeData: effectiveEpisode });
      if (window.handleTimelineClick) window.handleTimelineClick(episodeToKeep);
      if (window.zoomCallback) window.zoomCallback(episodeToKeep);
      if (effectiveEpisode?.fullLink) window.history.replaceState({ momentId: episodeToKeep.id }, '', window.withBase ? window.withBase(effectiveEpisode.fullLink) : effectiveEpisode.fullLink);
    }
  }, [orientation, deviceType, showCover, getAllComicEpisodes]);

  // Handle initial page loading after component is mounted
  // For V4 episodes with #slide-N in URL: open directly to that slide (deep link)
  React.useEffect(() => {
    if (!episodeData) {
      return; // Wait for episode data to load
    }
    
    const isV4 = episodeData.comicReaderVersion === 4 || episodeData.immersiveComic === true;
    const isCharBook = episodeData.id === 'characters-comic-book';
    const slideFromHash = parseSlideFromHash && parseSlideFromHash(episodeData);
    
    if ((isV4 || isCharBook) && slideFromHash != null && slideFromHash >= 1) {
      const pages = coreGetPages ? coreGetPages(episodeData) : [];
      const hasVideo = isV4 && !!(episodeData?.videoPortraitUrl || episodeData?.videoLandscapeUrl);
      const totalSlides = isCharBook ? pages.length : (pages.length + (hasVideo ? 1 : 0));
      const slideIndex = Math.min(slideFromHash, totalSlides);
      if (slideIndex >= 1) {
        setInitialSlideIndex(slideIndex - 1); // 0-based for Swiper
        setShowCover(false);
        setFlipbookReady(true);
        setTotalPages(totalSlides);
        setCurrentPage(slideIndex);
        currentPageRef.current = slideIndex;
        setIsLoading(false);
        return;
      }
    }
    
    // Default: show cover first
    setInitialSlideIndex(null);
    setShowCover(true);
    setFlipbookReady(false);
  }, [episodeData]);

  // Handle flipbook creation when flipbookReady becomes true or orientation changes
  React.useEffect(() => {
    if (!episodeData) return;
    if (episodeData.comicReaderVersion === 4 || episodeData.immersiveComic === true) return;
    if (episodeData.id === 'characters-comic-book') return;

    // Recreate flipbook when orientation changes (if already created)
    if (flipbookCreatedRef.current && flipbookRef.current && !showCover) {
      const currentPageValue = currentPageRef.current;
      createFlipbook(currentPageValue);
      updateSpreadPages(currentPageValue);
      return;
    }
    
    // Check global state to prevent multiple creations
    const globalState = getGlobalState();
    if (globalState.flipbookCreated && !showCover) {
      return;
    }
    
    // Only create flipbook once when we have all required data
    if (flipbookReady && flipbookRef.current && episodeData && !flipbookCreatedRef.current) {
      createFlipbook(1); // Always start at page 1
      flipbookCreatedRef.current = true; // Mark as created
      updateGlobalState({ flipbookCreated: true }); // Update global state
      
      // Set loading to false since flipbook is created - balanced timing
      const flipbookDelay = useSinglePage ? 400 : 500;
      setTimeout(() => {
        setIsLoading(false);
        setIsVisible(true);
        updateGlobalState({ isLoading: false, isVisible: true });
      }, flipbookDelay);
    }
  }, [flipbookReady, episodeData, orientation, showCover]);

  // Optimized loading sequence for mobile
  React.useEffect(() => {
    if (!episodeData) return;
    
    // Show visible state immediately on mobile, or for V4/character comic (no flipbook to wait for)
    const isV4OrCharacter = episodeData.comicReaderVersion === 4 || episodeData.immersiveComic === true || episodeData.id === 'characters-comic-book';
    if (isMobile || isV4OrCharacter) {
      setIsVisible(true);
      updateGlobalState({ isVisible: true });
    }
    
    const loadingDelay = isMobile ? 300 : 500;
    
    setTimeout(() => {
      // Only set loading to false if flipbook hasn't been created yet
      if (!flipbookCreatedRef.current) {
        if (!isMobile) {
          setIsVisible(true);
          updateGlobalState({ isVisible: true });
        }
        setIsLoading(false);
        updateGlobalState({ isLoading: false });
      }
    }, loadingDelay);
  }, [episodeData, isMobile]); // Add isMobile dependency
  

  // Update body class when comic is open/closed to hide footer
  React.useEffect(() => {
    if (!showCover) {
      document.body.classList.add('comic-is-open');
    } else {
      document.body.classList.remove('comic-is-open');
    }
    return () => {
      document.body.classList.remove('comic-is-open');
    };
  }, [showCover]);

  // Update URL hash when page changes (character comic or V4 with pageSlugs)
  React.useEffect(() => {
    if (showCover || !updateUrlForSlide || !episodeData) return;
    const isV4 = episodeData.comicReaderVersion === 4 || episodeData.immersiveComic === true;
    if (!isCharacterComicBook && !isV4) return;
    const basePath = (episodeData.fullLink || '').replace(/\/$/, '') + '/';
    updateUrlForSlide(basePath, currentPage - 1, episodeData);
  }, [isCharacterComicBook, showCover, currentPage, episodeData]);

  // Preload next 2 pages' videos in character comic so they're ready when user navigates
  React.useEffect(() => {
    if (!isCharacterComicBook || showCover || !episodeData) return;
    const pages = coreGetPages ? coreGetPages(episodeData) : [];
    if (!pages.length) return;
    const preload = window.ComicReaderCore?.preloadCharacterVideos;
    if (preload) preload(pages, currentPage);
  }, [isCharacterComicBook, showCover, currentPage, episodeData]);

  // Sync currentPage from URL hash when navigating to #slug, #slide-N, #page-N (character comic / V4)
  React.useEffect(() => {
    if (!isCharacterComicBook || showCover || !episodeData || !parseSlideFromHash) return;
    const syncFromHash = () => {
      const slideFromHash = parseSlideFromHash(episodeData);
      if (slideFromHash != null && slideFromHash >= 1) {
        const pages = coreGetPages ? coreGetPages(episodeData) : [];
        const slideIndex = Math.min(slideFromHash, pages.length);
        if (slideIndex >= 1 && slideIndex !== currentPageRef.current) {
          setCurrentPage(slideIndex);
          currentPageRef.current = slideIndex;
          updateGlobalState({ currentPage: slideIndex });
        }
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [isCharacterComicBook, showCover, episodeData]);

  // Function to transition from cover to flipbook (or v4 immersive view or character slide viewer)
  // Desktop: opens to medium view; user can expand to fullscreen via ⛶ button
  const openComicBook = () => {
    if (isV4Episode) {
      const pages = episodeData?.pages && Array.isArray(episodeData.pages) ? episodeData.pages : [];
      const hasVideo = !!(episodeData?.videoPortraitUrl || episodeData?.videoLandscapeUrl);
      setShowCover(false);
      setTotalPages(pages.length + (hasVideo ? 1 : 0));
      setCurrentPage(1);
      currentPageRef.current = 1;
      setIsLoading(false);
      setFlipbookReady(true);
      // Mobile/tablet: auto fullscreen so video and pages take up entire screen
      if ((isMobile || isTablet) && overlayRef.current && !document.fullscreenElement) {
        overlayRef.current.requestFullscreen({ navigationUI: 'hide' }).then(() => setIsFullscreen(true)).catch(() => {});
      }
      return;
    }
    if (isCharacterComicBook) {
      const pages = episodeData?.pages && Array.isArray(episodeData.pages) ? episodeData.pages : [];
      setShowCover(false);
      setTotalPages(pages.length);
      setCurrentPage(1);
      currentPageRef.current = 1;
      setIsLoading(false);
      setFlipbookReady(true);
      return;
    }
    setShowCover(false);
    setIsLoading(true);
    setTimeout(() => {
      setFlipbookReady(true);
    }, 50);
  };

  // Function to go back to cover from first page
  const goBackToCover = () => {
    setShowCover(true);
    setFlipbookReady(false);
    setIsLoading(false);
    setCurrentPage(1);
    currentPageRef.current = 1;
    flipbookCreatedRef.current = false; // Reset flipbook creation flag
    setInitialSlideIndex(null); // Reset so re-open starts at slide 1
    updateGlobalState({ 
      showCover: true, 
      flipbookReady: false, 
      isLoading: false, 
      currentPage: 1,
      flipbookCreated: false // Reset global flipbook creation flag
    });
    // Clear #slide-N from URL so re-opening starts at slide 1
    const basePath = (episodeData?.fullLink || '').replace(/#.*$/, '');
    if (basePath && window.location.hash) {
      window.history.replaceState({}, '', window.withBase ? window.withBase(basePath) : basePath);
    }
  };

  // Android back button: same behavior as Escape/exit - fullscreen→exit, pages→cover, cover→close
  const backButtonStateRef = React.useRef({ showCover, episodeData, goBackToCover, handleClose: onClose });
  backButtonStateRef.current = { showCover, episodeData, goBackToCover, handleClose: onClose };
  React.useEffect(() => {
    if (!isMobile && !isTablet) return; // Back button only on mobile/tablet (Android)
    const handlePopState = () => {
      if (!overlayRef.current) return;
      const { showCover: showCoverVal, episodeData: episodeDataVal, goBackToCover: goBack, handleClose: close } = backButtonStateRef.current;
      if (document.fullscreenElement) {
        window.comicConsumedBack = true;
        const _pn = window.stripBase ? window.stripBase(window.location.pathname) : window.location.pathname;
        const url = (episodeDataVal?.fullLink || _pn || '/') + (window.location.hash || '');
        const state = episodeDataVal ? { momentId: episodeDataVal.id } : {};
        window.history.pushState(state, '', window.withBase ? window.withBase(url) : url);
        document.exitFullscreen().then(() => setIsFullscreen(false));
      } else if (!showCoverVal) {
        window.comicConsumedBack = true;
        const _pn = window.stripBase ? window.stripBase(window.location.pathname) : window.location.pathname;
        const url = (episodeDataVal?.fullLink || _pn || '/') + (window.location.hash || '');
        const state = episodeDataVal ? { momentId: episodeDataVal.id } : {};
        window.history.pushState(state, '', window.withBase ? window.withBase(url) : url);
        if (goBack) goBack();
      } else {
        if (close) close();
      }
    };
    window.addEventListener('popstate', handlePopState, true);
    return () => window.removeEventListener('popstate', handlePopState, true);
  }, [isMobile, isTablet]);

  const createFlipbook = (startPage = 1) => {
    if (!flipbookRef.current || !episodeData || !createFlipbookUtil) {
      return;
    }
    
    try {
      const flipbookElement = flipbookRef.current;
      flipbookElement.innerHTML = '';
      
      const currentPages = getPages();
      if (currentPages.length === 0) {
        return;
      }
      
      // Get styles when called - required, no fallback
      if (!window.ComicReaderStyles?.getDeviceStyles) {
        console.error('ComicReader: styles not loaded');
        return;
      }
      const currentStyles = window.ComicReaderStyles.getDeviceStyles(deviceType, { isVisible, showControls, showCover, isLoading, orientation, isFullscreen, isV4Cover: isV4Episode, isVideoPlaying, isSlidesSwitching, showMobileControls });
      
      // Use utility to create flipbook structure
      const { leftPage, rightPage } = createFlipbookUtil(flipbookElement, deviceType, orientation, currentPages, currentStyles);
      
      // Store page references for updates
      flipbookRef.current._leftPage = leftPage;
      flipbookRef.current._rightPage = rightPage;
      
      // Set initial page state
      const initialPage = startPage === 'cover' ? 1 : (startPage || 1);
      setCurrentPage(initialPage);
      currentPageRef.current = initialPage;
      updateGlobalState({ currentPage: initialPage });
      
      // Set initial pages
      updateSpreadPages(initialPage);
      
      setIsLoading(false);
      setFlipbookReady(true);
      setIsInitialized(true);
      isInitializedRef.current = true;
      updateGlobalState({ 
        isLoading: false, 
        flipbookReady: true, 
        isInitialized: true 
      });
      
    } catch (error) {
      setError('Paul\'s Bangkok adventure is taking a coffee break... ☕');
      setIsLoading(false);
    }
  };
  
  const updateSpreadPages = (pageNumber) => {
    if (!flipbookRef.current || !updatePagesUtil) return;
    
    const leftPage = flipbookRef.current._leftPage || flipbookRef.current.querySelector('.left-page');
    const rightPage = flipbookRef.current._rightPage || flipbookRef.current.querySelector('.right-page');
    
    if (!leftPage) return;
    
    const currentPages = getPages();
    
    // Get styles when called - required, no fallback
    if (!window.ComicReaderStyles?.getDeviceStyles) {
      console.error('ComicReader: styles not loaded');
      return;
    }
    const currentStyles = window.ComicReaderStyles.getDeviceStyles(deviceType, { isVisible, showControls, showCover, isLoading, isFullscreen, orientation, isV4Cover: isV4Episode, isVideoPlaying, isSlidesSwitching, showMobileControls });
    
    // Use utility to update pages
    updatePagesUtil(deviceType, orientation, leftPage, rightPage, pageNumber, currentPages, previousPage, nextPage, currentStyles);
  };
  
  // Turn.js removed - using simple custom implementation

  const previousPage = () => {
    try {
      const currentPageValue = currentPageRef.current;

      // V4 immersive: one view per "page" (spread or video), flip to previous or back to cover
      if (isV4Episode) {
        if (currentPageValue <= 1) {
          goBackToCover();
          return;
        }
        const prevPage = currentPageValue - 1;
        setCurrentPage(prevPage);
        currentPageRef.current = prevPage;
        updateGlobalState({ currentPage: prevPage });
        return;
      }

      // Character comic: one character per page, button nav (no horizontal slides)
      if (isCharacterComicBook) {
        if (currentPageValue <= 1) {
          goBackToCover();
          return;
        }
        // Two-up mode: advance by 2 so each spread shows a new pair (no overlap)
        const isTwoUp = isDesktop && episodeData?.pages?.length > 1;
        const prevPage = isTwoUp ? currentPageValue - 2 : currentPageValue - 1;
        setCurrentPage(Math.max(1, prevPage));
        currentPageRef.current = Math.max(1, prevPage);
        updateGlobalState({ currentPage: Math.max(1, prevPage) });
        return;
      }

      if (!getPreviousPageNumber || !shouldGoBackToCover) {
        // Fallback if utilities not loaded
        const prevPage = useSinglePage ? currentPageValue - 1 : currentPageValue - 2;
        if (prevPage >= 1) {
          setCurrentPage(prevPage);
          currentPageRef.current = prevPage;
          updateGlobalState({ currentPage: prevPage });
          updateSpreadPages(prevPage);
        } else if (shouldGoBackToCover?.(currentPageValue, orientation) || currentPageValue === 1) {
          goBackToCover();
        }
        return;
      }

      if (shouldGoBackToCover(currentPageValue, orientation)) {
        goBackToCover();
        return;
      }

      const prevPage = getPreviousPageNumber(currentPageValue, orientation);
      if (prevPage >= 1) {
        setCurrentPage(prevPage);
        currentPageRef.current = prevPage;
        updateGlobalState({ currentPage: prevPage });
        updateSpreadPages(prevPage);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const nextPage = () => {
    try {
      const currentPageValue = currentPageRef.current;

      // V4 immersive: one view per "page" (spread or video), flip to next or load next episode
      if (isV4Episode) {
        const actualTotalPages = totalPages;
        const nextPageNum = currentPageValue + 1;
        if (nextPageNum <= actualTotalPages) {
          setCurrentPage(nextPageNum);
          currentPageRef.current = nextPageNum;
          updateGlobalState({ currentPage: nextPageNum });
        } else {
          loadNextEpisode();
        }
        return;
      }

      // Character comic: one character per page, button nav (no horizontal slides)
      if (isCharacterComicBook) {
        const isTwoUp = isDesktop && episodeData?.pages?.length > 1;
        const actualTotalPages = isTwoUp
          ? 2 * Math.floor((totalPages - 1) / 2) + 1
          : totalPages;
        const nextPageNum = isTwoUp ? currentPageValue + 2 : currentPageValue + 1;
        if (nextPageNum <= actualTotalPages) {
          setCurrentPage(nextPageNum);
          currentPageRef.current = nextPageNum;
          updateGlobalState({ currentPage: nextPageNum });
        } else {
          loadNextEpisode();
        }
        return;
      }

      const currentPages = getPages();
      const actualTotalPages = currentPages.length;

      if (!getNextPageNumber) {
        // Fallback if utilities not loaded
        const nextPageNum = useSinglePage ? currentPageValue + 1 : currentPageValue + 2;
        if (nextPageNum <= actualTotalPages) {
          setCurrentPage(nextPageNum);
          currentPageRef.current = nextPageNum;
          updateGlobalState({ currentPage: nextPageNum });
          updateSpreadPages(nextPageNum);
        } else {
          loadNextEpisode();
        }
        return;
      }

      const nextPageNum = getNextPageNumber(currentPageValue, orientation);
      if (nextPageNum <= actualTotalPages) {
        setCurrentPage(nextPageNum);
        currentPageRef.current = nextPageNum;
        updateGlobalState({ currentPage: nextPageNum });
        updateSpreadPages(nextPageNum);
      } else {
        loadNextEpisode();
      }
    } catch (error) {
      // Silent error handling
    }
  };

  // Create swipe handlers now that nextPage/previousPage are defined
  const swipeHandlers = (isMobile || isTablet) && createSwipeHandlers 
    ? createSwipeHandlers(nextPage, previousPage)
    : null;
  
  // Fallback touch handlers if utility not loaded
  const [touchStart, setTouchStart] = React.useState(null);
  const [touchEnd, setTouchEnd] = React.useState(null);
  
  const onTouchStart = swipeHandlers?.onTouchStart || ((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  });
  
  const onTouchMove = swipeHandlers?.onTouchMove || ((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  });
  
  const onTouchEnd = swipeHandlers?.onTouchEnd || (() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      nextPage();
    } else if (distance < -minSwipeDistance) {
      previousPage();
    }
  });

  // Function to load the next episode in the series
  const loadNextEpisode = () => {
    if (swiperRef.current) {
      swiperRef.current.slideNext();
    } else {
      // Fallback if Swiper not initialized
      const nextEpisode = getNextEpisode(episodeData);
      if (nextEpisode) {
        setCurrentPage(1);
        currentPageRef.current = 1;
        setShowCover(true);
        setFlipbookReady(false);
        flipbookCreatedRef.current = false;
        setEpisodeData(nextEpisode);
        updateGlobalState({
          episodeData: nextEpisode,
          currentPage: 1,
          flipbookCreated: false,
          flipbookReady: false,
          isLoading: false,
          isVisible: true
        });
        setIsVisible(true);
        window.history.pushState({ momentId: nextEpisode.id }, '', window.withBase ? window.withBase(nextEpisode.fullLink) : nextEpisode.fullLink);
        if (window.zoomCallback) {
          window.zoomCallback(nextEpisode);
        }
        if (window.handleTimelineClick) {
          window.handleTimelineClick(nextEpisode);
        }
      }
    }
  };

  // Function to load the previous episode and show its cover
  const loadPreviousEpisode = () => {
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
    } else {
      // Fallback if Swiper not initialized
      const prevEpisode = getPreviousEpisode(episodeData);
      if (prevEpisode) {
        setCurrentPage(1);
        currentPageRef.current = 1;
        setShowCover(true);
        setFlipbookReady(false);
        flipbookCreatedRef.current = false;
        setEpisodeData(prevEpisode);
        updateGlobalState({
          episodeData: prevEpisode,
          currentPage: 1,
          flipbookCreated: false,
          flipbookReady: false,
          isLoading: false,
          isVisible: true
        });
        setIsVisible(true);
        window.history.pushState({ momentId: prevEpisode.id }, '', window.withBase ? window.withBase(prevEpisode.fullLink) : prevEpisode.fullLink);
        if (window.zoomCallback) {
          window.zoomCallback(prevEpisode);
        }
        if (window.handleTimelineClick) {
          window.handleTimelineClick(prevEpisode);
        }
      }
    }
  };

  const handleClose = () => {
    // Clear #slide-N from URL so re-opening starts at slide 1
    const basePath = (episodeData?.fullLink || '').replace(/#.*$/, '');
    if (basePath && window.location.hash) {
      window.history.replaceState({}, '', window.withBase ? window.withBase(basePath) : basePath);
    }
    // Reset global state when closing
    updateGlobalState({
      flipbookCreated: false,
      episodeData: null,
      currentPage: 1,
      totalPages: 0,
      flipbookReady: false,
      isVisible: false,
      isLoading: true
    });
    
    // Force timeline re-render to ensure highlight is visible
    if (episodeData && window.setSelectedId) {
      // Temporarily clear and reset the selection to force a re-render
      const currentEpisodeId = episodeData.id;
      window.setSelectedId(null);
      setTimeout(() => {
        window.setSelectedId(currentEpisodeId);
      }, 10);
    }
    
    // Show overlay again when closing comic
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
    onClose();
  };

  const handleOverlayClick = (e) => {
    // Disable tap/click outside to dismiss - user must use close button
    // This prevents accidental dismissals both on cover and when viewing pages
    // Only prevent clicks directly on the overlay background (not on interactive children)
    if (e.target === e.currentTarget && !isFullscreen) {
      e.preventDefault();
      e.stopPropagation();
      // Do nothing - all dismissals must go through the close button
      return;
    }
    // For clicks on children (like container), check if it's empty space
    // If clicking on the container itself (not flipbook content), prevent action
    if (!isFullscreen && e.target.classList.contains('comic-episode-container')) {
      e.stopPropagation();
      // Do nothing - prevent going back to cover
    }
  };

  // Get device-specific styles
  const styles = window.ComicReaderStyles?.getDeviceStyles 
    ? window.ComicReaderStyles.getDeviceStyles(deviceType, { isVisible, showControls, showCover, isLoading, orientation, isFullscreen, isV4Cover: isV4Episode, isVideoPlaying, isSlidesSwitching, showMobileControls })
    : {}; // Fallback empty object if styles not loaded

  // All styles are now loaded from styles.js via getDeviceStyles()
  // Access via: styles.coverDisplayStyle, styles.coverImageStyle, etc.

  // Get all comic episodes for Swiper carousel
  const allEpisodes = getAllComicEpisodes();
  
  // Build container children using render functions
  const containerChildren = [];
  
  // If showing cover, create Swiper carousel with all episodes
  if (showCover && !error && renderCover && allEpisodes.length > 0) {
    // Swiper structure: swiper > swiper-wrapper > swiper-slide (for each episode)
    const swiperSlides = allEpisodes.map((episode) => {
      const currId = episodeData?.id;
      const epId = episode.id;
      const isCurrentEpisode = epId === currId ||
        (epId === 'characters-comic-book-2025-09-15' && currId === 'characters-comic-book') ||
        (epId === 'characters-comic-book' && currId === 'characters-comic-book-2025-09-15');
      return React.createElement('div', {
        key: `episode-${episode.id}`,
        className: 'swiper-slide'
      }, renderCover(deviceType, styles, {
        episodeData: episode,
        isVisible: isCurrentEpisode ? isVisible : true,
        openComicBook: isCurrentEpisode ? openComicBook : () => {},
        coverRef: isCurrentEpisode ? coverRef : null,
        isWideCover: episode.comicReaderVersion === 4 || episode.immersiveComic === true
      }));
    });

    const swiperWrapper = React.createElement('div', {
      key: 'swiper-wrapper',
      className: 'swiper-wrapper'
    }, swiperSlides);

    const swiperContainer = React.createElement('div', {
      key: 'swiper-container',
      ref: swiperContainerRef,
      className: 'swiper comic-episode-swiper',
      style: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#000',
        touchAction: 'pan-x'
      }
    }, swiperWrapper);

    containerChildren.push(swiperContainer);
  } else if (showCover && !error && renderCover) {
    // Fallback: single cover if no episodes or Swiper not available
    containerChildren.push(renderCover(deviceType, styles, {
      episodeData,
      isVisible,
      openComicBook,
      coverRef,
      isWideCover: isV4Episode
    }));
  }
  
  // Loading state
  if (isLoading && !showCover && renderLoading) {
    containerChildren.push(renderLoading(deviceType, styles));
  }
  
  // Error state
  if (error && renderError) {
    containerChildren.push(renderError(styles, {
      error,
      createFlipbook,
      setError,
      setIsLoading
    }));
  }

  // Comic Reader 4.0: vertical fullscreen feed (swipe up/down between slides)
  if (!error && !showCover && isV4Episode && renderImmersiveV4) {
    const basePath = (episodeData?.fullLink || '').replace(/\/$/, '') + '/';
    containerChildren.push(renderImmersiveV4(episodeData, styles, {
      onBackToCover: goBackToCover,
      onVideoPlayStateChange: setIsVideoPlaying,
      onSlidesSwitchingChange: setIsSlidesSwitching,
      onTapToShowControls: () => setShowMobileControls(true),
      initialSlideIndex: initialSlideIndex ?? 0,
      onSlideChange: updateUrlForSlide ? (slideIndex0) => updateUrlForSlide(basePath, slideIndex0, episodeData) : undefined
    }));
  }

  // Character comic book: slide viewer with image, video, narrative per character (button nav, no horizontal slides)
  if (!error && !showCover && isCharacterComicBook && renderCharacterSlideViewer) {
    containerChildren.push(renderCharacterSlideViewer(episodeData, styles, {
      onBackToCover: goBackToCover,
      previousPage,
      currentPage,
      onVideoPlayStateChange: setIsVideoPlaying,
      onSlidesSwitchingChange: setIsSlidesSwitching,
      onTapToShowControls: () => setShowMobileControls(true)
    }));
  }
  
  // Flipbook container (classic mode only)
  if (!error && !showCover && !isV4Episode && !isCharacterComicBook && renderFlipbook) {
    containerChildren.push(renderFlipbook(styles, { flipbookRef }));
  }
  
  // Desktop controls (landscape): arrow buttons for flipbook only (v4 and character viewer use swipe)
  if (!error && !isLoading && flipbookReady && !showCover && !isV4Episode && !isCharacterComicBook && !useSinglePage && renderDesktopControls) {
    containerChildren.push(renderDesktopControls(styles, {
      currentPage,
      totalPages,
      previousPage,
      nextPage,
      getNextEpisode
    }));
  }
  
  // Mobile navigation (portrait): arrow buttons for flipbook only (v4 and character viewer use swipe)
  if (!error && !isLoading && flipbookReady && !showCover && !isV4Episode && !isCharacterComicBook && useSinglePage && renderMobileNavigation) {
    containerChildren.push(renderMobileNavigation(styles, {
      currentPage,
      totalPages,
      previousPage,
      nextPage,
      getNextEpisode
    }));
  }
  
  // Handler to prevent clicks on container from bubbling to overlay
  // On mobile: tap page to toggle header (close button) and nav visibility
  const handleContainerClick = (e) => {
    if (!showCover) {
      e.stopPropagation();
      // Toggle mobile controls when tapping content (flipbook, V4, or character comic)
      if (isMobile && !e.target.closest('.mobile-comic-nav') && !e.target.closest('.video-controls')) {
        setShowMobileControls((prev) => !prev);
      }
    }
  };
  
  // Render container with device-specific handlers
  const containerElement = renderContainer 
    ? renderContainer(deviceType, styles, {
        setShowControls,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onClick: handleContainerClick,
        children: containerChildren,
        containerRef,
        containerClassName: '',
        isV4Episode: isV4Episode || isCharacterComicBook,
        isCharacterComicBook,
        showCover
      })
    : React.createElement('div', {
        key: 'container',
        ref: containerRef,
        style: styles.comicContainerStyle || {},
        className: 'comic-episode-container',
        onClick: handleContainerClick
      }, containerChildren);
  
  // Cover overlay (sibling of comic-episode-container for all devices)
  const overlayChildren = [containerElement];

  // V4 comics: force landscape on mobile/tablet portrait — show overlay after user opens comic (pages view)
  const showRotateOverlay = (isMobile || isTablet) && orientation === 'portrait' && isV4Episode && !showCover;
  if (showRotateOverlay) {
    overlayChildren.push(React.createElement('div', {
      key: 'rotate-to-landscape',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '24px',
        zIndex: 100,
        pointerEvents: 'auto'
      }
    }, [
      React.createElement('div', {
        key: 'icon',
        style: {
          width: 64,
          height: 64,
          opacity: 0.9
        },
        dangerouslySetInnerHTML: {
          __html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 12h20"/><path d="M12 4v16"/></svg>'
        }
      }),
      React.createElement('div', {
        key: 'text',
        style: {
          color: '#fff',
          fontSize: '1.1rem',
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: 280
        }
      }, 'Rotate your device to landscape for the best experience')
    ]));
  }
  
  // Header buttons (close and fullscreen) - outside container so they don't slide
  if (renderHeaderButtons) {
    // Create a close handler that exits fullscreen first, then goes back to cover or closes
    const handleCloseOrGoBack = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
          if (showCover) handleClose();
          else goBackToCover();
        });
      } else {
        if (showCover) handleClose();
        else goBackToCover();
      }
    };
    const headerButtons = renderHeaderButtons(styles, {
      handleClose: handleCloseOrGoBack,
      toggleFullscreen,
      isFullscreen
    });
    overlayChildren.push(...headerButtons);
  }
  
  // Cover navigation buttons - outside container so they don't slide
  // When on cover: navigates between episodes
  // When pages are open: navigates between pages (desktop/tablet only)
  if (renderCoverNavigation) {
    const effectiveTotalPages = isCharacterComicBook && isDesktop && episodeData?.pages?.length > 1
      ? 2 * Math.floor((totalPages - 1) / 2) + 1
      : totalPages;
    const coverNavButtons = renderCoverNavigation(deviceType, styles, {
      loadPreviousEpisode,
      loadNextEpisode,
      getPreviousEpisode: () => getPreviousEpisode(episodeData),
      getNextEpisode: () => getNextEpisode(episodeData),
      showCover,
      previousPage,
      nextPage,
      currentPage,
      totalPages: effectiveTotalPages,
      getNextEpisodeForPages: () => getNextEpisode(episodeData),
      isFullscreen,
      isV4Episode: isV4Episode
    });
    if (coverNavButtons) {
      overlayChildren.push(...coverNavButtons);
    }
  }
  
  
  return React.createElement('div', {
    ref: overlayRef,
    style: styles.comicOverlayStyle || {},
    onClick: handleOverlayClick,
    className: 'comic-episode-overlay'
  }, overlayChildren);
};

// Add CSS for the spinner animation and Turn.js styling
if (!document.querySelector('#comic-episode-styles')) {
  const style = document.createElement('style');
  style.id = 'comic-episode-styles';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes comic-video-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes textPulse {
      0%, 100% { 
        transform: scale(1);
        opacity: 0.9;
      }
      50% { 
        transform: scale(1.05);
        opacity: 1;
      }
    }
    
    
    /* Turn.js specific styles */
    .flipbook {
      background: #000;
      border-radius: 10px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      cursor: grab;
      touch-action: manipulation;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    .flipbook:active {
      cursor: grabbing;
    }
    
    .flipbook * {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    .flipbook .page {
      width: 500px;
      height: 750px;
      background: white;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
    }
    
    .flipbook .page img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
      -webkit-touch-callout: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      draggable: false;
    }
    
    /* Enhanced corner interaction areas */
    .flipbook .page:before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 80px;
      height: 80px;
      background: linear-gradient(-45deg, transparent 0%, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%, transparent 100%);
      pointer-events: none;
      z-index: 1;
      transition: opacity 0.3s ease;
      opacity: 0;
    }
    
    .flipbook .page:hover:before {
      opacity: 1;
    }
    
    .flipbook .hard {
      background: #333;
      color: white;
      border: solid 1px #666;
    }
    
    .flipbook .even {
      background: linear-gradient(to left, #fff 0%, #f9f9f9 100%);
    }
    
    .flipbook .odd {
      background: linear-gradient(to right, #fff 0%, #f9f9f9 100%);
    }
    
    /* Turn.js page corner styles */
    .flipbook .page:hover {
      cursor: grab;
    }
    
    .flipbook .turn-page {
      cursor: grabbing !important;
    }
    
    /* Visual feedback for click areas */
    .flipbook .page:after {
      content: '';
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 12px solid rgba(255, 165, 0, 0.7);
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 2;
    }
    
    .flipbook .page:hover:after {
      opacity: 1;
    }
    
    /* Left page indicator */
    .flipbook .even:after {
      right: auto;
      left: 10px;
      border-left: none;
      border-right: 12px solid rgba(255, 165, 0, 0.7);
    }
    
    /* Corner drag areas */
    .flipbook .page:before {
      z-index: 3;
    }
    
    /* Allow Turn.js to handle all interactions */
    .flipbook .page {
      position: relative;
    }
    
    /* Make page corners more draggable */
    .flipbook .page:hover:before {
      background: linear-gradient(-45deg, transparent 0%, transparent 30%, rgba(255,165,0,0.2) 50%, transparent 70%, transparent 100%);
    }
    
    /* Turn.js generated elements */
    .flipbook .turn-page {
      cursor: grabbing !important;
    }
    
    .flipbook .turn-page-wrapper {
      cursor: grabbing !important;
    }
    
    /* Swiper customization for comic covers (freemode + grab cursor) */
    .comic-episode-swiper {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden !important;
      background: #000;
    }
    
    .comic-episode-swiper .swiper-wrapper {
      align-items: stretch;
      height: 100%;
    }
    
    .comic-episode-swiper .swiper-slide {
      display: flex;
      align-items: stretch;
      justify-content: center;
      width: 100% !important;
      min-width: 100% !important;
      height: 100% !important;
      flex-shrink: 0 !important;
      position: relative;
      box-sizing: border-box;
      overflow: hidden;
      background: #000;
    }
    
    .comic-episode-swiper .swiper-slide > * {
      width: 100%;
      height: 100%;
      flex-shrink: 0;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }
    
    .comic-episode-swiper .swiper-slide .comic-cover-display {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    
    .comic-episode-swiper .swiper-slide .comic-cover-display img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    /* Cover navigation button hover effects */
    .cover-nav-button:hover {
      background: rgba(255, 255, 255, 1) !important;
      transform: translateY(-50%) scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }
    
    .cover-nav-button:active {
      transform: translateY(-50%) scale(0.95);
    }
    
    /* Video page styles */
    .flipbook video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #000;
    }
    
    .simple-flipbook-page video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #000;
    }
    
    /* Ensure video controls are visible and styled */
    .flipbook video::-webkit-media-controls-panel {
      background-color: rgba(0, 0, 0, 0.7);
    }

    /* Comic Reader 4.0 immersive layout (Swiper vertical) */
    .comic-immersive-v4 {
      -webkit-overflow-scrolling: touch;
    }
    .comic-immersive-v4-swiper {
      width: 100%;
      height: 100%;
    }
    .comic-immersive-v4-swiper .swiper-wrapper {
      height: 100%;
    }
    .comic-immersive-v4-swiper .swiper-slide {
      height: 100%;
      min-height: 100%;
    }
    .comic-immersive-v4-swiper .swiper-pagination-bullet {
      width: 10px;
      height: 10px;
      background: rgba(255,255,255,0.6);
      opacity: 1;
      box-shadow: 0 0 4px rgba(0,0,0,0.5);
    }
    .comic-immersive-v4-swiper .swiper-pagination-bullet-active {
      background: rgba(255,255,255,1);
      box-shadow: 0 0 8px rgba(255,255,255,0.6);
    }

    /* Character slide viewer - constrain to parent comic-episode-container */
    .comic-character-slide-viewer {
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      background: #000;
    }
    .comic-character-immersive-column {
      flex: 1 1 0;
      min-width: 0;
      height: 100%;
      overflow: hidden;
    }
    .comic-immersive-column {
      width: 100%;
      height: 100%;
    }
    .comic-character-swiper {
      width: 100%;
      height: 100%;
    }
    .comic-character-swiper .swiper-wrapper {
      height: 100%;
    }
    .comic-character-swiper .swiper-slide {
      height: 100%;
      min-height: 100%;
    }
    .comic-character-swiper .swiper-pagination-bullet {
      width: 8px;
      height: 8px;
      background: rgba(255,255,255,0.6);
      opacity: 1;
    }
    .comic-character-swiper .swiper-pagination-bullet-active {
      background: rgba(255,255,255,1);
    }
    .character-slide-column {
      height: 100%;
      min-height: 100vh;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
    }
    .comic-character-vertical-swiper {
      width: 100%;
      height: 100%;
    }
    .comic-character-vertical-swiper .swiper-wrapper {
      height: 100%;
    }
    .comic-character-vertical-swiper .swiper-slide {
      height: 100vh;
      min-height: 100vh;
      box-sizing: border-box;
    }
    @media (max-width: 1023px) {
      .comic-character-vertical-swiper .swiper-slide {
        height: 100svh;
        min-height: 100svh;
      }
    }
    .comic-character-vertical-swiper .swiper-pagination {
      right: 12px;
      left: auto;
    }
    .comic-character-vertical-swiper .swiper-pagination-bullet {
      width: 8px;
      height: 8px;
      background: rgba(255,255,255,0.6);
      opacity: 1;
    }
    .comic-character-vertical-swiper .swiper-pagination-bullet-active {
      background: rgba(255,255,255,1);
    }
  
  `;
  document.head.appendChild(style);
}

