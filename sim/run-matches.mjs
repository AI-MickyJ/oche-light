#!/usr/bin/env node
/* ============================================================================
   OCHE LIGHT — 1,200-Match Headless 501 Simulation & Fun-Proxy Telemetry
   Usage:
     node sim/run-matches.mjs              (runs 1,200 matches, prints table)
     node sim/run-matches.mjs --baseline   (also writes sim/baseline.json)
     node sim/run-matches.mjs --out sim/after.json
   ============================================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSeededRng } from '../src/engine.mjs';
import {
  BOT_PROFILES,
  BOT_IDS,
  LEGACY_BIG_DAVE,
  simulateBot501Visit,
  simulateLegacyBigDaveVisit,
} from '../src/bots.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ALL_COMPETITORS = [
  ...BOT_IDS.map(id => BOT_PROFILES[id]),
  LEGACY_BIG_DAVE,
];

function playSingleLeg(botA, botB, rng, maxVisitsPerPlayer = 35) {
  const scores = [501, 501];
  const dartsThrown = [0, 0];
  const totalScored = [0, 0];
  const auditGood = [0, 0];
  const auditTotal = [0, 0];
  const d1Darts = [0, 0];
  const tonsPlus = [0, 0];
  const count180 = [0, 0];
  const maxDeficit = [0, 0]; // max points behind opponent ever experienced during leg
  const entered170Visit = [null, null];

  const bots = [botA, botB];
  let winner = -1;
  let winVisit = null;
  let visitNum = 0;

  while (visitNum < maxVisitsPerPlayer * 2 && winner === -1) {
    const p = visitNum % 2;
    const opp = 1 - p;
    const roundIdx = Math.floor(visitNum / 2) + 1;

    const deficit = scores[p] - scores[opp];
    if (deficit > maxDeficit[p]) maxDeficit[p] = deficit;

    const visit = bots[p].isLegacyFlat
      ? simulateLegacyBigDaveVisit({ startScore: scores[p], rng })
      : simulateBot501Visit(bots[p], {
          startScore: scores[p],
          rivalScore: scores[opp],
          rivalName: bots[opp].name,
          rng,
        });

    dartsThrown[p] += visit.dartsThrown;
    totalScored[p] += visit.visitTotal;
    auditGood[p] += visit.auditGood;
    auditTotal[p] += visit.auditTotal;
    d1Darts[p] += visit.d1Darts;
    if (visit.visitTotal >= 100) tonsPlus[p]++;
    if (visit.visitTotal === 180) count180[p]++;

    scores[p] = visit.endScore;
    if (scores[p] <= 170 && entered170Visit[p] === null) {
      entered170Visit[p] = roundIdx;
    }

    // Track deficit right after opponent moves ahead too
    const oppDef = scores[opp] - scores[p];
    if (oppDef > maxDeficit[opp]) maxDeficit[opp] = oppDef;

    if (visit.won) {
      winner = p;
      winVisit = visit;
      break;
    }
    visitNum++;
  }

  // Fallback tie-breaker if cap reached (counts as a slog!)
  if (winner === -1) {
    winner = scores[0] <= scores[1] ? 0 : 1;
    winVisit = { startScore: scores[winner], dartsThrown: 3, finishingBed: 'D1' };
  }

  const loser = 1 - winner;
  const winDarts = dartsThrown[winner];
  const isSlog30 = winDarts >= 30;
  const isStuckD1 = d1Darts[0] > 6 || d1Darts[1] > 6;
  const had120DeficitAny = maxDeficit[0] >= 120 || maxDeficit[1] >= 120;
  const winnerCameBack120 = maxDeficit[winner] >= 120;

  // Close finish: both players reached <=170 within 1 visit of each other (or loser was <=170 at checkout)
  const bothUnder170 = entered170Visit[0] !== null && entered170Visit[1] !== null;
  const isCloseFinish = scores[loser] <= 170 || (bothUnder170 && Math.abs(entered170Visit[0] - entered170Visit[1]) <= 1);

  // Checkout variety: 2- or 3-dart checkout (startScore > 40 && !== 50) OR non-D20/D16 finish
  const finBed = winVisit.finishingBed || '';
  const isMultiDartOut = winVisit.startScore > 40 && winVisit.startScore !== 50 && winVisit.dartsThrown >= 2;
  const isNonStandardDouble = finBed !== 'D20' && finBed !== 'D16';
  const isVariedCheckout = isMultiDartOut || isNonStandardDouble;

  return {
    winner,
    loser,
    bots: [botA.id, botB.id],
    winDarts,
    dartsThrown,
    totalScored,
    auditGood,
    auditTotal,
    d1Darts,
    tonsPlus,
    count180,
    isSlog30,
    isStuckD1,
    had120DeficitAny,
    winnerCameBack120,
    isCloseFinish,
    isVariedCheckout,
    finBed,
  };
}

export function runTournament({ seed = 20260501, legsPerOrder = 40 } = {}) {
  const rng = createSeededRng(seed);
  const perBot = {};
  for (const b of ALL_COMPETITORS) {
    perBot[b.id] = {
      id: b.id,
      name: b.name,
      isLegacy: !!b.isLegacyFlat,
      played: 0,
      wins: 0,
      playedVs5: 0,
      winsVs5: 0,
      dartsThrown: 0,
      totalScored: 0,
      auditGood: 0,
      auditTotal: 0,
      bestLeg: 999,
      tonsPlus: 0,
      count180: 0,
      d1SlogLegs: 0,
    };
  }

  let totalMatches = 0;
  let slog30Count = 0;
  let stuckD1Count = 0;
  let legsWith120Deficit = 0;
  let comeback120Wins = 0;
  let closeFinishes = 0;
  let variedCheckouts = 0;
  let totalWinDarts = 0;

  // Separate 5-physics-bot pure cohort counters
  let coreMatches = 0;
  let coreSlog30 = 0;
  let coreStuckD1 = 0;
  let coreLegs120 = 0;
  let coreComeback120 = 0;
  let coreClose = 0;
  let coreVaried = 0;

  for (let i = 0; i < ALL_COMPETITORS.length; i++) {
    for (let j = i + 1; j < ALL_COMPETITORS.length; j++) {
      const a = ALL_COMPETITORS[i];
      const b = ALL_COMPETITORS[j];
      const isCorePair = !a.isLegacyFlat && !b.isLegacyFlat;

      for (let order = 0; order < 2; order++) {
        const first = order === 0 ? a : b;
        const second = order === 0 ? b : a;

        for (let k = 0; k < legsPerOrder; k++) {
          const res = playSingleLeg(first, second, rng);
          totalMatches++;
          totalWinDarts += res.winDarts;
          if (res.isSlog30) slog30Count++;
          if (res.isStuckD1) stuckD1Count++;
          if (res.had120DeficitAny) legsWith120Deficit++;
          if (res.winnerCameBack120) comeback120Wins++;
          if (res.isCloseFinish) closeFinishes++;
          if (res.isVariedCheckout) variedCheckouts++;

          if (isCorePair) {
            coreMatches++;
            if (res.isSlog30) coreSlog30++;
            if (res.isStuckD1) coreStuckD1++;
            if (res.had120DeficitAny) coreLegs120++;
            if (res.winnerCameBack120) coreComeback120++;
            if (res.isCloseFinish) coreClose++;
            if (res.isVariedCheckout) coreVaried++;
          }

          for (let p = 0; p < 2; p++) {
            const st = perBot[res.bots[p]];
            st.played++;
            if (isCorePair) st.playedVs5++;
            if (p === res.winner) {
              st.wins++;
              if (isCorePair) st.winsVs5++;
              if (res.winDarts < st.bestLeg) st.bestLeg = res.winDarts;
            }
            st.dartsThrown += res.dartsThrown[p];
            st.totalScored += res.totalScored[p];
            st.auditGood += res.auditGood[p];
            st.auditTotal += res.auditTotal[p];
            st.tonsPlus += res.tonsPlus[p];
            st.count180 += res.count180[p];
            if (res.d1Darts[p] > 6) st.d1SlogLegs++;
          }
        }
      }
    }
  }

  const pct = (n, d) => (d ? Number(((n / d) * 100).toFixed(2)) : 0);

  const botRows = ALL_COMPETITORS.map(b => {
    const s = perBot[b.id];
    return {
      id: s.id,
      name: s.name,
      isLegacy: s.isLegacy,
      played: s.played,
      winPct: pct(s.wins, s.played),
      winPctVs5: s.isLegacy ? null : pct(s.winsVs5, s.playedVs5),
      avg3Dart: s.dartsThrown ? Number(((s.totalScored / s.dartsThrown) * 3).toFixed(1)) : 0,
      boardIqPct: s.auditTotal ? pct(s.auditGood, s.auditTotal) : null,
      bestLegDarts: s.bestLeg < 999 ? s.bestLeg : null,
      tonsPlus: s.tonsPlus,
      count180: s.count180,
      d1SlogPct: pct(s.d1SlogLegs, s.played),
    };
  });

  const coreWinPcts = botRows.filter(r => !r.isLegacy).map(r => r.winPctVs5);
  const allWinPcts = botRows.map(r => r.winPct);

  return {
    generatedAt: new Date().toISOString(),
    seed,
    totalMatches,
    coreMatches,
    metrics: {
      slog30RatePct: pct(slog30Count, totalMatches),
      stuckOnD1RatePct: pct(stuckD1Count, totalMatches),
      comeback120CondRatePct: pct(comeback120Wins, legsWith120Deficit),
      comeback120OverallRatePct: pct(comeback120Wins, totalMatches),
      legsWith120Deficit,
      comeback120Wins,
      closeFinishRatePct: pct(closeFinishes, totalMatches),
      checkoutVarietyPct: pct(variedCheckouts, totalMatches),
      avgWinningDarts: Number((totalWinDarts / totalMatches).toFixed(1)),
      botWinRateMinPct: Math.min(...coreWinPcts),
      botWinRateMaxPct: Math.max(...coreWinPcts),
      allBotWinRateMinPct: Math.min(...allWinPcts),
      allBotWinRateMaxPct: Math.max(...allWinPcts),
    },
    coreMetrics5Bots: {
      slog30RatePct: pct(coreSlog30, coreMatches),
      stuckOnD1RatePct: pct(coreStuckD1, coreMatches),
      comeback120CondRatePct: pct(coreComeback120, coreLegs120),
      comeback120OverallRatePct: pct(coreComeback120, coreMatches),
      closeFinishRatePct: pct(coreClose, coreMatches),
      checkoutVarietyPct: pct(coreVaried, coreMatches),
    },
    bots: botRows,
  };
}

function formatMarkdown(report) {
  const m = report.metrics;
  const c = report.coreMetrics5Bots;
  const lines = [
    `# Oche Light — 501 Simulation Summary (${report.totalMatches} Matches · Seed ${report.seed})`,
    '',
    '## Fun-Proxy Metrics',
    '| Metric | All 1,200 Matches | 5-Bot Core (' + report.coreMatches + ') |',
    '| --- | ---: | ---: |',
    `| 30+-dart stalemate / slog rate | ${m.slog30RatePct}% | ${c.slog30RatePct}% |`,
    `| Stuck-on-D1 (>6 darts) rate | ${m.stuckOnD1RatePct}% | ${c.stuckOnD1RatePct}% |`,
    `| Comeback wins from >=120 behind (conditional) | ${m.comeback120CondRatePct}% (${m.comeback120Wins}/${m.legsWith120Deficit}) | ${c.comeback120CondRatePct}% |`,
    `| Comeback wins from >=120 behind (overall) | ${m.comeback120OverallRatePct}% | ${c.comeback120OverallRatePct}% |`,
    `| Close finishes (<=170 within 1 visit) | ${m.closeFinishRatePct}% | ${c.closeFinishRatePct}% |`,
    `| Checkout variety (2/3-dart or non-D20/D16) | ${m.checkoutVarietyPct}% | ${c.checkoutVarietyPct}% |`,
    `| Avg winning dart count | ${m.avgWinningDarts}d | — |`,
    `| 5-Bot win-rate spread | ${m.botWinRateMinPct}%–${m.botWinRateMaxPct}% | ${m.botWinRateMinPct}%–${m.botWinRateMaxPct}% |`,
    '',
    '## Per-Bot Performance',
    '| Bot | Overall Win % | 5-Bot Win % | 3-Dart Avg | Board IQ % | Best Leg | Tons+ | 180s | D1 Slog % |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const b of report.bots) {
    lines.push(
      `| ${b.name} (\`${b.id}\`) | ${b.winPct}% | ${b.winPctVs5 === null ? '—' : b.winPctVs5 + '%'} | ${b.avg3Dart} | ${b.boardIqPct === null ? '—' : b.boardIqPct + '%'} | ${b.bestLegDarts ? b.bestLegDarts + 'd' : '—'} | ${b.tonsPlus} | ${b.count180} | ${b.d1SlogPct}% |`
    );
  }
  return lines.join('\n');
}

// CLI entrypoint
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const saveBaseline = args.includes('--baseline');
  const outIdx = args.indexOf('--out');
  const customOut = outIdx >= 0 ? args[outIdx + 1] : null;
  const seedIdx = args.indexOf('--seed');
  const seed = seedIdx >= 0 ? Number(args[seedIdx + 1]) : 20260501;

  const t0 = Date.now();
  const report = runTournament({ seed, legsPerOrder: 40 });
  const elapsedMs = Date.now() - t0;

  console.log(formatMarkdown(report));
  console.log(`\nCompleted ${report.totalMatches} matches in ${elapsedMs}ms.`);

  if (saveBaseline) {
    const p = path.join(ROOT, 'sim', 'baseline.json');
    fs.writeFileSync(p, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Saved baseline JSON -> ${p}`);
  }
  if (customOut) {
    const p = path.resolve(ROOT, customOut);
    fs.writeFileSync(p, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Saved JSON -> ${p}`);
  }
}
