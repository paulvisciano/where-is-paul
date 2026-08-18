// ============================================================================
// Device-Specific Render Functions
// ============================================================================

/**
 * Render header buttons (close and fullscreen) - shared across all devices
 */
const renderHeaderButtons = (styles, { handleClose, toggleFullscreen, isFullscreen }) => {
  return [
    React.createElement('button', {
      key: 'close',
      style: styles.closeButtonStyle || {},
      onClick: handleClose,
      title: 'Close Comic',
      onMouseEnter: (e) => {
        e.target.style.background = '#ff3742';
        e.target.style.transform = 'scale(1.1)';
      },
      onMouseLeave: (e) => {
        e.target.style.background = '#ff4757';
        e.target.style.transform = 'scale(1)';
      }
    }, '×'),
    
    React.createElement('button', {
      key: 'fullscreen',
      style: styles.fullscreenButtonStyle || {},
      onClick: toggleFullscreen,
      title: isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)',
      onMouseEnter: (e) => {
        e.target.style.background = 'rgba(52, 152, 219, 1)';
        e.target.style.transform = 'scale(1.1)';
      },
      onMouseLeave: (e) => {
        e.target.style.background = 'rgba(52, 152, 219, 0.9)';
        e.target.style.transform = 'scale(1)';
      }
    }, isFullscreen ? '⊗' : '⛶')
  ];
};

/**
 * Resolve image URL - convert attachment:// to loadable path (e.g. /moments/...)
 */
const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('attachment://')) url = url.replace('attachment://', '');
  return window.withBase ? window.withBase(url) : url;
};

/**
 * Render cover display - device-specific text but similar structure
 */
const renderCover = (deviceType, styles, { 
  episodeData, 
  isVisible, 
  openComicBook, 
  coverRef,
  isWideCover = false
}) => {
  const isMobile = deviceType === 'mobile';
  const coverSrc = resolveImageUrl(episodeData?.cover || episodeData?.image) || (episodeData?.fullLink ? (window.withBase ? window.withBase(`${episodeData.fullLink.replace(/\/$/, '')}/cover.png`) : `${episodeData.fullLink.replace(/\/$/, '')}/cover.png`) : null);
  
  const coverClassName = 'comic-cover-display' + (isWideCover ? ' comic-cover-display--wide' : '');
  return React.createElement('div', {
    key: 'cover',
    ref: coverRef,
    style: styles.coverDisplayStyle || {},
    className: coverClassName,
    onClick: isVisible ? openComicBook : undefined,
    onMouseEnter: isVisible ? (e) => {
      const img = e.target.querySelector('img');
      if (img) img.style.transform = 'scale(1.02)';
    } : undefined,
    onMouseLeave: isVisible ? (e) => {
      const img = e.target.querySelector('img');
      if (img) img.style.transform = 'scale(1)';
    } : undefined
  }, [
    !isVisible && React.createElement('div', {
      key: 'loading-overlay',
      style: styles.coverLoadingOverlayStyle || {}
    }, [
      React.createElement('div', {
        key: 'spinner',
        style: styles.loadingSpinnerStyle || {}
      }),
      React.createElement('div', {
        key: 'loading-text',
        style: styles.loadingTextStyle || {}
      }, isMobile ? 'Loading...' : 'Loading comic book...')
    ]),
    episodeData && coverSrc && React.createElement('img', {
      key: 'cover-img',
      src: coverSrc,
      alt: `${episodeData.title} Cover`,
      style: styles.coverImageWithOpacityStyle ? styles.coverImageWithOpacityStyle(isVisible) : (styles.coverImageStyle || {})
    })
  ]);
};

/**
 * Render loading state
 */
const renderLoading = (deviceType, styles) => {
  const isMobile = deviceType === 'mobile';
  
  return React.createElement('div', {
    key: 'loading',
    style: styles.loadingStyle || {}
  }, [
    React.createElement('div', {
      key: 'spinner',
      style: styles.loadingSpinnerStyle || {}
    }),
    React.createElement('div', {
      key: 'boot-header',
      style: {
        ...(styles.loadingTextStyle || {}),
        marginBottom: '20px'
      }
    }, isMobile ? 'Loading...' : 'Loading comic...')
  ]);
};

/**
 * Render error state
 */
const renderError = (styles, { error, createFlipbook, setError, setIsLoading }) => {
  return React.createElement('div', {
    key: 'error',
    style: styles.errorContainerStyle || {}
  }, [
    React.createElement('div', {
      key: 'error-icon',
      style: styles.errorIconStyle || {}
    }, '⚠️'),
    React.createElement('div', { key: 'error-msg' }, error),
    React.createElement('button', {
      key: 'retry',
      onClick: () => {
        setError(null);
        setIsLoading(true);
        // Retry initialization
        setTimeout(() => {
          createFlipbook(1);
        }, 100);
      },
      style: styles.retryButtonStyle || {}
    }, 'Give Paul Another Shot 🚀')
  ]);
};

/**
 * Render flipbook container
 */
const renderFlipbook = (styles, { flipbookRef }) => {
  return React.createElement('div', {
    key: 'flipbook',
    ref: flipbookRef,
    style: styles.flipbookStyle || {},
    className: 'flipbook'
  });
};

/**
 * Render desktop controls (top navigation)
 */
const renderDesktopControls = (styles, { 
  currentPage, 
  totalPages, 
  previousPage, 
  nextPage, 
  getNextEpisode 
}) => {
  return React.createElement('div', {
    key: 'controls',
    style: styles.controlsStyle || {},
    className: 'comic-controls'
  }, [
    React.createElement('button', {
      key: 'prev',
      style: styles.desktopControlButtonStyle || {},
      onClick: previousPage,
      title: currentPage === 1 ? 'Back to Cover' : 'Previous Page'
    }, '‹'),
    React.createElement('div', {
      key: 'indicator',
      style: styles.pageIndicatorStyle || {}
    }, `${currentPage} / ${totalPages}`),
    React.createElement('button', {
      key: 'next',
      style: styles.desktopControlButtonDisabledStyle 
        ? styles.desktopControlButtonDisabledStyle(currentPage === totalPages && !getNextEpisode())
        : {},
      onClick: nextPage,
      disabled: currentPage === totalPages && !getNextEpisode(),
      title: currentPage === totalPages && getNextEpisode() ? 'Next Episode' : 'Next Page'
    }, currentPage === totalPages && getNextEpisode() ? '⏭' : '›')
  ]);
};

/**
 * Render mobile navigation (bottom navigation)
 */
const renderMobileNavigation = (styles, { 
  currentPage, 
  totalPages, 
  previousPage, 
  nextPage, 
  getNextEpisode 
}) => {
  return React.createElement('div', {
    key: 'mobile-nav',
    style: styles.mobileNavStyle || {},
    className: 'mobile-comic-nav'
  }, [
    React.createElement('button', {
      key: 'mobile-prev',
      style: styles.mobileNavButtonPrevStyle || {},
      onClick: previousPage,
      title: currentPage === 1 ? 'Back to Cover' : 'Previous Page'
    }, '◀'),
    React.createElement('div', {
      key: 'mobile-indicator',
      style: styles.mobileNavIndicatorStyle || {}
    }, `${currentPage} / ${totalPages}`),
    React.createElement('button', {
      key: 'mobile-next',
      style: styles.mobileNavButtonNextStyle 
        ? styles.mobileNavButtonNextStyle(currentPage === totalPages && !getNextEpisode())
        : {},
      onClick: nextPage,
      title: currentPage === totalPages && getNextEpisode() ? 'Next Episode' : 'Next Page'
    }, currentPage === totalPages && getNextEpisode() ? '⏭' : '▶')
  ]);
};

/**
 * Render container with device-specific handlers
 */
const renderContainer = (deviceType, styles, { 
  setShowControls, 
  onTouchStart, 
  onTouchMove, 
  onTouchEnd,
  onClick,
  children,
  containerRef,
  containerClassName = '',
  isV4Episode = false,
  isCharacterComicBook = false,
  showCover = true
}) => {
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  // Attach touch handlers for: flipbook (horizontal swipe between pages), character comic (horizontal swipe between characters)
  // Not for: cover (Swiper handles carousel), v4 (vertical Swiper handles slides)
  const attachTouchHandlers = (isMobile || isTablet) && !showCover && (isCharacterComicBook || !isV4Episode);
  const className = 'comic-episode-container' + (containerClassName ? ' ' + containerClassName.trim() : '');
  
  return React.createElement('div', {
    key: 'container',
    ref: containerRef,
    style: styles.comicContainerStyle || {},
    className,
    onMouseEnter: () => setShowControls(true),
    onMouseLeave: () => setShowControls(false),
    onTouchStart: attachTouchHandlers ? onTouchStart : undefined,
    onTouchMove: attachTouchHandlers ? onTouchMove : undefined,
    onTouchEnd: attachTouchHandlers ? onTouchEnd : undefined,
    onClick: onClick
  }, children);
};

/**
 * Render cover navigation buttons (outside container)
 * When on cover: navigates between episodes
 * When pages are open: navigates between pages (desktop/tablet only)
 */
const renderCoverNavigation = (deviceType, styles, {
  loadPreviousEpisode,
  loadNextEpisode,
  getPreviousEpisode,
  getNextEpisode,
  showCover,
  previousPage,
  nextPage,
  currentPage,
  totalPages,
  getNextEpisodeForPages,
  isFullscreen = false,
  isV4Episode = false
}) => {
  const isMobile = deviceType === 'mobile';
  const buttons = [];
  
  // When pages are open, navigate between pages (desktop/tablet only)
  // Hide nav arrows for V4 immersive mode (uses vertical swipe, not left/right)
  if (!isMobile && !showCover && previousPage && nextPage && !isV4Episode) {
    // Left button for previous page
    buttons.push(React.createElement('button', {
      key: 'page-prev',
      className: 'cover-nav-button cover-nav-prev',
      onClick: (e) => {
        e.stopPropagation();
        if (previousPage) {
          previousPage();
        }
      },
      style: styles.coverNavButtonPrevStyle || {},
      title: currentPage === 1 ? 'Back to Cover' : 'Previous Page'
    }, '‹'));
    
    // Right button for next page
    const hasNextPage = currentPage < totalPages;
    const hasNextEpisode = getNextEpisodeForPages ? getNextEpisodeForPages() : null;
    const isDisabled = !hasNextPage && !hasNextEpisode;
    buttons.push(React.createElement('button', {
      key: 'page-next',
      className: 'cover-nav-button cover-nav-next',
      onClick: (e) => {
        e.stopPropagation();
        if (!isDisabled && nextPage) {
          nextPage();
        }
      },
      style: {
        ...(styles.coverNavButtonNextStyle || {}),
        ...(isDisabled ? {
          opacity: 0.4,
          cursor: 'not-allowed',
          pointerEvents: 'none'
        } : {})
      },
      title: hasNextPage ? 'Next Page' : (hasNextEpisode ? 'Next Episode' : 'Last Page'),
      disabled: isDisabled
    }, '›'));
    
    return buttons;
  }
  
  // When on cover, navigate between episodes (all devices)
  const hasPreviousEpisode = getPreviousEpisode ? getPreviousEpisode() : null;
  const hasNextEpisode = getNextEpisode ? getNextEpisode() : null;
  
  if (!showCover || (!hasPreviousEpisode && !hasNextEpisode)) {
    return null;
  }
  
  // Left arrow button for previous episode
  if (hasPreviousEpisode) {
    buttons.push(React.createElement('button', {
      key: 'cover-prev',
      className: 'cover-nav-button cover-nav-prev',
      onClick: (e) => {
        e.stopPropagation();
        if (loadPreviousEpisode) {
          loadPreviousEpisode();
        }
      },
      style: styles.coverNavButtonPrevStyle || {},
      title: 'Previous Episode'
    }, '‹'));
  }
  
  // Right arrow button for next episode
  if (hasNextEpisode) {
    buttons.push(React.createElement('button', {
      key: 'cover-next',
      className: 'cover-nav-button cover-nav-next',
      onClick: (e) => {
        e.stopPropagation();
        if (loadNextEpisode) {
          loadNextEpisode();
        }
      },
      style: styles.coverNavButtonNextStyle || {},
      title: 'Next Episode'
    }, '›'));
  }
  
  return buttons;
};

/**
 * Render Comic Reader 4.0 immersive layout (cover + pages + orientation-aware video).
 * Used when episodeData.comicReaderVersion === 4 or episodeData.immersiveComic === true.
 */
const renderImmersiveV4 = (episodeData, styles, navState = {}) => {
  if (typeof window.ComicReaderImmersiveV4 !== 'function') return null;
  return React.createElement(window.ComicReaderImmersiveV4, {
    episodeData,
    styles: styles || {},
    navState: navState || {}
  });
};

/**
 * Render Character Slide Viewer for "The People in My Life" comic book.
 * Desktop: two characters side-by-side; mobile: one character per slide.
 * Each character has vertically scrollable image, video, and narrative sections.
 */
const renderCharacterSlideViewer = (episodeData, styles, navState = {}) => {
  if (typeof window.ComicReaderCharacterSlideViewer !== 'function') return null;
  return React.createElement(window.ComicReaderCharacterSlideViewer, {
    episodeData,
    styles: styles || {},
    navState: navState || {}
  });
};

// Export render functions
window.ComicReaderRender = {
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
};

