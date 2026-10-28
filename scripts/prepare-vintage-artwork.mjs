// Optional build preparation. Runtime never processes artwork. Install Sharp separately or set SHARP_MODULE.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE||'sharp');
const input=await readFile('docs/artwork/vintage-court-source.png');
const output=await sharp(input).resize({width:960,withoutEnlargement:true}).webp({quality:86,effort:6}).toBuffer();
if(output.length>250000)throw Error('Vintage artwork exceeds 250KB budget');
await writeFile('public/assets/vintage-court.webp',output,{flag:'wx'});
console.log(JSON.stringify({sourceBytes:input.length,deliveryBytes:output.length,sha256:createHash('sha256').update(output).digest('hex')},null,2));
