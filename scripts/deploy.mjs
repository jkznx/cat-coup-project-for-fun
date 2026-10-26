// Run using a locally maintained checkout. Never download deployment scripts.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, open, rename, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from './deployment-manifest.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function run(file, args, env = {}, timeout = 120000) {
  return new Promise((accept, reject) => {
    const child = spawn(file, args, { cwd: root, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', errors = '';
    child.stdout.on('data', b => { output = (output + b).slice(-65536); });
    child.stderr.on('data', b => { errors = (errors + b).slice(-65536); });
    const timer = setTimeout(() => { child.kill(); reject(Error(`${file} timed out; inspect deployment state before retry`)); }, timeout);
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? accept(output.trim()) : reject(Error(`${file} failed (${code}): ${errors.slice(-2000)}`)); });
  });
}
async function json(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw Error(`HTTP ${response.status} at ${new URL(url).pathname}`);
  return response.json();
}
async function waitHealth(base, version) {
  for (let i = 0; i < 30; i++) {
    try { const h = await json(base + '/health'); if (h.ok && h.version === version) return; } catch {}
    await sleep(1000);
  }
  throw Error('Health/version verification failed');
}
export async function deploy(manifestPath, configPath, bootstrap = false) {
  const target = validateManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  const cfg = JSON.parse(await readFile(configPath, 'utf8'));
  if (!cfg.stateDirectory || !cfg.adminTokenFile || cfg.publicUrl !== 'https://cat-coup.jukrachai-crybaby.space') throw Error('Invalid host configuration');
  const stateDir = resolve(cfg.stateDirectory), tokenFile = resolve(cfg.adminTokenFile);
  if (stateDir.startsWith(root + '/') || stateDir.startsWith(root + '\\') || tokenFile.startsWith(root + '/') || tokenFile.startsWith(root + '\\')) throw Error('Keep state and secrets outside the checkout');
  const token = (await readFile(tokenFile, 'utf8')).trim();
  if (token.length < 32) throw Error('Invalid admin token');
  await mkdir(stateDir, { recursive: true });
  const lockPath = resolve(stateDir, 'deploy.lock');
  const lock = await open(lockPath, 'wx');
  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  const statePath = resolve(stateDir, 'current.json'), failurePath = resolve(stateDir, 'blocked.json');
  const admin = (path, method = 'GET') => json('http://127.0.0.1:3002' + path, { method, headers: { Authorization: `Bearer ${token}` } });
  const compose = image => run('docker', ['compose', '-f', resolve(root, 'compose.yaml'), 'up', '-d', '--no-build', '--pull', 'never', 'app'], { CAT_COUP_IMAGE: image, CAT_COUP_ADMIN_TOKEN_FILE: tokenFile, APP_PORT: '3001', ADMIN_PORT: '3002' });
  let previous, changed = false, drained = false, candidate, admissionMayBeOpen = false;
  try {
    try { await readFile(failurePath); throw Error('Deployment blocked after earlier failure; review blocked.json first'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    try { previous = validateManifest(JSON.parse(await readFile(statePath, 'utf8'))); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (previous && BigInt(target.promotionRun) <= BigInt(previous.promotionRun)) { console.log('Already deployed or older promotion; skipped.'); return; }
    if (!previous && !bootstrap) throw Error('First deployment requires --bootstrap after the old Node server is stopped in a maintenance window');
    if (!previous) {
      try { await fetch('http://127.0.0.1:3001/health', { signal: AbortSignal.timeout(2000) }); throw Error('Port 3001 is serving an existing app; do not replace it'); }
      catch (e) { if (e.message.includes('existing app')) throw e; }
    }
    await run('docker', ['pull', target.image]);
    candidate = await run('docker', ['run', '-d', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '-p', '127.0.0.1::3001', target.image]);
    const mapping = await run('docker', ['port', candidate, '3001/tcp']);
    if (!/^127\.0\.0\.1:\d+$/.test(mapping)) throw Error('Unexpected candidate port mapping');
    const candidateUrl = `http://${mapping}`;
    await waitHealth(candidateUrl, target.commit);
    await run(process.execPath, ['scripts/smoke.mjs'], { BASE_URL: candidateUrl, EXPECTED_VERSION: target.commit }, 45000);
    if (previous) {
      const old = await admin('/status');
      if (old.version !== previous.commit) throw Error('Running app does not match recorded version');
      const ids = await run('docker', ['compose', '-f', resolve(root, 'compose.yaml'), 'ps', '-q', 'app'], { CAT_COUP_IMAGE: previous.image, CAT_COUP_ADMIN_TOKEN_FILE: tokenFile });
      if (!/^[a-f0-9]+$/.test(ids) || await run('docker', ['inspect', '--format', '{{.Config.Image}}', ids]) !== previous.image) throw Error('Running container differs from recorded image');
      await admin('/drain', 'POST'); drained = true;
      const deadline = Date.now() + 300000;
      while ((await admin('/status')).activeGames > 0) {
        if (Date.now() >= deadline) { console.log('Deployment postponed: unfinished games remain.'); return; }
        await sleep(2000);
      }
      await sleep(15000); // Give lobby players time to read the update notice.
    }
    await writeFile(resolve(stateDir, 'pending.json'), JSON.stringify({ previous, target }, null, 2));
    changed = true;
    await compose(target.image);
    await waitHealth('http://127.0.0.1:3001', target.commit);
    const publicHealth = await json(cfg.publicUrl + '/health');
    if (publicHealth.version !== target.commit || !publicHealth.ok) throw Error('Public health/version mismatch');
    await writeFile(statePath + '.tmp', JSON.stringify(target, null, 2));
    await rename(statePath + '.tmp', statePath);
    await unlink(resolve(stateDir, 'pending.json'));
    admissionMayBeOpen = true;
    await admin('/resume', 'POST'); drained = false;
    console.log(`Deployed ${target.commit}; software rollback cannot restore rooms.`);
  } catch (error) {
    if (changed) {
      // New containers start drained, so no new game can begin before verification.
      await writeFile(failurePath, JSON.stringify({ at: new Date().toISOString(), target, reason: error.message }, null, 2));
      if (previous) {
        // A lost response to /resume may mean admission was reopened. Re-drain
        // and refuse rollback if a real player has already started a game.
        if (admissionMayBeOpen) {
          const current = await admin('/drain', 'POST');
          if (current.activeGames > 0) throw Error('Rollback blocked: new active games exist; operator review required');
        }
        await compose(previous.image);
        await waitHealth('http://127.0.0.1:3001', previous.commit);
        await writeFile(statePath, JSON.stringify(previous, null, 2));
        await admin('/resume', 'POST'); drained = false;
        console.error('Previous software restored. Automatic deployments blocked pending review.');
      }
    }
    throw error;
  } finally {
    if (drained && !changed) await admin('/resume', 'POST').catch(() => console.error('Could not reopen admission; inspect admin status.'));
    if (candidate) await run('docker', ['rm', '-f', candidate]).catch(() => console.error('Candidate cleanup needs attention.'));
    await lock.close(); await unlink(lockPath);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  deploy(process.argv[2], process.argv[3], process.argv.includes('--bootstrap')).catch(e => { console.error(e.message); process.exitCode = 1; });
}
