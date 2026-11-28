// A mesa de mistura: lê uma música (padrões de 16 passos), toca-a e devolve um loop estéreo sem costuras.
import { mulberry32 } from '../core/rng';
import { SR, Bus, bus, filters, midiHz, mix, place } from './dsp';
import { Drum, Tone, Vowel, amp, bassNote, bell, cleanAmp, harp, makeKit, piano, pingPong, pluck, reverb, strings, synth, voice } from './instruments';

export type LeadKind = 'gtr' | 'twin' | 'soprano' | 'hum' | 'bell' | 'synth' | 'harp';
export type ArpKind = 'piano' | 'harp' | 'synth';
export type PadKind = 'choir' | 'men' | 'strings' | 'both';
/** k bombo, s tarola, h prato fechado, o aberto, c ataque, r condução, z china, t timbalões (1-3), w tambor de guerra, x bigorna, i tique */
export type DrumKey = 'k' | 's' | 'h' | 'o' | 'c' | 'r' | 'z' | 't' | 'w' | 'x' | 'i';

export interface Section {
  /** número de compassos */
  n: number;
  /** passos por compasso (16 = 4/4; 14 = 7/8; 12 = 6/8) */
  steps?: number;
  /** guitarra de ritmo: 16 passos por compasso. «0m» abafada, «0o» acorde aberto, «0n» nota; «-» prolonga; «.» pausa */
  g?: string[];
  tone?: Tone;
  /** baixo próprio; sem isto segue a guitarra; false cala-o */
  bass?: string[] | false;
  /** melodia */
  l?: string[];
  lead?: LeadKind;
  /** arpejos */
  p?: string[];
  /** instrumento dos arpejos (piano, se não se disser) */
  arp?: ArpKind;
  /** acordes do acompanhamento: um ou dois por compasso («0m», «8M», «5s») */
  ch?: string[];
  pad?: PadKind;
  d?: Partial<Record<DrumKey, string[]>>;
}

export interface Song {
  id: string; world: string; band: string; title: string; style: string; story: string;
  bpm: number;
  /** nota MIDI da corda mais grave: os números das partituras são meios-tons acima dela */
  root: number;
  form: Section[];
  /** escala (meios-tons) para a segunda guitarra das duplas */
  scale?: number[];
}

export interface Rendered { l: Float32Array; r: Float32Array; sampleRate: number; seconds: number; kicks: number[] }

interface Note { at: number; len: number; semi: number; mark: string }

const MINOR = [0, 2, 3, 5, 7, 8, 10];
/** a segunda voz da dupla de guitarras: uma terceira abaixo, dentro da escala menor */
const third = (semi: number, scale: number[]) => {
  const oct = Math.floor(semi / 12), pc = semi - oct * 12;
  let deg = 0;
  for (let i = 0; i < scale.length; i++) if (scale[i] <= pc) deg = i;
  const d = deg - 2;
  return (oct + Math.floor(d / scale.length)) * 12 + scale[(d + scale.length) % scale.length];
};

function tokens(bar: string, steps: number, where: string): string[] {
  const t = bar.trim().split(/\s+/);
  if (t.length !== steps) throw new Error(`${where}: compasso com ${t.length} passos em vez de ${steps}: "${bar}"`);
  return t;
}

/** Os compassos da música, um a um: onde começam e quantos passos têm. */
function barsOf(song: Song) {
  const list: { s: Section; si: number; b: number; start: number; steps: number }[] = [];
  let start = 0;
  for (const [si, s] of song.form.entries()) {
    for (let b = 0; b < s.n; b++) { const steps = s.steps ?? 16; list.push({ s, si, b, start, steps }); start += steps; }
  }
  return { list, steps: start };
}

/** Lê uma pista inteira (todas as secções) e junta as notas prolongadas, mesmo entre compassos. */
function track(song: Song, key: 'g' | 'l' | 'p' | 'bass', keep: (s: Section) => boolean = () => true): Note[] {
  const out: Note[] = [];
  let cur: Note | null = null;
  for (const { s, si, b, start, steps } of barsOf(song).list) {
    const bars = s[key];
    if (!bars || !bars.length || !keep(s)) { cur = null; continue; }
    tokens(bars[b % bars.length], steps, `${song.id} secção ${si + 1} ${key}`).forEach((tk, i) => {
      if (tk === '-') { if (cur) cur.len++; return; }
      cur = null;
      if (tk === '.') return;
      const m = /^(-?\d+)([a-z]?)$/.exec(tk);
      if (!m) throw new Error(`${song.id}: passo desconhecido "${tk}"`);
      cur = { at: start + i, len: 1, semi: Number(m[1]), mark: m[2] };
      out.push(cur);
    });
  }
  return out;
}

/** a que secção pertence cada passo */
const sectionAt = (song: Song) => { const map: Section[] = []; for (const { s, start, steps } of barsOf(song).list) for (let i = 0; i < steps; i++) map[start + i] = s; return map; };

const DRUMS: Record<DrumKey, { s: Drum; gain: number; pan: number; verb: number }> = {
  k: { s: 'kick', gain: 0.62, pan: 0, verb: 0.02 }, s: { s: 'snare', gain: 0.6, pan: 0.02, verb: 0.3 },
  h: { s: 'hat', gain: 0.13, pan: 0.38, verb: 0.05 }, o: { s: 'open', gain: 0.13, pan: 0.38, verb: 0.1 },
  c: { s: 'crash', gain: 0.24, pan: -0.45, verb: 0.2 }, r: { s: 'ride', gain: 0.15, pan: 0.5, verb: 0.12 },
  z: { s: 'china', gain: 0.2, pan: 0.45, verb: 0.15 }, t: { s: 'tom2', gain: 0.46, pan: 0, verb: 0.25 },
  w: { s: 'war', gain: 0.46, pan: -0.1, verb: 0.4 }, x: { s: 'clank', gain: 0.22, pan: -0.35, verb: 0.35 },
  i: { s: 'tick', gain: 0.18, pan: 0.6, verb: 0.15 },
};

/** Toca a música por etapas (o gerador deixa o ecrã respirar entre elas). */
export function* renderSteps(song: Song): Generator<string, Rendered> {
  const rng = mulberry32([...song.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  const step = 60 / song.bpm / 4, map = sectionAt(song), grid = barsOf(song), steps = grid.steps;
  const loop = Math.round(steps * step * SR), total = loop + Math.round(3 * SR);
  const pos = (st: number) => Math.round(st * step * SR), span = (n: Note) => pos(n.at + n.len) - pos(n.at);
  const dry = bus(total), send = bus(total), echo = new Float32Array(total);
  const made = new Map<string, Float32Array>();
  const once = (key: string, make: () => Float32Array) => { let v = made.get(key); if (!v) made.set(key, (v = make())); return v; };
  const kicks: number[] = [];

  // ── guitarras de ritmo: duas gravações independentes, uma de cada lado ──
  yield 'guitarras';
  const riff = track(song, 'g');
  const tones = [...new Set(song.form.filter((s) => s.g).map((s) => s.tone ?? 'metal'))];
  for (const tone of tones) {
    for (const take of [0, 1]) {
      const di = new Float32Array(total);
      for (const n of riff) {
        if ((map[n.at].tone ?? 'metal') !== tone) continue;
        const palm = n.mark === 'm', chord = n.mark === 'o' ? [0, 7, 12] : palm ? [0, 7] : [0];
        chord.forEach((iv, k) => {
          const cents = (take ? 3.5 : -3.5) + (rng() - 0.5) * 4;
          const at = pos(n.at) + Math.round((rng() * 0.006 + k * 0.0025) * SR);
          const len = tone === 'clean' ? span(n) + pos(4) : palm ? Math.min(span(n), Math.round(0.16 * SR)) : span(n);
          pluck(di, at, { f: midiHz(song.root + n.semi + iv) * Math.pow(2, cents / 1200), len, vel: (0.85 + rng() * 0.15) * (k ? 0.8 : 1), t60: palm ? 0.2 : tone === 'clean' ? 2.6 : 4.5, damp: palm ? 0.56 : tone === 'clean' ? 0.18 : 0.26 }, rng);
        });
      }
      const sound = tone === 'clean' ? cleanAmp(di) : amp(di, tone);
      place(dry, sound, 0, tone === 'clean' ? 0.4 : 0.44, take ? 0.85 : -0.85);
      if (tone === 'clean') place(send, sound, 0, 0.18, take ? 0.6 : -0.6);
    }
  }

  // ── baixo ──
  yield 'baixo';
  const own = track(song, 'bass', (s) => Array.isArray(s.bass));
  const followed = riff.filter((n) => map[n.at].bass === undefined);
  const low = new Float32Array(total);
  for (const n of [...followed, ...own]) {
    const midi = song.root + n.semi - (song.root > 37 ? 12 : 0);
    const len = n.mark === 'm' ? Math.min(span(n), Math.round(0.22 * SR)) : span(n);
    mix(low, bassNote(midiHz(midi), len, 0.9, rng), pos(n.at));
  }
  place(dry, low, 0, 0.23);

  // ── bateria ──
  yield 'bateria';
  const kit = makeKit(rng);
  let crashSide = 1;
  for (const { s, b, start, steps: size } of grid.list) {
    for (const [key, patterns] of Object.entries(s.d ?? {}) as [DrumKey, string[]][]) {
      const line = patterns[b % patterns.length].replace(/\s+/g, '');
      if (line.length !== size) throw new Error(`${song.id}: bateria ${key} com ${line.length} passos em vez de ${size}: "${line}"`);
      const cfg = DRUMS[key];
      for (let i = 0; i < size; i++) {
        const c = line[i];
        if (c === '.') continue;
        const vel = c === 'X' ? 1.15 : c === 'o' ? 0.45 : 0.9;
        const drum: Drum = key === 't' ? (`tom${c}` as Drum) : cfg.s;
        if (!kit[drum]) throw new Error(`${song.id}: batida desconhecida ${key} "${c}"`);
        const at = pos(start + i) + Math.round((rng() - 0.5) * 0.003 * SR);
        const pan = key === 'c' ? 0.45 * (crashSide = -crashSide) : key === 't' ? (2 - Number(c)) * -0.35 : cfg.pan;
        const g = cfg.gain * vel * (0.9 + rng() * 0.1);
        place(dry, kit[drum], Math.max(0, at), g, pan);
        if (cfg.verb) place(send, kit[drum], Math.max(0, at), g * cfg.verb, pan);
        if (key === 'k' || key === 'w') kicks.push((start + i) * step);
      }
    }
  }

  // ── acompanhamento: coro e cordas ──
  yield 'coros';
  for (const { s, b, start, steps: size } of grid.list) {
      if (!s.ch || !s.pad) continue;
      const parts = s.ch[b % s.ch.length].trim().split(/\s+/);
      parts.forEach((name, k) => {
        const m = /^(-?\d+)([mMs5])$/.exec(name);
        if (!m) throw new Error(`${song.id}: acorde desconhecido "${name}"`);
        const notes = ({ m: [0, 3, 7], M: [0, 4, 7], s: [0, 5, 7], '5': [0, 7, 12] } as Record<string, number[]>)[m[2]].map((iv) => Number(m[1]) + iv);
        const at = pos(start + Math.round((k * size) / parts.length)), len = pos(Math.round(size / parts.length));
        notes.forEach((semi, j) => {
          const pan = [-0.55, 0, 0.55][j];
          const sing = (vowel: Vowel, up: number, g: number) => { const v = once(`c${vowel}${semi + up}:${len}`, () => voice(midiHz(song.root + semi + up), len, vowel, { throats: 4, attack: 0.16, release: 0.4 }, rng)); place(dry, v, at, g, pan); place(send, v, at, g * 0.8, -pan); };
          if (s.pad === 'choir' || s.pad === 'both') sing('ah', 24, 0.07);
          if (s.pad === 'men') sing('oh', 12, 0.095);
          if (s.pad === 'strings' || s.pad === 'both') { const up = j === 0 ? 12 : 24, v = once(`s${semi + up}:${len}`, () => strings(midiHz(song.root + semi + up), len, rng)); place(dry, v, at, 0.075, pan); place(send, v, at, 0.05, pan); }
        });
      });
  }

  // ── arpejos: piano, harpa ou sintetizador ──
  yield 'melodias';
  for (const n of track(song, 'p')) {
    const inst = map[n.at].arp ?? 'piano', vel = n.at % 8 === 0 ? 0.9 : 0.7, f = midiHz(song.root + n.semi), pan = Math.max(-0.5, Math.min(0.5, (n.semi - 30) / 30));
    const v = once(`${inst}${n.semi}:${span(n)}:${vel}`, () => (inst === 'harp' ? harp(f, span(n), rng) : inst === 'synth' ? synth(f, span(n), rng) : piano(f, span(n), vel, rng)));
    const g = inst === 'harp' ? 0.2 : inst === 'synth' ? 0.13 : 0.3;
    place(dry, v, pos(n.at), g * (inst === 'piano' ? 1 : vel), pan); place(send, v, pos(n.at), g * 0.45, pan);
    if (inst !== 'piano') mix(echo, v, pos(n.at), g * 0.16);
  }

  // ── melodia principal ──
  const lead = track(song, 'l');
  const kind = (n: Note) => map[n.at].lead ?? 'gtr';
  for (const take of [0, 1]) {
    const di = new Float32Array(total);
    let any = false;
    for (const n of lead) {
      const k = kind(n);
      if (!(k === 'twin' || (k === 'gtr' && take === 0))) continue;
      any = true;
      const semi = take ? third(n.semi, song.scale ?? MINOR) : n.semi;
      pluck(di, pos(n.at) + Math.round(rng() * 0.005 * SR), { f: midiHz(song.root + semi), len: span(n), vel: 0.9, t60: 7, damp: 0.2, vibrato: 0.006 }, rng);
    }
    if (!any) continue;
    const sound = amp(di, 'lead'), twin = lead.some((n) => kind(n) === 'twin');
    place(dry, sound, 0, 0.15, twin ? (take ? 0.35 : -0.35) : 0.1);
    mix(echo, sound, 0, 0.07);
  }
  for (const n of lead) {
    const k = kind(n), at = pos(n.at);
    if (k === 'soprano' || k === 'hum') {
      const soprano = k === 'soprano';
      const v = voice(midiHz(song.root + n.semi), span(n), soprano ? 'ah' : 'oh', { throats: soprano ? 2 : 3, attack: soprano ? 0.07 : 0.05, release: 0.22, vibrato: soprano ? 0.014 : 0.007 }, rng);
      place(dry, v, at, soprano ? 0.17 : 0.2, 0); place(send, v, at, soprano ? 0.19 : 0.1, 0); mix(echo, v, at, 0.035);
    } else if (k === 'synth' || k === 'harp') {
      const v = (k === 'synth' ? synth : harp)(midiHz(song.root + n.semi), span(n), rng);
      place(dry, v, at, 0.17, -0.12); place(send, v, at, 0.08, 0.2); mix(echo, v, at, 0.05);
    } else if (k === 'bell') {
      const v = bell(midiHz(song.root + n.semi), span(n));
      place(dry, v, at, 0.1, 0.25); place(send, v, at, 0.09, -0.25); mix(echo, v, at, 0.03);
    }
  }

  // ── efeitos e mistura final ──
  yield 'sala';
  const wet = reverb(send), rep = pingPong(echo, step * 3);
  for (const [out, w, e] of [[dry.l, wet.l, rep.l], [dry.r, wet.r, rep.r]]) for (let i = 0; i < total; i++) out[i] += w[i] * 0.9 + e[i];
  // a cauda (reverberação, pratos) volta ao princípio: o loop não tem costura
  for (const c of [dry.l, dry.r]) for (let i = loop; i < total; i++) c[i - loop] += c[i];

  yield 'masterização';
  const out = master({ l: dry.l.slice(0, loop), r: dry.r.slice(0, loop) });
  return { l: out.l, r: out.r, sampleRate: SR, seconds: loop / SR, kicks: kicks.sort((a, b) => a - b) };
}

/** Cola a mistura: equilíbrio, compressor de barramento, volume igual entre músicas e limitador suave. */
function master(b: Bus): Bus {
  for (const c of [b.l, b.r]) filters(c, [['hp', 38, 0.7], ['ls', 110, 0.7, -3], ['peak', 320, 0.9, -1.5], ['peak', 2200, 0.7, 1.5], ['hs', 7000, 0.7, 2.5]]);
  const n = b.l.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += (b.l[i] ** 2 + b.r[i] ** 2) / 2;
  rms = Math.sqrt(rms / n) || 1;
  const pre = 0.2 / rms;
  for (let i = 0; i < n; i++) { b.l[i] *= pre; b.r[i] *= pre; }
  const att = Math.exp(-1 / (0.006 * SR)), rel = Math.exp(-1 / (0.14 * SR)), thr = 0.32;
  let env = 0;
  const follow = (i: number) => { const x = Math.max(Math.abs(b.l[i]), Math.abs(b.r[i])); env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x; };
  for (let i = Math.max(0, n - SR); i < n; i++) follow(i); // o compressor já vem embalado do fim do loop
  for (let i = 0; i < n; i++) {
    follow(i);
    const g = env > thr ? Math.pow(env / thr, -0.45) : 1;
    b.l[i] *= g; b.r[i] *= g;
  }
  let after = 0;
  for (let i = 0; i < n; i++) after += (b.l[i] ** 2 + b.r[i] ** 2) / 2;
  const post = 0.185 / (Math.sqrt(after / n) || 1), knee = 0.72, room = 0.25;
  const limit = (x: number) => { const a = Math.abs(x); return a <= knee ? x : Math.sign(x) * (knee + room * Math.tanh((a - knee) / room)); };
  for (let i = 0; i < n; i++) { b.l[i] = limit(b.l[i] * post); b.r[i] = limit(b.r[i] * post); }
  return b;
}

export function renderSong(song: Song): Rendered {
  const g = renderSteps(song);
  for (;;) { const r = g.next(); if (r.done) return r.value; }
}
