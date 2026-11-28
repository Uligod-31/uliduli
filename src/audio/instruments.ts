// Os instrumentos da banda: cordas modeladas, amplificador com coluna, bateria, vozes, piano, sinos e efeitos.
import { SR, Biquad, Bus, addSaw, envelope, filters, normalize } from './dsp';

type Rng = () => number;

export interface Pluck {
  f: number; len: number; vel: number;
  /** segundos até a corda perder 60 dB */
  t60: number;
  /** 0 = brilhante … 0,8 = abafada */
  damp: number;
  vibrato?: number;
}

/** Corda dedilhada (Karplus-Strong com afinação fracionária). Soma em `out` a partir de `at`. */
export function pluck(out: Float32Array, at: number, p: Pluck, rng: Rng) {
  const period = SR / p.f, d = Math.max(2, period - p.damp / (1 - p.damp));
  const size = Math.ceil(d * 1.05) + 4, line = new Float32Array(size);
  const n = Math.ceil(d) + 2;
  // excitação: ruído, mais escuro quando se abafa, com o "buraco" da posição da palheta
  let lp = 0;
  const soft = 0.25 + p.damp * 0.6, ex = new Float32Array(n);
  for (let i = 0; i < n; i++) { lp = lp * soft + (rng() * 2 - 1) * (1 - soft); ex[i] = lp; }
  const pick = Math.max(1, Math.round(period * 0.13));
  let mean = 0;
  for (let i = 0; i < n; i++) { line[(size - n + i) % size] = ex[i] - (i >= pick ? ex[i - pick] : 0); mean += line[(size - n + i) % size]; }
  for (let i = 0; i < n; i++) line[(size - n + i) % size] -= mean / n;
  const g = Math.pow(10, -3 / Math.max(1, p.t60 * p.f)), rel = Math.min(p.len, Math.round(0.008 * SR));
  let w = 0, f = 0;
  const end = Math.min(p.len, out.length - at);
  for (let i = 0; i < end; i++) {
    let dd = d;
    if (p.vibrato) dd = d * (1 + p.vibrato * Math.min(1, Math.max(0, i / SR - 0.18) * 3) * Math.sin((2 * Math.PI * 5.6 * i) / SR));
    let r = w - dd; if (r < 0) r += size;
    const i0 = r | 0, fr = r - i0, a = line[i0], b = line[(i0 + 1) % size];
    f = (1 - p.damp) * (a + (b - a) * fr) + p.damp * f;
    const v = f * g;
    line[w] = v; if (++w === size) w = 0;
    out[at + i] += v * p.vel * (i > p.len - rel ? (p.len - i) / rel : 1);
  }
}

export type Tone = 'metal' | 'fuzz' | 'crunch' | 'lead' | 'clean';

const AMPS: Record<Exclude<Tone, 'clean'>, { tight: number; push: number; g1: number; g2: number; bias: number; hard: boolean; cab: [number, number, number, number]; out: number }> = {
  //            corte grave, reforço médio, ganhos, assimetria, recorte, coluna: [corpo dB, médios dB, presença dB, corte agudo]
  metal: { tight: 130, push: 6, g1: 38, g2: 3.2, bias: 0.12, hard: false, cab: [4, -5, 4.5, 5200], out: 0.5 },
  crunch: { tight: 110, push: 5, g1: 14, g2: 2, bias: 0.2, hard: false, cab: [3, -1.5, 3.5, 5600], out: 0.55 },
  fuzz: { tight: 70, push: 2, g1: 55, g2: 2.5, bias: 0.35, hard: true, cab: [4.5, -2, 2, 4300], out: 0.42 },
  lead: { tight: 220, push: 8, g1: 22, g2: 2.6, bias: 0.15, hard: false, cab: [0, 0, 3, 5000], out: 0.5 },
};

/** saturação suave (aproximação racional da tangente hiperbólica, muito mais rápida) */
const sat = (x: number) => (x > 3 ? 1 : x < -3 ? -1 : (x * (27 + x * x)) / (27 + 9 * x * x));

/** Amplificador: aperta o grave, satura em duas andares com sobreamostragem 4x e passa por uma "coluna". */
export function amp(di: Float32Array, tone: Exclude<Tone, 'clean'>): Float32Array {
  const a = AMPS[tone];
  filters(di, [['hp', a.tight, 0.7], ['peak', 850, 0.8, a.push]]);
  const os = SR * 4;
  // os três filtros que correm a 4x estão escritos «à mão»: é o ciclo mais pesado de toda a música
  const [m0, m1, m2, mA, mB] = new Biquad('lp', 7200, 0.7, 0, os).k;
  const [p0, p1, p2, pA, pB] = new Biquad('lp', 16000, 0.54, 0, os).k;
  const [q0, q1, q2, qA, qB] = new Biquad('lp', 16000, 1.3, 0, os).k;
  let mx1 = 0, mx2 = 0, my1 = 0, my2 = 0, px1 = 0, px2 = 0, py1 = 0, py2 = 0, qx1 = 0, qx2 = 0, qy1 = 0, qy2 = 0;
  const base = a.hard ? a.bias : sat(a.bias), { g1, g2, bias, hard, out } = a;
  let prev = 0, quiet = 0;
  for (let i = 0; i < di.length; i++) {
    const x = di[i];
    // silêncio prolongado: não vale a pena fazer contas
    if (x < 1e-5 && x > -1e-5) { if (++quiet > 6000) { di[i] = 0; prev = 0; continue; } } else quiet = 0;
    let y = 0;
    for (let k = 1; k <= 4; k++) {
      const s = (prev + (x - prev) * (k * 0.25)) * g1 + bias;
      const v = (hard ? (s > 1 ? 1 : s < -1 ? -1 : s) : sat(s)) - base;
      const m = m0 * v + m1 * mx1 + m2 * mx2 - mA * my1 - mB * my2; mx2 = mx1; mx1 = v; my2 = my1; my1 = m;
      const w = sat(m * g2);
      const p = p0 * w + p1 * px1 + p2 * px2 - pA * py1 - pB * py2; px2 = px1; px1 = w; py2 = py1; py1 = p;
      y = q0 * p + q1 * qx1 + q2 * qx2 - qA * qy1 - qB * qy2; qx2 = qx1; qx1 = p; qy2 = qy1; qy1 = y;
    }
    prev = x; di[i] = y * out;
  }
  const [body, scoop, air, cut] = a.cab;
  return filters(di, [['hp', 82, 0.8], ['peak', 125, 1.1, body], ['peak', 460, 0.9, scoop], ['peak', 1500, 1.2, 1.5], ['peak', 2900, 1.3, air], ['lp', cut, 0.6], ['lp', cut * 1.15, 1.1]]);
}

/** Guitarra limpa com coro. */
export function cleanAmp(di: Float32Array): Float32Array {
  filters(di, [['hp', 110, 0.7], ['peak', 2400, 0.8, 3], ['lp', 6000, 0.7]]);
  const out = new Float32Array(di.length);
  for (let i = 0; i < di.length; i++) {
    const d = (0.014 + 0.0035 * Math.sin((2 * Math.PI * 0.85 * i) / SR)) * SR, r = i - d;
    let wet = 0;
    if (r >= 0) { const i0 = r | 0; wet = di[i0] + (di[i0 + 1] - di[i0]) * (r - i0); }
    out[i] = di[i] * 0.75 + wet * 0.6;
  }
  di.set(out);
  return di;
}

/** Baixo: corda grossa com um pouco de saturação e o fundamental por baixo. */
export function bassNote(f: number, len: number, vel: number, rng: Rng): Float32Array {
  const s = new Float32Array(len);
  pluck(s, 0, { f, len, vel: 1, t60: 2.4, damp: 0.5 }, rng);
  normalize(s, 1);
  const out = new Float32Array(len), rel = Math.round(0.012 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR, env = Math.min(1, t / 0.004) * Math.min(1, (len - i) / rel) * Math.exp(-t * 0.7);
    out[i] = (Math.tanh(s[i] * 2.6) * 0.55 + Math.sin(2 * Math.PI * f * t) * 0.65) * env * vel;
  }
  return filters(out, [['hp', 32, 0.7], ['lp', 2200, 0.7], ['peak', 90, 1, 2]]);
}

// ───────────────────────── Bateria ─────────────────────────
export type Drum = 'kick' | 'snare' | 'hat' | 'open' | 'crash' | 'ride' | 'china' | 'tom1' | 'tom2' | 'tom3' | 'war' | 'clank' | 'tick';

const noise = (n: number, rng: Rng) => { const b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = rng() * 2 - 1; return b; };
const shaped = (sec: number, fn: (t: number, i: number) => number) => { const n = Math.round(sec * SR), b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = fn(i / SR, i); return b; };
/** "metal": várias ondas quadradas desafinadas, a base dos pratos. */
const metallic = (sec: number, freqs: number[]) => shaped(sec, (t) => { let v = 0; for (const f of freqs) v += (f * t) % 1 < 0.5 ? 1 : -1; return v / freqs.length; });

export function makeKit(rng: Rng): Record<Drum, Float32Array> {
  const sweep = (sec: number, f0: number, f1: number, k: number, decay: number) => {
    let ph = 0;
    return shaped(sec, (t) => { ph += (f1 + (f0 - f1) * Math.exp(-t * k)) / SR; return Math.sin(2 * Math.PI * ph) * Math.exp(-t * decay); });
  };
  const env = (b: Float32Array, decay: number) => { for (let i = 0; i < b.length; i++) b[i] *= Math.exp((-i / SR) * decay); return b; };
  const add = (a: Float32Array, b: Float32Array, g = 1) => { for (let i = 0; i < Math.min(a.length, b.length); i++) a[i] += b[i] * g; return a; };
  const sat = (b: Float32Array, k: number) => { for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * k); return b; };
  const done = (b: Float32Array) => envelope(normalize(b, 1), 0.0004, 0.01);

  const kick = sweep(0.34, 190, 46, 36, 9);
  add(kick, env(filters(noise(kick.length, rng), [['hp', 2200], ['lp', 7000]]), 260), 0.55);
  add(kick, shaped(0.34, (t) => Math.sin(2 * Math.PI * 3400 * t) * Math.exp(-t * 420)), 0.35);

  const snare = add(sweep(0.36, 250, 182, 60, 20), sweep(0.36, 420, 325, 60, 30), 0.55);
  add(snare, env(filters(noise(snare.length, rng), [['hp', 1200], ['peak', 3800, 0.7, 7], ['lp', 11000]]), 15), 0.95);
  add(snare, env(filters(noise(snare.length, rng), [['hp', 5500]]), 9), 0.3);

  const metal = [317, 421, 538, 677, 803, 1061];
  const cym = (sec: number, hp: number, decay: number, noiseG: number, mult = 1) => {
    const b = filters(metallic(sec, metal.map((f) => f * mult * 3.1)), [['hp', hp, 0.8]]);
    add(b, filters(noise(b.length, rng), [['hp', hp * 0.8, 0.7]]), noiseG);
    return env(filters(b, [['lp', 13500, 0.7]]), decay);
  };
  const hat = cym(0.09, 7600, 62, 0.8);
  const open = cym(0.45, 6800, 9, 0.8);
  const crash = add(cym(2.1, 3600, 2.1, 1.3, 1.13), cym(2.1, 5200, 3.4, 0.9, 1.71), 0.7);
  const ride = add(cym(1.1, 5000, 4.5, 0.25, 1.37), shaped(1.1, (t) => (Math.sin(2 * Math.PI * 3020 * t) + 0.7 * Math.sin(2 * Math.PI * 4147 * t) + 0.5 * Math.sin(2 * Math.PI * 5391 * t)) * Math.exp(-t * 5)), 0.2);
  const china = sat(add(cym(0.9, 1900, 5.5, 0.9, 0.62), cym(0.9, 3100, 8, 0.8, 0.93)), 3.2);
  const tom = (f: number) => add(sweep(0.5, f * 1.7, f, 24, 7.5), env(filters(noise(Math.round(0.5 * SR), rng), [['bp', f * 9, 0.8]]), 38), 0.5);
  const war = add(sweep(1.1, 105, 52, 20, 3.6), env(filters(noise(Math.round(1.1 * SR), rng), [['lp', 520, 0.8]]), 16), 1.1);
  add(war, sweep(1.1, 160, 98, 30, 7), 0.35);
  const clank = shaped(0.5, (t) => [523, 771, 1093, 1347, 1939, 2711].reduce((v, f, k) => v + Math.sin(2 * Math.PI * f * t + 2.2 * Math.sin(2 * Math.PI * f * 1.41 * t)) * Math.exp(-t * (9 + k * 3)), 0));
  add(clank, env(filters(noise(clank.length, rng), [['hp', 2500]]), 90), 1.5);
  const tick = env(filters(noise(Math.round(0.03 * SR), rng), [['bp', 4200, 3]]), 190);

  return {
    kick: done(sat(kick, 1.7)), snare: done(sat(snare, 1.5)), hat: done(hat), open: done(open), crash: done(crash), ride: done(ride), china: done(china),
    tom1: done(tom(165)), tom2: done(tom(118)), tom3: done(tom(82)), war: done(sat(war, 1.4)), clank: done(clank), tick: done(tick),
  };
}

// ───────────────────────── Vozes, cordas, teclas ─────────────────────────
export type Vowel = 'ah' | 'oh' | 'oo';
const FORMANTS: Record<Vowel, [number, number, number][]> = {
  ah: [[820, 6, 1], [1180, 8, 0.62], [2850, 10, 0.28]],
  oh: [[480, 6, 1], [850, 8, 0.5], [2700, 10, 0.14]],
  oo: [[350, 5, 1], [720, 8, 0.28], [2600, 10, 0.08]],
};

/** Voz sintética: várias "gargantas" levemente desafinadas passadas por formantes. */
export function voice(f: number, len: number, vowel: Vowel, o: { throats?: number; attack?: number; release?: number; vibrato?: number }, rng: Rng): Float32Array {
  const throats = o.throats ?? 3, tail = Math.round((o.release ?? 0.25) * SR), src = new Float32Array(len + tail);
  for (let k = 0; k < throats; k++) {
    const cents = (k - (throats - 1) / 2) * 7 + (rng() - 0.5) * 5;
    addSaw(src, f * Math.pow(2, cents / 1200), 1 / throats, rng(), 5.2 + rng() * 0.8, o.vibrato ?? 0.008, 0.12 + rng() * 0.1);
  }
  const breath = noise(src.length, rng);
  for (let i = 0; i < src.length; i++) src[i] += breath[i] * 0.045;
  const out = new Float32Array(src.length);
  for (const [fr, q, g] of FORMANTS[vowel]) {
    const bp = new Biquad('bp', Math.max(fr, f * 1.02), q);
    for (let i = 0; i < src.length; i++) out[i] += bp.tick(src[i]) * g * 2.4;
  }
  const body = new Biquad('lp', Math.max(500, f * 2.2), 0.7);
  for (let i = 0; i < src.length; i++) out[i] += body.tick(src[i]) * 0.16;
  return envelope(out, o.attack ?? 0.09, tail / SR);
}

/** Naipe de cordas. */
export function strings(f: number, len: number, rng: Rng): Float32Array {
  const tail = Math.round(0.6 * SR), out = new Float32Array(len + tail);
  for (const c of [-11, -3, 4, 12]) addSaw(out, f * Math.pow(2, c / 1200), 0.25, rng(), 4.8 + rng(), 0.004, 0.2);
  filters(out, [['hp', 160], ['lp', 3400, 0.6], ['peak', 1200, 0.8, -2]]);
  return envelope(out, 0.35, tail / SR);
}

/** Piano: parciais ligeiramente inarmónicos com decaimento próprio, mais o toque do martelo. */
export function piano(f: number, len: number, vel: number, rng: Rng): Float32Array {
  const n = len + Math.round(0.9 * SR), out = new Float32Array(n);
  for (let k = 1; k <= 8; k++) {
    const fk = f * k * Math.sqrt(1 + 0.00045 * k * k);
    if (fk > SR * 0.45) break;
    const rate = 0.9 + k * 0.55 + f / 900;
    for (const det of [0.9994, 1.0006]) {
      const w = (2 * Math.PI * fk * det) / SR, ph = rng() * 0.6, a = (0.5 * vel) / Math.pow(k, 1.45);
      let re = a * Math.cos(ph), im = a * Math.sin(ph);
      let shrink = Math.exp(-rate / SR), cr = shrink * Math.cos(w), ci = shrink * Math.sin(w);
      for (let i = 0; i < n; i++) {
        if (i === len) { shrink = Math.exp(-(rate + 6) / SR); cr = shrink * Math.cos(w); ci = shrink * Math.sin(w); } // abafador
        out[i] += im;
        const t = re * cr - im * ci; im = re * ci + im * cr; re = t;
      }
    }
  }
  const hammer = noise(Math.round(0.02 * SR), rng);
  filters(hammer, [['bp', Math.min(6000, f * 6), 1]]);
  for (let i = 0; i < hammer.length; i++) out[i] += hammer[i] * vel * 0.25 * (1 - i / hammer.length);
  return envelope(out, 0.002, 0.05);
}

/** Sino (modulação de frequência). */
export function bell(f: number, len: number): Float32Array {
  const n = len + Math.round(1.2 * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, m = 2.6 * Math.exp(-t * 3.5) * Math.sin(2 * Math.PI * f * 3.51 * t);
    out[i] = (Math.sin(2 * Math.PI * f * t + m) + 0.35 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 4)) * Math.exp(-t * 2.4);
  }
  return envelope(out, 0.002, 0.2);
}

/** Sintetizador: duas serras e uma quadrada, com um filtro que fecha depressa. */
export function synth(f: number, len: number, rng: Rng): Float32Array {
  const n = len + Math.round(0.12 * SR), out = new Float32Array(n);
  addSaw(out, f * 1.004, 0.4, rng()); addSaw(out, f * 0.996, 0.4, rng());
  let ph = 0, lp = 0, lp2 = 0, k = 0;
  for (let i = 0; i < n; i++) {
    ph += f / 2 / SR; if (ph >= 1) ph -= 1;
    if ((i & 31) === 0) k = 1 - Math.exp((-2 * Math.PI * (500 + 5200 * Math.exp((-i / SR) * 9))) / SR);
    lp += k * (out[i] + (ph < 0.5 ? 0.22 : -0.22) - lp); lp2 += k * (lp - lp2);
    out[i] = lp2;
  }
  return envelope(out, 0.004, 0.1);
}

/** Corda beliscada e brilhante (harpa, cravo). */
export function harp(f: number, len: number, rng: Rng): Float32Array {
  const out = new Float32Array(len + Math.round(0.7 * SR));
  pluck(out, 0, { f, len: out.length, vel: 1, t60: 1.5, damp: 0.08 }, rng);
  normalize(out, 0.7);
  return envelope(filters(out, [['hp', 160]]), 0.001, 0.12);
}

// ───────────────────────── Efeitos ─────────────────────────
/** Reverberação (Schroeder/Freeverb) sobre um barramento de envio; devolve o som molhado. */
export function reverb(send: Bus, room = 0.84, damp = 0.32): Bus {
  const run = (x: Float32Array, spread: number) => {
    const out = new Float32Array(x.length);
    for (const t of [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]) {
      const d = new Float32Array(t + spread);
      let p = 0, lp = 0;
      for (let i = 0; i < x.length; i++) {
        const y = d[p];
        lp = y * (1 - damp) + lp * damp;
        if (lp < 1e-20 && lp > -1e-20) lp = 0;
        d[p] = x[i] * 0.03 + lp * room; if (++p === d.length) p = 0;
        out[i] += y;
      }
    }
    for (const t of [556, 441, 341, 225]) {
      const d = new Float32Array(t + spread);
      let p = 0;
      for (let i = 0; i < out.length; i++) {
        const y = d[p], v = out[i];
        d[p] = v + y * 0.5; if (++p === d.length) p = 0;
        out[i] = y - v;
      }
    }
    return filters(out, [['hp', 180], ['lp', 7500]]);
  };
  return { l: run(send.l, 0), r: run(send.r, 23) };
}

/** Eco que salta de um lado para o outro. */
export function pingPong(send: Float32Array, time: number, feedback = 0.38): Bus {
  const d = Math.round(time * SR), l = new Float32Array(send.length), r = new Float32Array(send.length);
  for (let i = d; i < send.length; i++) {
    l[i] = send[i - d] + r[i - d] * feedback;
    r[i] = l[i - d] * feedback;
  }
  filters(l, [['hp', 350], ['lp', 3800]]); filters(r, [['hp', 350], ['lp', 3800]]);
  return { l, r };
}
