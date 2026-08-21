const fs = require('fs');
const path = require('path');

// Read moments.js file
const momentsJsPath = path.join(__dirname, '..', 'moments', 'moments.js');
const momentsJsContent = fs.readFileSync(momentsJsPath, 'utf8');

// Extract formatDuration function and moments array
// Match the function with nested braces
const formatDurationMatch = momentsJsContent.match(/function formatDuration\([^)]+\)\s*\{[\s\S]*?\n\}/);
const formatDurationFn = formatDurationMatch ? formatDurationMatch[0] : '';

// Extract moments array
const arrayStart = momentsJsContent.indexOf('window.momentsInTime = [');
const arrayEnd = momentsJsContent.lastIndexOf('].sort((a, b) => a.date - b.date);');
const arrayContent = momentsJsContent.substring(arrayStart + 'window.momentsInTime = '.length, arrayEnd + 1);

// Evaluate with formatDuration function available and return moments
const evalContext = formatDurationFn + '\nconst moments = ' + arrayContent + ';\nmoments;';
const moments = eval(evalContext);

// Function to create city slug from location name
function createCitySlug(locationName) {
  if (!locationName) return null;
  
  // Extract city name (everything before the first comma)
  const cityMatch = locationName.match(/^([^,]+)/);
  if (!cityMatch) return null;
  
  // Normalize special characters before processing
  const city = cityMatch[1].trim()
    .toLowerCase()
    .normalize('NFD') // Decompose characters (e.g., í -> i + ́)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove remaining special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  return city;
}

// Function to format date as YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Function to create index.html content (use template)
function createIndexHtml() {
  // Read the template file
  const templatePath = path.join(__dirname, '..', 'moments', 'index.html.template');
  try {
    return fs.readFileSync(templatePath, 'utf8');
  } catch (err) {
    // Fallback to inline template if file doesn't exist
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
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
}

// Process each moment
let created = 0;
let skipped = 0;
let errors = [];

moments.forEach(moment => {
  // Only process moments with fullLink === '#'
  if (moment.fullLink !== '#') {
    skipped++;
    return;
  }
  
  // Skip if no location
  if (!moment.location || !moment.location.name) {
    errors.push(`Moment ${moment.id || 'unknown'}: No location.name`);
    return;
  }
  
  // Create city slug
  const citySlug = createCitySlug(moment.location.name);
  if (!citySlug) {
    errors.push(`Moment ${moment.id || 'unknown'}: Could not create city slug from "${moment.location.name}"`);
    return;
  }
  
  // Format date
  const dateStr = formatDate(moment.date);
  
  // Create folder path
  const folderPath = path.join(__dirname, '..', 'moments', citySlug, dateStr);
  const momentPath = `/moments/${citySlug}/${dateStr}/`;
  
  // Check if folder already exists
  if (fs.existsSync(folderPath)) {
    // Check if index.html exists
    const indexPath = path.join(folderPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      // Create index.html if folder exists but no index.html
      fs.writeFileSync(indexPath, createIndexHtml());
      created++;
      console.log(`Created index.html: ${momentPath}`);
    } else {
      skipped++;
    }
  } else {
    // Create folder and index.html
    fs.mkdirSync(folderPath, { recursive: true });
    const indexPath = path.join(folderPath, 'index.html');
    fs.writeFileSync(indexPath, createIndexHtml());
    created++;
    console.log(`Created folder and index.html: ${momentPath}`);
  }
});

console.log(`\nSummary:`);
console.log(`  Created: ${created}`);
console.log(`  Skipped: ${skipped} (already exist or have fullLink)`);
if (errors.length > 0) {
  console.log(`  Errors: ${errors.length}`);
  errors.forEach(err => console.log(`    - ${err}`));
}

