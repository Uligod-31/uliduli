import Phaser from 'phaser';
import { W, H, UI, FONT, toHex, lighten } from '../core/theme';
import { paintedBg, chromeHeading, button, label, signatureLine, enableScroll } from '../core/ui';
import { getWorld, isUnlocked } from '../worlds';
import { artFor, levelMaze } from '../art/thumb';
import { save } from '../core/save';
import { drawPlate } from '../three/menuArt';
import { music } from '../audio/player';
import { BANDS } from '../audio/bands';
import { openJukebox } from '../ui/jukebox';

export class LevelsScene extends Phaser.Scene {
  private worldId = 'b612';
  private leaving = false;
  constructor() { super('Levels'); }
  private fromDive = false;
  init(d: { world: string; dive?: boolean }) { this.worldId = d.world; this.fromDive = !!d.dive; }

  create() {
    if (this.fromDive) {
      // saímos do planeta: clarão que se dissipa e o ecrã a recuar até ao tamanho normal
      const cam = this.cameras.main;
      cam.setZoom(1.3); cam.fadeIn(700, 255, 214, 246);
      this.tweens.add({ targets: cam, zoom: 1, duration: 900, ease: 'Cubic.Out' });
    }
    this.leaving = false;
    const wd = getWorld(this.worldId);
    paintedBg(this, 0.45);
    // entrar no mundo é ouvir a sua banda: o tema do próximo nível por fazer
    const upNext = Math.max(0, wd.levels.findIndex((_, i) => !save.level(wd.id, i)));
    music.play({ world: wd.id, level: upNext, title: wd.levels[upNext].title });

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
      const art = artFor(this, m, wd, def.seed, cw - 40, 200, s && s.rev === def.rev ? s.trail : undefined);
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
          if (this.leaving) return;
          this.leaving = true; this.cameras.main.fadeOut(260, 5, 6, 11);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { world: wd.id, level: i }));
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
    foot.fillGradientStyle(0x05070d, 0x05070d, 0x05070d, 0x05070d, 0, 0, 0.98, 0.98); foot.fillRect(0, H - 96, W, 96);
    // a banda do mundo, num letreiro opaco por cima da lista; um toque abre a Discoteca
    const pill = this.add.graphics().setDepth(11);
    const band = label(this, W / 2, H - 40, '', 25, '#eceef3').setDepth(11);
    const playing = () => {
      const n = music.now?.world === wd.id ? music.now : undefined;
      band.setText(`♫  ${n?.mine ? n.title : BANDS[wd.id].band}  ›`).setScale(1).setScale(Math.min(1, (W - 100) / band.width));
      const pw = band.displayWidth + 60;
      pill.clear(); pill.fillStyle(0x15161a, 0.97); pill.fillRoundedRect(W / 2 - pw / 2, H - 70, pw, 60, 30);
      pill.lineStyle(2, 0x373a43, 1); pill.strokeRoundedRect(W / 2 - pw / 2, H - 70, pw, 60, 30);
      pill.fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1); pill.fillRect(W / 2 - pw / 2 + 30, H - 15, pw - 60, 3);
    };
    playing();
    this.events.once('shutdown', music.onNow(playing));
    const tap = this.add.rectangle(W / 2, H - 40, 480, 72, 0xffffff, 0.001).setDepth(12).setInteractive({ useHandCursor: true });
    tap.on('pointerup', (p: Phaser.Input.Pointer) => { if (p.getDistance() <= 16) openJukebox(this, wd.id); });

    const rows = Math.ceil((wd.levels.length - 1) / 2) + 1;
    enableScroll(this, list, 270, H - 270 - 80, rows * (CH + GY) + 44);
  }
}
