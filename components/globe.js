window.GlobeComponent = ({ handleTimelineClick, selectedId, setSelectedId, selectedTag, setSelectedTag, selectedYear, setSelectedYear, setZoomCallback }) => {
  if (typeof window.momentsInTime === 'undefined') {
    return React.createElement('div', null, 'Error: Data not loaded');
  }

  const regularTags = ["All", ...new Set(window.momentsInTime.flatMap(post => post.tags))];
  const yearTags = ["All", ...new Set(window.momentsInTime.map(post => new Date(post.date).getUTCFullYear().toString()))].sort((a, b) => b - a);
  const [characters, setCharacters] = React.useState(window.characters || []);
  
  // Update characters when they become available (polling for async load)
  React.useEffect(() => {
    // Check immediately
    if (window.characters && window.characters.length > 0) {
      setCharacters(window.characters);
      return;
    }
    
    // Poll for characters.js to load (in case it loads after component renders)
    const checkCharacters = setInterval(() => {
      if (window.characters && window.characters.length > 0) {
        setCharacters(window.characters);
        clearInterval(checkCharacters);
      }
    }, 100);
    
    // Stop polling after 5 seconds
    setTimeout(() => {
      clearInterval(checkCharacters);
    }, 5000);
    
    return () => clearInterval(checkCharacters);
  }, []);
  
  // Function to open character comic book (via its moment id).
  // If characterId is provided and that character has a page in the comic, navigates to that slide.
  const handleOpenCharacterComic = (characterId) => {
    if (window.handleOpenBlogPost) {
      let initialSlide = null;
      if (characterId && window.characterComicBook?.pages) {
        const idx = window.characterComicBook.pages.findIndex(p => p.character === characterId);
        if (idx >= 0) initialSlide = idx + 1; // 1-based page number
      }
      window.handleOpenBlogPost('characters-comic-book-2025-09-15', { initialSlide });
      setIsDrawerOpen(false);
    }
  };
  const [popoverContent, setPopoverContent] = React.useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  
    // Check for characters when drawer opens
    React.useEffect(() => {
      if (isDrawerOpen && window.characters && window.characters.length > 0) {
        setCharacters(window.characters);
      }
    }, [isDrawerOpen]);
    const [isBlogDrawerOpen, setIsBlogDrawerOpen] = React.useState(false);
    const [blogPostContent, setBlogPostContent] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const globeInstance = React.useRef(null);
  const popoverRef = React.useRef(null);
  const drawerRef = React.useRef(null);
  const blogDrawerRef = React.useRef(null);
  const isZooming = React.useRef(false);
  const touchStartX = React.useRef(null);
  const touchStartY = React.useRef(null);
  const lastTap = React.useRef(0);
  const doubleTapTimeout = React.useRef(null);
  const pinchStartDistance = React.useRef(null);
  const pinchStartAltitude = React.useRef(null);

    // Keep drawer state accessible globally
    React.useEffect(() => {
      window.isBlogDrawerOpen = isBlogDrawerOpen;
      return () => {
        delete window.isBlogDrawerOpen;
      };
    }, [isBlogDrawerOpen]);

    // Provide a global helper to close any open drawer/comic content
    React.useEffect(() => {
      window.closeContentDrawer = () => {
        setIsBlogDrawerOpen(false);
        setBlogPostContent(null);
        if (typeof document !== 'undefined' && document.body) {
          document.body.classList.remove('blog-drawer-open');
          document.body.classList.remove('comic-is-open');
        }
      };

      return () => {
        delete window.closeContentDrawer;
      };
    }, []);

  // Expose state setters and refs to window for BlogPostDrawer
  window.setBlogPostContent = setBlogPostContent;
  window.isLoading = isLoading;
  window.error = error;
  window.blogDrawerRef = blogDrawerRef;

  // Function to determine if a post is an interactive episode
  const isInteractiveEpisode = (postId, title) => {
    const post = window.momentsInTime.find(p => p.id === postId);
    return post && post.isInteractive === true;
  };

  // Function to determine if a post is a comic episode
  const isComicEpisode = (postId, title) => {
    const post = window.momentsInTime.find(p => p.id === postId);
    return post && post.isComic === true;
  };

  // Update body class when blog drawer is open/closed to hide footer on mobile
  // Only hide timeline for non-comic blog posts (comic episodes use comic-is-open class)
  React.useEffect(() => {
    // Don't add blog-drawer-open for comic episodes - they use comic-is-open class instead
    const isComic = blogPostContent && isComicEpisode(blogPostContent.postId || '', blogPostContent.title);
    
    if (isBlogDrawerOpen && !isComic) {
      document.body.classList.add('blog-drawer-open');
    } else {
      document.body.classList.remove('blog-drawer-open');
    }
    return () => {
      document.body.classList.remove('blog-drawer-open');
    };
  }, [isBlogDrawerOpen, blogPostContent]);

  // Define linear scales for each duration range for smooth gradients
  const scaleShort = d3.scaleLinear()
    .domain([1, 3])
    .range(["#FF4500", "#FF4500"]);
  const scaleWeek = d3.scaleLinear()
    .domain([4, 14])
    .range(["#FF4500", "#A32F00"]);
  const scaleMonth = d3.scaleLinear()
    .domain([15, 90])
    .range(["#A32F00", "#A32F00"]);
  const scaleLong = d3.scaleLinear()
    .domain([91, 365])
    .range(["#A32F00", "#4F1F00"]);

  // Combine scales into a single weightColor function
  const weightColor = (duration) => {
    if (duration <= 3) return scaleShort(duration);
    if (duration <= 14) return scaleWeek(duration);
    if (duration <= 90) return scaleMonth(duration);
    return scaleLong(Math.min(duration, 365));
  };

  // Color interpolator for ripple rings (orange theme with fade)
  const ringColorInterpolator = t => `rgba(255, 165, 0, ${Math.sqrt(1 - t)})`;

  const waitForZoom = (duration) => new Promise(resolve => setTimeout(resolve, duration));

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      // Prevent dismissing popover when interacting with the globe
      if (event.target.closest('#globeViz')) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(event.target) && !event.target.closest('.overlay')) {
        setPopoverContent(null);
        setSelectedId(null);
      }
      if (isDrawerOpen && drawerRef.current && !drawerRef.current.contains(event.target) && !event.target.closest('.filter-toggle-button')) {
        setIsDrawerOpen(false);
      }
      if (isBlogDrawerOpen && blogDrawerRef.current && !blogDrawerRef.current.contains(event.target) && !event.target.closest('.blog-post-drawer') && !event.target.closest('.comic-episode-overlay')) {
        setIsBlogDrawerOpen(false);
      }
    };

    const handleTouchStart = (event) => {
      if (event.target.closest('.overlay') || event.target.closest('.popover') || event.target.closest('.filter-drawer') || event.target.closest('.blog-post-drawer') || event.target.closest('.comic-episode-overlay')) {
        return;
      }
      if (event.touches.length === 1) {
        touchStartX.current = event.touches[0].clientX;
        touchStartY.current = event.touches[0].clientY;
        const currentTime = new Date().getTime();
        const timeSinceLastTap = currentTime - lastTap.current;

        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
          clearTimeout(doubleTapTimeout.current);
          handleDoubleZoom(event);
        } else {
          lastTap.current = currentTime;
          doubleTapTimeout.current = setTimeout(() => {
            touchStartX.current = null;
            touchStartY.current = null;
          }, 300);
        }
      } else if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        pinchStartDistance.current = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        pinchStartAltitude.current = globeInstance.current.pointOfView().altitude;
      }
    };

    const handleDoubleZoom = (event) => {
      if (!globeInstance.current || isZooming.current) return;

      event.preventDefault();
      event.stopPropagation();

      const currentPOV = globeInstance.current.pointOfView();
      const minAltitude = 0.8;
      const defaultAltitude = 2.0;
      let newAltitude;

      if (currentPOV.altitude <= defaultAltitude) {
        newAltitude = minAltitude;
      } else {
        newAltitude = defaultAltitude;
      }

      isZooming.current = true;
      globeInstance.current.pointOfView({
        lat: currentPOV.lat,
        lng: currentPOV.lng,
        altitude: newAltitude
      }, 500);

      setTimeout(() => {
        isZooming.current = false;
      }, 500);
    };

    const handleTouchMove = (event) => {
      if (event.target.closest('.overlay') || event.target.closest('.popover') || event.target.closest('.filter-drawer') || event.target.closest('.blog-post-drawer') || event.target.closest('.comic-episode-overlay')) {
        return;
      }
      if (event.touches.length === 1 && popoverContent && touchStartX.current !== null && touchStartY.current !== null) {
        // Prevent dismissing popover when touch starts on the globe
        if (event.target.closest('#globeViz')) {
          touchStartX.current = null;
          touchStartY.current = null;
          return;
        }
        const touchEndX = event.touches[0].clientX;
        const touchEndY = event.touches[0].clientY;
        const deltaX = touchEndX - touchStartX.current;
        const deltaY = touchEndY - touchStartY.current;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > 50) {
          setPopoverContent(null);
          setSelectedId(null);
          touchStartX.current = null;
          touchStartY.current = null;
        }
      } else if (event.touches.length === 2) {
        event.preventDefault();
        if (!globeInstance.current || isZooming.current) return;

        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );

        if (pinchStartDistance.current && pinchStartAltitude.current) {
          const scale = currentDistance / pinchStartDistance.current;
          const currentPOV = globeInstance.current.pointOfView();
          let newAltitude = pinchStartAltitude.current / scale;

          const minAltitude = 0.8;
          const maxAltitude = 3.5;
          newAltitude = Math.max(minAltitude, Math.min(maxAltitude, newAltitude));

          globeInstance.current.pointOfView({
            lat: currentPOV.lat,
            lng: currentPOV.lng,
            altitude: newAltitude
          }, 0);
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = null;
      touchStartY.current = null;
      pinchStartDistance.current = null;
      pinchStartAltitude.current = null;
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    const globeContainer = document.getElementById('globeViz');
    // Temporarily disable double-click to prevent errors
    // if (globeContainer) {
    //   globeContainer.addEventListener('dblclick', handleDoubleZoom, { passive: false });
    // }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      // Temporarily disabled double-click
      // if (globeContainer) {
      //   globeContainer.removeEventListener('dblclick', handleDoubleZoom);
      // }
    };
  }, [popoverContent, setSelectedId, isDrawerOpen, isBlogDrawerOpen]);

  React.useEffect(() => {
    setZoomCallback(() => (post) => {
      if (!globeInstance.current || !post) {
        return;
      }

      try {
        if (isZooming.current) {
          return;
        }
        isZooming.current = true;
        globeInstance.current.controls().autoRotate = false;

        // Get current altitude, but use a closer zoom if we're too far out
        const currentPOV = globeInstance.current.pointOfView();
        const currentAltitude = currentPOV.altitude;
        // Use closer altitude (lower = closer) - target 1.2 for a nice close view
        const targetAltitude = currentAltitude > 1.2 ? 1.2 : currentAltitude;

        // Offset the view slightly to show location better (not perfectly centered)
        // Offset latitude down and longitude to the left for better perspective
        const offsetLat = post.location.lat - 15; // Tilt view down more
        const offsetLng = post.location.lng - 3; // Shift view to the left

        // Rotate to new location with closer zoom and offset
        globeInstance.current.pointOfView({
          lat: offsetLat,
          lng: offsetLng,
          altitude: targetAltitude
        }, 1000);

        // After the rotation completes
        waitForZoom(1000).then(() => {
          if (globeInstance.current.controls()) {
            globeInstance.current.controls().enableDamping = true;
            globeInstance.current.controls().dampingFactor = 0.2;
          }
          
          // Skip popover for comic episodes - they open directly
          if (!isComicEpisode(post.id, post.title)) {
            setPopoverContent({
              title: post.title || "No Title",
              snippet: post.snippet || "No Snippet",
              fullLink: post.fullLink || "#",
              lat: post.lat,
              lng: post.lng,
              id: post.id,
              image: post.image ? post.image.replace('attachment://', '') : null,
              imageAlt: post.imageAlt
            });
          }
          setSelectedId(post.id);
          isZooming.current = false;
        });
      } catch (error) {
        isZooming.current = false;
      }
    });
  }, [setZoomCallback, setSelectedId]);

  const onZoomHandler = () => {
    if (!globeInstance.current) return;

    const altitude = globeInstance.current.pointOfView().altitude;
    const minAltitude = 0.8;
    const minHexAltitude = 0.04;
    const maxHexAltitude = 0.15;
    const isMobile = window.innerWidth <= 640;

    const zoomLevels = isMobile ? [
      { threshold: 1, hexAltitude: 0.08, hexBinResolution: 3.5 },
      { threshold: 0.7, hexAltitude: 0.05, hexBinResolution: 3 },
    ] : [
      { threshold: 1, hexAltitude: 0.08, hexBinResolution: 3.8 },
      { threshold: 0.5, hexAltitude: 0.05, hexBinResolution: 4 },
    ];

    let hexAltitude = minAltitude;
    let hexBinResolution = isMobile ? 4 : 5;

    for (const level of zoomLevels) {
      if (altitude >= level.threshold) {
        hexAltitude = level.hexAltitude;
        hexBinResolution = level.hexBinResolution;
        break;
      }
    }

    globeInstance.current.hexBinResolution(hexBinResolution);
    globeInstance.current.hexAltitude(hexAltitude);
    globeInstance.current.controls().autoRotate = altitude > 2.0;
  };

  React.useEffect(() => {
    try {
      const textureLoader = new THREE.TextureLoader();
      const globeTexture = textureLoader.load('//unpkg.com/three-globe/example/img/earth-night.jpg');
      globeTexture.anisotropy = 4;
      globeTexture.minFilter = THREE.LinearMipmapLinearFilter;
      globeTexture.magFilter = THREE.LinearFilter;

      globeInstance.current = Globe()
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .globeMaterial(new THREE.MeshPhongMaterial({
          map: globeTexture,
          side: THREE.DoubleSide,
          shininess: 5,
        }))
        .pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 0)
        .hexBinPointsData([])
        .hexBinPointLat('lat')
        .hexBinPointLng('lng')
        .hexBinPointWeight('weight')
        .hexBinResolution(5)
        .hexTopColor(d => weightColor(d.sumWeight))
        .hexSideColor(d => weightColor(d.sumWeight))
        .hexLabel(d => `${Math.round(d.sumWeight)} days`)
        .ringsData([])
        .ringColor(() => ringColorInterpolator)
        .ringMaxRadius(4)
        .ringPropagationSpeed(1)
        .ringRepeatPeriod(2000)
        .onZoom(onZoomHandler)
        .onHexHover(hex => {
          if (hex && hex.points.length > 0 && !popoverContent && !isZooming.current) {
            // Select the most recent moment for hover
            const sortedPoints = hex.points.sort((a, b) => new Date(b.date) - new Date(a.date));
            const post = sortedPoints[0];
            if (post && post.id) {
              const timelineItem = document.querySelector(`.timeline-entry[data-id="${post.id}"]`);
              if (timelineItem) {
                document.querySelectorAll('.timeline-entry.selected').forEach(item =>
                  item.classList.remove('selected')
                );
                timelineItem.classList.add('selected');
                timelineItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        })
        (document.getElementById('globeViz'));

      // Expose globe instance to window
      window.globeInstance = globeInstance.current;

      onZoomHandler();

      try {
        globeInstance.current.controls().autoRotate = true;
        globeInstance.current.controls().autoRotateSpeed = 0.1;
        globeInstance.current.controls().enableZoom = true;
        globeInstance.current.controls().minDistance = 180;
        globeInstance.current.controls().maxDistance = 700;
      } catch (error) {
      }

      globeInstance.current.onHexClick(hex => {
        try {
          if (!hex || hex.points.length === 0) {
            return;
          }

          if (isZooming.current) {
            return;
          }
          isZooming.current = true;
          globeInstance.current.controls().autoRotate = false;

          // Sort points by date (descending) and select the most recent
          // If multiple points have the same date, prefer comic moments
          const sortedPoints = hex.points.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() === dateB.getTime()) {
              // Same date - prefer comic moments
              const aIsComic = window.momentsInTime.find(m => m.id === a.id)?.isComic || false;
              const bIsComic = window.momentsInTime.find(m => m.id === b.id)?.isComic || false;
              return bIsComic - aIsComic; // Comic moments first
            }
            return dateB - dateA; // Most recent first
          });
          const post = sortedPoints[0];
          if (post && post.id) {
            setSelectedId(post.id);
            handleTimelineClick(post);
          }

          const finalLat = post.lat;
          const finalLng = post.lng;

          // Direct zoom with adjusted camera angle
          globeInstance.current.pointOfView({
            lat: finalLat - 15,  // Reduced tilt angle for lower position
            lng: finalLng,
            altitude: 1.5
          }, 1500);

          waitForZoom(1500).then(() => {
            // Skip popover for comic episodes - they open directly
            if (!isComicEpisode(post.id, post.title)) {
              setPopoverContent({
                title: post.title || "No Title",
                snippet: post.snippet || "No Snippet",
                fullLink: post.fullLink || "#",
                lat: post.lat,
                lng: post.lng,
                id: post.id,
                image: post.image ? post.image.replace('attachment://', '') : null,
                imageAlt: post.imageAlt
              });
            }
            isZooming.current = false;
          });
        } catch (error) {
          isZooming.current = false;
        }
      });

      const globeContainer = document.getElementById('globeViz');
      const preventScroll = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      globeContainer.addEventListener('wheel', preventScroll, { passive: false });

      return () => {
        globeContainer.removeEventListener('wheel', preventScroll);
        // Temporarily disabled double-click
        // if (globeContainer) {
        //   globeContainer.removeEventListener('dblclick', handleDoubleZoom);
        // }
        if (globeInstance.current && typeof globeInstance.current.destroy === 'function') {
          globeInstance.current.destroy();
        }
      };
    } catch (error) {
    }
  }, []);

  // Resize globe canvas and re-run zoom logic when viewport/orientation changes.
  // Update camera aspect ratio so the globe doesn't stretch; then setSize and render.
  React.useEffect(() => {
    const resizeGlobe = () => {
      const el = document.getElementById('globeViz');
      if (!globeInstance.current || !el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      try {
        const g = globeInstance.current;
        const camera = typeof g.camera === 'function' ? g.camera() : g.camera;
        if (camera && typeof camera.updateProjectionMatrix === 'function') {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        const renderer = g.renderer && g.renderer();
        if (renderer && typeof renderer.setSize === 'function') {
          renderer.setSize(w, h);
        }
        if (typeof g.render === 'function') {
          g.render();
        }
      } catch (err) {}
      onZoomHandler();
    };
    const onOrientationChange = () => {
      resizeGlobe();
      setTimeout(resizeGlobe, 100);
      setTimeout(resizeGlobe, 400);
    };
    window.addEventListener('resize', resizeGlobe);
    window.addEventListener('orientationchange', onOrientationChange);
    return () => {
      window.removeEventListener('resize', resizeGlobe);
      window.removeEventListener('orientationchange', onOrientationChange);
    };
  }, []);

  // Apply highlight to selected hex and update rings
  React.useEffect(() => {
    if (globeInstance.current) {
      const hexBins = globeInstance.current.hexBinPointsData();
      hexBins.forEach(hex => {
        hex.highlight = hex.points?.some(point => point.id === selectedId);
      });
      globeInstance.current.hexBinPointsData(hexBins); // Re-render with updated highlight

      // Update rings for the selected moment
      if (selectedId) {
        const selectedPost = window.momentsInTime.find(post => post.id === selectedId);
        if (selectedPost) {
          const ringData = [{
            lat: selectedPost.location.lat,
            lng: selectedPost.location.lng,
            maxR: 5,
            propagationSpeed: 3,
            repeatPeriod: 1000
          }];
          globeInstance.current.ringsData(ringData);
        } else {
          globeInstance.current.ringsData([]);
        }
      } else {
        globeInstance.current.ringsData([]);
      }
    }
  }, [selectedId]);

  React.useEffect(() => {
    if (globeInstance.current) {
      const filteredPosts = window.momentsInTime.filter(post => {
        const tagMatch = selectedTag === "All" || post.tags.includes(selectedTag);
        const yearMatch = !selectedYear || selectedYear === "All" || new Date(post.date).getUTCFullYear().toString() === selectedYear;
        return tagMatch && yearMatch;
      });

      const hexBinData = filteredPosts.map(post => ({
        lat: post.location.lat,
        lng: post.location.lng,
        weight: post.stayDuration,
        label: post.location.name,
        fullLink: post.fullLink,
        snippet: post.snippet,
        title: post.title,
        stayDuration: post.stayDuration,
        id: post.id,
        date: post.date,
        image: post.image,
        imageAlt: post.imageAlt
      }));

      globeInstance.current.hexBinPointsData(hexBinData);
      onZoomHandler();
    }
  }, [selectedTag, selectedYear]);

  React.useEffect(() => {
    setSelectedId(null);
    setPopoverContent(null);
    if (globeInstance.current) {
      globeInstance.current.ringsData([]); // Clear rings when filters change
    }
  }, [selectedTag, selectedYear, setSelectedId]);

  const useTravelLogComicLayout = (post) => {
    if (!post || !post.location || typeof post.location.lat !== 'number' || typeof post.location.lng !== 'number') {
      return false;
    }
    if (post.isComic || post.isInteractive) return false;
    if (post.travelLogComicLayout === false) return false;
    if (post.travelLogComicLayout === true) return true;
    const title = post.title || '';
    if (title.includes('Urban Runner')) return false;
    return true;
  };

  const handleOpenBlogPost = async (postId, options = {}) => {
    const post = window.momentsInTime.find(p => p.id === postId);

    if (post) {
      // Update moment selection (URL and globe zoom) if not already selected
      let intendedPath = post.fullLink && post.fullLink !== "#" ? post.fullLink : `/moments/${postId}`;
      // For character comic, append #slide-N when opening to a specific character's slide
      if (postId === 'characters-comic-book-2025-09-15' && options.initialSlide) {
        intendedPath = intendedPath.replace(/#.*$/, '') + '#slide-' + options.initialSlide;
      }
      if (selectedId !== postId) {
        setSelectedId(postId);
        const currentBase = (window.location.pathname || '').replace(/\/$/, '');
        const intendedBase = (intendedPath || '').replace(/#.*$/, '').replace(/\/$/, '');
        // Push when navigating to a different base path, or when setting/updating slide hash for character comic
        if (currentBase !== intendedBase || options.initialSlide) {
          window.history.pushState({ momentId: postId }, '', intendedPath);
        }
        // Globe zoom will be handled automatically by React state change
      } else if (options.initialSlide) {
        // Already on this moment; still push URL with slide hash so ComicReader opens to correct slide
        window.history.pushState({ momentId: postId }, '', intendedPath);
      }
      
      setIsLoading(true);
      setError(null);

      try {
        // Comic episodes don't need to fetch HTML - they use React components directly
        if (isComicEpisode(postId, post.title)) {
          console.log('Comic episode detected, skipping HTML fetch');
          
          // For character comic book, ensure currentCharacterComicBook is set for ComicReader
          if (postId === 'characters-comic-book-2025-09-15' && window.characterComicBook) {
            window.currentCharacterComicBook = window.characterComicBook;
          }
          
          // Set up comic episode content directly
          const blogPostContent = {
            title: post.title || "No Title",
            content: '', // No HTML content needed for comics
            snippet: post.snippet || "No Snippet",
            fullLink: post.fullLink || "#",
            lat: post.lat,
            lng: post.lng,
            location: post.location,
            mapText: post.mapText,
            isInteractive: false,
            isComic: true,
            postId: postId
          };
          
          setBlogPostContent(blogPostContent);
          setIsLoading(false);
          
          // Only open drawer if it's not already open
          if (!isBlogDrawerOpen) {
            setIsBlogDrawerOpen(true);
          }
          return;
        }
        
        let htmlFile;
        if (isInteractiveEpisode(postId, post.title)) {
          // For interactive episodes, load the interactive-episode.html component
          htmlFile = '/components/interactive-episode.html';
        } else {
          htmlFile = post.contentFile || (post.fullLink && post.fullLink !== "#" ? post.fullLink : `${post.id}.html`);
        }
        
        // Add cache-busting parameter for interactive episodes only
        if (isInteractiveEpisode(postId, post.title)) {
          const separator = htmlFile.includes('?') ? '&' : '?';
          htmlFile += `${separator}t=${Date.now()}`;
        }
        
        const response = await fetch(htmlFile);

        if (!response.ok) {
          throw new Error('Failed to load post content');
        }

        const htmlContent = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Special handling for interactive episodes (cards with JavaScript)
        let bodyContent;
        if (isInteractiveEpisode(postId, post.title)) {
          // Use contentFile for data path, fallback to data.json
          let dataPath = post.contentFile || 'data.json';
          
          // Inject the data path into the HTML content
          let htmlWithDataPath = htmlContent.replace(
            /function getEpisodeDataPath\(\)\s*\{[\s\S]*?\}/,
            `function getEpisodeDataPath() { return '${dataPath}'; }`
          );
          
          // Re-parse the modified HTML
          const modifiedDoc = parser.parseFromString(htmlWithDataPath, 'text/html');
          
          // For interactive episodes, we need to execute the JavaScript after content is loaded
          bodyContent = modifiedDoc.body.innerHTML;
          
          // Store the styles to inject later
          const styles = modifiedDoc.querySelectorAll('style');
          const styleContents = Array.from(styles).map(style => style.textContent).filter(content => content);
          
          // Store the scripts to execute later
          const scripts = modifiedDoc.querySelectorAll('script');
          const scriptContents = Array.from(scripts).map(script => script.textContent).filter(content => content);
          
          // Execute scripts and inject styles after the content is inserted into the DOM
          setTimeout(() => {
            // Inject styles first
            styleContents.forEach(styleContent => {
              try {
                const newStyle = document.createElement('style');
                newStyle.textContent = styleContent;
                document.head.appendChild(newStyle);
              } catch (error) {
                console.error('Error injecting interactive episode styles:', error);
              }
            });
            
            // Then execute scripts
            scriptContents.forEach(scriptContent => {
              try {
                const newScript = document.createElement('script');
                newScript.textContent = scriptContent;
                document.head.appendChild(newScript);
                document.head.removeChild(newScript);
              } catch (error) {
                console.error('Error executing interactive episode script:', error);
              }
            });
          }, 100);
        } else {
          bodyContent = doc.body.innerHTML;
        }

        setBlogPostContent({
          postId: postId,
          title: post.title,
          content: bodyContent,
          image: post.image ? post.image.replace('attachment://', '') : null,
          imageAlt: post.imageAlt,
          caption: post.caption,
          mapLink: post.mapLink,
          mapText: post.mapText,
          location: post.location,
          travelLogComicLayout: useTravelLogComicLayout(post),
          isInteractive: isInteractiveEpisode(postId, post.title),
          isComic: isComicEpisode(postId, post.title)
        });
        // Only open drawer if it's not already open
        if (!isBlogDrawerOpen) {
          setIsBlogDrawerOpen(true);
        }
        setPopoverContent(null);
        
        // Remove transitioning class and loading overlay after content is loaded
        setTimeout(() => {
          const contentElement = document.querySelector('.blog-post-drawer-content') || 
                                document.querySelector('.interactive-episode-body');
          if (contentElement) {
            contentElement.classList.remove('transitioning');
          }
          
          // Remove loading overlay
          const loadingOverlay = document.querySelector('.episode-loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.remove();
          }
          
          // Ensure drawer is scrolled to top
          const drawer = document.querySelector('.blog-post-drawer');
          if (drawer) {
            drawer.scrollTop = 0;
          }
        }, 600); // Longer delay to show loading indicator
        
        // Add Urban Runner navigation if this is an Urban Runner episode
        if (post.title && post.title.includes('Urban Runner')) {
          setTimeout(() => {
            window.addUrbanRunnerNavigation(post.id);
          }, 100);
        }
      } catch (err) {
        setError('Failed to load the full post. Please try again.');

        setBlogPostContent({
          postId: postId,
          title: post.title,
          content: `<p>${err.message}</p>`,
          image: post.image ? post.image.replace('attachment://', '') : null,
          imageAlt: post.imageAlt,
          caption: post.caption,
          mapLink: post.mapLink,
          mapText: post.mapText,
          location: post.location,
          travelLogComicLayout: useTravelLogComicLayout(post)
        });
        // Only open drawer if it's not already open
        if (!isBlogDrawerOpen) {
          setIsBlogDrawerOpen(true);
        }
        setPopoverContent(null);
        
        // Remove transitioning class and loading overlay after error content is loaded
        setTimeout(() => {
          const contentElement = document.querySelector('.blog-post-drawer-content') || 
                                document.querySelector('.interactive-episode-body');
          if (contentElement) {
            contentElement.classList.remove('transitioning');
          }
          
          // Remove loading overlay
          const loadingOverlay = document.querySelector('.episode-loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.remove();
          }
          
          // Ensure drawer is scrolled to top
          const drawer = document.querySelector('.blog-post-drawer');
          if (drawer) {
            drawer.scrollTop = 0;
          }
        }, 600); // Longer delay to show loading indicator
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Expose handleOpenBlogPost globally after it's defined
  window.handleOpenBlogPost = handleOpenBlogPost;

  const Popover = ({ title, snippet, fullLink, onClose, id, image, imageAlt }) => {
    return React.createElement(
      'div',
      {
        className: 'popover popover-static',
        ref: popoverRef
      },
      React.createElement(
        'div',
        { className: 'popover-content' },
        image ? (
          // Enhanced layout for moments with an image
          React.createElement(
            'div',
            { className: 'popover-enhanced' },
            React.createElement(
              'button',
              {
                className: 'close-button',
                onClick: onClose
              },
              '×'
            ),
            React.createElement(
              'div',
              { className: 'popover-image-container' },
              React.createElement('img', {
                src: image,
                alt: imageAlt || 'Moment image',
                className: 'popover-image-enhanced'
              })
            ),
            React.createElement(
              'h2',
              { className: 'popover-title-enhanced' },
              title
            ),
            React.createElement(
              'div',
              { className: 'popover-body-enhanced' },
              React.createElement('p', null, snippet)
            ),
            fullLink && fullLink !== '#' && React.createElement(
              'div',
              { className: 'popover-footer-enhanced' },
              React.createElement(
                'button',
                {
                  className: 'popover-link',
                  onClick: () => handleOpenBlogPost(id)
                },
                'View Full Post'
              )
            )
          )
        ) : (
          // Default layout for moments without an image
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              { className: 'popover-header' },
              React.createElement('h2', { className: 'popover-title' }, title),
              React.createElement(
                'button',
                {
                  className: 'close-button',
                  onClick: onClose
                },
                '×'
              )
            ),
            React.createElement(
              'div',
              { className: 'popover-body' },
              React.createElement('p', null, snippet)
            ),
            fullLink && fullLink !== '#' && React.createElement(
              'div',
              { className: 'popover-footer' },
              React.createElement(
                'button',
                {
                  className: 'popover-link',
                  onClick: () => handleOpenBlogPost(id)
                },
                'View Full Post'
              )
            )
          )
        )
      )
    );
  };

  const activeFilters = [
    selectedYear && selectedYear !== 'All'
      ? { type: 'year', label: selectedYear, display: `Year: ${selectedYear}` }
      : null,
    selectedTag && selectedTag !== 'All'
      ? { type: 'tag', label: selectedTag, display: `Tag: ${selectedTag}` }
      : null
  ].filter(Boolean);

  return React.createElement(
    'div',
    { className: 'container mx-auto main-content' },
    React.createElement(
      'div',
      { className: 'filter-drawer-container', ref: drawerRef },
      React.createElement(
        'div',
        { className: 'filter-toggle-wrapper' },
        React.createElement(
          'button',
          {
            className: `filter-toggle-button ${isDrawerOpen ? 'open' : ''}`,
            onClick: () => setIsDrawerOpen(!isDrawerOpen)
          },
          'Filters',
          React.createElement('span', { className: 'chevron' }, isDrawerOpen ? '▲' : '▼')
        ),
        activeFilters.length > 0 && React.createElement(
          'div',
          { className: 'active-filters' },
          activeFilters.map(filter =>
            React.createElement(
              'button',
              {
                key: `${filter.type}-${filter.label}`,
                className: 'filter-pill',
                onClick: () => {
                  if (filter.type === 'year') {
                    setSelectedYear('All');
                  } else if (filter.type === 'tag') {
                    setSelectedTag('All');
                  }
                }
              },
              React.createElement('span', { className: 'filter-pill-label' }, filter.display),
              React.createElement('span', { className: 'filter-pill-close' }, '×')
            )
          )
        )
      ),
      isDrawerOpen && React.createElement(
        'div',
        { className: 'filter-drawer open' },
        React.createElement(
          'button',
          {
            className: 'close-button',
            onClick: () => setIsDrawerOpen(false)
          },
          '×'
        ),
        characters.length > 0 && React.createElement(
          'div',
          { className: 'characters-container' },
          React.createElement(
            'div',
            { className: 'characters-header' },
            React.createElement(
              'h3',
              { className: 'characters-title' },
              'Characters'
            )
          ),
          React.createElement(
            'div',
            { className: 'characters-avatars' },
            characters
              .filter(character => character.avatar) // Only show characters with avatar paths
              .map(character =>
                React.createElement(
                  'div',
                  {
                    key: `character-${character.id}`,
                    className: 'character-item'
                  },
                  React.createElement(
                    'button',
                    {
                      className: 'character-avatar',
                      title: character.name,
                        onClick: () => {
                        // Open character comic book and navigate to this character's slide
                        handleOpenCharacterComic(character.id);
                      }
                    },
                    React.createElement(
                      'div',
                      { 
                        className: 'character-avatar-wrapper'
                      },
                      React.createElement(
                        'img',
                        {
                          src: character.avatar,
                          alt: character.name,
                          className: 'character-avatar-image',
                          onError: (e) => {
                            // If image fails to load, hide the entire character item
                            const item = e.target.closest('.character-item');
                            if (item) {
                              item.style.display = 'none';
                            }
                          }
                        }
                      )
                    )
                  ),
                  React.createElement(
                    'div',
                    { className: 'character-name' },
                    character.name
                  ),
                  character.nickname
                    ? React.createElement(
                        'div',
                        { className: 'character-nickname' },
                        character.nickname
                      )
                    : null
                )
              ),
            React.createElement(
              'button',
              {
                className: 'character-comic-button',
                onClick: handleOpenCharacterComic,
                title: 'Open Character Bible Comic Book'
              },
              '📚'
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'year-filter-container' },
          yearTags.map(year =>
            React.createElement(
              'button',
              {
                key: `year-${year}`,
                onClick: () => setSelectedYear(year),
                className: `filter-tag year-tag ${selectedYear === year ? 'active' : ''}`
              },
              year
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'tag-filter-container' },
          regularTags.map(tag =>
            React.createElement(
              'button',
              {
                key: `tag-${tag}`,
                onClick: () => setSelectedTag(tag),
                className: `filter-tag ${selectedTag === tag ? 'active' : ''}`
              },
              tag
            )
          )
        )
      )
    ),
    popoverContent && React.createElement(Popover, {
      title: popoverContent.title,
      snippet: popoverContent.snippet,
      fullLink: popoverContent.fullLink,
      onClose: () => setPopoverContent(null),
      id: popoverContent.id,
      image: popoverContent.image,
      imageAlt: popoverContent.imageAlt
    }),
    isBlogDrawerOpen && blogPostContent && (
      isComicEpisode(blogPostContent.postId || '', blogPostContent.title)
        ? React.createElement(
            window.ComicReader, 
            {
              content: blogPostContent,
              onClose: () => setIsBlogDrawerOpen(false)
            }
          )
        : isInteractiveEpisode(blogPostContent.postId || '', blogPostContent.title) 
          ? React.createElement(window.InteractiveEpisodeDrawer, {
              content: blogPostContent,
              onClose: () => setIsBlogDrawerOpen(false)
            })
          : React.createElement(window.BlogPostDrawer, {
              content: blogPostContent,
              onClose: () => setIsBlogDrawerOpen(false)
            })
    )
  );
};