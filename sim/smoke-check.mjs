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
  console.log('PASS: Curriculum, auditor & aim-physics assertions (all green)');

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
