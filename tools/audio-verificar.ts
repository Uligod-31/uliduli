// Calcula TODOS os temas (menu + um por nível) e confirma que cada um é válido, audível e diferente dos outros.
// Uso: npx esbuild tools/audio-verificar.ts --bundle --platform=node --format=esm --outfile="$TEMP/ver.mjs" && node "$TEMP/ver.mjs"
//      (ONLY=egipto,mandala para alguns mundos; SCORE=1 só valida as partituras, sem calcular o som)
import { compose } from '../src/audio/composer';
import { renderSong } from '../src/audio/render';
import { WORLDS } from '../src/worlds';

declare const process: { env: Record<string, string | undefined>; exitCode: number };
const only = process.env.ONLY?.split(','), scoreOnly = !!process.env.SCORE;
const list: [string, number, string][] = [['menu', 0, 'Acende!']];
for (const w of WORLDS.filter((w) => w.ready)) w.levels.forEach((l, i) => list.push([w.id, i, l.title]));

const scores = new Map<string, string>(), sounds: { id: string; world: string; print: number[] }[] = [];
const bad: string[] = [];
let n = 0;
for (const [w, i, title] of list) {
  if (only && !only.includes(w)) continue;
  const id = `${w}:${i}`;
  try {
    const song = compose(w, i, title);
    const score = JSON.stringify([song.bpm, song.root, song.form]);
    if (scores.has(score)) bad.push(`${id}: partitura igual à de ${scores.get(score)}`);
    scores.set(score, id);
    n++;
    if (scoreOnly) continue;
    const t0 = performance.now(), r = renderSong(song), ms = performance.now() - t0;
    let peak = 0, sum = 0, nan = 0, quiet = 0, run = 0;
    for (let k = 0; k < r.l.length; k++) { const a = r.l[k], b = r.r[k]; if (!Number.isFinite(a) || !Number.isFinite(b)) nan++; peak = Math.max(peak, Math.abs(a), Math.abs(b)); sum += (a * a + b * b) / 2; }
    const win = r.sampleRate / 4;
    for (let s = 0; s + win <= r.l.length; s += win) { let q = 0; for (let k = s; k < s + win; k++) q += (r.l[k] ** 2 + r.r[k] ** 2) / 2; if (10 * Math.log10(q / win + 1e-12) < -38) { run++; quiet = Math.max(quiet, run); } else run = 0; }
    const rms = 20 * Math.log10(Math.sqrt(sum / r.l.length));
    // «impressão digital»: volume em 64 fatias iguais, para comparar temas entre si
    const print = Array.from({ length: 64 }, (_, s) => { const a = Math.floor((s * r.l.length) / 64), b = Math.floor(((s + 1) * r.l.length) / 64); let q = 0; for (let k = a; k < b; k += 7) q += r.l[k] * r.l[k]; return Math.sqrt((q * 7) / (b - a)); });
    sounds.push({ id, world: w, print });
    const flags = [nan && `${nan} NaN`, peak > 0.99 && 'pico alto', rms < -18 && 'baixo demais', rms > -12 && 'alto demais', quiet > 8 && `${quiet / 4}s mudo`, r.seconds < 18 && 'curto', r.seconds > 100 && 'longo'].filter(Boolean);
    if (flags.length) bad.push(`${id}: ${flags.join(', ')}`);
    console.log(`${id.padEnd(14)} ${String(song.bpm).padStart(3)}bpm tom ${song.root}  ${r.seconds.toFixed(0).padStart(3)}s  render ${ms.toFixed(0).padStart(5)}ms  pico ${peak.toFixed(2)}  ${rms.toFixed(1)}dB  ${song.band}`);
  } catch (e) { bad.push(`${id}: ${(e as Error).message}`); }
}
let closest = 1e9, pair = '';
for (let a = 0; a < sounds.length; a++) for (let b = a + 1; b < sounds.length; b++) {
  const d = Math.sqrt(sounds[a].print.reduce((s, v, k) => s + (v - sounds[b].print[k]) ** 2, 0) / 64);
  if (d < closest) { closest = d; pair = `${sounds[a].id} / ${sounds[b].id}`; }
}
console.log(`\n${n} temas; ${scores.size} partituras diferentes${sounds.length > 1 ? `; par de som mais parecido: ${pair} (distância ${closest.toFixed(4)})` : ''}`);
console.log(bad.length ? 'PROBLEMAS:\n' + bad.join('\n') : 'sem problemas');
if (bad.length) process.exitCode = 1;
