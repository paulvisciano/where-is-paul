window.Footer = ({ handleTimelineClick, selectedId, setSelectedId, selectedTag, selectedYear }) => {
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

  // UseEffect to dynamically set timeline-line width and scroll to selected moment
  React.useEffect(() => {
    const timeline = document.querySelector('.timeline');
    const timelineLine = document.querySelector('.timeline-line');
    const timelineContainer = document.querySelector('.timeline-container');
    
    if (timeline && timelineLine) {
      const entries = document.querySelectorAll('.timeline-entry, .timeline-year-entry');
      const totalWidth = Array.from(entries).reduce((acc, entry) => {
        return acc + entry.offsetWidth + 32; // Include margin-right (32px)
      }, 0) + 32; // Extra padding
      timelineLine.style.width = `${totalWidth}px`;
    }

    let touchStartX = null;
    let lastTouchX = null;
    let lastTouchTime = null;
    let touchVelocity = 0;
    let momentumAnimation = null;
    let isDragging = false;
    let initialAltitude = null;
    let lastInteractionTime = Date.now();

    // Handle scroll events to rotate the globe
    const handleScroll = (event) => {
      if (!window.globeInstance) return;
      
      const scrollDelta = event.deltaX || event.deltaY;
      if (scrollDelta === 0) return;

      // Dismiss popover if present
      if (window.setPopoverContent) {
        window.setPopoverContent(null);
      }
      if (window.setSelectedId) {
        window.setSelectedId(null);
      }

      lastInteractionTime = Date.now();
      const currentPOV = window.globeInstance.pointOfView();
      const rotationSpeed = 0.15; // Slightly reduced for smoother rotation
      const zoomSpeed = 0.001; // Base zoom speed
      // Scroll right (positive delta) = going to future = rotate west (negative)
      // Scroll left (negative delta) = going to past = rotate east (positive)
      const newLng = currentPOV.lng + (scrollDelta > 0 ? -rotationSpeed : rotationSpeed);
      const newAltitude = Math.min(3.5, currentPOV.altitude + zoomSpeed); // Zoom out slightly, max altitude of 3.5
      
      window.globeInstance.pointOfView({
        lat: currentPOV.lat,
        lng: newLng,
        altitude: newAltitude
      }, 0);
    };

    // Handle touch events for mobile
    const handleTouchStart = (event) => {
      // Dismiss popover if present
      if (window.setPopoverContent) {
        window.setPopoverContent(null);
      }
      if (window.setSelectedId) {
        window.setSelectedId(null);
      }

      touchStartX = event.touches[0].clientX;
      lastTouchX = touchStartX;
      lastTouchTime = Date.now();
      lastInteractionTime = Date.now();
      touchVelocity = 0;
      isDragging = true;
      
      // Store initial altitude for smooth zoom return
      if (window.globeInstance) {
        initialAltitude = window.globeInstance.pointOfView().altitude;
      }
      
      // Cancel any ongoing momentum animation
      if (momentumAnimation) {
        cancelAnimationFrame(momentumAnimation);
        momentumAnimation = null;
      }
    };

    const handleTouchMove = (event) => {
      if (!window.globeInstance || !touchStartX || !isDragging) return;

      // Dismiss popover if present
      if (window.setPopoverContent) {
        window.setPopoverContent(null);
      }
      if (window.setSelectedId) {
        window.setSelectedId(null);
      }

      lastInteractionTime = Date.now();
      const currentTouchX = event.touches[0].clientX;
      const currentTime = Date.now();
      const deltaX = currentTouchX - lastTouchX;
      const deltaTime = currentTime - lastTouchTime;
      
      // Calculate velocity (pixels per millisecond)
      touchVelocity = deltaTime > 0 ? deltaX / deltaTime : 0;
      
      lastTouchX = currentTouchX;
      lastTouchTime = currentTime;

      const currentPOV = window.globeInstance.pointOfView();
      const rotationSpeed = 0.15; // Slightly reduced for smoother rotation
      const zoomSpeed = 0.001; // Base zoom speed
      const isMobile = window.innerWidth <= 640;
      const mobileZoomMultiplier = 8; // Dramatic zoom effect on mobile
      const effectiveZoomSpeed = isMobile ? zoomSpeed * mobileZoomMultiplier : zoomSpeed;
      
      // Calculate zoom based on drag speed
      const dragSpeed = Math.abs(touchVelocity);
      const speedBasedZoom = Math.min(0.01, dragSpeed * 0.0001); // Cap the zoom speed
      
      // Drag right (positive delta) = going to future = rotate west (negative)
      // Drag left (negative delta) = going to past = rotate east (positive)
      const newLng = currentPOV.lng + (deltaX > 0 ? -rotationSpeed : rotationSpeed);
      const newAltitude = Math.min(3.5, currentPOV.altitude + effectiveZoomSpeed + speedBasedZoom);
      
      window.globeInstance.pointOfView({
        lat: currentPOV.lat,
        lng: newLng,
        altitude: newAltitude
      }, 0);
    };

    const handleTouchEnd = () => {
      if (!window.globeInstance) return;
      isDragging = false;
      lastInteractionTime = Date.now();

      // Convert velocity to rotation speed (adjust multiplier to control momentum strength)
      const momentumMultiplier = 0.3; // Reduced for more controlled momentum
      let momentumVelocity = touchVelocity * momentumMultiplier;
      
      // Apply momentum animation
      const animateMomentum = () => {
        if (Math.abs(momentumVelocity) < 0.001) {
          momentumAnimation = null;
          // Smoothly return to initial altitude
          if (initialAltitude !== null) {
            const currentPOV = window.globeInstance.pointOfView();
            window.globeInstance.pointOfView({
              lat: currentPOV.lat,
              lng: currentPOV.lng,
              altitude: initialAltitude
            }, 1000); // Smooth transition back
          }
          return;
        }

        const currentPOV = window.globeInstance.pointOfView();
        const newLng = currentPOV.lng + (momentumVelocity > 0 ? 0.15 : -0.15);
        
        window.globeInstance.pointOfView({
          lat: currentPOV.lat,
          lng: newLng,
          altitude: currentPOV.altitude
        }, 0);

        // Decay the velocity
        momentumVelocity *= 0.92; // Slower decay for smoother stop
        
        momentumAnimation = requestAnimationFrame(animateMomentum);
      };

      momentumAnimation = requestAnimationFrame(animateMomentum);
      
      touchStartX = null;
      lastTouchX = null;
      lastTouchTime = null;
    };

    if (timelineContainer) {
      timelineContainer.addEventListener('wheel', handleScroll, { passive: false });
      timelineContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
      timelineContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
      timelineContainer.addEventListener('touchend', handleTouchEnd);
      
      // Add scroll event listener for timeline scrolling
      timelineContainer.addEventListener('scroll', () => {
        // Dismiss popover if present
        if (window.setPopoverContent) {
          window.setPopoverContent(null);
        }
        if (window.setSelectedId) {
          window.setSelectedId(null);
        }
      });
    }


    // Scroll to selected moment, centering it in the timeline
    if (selectedId) {
      const selectedEntry = document.querySelector(`.timeline-entry[data-id="${selectedId}"]`);
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
      if (timelineContainer) {
        timelineContainer.removeEventListener('wheel', handleScroll);
        timelineContainer.removeEventListener('touchstart', handleTouchStart);
        timelineContainer.removeEventListener('touchmove', handleTouchMove);
        timelineContainer.removeEventListener('touchend', handleTouchEnd);
        timelineContainer.removeEventListener('scroll', () => {});
      }
      if (momentumAnimation) {
        cancelAnimationFrame(momentumAnimation);
      }
    };
  }, [selectedId]);

  // Helper function to format combined date (month and day range)
  const formatCombinedDate = (startDate, duration) => {
    if (duration >= 365) {
      return ''; // Return empty string for entries longer than a year
    }
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration - 1);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();
    if (duration === 1) {
      return `${startMonth} ${startDay}`;
    }
    return startMonth === endMonth 
      ? `${startMonth} ${startDay}–${endDay}`
      : `${startMonth} ${startDay}–${endMonth} ${endDay}`;
  };

  // Helper function for tooltip full date
  const formatFullDateRange = (startDate, duration) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration - 1);
    const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
    return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}`;
  };

  return React.createElement(
    'footer',
    null,
    React.createElement(
      'div',
      { className: 'timeline-container' },
      React.createElement(
        'div',
        { className: 'timeline-line' }
      ),
      React.createElement(
        'div',
        { className: 'timeline' },
        filteredMoments.length === 0 ? 
          React.createElement('div', { className: 'timeline-empty' }, 'No adventures found for the selected filters') :
          years.map((year, index) => {
            const yearMoments = momentsByYear[year] || [];
            if (yearMoments.length === 0) return null; // Skip empty years
            return [
              React.createElement(
                'div',
                {
                  key: `year-${year}`,
                  className: 'timeline-year-entry',
                  style: { '--index': index }
                },
                React.createElement('div', { className: 'timeline-dot' }),
                React.createElement(
                  'div',
                  { className: 'timeline-year-card' },
                  React.createElement('div', { className: 'timeline-year-text' }, year)
                )
              ),
              ...yearMoments.map(moment => {
                const combinedDate = formatCombinedDate(moment.date, moment.stayDuration);
                const fullDateRange = formatFullDateRange(moment.date, moment.stayDuration);

                return React.createElement(
                  'div',
                  {
                    key: `${moment.id}-${year}`, // Unique key for each moment-year combination
                    className: `timeline-entry ${selectedId === moment.id ? 'selected' : ''} ${moment.fullLink !== '#' ? 'has-full-moment' : ''}`,
                    'data-id': moment.id,
                    onClick: () => {
                      handleTimelineClick(moment); // Use the unified logic (includes URL update)
                    },
                    style: { '--index': index + 1 }
                  },
                  React.createElement('div', { 
                    className: 'timeline-dot',
                    style: { width: `${10}px`, height: `${10}px` }
                  }),
                  moment.isComic && moment.fullLink !== '#' && React.createElement(
                    'img',
                    { 
                      className: 'comic-thumbnail-indicator', 
                      src: `${moment.fullLink.replace(/\/$/, '')}/cover.png`,
                      alt: `${moment.title} cover`,
                      title: 'Comic book available'
                    }
                  ),
                    React.createElement(
                      'div',
                      { className: 'timeline-card' },
                      !moment.isComic && moment.fullLink !== '#' && React.createElement(
                        'span',
                        { className: 'full-moment-indicator', title: 'Full blog post available' },
                        '📖'
                      ),
                      React.createElement(
                        'div',
                        { className: 'timeline-highlight' },
                        moment.timelineHighlight || moment.title
                      ),
                      React.createElement(
                        'div',
                        { 
                          className: 'timeline-date-combined',
                          title: fullDateRange
                        },
                        moment.stayDuration >= 365 ? '' : combinedDate
                      )
                    )
                );
              })
            ];
          }).flat()
      )
    )
  );
};