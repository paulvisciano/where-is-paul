window.YEAR_TICK_POS = {
  1988: 8.3, 1994: 12.5,
  2004: 25, 2005: 29.5,
  2022: 41.7, 2023: 46,
  2024: 58.3,
  2025: 75,
  2026: 91.7
};

window.minimapDateToPercent = (date) => {
  const pos = window.YEAR_TICK_POS;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 50;
  const t = d.getTime();
  const keys = Object.keys(pos).map(Number).sort((a, b) => a - b);
  const times = keys.map((y) => Date.UTC(y, 0, 1));
  if (t <= times[0]) return pos[keys[0]];
  if (t >= times[times.length - 1]) return pos[keys[keys.length - 1]];
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (t >= times[i] && t <= times[i + 1]) {
      const u = (t - times[i]) / (times[i + 1] - times[i]);
      return pos[keys[i]] + (pos[keys[i + 1]] - pos[keys[i]]) * u;
    }
  }
  return 50;
};

window.MINIMAP_EDGE = 1.8;

window.minimapUToLeft = (u) => {
  const edge = window.MINIMAP_EDGE;
  return edge + Math.max(0, Math.min(1, u)) * (100 - edge * 2);
};

window.minimapLeftToU = (leftPercent) => {
  const edge = window.MINIMAP_EDGE;
  return Math.max(0, Math.min(1, (leftPercent - edge) / (100 - edge * 2)));
};

window.scrubTimelineToMinimapU = (u, smooth = true) => {
  const t = Math.max(0, Math.min(1, u));
  const container = document.querySelector('.timeline-scroll');
  if (!container) return;
  const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
  container.scrollTo({ left: t * maxScroll, behavior: smooth ? 'smooth' : 'auto' });
};

window.scrubTimelineToMinimapEvent = (event, smooth = true) => {
  const wrap = document.querySelector('.era-band-wrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  if (rect.width <= 0) return;
  const clientX = (event.clientX != null) ? event.clientX
    : (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : null);
  if (clientX == null) return;
  const leftPercent = ((clientX - rect.left) / rect.width) * 100;
  window.scrubTimelineToMinimapU(window.minimapLeftToU(leftPercent), smooth);
};

window.syncMinimapPlayhead = (container) => {
  const playhead = document.querySelector('.era-playhead');
  if (!playhead || !container) return;

  const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
  const u = maxScroll <= 0 ? 1 : Math.max(0, Math.min(1, container.scrollLeft / maxScroll));
  playhead.style.left = `${window.minimapUToLeft(u)}%`;

  const yearEl = playhead.querySelector('.era-playhead__year');
  if (!yearEl || yearEl.offsetParent === null) return;
  const entries = container.querySelectorAll('.tl-entry[data-date]');
  if (entries.length === 0) return;
  const idx = Math.round(u * (entries.length - 1));
  const date = entries[idx].getAttribute('data-date');
  if (date) {
    yearEl.textContent = String(new Date(date).getUTCFullYear());
  }
};

window.resolveTimelineImg = (src) => {
  if (!src) return '';
  if (src.indexOf('attachment://') === 0) src = src.replace('attachment://', '');
  if (/^(https?:)?\/\//.test(src) || src.indexOf('data:') === 0) return src;
  return window.withBase ? window.withBase(src) : src;
};

window.collectMomentGallery = (moment) => {
  const items = [];
  const seen = {};
  const push = (photo, fallbackAlt) => {
    if (!photo) return;
    const raw = typeof photo === 'string' ? photo : photo.src;
    if (!raw) return;
    const src = window.resolveTimelineImg(raw);
    if (!src || seen[src]) return;
    seen[src] = true;
    items.push({
      src: src,
      alt: (typeof photo === 'string' ? fallbackAlt : photo.alt) || fallbackAlt || '',
      credit: typeof photo === 'string' ? '' : (photo.credit || '')
    });
  };
  if (moment && moment.image) {
    push({ src: moment.image, alt: moment.imageAlt || moment.title, credit: moment.caption || '' }, moment.title);
  }
  (moment && moment.gallery ? moment.gallery : []).forEach((p) => push(p, moment.title));
  return items;
};

window.Footer = ({ handleTimelineClick, selectedId, setSelectedId, selectedTag, selectedYear }) => {
  const [isExpanded, setIsExpanded] = React.useState(
    () => document.documentElement.classList.contains('touch-ui')
  );

  React.useEffect(() => {
    const collapse = () => setIsExpanded(false);
    const expand = () => setIsExpanded(true);
    window.addEventListener('wip-footer-collapse', collapse);
    window.addEventListener('wip-footer-expand', expand);
    return () => {
      window.removeEventListener('wip-footer-collapse', collapse);
      window.removeEventListener('wip-footer-expand', expand);
    };
  }, []);

  // Filter moments by selectedTag and selectedYear
  const filteredMoments = window.momentsInTime.filter(moment => {
    const tagMatch = selectedTag === "All" || moment.tags.includes(selectedTag);
    const yearMatch = selectedYear === "All" || new Date(moment.date).getUTCFullYear().toString() === selectedYear;
    return tagMatch && yearMatch;
  });

  // Group moments by year while preserving original order
  const momentsByYear = filteredMoments.reduce((acc, moment) => {
    const startDate = new Date(moment.date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + moment.stayDuration - 1);
    const startYear = startDate.getUTCFullYear().toString();
    const endYear = endDate.getUTCFullYear().toString();
    
    // Only add moment to its start year
    if (!acc[startYear]) {
      acc[startYear] = [];
    }
    acc[startYear].push(moment);
    
    return acc;
  }, {});

  // Get unique years from filtered moments
  const years = filteredMoments.length > 0 
    ? [...new Set(filteredMoments.map(moment => {
        const startDate = new Date(moment.date);
        return startDate.getUTCFullYear();
      }))].sort((a, b) => a - b)
    : [];

  // Group filtered moments by year, allowing moments to appear in multiple years
  const momentsInTimeByYear = years.reduce((acc, year) => {
    acc[year] = filteredMoments.filter(moment => {
      const startDate = new Date(moment.date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + moment.stayDuration - 1);
      const startYear = startDate.getUTCFullYear();
      const endYear = endDate.getUTCFullYear();
      return year >= startYear && year <= endYear;
    });
    return acc;
  }, {});

  // Update timeline line width to span all entries (runs on layout change and resize/orientation)
  const updateTimelineLineWidth = React.useCallback(() => {
    const timelineLine = document.querySelector('.timeline-rail');
    const entries = document.querySelectorAll('.tl-entry, .tl-year');
    if (timelineLine && entries.length > 0) {
      const totalWidth = Array.from(entries).reduce((acc, entry) => {
        return acc + entry.offsetWidth + 14; // Include margin-right (--entry-gap)
      }, 0) + 22; // Extra padding
      timelineLine.style.width = `${Math.max(100, totalWidth)}px`;
    }
  }, []);

  // UseEffect to dynamically set timeline-line width and scroll to selected moment
  React.useEffect(() => {
    const timeline = document.querySelector('.timeline-track');
    const timelineLine = document.querySelector('.timeline-rail');
    const timelineContainer = document.querySelector('.timeline-scroll');

    const runUpdateLine = () => {
      updateTimelineLineWidth();
    };

    if (timeline && timelineLine) {
      runUpdateLine();
      requestAnimationFrame(runUpdateLine);
      const t = setTimeout(runUpdateLine, 150);
      const onOrientationChange = () => {
        setTimeout(runUpdateLine, 100);
        setTimeout(runUpdateLine, 400);
      };
      window.addEventListener('resize', runUpdateLine);
      window.addEventListener('orientationchange', onOrientationChange);
      return () => {
        clearTimeout(t);
        window.removeEventListener('resize', runUpdateLine);
        window.removeEventListener('orientationchange', onOrientationChange);
      };
    }
  }, [updateTimelineLineWidth, filteredMoments.length, years.length]);

  React.useEffect(() => {
    const container = document.querySelector('.timeline-scroll');
    if (!container) return;
    const scrollToLatest = () => {
      container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
    };
    const t = setTimeout(scrollToLatest, 300);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    const container = document.querySelector('.timeline-scroll');
    if (!container) return;
    let raf = null;
    const isTouch = document.documentElement.classList.contains('touch-ui');
    const cssView = isTouch && window.CSS && (
      CSS.supports('animation-timeline', 'view()')
      || CSS.supports('animation-timeline: view()')
      || CSS.supports('animation-timeline', 'view(inline)')
    );
    const minScale = isTouch ? 0.82 : 0.64;
    let entries = [];
    let slot = 176;
    let lastFocus0 = null;
    let trackOrigin = 0;

    const measure = () => {
      entries = Array.from(container.querySelectorAll('.tl-entry'));
      const track = container.querySelector('.timeline-track');
      trackOrigin = track ? track.offsetLeft : 0;
      if (entries[0]) {
        slot = entries[0].offsetWidth + (parseFloat(getComputedStyle(entries[0]).marginRight) || 64);
      }
      for (let i = 0; i < entries.length; i += 1) {
        const el = entries[i];
        el._center = trackOrigin + el.offsetLeft + el.offsetWidth / 2;
        el._media = el._media || el.querySelector('.tl-entry__media');
      }
      maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    };

    const peakScale = isTouch ? 1.12 : 1.2;
    const range = peakScale - minScale;
    const invTwoSigma = 1 / (2 * 0.9 * 0.9);
    const playhead = document.querySelector('.era-playhead');
    let maxScroll = 0;

    const writeScale = (el, x) => {
      if (el._focusScale === x) return;
      el._focusScale = x;
      if (isTouch) {
        if (el._media) el._media.style.transform = 'translate3d(0,0,0) scale(' + x + ')';
      } else {
        el.style.setProperty('--focus-scale', String(x));
      }
    };

    const updateFocusScales = () => {
      if (entries.length === 0) measure();
      const viewCenter = container.scrollLeft + container.clientWidth / 2;
      const near = slot * 2.2;
      let closest = null;
      let closestDist = Infinity;
      for (let i = 0; i < entries.length; i += 1) {
        const el = entries[i];
        const dist = Math.abs((el._center || 0) - viewCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closest = el;
        }
        if (cssView) continue;
        if (dist > near) {
          writeScale(el, minScale);
          continue;
        }
        const d = dist / slot;
        const x = Math.round((minScale + range * Math.exp(-d * d * invTwoSigma)) * 1000) / 1000;
        writeScale(el, x);
      }
      if (closest !== lastFocus0) {
        if (lastFocus0) lastFocus0.classList.remove('is-focus-0', 'is-focus-1', 'is-focus-2');
        if (closest) closest.classList.add('is-focus-0');
        lastFocus0 = closest;
      }
      if (playhead) {
        if (!maxScroll) maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        const sl = container.scrollLeft;
        const u = maxScroll <= 0 ? 1 : Math.max(0, Math.min(1, sl / maxScroll));
        playhead.style.left = window.minimapUToLeft(u) + '%';
      }
    };

    let lastScrollLeft = -1;
    let idleFrames = 0;
    const tick = () => {
      updateFocusScales();
      const sl = container.scrollLeft;
      if (sl === lastScrollLeft) {
        idleFrames += 1;
        if (idleFrames > 12) {
          raf = null;
          return;
        }
      } else {
        idleFrames = 0;
        lastScrollLeft = sl;
      }
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      idleFrames = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onResize = () => { measure(); kick(); };
    measure();
    updateFocusScales();
    container.addEventListener('scroll', kick, { passive: true });
    container.addEventListener('touchstart', kick, { passive: true });
    window.addEventListener('resize', onResize);
    const t = setTimeout(() => { measure(); updateFocusScales(); }, 200);
    return () => {
      container.removeEventListener('scroll', kick);
      container.removeEventListener('touchstart', kick);
      window.removeEventListener('resize', onResize);
      clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [filteredMoments.length, years.length, selectedId]);

  React.useEffect(() => {
    const timelineContainer = document.querySelector('.timeline-scroll');
    if (!timelineContainer) return;

    const dismissPopover = () => {
      if (document.querySelector('.popover-backdrop')) return;
      if (window.setPopoverContent) window.setPopoverContent(null);
    };

    timelineContainer.addEventListener('scroll', dismissPopover, { passive: true });

    if (selectedId) {
      const selectedEntry = document.querySelector(`.tl-entry[data-id="${selectedId}"]`);
      if (selectedEntry) {
        const entryRect = selectedEntry.getBoundingClientRect();
        const containerRect = timelineContainer.getBoundingClientRect();
        const scrollOffset = entryRect.left + (entryRect.width / 2) - (containerRect.width / 2);
        timelineContainer.scrollTo({
          left: timelineContainer.scrollLeft + scrollOffset,
          behavior: 'smooth'
        });
      }
    }

    return () => {
      timelineContainer.removeEventListener('scroll', dismissPopover);
    };
  }, [selectedId]);

  React.useEffect(() => {
    let dir = 0;
    let raf = null;
    let lastTs = 0;
    let holdTimer = null;
    const pxPerSec = 920;
    const holdDelay = 200;

    const getContainer = () => document.querySelector('.timeline-scroll');

    const setSnap = (on) => {
      const container = getContainer();
      if (!container) return;
      container.style.scrollSnapType = on ? '' : 'none';
    };

    const stepOneCard = (stepDir) => {
      const container = getContainer();
      if (!container) return;
      const entries = Array.from(container.querySelectorAll('.tl-entry'));
      if (entries.length === 0) return;
      const current = container.querySelector('.tl-entry.is-focus-0') || entries[0];
      const idx = entries.indexOf(current);
      const next = entries[Math.max(0, Math.min(entries.length - 1, idx + stepDir))];
      if (!next || next === current) return;
      const entryRect = next.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      container.scrollTo({
        left: container.scrollLeft + entryRect.left + entryRect.width / 2 - containerRect.width / 2,
        behavior: 'smooth'
      });
    };

    const tick = (now) => {
      const container = getContainer();
      if (!container || dir === 0) {
        raf = null;
        lastTs = 0;
        return;
      }
      const dt = lastTs ? Math.min(0.05, (now - lastTs) / 1000) : 1 / 60;
      lastTs = now;
      container.scrollLeft += dir * pxPerSec * dt;
      raf = requestAnimationFrame(tick);
    };

    const isTyping = (event) => {
      const tag = event.target && event.target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (event.target && event.target.isContentEditable);
    };

    const onKeyDown = (event) => {
      if (isTyping(event)) return;
      if (document.body.classList.contains('comic-is-open')) return;
      if (document.querySelector('.popover-backdrop')) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if (event.repeat) return;
        dir = event.key === 'ArrowRight' ? 1 : -1;
        if (holdTimer) clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          holdTimer = null;
          setSnap(false);
          lastTs = 0;
          if (!raf) raf = requestAnimationFrame(tick);
        }, holdDelay);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const current = document.querySelector('.tl-entry.is-focus-0');
        if (current) current.click();
      }
    };

    const onKeyUp = (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const wasDir = dir;
      if ((event.key === 'ArrowRight' && dir === 1) || (event.key === 'ArrowLeft' && dir === -1)) {
        dir = 0;
      }
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
        if (wasDir !== 0) stepOneCard(wasDir);
      }
      setSnap(true);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dir = 0;
      if (holdTimer) clearTimeout(holdTimer);
      setSnap(true);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [handleTimelineClick]);

  // Pointer-driven scrub (desktop) + swipe to reveal eras (touch).
  React.useEffect(() => {
    const bandWrap = document.querySelector('.era-band-wrap');
    const footer = document.querySelector('.wip-footer');
    if (!footer) return;

    const isTouch = document.documentElement.classList.contains('touch-ui');
    const PEEK = 280;

    let bandPointerId = null;
    let bandStartX = 0;
    let bandStartY = 0;
    let bandDragging = false;

    const bandScrubTo = (clientX, smooth) => {
      const rect = bandWrap.getBoundingClientRect();
      if (rect.width <= 0) return;
      const leftPercent = ((clientX - rect.left) / rect.width) * 100;
      window.scrubTimelineToMinimapU(window.minimapLeftToU(leftPercent), smooth);
    };

    const onBandPointerDown = (event) => {
      if (isTouch && footer.classList.contains('is-expanded')) return;
      event.stopPropagation();
      if (bandPointerId !== null) return;
      bandPointerId = event.pointerId;
      bandStartX = event.clientX;
      bandStartY = event.clientY;
      bandDragging = false;
      try { bandWrap.setPointerCapture(event.pointerId); } catch (_) {}
      bandScrubTo(event.clientX, true);
    };

    const onBandPointerMove = (event) => {
      if (event.pointerId !== bandPointerId) return;
      event.stopPropagation();
      const dx = event.clientX - bandStartX;
      const dy = event.clientY - bandStartY;
      if (!bandDragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        bandDragging = Math.abs(dx) >= Math.abs(dy);
      }
      if (bandDragging) bandScrubTo(event.clientX, false);
    };

    const onBandPointerUp = (event) => {
      if (event.pointerId !== bandPointerId) return;
      event.stopPropagation();
      try { bandWrap.releasePointerCapture(event.pointerId); } catch (_) {}
      bandPointerId = null;
      bandDragging = false;
    };

    let swipePointerId = null;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let axis = null;
    let sheetDragging = false;
    let sheetStartOffset = 0;
    let lastY = 0;
    let lastT = 0;
    let velY = 0;

    const collapsedOffset = () => Math.max(1, footer.offsetHeight - PEEK);

    const applySheetOffset = (y) => {
      const max = collapsedOffset();
      const clamped = Math.max(0, Math.min(max, y));
      footer.style.transition = 'none';
      footer.style.transform = 'translateY(' + clamped + 'px)';
      return clamped;
    };

    const finishSheet = () => {
      if (!sheetDragging) {
        swipePointerId = null;
        axis = null;
        return;
      }
      const max = collapsedOffset();
      const offset = parseFloat(footer.style.transform.replace(/[^\d.-]/g, '')) || 0;
      const progress = 1 - offset / max;
      const expand = velY < -0.45 ? true : velY > 0.45 ? false : progress > 0.38;
      footer.style.transition = 'transform 0.62s cubic-bezier(0.32, 0.72, 0, 1)';
      footer.style.transform = expand ? 'translateY(0px)' : 'translateY(' + max + 'px)';
      const settle = () => {
        footer.style.transition = '';
        footer.style.transform = '';
        footer.removeEventListener('transitionend', settle);
      };
      footer.addEventListener('transitionend', settle);
      setIsExpanded(expand);
      sheetDragging = false;
      swipePointerId = null;
      axis = null;
      velY = 0;
    };

    const onSheetMove = (clientX, clientY, event) => {
      const dx = clientX - swipeStartX;
      const dy = clientY - swipeStartY;
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
        if (axis === 'y') {
          sheetDragging = true;
          sheetStartOffset = footer.classList.contains('is-expanded') ? 0 : collapsedOffset();
          lastY = clientY;
          lastT = performance.now();
        }
      }
      if (axis !== 'y') return;
      if (event && event.cancelable) event.preventDefault();
      const now = performance.now();
      velY = (clientY - lastY) / Math.max(1, now - lastT);
      lastY = clientY;
      lastT = now;
      applySheetOffset(sheetStartOffset + dy);
    };

    const onFooterPointerDown = (event) => {
      if (swipePointerId !== null) return;
      swipePointerId = event.pointerId;
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
      axis = null;
      sheetDragging = false;
      velY = 0;
    };

    const onFooterPointerMove = (event) => {
      if (event.pointerId !== swipePointerId) return;
      onSheetMove(event.clientX, event.clientY, event);
    };

    const onFooterTouchMove = (event) => {
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      if (swipePointerId === null) {
        swipePointerId = 'touch';
        swipeStartX = touch.clientX;
        swipeStartY = touch.clientY;
        axis = null;
        sheetDragging = false;
      }
      onSheetMove(touch.clientX, touch.clientY, event);
    };

    const onFooterPointerUp = (event) => {
      if (event.pointerId !== swipePointerId && swipePointerId !== 'touch') return;
      finishSheet();
    };

    const onFooterTouchEnd = () => {
      finishSheet();
    };

    footer.addEventListener('pointerdown', onFooterPointerDown, true);
    footer.addEventListener('pointermove', onFooterPointerMove, true);
    footer.addEventListener('pointerup', onFooterPointerUp, true);
    footer.addEventListener('pointercancel', onFooterPointerUp, true);
    footer.addEventListener('touchmove', onFooterTouchMove, { capture: true, passive: false });
    footer.addEventListener('touchend', onFooterTouchEnd, true);
    footer.addEventListener('touchcancel', onFooterTouchEnd, true);

    if (bandWrap) {
      bandWrap.addEventListener('pointerdown', onBandPointerDown);
      bandWrap.addEventListener('pointermove', onBandPointerMove);
      bandWrap.addEventListener('pointerup', onBandPointerUp);
      bandWrap.addEventListener('pointercancel', onBandPointerUp);
    }

    return () => {
      footer.removeEventListener('pointerdown', onFooterPointerDown, true);
      footer.removeEventListener('pointermove', onFooterPointerMove, true);
      footer.removeEventListener('pointerup', onFooterPointerUp, true);
      footer.removeEventListener('pointercancel', onFooterPointerUp, true);
      footer.removeEventListener('touchmove', onFooterTouchMove, true);
      footer.removeEventListener('touchend', onFooterTouchEnd, true);
      footer.removeEventListener('touchcancel', onFooterTouchEnd, true);
      if (bandWrap) {
        bandWrap.removeEventListener('pointerdown', onBandPointerDown);
        bandWrap.removeEventListener('pointermove', onBandPointerMove);
        bandWrap.removeEventListener('pointerup', onBandPointerUp);
        bandWrap.removeEventListener('pointercancel', onBandPointerUp);
      }
    };
  }, []);

  // Helper function for tooltip full date
  const formatFullDateRange = (startDate, duration) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration - 1);
    const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
    return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}`;
  };

  // Era for a given year
  const ERA_DEFS = [
    { key: 'varna',       label: 'Varna',       years: "'88–'94",          start: '1988-01-01', end: '1994-11-23' },
    { key: 'sofia',       label: 'Sofia',       years: "'94–'04",          start: '1994-11-24', end: '2004-07-31' },
    { key: 'osseo',       label: 'Osseo',       years: "'04",              start: '2004-08-01', end: '2005-01-31' },
    { key: 'chicago',     label: 'Chicago',     years: "'05–'21",          start: '2005-02-01', end: '2021-12-31' },
    { key: 'medellin',    label: 'Medellín',    years: "'22",              start: '2022-07-01', end: '2022-12-31' },
    { key: 'florida',     label: 'Florida',     years: "Jan–Aug '23",      start: '2023-01-01', end: '2023-08-08' },
    { key: 'odyssey',     label: 'Odyssey',     years: "Aug–Oct '23",      start: '2023-08-09', end: '2023-10-31' },
    { key: 'americas',    label: 'Americas',    years: "May '24–Aug '25",  start: '2024-05-01', end: '2025-08-12' },
    { key: 'runner',      label: 'Runner',      years: "Aug–Sep '25",      start: '2025-08-13', end: '2025-09-23' },
    { key: 'return',      label: 'Return',      years: "Sep–Nov '25",      start: '2025-09-24', end: '2025-11-03' },
    { key: 'islands',     label: 'Islands',     years: "Nov '25–Feb '26",  start: '2025-11-04', end: '2026-02-27' },
    { key: 'sovereignty', label: 'Sovereign',   years: "Feb '26–",         start: '2026-02-28', end: '2026-12-31' }
  ];
  window.ERA_DEFS = ERA_DEFS;
  const eraForDate = (dateStr) => {
    const d = new Date(dateStr).getTime();
    for (const era of ERA_DEFS) {
      if (d >= new Date(era.start).getTime() && d <= new Date(era.end).getTime()) return era.label;
    }
    return 'Nomad';
  };
  const eraKeyForDate = (dateStr) => {
    const d = new Date(dateStr).getTime();
    for (const era of ERA_DEFS) {
      if (d >= new Date(era.start).getTime() && d <= new Date(era.end).getTime()) return era.key;
    }
    return 'nomad';
  };

  // ISO 3166-ish country / US-state code map for the short location badge
  const COUNTRY_CODES = {
    'bulgaria': 'BG', 'greece': 'GR', 'lebanon': 'LB', 'jordan': 'JO',
    'turkey': 'TR', 'thailand': 'TH', 'vietnam': 'VN', 'philippines': 'PH',
    'indonesia': 'ID', 'spain': 'ES', 'portugal': 'PT', 'mexico': 'MX',
    'colombia': 'CO', 'brazil': 'BR', 'singapore': 'SG',
    'united arab emirates': 'AE', 'japan': 'JP',
    'texas': 'TX', 'colorado': 'CO', 'florida': 'FL', 'california': 'CA',
    'illinois': 'IL', 'wisconsin': 'WI', 'louisiana': 'LA', 'utah': 'UT',
    'hawaii': 'HI', 'tennessee': 'TN'
  };
  const shortLocation = (name) => {
    if (!name) return '';
    const parts = name.split(',').map(s => s.trim());
    if (parts.length < 2) return name;
    const city = parts[0];
    const region = parts.slice(1).join(',').trim();
    const key = region.toLowerCase();
    const code = COUNTRY_CODES[key];
    if (code) return `${city}, ${code}`;
    if (region.length <= 3) return `${city}, ${region}`;
    return `${city}, ${region}`;
  };

  // Short month + 2-digit year: "Nov '88"
  const formatShortMonthYear = (dateStr) => {
    const d = new Date(dateStr);
    const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${month} ${d.getUTCDate()}`;
  };

  // Short duration from formattedDuration: "6 years" -> "6 yrs", "30 d" stays, "1 day" -> "1 d"
  const formatShortDuration = (formattedDuration) => {
    if (!formattedDuration) return '';
    const s = String(formattedDuration);
    return s
      .replace(/\byears?\b/gi, 'yrs')
      .replace(/\bmonths?\b/gi, 'mo')
      .replace(/\bdays?\b/gi, 'd')
      .replace(/\band\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Resolve an image URL the same way the old render did (attachment:// -> withBase)
  const resolveImg = (src) => {
    if (!src) return '';
    if (src.indexOf('attachment://') === 0) src = src.replace('attachment://', '');
    if (/^(https?:)?\/\//.test(src) || src.indexOf('data:') === 0) return src;
    return window.withBase ? window.withBase(src) : src;
  };

  // Jump the timeline scroll to the first entry of a given year
  const jumpToYear = (year) => {
    const container = document.querySelector('.timeline-scroll');
    if (!container) return;
    const target = document.querySelector(`.tl-year[data-year="${year}"]`) ||
                   document.querySelector(`.tl-entry[data-year="${year}"]`);
    if (target) {
      const targetRect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset = targetRect.left + (targetRect.width / 2) - (containerRect.width / 2);
      container.scrollTo({ left: container.scrollLeft + offset, behavior: 'smooth' });
    }
  };

  // Jump to the first entry of an era (by its starting year)
  const jumpToEra = (year) => jumpToYear(year);

  // Era definitions for the minimap
  const ERAS = ERA_DEFS;

  // Years that get a tick on the minimap (every year that has entries, deduped)
  const minimapYears = years.length > 0
    ? [...new Set(years)].sort((a, b) => a - b)
    : [];
  const minYear = minimapYears.length > 0 ? minimapYears[0] : 1988;
  const maxYear = minimapYears.length > 0 ? minimapYears[minimapYears.length - 1] : 2026;
  const yearToPercent = (y) => window.YEAR_TICK_POS[y] != null ? window.YEAR_TICK_POS[y] : 50;

  // Determine the active era based on the currently selected moment
  const selectedMoment = selectedId && (
    filteredMoments.find((x) => x.id === selectedId) ||
    (window.momentsInTime || []).find((x) => x.id === selectedId)
  );
  const playheadMoment = selectedMoment || (filteredMoments.length ? filteredMoments[filteredMoments.length - 1] : null);
  const activeEraKey = playheadMoment ? eraKeyForDate(playheadMoment.date) : 'nomad';
  const playheadPercent = playheadMoment ? window.minimapDateToPercent(playheadMoment.date) : null;
  const playheadYear = playheadMoment ? new Date(playheadMoment.date).getUTCFullYear() : null;

  return React.createElement(
    'footer',
    { className: 'wip-footer' + (isExpanded ? ' is-expanded' : '') },

    React.createElement(
      'div',
      { className: 'timeline-scroll' },
      React.createElement(
        'div',
        { className: 'timeline-track' },
        React.createElement('div', { className: 'timeline-rail' }),
        filteredMoments.length === 0
          ? React.createElement('div', { className: 'timeline-empty' }, 'No adventures found for the selected filters')
          : years.map((year, index) => {
              const yearMoments = momentsByYear[year] || [];
              if (yearMoments.length === 0) return null;
              return [
                React.createElement(
                  'div',
                  {
                    key: `year-${year}`,
                    className: 'tl-year',
                    'data-year': year,
                    style: { '--i': index }
                  },
                  React.createElement('div', { className: 'tl-year__label' }, String(year)),
                  React.createElement('div', { className: 'tl-year__node' },
                    React.createElement('div', { className: 'tl-year__dot' })
                  )
                ),
                ...yearMoments.map((moment, mIdx) => {
                  const fullDateRange = formatFullDateRange(moment.date, moment.stayDuration);
                  const isComic = moment.isComic && moment.fullLink !== '#';
                  const isPost = !moment.isComic && moment.fullLink !== '#';
                  const coverThumb = isComic
                    ? resolveImg((moment.cover || moment.fullLink.replace(/\/$/, '') + '/cover.webp').replace(/cover\.webp$/, 'cover-thumb.webp'))
                    : null;
                  const coverFull = isComic
                    ? resolveImg(moment.cover || (moment.fullLink.replace(/\/$/, '') + '/cover.webp'))
                    : null;
                  const imgSrc = coverThumb || resolveImg(moment.image);

                  return React.createElement(
                    'article',
                    {
                      key: `${moment.id}-${year}`,
                      className: `tl-entry ${isComic ? 'tl-entry--comic' : ''} ${selectedId === moment.id ? 'selected' : ''}`,
                      'data-id': moment.id,
                      'data-year': year,
                      'data-date': new Date(moment.date).toISOString(),
                      onClick: () => { handleTimelineClick(moment); },
                      style: { '--i': index + 1 + mIdx }
                    },

                    React.createElement(
                      'div',
                      { className: 'tl-entry__media' },
                      isComic && React.createElement('span', { className: 'comic-ribbon' }, 'Comic'),
                      isPost && !moment.image && React.createElement('span', { className: 'tl-entry__post-badge' }, 'Read'),
                      imgSrc
                        ? React.createElement('img', {
                            src: window.imageUrl(imgSrc),
                            decoding: 'async',
                            alt: moment.imageAlt || moment.title,
                            width: 185,
                            height: 310,
                            decoding: 'async',
                            loading: 'lazy',
                            onError: function(e) {
                              if (coverThumb && e.target.getAttribute('src') === window.imageUrl(coverThumb) && coverFull) {
                                e.target.src = window.imageUrl(coverFull);
                              } else {
                                var media = e.target.parentElement;
                                if (media) media.classList.add('tl-entry__media-fallback');
                                e.target.style.display = 'none';
                              }
                            }
                          })
                        : React.createElement('div', { className: 'tl-entry__placeholder' }, '✦'),
                      React.createElement(
                        'div',
                        { className: 'tl-entry__card' },
                        React.createElement(
                          'div',
                          { className: 'tl-entry__title', title: fullDateRange },
                          moment.timelineHighlight || moment.title
                        ),
                        React.createElement(
                          'div',
                          { className: 'tl-entry__meta' },
                          React.createElement('span', { className: 'tl-entry__loc' }, shortLocation(moment.location && moment.location.name)),
                          !isComic && React.createElement('span', { className: 'tl-entry__meta-sep' }),
                          !isComic && React.createElement('span', null, formatShortDuration(moment.formattedDuration))
                        )
                      )
                    ),

                    React.createElement('div', { className: 'tl-entry__node' },
                      React.createElement('div', { className: 'tl-entry__dot' }),
                      React.createElement('div', { className: 'tl-entry__date' }, formatShortMonthYear(moment.date))
                    )
                  );
                })
              ];
            }).flat()
      )
    ),

    React.createElement(
      'div',
      { className: 'era-minimap', role: 'navigation', 'aria-label': 'Lifetime eras' },
      React.createElement(
        'div',
        { className: 'era-ticks' },
        minimapYears.map(y => React.createElement(
          'button',
          {
            key: `tick-${y}`,
            type: 'button',
            className: `era-tick ${selectedId && new Date((filteredMoments.find(m => m.id === selectedId) || {}).date || new Date()).getUTCFullYear() === y ? 'is-current' : ''}`,
            style: { left: `${yearToPercent(y)}%` },
            onClick: (event) => {
              event.stopPropagation();
              window.scrubTimelineToMinimapU(window.minimapLeftToU(yearToPercent(y)), true);
            },
            'aria-label': `Jump to ${y}`
          },
          String(y)
        ))
      ),
      React.createElement(
        'div',
        {
          className: 'era-band-wrap',
          style: { touchAction: document.documentElement.classList.contains('touch-ui') ? 'pan-x' : 'none' },
          onClick: (event) => {
            if (document.documentElement.classList.contains('touch-ui')) return;
            window.scrubTimelineToMinimapEvent(event);
          }
        },
        React.createElement(
          'div',
          { className: 'era-band' },
          ...ERAS.map(era => React.createElement(
            'button',
            {
              key: era.key,
              type: 'button',
              className: `era-seg era-seg--${era.key} ${activeEraKey === era.key ? 'active' : ''}`,
              onClick: (event) => {
                event.stopPropagation();
                const pct = window.minimapDateToPercent(era.start);
                window.scrubTimelineToMinimapU(window.minimapLeftToU(pct), true);
              },
              'aria-label': `Jump to ${era.label}`
            },
            React.createElement('span', { className: 'era-seg__label' }, era.label),
            React.createElement('span', { className: 'era-seg__years' }, era.years)
          ))
        ),
        playheadPercent != null && React.createElement(
          'div',
          {
            className: 'era-playhead',
            style: { left: `${playheadPercent}%` },
            title: playheadMoment ? `Now: ${playheadMoment.title}` : undefined,
            'aria-hidden': true
          },
          playheadYear != null && React.createElement('span', { className: 'era-playhead__year' }, String(playheadYear))
        )
      )
    )
  );
};