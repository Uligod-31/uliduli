import Phaser from 'phaser';
import { Maze, DIRS } from '../core/maze';
import { mulberry32 } from '../core/rng';
import { Pal, brandAt, lighten, darken } from '../core/theme';

type G = Phaser.GameObjects.Graphics;

export interface Layout { ox: number; oy: number; cell: number }

export function fitLayout(m: Maze, x: number, y: number, w: number, h: number): Layout {
  const cell = Math.floor(Math.min(w / m.cols, h / m.rows));
  return { ox: x + (w - cell * m.cols) / 2, oy: y + (h - cell * m.rows) / 2, cell };
}
export const cellX = (L: Layout, m: Maze, i: number) => L.ox + ((i % m.cols) + 0.5) * L.cell;
export const cellY = (L: Layout, m: Maze, i: number) => L.oy + (((i / m.cols) | 0) + 0.5) * L.cell;

export interface Seg { x1: number; y1: number; x2: number; y2: number }

/** Segmentos de parede fixos, em unidades de grelha. */
export function collectWalls(m: Maze): Seg[] {
  const segs: Seg[] = [];
  const { cols, rows } = m;
  const free = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && !m.solid[r * cols + c];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (m.solid[i]) continue;
      // Norte e Oeste: desenha se não houver passagem nem sebe dinâmica
      // (nos arcos do planeta a parede fica aberta)
      const arch = (d: number) => !!m.warp?.has(i * 4 + d);
      if (!arch(0) && (!free(c, r - 1) || (!(m.pass[i] & DIRS[0].b) && !m.dynMap.has(i * 4)))) segs.push({ x1: c, y1: r, x2: c + 1, y2: r });
      if (!arch(3) && (!free(c - 1, r) || (!(m.pass[i] & DIRS[3].b) && !m.dynMap.has(i * 4 + 3)))) segs.push({ x1: c, y1: r, x2: c, y2: r + 1 });
      // Sul e Este: só quando o vizinho é vazio/fora (o vizinho livre trata do seu N/W)
      if (!free(c, r + 1) && !arch(2)) segs.push({ x1: c, y1: r + 1, x2: c + 1, y2: r + 1 });
      if (!free(c + 1, r) && !arch(1)) segs.push({ x1: c + 1, y1: r, x2: c + 1, y2: r + 1 });
    }
  }
  return segs;
}

function seg(g: G, L: Layout, s: Seg, t: number, pad: number) {
  const x1 = L.ox + s.x1 * L.cell, y1 = L.oy + s.y1 * L.cell;
  const x2 = L.ox + s.x2 * L.cell, y2 = L.oy + s.y2 * L.cell;
  const h = t + pad;
  if (y1 === y2) g.fillRoundedRect(Math.min(x1, x2) - h / 2, y1 - h / 2, Math.abs(x2 - x1) + h, h, h / 2);
  else g.fillRoundedRect(x1 - h / 2, Math.min(y1, y2) - h / 2, h, Math.abs(y2 - y1) + h, h / 2);
}

export function drawFloor(g: G, m: Maze, L: Layout, pal: Pal, seed: number) {
  const rng = mulberry32(seed * 7 + 3);
  for (let i = 0; i < m.cols * m.rows; i++) {
    if (m.solid[i]) continue;
    const c = i % m.cols, r = (i / m.cols) | 0;
    g.fillStyle((c + r) % 2 ? pal.floorA : pal.floorB, 1);
    g.fillRect(L.ox + c * L.cell, L.oy + r * L.cell, L.cell, L.cell);
    if (rng() < 0.22) {
      g.fillStyle(lighten(pal.accent, 0.35), 0.55);
      const px = L.ox + (c + 0.2 + rng() * 0.6) * L.cell, py = L.oy + (r + 0.2 + rng() * 0.6) * L.cell;
      g.fillCircle(px, py, L.cell * 0.04);
      g.fillCircle(px + L.cell * 0.08, py + L.cell * 0.05, L.cell * 0.03);
    }
  }
}

export function drawVoid(g: G, m: Maze, L: Layout, pal: Pal, seed: number) {
  const rng = mulberry32(seed * 13 + 5);
  for (let i = 0; i < m.cols * m.rows; i++) {
    if (!m.solid[i]) continue;
    const c = i % m.cols, r = (i / m.cols) | 0;
    g.fillStyle(pal.voidC, 1);
    g.fillRect(L.ox + c * L.cell, L.oy + r * L.cell, L.cell, L.cell);
    for (let k = 0; k < 3; k++) {
      g.fillStyle(rng() < 0.5 ? pal.leafB : darken(pal.leafB, 0.3), 0.6);
      g.fillCircle(L.ox + (c + rng()) * L.cell, L.oy + (r + rng()) * L.cell, L.cell * (0.1 + rng() * 0.12));
    }
  }
}

export function drawHedges(g: G, m: Maze, L: Layout, pal: Pal, seed: number) {
  const segs = collectWalls(m);
  const t = L.cell * 0.34;
  g.fillStyle(0x000000, 0.22); // sombra
  for (const s of segs) seg(g, { ...L, oy: L.oy + 4 }, s, t, 6);
  g.fillStyle(pal.wallDark, 1);
  for (const s of segs) seg(g, L, s, t, 3);
  g.fillStyle(pal.wall, 1);
  for (const s of segs) seg(g, L, s, t, -1);
  g.fillStyle(pal.wallLight, 0.85);
  for (const s of segs) seg(g, { ...L, oy: L.oy - t * 0.07 }, s, t * 0.42, -2);
  // folhinhas
  const rng = mulberry32(seed * 31 + 9);
  for (const s of segs) {
    for (let k = 0; k < 2; k++) {
      const f = rng();
      const x = L.ox + (s.x1 + (s.x2 - s.x1) * f) * L.cell + (rng() - 0.5) * t * 0.5;
      const y = L.oy + (s.y1 + (s.y2 - s.y1) * f) * L.cell + (rng() - 0.5) * t * 0.5;
      g.fillStyle(rng() < 0.5 ? pal.leafA : pal.leafB, 0.9);
      g.fillCircle(x, y, t * (0.13 + rng() * 0.08));
    }
  }
}

/** Desenha uma sebe dinâmica centrada em (0,0) (o objeto é posicionado no centro da aresta). */
export function drawDynHedge(g: G, L: Layout, pal: Pal, horizontal: boolean) {
  const t = L.cell * 0.34;
  const len = L.cell;
  const rr = (pad: number, off = 0) => {
    const h = t + pad;
    if (horizontal) g.fillRoundedRect(-len / 2 - h / 2, -h / 2 + off, len + h, h, h / 2);
    else g.fillRoundedRect(-h / 2, -len / 2 - h / 2 + off, h, len + h, h / 2);
  };
  g.fillStyle(0x000000, 0.22); rr(6, 4);
  g.fillStyle(darken(pal.dyn, 0.5), 1); rr(3);
  g.fillStyle(pal.dyn, 1); rr(-1);
  g.fillStyle(lighten(pal.dyn, 0.3), 0.85); rr(-t * 0.58, -t * 0.07);
  // flores que denunciam que a sebe é "rebelde"
  for (let k = -1; k <= 1; k++) {
    const fx = horizontal ? k * len * 0.3 : 0;
    const fy = horizontal ? 0 : k * len * 0.3;
    g.fillStyle(0xffffff, 0.95); g.fillCircle(fx, fy, t * 0.2);
    g.fillStyle(pal.accent, 1); g.fillCircle(fx, fy, t * 0.12);
  }
}

/** Trilho: a "tinta" do Uli, a correr o gradiente de assinatura. */
export function drawTrailRange(g: G, m: Maze, L: Layout, trail: number[], from: number, to: number) {
  const w = L.cell * 0.2;
  for (let k = Math.max(1, from); k <= to && k < trail.length; k++) {
    const a = trail[k - 1], b = trail[k];
    const col = brandAt(0.5 - 0.5 * Math.cos(k * 0.14));
    const x1 = cellX(L, m, a), y1 = cellY(L, m, a), x2 = cellX(L, m, b), y2 = cellY(L, m, b);
    for (const [pad, al] of [[w * 0.9, 0.22], [0, 0.95]] as const) {
      g.fillStyle(col, al);
      const h = w + pad;
      g.fillRoundedRect(Math.min(x1, x2) - h / 2, Math.min(y1, y2) - h / 2, Math.abs(x2 - x1) + h, Math.abs(y2 - y1) + h, h / 2);
    }
  }
}

/** Obra completa (para miniaturas e galeria). */
export function drawMazeArt(g: G, m: Maze, L: Layout, pal: Pal, seed: number, trail?: number[], phase = 0) {
  drawFloor(g, m, L, pal, seed);
  drawVoid(g, m, L, pal, seed);
  drawHedges(g, m, L, pal, seed);
  for (const e of m.dyn) {
    if (e.group !== phase) continue;
    const x = L.ox + ((e.a % m.cols) + (e.dir === 1 ? 1 : 0.5)) * L.cell;
    const y = L.oy + (((e.a / m.cols) | 0) + (e.dir === 2 ? 1 : 0.5)) * L.cell;
    const t = L.cell * 0.34;
    g.fillStyle(pal.dyn, 1);
    if (e.dir === 1) g.fillRoundedRect(x - t / 2, y - L.cell / 2 - t / 2, t, L.cell + t, t / 2);
    else g.fillRoundedRect(x - L.cell / 2 - t / 2, y - t / 2, L.cell + t, t, t / 2);
  }
  if (trail && trail.length > 1) drawTrailRange(g, m, L, trail, 1, trail.length - 1);
}
