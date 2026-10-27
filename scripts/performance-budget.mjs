import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
const files = await readdir('dist/assets');
let javascriptGzip = 0, cssGzip = 0;
const artwork = new Set();
for (const name of files) {
  if (!/\.(js|css)$/.test(name)) continue;
  const bytes = await readFile(resolve('dist/assets', name));
  if (name.endsWith('.js')) javascriptGzip += gzipSync(bytes).length;
  else {
    cssGzip += gzipSync(bytes).length;
    for (const match of bytes.toString().matchAll(/url\(["']?(\/assets\/cat-court[^)"']+)/g)) artwork.add(match[1]);
  }
}
if (artwork.size !== 1) throw Error('Expected one active cat sprite in production CSS');
const artworkBytes = (await readFile(resolve('dist', [...artwork][0].slice(1)))).length;
const metrics = { javascriptGzip, cssGzip, artworkBytes };
const budgets = { javascriptGzip: 130000, cssGzip: 23000, artworkBytes: 2250000 };
console.log(JSON.stringify({ metrics, budgets }, null, 2));
for (const key of Object.keys(budgets)) if (metrics[key] > budgets[key]) throw Error(`Performance budget exceeded: ${key}`);
