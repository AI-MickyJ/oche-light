# Oche Light — `exp/fun-pass` Release Notes

## Summary of Changes
- **Pure Headless Engine (`src/engine.mjs`):** Extracted DOM-free darts board geometry, `computeAimDrop`, `applyPubScatter`, `@yourdarts` Golden 44 / Ton-Plus / Bogey / Marking tables, `audit501Decision`, and 501/301 rules into a native ES module imported directly by `index.html` and `oche_light.html` with zero build step.
- **5 Real-Physics Pub Bot Personalities (`src/bots.mjs`):** Built `Big Dave`, `Steady Eddie`, `Nervy Nigel`, `The Guv'nor` (`treble_hunter`), and `"Razor" Rita` (`pub_shark`), each choosing real board beds and throwing through `computeAimDrop()` physics rather than flat score arrays.
- **1,200-Match Balance & Pub-Drama Tuning (`sim/run-matches.mjs`, `sim/baseline.json` → `sim/after.json`):** Calibrated bots from unrealistic 73–92 PDC-pro averages into authentic pub-league 64–72 averages, added match-dart nerve dynamics (amplified under rival `<=100` pressure), trailing chase focus (`>=90` behind), smart awkward-double splits to crush D1 madhouse slogs, and authentic per-bot Board IQ separation (`88.0%`–`99.3%`).
- **Live 3D Rival Throws, Best-of-3 Pub Night & Bot-vs-Bot Spectator Mode (`index.html` / `oche_light.html`):** Replaced flat rival turns in Level 7 with live physical 3D darts landing at exact `computeAimDrop()` coordinates (including metallic spider-wire bounce-outs on outside misses & busts, match-dart nerve reactions, and 180/26 banter), added a **Best of 3** Pub Night format with alternating throw-first legs, and added **Watch Bot vs Bot** live 3D exhibition mode inside Pub Ladder.
- **Automated Verification (`sim/smoke-check.mjs` + `AGENTS.md`):** Added project rules and automated verification checking `index.html` ↔ `oche_light.html` sync, ES-module export integrity, syntax, physics/auditor unit assertions, static HTTP serving, and live desktop/mobile browser checks.

## Before vs After (1,200 Simulated 501 Matches · Seed `20260501`)

| Metric | Baseline (`sim/baseline.json`) | After (`sim/after.json`) |
| --- | --- | --- |
| 30+-dart slog rate | 1.25% (5-bot core: 0.25%) | 4.00% (5-bot core: 2.50%) |
| Stuck-on-D1 (>6 darts) rate | 0.17% (5-bot core: 0.00%) | 0.08% (5-bot core: 0.00%) |
| Comeback wins (>=120 behind, conditional) | 25.58% (265/1036) · 5-bot: 32.66% | 28.01% (230/821) · 5-bot: 31.37% |
| Comeback wins (>=120 behind, overall) | 22.08% (5-bot core: 28.25%) | 19.17% (5-bot core: 22.00%) |
| Close finishes (<=170 within 1 visit) | 80.75% (5-bot core: 86.63%) | 92.42% (5-bot core: 94.38%) |
| Non-standard / 2-3 dart checkouts | 93.83% (5-bot core: 95.13%) | 91.25% (5-bot core: 94.13%) |
| Avg winning dart count | 17.3d | 21.6d |
| Bot win-rate range (5 physics bots) | 27.19%–67.81% | 42.50%–64.06% |

### Per-Bot Breakdown (After · 1,200 Matches)

| Bot | Overall Win % | 5-Bot Win % | 3-Dart Avg | Board IQ % | Best Leg | Tons+ | 180s | D1 Slog % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Big Dave (`big_dave`) | 48.75% | 42.50% | 64.4 | 88.02% | 13d | 508 | 13 | 0.00% |
| Steady Eddie (`steady_eddie`) | 54.50% | 47.81% | 67.1 | 97.33% | 14d | 504 | 10 | 0.00% |
| Nervy Nigel (`nervy_nigel`) | 52.00% | 44.38% | 71.8 | 96.53% | 12d | 727 | 37 | 0.25% |
| The Guv'nor (`treble_hunter`) | 57.50% | 51.25% | 68.5 | 94.22% | 13d | 388 | 9 | 0.00% |
| "Razor" Rita (`pub_shark`) | 68.50% | 64.06% | 70.4 | 99.33% | 14d | 509 | 12 | 0.00% |
| Legacy Dave (Flat comparator) | 18.75% | — | 58.3 | — | 19d | 221 | 0 | 0.00% |

## Verification
- `node sim/smoke-check.mjs`: PASS (`index.html === oche_light.html`, 40 imports from `./src/engine.mjs`, 3 imports from `./src/bots.mjs`, valid inline JS, all curriculum/auditor/aim-physics assertions green).
- `node sim/run-matches.mjs --out sim/after.json`: PASS (1,200 matches in ~32ms; cross-checked on independent seed `99999`: 3.83% slogs, 0% D1 slogs, 92.42% close finishes, 40.31%–66.25% 5-bot win spread).
- Live browser check at `http://localhost:8765/index.html` (`1280×800` & `390×844`): PASS (`0` console errors, `0` page errors, `0` failed requests; verified `200 OK` on `/index.html`, `/src/engine.mjs`, `/src/bots.mjs`, 5-bot selector, Best-of-3, real-physics Nervy Nigel turn, live 3D Bot-vs-Bot Spectator mode + click-to-take-over, and zero mobile horizontal overflow).
