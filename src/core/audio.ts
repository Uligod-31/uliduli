// Áudio 100 % sintetizado (sem ficheiros): efeitos + música generativa suave.
import { save } from './save';

const PENTA = [0, 2, 4, 7, 9];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class Sfx {
  private ctx?: AudioContext;
  private master?: GainNode;
  private stepN = 0;
  private musicTimer?: number;
  private beat = 0;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = save.mute ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.startMusic();
  }

  setMute(m: boolean) {
    save.mute = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  }

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
  win() { [0, 4, 7, 12, 16].forEach((n, i) => this.tone(midi(67 + n), 0.4, 'triangle', 0.12, undefined, i * 0.09)); }

  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    this.musicTimer = window.setInterval(() => {
      if (save.mute || document.hidden) return;
      const b = this.beat++;
      if (b % 4 === 0) this.tone(midi(48 + PENTA[(b / 4) % 5 | 0]), 1.6, 'sine', 0.05);
      if (Math.random() < 0.55) this.tone(midi(72 + PENTA[(Math.random() * 5) | 0] + (Math.random() < 0.3 ? 12 : 0)), 0.9, 'sine', 0.028);
    }, 520);
  }
}

export const sfx = new Sfx();
