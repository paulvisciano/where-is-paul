window.MomentRevealOverlay = ({ title, snippet, fullLink, onClose, id, image, imageAlt, isComic, carouselDir, overlayRef, onOpenPost, gallery }) => {
  const [photoIdx, setPhotoIdx] = React.useState(0);
  React.useEffect(function () { setPhotoIdx(0); }, [id]);

  const photos = (!isComic && gallery && gallery.length)
    ? gallery
    : (image ? [{ src: image, alt: imageAlt || title, credit: '' }] : []);
  const current = photos.length ? (photos[Math.min(photoIdx, photos.length - 1)] || photos[0]) : null;
  const showStrip = !isComic && photos.length > 1;

  const media = current && React.createElement(
    'div',
    { className: 'popover-image-container' + (showStrip ? ' popover-image-container--gallery' : '') },
    React.createElement('img', {
      src: window.imageUrl(current.src),
      decoding: 'async',
      alt: current.alt || imageAlt || title,
      className: 'popover-image-enhanced',
      onError: function (e) {
        if (photos.length > 1) {
          const next = (photoIdx + 1) % photos.length;
          if (next !== photoIdx) setPhotoIdx(next);
        }
      }
    }),
    showStrip && React.createElement(
      'div',
      { className: 'popover-filmstrip' },
      photos.slice(0, 5).map(function (photo, i) {
        return React.createElement(
          'button',
          {
            key: photo.src + i,
            type: 'button',
            className: 'popover-filmstrip-btn' + (i === photoIdx ? ' is-active' : ''),
            onClick: function (e) {
              e.stopPropagation();
              setPhotoIdx(i);
            },
            'aria-label': photo.alt || ('Photo ' + (i + 1))
          },
          React.createElement('img', {
            src: window.imageUrl(photo.src),
            loading: 'lazy',
            decoding: 'async',
            alt: '',
            onError: function (err) {
              var btn = err.target.closest('.popover-filmstrip-btn');
              if (btn) btn.style.display = 'none';
            }
          })
        );
      })
    ),
    showStrip && current.credit && React.createElement(
      'p',
      { className: 'popover-filmstrip-credit' },
      current.credit
    )
  );

  return React.createElement(
    'div',
    { className: 'popover-backdrop', onClick: onClose },
    React.createElement(
      'div',
      {
        className: 'popover popover-reveal',
        ref: overlayRef,
        onClick: function(e) { e.stopPropagation(); }
      },
      React.createElement(
        'button',
        { className: 'close-button', onClick: onClose, type: 'button' },
        '×'
      ),
      React.createElement(
        'button',
        {
          className: 'popover-nav popover-nav--prev',
          type: 'button',
          onClick: function(e) { e.stopPropagation(); window.stepOpenCard(-1); }
        },
        '‹'
      ),
      React.createElement(
        'button',
        {
          className: 'popover-nav popover-nav--next',
          type: 'button',
          onClick: function(e) { e.stopPropagation(); window.stepOpenCard(1); }
        },
        '›'
      ),
      React.createElement(
        'div',
        { className: 'popover-viewport' },
        React.createElement(
          'div',
          {
            key: id,
            className: 'popover-content' + (carouselDir > 0 ? ' is-in-right' : carouselDir < 0 ? ' is-in-left' : '')
          },
          media,
          React.createElement('h2', { className: 'popover-title-enhanced' }, title),
          snippet && React.createElement(
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
                type: 'button',
                onClick: function() { onOpenPost(id); }
              },
              isComic ? 'Read Comic' : 'View Full Post'
            )
          )
        )
      )
    )
  );
};

window.formatClusterDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

window.resolveGlobeImage = (m) => {
  if (!m) return null;
  let src = m.isComic
    ? ((m.cover || ((m.fullLink && m.fullLink !== '#') ? m.fullLink.replace(/\/$/, '') + '/cover.webp' : '')).replace(/cover\.webp$/, 'cover-thumb.webp'))
    : m.image;
  if (!src) return null;
  if (src.indexOf('attachment://') === 0) src = src.replace('attachment://', '');
  if (src.indexOf('https://') === 0 || src.indexOf('http://') === 0) return src;
  return window.withBase ? window.withBase(src) : src;
};

window.buildGlobePhotoPins = (posts) => {
  const groups = new Map();
  (posts || []).forEach(function(post) {
    if (!post || !post.location) return;
    const key = (post.location.name || (Number(post.location.lat).toFixed(1) + ',' + Number(post.location.lng).toFixed(1))).toLowerCase();
    const bucket = groups.get(key);
    if (bucket) bucket.push(post);
    else groups.set(key, [post]);
  });
  const pins = [];
  groups.forEach(function(group) {
    const sorted = group.slice().sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    let chosen = null;
    let image = null;
    for (let i = 0; i < sorted.length; i++) {
      image = window.resolveGlobeImage(sorted[i]);
      if (image) { chosen = sorted[i]; break; }
    }
    if (!chosen) return;
    pins.push({
      lat: chosen.location.lat,
      lng: chosen.location.lng,
      id: chosen.id,
      image: image,
      title: chosen.title || chosen.timelineHighlight || '',
      locationName: chosen.location.name || '',
      count: sorted.length,
      ids: sorted.map(function(p) { return p.id; }),
      moments: sorted.map(function(p) {
        return {
          id: p.id,
          image: window.resolveGlobeImage(p),
          title: p.title || p.timelineHighlight || '',
          date: p.date
        };
      }).filter(function(m) { return !!m.image; })
    });
  });
  return pins;
};

window.createGlobePhotoPin = (d) => {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'globe-photo-pin';
  el.dataset.id = d.id || '';
  el.dataset.ids = (d.ids || []).join(',');
  el.setAttribute('aria-label', d.title || 'Moment');
  // Wrapper holds translate(-50%,-50%) + counter-scale; badge sits as a
  // sibling of the clipped inner so it lands on the rim, not cut off.
  const face = document.createElement('span');
  face.className = 'globe-photo-pin-face';
  const inner = document.createElement('span');
  inner.className = 'globe-photo-pin-inner';
  const img = document.createElement('img');
  img.decoding = 'async';
  img.src = window.imageUrl(d.image);
  img.alt = '';
  img.draggable = false;
  inner.appendChild(img);
  face.appendChild(inner);
  if (d.count > 1) {
    const badge = document.createElement('span');
    badge.className = 'globe-photo-pin-count';
    badge.textContent = String(d.count);
    face.appendChild(badge);
  }
  el.appendChild(face);
  el.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
  el.addEventListener('mouseenter', function(e) {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
    if (window.showGlobePinGallery) window.showGlobePinGallery(d, e.clientX, e.clientY);
  });
  el.addEventListener('mousemove', function(e) {
    if (window.moveGlobePinGallery) window.moveGlobePinGallery(e.clientX, e.clientY);
  });
  el.addEventListener('mouseleave', function() {
    if (window.hideGlobePinGallery) window.hideGlobePinGallery();
  });
  el.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (window.handleGlobePhotoClick) window.handleGlobePhotoClick(d);
  });
  return el;
};

window.GlobePinGallery = ({ moments, x, y, locationName, onSelect, onEnter, onLeave }) => {
  if (!moments || !moments.length) return null;
  const left = Math.max(12, Math.min(x + 16, window.innerWidth - 28));
  const top = Math.max(12, Math.min(y, window.innerHeight - 28));
  return React.createElement(
    'div',
    {
      className: 'globe-pin-gallery',
      style: { left: left + 'px', top: top + 'px' },
      onMouseEnter: onEnter,
      onMouseLeave: onLeave
    },
    locationName ? React.createElement('div', { className: 'globe-pin-gallery-label' }, locationName) : null,
    React.createElement(
      'div',
      { className: 'globe-pin-gallery-row' },
      moments.map(function(m) {
        return React.createElement(
          'button',
          {
            key: m.id,
            type: 'button',
            className: 'globe-pin-gallery-item',
            title: m.title,
            onClick: function(e) {
              e.preventDefault();
              e.stopPropagation();
              onSelect(m);
            }
          },
          React.createElement('img', { src: window.imageUrl(m.image), decoding: 'async', alt: m.title || '', draggable: false })
        );
      })
    )
  );
};

window.applyGlobePixelRatio = (globe, el) => {
  if (!globe || !el) return;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w <= 0 || h <= 0) return;
  const renderer = typeof globe.renderer === 'function' ? globe.renderer() : globe.renderer;
  if (typeof globe.width === 'function' && typeof globe.height === 'function') {
    globe.width(w);
    globe.height(h);
  } else if (renderer && typeof renderer.setSize === 'function') {
    renderer.setSize(w, h);
  }
  if (renderer && typeof renderer.setPixelRatio === 'function') {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }
  const camera = typeof globe.camera === 'function' ? globe.camera() : globe.camera;
  if (camera && typeof camera.updateProjectionMatrix === 'function') {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
};

window.HexClusterSheet = ({ moments, onClose, onSelect, sheetRef }) => {
  return React.createElement(
    'div',
    { className: 'hex-cluster-backdrop', onClick: onClose },
    React.createElement(
      'div',
      {
        className: 'hex-cluster-sheet',
        ref: sheetRef,
        role: 'dialog',
        'aria-label': 'Moments in this location',
        onClick: function(e) { e.stopPropagation(); }
      },
      React.createElement('div', { className: 'hex-cluster-handle', 'aria-hidden': 'true' }),
      React.createElement(
        'div',
        { className: 'hex-cluster-head' },
        React.createElement(
          'h2',
          { className: 'hex-cluster-title' },
          moments.length + ' moment' + (moments.length === 1 ? '' : 's')
        ),
        React.createElement(
          'button',
          { className: 'close-button', onClick: onClose, type: 'button', 'aria-label': 'Close' },
          '×'
        )
      ),
      React.createElement(
        'div',
        { className: 'hex-cluster-list' },
        moments.map(function(m) {
          return React.createElement(
            'button',
            {
              key: m.id,
              type: 'button',
              className: 'hex-cluster-row',
              onClick: function() { onSelect(m); }
            },
            m.image
              ? React.createElement('img', { src: window.imageUrl(m.image), decoding: 'async', alt: '', className: 'hex-cluster-thumb' })
              : React.createElement('div', { className: 'hex-cluster-thumb hex-cluster-thumb--empty' }),
            React.createElement(
              'div',
              { className: 'hex-cluster-row-body' },
              React.createElement('div', { className: 'hex-cluster-row-title' }, m.title),
              React.createElement(
                'div',
                { className: 'hex-cluster-row-meta' },
                [m.locationName, window.formatClusterDate(m.date)].filter(Boolean).join(' · ')
              )
            )
          );
        })
      )
    )
  );
};

window.GlobeComponent = ({ handleTimelineClick, selectedId, setSelectedId, selectedTag, setSelectedTag, selectedYear, setSelectedYear, setZoomCallback }) => {
  if (typeof window.momentsInTime === 'undefined') {
    return React.createElement('div', null, 'Error: Data not loaded');
  }

  const TAG_ORDER = ["origins", "family", "tribe", "volleyball", "love", "body", "work", "building", "sovereignty", "comic", "nightlife", "travel"];
  const regularTags = ["All", ...[...new Set(window.momentsInTime.flatMap(post => post.tags))].sort((a, b) => {
    const ia = TAG_ORDER.indexOf(a);
    const ib = TAG_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return String(a).localeCompare(String(b));
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  })];
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
        if (idx >= 0) {
          initialSlide = (window.characterComicBook.pageSlugs && window.characterComicBook.pageSlugs[idx])
            || (idx + 1);
        }
      }
      window.handleOpenBlogPost('characters-comic-book-2025-09-15', { initialSlide });
      setIsDrawerOpen(false);
    }
  };
  const [popoverContent, setPopoverContent] = React.useState(null);
  window.setPopoverContent = setPopoverContent;
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchCursor, setSearchCursor] = React.useState(0);
  const searchInputRef = React.useRef(null);
  
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
  const footerTapStartX = React.useRef(null);
  const footerTapStartY = React.useRef(null);
  const footerTapStartT = React.useRef(null);
  const selectedIdRef = React.useRef(selectedId);
  selectedIdRef.current = selectedId;
  const highlightedPointIdsRef = React.useRef(new Set());
  const hexLodRef = React.useRef({ resolution: null, altitude: null });
  const hexClusterRef = React.useRef(null);
  const hexClusterSheetRef = React.useRef(null);
  const [hexCluster, setHexCluster] = React.useState(null);
  hexClusterRef.current = hexCluster;
  const [pinGallery, setPinGallery] = React.useState(null);
  const pinGalleryHideRef = React.useRef(null);

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
      if (isDrawerOpen && drawerRef.current && !drawerRef.current.querySelector('.filter-drawer-inner')?.contains(event.target) && !event.target.closest('.filter-toggle') && !event.target.closest('.filter-active-chips')) {
        setIsDrawerOpen(false);
      }
      if (isBlogDrawerOpen && blogDrawerRef.current && !blogDrawerRef.current.contains(event.target) && !event.target.closest('.blog-post-drawer') && !event.target.closest('.comic-episode-overlay')) {
        setIsBlogDrawerOpen(false);
      }
    };

    const handleTouchStart = (event) => {
      if (event.target.closest('.overlay') || event.target.closest('.popover') || event.target.closest('.filter-drawer') || event.target.closest('.blog-post-drawer') || event.target.closest('.comic-episode-overlay') || event.target.closest('.hex-cluster-backdrop') || event.target.closest('.hex-cluster-sheet') || event.target.closest('.wip-footer')) {
        return;
      }
      const expandedFooter = document.querySelector('.wip-footer.is-expanded');
      if (expandedFooter && event.touches.length === 1 && !hexClusterRef.current) {
        footerTapStartX.current = event.touches[0].clientX;
        footerTapStartY.current = event.touches[0].clientY;
        footerTapStartT.current = Date.now();
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
      if (event.target.closest('.overlay') || event.target.closest('.popover') || event.target.closest('.filter-drawer') || event.target.closest('.blog-post-drawer') || event.target.closest('.comic-episode-overlay') || event.target.closest('.hex-cluster-backdrop') || event.target.closest('.hex-cluster-sheet') || event.target.closest('.wip-footer')) {
        return;
      }
      if (document.documentElement.classList.contains('touch-ui') && touchStartX.current !== null && touchStartY.current !== null) {
        const t = event.touches[0];
        const dx = t.clientX - touchStartX.current;
        const dy = t.clientY - touchStartY.current;
        const dist = Math.hypot(dx, dy);
        if (dy < -40 && Math.abs(dy) > Math.abs(dx) && touchStartY.current > window.innerHeight - 340) {
          window.dispatchEvent(new Event('wip-footer-expand'));
        } else if (dist > 16 || event.touches.length === 2) {
          window.dispatchEvent(new Event('wip-footer-collapse'));
        }
      }
      if (event.touches.length === 1 && popoverContent && touchStartX.current !== null && touchStartY.current !== null) {
        // Prevent dismissing popover when touch starts on the globe
        if (event.target.closest('#globeViz')) {
          touchStartX.current = null;
          touchStartY.current = null;
          return;
        }
        if (touchStartX.current < 24) return;
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

          const minAltitude = 0.4;
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

    const handleTouchEnd = (event) => {
      if (footerTapStartX.current !== null && footerTapStartY.current !== null && footerTapStartT.current !== null) {
        const dt = Date.now() - footerTapStartT.current;
        const touch = event.changedTouches && event.changedTouches[0];
        let dx = 0, dy = 0;
        if (touch) {
          dx = touch.clientX - footerTapStartX.current;
          dy = touch.clientY - footerTapStartY.current;
        }
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dt < 300 && dist < 10) {
          const target = touch ? document.elementFromPoint(touch.clientX, touch.clientY) : null;
          const isChrome = target && (target.closest('.hex-cluster-backdrop') || target.closest('.hex-cluster-sheet') || target.closest('.filter-drawer') || target.closest('.overlay') || target.closest('.popover'));
          if (!isChrome) {
            window.dispatchEvent(new Event('wip-footer-collapse'));
          }
        }
        footerTapStartX.current = null;
        footerTapStartY.current = null;
        footerTapStartT.current = null;
      }
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
    if (!popoverContent && !hexCluster) return;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (hexCluster) {
        hexClusterRef.current = null;
        setHexCluster(null);
        if (!selectedIdRef.current) {
          highlightedPointIdsRef.current = new Set();
          if (globeInstance.current) {
            const data = globeInstance.current.hexBinPointsData();
            if (Array.isArray(data)) globeInstance.current.hexBinPointsData(data.slice());
          }
        }
        return;
      }
      setPopoverContent(null);
      setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [popoverContent, hexCluster, setSelectedId]);

  React.useEffect(() => {
    setZoomCallback(() => (post) => {
      if (!globeInstance.current || !post) {
        return;
      }

      try {
        if (window.showMomentCard) {
          window.showMomentCard(post);
        }
        if (isZooming.current) {
          return;
        }
        isZooming.current = true;
        globeInstance.current.controls().autoRotate = false;

        const currentPOV = globeInstance.current.pointOfView();
        const currentAltitude = currentPOV.altitude;
        const targetAltitude = currentAltitude > 1.2 ? 1.2 : currentAltitude;
        const offsetLat = post.location.lat - 15;
        const offsetLng = post.location.lng - 3;

        globeInstance.current.pointOfView({
          lat: offsetLat,
          lng: offsetLng,
          altitude: targetAltitude
        }, 600);

        waitForZoom(600).then(() => {
          if (globeInstance.current.controls()) {
            globeInstance.current.controls().enableDamping = true;
            globeInstance.current.controls().dampingFactor = 0.2;
          }
          setSelectedId(post.id);
          isZooming.current = false;
        });
      } catch (error) {
        isZooming.current = false;
      }
    });
  }, [setZoomCallback, setSelectedId]);

  const refreshHexColors = () => {
    if (!globeInstance.current) return;
    const data = globeInstance.current.hexBinPointsData();
    if (Array.isArray(data)) {
      globeInstance.current.hexBinPointsData(data.slice());
    }
  };

  const hexColorForBin = (d) => {
    const points = d.points || [];
    const selected = selectedIdRef.current;
    const highlighted = highlightedPointIdsRef.current;
    if (selected && points.some(p => p.id === selected)) return '#ffcc33';
    if (highlighted && highlighted.size && points.some(p => highlighted.has(p.id))) return '#ffb347';
    return weightColor(d.sumWeight);
  };

  const hexSideColorForBin = (d) => {
    const points = d.points || [];
    const selected = selectedIdRef.current;
    const highlighted = highlightedPointIdsRef.current;
    if (selected && points.some(p => p.id === selected)) return '#ffa500';
    if (highlighted && highlighted.size && points.some(p => highlighted.has(p.id))) return '#e69500';
    return weightColor(d.sumWeight);
  };

  const onZoomHandler = () => {
    if (!globeInstance.current) return;

    const altitude = globeInstance.current.pointOfView().altitude;
    const isMobile = window.innerWidth <= 640;
    let hexBinResolution;
    let hexAltitude;

    if (isMobile) {
      if (altitude >= 1.5) { hexBinResolution = 3; hexAltitude = 0.12; }
      else { hexBinResolution = 3; hexAltitude = 0.09; }
    } else {
      if (altitude >= 1.6) { hexBinResolution = 3; hexAltitude = 0.11; }
      else if (altitude >= 0.85) { hexBinResolution = 3; hexAltitude = 0.09; }
      else { hexBinResolution = 4; hexAltitude = 0.07; }
    }

    const prev = hexLodRef.current;
    if (prev.resolution !== hexBinResolution) {
      globeInstance.current.hexBinResolution(hexBinResolution);
    }
    if (prev.altitude !== hexAltitude) {
      globeInstance.current.hexAltitude(hexAltitude);
    }
    hexLodRef.current = { resolution: hexBinResolution, altitude: hexAltitude };

    const canRotate = altitude > 2.0 && !selectedIdRef.current && !hexClusterRef.current;
    globeInstance.current.controls().autoRotate = canRotate;

    // Counter-scale DOM pins on touch UI so the camera-distance scaling
    // applied by three-globe does not shrink taps below ~56px screen space.
    // The globe's perspective scales pins ~1/altitude; we invert that,
    // clamped to 1.0–1.8 so zoomed-in pins don't balloon. Desktop pins are
    // 44px and not counter-scaled (hover gallery is desktop-only).
    const viz = document.getElementById('globeViz');
    if (viz && document.documentElement.classList.contains('touch-ui')) {
      const rawScale = altitude / 2.5;
      const scale = Math.max(1.0, Math.min(1.8, rawScale));
      const pins = viz.querySelectorAll('.globe-photo-pin-face');
      pins.forEach(function (face) {
        face.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
      });
    }
  };

  React.useEffect(() => {
    try {
      globeInstance.current = Globe({
        rendererConfig: { antialias: true, alpha: true, powerPreference: 'high-performance' }
      })
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .pointOfView({ lat: 0, lng: 0, altitude: 2.0 }, 0)
        .hexBinPointsData([])
        .hexBinPointLat('lat')
        .hexBinPointLng('lng')
        .hexBinPointWeight('weight')
        .hexBinResolution(3)
        .hexMargin(0.1)
        .hexAltitude(0.11)
        .hexTopColor(hexColorForBin)
        .hexSideColor(hexSideColorForBin)
        .hexLabel(d => `${Math.round(d.sumWeight)} days`)
        .htmlElementsData([])
        .htmlLat('lat')
        .htmlLng('lng')
        .htmlAltitude(0.12)
        .htmlTransitionDuration(0)
        .htmlElement(window.createGlobePhotoPin)
        .ringsData([])
        .ringColor(() => ringColorInterpolator)
        .ringMaxRadius(4)
        .ringPropagationSpeed(1)
        .ringRepeatPeriod(2000)
        .onZoom(onZoomHandler)
        .onHexHover(hex => {
          if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
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

      window.applyGlobePixelRatio(globeInstance.current, document.getElementById('globeViz'));
      onZoomHandler();

      const signalGlobeReady = function() {
        if (window.__wipGlobeReady) return;
        window.__wipGlobeReady = true;
        window.dispatchEvent(new Event('wip-globe-ready'));
      };
      const sharpenGlobeTexture = function() {
        const g = globeInstance.current;
        if (!g) return;
        const mat = typeof g.globeMaterial === 'function' ? g.globeMaterial() : null;
        if (!mat || !mat.map) return false;
        mat.shininess = 5;
        mat.map.generateMipmaps = false;
        mat.map.minFilter = THREE.LinearFilter;
        mat.map.magFilter = THREE.LinearFilter;
        mat.map.needsUpdate = true;
        return true;
      };
      if (sharpenGlobeTexture()) {
        signalGlobeReady();
      } else {
        let tries = 0;
        const waitForMap = setInterval(function() {
          tries += 1;
          if (sharpenGlobeTexture() || tries > 40) {
            clearInterval(waitForMap);
            signalGlobeReady();
          }
        }, 100);
      }

      try {
        globeInstance.current.controls().autoRotate = true;
        globeInstance.current.controls().autoRotateSpeed = 0.1;
        globeInstance.current.controls().enableZoom = true;
        globeInstance.current.controls().minDistance = 145;
        globeInstance.current.controls().maxDistance = 700;
        globeInstance.current.controls().addEventListener('start', function () {
          if (!document.documentElement.classList.contains('touch-ui')) return;
          window.dispatchEvent(new Event('wip-footer-collapse'));
        });
      } catch (error) {
      }

      globeInstance.current.onHexClick(hex => {
        try {
          if (!hex || !hex.points || hex.points.length === 0) {
            return;
          }

          if (isZooming.current) {
            return;
          }
          globeInstance.current.controls().autoRotate = false;

          const sortedPoints = hex.points.slice().sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() === dateB.getTime()) {
              const aIsComic = window.momentsInTime.find(m => m.id === a.id)?.isComic || false;
              const bIsComic = window.momentsInTime.find(m => m.id === b.id)?.isComic || false;
              return bIsComic - aIsComic;
            }
            return dateB - dateA;
          });

          const uniquePoints = [];
          const seen = new Set();
          for (let i = 0; i < sortedPoints.length; i++) {
            const p = sortedPoints[i];
            if (!p || !p.id || seen.has(p.id)) continue;
            seen.add(p.id);
            uniquePoints.push(p);
          }
          if (uniquePoints.length === 0) return;

          highlightedPointIdsRef.current = seen;
          const data = globeInstance.current.hexBinPointsData();
          if (Array.isArray(data)) globeInstance.current.hexBinPointsData(data.slice());

          if (uniquePoints.length > 1) {
            if (window.openHexCluster) {
              window.openHexCluster(uniquePoints);
            }
            const focus = uniquePoints[0];
            const isMobile = window.innerWidth <= 640;
            const currentAlt = globeInstance.current.pointOfView().altitude;
            globeInstance.current.pointOfView({
              lat: focus.lat - (isMobile ? 10 : 8),
              lng: focus.lng,
              altitude: Math.min(currentAlt, 1.15)
            }, 800);
            return;
          }

          const post = uniquePoints[0];
          isZooming.current = true;
          if (post && post.id) {
            setSelectedId(post.id);
            handleTimelineClick(post);
          }

          const isMobile = window.innerWidth <= 640;
          globeInstance.current.pointOfView({
            lat: post.lat - (isMobile ? 8 : 12),
            lng: post.lng,
            altitude: isMobile ? 0.65 : 0.7
          }, 1200);

          waitForZoom(1200).then(() => {
            if (window.showMomentCard) {
              window.showMomentCard(post);
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
      console.error('Globe init failed', error);
      if (!window.__wipGlobeReady) {
        window.__wipGlobeReady = true;
        window.dispatchEvent(new Event('wip-globe-ready'));
      }
    }
  }, []);

  // Resize globe canvas and re-run zoom logic when viewport/orientation changes.
  // Update camera aspect ratio so the globe doesn't stretch; then setSize and render.
  React.useEffect(() => {
    const resizeGlobe = () => {
      const el = document.getElementById('globeViz');
      if (!globeInstance.current || !el) return;
      try {
        window.applyGlobePixelRatio(globeInstance.current, el);
        const g = globeInstance.current;
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
    selectedIdRef.current = selectedId;
    if (selectedId) {
      highlightedPointIdsRef.current = new Set([selectedId]);
    } else if (!hexClusterRef.current) {
      highlightedPointIdsRef.current = new Set();
    }
    refreshHexColors();

    document.querySelectorAll('.globe-photo-pin').forEach(function(el) {
      const ids = (el.dataset.ids || el.dataset.id || '').split(',');
      el.classList.toggle('is-selected', !!(selectedId && ids.indexOf(selectedId) >= 0));
    });

    if (globeInstance.current) {
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
    const filteredPosts = window.momentsInTime.filter(post => {
      const tagMatch = selectedTag === "All" || post.tags.includes(selectedTag);
      const yearMatch = !selectedYear || selectedYear === "All" || new Date(post.date).getUTCFullYear().toString() === selectedYear;
      return tagMatch && yearMatch;
    });
    if (globeInstance.current) {
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
      globeInstance.current.htmlElementsData(window.buildGlobePhotoPins(filteredPosts));
      onZoomHandler();
    }
  }, [selectedTag, selectedYear]);

  React.useEffect(() => {
    setSelectedId(null);
    setPopoverContent(null);
    setHexCluster(null);
    highlightedPointIdsRef.current = new Set();
    if (globeInstance.current) {
      globeInstance.current.ringsData([]); // Clear rings when filters change
    }
  }, [selectedTag, selectedYear, setSelectedId]);

  const useTravelLogComicLayout = (post) => {
    if (!post || post.isComic || post.isInteractive) return false;
    return post.travelLogComicLayout === true;
  };

  const handleOpenBlogPost = async (postId, options = {}) => {
    const post = window.momentsInTime.find(p => p.id === postId);

    if (post) {
      // Update moment selection (URL and globe zoom) if not already selected
      let intendedPath = post.fullLink && post.fullLink !== "#" ? post.fullLink : `/moments/${postId}`;
      if (postId === 'characters-comic-book-2025-09-15' && options.initialSlide) {
        const slideHash = typeof options.initialSlide === 'string'
          ? '#' + options.initialSlide
          : '#slide-' + options.initialSlide;
        intendedPath = intendedPath.replace(/#.*$/, '') + slideHash;
      }
      if (selectedId !== postId) {
        setSelectedId(postId);
        const currentBase = (window.stripBase ? window.stripBase(window.location.pathname) : window.location.pathname || '').replace(/\/$/, '');
        const intendedBase = (intendedPath || '').replace(/#.*$/, '').replace(/\/$/, '');
        // Push when navigating to a different base path, or when setting/updating slide hash for character comic
        if (currentBase !== intendedBase || options.initialSlide) {
          window.history.pushState({ momentId: postId }, '', window.withBase ? window.withBase(intendedPath) : intendedPath);
        }
        // Globe zoom will be handled automatically by React state change
      } else if (options.initialSlide) {
        // Already on this moment; still push URL with slide hash so ComicReader opens to correct slide
        window.history.pushState({ momentId: postId }, '', window.withBase ? window.withBase(intendedPath) : intendedPath);
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
            postId: postId,
            skipCover: true
          };
          
          setPopoverContent(null);
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
        
        const response = await fetch(window.withBase ? window.withBase(htmlFile) : htmlFile);

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
          if (window.withBase) dataPath = window.withBase(dataPath);

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
          // Keep relative URLs rooted at the fetched post after its body moves into the app.
          doc.body.querySelectorAll('[src], a[href]').forEach((element) => {
            const attribute = element.hasAttribute('src') ? 'src' : 'href';
            const value = element.getAttribute(attribute).trim();
            if (!value || /^(?:[\/#]|[a-z][a-z\d+.-]*:)/i.test(value)) return;
            element.setAttribute(attribute, new URL(value, response.url).href);
          });
          doc.body.querySelectorAll('img').forEach((image, index) => {
            if (index >= 2 && !image.hasAttribute('loading')) image.loading = 'lazy';
            if (!image.hasAttribute('decoding')) image.decoding = 'async';
            if (image.hasAttribute('src')) image.setAttribute('src', window.imageUrl(image.getAttribute('src')));
          });
          bodyContent = doc.body.innerHTML;
        }

        setBlogPostContent({
          postId: postId,
          title: post.title,
          content: bodyContent,
          image: post.image ? (window.withBase ? window.withBase(post.image.replace('attachment://', '')) : post.image.replace('attachment://', '')) : null,
          imageAlt: post.imageAlt,
          caption: post.caption,
          mapLink: post.mapLink,
          mapText: post.mapText,
          location: post.location,
          gallery: typeof window.collectMomentGallery === 'function' ? window.collectMomentGallery(post) : (post.gallery || []),
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
          image: post.image ? (window.withBase ? window.withBase(post.image.replace('attachment://', '')) : post.image.replace('attachment://', '')) : null,
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

  const popoverContentRef = React.useRef(null);
  popoverContentRef.current = popoverContent;
  const [carouselDir, setCarouselDir] = React.useState(0);

  const resolveMomentImage = (m) => {
    if (!m) return null;
    let src;
    if (m.isComic) {
      src = m.cover || ((m.fullLink && m.fullLink !== '#') ? m.fullLink.replace(/\/$/, '') + '/cover.webp' : '');
    } else {
      src = (m.image || '')
        .replace(/image-thumb\.webp$/, 'image.jpg');
    }
    if (!src) return null;
    if (src.indexOf('attachment://') === 0) src = src.replace('attachment://', '');
    if (src.indexOf('https://') === 0 || src.indexOf('http://') === 0) return src;
    return window.withBase ? window.withBase(src) : src;
  };

  const scrollTimelineToMoment = (id) => {
    const el = document.querySelector('.tl-entry[data-id="' + id + '"]');
    const container = document.querySelector('.timeline-scroll');
    if (!el || !container) return;
    const er = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    container.scrollTo({
      left: container.scrollLeft + er.left + er.width / 2 - cr.width / 2,
      behavior: 'smooth'
    });
  };

  const showMomentCard = (m) => {
    if (!m) return;
    const full = ((window.momentsInTime || []).find(x => x.id === m.id)) || m;
    setSelectedId(full.id);
    const hero = resolveMomentImage(full);
    let gallery = !full.isComic && typeof window.collectMomentGallery === 'function'
      ? window.collectMomentGallery(full).slice()
      : [];
    if (hero && gallery.length) {
      gallery[0] = Object.assign({}, gallery[0], { src: hero });
    }
    setPopoverContent({
      title: full.title || full.timelineHighlight || '',
      snippet: full.snippet || '',
      fullLink: full.fullLink || '#',
      id: full.id,
      image: hero,
      imageAlt: full.imageAlt || full.title,
      isComic: !!full.isComic,
      gallery: gallery
    });
    scrollTimelineToMoment(full.id);
    let path = full.fullLink;
    if (!path || path === '#') {
      path = null;
    } else if (path.charAt(0) !== '/') {
      path = '/moments/' + path;
    }
    if (path) {
      const current = window.stripBase ? window.stripBase(window.location.pathname) : window.location.pathname;
      const a = current.replace(/\/$/, '');
      const b = path.replace(/\/$/, '');
      if (a !== b) {
        window.history.pushState({ momentId: full.id }, '', window.withBase ? window.withBase(path) : path);
      }
    }
  };

  const focusClusterMoment = (m) => {
    if (!m) return;
    setHexCluster(null);
    const full = (window.momentsInTime || []).find(x => x.id === m.id) || m;
    highlightedPointIdsRef.current = new Set([full.id]);
    showMomentCard(full);
    if (!globeInstance.current) return;
    isZooming.current = true;
    globeInstance.current.controls().autoRotate = false;
    const lat = (full.location && full.location.lat) || m.lat;
    const lng = (full.location && full.location.lng) || m.lng;
    const isMobile = window.innerWidth <= 640;
    globeInstance.current.pointOfView({
      lat: lat - (isMobile ? 8 : 12),
      lng: lng,
      altitude: isMobile ? 0.65 : 0.7
    }, 1200);
    waitForZoom(1200).then(() => {
      isZooming.current = false;
    });
  };

  const closeHexCluster = () => {
    hexClusterRef.current = null;
    setHexCluster(null);
    if (!selectedIdRef.current) {
      highlightedPointIdsRef.current = new Set();
      refreshHexColors();
    }
    onZoomHandler();
  };

  // Android swipe-back / hardware back = Escape: dismiss one overlay, stay in the app.
  const androidBackStateRef = React.useRef({});
  androidBackStateRef.current = {
    isBlogDrawerOpen,
    blogPostContent,
    hexCluster,
    popoverContent,
    searchOpen,
    searchQuery
  };
  const androidBackClosedViaPopRef = React.useRef(false);
  React.useEffect(() => {
    if (!/Android/i.test(navigator.userAgent || '')) return undefined;

    const comicOpen = document.body.classList.contains('comic-is-open')
      || (blogPostContent && isComicEpisode(blogPostContent.postId || '', blogPostContent.title));
    if (comicOpen) return undefined;

    const layerOpen = !!(isBlogDrawerOpen || hexCluster || popoverContent || searchOpen);

    if (!layerOpen) {
      if (androidBackClosedViaPopRef.current) {
        androidBackClosedViaPopRef.current = false;
        return undefined;
      }
      if (window.history.state && window.history.state.escLayer) {
        window.overlayConsumedBack = true;
        window.history.back();
      }
      return undefined;
    }

    if (androidBackClosedViaPopRef.current) {
      androidBackClosedViaPopRef.current = false;
    }
    if (!(window.history.state && window.history.state.escLayer)) {
      const state = Object.assign({}, window.history.state || {}, { escLayer: true });
      window.history.pushState(state, '', window.location.href);
    }

    const handlePopState = () => {
      if (document.body.classList.contains('comic-is-open')) return;
      const s = androidBackStateRef.current;
      androidBackClosedViaPopRef.current = true;
      window.overlayConsumedBack = true;

      if (s.isBlogDrawerOpen) {
        const postId = s.blogPostContent && s.blogPostContent.postId;
        setIsBlogDrawerOpen(false);
        setBlogPostContent(null);
        const moment = postId && (window.momentsInTime || []).find((m) => m.id === postId);
        if (moment && typeof window.showMomentCard === 'function') {
          window.showMomentCard(moment);
        }
        return;
      }
      if (s.hexCluster) {
        closeHexCluster();
        return;
      }
      if (s.popoverContent) {
        setPopoverContent(null);
        setSelectedId(null);
        return;
      }
      if (s.searchOpen) {
        if (s.searchQuery) setSearchQuery('');
        else {
          setSearchOpen(false);
          if (searchInputRef.current) searchInputRef.current.blur();
        }
      }
    };

    window.addEventListener('popstate', handlePopState, true);
    return () => window.removeEventListener('popstate', handlePopState, true);
  }, [isBlogDrawerOpen, blogPostContent, hexCluster, popoverContent, searchOpen, searchQuery, setSelectedId]);

  window.showMomentCard = showMomentCard;
  window.showGlobePinGallery = function(d, x, y) {
    if (pinGalleryHideRef.current) {
      clearTimeout(pinGalleryHideRef.current);
      pinGalleryHideRef.current = null;
    }
    if (!d || !d.moments || !d.moments.length) return;
    setPinGallery({
      moments: d.moments,
      locationName: d.locationName || '',
      x: x,
      y: y
    });
  };
  window.moveGlobePinGallery = function(x, y) {
    setPinGallery(function(prev) {
      if (!prev) return prev;
      return {
        moments: prev.moments,
        locationName: prev.locationName,
        x: x,
        y: y
      };
    });
  };
  window.hideGlobePinGallery = function() {
    if (pinGalleryHideRef.current) clearTimeout(pinGalleryHideRef.current);
    pinGalleryHideRef.current = setTimeout(function() {
      setPinGallery(null);
    }, 160);
  };
  window.handleGlobePhotoClick = (d) => {
    if (!d) return;
    const ids = d.ids && d.ids.length ? d.ids : (d.id ? [d.id] : []);
    const points = (window.momentsInTime || []).filter(function(m) {
      return ids.indexOf(m.id) >= 0;
    }).map(function(m) {
      return {
        id: m.id,
        date: m.date,
        lat: m.location && m.location.lat,
        lng: m.location && m.location.lng,
        label: m.location && m.location.name,
        title: m.title,
        image: m.image
      };
    });
    if (!points.length) return;
    globeInstance.current && globeInstance.current.controls() && (globeInstance.current.controls().autoRotate = false);
    if (points.length > 1) {
      window.openHexCluster(points);
      const focus = points[0];
      if (globeInstance.current && focus.lat != null) {
        const isMobile = window.innerWidth <= 640;
        const currentAlt = globeInstance.current.pointOfView().altitude;
        globeInstance.current.pointOfView({
          lat: focus.lat - (isMobile ? 10 : 8),
          lng: focus.lng,
          altitude: Math.min(currentAlt, 1.15)
        }, 800);
      }
      return;
    }
    focusClusterMoment(points[0]);
  };
  window.openHexCluster = (points) => {
    if (!points || !points.length) return;
    setPopoverContent(null);
    const moments = points.map(function(p) {
      const full = (window.momentsInTime || []).find(x => x.id === p.id) || p;
      return {
        id: full.id,
        title: full.title || full.timelineHighlight || '',
        date: full.date,
        locationName: (full.location && full.location.name) || p.label || '',
        image: window.resolveGlobeImage(full),
        stayDuration: full.stayDuration || p.weight,
        isComic: !!full.isComic,
        lat: (full.location && full.location.lat) || p.lat,
        lng: (full.location && full.location.lng) || p.lng
      };
    });
    setHexCluster({ moments: moments, lat: moments[0].lat, lng: moments[0].lng });
  };
  window.stepOpenCard = (dir, opts) => {
    const moments = window.momentsInTime || [];
    if (!moments.length) return null;
    const currentId = (opts && opts.currentId) || (popoverContentRef.current && popoverContentRef.current.id) || selectedId;
    let idx = moments.findIndex(m => m.id === currentId);
    if (idx < 0) return null;
    const next = moments[idx + dir];
    if (!next) return null;
    if (opts && opts.fromComic) {
      setIsBlogDrawerOpen(false);
      setBlogPostContent(null);
      setCarouselDir(dir);
      showMomentCard(next);
      return next;
    }
    setCarouselDir(dir);
    showMomentCard(next);
    return next;
  };

  const foldSearch = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const searchResults = React.useMemo(() => {
    const q = foldSearch(searchQuery).trim();
    if (!q || !searchOpen) return [];
    const out = [];
    (window.characters || []).forEach((c) => {
      const hay = foldSearch([c.name, c.nickname, c.role, c.description, c.bio, (c.tags || []).join(' ')].join(' '));
      if (hay.includes(q)) {
        out.push({ kind: 'people', id: 'p-' + c.id, title: c.name, subtitle: c.role || '', thumb: c.avatar, characterId: c.id });
      }
    });
    (window.ERA_DEFS || []).forEach((e) => {
      if (foldSearch([e.label, e.years, e.key].join(' ')).includes(q)) {
        out.push({ kind: 'eras', id: 'e-' + e.key, title: e.label, subtitle: e.years, era: e });
      }
    });
    const tagCounts = {};
    (window.momentsInTime || []).forEach((m) => {
      (m.tags || []).forEach((raw) => {
        const tag = String(raw || '').trim();
        if (!tag) return;
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    Object.keys(tagCounts).forEach((tag) => {
      const ft = foldSearch(tag);
      if (ft.includes(q) || ('#' + ft).includes(q)) {
        const n = tagCounts[tag];
        out.push({
          kind: 'tags',
          id: 't-' + ft,
          title: '#' + tag,
          subtitle: n + (n === 1 ? ' moment' : ' moments'),
          tag
        });
      }
    });
    const seenPlace = new Set();
    (window.momentsInTime || []).forEach((m) => {
      const loc = (m.location && m.location.name) || '';
      const hay = foldSearch([m.title, m.timelineHighlight, m.snippet, loc, (m.tags || []).join(' ')].join(' '));
      if (!hay.includes(q)) return;
      const isStory = !!(m.isComic || m.isInteractive || m.contentFile);
      if (isStory) {
        out.push({ kind: 'blogs', id: 'b-' + m.id, title: m.title, subtitle: loc, momentId: m.id, isComic: !!m.isComic });
      }
      if (loc) {
        const pk = foldSearch(loc);
        if (!seenPlace.has(pk) && (foldSearch(loc).includes(q) || !isStory)) {
          seenPlace.add(pk);
          out.push({ kind: 'places', id: 'l-' + pk, title: loc, subtitle: m.title, momentId: m.id });
        }
      }
    });
    return out.slice(0, 32);
  }, [searchQuery, searchOpen]);

  React.useEffect(() => { setSearchCursor(0); }, [searchQuery, searchOpen]);

  React.useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  React.useEffect(() => {
    const onKey = (event) => {
      const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (metaK) {
        event.preventDefault();
        setIsDrawerOpen(false);
        setSearchOpen(true);
        if (searchInputRef.current) searchInputRef.current.focus();
        return;
      }
      if (event.key === '/' && !searchOpen && event.target && !/input|textarea/i.test(event.target.tagName)) {
        event.preventDefault();
        setSearchOpen(true);
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const openSearchResult = (item) => {
    if (!item) return;
    setSearchOpen(false);
    setSearchQuery('');
    if (item.kind === 'people') {
      handleOpenCharacterComic(item.characterId);
    } else if (item.kind === 'eras' && item.era) {
      const start = new Date(item.era.start).getTime();
      const end = new Date(item.era.end).getTime();
      const m = (window.momentsInTime || []).find((x) => {
        const t = new Date(x.date).getTime();
        return t >= start && t <= end;
      });
      if (m) showMomentCard(m);
      if (window.minimapDateToPercent && window.scrubTimelineToMinimapU) {
        window.scrubTimelineToMinimapU(window.minimapDateToPercent(item.era.start) / 100, true);
      }
    } else if (item.kind === 'blogs') {
      handleOpenBlogPost(item.momentId, item.isComic ? { skipCover: true } : {});
    } else if (item.kind === 'places') {
      const m = (window.momentsInTime || []).find((x) => x.id === item.momentId);
      if (m) showMomentCard(m);
    } else if (item.kind === 'tags' && item.tag) {
      setSelectedTag(item.tag);
    }
  };

  React.useEffect(() => {
    if (!popoverContent) return;
    const onKeyDown = (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (event.key === 'Enter') {
        const m = (window.momentsInTime || []).find(x => x.id === popoverContent.id);
        if (m && m.isComic) handleOpenBlogPost(m.id, { skipCover: true });
        else if (m && m.fullLink && m.fullLink !== '#') handleOpenBlogPost(m.id);
        return;
      }
      window.stepOpenCard(event.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [popoverContent, selectedId]);

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
        { className: 'filter-topbar' },
        React.createElement(
          'div',
          { className: 'search-combo' + (searchOpen ? ' is-open' : '') },
          React.createElement('span', { className: 'search-combo__icon', 'aria-hidden': 'true' },
            React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
              React.createElement('circle', { cx: 11, cy: 11, r: 7 }),
              React.createElement('line', { x1: 16.5, y1: 16.5, x2: 21, y2: 21 })
            )
          ),
          React.createElement('input', {
            ref: searchInputRef,
            className: 'search-combo__input',
            type: 'search',
            placeholder: 'Places, people, stories, eras, tags',
            value: searchQuery,
            'aria-label': 'Search places, people, stories, eras, tags',
            onFocus: () => { setSearchOpen(true); setIsDrawerOpen(false); },
            onChange: (e) => { setSearchQuery(e.target.value); setSearchOpen(true); },
            onKeyDown: (e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                if (searchQuery) setSearchQuery('');
                else { setSearchOpen(false); e.target.blur(); }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSearchCursor((i) => Math.min(i + 1, Math.max(0, searchResults.length - 1)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSearchCursor((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                openSearchResult(searchResults[searchCursor]);
              }
            }
          }),
          React.createElement(
            'button',
            {
              className: `filter-toggle filter-toggle--icon ${isDrawerOpen ? 'is-open' : ''} ${activeFilters.length > 0 ? 'is-active' : ''}`,
              onClick: () => { setIsDrawerOpen(!isDrawerOpen); setSearchOpen(false); },
              'aria-label': 'Filters',
              'aria-expanded': isDrawerOpen ? 'true' : 'false',
              'aria-controls': 'filter-drawer',
              type: 'button'
            },
            React.createElement('span', { className: 'filter-toggle-icon' },
              React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('path', { d: 'M3 4h18l-7 8v7l-4 2v-9L3 4z' })
              )
            ),
            activeFilters.length > 0 ? React.createElement('span', { className: 'filter-toggle-badge' }, activeFilters.length) : null
          ),
          searchOpen && searchQuery.trim() ? React.createElement(
            'div',
            { className: 'search-palette search-palette--docked', onMouseDown: (e) => e.preventDefault() },
            React.createElement(
              'div',
              { className: 'search-palette__list' },
              searchResults.length === 0
                ? React.createElement('div', { className: 'search-palette__empty' }, 'Nothing matches')
                : searchResults.map((item, i) =>
                    React.createElement(
                      'button',
                      {
                        key: item.id,
                        type: 'button',
                        className: 'search-palette__row' + (i === searchCursor ? ' is-active' : ''),
                        onMouseEnter: () => setSearchCursor(i),
                        onClick: () => openSearchResult(item)
                      },
                      item.thumb
                        ? React.createElement('img', { className: 'search-palette__thumb', src: window.imageUrl(item.thumb), loading: 'lazy', decoding: 'async', alt: '' })
                        : React.createElement('span', { className: 'search-palette__kind' }, item.kind),
                      React.createElement(
                        'span',
                        { className: 'search-palette__text' },
                        React.createElement('span', { className: 'search-palette__title' }, item.title),
                        item.subtitle ? React.createElement('span', { className: 'search-palette__sub' }, item.subtitle) : null
                      )
                    )
                  )
            )
          ) : null
        ),
      activeFilters.length > 0 && React.createElement(
        'div',
        { className: 'filter-active-chips' },
        activeFilters.map(filter =>
          React.createElement(
            'span',
            { key: `${filter.type}-${filter.label}`, className: 'filter-chip' },
            React.createElement('span', { className: 'filter-chip-kind' }, filter.type.toUpperCase()),
            React.createElement('span', { className: 'filter-chip-value' }, filter.label),
            React.createElement(
              'button',
              {
                className: 'filter-chip-close',
                'aria-label': `Clear ${filter.type} filter`,
                onClick: () => {
                  if (filter.type === 'year') {
                    setSelectedYear('All');
                  } else if (filter.type === 'tag') {
                    setSelectedTag('All');
                  }
                }
              },
              React.createElement('svg', { width: 11, height: 11, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round' },
                React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
                React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 })
              )
            )
          )
        ),
        React.createElement(
          'button',
          {
            className: 'filter-clear-all',
            onClick: () => { setSelectedYear('All'); setSelectedTag('All'); }
          },
          'Clear all'
        )
      )
    ),
    React.createElement(
      'div',
      { className: `filter-drawer ${isDrawerOpen ? 'is-open' : ''}`, ref: drawerRef, id: 'filter-drawer', role: 'region', 'aria-label': 'Filters' },
      React.createElement(
        'div',
        { className: 'filter-drawer-inner' },
        React.createElement(
          'div',
          { className: 'filter-drawer-head' },
          React.createElement(
            'div',
            { className: 'filter-drawer-title' },
            React.createElement('span', { className: 'filter-drawer-eyebrow' }, 'Field Log'),
            'Filters'
          ),
          React.createElement(
            'button',
            {
              className: 'filter-close-btn',
              'aria-label': 'Close filters',
              onClick: () => setIsDrawerOpen(false)
            },
            React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' },
              React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 }),
              React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 })
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'filter-drawer-body' },
          characters.length > 0 && React.createElement(
            'div',
            { className: 'filter-section' },
            React.createElement(
              'div',
              { className: 'filter-section-head' },
              React.createElement('span', { className: 'filter-section-icon' },
                React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                  React.createElement('circle', { cx: 12, cy: 8, r: 4 }),
                  React.createElement('path', { d: 'M4 21c0-4 4-6 8-6s8 2 8 6' })
                )
              ),
              React.createElement('span', { className: 'filter-section-label' }, 'People'),
              React.createElement('span', { className: 'filter-section-hint' }, 'The tribe')
            ),
            React.createElement(
              'div',
              { className: 'filter-char-row' },
              characters
                .filter(character => character.avatar)
                .map(character =>
                  React.createElement(
                    'button',
                    {
                      key: `character-${character.id}`,
                      className: 'character-avatar-button',
                      title: character.name,
                      onClick: () => {
                        handleOpenCharacterComic(character.id);
                      }
                    },
                    React.createElement('span', { className: 'character-avatar-img-wrapper' },
                      React.createElement('img', {
                        src: window.imageUrl(character.avatar),
                        decoding: 'async',
                        alt: character.name,
                        className: 'character-avatar-img',
                        onError: (e) => {
                          const item = e.target.closest('.character-avatar-button');
                          if (item) {
                            item.style.display = 'none';
                          }
                        }
                      })
                    ),
                    React.createElement('span', { className: 'character-avatar-name' }, character.name),
                    character.nickname
                      ? React.createElement('span', { className: 'character-avatar-nickname' }, character.nickname)
                      : null
                  )
                ),
              React.createElement(
                'button',
                {
                  className: 'character-comic-button',
                  onClick: () => handleOpenCharacterComic(),
                  title: 'Open the Character Bible'
                },
                React.createElement('img', {
                  src: 'https://pub-9466bb5132e74aeba333004ad0c21f21.r2.dev/characters/cover-thumb.webp',
                  alt: '',
                  className: 'character-comic-button__cover'
                }),
                React.createElement('span', { className: 'character-comic-button__label' }, 'Bible')
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'filter-section' },
            React.createElement(
              'div',
              { className: 'filter-section-head' },
              React.createElement('span', { className: 'filter-section-icon' },
                React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                  React.createElement('rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }),
                  React.createElement('line', { x1: 3, y1: 10, x2: 21, y2: 10 }),
                  React.createElement('line', { x1: 8, y1: 3, x2: 8, y2: 7 }),
                  React.createElement('line', { x1: 16, y1: 3, x2: 16, y2: 7 })
                )
              ),
              React.createElement('span', { className: 'filter-section-label' }, 'Year'),
              React.createElement('span', { className: 'filter-section-hint' },
                selectedYear && selectedYear !== 'All'
                  ? ['Exploring ', React.createElement('b', { key: 'year-hint-b' }, selectedYear)]
                  : 'All years'
              )
            ),
            React.createElement(
              'div',
              { className: 'filter-pills filter-pills-scroll' },
              yearTags.map(year =>
                React.createElement(
                  'button',
                  {
                    key: `year-${year}`,
                    onClick: () => setSelectedYear(year),
                    className: `filter-pill ${selectedYear === year ? 'is-active' : ''}`
                  },
                  year
                )
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'filter-section' },
            React.createElement(
              'div',
              { className: 'filter-section-head' },
              React.createElement('span', { className: 'filter-section-icon' },
                React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
                  React.createElement('path', { d: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z' }),
                  React.createElement('circle', { cx: 7.5, cy: 7.5, r: 1.5 })
                )
              ),
              React.createElement('span', { className: 'filter-section-label' }, 'Tag'),
              React.createElement('span', { className: 'filter-section-hint' },
                selectedTag && selectedTag !== 'All'
                  ? ['Tracking ', React.createElement('b', { key: 'tag-hint-b' }, selectedTag)]
                  : 'All tags'
              )
            ),
            React.createElement(
              'div',
              { className: 'filter-pills filter-pills-wrap' },
              regularTags.map(tag =>
                React.createElement(
                  'button',
                  {
                    key: `tag-${tag}`,
                    onClick: () => setSelectedTag(tag),
                    className: `filter-pill ${selectedTag === tag ? 'is-active' : ''}`
                  },
                  tag === 'All' ? 'All' : '#' + tag
                )
              )
            )
          )
        )
      )
    ),
    pinGallery && React.createElement(window.GlobePinGallery, {
      moments: pinGallery.moments,
      x: pinGallery.x,
      y: pinGallery.y,
      locationName: pinGallery.locationName,
      onEnter: function() {
        if (pinGalleryHideRef.current) {
          clearTimeout(pinGalleryHideRef.current);
          pinGalleryHideRef.current = null;
        }
      },
      onLeave: function() {
        if (window.hideGlobePinGallery) window.hideGlobePinGallery();
      },
      onSelect: function(m) {
        setPinGallery(null);
        focusClusterMoment(m);
      }
    }),
    hexCluster && React.createElement(window.HexClusterSheet, {
      moments: hexCluster.moments,
      sheetRef: hexClusterSheetRef,
      onClose: closeHexCluster,
      onSelect: focusClusterMoment
    }),
    popoverContent && React.createElement(window.MomentRevealOverlay, {
      title: popoverContent.title,
      snippet: popoverContent.snippet,
      fullLink: popoverContent.fullLink,
      onClose: () => { setPopoverContent(null); setCarouselDir(0); },
      id: popoverContent.id,
      image: popoverContent.image,
      imageAlt: popoverContent.imageAlt,
      isComic: popoverContent.isComic,
      gallery: popoverContent.gallery,
      carouselDir: carouselDir,
      overlayRef: popoverRef,
      onOpenPost: function(id) { handleOpenBlogPost(id, { skipCover: true }); }
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