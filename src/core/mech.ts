// Mecânicas dos mundos (lógica pura, sem gráficos): gelo que escorrega, lava que avança e anéis que rodam.
// Um único solver (procura em largura sobre célula + rotações + chamas) calcula o par, as pistas e prova que há sempre saída.
import { Maze, DIRS, OPP, generate, neighbor, MazeOpts } from './maze';
import { mulberry32, shuffle } from './rng';

export const BRASAS = 3; // cargas da Brasa (gelo)

const key = (a: number, b: number) => a * 10000 + b;
const popc = (v: number) => (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1);

// ───────────────────────── Anéis: geometria ─────────────────────────
/** Roda uma célula r quartos de volta (sentido dos ponteiros) em torno do centro (labirinto quadrado de lado ímpar). */
export function rotCell(m: Maze, i: number, r: number): number {
  const h = (m.cols - 1) / 2;
  let x = (i % m.cols) - h, y = ((i / m.cols) | 0) - h;
  for (let k = ((r % 4) + 4) % 4; k > 0; k--) { const t = x; x = -y; y = t; }
  return (y + h) * m.cols + (x + h);
}

/** Passagens do labirinto para um dado conjunto de rotações. Entre anéis só passa se as duas portas estiverem alinhadas. */
export function ringPass(m: Maze, rot: number[]): Uint8Array {
  const R = m.rings!, out = new Uint8Array(m.cols * m.rows);
  for (let u = 0; u < out.length; u++) {
    for (let d = 0; d < 4; d++) {
      const v = neighbor(m, u, d);
      if (v < 0) continue;
      const a = R.layer[u], b = R.layer[v];
      const ok = a === b
        ? R.intra[a].has(key(rotCell(m, u, -rot[a]), rotCell(m, v, -rot[a])))
        : R.door[a].has(key(rotCell(m, u, -rot[a]), rotCell(m, v, -rot[a]))) && R.door[b].has(key(rotCell(m, v, -rot[b]), rotCell(m, u, -rot[b])));
      if (ok) out[u] |= DIRS[d].b;
    }
  }
  return out;
}

/** Que anel roda quando se carrega no botão: o que está debaixo dos pés; no anel exterior (fixo), o primeiro anel. */
export const ringTarget = (m: Maze, cell: number) => m.rings!.layer[cell] || 1;

export function setRot(m: Maze, rot: number[]) { m.rings!.rot = rot; m.pass = ringPass(m, rot); }

// ───────────────────────── Movimento ─────────────────────────
/** Células percorridas por um passo na direção `dir`. No gelo desliza até à parede, à neve ou à saída. */
export function travel(m: Maze, from: number, dir: number, open: (i: number, d: number) => boolean): number[] {
  if (!open(from, dir)) return [];
  let n = neighbor(m, from, dir);
  const path = [n];
  if (m.mech === 'ice') {
    while (n !== m.exit && !m.grip![n] && open(n, dir)) { n = neighbor(m, n, dir); path.push(n); }
  }
  return path;
}

// ───────────────────────── Solver ─────────────────────────
export interface SolveState { cell: number; flames: number[]; t: number }
export type Act = { type: 'move'; dir: number; path: number[] } | { type: 'rot'; layer: number };
export interface SolveOpts { needAll?: boolean; block?: (cell: number, t: number) => boolean; noRot?: boolean }

/**
 * Menor sequência de ações até à saída (com todas as chamas, salvo needAll = false).
 * Considera só passagens fixas (as sebes dinâmicas são atalhos extra). A lava é respeitada: chegar cedo nunca é pior,
 * por isso a procura em largura é exata.
 */
export function solve(m: Maze, st: SolveState, o: SolveOpts = {}): Act[] | null {
  const N = m.cols * m.rows, R = m.rings;
  const needAll = o.needAll ?? true;
  const fl = st.flames;
  const full = (1 << fl.length) - 1;
  // chamas em coordenadas de origem (rodam com o seu anel)
  const base = R ? fl.map((c) => rotCell(m, c, -R.rot[R.layer[c]])) : fl;
  const code0 = R ? R.rot[1] + 4 * (R.rot[2] ?? 0) : 0;
  const passC = new Map<number, Uint8Array>();
  const passFor = (code: number) => {
    if (!R) return m.pass;
    let p = passC.get(code);
    if (!p) { p = ringPass(m, [0, code & 3, (code >> 2) & 3]); passC.set(code, p); }
    return p;
  };
  const cells = [st.cell], codes = [code0], masks = [0], ts = [st.t], parent = [-1];
  const acts: (Act | null)[] = [null];
  const seen = new Set<number>([st.cell + N * (code0 + 16 * 0)]);
  const build = (h: number, last: Act) => { const out: Act[] = [last]; for (let k = h; parent[k] >= 0; k = parent[k]) out.push(acts[k]!); return out.reverse(); };
  const push = (cell: number, code: number, mask: number, t: number, from: number, act: Act) => {
    const k = cell + N * (code + 16 * mask);
    if (seen.has(k)) return;
    seen.add(k); cells.push(cell); codes.push(code); masks.push(mask); ts.push(t); parent.push(from); acts.push(act);
  };
  for (let h = 0; h < cells.length; h++) {
    const cell = cells[h], code = codes[h], mask = masks[h], t = ts[h] + 1;
    const pass = passFor(code);
    const open = (i: number, d: number) => (pass[i] & DIRS[d].b) !== 0;
    for (let dir = 0; dir < 4; dir++) {
      const path = travel(m, cell, dir, open);
      if (!path.length) continue;
      const end = path[path.length - 1];
      if (m.lava && t >= m.lava.at[end]) continue;
      if (o.block && path.some((c) => o.block!(c, t))) continue;
      let nm = mask;
      for (const c of path) for (let f = 0; f < base.length; f++) {
        const cur = R ? rotCell(m, base[f], (code >> (2 * (R.layer[base[f]] - 1))) & (R.layer[base[f]] ? 3 : 0)) : base[f];
        if (cur === c) nm |= 1 << f;
      }
      const act: Act = { type: 'move', dir, path };
      if (end === m.exit) { if (!needAll || nm === full) return build(h, act); continue; }
      push(end, code, nm, t, h, act);
    }
    if (R && !o.noRot) {
      const L = ringTarget(m, cell), sh = 2 * (L - 1);
      const r = ((code >> sh) + 1) & 3, ncode = (code & ~(3 << sh)) | (r << sh);
      const ncell = R.layer[cell] === L ? rotCell(m, cell, 1) : cell;
      if (!(o.block && o.block(ncell, t))) push(ncell, ncode, mask, t, h, { type: 'rot', layer: L });
    }
  }
  return null;
}

// ───────────────────────── Gelo ─────────────────────────
/** Há sempre saída? Todas as paragens alcançáveis voltam ao início, todas as chamas ficam ao alcance e a saída também. */
export function iceSound(m: Maze): boolean {
  const open = (i: number, d: number) => (m.pass[i] & DIRS[d].b) !== 0;
  const reach = new Set<number>([m.start]), q = [m.start], rev = new Map<number, number[]>();
  const covered = new Set<number>();
  let exit = false;
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    for (let d = 0; d < 4; d++) {
      const path = travel(m, u, d, open);
      if (!path.length) continue;
      for (const c of path) covered.add(c);
      const v = path[path.length - 1];
      if (v === m.exit) { exit = true; continue; }
      (rev.get(v) ?? rev.set(v, []).get(v)!).push(u);
      if (!reach.has(v)) { reach.add(v); q.push(v); }
    }
  }
  if (!exit || m.rosas.some((r) => !covered.has(r))) return false;
  const back = new Set<number>([m.start]), b = [m.start];
  for (let h = 0; h < b.length; h++) for (const u of rev.get(b[h]) ?? []) if (!back.has(u)) { back.add(u); b.push(u); }
  return back.size === reach.size;
}

/** Semeia o mínimo de neve que garante a solução (máximo de gelo) e junta uma folga `extra` para níveis mais calmos. */
function buildIce(m: Maze, seed: number, extra: number) {
  const rng = mulberry32(seed * 131 + 7);
  m.mech = 'ice';
  m.grip = new Uint8Array(m.cols * m.rows);
  m.grip[m.start] = 1; m.grip[m.exit] = 1;
  const cand = shuffle(Array.from({ length: m.cols * m.rows }, (_, i) => i).filter((i) => !m.solid[i] && i !== m.start && i !== m.exit), rng);
  cand.sort((a, b) => popc(m.pass[b]) - popc(m.pass[a])); // cruzamentos primeiro
  const added: number[] = [];
  for (const c of cand) { if (iceSound(m)) break; m.grip[c] = 1; added.push(c); }
  for (const c of shuffle(added, rng)) { m.grip[c] = 0; if (!iceSound(m)) m.grip[c] = 1; }
  // acrescentar neve nunca estraga a solução (pode-se sempre continuar a deslizar)
  const free = shuffle(cand.filter((c) => !m.grip![c] && !m.rosas.includes(c)), rng);
  for (let k = 0; k < Math.round(free.length * extra); k++) m.grip[free[k]] = 1;
}

/** Entre várias sementes escolhe (sempre da mesma maneira) a que dá deslizes mais longos e um percurso com sumo. */
function bestIce(p: MechParams, opts: MazeOpts): Maze {
  let best: Maze | undefined, score = -1e9;
  for (let k = 0; k < 22; k++) {
    const seed = p.seed + k * 101;
    const m = generate({ ...opts, seed });
    buildIce(m, seed, p.grip ?? 0);
    const s = solve(m, { cell: m.start, flames: m.rosas, t: 0 });
    if (!s) continue;
    const lens = s.map((a) => (a.type === 'move' ? a.path.length : 0));
    const long = lens.filter((l) => l >= 3).length, mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const want = p.cols * 3;                                   // nem curto demais nem interminável
    const sc = mean * 22 + (long / lens.length) * 40 - Math.abs(s.length - want) * 0.7;
    if (sc > score) { score = sc; best = m; }
  }
  return best!;
}

// ───────────────────────── Lava ─────────────────────────
function lavaField(m: Maze, delay: number, k: number) {
  const at = new Int32Array(m.cols * m.rows).fill(1 << 29);
  const q = [m.start], dist = new Int32Array(m.cols * m.rows).fill(-1);
  dist[m.start] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h];
    at[c] = delay + k * dist[c];
    for (let d = 0; d < 4; d++) if (m.pass[c] & DIRS[d].b) { const n = neighbor(m, c, d); if (n >= 0 && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); } }
  }
  m.lava = { delay, k, at };
}

/** A lava nasce no início e avança uma "casa de distância" a cada k passos. O atraso é o mínimo que permite as 3★, mais a folga. */
function buildLava(m: Maze, k: number, slack: number) {
  m.mech = 'lava';
  let lo = 0, hi = 600;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    lavaField(m, mid, k);
    if (solve(m, { cell: m.start, flames: m.rosas, t: 0 })) hi = mid; else lo = mid + 1;
  }
  lavaField(m, lo + slack, k);
}

// ───────────────────────── Anéis ─────────────────────────
function ringAttempt(size: number, nr: number, seed: number, loops: number): Maze | null {
  const rng = mulberry32(seed);
  const n = size * size, h = (size - 1) / 2;
  const radius = nr === 1 ? [h - 2] : [h - 2, size >= 13 ? 2 : 1]; // raio do anel 1 (e do disco central, anel 2)
  const layer = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const d = Math.max(Math.abs((i % size) - h), Math.abs(((i / size) | 0) - h));
    layer[i] = nr === 2 && d <= radius[1] ? 2 : d <= radius[0] ? 1 : 0;
  }
  const m: Maze = { cols: size, rows: size, solid: new Array(n).fill(false), pass: new Uint8Array(n), start: 0, exit: h * size + h, rosas: [], dyn: [], dynMap: new Map(), shortest: 0, par: 0, mech: 'rings' };
  const intra = [new Set<number>(), new Set<number>(), new Set<number>()], door = [new Set<number>(), new Set<number>(), new Set<number>()];
  m.rings = { n: nr, layer, intra, door, rot: [0, 0, 0] };
  const deg = new Uint8Array(n);
  // cada anel é um labirinto próprio (árvore + algumas voltas), por isso é sempre ligado por dentro
  for (let L = 0; L <= nr; L++) {
    const mine = Array.from({ length: n }, (_, i) => i).filter((i) => layer[i] === L);
    const seen = new Set<number>(), first = mine[(rng() * mine.length) | 0], stack = [first];
    seen.add(first);
    const link = (a: number, b: number) => { intra[L].add(key(a, b)); intra[L].add(key(b, a)); deg[a]++; deg[b]++; };
    while (stack.length) {
      const c = stack[stack.length - 1];
      const opts = [0, 1, 2, 3].map((d) => neighbor(m, c, d)).filter((v) => v >= 0 && layer[v] === L && !seen.has(v));
      if (!opts.length) { stack.pop(); continue; }
      const v = opts[(rng() * opts.length) | 0];
      link(c, v); seen.add(v); stack.push(v);
    }
    const extra: [number, number][] = [];
    for (const a of mine) for (const d of [1, 2]) { const b = neighbor(m, a, d); if (b >= 0 && layer[b] === L && !intra[L].has(key(a, b))) extra.push([a, b]); }
    shuffle(extra, rng);
    for (let k = 0; k < Math.floor(extra.length * loops); k++) link(extra[k][0], extra[k][1]);
  }
  // portas: a do lado de fora está rodada k quartos em relação à de dentro (começam desalinhadas)
  for (let inner = 1; inner <= nr; inner++) {
    const outer = inner - 1;
    const edges: [number, number][] = [];
    for (let u = 0; u < n; u++) if (layer[u] === inner) for (let d = 0; d < 4; d++) { const v = neighbor(m, u, d); if (v >= 0 && layer[v] === outer) edges.push([u, v]); }
    shuffle(edges, rng);
    for (let p = 0; p < 2 && p < edges.length; p++) {
      const [u, v] = edges[p], k = 1 + ((rng() * 3) | 0);
      door[inner].add(key(u, v));
      door[outer].add(key(rotCell(m, v, k), rotCell(m, u, k)));
    }
  }
  m.pass = ringPass(m, [0, 0, 0]);
  // início num canto do anel exterior; chamas em becos, uma em cada anel
  const corners = [0, size - 1, n - size, n - 1];
  m.start = corners[(rng() * 4) | 0];
  const cheb = (a: number, b: number) => Math.max(Math.abs((a % size) - (b % size)), Math.abs(((a / size) | 0) - ((b / size) | 0)));
  const want = nr === 1 ? [0, 0, 1] : [0, 1, 2];
  for (const L of want) {
    const pool = shuffle(Array.from({ length: n }, (_, i) => i).filter((i) => layer[i] === L && i !== m.exit && i !== m.start && cheb(i, m.start) >= 3 && !m.rosas.some((r) => cheb(r, i) < 2)), rng);
    if (!pool.length) return null;
    pool.sort((a, b) => deg[a] - deg[b]);
    m.rosas.push(pool[0]);
  }
  return m;
}

/** Procura (de forma determinística) uma mandala em que seja mesmo preciso rodar e a solução tenha bom tamanho. */
export function generateRings(size: number, nr: number, seed: number, loops: number): Maze {
  let fallback: Maze | null = null, best: Maze | null = null, bestD = 1e9, good = 0;
  const target = size * (nr === 1 ? 4.2 : 4.8);
  for (let a = 0; a < 400 && good < 14; a++) {
    const m = ringAttempt(size, nr, seed + a * 7919, loops);
    if (!m) continue;
    const st = { cell: m.start, flames: m.rosas, t: 0 };
    if (solve(m, st, { noRot: true, needAll: false })) continue; // sem rodar não pode haver saída
    const s = solve(m, st);
    if (!s) continue;
    m.shortest = solve(m, st, { needAll: false })!.length;
    m.par = s.length;
    fallback ??= m;
    if (s.filter((x) => x.type === 'rot').length < nr + 1) continue;
    good++;
    const d = Math.abs(s.length - target);
    if (d < bestD) { bestD = d; best = m; }
  }
  return (best ?? fallback)!;
}

// ───────────────────────── Construção de um nível ─────────────────────────
export interface MechParams { mech?: 'ice' | 'lava' | 'rings'; rings?: number; grip?: number; lavaK?: number; slack?: number; guards?: number; cols: number; seed: number; loops: number }

export function buildLevel(p: MechParams, opts: MazeOpts): Maze {
  const g = p.guards ?? 0;
  let m: Maze;
  if (p.mech === 'rings') m = generateRings(p.cols, p.rings ?? 1, p.seed, Math.max(p.loops, g ? 0.22 : 0.1));
  else {
    if (p.mech === 'ice') m = bestIce(p, opts);
    else {
      m = generate(opts);
      if (p.mech !== 'lava') return m;
      buildLava(m, p.lavaK ?? 2, (p.slack ?? 10) + g * 4);
    }
  }
  // par = melhor rota com todas as chamas (exata) + folga
  const best = solve(m, { cell: m.start, flames: m.rosas, t: 0 })!.length;
  const frac = m.mech === 'ice' ? 0.25 : m.mech === 'lava' ? 0.12 : 0.18;
  m.par = best + Math.max(m.mech === 'ice' ? 3 : 4, Math.round(best * frac)) + g * (m.mech === 'ice' ? 3 : 4);
  return m;
}

/** Cópia independente (o jogo altera neve, rotações, etc.). */
export function cloneMaze(m: Maze): Maze {
  return {
    ...m, pass: m.pass.slice(), rosas: m.rosas.slice(), grip: m.grip?.slice(),
    lava: m.lava ? { ...m.lava } : undefined, rings: m.rings ? { ...m.rings, rot: m.rings.rot.slice() } : undefined,
  };
}

export { OPP };
