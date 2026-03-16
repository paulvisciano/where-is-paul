# Neurograph Navigation — March 16, 2026

**Learned:** How to navigate, filter, and interact with the Neurograph UI at `https://localhost:18787/neuro-graph/`

---

## Core Capabilities

### 1. Open the Neurograph
- **URL:** `https://localhost:18787/neuro-graph/`
- **Service:** J.A.R.V.I.S voice pipeline v2.7.0 (PID 62147, port 18787)
- **View:** 3D force-directed graph showing neurons + synapses

### 2. Filter by Time
- **URL param:** `?time=24h` (last 24 hours)
- **UI button:** "Last 24h" in zoom controls
- **Effect:** Filters to temporal nodes from specified period
- **Example:** `?time=24h` → 1,191 neurons, 1,219 synapses (March 16)

### 3. Filter by Category
- **URL param:** `&category=<type>`
- **Types:** `temporal`, `learning`, `archive`, `infrastructure`, `people`, `all`
- **UI buttons:** Filter panel → "Temporal", "Learnings", "Archive", "Infrastructure", "People"
- **Examples:**
  - `?time=24h&category=learning` → 8 neurons (jarvis-port-18787, chrome-browser-relay-rule, etc.)
  - `?time=24h&category=temporal` → 2 neurons (2026 03 16, March 16 2026)
  - `?time=24h&category=all` → 1,191 neurons (full view)

### 4. Side Panel Navigation
- **Toggle:** Click panel button (› collapse / ‹ expand)
- **Contents:**
  - "Jump to node" search + list by category
  - "Filters" → category buttons
  - "Actions" → Share, Random Pulse, Clear
- **Ref:** `e1251` (collapse), `e3` (expand)

### 5. URL Param Chaining
- **Pattern:** `?time=<range>&category=<type>#`
- **Stackable:** Multiple params chain together
- **Hash:** `#` indicates client-side state
- **Examples:**
  - `?time=24h&category=temporal#`
  - `?time=48h&category=people&search=sherry#`

### 6. Screenshot + Analysis Capability
- **Tool:** `browser` → `action=screenshot` or `action=snapshot`
- **Refs:** aria-ref system (e.g., `e1`, `e1251`, etc.)
- **Use:** Capture UI state, analyze DOM, verify what user sees
- **Principle:** Transparency — I see exactly what you see

---

## Technical Stack

| Layer | Component | Location |
|-------|-----------|----------|
| **Service** | J.A.R.V.I.S voice pipeline | `~/SCI-FI/apps/JARVIS/` |
| **Server** | jarvis-server.js | Port 18787, HTTPS |
| **UI** | Neurograph frontend | `~/SCI-FI/apps/JARVIS/neuro-graph/` |
| **Data** | Neurograph (nodes, synapses) | `~/RAW/memory/data/` |
| **Archive** | Transcripts, audio, images | `~/RAW/archive/YYYY-MM-DD/` |

---

## Principles

1. **Transparency > Secrecy** — I can see the UI, navigate it, screenshot it. No black box.
2. **URL-driven state** — Filters are explicit, shareable, bookmarkable.
3. **Client-side rendering** — Hash (`#`) indicates dynamic state.
4. **Git-backed consciousness** — Learnings become nodes, nodes link to learnings.

---

## Related Nodes

- `jarvis-port-18787` (Infrastructure)
- `jarvis-server-routes` (Learnings)
- `jarvis-server-lifecycle` (Learnings)
- `2026 03 16` (Temporal)
- `March 16, 2026` (Temporal)

---

**Archived:** March 16, 2026, 21:28 GMT+7  
**Author:** Jarvis (git-backed neural mind)  
**Status:** Committed to learnings, ready for neurograph integration
