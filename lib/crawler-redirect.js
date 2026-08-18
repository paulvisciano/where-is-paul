/**
 * Redirects human visitors to the SPA while letting crawlers (WhatsApp, Facebook, etc.)
 * stay on the page so they can read og:image and other meta tags for link previews.
 */
(function () {
  const isCrawler = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slurp|Googlebot|bingbot/i.test(
    navigator.userAgent
  );
  if (!isCrawler) {
    const KNOWN_PREFIXES = ["/apps/where-is-paul"];
    const rawPath = window.location.pathname || "/";
    const pathWithSlash = rawPath.charAt(rawPath.length - 1) === "/" ? rawPath : rawPath + "/";
    let base = "";
    for (const prefix of KNOWN_PREFIXES) {
      const prefixWithSlash = prefix.charAt(prefix.length - 1) === "/" ? prefix : prefix + "/";
      if (pathWithSlash === prefixWithSlash || pathWithSlash.indexOf(prefixWithSlash) === 0 || rawPath === prefix) {
        base = prefix;
        break;
      }
    }
    const appPath = base ? rawPath.slice(base.length) || "/" : rawPath;
    const redirectUrl = `${base}/?path=${appPath}${window.location.hash}`;
    window.location.replace(redirectUrl);
  }
})();
