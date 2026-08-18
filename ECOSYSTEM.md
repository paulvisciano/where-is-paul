# Paul Visciano's Unified Ecosystem 🌍

## Overview
A unified Sci-Fi Labs workspace centered on **Where is Paul?** — a spatial life map that renders a life as geography and time on an interactive 3D globe.

## Ecosystem Structure

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

## What Lives Here

### **Where is Paul?** 🌍
The public-facing spatial life map. A 3D globe and timeline built for the web and mobile first, ready to extend into XR.

- **Globe Pins** — every location, experience, and connection from the journey
- **Timeline** — years and moments, navigable
- **Mixed story formats** — blog posts, swipeable cards, videos, AI-generated comic sequences
- **Virtual ↔ Real bridge** — QR codes on comic pages open the real-world locations they depict
- **The people** — short videos of everyone who shaped the journey, in their own voice

## What Moved On

The ecosystem has been consolidated. Projects that previously lived as subfolders here now have their own homes:

| Used to be here | Now |
|---|---|
| `projects/musical-cubes/` | **[Musical Cubes](https://musical-cubes.vercel.app)** — standalone |
| `projects/urban-runner/` | Removed; has its own direction |
| `projects/project-template/` | Removed |
| `neuro-graph/` | **[paulvisciano/neuro-graph](https://github.com/paulvisciano/neuro-graph)** — dedicated repo |
| `latest/` landing page | Removed (stale placeholders) |
| Private journal / raw transcripts | Removed from public repo |

## Related Work

Part of **[Sci-Fi Labs](https://github.com/paulvisciano)** — spatial apps for web, mobile, and XR.

| Project | What it is |
|---|---|
| **[Where is Paul?](https://paulvisciano.github.io/)** | This repo. Spatial life map on a 3D globe. |
| **[Knowledge Graph](https://github.com/paulvisciano/neuro-graph)** | Neurograph visualization, public learnings, sovereign-memory architecture. |
| **[Musical Cubes](https://musical-cubes.vercel.app)** | Music revolution. |
| **[paulvisciano.vercel.app](https://paulvisciano.vercel.app/)** | About Paul & other work. |

## Development Workflow

1. **Create moments** for significant places and experiences
2. **Add characters** for the people who shaped the journey
3. **Generate comic sequences** from real photographs
4. **Run utility scripts** in `scripts/` to manage moment folders and redirects
5. **Commit and push** — GitHub Pages deploys the live site

## The Big Picture

This isn't just a website. It's a **living record** of adventure, travel, and self-challenge — a visible trail left to inspire the future generation.

**Every pin on the globe represents a place, a story, and a moment in a life deliberately lived.** 🌍✨