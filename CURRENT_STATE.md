# Current State

Last updated: 2026-03-23

## Goal
Local web platform for hosting and reading the novel **Realise**.

## Live Features
- Cover page appears first.
- Large animated rainbow-gloss title for `Realise`.
- Start reading flow with chapter navigation.
- Markdown chapter rendering from `public/novel/chapters/`.
- Theme + fullscreen controls in one shared menu bar.
- Theme options: Light, Dark, Sepia, Midnight.
- Local user profiles with per-user saved chapter progress.

## Key Files
- `src/main.ts`: routing, rendering, user profiles, progress, controls.
- `src/style.css`: layout, theme styles, cover effects, menu bar UI.
- `public/novel/manifest.json`: title, author, chapter list, optional cover image.
- `public/novel/chapters/`: chapter markdown files.
- `index.html`: app shell and browser tab title.

## Data Storage (localStorage)
- `novel-theme`: selected theme.
- `novel-users`: list of user names.
- `novel-active-user`: currently selected user.
- `novel-progress`: saved chapter by user.

## Hosting Notes
- Safe to host on GitHub Pages.
- Reader progress is local to each browser/device profile.
- No server-side account sync yet.

## Next Tasks
- [ ] Add visible progress indicator (`Chapter X / Y`) near user controls.
- [ ] Add optional “continue reading” shortcut on cover.
- [ ] Add import/export for progress backup.
- [ ] Replace sample chapter content with full manuscript text.

## Open Issues / Constraints
- Fullscreen depends on browser permissions/user gesture.
- Clearing browser site data removes local progress.
