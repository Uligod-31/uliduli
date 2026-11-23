import Phaser from 'phaser';
import { W, H, UI, FONT, FONT_HEAD } from '../core/theme';
import { neoButton } from '../core/ui';
import { generate, pathTo, DIRS } from '../core/maze';
import { getWorld } from '../worlds';
import { sfx } from '../core/audio';
import { save } from '../core/save';
import { stage } from '../three/Stage';

export class TitleScene extends Phaser.Scene {
  private seed = 5;
  private ev?: Phaser.Time.TimerEvent;
  private shown = false;

  constructor() { super('Title'); }

  create() {

    // véus para legibilidade sobre o 3D
    const top = this.add.graphics();
    top.fillGradientStyle(0x05070a, 0x05070a, 0x05070a, 0x05070a, 0.85, 0.85, 0, 0); top.fillRect(0, 0, W, 560);
    const bot = this.add.graphics();
    bot.fillGradientStyle(0x05070a, 0x05070a, 0x05070a, 0x05070a, 0, 0, 0.95, 0.95); bot.fillRect(0, H - 600, W, 600);

    this.hud();
    this.lightning();

    // logótipo com falhas: três camadas (ciano, magenta, branco-gelo) que se desalinham
    const mk = (col: string | null, a: number, blend = false) => {
      const t = this.add.text(W / 2, 214, 'UliDUli', { fontFamily: FONT_HEAD, fontSize: '190px', fontStyle: 'bold', color: col ?? '#ffffff' }).setOrigin(0.5).setAlpha(a);
      t.setStyle({ letterSpacing: 6 } as any);
      if (blend) t.setBlendMode(Phaser.BlendModes.ADD);
      return t;
    };
    const cy = mk('#27d3ff', 0.75, true), mg = mk('#ff2bd6', 0.75, true), main = mk(null, 1);
    const gr = main.context.createLinearGradient(0, 40, 0, main.height);
    gr.addColorStop(0, '#f4f7ff'); gr.addColorStop(0.55, '#b9c6ee'); gr.addColorStop(1, '#7a6ad8');
    main.setFill(gr);
    try { (main as any).postFX?.addGlow(0x5b92ff, 3, 0, false, 0.1, 10); } catch { /* sem WebGL FX */ }
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
    const sub = this.add.text(W / 2, 346, '', { fontFamily: FONT_HEAD, fontSize: '40px', color: '#eceef3', fontStyle: 'bold' }).setOrigin(0.5);
    sub.setStyle({ letterSpacing: 16 } as any);
    const full = 'ESCAPA. OU SOBREVIVE.';
    let ci = 0;
    this.time.addEvent({ delay: 55, repeat: full.length - 1, callback: () => { sub.setText(full.slice(0, ++ci) + (ci < full.length ? '_' : '')); } });
    const sub2 = this.add.text(W / 2, 100, 'OS ADULTOS CRESCERAM. TU NÃO.', { fontFamily: FONT, fontSize: '18px', color: '#ff4fd8' }).setOrigin(0.5);
    sub2.setStyle({ letterSpacing: 6 } as any);
    this.tweens.add({ targets: sub2, alpha: 0.25, duration: 90, yoyo: true, repeat: -1, repeatDelay: 1700 + Math.random() * 1200 });
    this.add.graphics().fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1).fillRect(W / 2 - 190, 380, 380, 4);

    neoButton(this, W / 2, 930, 600, 128, 'Jogar', '01', () => this.scene.start('Worlds'), true, 50);
    neoButton(this, W / 2, 1060, 600, 96, 'Galeria', '02', () => this.scene.start('Gallery'), false, 34);
    const snd = neoButton(this, W / 2, 1168, 600, 96, save.mute ? 'Som: off' : 'Som: on', '03', () => {
      sfx.setMute(!save.mute);
      snd.txt.setText(save.mute ? 'Som: off' : 'Som: on');
    }, false, 34);

    // película: linhas de varrimento, faixa que desce e cantos de mira
    const lt = this.textures.createCanvas('scan', 4, 4)!;
    const lc = lt.getContext(); lc.fillStyle = 'rgba(0,0,0,.55)'; lc.fillRect(0, 0, 4, 1); lt.refresh();
    this.add.tileSprite(W / 2, H / 2, W, H, 'scan').setAlpha(0.28);
    const bar = this.add.rectangle(W / 2, 0, W, 90, 0x7aa8ff, 0.05).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: bar, y: H, duration: 5200, repeat: -1, ease: 'Linear' });
    this.input.once('pointerdown', () => sfx.unlock());

    this.events.once('shutdown', () => { this.ev?.remove(); stage.stop(); });
    this.attract();
  }

  update() {
    // o ecrã de arranque só sai quando o 3D já desenhou algumas imagens (sem mostrar a câmara a assentar)
    if (!this.shown && stage.frames > 4) { this.shown = true; document.getElementById('splash')?.classList.add('hide'); }
  }

  /** Relâmpagos azuis e fúcsia a estalar à volta da cara. */
  private lightning() {
    const g = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0x9bb8ff, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
    const path = (x0: number, y0: number, x1: number, y1: number, jit: number) => {
      const pts: [number, number][] = [[x0, y0]];
      const n = 9;
      for (let i = 1; i < n; i++) {
        const t = i / n, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, o = (Math.random() - 0.5) * jit * (1 - Math.abs(t - 0.5) * 0.6);
        pts.push([x0 + (x1 - x0) * t + (nx / l) * o, y0 + (y1 - y0) * t + (ny / l) * o]);
      }
      pts.push([x1, y1]); return pts;
    };
    const strike = () => {
      g.clear();
      const side = Math.random() < 0.5 ? -1 : 1, y0 = 150 + Math.random() * 420;
      const x0 = side < 0 ? -10 : W + 10, x1 = W / 2 + side * (120 + Math.random() * 130), y1 = y0 + (Math.random() - 0.2) * 220;
      const main = path(x0, y0, x1, y1, 70);
      const bolts = [main];
      for (let b = 0; b < 2; b++) { const k = 2 + ((Math.random() * 5) | 0), [bx, by] = main[k]; bolts.push(path(bx, by, bx + (Math.random() - 0.5) * 220, by + 60 + Math.random() * 160, 40)); }
      const col = Math.random() < 0.75 ? 0x5b92ff : 0xff4fd8;
      for (const [w, c, a] of [[12, col, 0.22], [6, col, 0.55], [2.5, 0xffffff, 1]] as const) {
        g.lineStyle(w, c, a);
        for (const pts of bolts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts) g.lineTo(x, y); g.strokePath(); }
      }
      flash.setAlpha(0.16);
      this.tweens.add({ targets: flash, alpha: 0, duration: 160 });
      this.time.delayedCall(70, () => { if (Math.random() < 0.6) { g.setAlpha(0.3); this.time.delayedCall(60, () => g.setAlpha(1)); } });
      this.time.delayedCall(190, () => g.clear());
      this.time.delayedCall(900 + Math.random() * 2600, strike);
    };
    this.time.delayedCall(1800, strike);
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
    this.add.text(W - 58, 38, 'v0.4', { fontFamily: FONT, fontSize: '20px', color: '#9aa0ae' }).setOrigin(1, 0);
    const coord = this.add.text(58, H - 62, '', { fontFamily: FONT, fontSize: '18px', color: '#9aa0ae' });
    this.time.addEvent({ delay: 140, loop: true, callback: () => { coord.setText(`X ${(Math.random() * 90 + 10).toFixed(2)}  Y ${(Math.random() * 90 + 10).toFixed(2)}  ·  SINAL ${(60 + Math.random() * 35) | 0}%`); } });
    const v = this.add.text(W - 40, 640, 'NÃO OLHES PARA CIMA', { fontFamily: FONT_HEAD, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5).setAngle(90).setAlpha(0.35);
    v.setStyle({ letterSpacing: 10 } as any);
  }

  /** Modo "vitrina": o Uli percorre a ilha, deixando o trilho de luz; depois nasce outro labirinto. */
  private attract() {
    const wd = getWorld('b612');
    const m = generate({ cols: 9, rows: 11, mask: 'circle', seed: this.seed, loops: 0.06, dyn: 0, rosas: 3 });
    stage.load(m, wd, this.seed, { intro: false });
    stage.start('title');
    const path = pathTo(m, m.start, m.exit, 0);
    let k = 0;
    const walk = () => {
      if (k >= path.length - 1) {
        stage.win(); stage.setView('follow');
        this.time.delayedCall(2600, () => { this.seed += 3; this.attract(); });
        return;
      }
      const a = path[k], b = path[k + 1];
      const fx = (a % m.cols) + 0.5, fy = ((a / m.cols) | 0) + 0.5, tx = (b % m.cols) + 0.5, ty = ((b / m.cols) | 0) + 0.5;
      stage.player.dir = Math.atan2(tx - fx, ty - fy);
      const o = { t: 0 };
      this.tweens.add({
        targets: o, t: 1, duration: 150, onUpdate: () => {
          stage.player.x = fx + (tx - fx) * o.t; stage.player.y = fy + (ty - fy) * o.t; stage.player.h = o.t;
        },
        onComplete: () => {
          stage.player.h = 0; stage.addTrail(a, b, k + 1);
          if (m.rosas.includes(b)) stage.removeRose(b);
          k++; this.ev = this.time.delayedCall(10, walk);
        },
      });
    };
    this.ev = this.time.delayedCall(900, walk);
  }
}

