// O compositor: a partir do vocabulário de cada banda escreve um tema ORIGINAL e diferente para cada nível
// (tom, andamento, forma, progressão, riffs, bateria e melodia próprios). É determinista: o mesmo nível soa sempre igual.
import { mulberry32 } from '../core/rng';
import { BANDS, Band, Part } from './bands';
import type { Section, Song } from './render';
import { SONGS } from './songs';

/** temas escritos à mão: o do menu e o primeiro nível de cinco mundos */
const BY_HAND: Record<string, string> = { 'menu:0': 'menu', 'rockstar:0': 'rockstar', 'angelico:0': 'angelico', 'viking:0': 'viking', 'relogio:0': 'relogio', 'demoniaco:0': 'demoniaco' };

const KEYS = [0, 2, -1, 3, 1, 5, -2, 4];
const TEMPO = [0, 7, -5, 11, -9, 4, 14, -3];

interface Chord { root: number; third: number; name: string }
const chordOf = (name: string): Chord => {
  const m = /^(-?\d+)([mMs5])$/.exec(name)!;
  return { root: Number(m[1]), third: m[2] === 'M' ? 4 : m[2] === 'm' ? 3 : m[2] === 's' ? 5 : 7, name };
};

const hashId = (s: string) => [...s].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);

/** Escreve um compasso de guitarra a partir de uma célula, nas notas escolhidas para este tema. */
function guitarBar(cell: string, voices: Record<string, number>, chord: Chord | null): string {
  const base = chord ? chord.root : 0;
  const degrees = [0, 7, 12, 12 + (chord?.third ?? 7), 19];
  return cell.split(' ').map((t) => {
    if (t === '-' || t === '.') return t;
    if (/^[0-4]$/.test(t)) return `${base + degrees[Number(t)]}n`;
    if (t === 'p') return `${base}m`;
    if (t === 'P') return `${base}o`;
    const m = /^([abcp])([mn]?)$/.exec(t);
    if (!m) throw new Error(`célula desconhecida: ${t}`);
    const semi = m[1] === 'p' ? base : voices[m[1]];
    return `${semi}${m[2] || 'o'}`;
  }).join(' ');
}

/** Uma melodia: motivo de dois compassos repetido sobre os acordes, a fechar na nota do acorde. */
function melody(band: Band, chords: Chord[], bars: number, steps: number, rhythms: string[], up: number, rng: () => number): string[] {
  const ladder: number[] = [];
  for (let oct = -1; oct <= 2; oct++) for (const s of band.scale) { const v = oct * 12 + s; if (v >= -3 && v <= 15) ladder.push(v); }
  const nearest = (v: number) => ladder.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(ladder[best] - v) ? i : best), 0);
  const chordTone = (c: Chord, from: number) => {
    const tones = [c.root, c.root + c.third, c.root + 7].flatMap((t) => [t - 12, t, t + 12]).filter((t) => t >= -3 && t <= 15);
    tones.sort((a, b) => Math.abs(a - from) - Math.abs(b - from));
    return tones[rng() < 0.7 ? 0 : Math.min(1, tones.length - 1)];
  };
  const pickRhythm = () => rhythms[(rng() * rhythms.length) | 0].split(' ');
  const motif = [pickRhythm(), pickRhythm()];
  const moves = Array.from({ length: 32 }, () => [-2, -1, -1, 1, 1, 2][(rng() * 6) | 0]);
  const out: string[] = [];
  let at = nearest(7), note = 0;
  for (let b = 0; b < bars; b++) {
    const c = chords[b % chords.length], rhythm = motif[b % 2], last = b % 4 === 3;
    if (b % 2 === 0) note = 0;
    const line: string[] = [];
    for (let i = 0; i < steps; i++) {
      const t = rhythm[i % rhythm.length];
      if (t !== 'x') { line.push(t === '-' && (i > 0 || b > 0) ? '-' : '.'); continue; }
      if (i % 8 === 0) at = nearest(chordTone(c, ladder[at]));
      else at = Math.max(0, Math.min(ladder.length - 1, at + moves[note % moves.length]));
      note++;
      // o fim de cada frase de quatro compassos pousa na nota do acorde
      if (last && rhythm.slice(i + 1).every((x) => x !== 'x')) at = nearest(c.root > 8 ? c.root - 12 : c.root);
      line.push(`${up + ladder[at]}`);
    }
    out.push(line.join(' '));
  }
  return out;
}

/** Arpejos: percorre as notas do acorde segundo a figura da banda (-1 = pausa). */
function arpeggio(figure: number[], chords: Chord[], bars: number, steps: number, up: number): string[] {
  return Array.from({ length: bars }, (_, b) => {
    const c = chords[b % chords.length], base = c.root > 7 ? c.root - 12 : c.root;
    const tones = [0, c.third, 7, 12, 12 + c.third, 19];
    const every = figure.length > 8 ? 1 : 2;
    return Array.from({ length: steps }, (_, i) => {
      if (i % every) return '-';
      const d = figure[(i / every) % figure.length];
      return d < 0 ? '.' : `${up + base + tones[d]}`;
    }).join(' ');
  });
}

export function compose(worldId: string, level: number, title: string): Song {
  const band = BANDS[worldId] ?? BANDS.menu;
  const hand = SONGS.find((s) => s.id === BY_HAND[`${worldId}:${level}`]);
  if (hand) return { ...hand, id: `${worldId}:${level}`, title, scale: band.scale };

  const id = `${worldId}:${level}`, rng = mulberry32(hashId(id)), n = level % 8;
  const pick = <T,>(list: T[], k: number) => list[((k % list.length) + list.length) % list.length];
  const root = Math.max(33, band.root + KEYS[n]);
  const bpm = Math.round(Math.max(66, band.bpm + TEMPO[n] * (band.bpm > 120 ? 1 : 0.7)));
  const form = pick(band.forms, n + (hashId(worldId) % 3));
  const progV = pick(band.progs, n).split(' ').map(chordOf);
  const progC = pick(band.progs, n + 1 + Math.floor(n / band.progs.length)).split(' ').map(chordOf);
  // três notas diferentes para as vozes «a b c» dos riffs deste tema
  const pool = [...band.pitches];
  const voice = () => pool.splice((rng() * pool.length) | 0, 1)[0] ?? 7;
  const voices = { a: voice(), b: voice(), c: voice() };

  const sections: Section[] = [];
  let seenV = 0;
  [...form].forEach((letter, si) => {
    const part = letter as Part;
    const short = part === 'I' || part === 'B' || bpm < 96;
    const bars = short ? 4 : 8;
    const steps = band.meter?.[part] ?? 16;
    const prog = part === 'C' ? progC : progV;
    const s: Section = { n: bars };
    if (steps !== 16) s.steps = steps;

    const g = band.gtr[part];
    if (g) {
      const first = pick(g.cells, n + (part === 'V' ? seenV : 0)), second = pick(g.cells, n + 1 + (part === 'V' ? seenV : 0) + Math.floor(n / g.cells.length));
      s.tone = g.tone;
      // quatro compassos: pergunta, pergunta, pergunta, resposta
      s.g = Array.from({ length: bars }, (_, b) => guitarBar(b % 4 === 3 || (n % 2 && b % 2) ? second : first, voices, g.follow ? prog[b % prog.length] : null));
    }
    const kit = pick(band.drums[part], n + si);
    if (Object.keys(kit).length) {
      s.d = { ...kit };
      // o último compasso de cada secção grande faz uma entrada de tarola
      if (bars === 8 && kit.s && steps === 16 && part !== 'C') s.d.s = [...Array.from({ length: 7 }, (_, b) => pick(kit.s!, b)), (n % 2 ? '....x.....x.xxXX' : '....x...x.x.x.xx')];
    }
    const arp = band.arp?.[part];
    if (arp) {
      s.arp = arp.kind;
      s.p = arpeggio(n % 2 ? [...arp.figure.slice(2), ...arp.figure.slice(0, 2)] : arp.figure, prog, bars, steps, arp.up);
      // sem guitarra, o baixo segura a raiz de cada acorde
      if (!g) s.bass = Array.from({ length: bars }, (_, b) => [`${prog[b % prog.length].root}`, ...Array(steps - 1).fill('-')].join(' '));
    }
    const lead = band.lead?.[part];
    if (lead) { s.lead = lead.kind; s.l = melody(band, prog, bars, steps, lead.rhythms, lead.up, rng); }
    const pad = band.pad?.[part];
    if (pad) { s.pad = pad; s.ch = Array.from({ length: bars }, (_, b) => prog[b % prog.length].name); }
    if (part === 'V') seenV++;
    sections.push(s);
  });

  return { id, world: worldId, band: band.band, title, style: band.style, story: band.story, bpm, root, scale: band.scale, form: sections };
}
