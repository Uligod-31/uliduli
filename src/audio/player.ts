// O leitor de música do jogo: cada ecrã pede o seu tema; o leitor calcula-o (num Worker), faz a passagem suave
// do tema anterior e guarda os últimos na memória. Se a pessoa escolheu ficheiros seus para um mundo, toca esses.
import { BANDS } from './bands';
import { library } from './library';
import type { Job } from './worker';

export interface TrackRef { world: string; level: number; title: string }
export interface Now { world: string; level: number; band: string; title: string; mine: boolean }

interface Clip { sampleRate: number; l: Float32Array; r: Float32Array; kicks: number[]; buffer?: AudioBuffer }
interface Sound { src: AudioBufferSourceNode; gain: GainNode; before?: Sound; start: number; offset: number; clip: Clip; full: boolean }

const KEEP = 3;              // temas completos em memória
const keyOf = (t: TrackRef) => `${t.world}:${t.level}`;
export const MENU: TrackRef = { world: 'menu', level: 0, title: 'Acende!' };

class Music {
  private ctx?: AudioContext;
  private out?: GainNode;
  private want?: TrackRef;
  private sound?: Sound;
  private soundKey = '';
  private full = new Map<string, Clip>();
  private intros = new Map<string, Clip>();
  private worker?: Worker;
  private job?: { key: string; ahead: boolean };
  private queued?: TrackRef;
  private turn = 0;
  private el?: HTMLAudioElement;
  private url = '';
  private ears?: AnalyserNode;
  private bins = new Uint8Array(128);
  private listeners = new Set<(n: Now) => void>();
  now?: Now;
  private mineWanted = false;

  /** o tema pedido pelo ecrã atual */
  get wanted() { return this.want; }

  /** avisa quando um tema começa a ouvir-se; devolve como deixar de ouvir os avisos */
  onNow(fn: (n: Now) => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }

  /** chamado depois do primeiro toque, quando o navegador já deixa haver som */
  attach(ctx: AudioContext, destination: AudioNode) {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain(); this.out.gain.value = 0.5; this.out.connect(destination);
    // o leitor dos ficheiros da pessoa tem de ser «acordado» dentro de um toque (iPhone)
    try {
      this.el = new Audio();
      this.el.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==';
      void this.el.play().catch(() => {});
      this.ears = ctx.createAnalyser(); this.ears.fftSize = 256;
      ctx.createMediaElementSource(this.el).connect(this.ears); this.ears.connect(this.out);
    } catch { this.el = undefined; }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { void ctx.suspend(); this.el?.pause(); }
      else { void ctx.resume(); if (this.now?.mine) void this.el?.play().catch(() => {}); }
    });
    if (this.want) void this.apply(this.want);
  }

  play(ref: TrackRef) {
    const same = this.want && keyOf(this.want) === keyOf(ref);
    this.want = ref;
    if (same && this.soundKey.startsWith(keyOf(ref) + '|')) return;
    void this.apply(ref);
  }

  /** volta a decidir o que tocar (por exemplo depois de escolher ou tirar ficheiros) */
  refresh() { this.soundKey = ''; if (this.want) void this.apply(this.want); }

  /** prepara um tema antes de ser preciso */
  ahead(ref: TrackRef) {
    const key = keyOf(ref);
    if (this.full.has(key)) return;
    void library.get(ref.world).then((mine) => { if (!mine.length) this.request(ref, true); });
  }

  private async apply(ref: TrackRef) {
    const turn = ++this.turn, key = keyOf(ref);
    const mine = await library.get(ref.world);
    if (turn !== this.turn) return;
    this.mineWanted = mine.length > 0;
    if (mine.length) { if (this.soundKey !== `${key}|mine`) this.playMine(ref, mine[ref.level % mine.length]); return; }
    if (this.soundKey === `${key}|synth` && this.sound?.full) return; // já é este que se ouve
    const done = this.full.get(key);
    if (done) { this.start(ref, done, true); return; }
    const intro = this.intros.get(key);
    if (intro) this.start(ref, intro, false);
    this.request(ref, false);
  }

  private request(ref: TrackRef, ahead: boolean) {
    const key = keyOf(ref);
    if (this.job?.key === key) { if (!ahead) this.job.ahead = false; return; }
    if (this.job) {
      if (ahead) { this.queued = ref; return; }
      // o que está a ser calculado já não interessa: começa-se de novo
      this.worker?.terminate(); this.worker = undefined; this.job = undefined;
    }
    try {
      if (!this.worker) {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e) => this.receive(e.data);
        this.worker.onerror = (e) => { console.warn('música: o cálculo falhou', e.message); this.worker?.terminate(); this.worker = undefined; this.job = undefined; };
      }
      this.job = { key, ahead };
      this.worker.postMessage({ key, world: ref.world, level: ref.level, title: ref.title } satisfies Job);
    } catch (e) { console.warn('música indisponível', e); }
  }

  private receive(m: { key: string; kind: 'intro' | 'full' | 'error'; message?: string } & Clip) {
    if (m.kind === 'error') { console.warn('música:', m.message); this.job = undefined; return; }
    const clip: Clip = { sampleRate: m.sampleRate, l: m.l, r: m.r, kicks: m.kicks };
    const wanted = this.want && keyOf(this.want) === m.key && !this.mineWanted;
    if (m.kind === 'intro') {
      this.intros.set(m.key, clip);
      if (this.intros.size > KEEP) this.intros.delete(this.intros.keys().next().value!);
      if (wanted && this.soundKey !== `${m.key}|synth`) this.start(this.want!, clip, false);
      return;
    }
    this.full.set(m.key, clip);
    for (const k of this.full.keys()) { if (this.full.size <= KEEP) break; if (!this.want || k !== keyOf(this.want)) this.full.delete(k); }
    this.intros.delete(m.key);
    this.job = undefined;
    if (wanted) {
      if (this.sound && !this.sound.full && this.soundKey === `${m.key}|synth`) this.grow(clip);
      else this.start(this.want!, clip, true);
    }
    const q = this.queued; this.queued = undefined;
    if (q) this.ahead(q);
  }

  private buffer(c: Clip): AudioBuffer {
    if (!c.buffer) {
      c.buffer = this.ctx!.createBuffer(2, c.l.length, c.sampleRate);
      c.buffer.getChannelData(0).set(c.l); c.buffer.getChannelData(1).set(c.r);
      c.l = c.r = new Float32Array(0); // já está no buffer: liberta memória
    }
    return c.buffer;
  }

  private source(clip: Clip): { src: AudioBufferSourceNode; gain: GainNode } {
    const src = this.ctx!.createBufferSource(), gain = this.ctx!.createGain();
    src.buffer = this.buffer(clip); src.loop = true; src.connect(gain); gain.connect(this.out!);
    return { src, gain };
  }

  private fadeOut(s: Sound | undefined, time: number) {
    if (!s) return;
    const t = this.ctx!.currentTime;
    s.gain.gain.cancelScheduledValues(t); s.gain.gain.setValueAtTime(s.gain.gain.value, t); s.gain.gain.linearRampToValueAtTime(0, t + time);
    try { s.src.stop(t + time + 0.05); } catch { /* já parada */ }
    this.fadeOut(s.before, time); s.before = undefined;
  }

  private start(ref: TrackRef, clip: Clip, full: boolean) {
    if (!this.ctx) return;
    this.fadeOut(this.sound, 0.7);
    if (this.el && !this.el.paused) this.el.pause();
    const { src, gain } = this.source(clip), t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(1, t + 0.45);
    src.start(t);
    this.sound = { src, gain, start: t, offset: 0, clip, full };
    this.announce(ref, `${keyOf(ref)}|synth`, BANDS[ref.world]?.band ?? '', ref.title, false);
  }

  /** a introdução está a tocar e o tema inteiro ficou pronto: continua nele, na volta seguinte, sem cortes */
  private grow(clip: Clip) {
    const old = this.sound!, ctx = this.ctx!, length = old.src.buffer!.duration;
    const when = old.start + Math.ceil((ctx.currentTime + 0.1 - old.start) / length) * length;
    const { src, gain } = this.source(clip), offset = length % src.buffer!.duration;
    src.start(when, offset);
    old.src.stop(when);
    this.sound = { src, gain, before: old, start: when, offset, clip, full: true };
  }

  private playMine(ref: TrackRef, file: { name: string; blob: Blob }) {
    if (!this.ctx || !this.el) return;
    const key = `${keyOf(ref)}|mine`;
    this.fadeOut(this.sound, 0.5); this.sound = undefined;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(file.blob);
    this.el.src = this.url; this.el.loop = true;
    void this.el.play().catch((e) => console.warn('não consegui tocar o ficheiro', e));
    this.announce(ref, key, 'A minha música', file.name.replace(/\.[a-z0-9]+$/i, ''), true);
  }

  private announce(ref: TrackRef, key: string, band: string, title: string, mine: boolean) {
    this.soundKey = key;
    this.now = { world: ref.world, level: ref.level, band, title, mine };
    for (const fn of this.listeners) fn(this.now);
  }

  /** Pulso 0..1 do último bombo (os visuais batem com o ritmo). */
  pulse(): number {
    if (!this.ctx) return 0;
    if (this.now?.mine) {
      if (!this.ears || !this.el || this.el.paused) return 0;
      this.ears.getByteFrequencyData(this.bins);
      return Math.max(0, Math.min(1, ((this.bins[0] + this.bins[1] + this.bins[2]) / 765 - 0.55) * 2.4));
    }
    const s = this.sound;
    if (!s?.src.buffer) return 0;
    const live = this.ctx.currentTime < s.start && s.before ? s.before : s;
    const length = live.src.buffer!.duration, at = (((this.ctx.currentTime - live.start + live.offset) % length) + length) % length, k = live.clip.kicks;
    let lo = 0, hi = k.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (k[mid] <= at) lo = mid + 1; else hi = mid; }
    return lo ? Math.exp(-(at - k[lo - 1]) * 9) : 0;
  }
}

export const music = new Music();
