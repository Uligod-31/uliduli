import Phaser from 'phaser';
import { generate, Maze } from '../core/maze';
import { LevelDef, WorldDef, levelOpts } from '../worlds';
import { CharKind } from './characters';
import { snap } from '../three/snap';

export function levelMaze(def: LevelDef): Maze {
  return generate(levelOpts(def));
}

const S = 1.5; // supersampling das miniaturas

function image(scene: Phaser.Scene, key: string, make: () => HTMLCanvasElement, w: number, h: number) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, make());
  return scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(w, h);
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
