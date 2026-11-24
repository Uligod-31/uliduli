import Phaser from 'phaser';
import { W, H, UI, FONT, FONT_HEAD } from '../core/theme';
import { neoButton } from '../core/ui';
import { drawLogo } from '../three/menuArt';
import { sfx } from '../core/audio';
import { save } from '../core/save';
import { stage } from '../three/Stage';

export class TitleScene extends Phaser.Scene {
  private shown = false;
  private diving = false;
  private flash!: Phaser.GameObjects.Rectangle;

  constructor() { super('Title'); }

  create() {
    this.diving = false;

    // véus para legibilidade sobre o 3D
    const top = this.add.graphics();
    top.fillGradientStyle(0x05070a, 0x05070a, 0x05070a, 0x05070a, 0.8, 0.8, 0, 0); top.fillRect(0, 0, W, 470);
    const bot = this.add.graphics();
    bot.fillGradientStyle(0x05070a, 0x05070a, 0x05070a, 0x05070a, 0, 0, 0.88, 0.88); bot.fillRect(0, H - 420, W, 420);

    this.hud();

    // logótipo metálico com falhas: três camadas (ciano, magenta, cromado) que se desalinham
    if (!this.textures.exists('logoArt')) this.textures.addCanvas('logoArt', drawLogo());
    const mk = (tint: number | null, a: number, blend = false) => {
      const t = this.add.image(W / 2, 214, 'logoArt').setDisplaySize(690, (690 * 420) / 1440).setAlpha(a);
      if (tint !== null) t.setTint(tint);
      if (blend) t.setBlendMode(Phaser.BlendModes.ADD);
      return t;
    };
    const cy = mk(0x27d3ff, 0.55, true), mg = mk(0xff2bd6, 0.55, true), main = mk(null, 1);
    const slice = this.add.rectangle(W / 2, 214, W, 10, 0xffffff, 0).setBlendMode(Phaser.BlendModes.ADD);
    const glitch = () => {
      const n = 3 + ((Math.random() * 4) | 0);
      let k = 0;
      const step = () => {
        const j = k < n;
        const o = j ? 6 + Math.random() * 22 : 5;
        cy.x = W / 2 - o * (Math.random() < 0.5 ? 1 : 0.4); mg.x = W / 2 + o;
        main.x = W / 2 + (j ? (Math.random() - 0.5) * 16 : 0);
        main.setAlpha(j && Math.random() < 0.3 ? 0.35 : 1);
        cy.y = 214 + (j ? (Math.random() - 0.5) * 8 : 0);
        slice.setAlpha(j ? 0.35 : 0).setY(160 + Math.random() * 120).setSize(W, 3 + Math.random() * 18);
        if (++k <= n + 1) this.time.delayedCall(45, step);
        else this.time.delayedCall(1400 + Math.random() * 2800, glitch);
      };
      step();
    };
    cy.x = W / 2 - 5; mg.x = W / 2 + 5;
    this.time.delayedCall(900, glitch);
    this.tweens.add({ targets: [cy, mg, main], y: '+=8', duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // bandeira: ESCAPA. OU SOBREVIVE.
    const sub = this.add.text(W / 2, 346, '', { fontFamily: FONT_HEAD, fontSize: '40px', color: '#f4f7ff', fontStyle: 'bold', stroke: '#05060b', strokeThickness: 8 }).setOrigin(0.5);
    sub.setStyle({ letterSpacing: 16 } as any);
    const full = 'ESCAPA. OU SOBREVIVE.';
    let ci = 0;
    this.time.addEvent({ delay: 55, repeat: full.length - 1, callback: () => { sub.setText(full.slice(0, ++ci) + (ci < full.length ? '_' : '')); } });
    const sub2 = this.add.text(W / 2, 100, 'OS ADULTOS CRESCERAM. TU NÃO.', { fontFamily: FONT, fontSize: '19px', color: '#ff86e8', fontStyle: 'bold', stroke: '#05060b', strokeThickness: 5 }).setOrigin(0.5);
    sub2.setStyle({ letterSpacing: 6 } as any);
    this.tweens.add({ targets: sub2, alpha: 0.25, duration: 90, yoyo: true, repeat: -1, repeatDelay: 1700 + Math.random() * 1200 });
    this.add.graphics().fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1).fillRect(W / 2 - 190, 380, 380, 4);

    neoButton(this, W / 2, 1060, 620, 124, 'Jogar', '01', () => this.dive(), true, 52);
    neoButton(this, W / 2 - 160, 1178, 300, 88, 'Galeria', '02', () => this.scene.start('Gallery'), false, 30);
    const snd = neoButton(this, W / 2 + 160, 1178, 300, 88, save.mute ? 'Som: off' : 'Som: on', '03', () => {
      sfx.setMute(!save.mute);
      snd.txt.setText(save.mute ? 'Som: off' : 'Som: on');
    }, false, 30);

    // película: linhas de varrimento, faixa que desce e cantos de mira
    if (!this.textures.exists('scan')) {
      const lt = this.textures.createCanvas('scan', 4, 4)!;
      const lc = lt.getContext(); lc.fillStyle = 'rgba(0,0,0,.55)'; lc.fillRect(0, 0, 4, 1); lt.refresh();
    }
    this.add.tileSprite(W / 2, H / 2, W, H, 'scan').setAlpha(0.28);
    const bar = this.add.rectangle(W / 2, 0, W, 90, 0x7aa8ff, 0.05).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: bar, y: H, duration: 5200, repeat: -1, ease: 'Linear' });
    this.input.once('pointerdown', () => sfx.unlock());

    // O Olho: 3D por baixo, segue o dedo e pisca ao toque
    this.flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffd6f6, 0).setDepth(100);
    stage.loadEye();
    stage.onEyeFlash = (a) => { this.flash.setAlpha(a); };
    stage.start('title');
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => stage.eyeLook((p.x / W - 0.5) * 2, (p.y / H - 0.5) * 2));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { stage.eyeLook((p.x / W - 0.5) * 2, (p.y / H - 0.5) * 2); stage.eyeBlink(); });
    this.events.once('shutdown', () => { stage.onEyeFlash = undefined; stage.stop(); });
  }

  /** Jogar: a câmara mergulha pela pupila e só depois abre os Mundos. */
  private dive() {
    if (this.diving) return;
    this.diving = true;
    this.tweens.add({ targets: this.children.list.filter((c) => c !== this.flash), alpha: 0, duration: 520, ease: 'Sine.In' });
    stage.eyeDive(() => this.scene.start('Worlds'));
  }

  update() {
    // o ecrã de arranque só sai quando o 3D já desenhou algumas imagens (sem mostrar a câmara a assentar)
    if (!this.shown && stage.frames > 4) { this.shown = true; document.getElementById('splash')?.classList.add('hide'); }
  }

  /** Moldura técnica: cantos de mira, REC, coordenadas e texto vertical. */
  private hud() {
    const g = this.add.graphics();
    g.lineStyle(3, 0xeceef3, 0.65);
    const m = 26, L = 54;
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]] as const) {
      g.beginPath(); g.moveTo(x + sx * L, y); g.lineTo(x, y); g.lineTo(x, y + sy * L); g.strokePath();
    }
    g.lineStyle(1, 0x5b92ff, 0.5); g.beginPath(); g.moveTo(m + 70, 70); g.lineTo(W - m - 70, 70); g.strokePath();
    const dot = this.add.circle(64, 50, 8, 0xff2030);
    this.tweens.add({ targets: dot, alpha: 0.1, duration: 600, yoyo: true, repeat: -1 });
    this.add.text(84, 38, 'REC  ·  SETOR B-612', { fontFamily: FONT, fontSize: '20px', color: '#eceef3' }).setAlpha(0.85);
    this.add.text(W - 58, 38, 'v' + __APP_VERSION__, { fontFamily: FONT, fontSize: '20px', color: '#9aa0ae' }).setOrigin(1, 0);
    const coord = this.add.text(W - 58, 62, '', { fontFamily: FONT, fontSize: '16px', color: '#9aa0ae' }).setOrigin(1, 0);
    this.time.addEvent({ delay: 140, loop: true, callback: () => { coord.setText(`SINAL ${(60 + Math.random() * 35) | 0}%`); } });
    const v = this.add.text(W - 40, 640, 'NÃO OLHES PARA CIMA', { fontFamily: FONT_HEAD, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5).setAngle(90).setAlpha(0.35);
    v.setStyle({ letterSpacing: 10 } as any);
  }
}
