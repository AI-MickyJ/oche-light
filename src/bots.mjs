/* ============================================================================
   OCHE LIGHT — 5 Real-Physics AI Pub Darts Personalities (src/bots.mjs)
   Every bot chooses real board beds and throws through computeAimDrop() physics.
   Tuned in Phase 2 against 1,200 simulated 501 matches for authentic pub drama!
   ============================================================================ */

import {
  BOGEY_NUMBERS,
  G44_BY_SCORE,
  TON_PLUS_BY_SCORE,
  bedValue,
  parseBedCode,
  bedToXY,
  computeAimDrop,
  isCheckoutable1Dart,
  isCheckoutable2Dart,
  resolve501Dart,
  audit501Decision,
} from './engine.mjs';

const CLEAN_DOUBLES = [32, 40, 36, 16, 20, 24, 28, 8, 12];
const AWKWARD_SPLIT_MAP = {
  38: 'S6',   // 38 -> S6 leaves D16 (32)
  34: 'S2',   // 34 -> S2 leaves D16 (32)
  30: 'S14',  // 30 -> S14 leaves D8 (16)
  26: 'S10',  // 26 -> S10 leaves D8 (16)
  22: 'S6',   // 22 -> S6 leaves D8 (16)
  18: 'S2',   // 18 -> S2 leaves D8 (16)
  14: 'S6',   // 14 -> S6 leaves D4 (8)
  10: 'S2',   // 10 -> S2 leaves D4 (8)
  6:  'S2',   // 6  -> S2 leaves D2 (4)
};

function sampleNormal(rng) {
  let u1 = 0, u2 = 0;
  while (u1 <= 1e-7) u1 = rng();
  u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export const BOT_PROFILES = {
  steady_eddie: {
    id: 'steady_eddie',
    name: 'Steady Eddie',
    archetype: 'Steady Scorer',
    short: 'EDDIE',
    tagline: 'Methodical T20/S20 rhythm & crisp D16/D20 setups',
    avgLabel: '~67 Avg',
    flightHex: 0x2b6cb0,
    aimCfg: { sweet: 0.13, amber: 0.68 },
    sigmaU: 0.56,
    doubleSigmaU: 0.23,
    singleSigmaU: 0.32,
    streakiness: 0.08,
    nerveBoost: 0.13,
    trailingFocus: 0.16,
    tacticalIQ: 0.80,
    favoriteDoubles: [32, 40, 16, 20, 8],
    switchAggression: 0.12,
    bullAggression: 0.14,
    smartSplit: true,
    taunt: "Steady Eddie's up — metronomic 20s and clean D16s!",
    missQuip: "Eddie shakes his head — rare slip off the wire!",
  },
  big_dave: {
    id: 'big_dave',
    name: 'Big Dave',
    archetype: 'Pub Veteran',
    short: 'DAVE',
    tagline: 'Streaky pub veteran — big tons mixed with 26s, gritty on doubles',
    avgLabel: '~64 Avg',
    flightHex: 0x265685,
    aimCfg: { sweet: 0.132, amber: 0.56 },
    sigmaU: 0.62,
    doubleSigmaU: 0.20,
    singleSigmaU: 0.33,
    streakiness: 0.36,
    nerveBoost: 0.10,
    trailingFocus: 0.22,
    tacticalIQ: 0.22,
    favoriteDoubles: [40, 32, 20, 16],
    switchAggression: 0.10,
    bullAggression: 0.48,
    smartSplit: true,
    taunt: "Big Dave's steppin' up with a pint in one hand!",
    missQuip: "Big Dave laughs it off and takes a sip of bitter!",
  },
  pub_shark: {
    id: 'pub_shark',
    name: '"Razor" Rita',
    archetype: 'Pub Shark',
    short: 'RITA',
    tagline: 'Tactical pub shark — @yourdarts FDIs, bogey covers & ice-cold outs',
    avgLabel: '~70 Avg',
    flightHex: 0x6b2e75,
    aimCfg: { sweet: 0.135, amber: 0.66 },
    sigmaU: 0.53,
    doubleSigmaU: 0.21,
    singleSigmaU: 0.26,
    streakiness: 0.08,
    nerveBoost: 0.08,
    trailingFocus: 0.18,
    tacticalIQ: 0.99,
    favoriteDoubles: [32, 40, 36, 16, 20, 24],
    switchAggression: 0.26,
    bullAggression: 0.30,
    smartSplit: true,
    taunt: 'Watch out — Pub Shark "Razor" Rita never leaves a bogey!',
    missQuip: '"Razor" Rita narrows her eyes — already planning the next out!',
  },
  nervy_nigel: {
    id: 'nervy_nigel',
    name: 'Nervy Nigel',
    archetype: 'Power Scorer',
    short: 'NIGEL',
    tagline: 'Heavy T20 scorer whose arm twitches on match-winning doubles',
    avgLabel: '~72 Avg',
    flightHex: 0xb57a28,
    aimCfg: { sweet: 0.155, amber: 0.66 },
    sigmaU: 0.46,
    doubleSigmaU: 0.34,
    singleSigmaU: 0.30,
    streakiness: 0.16,
    nerveBoost: 0.32,
    trailingFocus: 0.16,
    tacticalIQ: 0.68,
    favoriteDoubles: [40, 32, 20, 16],
    switchAggression: 0.18,
    bullAggression: 0.14,
    smartSplit: true,
    taunt: "Nervy Nigel's flying in the trebles — just wait till he gets to a double!",
    missQuip: "Nigel's arm twitched on the double — the whole pub felt that one!",
  },
  treble_hunter: {
    id: 'treble_hunter',
    name: "The Guv'nor",
    archetype: 'Treble Hunter',
    short: 'GUV',
    tagline: 'High-variance aggressor chasing T19/T18 switches & Bull finishes',
    avgLabel: '~69 Avg',
    flightHex: 0x246b55,
    aimCfg: { sweet: 0.15, amber: 0.56 },
    sigmaU: 0.55,
    doubleSigmaU: 0.25,
    singleSigmaU: 0.34,
    streakiness: 0.30,
    nerveBoost: 0.13,
    trailingFocus: 0.22,
    tacticalIQ: 0.54,
    favoriteDoubles: [40, 36, 32, 50, 24],
    switchAggression: 0.66,
    bullAggression: 0.85,
    smartSplit: true,
    taunt: "Treble Hunter Guv'nor loves switching to T19 and firing at Bull!",
    missQuip: "The Guv'nor grins — living by the sword on the big trebles!",
  },
};

export const BOT_IDS = Object.keys(BOT_PROFILES);

function pickSingleSetup(rem, favDoubles = CLEAN_DOUBLES) {
  for (const dbl of favDoubles) {
    if (dbl === 50) continue;
    const need = rem - dbl;
    if (need >= 1 && need <= 20) return 'S' + need;
  }
  for (const dbl of CLEAN_DOUBLES) {
    const need = rem - dbl;
    if (need >= 1 && need <= 20) return 'S' + need;
  }
  if (rem % 2 === 1 && rem >= 3 && rem <= 39) {
    for (const d of [32, 16, 8, 4, 2]) {
      const need = rem - d;
      if (need >= 1 && need <= 20) return 'S' + need;
    }
    return 'S1';
  }
  return 'S' + Math.max(1, Math.min(20, rem - 2));
}

export function chooseBotAimBed(bot, { rem, dartsLeft, rivalScore, priorDarts = [], rng = Math.random }) {
  const smart = rng() < bot.tacticalIQ;
  const underPressure = rivalScore <= 100;
  const trailingHard = rem - rivalScore >= 90;

  // 1. Direct 1-Dart Double-Out (2..40 even or 50)
  if (rem === 50) {
    if (dartsLeft === 1 || underPressure || trailingHard || rng() < bot.bullAggression) {
      return parseBedCode('BULL');
    }
    return parseBedCode(smart ? 'S18' : 'S10');
  }
  if (rem >= 2 && rem <= 40 && rem % 2 === 0) {
    // Smart split-to-favorite-double escapes: prevents awkward odd-halving & Madhouse D1 slogs!
    if (bot.smartSplit && dartsLeft >= 2 && AWKWARD_SPLIT_MAP[rem] && (smart || rem <= 14)) {
      return parseBedCode(AWKWARD_SPLIT_MAP[rem]);
    }
    return parseBedCode('D' + (rem / 2));
  }

  // 2. Odd numbers 3..39 -> Single to leave favorite even double
  if (rem < 40 && rem % 2 === 1) {
    if (!smart && rem >= 15 && rng() < 0.28) {
      // Pub-habit occasional clunky single that leaves an odd/ugly double
      return parseBedCode('S' + Math.min(20, rem - 4));
    }
    return parseBedCode(pickSingleSetup(rem, bot.favoriteDoubles));
  }

  // 3. Below-60 setups (41..59, excl. 50)
  if (rem >= 41 && rem <= 59) {
    if (!smart && rng() < 0.62) {
      // Pub regular occasionally throws S20/S19 reflexively even when it leaves an awkward/odd score
      return parseBedCode(rem > 41 ? 'S20' : 'S19');
    }
    return parseBedCode(pickSingleSetup(rem, bot.favoriteDoubles));
  }

  // 4. 1-Dart FDI Abandonment on 62..70
  if (dartsLeft === 1 && rem >= 62 && rem <= 70) {
    if (smart) {
      if (rem === 62 || rem === 66 || rem === 70) return parseBedCode('T10');
      if (rem === 64 || rem === 68) return parseBedCode('T16');
      return parseBedCode(pickSingleSetup(rem, [40, 36, 32, 24]));
    }
    // Non-tactical pub habit: throws the 2-dart FDI treble with only 1 dart left!
    const g = G44_BY_SCORE[rem];
    return parseBedCode(g ? g.route[0] : 'T20');
  }

  // 5. Golden 44 / 2-Dart Checkout Range (60..110)
  if (rem >= 60 && rem <= 110 && isCheckoutable2Dart(rem)) {
    const g = G44_BY_SCORE[rem];
    if (g && dartsLeft >= 2) {
      if (!smart && rng() < 0.68) {
        // Pub habit: reflexively throws T20 on non-T20 Golden 44 numbers (e.g. 74, 83, 89)
        return parseBedCode('T20');
      }
      if ((bot.bullAggression > 0.5 || trailingHard) && rem === 82 && rng() < 0.55) return parseBedCode('BULL');
      if ((bot.bullAggression > 0.5 || trailingHard) && rem === 95) return parseBedCode('T15');
      return parseBedCode(g.route[0]);
    }
    if (rem >= 60) {
      if (rem - 60 >= 2 && rem - 60 <= 40 && (rem - 60) % 2 === 0) return parseBedCode('T20');
      if (rem - 57 >= 2 && rem - 57 <= 40 && (rem - 57) % 2 === 0) return parseBedCode('T19');
      if (rem - 54 >= 2 && rem - 54 <= 40 && (rem - 54) % 2 === 0) return parseBedCode('T18');
    }
  }

  // 6. 3-Dart Ton-Plus Checkouts (101..170)
  if (rem >= 101 && rem <= 170 && !BOGEY_NUMBERS.has(rem)) {
    const tp = TON_PLUS_BY_SCORE[rem];
    if (tp && dartsLeft === 3) {
      if (!smart && tp.traps) {
        // Non-tactical bot occasionally steps right into a classic splash trap (e.g. T20 on 129/107, T18 on 104)!
        const trapKeys = Object.keys(tp.traps);
        if (trapKeys.length && rng() < 0.82) return parseBedCode(trapKeys[0]);
      }
      if (smart) {
        if ((bot.bullAggression > 0.5 || trailingHard) && tp.open.includes('BULL') && rng() < 0.55) {
          return parseBedCode('BULL');
        }
        if ((bot.switchAggression > 0.4 || trailingHard) && tp.open.includes('T19') && rng() < 0.68) {
          return parseBedCode('T19');
        }
        return parseBedCode(tp.open[0]);
      }
    }
    if (dartsLeft === 3) {
      if (rem % 2 === 1 && smart) return parseBedCode('T19');
      return parseBedCode(rng() < bot.switchAggression ? 'T19' : 'T20');
    }
    if (dartsLeft === 2) {
      return parseBedCode(rng() < (bot.switchAggression + (trailingHard ? 0.2 : 0)) ? 'T19' : 'T20');
    }
    return parseBedCode(rem <= 129 && smart ? 'T20' : (rng() < bot.switchAggression ? 'T19' : 'T20'));
  }

  // 7. Bogey Danger Band on Dart 3 (179..189)
  if (dartsLeft === 1 && rem >= 179 && rem <= 189) {
    if (smart) {
      const teen = rem === 179 ? 19 : rem - 170;
      if (teen >= 10 && teen <= 20) return parseBedCode('S' + teen);
    }
    // Non-tactical pub blunder: throws 25 on 188 (leaves 163!) or stays on S20!
    if (rem === 188 && rng() < 0.45) return parseBedCode('25');
    return parseBedCode('S20');
  }

  // 8. Heavy Scoring Phase (>170 or bogey numbers)
  if (BOGEY_NUMBERS.has(rem) && smart) {
    return parseBedCode(rem % 2 === 1 ? 'T19' : 'T20');
  }

  // Trailing aggression & Treble Hunter cover switches
  const effSwitch = bot.switchAggression + (trailingHard ? 0.24 : 0);
  const strayedIn20 = priorDarts.some(c => c === 'S5' || c === 'S1' || c === 'S20');
  if (effSwitch > 0.35) {
    if (strayedIn20 && rng() < effSwitch) return parseBedCode(rng() < 0.72 ? 'T19' : 'T18');
    if (rng() < effSwitch * 0.55) return parseBedCode('T19');
  } else if (strayedIn20 && rng() < effSwitch) {
    return parseBedCode('T19');
  }

  return parseBedCode('T20');
}

export function throwBotDart(bot, { rem, dartsLeft, rivalScore, visitMood = 0, priorDarts = [], d1DartsInLeg = 0, rng = Math.random }) {
  const aimed = chooseBotAimBed(bot, { rem, dartsLeft, rivalScore, priorDarts, rng });
  const aimXY = bedToXY(aimed.code, { jitter: 0.015, rng });

  const isMatchDart = isCheckoutable1Dart(rem) && (aimed.ring === 'D' || aimed.ring === 'BULL');
  const rivalClose = rivalScore <= 170;
  const rivalOnFinish = rivalScore <= 100;
  const deficit = rem - rivalScore;

  let sigmaU = aimed.ring === 'D' || aimed.ring === 'BULL'
    ? bot.doubleSigmaU
    : aimed.ring === 'S'
      ? bot.singleSigmaU
      : bot.sigmaU;

  // Authentic visit rhythm (hot hand vs loose pub visit)
  sigmaU = Math.max(0.16, sigmaU * (1 + visitMood));

  // Trailing adrenaline focus when behind by >=90 (chasing down the leader!)
  if (deficit >= 90 && !isMatchDart) {
    const focus = (bot.trailingFocus || 0.12) * (deficit >= 140 ? 1.25 : 1.0);
    sigmaU = Math.max(0.18, sigmaU * (1 - focus));
  }

  // Match-dart nerve dynamics: when leading & throwing for the leg, pub tension kicks in!
  if (isMatchDart) {
    const leadingComfort = rivalScore - rem >= 80;
    const pressureScale = rivalOnFinish ? 1.45 : rivalClose ? 1.15 : leadingComfort ? 1.25 : 0.90;
    sigmaU += bot.nerveBoost * pressureScale;
    // Steady breathing adjustment if stuck on Madhouse D1 for 3+ darts so legs never deadlock
    if (rem === 2 && d1DartsInLeg >= 2) {
      sigmaU = Math.max(0.22, sigmaU * 0.65);
    }
  }

  const u = clamp(sampleNormal(rng) * sigmaU, -0.99, 0.99);
  const v = clamp(sampleNormal(rng) * 0.50, -0.99, 0.99);

  const drop = computeAimDrop(aimed, aimXY, u, v, bot.aimCfg, true);
  const res = resolve501Dart(rem, rem, drop.bed);

  return {
    aimed,
    landed: drop.bed,
    x: drop.x,
    y: drop.y,
    zone: drop.zone,
    isMatchDart,
    rawNewRem: res.rawRem,
    isWin: res.isWin,
  };
}

export function simulateBot501Visit(bot, { startScore, rivalScore, rng = Math.random, rivalName = 'Opponent', priorD1Darts = 0 }) {
  const visitMood = bot.streakiness ? clamp(sampleNormal(rng) * bot.streakiness, -0.34, 0.44) : 0;
  let rem = startScore;
  const throws = [];
  let auditTotal = 0;
  let auditGood = 0;
  let won = false;
  let busted = false;
  let d1Darts = 0;

  for (let d = 0; d < 3; d++) {
    const dartsLeft = 3 - d;
    if (rem === 2) d1Darts++;

    const shot = throwBotDart(bot, {
      rem,
      dartsLeft,
      rivalScore,
      visitMood,
      priorDarts: throws.map(t => t.landed.code),
      d1DartsInLeg: priorD1Darts + d1Darts,
      rng,
    });

    if (rem <= 189) {
      const audit = audit501Decision(rem, dartsLeft, shot.aimed, rivalScore, rivalName);
      if (audit) {
        auditTotal++;
        if (audit.grade === 'great') auditGood++;
      }
    }

    const res = resolve501Dart(rem, startScore, shot.landed);
    throws.push({
      aimed: shot.aimed,
      landed: shot.landed,
      x: shot.x,
      y: shot.y,
      zone: shot.zone,
      isMatchDart: shot.isMatchDart,
      isBust: res.isBust,
      isWin: res.isWin,
      remAfter: res.newRem,
    });

    if (res.isWin) {
      rem = 0;
      won = true;
      break;
    }
    if (res.isBust) {
      rem = startScore;
      busted = true;
      break;
    }
    rem = res.newRem;
  }

  const visitTotal = busted ? 0 : (startScore - rem);
  return {
    startScore,
    endScore: rem,
    visitTotal,
    dartsThrown: throws.length,
    throws,
    won,
    busted,
    auditTotal,
    auditGood,
    d1Darts,
    finishingBed: won ? throws[throws.length - 1].landed.code : null,
  };
}

export const LEGACY_BIG_DAVE = {
  id: 'legacy_big_dave',
  name: 'Legacy Dave (Flat)',
  short: 'LDAVE',
  isLegacyFlat: true,
};

export function simulateLegacyBigDaveVisit({ startScore, rng = Math.random }) {
  const flatVisits = [
    ['S20','S5','S1'], ['S20','S20','S1'], ['S20','S20','S5'], ['S20','S20','S18'],
    ['T20','S20','S1'], ['S19','S19','S7'], ['T20','S5','S1'], ['T19','S19','S7'],
    ['T20','S20','S5'], ['T20','S20','S20'],
  ];
  let rem = startScore;
  let scored = 0;
  let won = false;
  let dartsThrown = 3;
  let finishingBed = null;
  const d1Darts = rem === 2 ? 3 : 0;

  if (rem > 170) {
    const picked = flatVisits[Math.floor(rng() * flatVisits.length)];
    scored = picked.reduce((s, c) => s + bedValue(c), 0);
    if (rem - scored < 40) scored = Math.min(41, Math.max(20, rem - 40));
    rem -= scored;
  } else if (rem > 40 && rem !== 50) {
    const targetLeave = rem > 100 ? (rem - (55 + Math.floor(rng() * 35))) : (rng() < 0.5 ? 32 : 40);
    const clamped = Math.max(16, targetLeave % 2 === 0 ? targetLeave : targetLeave - 1);
    scored = Math.max(15, rem - clamped);
    rem -= scored;
  } else {
    const outBed = rem === 50 ? 'BULL' : (rem <= 40 && rem % 2 === 0) ? ('D' + (rem / 2)) : null;
    if (outBed && rng() < 0.30) {
      scored = rem;
      rem = 0;
      won = true;
      dartsThrown = 1 + Math.floor(rng() * 3);
      finishingBed = outBed;
    } else {
      const chip = rem % 2 === 1 ? 1 : (rem > 16 ? Math.floor(rem / 2) : 0);
      scored = chip;
      rem -= chip;
    }
  }

  return {
    startScore,
    endScore: rem,
    visitTotal: scored,
    dartsThrown,
    throws: [],
    won,
    busted: false,
    auditTotal: 0,
    auditGood: 0,
    d1Darts,
    finishingBed,
  };
}
