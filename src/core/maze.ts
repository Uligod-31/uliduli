import { mulberry32, shuffle } from './rng';

export const N = 1, E = 2, S = 4, W = 8;
/** Índice de direção: 0 = Norte, 1 = Este, 2 = Sul, 3 = Oeste */
export const DIRS = [
  { b: N, dx: 0, dy: -1, opp: S },
  { b: E, dx: 1, dy: 0, opp: W },
  { b: S, dx: 0, dy: 1, opp: N },
  { b: W, dx: -1, dy: 0, opp: E },
] as const;
export const OPP = [2, 3, 0, 1];

export type MaskKind = 'rect' | 'diamond' | 'circle' | 'heart' | 'ring' | 'cross';

export interface DynEdge {
  a: number;
  b: number;
  dir: number; // direção de a para b (1 = E, 2 = S)
  group: 0 | 1;
}

export type MechKind = 'ice' | 'lava' | 'rings' | 'planet' | 'holes' | 'tide' | 'beat' | 'page' | 'clouds';

/** Elementos das barreiras de sopro (Chama Viva, ver core/viva.ts). */
export type Element = 'heras' | 'gelo' | 'runa' | 'gas';
export interface Barrier { a: number; b: number; dir: number; kind: Element; open?: boolean }

export interface Maze {
  cols: number;
  rows: number;
  solid: boolean[]; // células "vazias" (massa sólida, fora da forma)
  pass: Uint8Array; // passagens fixas (bitmask N/E/S/W)
  start: number;
  exit: number;
  rosas: number[];
  dyn: DynEdge[];
  dynMap: Map<number, number>; // idx*4+dir -> grupo
  shortest: number;
  par: number;
  // mecânicas dos mundos (ver core/mech.ts)
  mech?: MechKind;
  warp?: Map<number, number>;                          // planeta: idx*4+dir -> célula do outro lado
  holes?: Map<number, number>;                         // buracos de verme: célula -> par
  haz?: { period: number; group: Uint8Array };         // maré e batida: células perigosas em certos passos
  clouds?: number[];                                   // nuvens que se desfazem depois de pisadas
  grip?: Uint8Array;                                   // gelo: 1 = neve ou poça (trava o deslize)
  lava?: { delay: number; k: number; at: Int32Array }; // lava: passo em que cada célula se incendeia
  rings?: { n: number; layer: Uint8Array; intra: Set<number>[]; door: Set<number>[]; rot: number[] };
  light?: number;                                      // Chama Viva: luz máxima (passos entre chamas)
  barriers?: Barrier[];                                // paredes que o sopro abre (de a para b, dir 1 = E, 2 = S)
}

export interface MazeOpts {
  cols: number;
  rows: number;
  mask: MaskKind;
  seed: number;
  dyn?: number;
  loops?: number; // fração de paredes removidas (cria voltas)
  rosas?: number;
  parExtra?: number; // folga extra no par (ex.: níveis com guardas)
}

/** Distâncias BFS sobre passagens fixas, sem nunca atravessar `block` (a saída fecha o nível). */
function distAvoid(m: Maze, from: number, block: number): Int32Array {
  const dist = new Int32Array(m.cols * m.rows).fill(-1);
  const q = [from];
  dist[from] = 0;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h];
    if (cur === block && cur !== from) continue;
    for (let d = 0; d < 4; d++) {
      if (!(m.pass[cur] & DIRS[d].b)) continue;
      const ni = neighbor(m, cur, d);
      if (ni >= 0 && dist[ni] < 0) { dist[ni] = dist[cur] + 1; q.push(ni); }
    }
  }
  return dist;
}

function permutations(a: number[]): number[][] {
  if (a.length <= 1) return [a];
  const r: number[][] = [];
  a.forEach((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).forEach((p) => r.push([x, ...p])));
  return r;
}

/** Menor nº de passos para apanhar todas as chamas e acabar na saída (só passagens fixas, sem passar pela saída antes do fim). */
export function bestTour(m: Maze): number {
  const pts = [m.start, ...m.rosas];
  const D = pts.map((p) => distAvoid(m, p, m.exit));
  const toExit = distFrom(m, m.exit);
  let best = 1e9;
  for (const perm of permutations(m.rosas.map((_, i) => i + 1))) {
    let at = 0, len = 0, ok = true;
    for (const k of perm) { const d = D[at][pts[k]]; if (d < 0) { ok = false; break; } len += d; at = k; }
    if (!ok) continue;
    const dEnd = toExit[pts[at]];
    if (dEnd < 0) continue;
    best = Math.min(best, len + dEnd);
  }
  return best < 1e9 ? best : m.shortest;
}

export function inMask(kind: MaskKind, c: number, r: number, cols: number, rows: number): boolean {
  const x = ((c + 0.5) / cols) * 2 - 1;
  const y = ((r + 0.5) / rows) * 2 - 1;
  switch (kind) {
    case 'rect':
      return true;
    case 'diamond':
      return Math.abs(x) + Math.abs(y) <= 1.02;
    case 'circle':
      return x * x + y * y <= 1.02;
    case 'ring': {
      const d = x * x + y * y;
      return d <= 1.02 && d >= 0.12;
    }
    case 'cross':
      return Math.abs(x) < 0.45 || Math.abs(y) < 0.45;
    case 'heart': {
      const hx = x * 1.3;
      const hy = -y * 1.2 + 0.1;
      const a = hx * hx + hy * hy - 1;
      return a * a * a - hx * hx * hy * hy * hy <= 0;
    }
  }
}

export function canPass(m: Maze, idx: number, d: number, phase: number): boolean {
  if (m.pass[idx] & DIRS[d].b) return true;
  const g = m.dynMap.get(idx * 4 + d);
  return g !== undefined && g !== phase;
}

export function neighbor(m: Maze, idx: number, d: number): number {
  const w = m.warp?.get(idx * 4 + d);
  if (w !== undefined) return w;
  const c = (idx % m.cols) + DIRS[d].dx;
  const r = ((idx / m.cols) | 0) + DIRS[d].dy;
  if (c < 0 || r < 0 || c >= m.cols || r >= m.rows) return -1;
  return r * m.cols + c;
}

/** Distâncias BFS. phase = -1 usa só passagens fixas. */
export function distFrom(m: Maze, from: number, phase = -1): Int32Array {
  const dist = new Int32Array(m.cols * m.rows).fill(-1);
  const q = [from];
  dist[from] = 0;
  for (let h = 0; h < q.length; h++) {
    const cur = q[h];
    for (let d = 0; d < 4; d++) {
      const ok = phase < 0 ? (m.pass[cur] & DIRS[d].b) !== 0 : canPass(m, cur, d, phase);
      if (!ok) continue;
      const ni = neighbor(m, cur, d);
      if (ni >= 0 && dist[ni] < 0) {
        dist[ni] = dist[cur] + 1;
        q.push(ni);
      }
    }
  }
  return dist;
}

export function pathTo(m: Maze, from: number, to: number, phase: number): number[] {
  const prev = new Int32Array(m.cols * m.rows).fill(-2);
  const q = [from];
  prev[from] = -1;
  for (let h = 0; h < q.length && prev[to] === -2; h++) {
    const cur = q[h];
    for (let d = 0; d < 4; d++) {
      if (!canPass(m, cur, d, phase)) continue;
      const ni = neighbor(m, cur, d);
      if (ni >= 0 && prev[ni] === -2) {
        prev[ni] = cur;
        q.push(ni);
      }
    }
  }
  if (prev[to] === -2) return [];
  const path: number[] = [];
  for (let c = to; c !== -1; c = prev[c]) path.push(c);
  return path.reverse();
}

const popcount = (v: number) => (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1);
const argmax = (a: Int32Array) => {
  let b = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i;
  return b;
};

export function generate(o: MazeOpts): Maze {
  const { cols, rows } = o;
  const n = cols * rows;
  const rng = mulberry32(o.seed);
  const solid: boolean[] = new Array(n);
  for (let i = 0; i < n; i++) solid[i] = !inMask(o.mask, i % cols, (i / cols) | 0, cols, rows);

  // ponto de partida do DFS: célula livre mais próxima do centro
  let s = -1;
  let best = 1e9;
  for (let i = 0; i < n; i++) {
    if (solid[i]) continue;
    const d = ((i % cols) - (cols - 1) / 2) ** 2 + (((i / cols) | 0) - (rows - 1) / 2) ** 2;
    if (d < best) { best = d; s = i; }
  }

  const pass = new Uint8Array(n);
  const seen = new Uint8Array(n);
  const stack = [s];
  seen[s] = 1;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const c = cur % cols;
    const r = (cur / cols) | 0;
    const opts: number[] = [];
    for (let d = 0; d < 4; d++) {
      const nc = c + DIRS[d].dx;
      const nr = r + DIRS[d].dy;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = nr * cols + nc;
      if (!solid[ni] && !seen[ni]) opts.push(d);
    }
    if (!opts.length) { stack.pop(); continue; }
    const d = opts[Math.floor(rng() * opts.length)];
    const ni = (((cur / cols) | 0) + DIRS[d].dy) * cols + c + DIRS[d].dx;
    pass[cur] |= DIRS[d].b;
    pass[ni] |= DIRS[d].opp;
    seen[ni] = 1;
    stack.push(ni);
  }
  for (let i = 0; i < n; i++) if (!seen[i]) solid[i] = true;

  const m: Maze = {
    cols, rows, solid, pass, start: s, exit: s, rosas: [], dyn: [], dynMap: new Map(), shortest: 0, par: 0,
  };

  // paredes candidatas (entre duas células livres, sem passagem)
  const cands: { a: number; b: number; dir: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (solid[i]) continue;
    for (const d of [1, 2]) {
      const ni = neighbor(m, i, d);
      if (ni >= 0 && !solid[ni] && !(pass[i] & DIRS[d].b)) cands.push({ a: i, b: ni, dir: d });
    }
  }
  shuffle(cands, rng);
  const loopCount = Math.floor(cands.length * (o.loops ?? 0));
  for (let k = 0; k < loopCount; k++) {
    const { a, b, dir } = cands[k];
    pass[a] |= DIRS[dir].b;
    pass[b] |= DIRS[dir].opp;
  }

  // sebes dinâmicas: só entre células já ligadas por outro caminho (nunca bloqueiam a solução)
  const want = o.dyn ?? 0;
  for (let k = loopCount; k < cands.length && m.dyn.length < want; k++) {
    const { a, b, dir } = cands[k];
    const dist = distFrom(m, a);
    if (dist[b] < 6) continue;
    const e: DynEdge = { a, b, dir, group: (m.dyn.length % 2) as 0 | 1 };
    m.dyn.push(e);
    m.dynMap.set(a * 4 + dir, e.group);
    m.dynMap.set(b * 4 + OPP[dir], e.group);
  }

  // início e saída nos extremos (diâmetro do labirinto)
  // (distância pelo caminho + peso da distância em linha reta, para que início e saída fiquem mesmo longe à vista)
  const far = (d: Int32Array, from: number) => {
    const fc = from % cols, fr = (from / cols) | 0;
    let b = from, bs = -1;
    for (let i = 0; i < n; i++) {
      if (d[i] < 0) continue;
      const sc = d[i] + 3 * (Math.abs((i % cols) - fc) + Math.abs(((i / cols) | 0) - fr));
      if (sc > bs) { bs = sc; b = i; }
    }
    return b;
  };
  const A = far(distFrom(m, s), s);
  const dA = distFrom(m, A);
  const B = far(dA, A);
  m.start = A;
  m.exit = B;
  m.shortest = dA[B];
  m.par = Math.round(dA[B] * 1.6) + 4;

  // rosas em becos sem saída, afastadas entre si
  const deadEnds = shuffle(
    Array.from({ length: n }, (_, i) => i).filter((i) => !solid[i] && i !== A && i !== B && popcount(pass[i]) === 1),
    rng,
  );
  const wantR = o.rosas ?? 3;
  const dNoExit = distAvoid(m, A, B); // rosas nunca atrás da saída
  const man = (x: number, y: number) =>
    Math.abs((x % cols) - (y % cols)) + Math.abs(((x / cols) | 0) - ((y / cols) | 0));
  for (const i of deadEnds) {
    if (m.rosas.length >= wantR) break;
    if (man(i, A) < 3 || man(i, B) < 3 || dNoExit[i] < 0) continue;
    if (m.rosas.some((r) => man(r, i) < 4)) continue;
    m.rosas.push(i);
  }
  for (let i = 0; m.rosas.length < wantR && i < n * 3; i++) {
    const c = Math.floor(rng() * n);
    if (!solid[c] && c !== A && c !== B && !m.rosas.includes(c) && dNoExit[c] >= 0) m.rosas.push(c);
  }
  // par = melhor rota de 3 estrelas (todas as rosas) + folga, para que 3★ seja sempre possível
  const tour = bestTour(m);
  m.par = tour + Math.max(6, Math.round(tour * 0.22)) + (o.parExtra ?? 0);
  return m;
}
