/* ============================================================================
   OCHE LIGHT — Pure DOM-Free Darts Geometry, Physics, Checkouts & 501/301 Rules
   Zero browser/DOM dependencies: safe to import from index.html AND Node.js sims.
   ============================================================================ */

export const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export const SECTOR_INDEX = Object.fromEntries(SECTORS.map((s, i) => [s, i]));

export const R_INNER_BULL = 0.09;
export const R_OUTER_BULL = 0.21;
export const R_TREBLE_IN  = 0.93;
export const R_TREBLE_OUT = 1.09;
export const R_DOUBLE_IN  = 1.56;
export const R_DOUBLE_OUT = 1.72;
export const R_NUM_RING   = 1.98;
export const R_BOARD_EDGE = 2.26;

export const ESSENTIAL_TREBLES = [10, 12, 13, 14, 15, 16, 17, 18, 19, 20];
export const BOGEY_NUMBERS = new Set([159, 162, 163, 165, 166, 168, 169]);
export const TWO_DART_BOGEYS = new Set([99, 102, 103, 105, 106, 108, 109]);

// Core scoring beds (20-15) + their exact clockwise dartboard neighbors (5,1,4,10,2,3,7,8) appear 1.4x more often!
export const HOT_SECTORS = new Set([20, 19, 18, 17, 16, 15, 5, 1, 4, 10, 2, 3, 7, 8]);

export function createSeededRng(seed = 1337) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sectorWeight(sec) {
  return HOT_SECTORS.has(sec) ? 1.4 : 1.0;
}

export function getNeighborSectors(sec) {
  const idx = SECTOR_INDEX[sec];
  if (idx === undefined) return [20, 1, 5];
  return [SECTORS[(idx + 19) % 20], SECTORS[(idx + 1) % 20]];
}

export function bedValue(code) {
  if (code === 'MISS' || !code) return 0;
  if (code === 'BULL') return 50;
  if (code === '25') return 25;
  const r = code[0], n = parseInt(code.slice(1), 10);
  if (r === 'T') return n * 3;
  if (r === 'D') return n * 2;
  return n;
}

export function parseBedCode(code) {
  if (!code || code === 'MISS') return { code: 'MISS', ring: 'MISS', sector: 0, value: 0, sub: 'MISS' };
  if (code === 'BULL') return { code: 'BULL', ring: 'BULL', sector: 25, value: 50, sub: 'BULL' };
  if (code === '25') return { code: '25', ring: '25', sector: 25, value: 25, sub: '25' };
  const ring = code[0];
  const sector = parseInt(code.slice(1), 10);
  return {
    code,
    ring,
    sector,
    value: bedValue(code),
    sub: ring === 'S' ? 'OS' : ring,
  };
}

export function bedPretty(code) {
  if (code === 'MISS' || !code) return 'Miss (0)';
  if (code === 'BULL') return 'Bull (50)';
  if (code === '25') return '25';
  return `${code} (${bedValue(code)})`;
}

export function bedToXY(code, opts = {}) {
  const rng = opts.rng || Math.random;
  const jitter = opts.jitter ?? 0;
  const jx = (rng() - 0.5) * jitter;
  const jy = (rng() - 0.5) * jitter;
  if (code === 'BULL') return { x: jx * 0.4, y: jy * 0.4 };
  if (code === '25') {
    const a = opts.angle ?? rng() * Math.PI * 2;
    const r = (R_INNER_BULL + R_OUTER_BULL) * 0.52;
    return { x: Math.sin(a) * r + jx * 0.4, y: Math.cos(a) * r + jy * 0.4 };
  }
  const ring = code[0];
  const sec = parseInt(code.slice(1), 10);
  const idx = SECTOR_INDEX[sec];
  let theta = idx * (Math.PI / 10);
  if (opts.wireShift) theta += opts.wireShift;
  let r;
  if (ring === 'D') r = opts.bottomWire ? (R_DOUBLE_IN + 0.03) : (R_DOUBLE_IN + R_DOUBLE_OUT) * 0.5;
  else if (ring === 'T') r = (R_TREBLE_IN + R_TREBLE_OUT) * 0.5;
  else r = opts.aimHigh ? 1.38 : (opts.inner ? 0.58 : 1.32);
  return { x: Math.sin(theta) * r + jx, y: Math.cos(theta) * r + jy };
}

export function sectorNumberXY(sector) {
  const idx = SECTOR_INDEX[sector];
  if (idx === undefined) return { x: 0, y: 0 };
  const theta = idx * (Math.PI / 10);
  return { x: Math.sin(theta) * R_NUM_RING, y: Math.cos(theta) * R_NUM_RING };
}

export function xyToSectorNumber(x, y) {
  const r = Math.hypot(x, y);
  if (r <= R_OUTER_BULL || r > R_BOARD_EDGE + 0.04) return null;
  let cw = Math.atan2(x, y);
  if (cw < 0) cw += Math.PI * 2;
  const idx = Math.floor(((cw + Math.PI / 20) % (Math.PI * 2)) / (Math.PI / 10));
  return SECTORS[idx] || null;
}

export function xyToBed(x, y) {
  const r = Math.hypot(x, y);
  if (r > R_DOUBLE_OUT + 0.05) return null;
  if (r <= R_INNER_BULL) return { code: 'BULL', ring: 'BULL', sector: 25, value: 50, sub: 'BULL' };
  if (r <= R_OUTER_BULL) return { code: '25', ring: '25', sector: 25, value: 25, sub: '25' };
  let cw = Math.atan2(x, y);
  if (cw < 0) cw += Math.PI * 2;
  const idx = Math.floor(((cw + Math.PI / 20) % (Math.PI * 2)) / (Math.PI / 10));
  const sector = SECTORS[idx];
  if (r >= R_DOUBLE_IN && r <= R_DOUBLE_OUT + 0.05) {
    return { code: 'D' + sector, ring: 'D', sector, value: sector * 2, sub: 'D' };
  }
  if (r >= R_TREBLE_IN && r <= R_TREBLE_OUT) {
    return { code: 'T' + sector, ring: 'T', sector, value: sector * 3, sub: 'T' };
  }
  return { code: 'S' + sector, ring: 'S', sector, value: sector, sub: r > R_TREBLE_OUT ? 'OS' : 'IS' };
}

// Complete Golden 44 (60-100 excl. 99 + 101, 104, 107, 110) — Latest 2025-2026 @yourdarts routes
export const GOLDEN_44 = [
  // Green Quick Wins (Tens, Say-60, Bull Staircase, Treble+40/20)
  { score: 60, group: 'green', route: ['S20', 'D20'], alts: [], miss: 40, aimHigh: true, cue: 'Aim high above T20 -> S20 leaves D20 (40)' },
  { score: 70, group: 'green', route: ['T20', 'D5'], alts: [['T18','D8'],['T10','D20']], miss: 50, link: ['T20','D5'], cue: 'Zero-ending (T+D=25): T20 D5 (adjacent 20-5, miss 50)' },
  { score: 80, group: 'green', route: ['T20', 'D10'], alts: [['T16','D16']], miss: 60, cue: 'Multiple of 10 -> T20 (60) + D10 (20), miss 60' },
  { score: 90, group: 'green', route: ['T20', 'D15'], alts: [['T18','D18']], miss: 70, cue: 'Zero-ending (T+D=35): T20 (60) + D15 (30) [or T18 D18], miss 70' },
  { score: 100, group: 'green', route: ['T20', 'D20'], alts: [], miss: 80, cue: 'Multiple of 10 -> T20 (60) + D20 (40), miss 80' },
  { score: 84, group: 'green', route: ['T20', 'D12'], alts: [['T16','D18']], miss: 64, cue: 'Say "60" for T20 -> 24 left = D12 [or T16 D18]' },
  { score: 88, group: 'green', route: ['T20', 'D14'], alts: [['T16','D20']], miss: 68, cue: 'Say "60" for T20 -> 28 left = D14, miss 68 (<70!)' },
  { score: 92, group: 'green', route: ['T20', 'D16'], alts: [], miss: 72, cue: 'Say "60" for T20 -> 32 left = D16, miss 72' },
  { score: 96, group: 'green', route: ['T20', 'D18'], alts: [], miss: 76, cue: 'Say "60" for T20 -> 36 left = D18, miss 76' },
  { score: 98, group: 'green', route: ['T20', 'D19'], alts: [], miss: 78, link: ['T20','D19'], cue: 'Say "60" -> 38 left = D19 (20 down to 19)' },
  { score: 101, group: 'green', route: ['T17', 'BULL'], alts: [], miss: 84, cue: 'Bull Staircase: T17 (51) + Bull (50), miss 84' },
  { score: 104, group: 'green', route: ['T18', 'BULL'], alts: [], miss: 86, cue: 'Bull Staircase (2 darts!): T18 (54) + Bull, miss 86' },
  { score: 107, group: 'green', route: ['T19', 'BULL'], alts: [], miss: 88, cue: 'Bull Staircase: T19 (57) + Bull, miss 88' },
  { score: 110, group: 'green', route: ['T20', 'BULL'], alts: [], miss: 90, cue: 'Bull Staircase: T20 (60) + Bull, miss 90' },
  { score: 82, group: 'green', route: ['T14', 'D20'], alts: [['BULL','D16']], miss: 68, cue: 'Treble + 40: T14 (42) + D20 (40), miss 68' },
  { score: 91, group: 'green', route: ['T17', 'D20'], alts: [], miss: 74, cue: 'Treble + 40: T17 (51) + D20 (40), miss 74' },
  { score: 94, group: 'green', route: ['T18', 'D20'], alts: [], miss: 76, cue: 'Treble + 40: T18 (54) + D20 (40), miss 76' },
  { score: 97, group: 'green', route: ['T19', 'D20'], alts: [], miss: 78, cue: 'Treble + 40: T19 (57) + D20 (40), miss 78' },
  { score: 71, group: 'green', route: ['T13', 'D16'], alts: [['T17','D10']], miss: 58, cue: 'Not an FDI -> T13 (39) + D16 [or T17 (51) + D10]' },
  { score: 77, group: 'green', route: ['T19', 'D10'], alts: [['T15','D16']], miss: 58, cue: 'NOT an FDI! T19 (57) + D10 [or T15 (45) + D16]' },

  // Yellow FDIs — 60s (T + D = 25, miss always 50)
  { score: 61, group: 'yellow60', route: ['T11', 'D14'], alts: [['T15','D8']], miss: 50, link: ['T11','D14'], cue: '60s FDI (T+D=25): T11 D14 (adjacent beds!), miss 50' },
  { score: 62, group: 'yellow60', route: ['T12', 'D13'], alts: [['T10','D16']], miss: 50, link: ['T12','D13'], cue: '60s FDI (T+D=25): T12 D13 (12 up to 13), miss 50' },
  { score: 63, group: 'yellow60', route: ['T13', 'D12'], alts: [['T17','D6']], miss: 50, link: ['T13','D12'], cue: '60s FDI (T+D=25): T13 D12 (13 down to 12), miss 50' },
  { score: 64, group: 'yellow60', route: ['T14', 'D11'], alts: [['T16','D8']], miss: 50, link: ['T14','D11'], cue: '60s FDI (T+D=25): T14 D11 (adjacent beds!), miss 50' },
  { score: 65, group: 'yellow60', route: ['T15', 'D10'], alts: [['25','D20']], miss: 50, link: ['T15','D10'], cue: '60s FDI (T+D=25): T15 D10 (adjacent 15-10), miss 50' },
  { score: 66, group: 'yellow60', route: ['T16', 'D9'], alts: [['T10','D18']], miss: 50, link: ['T16','D9'], cue: '60s FDI (T+D=25): T16 D9 (flip 6 upside down -> 9), miss 50' },
  { score: 67, group: 'yellow60', route: ['T17', 'D8'], alts: [['T9','D20']], miss: 50, link: ['T17','D8'], cue: '60s FDI (T+D=25): T17 D8 (7 up to 8), miss 50' },
  { score: 68, group: 'yellow60', route: ['T18', 'D7'], alts: [['T20','D4'],['T16','D10']], miss: 50, link: ['T18','D7'], cue: '60s FDI (T+D=25): T18 D7 (opposite ends of wheel spoke!), miss 50' },
  { score: 69, group: 'yellow60', route: ['T19', 'D6'], alts: [['T15','D12']], miss: 50, link: ['T19','D6'], cue: '60s FDI (T+D=25): T19 D6 (quarter past = D6!), miss 50' },

  // Yellow FDIs — 70s (Rule of 30: T+D=30 & Complement to 10, miss always 60) — Latest Revised Routes!
  { score: 72, group: 'yellow70', route: ['T12', 'D18'], alts: [['T16','D12']], miss: 60, link: ['T12','D18'], cue: '70s FDI (T+D=30 / 10-2=8 -> D18): T12 D18 (10-to/10-past mirror), miss 60' },
  { score: 74, group: 'yellow70', route: ['T14', 'D16'], alts: [['T18','D10']], miss: 60, link: ['T14','D16'], cue: '70s FDI (T+D=30 / 10-4=6 -> D16): T14 D16 (safer than T18!), miss 60' },
  { score: 75, group: 'yellow70', route: ['T15', 'D15'], alts: [['T17','D12']], miss: 60, link: ['T15','D15'], cue: '70s FDI (T+D=30 / 10-5=5 -> D15): "All the 15s" T15 D15, miss 60' },
  { score: 76, group: 'yellow70', route: ['T16', 'D14'], alts: [['T20','D8'],['D18','D20']], miss: 60, link: ['T16','D14'], cue: '70s FDI (T+D=30 / 10-6=4 -> D14): T16 D14 (16 down to 14), miss 60' },
  { score: 78, group: 'yellow70', route: ['T18', 'D12'], alts: [], miss: 60, link: ['T18','D12'], cue: '70s FDI (T+D=30 / 10-8=2 -> D12): T18 D12 (mirror of 72), miss 60' },
  { score: 79, group: 'yellow70', route: ['T19', 'D11'], alts: [['T13','D20']], miss: 60, link: ['T19','D11'], cue: '70s FDI (T+D=30 / 10-9=1 -> D11): T19 D11 (quarter to = D11!), miss 60' },

  // Yellow FDIs — 80s & 95 (T + D = 35, miss 70 / 80)
  { score: 85, group: 'yellow80', route: ['T15', 'D20'], alts: [], miss: 70, link: ['T15','D20'], cue: '80s FDI (T+D=35): T15 (45) + D20 (40), miss 70' },
  { score: 87, group: 'yellow80', route: ['T17', 'D18'], alts: [], miss: 70, link: ['T17','D18'], cue: '80s FDI (T+D=35): T17 D18 (17 up to 18), miss 70' },
  { score: 89, group: 'yellow80', route: ['T19', 'D16'], alts: [], miss: 70, link: ['T19','D16'], cue: '80s FDI (T+D=35): T19 D16 (one bed 7 between 19 & 16), miss 70' },
  { score: 95, group: 'yellow80', route: ['T15', 'BULL'], alts: [['T19','D19']], miss: 80, link: ['T15','BULL'], cue: 'Promoted FDI (Jan 2026): T15 Bull (miss 80) [or T19 D19]' },

  // Red Outlaws (5 No-Pattern Numbers — drip-fed & interleaved!)
  { score: 73, group: 'red', route: ['T19', 'D8'], alts: [], miss: 54, cue: 'Red Outlaw: T19 (57) + D8 (16) · Miss S19 -> 54' },
  { score: 81, group: 'red', route: ['T19', 'D12'], alts: [['T15','D18']], miss: 62, cue: 'Red Outlaw: T19 (57) + D12 (24) · Miss S19 -> 62' },
  { score: 83, group: 'red', route: ['T17', 'D16'], alts: [], miss: 66, cue: 'Red Outlaw: T17 (51) + D16 (32) · Miss S17 -> 66' },
  { score: 86, group: 'red', route: ['T18', 'D16'], alts: [], miss: 68, cue: 'Red Outlaw: T18 (54) + D16 (32) · Miss S18 -> 68' },
  { score: 93, group: 'red', route: ['T19', 'D18'], alts: [], miss: 74, link: ['T19','D18'], cue: 'Red Outlaw: T19 (57) + D18 (36) (19 down to 18) · Miss 74' },
];
export const G44_BY_SCORE = Object.fromEntries(GOLDEN_44.map(x => [x.score, x]));

export const FDI_SCORES = [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 72, 74, 75, 76, 78, 79, 85, 87, 89, 90];

export function getFdiRule(score) {
  if (score >= 61 && score <= 69) {
    const t = 10 + (score % 10), d = 25 - t;
    return { decade: '60s', sum: 25, cls: 'r25', treble: 'T' + t, dbl: 'D' + d, tNum: t, dNum: d, miss: 50 };
  }
  if (score === 70) {
    return { decade: '60s', sum: 25, cls: 'r25', treble: 'T20', dbl: 'D5', tNum: 20, dNum: 5, miss: 50 };
  }
  if ([72, 74, 75, 76, 78, 79].includes(score)) {
    const unit = score % 10, t = 10 + unit, d = 30 - t;
    return { decade: '70s', sum: 30, cls: 'r30', treble: 'T' + t, dbl: 'D' + d, tNum: t, dNum: d, comp10: 10 - unit, miss: 60 };
  }
  if ([85, 87, 89].includes(score)) {
    const t = 10 + (score % 10), d = 35 - t;
    return { decade: '80s', sum: 35, cls: 'r35', treble: 'T' + t, dbl: 'D' + d, tNum: t, dNum: d, miss: 70 };
  }
  if (score === 90) {
    return { decade: '80s', sum: 35, cls: 'r35', treble: 'T20', dbl: 'D15', tNum: 20, dNum: 15, miss: 70 };
  }
  return null;
}

// Stage 0A: Halving Chains
export const HALVING_CHAINS = [
  { id: 'H_D20_D10', start: 'D20', next: 'D10', cue: 'Miss D20 inside (S20) -> 20 left = D10' },
  { id: 'H_D10_D5',  start: 'D10', next: 'D5',  cue: 'Miss D10 inside (S10) -> 10 left = D5' },
  { id: 'H_D16_D8',  start: 'D16', next: 'D8',  cue: 'Miss D16 inside (S16) -> 16 left = D8' },
  { id: 'H_D8_D4',   start: 'D8',  next: 'D4',  cue: 'Miss D8 inside (S8) -> 8 left = D4' },
  { id: 'H_D4_D2',   start: 'D4',  next: 'D2',  cue: 'Miss D4 inside (S4) -> 4 left = D2' },
  { id: 'H_D2_D1',   start: 'D2',  next: 'D1',  cue: 'Miss D2 inside (S2) -> 2 left = D1 (Mad House)' },
  { id: 'H_D18_D9',  start: 'D18', next: 'D9',  cue: 'Miss D18 inside (S18) -> 18 left = D9' },
  { id: 'H_D12_D6',  start: 'D12', next: 'D6',  cue: 'Miss D12 inside (S12) -> 12 left = D6 (then awkward D3)' },
];

// Stage 1: Below-60 Double Smiths
export const BELOW_60_ITEMS = [
  { id: 'B60_38_D16', score: 38, targetD: 'D16', setup: ['S6'], tier: 'core', cue: 'D16 (-2): 8 - 2 = 6 (lower half) -> S6 D16' },
  { id: 'B60_41_D16', score: 41, targetD: 'D16', setup: ['S9'], tier: 'core', cue: 'D16 (-2): 1 - 2 wraps to 9 (lower half 33-41) -> S9 D16' },
  { id: 'B60_45_D16', score: 45, targetD: 'D16', setup: ['S13'], tier: 'core', cue: 'D16 (-2): 5 - 2 = 3 (upper half 42-51) -> S13 D16' },
  { id: 'B60_49_D16', score: 49, targetD: 'D16', setup: ['S17'], tier: 'core', cue: 'D16 (-2): 9 - 2 = 7 (upper half 42-51) -> S17 D16' },
  { id: 'B60_51_D16', score: 51, targetD: 'D16', setup: ['S19'], tier: 'core', cue: 'D16 (-2): 1 - 2 wraps to 9 (upper half) -> S19 D16' },
  { id: 'B60_52_D16', score: 52, targetD: 'D16', setup: ['S20'], tier: 'core', aimHigh: true, cue: 'D16 ceiling (52): Aim high S20 -> D16 (no single for 53+!)' },
  { id: 'B60_39_D18', score: 39, targetD: 'D18', setup: ['S3'], tier: 'core', cue: 'D18 (+4): 9 + 4 -> 3 (lower half 37-45) -> S3 D18' },
  { id: 'B60_42_D18', score: 42, targetD: 'D18', setup: ['S6'], tier: 'core', cue: 'D18 (+4): 2 + 4 = 6 (lower half! S6, NOT S16) -> S6 D18' },
  { id: 'B60_48_D18', score: 48, targetD: 'D18', setup: ['S12'], tier: 'core', cue: 'D18 (+4): 8 + 4 -> 2 (upper half 46-55) -> S12 D18' },
  { id: 'B60_54_D18', score: 54, targetD: 'D18', setup: ['S18'], tier: 'core', cue: 'D18 (+4): 4 + 4 = 8 (upper half: 3x18=54) -> S18 D18' },
  { id: 'B60_56_D18', score: 56, targetD: 'D18', setup: ['S20'], tier: 'core', aimHigh: true, cue: 'D18 ceiling (56): Aim high S20 -> D18' },
  { id: 'B60_25_D8',  score: 25, targetD: 'D8',  setup: ['S9'], tier: 'core', cue: 'All the 8s = +4! 5 + 4 = 9 (lower half 17-25) -> S9 D8' },
  { id: 'B60_31_D8',  score: 31, targetD: 'D8',  setup: ['S15'], tier: 'core', cue: 'All the 8s = +4! 1 + 4 = 5 (upper half 26-35) -> S15 D8' },
  { id: 'B60_35_D8',  score: 35, targetD: 'D8',  setup: ['S19'], tier: 'core', cue: 'All the 8s = +4! 5 + 4 = 9 (upper half) -> S19 D8' },
  { id: 'B60_57_D20', score: 57, targetD: 'D20', setup: ['S17'], tier: 'core', cue: 'Read off 40 -> S17 D20 (never throw 25: Bull leaves 7)' },
  { id: 'B60_53_D20', score: 53, targetD: 'D20', setup: ['S13'], tier: 'core', cue: 'Read off 40 -> S13 D20 (exceeds D16 cap 52!)' },
  { id: 'B60_31_D10', score: 31, targetD: 'D10', setup: ['S11'], tier: 'core', cue: 'Read off 20 -> S11 D10' },
  { id: 'B60_50_2D',  score: 50, targetD: 'ANY', setup: ['T10','S18','S14'], darts: 2, aimHigh: true, tier: 'core',
    cue: '50 Playbook (2-3 darts): T10 D10 (miss S10->40!), S18 D16 (aim high!), or S14 D18' },
  { id: 'B60_46_WDG', score: 46, targetD: 'ANY', setup: ['S10','S6'], wedge: ['S10','S6'], tier: 'core',
    cue: '46 "10/6 Slice of Pizza": S10->D18, S6->D20, T10->D8, T6->D14!' },
  { id: 'B60_48_WDG', score: 48, targetD: 'ANY', setup: ['S8','S16'], wedge: ['S8','S16'], tier: 'core',
    cue: '48 "16/8 Real Estate": S8->D20, S16->D16, T8->D12 (only T16 busts!)' },
  { id: 'B60_37_D14', score: 37, targetD: 'D14', setup: ['S9'], tier: 'exp', cue: 'All the 4s = +2! 7 + 2 = 9 (lower half 29-37) -> S9 D14' },
  { id: 'B60_44_D14', score: 44, targetD: 'D14', setup: ['S16'], tier: 'exp', cue: 'All the 4s = +2! 4 + 2 = 6 (upper half 38-47) -> S16 D14' },
  { id: 'B60_17_D4',  score: 17, targetD: 'D4',  setup: ['S9'], tier: 'exp', cue: 'All the 4s = +2! 7 + 2 = 9 (lower half 9-17) -> S9 D4' },
  { id: 'B60_27_D4',  score: 27, targetD: 'D4',  setup: ['S19'], tier: 'exp', cue: 'All the 4s = +2! 7 + 2 = 9 (upper half 18-27) -> S19 D4' },
  { id: 'B60_31_D12', score: 31, targetD: 'D12', setup: ['S7'], tier: 'exp', cue: 'D12 (+6): 1 + 6 = 7 (lower half 25-33) -> S7 D12' },
  { id: 'B60_41_D12', score: 41, targetD: 'D12', setup: ['S17'], tier: 'exp', cue: 'D12 (+6): 1 + 6 = 7 (upper half 34-43) -> S17 D12' },
];

// Stage 3: Sod's Law — Live Miss Rule, 1-Dart Abandonment & Safety Plays
export const SODS_LAW_ITEMS = [
  { id: 'SL_62_1D', score: 62, darts: 1, valid: ['T10'], trap: { T12: { drift: 'S12', why: '1 dart left! Abandon the FDI — T10 leaves D16 instead of awkward D13!' } },
    cue: '1 dart on 62: Abandon T12 FDI -> T10 Hub leaves D16 (32)!' },
  { id: 'SL_66_1D', score: 66, darts: 1, valid: ['T10'], trap: { T16: { drift: 'S16', why: '1 dart left! T10 leaves D18 (36) instead of odd D9!' } },
    cue: '1 dart on 66: Abandon T16 FDI -> T10 Hub leaves D18 (36)!' },
  { id: 'SL_70_1D', score: 70, darts: 1, valid: ['T10','T18'], trap: { T20: { drift: 'S20', why: '1 dart left! T20 leaves ugly D5 — throw T10 for D20 (or T18 for D8)!' } },
    cue: '1 dart on 70: Abandon T20 -> T10 Hub leaves D20 (40)!' },
  { id: 'SL_64_1D', score: 64, darts: 1, valid: ['T16','T8'], trap: { T14: { drift: 'S14', why: '1 dart left! T14 leaves odd D11 — use T16 (D8) or T8 (D20)!' } },
    cue: '1 dart on 64: Abandon T14 -> T16 leaves D8 (or T8 leaves D20)!' },
  { id: 'SL_68_1D', score: 68, darts: 1, valid: ['T16','T20'], trap: { T18: { drift: 'S18', why: '1 dart left! T18 leaves odd D7 — use T16 (D10) or T20 (D4)!' } },
    cue: '1 dart on 68: Abandon T18 -> T16 leaves D10 (or T20 leaves D4)!' },
  { id: 'SL_88_1D', score: 88, darts: 1, valid: ['T20'], trap: { T16: { drift: 'S16', why: 'S16 leaves 72 (above 70 -> needs a treble!). T20 leaves 68 (<70)!' } },
    cue: '1 dart on 88 (<70 rule): T20 (S20->68 < 70) beats T16 (S16->72)!' },
  { id: 'SL_129_1D', score: 129, darts: 1, valid: ['T20'], trap: { T19: { drift: 'S19', why: 'With 1 dart left, T19 leaves 72 (needs a treble), T20 drops below 70 (69)!' } },
    cue: '1 dart on 129 (<70 rule): Switch to T20 -> 69 (<70) beats T19 -> 72!' },
  { id: 'SL_74_SAFE', score: 74, darts: 2, valid: ['T14'], forceMiss: true, trap: { T18: { drift: 'S1', why: 'Stray S1 next to 18 leaves 73 (above 70!). T14 drops below 70 safely!' } },
    cue: 'Safer 74: T14 D16 avoids S1->73 trap (miss S14 -> 60)!' },
  { id: 'SL_76_DD', score: 76, darts: 2, valid: ['D18','T16'], bottomWire: true, forceMiss: true,
    cue: '76 Double-Double: Aim bottom wire of D18 for D20 (inside miss S18->58, stay on 18s!) or T16 D14' },
  { id: 'SL_64_DD', score: 64, darts: 2, valid: ['D16','T16'], bottomWire: true,
    cue: '64 Double-Double (2 darts): Aim bottom wire of D16 for D16 (inside miss S16->48 wedge!)' },
  { id: 'SL_86_MISS', score: 86, darts: 2, valid: ['T18'], forceMiss: true,
    cue: 'Sod\'s Law on 86: Open T18 — if S18 hits (-20+2 = 68), switch for 1-dart setup!' },
  { id: 'SL_91_MISS', score: 91, darts: 2, valid: ['T17'], forceMiss: true,
    cue: 'Sod\'s Law on 91: Open T17 — if S17 hits (-20+3 = 74), set up D16 via T14!' },
  { id: 'SL_83_MISS', score: 83, darts: 2, valid: ['T17'], forceMiss: true,
    cue: 'Sod\'s Law on 83: Open T17 — if S17 hits (-20+3 = 66), switch to T10 Hub (D18)!' },
  { id: 'SL_50_PRESS', score: 50, darts: 1, rivalClose: true, valid: ['BULL'], trap: { S18: { drift: 'S18', why: 'Rival is on D16 with 1 dart in your hand — you MUST fire at Bull!' } },
    cue: 'Rival on D16, 1 dart on 50: Fire straight at Bullseye!' },
];

// Stage 4: Ton-Plus Reductions (101-170), 25/30/35 FDI Bridges & Neighbor/Splash Traps
export const TON_PLUS_ITEMS = [
  { id: 'TP_170', score: 170, open: ['T20'], next: ['T20','BULL'], cue: 'Rule of 40: 70 + 40 = 110 (T20 Bull) — The Big Fish!' },
  { id: 'TP_161', score: 161, open: ['T20','T19'], next: ['T17','BULL'], cue: 'Rule of 40: 61 + 40 = 101 (T17 Bull)' },
  { id: 'TP_160', score: 160, open: ['T20'], next: ['T20','D20'], cue: 'Rule of 40: 60 + 40 = 100 (T20 D20)' },
  { id: 'TP_156', score: 156, open: ['T20'], next: ['T20','D18'], cue: 'Rule of 40: 56 + 40 = 96 ("Say 60" -> T20 D18)' },
  { id: 'TP_152', score: 152, open: ['T20'], next: ['T20','D16'], cue: 'Rule of 40: 52 + 40 = 92 ("Say 60" -> T20 D16)' },
  { id: 'TP_149', score: 149, fdiBridge: true, open: ['T20'], next: ['T19','D16'], cue: 'Rule of 40 -> 89 · 80s FDI (Rule of 35): T19 + D16 = 35!' },
  { id: 'TP_148', score: 148, open: ['T20'], next: ['T20','D14'], cue: 'Rule of 40 (140s double the 4!): 48 + 40 = 88 (T20 D14)' },
  { id: 'TP_147', score: 147, fdiBridge: true, open: ['T20','T19'], next: ['T17','D18'], cue: 'Rule of 40 -> 87 · 80s FDI (Rule of 35): T17 + D18 = 35!' },
  { id: 'TP_145', score: 145, fdiBridge: true, open: ['T20'], next: ['T15','D20'], cue: 'Rule of 40 -> 85 · 80s FDI (Rule of 35): T15 + D20 = 35!' },
  { id: 'TP_144', score: 144, fdiBridge: true, open: ['T20','T19'], next: ['T20','D12'], cue: 'T19 (+43) -> 87 (Rule of 35: T17+D18=35!) or T20 -> 84 (T20 D12)' },
  { id: 'TP_142', score: 142, fdiBridge: true, open: ['T20','T19'], next: ['T14','D20'], twoT19: 'D14', cue: 'T19 (+43) -> 85 (Rule of 35: T15+D20=35!) or Two-T19 (-14 -> D14) or T20 -> 82' },
  { id: 'TP_139', score: 139, fdiBridge: true, open: ['T20','T19'], next: ['T19','D11'], cue: 'Rule of 40 -> 79 · 70s FDI (Rule of 30): T19 + D11 = 30 (quarter to)!' },
  { id: 'TP_136', score: 136, fdiBridge: true, open: ['T20'], next: ['T16','D14'], cue: 'Rule of 40 -> 76 · 70s FDI (Rule of 30): T16 + D14 = 30 (or T20 T20 D8)' },
  { id: 'TP_135', score: 135, fdiBridge: true, open: ['T20','BULL'], next: ['T15','D15'], cue: 'Rule of 40 -> 75 · 70s FDI (Rule of 30): T15 + D15 = 30 ("All the 15s")!' },
  { id: 'TP_132', score: 132, fdiBridge: true, open: ['T20','BULL'], next: ['T12','D18'], cue: 'Rule of 40 -> 72 · 70s FDI (Rule of 30): T12 + D18 = 30!' },
  { id: 'TP_131', score: 131, open: ['T20'], next: ['T13','D16'], cue: 'Rule of 40: 31 + 40 = 71 (NOT an FDI -> T13 D16 or T17 D10)' },
  { id: 'TP_130', score: 130, fdiBridge: true, open: ['T20','T19'], next: ['T20','D5'], twoT19: 'D8', cue: 'Rule of 40 -> 70 (Rule of 25: T20+D5=25!) or Two-T19 (-14 -> D8)' },
  { id: 'TP_127', score: 127, fdiBridge: true, open: ['T20'], next: ['T17','D8'], cue: 'Rule of 40 -> 67 · 60s FDI (Rule of 25): T17 + D8 = 25!' },
  { id: 'TP_125', score: 125, fdiBridge: true, open: ['T20','25','BULL'], next: ['T15','D10'], cue: 'Rule of 40 -> 65 · 60s FDI (Rule of 25): T15 + D10 = 25! (or 25 -> 100)' },
  { id: 'TP_124', score: 124, fdiBridge: true, open: ['T20'], next: ['T14','D11'], cue: 'Rule of 40 -> 64 · 60s FDI (Rule of 25): T14 + D11 = 25 (adjacent beds)!' },
  { id: 'TP_121', score: 121, fdiBridge: true, open: ['T20'], next: ['T11','D14'], cue: 'Rule of 40 -> 61 · 60s FDI (Rule of 25): T11 + D14 = 25 (adjacent beds)!' },
  { id: 'TP_115', score: 115, open: ['T20','T19'], next: ['S15','D20'], cue: 'Rule of 40: 15+40=55 (S15 D20) · Or 10th T19 start (miss 96 vs 95!)' },
  { id: 'TP_164', score: 164, open: ['T20','T19'], next: ['T18','BULL'], twoT19: 'BULL', cue: 'Two-T19 (-14): 64 - 14 = 50 (Bull)! Or T20 -> 104 (T18 Bull)' },
  { id: 'TP_154', score: 154, open: ['T20','T19'], next: ['T18','D20'], twoT19: 'D20', cue: 'Two-T19 (-14): 54 - 14 = 40 (D20)! Or T20 -> 94 (T18 D20)' },
  { id: 'TP_150', score: 150, fdiBridge: true, open: ['T20','T19'], next: ['T20','D15'], twoT19: 'D18', cue: 'Rule of 40 -> 90 (Rule of 35: T20+D15=35!) or Two-T19 (-14 -> D18)' },
  { id: 'TP_146', score: 146, fdiBridge: true, open: ['T20','T19'], next: ['T18','D16'], twoT19: 'D16', cue: 'T19 (+43) -> 89 (Rule of 35: T19+D16=35!) or Two-T19 (-14 -> D16)' },
  { id: 'TP_138', score: 138, fdiBridge: true, open: ['T20','T19'], next: ['T18','D12'], twoT19: 'D12', cue: 'Rule of 40 -> 78 · 70s FDI (Rule of 30): T18 + D12 = 30! (or Two-T19 -> D12)' },
  { id: 'TP_134', score: 134, fdiBridge: true, open: ['T20','T19'], next: ['T14','D16'], twoT19: 'D10', cue: 'Rule of 40 -> 74 · 70s FDI (Rule of 30): T14 + D16 = 30! (or Two-T19 -> D10)' },
  { id: 'TP_129', score: 129, fdiBridge: true, open: ['T19'], next: ['T12','D18'],
    traps: { T20: { drift: 'S20', why: 'Trap! S20 leaves 109 (NO 2-dart out!). Open T19 -> S19 leaves 110, T19 leaves 72 (+43)!' } },
    cue: 'Rule of 43 (T19) -> 72 · 70s FDI (Rule of 30): T12 + D18 = 30! (S19 -> 110)' },
  { id: 'TP_128', score: 128, fdiBridge: true, open: ['T18'], next: ['T14','D16'],
    traps: {
      T20: { drift: 'S20', why: 'Trap! S20 leaves 108 (no 2-dart out!). Open T18 -> S18 leaves 110!' },
      T19: { drift: 'S19', why: 'Trap! S19 leaves 109 (no 2-dart out!). Open T18 -> leaves 74 (Rule of 30: T14 D16 or stay T18 D10)!' }
    },
    cue: 'Mandatory T18 -> 74 · 70s FDI (Rule of 30): T14 + D16 = 30 (or stay T18 D10)!' },
  { id: 'TP_126', score: 126, fdiBridge: true, open: ['T19'], next: ['T19','D6'],
    traps: { T20: { drift: 'S20', why: 'Trap! S20 leaves 106 (no 2-dart out!). Open T19 -> +43 = 69 (Rule of 25: T19+D6=25)!' } },
    cue: 'Rule of 43 (T19) -> 69 · 60s FDI (Rule of 25): T19 + D6 = 25! (S19 -> 107)' },
  { id: 'TP_123', score: 123, fdiBridge: true, open: ['T19'], next: ['T16','D9'],
    traps: { T20: { drift: 'S20', why: 'Trap! S20 leaves 103 (no 2-dart out!). Open T19 -> +43 = 66 (NOT 69!), S19->104!' } },
    cue: 'Rule of 43 (T19) -> 66 · 60s FDI (Rule of 25): T16 + D9 = 25! (S19 -> 104)' },
  { id: 'TP_122', score: 122, fdiBridge: true, open: ['T18'], next: ['T18','D7'],
    traps: {
      T20: { drift: 'S20', why: 'Trap! S20 leaves 102 (no 2-dart out!). Open T18 -> 68 (Rule of 25: T18+D7=25)!' },
      T19: { drift: 'S19', why: 'Trap! S19 leaves 103 (no 2-dart out!). Open T18 -> 68 (Rule of 25: T18+D7=25)!' }
    },
    cue: 'Mandatory T18 -> 68 · 60s FDI (Rule of 25): T18 + D7 = 25! (S18 -> 104)' },
  { id: 'TP_119', score: 119, fdiBridge: true, open: ['T19'], next: ['T12','D13'],
    traps: { T20: { drift: 'S20', why: 'Trap! S20 leaves 99 (the ONLY 2-digit 3-dart score!). Open T19 -> 62 (Rule of 25: T12+D13=25)!' } },
    cue: 'Rule of 43 (T19) -> 62 · 60s FDI (Rule of 25): T12 + D13 = 25! (S19 -> 100)' },
  { id: 'TP_107', score: 107, open: ['T19'], next: ['T10','D10'],
    traps: { T20: { drift: 'S1', why: 'Splash Trap! Next to 20, S1 leaves 106 and S5 leaves 102! T19 is sole winner!' } },
    cue: 'Sole Winner T19 (both 2 & 3 darts): S7->100, S3->104 · T20 risks S1->106 / S5->102!' },
  { id: 'TP_104_3D', score: 104, open: ['T19','T16'], next: ['S15','D16'],
    traps: {
      T18: { drift: 'S1', why: 'Revised Rule! With 3 darts, T18 risks S1 -> 103 (no 2-dart out!). T19 & T16 win!' },
      T20: { drift: 'S5', why: 'Double Danger! T20 risks S1->103 AND S5->99! Open T19 (zero dangers) or T16!' }
    },
    cue: '104 with 3 darts: T19 (S3->101, S7->97) or T16 (stays on 16s) — T18 is 2-dart ONLY!' },
  { id: 'TP_103', score: 103, open: ['T19','T17','T16'], next: ['S10','D18'],
    traps: {
      T20: { drift: 'S1', why: 'Splash Trap! Stray S1 leaves 102! T19 leaves 46 (10/6 pizza wedge) + S3->100!' },
      T18: { drift: 'S4', why: 'Splash Trap! Stray S4 leaves 99! T19 wins (T17/T16 are also safe).' }
    },
    cue: '103 with 3 darts: T19 leaves 46 (10/6 safe wedge!) + S3->100, S7->96!' },
  { id: 'TP_101_3D', score: 101, open: ['T20'], next: ['S9','D16'],
    traps: { T17: { drift: 'S2', why: '3-Dart Trap! Stray S2 next to 17 leaves 99! Use T20 with 3 darts (T17 Bull is 2-dart only)!' } },
    cue: '101 with 3 darts: Open T20 (S1->100, S5->96) — avoid T17\'s S2->99 trap!' },
];
export const TON_PLUS_BY_SCORE = Object.fromEntries(TON_PLUS_ITEMS.map(x => [x.score, x]));

// Stage 5: Bogey Dodger (220s, 260s, 300s Teen Cover Shot + 228/268/308 center trap!)
export const BOGEY_ITEMS = [
  { id: 'BG_229', score: 229, prior: ['S20','S20'], rem: 189, cover: 'S19', targetLeave: 170, centerOk: true,  cue: '189 left (1 dart): Last digit 9 -> Teen Cover S19 leaves 170!' },
  { id: 'BG_228', score: 228, prior: ['S20','S20'], rem: 188, cover: 'S18', targetLeave: 170, centerOk: false, cue: '188 left: Cover S18 -> 170! NEVER throw 25 (leaves bogey 163!)' },
  { id: 'BG_226', score: 226, prior: ['S20','S20'], rem: 186, cover: 'S16', targetLeave: 170, centerOk: true,  cue: '186 left: Last digit 6 -> Teen Cover S16 leaves 170!' },
  { id: 'BG_225', score: 225, prior: ['S20','S20'], rem: 185, cover: 'S15', targetLeave: 170, centerOk: true,  cue: '185 left: Last digit 5 -> Teen Cover S15 leaves 170!' },
  { id: 'BG_223', score: 223, prior: ['S20','S20'], rem: 183, cover: 'S13', targetLeave: 170, centerOk: true,  cue: '183 left: Last digit 3 -> Teen Cover S13 leaves 170!' },
  { id: 'BG_222', score: 222, prior: ['S20','S20'], rem: 182, cover: 'S12', targetLeave: 170, centerOk: true,  cue: '182 left: Last digit 2 -> Teen Cover S12 leaves 170!' },
  { id: 'BG_219', score: 219, prior: ['S20','S20'], rem: 179, cover: 'S19', targetLeave: 160, centerOk: true,  cue: '179 left (S20 leaves bogey 159!): Cover S19 -> leaves 160!' },
  { id: 'BG_268', score: 268, prior: ['T20','S20'], rem: 188, cover: 'S18', targetLeave: 170, centerOk: false, cue: '268 -> after T20+S20 (188 left): S18 -> 170! NEVER 25 (-> 163 bogey!)' },
  { id: 'BG_266', score: 266, prior: ['T20','S20'], rem: 186, cover: 'S16', targetLeave: 170, centerOk: true,  cue: '266 -> 186 left: Teen Cover S16 leaves 170!' },
  { id: 'BG_265', score: 265, prior: ['T20','S20'], rem: 185, cover: 'S15', targetLeave: 170, centerOk: true,  cue: '265 -> 185 left: Teen Cover S15 leaves 170!' },
  { id: 'BG_259', score: 259, prior: ['T20','S20'], rem: 179, cover: 'S19', targetLeave: 160, centerOk: true,  cue: '259 -> 179 left: S20 leaves bogey 159 -> S19 leaves 160!' },
  { id: 'BG_308', score: 308, prior: ['T20','T20'], rem: 188, cover: 'S18', targetLeave: 170, centerOk: false, cue: '308 (after T20+T20): Resist the 180! S18 -> 170 (NEVER 25 -> 163!)' },
  { id: 'BG_305', score: 305, prior: ['T20','T20'], rem: 185, cover: 'S15', targetLeave: 170, centerOk: true,  cue: '305 (after T20+T20): S20 leaves bogey 165 -> Teen Cover S15 leaves 170!' },
  { id: 'BG_303', score: 303, prior: ['T20','T20'], rem: 183, cover: 'S13', targetLeave: 170, centerOk: true,  cue: '303 (after T20+T20): S20 leaves bogey 163 -> Teen Cover S13 leaves 170!' },
];

// Stage 6: Croupier's Chalk — Visual Marking (62 curated shapes)
export const MARKING_ITEMS = [
  { id: 'MK_19_4X', darts: ['T19','S19'], groupIdx: [0,1], total: 76, cat: 'core', cue: '4x19 = 76 ("Double your double": 2x38)' },
  { id: 'MK_18_4X', darts: ['T18','S18'], groupIdx: [0,1], total: 72, cat: 'core', cue: '4x18 = 72 ("Double your double": 2x36)' },
  { id: 'MK_17_4X', darts: ['T17','S17'], groupIdx: [0,1], total: 68, cat: 'core', cue: '4x17 = 68 ("Double your double": 2x34)' },
  { id: 'MK_19_5X', darts: ['T19','S19','S19'], groupIdx: [0,1,2], total: 95, cat: 'core', cue: '5x19 = 95 (1 treble + 2 singles in 19s)' },
  { id: 'MK_18_5X', darts: ['T18','S18','S18'], groupIdx: [0,1,2], total: 90, cat: 'core', cue: '5x18 = 90 (1 treble + 2 singles in 18s)' },
  { id: 'MK_17_5X', darts: ['T17','S17','S17'], groupIdx: [0,1,2], total: 85, cat: 'core', cue: '5x17 = 85 (1 treble + 2 singles in 17s)' },
  { id: 'MK_19_6X', darts: ['T19','T19'], groupIdx: [0,1], total: 114, cat: 'core', cue: '6x19 = 114 ("Two treble 19s are 114!")' },
  { id: 'MK_18_6X', darts: ['T18','T18'], groupIdx: [0,1], total: 108, cat: 'core', cue: '6x18 = 108 (2x54 = Shanghai 18s)' },
  { id: 'MK_17_6X', darts: ['T17','T17'], groupIdx: [0,1], total: 102, cat: 'core', cue: '6x17 = 102 (2x51 = Shanghai 17s)' },
  { id: 'MK_19_7X', darts: ['T19','T19','S19'], groupIdx: [0,1,2], total: 133, cat: 'core', cue: '7x19 = 133 (114 + 19)' },
  { id: 'MK_18_7X', darts: ['T18','T18','S18'], groupIdx: [0,1,2], total: 126, cat: 'core', cue: '7x18 = 126 (108 + 18)' },
  { id: 'MK_17_7X', darts: ['T17','T17','S17'], groupIdx: [0,1,2], total: 119, cat: 'core', cue: '7x17 = 119 (102 + 17)' },
  { id: 'MK_19_8X', darts: ['T19','T19','D19'], groupIdx: [0,1,2], total: 152, cat: 'core', cue: '8x19 = 152 (114 + 38)' },
  { id: 'MK_18_8X', darts: ['T18','T18','D18'], groupIdx: [0,1,2], total: 144, cat: 'core', cue: '8x18 = 144 (108 + 36)' },
  { id: 'MK_17_8X', darts: ['T17','T17','D17'], groupIdx: [0,1,2], total: 136, cat: 'core', cue: '8x17 = 136 (102 + 34)' },
  { id: 'MK_19_9X', darts: ['T19','T19','T19'], groupIdx: [0,1,2], total: 171, cat: 'core', cue: '9x19 = 171 (3 treble 19s)' },
  { id: 'MK_18_9X', darts: ['T18','T18','T18'], groupIdx: [0,1,2], total: 162, cat: 'core', cue: '9x18 = 162 (3 treble 18s)' },
  { id: 'MK_17_9X', darts: ['T17','T17','T17'], groupIdx: [0,1,2], total: 153, cat: 'core', cue: '9x17 = 153 (3 treble 17s)' },
  { id: 'MK_S57', darts: ['S20','S19','S18'], groupIdx: [0,1,2], total: 57, cat: 'cross', cue: 'Three-Single Anchor: S20+S19+S18 = 57 (same as T19!)' },
  { id: 'MK_S56', darts: ['S17','S20','S19'], groupIdx: [0,1,2], total: 56, cat: 'cross', cue: 'Pivot from 17: S17+S20+S19 = 56' },
  { id: 'MK_S55', darts: ['S17','S18','S20'], groupIdx: [0,1,2], total: 55, cat: 'cross', cue: 'Pivot from 17: S17+S18+S20 = 55' },
  { id: 'MK_S54', darts: ['S17','S19','S18'], groupIdx: [0,1,2], total: 54, cat: 'cross', cue: 'Pivot from 17: S17+S19+S18 = 54' },
  { id: 'MK_117', darts: ['T20','T19'], groupIdx: [0,1], total: 117, cat: 'cross', cue: 'Steal Last Digit (60+50s = 11_): T20+T19(57) = 117' },
  { id: 'MK_114', darts: ['T20','T18'], groupIdx: [0,1], total: 114, cat: 'cross', cue: 'Steal Last Digit (60+50s = 11_): T20+T18(54) = 114' },
  { id: 'MK_111A', darts: ['T20','T17'], groupIdx: [0,1], total: 111, cat: 'cross', cue: 'Steal Last Digit (60+50s = 11_): T20+T17(51) = 111' },
  { id: 'MK_111B', darts: ['T19','T18'], groupIdx: [0,1], total: 111, cat: 'cross', cue: 'Both in 50s -> Add Last Digits (7+4): T19+T18 = 111' },
  { id: 'MK_108', darts: ['T19','T17'], groupIdx: [0,1], total: 108, cat: 'cross', cue: 'Both in 50s -> Add Last Digits (7+1): T19+T17 = 108' },
  { id: 'MK_105', darts: ['T18','T17'], groupIdx: [0,1], total: 105, cat: 'cross', cue: 'Both in 50s -> Add Last Digits (4+1): T18+T17 = 105' },
  { id: 'MK_97',  darts: ['T20','S19','S18'], groupIdx: [0,1,2], total: 97, cat: 'cross', cue: 'Top-3 Mixed (skip by 2): T20+S19+S18 = 97' },
  { id: 'MK_95M', darts: ['S20','T19','S18'], groupIdx: [0,1,2], total: 95, cat: 'cross', cue: 'Top-3 Mixed (skip by 2): S20+T19+S18 = 95' },
  { id: 'MK_93',  darts: ['S20','S19','T18'], groupIdx: [0,1,2], total: 93, cat: 'cross', cue: 'Top-3 Mixed (skip by 2): S20+S19+T18 = 93' },
  { id: 'MK_135', darts: ['T20','T19','S18'], groupIdx: [0,1], total: 135, cat: 'cross', cue: '2 Trebles + 1 Single (skip by 2): T20+T19(117)+18 = 135' },
  { id: 'MK_133', darts: ['T20','T18','S19'], groupIdx: [0,1], total: 133, cat: 'cross', cue: '2 Trebles + 1 Single (skip by 2): T20+T18(114)+19 = 133' },
  { id: 'MK_131', darts: ['T19','T18','S20'], groupIdx: [0,1], total: 131, cat: 'cross', cue: '2 Trebles + 1 Single (skip by 2): T19+T18(111)+20 = 131' },
  { id: 'MK_BC1', darts: ['S20','T19','S19'], groupIdx: [1,2], oddIdx: 0, total: 96, cat: 'big', cue: '"What do I know?" Snap T19+S19 (76) + 20 = 96!' },
  { id: 'MK_BC2', darts: ['T5','T19','S19'],  groupIdx: [1,2], oddIdx: 0, total: 91, cat: 'big', cue: 'Snap T19+S19 (76) + T5(15): round +20 (96), -5 = 91!' },
  { id: 'MK_BC3', darts: ['S11','T18','S18'], groupIdx: [1,2], oddIdx: 0, total: 83, cat: 'big', cue: 'Snap T18+S18 (72) + 11: +10 (82), +1 = 83!' },
  { id: 'MK_BC4', darts: ['T20','T19','S7'],  groupIdx: [0,1], oddIdx: 2, total: 124, cat: 'big', cue: 'Snap T20+T19 (117) + 7 = 124!' },
  { id: 'MK_BC5', darts: ['T20','T18','T1'],  groupIdx: [0,1], oddIdx: 2, total: 117, cat: 'big', cue: 'Snap T20+T18 (114) + T1(3) = 117!' },
  { id: 'MK_BC6', darts: ['T17','S17','S19'], groupIdx: [0,1], oddIdx: 2, total: 87, cat: 'big', cue: 'Snap T17+S17 (68) + 19: round +20 (88), -1 = 87!' },
  { id: 'MK_BC7', darts: ['T19','T19','S18'], groupIdx: [0,1], oddIdx: 2, total: 132, cat: 'big', cue: 'Snap 2xT19 (114) + 18: round +20 (134), -2 = 132!' },
  { id: 'MK_BC8', darts: ['T20','S20','S19'], groupIdx: [0,1], oddIdx: 2, total: 99, cat: 'big', cue: 'Snap T20+S20 (80) + 19 = 99!' },
  { id: 'MK_PM1', darts: ['T20','S5','S1'],   groupIdx: [0],   oddIdx: 1, total: 66, cat: 'miss', cue: 'Classic 20s visit: T20 (60) + stray 5 + 1 = 66!' },
  { id: 'MK_PM2', darts: ['S20','S20','S5'],  groupIdx: [0,1], oddIdx: 2, total: 45, cat: 'miss', cue: '2xS20 (40) + stray S5 = 45!' },
  { id: 'MK_PM3', darts: ['S20','S5','S1'],   groupIdx: [1,2], oddIdx: 0, total: 26, cat: 'miss', cue: 'The dreaded "Breakfast": 20 + 5 + 1 = 26!' },
  { id: 'MK_PM4', darts: ['T20','S20','S5'],  groupIdx: [0,1], oddIdx: 2, total: 85, cat: 'miss', cue: 'Snap T20+S20 (80) + stray S5 = 85!' },
  { id: 'MK_PM5', darts: ['T20','S20','S1'],  groupIdx: [0,1], oddIdx: 2, total: 81, cat: 'miss', cue: 'Snap T20+S20 (80) + stray S1 = 81!' },
  { id: 'MK_PM6', darts: ['S20','T5','S20'],  groupIdx: [0,2], oddIdx: 1, total: 55, cat: 'miss', cue: 'Snap 2xS20 (40) + stray T5 (15) = 55!' },
  { id: 'MK_PM7', darts: ['S20','T1','S20'],  groupIdx: [0,2], oddIdx: 1, total: 43, cat: 'miss', cue: 'Snap 2xS20 (40) + stray T1 (3) = 43!' },
  { id: 'MK_PM8', darts: ['T19','S7','S3'],   groupIdx: [1,2], oddIdx: 0, total: 67, cat: 'miss', cue: 'Stray 7+3 = 10! Snap 57 + 10 = 67!' },
  { id: 'MK_PM9', darts: ['S19','S19','S7'],  groupIdx: [0,1], oddIdx: 2, total: 45, cat: 'miss', cue: '2xS19 (38) + stray S7 = 45!' },
  { id: 'MK_PM10', darts: ['T18','S4','S18'], groupIdx: [0,2], oddIdx: 1, total: 76, cat: 'miss', cue: 'Snap T18+S18 (72) + stray S4 = 76!' },
  { id: 'MK_PM11', darts: ['T16','S8','S7'],  groupIdx: [1,2], oddIdx: 0, total: 63, cat: 'miss', cue: 'T16 (48) + stray 8+7 (15) = 63!' },
  { id: 'MK_PM12', darts: ['T15','S10','S2'], groupIdx: [0,1], oddIdx: 2, total: 57, cat: 'miss', cue: 'T15 (45) + 10 (55) + 2 = 57!' },
  { id: 'MK_BL1', darts: ['25','T20','S20'],  groupIdx: [1,2], oddIdx: 0, total: 105, cat: 'bull', cue: 'Snap T20+S20 (80) + Outer Bull (25) = 105!' },
  { id: 'MK_BL2', darts: ['BULL','S19','S19'], groupIdx: [1,2], oddIdx: 0, total: 88, cat: 'bull', cue: 'Bull (50) + 2xS19 (38) = 88!' },
  { id: 'MK_BL3', darts: ['25','25','BULL'],  groupIdx: [0,1], oddIdx: 2, total: 100, cat: 'bull', cue: '25 + 25 (50) + Bull (50) = 100!' },
  { id: 'MK_BL4', darts: ['BULL','T18','S4'], groupIdx: [0,1], oddIdx: 2, total: 108, cat: 'bull', cue: 'Bull (50) + T18 (54) = 104, + 4 = 108!' },
  { id: 'MK_BL5', darts: ['25','T19','S3'],   groupIdx: [1,2], oddIdx: 0, total: 85, cat: 'bull', cue: 'T19 (57) + S3 (3) = 60, + Outer Bull (25) = 85!' },
  { id: 'MK_BL6', darts: ['BULL','S20','S5'], groupIdx: [0,1], oddIdx: 2, total: 75, cat: 'bull', cue: 'Bull (50) + S20 (70) + S5 = 75!' },
  { id: 'MK_BL7', darts: ['25','S18','S18'],  groupIdx: [1,2], oddIdx: 0, total: 61, cat: 'bull', cue: '2xS18 (36) + Outer Bull (25) = 61!' },
  { id: 'MK_BL8', darts: ['BULL','25','S20'], groupIdx: [0,1], oddIdx: 2, total: 95, cat: 'bull', cue: 'Bull + 25 (75) + S20 = 95!' },
];

export function subtractionShortcut(start, visit) {
  const ch = buildSubtractionChunk(start, visit);
  return ch.fullTrick;
}

export function buildSubtractionChunk(start, subVal) {
  const expected = start - subVal;
  const reverseCheck = `${expected} + ${subVal} = ${start} ✓`;
  if (subVal <= 0) {
    return {
      canHop: false, tag: 'NO CHANGE', badge: 'Method: Subtract 0',
      hopChunk: 0, hopMid: start, adjustVal: 0, adjustText: '',
      hopLabel: '', hopPrompt: `${start} - 0 = ?`, expected, reverseCheck,
      fullTrick: `${start} - 0 = ${start}`,
    };
  }
  // Rule of 40 (T20 = 60) & Rule of 43 (T19 = 57) specifically for 101-199 ("drop the leading 1, add 40 / 43"!)
  if (subVal === 60 && start >= 101 && start <= 199) {
    const mid = start - 100;
    return {
      canHop: true, tag: 'RULE OF 40', badge: 'Method: -100, +40 (Rule of 40)',
      hopChunk: 100, hopMid: mid, adjustVal: 40, adjustText: '+40',
      hopLabel: 'Hop -100', hopPrompt: `${mid} + 40 = ?`, expected, reverseCheck,
      fullTrick: `Rule of 40: -60 = -100, +40 (${mid} + 40 = ${expected})`,
    };
  }
  if (subVal === 57 && start >= 101 && start <= 199) {
    const mid = start - 100;
    return {
      canHop: true, tag: 'RULE OF 43', badge: 'Method: -100, +43 (+40, +3)',
      hopChunk: 100, hopMid: mid, adjustVal: 43, adjustText: '+43',
      hopLabel: 'Hop -100', hopPrompt: `${mid} + 43 = ?`, expected, reverseCheck,
      fullTrick: `Rule of 43: -57 = -100, +43 (${mid} + 40 + 3 = ${expected})`,
    };
  }
  // 80..99 -> -100, +addBack
  if (subVal >= 80 && subVal < 100 && start >= 100) {
    const adj = 100 - subVal;
    const mid = start - 100;
    return {
      canHop: true, tag: 'ROUND-100 (+)', badge: 'Method: -100, +?',
      hopChunk: 100, hopMid: mid, adjustVal: adj, adjustText: `+${adj}`,
      hopLabel: 'Hop -100', hopPrompt: `${mid} + ${adj} = ?`, expected, reverseCheck,
      fullTrick: `Trick: -${subVal} = -100, +${adj} (${mid} + ${adj} = ${expected})`,
    };
  }
  // 101..179 -> -100, -(subVal - 100) (includes Two-T19 114 -> -100, -14!)
  if (subVal >= 101 && start >= 100) {
    const adj = subVal - 100;
    const mid = start - 100;
    const tag = subVal === 114 ? 'TWO-T19 (-14)' : 'ROUND-100 (-)';
    return {
      canHop: true, tag, badge: 'Method: -100, -?',
      hopChunk: 100, hopMid: mid, adjustVal: -adj, adjustText: `-${adj}`,
      hopLabel: 'Hop -100', hopPrompt: `${mid} - ${adj} = ?`, expected, reverseCheck,
      fullTrick: `Trick: -${subVal} = -100, -${adj} (${mid} - ${adj} = ${expected})`,
    };
  }
  // Clean multiples of 10 (10, 20, 30, 40, 50, 70, 100)
  if (subVal % 10 === 0) {
    return {
      canHop: false, tag: 'CLEAN TENS', badge: 'Method: Clean Tens',
      hopChunk: subVal, hopMid: expected, adjustVal: 0, adjustText: '',
      hopLabel: '', hopPrompt: `${start} - ${subVal} = ?`, expected, reverseCheck,
      fullTrick: `Clean tens: ${start} - ${subVal} = ${expected}`,
    };
  }
  // @yourdarts "-20 + Add-Back" (15..19) and stray neighbor trebles 21..24 (-20, -1..-4)
  if (subVal >= 15 && subVal <= 19) {
    const adj = 20 - subVal;
    const mid = start - 20;
    return {
      canHop: true, tag: '-20 ADD-BACK', badge: `Method: -20, +${adj}`,
      hopChunk: 20, hopMid: mid, adjustVal: adj, adjustText: `+${adj}`,
      hopLabel: 'Hop -20', hopPrompt: `${mid} + ${adj} = ?`, expected, reverseCheck,
      fullTrick: `Trick: -${subVal} = -20, +${adj} (${mid} + ${adj} = ${expected})`,
    };
  }
  if (subVal >= 21 && subVal <= 24) {
    const adj = subVal - 20;
    const mid = start - 20;
    return {
      canHop: true, tag: '-20 SPLIT', badge: `Method: -20, -${adj}`,
      hopChunk: 20, hopMid: mid, adjustVal: -adj, adjustText: `-${adj}`,
      hopLabel: 'Hop -20', hopPrompt: `${mid} - ${adj} = ?`, expected, reverseCheck,
      fullTrick: `Trick: -${subVal} = -20, -${adj} (${mid} - ${adj} = ${expected})`,
    };
  }
  // 7..9 -> -10, +addBack (e.g. S7, S8, S9, T3=9)
  if (subVal >= 7 && subVal <= 9) {
    const adj = 10 - subVal;
    const mid = start - 10;
    return {
      canHop: true, tag: '-10 ADD-BACK', badge: `Method: -10, +${adj}`,
      hopChunk: 10, hopMid: mid, adjustVal: adj, adjustText: `+${adj}`,
      hopLabel: 'Hop -10', hopPrompt: `${mid} + ${adj} = ?`, expected, reverseCheck,
      fullTrick: `Trick: -${subVal} = -10, +${adj} (${mid} + ${adj} = ${expected})`,
    };
  }
  // 1..6 -> direct quick drop (or crossing ten if ones > start%10)
  if (subVal >= 1 && subVal <= 6) {
    return {
      canHop: false, tag: 'QUICK DROP', badge: `Quick Drop: -${subVal}`,
      hopChunk: subVal, hopMid: expected, adjustVal: 0, adjustText: '',
      hopLabel: '', hopPrompt: `${start} - ${subVal} = ?`, expected, reverseCheck,
      fullTrick: `Quick drop: ${start} - ${subVal} = ${expected}`,
    };
  }
  const ones = subVal % 10;
  if (ones >= 6) {
    const up = Math.ceil(subVal / 10) * 10;
    const adj = up - subVal;
    const mid = start - up;
    return {
      canHop: true, tag: 'ROUND-UP TENS', badge: `Method: -${up}, +?`,
      hopChunk: up, hopMid: mid, adjustVal: adj, adjustText: `+${adj}`,
      hopLabel: `Hop -${up}`, hopPrompt: `${mid} + ${adj} = ?`, expected, reverseCheck,
      fullTrick: `Trick: -${subVal} = -${up}, +${adj} (${mid} + ${adj} = ${expected})`,
    };
  }
  const dn = Math.floor(subVal / 10) * 10;
  const mid = start - dn;
  return {
    canHop: true, tag: 'SPLIT TENS', badge: `Method: -${dn}, -?`,
    hopChunk: dn, hopMid: mid, adjustVal: -ones, adjustText: `-${ones}`,
    hopLabel: `Hop -${dn}`, hopPrompt: `${mid} - ${ones} = ?`, expected, reverseCheck,
    fullTrick: `Trick: -${subVal} = -${dn}, -${ones} (${mid} - ${ones} = ${expected})`,
  };
}

export function subtractionMethodInfo(start, visit) {
  const ch = buildSubtractionChunk(start, visit);
  return { tag: ch.tag, badge: ch.badge, fullTrick: ch.fullTrick, chunk: ch };
}

export function buildCroupierSnap(darts) {
  const vals = darts.map(bedValue);
  const total = vals[0] + vals[1] + vals[2];
  let g = [0, 1], odd = 2;
  const pairs = [[0, 1, 2], [0, 2, 1], [1, 2, 0]];
  let bestScore = -1;
  let bestTag = 'Known Pair';
  for (const [a, b, c] of pairs) {
    let sc = 0;
    let tag = 'Known Pair';
    const da = darts[a], db = darts[b];
    const va = vals[a], vb = vals[b];
    if (da === db) { sc += 6; tag = da[0] === 'T' ? '6× Double Treble' : 'Matched Pair'; }
    else if ((da === 'BULL' || da === '25') && (db === 'BULL' || db === '25')) { sc += 6; tag = 'Bull/25 Anchor'; }
    else if (da.slice(1) === db.slice(1) && da !== '25' && da !== 'BULL' && db !== '25' && db !== 'BULL') {
      sc += 5;
      tag = (da[0] === 'T' || db[0] === 'T') ? '4× Core Shape' : 'Same-Bed Pair';
    } else if ((da === 'T20' && vb >= 51 && vb <= 57) || (db === 'T20' && va >= 51 && va <= 57)) {
      sc += 5; tag = 'Steal Last Digit (11_)';
    } else if (va >= 51 && va <= 57 && vb >= 51 && vb <= 57) {
      sc += 5; tag = 'Both 50s (+Units)';
    } else if ((va + vb) % 10 === 0 && (va + vb) > 0) {
      sc += 4; tag = 'Clean-10 Pair';
    }
    if (va + vb >= 50) sc += 1;
    if (sc > bestScore) { bestScore = sc; g = [a, b]; odd = c; bestTag = tag; }
  }
  const pairSum = vals[g[0]] + vals[g[1]];
  const oddVal = vals[odd];
  const oddCode = darts[odd];
  // Nearest-10/20 rounding nudge for awkward odd 3rd dart (Mark Pt 3!)
  let roundTip = '';
  if (oddVal >= 15 && oddVal <= 19) roundTip = ` (+20, -${20 - oddVal})`;
  else if (oddVal >= 7 && oddVal <= 9) roundTip = ` (+10, -${10 - oddVal})`;
  return {
    groupIdx: g,
    oddIdx: odd,
    pairSum,
    oddVal,
    total,
    shapeTag: bestTag,
    snapPrompt: `${darts[g[0]]}+${darts[g[1]]} = ${pairSum}  +  ${oddCode} (${oddVal})${roundTip}`,
    cue: `Snap ${darts[g[0]]}+${darts[g[1]]} (${pairSum}) + ${oddCode} (${oddVal}) = ${total}!`,
  };
}

export function buildVisitCue(darts) {
  const s = buildCroupierSnap(darts);
  return { groupIdx: s.groupIdx, oddIdx: s.oddIdx, total: s.total, cue: s.cue };
}

// Universal Live Slip-Recovery Engine (<=170 Treble/Bull -> Big Single, Neighbor Single, Neighbor Treble, or 25!)
export function slipRecoveryInfo(remBefore, aimedBed, landedBed, dartsLeftAfter = 1) {
  if (!aimedBed || !landedBed || remBefore > 170 || remBefore <= 40 || dartsLeftAfter < 1) return null;
  if (aimedBed.ring !== 'T' && aimedBed.code !== 'BULL') return null;
  if (landedBed.code === aimedBed.code || landedBed.code === 'MISS' || landedBed.value <= 0) return null;
  const newRem = remBefore - landedBed.value;
  if (newRem <= 1) return null;

  let kind = null;
  let headline = '';
  let badge = '';
  let cue = '';
  const chunk = buildSubtractionChunk(remBefore, landedBed.value);

  const fdiBefore = getFdiRule(remBefore);
  if (aimedBed.ring === 'T' && landedBed.ring === 'S' && landedBed.sector === aimedBed.sector) {
    if (fdiBefore && aimedBed.code === fdiBefore.treble) {
      kind = 'fdi_single';
      headline = `${fdiBefore.decade} FDI MISS · ${landedBed.code} (${landedBed.value})`;
      badge = `${fdiBefore.decade} FDI Miss Rule: Constant 10s!`;
      cue = `${fdiBefore.decade} FDI single miss ALWAYS leaves ${fdiBefore.miss}! (${remBefore} - ${landedBed.value} = ${newRem})`;
    } else {
      kind = 'big_single';
      headline = `BIG SINGLE SLIP · ${landedBed.code} (${landedBed.value})`;
      badge = chunk.badge;
      cue = chunk.fullTrick;
    }
  } else if (aimedBed.ring === 'T' && landedBed.ring === 'T' && landedBed.sector !== aimedBed.sector) {
    kind = 'neighbor_treble';
    headline = `STRAY TREBLE! ${landedBed.code} (${landedBed.value})`;
    badge = `Stray ${landedBed.code} (${landedBed.value}): ${chunk.badge.replace(/^Method:\s*/, '')}`;
    cue = `Stray treble ${landedBed.code} = ${landedBed.value}! ${chunk.fullTrick}`;
  } else if (aimedBed.ring === 'T' && landedBed.ring === 'S' && landedBed.sector !== aimedBed.sector) {
    kind = 'neighbor_single';
    headline = `NEIGHBOR SLIP! ${landedBed.code} (${landedBed.value})`;
    badge = `Neighbor ${landedBed.code}: ${chunk.badge.replace(/^Method:\s*/, '')}`;
    cue = `Neighbor slip ${landedBed.code} (${landedBed.value}): ${chunk.fullTrick}`;
  } else if (aimedBed.code === 'BULL' && landedBed.code === '25') {
    kind = 'outer_bull';
    headline = 'OUTER BULL · 25';
    if (remBefore >= 90 && remBefore <= 95) {
      badge = '90–95 Bull Miss: +5 to last digit -> 60s FDI!';
      cue = `90–95 Bull Miss shortcut: add 5 to last digit -> ${newRem} (60s FDI)!`;
    } else {
      badge = 'Bull Miss (-25): -20, -5';
      cue = `Outer Bull (25): ${remBefore} - 20 - 5 = ${newRem}`;
    }
  } else {
    return null;
  }

  // Tactical recovery readout after solving!
  let followUp = `${newRem} left — adapt & set up cleanly!`;
  if (isCheckoutable1Dart(newRem)) {
    const out = newRem === 50 ? 'BULL' : 'D' + (newRem / 2);
    followUp = `1-dart finish left: ${out} (${newRem})!`;
  } else if (dartsLeftAfter === 2 && !isCheckoutable2Dart(newRem)) {
    followUp = `Splash trap (${newRem} has no 2-dart out) — set up a clean double!`;
  } else if (dartsLeftAfter === 2 && G44_BY_SCORE[newRem]) {
    followUp = `Still alive! ${newRem} -> ${G44_BY_SCORE[newRem].route.join(' ')}!`;
  } else if (dartsLeftAfter === 1 && newRem >= 62 && newRem <= 70) {
    followUp = `1 dart left on ${newRem} — bin FDI, play T10/setup!`;
  } else if (newRem <= 70) {
    followUp = `Below 70 (${newRem}) — safe setup zone!`;
  }

  return {
    kind,
    remBefore,
    newRem,
    aimedCode: aimedBed.code,
    landedCode: landedBed.code,
    landedVal: landedBed.value,
    headline,
    badge,
    cue,
    chunk,
    followUp,
  };
}

export function generatePub3DartVisit({ maxTotal = 180, biasBull = false, rng = Math.random } = {}) {
  const primaries = [20, 19, 18, 17, 16, 15];
  for (let attempt = 0; attempt < 24; attempt++) {
    const darts = [];
    const roll = rng();
    if (biasBull || roll < 0.24) {
      darts.push(rng() < 0.45 ? 'BULL' : '25');
      const sec = primaries[Math.floor(rng() * primaries.length)];
      const nbs = getNeighborSectors(sec);
      for (let k = 0; k < 2; k++) {
        const r = rng();
        if (r < 0.20) darts.push(rng() < 0.4 ? 'BULL' : '25');
        else if (r < 0.44) darts.push('T' + sec);
        else if (r < 0.80) darts.push('S' + sec);
        else darts.push('S' + nbs[Math.floor(rng() * nbs.length)]);
      }
    } else if (roll < 0.78) {
      const sec = primaries[Math.floor(rng() * primaries.length)];
      const nbs = getNeighborSectors(sec);
      for (let k = 0; k < 3; k++) {
        const r = rng();
        if (r < 0.25) darts.push('T' + sec);
        else if (r < 0.70) darts.push('S' + sec);
        else if (r < 0.94) darts.push('S' + nbs[Math.floor(rng() * nbs.length)]);
        else darts.push('T' + nbs[Math.floor(rng() * nbs.length)]);
      }
    } else {
      const s1 = primaries[Math.floor(rng() * 3)];
      const s2 = primaries[1 + Math.floor(rng() * 5)];
      const n1 = getNeighborSectors(s1);
      darts.push(rng() < 0.42 ? 'T' + s1 : 'S' + s1);
      darts.push(rng() < 0.65 ? 'S' + s1 : 'S' + n1[Math.floor(rng() * n1.length)]);
      darts.push(rng() < 0.40 ? 'T' + s2 : 'S' + s2);
    }
    const info = buildVisitCue(darts);
    if (info.total <= maxTotal && info.total >= 15) {
      return { id: 'DYN_' + darts.join('_'), darts, ...info, cat: 'dyn' };
    }
  }
  const fallback = ['S20', 'S20', 'S5'];
  return { id: 'DYN_FB', darts: fallback, ...buildVisitCue(fallback), cat: 'dyn' };
}

export function applyPubScatter(aimedBed, { maxVal = 180, tight = false, rng = Math.random } = {}) {
  if (tight) return { code: aimedBed.code, ring: aimedBed.ring, value: aimedBed.value, scattered: false };
  let code = aimedBed.code;
  const r = rng();
  if (aimedBed.ring === 'T') {
    const sec = aimedBed.sector;
    const nbs = getNeighborSectors(sec);
    if (r < 0.46) code = 'T' + sec;
    else if (r < 0.82) code = 'S' + sec;
    else if (r < 0.96) code = 'S' + nbs[Math.floor(rng() * nbs.length)];
    else code = 'T' + nbs[Math.floor(rng() * nbs.length)];
  } else if (aimedBed.ring === 'S') {
    const sec = aimedBed.sector;
    const nbs = getNeighborSectors(sec);
    if (r < 0.78) code = 'S' + sec;
    else if (r < 0.94) code = 'S' + nbs[Math.floor(rng() * nbs.length)];
    else code = 'T' + sec;
  } else if (aimedBed.ring === 'D') {
    const sec = aimedBed.sector;
    const nbs = getNeighborSectors(sec);
    if (r < 0.56) code = 'D' + sec;
    else if (r < 0.88) code = 'S' + sec;
    else code = 'S' + nbs[Math.floor(rng() * nbs.length)];
  } else if (aimedBed.ring === 'BULL' || aimedBed.ring === '25') {
    if (r < 0.42) code = 'BULL';
    else if (r < 0.86) code = '25';
    else code = 'S' + [20, 19, 18, 17, 16, 15][Math.floor(rng() * 6)];
  }
  let val = bedValue(code);
  if (val > maxVal) {
    const safeSec = Math.max(1, Math.min(20, Math.floor(maxVal)));
    code = (aimedBed.sector && aimedBed.sector <= maxVal) ? ('S' + aimedBed.sector) : ('S' + safeSec);
    val = bedValue(code);
  }
  const ring = code === 'BULL' ? 'BULL' : code === '25' ? '25' : code[0];
  return { code, ring, value: val, scattered: code !== aimedBed.code };
}

export function aimConfigForDifficulty(diff = 'league') {
  if (diff === 'relaxed') return { speed: 2.05, sweet: 0.28, amber: 0.62 };
  if (diff === 'pro')     return { speed: 3.75, sweet: 0.14, amber: 0.50 };
  return { speed: 2.85, sweet: 0.20, amber: 0.56 };
}

export function getScreenSideNeighbors(bed, xy) {
  const labels = getScreenAxisLabels(bed, xy);
  return { left: labels.left, right: labels.right, dirSign: (xy && xy.y < -0.01) ? -1 : 1 };
}

// Dynamic true-screen Left/Right and Low/High neighbor labels for any bed around the 360-degree dartboard!
export function getScreenAxisLabels(bed, xy) {
  if (!bed) return { left: 'L', right: 'R', low: 'LOW', high: 'HI' };
  const pt = xy || bedToXY(bed.code);
  if (bed.code === 'BULL' || bed.code === '25') {
    return { left: '11', right: '6', low: '3', high: '20' };
  }
  const probeLabel = (dx, dy, fallback) => {
    const px = pt.x + dx;
    const py = pt.y + dy;
    const r = Math.hypot(px, py);
    if (r > R_DOUBLE_OUT + 0.04) return 'OUT';
    const b = xyToBed(px, py);
    if (!b) return 'OUT';
    if (b.code === 'BULL' || b.code === '25') return '25';
    if (b.sector !== bed.sector) return String(b.sector);
    return fallback;
  };
  const step = bed.ring === 'D' ? 0.36 : 0.30;
  return {
    left:  probeLabel(-step, 0, String(bed.sector)),
    right: probeLabel( step, 0, String(bed.sector)),
    low:   probeLabel(0, -step, 'LOW'),
    high:  probeLabel(0,  step, 'HI'),
  };
}

// Physically maps gauge needle u in [-1, 1] + subtle vertical breath v in [-1, 1] to exact 3D board coords & true bed!
export function computeAimDrop(aimBed, aimXY, u, v, cfg, allowOutsideMiss = false) {
  const au = Math.abs(u);
  const su = u < 0 ? -1 : 1;
  let zone = 'green';
  let x, y;

  if (aimBed.code === 'BULL' || aimBed.code === '25') {
    const baseAng = (aimXY && Math.hypot(aimXY.x, aimXY.y) > 0.02) ? Math.atan2(aimXY.x, aimXY.y) : 0;
    if (au <= cfg.sweet) {
      zone = 'green';
      const r = aimBed.code === 'BULL' ? (au / cfg.sweet) * (R_INNER_BULL * 0.62) : (R_INNER_BULL + R_OUTER_BULL) * 0.52;
      const a = aimBed.code === 'BULL' ? (u * 2.2) : (baseAng + u * 0.9);
      x = Math.sin(a) * r; y = Math.cos(a) * r;
    } else if (au <= cfg.amber) {
      zone = 'amber';
      const t = (au - cfg.sweet) / (cfg.amber - cfg.sweet);
      const r = aimBed.code === 'BULL' ? (R_INNER_BULL + 0.03 + t * 0.075) : (R_OUTER_BULL + 0.03 + t * 0.14);
      const a = (u < 0 ? -Math.PI / 2 : Math.PI / 2) + v * 0.55;
      x = Math.sin(a) * r; y = Math.cos(a) * r;
    } else {
      zone = 'red';
      const t = (au - cfg.amber) / (1 - cfg.amber);
      const r = 0.34 + t * 0.34;
      const a = (u < 0 ? -Math.PI / 2 : Math.PI / 2) + v * 0.72;
      x = Math.sin(a) * r; y = Math.cos(a) * r;
    }
  } else {
    const idx = SECTOR_INDEX[aimBed.sector];
    const secCenterAng = idx * (Math.PI / 10);
    const dirSign = (aimXY && aimXY.y < -0.01) ? -1 : 1;
    const rawR = aimXY ? Math.hypot(aimXY.x, aimXY.y) : 1.01;
    const baseR = aimBed.ring === 'T' ? (R_TREBLE_IN + R_TREBLE_OUT) * 0.5
      : aimBed.ring === 'D' ? (R_DOUBLE_IN + R_DOUBLE_OUT) * 0.5
      : Math.max(0.38, Math.min(1.42, rawR));
    let ang = secCenterAng;
    let r = baseR;

    if (au <= cfg.sweet) {
      zone = 'green';
      ang = secCenterAng + (u / cfg.sweet) * dirSign * 0.048;
      r = baseR + v * 0.024;
    } else if (au <= cfg.amber) {
      zone = 'amber';
      const t = (au - cfg.sweet) / (cfg.amber - cfg.sweet);
      ang = secCenterAng + su * dirSign * (0.048 + t * 0.082);
      if (aimBed.ring === 'T') {
        r = baseR + (v >= 0 ? 1 : -1) * (0.105 + t * 0.17);
      } else if (aimBed.ring === 'D') {
        if (allowOutsideMiss && t > 0.86 && v > 0.35) r = R_DOUBLE_OUT + 0.09;
        else r = R_DOUBLE_IN - (0.05 + t * 0.22);
      } else {
        r = Math.max(0.30, Math.min(1.48, baseR + v * 0.20));
      }
    } else {
      zone = 'red';
      const t = (au - cfg.amber) / (1 - cfg.amber);
      ang = secCenterAng + su * dirSign * (0.175 + t * 0.165);
      if (aimBed.ring === 'T') {
        r = baseR + (Math.abs(v) < 0.22 ? v * 0.08 : (v >= 0 ? 1 : -1) * (0.115 + t * 0.19));
      } else if (aimBed.ring === 'D') {
        if (allowOutsideMiss && t > 0.42 && v > 0.08) r = R_DOUBLE_OUT + 0.12;
        else r = Math.abs(v) < 0.22 ? baseR : (R_DOUBLE_IN - 0.12 - t * 0.18);
      } else {
        r = Math.max(0.34, Math.min(1.46, baseR + v * 0.16));
      }
    }
    if (!allowOutsideMiss) r = Math.min(r, R_DOUBLE_OUT - 0.02);
    x = Math.sin(ang) * r;
    y = Math.cos(ang) * r;
  }

  const landed = xyToBed(x, y) || { code: 'MISS', ring: 'MISS', sector: 0, value: 0, sub: 'MISS' };
  return { x, y, bed: landed, zone };
}

// 3-Beat / 2-Beat Multi-Axis Aiming Configuration (tuned against 7,200-leg human-timing sim for authentic pub averages & real stray beds!)
export function multiAxisConfigForDifficulty(diff = 'league') {
  if (diff === 'relaxed') {
    return {
      focusSpeed: 2.95, horizSpeed: 3.25, vertSpeed: 3.10,
      focusSweet: 0.185, focusAmber: 0.49,
      horizSweet: 0.14, horizAmber: 0.35,
      vertSweet:  0.16, vertAmber:  0.45,
    };
  }
  if (diff === 'pro') {
    return {
      focusSpeed: 5.10, horizSpeed: 5.65, vertSpeed: 5.35,
      focusSweet: 0.10, focusAmber: 0.34,
      horizSweet: 0.082, horizAmber: 0.22,
      vertSweet:  0.092, vertAmber:  0.30,
    };
  }
  return {
    focusSpeed: 3.92, horizSpeed: 4.35, vertSpeed: 4.12,
    focusSweet: 0.135, focusAmber: 0.41,
    horizSweet: 0.105, horizAmber: 0.285,
    vertSweet:  0.12, vertAmber:  0.37,
  };
}

// Beat 1: Overall Focus / Grip Steadiness — scales speed, corridor width & organic oche dispersion on Beats 2 & 3!
export function evaluateFocusBeat(focusU, cfg) {
  const af = Math.abs(focusU);
  if (af <= cfg.focusSweet) {
    return { zone: 'green', label: 'LOCKED IN', speedMult: 0.89, zoneMult: 1.11, jitter: 0.040 };
  }
  if (af <= cfg.focusAmber) {
    return { zone: 'amber', label: 'LOOSE GRIP', speedMult: 1.13, zoneMult: 0.89, jitter: 0.078 };
  }
  return { zone: 'red', label: 'SNATCHED!', speedMult: 1.37, zoneMult: 0.71, jitter: 0.138 };
}

// Maths-Speed -> Oche Flow Coupling: faster mental maths slows & widens your aiming bars; slow/expired maths tightens them!
export const DEFAULT_MATH_FLOW = Object.freeze({
  tier: 'steady',
  label: 'FRESH OCHE',
  pill: '',
  callout: '',
  speedMult: 1.0,
  zoneMult: 1.0,
  jitterMult: 1.0,
  cls: 'neutral',
  ratio: 0.5,
});

export function computeMathFlowModifier(ratio, { wrongCount = 0, usedHint = false, timedOut = false } = {}) {
  const baseRatio = Math.max(0, Number.isFinite(ratio) ? ratio : 0.5);
  const penalty = (wrongCount * 0.18) + (usedHint ? 0.16 : 0);
  const effRatio = timedOut ? Math.max(1.06, baseRatio + penalty) : (baseRatio + penalty);

  if (effRatio <= 0.30) {
    return {
      tier: 'in_flow',
      label: 'IN FLOW',
      pill: '⚡ FLOW · +18% AIM',
      callout: '⚡ IN FLOW! EASIER AIM',
      speedMult: 0.84,
      zoneMult: 1.18,
      jitterMult: 0.72,
      cls: 'flow-hot',
      ratio: effRatio,
    };
  }
  if (effRatio <= 0.55) {
    return {
      tier: 'sharp',
      label: 'SHARP RHYTHM',
      pill: '✦ SHARP · +9% AIM',
      callout: '✦ SHARP MATHS! SMOOTH AIM',
      speedMult: 0.92,
      zoneMult: 1.09,
      jitterMult: 0.86,
      cls: 'flow-warm',
      ratio: effRatio,
    };
  }
  if (effRatio <= 0.85) {
    return {
      tier: 'steady',
      label: 'STEADY',
      pill: 'STEADY PACE',
      callout: '',
      speedMult: 1.0,
      zoneMult: 1.0,
      jitterMult: 1.0,
      cls: 'neutral',
      ratio: effRatio,
    };
  }
  if (effRatio <= 1.00) {
    return {
      tier: 'rushed',
      label: 'OFF RHYTHM',
      pill: '⏱ SLOW · -14% AIM',
      callout: '⏱ OFF RHYTHM · TIGHTER AIM',
      speedMult: 1.14,
      zoneMult: 0.86,
      jitterMult: 1.25,
      cls: 'flow-slow',
      ratio: effRatio,
    };
  }
  return {
    tier: 'cold',
    label: 'RATTLED!',
    pill: '🔔 RATTLED · -26% AIM',
    callout: '🔔 CLOCK EXCEEDED! SHAKY AIM',
    speedMult: 1.28,
    zoneMult: 0.74,
    jitterMult: 1.50,
    cls: 'flow-cold',
    ratio: effRatio,
  };
}

export function applyMathFlowToConfig(cfg, flow = DEFAULT_MATH_FLOW) {
  const f = flow || DEFAULT_MATH_FLOW;
  const sm = f.speedMult || 1.0;
  const zm = f.zoneMult || 1.0;
  const clampPair = (sw, am) => {
    const nSw = Math.max(0.06, Math.min(0.36, sw * zm));
    const nAm = Math.max(nSw + 0.10, Math.min(0.72, am * zm));
    return [nSw, nAm];
  };
  const [focusSweet, focusAmber] = clampPair(cfg.focusSweet, cfg.focusAmber);
  const [horizSweet, horizAmber] = clampPair(cfg.horizSweet, cfg.horizAmber);
  const [vertSweet,  vertAmber]  = clampPair(cfg.vertSweet,  cfg.vertAmber);
  return {
    focusSpeed: cfg.focusSpeed * sm,
    horizSpeed: cfg.horizSpeed * sm,
    vertSpeed:  cfg.vertSpeed  * sm,
    focusSweet, focusAmber,
    horizSweet, horizAmber,
    vertSweet,  vertAmber,
    jitterMult: f.jitterMult || 1.0,
  };
}

// Pure 2D True Screen-Space Multi-Axis Drop:
// Beat 2 (horizU in [-1, 1]) ALWAYS moves Screen Left (-X) <-> Right (+X),
// Beat 3 (vertV in [-1, 1]) ALWAYS moves Screen Down (-Y, LOW) <-> Up (+Y, HI) at EVERY sector 1..20 & Bull!
export function computeMultiAxisDrop(aimBed, aimXY, focusRes, horizU, vertV, cfg, allowOutsideMiss = false, jitterXY = null) {
  const f = focusRes || { zone: 'amber', speedMult: 1.0, zoneMult: 1.0, jitter: 0.04 };
  const hSweet = Math.min(0.45, cfg.horizSweet * f.zoneMult);
  const hAmber = Math.min(0.70, cfg.horizAmber * f.zoneMult);
  const vSweet = Math.min(0.45, cfg.vertSweet * f.zoneMult);
  const vAmber = Math.min(0.72, cfg.vertAmber * f.zoneMult);

  const au = Math.abs(horizU);
  const av = Math.abs(vertV);
  let x, y;

  if (aimBed.code === 'BULL' || aimBed.code === '25') {
    const mapBullAxis = (u, sw, am) => {
      const a = Math.abs(u), s = u < 0 ? -1 : 1;
      const inR = aimBed.code === 'BULL' ? R_INNER_BULL * 0.62 : (R_INNER_BULL + R_OUTER_BULL) * 0.48;
      if (a <= sw) return (u / Math.max(0.01, sw)) * inR;
      if (a <= am) {
        const t = (a - sw) / Math.max(0.01, am - sw);
        return s * (R_INNER_BULL + 0.02 + t * (R_OUTER_BULL - R_INNER_BULL + 0.07));
      }
      const t = (a - am) / Math.max(0.01, 1 - am);
      return s * (R_OUTER_BULL + 0.09 + t * 0.48);
    };
    const bx = aimBed.code === '25' && aimXY ? aimXY.x * 0.55 : 0;
    const by = aimBed.code === '25' && aimXY ? aimXY.y * 0.55 : 0;
    x = bx + mapBullAxis(horizU, hSweet, hAmber);
    y = by + mapBullAxis(vertV, vSweet, vAmber);
  } else {
    const idx = SECTOR_INDEX[aimBed.sector];
    const theta = idx * (Math.PI / 10);
    const rawR = aimXY ? Math.hypot(aimXY.x, aimXY.y) : 1.01;
    const baseR = aimBed.ring === 'T' ? (R_TREBLE_IN + R_TREBLE_OUT) * 0.5
      : aimBed.ring === 'D' ? (R_DOUBLE_IN + R_DOUBLE_OUT) * 0.5
      : Math.max(0.42, Math.min(1.42, rawR));
    // Anchor on the exact radial/angular center of T/D beds (or clicked spot on Singles)
    const baseX = aimBed.ring === 'S' && aimXY ? aimXY.x : Math.sin(theta) * baseR;
    const baseY = aimBed.ring === 'S' && aimXY ? aimXY.y : Math.cos(theta) * baseR;

    const absSin = Math.abs(Math.sin(theta));
    const absCos = Math.abs(Math.cos(theta));
    let edgeX, edgeY, hitsRingX = false, hitsRingY = false;
    if (aimBed.ring === 'T' || aimBed.ring === 'D') {
      const hR = 0.078; // half thickness of T (0.16) and D (0.16) rings
      const hT = baseR * (Math.PI / 20); // half angular arc width to spider wire
      const dRingX = hR / Math.max(0.08, absSin);
      const dSecX  = hT / Math.max(0.08, absCos);
      const dRingY = hR / Math.max(0.08, absCos);
      const dSecY  = hT / Math.max(0.08, absSin);
      hitsRingX = dRingX <= dSecX;
      hitsRingY = dRingY <= dSecY;
      edgeX = Math.min(dRingX, dSecX);
      edgeY = Math.min(dRingY, dSecY);
    } else {
      edgeX = 0.21;
      edgeY = 0.21;
    }

    const mapScreenAxis = (val, sw, am, edge, hitsRing) => {
      const a = Math.abs(val);
      const s = val < 0 ? -1 : 1;
      if (a <= sw) {
        // Safely inside bed even at diagonal Green+Green corners (0.58 * sqrt(2) = 0.82 < 1.0)!
        return (val / Math.max(0.01, sw)) * (edge * 0.58);
      }
      const amberEnd = hitsRing ? (edge * 1.18 + 0.17) : (edge * 0.97);
      if (a <= am) {
        const t = (a - sw) / Math.max(0.01, am - sw);
        if (hitsRing) {
          // Ring-wire axis (Vertical on T20/D20, Horizontal on D6/D11, both on D16): amber slips across ring wire into single/outside!
          return s * (edge * 1.18 + t * 0.17);
        }
        // Sector-wire axis (Horizontal on T20, Vertical on D6/D11): amber hugs the inside of the spider wire
        return s * (edge * (0.58 + t * 0.39));
      }
      // Red zone: strictly monotonic continuation across spider wire into neighboring sector or outside wire!
      const t = (a - am) / Math.max(0.01, 1 - am);
      const redStart = Math.max(amberEnd + 0.02, edge * 1.16, 0.16);
      return s * (redStart + t * 0.32);
    };

    const dx = mapScreenAxis(horizU, hSweet, hAmber, edgeX, hitsRingX);
    const dy = mapScreenAxis(vertV, vSweet, vAmber, edgeY, hitsRingY);
    x = baseX + dx;
    y = baseY + dy;

    if (!allowOutsideMiss) {
      const rr = Math.hypot(x, y);
      if (rr > R_DOUBLE_OUT - 0.02) {
        const sc = (R_DOUBLE_OUT - 0.02) / rr;
        x *= sc; y *= sc;
      }
    }
  }

  if (jitterXY) {
    x += jitterXY.x;
    y += jitterXY.y;
    if (!allowOutsideMiss) {
      const rr = Math.hypot(x, y);
      if (rr > R_DOUBLE_OUT - 0.02) {
        const sc = (R_DOUBLE_OUT - 0.02) / rr;
        x *= sc; y *= sc;
      }
    }
  }

  const landed = xyToBed(x, y) || { code: 'MISS', ring: 'MISS', sector: 0, value: 0, sub: 'MISS' };
  const horizZone = au <= hSweet ? 'green' : au <= hAmber ? 'amber' : 'red';
  const vertZone = av <= vSweet ? 'green' : av <= vAmber ? 'amber' : 'red';
  const zone = landed.code === aimBed.code
    ? 'green'
    : (landed.code === 'MISS' || (aimBed.sector !== 25 && landed.sector !== aimBed.sector))
      ? 'red'
      : 'amber';

  return { x, y, bed: landed, zone, horizZone, vertZone, hSweet, hAmber, vSweet, vAmber };
}

export function isCheckoutable1Dart(score) {
  return score === 50 || (score >= 2 && score <= 40 && score % 2 === 0);
}

export function isCheckoutable2Dart(score) {
  return score >= 2 && score <= 110 && !TWO_DART_BOGEYS.has(score);
}

export function isCheckoutable3Dart(score) {
  return score >= 2 && score <= 170 && !BOGEY_NUMBERS.has(score);
}

export function resolve501Dart(remBefore, visitStartScore, landedBed) {
  const newRem = remBefore - landedBed.value;
  const isWin = newRem === 0 && (landedBed.ring === 'D' || landedBed.ring === 'BULL');
  const isBust = newRem < 0 || newRem === 1 || (newRem === 0 && !isWin);
  return {
    newRem: isBust ? visitStartScore : newRem,
    rawRem: newRem,
    isWin,
    isBust,
  };
}

export function clamp301Dart(startScore, visitTotalSoFar, landedBed, pt, rng = Math.random) {
  const maxAllowed = Math.max(1, startScore - visitTotalSoFar - 32);
  if (landedBed.value <= maxAllowed) return { landed: landedBed, pt };
  const safeSec = Math.max(1, Math.min(20, Math.floor(maxAllowed)));
  const safeCode = 'S' + safeSec;
  return {
    landed: { code: safeCode, ring: 'S', sector: safeSec, value: safeSec, sub: 'OS' },
    pt: bedToXY(safeCode, { jitter: 0.06, rng }),
  };
}

// Live @yourdarts Board-Management Auditor for Level 7 (Championship 501)
export function audit501Decision(rem, dartsLeft, aimedBed, rivalScore, rivalName = 'Big Dave') {
  const leaves = rem - aimedBed.value;
  const cleanDoubles = new Set([40, 36, 32, 28, 24, 20, 16, 12, 8]);

  // 1. Bogey Danger Band on Dart 3 (179..189)
  if (dartsLeft === 1 && rem >= 179 && rem <= 189) {
    if (rem === 188 && (aimedBed.code === '25' || aimedBed.code === 'BULL')) {
      return { grade: 'bad', tag: 'BOGEY TRAP', trapDrift: '25',
        msg: 'Never throw 25 on 188 — leaves bogey 163! Throw Teen Cover S18 -> 170!' };
    }
    if (BOGEY_NUMBERS.has(leaves)) {
      const cov = 'S' + (rem - 170);
      return { grade: 'bad', tag: 'BOGEY LEFT',
        msg: `${aimedBed.code} on ${rem} leaves bogey ${leaves}! Throw Teen Cover ${cov} -> 170!` };
    }
    if (leaves <= 170 && leaves >= 100 && !BOGEY_NUMBERS.has(leaves)) {
      return { grade: 'great', tag: 'BOGEY COVER',
        msg: `Textbook Bogey Cover! ${aimedBed.code} on ${rem} leaves checkoutable ${leaves}!` };
    }
    return null;
  }

  // 2. Ton-Plus Opening Treble & Splash-Trap Audit (101..170 with 3 darts)
  if (dartsLeft === 3 && rem >= 101 && rem <= 170 && !BOGEY_NUMBERS.has(rem)) {
    const tp = TON_PLUS_BY_SCORE[rem];
    if (tp && tp.traps && tp.traps[aimedBed.code]) {
      const tr = tp.traps[aimedBed.code];
      return { grade: 'bad', tag: 'SPLASH TRAP', trapDrift: tr.drift, msg: tr.why };
    }
    if (tp && tp.open.includes(aimedBed.code)) {
      return { grade: 'great', tag: tp.fdiBridge ? 'FDI BRIDGE' : 'SMART OPENER',
        msg: `Class opening treble! ${aimedBed.code} on ${rem}${tp.fdiBridge ? ' sets up a 25/30/35 FDI!' : ' dodges splash traps!'}` };
    }
    const twoDartOk = leaves >= 2 && leaves <= 110 && !TWO_DART_BOGEYS.has(leaves);
    if (twoDartOk && (aimedBed.ring === 'T' || aimedBed.code === 'BULL')) {
      return { grade: 'great', tag: 'SOLID ROUTE', msg: `Clean opener — ${aimedBed.code} leaves ${leaves} (2-dart out)!` };
    }
    if (tp) {
      return { grade: 'bad', tag: 'ROUTE LEAK',
        msg: `${aimedBed.code} on ${rem} leaves ${leaves} — open with ${tp.open.join(' or ')}!` };
    }
    if (!twoDartOk) {
      return { grade: 'bad', tag: 'ROUTE LEAK',
        msg: `3 darts on ${rem}: ${aimedBed.code} leaves ${leaves} (not a 2-dart out!) — open on T20/T19/T18!` };
    }
    return null;
  }

  // 3. 1-Dart FDI Abandonment (62..70 with ONLY 1 dart left)
  if (dartsLeft === 1 && rem >= 62 && rem <= 70) {
    const fdi = getFdiRule(rem);
    if (aimedBed.code === 'T10' || (cleanDoubles.has(leaves) && aimedBed.ring !== 'D')) {
      return { grade: 'great', tag: '1-DART SWITCH',
        msg: `Sharp 1-dart switch! Binning the FDI on ${rem} to leave a clean double when you return!` };
    }
    if (fdi && aimedBed.code === fdi.treble) {
      return { grade: 'bad', tag: 'FDI HABIT',
        msg: `1 dart left on ${rem} — bin the 2-dart FDI (${fdi.treble})! Go T10 or single setup to leave a fat double!` };
    }
    return null;
  }

  // 4. Golden 44 2-Dart Check (61..100, excl. 99)
  if (dartsLeft === 2 && rem >= 61 && rem <= 100 && rem !== 99) {
    const g = G44_BY_SCORE[rem];
    if (g) {
      const valids = [g.route[0], ...g.alts.map(a => a[0])];
      if (valids.includes(aimedBed.code)) {
        const fdi = getFdiRule(rem);
        return { grade: 'great', tag: fdi ? `RULE OF ${fdi.sum}` : 'GOLDEN 44',
          msg: fdi ? `Textbook ${fdi.decade} Rule of ${fdi.sum}! ${fdi.treble} -> ${fdi.dbl}!` : `Smart Golden 44 play (${aimedBed.code} on ${rem})!` };
      }
      const oneDartOut = isCheckoutable1Dart(leaves);
      if (!oneDartOut) {
        return { grade: 'bad', tag: 'MISSED ROUTE',
          msg: `2 darts on ${rem}: ${aimedBed.code} leaves ${leaves} (no double!). Play ${g.route[0]} -> ${g.route[1]}!` };
      }
    }
    return null;
  }

  // 5. Rival Pressure on 50 (2+ darts in hand)
  if (rem === 50 && dartsLeft >= 2) {
    if (rivalScore <= 100 && aimedBed.code === 'BULL') {
      return { grade: 'great', tag: 'RIVAL PRESSURE',
        msg: `Ice cold! ${rivalName}'s sitting on ${rivalScore} — right call going straight at the Bull!` };
    }
    if (rivalScore > 170 && aimedBed.code === 'BULL') {
      return { grade: 'bad', tag: 'UNNEEDED RISK',
        msg: `Easy tiger! ${rivalName}'s back on ${rivalScore} — play S18 -> D16 or S10 -> D20 instead of Bull!` };
    }
    if (rivalScore > 170 && ['S18', 'S10', 'S14', 'S16', 'S12'].includes(aimedBed.code)) {
      return { grade: 'great', tag: 'PUB SMART',
        msg: `Tidy match management! ${rivalName}'s back on ${rivalScore}, easy single for a fat double!` };
    }
    return null;
  }

  // 6. Below-60 Setup (41..59, excl. 50)
  if (dartsLeft >= 2 && rem >= 41 && rem <= 59 && rem !== 50) {
    if (aimedBed.ring === 'S' && cleanDoubles.has(leaves)) {
      return { grade: 'great', tag: 'CLEAN SETUP',
        msg: `Crisp Below-60 setup! ${aimedBed.code} leaves D${leaves / 2} (${leaves})!` };
    }
    if (leaves % 2 === 1 || leaves < 2) {
      return { grade: 'bad', tag: 'ODD LEAVE',
        msg: `Watch out — ${aimedBed.code} on ${rem} leaves ${leaves}! Aim a single to leave D16 (-2) or D18 (+4)!` };
    }
    return null;
  }

  // 7. Direct Double-Out (2..40 even or 50)
  if (isCheckoutable1Dart(rem)) {
    const outBed = rem === 50 ? 'BULL' : 'D' + (rem / 2);
    if (aimedBed.code === outBed) {
      return { grade: 'great', tag: 'DOUBLE OUT', msg: `Right at ${outBed} for the leg!` };
    }
    if (leaves < 0 || leaves === 1 || leaves % 2 === 1) {
      return { grade: 'bad', tag: 'BUST / ODD', msg: `Need ${outBed} (${rem}) to check out cleanly!` };
    }
  }
  return null;
}
