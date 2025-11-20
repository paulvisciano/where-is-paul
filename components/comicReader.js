// Comic Reader Component
// Note: Core logic and utilities are loaded from separate files:
// - components/comicReader/core.js (shared utilities, global state)
// - components/comicReader/deviceDetection.js (device detection)
// - components/comicReader/styles.js (device-specific styles)
// - components/comicReader/flipbook.js (device-specific flipbook creation)
// - components/comicReader/navigation.js (device-specific navigation)
// - components/comicReader/render.js (device-specific render functions)

// Get utilities from loaded modules
const { updateGlobalState, getGlobalState, getPages: coreGetPages, getNextEpisode: coreGetNextEpisode, getPreviousEpisode: coreGetPreviousEpisode, findCurrentEpisode } = window.ComicReaderCore || {};
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
  renderCoverNavigation
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
  const isInitializedRef = React.useRef(false);
  const flipbookRef = React.useRef(null);
  const flipbookCreatedRef = React.useRef(false);
  const coverRef = React.useRef(null);
  const containerRef = React.useRef(null); // Ref for the comic-episode-container
  const splideRef = React.useRef(null); // Ref for Splide instance
  const splideContainerRef = React.useRef(null); // Ref for Splide container element
  const currentPageRef = React.useRef(1);
  const overlayRef = React.useRef(null);
  const mobilePageHistoryActiveRef = React.useRef(false);
  
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
  
  // Keep ref in sync with state
  React.useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Touch/swipe gesture handling for mobile and tablets
  // Will be created after nextPage/previousPage are defined
  
  

  // Get episode data from content prop, global state, or momentsInTime
  React.useEffect(() => {
    // First, check if content prop has character comic book data
    if (content && content.postId === 'characters-comic-book' && window.currentCharacterComicBook) {
      setEpisodeData(window.currentCharacterComicBook);
      updateGlobalState({ episodeData: window.currentCharacterComicBook });
      return;
    }
    
    // Check if content prop has episode data directly
    if (content && content.isComic && content.pages && !episodeData) {
      // Create episode data from content for character comic book
      if (content.postId === 'characters-comic-book') {
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
    
    const globalState = getGlobalState();
    
    // If we already have episode data in global state, use it
    if (globalState.episodeData && !episodeData) {
      setEpisodeData(globalState.episodeData);
      return;
    }
    
    // Check for character comic book in global window
    if (window.currentCharacterComicBook && !episodeData) {
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
  const toggleFullscreen = () => {
    if (!overlayRef.current) return;
    
    if (!document.fullscreenElement) {
      overlayRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.log('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
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
    if (!showCover || !splideRef.current) {
      return false; // Can't scroll if not showing cover or Splide not initialized
    }
    
    const allEpisodes = getAllComicEpisodes();
    const targetIndex = allEpisodes.findIndex(ep => ep.id === episodeId);
    
    if (targetIndex !== -1 && splideRef.current.index !== targetIndex) {
      isSplideUpdatingRef.current = true;
      splideRef.current.go(targetIndex);
      // Reset flag after transition
      setTimeout(() => {
        isSplideUpdatingRef.current = false;
      }, 500);
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

  // Track if Splide is being updated internally (to prevent re-init loop)
  const isSplideUpdatingRef = React.useRef(false);

  // Initialize Splide carousel when episode data is available
  React.useEffect(() => {
    if (!episodeData || !showCover) {
      return;
    }

    // Check if Splide is available
    if (typeof window.Splide === 'undefined') {
      return;
    }

    // If Splide already exists and we're just updating the index, skip re-init
    if (splideRef.current && !isSplideUpdatingRef.current) {
      const allEpisodes = getAllComicEpisodes();
      const currentIndex = allEpisodes.findIndex(ep => ep.id === episodeData.id);
      if (currentIndex !== -1 && splideRef.current.index !== currentIndex) {
        // Update to correct index without re-initializing
        splideRef.current.go(currentIndex);
      }
      return;
    }

    // Wait for DOM to be ready
    const initSplide = () => {
      if (!splideContainerRef.current) {
        return;
      }

      // Destroy existing Splide instance if it exists
      if (splideRef.current) {
        splideRef.current.destroy();
        splideRef.current = null;
      }

      // Get all comic episodes
      const allEpisodes = getAllComicEpisodes();
      if (allEpisodes.length === 0) {
        return;
      }

      // Find current episode index
      const currentIndex = allEpisodes.findIndex(ep => ep.id === episodeData.id);
      if (currentIndex === -1) {
        return;
      }

      // Verify that slides are actually in the DOM before initializing
      const slides = splideContainerRef.current.querySelectorAll('.splide__slide');
      if (slides.length !== allEpisodes.length) {
        // Slides not ready yet, retry after a short delay
        setTimeout(initSplide, 50);
        return;
      }

      // Initialize Splide - let it calculate width automatically but ensure perPage is 1
      const splide = new window.Splide(splideContainerRef.current, {
        type: 'slide',
        rewind: false,
        perPage: 1,
        perMove: 1,
        gap: 0,
        speed: 800,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pagination: false,
        arrows: false,
        keyboard: false, // We'll handle keyboard navigation ourselves
        drag: true,
        swipe: true,
        start: 0, // Start at 0, then jump to correct index
        focus: 0, // Focus on first visible slide (index 0)
        trimSpace: false,
        updateOnMove: true,
        waitForTransition: false, // Don't wait for transition on initial mount
        cloneStatus: false, // Disable cloning to prevent positioning issues
        breakpoints: {
          640: {
            perPage: 1
          },
          768: {
            perPage: 1
          },
          1024: {
            perPage: 1
          }
        }
      });

      // Track if we're doing initial positioning
      let isInitialPositioning = true;
      
      // Listen for slide changes
      splide.on('moved', (newIndex) => {
        // Ignore moved events during initial positioning
        if (isInitialPositioning) {
          return;
        }
        
        const newEpisode = allEpisodes[newIndex];
        if (newEpisode && newEpisode.id !== episodeData.id) {
          isSplideUpdatingRef.current = true;
          
          // Trigger globe animation
          if (window.zoomCallback) {
            window.zoomCallback(newEpisode);
          }
          if (window.handleTimelineClick) {
            window.handleTimelineClick(newEpisode);
          }

          // Update episode data
          setCurrentPage(1);
          currentPageRef.current = 1;
          setShowCover(true);
          setFlipbookReady(false);
          flipbookCreatedRef.current = false;
          setEpisodeData(newEpisode);
          updateGlobalState({
            episodeData: newEpisode,
            currentPage: 1,
            flipbookCreated: false,
            flipbookReady: false,
            isLoading: false,
            isVisible: true
          });
          setIsVisible(true);

          // Update URL
          window.history.pushState({ momentId: newEpisode.id }, '', newEpisode.fullLink);
          
          // Reset flag after state update
          setTimeout(() => {
            isSplideUpdatingRef.current = false;
          }, 100);
        }
      });
      
      // Hide the first slide (index 0) when it's not active to prevent flash
      splide.on('move', () => {
        const slides = splideContainerRef.current.querySelectorAll('.splide__slide');
        const currentIndex = splideRef.current?.index ?? -1;
        slides.forEach((slide, idx) => {
          // Hide slide 0 unless it's the current one
          if (idx === 0 && currentIndex !== 0) {
            slide.style.visibility = 'hidden';
          } else {
            slide.style.visibility = 'visible';
          }
        });
      });
      
      // Show slides properly after transition
      splide.on('moved', () => {
        const slides = splideContainerRef.current.querySelectorAll('.splide__slide');
        const currentIndex = splideRef.current?.index ?? -1;
        slides.forEach((slide, idx) => {
          if (idx === currentIndex) {
            slide.style.visibility = 'visible';
          } else if (idx === 0 && currentIndex !== 0) {
            // Keep first slide hidden if not active
            slide.style.visibility = 'hidden';
          } else {
            slide.style.visibility = 'visible';
          }
        });
      });
      
      // Don't interfere with Splide's natural slide animation
      // Let it handle transitions naturally

      splide.mount();
      splideRef.current = splide;
      
      // Refresh Splide to ensure it recalculates dimensions
      requestAnimationFrame(() => {
        if (splideRef.current) {
          splideRef.current.refresh();
        }
      });
      
      // Wait for Splide to fully initialize and calculate layout
      // Then jump to the correct index without animation
      const jumpToCorrectIndex = () => {
        if (!splideRef.current || currentIndex === -1) {
          return;
        }
        
        // Get the list element to manually verify positioning
        const listElement = splideContainerRef.current.querySelector('.splide__list');
        if (!listElement) {
          // Retry if list not ready
          setTimeout(jumpToCorrectIndex, 50);
          return;
        }
        
        // Mark as initialized
        listElement.classList.add('is-initialized');
        
        // Refresh again to ensure proper width calculation
        if (splideRef.current) {
          splideRef.current.refresh();
        }
        
        // Ensure all slides are visible (Splide will handle positioning)
        const slides = splideContainerRef.current.querySelectorAll('.splide__slide');
        slides.forEach(slide => {
          slide.style.opacity = '1';
        });
        
        // Force jump to correct index without animation
        // Use go() with false to skip animation
        isSplideUpdatingRef.current = true;
        splideRef.current.go(currentIndex, false);
        
        // Verify the position is correct
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (splideRef.current && splideRef.current.index !== currentIndex) {
              // If still wrong, refresh and try again
              splideRef.current.refresh();
              splideRef.current.go(currentIndex, false);
            }
            
            // Double-check after a brief delay to ensure images are loaded
            setTimeout(() => {
              if (splideRef.current) {
                // Final refresh to ensure everything is correct
                splideRef.current.refresh();
                if (splideRef.current.index !== currentIndex) {
                  splideRef.current.go(currentIndex, false);
                }
              }
              // Mark initial positioning as complete
              isInitialPositioning = false;
              isSplideUpdatingRef.current = false;
            }, 150);
          });
        });
      };
      
      // Wait for Splide to be ready, then jump
      // Use multiple requestAnimationFrame calls to ensure layout is calculated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(jumpToCorrectIndex);
        });
      });
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(initSplide);
    });

    // Cleanup
    return () => {
      if (splideRef.current && !isSplideUpdatingRef.current) {
        splideRef.current.destroy();
        splideRef.current = null;
      }
    };
  }, [episodeData, showCover, getAllComicEpisodes]);

  // Handle initial page loading after component is mounted
  React.useEffect(() => {
    if (!episodeData) {
      return; // Wait for episode data to load
    }
    
    // Always show cover page first for comic episodes
    setShowCover(true);
    setFlipbookReady(false);
  }, [episodeData]);

  // Handle flipbook creation when flipbookReady becomes true or orientation changes
  React.useEffect(() => {
    // Don't create flipbook if no episode data
    if (!episodeData) {
      return;
    }
    
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
    
    // Show visible state immediately on mobile to prevent flash
    if (isMobile) {
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
  
    // Keep mobile history flag in sync whenever the cover is visible
    React.useEffect(() => {
      if (showCover) {
        mobilePageHistoryActiveRef.current = false;
      }
    }, [showCover]);
  
    const pushMobileHistoryState = React.useCallback(() => {
      if (!isMobile) {
        return;
      }
      if (typeof window === 'undefined' || !window.history) {
        return;
      }
      if (mobilePageHistoryActiveRef.current) {
        return;
      }
      const currentState = window.history.state || {};
      const newState = { ...currentState, comicReaderView: 'comic-pages' };
      window.history.pushState(newState, '', window.location.href);
      mobilePageHistoryActiveRef.current = true;
    }, [isMobile]);
  
    const goBackToCoverInternal = React.useCallback(() => {
      setShowCover(true);
      setFlipbookReady(false);
      setIsLoading(false);
      setCurrentPage(1);
      currentPageRef.current = 1;
      flipbookCreatedRef.current = false; // Reset flipbook creation flag
      mobilePageHistoryActiveRef.current = false;
      updateGlobalState({ 
        showCover: true, 
        flipbookReady: false, 
        isLoading: false, 
        currentPage: 1,
        flipbookCreated: false // Reset global flipbook creation flag
      });
    }, [updateGlobalState]);
  
    const goBackToCover = React.useCallback(() => {
      if (isMobile && mobilePageHistoryActiveRef.current && typeof window !== 'undefined') {
        window.history.back();
        return;
      }
      goBackToCoverInternal();
    }, [isMobile, goBackToCoverInternal]);
  
    React.useEffect(() => {
      if (!isMobile || typeof window === 'undefined') {
        return;
      }
      const handleMobilePopState = (event) => {
        if (!mobilePageHistoryActiveRef.current) {
          return;
        }
        mobilePageHistoryActiveRef.current = false;
        if (event?.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        } else if (event?.stopPropagation) {
          event.stopPropagation();
        }
        event?.preventDefault?.();
        goBackToCoverInternal();
      };
      window.addEventListener('popstate', handleMobilePopState, true);
      return () => {
        window.removeEventListener('popstate', handleMobilePopState, true);
      };
    }, [isMobile, goBackToCoverInternal]);
  
    // Function to transition from cover to flipbook
    const openComicBook = () => {
      setShowCover(false);
      setIsLoading(true);
      pushMobileHistoryState();
      
      // Show loading immediately, then create flipbook
      setTimeout(() => {
        // Set flipbook ready to trigger the flipbook creation
        setFlipbookReady(true);
      }, 50); // Minimal delay to ensure loading state is visible
    };



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
      const currentStyles = window.ComicReaderStyles.getDeviceStyles(deviceType, { isVisible, showControls, showCover, isLoading, orientation, isFullscreen });
      
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
    const currentStyles = window.ComicReaderStyles.getDeviceStyles(deviceType, { isVisible, showControls, showCover, isLoading, isFullscreen });
    
    // Use utility to update pages
    updatePagesUtil(deviceType, orientation, leftPage, rightPage, pageNumber, currentPages, previousPage, nextPage, currentStyles);
  };
  
  // Turn.js removed - using simple custom implementation

  const previousPage = () => {
    try {
      const currentPageValue = currentPageRef.current;
      
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
    if (splideRef.current) {
      splideRef.current.go('+1');
    } else {
      // Fallback if Splide not initialized
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
        window.history.pushState({ momentId: nextEpisode.id }, '', nextEpisode.fullLink);
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
    if (splideRef.current) {
      splideRef.current.go('-1');
    } else {
      // Fallback if Splide not initialized
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
        window.history.pushState({ momentId: prevEpisode.id }, '', prevEpisode.fullLink);
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
    ? window.ComicReaderStyles.getDeviceStyles(deviceType, { isVisible, showControls, showCover, isLoading, orientation, isFullscreen })
    : {}; // Fallback empty object if styles not loaded

  // All styles are now loaded from styles.js via getDeviceStyles()
  // Access via: styles.coverDisplayStyle, styles.coverImageStyle, etc.

  // Get all comic episodes for Splide carousel
  const allEpisodes = getAllComicEpisodes();
  
  // Build container children using render functions
  const containerChildren = [];
  
  // If showing cover, create Splide carousel with all episodes
  if (showCover && !error && renderCover && allEpisodes.length > 0) {
    // Create Splide structure: splide > splide__track > splide__list > splide__slide (for each episode)
    const splideSlides = allEpisodes.map((episode, index) => {
      const isCurrentEpisode = episode.id === episodeData?.id;
      return React.createElement('li', {
        key: `episode-${episode.id}`,
        className: 'splide__slide'
      }, renderCover(deviceType, styles, {
        episodeData: episode,
        isVisible: isCurrentEpisode ? isVisible : true, // Only animate current episode
        openComicBook: isCurrentEpisode ? openComicBook : () => {}, // Only allow opening current episode
        coverRef: isCurrentEpisode ? coverRef : null
      }));
    });

    const splideList = React.createElement('ul', {
      key: 'splide-list',
      className: 'splide__list'
    }, splideSlides);

    const splideTrack = React.createElement('div', {
      key: 'splide-track',
      className: 'splide__track'
    }, splideList);

    const splideContainer = React.createElement('div', {
      key: 'splide-container',
      ref: splideContainerRef,
      className: 'splide comic-episode-splide',
      style: {
        ...styles.comicContainerStyle,
        width: '100%',
        height: '100%'
      }
    }, splideTrack);

    containerChildren.push(splideContainer);
  } else if (showCover && !error && renderCover) {
    // Fallback: single cover if no episodes or Splide not available
    containerChildren.push(renderCover(deviceType, styles, {
      episodeData,
      isVisible,
      openComicBook,
      coverRef
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
  
  // Flipbook container
  if (!error && !showCover && renderFlipbook) {
    containerChildren.push(renderFlipbook(styles, { flipbookRef }));
  }
  
  // Desktop controls (landscape mode - two-page spread)
  if (!error && !isLoading && flipbookReady && !showCover && !useSinglePage && renderDesktopControls) {
    containerChildren.push(renderDesktopControls(styles, {
      currentPage,
      totalPages,
      previousPage,
      nextPage,
      getNextEpisode
    }));
  }
  
  // Mobile navigation (portrait mode - single page)
  if (!error && !isLoading && flipbookReady && !showCover && useSinglePage && renderMobileNavigation) {
    containerChildren.push(renderMobileNavigation(styles, {
      currentPage,
      totalPages,
      previousPage,
      nextPage,
      getNextEpisode
    }));
  }
  
  // Handler to prevent clicks on container from bubbling to overlay
  const handleContainerClick = (e) => {
    // Stop propagation to prevent overlay click handler from firing
    // This prevents accidental dismissal when clicking on empty container space
    if (!showCover) {
      e.stopPropagation();
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
        containerRef
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
  
  // Header buttons (close and fullscreen) - outside container so they don't slide
  if (renderHeaderButtons) {
    // Create a close handler that goes back to cover if viewing pages, or closes if on cover
    const handleCloseOrGoBack = () => {
      if (showCover) {
        handleClose();
      } else {
        goBackToCover();
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
    const coverNavButtons = renderCoverNavigation(deviceType, styles, {
      loadPreviousEpisode,
      loadNextEpisode,
      getPreviousEpisode: () => getPreviousEpisode(episodeData),
      getNextEpisode: () => getNextEpisode(episodeData),
      showCover,
      previousPage,
      nextPage,
      currentPage,
      totalPages,
      getNextEpisodeForPages: () => getNextEpisode(episodeData)
    });
    if (coverNavButtons) {
      overlayChildren.push(...coverNavButtons);
    }
  }
  
  
  // Prevent touch events from reaching elements underneath (like the globe)
  const handleOverlayTouchStart = (e) => {
    e.stopPropagation();
  };
  
  const handleOverlayTouchMove = (e) => {
    e.stopPropagation();
  };
  
  const handleOverlayTouchEnd = (e) => {
    e.stopPropagation();
  };

  return React.createElement('div', {
    ref: overlayRef,
    style: styles.comicOverlayStyle || {},
    onClick: handleOverlayClick,
    onTouchStart: handleOverlayTouchStart,
    onTouchMove: handleOverlayTouchMove,
    onTouchEnd: handleOverlayTouchEnd,
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
    
    .comic-episode-overlay {
      animation: fadeIn 0.2s ease-out;
    }
    
    .comic-episode-container {
      animation: scaleIn 0.3s ease-out;
    }
    
    /* Disable scaleIn animation for Splide slides */
    .comic-episode-container .splide__slide {
      animation: none;
    }
    
    /* Optimized cover display */
    .comic-cover-display {
      will-change: transform, opacity;
      transform: translateZ(0);
      backface-visibility: hidden;
      perspective: 1000px;
    }
    
    .comic-cover-display:hover img {
      transform: scale(1.01);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes scaleIn {
      from { 
        opacity: 0;
        transform: scale(0.9);
      }
      to { 
        opacity: 1;
        transform: scale(1);
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
    
    /* Splide customization for comic covers */
    .comic-episode-splide {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden !important;
      background: #000;
    }
    
    .comic-episode-splide .splide__track {
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
      background: #000;
    }
    
    .comic-episode-splide .splide__list {
      display: flex;
      align-items: stretch;
      height: 100%;
      margin: 0;
      padding: 0;
      list-style: none;
      will-change: transform;
      transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .comic-episode-splide .splide__slide {
      display: flex;
      align-items: stretch;
      justify-content: center;
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      flex-shrink: 0 !important;
      flex-grow: 0 !important;
      position: relative;
      box-sizing: border-box;
      overflow: hidden;
      background: #000;
    }
    
    .comic-episode-splide .splide__slide > * {
      width: 100%;
      height: 100%;
      flex-shrink: 0;
      display: flex;
      align-items: stretch;
      margin: 0;
      padding: 0;
    }
    
    /* Ensure cover display fills the slide */
    .comic-episode-splide .splide__slide .comic-cover-display {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    
    .comic-episode-splide .splide__slide .comic-cover-display img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    /* Force track to be exactly container width - no more, no less */
    .comic-episode-splide .splide__track {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 100% !important;
    }
    
    /* Ensure proper initial positioning - prevent stuck between slides */
    .comic-episode-splide .splide__list:not(.is-initialized) {
      transform: translateX(0) !important;
    }
    
    /* Ensure all slides are visible for smooth transitions */
    .comic-episode-splide .splide__slide {
      opacity: 1;
      pointer-events: auto;
    }
    
    /* Only hide slides that are completely off-screen to prevent flash */
    .comic-episode-splide .splide__slide {
      will-change: transform;
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
  
  `;
  document.head.appendChild(style);
}

