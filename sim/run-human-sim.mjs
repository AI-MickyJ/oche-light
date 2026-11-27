#!/usr/bin/env node
/* ============================================================================
   OCHE LIGHT — Human-Timing 3-Beat / 2-Beat + Maths-Flow 501 Simulator
   Models realistic human anticipatory timing jitter (sigmaTimeSec on oscillating
   sin(speed * t) bars) across Beginner, Casual, and Sharp player archetypes
   against Big Dave & Steady Eddie across Relaxed, League, and Pro difficulties.

   Usage:
     node sim/run-human-sim.mjs
     node sim/run-human-sim.mjs --out sim/human-baseline.json
   ============================================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOGEY_NUMBERS,
  G44_BY_SCORE,
  TON_PLUS_BY_SCORE,
  createSeededRng,
  parseBedCode,
  bedToXY,
  bedValue,
  isCheckoutable1Dart,
  isCheckoutable2Dart,
  resolve501Dart,
  multiAxisConfigForDifficulty,
  evaluateFocusBeat,
  computeMultiAxisDrop,
  DEFAULT_MATH_FLOW,
  computeMathFlowModifier,
  applyMathFlowToConfig,
  computeMatchDartNerves,
} from '../src/engine.mjs';
import { BOT_PROFILES, simulateBot501Visit } from '../src/bots.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function sampleNormal(rng) {
  let u1 = 0, u2 = 0;
  while (u1 <= 1e-7) u1 = rng();
  u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

const HUMAN_PROFILES = [
  {
    id: 'beginner',
    label: 'Beginner (95ms)',
    sigmaTimeSec: 0.095,    // ~95ms anticipatory timing jitter
    mathRatioMean: 0.72,    // slower mental maths, occasional clock timeout
    mathRatioSd: 0.24,
    wrongProb: 0.16,
    checkoutIQ: 0.55,
  },
  {
    id: 'casual',
    label: 'Casual (62ms)',
    sigmaTimeSec: 0.062,    // ~62ms decent pub rhythm
    mathRatioMean: 0.42,    // mostly Sharp / In-Flow maths
    mathRatioSd: 0.16,
    wrongProb: 0.06,
    checkoutIQ: 0.85,
  },
  {
    id: 'sharp',
    label: 'Sharp (38ms)',
    sigmaTimeSec: 0.038,    // ~38ms dialed-in rhythm player
    mathRatioMean: 0.24,    // consistently IN FLOW
    mathRatioSd: 0.08,
    wrongProb: 0.02,
    checkoutIQ: 0.98,
  },
];

const AWKWARD_SPLITS = { 38: 'S6', 34: 'S2', 30: 'S14', 26: 'S10', 22: 'S6', 18: 'S2', 14: 'S6', 10: 'S2', 6: 'S2' };

function chooseHumanTarget(rem, dartsLeft, iq, rng) {
  if (rem === 50) return 'BULL';
  if (rem >= 2 && rem <= 40 && rem % 2 === 0) return 'D' + (rem / 2);
  if (rem <= 40 && rem % 2 === 1) {
    if (rem === 3) return 'S1';
    for (const d of [32, 16, 8, 4, 20, 2]) {
      const s = rem - d;
      if (s >= 1 && s <= 20) return 'S' + s;
    }
    return 'S1';
  }
  if (rem >= 41 && rem <= 59 && rem !== 50) {
    const s16 = rem - 32;
    if (s16 >= 1 && s16 <= 20) return 'S' + s16;
    const s20 = rem - 40;
    if (s20 >= 1 && s20 <= 20) return 'S' + s20;
    return 'S' + Math.max(1, rem - 36);
  }
  if (dartsLeft === 1 && rem >= 179 && rem <= 189 && rng() < iq) {
    return 'S' + (rem - 170);
  }
  if (dartsLeft === 1 && rem >= 62 && rem <= 70 && rng() < iq) {
    return 'T10';
  }
  if (dartsLeft >= 2 && G44_BY_SCORE[rem] && rng() < iq) {
    return G44_BY_SCORE[rem].route[0];
  }
  if (dartsLeft === 3 && TON_PLUS_BY_SCORE[rem] && rng() < iq) {
    return TON_PLUS_BY_SCORE[rem].open[0];
  }
  if (rem <= 110 && isCheckoutable2Dart(rem)) {
    const g = G44_BY_SCORE[rem];
    if (g) return g.route[0];
  }
  if (rem <= 60 && AWKWARD_SPLITS[rem]) return AWKWARD_SPLITS[rem];
  return 'T20';
}

function throwHumanDart({ aimedCode, difficulty, aimMode, mathFlow, profile, rng }) {
  const aimedBed = parseBedCode(aimedCode);
  const aimXY = bedToXY(aimedCode);
  const baseCfg = multiAxisConfigForDifficulty(difficulty);
  const cfg = applyMathFlowToConfig(baseCfg, mathFlow);

  let focusRes;
  let presses = 0;

  if (aimMode === '2beat') {
    focusRes = { zone: 'amber', label: '2-BEAT', speedMult: 1.0, zoneMult: 1.0, jitter: 0.056 };
  } else {
    // Beat 1: Focus / Grip
    const dtF = sampleNormal(rng) * profile.sigmaTimeSec;
    const focusU = clamp(Math.sin(cfg.focusSpeed * dtF), -1, 1);
    focusRes = evaluateFocusBeat(focusU, cfg);
    presses += 1;
  }

  // Beat 2: Horizontal Line
  const hSpd = cfg.horizSpeed * focusRes.speedMult;
  const dtH = sampleNormal(rng) * profile.sigmaTimeSec;
  const horizU = clamp(Math.sin(hSpd * dtH), -1, 1);
  presses += 1;

  // Beat 3: Vertical Height
  const vSpd = cfg.vertSpeed * focusRes.speedMult;
  const dtV = sampleNormal(rng) * profile.sigmaTimeSec;
  const vertV = clamp(Math.sin(vSpd * dtV), -1, 1);
  presses += 1;

  const ja = rng() * Math.PI * 2;
  const jr = rng() * focusRes.jitter * (cfg.jitterMult || 1.0);
  const jitterXY = { x: Math.cos(ja) * jr, y: Math.sin(ja) * jr };

  const drop = computeMultiAxisDrop(aimedBed, aimXY, focusRes, horizU, vertV, cfg, true, jitterXY);
  return { aimedBed, drop, focusZone: focusRes.zone, presses };
}

function simulateHumanVsBotLeg({ profile, rivalBot, difficulty, aimMode, humanFirst, rng }) {
  let humanScore = 501;
  let rivalScore = 501;
  let rivalD1Darts = 0;
  let mathFlow = { ...DEFAULT_MATH_FLOW };

  let humanDarts = 0;
  let humanScored = 0;
  let humanPresses = 0;
  let t20Attempts = 0;
  let t20Hits = 0;
  let t20StrayNeighbors = 0;
  let doubleAttempts = 0;
  let doubleHits = 0;
  let flowVisits = 0;
  let totalHumanVisits = 0;
  let focusGreens = 0;
  let focusTotal = 0;
  let busts = 0;

  let turn = humanFirst ? 0 : 1;
  let winner = null;

  for (let ply = 0; ply < 70 && !winner; ply++) {
    if (turn % 2 === 0) {
      // Human Visit
      const startScore = humanScore;
      let liveRem = startScore;
      let visitTotal = 0;
      let busted = false;
      let won = false;
      totalHumanVisits++;
      if (mathFlow.tier === 'in_flow' || mathFlow.tier === 'sharp') flowVisits++;

      for (let d = 0; d < 3; d++) {
        const dartsLeft = 3 - d;
        const aimedCode = chooseHumanTarget(liveRem, dartsLeft, profile.checkoutIQ, rng);
        const { aimedBed, drop, focusZone, presses } = throwHumanDart({
          aimedCode, difficulty, aimMode, mathFlow, profile, rng,
        });
        humanDarts++;
        humanPresses += presses;
        if (aimMode !== '2beat') {
          focusTotal++;
          if (focusZone === 'green') focusGreens++;
        }
        if (aimedCode === 'T20') {
          t20Attempts++;
          if (drop.bed.code === 'T20') t20Hits++;
          else if (drop.bed.sector === 5 || drop.bed.sector === 1) t20StrayNeighbors++;
        }
        if (aimedBed.ring === 'D' || aimedBed.ring === 'BULL') {
          doubleAttempts++;
        }

        const res = resolve501Dart(liveRem, startScore, drop.bed);
        if (res.isWin) {
          doubleHits++;
          visitTotal += drop.bed.value;
          humanScored += visitTotal;
          humanScore = 0;
          won = true;
          winner = 'human';
          break;
        }
        if (res.isBust) {
          busted = true;
          busts++;
          break;
        }
        liveRem = res.rawRem;
        visitTotal += drop.bed.value;
      }

      if (!won && !busted) {
        humanScore = liveRem;
        humanScored += visitTotal;
        // Chalk visit + subtraction -> updates Maths Flow for next visit!
        const r1 = Math.max(0.05, profile.mathRatioMean + sampleNormal(rng) * profile.mathRatioSd);
        const r2 = Math.max(0.05, profile.mathRatioMean + sampleNormal(rng) * profile.mathRatioSd);
        const wrongCount = (rng() < profile.wrongProb ? 1 : 0) + (rng() < profile.wrongProb ? 1 : 0);
        const timedOut = r1 > 1.0 || r2 > 1.0;
        mathFlow = computeMathFlowModifier((r1 + r2) * 0.5, { wrongCount, usedHint: false, timedOut });
      }
    } else {
      // Bot Visit
      const visit = simulateBot501Visit(rivalBot, {
        startScore: rivalScore,
        rivalScore: humanScore,
        rivalName: 'Human',
        priorD1Darts: rivalD1Darts,
        rng,
      });
      rivalScore = visit.endScore;
      rivalD1Darts += visit.d1Darts;
      if (visit.won) {
        winner = 'bot';
        break;
      }
    }
    turn++;
  }

  if (!winner) winner = humanScore <= rivalScore ? 'human' : 'bot';
  return {
    winner,
    humanDarts,
    humanScored,
    humanPresses,
    isSlog: humanDarts >= 30,
    t20Attempts,
    t20Hits,
    t20StrayNeighbors,
    doubleAttempts,
    doubleHits,
    flowVisits,
    totalHumanVisits,
    focusGreens,
    focusTotal,
    busts,
  };
}

function runSuite({ legsPerCell = 200, seed = 20261125, aimMode = '3beat' } = {}) {
  const rng = createSeededRng(seed);
  const diffs = ['relaxed', 'league', 'pro'];
  const rivals = [BOT_PROFILES.big_dave, BOT_PROFILES.steady_eddie];
  const rows = [];

  for (const diff of diffs) {
    for (const prof of HUMAN_PROFILES) {
      for (const rival of rivals) {
        let wins = 0, slogs = 0, darts = 0, scored = 0, presses = 0;
        let t20A = 0, t20H = 0, t20S = 0, dA = 0, dH = 0, flV = 0, totV = 0, fg = 0, ft = 0, busts = 0;
        for (let i = 0; i < legsPerCell; i++) {
          const r = simulateHumanVsBotLeg({
            profile: prof,
            rivalBot: rival,
            difficulty: diff,
            aimMode,
            humanFirst: i % 2 === 0,
            rng,
          });
          if (r.winner === 'human') wins++;
          if (r.isSlog) slogs++;
          darts += r.humanDarts;
          scored += r.humanScored;
          presses += r.humanPresses;
          t20A += r.t20Attempts;
          t20H += r.t20Hits;
          t20S += r.t20StrayNeighbors;
          dA += r.doubleAttempts;
          dH += r.doubleHits;
          flV += r.flowVisits;
          totV += r.totalHumanVisits;
          fg += r.focusGreens;
          ft += r.focusTotal;
          busts += r.busts;
        }
        rows.push({
          aimMode,
          diff,
          player: prof.id,
          playerLabel: prof.label,
          rival: rival.id,
          rivalName: rival.short,
          legs: legsPerCell,
          winPct: +((wins / legsPerCell) * 100).toFixed(1),
          avg3: +(((scored / Math.max(1, darts)) * 3)).toFixed(1),
          t20Pct: +((t20H / Math.max(1, t20A)) * 100).toFixed(1),
          strayPct: +((t20S / Math.max(1, t20A)) * 100).toFixed(1),
          dblPct: +((dH / Math.max(1, dA)) * 100).toFixed(1),
          focusGreenPct: ft ? +((fg / ft) * 100).toFixed(1) : null,
          flowVisitPct: +((flV / Math.max(1, totV)) * 100).toFixed(1),
          avgDarts: +(darts / legsPerCell).toFixed(1),
          avgPresses: +(presses / legsPerCell).toFixed(1),
          slogPct: +((slogs / legsPerCell) * 100).toFixed(1),
          bustsPerLeg: +(busts / legsPerCell).toFixed(2),
        });
      }
    }
  }
  return rows;
}

function printTable(title, rows) {
  console.log(`\n## ${title}`);
  console.log('| Diff | Human | vs Bot | Win % | 3-Dart Avg | T20 % | Stray 5/1 % | Double % | Focus Grn % | Avg Presses | Slog % |');
  console.log('| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const r of rows) {
    console.log(
      `| ${r.diff} | ${r.playerLabel} | ${r.rivalName} | ${r.winPct}% | ${r.avg3} | ${r.t20Pct}% | ${r.strayPct}% | ${r.dblPct}% | ${r.focusGreenPct === null ? '—' : r.focusGreenPct + '%'} | ${r.avgPresses} | ${r.slogPct}% |`
    );
  }
}

function runNervesComparison({ trialsPerCell = 1200, seed = 20261127 } = {}) {
  const rng = createSeededRng(seed);
  const d16 = parseBedCode('D16');
  const d16xy = bedToXY('D16');
  const rows = [];
  const scaleCfg = (base, nv) => {
    const c = { ...base };
    c.focusSpeed *= nv.speedMult; c.horizSpeed *= nv.speedMult; c.vertSpeed *= nv.speedMult;
    c.focusSweet = clamp(c.focusSweet * nv.zoneMult, 0.06, 0.42);
    c.horizSweet = clamp(c.horizSweet * nv.zoneMult, 0.06, 0.42);
    c.vertSweet  = clamp(c.vertSweet  * nv.zoneMult, 0.06, 0.42);
    c.focusAmber = clamp(c.focusAmber * nv.zoneMult, c.focusSweet + 0.1, 0.74);
    c.horizAmber = clamp(c.horizAmber * nv.zoneMult, c.horizSweet + 0.1, 0.74);
    c.vertAmber  = clamp(c.vertAmber  * nv.zoneMult, c.vertSweet  + 0.1, 0.74);
    return c;
  };
  const simDouble = (prof, diff, nv) => {
    const cfg = scaleCfg(multiAxisConfigForDifficulty(diff), nv);
    let hits = 0, outsideWire = 0;
    for (let i = 0; i < trialsPerCell; i++) {
      const trF = (rng() * 2 - 1) * nv.tremorAmp;
      const trH = (rng() * 2 - 1) * nv.tremorAmp;
      const trV = (rng() * 2 - 1) * nv.tremorAmp;
      const focusU = clamp(Math.sin(cfg.focusSpeed * sampleNormal(rng) * prof.sigmaTimeSec) + trF, -1, 1);
      const focusRes = evaluateFocusBeat(focusU, cfg);
      const horizU = clamp(Math.sin(cfg.horizSpeed * focusRes.speedMult * sampleNormal(rng) * prof.sigmaTimeSec) + trH, -1, 1);
      const vertV  = clamp(Math.sin(cfg.vertSpeed  * focusRes.speedMult * sampleNormal(rng) * prof.sigmaTimeSec) + trV, -1, 1);
      const ja = rng() * Math.PI * 2;
      const jr = rng() * focusRes.jitter;
      const dr = computeMultiAxisDrop(d16, d16xy, focusRes, horizU, vertV, cfg, true, { x: Math.cos(ja) * jr, y: Math.sin(ja) * jr });
      if (dr.bed.code === 'D16') hits++;
      else if (dr.bed.code === 'MISS') outsideWire++;
    }
    return { hitPct: +((hits / trialsPerCell) * 100).toFixed(1), missWirePct: +((outsideWire / trialsPerCell) * 100).toFixed(1) };
  };
  const nvHot = computeMatchDartNerves({ isMatchDart: true, rivalLow: true, missedPrevDouble: false, calmed: false });
  const nvCalm = computeMatchDartNerves({ isMatchDart: true, rivalLow: true, missedPrevDouble: false, calmed: true });
  for (const diff of ['relaxed', 'league', 'pro']) {
    for (const prof of HUMAN_PROFILES) {
      const hot = simDouble(prof, diff, nvHot);
      const calm = simDouble(prof, diff, nvCalm);
      rows.push({
        diff,
        playerLabel: prof.label,
        hotBpm: nvHot.bpm,
        hotHitPct: hot.hitPct,
        hotWirePct: hot.missWirePct,
        calmBpm: nvCalm.bpm,
        calmHitPct: calm.hitPct,
        liftPct: +(calm.hitPct - hot.hitPct).toFixed(1),
      });
    }
  }
  return rows;
}

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

const t0 = Date.now();
const rows3 = runSuite({ legsPerCell: 200, seed: 20261125, aimMode: '3beat' }); // 3,600 legs!
const rows2 = runSuite({ legsPerCell: 200, seed: 20261126, aimMode: '2beat' }); // 3,600 legs!
const nervesRows = runNervesComparison({ trialsPerCell: 1200, seed: 20261127 });
const elapsed = Date.now() - t0;

console.log(`# Oche Light — Human-Timing Multi-Axis + Maths-Flow 501 Simulation (7,200 Total Legs in ${elapsed}ms)`);
printTable('3-Beat Oche Rhythm (3,600 Legs · 200/cell)', rows3);
printTable('2-Beat Line+Ht Comparison (3,600 Legs · 200/cell)', rows2);
console.log('\n## Match-Dart Game Nerves vs. Deep Breath [S] Composure (D16 Winning Double · 1,200 throws/cell)');
console.log('| Diff | Human | Nervous (112 BPM) D16 % | Outside Wire % | Composed (74 BPM) D16 % | Deep Breath Lift |');
console.log('| --- | --- | ---: | ---: | ---: | ---: |');
for (const r of nervesRows) {
  console.log(`| ${r.diff} | ${r.playerLabel} | ${r.hotHitPct}% | ${r.hotWirePct}% | ${r.calmHitPct}% | +${r.liftPct} pp |`);
}

if (outPath) {
  const full = path.resolve(ROOT, outPath);
  fs.writeFileSync(full, JSON.stringify({ generatedAt: new Date().toISOString(), rows3, rows2, nervesRows }, null, 2));
  console.log(`\nSaved human sim report to ${full}`);
}
