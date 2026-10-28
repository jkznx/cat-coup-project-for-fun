import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
const files = await readdir('dist/assets');
let javascriptGzip = 0, cssGzip = 0;
const artwork = new Set();
for (const name of files) {
  if (!/\.(js|css)$/.test(name)) continue;
  const bytes = await readFile(resolve('dist/assets', name));
  for (const match of bytes.toString().matchAll(/\/assets\/(?:cat-court-lossless|vintage-court)\.webp/g)) artwork.add(match[0]);
  if (name.endsWith('.js')) javascriptGzip += gzipSync(bytes).length;
  else {
    cssGzip += gzipSync(bytes).length;
  }
}
if (artwork.size !== 2 || !artwork.has('/assets/cat-court-lossless.webp') || !artwork.has('/assets/vintage-court.webp')) throw Error('Expected the Classic and Vintage delivery sprites in the production bundle');
const classicArtworkBytes=(await readFile(resolve('dist/assets/cat-court-lossless.webp'))).length;
const vintageArtworkBytes=(await readFile(resolve('dist/assets/vintage-court.webp'))).length;
const artworkBytes=classicArtworkBytes+vintageArtworkBytes;
const metrics = { javascriptGzip, cssGzip, classicArtworkBytes, vintageArtworkBytes, artworkBytes };
// Preserve the Classic cap; grant the three additional portraits their own bounded 250KB allowance.
const budgets = { javascriptGzip: 130000, cssGzip: 23000, classicArtworkBytes:2250000, vintageArtworkBytes:250000, artworkBytes:2500000 };
console.log(JSON.stringify({ metrics, budgets }, null, 2));
for (const key of Object.keys(budgets)) if (metrics[key] > budgets[key]) throw Error(`Performance budget exceeded: ${key}`);
