import Phaser from 'phaser';
import { W, H, UI, FONT, toHex, lighten } from '../core/theme';
import { bgGradient, button, label, signatureLine } from '../core/ui';
import { getWorld } from '../worlds';
import { artFor, levelMaze } from '../art/thumb';
import { save } from '../core/save';

export class LevelsScene extends Phaser.Scene {
  private worldId = 'b612';
  constructor() { super('Levels'); }
  init(d: { world: string }) { this.worldId = d.world; }

  create() {
    const wd = getWorld(this.worldId);
    bgGradient(this, wd.pal.bgTop, wd.pal.bgBot);
    this.add.text(W / 2, 80, wd.name, { fontFamily: FONT, fontSize: '50px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5);
    signatureLine(this, 140);
    label(this, W / 2, 190, wd.rule, 24, toHex(lighten(wd.pal.accent, 0.3)));
    button(this, 110, 80, 160, 80, '‹', () => this.scene.start('Worlds'), 'ghost', 44);

    const CW = 310, CH = 330, GX = 30, TOPY = 250;
    wd.levels.forEach((def, i) => {
      const col = i % 2, row = (i / 2) | 0;
      const x = 40 + col * (CW + GX), y = TOPY + row * (CH + 24);
      const unlocked = save.unlocked(wd.id, i);
      const s = save.level(wd.id, i);

      const card = this.add.graphics();
      card.fillStyle(UI.card, 1); card.fillRoundedRect(x, y, CW, CH, 28);
      card.lineStyle(3, unlocked ? wd.pal.accent : UI.line, unlocked ? 0.85 : 1); card.strokeRoundedRect(x, y, CW, CH, 28);

      const m = levelMaze(def);
      const art = artFor(this, m, wd, def.seed, CW - 40, 200, s?.trail);
      art.setPosition(x + 20, y + 18);
      if (!unlocked) art.setAlpha(0.22);

      this.add.text(x + CW / 2, y + 242, `${i + 1} · ${def.title}`, {
        fontFamily: FONT, fontSize: '23px', fontStyle: 'bold', color: unlocked ? '#fff' : UI.textDim, wordWrap: { width: CW - 30 }, align: 'center',
      }).setOrigin(0.5);
      const stars = '★'.repeat(s?.stars ?? 0) + '☆'.repeat(3 - (s?.stars ?? 0));
      this.add.text(x + CW / 2, y + 292, unlocked ? stars : 'bloqueado', {
        fontFamily: FONT, fontSize: unlocked ? '40px' : '22px', color: unlocked ? '#ffd45a' : UI.textDim,
      }).setOrigin(0.5);

      if (unlocked) {
        const z = this.add.rectangle(x + CW / 2, y + CH / 2, CW, CH, 0xffffff, 0.001).setInteractive();
        z.on('pointerup', (p: Phaser.Input.Pointer) => {
          if (p.getDistance() > 16) return;
          this.scene.start('Game', { world: wd.id, level: i });
        });
      }
    });
  }
}
