/* ============================================================================
   OCHE LIGHT — 5 Real-Physics AI Pub Darts Personalities (src/bots.mjs)
   Every bot chooses real board beds and throws through computeAimDrop() physics.
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
const CLEAN_DOUBLE_SET = new Set(CLEAN_DOUBLES);

// Box-Muller normal sample clamped cleanly to [-1, 1] for gauge needle simulation
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
    short: 'EDDIE',
    tagline: 'Methodical T20/S20 rhythm & crisp D16/D20 setups',
    avgLabel: '~62 Avg',
    flightHex: 0x2b6cb0,
    aimCfg: { sweet: 0.21, amber: 0.66 },
    sigmaU: 0.42,
    doubleSigmaU: 0.44,
    singleSigmaU: 0.34,
    streakiness: 0.06,
    nerveBoost: 0.04,
    tacticalIQ: 0.72,
    favoriteDoubles: [32, 40, 16, 20, 8],
    switchAggression: 0.12,
    bullAggression: 0.15,
    smartSplit: false, // Phase 1 baseline: raw halving
    taunt: "Steady Eddie's up — metronomic 20s and clean D16s!",
  },
  big_dave: {
    id: 'big_dave',
    name: 'Big Dave',
    short: 'DAVE',
    tagline: 'Streaky pub veteran — big tons mixed with 26 Breakfasts',
    avgLabel: '~54 Avg',
    flightHex: 0x265685,
    aimCfg: { sweet: 0.19, amber: 0.56 },
    sigmaU: 0.54,
    doubleSigmaU: 0.64,
    singleSigmaU: 0.46,
    streakiness: 0.24,
    nerveBoost: 0.08,
    tacticalIQ: 0.35,
    favoriteDoubles: [40, 32, 20, 16],
    switchAggression: 0.10,
    bullAggression: 0.22,
    smartSplit: false,
    taunt: "Big Dave's steppin' up with a pint in one hand!",
  },
  pub_shark: {
    id: 'pub_shark',
    name: '"Razor" Rita',
    archetype: 'Pub Shark',
    short: 'RITA',
    tagline: 'Tactical pub shark — @yourdarts FDIs, bogey covers & cold doubles',
    avgLabel: '~70 Avg',
    flightHex: 0x6b2e75,
    aimCfg: { sweet: 0.22, amber: 0.64 },
    sigmaU: 0.41,
    doubleSigmaU: 0.38,
    singleSigmaU: 0.30,
    streakiness: 0.05,
    nerveBoost: 0.02,
    tacticalIQ: 0.98,
    favoriteDoubles: [32, 40, 36, 16, 20, 24],
    switchAggression: 0.24,
    bullAggression: 0.30,
    smartSplit: false,
    taunt: 'Watch out — Pub Shark "Razor" Rita never leaves a bogey!',
  },
  nervy_nigel: {
    id: 'nervy_nigel',
    name: 'Nervy Nigel',
    short: 'NIGEL',
    tagline: 'Heavy T20 scorer whose arm twitches on match-winning doubles',
    avgLabel: '~66 Avg',
    flightHex: 0xb57a28,
    aimCfg: { sweet: 0.22, amber: 0.64 },
    sigmaU: 0.35,
    doubleSigmaU: 0.78,
    singleSigmaU: 0.34,
    streakiness: 0.10,
    nerveBoost: 0.26,
    tacticalIQ: 0.68,
    favoriteDoubles: [40, 32, 20, 16],
    switchAggression: 0.16,
    bullAggression: 0.12,
    smartSplit: false,
    taunt: "Nervy Nigel's flying in the trebles — just wait till he gets to a double!",
  },
  treble_hunter: {
    id: 'treble_hunter',
    name: "The Guv'nor",
    archetype: 'Treble Hunter',
    short: 'GUV',
    tagline: 'High-variance aggressor chasing T19/T18 switches & Bull finishes',
    avgLabel: '~68 Avg',
    flightHex: 0x246b55,
    aimCfg: { sweet: 0.22, amber: 0.58 },
    sigmaU: 0.44,
    doubleSigmaU: 0.46,
    singleSigmaU: 0.38,
    streakiness: 0.22,
    nerveBoost: 0.04,
    tacticalIQ: 0.78,
    favoriteDoubles: [40, 36, 32, 50, 24],
    switchAggression: 0.58,
    bullAggression: 0.72,
    smartSplit: false,
    taunt: "Treble Hunter Guv'nor loves switching to T19 and firing at Bull!",
  },
};

export const BOT_IDS = Object.keys(BOT_PROFILES);

// Pick a clean single setup from rem (41..59 or odd <= 39) targeting favorite doubles
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
    // Reduce odd score to largest power-of-2 double possible
    for (const d of [32, 16, 8, 4, 2]) {
      const need = rem - d;
      if (need >= 1 && need <= 20) return 'S' + need;
    }
    return 'S1';
  }
  return 'S' + Math.max(1, Math.min(20, rem - 2));
}

// Decide what bed a bot aims at for the current dart
export function chooseBotAimBed(bot, { rem, dartsLeft, rivalScore, priorDarts = [], rng = Math.random }) {
  const smart = rng() < bot.tacticalIQ;
  const underPressure = rivalScore <= 100;

  // 1. Direct 1-Dart Double-Out (2..40 even or 50)
  if (rem === 50) {
    if (dartsLeft === 1 || underPressure || rng() < bot.bullAggression) {
      return parseBedCode('BULL');
    }
    // Safe 2+ dart setup when rival is far back
    return parseBedCode(smart ? 'S18' : 'S10');
  }
  if (rem >= 2 && rem <= 40 && rem % 2 === 0) {
    // Optional smart split (off in Phase 1 baseline; available for Phase 2 tuning)
    if (bot.smartSplit && dartsLeft >= 2 && (rem === 6 || rem === 10 || rem === 14 || rem === 18 || rem === 22 || rem === 26 || rem === 30 || rem === 34 || rem === 38)) {
      const splitBed = pickSingleSetup(rem, bot.favoriteDoubles);
      if (splitBed && rem - bedValue(splitBed) >= 8) {
        return parseBedCode(splitBed);
      }
    }
    return parseBedCode('D' + (rem / 2));
  }

  // 2. Odd numbers 3..39 -> Single to leave favorite even double
  if (rem < 40 && rem % 2 === 1) {
    return parseBedCode(pickSingleSetup(rem, bot.favoriteDoubles));
  }

  // 3. Below-60 setups (41..59, excl. 50)
  if (rem >= 41 && rem <= 59) {
    if (dartsLeft === 1 && smart) {
      // With 1 dart left, leave a fat double for next visit
      return parseBedCode(pickSingleSetup(rem, bot.favoriteDoubles));
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
    return parseBedCode('T20');
  }

  // 5. Golden 44 / 2-Dart Checkout Range (60..110)
  if (rem >= 60 && rem <= 110 && isCheckoutable2Dart(rem)) {
    const g = G44_BY_SCORE[rem];
    if (g && (smart || dartsLeft >= 2)) {
      if (bot.bullAggression > 0.5 && rem === 82 && rng() < 0.45) return parseBedCode('BULL');
      if (bot.bullAggression > 0.5 && rem === 95) return parseBedCode('T15');
      if (dartsLeft >= 2) return parseBedCode(g.route[0]);
    }
    // Non-tactical pub fallback
    if (rem >= 60) {
      if (rem - 60 >= 2 && rem - 60 <= 40 && (rem - 60) % 2 === 0) return parseBedCode('T20');
      if (rem - 57 >= 2 && rem - 57 <= 40 && (rem - 57) % 2 === 0) return parseBedCode('T19');
      if (rem - 54 >= 2 && rem - 54 <= 40 && (rem - 54) % 2 === 0) return parseBedCode('T18');
    }
  }

  // 6. 3-Dart Ton-Plus Checkouts (101..170)
  if (rem >= 101 && rem <= 170 && !BOGEY_NUMBERS.has(rem)) {
    const tp = TON_PLUS_BY_SCORE[rem];
    if (tp && smart && dartsLeft === 3) {
      if (bot.bullAggression > 0.5 && tp.open.includes('BULL') && rng() < 0.45) {
        return parseBedCode('BULL');
      }
      if (bot.switchAggression > 0.4 && tp.open.includes('T19') && rng() < 0.65) {
        return parseBedCode('T19');
      }
      return parseBedCode(tp.open[0]);
    }
    if (dartsLeft === 3) {
      if (rem % 2 === 1 && smart) return parseBedCode('T19');
      return parseBedCode(rng() < bot.switchAggression ? 'T19' : 'T20');
    }
    // 2 darts left on 111..170 -> set up a clean 1-visit out below 100
    if (dartsLeft === 2) {
      return parseBedCode(rng() < bot.switchAggression ? 'T19' : 'T20');
    }
    // 1 dart left on 101..170 -> drop below 100 (or below 70 if <= 130)
    return parseBedCode(rem <= 129 && smart ? 'T20' : (rng() < bot.switchAggression ? 'T19' : 'T20'));
  }

  // 7. Bogey Danger Band on Dart 3 (179..189)
  if (dartsLeft === 1 && rem >= 179 && rem <= 189) {
    if (smart) {
      const teen = rem === 179 ? 19 : rem - 170;
      if (teen >= 10 && teen <= 20) return parseBedCode('S' + teen);
    }
    return parseBedCode('T20');
  }

  // 8. Heavy Scoring Phase (>170 or bogey numbers like 169, 168, 166, 165, 163, 162, 159)
  if (BOGEY_NUMBERS.has(rem) && smart) {
    // Drop neatly off a bogey into a 2-dart out
    return parseBedCode(rem % 2 === 1 ? 'T19' : 'T20');
  }

  // Treble Hunter switches down to T19/T18 aggressively (especially if Dart 1 blocked or strayed)
  const strayedIn20 = priorDarts.some(c => c === 'S5' || c === 'S1' || c === 'S20');
  if (bot.switchAggression > 0.35) {
    if (strayedIn20 && rng() < bot.switchAggression) return parseBedCode(rng() < 0.72 ? 'T19' : 'T18');
    if (rng() < bot.switchAggression * 0.55) return parseBedCode('T19');
  } else if (strayedIn20 && rng() < bot.switchAggression) {
    return parseBedCode('T19');
  }

  return parseBedCode('T20');
}

// Throw 1 physical dart for a bot using real computeAimDrop() board geometry!
export function throwBotDart(bot, { rem, dartsLeft, rivalScore, visitMood = 0, priorDarts = [], rng = Math.random }) {
  const aimed = chooseBotAimBed(bot, { rem, dartsLeft, rivalScore, priorDarts, rng });
  const aimXY = bedToXY(aimed.code, { jitter: 0.015, rng });

  const isMatchDart = isCheckoutable1Dart(rem) && (aimed.ring === 'D' || aimed.ring === 'BULL');
  const underPressure = rivalScore <= 100;

  let sigmaU = aimed.ring === 'D' || aimed.ring === 'BULL'
    ? bot.doubleSigmaU
    : aimed.ring === 'S'
      ? bot.singleSigmaU
      : bot.sigmaU;

  // Apply visit streakiness (hot hand vs cold hand)
  sigmaU = Math.max(0.16, sigmaU * (1 + visitMood));

  // Match-dart nerve jitter (especially signature on Nervy Nigel!)
  if (isMatchDart) {
    const pressureScale = underPressure ? 1.35 : 1.0;
    sigmaU += bot.nerveBoost * pressureScale;
  }

  // Sample realistic horizontal needle release u and vertical breath v in [-1, 1]
  const u = clamp(sampleNormal(rng) * sigmaU, -0.99, 0.99);
  const v = clamp(sampleNormal(rng) * 0.52, -0.99, 0.99);

  const drop = computeAimDrop(aimed, aimXY, u, v, bot.aimCfg, true);
  const res = resolve501Dart(rem, rem, drop.bed); // caller supplies visitStartScore for bust revert

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

// Execute a complete 3-dart visit for a bot in a 501 leg (pure & headless-safe!)
export function simulateBot501Visit(bot, { startScore, rivalScore, rng = Math.random, rivalName = 'Opponent' }) {
  const visitMood = bot.streakiness ? clamp(sampleNormal(rng) * bot.streakiness, -0.32, 0.42) : 0;
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
      rng,
    });

    // Run the exact live @yourdarts Board-Management Auditor when inside <=189!
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

// Legacy flat-random Big Dave comparator (reproduces the pre-refactor Level 7 rival turn)
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
