import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { repository, validateManifest } from './deployment-manifest.mjs';
import { deploy } from './deploy.mjs';
// One bounded poll per invocation. Task Scheduler controls frequency.
const configPath = process.argv[2];
try {
  const cfg = JSON.parse(await readFile(configPath, 'utf8'));
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  async function api(path, raw = false) {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, { headers: raw ? { ...headers, Accept: 'application/octet-stream' } : headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error(`GitHub request failed: ${response.status}`);
    return response.json();
  }
  const releases = await api('releases?per_page=100');
  const release = releases.filter(r => !r.draft && !r.prerelease && /^deploy-[1-9][0-9]*$/.test(r.tag_name))
    .sort((a, b) => BigInt(a.tag_name.slice(7)) > BigInt(b.tag_name.slice(7)) ? -1 : 1)[0];
  if (!release) { console.log('No promoted deployment.'); process.exit(0); }
  const asset = release.assets.find(a => a.name === 'deployment.json' && a.size <= 16384);
  if (!asset) throw Error('Missing bounded deployment manifest');
  const manifest = validateManifest(await api(`releases/assets/${asset.id}`, true));
  if (manifest.release !== release.tag_name) throw Error('Release identity mismatch');
  for (const [runId, path, event] of [[manifest.ciRun, '.github/workflows/ci.yml', 'push'], [manifest.promotionRun, '.github/workflows/promote.yml', 'workflow_dispatch']]) {
    const run = await api(`actions/runs/${runId}`);
    if (run.conclusion !== 'success' || run.path !== path || run.event !== event || run.head_branch !== 'main' || run.head_repository.full_name !== repository || (event === 'push' && run.head_sha !== manifest.commit)) throw Error('Untrusted workflow provenance');
  }
  const dir = resolve(cfg.stateDirectory);
  await mkdir(dir, { recursive: true });
  const path = resolve(dir, `manifest-${manifest.promotionRun}.json`);
  await writeFile(path, JSON.stringify(manifest, null, 2), { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
  if (JSON.stringify(JSON.parse(await readFile(path, 'utf8'))) !== JSON.stringify(manifest)) throw Error('Saved manifest differs');
  await deploy(path, configPath);
} catch (e) { console.error(e.message); process.exitCode = 1; }
