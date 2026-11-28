import Phaser from 'phaser';
import { W, H } from './core/theme';
import { TitleScene } from './scenes/TitleScene';
import { WorldsScene } from './scenes/WorldsScene';
import { LevelsScene } from './scenes/LevelsScene';
import { GameScene } from './scenes/GameScene';
import { GalleryScene } from './scenes/GalleryScene';
import { TutorialScene } from './scenes/TutorialScene';
import { stage } from './three/Stage';
import { snap } from './three/snap';
import { sfx } from './core/audio';
import { music } from './audio/player';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  transparent: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 2 },
  scene: [TitleScene, WorldsScene, LevelsScene, GameScene, GalleryScene, TutorialScene],
});

// útil para depuração no browser
(window as any).__game = game;
(window as any).__stage = stage;
(window as any).__snap = snap;
(window as any).__music = music;

// os telemóveis só deixam haver som depois de um toque: qualquer toque serve
for (const t of ['pointerup', 'touchend', 'keydown']) window.addEventListener(t, () => sfx.unlock(), { capture: true, passive: true });
