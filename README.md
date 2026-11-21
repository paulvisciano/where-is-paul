# Where is Paul?

> Part of **[Sci-Fi Labs](https://github.com/paulvisciano)** — spatial web apps.  
> [Where is Paul?](https://paulvisciano.com/apps/where-is-paul) · [Musical Cubes](https://paulvisciano.com/apps/musical-cubes) · [Neuro Graph](https://paulvisciano.com/apps/neuro-graph)

[![Where is Paul? — Watch the video](https://pub-9466bb5132e74aeba333004ad0c21f21.r2.dev/where-is-paul.jpg)](https://pub-9466bb5132e74aeba333004ad0c21f21.r2.dev/portfolio/where-is-paul-tablet.mp4)

**Where is Paul?** is a spatial web app — a living record of a life on a 3D globe. Cities, crossings, and stays glow on a luminous Earth. Time is navigable. Moments appear as posts, cards, videos, and comic-book sequences drawn from real photographs.

Same URL on a phone, a desk, and Safari on Vision Pro. Pinch to zoom. Look to look around. No extra session. No app store binary.

Hex **color** on the globe encodes how long you stayed — not height.

**Make your own:** clone the repo, run it locally, replace the data. Pins live in one file. People, stories, and media sit next to it. [How to set yours up](#make-your-own).

**Live:** [paulvisciano.com/apps/where-is-paul](https://paulvisciano.com/apps/where-is-paul)  
**Repo:** [github.com/paulvisciano/where-is-paul](https://github.com/paulvisciano/where-is-paul)  
**Built by:** [paulvisciano.com](https://paulvisciano.com/)

---

## What you’ll find

- **Interactive 3D globe** — location markers on a glowing Earth. Stay duration is the hex color.
- **Timeline** — move through years and open the stories tied to a place.
- **Mixed story formats** — posts, swipeable cards, short videos, comic sequences.
- **Real life → comic** — photographs turned into illustrated pages without losing what happened.
- **The people** — short videos in their own voices.

---

## Why this exists

A trail of travel and self-challenge. Proof that a full life is possible — not advice, not a product launch.

---

## Make your own

This is a static site. No database. No backend. No account. No algorithm ranking who sees what. You decide what exists by what you put in the files.

### Run it locally

```bash
git clone https://github.com/paulvisciano/where-is-paul.git
cd where-is-paul
npm install
npm start
```

Open [http://localhost:8080](http://localhost:8080). Don’t open `index.html` as a file — posts fetch over HTTP.

Earth textures load from unpkg.

### Where the data lives

The app is a shell. Almost everything you see is data files loaded by `index.html`:

| What | Where | How it loads |
|---|---|---|
| Globe pins, timeline, comics, post metadata | `moments/moments.js` → `window.momentsInTime` | Script tag |
| People | `characters/characters.js` → `window.characters` | Script tag |
| Written posts | `moments/<city>/<YYYY-MM-DD>/content.html` | Fetched when you open the pin |
| Comic pages | URLs on the moment (`pages`) or files in that folder | Comic reader |
| Photos / video | Local path, `attachment://…`, or any `https://` URL | Moments + characters |
| Branding | `index.html`, `manifest.json` | Browser |

`.env` is **not** read at runtime.

There is no tracker, no auth, no ads. `localStorage` is used only to hide the first-run hint.

### Minimum: replace the pins

Edit `moments/moments.js`. Replace the `window.momentsInTime` array with your stays. One object per pin:

```js
{
  id: "lisbon-2025-10-12",
  title: "Lisbon",
  date: new Date("2025-10-12T00:00:00Z"),
  timelineHighlight: "Lisbon",
  tags: ["travel"],
  snippet: "One paragraph. This is the card on the globe.",
  fullLink: "#",
  image: "/moments/lisbon/2025-10-12/image-thumb.webp",
  imageAlt: "Lisbon",
  location: { lat: 38.7223, lng: -9.1393, name: "Lisbon, Portugal" },
  stayDuration: 12,
  formattedDuration: formatDuration(12)
}
```

`stayDuration` is days. That number is the hex color: a few days stay bright orange, months go darker. Not height.

`tags` drive the globe filter pills. This globe uses a closed set: `origins`, `family`, `tribe`, `volleyball`, `love`, `body`, `work`, `building`, `sovereignty`, `comic`, `nightlife`, `travel`. Swap the set when you swap the life.

To drop my people, set `window.characters = []` in `characters/characters.js`.

That’s enough for a globe of your life. Everything below is optional.

### Add a written post

1. Create `moments/<city>/<YYYY-MM-DD>/content.html`
2. Point the moment at it:

```js
fullLink: "/moments/lisbon/2025-10-12",
contentFile: "/moments/lisbon/2025-10-12/content.html",
```

### Add a comic

```js
isComic: true,
comicReaderVersion: 4,
cover: "/moments/lisbon/2025-10-12/cover.webp",
pages: [
  "/moments/lisbon/2025-10-12/page-01.webp",
  "/moments/lisbon/2025-10-12/page-02.mp4"
],
pageCount: 2
```

Pages can be images or video. HTTPS URLs (your own bucket) work the same as local paths.

### Add people

Edit `characters/characters.js`. Each person:

```js
{
  id: "ada",
  name: "Ada",
  role: "Friend",
  description: "One line.",
  bio: "A short bio, in their words or yours.",
  avatar: "/characters/ada-avatar.webp",
  pageImage: "/characters/ada.webp",
  pageVideo: "/characters/ada.mp4",
  imageAlt: "Ada",
  tags: ["tribe"],
  relationship: "How they sit in the story"
}
```

`pageVideo` is the clip in their own voice. Skip it if you don’t have one.

### Media

Put images and video in the moment folder, or use any `https://` URL.

Vercel runs `npm run build` to produce the static site in `dist/`. The build makes smaller WebP copies of local PNG and JPEG artwork and images in the project’s public R2 bucket when it can fetch them. The app uses the original URLs for images with no smaller copy. To preview the production image delivery locally, serve `dist/` after running the build.

### Publish

It’s static. Vercel, GitHub Pages, Netlify, or any static host. `vercel.json` is already in the repo.

You decide what’s public by what you commit. Drafts and raw exports belong in `raw/` — that folder is gitignored.

If your years aren’t 1988–2026, update `YEAR_TICK_POS` in `components/footer.js` so the timeline minimap matches.

Rebrand `index.html` (title, meta, OG tags) and `manifest.json` (name). If you deploy under a subpath, add it to `KNOWN_PREFIXES` in `index.html` and `lib/basePath.js`. Localhost and a domain root need nothing.

---

**Built by** [Paul Visciano](https://paulvisciano.com/) · **Sci-Fi Labs**  
**Live at** [paulvisciano.com/apps/where-is-paul](https://paulvisciano.com/apps/where-is-paul)
