# VISION.md — Where is Paul?

**A Sci-Fi Labs spatial app** — a 3D globe and timeline built for the web and mobile first, ready to extend into XR.  
**Live:** [paulvisciano.github.io](https://paulvisciano.github.io/)  

---

## The Dream

A reimagining of personal history as a **living, spatial record** of a life deliberately lived — a luminous Earth where cities, crossings, and hard-won stays rise as glowing markers, and time itself becomes navigable.

Not documentation for its own sake. A deliberate trail of adventure, curiosity, and human connection left to inspire the future generation — proof that a full, challenging, far-reaching life is possible, and that the map, the stories, the places, and the voices still remain for them to continue.

---

## What This Is

**Where is Paul?** is the public-facing spatial life map of Paul Visciano. It renders a life as geography and time:

- **Interactive 3D globe** — a glowing Earth with location markers showing where Paul has been. Stay durations are visualized; the whole surface becomes a navigable map of a life in motion.
- **Timeline navigation** — move through years and moments. Click any point to open the stories, photos, and experiences tied to that place and time.
- **Mixed story formats** — quiet blog-style posts, swipeable cards, short videos, and full comic-book sequences.
- **Real life → comic** — photographs and real scenes from daily life are transformed with AI into illustrated comic pages, keeping the truth of what happened while giving it a mythic visual language.
- **Virtual ↔ real bridge** — some comic pages carry embedded QR codes that open onto the actual real-world locations they depict, letting the digital and physical worlds fold into each other.
- **The people** — everyone who shaped the journey has a presence here, each with a short video in which they narrate a bit about themselves — their own voice, in their own words.

---

## Why This Exists

This project is built as a living record of adventure, travel, and self-challenge.  
It is meant to stand as an invitation — a visible trail left to inspire the future generation to live fully, move boldly, and make their own path.

Not advice. Not pressure. Just proof that such a life is possible.

---

## Repo Structure

```
paulvisciano.github.io/              # Where is Paul? — spatial life map
├── index.html                        # Entry point / 3D globe shell
├── moments/                          # Travel experiences (globe pins + stories)
├── characters/                       # The people who shaped the journey
├── components/                       # Shared UI components
├── lib/                              # Core libraries and helpers
├── assets/                           # Static assets (images, audio, posters)
├── icons/                            # Icon set
├── hooks/                            # Git hooks (pre-push, etc.)
├── scripts/                          # Utility scripts
│   ├── create-moment-folders.js      # Generate moment folder structure
│   ├── update-moment-index-files.js  # Update moment redirects
│   ├── parse-openclaw-session.js     # Session parsing helper
│   ├── setup-hooks.sh                # Install git hooks into .git/hooks
│   └── process-whatsapp-transcripts.sh  # Parse chat exports by day
├── mcp-r2-upload/                    # Cloudflare R2 upload tooling
└── .ai/                              # AI-assisted development context
```

Everything else that previously lived in this repo has been **moved, archived, or removed**:

- **`projects/`** (musical-cubes, urban-runner, project-template) — removed; those projects have their own homes.
- **`neuro-graph`** — graduated to a dedicated repo: **[paulvisciano/neuro-graph](https://github.com/paulvisciano/neuro-graph)**. The sovereign-memory vision, neurograph visualization, and learning archive continue there.
- **`latest/` landing page** — removed (hardcoded placeholders, no longer updated).
- **Private journal / raw transcripts** — removed from the public repo.

---

## Related Work

This repo is part of **[Sci-Fi Labs](https://github.com/paulvisciano)** — spatial apps for web, mobile, and XR.

| Project | What it is |
|---|---|
| **[Where is Paul?](https://paulvisciano.github.io/)** | This repo. Spatial life map on a 3D globe. |
| **[Knowledge Graph](https://github.com/paulvisciano/neuro-graph)** | The sovereign-memory empire: neurograph visualization, public learnings, thumb-drive architecture. |
| **[Musical Cubes](https://musical-cubes.vercel.app)** | Music revolution, standalone. |
| **[paulvisciano.vercel.app](https://paulvisciano.vercel.app/)** | About Paul & other work. |

---

## The North Star

> *A map of a life, left for the next generation to continue.*

The globe is the canvas. Time is the axis. The stories are the proof.

---

**Built by** [Paul Visciano](https://paulvisciano.vercel.app/) · **Sci-Fi Labs**  
**Live at** [paulvisciano.github.io](https://paulvisciano.github.io/)