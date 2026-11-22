import Phaser from 'phaser';
import { W, H, UI, FONT } from '../core/theme';
import { bgGradient, button, enableScroll, label, signatureLine } from '../core/ui';
import { WORLDS } from '../worlds';
import { artFor, levelMaze } from '../art/thumb';
import { makeChar } from '../art/characters';
import { save } from '../core/save';

interface Entry { wid: string; li: number }

export class GalleryScene extends Phaser.Scene {
  constructor() { super('Gallery'); }

  create() {
    bgGradient(this, UI.bg, 0x0f1013);
    const entries: Entry[] = [];
    for (const wd of WORLDS) wd.levels.forEach((_, li) => { if (save.level(wd.id, li)) entries.push({ wid: wd.id, li }); });

    const list = this.add.container(0, 0);
    const CW = 310, CH = 420, GX = 30;
    entries.forEach((e, i) => {
      const wd = WORLDS.find((w) => w.id === e.wid)!;
      const def = wd.levels[e.li];
      const s = save.level(e.wid, e.li)!;
      const x = 40 + (i % 2) * (CW + GX), y = ((i / 2) | 0) * (CH + 26);
      const card = this.add.graphics();
      card.fillStyle(UI.card, 1); card.fillRoundedRect(x, y, CW, CH, 28);
      card.lineStyle(3, wd.pal.accent, 0.8); card.strokeRoundedRect(x, y, CW, CH, 28);
      const art = artFor(this, levelMaze(def), wd, def.seed, CW - 30, 300, s.trail).setPosition(x + 15, y + 15);
      const t = this.add.text(x + CW / 2, y + 340, def.title, { fontFamily: FONT, fontSize: '23px', fontStyle: 'bold', color: '#fff', wordWrap: { width: CW - 30 }, align: 'center' }).setOrigin(0.5);
      const st = this.add.text(x + CW / 2, y + 384, '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars), { fontFamily: FONT, fontSize: '34px', color: '#ffd45a' }).setOrigin(0.5);
      const z = this.add.rectangle(x + CW / 2, y + CH / 2, CW, CH, 0xffffff, 0.001).setInteractive();
      z.on('pointerup', (p: Phaser.Input.Pointer) => { if (p.getDistance() <= 16) this.openFull(e); });
      list.add([card, art, t, st, z]);
    });

    const head = this.add.graphics().setDepth(10);
    head.fillStyle(UI.bg, 1); head.fillRect(0, 0, W, 170);
    this.add.text(W / 2, 80, 'Galeria', { fontFamily: FONT, fontSize: '54px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5).setDepth(11);
    signatureLine(this, 166).setDepth(11);
    button(this, 110, 80, 160, 80, '‹', () => this.scene.start('Title'), 'ghost', 44).setDepth(11);

    if (!entries.length) {
      const u = makeChar(this, 'uli', 220); u.root.setPosition(W / 2, 520);
      this.tweens.add({ targets: u.inner, y: -12, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.add.text(W / 2, 720, 'Ainda sem obras.\nCompleta um nível e o teu\ntrilho vira arte!', { fontFamily: FONT, fontSize: '34px', color: UI.text, align: 'center', lineSpacing: 10 }).setOrigin(0.5);
      button(this, W / 2, 920, 440, 100, 'Jogar', () => this.scene.start('Worlds'), 'primary', 36);
      return;
    }
    const rows = Math.ceil(entries.length / 2);
    enableScroll(this, list, 200, H - 200, rows * (CH + 26));
  }

  private openFull(e: Entry) {
    const wd = WORLDS.find((w) => w.id === e.wid)!;
    const def = wd.levels[e.li];
    const s = save.level(e.wid, e.li)!;
    const root = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88).setInteractive();
    const aw = 640, ah = 820;
    const art = artFor(this, levelMaze(def), wd, def.seed, aw, ah, s.trail).setPosition((W - aw) / 2, 130);
    root.add([dim, art]);
    root.add(label(this, W / 2, 80, `${wd.name} · ${def.title}`, 32, '#ffffff', true));
    root.add(button(this, W / 2 - 150, 1130, 280, 90, 'Guardar', () => {
      const src = this.textures.get(art.texture.key).getSourceImage() as HTMLCanvasElement;
      const a = document.createElement('a');
      a.href = src.toDataURL('image/png'); a.download = `uliduli-${e.wid}-${e.li + 1}.png`; a.click();
    }, 'primary', 30));
    root.add(button(this, W / 2 + 150, 1130, 280, 90, 'Fechar', () => root.destroy(), 'ghost', 30));
  }
}
