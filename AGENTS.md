# Oche Light — Project Rules

## Repo & Sync
- `index.html` and `oche_light.html` are identical standalone entry points for Oche Light. Before finishing any milestone, sync `index.html` and `oche_light.html` so `diff -q index.html oche_light.html` reports zero differences (unless explicitly noted during an in-progress refactor).
- Keep zero-build static hosting on GitHub Pages working: `index.html` and native ES modules under `src/` must load cleanly over HTTP with zero bundler or build step.
- Do not commit untracked scratch art files (`trev.png`, `trev_3darts.png`, `trev_cutout.webp`); keep the embedded WebP cutout inside `index.html`.

## Coding & Tool Discipline
- Preserve existing `localStorage` schemas (`oche_light_mastery_v1`, `oche_trev_kokoro_on`, `oche_trev_kokoro_voice`), the 7-level `STAGES` progression (`LEVEL_1`..`LEVEL_7` + `CALIBRATION`), `Pub Trial` flow, Kokoro-82M Web Worker voice, and darts math rules (`BOGEY_NUMBERS`, `G44_BY_SCORE`, `TON_PLUS_ITEMS`, `audit501Decision`).
- Keep pure, DOM-free darts geometry, aim/scatter physics, checkout tables, and 501/301 scoring rules in `src/engine.mjs`, and AI bot personalities in `src/bots.mjs`.
- Keep zero dart/wire cast shadows on the 3D dartboard (`castShadow = false`, `boardFace.receiveShadow = false`).
- Use tool calls efficiently: read targeted line ranges instead of re-reading the entire HTML file.
- Always run verification scripts (`node sim/run-matches.mjs`, `node sim/smoke-check.mjs`, and visual browser check when UI changes) before reporting done.
- Commit clean milestones on the current feature branch (`exp/fun-pass`); never push or merge to `main` without explicit user instruction.
