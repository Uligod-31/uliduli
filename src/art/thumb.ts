import Phaser from 'phaser';
import { generate, Maze } from '../core/maze';
import { LevelDef, WorldDef, levelOpts } from '../worlds';
import { buildLevel, cloneMaze } from '../core/mech';
import { CharKind } from './characters';
import { snap } from '../three/snap';

const levelCache = new Map<LevelDef, Maze>();
export function levelMaze(def: LevelDef): Maze {
  let m = levelCache.get(def);
  if (!m) { m = buildLevel(def, levelOpts(def)); levelCache.set(def, m); }
  return cloneMaze(m);
}

const S = 1.5; // supersampling das miniaturas

// ───────────── cache persistente (IndexedDB) ─────────────
// As miniaturas 3D são caras de desenhar (centenas de ms cada). Guardam-se por versão da app,
// por isso só se desenham uma vez por instalação e depois aparecem quase de imediato.
const VER = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0';
let dbp: Promise<IDBDatabase | null> | undefined;
function db(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    if ((import.meta as any).env?.DEV) { res(null); return; } // em desenvolvimento desenha sempre de novo
    try {
      const rq = indexedDB.open('uliduli-thumbs', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('t');
      rq.onsuccess = () => {
        const d = rq.result;
        // limpa miniaturas de versões antigas
        try {
          const tx = d.transaction('t', 'readwrite'); const st = tx.objectStore('t');
          st.openKeyCursor().onsuccess = function walk(this: IDBRequest<IDBCursor | null>) {
            const c = this.result; if (!c) return;
            if (!String(c.key).startsWith(VER + '|')) st.delete(c.key);
            c.continue();
          };
        } catch { /* sem limpeza */ }
        res(d);
      };
      rq.onerror = () => res(null); rq.onblocked = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
async function dbGet(key: string): Promise<string | null> {
  const d = await db(); if (!d) return null;
  return new Promise((res) => { try { const r = d.transaction('t').objectStore('t').get(VER + '|' + key); r.onsuccess = () => res((r.result as string) ?? null); r.onerror = () => res(null); } catch { res(null); } });
}
async function dbPut(key: string, v: string) {
  const d = await db(); if (!d) return;
  try { d.transaction('t', 'readwrite').objectStore('t').put(v, VER + '|' + key); } catch { /* cheio */ }
}

// ───────────── fila de desenho: uma miniatura de cada vez, sem bloquear o toque ─────────────
type Job = { key: string; make: () => HTMLCanvasElement; tex: Phaser.Textures.TextureManager };
const queue: Job[] = [];
let busy = false;
const waiting = new Map<string, (() => void)[]>();

function pump() {
  if (busy) return;
  const j = queue.shift();
  if (!j) return;
  busy = true;
  // deixa passar os eventos de toque/animação entre miniaturas
  setTimeout(() => {
    try {
      const c = j.make();
      if (!j.tex.exists(j.key)) j.tex.addCanvas(j.key, c);
      setTimeout(() => { try { dbPut(j.key, c.toDataURL('image/webp', 0.88)); } catch { /* ignora */ } }, 50);
    } catch (e) { console.warn('miniatura falhou', e); }
    finish(j.key);
    busy = false; pump();
  }, 24);
}

function finish(key: string) {
  const cbs = waiting.get(key); waiting.delete(key);
  cbs?.forEach((f) => f());
}

function ensure(scene: Phaser.Scene, key: string, make: () => HTMLCanvasElement, cb: () => void) {
  if (scene.textures.exists(key)) { cb(); return; }
  const w = waiting.get(key);
  if (w) { w.push(cb); return; }
  waiting.set(key, [cb]);
  const tex = scene.textures;
  dbGet(key).then((url) => {
    if (url) {
      const im = new Image();
      im.onload = () => { if (!tex.exists(key)) tex.addImage(key, im); finish(key); };
      im.onerror = () => { queue.push({ key, make, tex }); pump(); };
      im.src = url;
    } else { queue.push({ key, make, tex }); pump(); }
  });
}

function image(scene: Phaser.Scene, key: string, make: () => HTMLCanvasElement, w: number, h: number) {
  const img = scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setDisplaySize(w, h);
  if (scene.textures.exists(key)) { img.setTexture(key).setDisplaySize(w, h); return img; }
  img.setVisible(false);
  ensure(scene, key, make, () => {
    if (!img.active || !img.scene) return; // a cena já mudou
    img.setTexture(key).setDisplaySize(w, h).setVisible(true);
    const a = img.alpha; img.setAlpha(0);
    img.scene.tweens.add({ targets: img, alpha: a, duration: 220 });
  });
  return img;
}

/** Miniatura 3D de uma ilha de labirinto (com o trilho do jogador, se existir). */
export function artFor(scene: Phaser.Scene, m: Maze, wd: WorldDef, seed: number, w: number, h: number, trail?: number[]) {
  const key = `art_${wd.id}_${seed}_${m.cols}x${m.rows}_${w}x${h}_${trail?.length ?? 0}`;
  return image(scene, key, () => snap.island(m, wd, seed, Math.round(w * S), Math.round(h * S), trail), w, h);
}

export function worldPreview(scene: Phaser.Scene, wd: WorldDef, size: number) {
  const p = wd.preview;
  const m = generate({ cols: p.cols, rows: p.rows, mask: p.mask, seed: p.seed, dyn: 0, loops: 0.04 });
  return artFor(scene, m, wd, p.seed, size, size);
}

/** Retrato 3D de uma personagem (cacheado). */
export function portraitImage(scene: Phaser.Scene, kind: CharKind, w: number, h: number) {
  return image(scene, `portrait_${kind}`, () => snap.portrait(kind, Math.round(w * S), Math.round(h * S)), w, h);
}
