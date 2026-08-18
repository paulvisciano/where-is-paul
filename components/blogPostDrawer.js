window.buildOpenStreetMapEmbedUrl = (lat, lng, deltaDeg) => {
  const d = deltaDeg == null ? 0.06 : deltaDeg;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
};

window.BlogPostDrawer = ({ content, onClose }) => {
  // If there's an image, we want to remove the title from the content since it's already shown in the title bar
  const processedContent = content && content.image ? {
    ...content,
    content: content.content.replace(/<h2>[^<]*<\/h2>/, '') // Remove the first h2 tag which is typically the title
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
          onClick: () => {
            onClose();
            window.setBlogPostContent(null);
          }
        },
        '×'
      ),
      content && content.image && React.createElement(
        'div',
        { key: 'cover', className: 'blog-post-cover' },
        React.createElement('img', {
          src: content.image,
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
