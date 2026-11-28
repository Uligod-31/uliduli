// Peças de processamento de som em TypeScript puro (sem Web Audio): correm igual no jogo, num Worker e no Node.
export const SR = 44100;
export const midiHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export interface Bus { l: Float32Array; r: Float32Array }
export const bus = (n: number): Bus => ({ l: new Float32Array(n), r: new Float32Array(n) });

export type FilterKind = 'lp' | 'hp' | 'bp' | 'peak' | 'ls' | 'hs';

/** Filtro biquad (fórmulas RBJ). */
export class Biquad {
  private b0 = 1; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;

  constructor(kind: FilterKind, f: number, q = 0.707, db = 0, sr = SR) {
    const w = (2 * Math.PI * Math.min(f, sr * 0.47)) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
    const A = Math.pow(10, db / 40), rA = 2 * Math.sqrt(A) * al;
    let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
    if (kind === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (kind === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (kind === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (kind === 'peak') { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
    else if (kind === 'ls') {
      b0 = A * (A + 1 - (A - 1) * cw + rA); b1 = 2 * A * (A - 1 - (A + 1) * cw); b2 = A * (A + 1 - (A - 1) * cw - rA);
      a0 = A + 1 + (A - 1) * cw + rA; a1 = -2 * (A - 1 + (A + 1) * cw); a2 = A + 1 + (A - 1) * cw - rA;
    } else {
      b0 = A * (A + 1 + (A - 1) * cw + rA); b1 = -2 * A * (A - 1 + (A + 1) * cw); b2 = A * (A + 1 + (A - 1) * cw - rA);
      a0 = A + 1 - (A - 1) * cw + rA; a1 = 2 * (A - 1 - (A + 1) * cw); a2 = A + 1 - (A - 1) * cw - rA;
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }

  /** coeficientes, para os ciclos apertados que fazem as contas à mão */
  get k(): [number, number, number, number, number] { return [this.b0, this.b1, this.b2, this.a1, this.a2]; }

  tick(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = Math.abs(y) < 1e-20 ? 0 : y; // sem números denormais
    return y;
  }

  run(buf: Float32Array): Float32Array {
    for (let i = 0; i < buf.length; i++) buf[i] = this.tick(buf[i]);
    return buf;
  }
}

export const filters = (buf: Float32Array, list: [FilterKind, number, number?, number?][]) => {
  for (const [k, f, q, db] of list) new Biquad(k, f, q, db).run(buf);
  return buf;
};

/** Dente de serra sem serrilhado (polyBLEP). Soma em `out`. */
export function addSaw(out: Float32Array, f: number, gain: number, phase: number, vibHz = 0, vibDepth = 0, vibDelay = 0) {
  let p = phase % 1;
  const base = f / SR;
  let dt = base;
  for (let i = 0; i < out.length; i++) {
    if (vibDepth && (i & 63) === 0) { const t = i / SR, k = Math.min(1, Math.max(0, (t - vibDelay) * 2.5)); dt = base * (1 + vibDepth * k * Math.sin(2 * Math.PI * vibHz * t)); }
    p += dt; if (p >= 1) p -= 1;
    let v = 2 * p - 1;
    if (p < dt) { const x = p / dt; v -= x + x - x * x - 1; } else if (p > 1 - dt) { const x = (p - 1) / dt; v -= x * x + x + x + 1; }
    out[i] += v * gain;
  }
}

/** Soma `src` em `dst` a partir de `at`. */
export function mix(dst: Float32Array, src: Float32Array, at: number, gain = 1) {
  const from = Math.max(0, -at), to = Math.min(src.length, dst.length - at);
  for (let i = from; i < to; i++) dst[at + i] += src[i] * gain;
}

/** Soma um sinal mono num barramento estéreo, com panorâmica -1..1 (potência constante). */
export function place(b: Bus, src: Float32Array, at: number, gain: number, pan = 0) {
  const a = ((pan + 1) * Math.PI) / 4;
  mix(b.l, src, at, gain * Math.cos(a) * 1.414);
  mix(b.r, src, at, gain * Math.sin(a) * 1.414);
}

/** Entrada e saída suaves, em segundos. */
export function envelope(buf: Float32Array, attack: number, release: number) {
  const a = Math.min(buf.length, Math.round(attack * SR)), r = Math.min(buf.length, Math.round(release * SR));
  for (let i = 0; i < a; i++) buf[i] *= i / a;
  for (let i = 0; i < r; i++) buf[buf.length - 1 - i] *= i / r;
  return buf;
}

export function normalize(buf: Float32Array, peak = 1) {
  let m = 0;
  for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]));
  if (m > 0) { const g = peak / m; for (let i = 0; i < buf.length; i++) buf[i] *= g; }
  return buf;
}
