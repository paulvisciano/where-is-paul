window.buildOpenStreetMapEmbedUrl = (lat, lng, deltaDeg) => {
  const d = deltaDeg == null ? 0.06 : deltaDeg;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
};

window.extractPostPlaceNames = (html) => {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const names = [];
  const seen = new Set();
  Array.from(doc.querySelectorAll('a')).forEach((a) => {
    const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 3 || text.length > 80) return;
    if (/^(here|click|read|link|map|website)$/i.test(text)) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    names.push(text);
  });
  return names;
};

window.geocodePostPlace = async (name, loc) => {
  const query = loc && loc.name ? `${name}, ${loc.name}` : name;
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');
  if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    url.searchParams.set('lat', String(loc.lat));
    url.searchParams.set('lon', String(loc.lng));
  }
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data && data.features && data.features[0];
  if (!feature || !feature.geometry || !feature.geometry.coordinates) return null;
  const lng = feature.geometry.coordinates[0];
  const lat = feature.geometry.coordinates[1];
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng, name: (feature.properties && feature.properties.name) || name };
};

window.VisitMap = ({ html, location }) => {
  const mapEl = React.useRef(null);

  React.useEffect(() => {
    const L = window.L;
    const el = mapEl.current;
    if (!L || !el) return undefined;

    let cancelled = false;
    const map = L.map(el, {
      scrollWheelZoom: false,
      attributionControl: true,
      zoomControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const hasCity = location && typeof location.lat === 'number' && typeof location.lng === 'number';
    if (hasCity) {
      map.setView([location.lat, location.lng], 13);
    } else {
      map.setView([20, 0], 2);
    }

    const addPin = (place, current) => {
      const marker = L.circleMarker([place.lat, place.lng], {
        radius: current ? 8 : 6,
        color: '#ffa500',
        fillColor: '#ffa500',
        fillOpacity: current ? 1 : 0.85,
        weight: 2
      }).addTo(map);
      marker.bindTooltip(place.name, {
        direction: 'top',
        opacity: 0.95,
        className: 'blog-visit-map-tooltip'
      });
    };

    const fit = (points) => {
      if (!points.length) return;
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], 14);
        return;
      }
      map.fitBounds(
        points.map((p) => [p.lat, p.lng]),
        { padding: [32, 32], maxZoom: 15, animate: false }
      );
    };

    const run = async () => {
      const names = window.extractPostPlaceNames(html);
      const pins = [];
      for (let i = 0; i < names.length; i += 1) {
        if (cancelled) return;
        try {
          const hit = await window.geocodePostPlace(names[i], location);
          if (hit) pins.push({ ...hit, name: names[i] });
        } catch (err) {
          console.warn('Place geocode failed:', names[i], err);
        }
      }
      if (cancelled) return;
      if (!pins.length && hasCity) {
        pins.push({ lat: location.lat, lng: location.lng, name: location.name || 'This stop' });
      }
      pins.forEach((p, idx) => addPin(p, idx === 0));
      fit(pins);
      map.invalidateSize();
    };

    run();

    const resize = () => map.invalidateSize();
    const t1 = setTimeout(resize, 80);
    const t2 = setTimeout(resize, 650);
    window.addEventListener('resize', resize);

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', resize);
      map.remove();
    };
  }, [html, location && location.lat, location && location.lng, location && location.name]);

  return React.createElement(
    'div',
    { className: 'blog-visit-map-wrap' },
    React.createElement('div', { className: 'blog-visit-map-label' }, 'In this post'),
    React.createElement('div', { className: 'blog-visit-map', ref: mapEl })
  );
};

window.PostEraGallery = ({ photos }) => {
  const items = (photos || []).slice(0, 5);
  if (items.length < 2) return null;
  return React.createElement(
    'div',
    { className: 'era-gallery' },
    React.createElement('p', { className: 'era-gallery__label' }, 'From that time'),
    React.createElement(
      'div',
      { className: 'era-gallery__track' },
      items.map(function (photo, i) {
        return React.createElement(
          'figure',
          { key: photo.src + i, className: 'era-gallery__frame' },
          React.createElement('img', {
            src: window.imageUrl(photo.src),
            alt: photo.alt || '',
            loading: 'lazy',
            decoding: 'async',
            onError: function (err) {
              var frame = err.target.closest('.era-gallery__frame');
              if (frame) frame.style.display = 'none';
            }
          }),
          React.createElement(
            'figcaption',
            null,
            [photo.alt, photo.credit].filter(Boolean).join(' — ')
          )
        );
      })
    )
  );
};

window.BlogPostDrawer = ({ content, onClose }) => {
  const closeDrawer = () => {
    const postId = content && content.postId;
    onClose();
    if (typeof window.setBlogPostContent === 'function') {
      window.setBlogPostContent(null);
    }
    const moment = postId && (window.momentsInTime || []).find((m) => m.id === postId);
    if (moment && typeof window.showMomentCard === 'function') {
      window.showMomentCard(moment);
    }
  };

  React.useEffect(() => {
    if (!content) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [content, onClose]);

  const processedContent = content ? {
    ...content,
    content: content.content ? content.content.replace(/<h2>[^<]*<\/h2>/, '') : content.content
  } : content;

  const travelComic = processedContent && processedContent.travelLogComicLayout === true;
  const loc = processedContent && processedContent.location;
  const hasMapCoords = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
  const mapEmbedUrl = travelComic && hasMapCoords ? window.buildOpenStreetMapEmbedUrl(loc.lat, loc.lng) : null;

  const bodyBlock = processedContent && React.createElement('div', {
    key: 'content',
    className: travelComic ? 'blog-post-body travel-log-comic__body' : 'blog-post-body',
    dangerouslySetInnerHTML: { __html: processedContent.content }
  });

  const mapPanel = mapEmbedUrl && React.createElement(
    'div',
    { key: 'map-panel', className: 'travel-log-comic__map-panel' },
    React.createElement('div', { className: 'travel-log-comic__map-ribbon' }, 'LOCATOR MAP'),
    React.createElement('div', { className: 'travel-log-comic__map-frame' },
      React.createElement('iframe', {
        title: loc.name ? `Map: ${loc.name}` : 'OpenStreetMap location',
        className: 'travel-log-comic__map-iframe',
        src: mapEmbedUrl,
        loading: 'lazy',
        referrerPolicy: 'no-referrer-when-downgrade',
        allowFullScreen: true
      })
    ),
    loc.name && React.createElement('p', { className: 'travel-log-comic__map-caption' }, loc.name)
  );

  const storySection = travelComic
    ? React.createElement(
      'div',
      { key: 'travel-comic-wrap', className: 'travel-log-comic' },
      mapPanel,
      React.createElement('div', { className: 'travel-log-comic__story-panels' },
        React.createElement('div', { className: 'travel-log-comic__story-ribbon' }, 'TRAVEL LOG'),
        bodyBlock
      ),
      processedContent.mapLink && React.createElement(
        'a',
        {
          key: 'map',
          href: processedContent.mapLink,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'map-link travel-log-comic__external-map'
        },
        processedContent.mapText || 'Open full map'
      )
    )
    : bodyBlock;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      {
        className: `blog-post-backdrop ${content ? 'open' : ''}`,
        onClick: onClose
      }
    ),
    React.createElement(
      'div',
      {
        className: `blog-post-drawer ${content ? 'open' : ''}${travelComic ? ' blog-post-drawer--travel-comic' : ''}`,
        ref: window.blogDrawerRef
      },
      React.createElement(
        'button',
        {
          className: 'close-button',
          onClick: closeDrawer
        },
        '×'
      ),
      content && content.image && React.createElement(
        'div',
        { key: 'cover', className: 'blog-post-cover' },
        React.createElement('img', {
          src: window.imageUrl(content.image),
          decoding: 'async',
          alt: content.imageAlt,
          className: 'blog-post-cover-image',
          style: content.image.includes('03-20-sofia-childhood.jpg') ? { objectFit: 'scale-down', objectPosition: 'center' } : undefined
        }),
        React.createElement(
          'div',
          { className: 'blog-post-title-bar' },
          React.createElement('h1', { className: 'blog-post-title' }, content.title)
        )
      ),
      React.createElement(
        'div',
        { className: 'blog-post-drawer-content' },
        window.isLoading && React.createElement('p', null, 'Loading...'),
        window.error && React.createElement('p', { style: { color: 'red' } }, window.error),
        processedContent && [
          !content.image && processedContent.title && React.createElement(
            'h1',
            { key: 'page-title', className: 'blog-post-title blog-post-title--page' },
            processedContent.title
          ),
          !travelComic && !processedContent.isComic && !processedContent.isInteractive && React.createElement(
            window.VisitMap,
            {
              key: 'visit-map',
              html: processedContent.content,
              location: processedContent.location
            }
          ),
          processedContent.caption && React.createElement(
            'p',
            { key: 'caption', className: 'caption' },
            processedContent.caption
          ),
          storySection,
          processedContent.title && processedContent.title.includes('Urban Runner') && React.createElement('div', {
            key: 'episode-nav',
            id: 'episode-navigation-container',
            style: { marginTop: '2rem' }
          }),
          !travelComic && processedContent.mapLink && React.createElement(
            'a',
            {
              key: 'map',
              href: processedContent.mapLink,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'map-link'
            },
            processedContent.mapText
          )
        ]
      )
    )
  );
};
