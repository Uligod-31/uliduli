// As oito regras da Vaga 3 (lógica pura). Cada regra guarda tudo num só número `w` e diz, para cada passo,
// por onde se pode ir e como o estado muda. O jogo, o solver (par, pistas) e o robô usam estas mesmas funções,
// por isso o que o jogo deixa fazer é exatamente o que está provado que tem solução.
import { Maze, Gate, Item, DIRS, OPP, neighbor, canPass } from './maze';

export const RULE_KINDS = ['size', 'mounts', 'echo', 'roots', 'ink', 'glitch', 'stars', 'sun'] as const;
export type RuleKind = (typeof RULE_KINDS)[number];
export const isRule = (k?: string): k is RuleKind => !!k && (RULE_KINDS as readonly string[]).includes(k);

export interface Step { path: number[]; w: number; glitch?: boolean }
export interface InPlace { type: 'wait' | 'turn'; w: number }
export interface Rule {
  /** passo na direção `d`; null = não se pode. `glitch` = atravessar a parede (só Neon). */
  step(m: Maze, from: number, d: number, w: number, glitch?: boolean): Step | null;
  /** ações sem sair do sítio (`plan`: só as que ainda podem adiantar o caminho) */
  acts(m: Maze, cell: number, w: number, plan?: boolean): InPlace[];
  /** fim do turno; null = a chama apaga-se (só onde a luz conta) */
  end(m: Maze, cell: number, w: number, gotFlame: boolean): number | null;
}

// ───────────────────────── Consultas rápidas ─────────────────────────
interface Index { ng: number; ni: number; nw: number; nb: number; gate: Map<number, Gate>; item: Map<number, Item>; water: Map<number, number>; soft: Set<number>; stops?: Uint8Array }
const cache = new WeakMap<Gate[] | Item[], Index>();
export function indexOf(m: Maze): Index {
  const key = m.items ?? m.gates!;
  // o gerador vai acrescentando peças: se as contagens mudaram, a tabela faz-se de novo
  // (é chamada milhões de vezes pelo solver: só se comparam números)
  const ng = m.gates?.length ?? 0, ni = m.items?.length ?? 0, nw = m.water?.length ?? 0, nb = m.barriers?.length ?? 0;
  let x = cache.get(key);
  if (!x || x.ng !== ng || x.ni !== ni || x.nw !== nw || x.nb !== nb) {
    x = { ng, ni, nw, nb, gate: new Map(), item: new Map(), water: new Map(), soft: new Set() };
    for (const g of m.gates ?? []) { x.gate.set(g.a * 4 + g.dir, g); x.gate.set(g.b * 4 + OPP[g.dir], g); }
    for (const it of m.items ?? []) x.item.set(it.c, it);
    (m.water ?? []).forEach((c, k) => x!.water.set(c, k));
    for (const b of m.barriers ?? []) { x.soft.add(b.a * 4 + b.dir); x.soft.add(b.b * 4 + OPP[b.dir]); }
    cache.set(key, x);
  }
  return x;
}
export const gateAt = (m: Maze, from: number, d: number) => indexOf(m).gate.get(from * 4 + d);
export const itemAt = (m: Maze, c: number) => indexOf(m).item.get(c);
const fixed = (m: Maze, from: number, d: number) => (m.pass[from] & DIRS[d].b) !== 0;

const still: Rule['end'] = (_m, _c, w) => w;
const none: Rule['acts'] = () => [];

// ───────────────────────── Jardim: cogumelos que mudam o tamanho ─────────────────────────
export const SMALL = 0, NORMAL = 1, GIANT = 2;
const size: Rule = {
  step(m, from, d, w) {
    if (!fixed(m, from, d)) {
      const g = gateAt(m, from, d);
      if (!g || (g.kind === 'crack' ? w !== SMALL : w !== GIANT)) return null; // fendas: só pequeno; sebes baixas: só gigante
    }
    const n = neighbor(m, from, d), it = itemAt(m, n);
    return { path: [n], w: it?.kind === 'shrink' ? Math.max(SMALL, w - 1) : it?.kind === 'grow' ? Math.min(GIANT, w + 1) : w };
  },
  acts: none, end: still,
};

// ───────────────────────── Reino Animal: montarias ─────────────────────────
export const ELEPHANT = 1, MONKEY = 2, GAZELLE = 3;
export const mountOf = (w: number) => w & 3;
export const smashed = (w: number, id: number) => ((w >> (2 + id)) & 1) === 1;
const MOUNT: Record<string, number> = { elephant: ELEPHANT, monkey: MONKEY, gazelle: GAZELLE };

/** Passagem do desenho do labirinto: as barreiras de sopro não contam, nem depois de abertas. */
const design = (m: Maze, from: number, d: number) => fixed(m, from, d) && !indexOf(m).soft.has(from * 4 + d);
/** Onde a gazela pára: cruzamentos, becos e tudo o que interessa (nunca passa por cima de uma chama ou de um item). */
function stops(m: Maze): Uint8Array {
  const x = indexOf(m);
  if (x.stops) return x.stops;
  const s = new Uint8Array(m.cols * m.rows);
  for (let i = 0; i < s.length; i++) {
    let deg = 0;
    for (let d = 0; d < 4; d++) if (design(m, i, d)) deg++;
    if (deg !== 2) s[i] = 1;
  }
  for (const c of [m.start, m.exit, ...m.rosas, ...(m.items ?? []).map((i) => i.c), ...(m.gates ?? []).flatMap((g) => [g.a, g.b])]) s[c] = 1;
  x.stops = s;
  return s;
}

const mounts: Rule = {
  step(m, from, d, w) {
    const ride = mountOf(w);
    let nw = w;
    if (!fixed(m, from, d)) {
      const g = gateAt(m, from, d);
      if (!g) return null;
      if (g.kind === 'rock') { if (!smashed(w, g.id)) { if (ride !== ELEPHANT) return null; nw |= 1 << (2 + g.id); } } // o elefante parte
      else if (ride !== MONKEY) return null;                                                                        // ramos: só o macaco
    }
    let n = neighbor(m, from, d);
    const path = [n];
    if (ride === GAZELLE) {
      // corre o corredor inteiro, curvas incluídas
      const stop = stops(m);
      let dir = d;
      while (!stop[n] && path.length < 60) {
        let next = -1;
        for (let k = 0; k < 4; k++) if (k !== OPP[dir] && design(m, n, k)) { next = k; break; }
        if (next < 0) break;
        dir = next; n = neighbor(m, n, dir); path.push(n);
      }
    }
    const it = itemAt(m, n);
    if (it && MOUNT[it.kind]) nw = (nw & ~3) | MOUNT[it.kind];
    return { path, w: nw };
  },
  acts: none, end: still,
};

// ───────────────────────── Cidade-Relógio: o eco ─────────────────────────
export const ECHO_K = 6;  // passos até o eco chegar ao botão
export const ECHO_W = 4;  // passos em que ele o segura (e o portão fica aberto)
export const echoTimer = (w: number, id: number) => (w >> (4 * id)) & 15;
export const echoOpen = (w: number, id: number) => { const c = echoTimer(w, id); return c >= 1 && c <= ECHO_W; };

const echo: Rule = {
  step(m, from, d, w) {
    if (!fixed(m, from, d)) {
      const g = gateAt(m, from, d);
      // por dentro o portão abre sempre (nunca se fica preso); por fora só enquanto o eco segura o botão
      if (!g || (from !== g.inside && !echoOpen(w, g.id))) return null;
    }
    return { path: [neighbor(m, from, d)], w };
  },
  acts: (_m, _c, w) => [{ type: 'wait', w }],
  end(m, cell, w) {
    let out = w;
    for (const g of m.gates!) { const c = echoTimer(out, g.id); if (c > 0) out -= 1 << (4 * g.id); }
    const it = itemAt(m, cell);
    if (it?.kind === 'plate' && echoTimer(out, it.id) === 0) out |= (ECHO_K + ECHO_W) << (4 * it.id); // dá corda ao botão
    return out;
  },
};

// ───────────────────────── Floresta Élfica: raízes que sentem a chama ─────────────────────────
export const moonAt = (m: Maze) => Math.floor(m.light! * 0.45); // flores de lua: abrem com a chama fraca
export const sunAt = (m: Maze) => Math.ceil(m.light! * 0.7);    // raízes de sol: abrem com a chama forte
const roots: Rule = {
  step(m, from, d, w) {
    if (!fixed(m, from, d)) {
      const g = gateAt(m, from, d);
      if (!g || (g.kind === 'moon' ? w > moonAt(m) : w < sunAt(m))) return null;
    }
    return { path: [neighbor(m, from, d)], w };
  },
  acts: (_m, _c, w) => [{ type: 'wait', w }],
  end: (m, _c, w, got) => (got ? m.light! : w > 1 ? w - 1 : null), // o estado é a própria luz
};

// ───────────────────────── Oceano de Tinta: pintar o caminho ─────────────────────────
export const INK_CAP = 4;
export const inkOf = (w: number) => w & 7;
export const painted = (w: number, k: number) => ((w >> (3 + k)) & 1) === 1;
const ink: Rule = {
  step(m, from, d, w) {
    if (!fixed(m, from, d)) return null;
    const n = neighbor(m, from, d), k = indexOf(m).water.get(n);
    let nw = w;
    if (k !== undefined && !painted(w, k)) { if (!inkOf(w)) return null; nw = (nw - 1) | (1 << (3 + k)); }
    if (itemAt(m, n)?.kind === 'inkpot') nw = (nw & ~7) | INK_CAP;
    return { path: [n], w: nw };
  },
  acts: none, end: still,
};

// ───────────────────────── Neon Glitch: atravessar paredes e trocar blocos ─────────────────────────
export const chargesOf = (w: number) => w & 3;
export const phaseOf = (w: number) => (w >> 2) & 1;
const glitch: Rule = {
  step(m, from, d, w, through) {
    const open = canPass(m, from, d, phaseOf(w));
    const n = neighbor(m, from, d);
    let nw = w;
    if (through) {
      if (open || !chargesOf(w) || n < 0 || m.solid[n]) return null;
      if (Math.abs((n % m.cols) - (from % m.cols)) + Math.abs(((n / m.cols) | 0) - ((from / m.cols) | 0)) !== 1) return null;
      nw -= 1;
    } else if (!open) return null;
    if (itemAt(m, n)?.kind === 'switch') nw ^= 4;
    return { path: [n], w: nw, glitch: through };
  },
  acts: none, end: still,
};

// ───────────────────────── Estelar: constelações ─────────────────────────
export const starCount = (m: Maze, c: number) => m.items!.filter((i) => i.kind === 'star' && i.id === c).length;
export const progressOf = (w: number, c: number) => (w >> (4 * c)) & 15;
const stars: Rule = {
  step(m, from, d, w) {
    if (!fixed(m, from, d)) {
      const g = gateAt(m, from, d);
      if (!g || progressOf(w, g.id) < starCount(m, g.id)) return null;
    }
    const n = neighbor(m, from, d), it = itemAt(m, n);
    return { path: [n], w: it?.kind === 'star' && progressOf(w, it.id) === it.k ? w + (1 << (4 * it.id)) : w };
  },
  acts: none, end: still,
};

// ───────────────────────── Reino das Areias: espelhos e raios de sol ─────────────────────────
export const SEAL_SHIFT = 6;
export const mirrorBit = (w: number, id: number) => (w >> id) & 1;
export const sealOpen = (w: number, j: number) => ((w >> (SEAL_SHIFT + j)) & 1) === 1;
// «/» (bit 0) e «\» (bit 1): para onde segue um raio que ia na direção d
const BOUNCE = [[1, 0, 3, 2], [3, 2, 1, 0]];

/** Caminho do raio j com os espelhos em `w`: casas por onde passa e se chega ao selo. */
export function traceBeam(m: Maze, j: number, w: number): { cells: number[]; hit: boolean } {
  const B = m.beams![j], cells: number[] = [];
  let c = B.src, d = B.dir;
  for (let k = 0; k < m.cols * m.rows * 2 && c >= 0; k++) {
    cells.push(c);
    if (c === B.target) return { cells, hit: true };
    const it = itemAt(m, c);
    if (it?.kind === 'mirror') d = BOUNCE[mirrorBit(w, it.id)][d];
    c = neighbor(m, c, d);
  }
  return { cells, hit: false };
}
/** Os selos que um raio alcança ficam abertos para sempre. */
export function lightSeals(m: Maze, w: number): number {
  for (let j = 0; j < m.beams!.length; j++) if (!sealOpen(w, j) && traceBeam(m, j, w).hit) w |= 1 << (SEAL_SHIFT + j);
  return w;
}
const sun: Rule = {
  step(m, from, d, w) {
    if (!fixed(m, from, d)) {
      const g = gateAt(m, from, d);
      if (!g || !sealOpen(w, g.id)) return null;
    }
    return { path: [neighbor(m, from, d)], w };
  },
  acts(m, cell, w, plan) {
    const it = itemAt(m, cell);
    // depois de o selo abrir, rodar esses espelhos só serve para apontar o raio aos guardas
    if (it?.kind !== 'mirror' || (plan && sealOpen(w, it.k!))) return [];
    return [{ type: 'turn', w: lightSeals(m, w ^ (1 << it.id)) }];
  },
  end: still,
};

export const RULES: Record<RuleKind, Rule> = { size, mounts, echo, roots, ink, glitch, stars, sun };

/** Quantos valores o estado pode ter (para o solver marcar o que já visitou). */
export function stateSpace(m: Maze): number {
  switch (m.mech as RuleKind) {
    case 'size': return 3;
    case 'mounts': return 4 << (m.gates?.length ?? 0);
    case 'echo': return 1 << (4 * (m.gates?.length ?? 0));
    case 'roots': return m.light! + 1;
    case 'ink': return 8 << (m.water?.length ?? 0);
    case 'glitch': return 8;
    case 'stars': return 256;
    case 'sun': return 256;
  }
}

/** Estado inicial de um nível (nas raízes é a luz cheia). */
export const startState = (m: Maze) => (m.mech === 'roots' ? m.light! : m.w0 ?? (m.mech === 'size' ? NORMAL : 0));

/** O que, uma vez aberto, fica aberto para toda a gente (guardas incluídos): rochas partidas, selos e pontes. */
export function openedForAll(m: Maze, g: Gate, w: number): boolean {
  if (g.kind === 'rock') return smashed(w, g.id);
  if (g.kind === 'seal') return sealOpen(w, g.id);
  if (g.kind === 'bridge') return progressOf(w, g.id) >= starCount(m, g.id);
  return false;
}
