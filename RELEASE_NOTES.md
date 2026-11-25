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

## Phase 3 — Playtest Polish, 3-Beat Oche Rhythm, Pub Chalkboard & Maths Flow
- **Crisp Fullscreen 3D Dart Flights (`buildDartMesh` & `postMat`):** Fixed the Three.js `'XYZ'` Euler rotation bug that twisted flight vanes perpendicular to the dart shaft, widened foreground tilt-shift DoF so protruding flight tips stay razor-sharp at fullscreen, added sculpted pear flights with gold trim + brass shaft collar, and wired `fullscreenchange` canvas resize handling.
- **3-Beat / 2-Beat Oche Rhythm Multi-Axis Aiming (`src/engine.mjs`, `index.html`):** Added `multiAxisConfigForDifficulty`, `evaluateFocusBeat`, and `computeMultiAxisDrop` for real multi-axis throwing (**`1·Focus/Grip` → `2·Horizontal Line` → `3·Vertical Height`**) with a live 3D radial line guide, tighter horizontal spider-wire corridors so off-line throws stray into neighboring `5`/`1` beds, plus `2-Beat Line+Ht` and `Instant Scatter` toggles in the Pub Ladder.
- **Maths Flow → Aim Ease Coupling (`computeMathFlowModifier`, `applyMathFlowToConfig`):** Fast mental maths (`<30%` / `<55%` of the countdown clock) puts the player **`⚡ IN FLOW`** / **`✦ SHARP`**, slowing the aiming needles up to `22%`, widening sweet spots up to `+26%`, and cutting grip jitter; slow or clock-expired chalking triggers **`⏱ SLOW`** / **`🔔 RATTLED`**, speeding up the needles up to `+32%` and narrowing corridors by `30%`, surfaced live inside `#aim-gauge-panel` via `#aim-flow-pill`.
- **Full-Size 2-Column Pub Match Chalkboard (`renderMatchChalkboard`):** Replaced generic scorecards in Level 4 (301/260), Level 7 (501), and Bot-vs-Bot Spectator mode with a full `1024×1536` (2× HiDPI) British pub `SCORED | TO GO` chalkboard with diagonal chalk strike-throughs on crossed-out scores and live `?` entries during Step 1 & Step 2 chalking.
- **Full `@yourdarts` Countdown Methods & Generous Maths Timers:** Added live **No-Peek `25/30/35` FDIs** (`+25 XP`) and **Sod's Law Miss-Rule pop-checks** (`+15 XP`) inside 501, non-spoiler Round-10/Round-100 subtraction method badges (`+10 XP`), Level 4 Bogey Watch (`179–189`) Teen Cover grading (`+20 XP`), and extended maths timers (`5.2s` value recall, `8.5s` 3-dart adding, `13.5–14.5s` visit chalk & subtraction before difficulty multiplier).

## Verification
- `node sim/smoke-check.mjs`: PASS (`index.html === oche_light.html`, 47 imports from `./src/engine.mjs`, 3 imports from `./src/bots.mjs`, valid inline JS, all curriculum/auditor/aim-physics/3-beat/subtraction-method/maths-flow assertions green).
- `node sim/run-matches.mjs`: PASS (1,200 matches in ~35ms; zero regression vs `sim/after.json`: 4.00% slogs / 2.50% 5-bot core, 0.08% D1 slogs, 28.01% conditional comebacks / 31.37% 5-bot core, 92.42% close finishes, 42.50%–64.06% 5-bot win spread).
- Live browser check at `http://localhost:8765/index.html` (`1440×900` Desktop & `390×844` Mobile): PASS (`0` console errors, `0` page errors, `0` failed requests; visually verified crisp 4-vane 3D dart flights, edge-to-edge full-size 2-column pub chalkboard with chalk strike-throughs, 3-Beat & 2-Beat Oche Rhythm, `⚡ FLOW · +26% AIM` pill widening aiming corridors, generous ~30s Relaxed chalk clocks, and zero mobile horizontal overflow or overlap).
