// Desenha os níveis da Vaga 3. Cada candidato é determinístico (semente + índice `k`): põe os portões em passagens
// que são o único acesso a uma chama ou à saída (a regra conta mesmo), espalha o que é preciso para os abrir e só
// aceita o labirinto se o solver o completar e, onde se pode ficar preso, se nenhum estado alcançável for um beco.
import { Maze, MazeOpts, GateKind, ItemKind, DIRS, OPP, generate, neighbor, distFrom, pathTo } from './maze';
import { mulberry32, shuffle } from './rng';
import { solve, Act, MechParams } from './mech';
import { lightBudget } from './viva';
import { RULES, RuleKind, startState, INK_CAP, traceBeam, SEAL_SHIFT } from './rules';

type Rng = () => number;
const popc = (v: number) => (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1);
const dirBetween = (m: Maze, a: number, b: number) => [0, 1, 2, 3].find((d) => neighbor(m, a, d) === b)!;
const reach = (m: Maze, from: number) => distFrom(m, from);

function cut(m: Maze, u: number, v: number, on: boolean) {
  const d = dirBetween(m, u, v);
  if (on) { m.pass[u] &= ~DIRS[d].b; m.pass[v] &= ~DIRS[OPP[d]].b; }
  else { m.pass[u] |= DIRS[d].b; m.pass[v] |= DIRS[OPP[d]].b; }
}

interface Bridge { u: number; v: number; at: number; path: number[]; target: number }
/** Passagens do caminho até `target` sem as quais ele fica inalcançável (calculadas no labirinto sem portões). */
function bridges(base: Maze, target: number): Bridge[] {
  const path = pathTo(base, base.start, target, 0), out: Bridge[] = [];
  for (let i = 2; i < path.length; i++) {
    const u = path[i - 1], v = path[i];
    cut(base, u, v, true);
    if (reach(base, base.start)[target] < 0) out.push({ u, v, at: i, path, target });
    cut(base, u, v, false);
  }
  return out;
}

/** Escolhe até `n` pontes bem separadas, rodando pelos alvos (saída e chamas); de preferência a meio do caminho. */
function pickBridges(m: Maze, n: number, rng: Rng): Bridge[] {
  const targets = shuffle([m.exit, ...m.rosas], rng);
  const lists = targets.map((t) => shuffle(bridges(m, t), rng).sort((a, b) => Math.abs(a.at / a.path.length - 0.62) - Math.abs(b.at / b.path.length - 0.62) + (rng() - 0.5) * 0.5));
  const out: Bridge[] = [], busy = new Set<number>();
  for (let round = 0; round < 4 && out.length < n; round++) {
    for (const list of lists) {
      if (out.length >= n) break;
      const b = list.find((x) => !busy.has(x.u) && !busy.has(x.v) && x.u !== m.start && x.v !== m.start);
      if (!b) continue;
      out.push(b);
      for (const c of [b.u, b.v]) { busy.add(c); for (let d = 0; d < 4; d++) { const q = neighbor(m, c, d); if (q >= 0) busy.add(q); } }
    }
  }
  return out;
}

function addGate(m: Maze, u: number, v: number, kind: GateKind, id: number) {
  const d = dirBetween(m, u, v);
  const [a, b, dir] = d === 1 || d === 2 ? [u, v, d] : [v, u, OPP[d]];
  cut(m, u, v, true);
  m.gates!.push({ a, b, dir, kind, id, inside: v });
}

function taken(m: Maze): Set<number> {
  return new Set<number>([m.start, m.exit, ...m.rosas, ...(m.items ?? []).map((i) => i.c), ...(m.gates ?? []).flatMap((g) => [g.a, g.b]), ...(m.water ?? [])]);
}
/** Casas livres de uma zona, becos primeiro (o que se põe num beco só se pisa de propósito). */
function spots(m: Maze, rng: Rng, zone?: Int32Array, mix = 1.2): number[] {
  const used = taken(m);
  const all = Array.from({ length: m.cols * m.rows }, (_, i) => i).filter((i) => !m.solid[i] && !used.has(i) && (!zone || zone[i] >= 0));
  return all.map((c) => ({ c, s: (popc(m.pass[c]) === 1 ? 0 : 1) * mix + rng() * 1.5 })).sort((a, b) => a.s - b.s).map((x) => x.c);
}
const apartFrom = (m: Maze, c: number, others: number[], min: number) => others.every((o) => Math.abs((o % m.cols) - (c % m.cols)) + Math.abs(((o / m.cols) | 0) - ((c / m.cols) | 0)) >= min);

function put(m: Maze, kind: ItemKind, id: number, zone: Int32Array | undefined, rng: Rng, k?: number, apart = 3, mix?: number): boolean {
  const others = m.items!.map((i) => i.c).concat(m.start);
  const c = spots(m, rng, zone, mix).find((x) => apartFrom(m, x, others, apart)) ?? spots(m, rng, zone, mix)[0];
  if (c === undefined) return false;
  m.items!.push({ c, kind, id, k });
  return true;
}

/**
 * Há becos sem saída? Percorre todos os estados que se podem alcançar e confirma que de qualquer um deles ainda se
 * chega ao fim com as três chamas. Devolve false também se o espaço for grande demais para o provar.
 */
export function sound(m: Maze, limit = 600000): boolean {
  const rule = RULES[m.mech as RuleKind], N = m.cols * m.rows, fl = m.rosas, full = (1 << fl.length) - 1;
  const w0 = startState(m), id = new Map<number, number>([[m.start + N * (8 * w0), 0]]);
  const cells = [m.start], masks = [0], ws = [w0], back: number[][] = [[]], good: number[] = [];
  const link = (from: number, c: number, mask: number, w: number) => {
    const key = c + N * (mask + 8 * w);
    let j = id.get(key);
    if (j === undefined) { j = cells.length; id.set(key, j); cells.push(c); masks.push(mask); ws.push(w); back.push([]); }
    back[j].push(from);
  };
  for (let h = 0; h < cells.length; h++) {
    if (cells.length > limit) return false;
    const c = cells[h], mask = masks[h], w = ws[h];
    for (let d = 0; d < 4; d++) {
      for (const g of m.mech === 'glitch' ? [false, true] : [false]) {
        const r = rule.step(m, c, d, w, g);
        if (!r) continue;
        let nm = mask;
        for (const x of r.path) { const f = fl.indexOf(x); if (f >= 0) nm |= 1 << f; }
        const end = r.path[r.path.length - 1];
        if (end === m.exit) { if (nm === full) good.push(h); continue; }
        const nw = rule.end(m, end, r.w, nm !== mask);
        if (nw !== null) link(h, end, nm, nw);
      }
    }
    for (const a of rule.acts(m, c, w)) { const nw = rule.end(m, c, a.w, false); if (nw !== null) link(h, c, mask, nw); }
  }
  const ok = new Uint8Array(cells.length);
  for (const g of good) ok[g] = 1;
  const q = [...new Set(good)];
  for (let h = 0; h < q.length; h++) for (const p of back[q[h]]) if (!ok[p]) { ok[p] = 1; q.push(p); }
  return ok.every((v) => v === 1);
}

const solveFrom = (m: Maze, noRot = false) => solve(m, { cell: m.start, flames: m.rosas, t: 0 }, { noRot });
/** Quantos portões diferentes a melhor rota atravessa. */
function crossed(m: Maze, s: Act[]): number {
  const seen = new Set<number>();
  let at = m.start;
  for (const a of s) {
    if (a.type !== 'move') continue;
    for (const c of a.path) {
      m.gates?.forEach((g, i) => { if ((g.a === at && g.b === c) || (g.b === at && g.a === c)) seen.add(i); });
      at = c;
    }
  }
  return seen.size;
}
const visited = (m: Maze, s: Act[], kind: ItemKind) => {
  const cells = new Set((m.items ?? []).filter((i) => i.kind === kind).map((i) => i.c));
  return s.filter((a) => a.type === 'move' && a.path.some((c) => cells.has(c))).length;
};

export interface Candidate { m: Maze; score: number }

/** Constrói o candidato `k` de um nível; null se não servir. */
export function candidate(p: MechParams, opts: MazeOpts, k: number): Candidate | null {
  const kind = p.mech as RuleKind, seed = p.seed + k * 131, lv = p.level ?? 0, n = p.amount ?? 2, g = p.guards ?? 0;
  const rng = mulberry32(seed * 733 + 41);
  const loops = kind === 'glitch' ? 0.16 : g ? 0.09 : 0.03; // poucas voltas: há passagens obrigatórias (no Neon, há blocos para trocar)
  const m = generate({ ...opts, seed, dyn: 0, loops });
  const plain = pathTour(m);
  m.mech = kind; m.gates = []; m.items = [];
  let score = 0;
  const finish = (s: Act[] | null, extra: number): Candidate | null => {
    if (!s) return null;
    const long = Math.max(0, s.length - plain * 1.4);
    return { m, score: extra - long * 1.8 };
  };

  if (kind === 'size' || kind === 'mounts') {
    const gateKinds: GateKind[] = kind === 'size' ? (rng() < 0.5 ? ['crack', 'low'] : ['low', 'crack']) : lv < 2 ? ['rock'] : ['rock', 'branch'];
    const picked = pickBridges(m, n, rng);
    if (picked.length < Math.min(n, 2)) return null;
    picked.forEach((b, i) => addGate(m, b.u, b.v, gateKinds[i % gateKinds.length], i));
    const home = reach(m, m.start);
    if (kind === 'size') {
      const each = n >= 3 ? 3 : 2;
      for (const type of ['shrink', 'grow'] as ItemKind[]) {
        if (!put(m, type, 0, home, rng, undefined, 3, 0.4)) return null;
        for (let i = 1; i < each; i++) put(m, type, i, undefined, rng, undefined, 3, 0.4);
      }
    } else {
      if (!put(m, 'elephant', 0, home, rng, undefined, 4)) return null;
      if (n >= 3) put(m, 'elephant', 1, undefined, rng);
      if (gateKinds.includes('branch')) { if (!put(m, 'monkey', 0, home, rng, undefined, 4)) return null; put(m, 'monkey', 1, undefined, rng); }
      if (lv >= 4) { put(m, 'gazelle', 0, home, rng, undefined, 3, 0.3); put(m, 'gazelle', 1, undefined, rng, undefined, 3, 0.3); }
    }
    const s = solveFrom(m);
    if (!s || !sound(m)) return null;
    const used = crossed(m, s);
    if (used < Math.min(picked.length, 2)) return null;
    const items = kind === 'size' ? visited(m, s, 'shrink') + visited(m, s, 'grow') : visited(m, s, 'elephant') + visited(m, s, 'monkey') + visited(m, s, 'gazelle') * 2;
    score = used * 14 + Math.min(items, 8) * 5;
    if (kind === 'mounts') score += s.filter((a) => a.type === 'move' && a.path.length > 2).length * 4;
    return finish(s, score);
  }

  if (kind === 'echo') {
    const picked = pickBridges(m, n, rng);
    if (picked.length < n) return null;
    picked.forEach((b, i) => addGate(m, b.u, b.v, 'clock', i));
    for (let i = 0; i < n; i++) {
      const outside = picked[i].u, d = reach(m, outside), home = reach(m, m.start);
      // o botão fica a poucos passos do portão: chega-se lá mesmo a tempo
      const c = spots(m, rng, home, 0.8).find((x) => d[x] >= 4 && d[x] <= 8);
      if (c === undefined) return null;
      m.items.push({ c, kind: 'plate', id: i });
    }
    const s = solveFrom(m);
    if (!s) return null;
    const waits = s.filter((a) => a.type === 'wait').length, used = crossed(m, s);
    if (used < Math.min(n, 2) || waits > 4 + n * 4) return null;
    return finish(s, used * 16 - waits * 1.5 + visited(m, s, 'plate') * 3);
  }

  if (kind === 'roots') {
    // primeiro a luz (do labirinto sem portões); depois as flores de lua têm de caber nela
    m.mech = undefined;
    m.light = lightBudget(m, (p.lightK ?? 1.9) + 0.2, g);
    m.mech = kind;
    const moon = pickBridges(m, n, rng);
    if (!moon.length) return null;
    moon.forEach((b, i) => addGate(m, b.u, b.v, 'moon', i));
    // raízes de sol: atalhos que só uma chama forte abre
    const walls: [number, number, number][] = [];
    const used = taken(m);
    for (let a = 0; a < m.cols * m.rows; a++) for (const dir of [1, 2]) {
      const b = neighbor(m, a, dir);
      if (b < 0 || m.solid[a] || m.solid[b] || m.pass[a] & DIRS[dir].b || used.has(a) || used.has(b)) continue;
      const d = reach(m, a)[b];
      if (d >= 8) walls.push([a, b, d]);
    }
    shuffle(walls, rng).sort((x, y) => y[2] - x[2] + (rng() - 0.5) * 12);
    let suns = 0;
    const near: number[] = [];
    for (const [a, b] of walls) {
      if (suns >= Math.min(3, 1 + (lv >> 1))) break;
      if (!apartFrom(m, a, near, 3)) continue;
      m.gates.push({ a, b, dir: dirBetween(m, a, b), kind: 'sunroot', id: suns++ }); near.push(a);
    }
    let s = solveFrom(m);
    for (let tries = 0; !s && tries < 6; tries++) { m.light += 5; s = solveFrom(m); }
    if (!s) return null;
    const moons = m.gates.filter((x) => x.kind === 'moon').length, crossedAll = crossed(m, s);
    const waits = s.filter((a) => a.type === 'wait').length;
    if (waits > 16) return null;
    return finish(s, Math.min(crossedAll, moons + suns) * 14 - waits);
  }

  if (kind === 'ink') {
    m.water = [];
    const picked = pickBridges(m, n, rng);
    if (!picked.length) return null;
    for (const b of picked) {
      const room = 6 - m.water.length;
      if (room <= 0) break;
      const len = Math.min(room, 1 + ((rng() * (lv < 2 ? 2 : 3)) | 0));
      const used = taken(m);
      for (let i = b.at; i < b.at + len && i < b.path.length; i++) { const c = b.path[i]; if (used.has(c)) break; m.water.push(c); }
    }
    if (!m.water.length) return null;
    const dry = reach({ ...m, pass: block(m, m.water) } as Maze, m.start);
    if (!put(m, 'inkpot', 0, dry, rng, undefined, 4)) return null;
    for (let i = 1; i < (n >= 3 ? 3 : 2); i++) put(m, 'inkpot', i, undefined, rng, undefined, 4);
    const s = solveFrom(m);
    if (!s || !sound(m)) return null;
    const inWater = s.filter((a) => a.type === 'move' && a.path.some((c) => m.water!.includes(c))).length;
    if (inWater < 2) return null;
    return finish(s, Math.min(inWater, 12) * 4 + visited(m, s, 'inkpot') * 8 + m.water.length * 3);
  }

  if (kind === 'glitch') {
    // paredes que trocam: umas fechadas num estado, outras no outro (primeiro as do caminho para a saída)
    const edges: [number, number][] = [];
    for (let i = 0; i < m.cols * m.rows; i++) for (const d of [1, 2]) if (m.pass[i] & DIRS[d].b) edges.push([i, d]);
    shuffle(edges, rng);
    const ds = reach(m, m.start), de = reach(m, m.exit), best = ds[m.exit];
    const onPath = ([i, d]: [number, number]) => { const j = neighbor(m, i, d); return Math.min(ds[i] + de[j], ds[j] + de[i]) + 1 === best; };
    const weight = new Map(edges.map((e) => [e, Number(onPath(e)) + rng() * 0.8]));
    edges.sort((a, b) => weight.get(b)! - weight.get(a)!);
    // 1) as trancas: passagens obrigatórias fechadas de início (só o interruptor as abre)
    const locks = pickBridges(m, lv < 3 ? 1 : 2, rng);
    if (!locks.length) return null;
    const used = new Set<number>([m.start]);
    const shut = (i: number, d: number, group: 0 | 1) => {
      const j = neighbor(m, i, d);
      used.add(i); used.add(j);
      m.pass[i] &= ~DIRS[d].b; m.pass[j] &= ~DIRS[OPP[d]].b;
      m.dyn.push({ a: i, b: j, dir: d, group });
      m.dynMap.set(i * 4 + d, group); m.dynMap.set(j * 4 + OPP[d], group);
    };
    for (const b of locks) { const d = dirBetween(m, b.u, b.v); if (d === 1 || d === 2) shut(b.u, d, 0); else shut(b.v, OPP[d], 0); }
    const size = (phase: number) => distFrom(m, m.start, phase).reduce((a, v) => a + (v >= 0 ? 1 : 0), 0);
    const open = m.solid.filter((x) => !x).length, main = size(0);
    // 2) os blocos que trocam: nunca isolam nada em nenhum dos dois estados
    for (const [i, d] of edges) {
      if (m.dyn.length >= n) break;
      const j = neighbor(m, i, d);
      if (used.has(i) || used.has(j) || !(m.pass[i] & DIRS[d].b)) continue;
      const group = (m.dyn.length % 2) as 0 | 1;
      shut(i, d, group);
      if (size(1) !== open || size(0) !== main) { // isolava alguma zona: desfaz
        m.dyn.pop(); m.dynMap.delete(i * 4 + d); m.dynMap.delete(j * 4 + OPP[d]);
        m.pass[i] |= DIRS[d].b; m.pass[j] |= DIRS[OPP[d]].b; used.delete(i); used.delete(j);
      }
    }
    if (m.dyn.length < Math.min(n, 4)) return null;
    // 3) um interruptor ao alcance de quem começa e um dentro de cada zona trancada (para nunca se ficar lá preso)
    const home = distFrom(m, m.start, 0);
    if (!put(m, 'switch', 0, home, rng, undefined, 4)) return null;
    const behind = distFrom(m, m.start, 1).map((v, i) => (v >= 0 && home[i] < 0 ? v : -1));
    const done = new Int32Array(m.cols * m.rows).fill(0);
    let id = 1;
    for (const b of locks) {
      const inside = distFrom(m, b.v, 0);
      if (home[b.v] >= 0 || done[b.v]) continue;
      inside.forEach((v, i) => { if (v >= 0) done[i] = 1; });
      const zone = inside.map((v, i) => (v >= 0 && behind[i] >= 0 ? v : -1));
      if (!put(m, 'switch', id++, zone, rng, undefined, 2)) return null;
    }
    m.w0 = lv < 4 ? 2 : 3; // cargas do glitch; estado das paredes = 0
    const honest = solveFrom(m, true), s = solveFrom(m); // sem glitch também tem de haver saída
    if (!honest || !s || !sound(m)) return null;
    const gain = honest.length - s.length, flips = visited(m, s, 'switch');
    if (gain < 2 || flips < 1) return null;
    return finish(s, Math.min(gain, 24) + Math.min(flips, 4) * 12);
  }

  if (kind === 'stars') {
    const sets = lv < 4 ? 1 : 2;
    const picked = pickBridges(m, sets, rng);
    if (picked.length < sets) return null;
    picked.forEach((b, i) => addGate(m, b.u, b.v, 'bridge', i));
    const per = sets === 2 ? 3 : n;
    for (let c = 0; c < sets; c++) for (let i = 0; i < per; i++) {
      const prev = m.items.filter((x) => x.id === c).map((x) => x.c);
      const free = spots(m, rng, c === 0 ? reach(m, m.start) : undefined, 0.7).find((x) => apartFrom(m, x, prev, 4) && apartFrom(m, x, [m.start], 3));
      if (free === undefined) return null;
      m.items.push({ c: free, kind: 'star', id: c, k: i });
    }
    const s = solveFrom(m);
    if (!s || crossed(m, s) < sets) return null; // as pontes só nascem: nunca se fica preso
    const detour = s.length - plain;
    return finish(s, Math.min(detour, 28) + crossed(m, s) * 10);
  }

  // areias: espelhos, raios de sol e portas seladas
  const seals = lv < 3 ? 1 : 2, per = lv < 2 ? 1 : lv < 5 ? 2 : 3;
  const picked = pickBridges(m, seals, rng);
  if (picked.length < seals) return null;
  picked.forEach((b, i) => addGate(m, b.u, b.v, 'seal', i));
  m.beams = [];
  let solution = 0, mirrors = 0;
  for (let j = 0; j < seals; j++) {
    let made = false;
    for (let tries = 0; tries < 60 && !made; tries++) {
      const used = taken(m);
      const beamCells = new Set(m.beams.flatMap((_, i) => traceBeam(m, i, solution).cells));
      const side = (rng() * 4) | 0, along = rng();
      // a fonte fica na borda, virada para dentro
      const src = side === 0 ? (m.rows - 1) * m.cols + ((along * m.cols) | 0) : side === 2 ? (along * m.cols) | 0 : side === 1 ? ((along * m.rows) | 0) * m.cols : ((along * m.rows) | 0) * m.cols + m.cols - 1;
      let c = src, d = side, bits = 0, ok = true;
      const added: number[] = [], path = new Set<number>([src]);
      for (let i = 0; i <= per && ok; i++) {
        const len = 1 + ((rng() * 5) | 0);
        for (let q = 0; q < len && ok; q++) { c = neighbor(m, c, d); if (c < 0 || path.has(c) || added.includes(c)) ok = false; else path.add(c); }
        if (!ok) break;
        if (m.solid[c] || used.has(c) || beamCells.has(c)) { ok = false; break; }
        if (i < per) {
          const turn = rng() < 0.5 ? 1 : 3, nd = (d + turn) % 4;
          // qual das duas inclinações faz o raio virar de d para nd
          const bit = [[1, 0, 3, 2], [3, 2, 1, 0]].findIndex((t) => t[d] === nd);
          bits |= bit << (mirrors + i); added.push(c); d = nd;
        }
      }
      if (!ok || m.items.some((it) => path.has(it.c))) continue;
      added.forEach((cell, i) => m.items!.push({ c: cell, kind: 'mirror', id: mirrors + i, k: j }));
      m.items.push({ c, kind: 'seal', id: j });
      m.beams.push({ src, dir: side, target: c });
      solution |= bits; mirrors += per; made = true;
    }
    if (!made) return null;
  }
  if (!m.beams.every((_, j) => traceBeam(m, j, solution).hit)) return null;
  // começam trocados: pelo menos um espelho de cada raio tem de ser rodado
  let w0 = 0;
  for (let tries = 0; tries < 40; tries++) {
    w0 = solution;
    for (let j = 0; j < seals; j++) { const flip = 1 + ((rng() * ((1 << per) - 1)) | 0); w0 ^= flip << (j * per); }
    if (m.beams.every((_, j) => !traceBeam(m, j, w0).hit)) break;
  }
  if (m.beams.some((_, j) => traceBeam(m, j, w0).hit)) return null;
  m.w0 = w0 & ((1 << SEAL_SHIFT) - 1);
  const s = solveFrom(m);
  if (!s) return null; // as portas só abrem: nunca se fica preso
  const turns = s.filter((a) => a.type === 'turn').length;
  if (turns < seals || crossed(m, s) < seals) return null;
  return finish(s, Math.min(turns, 8) * 9 + crossed(m, s) * 10 + Math.min(s.length - plain, 20));
}

/** Passagens com certas casas bloqueadas (para saber o que se alcança sem pisar água). */
function block(m: Maze, cells: number[]): Uint8Array {
  const p = m.pass.slice();
  for (const c of cells) for (let d = 0; d < 4; d++) { const q = neighbor(m, c, d); if (q >= 0 && p[c] & DIRS[d].b) { p[c] &= ~DIRS[d].b; p[q] &= ~DIRS[OPP[d]].b; } }
  return p;
}
/** Comprimento da melhor rota no labirinto sem regra (a medida de «demasiado comprido»). */
function pathTour(m: Maze): number {
  return solve(m, { cell: m.start, flames: m.rosas, t: 0 })?.length ?? m.shortest;
}
export { INK_CAP };

/** O nível a usar: o candidato escolhido pela ferramenta (`pick`) ou, à falta dele, o melhor dos primeiros que sirvam. */
export function buildRuleLevel(p: MechParams, opts: MazeOpts): Maze {
  if (p.pick !== undefined) { const c = candidate(p, opts, p.pick); if (c) return c.m; }
  let best: Candidate | null = null, found = 0;
  for (let k = 0; k < 400 && found < 6; k++) {
    const c = candidate(p, opts, k);
    if (!c) continue;
    found++;
    if (!best || c.score > best.score) best = c;
  }
  if (!best) throw new Error(`sem nível para ${p.mech} (semente ${p.seed})`);
  return best.m;
}
