import Phaser from 'phaser';
import { W, H, UI, FONT, toHex, lighten } from '../core/theme';
import { paintedBg, chromeHeading, button, label, signatureLine, enableScroll } from '../core/ui';
import { getWorld, isUnlocked } from '../worlds';
import { artFor, levelMaze } from '../art/thumb';
import { save } from '../core/save';
import { drawPlate } from '../three/menuArt';

export class LevelsScene extends Phaser.Scene {
  private worldId = 'b612';
  constructor() { super('Levels'); }
  init(d: { world: string }) { this.worldId = d.world; }

  create() {
    const wd = getWorld(this.worldId);
    paintedBg(this, 0.45);

    const list = this.add.container(0, 0);
    const CW = 310, CH = 330, GX = 30, TOPY = 0, GY = 26;
    const normal = wd.levels.length - 1;
    const earned = wd.levels.slice(0, normal).reduce((a, _, i) => a + (save.level(wd.id, i)?.stars ?? 0), 0);

    wd.levels.forEach((def, i) => {
      const bonusRow = Math.ceil((wd.levels.length - 1) / 2);
      const col = i % 2, row = def.bonus ? bonusRow : (i / 2) | 0;
      const bonus = !!def.bonus;
      const x = bonus ? 40 : 40 + col * (CW + GX), y = TOPY + row * (CH + GY);
      const cw = bonus ? W - 80 : CW;
      const unlocked = isUnlocked(wd, i, save);
      const s = save.level(wd.id, i);
      const accent = bonus ? '#ffd45a' : toHex(wd.pal.accent);

      const ck = `lvl_${wd.id}_${bonus ? 'b' : ''}${unlocked ? 1 : 0}`;
      if (!this.textures.exists(ck)) this.textures.addCanvas(ck, drawPlate(cw, CH, bonus && unlocked, 1.5, unlocked ? accent : '#4a4f5e'));
      const card = this.add.image(x, y - 44, ck).setOrigin(0, 0).setScale(1 / 1.5);

      const m = levelMaze(def);
      const art = artFor(this, m, wd, def.seed, cw - 40, 200, s?.trail);
      art.setPosition(x + 20, y + 18);
      if (!unlocked) art.setAlpha(0.22);

      const title = this.add.text(x + cw / 2, y + 242, `${bonus ? '★ BÓNUS' : i + 1} · ${def.title}`, {
        fontFamily: FONT, fontSize: '23px', fontStyle: 'bold', color: unlocked ? (bonus ? '#ffe28a' : '#fff') : UI.textDim, wordWrap: { width: cw - 30 }, align: 'center', stroke: '#05060b', strokeThickness: 5,
      }).setOrigin(0.5);
      const stars = '★'.repeat(s?.stars ?? 0) + '☆'.repeat(3 - (s?.stars ?? 0));
      const msg = unlocked ? stars : bonus ? `abre com ★ ${earned}/${normal * 3}` : 'bloqueado';
      const st = this.add.text(x + cw / 2, y + 292, msg, {
        fontFamily: FONT, fontSize: unlocked ? '40px' : '22px', color: unlocked ? '#ffd45a' : UI.textDim, stroke: '#05060b', strokeThickness: 6,
      }).setOrigin(0.5);
      list.add([card, art, title, st]);

      if (unlocked) {
        const z = this.add.rectangle(x + cw / 2, y + CH / 2, cw, CH, 0xffffff, 0.001).setInteractive();
        z.on('pointerup', (p: Phaser.Input.Pointer) => {
          if (p.getDistance() > 16) return;
          this.scene.start('Game', { world: wd.id, level: i });
        });
        list.add(z);
      }
    });

    // cabeçalho por cima da lista
    const head = this.add.graphics().setDepth(10);
    head.fillGradientStyle(0x05070d, 0x05070d, 0x05070d, 0x05070d, 0.97, 0.97, 0.55, 0.55); head.fillRect(0, 0, W, 232);
    chromeHeading(this, W / 2 + 70, 78, wd.name, 430).setDepth(11);
    signatureLine(this, 140).setDepth(11);
    label(this, W / 2, 190, wd.rule, 22, toHex(lighten(wd.pal.accent, 0.3))).setDepth(11).setWordWrapWidth(W - 80);
    button(this, 110, 80, 160, 80, '‹', () => this.scene.start('Worlds'), 'ghost', 44).setDepth(11);
    const foot = this.add.graphics().setDepth(10);
    foot.fillGradientStyle(0x05070d, 0x05070d, 0x05070d, 0x05070d, 0, 0, 0.95, 0.95); foot.fillRect(0, H - 60, W, 60);

    const rows = Math.ceil((wd.levels.length - 1) / 2) + 1;
    enableScroll(this, list, 270, H - 270 - 40, rows * (CH + GY) + 44);
  }
}
