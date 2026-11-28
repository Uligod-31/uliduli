// Chama Viva (lógica pura, sem gráficos). A luz do Uli é a sua vida: cada passo gasta 1 e cada chama reacende-a
// por inteiro. «Soprar» gasta luz para abrir atalhos, e cada elemento reage à sua maneira.
// A luz máxima sai da melhor rota de cada nível, por isso dá sempre para o acabar sem soprar.
import { Maze, Element, DIRS, OPP, bestTour, distFrom } from './maze';
import { solve, rotCell } from './mech';
import { mulberry32, shuffle } from './rng';

export const PUDDLE = 3;      // luz extra que se perde de cada vez que se pisa uma poça
export const REVIVE = 0.45;   // fração da luz que um Vagalume reacende quando a chama se apaga
export const LURE_R = 8;      // casas a que o clarão de um sopro chama os guardas
export const LURE_TICKS = 4;  // vezes que eles te caçam depois desse clarão
export const GAS_R = 4;       // casas a que a explosão atordoa os guardas
export const LOW = 0.25;      // abaixo desta fração a chama está a morrer
const MIN_LIGHT = 34;
const PER_GUARD = 10;     // contornar guardas custa luz: cada um dá mais margem

export interface ElementDef { name: string; cost: number; back: number; tip: string; text: string; color: string; hex: number }
export const ELEMENTS: Record<Element, ElementDef> = {
  heras: { name: 'HERAS', cost: 8, back: 3, color: '#9dffaa', hex: 0x6ee87a, tip: 'Heras: gastam 8 de luz e devolvem 3',
    text: 'Sopra e as heras ardem: são lenha. Gastas 8 de luz e elas devolvem 3.\n\nO clarão chama os guardas.' },
  gelo: { name: 'GELO', cost: 7, back: 0, color: '#bdeeff', hex: 0x8fdcff, tip: 'Gelo: gasta 7 de luz e deixa uma poça',
    text: 'Sopra e o gelo derrete (7 de luz), mas fica uma poça: pisá-la apaga-te mais 3.\n\nO clarão chama os guardas.' },
  runa: { name: 'RUNA', cost: 6, back: 0, color: '#c9b6ff', hex: 0xa98bff, tip: 'Runa: gasta 6 de luz e abre',
    text: 'Sopra sobre a pedra: a runa acende-se e a passagem abre. Gasta 6 de luz.\n\nO clarão chama os guardas.' },
  gas: { name: 'GÁS', cost: 8, back: 0, color: '#e6ff7a', hex: 0xc8ff3a, tip: 'Gás: gasta 8 de luz, explode e atordoa',
    text: 'Sopra e o gás explode: abre a passagem e atordoa os guardas a 4 casas.\n\nGasta 8 de luz.' },
};

const open = (m: Maze, a: number, b: number, dir: number, on: boolean) => {
  if (on) { m.pass[a] |= DIRS[dir].b; m.pass[b] |= DIRS[OPP[dir]].b; }
  else { m.pass[a] &= ~DIRS[dir].b; m.pass[b] &= ~DIRS[OPP[dir]].b; }
};

/** Troços da melhor rota: passos do início à 1.ª chama, de chama em chama e da última à saída. */
export function routeLegs(m: Maze): number[] {
  const s = solve(m, { cell: m.start, flames: m.rosas, t: 0 });
  if (!s) return [m.par];
  let left = new Set(m.rosas), leg = 0;
  const legs: number[] = [];
  for (const a of s) {
    leg++;
    if (a.type === 'rot') left = new Set([...left].map((c) => (m.rings!.layer[c] === a.layer ? rotCell(m, c, 1) : c)));
    if (a.type === 'move') for (const c of a.path) if (left.delete(c)) { legs.push(leg); leg = 0; }
  }
  legs.push(leg);
  return legs;
}

/** Luz máxima: folga `k` sobre o troço mais longo da melhor rota, e o bastante para apanhar as chamas por qualquer ordem. */
export function lightBudget(m: Maze, k: number, guards = 0): number {
  let L = Math.max(MIN_LIGHT, Math.ceil(Math.max(...routeLegs(m)) * k) + 8);
  // no gelo e nos anéis a distância em casas não diz quantos passos são
  if (m.mech !== 'ice' && m.mech !== 'rings') {
    let far = 0;
    for (const p of [m.start, ...m.rosas]) {
      const d = distFrom(m, p);
      for (const q of p === m.start ? m.rosas : [...m.rosas, m.exit]) far = Math.max(far, d[q]);
    }
    L = Math.max(L, Math.ceil(far * 1.2) + 4);
  }
  return L + guards * PER_GUARD;
}

/**
 * Põe barreiras de sopro em paredes que, abertas, encurtam caminho: uma é um grande atalho, outra assim-assim
 * e as restantes poupam pouco para a rota ideal. Cabe ao jogador perceber quais valem a luz que custam.
 * Abrir uma parede só acrescenta caminhos, por isso nunca estraga a solução.
 */
export function addBarriers(m: Maze, kind: Element, count: number, seed: number) {
  const rng = mulberry32(seed * 613 + 29), n = m.cols * m.rows;
  const base = bestTour(m);
  const cands: { a: number; b: number; dir: number; dist: number; gain: number }[] = [];
  const free = (c: number) => !m.solid[c] && c !== m.exit && c !== m.start;
  for (let a = 0; a < n; a++) {
    if (!free(a)) continue;
    for (const dir of [1, 2]) {
      if (dir === 1 && a % m.cols === m.cols - 1) continue;
      const b = dir === 1 ? a + 1 : a + m.cols;
      if (b >= n || !free(b) || m.pass[a] & DIRS[dir].b) continue;
      if (m.dynMap.has(a * 4 + dir) || m.warp?.has(a * 4 + dir) || m.warp?.has(b * 4 + OPP[dir])) continue;
      const dist = distFrom(m, a)[b];
      if (dist < 6) continue;
      open(m, a, b, dir, true);
      cands.push({ a, b, dir, dist, gain: base - bestTour(m) });
      open(m, a, b, dir, false);
    }
  }
  shuffle(cands, rng);
  const out: NonNullable<Maze['barriers']> = [];
  const near = (x: number, y: number) => Math.abs((x % m.cols) - (y % m.cols)) + Math.abs(((x / m.cols) | 0) - ((y / m.cols) | 0)) < 3;
  const apart = (c: { a: number; b: number }) => out.every((o) => !near(o.a, c.a) && !near(o.b, c.b) && o.a !== c.b && o.b !== c.a);
  const take = (c?: (typeof cands)[number]) => { if (c && out.length < count && apart(c)) out.push({ a: c.a, b: c.b, dir: c.dir, kind }); };
  const byGain = [...cands].sort((x, y) => y.gain - x.gain || y.dist - x.dist);
  take(byGain[0]);
  if (byGain[0]) take(byGain.find((c) => apart(c) && c.gain > 0 && c.gain <= Math.max(4, byGain[0].gain * 0.55)));
  for (const c of cands) if (c.gain > 0) take(c);
  for (const c of cands) if (c.dist >= 8) take(c);
  for (const c of cands) take(c);
  m.barriers = out;
}

/** Acrescenta a um labirinto já construído a luz e (se o mundo as tiver) as barreiras. */
export function living(m: Maze, p: { seed: number; lightK?: number; element?: Element; barriers?: number; guards?: number }): Maze {
  m.light = lightBudget(m, p.lightK ?? 1.8, p.guards ?? 0);
  if (p.element) addBarriers(m, p.element, p.barriers ?? 3, p.seed);
  return m;
}

/** Barreira fechada encostada à casa; se houver várias, a que está para onde o Uli está virado. */
export function barrierNear(m: Maze, cell: number, facing: number): { k: number; side: number; other: number } | null {
  let found: { k: number; side: number; other: number } | null = null;
  m.barriers?.forEach((b, k) => {
    if (b.open) return;
    const side = b.a === cell ? b.dir : b.b === cell ? OPP[b.dir] : -1;
    if (side < 0) return;
    const hit = { k, side, other: b.a === cell ? b.b : b.a };
    if (!found || side === facing) found = hit;
  });
  return found;
}

export function openBarrier(m: Maze, k: number) {
  const b = m.barriers![k];
  b.open = true;
  open(m, b.a, b.b, b.dir, true);
}
