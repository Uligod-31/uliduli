import Phaser from 'phaser';
import { Line } from '../worlds';
import { CHAR_NAMES, CHAR_COLORS } from '../art/characters';
import { portraitImage } from '../art/thumb';
import { FONT, UI, W, H, toHex } from '../core/theme';
import { sfx } from '../core/audio';

/** Diálogo curto com retrato 3D + balão. Toca para avançar. */
export function playDialogue(scene: Phaser.Scene, lines: Line[], onDone: () => void) {
  const root = scene.add.container(0, 0).setDepth(200);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
  root.add(dim);

  const card = scene.add.graphics();
  card.fillStyle(0x14151a, 0.92); card.fillRoundedRect(40, 880, W - 80, 290, 34);
  card.lineStyle(3, UI.line, 1); card.strokeRoundedRect(40, 880, W - 80, 290, 34);
  root.add(card);

  const name = scene.add.text(80, 910, '', { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#fff' });
  const text = scene.add.text(80, 962, '', { fontFamily: FONT, fontSize: '32px', color: UI.text, wordWrap: { width: W - 160 }, lineSpacing: 8 });
  const next = scene.add.text(W - 80, 1136, 'tocar ▸', { fontFamily: FONT, fontSize: '24px', color: toHex(UI.blue) }).setOrigin(1, 0.5);
  root.add([name, text, next]);
  scene.tweens.add({ targets: next, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });

  let i = 0;
  let pic: Phaser.GameObjects.Container | undefined;
  let typing: Phaser.Time.TimerEvent | undefined;
  let full = '';

  const show = () => {
    const l = lines[i];
    pic?.destroy();
    const left = l.who !== 'uli';
    const pw = 340, ph = 425;
    const img = portraitImage(scene, l.who, pw, ph);
    const frame = scene.add.graphics();
    frame.lineStyle(4, CHAR_COLORS[l.who], 0.9); frame.strokeRoundedRect(0, 0, pw, ph, 40);
    pic = scene.add.container(left ? 40 : W - 40 - pw, 430, [img, frame]);
    root.add(pic);
    scene.tweens.add({ targets: pic, y: { from: 470, to: 430 }, alpha: { from: 0, to: 1 }, duration: 260, ease: 'Back.Out' });
    name.setText(CHAR_NAMES[l.who]).setColor(toHex(CHAR_COLORS[l.who]));
    full = l.text;
    text.setText('');
    typing?.remove();
    let n = 0;
    typing = scene.time.addEvent({
      delay: 22, repeat: full.length - 1,
      callback: () => { text.setText(full.slice(0, ++n)); if (n % 3 === 0) sfx.step(); },
    });
  };

  dim.on('pointerup', () => {
    sfx.unlock();
    if (text.text.length < full.length) { typing?.remove(); text.setText(full); return; }
    if (++i >= lines.length) {
      scene.tweens.add({ targets: root, alpha: 0, duration: 200, onComplete: () => { root.destroy(); onDone(); } });
    } else show();
  });
  show();
}
