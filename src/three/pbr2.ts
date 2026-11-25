import * as THREE from 'three';
import { heightToNormal, stonePBR, flagPBR } from './pbr';
import { wall3, floor3 } from './pbr3';

// Texturas dos mundos novos: obsidiana com fendas de lava, gelo, latão com pátina, estantes de livros; e os chãos respetivos.

export interface Tex { map: THREE.CanvasTexture; normal: THREE.CanvasTexture; emissive?: THREE.CanvasTexture }
const cache = new Map<string, Tex>();
const rndf = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function mkc(n: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = c.height = n;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}
function tex(c: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t;
}
function blob(g: CanvasRenderingContext2D, x: number, y: number, r: number, rgba: string) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
}

interface BlockOpts {
  tones: string[]; mortar: string; rows: number; seed: number; cracks: number; crackCol: string;
  glow?: string;          // cor das fendas luminosas (cria mapa emissivo)
  stain?: { col: string; n: number } | null;   // musgo / pátina / geada
  rivets?: boolean; frost?: boolean;
  runes?: string;         // cor das runas gravadas (a brilhar)
  glyphs?: string;        // cor dos hieróglifos gravados (a brilhar)
}

function blocks(o: BlockOpts): Tex {
  const N = 512, [cc, c] = mkc(N), [hc, h] = mkc(N), [ec, e] = mkc(N), R = rndf(o.seed), r = (a: number, b: number) => a + (b - a) * R();
  c.fillStyle = o.mortar; c.fillRect(0, 0, N, N); h.fillStyle = '#242424'; h.fillRect(0, 0, N, N); e.fillStyle = '#000'; e.fillRect(0, 0, N, N);
  const rows = o.rows, rh = N / rows;
  for (let k = 0; k < rows; k++) {
    let x = -r(0, 120);
    while (x < N) {
      const w = r(110, 215), y0 = k * rh, gap = 5;
      for (const ox of [-N, 0, N]) {
        const bx = x + ox + gap, by = y0 + gap, bw = w - gap * 2, bh = rh - gap * 2;
        c.fillStyle = o.tones[(R() * o.tones.length) | 0]; c.fillRect(bx, by, bw, bh);
        h.fillStyle = `rgb(${r(170, 225) | 0},${r(170, 225) | 0},${r(170, 225) | 0})`; h.fillRect(bx, by, bw, bh);
        c.fillStyle = 'rgba(255,245,225,.16)'; c.fillRect(bx, by, bw, 4); c.fillRect(bx, by, 4, bh);
        c.fillStyle = 'rgba(0,0,0,.34)'; c.fillRect(bx, by + bh - 5, bw, 5); c.fillRect(bx + bw - 5, by, 5, bh);
        h.fillStyle = 'rgba(0,0,0,.55)'; h.fillRect(bx, by, bw, 6); h.fillRect(bx, by, 6, bh); h.fillRect(bx, by + bh - 6, bw, 6); h.fillRect(bx + bw - 6, by, 6, bh);
        for (let s = 0; s < 120; s++) { const sx = bx + r(0, bw), sy = by + r(0, bh), v = r(-30, 30) | 0; c.fillStyle = `rgba(${128 + v},${128 + v},${128 + v},.35)`; c.fillRect(sx, sy, r(1, 3), r(1, 3)); }
        if (o.rivets) for (const [rx, ry] of [[bx + 12, by + 12], [bx + bw - 12, by + 12], [bx + 12, by + bh - 12], [bx + bw - 12, by + bh - 12]] as const) { blob(c, rx, ry, 7, 'rgba(240,220,160,.9)'); blob(h, rx, ry, 8, 'rgba(255,255,255,.9)'); }
        if (o.frost) { for (let s = 0; s < 40; s++) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(bx + r(0, bw), by + r(0, bh), r(1, 4), r(1, 2)); } const sg = c.createLinearGradient(bx, by, bx + bw, by + bh); sg.addColorStop(0, 'rgba(255,255,255,.28)'); sg.addColorStop(0.5, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(120,180,255,.2)'); c.fillStyle = sg; c.fillRect(bx, by, bw, bh); }
      }
      x += w;
    }
  }
  for (let i = 0; i < o.cracks; i++) {
    let x = r(0, N), y = r(0, N); const pts: [number, number][] = [[x, y]];
    for (let s = 0; s < 9; s++) { x += r(-40, 40); y += r(10, 46); pts.push([x, y]); }
    const path = (g2: CanvasRenderingContext2D) => { g2.beginPath(); pts.forEach(([px, py], j) => (j ? g2.lineTo(px, py) : g2.moveTo(px, py))); g2.stroke(); };
    c.strokeStyle = o.crackCol; c.lineWidth = 2; path(c); h.strokeStyle = 'rgba(0,0,0,.95)'; h.lineWidth = 3.5; path(h);
    if (o.glow) { e.strokeStyle = o.glow; e.globalAlpha = 0.35; e.lineWidth = 9; path(e); e.globalAlpha = 1; e.lineWidth = 2.6; path(e); c.strokeStyle = o.glow; c.lineWidth = 1.6; path(c); }
  }
  if (o.runes) {   // runas gravadas: haste vertical com ramos e traços, luminosas
    for (let i = 0; i < 12; i++) {
      const gx = r(40, N - 40), gy = Math.floor(r(0, rows)) * rh + rh / 2, s = r(0.8, 1.25), pts: [number, number, number, number][] = [[0, -22, 0, 22]];
      for (let k = 0; k < 2 + ((R() * 3) | 0); k++) { const y0 = r(-18, 10), dx = r(10, 20) * (R() < 0.5 ? -1 : 1); pts.push([0, y0, dx, y0 + r(-14, 14)]); }
      const path = (g2: CanvasRenderingContext2D) => { g2.beginPath(); for (const [x1, y1, x2, y2] of pts) { g2.moveTo(gx + x1 * s, gy + y1 * s); g2.lineTo(gx + x2 * s, gy + y2 * s); } g2.stroke(); };
      e.lineCap = 'round'; e.strokeStyle = o.runes; e.globalAlpha = 0.3; e.lineWidth = 12; path(e); e.globalAlpha = 1; e.lineWidth = 3.2; path(e);
      c.lineCap = 'round'; c.strokeStyle = 'rgba(8,10,14,.9)'; c.lineWidth = 7; path(c); c.strokeStyle = o.runes; c.lineWidth = 2.4; path(c);
      h.lineCap = 'round'; h.strokeStyle = 'rgba(0,0,0,.95)'; h.lineWidth = 7; path(h);
    }
  }
  if (o.glyphs) {   // hieróglifos: ankh, água, pena, disco solar, escaravelho, junco, pilar djed
    const draw = (g2: CanvasRenderingContext2D, t: number, gx: number, gy: number, s: number) => {
      const L = (x1: number, y1: number, x2: number, y2: number) => { g2.moveTo(gx + x1 * s, gy + y1 * s); g2.lineTo(gx + x2 * s, gy + y2 * s); };
      g2.beginPath();
      if (t === 0) { g2.ellipse(gx, gy - 12 * s, 7 * s, 9 * s, 0, 0, 6.28); L(0, -3, 0, 22); L(-10, 4, 10, 4); }
      else if (t === 1) { for (let k = 0; k < 3; k++) { const y = -10 + k * 9; L(-14, y, -7, y - 5); L(-7, y - 5, 0, y); L(0, y, 7, y - 5); L(7, y - 5, 14, y); } }
      else if (t === 2) { L(0, -22, 0, 22); for (let k = 0; k < 6; k++) { L(0, -16 + k * 6, 8, -22 + k * 6); L(0, -16 + k * 6, -8, -22 + k * 6); } }
      else if (t === 3) { g2.ellipse(gx, gy, 11 * s, 11 * s, 0, 0, 6.28); g2.moveTo(gx + 2 * s, gy); g2.ellipse(gx, gy, 2 * s, 2 * s, 0, 0, 6.28); }
      else if (t === 4) { g2.ellipse(gx, gy, 9 * s, 13 * s, 0, 0, 6.28); L(-9, -4, -17, -9); L(-9, 4, -17, 9); L(9, -4, 17, -9); L(9, 4, 17, 9); L(0, -13, 0, 13); }
      else if (t === 5) { g2.ellipse(gx, gy + 2 * s, 12 * s, 7 * s, -0.3, 0, 6.28); L(10, -6, 18, -14); L(18, -14, 24, -12); L(-4, 8, -6, 22); L(4, 9, 6, 22); }
      else if (t === 6) { L(0, 22, 0, -8); L(0, -8, -9, -20); L(0, -8, 9, -20); L(0, -8, 0, -22); L(-3, 4, -10, -2); L(3, 4, 10, -2); }
      else { L(0, -22, 0, 22); for (let k = 0; k < 4; k++) L(-11, -18 + k * 7, 11, -18 + k * 7); L(-11, -18, -11, 3); L(11, -18, 11, 3); }
      g2.stroke();
    };
    for (let i = 0; i < 14; i++) {
      const gx = r(46, N - 46), gy = Math.floor(r(0, rows)) * rh + rh / 2, s = r(0.75, 1.1), t = (i * 3 + ((R() * 8) | 0)) % 8;
      e.lineCap = 'round'; e.strokeStyle = o.glyphs; e.globalAlpha = 0.3; e.lineWidth = 11; draw(e, t, gx, gy, s); e.globalAlpha = 1; e.lineWidth = 3; draw(e, t, gx, gy, s);
      c.lineCap = 'round'; c.strokeStyle = 'rgba(40,24,6,.85)'; c.lineWidth = 7; draw(c, t, gx, gy, s); c.strokeStyle = o.glyphs; c.lineWidth = 2.4; draw(c, t, gx, gy, s);
      h.lineCap = 'round'; h.strokeStyle = 'rgba(0,0,0,.9)'; h.lineWidth = 7; draw(h, t, gx, gy, s);
    }
    // friso de ouro no limite de cada fiada, em alguns blocos
    for (let k = 1; k < rows; k += 2) { c.fillStyle = 'rgba(224,176,72,.55)'; c.fillRect(0, k * rh - 3, N, 3); }
  }
  if (o.stain) for (let i = 0; i < o.stain.n; i++) { const x = r(0, N), y = Math.floor(r(0, rows)) * rh + r(-4, 10), rad = r(10, 32); blob(c, x, y, rad, o.stain.col); blob(h, x, y, rad, 'rgba(255,255,255,.22)'); }
  const out: Tex = { map: tex(cc, true), normal: tex(heightToNormal(hc, 3), false) };
  if (o.glow || o.runes || o.glyphs) out.emissive = tex(ec, true);
  return out;
}

/** Estantes: filas de lombadas coloridas com faixas douradas, tábuas de madeira entre as prateleiras. */
function shelves(): Tex {
  const N = 512, [cc, c] = mkc(N), [hc, h] = mkc(N), R = rndf(8080), r = (a: number, b: number) => a + (b - a) * R();
  c.fillStyle = '#1c120a'; c.fillRect(0, 0, N, N); h.fillStyle = '#303030'; h.fillRect(0, 0, N, N);
  const rows = 4, rh = N / rows, cols = ['#6a1c1c', '#7a4a1c', '#1c3a5a', '#2c4a2c', '#4a2c5a', '#8a6a2a', '#5a1c3a', '#3a2a1a', '#2a4a4a', '#a0522d'];
  for (let k = 0; k < rows; k++) {
    const y0 = k * rh + 14, hh = rh - 30;
    let x = 0;
    while (x < N) {
      const w = r(16, 38), bh = hh - r(0, 26), by = y0 + (hh - bh);
      const col = cols[(R() * cols.length) | 0];
      const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, col); g.addColorStop(0.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
      c.fillStyle = col; c.fillRect(x, by, w - 1, bh); c.fillStyle = g; c.fillRect(x, by, w - 1, bh);
      h.fillStyle = `rgb(${r(150, 210) | 0},${r(150, 210) | 0},${r(150, 210) | 0})`; h.fillRect(x, by, w - 1, bh);
      h.fillStyle = 'rgba(0,0,0,.6)'; h.fillRect(x + w - 3, by, 3, bh);
      c.fillStyle = 'rgba(214,176,80,.85)'; c.fillRect(x, by + 12, w - 1, 3); c.fillRect(x, by + bh - 16, w - 1, 3);
      if (R() < 0.5) { c.fillStyle = 'rgba(230,200,120,.6)'; c.fillRect(x + w * 0.3, by + bh * 0.35, w * 0.4, 18); }
      if (R() < 0.12) { c.save(); c.translate(x + w, by + bh); c.rotate(r(-0.2, 0.2)); c.restore(); }
      x += w;
    }
    // tábua da prateleira
    const wg = c.createLinearGradient(0, k * rh + rh - 18, 0, k * rh + rh); wg.addColorStop(0, '#5a3a20'); wg.addColorStop(1, '#2a1a0e');
    c.fillStyle = wg; c.fillRect(0, k * rh + rh - 18, N, 18); h.fillStyle = '#d0d0d0'; h.fillRect(0, k * rh + rh - 18, N, 18);
    for (let s = 0; s < 14; s++) { c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(r(0, N), k * rh + rh - r(2, 16)); c.lineTo(r(0, N), k * rh + rh - r(2, 16)); c.stroke(); }
  }
  for (let i = 0; i < 40; i++) blob(c, r(0, N), r(0, N), r(14, 40), 'rgba(0,0,0,.16)');
  return { map: tex(cc, true), normal: tex(heightToNormal(hc, 2.6), false) };
}

function floors(kind: string): Tex {
  const N = 512, [cc, c] = mkc(N), [hc, h] = mkc(N), [ec, e] = mkc(N), R = rndf(kind.length * 977 + 3), r = (a: number, b: number) => a + (b - a) * R();
  e.fillStyle = '#000'; e.fillRect(0, 0, N, N);
  let glow = false;
  if (kind === 'wood') {
    h.fillStyle = '#707070'; h.fillRect(0, 0, N, N);
    const pl = 4, ph = N / pl, tones = ['#7a5232', '#6a4426', '#8a5e3a', '#5e3c22'];
    for (let k = 0; k < pl; k++) {
      c.fillStyle = tones[(R() * tones.length) | 0]; c.fillRect(0, k * ph, N, ph);
      for (let g = 0; g < 60; g++) { const y = k * ph + r(3, ph - 3); c.strokeStyle = `rgba(${R() < 0.5 ? '30,18,8' : '170,120,70'},${r(0.12, 0.35)})`; c.lineWidth = r(0.6, 1.8); c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(N * 0.3, y + r(-5, 5), N * 0.6, y + r(-5, 5), N, y + r(-3, 3)); c.stroke(); h.strokeStyle = 'rgba(0,0,0,.25)'; h.lineWidth = 1; h.beginPath(); h.moveTo(0, y); h.lineTo(N, y + r(-2, 2)); h.stroke(); }
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, k * ph, N, 5); h.fillStyle = 'rgba(0,0,0,.8)'; h.fillRect(0, k * ph, N, 7);
      const bx = r(80, N - 80); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(bx, k * ph, 3, ph); h.fillStyle = 'rgba(0,0,0,.8)'; h.fillRect(bx, k * ph, 5, ph);
      for (const nx of [12, N - 12]) { blob(c, nx, k * ph + ph / 2, 5, 'rgba(210,190,150,.8)'); }
    }
    for (let i = 0; i < 30; i++) blob(c, r(0, N), r(0, N), r(20, 60), 'rgba(0,0,0,.14)');
  } else if (kind === 'metal') {
    c.fillStyle = '#6a5a38'; c.fillRect(0, 0, N, N); h.fillStyle = '#b0b0b0'; h.fillRect(0, 0, N, N);
    c.strokeStyle = '#1a140a'; c.lineWidth = 22; c.strokeRect(0, 0, N, N); h.strokeStyle = '#303030'; h.lineWidth = 30; h.strokeRect(0, 0, N, N);
    // losangos em relevo
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = 36 + i * 56 + (j % 2) * 28, y = 36 + j * 56; c.fillStyle = 'rgba(255,230,160,.16)'; h.fillStyle = 'rgba(255,255,255,.55)'; for (const g2 of [c, h]) { g2.beginPath(); g2.moveTo(x, y - 11); g2.lineTo(x + 20, y); g2.lineTo(x, y + 11); g2.lineTo(x - 20, y); g2.closePath(); g2.fill(); } }
    for (const [x, y] of [[26, 26], [N - 26, 26], [26, N - 26], [N - 26, N - 26]] as const) { blob(c, x, y, 9, 'rgba(240,220,160,.95)'); blob(h, x, y, 10, 'rgba(255,255,255,.9)'); }
    for (let i = 0; i < 40; i++) blob(c, r(0, N), r(0, N), r(16, 50), R() < 0.5 ? 'rgba(60,110,90,.3)' : 'rgba(0,0,0,.2)');
    for (let i = 0; i < 20; i++) { c.strokeStyle = 'rgba(255,240,200,.2)'; c.lineWidth = 1; const x = r(0, N), y = r(0, N); c.beginPath(); c.moveTo(x, y); c.lineTo(x + r(-60, 60), y + r(-12, 12)); c.stroke(); }
  } else if (kind === 'ice') {
    c.fillStyle = '#a8c8de'; c.fillRect(0, 0, N, N); h.fillStyle = '#c8c8c8'; h.fillRect(0, 0, N, N);
    c.strokeStyle = '#5a8aa8'; c.lineWidth = 22; c.strokeRect(0, 0, N, N); h.strokeStyle = '#404040'; h.lineWidth = 28; h.strokeRect(0, 0, N, N);
    for (let i = 0; i < 50; i++) blob(c, r(0, N), r(0, N), r(24, 90), R() < 0.5 ? 'rgba(255,255,255,.3)' : 'rgba(90,150,210,.28)');
    for (let i = 0; i < 6; i++) { let x = r(30, N - 30), y = r(30, N - 30), a = r(0, 6.28); const pts: [number, number][] = [[x, y]]; for (let s = 0; s < 9; s++) { a += r(-0.7, 0.7); x += Math.cos(a) * r(20, 50); y += Math.sin(a) * r(20, 50); pts.push([x, y]); } for (const [g2, col, lw] of [[c, 'rgba(255,255,255,.8)', 1.8], [h, 'rgba(0,0,0,.9)', 3]] as const) { g2.strokeStyle = col; g2.lineWidth = lw; g2.beginPath(); pts.forEach(([px, py], j) => (j ? g2.lineTo(px, py) : g2.moveTo(px, py))); g2.stroke(); } }
    for (let i = 0; i < 300; i++) { c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(r(8, N - 8), r(8, N - 8), r(1, 3), r(1, 3)); }
  } else if (kind === 'moss') {   // musgo profundo, raízes, folhas caídas e flores minúsculas que brilham
    c.fillStyle = '#26361c'; c.fillRect(0, 0, N, N); h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
    c.strokeStyle = '#0c1408'; c.lineWidth = 22; c.strokeRect(0, 0, N, N); h.strokeStyle = '#303030'; h.lineWidth = 28; h.strokeRect(0, 0, N, N);
    for (let i = 0; i < 70; i++) blob(c, r(0, N), r(0, N), r(24, 80), R() < 0.5 ? 'rgba(90,140,60,.34)' : 'rgba(10,24,8,.34)');
    for (let i = 0; i < 5; i++) { // raízes grossas a atravessar a pedra
      let x = r(0, N), y = r(0, N), a = r(0, 6.28); const pts: [number, number][] = [[x, y]];
      for (let s = 0; s < 8; s++) { a += r(-0.7, 0.7); x += Math.cos(a) * r(30, 60); y += Math.sin(a) * r(30, 60); pts.push([x, y]); }
      const path = (g2: CanvasRenderingContext2D) => { g2.beginPath(); pts.forEach(([px, py], j) => (j ? g2.lineTo(px, py) : g2.moveTo(px, py))); g2.stroke(); };
      c.strokeStyle = '#3a2a18'; c.lineWidth = 9; path(c); c.strokeStyle = '#5a4428'; c.lineWidth = 3; path(c); h.strokeStyle = 'rgba(255,255,255,.7)'; h.lineWidth = 9; path(h);
    }
    for (let i = 0; i < 90; i++) { const x = r(10, N - 10), y = r(10, N - 10); c.fillStyle = R() < 0.5 ? 'rgba(70,120,40,.85)' : 'rgba(140,150,50,.8)'; c.beginPath(); c.ellipse(x, y, r(4, 9), r(2, 4), r(0, 3), 0, 6.28); c.fill(); }
    for (let i = 0; i < 26; i++) { const x = r(14, N - 14), y = r(14, N - 14); blob(c, x, y, 6, R() < 0.5 ? 'rgba(255,230,140,.95)' : 'rgba(190,255,150,.95)'); c.fillStyle = '#fff6c0'; c.fillRect(x - 1, y - 1, 2, 2); }
  } else if (kind === 'planks') {   // tábuas de convés batidas pelo mar, azul-ardósia, com pregos e sal
    h.fillStyle = '#707070'; h.fillRect(0, 0, N, N);
    const pl = 5, ph = N / pl, tones = ['#4a5058', '#40464e', '#555c64', '#383e46', '#4c525a'];
    for (let k = 0; k < pl; k++) {
      c.fillStyle = tones[(R() * tones.length) | 0]; c.fillRect(0, k * ph, N, ph);
      for (let g = 0; g < 50; g++) { const y = k * ph + r(3, ph - 3); c.strokeStyle = `rgba(${R() < 0.5 ? '14,18,24' : '150,170,190'},${r(0.1, 0.32)})`; c.lineWidth = r(0.6, 1.6); c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(N * 0.3, y + r(-4, 4), N * 0.6, y + r(-4, 4), N, y + r(-3, 3)); c.stroke(); h.strokeStyle = 'rgba(0,0,0,.25)'; h.lineWidth = 1; h.beginPath(); h.moveTo(0, y); h.lineTo(N, y + r(-2, 2)); h.stroke(); }
      c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(0, k * ph, N, 5); h.fillStyle = 'rgba(0,0,0,.85)'; h.fillRect(0, k * ph, N, 8);
      const bx = r(80, N - 80); c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(bx, k * ph, 3, ph); h.fillStyle = 'rgba(0,0,0,.8)'; h.fillRect(bx, k * ph, 5, ph);
      for (const nx of [12, N - 12, bx - 10, bx + 12]) blob(c, nx, k * ph + ph / 2, 4, 'rgba(180,170,150,.85)');
    }
    for (let i = 0; i < 36; i++) blob(c, r(0, N), r(0, N), r(18, 64), R() < 0.55 ? 'rgba(235,245,255,.26)' : 'rgba(0,0,0,.16)');
    for (let i = 0; i < 160; i++) { c.fillStyle = 'rgba(240,248,255,.45)'; c.fillRect(r(0, N), r(0, N), r(1, 3), r(1, 2)); }
  } else if (kind === 'sand') {   // lajes de arenito sob a areia batida pelo vento, com friso de ouro e turquesa
    c.fillStyle = '#b89a62'; c.fillRect(0, 0, N, N); h.fillStyle = '#909090'; h.fillRect(0, 0, N, N);
    c.strokeStyle = '#4a3418'; c.lineWidth = 20; c.strokeRect(0, 0, N, N); h.strokeStyle = '#2c2c2c'; h.lineWidth = 26; h.strokeRect(0, 0, N, N);
    for (let i = 0; i < 70; i++) blob(c, r(0, N), r(0, N), r(24, 90), R() < 0.5 ? 'rgba(236,208,150,.32)' : 'rgba(110,76,34,.3)');
    for (let i = 0; i < 46; i++) { const y = r(0, N), x = r(0, N), w = r(40, 160); c.strokeStyle = `rgba(${R() < 0.5 ? '250,230,180' : '90,60,26'},${r(0.1, 0.28)})`; c.lineWidth = r(1, 2.4); c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + w * 0.3, y - r(2, 7), x + w * 0.6, y + r(2, 7), x + w, y + r(-3, 3)); c.stroke(); h.strokeStyle = 'rgba(0,0,0,.2)'; h.lineWidth = 2; h.beginPath(); h.moveTo(x, y); h.lineTo(x + w, y); h.stroke(); }
    c.strokeStyle = '#e0b050'; c.lineWidth = 5; c.strokeRect(34, 34, N - 68, N - 68); c.strokeStyle = 'rgba(60,38,10,.7)'; c.lineWidth = 2; c.strokeRect(28, 28, N - 56, N - 56);
    e.strokeStyle = '#2fe6d0'; e.globalAlpha = 0.3; e.lineWidth = 10; e.strokeRect(34, 34, N - 68, N - 68); e.globalAlpha = 0.7; e.lineWidth = 2.2; e.strokeRect(34, 34, N - 68, N - 68); e.globalAlpha = 1; glow = true;
    for (const [x, y] of [[34, 34], [N - 34, 34], [34, N - 34], [N - 34, N - 34]] as const) { blob(c, x, y, 12, 'rgba(47,230,208,.95)'); blob(e, x, y, 16, 'rgba(47,230,208,.95)'); }
    for (let i = 0; i < 6; i++) { let x = r(30, N - 30), y = r(30, N - 30), a = r(0, 6.28); const pts: [number, number][] = [[x, y]]; for (let s = 0; s < 8; s++) { a += r(-0.7, 0.7); x += Math.cos(a) * r(20, 46); y += Math.sin(a) * r(20, 46); pts.push([x, y]); } for (const [g2, col, lw] of [[c, 'rgba(50,30,10,.7)', 2], [h, 'rgba(0,0,0,.85)', 3.5]] as const) { g2.strokeStyle = col; g2.lineWidth = lw; g2.beginPath(); pts.forEach(([px, py], j) => (j ? g2.lineTo(px, py) : g2.moveTo(px, py))); g2.stroke(); } }
    for (let i = 0; i < 420; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '255,236,190' : '100,70,30'},.5)`; c.fillRect(r(6, N - 6), r(6, N - 6), r(1, 2.6), r(1, 2.6)); }
  } else { // obsidiana com fendas de lava
    c.fillStyle = '#5a4e62'; c.fillRect(0, 0, N, N); h.fillStyle = '#d0d0d0'; h.fillRect(0, 0, N, N);
    c.strokeStyle = '#08060a'; c.lineWidth = 24; c.strokeRect(0, 0, N, N); h.strokeStyle = '#303030'; h.lineWidth = 30; h.strokeRect(0, 0, N, N);
    for (let i = 0; i < 50; i++) blob(c, r(0, N), r(0, N), r(20, 80), R() < 0.5 ? 'rgba(80,60,90,.3)' : 'rgba(0,0,0,.3)');
    glow = true;
    for (let i = 0; i < 6; i++) {
      let x = r(30, N - 30), y = r(30, N - 30), a = r(0, 6.28); const pts: [number, number][] = [[x, y]];
      for (let s = 0; s < 10; s++) { a += r(-0.8, 0.8); x += Math.cos(a) * r(20, 50); y += Math.sin(a) * r(20, 50); pts.push([x, y]); }
      const path = (g2: CanvasRenderingContext2D) => { g2.beginPath(); pts.forEach(([px, py], j) => (j ? g2.lineTo(px, py) : g2.moveTo(px, py))); g2.stroke(); };
      e.strokeStyle = '#ff5a14'; e.globalAlpha = 0.4; e.lineWidth = 10; path(e); e.globalAlpha = 1; e.lineWidth = 3; e.strokeStyle = '#ffb040'; path(e);
      c.strokeStyle = '#ff7a20'; c.lineWidth = 2; path(c); h.strokeStyle = 'rgba(0,0,0,.9)'; h.lineWidth = 4; path(h);
    }
  }
  const out: Tex = { map: tex(cc, true), normal: tex(heightToNormal(hc, 2.4), false) };
  if (glow) out.emissive = tex(ec, true);
  return out;
}

export function wallPBR(kind: string): Tex {
  const hit = cache.get('w' + kind); if (hit) return hit;
  let t: Tex;
  switch (kind) {
    case 'obsidian': t = blocks({ tones: ['#4a3640', '#402e38', '#563f4a', '#352630', '#4c3842'], mortar: '#160c12', rows: 6, seed: 61, cracks: 8, crackCol: '#050407', glow: '#ff6a1a', stain: null }); break;
    case 'ice': t = blocks({ tones: ['#a9cde2', '#9cc4dc', '#b8d8ea', '#8fb8d2', '#a2c8de'], mortar: '#5a86a4', rows: 6, seed: 62, cracks: 7, crackCol: 'rgba(255,255,255,.85)', frost: true, stain: { col: 'rgba(235,248,255,.55)', n: 70 } }); break;
    case 'brass': t = blocks({ tones: ['#a07a34', '#8e6a2a', '#b08a3c', '#7e5e24', '#98762e'], mortar: '#2a1c08', rows: 5, seed: 63, cracks: 5, crackCol: 'rgba(30,18,6,.9)', rivets: true, stain: { col: 'rgba(70,140,110,.5)', n: 60 } }); break;
    case 'shelves': t = shelves(); break;
    case 'bark': t = blocks({ tones: ['#5e4a32', '#523f2a', '#6c543a', '#483a22', '#604c34'], mortar: '#100c06', rows: 7, seed: 64, cracks: 8, crackCol: '#0a0805', glow: '#8be060', stain: { col: 'rgba(80,140,50,.6)', n: 110 } }); break;
    case 'runes': t = blocks({ tones: ['#363c46', '#2e343e', '#404752', '#2a3039', '#38404a'], mortar: '#0c0f14', rows: 5, seed: 65, cracks: 6, crackCol: '#06080b', runes: '#ff8a30', stain: { col: 'rgba(225,238,250,.4)', n: 60 }, frost: true }); break;
    case 'hiero': t = blocks({ tones: ['#c4a56c', '#b39560', '#cdb078', '#a98b56', '#bd9e66'], mortar: '#3a2a14', rows: 5, seed: 66, cracks: 5, crackCol: '#3a2a14', glyphs: '#2fe6d0', stain: { col: 'rgba(110,72,28,.38)', n: 70 } }); break;
    case 'stone': { const p = stonePBR(); t = { map: p.map, normal: p.normal }; break; }
    default: { const x = wall3(kind); if (x) { t = x; break; } const p = stonePBR(); t = { map: p.map, normal: p.normal }; }
  }
  cache.set('w' + kind, t); return t;
}

export function floorPBR(kind: string): Tex {
  const hit = cache.get('f' + kind); if (hit) return hit;
  let t: Tex;
  if (kind === 'wood' || kind === 'metal' || kind === 'ice' || kind === 'obsidian' || kind === 'moss' || kind === 'planks' || kind === 'sand') t = floors(kind);
  else { const x = floor3(kind); if (x) t = x; else { const p = flagPBR(); t = { map: p.map, normal: p.normal }; } }
  cache.set('f' + kind, t); return t;
}
