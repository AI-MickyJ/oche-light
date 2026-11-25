#!/usr/bin/env node
/* ============================================================================
   OCHE LIGHT — Static Server, Module Integrity & Smoke Check (sim/smoke-check.mjs)
   Verifies:
   1. index.html === oche_light.html sync
   2. Static HTTP serving of index.html, oche_light.html, src/engine.mjs, src/bots.mjs
   3. Inline ES module syntax & every imported symbol exists in src/*.mjs
   4. Darts geometry, 1.4x weighting, checkout tables, audit501Decision & computeAimDrop tests
   5. Optional headless Playwright browser console-error check if Playwright is installed
   ============================================================================ */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import * as engine from '../src/engine.mjs';
import * as bots from '../src/bots.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('SMOKE CHECK FAILED: ' + msg);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const cleanUrl = (req.url || '/').split('?')[0];
      const rel = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
      const full = path.resolve(ROOT, rel);
      if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(full);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function run() {
  // 1. File sync check
  const idxHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ocheHtml = fs.readFileSync(path.join(ROOT, 'oche_light.html'), 'utf8');
  assert(idxHtml === ocheHtml, 'index.html and oche_light.html are out of sync!');
  console.log('PASS: index.html === oche_light.html (byte-identical)');

  // 2. Inline script syntax & local module import verification
  const scriptMatch = idxHtml.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert(scriptMatch, 'Missing <script type="module"> in index.html');
  const rawScript = scriptMatch[1];

  // Check every imported identifier from ./src/engine.mjs and ./src/bots.mjs exists!
  const localImports = [...rawScript.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*['"](\.\/src\/[^'"]+)['"]\s*;/g)];
  assert(localImports.length >= 1, 'Expected at least one ./src/*.mjs import in index.html');
  for (const m of localImports) {
    const modPath = m[2];
    const modObj = modPath.includes('engine.mjs') ? engine : modPath.includes('bots.mjs') ? bots : null;
    assert(modObj, `Unknown local module import: ${modPath}`);
    const specs = m[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const sp of specs) {
      const orig = sp.split(/\s+as\s+/)[0].trim();
      assert(orig in modObj, `Export "${orig}" imported from ${modPath} does not exist!`);
    }
    console.log(`PASS: Verified ${specs.length} named imports from ${modPath}`);
  }

  // Strip import lines for vm.Script syntax validation
  const stripped = rawScript
    .replace(/import\s+\*\s+as\s+THREE[\s\S]*?;\n/, 'const THREE = {};\n')
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/src\/[^'"]+['"]\s*;/g, '');
  new vm.Script(stripped);
  console.log(`PASS: index.html JS syntax valid (${rawScript.length} chars)`);

  // 3. Engine curriculum, physics, and auditor unit assertions
  assert(engine.MARKING_ITEMS.length === 62, 'Expected 62 MARKING_ITEMS');
  for (const it of engine.MARKING_ITEMS) {
    const sum = it.darts.reduce((s, c) => s + engine.bedValue(c), 0);
    assert(sum === it.total, `MARKING_ITEM ${it.id} mismatch: ${sum} vs ${it.total}`);
  }
  assert(engine.GOLDEN_44.length === 44, 'Expected 44 GOLDEN_44 items');
  for (const g of engine.GOLDEN_44) {
    const sum = g.route.reduce((s, c) => s + engine.bedValue(c), 0);
    assert(sum === g.score, `GOLDEN_44 ${g.score} mismatch`);
  }
  assert(engine.BOGEY_ITEMS.length === 14, 'Expected 14 BOGEY_ITEMS');
  assert(engine.BELOW_60_ITEMS.length === 26, 'Expected 26 BELOW_60_ITEMS');

  // Key board-management & aim physics checks
  assert(engine.audit501Decision(188, 1, engine.parseBedCode('25'), 240).grade === 'bad', '188->25 trap check');
  assert(engine.audit501Decision(188, 1, engine.parseBedCode('S18'), 240).grade === 'great', '188->S18 cover check');
  assert(engine.audit501Decision(129, 3, engine.parseBedCode('T20'), 240).grade === 'bad', '129->T20 splash trap');
  assert(engine.audit501Decision(129, 3, engine.parseBedCode('T19'), 240).grade === 'great', '129->T19 bridge');
  assert(engine.audit501Decision(68, 1, engine.parseBedCode('T18'), 240).grade === 'bad', '68 1d FDI habit');
  assert(engine.audit501Decision(68, 1, engine.parseBedCode('T10'), 240).grade === 'great', '68 1d T10 switch');

  const cfg = engine.aimConfigForDifficulty('league');
  const t20 = engine.parseBedCode('T20');
  const t20xy = engine.bedToXY('T20');
  assert(engine.computeAimDrop(t20, t20xy, 0.0, 0.0, cfg, true).bed.code === 'T20', 'T20 green drop');
  assert(engine.computeAimDrop(t20, t20xy, 0.42, 0.4, cfg, true).bed.code === 'S20', 'T20 amber drop');
  assert(engine.computeAimDrop(t20, t20xy, -0.82, 0.4, cfg, true).bed.sector === 5, 'T20 left neighbor 5');
  assert(engine.computeAimDrop(t20, t20xy, 0.82, 0.4, cfg, true).bed.sector === 1, 'T20 right neighbor 1');
  const d16 = engine.parseBedCode('D16');
  assert(engine.computeAimDrop(d16, engine.bedToXY('D16'), 0.92, 0.5, cfg, true).bed.code === 'MISS', 'D16 outside wire miss');

  // Phase 3: 3-Beat Multi-Axis Oche Rhythm & Subtraction Method assertions
  const mCfg = engine.multiAxisConfigForDifficulty('league');
  const fGreen = engine.evaluateFocusBeat(0.05, mCfg);
  const fRed = engine.evaluateFocusBeat(0.85, mCfg);
  assert(fGreen.zone === 'green' && fGreen.speedMult < 1 && fGreen.zoneMult > 1, 'Focus green boost');
  assert(fRed.zone === 'red' && fRed.speedMult > 1.3 && fRed.zoneMult < 0.75, 'Focus red penalty');
  assert(engine.computeMultiAxisDrop(t20, t20xy, fGreen, 0.0, 0.0, mCfg, true).bed.code === 'T20', '3-beat T20 green hit');
  assert(engine.computeMultiAxisDrop(t20, t20xy, fGreen, -0.55, 0.0, mCfg, true).bed.sector === 5, '3-beat T20 horizontal wire pull left -> 5');
  assert(engine.computeMultiAxisDrop(t20, t20xy, fGreen, 0.55, 0.0, mCfg, true).bed.sector === 1, '3-beat T20 horizontal wire pull right -> 1');
  assert(engine.computeMultiAxisDrop(t20, t20xy, fGreen, 0.0, 0.36, mCfg, true).bed.code === 'S20', '3-beat T20 high vertical miss -> S20');
  assert(engine.computeMultiAxisDrop(t20, t20xy, fGreen, 0.0, -0.36, mCfg, true).bed.code === 'S20', '3-beat T20 low vertical miss -> S20');
  const d20 = engine.parseBedCode('D20');
  assert(engine.computeMultiAxisDrop(d20, engine.bedToXY('D20'), fGreen, 0.0, 0.65, mCfg, true).bed.code === 'MISS', '3-beat D20 high outside wire miss');
  assert(engine.computeMultiAxisDrop(d20, engine.bedToXY('D20'), fGreen, 0.0, -0.45, mCfg, true).bed.code === 'S20', '3-beat D20 low inside wire -> S20');
  assert(engine.computeMultiAxisDrop(d16, engine.bedToXY('D16'), fGreen, 0.0, -0.65, mCfg, true).bed.code === 'MISS', '3-beat D16 low outside bottom wire miss');
  assert(engine.computeMultiAxisDrop(d16, engine.bedToXY('D16'), fGreen, 0.0,  0.28, mCfg, true).bed.code === 'S16',  '3-beat D16 slight high inside wire -> S16');
  assert(engine.computeMultiAxisDrop(d16, engine.bedToXY('D16'), fGreen, 0.0,  0.65, mCfg, true).bed.sector === 8,   '3-beat D16 wide high -> neighbor 8 above D16');

  // True 360-degree side-of-board aiming geometry assertions (D11, D6, D8, D10, T6, T11, every T & D green+green)
  const d11 = engine.parseBedCode('D11'), d11xy = engine.bedToXY('D11');
  assert(engine.computeMultiAxisDrop(d11, d11xy, fGreen, -0.55, 0.0, mCfg, true).bed.code === 'MISS', 'D11 left -> outside left wire MISS');
  assert(engine.computeMultiAxisDrop(d11, d11xy, fGreen,  0.42, 0.0, mCfg, true).bed.code === 'S11',  'D11 right -> inside S11');
  assert(engine.computeMultiAxisDrop(d11, d11xy, fGreen,  0.0,  0.85, mCfg, true).bed.sector === 14, 'D11 up -> neighbor 14');
  assert(engine.computeMultiAxisDrop(d11, d11xy, fGreen,  0.0, -0.85, mCfg, true).bed.sector === 8,  'D11 down -> neighbor 8');
  const d6 = engine.parseBedCode('D6'), d6xy = engine.bedToXY('D6');
  assert(engine.computeMultiAxisDrop(d6, d6xy, fGreen,  0.55, 0.0, mCfg, true).bed.code === 'MISS', 'D6 right -> outside right wire MISS');
  assert(engine.computeMultiAxisDrop(d6, d6xy, fGreen, -0.42, 0.0, mCfg, true).bed.code === 'S6',   'D6 left -> inside S6');
  assert(engine.computeMultiAxisDrop(d6, d6xy, fGreen,  0.0,  0.85, mCfg, true).bed.sector === 13, 'D6 up -> neighbor 13');
  assert(engine.computeMultiAxisDrop(d6, d6xy, fGreen,  0.0, -0.85, mCfg, true).bed.sector === 10, 'D6 down -> neighbor 10');
  const t6 = engine.parseBedCode('T6'), t6xy = engine.bedToXY('T6');
  assert(engine.computeMultiAxisDrop(t6, t6xy, fGreen,  0.0,  0.85, mCfg, true).bed.sector === 13, 'T6 up -> neighbor 13');
  assert(engine.computeMultiAxisDrop(t6, t6xy, fGreen,  0.0, -0.85, mCfg, true).bed.sector === 10, 'T6 down -> neighbor 10');
  assert(engine.computeMultiAxisDrop(t6, t6xy, fGreen, -0.42, 0.0,  mCfg, true).bed.code === 'S6', 'T6 left -> inner S6');
  // Every sector 1..20 T & D must guarantee hit on exact Green+Green (even at diagonal sweet-spot corner!)
  for (const sec of engine.SECTORS) {
    for (const prefix of ['T', 'D']) {
      const code = prefix + sec;
      const b = engine.parseBedCode(code);
      const xy = engine.bedToXY(code);
      const dr = engine.computeMultiAxisDrop(b, xy, fGreen, mCfg.horizSweet * 0.9, mCfg.vertSweet * 0.9, mCfg, true);
      assert(dr.bed.code === code, `360-deg Green+Green corner guarantee failed on ${code} (got ${dr.bed.code})`);
    }
  }
  const d11Lbls = engine.getScreenAxisLabels(d11, d11xy);
  assert(d11Lbls.left === 'OUT' && d11Lbls.high === '14' && d11Lbls.low === '8', `D11 axis labels mismatch: ${JSON.stringify(d11Lbls)}`);
  const d6Lbls = engine.getScreenAxisLabels(d6, d6xy);
  assert(d6Lbls.right === 'OUT' && d6Lbls.high === '13' && d6Lbls.low === '10', `D6 axis labels mismatch: ${JSON.stringify(d6Lbls)}`);
  assert(engine.subtractionMethodInfo(301, 85).badge === 'Method: -100, +?', 'Round-100 subtraction method badge');
  assert(engine.subtractionMethodInfo(301, 57).badge === 'Method: -60, +?', 'Round-up tens subtraction method badge');
  for (const domId of ['aim-row-focus', 'aim-row-horiz', 'aim-row-vert', 'aim-f-needle', 'aim-h-needle', 'aim-v-needle', 'aim-flow-pill', 'aim-low-lbl', 'aim-high-lbl', 'chalk-assist', 'chalk-assist-btn']) {
    assert(idxHtml.includes(`id="${domId}"`), `Missing DOM element #${domId}`);
  }
  // Unified Chalk Chain (Croupier Snap, Chunk Hop) & Universal Slip Recovery assertions
  const snap1 = engine.buildCroupierSnap(['S20', 'T19', 'S19']);
  assert(snap1.total === 96 && snap1.pairSum === 76 && snap1.oddIdx === 0, 'Croupier Snap groups T19+S19=76 + S20');
  const snap2 = engine.buildCroupierSnap(['T20', 'T19', 'S5']);
  assert(snap2.total === 122 && snap2.pairSum === 117 && snap2.shapeTag.includes('Steal'), 'Croupier Snap Steal Last Digit T20+T19=117');
  const ch100 = engine.buildSubtractionChunk(501, 85);
  assert(ch100.canHop && ch100.hopMid === 401 && ch100.adjustVal === 15 && ch100.expected === 416, 'Chunk Hop 501-85 -> 401+15=416');
  const ch114 = engine.buildSubtractionChunk(301, 114);
  assert(ch114.canHop && ch114.hopMid === 201 && ch114.adjustVal === -14 && ch114.expected === 187, 'Chunk Hop Two-T19 301-114 -> 201-14=187');
  const chR43 = engine.buildSubtractionChunk(129, 57);
  assert(chR43.canHop && chR43.hopMid === 29 && chR43.adjustVal === 43 && chR43.expected === 72, 'Chunk Hop Rule of 43 129-57 -> 29+43=72');
  const slFdi = engine.slipRecoveryInfo(74, engine.parseBedCode('T14'), engine.parseBedCode('S14'), 1);
  assert(slFdi && slFdi.kind === 'fdi_single' && slFdi.newRem === 60, 'Slip Recovery 74 T14->S14 = 60 FDI single');
  const slBig = engine.slipRecoveryInfo(129, engine.parseBedCode('T19'), engine.parseBedCode('S19'), 2);
  assert(slBig && slBig.kind === 'big_single' && slBig.newRem === 110 && slBig.chunk.hopChunk === 20 && slBig.chunk.adjustVal === 1, 'Slip Recovery 129 T19->S19 (-20,+1=110)');
  const slNbS = engine.slipRecoveryInfo(104, engine.parseBedCode('T20'), engine.parseBedCode('S5'), 2);
  assert(slNbS && slNbS.kind === 'neighbor_single' && slNbS.newRem === 99 && slNbS.followUp.includes('Splash trap'), 'Slip Recovery 104 T20->S5 = 99 splash trap');
  const slNbT = engine.slipRecoveryInfo(129, engine.parseBedCode('T19'), engine.parseBedCode('T7'), 2);
  assert(slNbT && slNbT.kind === 'neighbor_treble' && slNbT.newRem === 108 && slNbT.chunk.hopChunk === 20 && slNbT.chunk.adjustVal === -1, 'Slip Recovery 129 T19->T7(21) -> -20,-1 = 108');
  const slBull = engine.slipRecoveryInfo(93, engine.parseBedCode('BULL'), engine.parseBedCode('25'), 2);
  assert(slBull && slBull.kind === 'outer_bull' && slBull.newRem === 68 && slBull.badge.includes('+5'), 'Slip Recovery 93 BULL->25 = 68 (+5 shortcut)');
  // Maths-Speed -> Oche Flow Aim Difficulty assertions
  const mfFast = engine.computeMathFlowModifier(0.22);
  const mfSlow = engine.computeMathFlowModifier(0.92);
  const mfExpired = engine.computeMathFlowModifier(0.40, { timedOut: true });
  assert(mfFast.tier === 'in_flow' && mfFast.speedMult < 0.88 && mfFast.zoneMult > 1.15, 'Fast maths triggers IN FLOW easier aim');
  assert(mfSlow.tier === 'rushed' && mfSlow.speedMult > 1.1 && mfSlow.zoneMult < 0.9, 'Slow maths tightens aim');
  assert(mfExpired.tier === 'cold' && mfExpired.speedMult > 1.25 && mfExpired.zoneMult < 0.76, 'Expired timer triggers RATTLED harder aim');
  const cfgFlow = engine.applyMathFlowToConfig(mCfg, mfFast);
  const cfgCold = engine.applyMathFlowToConfig(mCfg, mfExpired);
  assert(cfgFlow.horizSpeed < mCfg.horizSpeed && cfgFlow.horizSweet > mCfg.horizSweet, 'IN FLOW slows & widens horiz corridor');
  assert(cfgCold.horizSpeed > mCfg.horizSpeed && cfgCold.horizSweet < mCfg.horizSweet, 'RATTLED speeds up & narrows horiz corridor');

  // Outer-ring FDI number circle & pair invariant assertions
  assert(engine.FDI_SCORES.length === 20, 'Expected 20 FDI_SCORES');
  for (const s of engine.FDI_SCORES) {
    const fdi = engine.getFdiRule(s);
    assert(fdi && fdi.tNum + fdi.dNum === fdi.sum, `FDI ${s}: tNum+dNum === sum`);
    assert(fdi.tNum * 3 + fdi.dNum * 2 === s, `FDI ${s}: 3*tNum + 2*dNum === score`);
  }
  for (const sec of engine.SECTORS) {
    const p = engine.sectorNumberXY(sec);
    assert(engine.xyToSectorNumber(p.x, p.y) === sec, `Outer-ring number hit round-trip for sector ${sec}`);
  }
  console.log('PASS: Curriculum, auditor, 3-beat physics, subtraction method, maths-flow & FDI outer-ring assertions (all green)');

  // 4. Smoke test all 5 physics bots
  const rng = engine.createSeededRng(42);
  for (const id of bots.BOT_IDS) {
    const visit = bots.simulateBot501Visit(bots.BOT_PROFILES[id], { startScore: 501, rivalScore: 501, rng });
    assert(visit.throws.length >= 1 && visit.throws.length <= 3, `Bot ${id} visit dart count`);
  }
  console.log(`PASS: All ${bots.BOT_IDS.length} real-physics bots simulated cleanly`);

  // 5. Local static HTTP server check (gracefully degrades to direct static-asset verification in socket-restricted sandboxes)
  let server = null;
  try {
    const started = await startStaticServer();
    server = started.server;
    const baseUrl = started.baseUrl;
    for (const urlPath of ['/index.html', '/oche_light.html', '/src/engine.mjs', '/src/bots.mjs']) {
      const resp = await fetch(baseUrl + urlPath);
      assert(resp.status === 200, `HTTP ${resp.status} for ${urlPath}`);
      const txt = await resp.text();
      assert(txt.length > 500, `Empty body for ${urlPath}`);
    }
    console.log(`PASS: Static HTTP checks at ${baseUrl} (200 OK on all entry & module files)`);

    // 6. Optional Playwright headless check if available
    try {
      const pw = await import('playwright');
      const browser = await pw.chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errors = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(baseUrl + '/index.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);
      await browser.close();
      assert(errors.length === 0, `Playwright console/page errors: ${errors.join(' | ')}`);
      console.log('PASS: Playwright headless Chromium load check (0 console/page errors)');
    } catch (pwErr) {
      if (pwErr && /Cannot find package|ERR_MODULE_NOT_FOUND/.test(String(pwErr.message || pwErr))) {
        console.log('INFO: Playwright not installed locally — HTTP + ES module + DOM/script checks passed.');
      } else {
        throw pwErr;
      }
    }
  } catch (netErr) {
    const code = (netErr && (netErr.code || (netErr.cause && netErr.cause.code))) || '';
    if (code === 'EPERM' || code === 'EACCES') {
      for (const rel of ['index.html', 'oche_light.html', 'src/engine.mjs', 'src/bots.mjs']) {
        const full = path.join(ROOT, rel);
        assert(fs.existsSync(full) && fs.statSync(full).size > 500, `Missing static asset: ${rel}`);
      }
      console.log('PASS: Static asset & ES-module checks passed (loopback sockets restricted in sandbox).');
    } else {
      throw netErr;
    }
  } finally {
    if (server) server.close();
  }
  console.log('ALL SMOKE CHECKS PASSED!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
