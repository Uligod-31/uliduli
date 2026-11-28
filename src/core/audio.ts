// Áudio 100 % sintetizado (MIDI-style, sem ficheiros): efeitos + tema industrial/metal ORIGINAL em loop,
// inspirado no estilo do metal industrial alemão (batida marcial, riffs graves em palm-mute, coro sombrio).
import { save } from './save';

const PENTA = [0, 2, 4, 7, 9];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

const D2 = 73.42;
const BPM = 120;
const STEP = 60 / BPM / 4;
const hz = (semi: number) => D2 * Math.pow(2, semi / 12);

// 16 compassos: I = intro, V = verso, P = pré-refrão (tensão), C = refrão
const SECTIONS = ['I', 'I', 'V', 'V', 'V', 'V', 'P', 'P', 'C', 'C', 'C', 'C', 'V', 'V', 'P', 'P'] as const;
const CHORD = [0, 8, 3, 10]; // Ré, Sib, Fá, Dó (refrão)
// riff do verso (semitons acima de Ré2, -1 = pausa): colcheias secas com tropeços cromáticos
const VERSE = [0, -1, 0, 0, -1, 0, 1, -1, 0, -1, 0, 0, -1, 3, 1, -1];
const VERSE2 = [0, -1, 0, 0, -1, 0, 6, 5, 0, -1, 0, 0, -1, 3, 1, 0];

class Sfx {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private gtrBus?: GainNode;
  private noise?: AudioBuffer;
  private stepN = 0;
  private timer?: number;
  private nextT = 0;
  private s = 0;

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
    this.musicGain.gain.value = 0.55;
    // compressor para colar tudo e dar "peso"
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.12;
    this.musicGain.connect(comp); comp.connect(this.master!);
    // guitarra: distorção forte + corte de "coluna"
    const shaper = c.createWaveShaper();
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * 7) * 0.9; }
    shaper.curve = curve; shaper.oversample = '4x';
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70;
    const mid = c.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 900; mid.gain.value = 5; mid.Q.value = 0.8;
    this.gtrBus = c.createGain(); this.gtrBus.gain.value = 0.85;
    this.gtrBus.connect(shaper); shaper.connect(lp); lp.connect(mid); mid.connect(hp); hp.connect(this.musicGain);
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

  step() { this.tone(midi(60 + PENTA[this.stepN++ % 5]), 0.07, 'square', 0.04); }
  bump() { this.tone(110, 0.12, 'sawtooth', 0.1, 55); }
  ui() { this.tone(520, 0.07, 'square', 0.06, 380); }
  collect() { [0, 3, 7, 10, 12].forEach((n, i) => this.tone(midi(72 + n), 0.16, 'square', 0.07, undefined, i * 0.05)); }
  shift() { this.tone(260, 0.4, 'sawtooth', 0.07, 60); this.tone(130, 0.4, 'square', 0.08, 40); }
  hint() { [0, 5, 9, 14].forEach((n, i) => this.tone(midi(84 + n), 0.22, 'triangle', 0.05, undefined, i * 0.05)); }
  win() { [0, 3, 7, 12, 15, 19].forEach((n, i) => this.tone(midi(62 + n), 0.45, 'sawtooth', 0.07, undefined, i * 0.08)); }

  // Chama Viva
  blow() { this.tone(520, 0.34, 'sawtooth', 0.05, 70); this.tone(1500, 0.28, 'triangle', 0.035, 180, 0.02); this.tone(90, 0.3, 'sine', 0.12, 45, 0.18); }
  heartbeat() { this.tone(72, 0.13, 'sine', 0.22, 46); this.tone(62, 0.16, 'sine', 0.16, 40, 0.17); }
  snuff() { this.tone(340, 0.8, 'triangle', 0.12, 40); this.tone(900, 0.35, 'sawtooth', 0.03, 120, 0.05); }

  // Vaga 3
  grow() { [0, 4, 7, 12].forEach((n, i) => this.tone(midi(55 + n), 0.18, 'square', 0.06, undefined, i * 0.06)); }
  shrink() { [12, 7, 4, 0].forEach((n, i) => this.tone(midi(67 + n), 0.12, 'triangle', 0.08, undefined, i * 0.05)); }
  mount() { this.tone(196, 0.16, 'square', 0.07, 294); this.tone(392, 0.22, 'triangle', 0.07, 523, 0.1); }
  smash() { this.tone(150, 0.35, 'sawtooth', 0.14, 35); this.tone(90, 0.45, 'square', 0.1, 30, 0.04); this.tone(600, 0.08, 'square', 0.05, 100); }
  mirror() { this.tone(1200, 0.09, 'triangle', 0.07, 1600); this.tone(800, 0.14, 'sine', 0.06, 1000, 0.05); }
  seal() { [0, 7, 12, 19].forEach((n, i) => this.tone(midi(60 + n), 0.5, 'triangle', 0.07, undefined, i * 0.09)); }
  chime(n: number) { this.tone(midi(76 + [0, 4, 7, 11, 14][n % 5]), 0.45, 'sine', 0.12); this.tone(midi(88 + [0, 4, 7, 11, 14][n % 5]), 0.3, 'triangle', 0.04, undefined, 0.04); }
  splash() { this.tone(420, 0.16, 'sine', 0.1, 140); this.tone(900, 0.08, 'triangle', 0.04, 300, 0.03); }
  refill() { [0, 2, 4, 7, 9].forEach((n, i) => this.tone(midi(64 + n), 0.09, 'sine', 0.09, undefined, i * 0.04)); }
  swap() { [880, 220, 1320, 330].forEach((f, i) => this.tone(f, 0.05, 'square', 0.06, f * 0.7, i * 0.035)); }
  tick() { this.tone(1500, 0.035, 'square', 0.035, 900); }

  // ───────────── banda ─────────────
  private chug(f: number, t: number, len: number, power = true) {
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(this.gtrBus!);
    const parts: [number, number][] = power ? [[1, -8], [1, 8], [1.5, 0], [2, 5]] : [[1, -8], [1, 8]];
    for (const [mul, det] of parts) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f * mul; o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + len + 0.03);
    }
  }
  private bass(f: number, t: number, len: number) {
    const c = this.ctx!;
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f / 2; o2.type = 'sine'; o2.frequency.value = f / 2;
    lp.type = 'lowpass'; lp.frequency.value = 480;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.34, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(this.musicGain!);
    o.start(t); o2.start(t); o.stop(t + len + 0.03); o2.stop(t + len + 0.03);
  }
  private kicks: number[] = [];
  /** Pulso 0..1 do último bumbo (para os visuais baterem com o ritmo). */
  pulse(): number {
    if (!this.ctx || save.mute) return 0;
    const now = this.ctx.currentTime;
    let p = 0;
    for (const t of this.kicks) if (t <= now) p = Math.max(p, Math.exp(-(now - t) * 9));
    if (this.kicks.length > 24) this.kicks = this.kicks.filter((t) => t > now - 0.5);
    return p;
  }
  private kick(t: number, vol = 0.95) {
    this.kicks.push(t);
    const c = this.ctx!;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.musicGain!); o.start(t); o.stop(t + 0.25);
    this.hit(t, 'click', vol * 0.25);
  }
  private tom(t: number, f: number, vol = 0.6) {
    const c = this.ctx!;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(this.musicGain!); o.start(t); o.stop(t + 0.3);
  }
  private hit(t: number, type: 'snare' | 'hat' | 'crash' | 'click', vol?: number) {
    const c = this.ctx!;
    const src = c.createBufferSource(); src.buffer = this.noise!;
    const f = c.createBiquadFilter(), g = c.createGain();
    const cfg = { snare: [1700, 'bandpass', 0.6, 0.24], hat: [8000, 'highpass', 0.12, 0.035], crash: [5200, 'highpass', 0.28, 1.2], click: [3500, 'highpass', 0.3, 0.02] } as const;
    const [fr, ty, v0, dur] = cfg[type];
    f.type = ty as BiquadFilterType; f.frequency.value = fr;
    const v = vol ?? v0;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.musicGain!); src.start(t); src.stop(t + dur + 0.02);
    if (type === 'snare') {
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.1);
      og.gain.setValueAtTime(0.45, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(og).connect(this.musicGain!); o.start(t); o.stop(t + 0.15);
    }
  }
  /** Coro sombrio sustentado (vogais "ah" por formantes). */
  private choir(f: number, t: number, len: number) {
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.18); g.gain.setValueAtTime(0.16, t + len - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + len);
    g.connect(this.musicGain!);
    for (const fr of [700, 1150, 2500]) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = 6;
      bp.connect(g);
      for (const det of [-12, 0, 12]) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * 2; o.detune.value = det;
        o.connect(bp); o.start(t); o.stop(t + len + 0.05);
      }
    }
  }
  private stab(f: number, t: number) {
    const c = this.ctx!;
    const g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    lp.connect(g).connect(this.musicGain!);
    for (const [m, d] of [[2, -6], [2, 6], [3, 0]] as const) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * m; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + 0.26); }
  }
  /** "HEY!" gritado (coro de multidão). */
  private shout(t: number) {
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    g.connect(this.musicGain!);
    for (const [fr, q] of [[650, 4], [1100, 5]] as const) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; bp.connect(g);
      for (const det of [-30, 0, 30]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.2); o.detune.value = det; o.connect(bp); o.start(t); o.stop(t + 0.22); }
    }
    const src = c.createBufferSource(); src.buffer = this.noise!;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2200; nf.Q.value = 1;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.2, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.connect(nf).connect(ng).connect(this.musicGain!); src.start(t); src.stop(t + 0.17);
  }

  private playStep(s: number, t: number) {
    const bar = (s >> 4) & 15, i = s & 15, sec = SECTIONS[bar];
    const beat = i % 4 === 0;

    if (sec === 'I') {
      if (beat) this.kick(t, 0.9);
      if (i === 8) this.hit(t, 'snare', 0.35);
      if (i % 2 === 0) this.hit(t, 'hat', 0.08);
      if (i === 0 && bar === 0) this.choir(hz(0) / 2, t, STEP * 32);
      if (bar === 1) { if ([0, 6, 10].includes(i)) { this.chug(hz(0), t, 0.1); this.bass(hz(0), t, 0.12); } if (i === 0 || i === 8) this.shout(t); }
    } else if (sec === 'V') {
      const riff = bar >= 12 ? VERSE2 : VERSE;
      const n = riff[i];
      if (n >= 0) { const open = riff[(i + 1) & 15] < 0; this.chug(hz(n), t, open ? 0.17 : 0.07, false); this.bass(hz(n), t, open ? 0.17 : 0.08); }
      if ([0, 6, 8, 10].includes(i)) this.kick(t);
      if (i === 4 || i === 12) this.hit(t, 'snare');
      if (i % 2 === 0) this.hit(t, 'hat');
      if (i === 0 && bar % 2 === 0) this.stab(hz(12), t);
    } else if (sec === 'P') {
      const root = [5, 7][bar & 1];
      this.chug(hz(root), t, 0.07, false); this.bass(hz(root), t, 0.08);
      if (beat) this.kick(t, 0.95);
      const last = bar === 7 || bar === 15;
      if (last && i >= 8) this.hit(t, 'snare', 0.2 + (i - 8) * 0.07);
      else if (i === 4 || i === 12) this.hit(t, 'snare');
      if (last && (i === 8 || i === 10 || i === 12 || i === 14)) this.tom(t, 90 - (i - 8) * 6);
      if (i === 0) this.choir(hz(root), t, STEP * 16);
    } else {
      const root = CHORD[bar & 3];
      if ([0, 6, 10].includes(i)) this.chug(hz(root), t, 0.34, true);
      else if (i === 8) this.chug(hz(root), t, 0.5, true);
      if (i % 4 === 0 || i === 6 || i === 10) this.bass(hz(root), t, 0.28);
      if (beat || i === 6 || i === 14) this.kick(t, 1);
      if (i === 4 || i === 12) { this.hit(t, 'snare', 0.8); this.hit(t, 'crash', 0.12); }
      if (i % 2 === 0) this.hit(t, 'hat', 0.1);
      if (i === 0) { this.hit(t, 'crash'); this.choir(hz(root), t, STEP * 16); this.shout(t); }
      if (i === 8) this.shout(t);
    }
  }

  startMusic() {
    if (this.timer || !this.ctx || !this.gtrBus) return;
    this.nextT = this.ctx.currentTime + 0.12;
    this.timer = window.setInterval(() => {
      const c = this.ctx!;
      while (this.nextT < c.currentTime + 0.2) {
        if (!save.mute && !document.hidden) this.playStep(this.s, this.nextT);
        this.nextT += STEP;
        this.s = (this.s + 1) & 255;
      }
    }, 30);
  }
}

export const sfx = new Sfx();
