window.App = () => {
  const [selectedId, setSelectedId] = React.useState(null);
  const [selectedTag, setSelectedTag] = React.useState("All");
  const [selectedYear, setSelectedYear] = React.useState("All");
  const [zoomCallback, setZoomCallback] = React.useState(null);
  const [overlayMessage, setOverlayMessage] = React.useState(null); // Initialize as null
  
  // Expose setSelectedId, handleTimelineClick, and zoomCallback globally so comic reader can update timeline selection and trigger globe transitions
  React.useEffect(() => {
    window.setSelectedId = setSelectedId;
    window.handleTimelineClick = handleMomentSelection;
    return () => {
      delete window.setSelectedId;
      delete window.handleTimelineClick;
    };
  }, []);
  
  // Expose zoomCallback separately since it changes
  React.useEffect(() => {
    window.zoomCallback = zoomCallback;
    return () => {
      delete window.zoomCallback;
    };
  }, [zoomCallback]);

  // Function to update overlay message
  const updateOverlayMessage = (message, isComicClickable = false, momentId = null) => {
    setOverlayMessage(message);
    const overlayMessageEl = document.getElementById('overlay-message');
    const overlay = document.getElementById('overlay');
    
    if (overlayMessageEl) {
      overlayMessageEl.textContent = message;
      
      // Make clickable for comic episodes
      if (isComicClickable && momentId) {
        overlayMessageEl.style.cursor = 'pointer';
        overlayMessageEl.style.textDecoration = 'underline';
        overlayMessageEl.title = 'Click to open comic book';
        
        // Remove existing handlers
        overlayMessageEl.onclick = null;
        
        // Add click handler
        overlayMessageEl.onclick = () => {
          console.log('Overlay clicked for comic episode:', momentId);
          if (window.handleOpenBlogPost) {
            window.handleOpenBlogPost(momentId);
          }
        };
        
        if (overlay) {
          overlay.style.pointerEvents = 'auto';
        }
      } else {
        // Reset to non-clickable
        overlayMessageEl.style.cursor = 'default';
        overlayMessageEl.style.textDecoration = 'none';
        overlayMessageEl.title = '';
        overlayMessageEl.onclick = null;
        
        if (overlay) {
          overlay.style.pointerEvents = 'none';
        }
      }
    }
  };

  // Function to determine if a post is a comic episode
  const isComicEpisode = (moment) => {
    return moment && moment.isComic === true;
  };

  // Ensure the timeline is visible by closing any open drawers/comics
  const ensureTimelineVisible = () => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (!body) return;

    const bodyHidingTimeline = body.classList.contains('blog-drawer-open') || body.classList.contains('comic-is-open');
    const drawerOpen = typeof window.isBlogDrawerOpen === 'boolean'
      ? window.isBlogDrawerOpen
      : !!document.querySelector('.blog-post-drawer.open');
    const comicOpen = !!document.querySelector('.comic-episode-container');

    if (!bodyHidingTimeline && !drawerOpen && !comicOpen) {
      return;
    }

    if (typeof window.closeContentDrawer === 'function') {
      window.closeContentDrawer();
    } else if (typeof window.setBlogPostContent === 'function') {
      window.setBlogPostContent(null);
    }

    body.classList.remove('blog-drawer-open');
    body.classList.remove('comic-is-open');
  };

  // Unified logic for selecting a moment (used for clicks, initial load, and popstate)
  const handleMomentSelection = (moment) => {
    if (moment) {
      const momentIsComic = isComicEpisode(moment);
      if (!momentIsComic) {
        ensureTimelineVisible();
      }

      setSelectedId(moment.id);
      
      // Check if comic reader is currently open (showing cover)
      const isComicReaderOpen = typeof window.scrollComicToEpisode === 'function';
      
      // If comic reader is open and clicking a comic episode, scroll to that episode
      if (isComicReaderOpen && momentIsComic) {
        console.log('Comic reader is open, scrolling to episode:', moment.id);
        const scrolled = window.scrollComicToEpisode(moment.id);
        if (scrolled) {
          // Episode scrolled successfully, trigger zoom
          if (zoomCallback) {
            zoomCallback(moment);
          }
          return; // Don't proceed with normal opening logic
        }
      }
      
      // If comic reader is open and clicking a non-comic episode, close the comic reader
      if (isComicReaderOpen && !momentIsComic) {
        console.log('Comic reader is open, closing to show non-comic episode:', moment.id);
        // Continue with normal flow to show the episode
      }
      
      // For comic episodes, skip the overlay entirely and go straight to comic
      if (momentIsComic) {
        console.log('Comic episode detected - bypassing overlay, opening comic directly');
        // Hide the overlay immediately for comics
        updateOverlayMessage(null);
        const overlay = document.getElementById('overlay');
        if (overlay) {
          overlay.classList.add('hidden');
        }
        console.log('Comic episode detected, attempting to open comic for:', moment.id);
        
        // Function to try opening the comic
        const tryOpenComic = (attempts = 0) => {
          if (window.handleOpenBlogPost) {
            console.log('Opening comic via handleOpenBlogPost');
            window.handleOpenBlogPost(moment.id);
            // Clear the overlay message when comic opens
            setTimeout(() => {
              updateOverlayMessage(null);
              const overlay = document.getElementById('overlay');
              if (overlay) {
                overlay.classList.add('hidden');
              }
            }, 500);
          } else if (attempts < 10) {
            // Retry if handleOpenBlogPost isn't ready yet
            console.log(`handleOpenBlogPost not ready, retrying... (attempt ${attempts + 1})`);
            setTimeout(() => tryOpenComic(attempts + 1), 200);
          } else {
            console.error('Failed to open comic: handleOpenBlogPost never became available');
            updateOverlayMessage('Unable to load comic book - please try refreshing');
          }
        };
        
        // Wait a bit for the zoom to start, then try opening the comic
        setTimeout(tryOpenComic, 100);
      } else {
        // For non-comic episodes, show the normal overlay message
        updateOverlayMessage(`${moment.title}...`, false, null);
      }
      
      if (zoomCallback) {
        zoomCallback(moment); // Trigger zoom to the moment's location
      }
      // Normalize and update the URL only if it doesn't already match
      let intendedPath;
      if (moment.fullLink === '#') {
        // For moments with no specific page, generate a proper URL based on location and date
        // Extract city name from location.name (e.g., "Lisbon, Portugal" -> "lisbon")
        let locationSlug;
        if (moment.location && moment.location.name) {
          // Extract city name from location.name (format: "City, Country" or "City, State")
          const locationName = moment.location.name;
          const cityMatch = locationName.match(/^([^,]+)/);
          if (cityMatch) {
            locationSlug = cityMatch[1].trim()
              .toLowerCase()
              .normalize('NFD') // Decompose characters (e.g., í -> i + ́)
              .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
              .replace(/[^a-z0-9\s-]/g, '') // Remove remaining special characters
              .replace(/\s+/g, '-') // Replace spaces with hyphens
              .replace(/-+/g, '-') // Replace multiple hyphens with single
              .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
          }
        }
        
        // Fallback to using id if location extraction fails
        if (!locationSlug && moment.id) {
          const idMatch = moment.id.match(/^([^-]+)/);
          if (idMatch) {
            locationSlug = idMatch[1];
          }
        }
        
        const date = new Date(moment.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        intendedPath = `/moments/${locationSlug}/${year}-${month}-${day}/`;
      } else if (moment.fullLink.startsWith('/')) {
        intendedPath = moment.fullLink;
      } else {
        intendedPath = `/moments/${moment.fullLink}`;
      }
      
      const currentPath = window.stripBase ? window.stripBase(window.location.pathname) : window.location.pathname;
      if (currentPath !== intendedPath) {
        // For comic moments, preserve the hash; for non-comic moments, don't add hash
        const fullUrl = momentIsComic ? intendedPath + window.location.hash : intendedPath;
        window.history.pushState({ momentId: moment.id }, '', window.withBase ? window.withBase(fullUrl) : fullUrl);
      }
    } else {
      updateOverlayMessage('Looking for Paul'); // Default message
    }
  };

  // Find the most recent moment for the location button
  const findCurrentMoment = () => {
    const today = new Date();
    // Find the most recent moment where end date is before or on today
    const sortedMoments = [...window.momentsInTime].sort((a, b) => b.date - a.date);
    return sortedMoments.find(moment => {
      const startDate = new Date(moment.date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + moment.stayDuration);
      return endDate <= today || startDate <= today;
    }) || sortedMoments[0]; // Fallback to the most recent moment
  };

  // Handle location button click
  const handleLocationButtonClick = () => {
    const currentMoment = findCurrentMoment();
    if (currentMoment) {
      handleMomentSelection(currentMoment); // Zoom and select the moment
    }
  };

  // Smooth transition function for episode navigation
  const smoothEpisodeTransition = (nextEpisodeId) => {
    // Find the next episode moment
    const nextMoment = window.momentsInTime.find(m => m.id === nextEpisodeId);
    if (!nextMoment) {
      console.error('Next episode not found:', nextEpisodeId);
      return;
    }
    
    // Check if drawer is currently open
    const isDrawerOpen = window.isBlogDrawerOpen || 
                        document.querySelector('.blog-post-drawer') ||
                        document.querySelector('.comic-episode-container');
    
    if (isDrawerOpen) {
      // Smooth transition: keep drawer open, just change content
      const currentContent = document.querySelector('.blog-post-drawer-content') || 
                            document.querySelector('.interactive-episode-body') ||
                            document.querySelector('.comic-episode-container');
      if (currentContent) {
        currentContent.classList.add('transitioning');
      }
      
      // Add loading indicator
      const drawer = document.querySelector('.blog-post-drawer');
      if (drawer) {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'episode-loading-overlay';
        loadingOverlay.innerHTML = `
          <div class="episode-loading-content">
            <div class="episode-loading-spinner"></div>
            <div class="episode-loading-text">Loading ${nextMoment.title}...</div>
          </div>
        `;
        drawer.appendChild(loadingOverlay);
        
        // Scroll to top
        drawer.scrollTop = 0;
      }
      
      // Start the transition sequence
      setTimeout(() => {
        // Keep drawer open and load new content
        if (window.handleOpenBlogPost) {
          window.handleOpenBlogPost(nextMoment.id);
        } else {
          console.error('handleOpenBlogPost not available');
        }
      }, 800); // Longer delay to show loading indicator
    } else {
      // Drawer is closed, navigate to the new canonical URL
      const intendedPath = nextMoment.fullLink.startsWith('/') ? nextMoment.fullLink : `/moments/${nextMoment.fullLink}`;
      window.location.href = window.withBase ? window.withBase(intendedPath) : intendedPath;
    }
  };

  // Expose the smooth transition function globally
  window.smoothEpisodeTransition = smoothEpisodeTransition;
  
  // Urban Runner navigation function
  window.addUrbanRunnerNavigation = (episodeId) => {
    if (window.EpisodeNavigation) {
      const navContainer = document.getElementById('episode-navigation-container');
      
      if (navContainer) {
        // Add breadcrumb navigation
        const breadcrumb = window.EpisodeNavigation.generateBreadcrumb(episodeId);
        const episodeNav = window.EpisodeNavigation.generateEpisodeNav(episodeId);
        
        navContainer.innerHTML = `
          <div style="margin-bottom: 1rem;">
            ${breadcrumb}
          </div>
          <div>
            ${episodeNav}
          </div>
        `;
      }
    } else {
      // Retry if navigation component isn't loaded yet
      setTimeout(() => window.addUrbanRunnerNavigation(episodeId), 100);
    }
  };

  // Check URL on initial load to set selectedId and zoom to location
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathFromQuery = params.get('path');
    let path = window.stripBase ? window.stripBase(window.location.pathname) : window.location.pathname;

    if (pathFromQuery) {
      path = pathFromQuery;
      const rewritten = window.withBase ? window.withBase(path) : path;
      window.history.replaceState({}, '', rewritten + (window.location.hash || ''));
    }

    const normalizedPath = path.endsWith('/') ? path : path + '/';
    const pathWithoutTrailing = path.endsWith('/') ? path.slice(0, -1) : path;

    if (window.momentsInTime && Array.isArray(window.momentsInTime)) {
      const directMoment = window.momentsInTime.find(m => {
        if (!m.fullLink) return false;
        const momentPath = m.fullLink.endsWith('/') ? m.fullLink : m.fullLink + '/';
        return momentPath === normalizedPath || m.fullLink === path || m.fullLink === pathWithoutTrailing;
      });
      if (directMoment) {
        handleMomentSelection(directMoment);
        return;
      }
    }

    const match = path.match(/^\/moments\/(.+)/);
    if (match) {
      const pathSegment = match[1];
      const pathSegmentWithoutHash = pathSegment.split('#')[0];
      const pathWithSlash = pathSegmentWithoutHash.endsWith('/') ? pathSegmentWithoutHash : pathSegmentWithoutHash + '/';
      const pathNoSlash = pathSegmentWithoutHash.replace(/\/$/, '');
      const fullPathWithSlash = `/moments/${pathWithSlash}`;
      const fullPathNoSlash = `/moments/${pathNoSlash}`;

      let moment = window.momentsInTime.find(m => m.fullLink === path);
      if (!moment) {
        moment = window.momentsInTime.find(m => {
          if (m.fullLink && m.fullLink.includes('#')) {
            const basePath = m.fullLink.split('#')[0];
            return basePath === fullPathWithSlash || basePath === fullPathNoSlash;
          }
          return false;
        });
      }
      if (!moment) {
        moment = window.momentsInTime.find(m => m.fullLink === fullPathWithSlash || m.fullLink === fullPathNoSlash) ||
          window.momentsInTime.find(m => m.id === pathSegmentWithoutHash);
      }
      
      // If still no match, try to find by generated URL from location.name (for moments with fullLink: "#")
      if (!moment) {
        // Parse the path to extract city and date
        const pathMatch = pathSegmentWithoutHash.match(/^([^\/]+)\/(\d{4}-\d{2}-\d{2})/);
        if (pathMatch) {
          const [, citySlug, dateStr] = pathMatch;
          moment = window.momentsInTime.find(m => {
            if (m.fullLink === '#' && m.location && m.location.name) {
              // Generate city slug from location.name
              const locationName = m.location.name;
              const cityMatch = locationName.match(/^([^,]+)/);
              if (cityMatch) {
                const generatedCitySlug = cityMatch[1].trim()
                  .toLowerCase()
                  .normalize('NFD') // Decompose characters (e.g., í -> i + ́)
                  .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                  .replace(/[^a-z0-9\s-]/g, '')
                  .replace(/\s+/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, '');
                
                // Generate date string
                const mDate = new Date(m.date);
                const mYear = mDate.getFullYear();
                const mMonth = String(mDate.getMonth() + 1).padStart(2, '0');
                const mDay = String(mDate.getDate()).padStart(2, '0');
                const mDateStr = `${mYear}-${mMonth}-${mDay}`;
                
                return generatedCitySlug === citySlug && mDateStr === dateStr;
              }
            }
            return false;
          });
        }
      }
      
      if (moment) {
        updateOverlayMessage(`Exploring ${moment.title}`); // Set moment-specific message upfront
        handleMomentSelection(moment); // Use the unified logic to select and zoom
      } else {
        window.history.replaceState({}, '', window.withBase ? window.withBase('/') : '/');
        updateOverlayMessage('Looking for Paul');
      }
    } else {
      // Check for current moment based on today's date
      const today = new Date();
      const currentMoment = window.momentsInTime.find(moment => {
        const startDate = new Date(moment.date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + moment.stayDuration);
        return today >= startDate && today <= endDate;
      });

      if (currentMoment) {
        // Simulate clicking on the timeline element for this moment
        const timelineElement = document.querySelector(`[data-id="${currentMoment.id}"]`);
        if (timelineElement) {
          // Add a small delay to ensure event handlers are attached
          setTimeout(() => {
            timelineElement.click();
          }, 100);
        } else {
          // Fallback to direct selection if timeline element not found
          updateOverlayMessage(`Exploring ${currentMoment.title}`);
          handleMomentSelection(currentMoment);
        }
      } else {
        updateOverlayMessage('Looking for Paul'); // Default message
      }
    }
  }, [zoomCallback]);

  // Listen for popstate events (back/forward navigation)
  React.useEffect(() => {
    const handlePopState = (event) => {
      // Comic reader consumed back (exit fullscreen or go back to cover on Android)
      if (window.comicConsumedBack) {
        window.comicConsumedBack = false;
        return;
      }
      const state = event.state || {};
      const momentId = state.momentId;
      const moment = momentId ? window.momentsInTime.find(m => m.id === momentId) : null;
      if (moment) {
        handleMomentSelection(moment); // Use the unified logic to select and zoom
      } else {
        setSelectedId(null); // Reset if no momentId in URL
        // Redirect to root to trigger current location logic
        window.history.replaceState({}, '', window.withBase ? window.withBase('/') : '/');
        updateOverlayMessage('Looking for Paul');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [zoomCallback]);

  // Manage overlay display
  React.useEffect(() => {
    let isMounted = true;
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    const timer = setTimeout(() => {
      if (isMounted) {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 1000); // Fade-out duration
      }
    }, 3000); // Show for 3 seconds
    return () => {
      clearTimeout(timer);
      isMounted = false;
    };
  }, []);

  return React.createElement(
    'div',
    { style: { position: 'relative' } },
    React.createElement(window.GlobeComponent, {
      handleTimelineClick: handleMomentSelection, // Pass the unified function
      selectedId,
      setSelectedId,
      selectedTag,
      setSelectedTag,
      selectedYear,
      setSelectedYear,
      setZoomCallback
    }),
    React.createElement(window.Footer, {
      handleTimelineClick: handleMomentSelection, // Pass the unified function
      selectedId,
      setSelectedId,
      selectedTag,
      selectedYear
    }),
    React.createElement(
      'button',
      {
        className: 'location-button',
        onClick: handleLocationButtonClick,
        title: 'Zoom to current location'
      },
      React.createElement(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          width: '24px',
          height: '24px'
        },
        React.createElement('path', {
          d: 'M12 2a6 6 0 0 1 6 6c0 5-6 10-6 10s-6-5-6-10a6 6 0 0 1 6-6z',
          strokeWidth: '2'
        }),
        React.createElement('circle', { cx: '12', cy: '8', r: '2', fill: 'currentColor' })
      )
    )
  );
};