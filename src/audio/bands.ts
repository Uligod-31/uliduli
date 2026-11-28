// As bandas do ÜLidÜLi: uma por mundo, cada uma com o seu género, afinação, riffs, bateria e instrumentos.
// É com este «vocabulário» que o compositor (composer.ts) escreve um tema diferente para cada nível.
// Células de guitarra: «p» pedal abafado, «P» pedal aberto, «a b c» acordes abertos noutras notas, «am bm» abafados,
// «an bn cn pn» notas soltas, «-» prolonga, «.» pausa. No refrão, a nota-base («p») é o acorde do momento.
import type { ArpKind, DrumKey, LeadKind, PadKind } from './render';
import type { Tone } from './instruments';

export type Part = 'I' | 'V' | 'C' | 'B';
export type Kit = Partial<Record<DrumKey, string[]>>;

export interface Guitar { tone: Tone; cells: string[]; /** a guitarra segue o acorde do compasso */ follow?: boolean }

export interface Band {
  band: string; style: string;
  /** frase que explica o som da banda na Discoteca */
  story: string;
  bpm: number;
  root: number;
  scale: number[];
  /** progressões de acordes (4 compassos) */
  progs: string[];
  /** notas possíveis para as vozes «a b c» dos riffs */
  pitches: number[];
  gtr: Partial<Record<Part, Guitar>>;
  drums: Record<Part, Kit[]>;
  lead?: Partial<Record<Part, { kind: LeadKind; up: number; rhythms: string[] }>>;
  arp?: Partial<Record<Part, { kind: ArpKind; up: number; figure: number[] }>>;
  pad?: Partial<Record<Part, PadKind>>;
  /** passos por compasso em cada parte (16 se não se disser) */
  meter?: Partial<Record<Part, number>>;
  /** formas possíveis da música */
  forms: string[];
}

const MIN = [0, 2, 3, 5, 7, 8, 10], PHR = [0, 1, 3, 5, 7, 8, 10], HIJ = [0, 1, 4, 5, 7, 8, 10], HAR = [0, 2, 3, 5, 7, 8, 11];
const DOR = [0, 2, 3, 5, 7, 9, 10], LOC = [0, 1, 3, 5, 6, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11], LYD = [0, 2, 4, 6, 7, 9, 11];

// ───────────── baterias ─────────────
const ROCK: Kit = { k: ['x.....x.x.x.....', 'x.....x.x...x.x.'], s: ['....x.......x...'], h: ['x.x.x.x.x.x.x.x.'] };
const BIG: Kit = { k: ['x.....x.x.x...x.'], s: ['....X.......X...'], o: ['x.x.x.x.x.x.x.x.'], c: ['X...............', '................'] };
const PUNK: Kit = { k: ['x...x.x.x...x.x.'], s: ['....X.......X...'], o: ['x.x.x.x.x.x.x.x.'], c: ['X.......x.......', 'X...............'] };
const FOUR: Kit = { k: ['x...x...x...x...'], s: ['....x.......x...'], h: ['..x...x...x...x.'] };
const FOURBIG: Kit = { k: ['x...x...x...x...'], s: ['....X.......X...'], o: ['..x...x...x...x.'], c: ['X...............', '................'] };
const GALLOP: Kit = { k: ['x.xxx.xxx.xxx.xx'], s: ['....x.......x...'], r: ['x.x.x.x.x.x.x.x.'], c: ['X...............', '................'] };
const DOUBLE: Kit = { k: ['xxxxxxxxxxxxxxxx'], s: ['....X.......X...'], r: ['x...x...x...x...'], c: ['X...............', '................'] };
const HALF: Kit = { k: ['x......x.x......', 'x......x.x....x.'], s: ['........X.......'], o: ['x...x...x...x...'], c: ['X...............', '................'] };
const DOOM: Kit = { k: ['x.........x.....', 'x.......x.x.....'], s: ['........X.......'], r: ['x...x...x...x...'], c: ['X...............', '................'] };
const SOFT: Kit = { k: ['x.......x.......'], s: ['....o.......o...'], r: ['x...x...x...x...'] };
const GROOVE: Kit = { k: ['x..xx...x..x...x', 'x..xx...x..x.x..'], s: ['....X.......X...'], z: ['X.......x.......', 'x.......x.......'] };
const BOUNCE: Kit = { k: ['x..x......x..x..', 'x..x......x.....'], s: ['....X.......X...'], h: ['x...x...x...x...'], c: ['X...............', '................', '................', '................'] };
const SHUFFLE: Kit = { k: ['x..x..x.x..x....'], s: ['....X.......X...'], o: ['x..xx..xx..xx..x'] };
const WAR: Kit = { w: ['X..x..X.x..X..x.', 'X..x..X.x.xxX.X.'] };
const MARCH: Kit = { k: ['x...x...x...x...'], s: ['....x..x....x.xx'], c: ['X...............', '................', '................', '................'] };
const TRIBE: Kit = { t: ['1.12..3.1.12.333', '1.11..2.3.11.232'], k: ['x...x...x...x...'], w: ['x.......x.......'] };
const TRIBEBIG: Kit = { t: ['..1...2...1...33'], k: ['x..x..x.x..x..x.'], s: ['....X.......X...'], c: ['X...............', '................'], w: ['x.......x.......'] };
const ELECTRO: Kit = { k: ['x..x..x.x..x..x.'], s: ['....x.......x...'], i: ['xxxxxxxxxxxxxxxx'], x: ['..........x.....', '................'] };
const MACHINE: Kit = { k: ['x...x...x...x...'], i: ['xxxxxxxxxxxxxxxx'], x: ['....x.......x...'] };
const COSMIC: Kit = { k: ['x.......x.x.....'], s: ['....x.......x...'], r: ['x.x.x.x.x.x.x.x.'] };
const PULSE: Kit = { k: ['x.......x.......'], i: ['..x...x...x...x.'] };
const NONE: Kit = {};
// 7/8 (14 passos)
const ODD: Kit = { k: ['x.....x...x...', 'x...x.....x.x.'], s: ['....x.......x.'], h: ['x.x.x.x.x.x.x.'] };
const ODDBIG: Kit = { k: ['x..x..x...x...', 'x..x..x.x.x...'], s: ['....X.......X.'], r: ['x...x...x...x.'], c: ['X.............', '..............'] };

export const BANDS: Record<string, Band> = {
  menu: {
    band: 'Faísca Solta', style: 'Rock alternativo a abrir', story: 'A banda do próprio Uli: rápida, luminosa, com refrão para cantar.',
    bpm: 168, root: 40, scale: MIN, progs: ['0m 8M 3M 10M'], pitches: [3, 5, 7, 8, 10, 12],
    gtr: { V: { tone: 'crunch', cells: ['p p p p a - p p b - p p c - a -'] }, C: { tone: 'metal', cells: ['P - - P - - P - - - P - - - P -'], follow: true } },
    drums: { I: [ROCK], V: [ROCK], C: [BIG], B: [PUNK] }, forms: ['IVCB'],
  },
  egipto: {
    band: 'Escaravelho de Ferro', style: 'Heavy clássico a galope', story: 'Cavalgada no deserto, escala oriental e duas guitarras a cantar juntas.',
    bpm: 146, root: 40, scale: HIJ, progs: ['0m 1M 0m 10m', '0m 8M 10m 0m', '0m 5m 1M 0m', '8M 10m 0m 0m', '0m 1M 4M 1M'], pitches: [1, 4, 5, 7, 8, 12],
    gtr: {
      I: { tone: 'crunch', cells: ['an - bn - cn - bn - an - pn - an - bn -', 'pn - an bn cn - bn - an - bn an pn - - -'] },
      V: { tone: 'metal', cells: ['p - p p p - p p p - p p a - b -', 'p - p p a - p - p p b - c - b -', 'p p p - p p a - p p p - b - a -', 'p - p p p - p p c - b - a - - -'] },
      C: { tone: 'metal', cells: ['P - - - - - p p p - p p P - - -', 'P - p p P - p p P - p p P - - -'], follow: true },
      B: { tone: 'metal', cells: ['p - p p p - p p a - - - P - - -'] },
    },
    drums: { I: [{ ...WAR, i: ['x...x.x.x...x.x.'] }, MARCH], V: [GALLOP], C: [FOURBIG, BIG], B: [MARCH] },
    lead: { C: { kind: 'twin', up: 36, rhythms: ['x - x - x - - - x - x - x - x -', 'x - - - x - x - x - - - x - x -', 'x - - x - - x - x - - - - - x -'] } },
    arp: { I: { kind: 'harp', up: 36, figure: [0, 1, 2, 1, 3, 2, 1, 2] } }, pad: { C: 'men' }, forms: ['IVCB', 'IVCV', 'VCBC', 'IVBC'],
  },
  b612: {
    band: 'Rosa de Aço', style: 'Groove metal', story: 'Um planeta pequeno com um riff enorme, pesado e gingão.',
    bpm: 112, root: 38, scale: MIN, progs: ['0m 3M 5m 3M', '0m 10M 8M 10M', '0m 0m 6M 5m', '5m 3M 0m 0m'], pitches: [3, 5, 6, 7, 10],
    gtr: {
      I: { tone: 'crunch', cells: ['pn - - an - - bn - pn - - cn - bn an -'] },
      V: { tone: 'metal', cells: ['p p . p a - . p p . b - a - p .', 'p . p b - p . p c - b - a - . .', 'p - . p p a - . p . p b - a c -'] },
      C: { tone: 'metal', cells: ['P - - - p p P - - - p p P - p p', 'P - - P - - P - p p p p P - - -'], follow: true },
      B: { tone: 'metal', cells: ['P - - . . . P - - . . . a - - .'] },
    },
    drums: { I: [SOFT, ROCK], V: [GROOVE, SHUFFLE], C: [BIG, SHUFFLE], B: [HALF] },
    lead: { C: { kind: 'gtr', up: 24, rhythms: ['x - - - - - x - x - - - - - - -', 'x - - x - - x - - - x - x - - -'] } },
    arp: { I: { kind: 'harp', up: 24, figure: [0, 2, 3, 2, 4, 3, 2, 1] } }, forms: ['IVCB', 'VCVC', 'IVCV', 'VBVC'],
  },
  jardim: {
    band: 'Sebes Tortas', style: 'Nu metal aos saltos', story: 'Afinação muito baixa, ressalto, notas tortas e uma voz que resmunga.',
    bpm: 96, root: 35, scale: PHR, progs: ['0m 1M 0m 8M', '0m 0m 3M 1M', '8M 1M 0m 0m', '0m 5m 1M 0m'], pitches: [1, 6, 7, 8, 13],
    gtr: {
      I: { tone: 'clean', cells: ['pn - an - . . pn - bn - an - . . cn -', 'an - . pn - - bn - . . an - pn - - -'] },
      V: { tone: 'fuzz', cells: ['p . . p . . a - . . p p . . b -', 'p p . . a - . p . . p . b - a .', '. . p . p . . a - - . p p . c -'] },
      C: { tone: 'metal', cells: ['P - - p . p P - - p . p a - - -', 'P - - - P - . p p . p . a - - -'], follow: true },
      B: { tone: 'metal', cells: ['P - . . p p . . P - . . a - . .'] },
    },
    drums: { I: [SOFT, BOUNCE], V: [BOUNCE], C: [HALF, GROOVE], B: [GROOVE] },
    lead: { V: { kind: 'hum', up: 24, rhythms: ['. . . . x - x - . . x - - - . .', '. . x - . . x - x - - - . . . .'] }, C: { kind: 'hum', up: 36, rhythms: ['x - - - - - x - x - - - x - - -', 'x - - x - - - - x - x - - - - -'] } },
    forms: ['IVCB', 'VCVC', 'IVCV', 'IVBC'],
  },
  demoniaco: {
    band: 'Grilhões', style: 'Groove em afinação funda', story: 'A guitarra mais grave do jogo, aos solavancos, com melodia torta por cima.',
    bpm: 102, root: 34, scale: LOC, progs: ['0m 1M 0m 6M', '0m 6M 5m 1M', '1M 0m 1M 6M', '0m 0m 3M 1M'], pitches: [1, 3, 6, 7, 13],
    gtr: {
      I: { tone: 'metal', cells: ['P - - - - - - - a - - - - - - -'] },
      V: { tone: 'metal', cells: ['p . . p p . . . P - . p . a . p', 'p p p . . a - . p p . . b - a .', 'p . p . p p a - . . p . p b - .'] },
      C: { tone: 'metal', cells: ['p p p p . . P - p p p p . . a -', 'P - . p p . P - . p p . a - b -'], follow: true },
      B: { tone: 'metal', cells: ['P - - . . . P - - . . . a - - .'] },
    },
    drums: { I: [WAR, HALF], V: [GROOVE], C: [{ k: ['xxxx..x.xxxx..x.'], s: ['....X.......X...'], c: ['X.......X.......'] }, DOUBLE], B: [HALF] },
    lead: { C: { kind: 'gtr', up: 24, rhythms: ['x - - - x - - - x - - - x - x -', 'x - - - - - - - x - - - x - - -'] } },
    pad: { I: 'men' }, forms: ['IVCB', 'VCBC', 'IVCV', 'VBCV'],
  },
  glaciar: {
    band: 'Sepulcro Branco', style: 'Death metal gelado', story: 'Lento a esmagar, depois uma nevasca de palhetadas e bombo duplo.',
    bpm: 108, root: 34, scale: LOC, progs: ['0m 1M 3m 1M', '0m 6M 1M 0m', '0m 3m 6M 5m', '1M 0m 6M 1M'], pitches: [1, 3, 5, 6, 8],
    gtr: {
      I: { tone: 'fuzz', cells: ['P - - - - - - - - - - - a - - -'] },
      V: { tone: 'fuzz', cells: ['pn pn pn pn pn pn pn pn an an an an bn bn bn bn', 'pn pn pn pn an an an an pn pn pn pn bn bn cn cn', 'an an an an pn pn pn pn bn bn bn bn pn pn pn pn'] },
      C: { tone: 'metal', cells: ['P - - - - - - - p p p . P - - -', 'P - - - - - p p P - - - - - - -'], follow: true },
      B: { tone: 'fuzz', cells: ['P - - - - - - - - - - - - - - -', 'a - - - - - - - b - - - - - - -'] },
    },
    drums: { I: [DOOM], V: [DOUBLE, { k: ['x.x.x.x.x.x.x.x.'], s: ['.x.x.x.x.x.x.x.x'], r: ['x.x.x.x.x.x.x.x.'] }], C: [DOOM, HALF], B: [DOOM] },
    lead: { C: { kind: 'gtr', up: 24, rhythms: ['x - - - - - - - x - - - - - - -', 'x - - - x - - - x - - - - - - -'] } },
    pad: { I: 'men', C: 'men' }, forms: ['IVCB', 'VCBC', 'ICVC', 'IVCV'],
  },
  relogio: {
    band: 'Mola Mestra', style: 'Industrial marcial', story: 'Tiquetaque, bigornas e riffs secos; um sino dá as horas.',
    bpm: 124, root: 38, scale: PHR, progs: ['0m 8M 3M 10M', '0m 0m 5m 7M', '0m 1M 0m 10m', '8M 10M 0m 0m'], pitches: [1, 3, 5, 7, 8],
    gtr: {
      V: { tone: 'metal', cells: ['p . p . . p p . p . p . a . a .', 'p . . p p . . p . p . . a - . .', 'p p . . p p . . p p . . a . b .'] },
      C: { tone: 'metal', cells: ['P - - - P - - - P - - - P - p p', 'P - - - - - P - P - - - p p p p'], follow: true },
      B: { tone: 'metal', cells: ['p . . . . . . . p p . . . . . .'] },
    },
    drums: { I: [MACHINE], V: [{ ...FOUR, x: ['..............x.', '................'], i: ['x.x.x.x.x.x.x.x.'] }], C: [{ ...FOURBIG, x: ['....x.......x...'] }], B: [MACHINE] },
    lead: { I: { kind: 'bell', up: 36, rhythms: ['x - - - x - - - x - - - x - - -'] }, C: { kind: 'bell', up: 36, rhythms: ['x - x - x - x - x - x - x - x -', 'x - - - x - x - x - - - x - x -'] } },
    pad: { C: 'men' }, forms: ['IVCB', 'IVCV', 'VCBC', 'IVBC'],
  },
  biblioteca: {
    band: 'Tomo Proibido', style: 'Neoclássico progressivo', story: 'Cravo a correr pelas estantes e guitarras gémeas em escala antiga.',
    bpm: 136, root: 40, scale: HAR, progs: ['0m 5m 7M 0m', '0m 8M 5m 7M', '0m 3M 8M 7M', '5m 0m 7M 0m', '0m 2s 3M 7M'], pitches: [2, 3, 5, 7, 8, 11],
    gtr: {
      V: { tone: 'crunch', cells: ['p p a p p p b p p p a p c - b -', 'p - a - b - c - b - a - p - a -', 'p p p a p p p b p p p c b - a -'] },
      C: { tone: 'metal', cells: ['P - - - P - - - P - p p P - - -', 'P - - - - - - - P - - - p p p p'], follow: true },
      B: { tone: 'crunch', cells: ['pn an bn an pn an bn an cn bn an bn pn - - -'] },
    },
    drums: { I: [NONE, SOFT], V: [ROCK, GALLOP], C: [DOUBLE, BIG], B: [MARCH] },
    arp: { I: { kind: 'harp', up: 36, figure: [0, 1, 2, 3, 4, 3, 2, 1] }, C: { kind: 'harp', up: 36, figure: [4, 3, 2, 1, 2, 1, 0, 1] } },
    lead: { C: { kind: 'twin', up: 36, rhythms: ['x - - - x - x - x - - - x - - -', 'x - x - - - x - x - x - x - - -'] } },
    pad: { I: 'strings' }, forms: ['IVCB', 'IVCV', 'ICVC', 'VCBC'],
  },
  elfico: {
    band: 'Orvalho Negro', style: 'Doom gótico', story: 'Harpa entre as árvores, vozes a duas e guitarras que caem devagar.',
    bpm: 74, root: 38, scale: HAR, progs: ['0m 8M 5m 7M', '0m 3M 10M 5m', '0m 5m 8M 7M', '8M 10M 0m 7M'], pitches: [2, 3, 5, 7, 8],
    gtr: {
      V: { tone: 'clean', cells: ['0 - 1 - 2 - 3 - 4 - 3 - 2 - 1 -', '0 - 2 - 1 - 3 - 2 - 4 - 3 - 1 -'], follow: true },
      C: { tone: 'metal', cells: ['P - - - - - - - - - - - p p P -', 'P - - - - - P - - - - - - - - -'], follow: true },
    },
    drums: { I: [NONE], V: [SOFT], C: [DOOM], B: [SOFT] },
    arp: { I: { kind: 'harp', up: 36, figure: [0, 1, 2, 3, 4, 3, 2, 1] }, B: { kind: 'harp', up: 36, figure: [4, 2, 3, 1, 2, 0, 1, 2] } },
    lead: { V: { kind: 'hum', up: 24, rhythms: ['x - - - - - - - x - - - x - - -', 'x - - - - - x - - - - - - - - -'] }, C: { kind: 'soprano', up: 36, rhythms: ['x - - - - - - - x - - - x - - -', 'x - - - x - - - x - - - - - - -'] } },
    pad: { I: 'strings', C: 'both', B: 'strings' }, forms: ['IVCB', 'ICVC', 'IVCB', 'VCBC'],
  },
  viking: {
    band: 'Corvos do Jarl', style: 'Death melódico de remadores', story: 'Tambores no cais, galope de remos e duas guitarras a cantar em terceiras.',
    bpm: 132, root: 36, scale: MIN, progs: ['0m 8M 3M 10M', '0m 10M 8M 10M', '0m 3M 10M 0m', '8M 10M 0m 0m', '0m 5m 8M 7m'], pitches: [2, 3, 5, 7, 8, 10],
    gtr: {
      V: { tone: 'metal', cells: ['p - p p p - p p p - p p a - b -', 'p - p p p - p p c - b - a - p -', 'p p a p p p b p p p c p b - a -'] },
      C: { tone: 'metal', cells: ['P - - - - - - - p p p p P - - -', 'P - - - P - - - p - p p P - - -'], follow: true },
      B: { tone: 'metal', cells: ['p - p p p - p p a - - - p - - -'] },
    },
    drums: { I: [WAR], V: [GALLOP], C: [FOURBIG, DOUBLE], B: [{ ...WAR, s: ['................', '................', '................', '........x.x.XXXX'] }] },
    lead: { C: { kind: 'twin', up: 36, rhythms: ['x - x - x - - - x - x - x - x -', 'x - - - x - x - x - - - x - - -', 'x - - x - - x - x - x - - - x -'] } },
    pad: { I: 'men', C: 'men', B: 'men' }, forms: ['IVCB', 'IVCV', 'VCBC', 'ICVC'],
  },
  mandala: {
    band: 'Sétimo Anel', style: 'Progressivo em compasso 7/8', story: 'Conta sete e roda: riffs que nunca assentam e sinos de templo.',
    bpm: 118, root: 38, scale: DOR, progs: ['0m 5M 0m 10M', '0m 3M 5M 3M', '0m 10M 5M 0m', '3M 5M 0m 0m'], pitches: [2, 3, 5, 7, 9],
    meter: { I: 14, V: 14, B: 14 },
    gtr: {
      I: { tone: 'clean', cells: ['pn - an - bn - cn - bn - an - pn -'] },
      V: { tone: 'crunch', cells: ['p p . p a - p . b - p c - .', 'p . p a - . p b - . c - a -', 'p p a - p p b - p c - b a -'] },
      C: { tone: 'metal', cells: ['P - - - - - p p P - - - p p P -', 'P - - P - - P - - - P - p p p p'], follow: true },
      B: { tone: 'crunch', cells: ['pn an bn pn an cn pn an bn cn bn - an -'] },
    },
    drums: { I: [ODD], V: [ODD], C: [BIG, HALF], B: [ODDBIG] },
    lead: { C: { kind: 'bell', up: 36, rhythms: ['x - - - x - - - x - - - x - - -', 'x - - x - - x - x - - - - - - -'] } },
    pad: { I: 'men', C: 'choir' }, forms: ['IVCB', 'IVCV', 'VCBC', 'IVBC'],
  },
  tinta: {
    band: 'Abissal', style: 'Post-metal atmosférico', story: 'Ondas limpas com eco que crescem até a maré rebentar.',
    bpm: 82, root: 36, scale: DOR, progs: ['0m 3M 10M 5M', '0m 5M 3M 10M', '3M 10M 0m 0m', '0m 8M 3M 10M'], pitches: [3, 5, 7, 10],
    gtr: {
      I: { tone: 'clean', cells: ['0 - - - 2 - - - 4 - - - 3 - - -'], follow: true },
      V: { tone: 'clean', cells: ['0 - 2 - 4 - 2 - 3 - 4 - 2 - 1 -', '0 - 1 - 2 - 4 - 3 - 2 - 4 - 2 -', '4 - 2 - 0 - 2 - 4 - 3 - 2 - 0 -'], follow: true },
      C: { tone: 'fuzz', cells: ['P - - - - - - - P - - - P - - -', 'P - - - - - P - - - P - - - - -'], follow: true },
    },
    drums: { I: [NONE, PULSE], V: [SOFT, COSMIC], C: [HALF, BIG], B: [SOFT] },
    arp: { I: { kind: 'piano', up: 36, figure: [2, 3, 4, 3] }, B: { kind: 'piano', up: 36, figure: [4, 3, 2, 1] } },
    lead: { C: { kind: 'gtr', up: 36, rhythms: ['x - - - - - - - x - - - - - - -', 'x - - - - - x - - - - - x - - -'] } },
    pad: { B: 'strings', C: 'choir' }, forms: ['IVCB', 'VCBC', 'IVCV', 'IVBC'],
  },
  neon: {
    band: 'Curto-Circuito', style: 'Industrial eletrónico', story: 'Sintetizadores a metralhar, batida de máquina e guitarra aos cortes.',
    bpm: 132, root: 37, scale: PHR, progs: ['0m 1M 0m 10m', '0m 8M 10m 0m', '0m 3M 1M 0m', '5m 1M 0m 0m'], pitches: [1, 3, 6, 7, 8],
    gtr: {
      V: { tone: 'metal', cells: ['p . . . p . p . . . a . . p . .', '. . p p . . p . a . . . p . b .', 'p . p . . . a . p . . p . . b .'] },
      C: { tone: 'metal', cells: ['P - . p p . P - . p p . P - . .', 'P - - - . . p p P - - - . . p p'], follow: true },
    },
    drums: { I: [PULSE, MACHINE], V: [ELECTRO], C: [FOURBIG], B: [ELECTRO, PULSE] },
    arp: { I: { kind: 'synth', up: 24, figure: [0, 2, 4, 2, 0, 3, 4, 3, 0, 2, 4, 2, 1, 3, 4, 3] }, V: { kind: 'synth', up: 24, figure: [0, -1, 0, 2, -1, 0, 3, -1, 0, -1, 4, 0, -1, 2, 0, -1] }, B: { kind: 'synth', up: 36, figure: [4, 3, 2, 0, 4, 3, 2, 0, 3, 2, 1, 0, 4, -1, 4, -1] } },
    lead: { C: { kind: 'synth', up: 36, rhythms: ['x - - x - - x - x - x - - - x -', 'x - - - x - x - - - x - x - - -'] } },
    forms: ['IVCB', 'VCBC', 'IVCV', 'IVBC'],
  },
  galactico: {
    band: 'Legião Quasar', style: 'Power metal épico', story: 'Bombo duplo à velocidade da luz, coro e refrões de herói.',
    bpm: 158, root: 40, scale: MAJ, progs: ['0M 7M 9m 5M', '9m 5M 0M 7M', '0M 5M 7M 0M', '5M 7M 4m 9m', '0M 4m 5M 7M'], pitches: [2, 4, 5, 7, 9, 12],
    gtr: {
      V: { tone: 'metal', cells: ['p p p p p p p p a - p p b - a -', 'p - p p p - p p p - p p a - b -', 'p p p p a - p p p p p p c - b -'], follow: true },
      C: { tone: 'metal', cells: ['P - - - - - P - P - - - P - - -', 'P - - P - - P - - - P - P - - -'], follow: true },
      B: { tone: 'metal', cells: ['P - - - - - - - a - - - - - - -'] },
    },
    drums: { I: [MARCH], V: [GALLOP, DOUBLE], C: [DOUBLE], B: [HALF] },
    arp: { I: { kind: 'synth', up: 36, figure: [0, 2, 3, 4, 3, 2, 3, 4] } },
    lead: { C: { kind: 'soprano', up: 24, rhythms: ['x - - - - - x - x - - - x - - -', 'x - - - x - - - x - x - x - - -'] }, B: { kind: 'twin', up: 36, rhythms: ['x - x - x - x - x - - - x - - -', 'x x x - x x x - x - - - x - - -'] } },
    pad: { I: 'both', C: 'both' }, forms: ['IVCB', 'IVCV', 'ICVC', 'VCBC'],
  },
  estelar: {
    band: 'Pó de Cometa', style: 'Metal espacial', story: 'Cordas a flutuar, sinos de estrela e um refrão que abre o céu.',
    bpm: 104, root: 38, scale: LYD, progs: ['0M 2M 0M 7M', '0M 7M 2M 4m', '4m 2M 0M 0M', '0M 9m 2M 7M'], pitches: [2, 4, 6, 7, 9],
    gtr: {
      V: { tone: 'clean', cells: ['0 - 2 - 4 - 3 - 4 - 2 - 3 - 1 -', '0 - 3 - 2 - 4 - 1 - 3 - 2 - 4 -'], follow: true },
      C: { tone: 'crunch', cells: ['P - - - - - p p P - - - p p P -', 'P - - - P - - - P - p p P - - -'], follow: true },
    },
    drums: { I: [PULSE], V: [COSMIC], C: [BIG, FOURBIG], B: [PULSE] },
    arp: { I: { kind: 'synth', up: 36, figure: [0, 2, 4, 3, 1, 3, 4, 2] }, B: { kind: 'synth', up: 36, figure: [4, 2, 3, 1, 2, 0, 3, 1] } },
    lead: { C: { kind: 'synth', up: 36, rhythms: ['x - - - - - - - x - - - x - - -', 'x - - - x - - - x - - - - - x -'] }, B: { kind: 'bell', up: 36, rhythms: ['x - - - x - - - x - - - x - - -'] } },
    pad: { I: 'strings', V: 'strings', C: 'both', B: 'strings' }, forms: ['IVCB', 'ICVC', 'VCBC', 'IVCV'],
  },
  angelico: {
    band: 'Véu de Cinza', style: 'Metal gótico sinfónico', story: 'Piano e coro à porta do céu; a banda entra a meio tempo e a soprano levanta voo.',
    bpm: 88, root: 40, scale: MIN, progs: ['0m 8M 3M 10M', '0m 10M 8M 10M', '8M 3M 10M 0m', '0m 5m 8M 7M', '0m 3M 5m 8M'], pitches: [3, 5, 7, 8, 10],
    gtr: {
      C: { tone: 'metal', cells: ['P - - - - - p p P - - - - - - -', 'P - - - P - - - P - - p p - P -'], follow: true },
      V: { tone: 'crunch', cells: ['p . . . p . . . p . p . a - - -', 'p p . . p p . . p p . . a - b -'], follow: true },
    },
    drums: { I: [NONE], V: [SOFT, HALF], C: [HALF, BIG], B: [SOFT] },
    arp: { I: { kind: 'piano', up: 24, figure: [0, 2, 3, 4, 5, 4, 3, 2] }, V: { kind: 'piano', up: 24, figure: [0, 1, 2, 3, 4, 3, 2, 1] }, B: { kind: 'piano', up: 36, figure: [3, 2, 1, 0, 3, 2, 1, 0] } },
    lead: { V: { kind: 'soprano', up: 24, rhythms: ['x - - - - - - - x - - - x - x -', 'x - - - - - x - - - - - - - . .'] }, C: { kind: 'soprano', up: 36, rhythms: ['x - - - - - - - x - - - x - - -', 'x - - - - - x - x - - - - - - -'] } },
    pad: { I: 'strings', V: 'strings', C: 'both', B: 'choir' }, forms: ['IVCB', 'ICVC', 'IVCB', 'VCBC'],
  },
  animal: {
    band: 'Tambor da Savana', style: 'Groove tribal', story: 'Timbalões da manada, coros de caçada e guitarras de pata pesada.',
    bpm: 110, root: 36, scale: PHR, progs: ['0m 1M 0m 3M', '0m 0m 5m 1M', '0m 8M 1M 0m', '3M 1M 0m 0m'], pitches: [1, 3, 5, 7, 8],
    gtr: {
      V: { tone: 'fuzz', cells: ['p . p p a - . p p . p . b - a .', 'p p . a - . p p . b - . a - p .', '. p p . p a - . p p . b - . a -'] },
      C: { tone: 'metal', cells: ['P - . p P - . p P - p p a - - -', 'P - - - p p p . P - - - p p p .'], follow: true },
      B: { tone: 'fuzz', cells: ['P - - . . . . . a - - . . . . .'] },
    },
    drums: { I: [TRIBE], V: [TRIBE, GROOVE], C: [TRIBEBIG], B: [TRIBE] },
    lead: { C: { kind: 'hum', up: 24, rhythms: ['x - . x - . x - x - - - . . . .', 'x - - - x - - - x - x - x - - -'] } },
    pad: { I: 'men', B: 'men' }, forms: ['IVCB', 'VCBC', 'IVCV', 'IVBC'],
  },
  rockstar: {
    band: 'A Lenda e os Cacos', style: 'Grunge', story: 'Estrofe limpa e arrastada, refrão com a guitarra a rasgar.',
    bpm: 114, root: 40, scale: MIN, progs: ['0m 3M 8M 10M', '0m 5m 3M 8M', '0m 10M 5m 8M', '8M 10M 0m 3M', '0m 6M 5m 8M'], pitches: [3, 5, 6, 8, 10],
    gtr: {
      V: { tone: 'clean', cells: ['0 - 2 - 3 - 2 - 4 - 3 - 2 - 1 -', '0 - 1 - 2 - 3 - 0 - 2 - 4 - 2 -', '0 - - 2 - - 3 - 4 - - 3 - - 2 -'], follow: true },
      C: { tone: 'fuzz', cells: ['P - - P . P P - . P - - a - b -', 'P - P - . P a - P - P - . P b -', 'P - - - P - P - . P - P - - P -'], follow: true },
      B: { tone: 'crunch', cells: ['p p p p p p p p am am am am bm bm bm bm'] },
    },
    drums: { I: [SOFT], V: [SOFT, ROCK], C: [PUNK, BIG], B: [FOUR] },
    lead: { V: { kind: 'hum', up: 24, rhythms: ['. . x - x - - - x - - - . . . .', 'x - - - - - x - x - - - - - . .'] }, C: { kind: 'hum', up: 36, rhythms: ['x - - - - - x - x - - - x - - -', 'x - - x - - - - x - - - x - x -'] } },
    forms: ['IVCB', 'VCVC', 'IVCV', 'VCBC'],
  },
};
