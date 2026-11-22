// Áudio 100 % sintetizado (sem ficheiros): efeitos + banda de rock/heavy metal a tocar em loop.
import { save } from './save';

const PENTA = [0, 2, 4, 7, 9];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// ── riffs (semitons acima de Mi2; -1 = pausa), 4 compassos de 16 passos, Mi menor ──
const E2 = 82.41;
const RIFF: number[][] = [
  [0, 0, -1, 0, 0, -1, 3, -1, 0, 0, -1, 0, 5, -1, 3, -1],
  [0, 0, -1, 0, 0, -1, 7, -1, 0, 0, -1, 0, 6, 5, 3, -1],
  [8, 8, -1, 8, 8, -1, 7, -1, 3, 3, -1, 3, 5, -1, 7, -1],
  [0, 0, 0, 0, -1, -1, 3, -1, 5, 5, 5, 5, 7, -1, 10, 12],
];
const BPM = 152;
const STEP = 60 / BPM / 4;

class Sfx {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private gtrBus?: GainNode;
  private noise?: AudioBuffer;
  private stepN = 0;
  private timer?: number;
  private nextT = 0;
  private s16 = 0;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = save.mute ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.buildMusicChain();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.startMusic();
  }

  setMute(m: boolean) {
    save.mute = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  }

  private buildMusicChain() {
    const c = this.ctx!;
    this.musicGain = c.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master!);
    // guitarra: distorção (waveshaper) + filtro de "coluna"
    const shaper = c.createWaveShaper();
    const k = 60, n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * k * 0.12) * 0.9; }
    shaper.curve = curve; shaper.oversample = '2x';
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
    this.gtrBus = c.createGain(); this.gtrBus.gain.value = 0.9;
    this.gtrBus.connect(shaper); shaper.connect(lp); lp.connect(hp); hp.connect(this.musicGain);
    // ruído para caixa/pratos
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // ───────────── efeitos ─────────────
  private tone(f: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slideTo?: number, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  step() { this.tone(midi(72 + PENTA[this.stepN++ % 5]), 0.09, 'triangle', 0.06); }
  bump() { this.tone(120, 0.1, 'sine', 0.12, 70); }
  ui() { this.tone(660, 0.08, 'triangle', 0.08); }
  collect() { [0, 4, 7, 12].forEach((n, i) => this.tone(midi(76 + n), 0.18, 'sine', 0.11, undefined, i * 0.06)); }
  shift() { this.tone(300, 0.35, 'sawtooth', 0.05, 90); this.tone(180, 0.35, 'sine', 0.1, 60); }
  hint() { [0, 5, 9, 14].forEach((n, i) => this.tone(midi(84 + n), 0.25, 'sine', 0.05, undefined, i * 0.05)); }
  win() { [0, 4, 7, 12, 16].forEach((n, i) => this.tone(midi(67 + n), 0.4, 'sawtooth', 0.08, undefined, i * 0.09)); }

  // ───────────── banda ─────────────
  private chug(f: number, t: number, len: number) {
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(this.gtrBus!);
    for (const [mul, det] of [[1, -7], [1, 7], [1.5, 0], [2, 4]] as const) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f * mul; o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + len + 0.03);
    }
  }
  private bass(f: number, t: number, len: number) {
    const c = this.ctx!;
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f / 2;
    lp.type = 'lowpass'; lp.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp).connect(g).connect(this.musicGain!); o.start(t); o.stop(t + len + 0.03);
  }
  private kick(t: number) {
    const c = this.ctx!;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(this.musicGain!); o.start(t); o.stop(t + 0.2);
  }
  private hit(t: number, type: 'snare' | 'hat' | 'crash') {
    const c = this.ctx!;
    const src = c.createBufferSource(); src.buffer = this.noise!;
    const f = c.createBiquadFilter(), g = c.createGain();
    const cfg = { snare: [1800, 'bandpass', 0.55, 0.16], hat: [7500, 'highpass', 0.18, 0.04], crash: [5000, 'highpass', 0.3, 0.9] } as const;
    const [fr, ty, vol, dur] = cfg[type];
    f.type = ty as BiquadFilterType; f.frequency.value = fr;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.musicGain!); src.start(t); src.stop(t + dur + 0.02);
    if (type === 'snare') {
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.09);
      og.gain.setValueAtTime(0.4, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(og).connect(this.musicGain!); o.start(t); o.stop(t + 0.14);
    }
  }

  private playStep(s: number, t: number) {
    const bar = (s >> 4) & 3, i = s & 15;
    const note = RIFF[bar][i];
    if (note >= 0) {
      const f = E2 * Math.pow(2, note / 12);
      const open = RIFF[bar][(i + 1) & 15] < 0;
      this.chug(f, t, open ? 0.2 : 0.07);
      this.bass(f, t, open ? 0.2 : 0.09);
    }
    // bateria
    if (note >= 0 && (bar === 3 ? i >= 8 || i % 4 === 0 : [0, 2, 3, 6, 8, 10, 11, 14].includes(i))) this.kick(t);
    if (i === 4 || i === 12) this.hit(t, 'snare');
    if (bar === 3 && i >= 13) this.hit(t, 'snare');
    if (i % 2 === 0) this.hit(t, 'hat');
    if (s === 0 || (bar === 3 && i === 15 && false)) this.hit(t, 'crash');
  }

  startMusic() {
    if (this.timer || !this.ctx || !this.gtrBus) return;
    this.nextT = this.ctx.currentTime + 0.12;
    this.timer = window.setInterval(() => {
      const c = this.ctx!;
      while (this.nextT < c.currentTime + 0.18) {
        if (!save.mute && !document.hidden) this.playStep(this.s16, this.nextT);
        this.nextT += STEP;
        this.s16 = (this.s16 + 1) & 63;
      }
    }, 30);
  }
}

export const sfx = new Sfx();
