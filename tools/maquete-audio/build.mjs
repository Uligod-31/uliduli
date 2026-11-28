// Junta a página «Sala de Ensaios» num único ficheiro: node tools/maquete-audio/build.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const bundle = async (entry, define = {}) =>
  (await build({ entryPoints: [join(dir, entry)], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', charset: 'utf8', define })).outputFiles[0].text;

const worker = await bundle('worker.ts');
const main = await bundle('main.ts', { WORKER_SOURCE: JSON.stringify(worker) });
const out = join(dir, '..', 'maquete-audio.html');
writeFileSync(out, `${readFileSync(join(dir, 'pagina.html'), 'utf8')}\n<script>\n${main.replace(/<\/script/gi, '<\\/script')}</script>\n`);
console.log('escrito', out);
