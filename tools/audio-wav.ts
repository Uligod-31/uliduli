// Gera as músicas em WAV e mede-as (volume, picos, equilíbrio grave/médio/agudo, zonas mudas) e desenha um espetrograma.
// Uso: npx esbuild tools/audio-wav.ts --bundle --platform=node --format=esm --outfile="$TEMP/wav.mjs" && OUT=<pasta> node "$TEMP/wav.mjs"
//      (ONLY=menu,viking para escolher músicas)
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { Rendered, renderSong } from '../src/audio/render';
import { SONGS } from '../src/audio/songs';

declare const process: { env: Record<string, string | undefined> };
const dir = process.env.OUT ?? 'audio-out', only = process.env.ONLY?.split(',');
mkdirSync(dir, { recursive: true });

function wav(r: Rendered): Uint8Array {
  const n = r.l.length, buf = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o: number, s: string) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); buf.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 2, true);
  buf.setUint32(24, r.sampleRate, true); buf.setUint32(28, r.sampleRate * 4, true); buf.setUint16(32, 4, true); buf.setUint16(34, 16, true); str(36, 'data'); buf.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { buf.setInt16(44 + i * 4, Math.max(-1, Math.min(1, r.l[i])) * 32767, true); buf.setInt16(46 + i * 4, Math.max(-1, Math.min(1, r.r[i])) * 32767, true); }
  return new Uint8Array(buf.buffer);
}

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

function crc(b: Uint8Array) { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }
function png(w: number, h: number, rgb: Uint8Array): Uint8Array {
  const chunk = (type: string, data: Uint8Array) => { const b = new Uint8Array(12 + data.length), v = new DataView(b.buffer); v.setUint32(0, data.length); for (let i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i); b.set(data, 8); v.setUint32(8 + data.length, crc(b.subarray(4, 8 + data.length))); return b; };
  const head = new Uint8Array(13), hv = new DataView(head.buffer); hv.setUint32(0, w); hv.setUint32(4, h); head[8] = 8; head[9] = 2;
  const raw = new Uint8Array(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

const W = 900, H = 200, N = 4096;
const sheet = new Uint8Array(W * H * 3 * SONGS.length);
let row = 0;
for (const song of SONGS) {
  if (only && !only.includes(song.id)) continue;
  const t0 = performance.now(), r = renderSong(song), ms = performance.now() - t0;
  writeFileSync(`${dir}/${song.id}.wav`, wav(r));
  let peak = 0, sum = 0, nan = 0, side = 0;
  for (let i = 0; i < r.l.length; i++) {
    for (const x of [r.l[i], r.r[i]]) { if (!Number.isFinite(x)) nan++; peak = Math.max(peak, Math.abs(x)); sum += x * x; }
    side += (r.l[i] - r.r[i]) ** 2 / 4;
  }
  const rms = Math.sqrt(sum / (r.l.length * 2));
  // volume por segundo (para ver secções fracas ou mudas) e energia por bandas
  const secs: number[] = [];
  for (let s = 0; s < r.l.length; s += r.sampleRate) { let q = 0, c = 0; for (let i = s; i < Math.min(s + r.sampleRate, r.l.length); i++, c++) q += (r.l[i] ** 2 + r.r[i] ** 2) / 2; secs.push(Math.round(10 * Math.log10(q / c + 1e-12))); }
  const bands = [[20, 120], [120, 500], [500, 2000], [2000, 6000], [6000, 16000]], e = bands.map(() => 0);
  for (let x = 0; x < W; x++) {
    const at = Math.floor((x / W) * (r.l.length - N)), re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = ((r.l[at + i] + r.r[at + i]) / 2) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    const mag = (k: number) => Math.hypot(re[k], im[k]);
    for (let k = 1; k < N / 2; k++) { const f = (k * r.sampleRate) / N; bands.forEach(([a, b], j) => { if (f >= a && f < b) e[j] += mag(k) ** 2; }); }
    for (let y = 0; y < H; y++) {
      const f = 30 * Math.pow(16000 / 30, 1 - y / H), k = Math.max(1, Math.round((f * N) / r.sampleRate));
      const v = Math.max(0, Math.min(1, (20 * Math.log10(mag(k) / (N / 4) + 1e-9) + 78) / 66));
      sheet.set([255 * Math.min(1, v * 1.6), 255 * Math.max(0, v * 1.7 - 0.7), 255 * Math.min(1, 0.15 + v * 0.9) * (v > 0.02 ? 1 : 0)], (row * H * W + y * W + x) * 3);
    }
  }
  const tot = e.reduce((a, b) => a + b, 0);
  console.log(`${song.id.padEnd(10)} ${r.seconds.toFixed(1)}s  render ${ms.toFixed(0)}ms  pico ${peak.toFixed(2)}  rms ${(20 * Math.log10(rms)).toFixed(1)}dB  largura ${(Math.sqrt(side / r.l.length) / rms).toFixed(2)}  NaN ${nan}  bandas% ${e.map((x) => ((100 * x) / tot).toFixed(1)).join('/')}  batidas ${r.kicks.length}`);
  console.log('   dB/s ' + secs.join(' '));
  row++;
}
writeFileSync(`${dir}/espetrograma.png`, png(W, H * row, sheet.subarray(0, W * H * 3 * row)));
