import Phaser from 'phaser';
import { W, toHex } from './theme';
import { WORLDS, WorldDef } from '../worlds';
import { drawPlate, drawSky, drawFrame, drawChrome } from '../three/menuArt';

export const CARD_H = 210;

/** Placa de um cartão de mundo (cacheada por mundo). */
export function ensureWorldCard(tm: Phaser.Textures.TextureManager, wd: WorldDef): string {
  const key = `card_${wd.id}_${wd.ready ? 1 : 0}`;
  if (!tm.exists(key)) tm.addCanvas(key, drawPlate(W - 80, CARD_H, false, 1.5, wd.ready ? toHex(wd.pal.accent) : '#4a4f5e'));
  return key;
}

/**
 * Aquece as texturas do menu dos Mundos aos poucos, enquanto o ecrã inicial está parado,
 * para que a transição para lá não tenha de as desenhar todas de uma vez.
 * Uma tarefa pequena de cada vez, com pausas, para não estragar a animação do olho.
 */
export function warmMenus(scene: Phaser.Scene, ok: () => boolean) {
  const tm = scene.textures;
  const jobs: (() => void)[] = [
    () => { if (!tm.exists('skyArt')) tm.addCanvas('skyArt', drawSky(720)); },
    () => { if (!tm.exists('frameArt2')) tm.addCanvas('frameArt2', drawFrame(720)); },
    () => { if (!tm.exists('chrome_Mundos')) tm.addCanvas('chrome_Mundos', drawChrome('MUNDOS', 1100, 260, 200, false)); },
    () => { if (!tm.exists('plate_160_80_0')) tm.addCanvas('plate_160_80_0', drawPlate(160, 80, false, 2)); },
    ...WORLDS.map((wd) => () => { ensureWorldCard(tm, wd); }),
  ];
  let i = 0;
  const step = () => {
    if (!ok() || i >= jobs.length) return;
    try { jobs[i++](); } catch { /* ignora */ }
    setTimeout(step, 110);
  };
  setTimeout(step, 1400);
}
