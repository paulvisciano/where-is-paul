const fs = require('fs');
const path = require('path');

// Read moments.js file to get episode data
const momentsJsPath = path.join(__dirname, '..', 'moments', 'moments.js');
const momentsJsContent = fs.readFileSync(momentsJsPath, 'utf8');

// Extract formatDuration function and moments array
const formatDurationMatch = momentsJsContent.match(/function formatDuration\([^)]+\)\s*\{[\s\S]*?\n\}/);
const formatDurationFn = formatDurationMatch ? formatDurationMatch[0] : '';

// Extract moments array
const arrayStart = momentsJsContent.indexOf('window.momentsInTime = [');
const arrayEnd = momentsJsContent.lastIndexOf('].sort((a, b) => a.date - b.date);');
const arrayContent = momentsJsContent.substring(arrayStart + 'window.momentsInTime = '.length, arrayEnd + 1);

// Evaluate with formatDuration function available and return moments
const evalContext = formatDurationFn + '\nconst moments = ' + arrayContent + ';\nmoments;';
const moments = eval(evalContext);

const baseUrl = 'https://paulvisciano.github.io';

// Function to convert attachment:// URLs to full URLs
function convertImageUrl(imagePath, currentPath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('attachment://')) {
    return baseUrl + imagePath.replace('attachment://', '');
  }
  if (imagePath.startsWith('/')) {
    return baseUrl + imagePath;
  }
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Relative path - construct from current path
  const pathParts = currentPath.split('/').filter(p => p);
  pathParts.pop(); // Remove the last part
  return baseUrl + '/' + pathParts.join('/') + '/' + imagePath;
}

// Function to generate HTML with Open Graph meta tags
function generateEpisodeHtml(episode, momentPath) {
  const title = episode ? (episode.title || 'Where is Paul?') : 'Where is Paul?';
  const description = episode ? (episode.snippet || episode.caption || 'Explore my travel adventures and Urban Runner episodes') : 'Explore my travel adventures and Urban Runner episodes';
  // Prefer cover (comic) over image for og:image
  const imageSource = episode && (episode.cover || episode.image) ? (episode.cover || episode.image) : null;
  const imageUrl = imageSource ? convertImageUrl(imageSource, momentPath) : null;
  const siteName = 'Where is Paul?';
  const fullUrl = baseUrl + momentPath;

  // Generate meta tags HTML
  let metaTags = `
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph meta tags for social sharing -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${fullUrl}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="og:locale" content="en_US">`;

  if (imageUrl) {
    metaTags += `
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="1536">`;
  }

  metaTags += `
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">`;

  if (imageUrl) {
    const imageAlt = episode && episode.imageAlt ? episode.imageAlt : title;
    metaTags += `
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${fullUrl}">${metaTags}
  <script>
    (function () {
      var isCrawler = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slurp|Googlebot|bingbot/i.test(navigator.userAgent);
      if (!isCrawler) {
        var KNOWN_PREFIXES = ["/apps/where-is-paul"];
        var rawPath = window.location.pathname || "/";
        var pathWithSlash = rawPath.charAt(rawPath.length - 1) === "/" ? rawPath : rawPath + "/";
        var base = "";
        for (var i = 0; i < KNOWN_PREFIXES.length; i++) {
          var prefix = KNOWN_PREFIXES[i];
          var prefixWithSlash = prefix.charAt(prefix.length - 1) === "/" ? prefix : prefix + "/";
          if (pathWithSlash === prefixWithSlash || pathWithSlash.indexOf(prefixWithSlash) === 0 || rawPath === prefix) {
            base = prefix;
            break;
          }
        }
        var appPath = base ? rawPath.slice(base.length) || "/" : rawPath;
        var redirectUrl = base + "/?path=" + appPath + window.location.hash;
        window.location.replace(redirectUrl);
      }
    })();
  </script>
  <!-- Fallback for browsers with JavaScript disabled -->
  <noscript>
    <meta http-equiv="refresh" content="0; url=/apps/where-is-paul/">
  </noscript>
</head>
<body>
  <p>Redirecting...</p>
  <p>If you are not redirected automatically, <a href="/apps/where-is-paul/">click here</a>.</p>
</body>
</html>`;
}

// Function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Function to find episode data by path
function findEpisodeByPath(path) {
  const normalizedPath = path.endsWith('/') ? path : path + '/';
  const pathWithoutTrailing = path.endsWith('/') ? path.slice(0, -1) : path;
  
  return moments.find(m => {
    if (!m.fullLink) return false;
    const momentPath = m.fullLink.endsWith('/') ? m.fullLink : m.fullLink + '/';
    return momentPath === normalizedPath || m.fullLink === path || m.fullLink === pathWithoutTrailing;
  });
}

// Function to find all moment directories (city/date folders)
function findMomentDirectories(dir) {
  const results = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'index.html.template') {
        const fullPath = path.join(dir, entry.name);
        // Check if this is a date folder (YYYY-MM-DD format)
        if (/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
          results.push(fullPath);
        } else {
          // It's a city folder, recurse into it
          results.push(...findMomentDirectories(fullPath));
        }
      }
    }
  } catch (err) {
    // Skip if directory doesn't exist or can't be read
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return results;
}

// Find all moment directories
const momentsDir = path.join(__dirname, '..', 'moments');
const momentDirs = findMomentDirectories(momentsDir);

let updated = 0;
let created = 0;
let skipped = 0;

// Generate episode-specific HTML for each moment directory
momentDirs.forEach(dir => {
  const indexPath = path.join(dir, 'index.html');
  
  // Calculate the moment path (relative to moments directory)
  const relativePath = path.relative(momentsDir, dir);
  const momentPath = '/moments/' + relativePath.replace(/\\/g, '/') + '/';
  
  // Find matching episode
  const episode = findEpisodeByPath(momentPath);
  
  // Generate HTML with meta tags
  const html = generateEpisodeHtml(episode, momentPath);
  
  // Check if index.html exists
  if (fs.existsSync(indexPath)) {
    // Read existing file
    const existing = fs.readFileSync(indexPath, 'utf8');
    
    // Always update to ensure meta tags are current
    fs.writeFileSync(indexPath, html);
    updated++;
    console.log(`${episode ? '✓' : '○'} Updated: ${path.relative(momentsDir, indexPath)}${episode ? ` (${episode.title})` : ''}`);
  } else {
    // Create new index.html
    fs.writeFileSync(indexPath, html);
    created++;
    console.log(`${episode ? '✓' : '○'} Created: ${path.relative(momentsDir, indexPath)}${episode ? ` (${episode.title})` : ''}`);
  }
});

console.log(`\nSummary:`);
console.log(`  Updated: ${updated}`);
console.log(`  Created: ${created}`);
console.log(`  Total: ${momentDirs.length}`);

