import * as THREE from 'three';
import { heightToNormal, stonePBR, flagPBR } from './pbr';

// Texturas dos mundos novos: obsidiana com fendas de lava, gelo, latão com pátina, estantes de livros; e os chãos respetivos.

export interface Tex { map: THREE.CanvasTexture; normal: THREE.CanvasTexture; emissive?: THREE.CanvasTexture }
const cache = new Map<string, Tex>();
const rndf = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function mkc(n: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = c.height = n;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}
function tex(c: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
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
  if (o.stain) for (let i = 0; i < o.stain.n; i++) { const x = r(0, N), y = Math.floor(r(0, rows)) * rh + r(-4, 10), rad = r(10, 32); blob(c, x, y, rad, o.stain.col); blob(h, x, y, rad, 'rgba(255,255,255,.22)'); }
  const out: Tex = { map: tex(cc, true), normal: tex(heightToNormal(hc, 3), false) };
  if (o.glow) out.emissive = tex(ec, true);
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
  } else { // obsidiana com fendas de lava
    c.fillStyle = '#1c1820'; c.fillRect(0, 0, N, N); h.fillStyle = '#d0d0d0'; h.fillRect(0, 0, N, N);
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
    case 'obsidian': t = blocks({ tones: ['#2a2530', '#221e28', '#332c3a', '#1c1822', '#28222e'], mortar: '#0a080c', rows: 6, seed: 61, cracks: 8, crackCol: '#050407', glow: '#ff6a1a', stain: null }); break;
    case 'ice': t = blocks({ tones: ['#a9cde2', '#9cc4dc', '#b8d8ea', '#8fb8d2', '#a2c8de'], mortar: '#5a86a4', rows: 6, seed: 62, cracks: 7, crackCol: 'rgba(255,255,255,.85)', frost: true, stain: { col: 'rgba(235,248,255,.55)', n: 70 } }); break;
    case 'brass': t = blocks({ tones: ['#a07a34', '#8e6a2a', '#b08a3c', '#7e5e24', '#98762e'], mortar: '#2a1c08', rows: 5, seed: 63, cracks: 5, crackCol: 'rgba(30,18,6,.9)', rivets: true, stain: { col: 'rgba(70,140,110,.5)', n: 60 } }); break;
    case 'shelves': t = shelves(); break;
    case 'stone': { const p = stonePBR(); t = { map: p.map, normal: p.normal }; break; }
    default: { const p = stonePBR(); t = { map: p.map, normal: p.normal }; }
  }
  cache.set('w' + kind, t); return t;
}

export function floorPBR(kind: string): Tex {
  const hit = cache.get('f' + kind); if (hit) return hit;
  let t: Tex;
  if (kind === 'wood' || kind === 'metal' || kind === 'ice' || kind === 'obsidian') t = floors(kind);
  else { const p = flagPBR(); t = { map: p.map, normal: p.normal }; }
  cache.set('f' + kind, t); return t;
}
