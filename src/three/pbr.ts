import * as THREE from 'three';

// Texturas procedurais com mapa de normais: pedra com musgo, lajes rachadas, manchas de musgo, poças e tecido.

type Pair = { map: THREE.CanvasTexture; normal: THREE.CanvasTexture };
const cache = new Map<string, Pair | THREE.CanvasTexture>();

function mkc(n: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = c.height = n;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}
const rnd = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** Mapa de altura (cinzento) -> mapa de normais, com repetição (Sobel). */
export function heightToNormal(h: HTMLCanvasElement, strength = 2.2): HTMLCanvasElement {
  const n = h.width, src = h.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, n, n).data;
  const [oc, og] = mkc(n);
  const out = og.createImageData(n, n), d = out.data;
  const H = (x: number, y: number) => src[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
    let nx = -dx * strength, ny = dy * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * n + x) * 4; d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  og.putImageData(out, 0, 0);
  return oc;
}

function tex(c: HTMLCanvasElement, srgb: boolean, repeat = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

function blob(g: CanvasRenderingContext2D, x: number, y: number, r: number, rgba: string) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
}

/** Muro de pedra antiga: fiadas de blocos desalinhados, juntas fundas, lascas, fendas, musgo e manchas de humidade. */
export function stonePBR(): Pair {
  const hit = cache.get('stone') as Pair | undefined; if (hit) return hit;
  const N = 512, [cc, c] = mkc(N), [hc, h] = mkc(N), R = rnd(1234), r = (a: number, b: number) => a + (b - a) * R();
  c.fillStyle = '#100e0b'; c.fillRect(0, 0, N, N); h.fillStyle = '#242424'; h.fillRect(0, 0, N, N);
  const rows = 6, rh = N / rows, tones = ['#a09c90', '#928e82', '#adaa9d', '#85827a', '#9a9486', '#9b988d'];
  for (let k = 0; k < rows; k++) {
    let x = -r(0, 120);
    while (x < N) {
      const w = r(110, 215), y0 = k * rh, gap = 5;
      for (const ox of [-N, 0, N]) {
        const bx = x + ox + gap, by = y0 + gap, bw = w - gap * 2, bh = rh - gap * 2;
        c.fillStyle = tones[(R() * tones.length) | 0]; c.fillRect(bx, by, bw, bh);
        h.fillStyle = `rgb(${r(170, 225) | 0},${r(170, 225) | 0},${r(170, 225) | 0})`; h.fillRect(bx, by, bw, bh);
        // bisel: luz em cima/esquerda, sombra em baixo/direita
        c.fillStyle = 'rgba(255,245,225,.16)'; c.fillRect(bx, by, bw, 4); c.fillRect(bx, by, 4, bh);
        c.fillStyle = 'rgba(0,0,0,.34)'; c.fillRect(bx, by + bh - 5, bw, 5); c.fillRect(bx + bw - 5, by, 5, bh);
        h.fillStyle = 'rgba(0,0,0,.55)'; h.fillRect(bx, by, bw, 6); h.fillRect(bx, by, 6, bh); h.fillRect(bx, by + bh - 6, bw, 6); h.fillRect(bx + bw - 6, by, 6, bh);
        // grão
        for (let s = 0; s < 150; s++) { const sx = bx + r(0, bw), sy = by + r(0, bh), v = r(-34, 34) | 0; c.fillStyle = `rgba(${128 + v},${126 + v},${118 + v},.4)`; c.fillRect(sx, sy, r(1, 3), r(1, 3)); h.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},.18)`; h.fillRect(sx, sy, 2, 2); }
        // lascas nos cantos
        for (const [qx, qy] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]] as const) if (R() < 0.45) { const s = r(8, 20); for (const g2 of [c, h]) { g2.fillStyle = g2 === c ? '#14120e' : '#202020'; g2.beginPath(); g2.moveTo(qx, qy); g2.lineTo(qx + (qx === bx ? s : -s), qy); g2.lineTo(qx, qy + (qy === by ? s : -s)); g2.closePath(); g2.fill(); } }
        // veios de humidade a escorrer
        const sg = c.createLinearGradient(0, by, 0, by + bh); sg.addColorStop(0, 'rgba(10,12,8,.32)'); sg.addColorStop(1, 'rgba(10,12,8,0)'); c.fillStyle = sg; c.fillRect(bx + r(0, bw * 0.6), by, r(8, 30), bh);
      }
      x += w;
    }
  }
  // fendas
  for (let i = 0; i < 9; i++) {
    let x = r(0, N), y = r(0, N); const pts: [number, number][] = [[x, y]];
    for (let s = 0; s < 8; s++) { x += r(-40, 40); y += r(10, 46); pts.push([x, y]); }
    for (const [g2, col, lw] of [[c, 'rgba(0,0,0,.85)', 1.8], [h, 'rgba(0,0,0,.95)', 3]] as const) { g2.strokeStyle = col; g2.lineWidth = lw; g2.beginPath(); pts.forEach(([px, py], j) => (j ? g2.lineTo(px, py) : g2.moveTo(px, py))); g2.stroke(); }
  }
  // musgo nas juntas e na base dos blocos
  for (let i = 0; i < 90; i++) {
    const x = r(0, N), y = Math.floor(r(0, rows)) * rh + r(-4, 10), rad = r(10, 34);
    blob(c, x, y, rad, 'rgba(70,104,36,.62)'); blob(c, x, y, rad * 0.6, 'rgba(110,150,52,.4)');
    blob(h, x, y, rad, 'rgba(255,255,255,.28)');
  }
  const out = { map: tex(cc, true), normal: tex(heightToNormal(hc, 3.2), false) };
  cache.set('stone', out); return out;
}

/** Laje de chão (uma por casa): bordas biseladas, riscos, fendas, musgo nos cantos e sujidade. */
export function flagPBR(): Pair {
  const hit = cache.get('flag') as Pair | undefined; if (hit) return hit;
  const N = 512, [cc, c] = mkc(N), [hc, h] = mkc(N), R = rnd(555), r = (a: number, b: number) => a + (b - a) * R();
  c.fillStyle = '#9a978f'; c.fillRect(0, 0, N, N); h.fillStyle = '#d0d0d0'; h.fillRect(0, 0, N, N);
  // juntas
  c.strokeStyle = '#17150f'; c.lineWidth = 26; c.strokeRect(0, 0, N, N);
  h.strokeStyle = '#303030'; h.lineWidth = 34; h.strokeRect(0, 0, N, N);
  const bev = c.createLinearGradient(0, 0, N, N); bev.addColorStop(0, 'rgba(255,255,255,.18)'); bev.addColorStop(0.5, 'rgba(255,255,255,0)'); bev.addColorStop(1, 'rgba(0,0,0,.3)');
  c.fillStyle = bev; c.fillRect(0, 0, N, N);
  // manchas de desgaste e pó
  for (let i = 0; i < 60; i++) { const v = r(-26, 26) | 0; blob(c, r(0, N), r(0, N), r(20, 80), `rgba(${140 + v},${138 + v},${130 + v},.3)`); }
  for (let i = 0; i < 520; i++) { const v = r(-40, 40) | 0; c.fillStyle = `rgba(${128 + v},${126 + v},${118 + v},.4)`; c.fillRect(r(10, N - 10), r(10, N - 10), r(1, 3), r(1, 3)); h.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.16)'; h.fillRect(r(10, N - 10), r(10, N - 10), 2, 2); }
  // fendas ramificadas
  for (let i = 0; i < 4; i++) {
    let x = r(40, N - 40), y = r(40, N - 40), a = r(0, 6.28);
    const pts: [number, number][] = [[x, y]];
    for (let s = 0; s < 9; s++) { a += r(-0.7, 0.7); x += Math.cos(a) * r(20, 50); y += Math.sin(a) * r(20, 50); pts.push([x, y]); }
    for (const [g2, col, lw] of [[c, 'rgba(0,0,0,.85)', 2], [h, 'rgba(0,0,0,.95)', 3.5]] as const) { g2.strokeStyle = col; g2.lineWidth = lw; g2.beginPath(); pts.forEach(([px, py], j) => (j ? g2.lineTo(px, py) : g2.moveTo(px, py))); g2.stroke(); }
  }
  // musgo nos cantos
  for (const [x, y] of [[0, 0], [N, 0], [0, N], [N, N]] as const) for (let i = 0; i < 9; i++) { blob(c, x + r(-50, 50), y + r(-50, 50), r(24, 60), 'rgba(66,100,34,.6)'); blob(h, x + r(-50, 50), y + r(-50, 50), r(24, 50), 'rgba(255,255,255,.25)'); }
  const out = { map: tex(cc, true), normal: tex(heightToNormal(hc, 2.4), false) };
  cache.set('flag', out); return out;
}

/** Mancha de musgo/líquen com alfa (decalque sobre o chão). */
export function mossDecal(): THREE.CanvasTexture {
  const hit = cache.get('moss') as THREE.CanvasTexture | undefined; if (hit) return hit;
  const N = 256, [c, g] = mkc(N), R = rnd(99), r = (a: number, b: number) => a + (b - a) * R();
  for (let i = 0; i < 26; i++) { const a = r(0, 6.28), d = r(0, 80); blob(g, 128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r(18, 46), `rgba(${60 + r(0, 30) | 0},${96 + r(0, 40) | 0},${30 + r(0, 20) | 0},.85)`); }
  for (let i = 0; i < 260; i++) { const a = r(0, 6.28), d = r(0, 100); g.fillStyle = `rgba(${130 + r(0, 50) | 0},${170 + r(0, 50) | 0},${70 | 0},.7)`; g.fillRect(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r(1, 3), r(1, 3)); }
  const t = tex(c, true, false); cache.set('moss', t); return t;
}

/** Forma irregular macia para poças (alfa). */
export function puddleBlob(): THREE.CanvasTexture {
  const hit = cache.get('pud') as THREE.CanvasTexture | undefined; if (hit) return hit;
  const N = 256, [c, g] = mkc(N), R = rnd(7), r = (a: number, b: number) => a + (b - a) * R();
  for (let i = 0; i < 9; i++) blob(g, 128 + r(-46, 46), 128 + r(-30, 30), r(40, 78), 'rgba(255,255,255,.9)');
  const t = tex(c, false, false); cache.set('pud', t); return t;
}

/** Normais de tecido/pele áspera (ruído repetível). */
export function noiseNormal(strength = 1.4): THREE.CanvasTexture {
  const key = 'noise' + strength, hit = cache.get(key) as THREE.CanvasTexture | undefined; if (hit) return hit;
  const N = 256, [hc, h] = mkc(N), R = rnd(31), r = (a: number, b: number) => a + (b - a) * R();
  h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
  for (let i = 0; i < 9000; i++) { const v = r(0, 255) | 0; h.fillStyle = `rgba(${v},${v},${v},.35)`; h.fillRect(r(0, N), r(0, N), r(1, 3), r(1, 3)); }
  for (let i = 0; i < 70; i++) { h.strokeStyle = `rgba(${R() < 0.5 ? 255 : 0},${R() < 0.5 ? 255 : 0},${R() < 0.5 ? 255 : 0},.12)`; h.lineWidth = 1; const x = r(0, N), y = r(0, N); h.beginPath(); h.moveTo(x, y); h.lineTo(x + r(-30, 30), y + r(-6, 6)); h.stroke(); }
  const t = tex(heightToNormal(hc, strength), false); cache.set(key, t); return t;
}
