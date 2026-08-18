/**
 * Subpath deployment support. See window.withBase / window.stripBase below.
 * Centralizes BASE_PATH translation so root-absolute data literals across
 * moments.js / episodeNavigation.js / characters.js can stay untouched; they
 * flow through a small set of consumption sites (pushState/replaceState/fetch/
 * location.href/pathname reads) that call withBase()/stripBase().
 */
(function () {
  var KNOWN_PREFIXES = [
    "/apps/where-is-paul",
  ];

  function detectBasePath() {
    var path = window.location.pathname || "/";
    var pathWithSlash = path.charAt(path.length - 1) === "/" ? path : path + "/";
    for (var i = 0; i < KNOWN_PREFIXES.length; i++) {
      var prefix = KNOWN_PREFIXES[i];
      var prefixWithSlash = prefix.charAt(prefix.length - 1) === "/" ? prefix : prefix + "/";
      if (pathWithSlash === prefixWithSlash ||
          pathWithSlash.indexOf(prefixWithSlash) === 0 ||
          path === prefix) {
        return prefix;
      }
    }
    return "";
  }

  var BASE_PATH = detectBasePath();

  /** Prefix a root-absolute path ("/moments/...") with BASE_PATH. Full URLs, hash-only, query-only, relative, and already-prefixed paths pass through unchanged. Trailing slashes on multi-segment paths are stripped so URLs work through the portfolio cleanUrls proxy. */
  function withBase(p) {
    if (!p || typeof p !== "string") return p;
    if (/^(https?:)?\/\//.test(p) || p.indexOf("data:") === 0) return p;
    var hash = "";
    var hashIdx = p.indexOf("#");
    if (hashIdx >= 0) { hash = p.slice(hashIdx); p = p.slice(0, hashIdx); }
    var query = "";
    var qIdx = p.indexOf("?");
    if (qIdx >= 0) { query = p.slice(qIdx); p = p.slice(0, qIdx); }
    if (p.charAt(0) === "#" || p.charAt(0) === "?") return (hash || query) ? (hash + query) : p;
    if (BASE_PATH && p.indexOf(BASE_PATH + "/") === 0) { p = p.slice(BASE_PATH.length) || "/"; }
    else if (BASE_PATH && p === BASE_PATH) { p = "/"; }
    var isHashOnly = p.charAt(0) !== "/";
    if (!isHashOnly && p.length > 1 && p.charAt(p.length - 1) === "/") {
      p = p.replace(/\/+$/, "");
    }
    if (!isHashOnly && p.charAt(0) === "/") {
      return BASE_PATH + p + query + hash;
    }
    return p + query + hash;
  }

  /** Inverse of withBase for pathname reads: strip BASE_PATH prefix so callers compare against root-absolute literals like "/moments/...". */
  function stripBase(p) {
    if (!p || !BASE_PATH || typeof p !== "string") return p;
    if (p === BASE_PATH) return "/";
    var prefixSlash = BASE_PATH + "/";
    if (p.indexOf(prefixSlash) === 0) return p.slice(BASE_PATH.length);
    return p;
  }

  window.BASE_PATH = BASE_PATH;
  window.withBase = withBase;
  window.stripBase = stripBase;
})();