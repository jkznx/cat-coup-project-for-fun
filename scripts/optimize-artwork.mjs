// Build-time encoding only: decoded RGBA pixels must remain identical.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const input = await readFile('public/assets/cat-court.png');
const output = await sharp(input).webp({ lossless: true, effort: 6 }).toBuffer();
const original = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const encoded = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (original.info.width !== encoded.info.width || original.info.height !== encoded.info.height || !original.data.equals(encoded.data)) throw Error('Decoded artwork changed');
if (output.length >= input.length) throw Error('No size improvement; keep original');
await writeFile('public/assets/cat-court-lossless.webp', output, { flag: 'wx' });
console.log(JSON.stringify({ originalBytes: input.length, optimizedBytes: output.length, savedPercent: 100 * (1 - output.length / input.length), width: original.info.width, height: original.info.height,
  identicalDecodedPixels: true, rgbaSha256: createHash('sha256').update(original.data).digest('hex'), webpSha256: createHash('sha256').update(output).digest('hex') }, null, 2));
