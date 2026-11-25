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
- **Outer-Ring FDI Number Circles & Interactive `FDI Pair Hunter (25/30/35)` (`src/engine.mjs`, `index.html`):** Added `FDI_SCORES`, `sectorNumberXY`, and `xyToSectorNumber` so every FDI hint and No-Peek anchor across Levels 5–7 draws glowing 3D circles directly around the two outer-ring dartboard numbers (`Gold = Treble`, `Emerald = Double`, concentric double ring on `75` "All the 15s", plus a luminous connecting arc), and built interactive **FDI Pair Hunter** rounds (interleaved in Level 5 + dedicated toggle in Pub Ladder) where clicking the outer-ring numbers locks the pair and flies both darts into the board.

## Phase 4 — Deep Playability Audit, Human-Timing 3-Beat Balance, 360° Aiming, Unified Chalk Chain & Universal Slip Recovery (`exp/deep-audit`)
- **7,200-Leg Human-Timing 3-Beat + Maths-Flow Simulator (`sim/run-human-sim.mjs`, `sim/human-baseline.json` → `sim/human-after.json`):** Modeled realistic human anticipatory timing jitter (`95ms` Beginner, `62ms` Casual, `38ms` Sharp) across `Relaxed`, `League`, and `Pro` vs. Big Dave & Steady Eddie. Discovered Casual players on League were averaging an unrealistic `124.6` (`66.6%` T20, only `7.2%` stray `5/1`s, `99.5%` win vs. Dave) due to stacked `IN FLOW × LOCKED IN` boosts; re-tuned speeds, corridor widths, organic hand dispersion, and Maths Flow (`+18%` / `-26%`) to land Casual League right in authentic pub-league territory (`73.6` avg, `30.0%` T20, `28.6%` stray `5/1`s, `28.0%` doubles, `66.5%` win vs. Dave / `62.5%` vs. Eddie, `0%` slogs) with zero impact on Phase 2's 1,200-match bot balance.
- **True 360° Screen-Space Aiming (`computeMultiAxisDrop`, `getScreenAxisLabels`, `setAimLineGuide3D`):** Replaced polar-axis mapping on side beds (`D11`, `D6`, `D8`, `D10`, `T6`, `T11`) with exact analytical screen-space X/Y mapping (strictly monotonic amber→red wire crossing and guaranteed Green+Green hit across all 40 `T`/`D` beds), a vertical 3D plumb guide line, and dynamic Left/Right & Low/High neighbor bar labels (`OUT ← D11 → 11`, `8 ↕ 14`; `6 ← D6 → OUT`, `10 ↕ 13`).
- **Unified `@yourdarts` Chalk Chain (`buildCroupierSnap`, `buildSubtractionChunk`, `#chalk-assist`):** Fused Step 1 (Addition) and Step 2 (Subtraction) into one tactile loop with **`Snap Known Pair [Tab]`** (rings 2 known darts in gold + odd 3rd dart in blue with `@yourdarts` Croupier shape names and nearest-10/20 rounding nudges), **`Hop -100 / -60 / -20 / -10 [Tab]`** (visibly hops the chalkboard score to the round midpoint), **`⚡ SMALL CALC!`** carry-over `+2.5s` momentum + **`🔥 CHALK COMBO!`** bonuses, and automatic **Reverse-Add Flash Checks** (`416 + 85 = 501 ✓`).
- **Universal Live Slip-Recovery Checks (`slipRecoveryInfo`):** Expanded Level 7 mid-visit recovery checks across `≤170` for **all** real x01 slips when aiming a Treble or Bull — FDI big singles (`50/60/70`), non-FDI big singles (`-20 + add-back`), neighboring stray singles (`-10 + add-back` + splash-trap warnings like `104→S5=99`), neighboring stray trebles (`T5=15: -20,+5`, `T7=21: -20,-1`, `T3=9: -10,+1`, `T4=12: -10,-2`), and `90–95` Outer Bull (`+5` to last digit) — with a Pub Ladder toggle (`On | Off`) and immediate `⚡ IN FLOW` aim relief for your very next recovery dart.
- **Live Playtest Bugs Caught & Fixed:** Fixed a keyboard focus bug where clicking `Snap Known Pair` then pressing `Enter` accidentally auto-triggered Step 2's `Hop` button; cleared Step 1 snap rings cleanly upon entering Step 2; docked `#numpad-panel` cleanly on the open left cabinet door on wide desktops (`≥1080×760`) so both the entire dartboard and the entire 2-column pub chalkboard stay 100% unobstructed while chalking.

### Human-Timing 3-Beat Balance: Before vs. After (3,600 3-Beat Legs · `sim/human-baseline.json` → `sim/human-after.json`)
| Difficulty · Human · Rival | Baseline Win % | After Win % | Baseline Avg | After Avg | Baseline T20 % | After T20 % | Baseline Stray 5/1 % | After Stray 5/1 % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Relaxed · Beginner (95ms) vs Dave | 94.5% | 46.5% | 110.2 | 62.5 | 58.4% | 24.2% | 12.4% | 35.6% |
| Relaxed · Casual (62ms) vs Dave | 100.0% | 99.5% | 159.2 | 122.2 | 94.0% | 67.1% | 0.2% | 5.4% |
| **League · Casual (62ms) vs Dave** | **99.5%** | **66.5%** | **124.6** | **73.6** | **66.6%** | **30.0%** | **7.2%** | **28.6%** |
| **League · Casual (62ms) vs Eddie** | **99.5%** | **62.5%** | **123.0** | **74.3%** | **65.4%** | **31.7%** | **6.3%** | **29.2%** |
| League · Sharp (38ms) vs Dave | 100.0% | 99.0% | 159.4 | 124.0 | 93.5% | 68.9% | 0.3% | 5.8% |
| **Pro · Sharp (38ms) vs Dave** | **99.5%** | **82.5%** | **131.5** | **82.8** | **70.7%** | **37.1%** | **6.0%** | **23.3%** |
| **Pro · Sharp (38ms) vs Eddie** | **100.0%** | **77.0%** | **131.9** | **81.6%** | **72.3%** | **36.5%** | **5.2%** | **22.7%** |

## Verification
- `node sim/smoke-check.mjs`: PASS (`index.html === oche_light.html`, 54 imports from `./src/engine.mjs`, 3 imports from `./src/bots.mjs`, valid inline JS, all curriculum/auditor/360°-aiming/Chalk-Chain/Slip-Recovery/Maths-Flow/FDI-outer-ring assertions green).
- `node sim/run-matches.mjs`: PASS (1,200 bot matches in ~33ms; zero regression vs `sim/after.json`: 4.00% slogs / 2.50% 5-bot core, 0.08% D1 slogs, 28.01% conditional comebacks / 31.37% 5-bot core, 92.42% close finishes, 42.50%–64.06% 5-bot win spread).
- `node sim/run-human-sim.mjs --out sim/human-after.json`: PASS (7,200 total 3-Beat & 2-Beat human-timing legs in ~154ms).
- Live browser checks (`http://localhost:8765/index.html` at `1440×900` & `390×844` + live GitHub Pages `https://ai-mickyj.github.io/oche-light/`): PASS (`0` console errors, `0` page errors, `0` failed HTTP requests; verified Placement Check, Levels 1–6, D11/D6 360° side labels, Level 5 FDI Pair Hunter + full Pub Trial pass `★☆☆`, Level 7 Chalk Chain Snap/Hop/Reverse-Add, live Slip Recovery, 501 Bust, Best-of-3 Leg 2 alternating throw, unobstructed left-docked desktop numpad, clean `390×844` mobile numpad & FDI outer-ring tap, and `200 OK` on live GitHub Pages).
