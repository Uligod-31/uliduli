import * as THREE from 'three';
import { heightToNormal } from './pbr';
import type { Tex } from './pbr2';

// Texturas procedurais dos mundos 10-17 (Mandala, Tinta, Neon, Intergaláctico, Estelar, Angélico, Animal, Rockstar).
// Cada gerador desenha cor + relevo (+ emissivo para o que brilha) num canvas de 512 e devolve o conjunto.

const rndf = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const N = 512, TAU = Math.PI * 2;
function mk(): [HTMLCanvasElement, CanvasRenderingContext2D] { const c = document.createElement('canvas'); c.width = c.height = N; return [c, c.getContext('2d', { willReadFrequently: true })!]; }
function tex(c: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function blob(g: CanvasRenderingContext2D, x: number, y: number, r: number, rgba: string) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function out(cc: HTMLCanvasElement, hc: HTMLCanvasElement, ec: HTMLCanvasElement | null, k = 2.6): Tex {
  const t: Tex = { map: tex(cc, true), normal: tex(heightToNormal(hc, k), false) };
  if (ec) t.emissive = tex(ec, true);
  return t;
}
const stroke = (g: CanvasRenderingContext2D, col: string, w: number, f: () => void) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); f(); g.stroke(); };
const glowStroke = (e: CanvasRenderingContext2D, col: string, w: number, f: () => void) => { e.globalAlpha = 0.3; stroke(e, col, w * 4, f); e.globalAlpha = 1; stroke(e, col, w, f); };

export function wall3(kind: string): Tex | null {
  const [cc, c] = mk(), [hc, h] = mk(), [ec, e] = mk(), R = rndf(kind.length * 331 + 7), r = (a: number, b: number) => a + (b - a) * R();
  e.fillStyle = '#000'; e.fillRect(0, 0, N, N); h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
  const grain = (n: number, a: string) => { for (let i = 0; i < n; i++) { c.fillStyle = a; c.fillRect(r(0, N), r(0, N), r(1, 3), r(1, 3)); } };
  if (kind === 'mandala') {            // bronze com mandalas de ouro gravadas e a brilhar
    c.fillStyle = '#6a3a10'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 60; i++) blob(c, r(0, N), r(0, N), r(20, 70), R() < 0.5 ? 'rgba(200,130,40,.28)' : 'rgba(30,14,2,.3)');
    for (const [cx, cy] of [[128, 128], [384, 128], [128, 384], [384, 384]] as const) {
      for (const [g, col, wm] of [[c, '#f0b848', 1], [e, '#ffc860', 1]] as const) {
        for (let k = 1; k <= 4; k++) { g.strokeStyle = col; g.lineWidth = 2.2 * wm; g.globalAlpha = g === e ? 0.9 : 1; g.beginPath(); g.arc(cx, cy, k * 24, 0, TAU); g.stroke(); }
        for (let p = 0; p < 12; p++) { const a = (p / 12) * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); g.quadraticCurveTo(cx + Math.cos(a + 0.18) * 66, cy + Math.sin(a + 0.18) * 66, cx + Math.cos(a) * 96, cy + Math.sin(a) * 96); g.stroke(); }
        g.globalAlpha = 1;
      }
      blob(c, cx, cy, 14, 'rgba(255,220,120,.9)'); blob(e, cx, cy, 20, 'rgba(255,200,90,.9)');
      for (const g of [h]) { g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 4; for (let k = 1; k <= 4; k++) { g.beginPath(); g.arc(cx, cy, k * 24, 0, TAU); g.stroke(); } }
    }
    c.strokeStyle = '#2a1404'; c.lineWidth = 14; c.strokeRect(0, 0, N, N); c.strokeRect(0, N / 2 - 3, N, 6); h.strokeStyle = '#303030'; h.lineWidth = 16; h.strokeRect(0, 0, N, N);
    grain(300, 'rgba(255,220,150,.3)');
    return out(cc, hc, ec);
  }
  if (kind === 'ink') {                // lajes azul-noite molhadas com ondas de tinta a brilhar
    c.fillStyle = '#0a1830'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 70; i++) blob(c, r(0, N), r(0, N), r(26, 90), R() < 0.5 ? 'rgba(30,90,170,.3)' : 'rgba(2,6,16,.45)');
    for (let i = 0; i < 9; i++) { const cx = r(0, N), cy = r(0, N); for (let k = 1; k <= 5; k++) for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { const rad = k * r(14, 20); glowStroke(e, '#44e0ff', 1.4, () => { e.arc(cx + ox, cy + oy, rad, 0, TAU); }); stroke(c, 'rgba(120,220,255,.55)', 1.4, () => { c.arc(cx + ox, cy + oy, rad, 0, TAU); }); stroke(h, 'rgba(255,255,255,.45)', 3, () => { h.arc(cx + ox, cy + oy, rad, 0, TAU); }); } }
    c.strokeStyle = '#030a14'; c.lineWidth = 12; c.strokeRect(0, 0, N, N); h.strokeStyle = '#202020'; h.lineWidth = 14; h.strokeRect(0, 0, N, N);
    return out(cc, hc, ec, 2);
  }
  if (kind === 'circuit') {            // placas negras com trilhos de circuito rosa e ciano
    c.fillStyle = '#0c0a16'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 40; i++) blob(c, r(0, N), r(0, N), r(20, 60), 'rgba(40,30,80,.3)');
    for (let i = 0; i < 26; i++) {
      let x = Math.floor(r(0, 16)) * 32 + 16, y = Math.floor(r(0, 16)) * 32 + 16; const col = R() < 0.5 ? '#ff2bd6' : '#27d3ff', pts: [number, number][] = [[x, y]];
      for (let s = 0; s < 4; s++) { if (R() < 0.5) x += (R() < 0.5 ? -1 : 1) * 32 * (1 + ((R() * 3) | 0)); else y += (R() < 0.5 ? -1 : 1) * 32 * (1 + ((R() * 3) | 0)); pts.push([x, y]); }
      const path = (g: CanvasRenderingContext2D) => { pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); };
      glowStroke(e, col, 2, () => path(e)); stroke(c, col, 2.4, () => path(c)); stroke(h, 'rgba(255,255,255,.7)', 4, () => path(h));
      const [lx, ly] = pts[pts.length - 1]; for (const g of [c, e]) { g.fillStyle = col; g.beginPath(); g.arc(lx, ly, 6, 0, TAU); g.fill(); }
    }
    c.strokeStyle = '#05040a'; c.lineWidth = 14; c.strokeRect(0, 0, N, N); h.strokeStyle = '#202020'; h.lineWidth = 16; h.strokeRect(0, 0, N, N);
    return out(cc, hc, ec);
  }
  if (kind === 'hull') {               // chapa de nave com rebites, faixa de aviso e janelas acesas
    c.fillStyle = '#4a5a6c'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 40; i++) blob(c, r(0, N), r(0, N), r(20, 70), R() < 0.5 ? 'rgba(160,190,220,.2)' : 'rgba(10,20,30,.28)');
    for (let py = 0; py < 2; py++) for (let px = 0; px < 2; px++) { const x = px * 256 + 10, y = py * 256 + 10; c.fillStyle = 'rgba(120,150,180,.22)'; c.fillRect(x, y, 236, 236); c.strokeStyle = '#1a2430'; c.lineWidth = 6; c.strokeRect(x, y, 236, 236); h.strokeStyle = '#101010'; h.lineWidth = 8; h.strokeRect(x, y, 236, 236); for (const [rx, ry] of [[x + 16, y + 16], [x + 220, y + 16], [x + 16, y + 220], [x + 220, y + 220]] as const) { blob(c, rx, ry, 7, 'rgba(220,230,240,.9)'); blob(h, rx, ry, 8, 'rgba(255,255,255,.9)'); } }
    for (let i = 0; i < 5; i++) { const x = r(30, 400), y = r(30, 440); c.fillStyle = '#0a1018'; c.fillRect(x, y, 60, 26); e.fillStyle = R() < 0.6 ? '#39f2d0' : '#ffb347'; e.fillRect(x + 4, y + 4, 52, 18); c.fillStyle = e.fillStyle as string; c.fillRect(x + 4, y + 4, 52, 18); h.fillStyle = '#000'; h.fillRect(x, y, 60, 26); }
    for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#e8c020' : '#161616'; c.beginPath(); c.moveTo(i * 24, 236); c.lineTo(i * 24 + 24, 236); c.lineTo(i * 24 + 6, 252); c.lineTo(i * 24 - 18, 252); c.fill(); }
    grain(300, 'rgba(255,255,255,.25)');
    return out(cc, hc, ec, 3);
  }
  if (kind === 'astral') {             // azul profundo com cartas de estrelas e constelações douradas
    c.fillStyle = '#0c1236'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 50; i++) blob(c, r(0, N), r(0, N), r(30, 100), R() < 0.5 ? 'rgba(60,80,180,.3)' : 'rgba(2,4,20,.4)');
    for (const [cx, cy, rad] of [[128, 128, 90], [384, 384, 90], [384, 128, 50], [128, 384, 50]] as const) { glowStroke(e, '#e6c060', 1.2, () => { e.arc(cx, cy, rad, 0, TAU); }); stroke(c, 'rgba(230,192,96,.7)', 1.6, () => { c.arc(cx, cy, rad, 0, TAU); }); for (let t = 0; t < 36; t++) { const a = (t / 36) * TAU; stroke(c, 'rgba(230,192,96,.7)', 1.4, () => { c.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); c.lineTo(cx + Math.cos(a) * (rad - (t % 3 ? 5 : 10)), cy + Math.sin(a) * (rad - (t % 3 ? 5 : 10))); }); } }
    for (let k = 0; k < 4; k++) { const pts: [number, number][] = []; let x = r(40, 470), y = r(40, 470); for (let s = 0; s < 6; s++) { pts.push([x, y]); x += r(-90, 90); y += r(-90, 90); } const path = (g: CanvasRenderingContext2D) => pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); glowStroke(e, '#ffe08a', 1.4, () => path(e)); stroke(c, 'rgba(255,224,138,.8)', 1.6, () => path(c)); for (const [px, py] of pts) for (const g of [c, e]) { g.fillStyle = '#fff2b0'; g.beginPath(); g.arc(px, py, 5, 0, TAU); g.fill(); blob(g, px, py, 14, 'rgba(255,230,140,.5)'); } }
    for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(r(0, N), r(0, N), 2, 2); }
    c.strokeStyle = '#04061a'; c.lineWidth = 14; c.strokeRect(0, 0, N, N); h.strokeStyle = '#202020'; h.lineWidth = 14; h.strokeRect(0, 0, N, N);
    return out(cc, hc, ec, 2);
  }
  if (kind === 'cloud') {              // mármore branco-pérola com veios de ouro e nuvens
    c.fillStyle = '#f2eee6'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 80; i++) blob(c, r(0, N), r(0, N), r(26, 100), R() < 0.5 ? 'rgba(180,200,235,.3)' : 'rgba(255,255,255,.6)');
    for (let i = 0; i < 9; i++) { let x = r(0, N), y = r(0, N), a = r(0, TAU); const pts: [number, number][] = [[x, y]]; for (let s = 0; s < 9; s++) { a += r(-0.7, 0.7); x += Math.cos(a) * r(20, 50); y += Math.sin(a) * r(20, 50); pts.push([x, y]); } const path = (g: CanvasRenderingContext2D) => pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); glowStroke(e, '#ffd060', 1.2, () => path(e)); stroke(c, '#d8a830', 1.8, () => path(c)); stroke(h, 'rgba(0,0,0,.5)', 2, () => path(h)); }
    for (let k = 0; k < 2; k++) { c.fillStyle = 'rgba(232,196,96,.85)'; c.fillRect(0, k * 256 + 120, N, 6); e.fillStyle = 'rgba(255,200,80,.5)'; e.fillRect(0, k * 256 + 120, N, 6); }
    c.strokeStyle = '#c8b890'; c.lineWidth = 12; c.strokeRect(0, 0, N, N); h.strokeStyle = '#303030'; h.lineWidth = 14; h.strokeRect(0, 0, N, N);
    return out(cc, hc, ec, 2);
  }
  if (kind === 'jungle') {             // caniços de bambu verdes com nós e trepadeiras
    c.fillStyle = '#2a3a14'; c.fillRect(0, 0, N, N); h.fillStyle = '#707070'; h.fillRect(0, 0, N, N);
    for (let k = 0; k < 8; k++) {
      const x = k * 64, g = c.createLinearGradient(x, 0, x + 64, 0); g.addColorStop(0, '#4a6a1a'); g.addColorStop(0.45, '#9ab83a'); g.addColorStop(1, '#2a4010'); c.fillStyle = g; c.fillRect(x + 3, 0, 58, N);
      h.fillStyle = '#c0c0c0'; h.fillRect(x + 6, 0, 52, N); h.fillStyle = 'rgba(0,0,0,.6)'; h.fillRect(x, 0, 4, N);
      for (let y = r(20, 90); y < N; y += r(90, 150)) { c.fillStyle = '#243a0c'; c.fillRect(x + 3, y, 58, 9); h.fillStyle = '#fff'; h.fillRect(x + 3, y, 58, 9); }
    }
    for (let i = 0; i < 5; i++) { let x = r(0, N), y = 0; const pts: [number, number][] = []; for (let s = 0; s < 9; s++) { pts.push([x, y]); x += r(-30, 30); y += 60; } stroke(c, '#1a3a10', 5, () => pts.forEach(([px, py], j) => (j ? c.lineTo(px, py) : c.moveTo(px, py)))); for (const [px, py] of pts) { c.fillStyle = R() < 0.5 ? '#4aa02a' : '#2a7a1a'; c.beginPath(); c.ellipse(px + r(-8, 8), py, 12, 5, r(0, 3), 0, TAU); c.fill(); } }
    for (let i = 0; i < 40; i++) blob(c, r(0, N), r(0, N), r(16, 44), 'rgba(0,0,0,.2)');
    return out(cc, hc, null, 3);
  }
  if (kind === 'amp') {                // pilha de colunas de som: tolex preto, grelhas com cones e LEDs
    c.fillStyle = '#16161a'; c.fillRect(0, 0, N, N); h.fillStyle = '#707070'; h.fillRect(0, 0, N, N);
    for (let i = 0; i < 2000; i++) { c.fillStyle = `rgba(255,255,255,${r(0.02, 0.07)})`; c.fillRect(r(0, N), r(0, N), 2, 2); }
    for (const [cx, cy] of [[128, 128], [384, 128], [128, 384], [384, 384]] as const) {
      c.fillStyle = '#26262e'; c.beginPath(); c.arc(cx, cy, 100, 0, TAU); c.fill(); c.strokeStyle = '#8a8a96'; c.lineWidth = 7; c.beginPath(); c.arc(cx, cy, 100, 0, TAU); c.stroke();
      h.fillStyle = '#404040'; h.beginPath(); h.arc(cx, cy, 100, 0, TAU); h.fill();
      for (let k = 1; k <= 7; k++) { c.strokeStyle = k % 2 ? '#101014' : '#3a3a46'; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, k * 13, 0, TAU); c.stroke(); h.strokeStyle = k % 2 ? '#fff' : '#303030'; h.lineWidth = 6; h.beginPath(); h.arc(cx, cy, k * 13, 0, TAU); h.stroke(); }
      blob(c, cx, cy, 16, 'rgba(200,200,210,.9)'); c.fillStyle = '#0a0a0e'; c.beginPath(); c.arc(cx, cy, 9, 0, TAU); c.fill();
    }
    for (let k = 0; k < 4; k++) { const x = 30 + k * 130, y = 250; c.fillStyle = '#c0c0ca'; c.fillRect(x, y, 70, 10); } // pegas
    e.fillStyle = '#ff2b2b'; for (const [x, y] of [[20, 20], [492, 20], [20, 492], [492, 492]] as const) { e.beginPath(); e.arc(x, y, 5, 0, TAU); e.fill(); blob(e, x, y, 12, 'rgba(255,40,40,.7)'); c.fillStyle = '#ff4040'; c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); }
    c.strokeStyle = '#05050a'; c.lineWidth = 10; c.strokeRect(0, 0, N, N);
    return out(cc, hc, ec, 3);
  }
  return null;
}

export function floor3(kind: string): Tex | null {
  const [cc, c] = mk(), [hc, h] = mk(), [ec, e] = mk(), R = rndf(kind.length * 977 + 5), r = (a: number, b: number) => a + (b - a) * R();
  e.fillStyle = '#000'; e.fillRect(0, 0, N, N); h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
  const frame = (col: string, hw = 22) => { c.strokeStyle = col; c.lineWidth = hw; c.strokeRect(0, 0, N, N); h.strokeStyle = '#303030'; h.lineWidth = hw + 6; h.strokeRect(0, 0, N, N); };
  if (kind === 'mosaic') {             // mosaico de anéis em açafrão, ouro e vermelho
    c.fillStyle = '#c47a1c'; c.fillRect(0, 0, N, N);
    const cols = ['#ffd45a', '#e8862a', '#a02a14', '#ffe9a0', '#7a3a10'];
    for (let k = 9; k >= 1; k--) { c.fillStyle = cols[k % cols.length]; c.beginPath(); c.arc(256, 256, k * 26, 0, TAU); c.fill(); h.fillStyle = k % 2 ? '#c0c0c0' : '#909090'; h.beginPath(); h.arc(256, 256, k * 26, 0, TAU); h.fill(); }
    for (let p = 0; p < 16; p++) { const a = (p / 16) * TAU; c.fillStyle = '#fff0b0'; c.beginPath(); c.ellipse(256 + Math.cos(a) * 100, 256 + Math.sin(a) * 100, 20, 8, a, 0, TAU); c.fill(); e.fillStyle = 'rgba(255,200,80,.5)'; e.beginPath(); e.ellipse(256 + Math.cos(a) * 100, 256 + Math.sin(a) * 100, 20, 8, a, 0, TAU); e.fill(); }
    blob(e, 256, 256, 40, 'rgba(255,220,120,.8)'); frame('#5a2a08');
    for (let i = 0; i < 200; i++) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(r(0, N), r(0, N), 2, 2); }
    return out(cc, hc, ec);
  }
  if (kind === 'wet') {                // chão de basalto molhado com redemoinhos de tinta
    c.fillStyle = '#0c1c34'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 60; i++) blob(c, r(0, N), r(0, N), r(26, 90), R() < 0.5 ? 'rgba(40,110,190,.3)' : 'rgba(0,4,14,.45)');
    for (let i = 0; i < 6; i++) { let x = r(40, 470), y = r(40, 470), a = r(0, TAU); const pts: [number, number][] = [[x, y]]; for (let s = 0; s < 12; s++) { a += 0.5; x += Math.cos(a) * (10 + s * 3); y += Math.sin(a) * (10 + s * 3); pts.push([x, y]); } const path = (g: CanvasRenderingContext2D) => pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); glowStroke(e, '#44e0ff', 1, () => path(e)); stroke(c, 'rgba(110,220,255,.5)', 1.6, () => path(c)); stroke(h, 'rgba(255,255,255,.5)', 3, () => path(h)); }
    frame('#040a16'); return out(cc, hc, ec, 2);
  }
  if (kind === 'grid') {               // grelha neon sobre preto
    c.fillStyle = '#0a0814'; c.fillRect(0, 0, N, N);
    for (let i = 0; i <= 8; i++) { const p = i * 64; for (const [g, col, w] of [[c, i % 2 ? '#27d3ff' : '#ff2bd6', 2.2], [e, i % 2 ? '#27d3ff' : '#ff2bd6', 2.4]] as const) { g.strokeStyle = col; g.lineWidth = w; g.globalAlpha = g === e ? 0.7 : 0.9; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, N); g.moveTo(0, p); g.lineTo(N, p); g.stroke(); g.globalAlpha = 1; } }
    for (let i = 0; i < 10; i++) { const x = Math.floor(r(0, 8)) * 64 + 6, y = Math.floor(r(0, 8)) * 64 + 6; c.fillStyle = 'rgba(255,43,214,.14)'; c.fillRect(x, y, 52, 52); e.fillStyle = 'rgba(39,211,255,.14)'; e.fillRect(x, y, 52, 52); }
    for (let i = 0; i < 40; i++) blob(c, r(0, N), r(0, N), r(20, 60), 'rgba(40,20,80,.3)');
    h.strokeStyle = '#000'; h.lineWidth = 6; for (let i = 0; i <= 8; i++) { h.beginPath(); h.moveTo(i * 64, 0); h.lineTo(i * 64, N); h.moveTo(0, i * 64); h.lineTo(N, i * 64); h.stroke(); }
    return out(cc, hc, ec, 3);
  }
  if (kind === 'deck') {               // grelha de convés metálico com borda de aviso e luzes de guia
    c.fillStyle = '#2c3640'; c.fillRect(0, 0, N, N); h.fillStyle = '#909090'; h.fillRect(0, 0, N, N);
    for (let y = 40; y < N - 40; y += 24) for (let x = 40; x < N - 40; x += 24) { c.fillStyle = '#0c1218'; c.fillRect(x, y, 16, 16); h.fillStyle = '#000'; h.fillRect(x, y, 16, 16); }
    for (let i = 0; i < 22; i++) { c.fillStyle = i % 2 ? '#e8c020' : '#161616'; c.fillRect(i * 24, 0, 24, 18); c.fillRect(i * 24, N - 18, 24, 18); }
    for (const [x, y] of [[256, 22], [256, N - 22], [22, 256], [N - 22, 256]] as const) { blob(c, x, y, 10, 'rgba(57,242,208,.9)'); blob(e, x, y, 16, 'rgba(57,242,208,.9)'); }
    for (let i = 0; i < 40; i++) blob(c, r(0, N), r(0, N), r(16, 50), R() < 0.5 ? 'rgba(160,190,220,.12)' : 'rgba(0,0,0,.2)');
    frame('#10161c', 18); return out(cc, hc, ec, 3);
  }
  if (kind === 'chart') {              // carta estelar: círculos concêntricos, graduações e estrelas
    c.fillStyle = '#0e1640'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 40; i++) blob(c, r(0, N), r(0, N), r(30, 100), R() < 0.5 ? 'rgba(70,90,200,.28)' : 'rgba(2,4,24,.4)');
    for (const rad of [70, 130, 190, 240]) { glowStroke(e, '#e6c060', 1, () => { e.arc(256, 256, rad, 0, TAU); }); stroke(c, 'rgba(230,192,96,.75)', 2, () => { c.arc(256, 256, rad, 0, TAU); }); stroke(h, 'rgba(0,0,0,.6)', 4, () => { h.arc(256, 256, rad, 0, TAU); }); }
    for (let t = 0; t < 72; t++) { const a = (t / 72) * TAU, L = t % 6 ? 8 : 16; stroke(c, 'rgba(230,192,96,.8)', 1.6, () => { c.moveTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240); c.lineTo(256 + Math.cos(a) * (240 - L), 256 + Math.sin(a) * (240 - L)); }); }
    for (let i = 0; i < 26; i++) { const x = r(20, 490), y = r(20, 490); for (const g of [c, e]) { g.fillStyle = '#fff2b0'; g.beginPath(); g.arc(x, y, r(2, 4.5), 0, TAU); g.fill(); } blob(e, x, y, 12, 'rgba(255,230,140,.5)'); }
    frame('#050820'); return out(cc, hc, ec, 2);
  }
  if (kind === 'pearl') {              // ladrilhos de madrepérola com filete de ouro e nuvens
    c.fillStyle = '#e8e4f0'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < 80; i++) blob(c, r(0, N), r(0, N), r(26, 100), R() < 0.5 ? 'rgba(255,255,255,.7)' : 'rgba(170,190,240,.3)');
    for (let i = 0; i < 40; i++) blob(c, r(0, N), r(0, N), r(20, 70), 'rgba(255,200,230,.18)');
    c.strokeStyle = '#e0b040'; c.lineWidth = 6; c.strokeRect(30, 30, N - 60, N - 60); e.strokeStyle = 'rgba(255,200,80,.5)'; e.lineWidth = 8; e.strokeRect(30, 30, N - 60, N - 60);
    for (const [x, y] of [[30, 30], [N - 30, 30], [30, N - 30], [N - 30, N - 30]] as const) for (const g of [c, e]) { g.fillStyle = '#ffd060'; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill(); }
    frame('#b8a8d0'); return out(cc, hc, ec, 2);
  }
  if (kind === 'savanna') {            // terra queimada com tufos de erva seca e pegadas
    c.fillStyle = '#9a7a38'; c.fillRect(0, 0, N, N); h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
    for (let i = 0; i < 90; i++) blob(c, r(0, N), r(0, N), r(20, 80), R() < 0.5 ? 'rgba(220,180,90,.35)' : 'rgba(70,46,14,.35)');
    for (let i = 0; i < 160; i++) { const x = r(0, N), y = r(0, N); c.strokeStyle = R() < 0.5 ? '#c8a848' : '#6a7a24'; c.lineWidth = 1.6; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + r(-8, 8), y - r(8, 20)); c.stroke(); } }
    for (let i = 0; i < 4; i++) { const x = r(60, 450), y = r(60, 450); c.fillStyle = 'rgba(60,38,12,.5)'; c.beginPath(); c.ellipse(x, y, 14, 12, 0, 0, TAU); c.fill(); for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x - 21 + k * 14, y - 20 - (k % 3 === 1 ? 6 : 0), 5, 6, 0, 0, TAU); c.fill(); } h.fillStyle = '#404040'; h.beginPath(); h.ellipse(x, y, 14, 12, 0, 0, TAU); h.fill(); }
    for (let i = 0; i < 6; i++) { let x = r(0, N), y = r(0, N); c.strokeStyle = 'rgba(40,24,6,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); for (let s = 0; s < 6; s++) { x += r(-30, 30); y += r(10, 40); c.lineTo(x, y); } c.stroke(); }
    frame('#4a3414'); return out(cc, hc, null, 3);
  }
  if (kind === 'stage') {              // palco de madeira com fita de marcação e poças de luz
    c.fillStyle = '#1a1620'; c.fillRect(0, 0, N, N); h.fillStyle = '#707070'; h.fillRect(0, 0, N, N);
    for (let k = 0; k < 5; k++) { const y = k * 102; c.fillStyle = ['#2a2230', '#241c2a', '#30263a', '#1e1824', '#2c2434'][k]; c.fillRect(0, y, N, 102); c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(0, y, N, 5); h.fillStyle = 'rgba(0,0,0,.85)'; h.fillRect(0, y, N, 8); for (let g = 0; g < 30; g++) { c.strokeStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},${r(0.04, 0.12)})`; c.lineWidth = 1; const yy = y + r(4, 98); c.beginPath(); c.moveTo(0, yy); c.lineTo(N, yy + r(-3, 3)); c.stroke(); } }
    blob(c, 256, 256, 200, 'rgba(255,43,138,.28)'); blob(e, 256, 256, 160, 'rgba(255,43,138,.18)'); blob(c, 130, 380, 120, 'rgba(255,225,74,.22)');
    for (const [x, y] of [[90, 90], [420, 420]] as const) { c.strokeStyle = '#ffe14a'; c.lineWidth = 9; c.beginPath(); c.moveTo(x - 26, y - 26); c.lineTo(x + 26, y + 26); c.moveTo(x + 26, y - 26); c.lineTo(x - 26, y + 26); c.stroke(); e.strokeStyle = 'rgba(255,225,74,.4)'; e.lineWidth = 12; e.beginPath(); e.moveTo(x - 26, y - 26); e.lineTo(x + 26, y + 26); e.moveTo(x + 26, y - 26); e.lineTo(x - 26, y + 26); e.stroke(); }
    for (let i = 0; i < 24; i++) { c.fillStyle = 'rgba(200,200,210,.55)'; c.fillRect(r(0, N), r(0, N), r(1, 4), r(1, 3)); }
    frame('#08060c', 20); return out(cc, hc, ec, 2.6);
  }
  return null;
}
