import Phaser from 'phaser';
import { W, H, UI, FONT, toHex, lighten } from '../core/theme';
import { bgGradient, button, enableScroll, label, signatureLine } from '../core/ui';
import { WORLDS } from '../worlds';
import { worldPreview } from '../art/thumb';
import { save } from '../core/save';

export class WorldsScene extends Phaser.Scene {
  constructor() { super('Worlds'); }

  create() {
    bgGradient(this, UI.bg, 0x0f1013);
    const list = this.add.container(0, 0);
    const CARD_H = 210, GAP = 26, TOP = 190;

    WORLDS.forEach((wd, i) => {
      const y = i * (CARD_H + GAP);
      const card = this.add.graphics();
      card.fillStyle(UI.card, 1); card.fillRoundedRect(40, y, W - 80, CARD_H, 30);
      card.lineStyle(3, wd.ready ? wd.pal.accent : UI.line, wd.ready ? 0.9 : 1);
      card.strokeRoundedRect(40, y, W - 80, CARD_H, 30);

      const prev = worldPreview(this, wd, 170);
      prev.setPosition(60, y + 20);
      if (!wd.ready) prev.setAlpha(0.7);
      const frame = this.add.graphics();
      frame.lineStyle(3, wd.pal.accent, 0.8); frame.strokeRoundedRect(60, y + 20, 170, 170, 8);

      const name = this.add.text(256, y + 24, wd.name, { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: toHex(lighten(wd.pal.accent, 0.2)) });
      const tag = this.add.text(256, y + 70, wd.tagline, { fontFamily: FONT, fontSize: '22px', color: UI.text, wordWrap: { width: 410 }, lineSpacing: 4 });
      const status = wd.ready
        ? `★ ${save.stars(wd.id)} / ${wd.levels.length * 3}  ·  ${save.completed(wd.id)}/${wd.levels.length} níveis`
        : 'Em breve';
      const st = this.add.text(256, y + CARD_H - 44, status, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: wd.ready ? '#ffffff' : UI.textDim });
      list.add([card, prev, frame, name, tag, st]);

      const zone = this.add.rectangle(W / 2, y + CARD_H / 2, W - 80, CARD_H, 0xffffff, 0.001).setInteractive();
      zone.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.getDistance() > 16) return;
        if (wd.ready) this.scene.start('Levels', { world: wd.id });
        else this.toast(`${wd.name}: ${wd.rule}`);
      });
      list.add(zone);
    });

    // cabeçalho por cima da lista
    const head = this.add.graphics().setDepth(10);
    head.fillStyle(UI.bg, 1); head.fillRect(0, 0, W, 170);
    this.add.text(W / 2, 80, 'Mundos', { fontFamily: FONT, fontSize: '54px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5).setDepth(11);
    signatureLine(this, 166).setDepth(11);
    button(this, 110, 80, 160, 80, '‹', () => this.scene.start('Title'), 'ghost', 44).setDepth(11);
    const foot = this.add.graphics().setDepth(10);
    foot.fillStyle(UI.bg, 1); foot.fillRect(0, H - 40, W, 40);

    const content = WORLDS.length * (CARD_H + GAP);
    enableScroll(this, list, TOP, H - TOP - 40, content);
  }

  private toast(msg: string) {
    const t = this.add.text(W / 2, H - 120, msg, {
      fontFamily: FONT, fontSize: '26px', color: '#fff', backgroundColor: toHex(UI.surf),
      padding: { x: 24, y: 16 }, wordWrap: { width: W - 120 }, align: 'center',
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, alpha: 0, duration: 400, delay: 2200, onComplete: () => t.destroy() });
  }
}
