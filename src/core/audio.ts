// Efeitos sonoros sintetizados e o interruptor geral do som. A música de cada mundo está em `audio/`.
import { save } from './save';
import { MENU, music } from '../audio/player';

const PENTA = [0, 2, 4, 7, 9];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class Sfx {
  private ctx?: AudioContext;
  private master?: GainNode;
  private stepN = 0;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = save.mute ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      music.attach(this.ctx, this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMute(m: boolean) {
    save.mute = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
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

  /** Pulso 0..1 do ritmo da música (para os visuais). */
  pulse(): number { return save.mute ? 0 : music.pulse(); }
}

export const sfx = new Sfx();
music.play(MENU);
