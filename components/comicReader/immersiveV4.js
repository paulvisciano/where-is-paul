// ============================================================================
// Comic Reader 4.0 — Vertical fullscreen feed via Swiper.js (swipe up/down)
// https://swiperjs.com/demos#vertical
// ============================================================================

(function() {
  const isV4Episode = (episodeData) => {
    return episodeData && (episodeData.comicReaderVersion === 4 || episodeData.immersiveComic === true);
  };

  // Portrait = use portrait assets; desktop always uses landscape.
  const getUsePortraitAssets = (isPortrait, isNarrowScreen) => isNarrowScreen && isPortrait;

  const getVideoSrcForOrientation = (episodeData, usePortraitAssets) => {
    if (!episodeData) return '';
    if (usePortraitAssets && episodeData.videoPortraitUrl) return episodeData.videoPortraitUrl;
    if (episodeData.videoLandscapeUrl) return episodeData.videoLandscapeUrl;
    return episodeData.videoPortraitUrl || '';
  };

  const getPagesForOrientation = (episodeData, usePortraitAssets) => {
    if (!episodeData) return [];
    const landscape = (episodeData.pagesLandscape && episodeData.pagesLandscape.length) ? episodeData.pagesLandscape : (episodeData.pages || []);
    const portrait = (episodeData.pagesPortrait && episodeData.pagesPortrait.length) ? episodeData.pagesPortrait : (episodeData.pages || []);
    return usePortraitAssets ? portrait : landscape;
  };

  const isVideoUrl = (url) => /\.(mp4|webm|ogg)(\?|$)/i.test(url || '');
  const isPageVideo = (page) => typeof page === 'string' ? isVideoUrl(page) : (page && page.type === 'video');
  const isPageCustom = (page) => page && typeof page === 'object' && page.type === 'custom';
  const getPageSrc = (page) => { const s = typeof page === 'string' ? page : (page && page.src); return s && window.withBase ? window.withBase(s) : s; };
  const getPagePoster = (page) => { const p = page && page.poster; return p && window.withBase ? window.withBase(p) : p; };

  // Shared play/pause overlay style
  const VIDEO_PLAY_OVERLAY_STYLE = {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    border: '2px solid rgba(255,255,255,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    transition: 'opacity 0.2s'
  };
  const PLAY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><path fill="white" d="M8 5v14l11-7z"/></svg>';
  const PAUSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="white"/><rect x="14" y="4" width="4" height="16" fill="white"/></svg>';
  const AUTO_PLAY_DELAY_MS = 3000; // Pause a few seconds so user can read the page before video plays

  const videoLoadingOverlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  };
  const loadingSpinnerStyle = {
    width: 48,
    height: 48,
    border: '4px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'comic-video-spin 0.8s linear infinite'
  };

  window.ComicReaderImmersiveV4 = function ImmersiveV4Content({ episodeData, styles, navState = {} }) {
    const { onBackToCover, onVideoPlayStateChange, onSlidesSwitchingChange, onTapToShowControls, initialSlideIndex = 0, onSlideChange, noAutoplay = false } = navState;
    const swiperRef = React.useRef(null);
    const swiperInstanceRef = React.useRef(null);
    const activeSlideRef = React.useRef(0);
    const onBackToCoverRef = React.useRef(onBackToCover);
    const videoRef = React.useRef(null);
    const videoRefsByIndex = React.useRef({});
    const pendingRestoreRef = React.useRef(null);
    const autoPlayTimerRef = React.useRef(null);
    const programmaticSlideRef = React.useRef(false);
    const [isPortrait, setIsPortrait] = React.useState(
      () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches
    );
    const [isNarrowScreen, setIsNarrowScreen] = React.useState(
      () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
    );
    const [viewportHeight, setViewportHeight] = React.useState(
      () => (typeof window !== 'undefined' ? window.innerHeight : 100)
    );
    const [videoPlayState, setVideoPlayState] = React.useState({});
    const [videoLoadingState, setVideoLoadingState] = React.useState({});
    const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);
    React.useEffect(() => {
      const update = () => setViewportHeight(window.innerHeight);
      window.addEventListener('resize', update);
      window.addEventListener('orientationchange', update);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
      };
    }, []);
    const usePortraitAssets = getUsePortraitAssets(isPortrait, isNarrowScreen);
    const pages = getPagesForOrientation(episodeData, usePortraitAssets);
    const videoSrc = getVideoSrcForOrientation(episodeData, usePortraitAssets);
    const hasVideo = !!(episodeData && (episodeData.videoPortraitUrl || episodeData.videoLandscapeUrl));
    const videoSlideIndex = pages.length;

    React.useEffect(() => {
      const mqPortrait = window.matchMedia('(orientation: portrait)');
      const mqNarrow = window.matchMedia('(max-width: 1023px)');
      const onPortraitChange = () => {
        const el = videoRef.current;
        if (el && episodeData && (episodeData.videoPortraitUrl || episodeData.videoLandscapeUrl)) {
          pendingRestoreRef.current = { time: el.currentTime, play: !el.paused };
        }
        setIsPortrait(mqPortrait.matches);
      };
      const onNarrowChange = () => setIsNarrowScreen(mqNarrow.matches);
      mqPortrait.addEventListener('change', onPortraitChange);
      mqNarrow.addEventListener('change', onNarrowChange);
      return () => {
        mqPortrait.removeEventListener('change', onPortraitChange);
        mqNarrow.removeEventListener('change', onNarrowChange);
      };
    }, [episodeData]);

    onBackToCoverRef.current = onBackToCover;

    const isVideoSlide = (idx) => (idx < pages.length && isPageVideo(pages[idx])) || idx === videoSlideIndex;
    React.useEffect(() => {
      if (typeof onVideoPlayStateChange !== 'function') return;
      const playing = isVideoSlide(activeSlideIndex) && videoPlayState[activeSlideIndex] === 'playing';
      onVideoPlayStateChange(playing);
      return () => onVideoPlayStateChange(false);
    }, [activeSlideIndex, videoPlayState, onVideoPlayStateChange, pages, videoSlideIndex]);

    React.useEffect(() => () => onSlidesSwitchingChange?.(false), [onSlidesSwitchingChange]);

    const handleVideoCanPlay = () => {
      const pending = pendingRestoreRef.current;
      const el = videoRef.current;
      if (el) el.volume = 0.2; // start at 20% volume
      if (!pending || !el) return;
      el.currentTime = pending.time;
      if (pending.play) el.play().catch(function() {});
      pendingRestoreRef.current = null;
    };

    // When initial slide is a video, ensure play() is called once it can play (autoplay attr can be unreliable)
    const tryPlayInitialVideo = (el, index) => {
      if (noAutoplay || !el || index !== initialSlideIndex) return;
      el.muted = true; // Must be muted for programmatic play without user gesture
      el.play().catch(function() {});
    };

    // Initialize Swiper
    React.useEffect(() => {
      const container = swiperRef.current;
      if (!container || typeof window.Swiper === 'undefined') return;

      const totalSlides = pages.length + (hasVideo ? 1 : 0);
      const initialSlide = Math.min(
        typeof initialSlideIndex === 'number' ? initialSlideIndex : activeSlideRef.current,
        Math.max(0, totalSlides - 1)
      );

      const swiper = new window.Swiper(container, {
        direction: 'vertical',
        initialSlide,
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 0,
        speed: 300,
        grabCursor: true,
        allowTouchMove: true,
        simulateTouch: true,
        touchRatio: 1,
        threshold: 5,
        keyboard: { enabled: true },
        mousewheel: {
          forceToAxis: true,
          sensitivity: 0.6,
          thresholdDelta: 30,
          thresholdTime: 200
        },
        touchReleaseOnEdges: true,
        preventInteractionOnTransition: true,
        focusableElements: 'input, select, option, textarea, button, label',
        pagination: {
          el: '.swiper-pagination',
          clickable: true
        },
        on: {
          slideChange(sw) {
            if (programmaticSlideRef.current) {
              programmaticSlideRef.current = false;
              const newSlideIsVideo = (sw.activeIndex < pages.length && isPageVideo(pages[sw.activeIndex])) || sw.activeIndex === videoSlideIndex;
              if (!newSlideIsVideo) onSlidesSwitchingChange?.(false);
            }
            setActiveSlideIndex(sw.activeIndex);
            onSlideChange?.(sw.activeIndex);
            const refs = videoRefsByIndex.current;
            // Preload next slide's video so it can start immediately when user swipes
            const nextIdx = sw.activeIndex + 1;
            const nextVideo = refs[nextIdx];
            if (nextVideo && typeof nextVideo.load === 'function') nextVideo.load();
            if (autoPlayTimerRef.current) {
              clearTimeout(autoPlayTimerRef.current);
              autoPlayTimerRef.current = null;
            }
            Object.keys(refs).forEach((idx) => {
              const el = refs[idx];
              if (el) el.pause();
            });
            const activeEl = refs[sw.activeIndex];
            if (activeEl && !noAutoplay) {
              autoPlayTimerRef.current = setTimeout(() => {
                activeEl.muted = false; // User swiped = interaction, unmuted allowed
                activeEl.play().catch(function() {});
                autoPlayTimerRef.current = null;
              }, AUTO_PLAY_DELAY_MS);
            }
          }
        }
      });

      swiperInstanceRef.current = swiper;
      setActiveSlideIndex(initialSlide);
      onSlideChange?.(initialSlide); // Update URL with initial slide (e.g. #slide-1 when opening from cover)

      // Preload next slide's video for instant playback on swipe
      const nextVideo = videoRefsByIndex.current[initialSlide + 1];
      if (nextVideo && typeof nextVideo.load === 'function') nextVideo.load();

      const activeVideo = videoRefsByIndex.current[initialSlide];
      if (activeVideo && !noAutoplay) {
        autoPlayTimerRef.current = setTimeout(() => {
          activeVideo.play().catch(function() {});
          autoPlayTimerRef.current = null;
        }, AUTO_PLAY_DELAY_MS);
      }

      return () => {
        activeSlideRef.current = swiper.activeIndex;
        swiper.destroy(true, true);
        swiperInstanceRef.current = null;
        videoRefsByIndex.current = {};
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
      };
    }, [pages.length, hasVideo, videoSlideIndex, usePortraitAssets, initialSlideIndex]);

    // When viewport or orientation changes, tell Swiper to recalculate dimensions
    React.useEffect(() => {
      const swiper = swiperInstanceRef.current;
      if (swiper && typeof swiper.update === 'function') {
        swiper.update();
      }
    }, [viewportHeight, isPortrait, isNarrowScreen]);

    // Arrow keys: intercept ArrowUp on first slide for back-to-cover; Swiper handles rest
    React.useEffect(() => {
      const swiper = swiperInstanceRef.current;
      if (!swiper) return;
      const handleKeyDown = (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowLeft') return;
        if (swiper.activeIndex !== 0) return;
        const cb = onBackToCoverRef.current;
        if (typeof cb !== 'function') return;
        e.preventDefault();
        e.stopPropagation();
        cb();
      };
      window.addEventListener('keydown', handleKeyDown, true); // capture: run before Swiper
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, []);

    if (!episodeData) return null;

    const slideStyle = {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    };

    const videoHintOverlayStyle = VIDEO_PLAY_OVERLAY_STYLE;

    const toggleVideoAt = (index, e) => {
      e.stopPropagation();
      const el = videoRefsByIndex.current[index];
      if (!el) return;
      const wasPlaying = !el.paused;
      if (el.paused) {
        el.muted = false; // Unmute on user tap (autoplay starts muted for browser policy)
        el.play().catch(function() {});
      } else {
        el.pause();
        if (wasPlaying && typeof onTapToShowControls === 'function') onTapToShowControls();
      }
    };

    const handleVideoEnded = () => {
      const swiper = swiperInstanceRef.current;
      if (swiper && swiper.activeIndex < swiper.slides.length - 1) {
        programmaticSlideRef.current = true;
        onSlidesSwitchingChange?.(true);
        swiper.slideNext();
      }
    };

    const swiperSlides = [];

    pages.forEach((page, i) => {
      if (isPageCustom(page)) {
        swiperSlides.push(React.createElement('div', {
          key: 'slide-' + i,
          className: 'swiper-slide',
          style: { ...slideStyle, ...(page.style || {}) }
        }, page.children));
        return;
      }
      const isVideo = isPageVideo(page);
      const src = getPageSrc(page);
      const poster = getPagePoster(page);
      const isPlaying = videoPlayState[i] === 'playing';
      const isLoading = videoLoadingState[i] !== false;
      const content = isVideo
        ? React.createElement(React.Fragment, null,
            React.createElement('video', {
              ref: (el) => { if (el) videoRefsByIndex.current[i] = el; },
              src,
              poster: poster || undefined,
              preload: 'auto',
              autoPlay: !noAutoplay && initialSlideIndex === i,
              playsInline: true,
              muted: initialSlideIndex === i, // Muted required for autoplay on direct navigation (no user gesture)
              loop: false,
              onPlay: () => {
                setVideoPlayState((s) => ({ ...s, [i]: 'playing' }));
                setVideoLoadingState((s) => ({ ...s, [i]: false }));
                onSlidesSwitchingChange?.(false);
              },
              onPause: () => setVideoPlayState((s) => ({ ...s, [i]: 'paused' })),
              onEnded: handleVideoEnded,
              onCanPlay: (e) => {
                setVideoLoadingState((s) => ({ ...s, [i]: false }));
                tryPlayInitialVideo(e.target, i);
              },
              onLoadedData: () => setVideoLoadingState((s) => ({ ...s, [i]: false })),
              style: { width: '100%', height: '100%', display: 'block', objectFit: 'fill', touchAction: 'pan-y', cursor: 'pointer' }
            }),
            isLoading && React.createElement('div', { key: 'loading', style: videoLoadingOverlayStyle },
              React.createElement('div', { style: loadingSpinnerStyle })
            ),
            !isPlaying && !isLoading && React.createElement('div', {
              style: videoHintOverlayStyle,
              dangerouslySetInnerHTML: { __html: PLAY_ICON }
            })
          )
        : React.createElement('img', {
            src: src || (typeof page === 'string' ? page : ''),
            alt: (page && page.alt) || `Spread ${i + 1}`,
            style: { width: '100%', height: '100%', display: 'block', objectFit: 'fill' }
          });
      swiperSlides.push(React.createElement('div', {
        key: 'spread-' + i,
        className: 'swiper-slide',
        style: slideStyle,
        onClick: isVideo ? (e) => toggleVideoAt(i, e) : undefined
      }, content));
    });

    if (hasVideo) {
      const registerVideoRef = (el) => {
        videoRef.current = el;
        if (el) videoRefsByIndex.current[videoSlideIndex] = el;
      };
      const isPlaying = videoPlayState[videoSlideIndex] === 'playing';
      const videoLoading = videoLoadingState[videoSlideIndex] !== false;
      swiperSlides.push(React.createElement('div', {
        key: 'video-slide',
        className: 'swiper-slide',
        style: slideStyle,
        onClick: (e) => toggleVideoAt(videoSlideIndex, e)
      }, React.createElement(React.Fragment, null,
        React.createElement('video', {
          ref: registerVideoRef,
          src: videoSrc,
          preload: 'auto',
          autoPlay: !noAutoplay && initialSlideIndex === videoSlideIndex,
          playsInline: true,
          muted: initialSlideIndex === videoSlideIndex, // Muted required for autoplay on direct navigation (no user gesture)
          onPlay: () => {
            setVideoPlayState((s) => ({ ...s, [videoSlideIndex]: 'playing' }));
            setVideoLoadingState((s) => ({ ...s, [videoSlideIndex]: false }));
            onSlidesSwitchingChange?.(false);
          },
          onPause: () => setVideoPlayState((s) => ({ ...s, [videoSlideIndex]: 'paused' })),
          onEnded: handleVideoEnded,
          onLoadedMetadata: function(e) { e.target.volume = 0.2; },
          onCanPlay: (e) => {
            setVideoLoadingState((s) => ({ ...s, [videoSlideIndex]: false }));
            handleVideoCanPlay();
            tryPlayInitialVideo(e.target, videoSlideIndex);
          },
          onLoadedData: () => setVideoLoadingState((s) => ({ ...s, [videoSlideIndex]: false })),
          style: { width: '100%', height: '100%', display: 'block', objectFit: 'fill', touchAction: 'pan-y', cursor: 'pointer' }
        }),
        videoLoading && React.createElement('div', { key: 'loading', style: videoLoadingOverlayStyle },
          React.createElement('div', { style: loadingSpinnerStyle })
        ),
        !isPlaying && !videoLoading && React.createElement('div', {
          style: videoHintOverlayStyle,
          dangerouslySetInnerHTML: { __html: PLAY_ICON }
        })
      )));
    }

    return React.createElement('div', {
      className: 'comic-immersive-v4',
      style: { width: '100%', height: '100%', background: '#000', touchAction: 'pan-y' }
    }, React.createElement('div', {
      ref: swiperRef,
      className: 'swiper comic-immersive-v4-swiper',
      style: { width: '100%', height: '100%', touchAction: 'pan-y' }
    }, React.createElement('div', {
      className: 'swiper-wrapper'
    }, swiperSlides), React.createElement('div', {
      className: 'swiper-pagination'
    })));
  };

  window.ComicReaderCore = window.ComicReaderCore || {};
  window.ComicReaderCore.isV4Episode = isV4Episode;
})();
