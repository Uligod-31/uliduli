// A página «Sala de Ensaios»: escolhe uma banda, o motor do jogo calcula o tema e toca-o em loop.
import { Rendered, renderSteps } from '../../src/audio/render';
import { SONGS } from '../../src/audio/songs';

declare const WORKER_SOURCE: string;

interface Track { buffer?: AudioBuffer; kicks: number[]; waiting?: Promise<void> }
const tracks = new Map<string, Track>();
const $ = <T extends HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;

let ctx: AudioContext | undefined, analyser: AnalyserNode, gain: GainNode;
let source: AudioBufferSourceNode | undefined, playing = '', wanted = '', startedAt = 0;

const list = $('#faixas');
for (const s of SONGS) {
  const li = document.createElement('li');
  li.className = 'faixa'; li.dataset.id = s.id;
  li.innerHTML = `<button class="tocar" type="button" aria-label="Tocar ${s.title}"><span></span></button>
    <div class="info"><p class="mundo"></p><h2></h2><p class="tema"></p><p class="historia"></p><p class="estado" aria-live="polite"></p><div class="barra"><i></i></div></div>`;
  $('.mundo', li).textContent = s.world;
  $('h2', li).textContent = s.band;
  $('.tema', li).textContent = `«${s.title}» · ${s.style} · ${s.bpm} bpm`;
  $('.historia', li).textContent = s.story;
  $('button', li).addEventListener('click', () => toggle(s.id));
  list.appendChild(li);
}
const row = (id: string) => $(`.faixa[data-id="${id}"]`);
const status = (id: string, text: string) => { $('.estado', row(id)).textContent = text; };

let worker: Worker | null | undefined;
const pending = new Map<string, (r: Rendered | Error) => void>();
function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' })));
    worker.onmessage = (e) => {
      const { id, stage, done, error } = e.data;
      if (stage) status(id, `A afinar a banda: ${stage}…`);
      else pending.get(id)?.(error ? new Error(error) : done);
    };
    worker.onerror = () => { worker = null; for (const [id, f] of pending) f(compute(id)); };
  } catch { worker = null; }
  return worker;
}
/** reserva para quando não há Worker: calcula no fio principal */
function compute(id: string): Rendered {
  const g = renderSteps(SONGS.find((s) => s.id === id)!);
  for (;;) { const r = g.next(); if (r.done) return r.value; }
}

function load(id: string): Promise<void> {
  let t = tracks.get(id);
  if (!t) tracks.set(id, (t = { kicks: [] }));
  const track = t;
  if (track.buffer) return Promise.resolve();
  return (track.waiting ??= new Promise<void>((resolve, reject) => {
    status(id, 'A chamar a banda…');
    const finish = (r: Rendered | Error) => {
      pending.delete(id);
      if (r instanceof Error) { track.waiting = undefined; status(id, `Não consegui gerar este tema: ${r.message}`); reject(r); return; }
      const b = ctx!.createBuffer(2, r.l.length, r.sampleRate);
      b.getChannelData(0).set(r.l); b.getChannelData(1).set(r.r);
      track.buffer = b; track.kicks = r.kicks; status(id, ''); resolve();
    };
    pending.set(id, finish);
    const w = getWorker();
    if (w) w.postMessage({ id });
    else setTimeout(() => { try { finish(compute(id)); } catch (e) { finish(e as Error); } }, 60);
  }));
}

function stop() {
  if (source) { source.onended = null; source.stop(); source = undefined; }
  if (playing) row(playing).classList.remove('a-tocar');
  if (playing) $<HTMLElement>('.barra i', row(playing)).style.width = '0';
  playing = '';
}

async function toggle(id: string) {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    gain = ctx.createGain(); analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.72;
    gain.connect(analyser); analyser.connect(ctx.destination);
  }
  void ctx.resume();
  if (playing === id || wanted === id) { wanted = ''; stop(); status(id, ''); document.querySelectorAll('.a-carregar').forEach((e) => e.classList.remove('a-carregar')); return; }
  stop(); wanted = id;
  document.querySelectorAll('.a-carregar').forEach((e) => e.classList.remove('a-carregar'));
  row(id).classList.add('a-carregar');
  try { await load(id); } catch { row(id).classList.remove('a-carregar'); return; }
  row(id).classList.remove('a-carregar');
  if (wanted !== id) return;
  wanted = ''; stop();
  source = ctx.createBufferSource(); source.buffer = tracks.get(id)!.buffer!; source.loop = true; source.connect(gain);
  source.start(); startedAt = ctx.currentTime; playing = id;
  row(id).classList.add('a-tocar');
}

// ── visualizador no topo: barras do espetro e a chama que salta com o bombo ──
const canvas = $<HTMLCanvasElement>('#espetro'), g = canvas.getContext('2d')!;
const bins = new Uint8Array(128);
const flame = $('#chama');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
function draw() {
  requestAnimationFrame(draw);
  const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  g.clearRect(0, 0, w, h);
  if (playing && analyser) analyser.getByteFrequencyData(bins); else bins.fill(0);
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#3b74f2'); grad.addColorStop(0.55, '#8a4bea'); grad.addColorStop(1, '#e02bc0');
  g.fillStyle = grad;
  const n = 48, step = w / n;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(Math.pow(i / n, 1.5) * 90), v = bins[k] / 255, t = performance.now() / 1000;
    const bar = Math.max(h * 0.03, playing ? v * v * h : h * (0.05 + 0.025 * Math.sin(t * 2 + i * 0.4)));
    g.fillRect(i * step + step * 0.18, h - bar, step * 0.64, bar);
  }
  let beat = 0;
  if (playing && ctx) {
    const t = tracks.get(playing)!, dur = t.buffer!.duration, at = (ctx.currentTime - startedAt) % dur;
    for (const k of t.kicks) if (k <= at && at - k < 0.4) beat = Math.max(beat, Math.exp(-(at - k) * 11));
    $<HTMLElement>('.barra i', row(playing)).style.width = `${(at / dur) * 100}%`;
  }
  flame.style.transform = calm.matches ? '' : `scale(${1 + beat * 0.16}, ${1 + beat * 0.24})`;
}
draw();
