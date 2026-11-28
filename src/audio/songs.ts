// Músicas ORIGINAIS do ÜLidÜLi: cada mundo tem a sua banda (liderada pelo guardião) e o seu género de metal.
// Notação: 16 passos por compasso. Guitarra «0m» abafada, «0o» acorde aberto, «0n» nota; «-» prolonga; «.» pausa.
// Os números são meios-tons acima da corda mais grave (`root`).
import type { Song } from './render';

const hats = ['x.x.x.x.x.x.x.x.'];
const back = ['....x.......x...'];
const backHard = ['....X.......X...'];
const one = ['X...............'];

/** Menu: rock alternativo a abrir, com refrão de peito aberto. */
const menu: Song = {
  id: 'menu', world: 'Menu inicial', band: 'Faísca Solta', title: 'Acende!', style: 'Rock alternativo a abrir', story: 'A banda do próprio Uli: rápida, luminosa, com refrão para cantar.',
  bpm: 168, root: 40,
  form: [
    { n: 4, tone: 'crunch', g: ['0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m', '0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m 0m', '0m 0m 0m 0m 0m 0m 0m 0m 3m 3m 3m 3m 5m 5m 5m 5m', '7o - - . 7o - - . 8o - - - 10o - - -'],
      d: { k: ['x...x...x...x...', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'x...x...x...x...'], h: hats, s: ['................', '................', '....x.......x...', 'x..x..x.x.x.xxxx'] } },
    { n: 8, tone: 'crunch', g: ['0m 0m 0m 0m 12o - 0m 0m 10o - 0m 0m 7o - 8o -', '0m 0m 0m 0m 12o - 0m 0m 3o - - - 5o - - -'],
      d: { k: ['x.....x.x.x.....', 'x.....x.x...x.x.'], s: back, h: hats, c: [...one, ...Array(3).fill('................')] } },
    { n: 4, g: ['8o - - - 8m 8m 8o - 10o - - - 10m 10m 10o -'],
      d: { k: ['x.x.x.x.x.x.x.x.'], s: ['....x.......x...', '....x.......x...', '....x.......x...', 'x.x.x.x.xxxxXXXX'], c: one } },
    { n: 8, g: ['0o - - 0o - - 8o - - - 3o - - - 10o -', '0o - - 0o - - 8o - - - 10o - - - 12o -'], lead: 'gtr', l: ['24 - - - - - 27 - 29 - - - 31 - 29 -', '27 - - - 24 - - - 22 - - - 19 - 22 -'],
      d: { k: ['x.....x.x.x...x.'], s: backHard, o: hats, c: ['X...............', '................'] } },
    { n: 4, g: ['0o - . . 0o - . . 0m 0m 0m 0m 3o - 5o -', '0o - . . 0o - . . 7o - 6o - 5o - 3o -'],
      d: { k: ['x.......x.x.x.x.'], s: ['....x.......x...', '....x...........'], t: ['................', '........11223333'], c: ['X.......X.......'] } },
  ],
};

/** Rockstar: sussurro limpo e explosão suja. */
const rockstar: Song = {
  id: 'rockstar', world: 'Palco Rockstar', band: 'A Lenda e os Cacos', title: 'Bastidores', style: 'Grunge: calmo, explode, volta a calar', story: 'Estrofe limpa e arrastada, refrão com a guitarra a rasgar.',
  bpm: 112, root: 40,
  form: [
    { n: 8, tone: 'clean', g: ['0n - 7n - 12n - 7n - 3n - 10n - 15n - 10n -', '5n - 12n - 17n - 12n - 8n - 15n - 20n - 15n -'], bass: ['0 - - - - - 0 - 3 - - - - - 3 -', '5 - - - - - 5 - 8 - - - - - 7 -'],
      lead: 'hum', l: ['. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .', '24 - - - - - 22 - 19 - - - - - . .', '22 - - - 24 - 22 - 19 - - - 17 - . .'],
      d: { k: ['x.......x.x.....'], s: ['....o.......o...'], r: ['x...x...x...x...'] } },
    { n: 2, tone: 'crunch', g: ['8m 8m 8m 8m 8m 8m 8m 8m 10m 10m 10m 10m 10m 10m 10m 10m', '10m 10m 10m 10m 10m 10m 10m 10m 10o - - - 10o - - -'],
      d: { k: ['x...x...x...x...'], s: ['....o...o.o.oooo', 'x.x.x.x.xxxxXXXX'] } },
    { n: 8, tone: 'fuzz', g: ['0o - - 0o . 0o 5o - . 5o - - 3o - 8o -', '0o - - 0o . 0o 5o - . 5o - - 8o - 7o -'],
      lead: 'hum', l: ['31 - - - - - 29 - 27 - - - 24 - - -', '31 - - - 34 - - - 29 - - - 27 - 24 -'],
      d: { k: ['x..x.x....x.x...', 'x..x.x....x.x.x.'], s: backHard, o: hats, c: ['X.......x.......', 'X...............'] } },
    { n: 4, tone: 'clean', g: ['0n - 7n - 12n - 7n - 3n - 10n - 15n - 10n -', '5n - 12n - 17n - 12n - 8n - 15n - 20n - 15n -'], bass: ['0 - - - - - 0 - 3 - - - - - 3 -', '5 - - - - - 5 - 8 - - - - - 7 -'],
      d: { k: ['x.......x.......'], r: ['x...x...x...x...'] } },
  ],
};

const EM = '24 - 31 - 36 - 39 - 43 - 39 - 36 - 31 -';
const C = '20 - 27 - 32 - 36 - 39 - 36 - 32 - 27 -';
const G = '15 - 22 - 27 - 31 - 34 - 31 - 27 - 22 -';
const D = '22 - 29 - 34 - 38 - 41 - 38 - 34 - 29 -';

/** Angélico: metal sinfónico, piano, coro e voz de soprano. */
const angelico: Song = {
  id: 'angelico', world: 'Céu Angélico', band: 'Véu de Cinza', title: 'Portão de Nuvem', style: 'Metal gótico sinfónico', story: 'Piano e coro à porta do céu; a banda entra a meio tempo e a soprano levanta voo.',
  bpm: 86, root: 40,
  form: [
    { n: 4, p: [EM, C, G, D], pad: 'strings', ch: ['0m', '8M', '3M', '10M'] },
    { n: 4, p: [EM, C, G, D], pad: 'strings', ch: ['0m', '8M', '3M', '10M'], lead: 'soprano',
      l: ['31 - - - - - - - 27 - - - 29 - 31 -', '32 - - - - - - - 31 - - - 27 - - -', '34 - - - - - 31 - - - - - 27 - 29 -', '29 - - - - - - - - - - - . . . .'],
      d: { k: ['x.......x.......'], r: ['....x.......x...'], c: ['................', '................', '................', '............X...'] } },
    { n: 8, p: [EM, C, G, D], pad: 'both', ch: ['0m', '8M', '3M', '10M'], lead: 'soprano',
      g: ['0o - - - - - 0m 0m 0o - - - - - - -', '8o - - - - - 8m 8m 8o - - - - - - -', '3o - - - - - 3m 3m 3o - - - - - - -', '10o - - - - - 10m 10m 10o - - - - - 7o -'],
      l: ['36 - - - - - - - 34 - - - 31 - - -', '32 - - - - - 34 - 36 - - - - - - -', '38 - - - - - - - 39 - - - 38 - 34 -', '34 - - - - - - - - - - - 31 - 29 -'],
      d: { k: ['x......x.x......', 'x......x.x....x.'], s: ['........X.......'], o: ['x...x...x...x...'], c: one } },
    { n: 4, p: [EM, C, G, D], pad: 'choir', ch: ['0m', '8M', '3M', '10M'] },
  ],
};

/** Viking: tambores de guerra, galope e guitarras gémeas. */
const viking: Song = {
  id: 'viking', world: 'Fiorde Viking', band: 'Corvos do Jarl', title: 'Cais de Gelo', style: 'Death melódico de remadores', story: 'Tambores no cais, galope de remos e duas guitarras a cantar em terceiras.',
  bpm: 132, root: 36,
  form: [
    { n: 4, pad: 'men', ch: ['0m', '0m', '8M', '10M'], d: { w: ['X..x..X.x..X..x.', 'X..x..X.x.xxX.X.'], c: ['................', '................', '................', '............X...'] } },
    { n: 8, g: ['0m - 0m 0m 0m - 0m 0m 0m - 0m 0m 3o - 5o -', '0m - 0m 0m 0m - 0m 0m 7o - 5o - 3o - 2o -'],
      d: { k: ['x.xxx.xxx.xxx.xx'], s: back, r: hats, c: ['X...............', '................', '................', '................'] } },
    { n: 8, g: ['0o - - - - - - - 0m 0m 0m 0m 0o - - -', '8o - - - - - - - 8m 8m 8m 8m 8o - - -', '3o - - - - - - - 3m 3m 3m 3m 3o - - -', '10o - - - - - - - 10m 10m 10m 10m 10o - - -'],
      lead: 'twin', l: ['36 - 39 - 43 - - - 41 - 39 - 38 - 39 -', '44 - - - 43 - 39 - 36 - - - 39 - - -', '43 - 39 - 43 - 46 - - - 43 - 41 - 39 -', '41 - - - 38 - - - 34 - - - 38 - 41 -'],
      pad: 'men', ch: ['0m', '8M', '3M', '10M'], d: { k: ['x...x...x...x...', 'x...x...x...x.xx'], s: backHard, o: hats, c: one } },
    { n: 4, g: ['0m - 0m 0m 0m - 0m 0m 1o - - - 0o - - -'], pad: 'men', ch: ['0m', '0m'], d: { w: ['X..x..X.X..x..X.'], s: ['............x...', '............x...', '............x...', '........x.x.XXXX'] } },
  ],
};

/** Relógio: metal industrial, marcha de máquina. */
const relogio: Song = {
  id: 'relogio', world: 'Cidade-Relógio', band: 'Mola Mestra', title: 'Ponteiros', style: 'Metal industrial marcial', story: 'Tiquetaque, bigornas e riffs secos; um sino dá as horas.',
  bpm: 124, root: 38,
  form: [
    { n: 4, lead: 'bell', l: ['36 - - - 43 - - - 39 - - - 38 - - -', '36 - - - 43 - - - 44 - - - 43 - - -'], d: { i: ['xxxxxxxxxxxxxxxx'], k: ['x...x...x...x...'], x: ['....x.......x...'] } },
    { n: 8, g: ['0m . 0m . . 0m 0m . 0m . 0m . 1m . 1m .', '0m . 0m . . 0m 0m . 3o - . . 1o - . .'], d: { k: ['x...x...x...x...'], s: back, h: ['..x...x...x...x.'], x: ['..............x.', '................'], i: ['x.x.x.x.x.x.x.x.'] } },
    { n: 8, g: ['0o - - - 8o - - - 3o - - - 10o - 10m 10m', '0o - - - 8o - - - 5o - - - 7o - 7m 7m'], pad: 'men', ch: ['0m 8M', '3M 10M', '0m 8M', '5m 7M'],
      lead: 'bell', l: ['36 - 38 - 39 - 43 - 39 - 38 - 34 - 38 -', '36 - 38 - 39 - 43 - 44 - 43 - 39 - 38 -'],
      d: { k: ['x...x...x...x...'], s: backHard, o: ['..x...x...x...x.'], c: one, x: ['....x.......x...'] } },
    { n: 4, g: ['0m . . . . . . . 0m 0m . . . . . .', '0m . . . . . . . 0m 0m . . 1m 1m . .'], d: { i: ['xxxxxxxxxxxxxxxx'], x: ['x.......x.......'], k: ['x...x...x...x...'], s: ['................', '................', '................', '........x.x.XXXX'] } },
  ],
};

/** Abismo: peso grave, ressalto e dissonância. */
const demoniaco: Song = {
  id: 'demoniaco', world: 'Abismo Demoníaco', band: 'Grilhões', title: 'Portões de Cinza', style: 'Groove metal em afinação funda', story: 'A guitarra mais grave do jogo, aos solavancos, com uma melodia torta por cima.',
  bpm: 96, root: 35,
  form: [
    { n: 4, g: ['0o - - - - - - - - - - - - - - -', '1o - - - - - - - - - - - - - - -', '0o - - - - - - - - - - - - - - -', '0m 0m . 0m 0m . 0m . 1o - . . 6o - . .'], pad: 'men', ch: ['0m', '0m'], d: { w: ['X.......X.......'], c: one, s: ['................', '................', '................', '............x.xX'] } },
    { n: 8, g: ['0m . . 0m 0m . . . 0o - . 0m . 1o . 0m', '0m . . 0m 0m . . . 6o - . 5o . 1o - .'], d: { k: ['x..xx...x..x...x', 'x..xx...x..x.x..'], s: backHard, z: ['X.......x.......', 'x.......x.......'] } },
    { n: 8, g: ['0m 0m 0m 0m . . 0o - 0m 0m 0m 0m . . 1o -', '0m 0m 0m 0m . . 0o - 6o - - . 5o - 3o -'], lead: 'gtr', l: ['25 - - - 24 - - - 25 - - - 30 - 29 -', '25 - - - 24 - - - 18 - - - - - - -'], d: { k: ['xxxx..x.xxxx..x.', 'xxxx..x.x..x.x..'], s: backHard, c: ['X.......X.......'] } },
    { n: 4, g: ['0o - - . . . 0o - - . . . 1o - - .'], d: { k: ['xx....x.....x...'], s: ['........X.......'], z: ['x...x...x...x...'] } },
  ],
};

export const SONGS: Song[] = [menu, rockstar, angelico, viking, relogio, demoniaco];
