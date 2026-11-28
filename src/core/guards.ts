// Os guardas (lógica pura), partilhada pelo jogo e pelo robô: onde nascem, por onde passam, como caçam
// e o que cada regra da Vaga 3 lhes faz.
import { Maze, canPass, neighbor, distFrom, DIRS, OPP } from './maze';
import { mulberry32, shuffle } from './rng';
import { cloudBit } from './mech';
import { gateAt, indexOf, openedForAll, painted, phaseOf, SMALL, GIANT, traceBeam } from './rules';
import { GUARD_HUNT } from '../worlds';
import { LURE_R } from './viva';

export interface GuardCtx { phase: number; w: number; gone: number; lure?: number }

export const ZAP_STUN = 4; // passos que um guarda fica a dormir depois de apanhar com um raio de sol

/** Nascem longe do início, nunca em cima de chamas, da saída ou da água, e afastados uns dos outros. */
export function spawnGuards(m: Maze, n: number, seed: number): number[] {
  const out: number[] = [];
  if (!n) return out;
  const rng = mulberry32(seed * 17 + 3);
  let space = m;
  if (m.gates?.length) {
    // para medir distâncias, os portões contam como passagens
    const pass = m.pass.slice();
    for (const g of m.gates) { pass[g.a] |= DIRS[g.dir].b; pass[g.b] |= DIRS[OPP[g.dir]].b; }
    space = { ...m, pass };
  }
  const dist = distFrom(space, m.start, m.mech === 'page' || m.mech === 'glitch' ? 0 : -1);
  const far = Array.from({ length: m.cols * m.rows }, (_, i) => i)
    .filter((i) => !m.solid[i] && i !== m.exit && i !== m.start && !m.rosas.includes(i) && !m.water?.includes(i) && dist[i] >= Math.max(7, m.shortest * 0.35));
  shuffle(far, rng);
  for (const c of far) {
    if (out.length >= n) break;
    if (out.every((g) => Math.abs((g % m.cols) - (c % m.cols)) + Math.abs(((g / m.cols) | 0) - ((c / m.cols) | 0)) >= 5)) out.push(c);
  }
  return out;
}

/** Um guarda pode passar daqui para ali? Só usa o que está aberto para toda a gente. */
export function guardOpen(m: Maze, from: number, d: number, c: GuardCtx): boolean {
  if (!canPass(m, from, d, m.mech === 'glitch' ? phaseOf(c.w) : c.phase)) {
    const g = m.gates ? gateAt(m, from, d) : undefined;
    if (!g || !openedForAll(m, g, c.w)) return false;
  }
  const n = neighbor(m, from, d);
  if (m.water) { const k = indexOf(m).water.get(n); if (k !== undefined && !painted(c.w, k)) return false; } // água por pintar
  const cb = cloudBit(m, n);
  return cb < 0 || !(c.gone & (1 << cb));
}

/** Distâncias pelo que os guardas podem andar. */
export function guardDist(m: Maze, from: number, c: GuardCtx): Int32Array {
  const dist = new Int32Array(m.cols * m.rows).fill(-1), q = [from];
  dist[from] = 0;
  for (let h = 0; h < q.length; h++) for (let d = 0; d < 4; d++) {
    // os caminhos dos guardas são de ida e volta; mede-se a partir do jogador
    if (!guardOpen(m, q[h], d, { ...c, gone: 0 })) continue;
    const n = neighbor(m, q[h], d);
    if (n >= 0 && dist[n] < 0) { dist[n] = dist[q[h]] + 1; q.push(n); }
  }
  return dist;
}

/**
 * Para onde vai um guarda: persegue quando fareja (ou viu o clarão), senão patrulha sem voltar atrás.
 * Jardim: a um Uli pequeno não fareja; de um Uli gigante foge.
 */
export function guardMove(m: Maze, from: number, prev: number, others: number[], dist: Int32Array, c: GuardCtx, rnd: () => number): number | null {
  const opts: number[] = [];
  for (let d = 0; d < 4; d++) if (guardOpen(m, from, d, c)) opts.push(neighbor(m, from, d));
  if (!opts.length) return null;
  const near = dist[from] >= 0 && (dist[from] <= GUARD_HUNT || ((c.lure ?? 0) > 0 && dist[from] <= LURE_R));
  const sees = near && !(m.mech === 'size' && c.w === SMALL);
  if (sees) {
    const flee = m.mech === 'size' && c.w === GIANT;
    const dd = (o: number) => (dist[o] < 0 ? 99 : dist[o]);
    const best = (flee ? Math.max : Math.min)(...opts.map(dd));
    const cands = opts.filter((o) => dd(o) === best);
    return cands.find((o) => !others.includes(o)) ?? cands[0];
  }
  const fwd = opts.filter((o) => o !== prev);
  const pool = fwd.length ? fwd : opts;
  return pool[Math.floor(rnd() * pool.length)];
}

/** O que acontece quando o Uli e um guarda se encontram: o gigante derruba-os. */
export const collision = (m: Maze, w: number): 'catch' | 'stun' => (m.mech === 'size' && w === GIANT ? 'stun' : 'catch');

/** Casas onde há um raio de sol aceso (quem lá estiver adormece). */
export function sunlit(m: Maze, w: number): Set<number> {
  return new Set(m.beams ? m.beams.flatMap((_, j) => traceBeam(m, j, w).cells) : []);
}
