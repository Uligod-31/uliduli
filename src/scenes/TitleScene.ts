import Phaser from 'phaser';
import { W, H, UI } from '../core/theme';
import { button, gradText, label } from '../core/ui';
import { generate, pathTo, DIRS } from '../core/maze';
import { getWorld } from '../worlds';
import { sfx } from '../core/audio';
import { save } from '../core/save';
import { stage } from '../three/Stage';

export class TitleScene extends Phaser.Scene {
  private seed = 5;
  private ev?: Phaser.Time.TimerEvent;

  constructor() { super('Title'); }

  create() {
    document.getElementById('splash')?.classList.add('hide');

    // véus para legibilidade sobre o 3D
    const top = this.add.graphics();
    top.fillGradientStyle(0x0a0b10, 0x0a0b10, 0x0a0b10, 0x0a0b10, 0.7, 0.7, 0, 0); top.fillRect(0, 0, W, 520);
    const bot = this.add.graphics();
    bot.fillGradientStyle(0x0a0b10, 0x0a0b10, 0x0a0b10, 0x0a0b10, 0, 0, 0.9, 0.9); bot.fillRect(0, H - 520, W, 520);

    const logo = gradText(this, W / 2, 190, 'UliDUli', 150);
    this.tweens.add({ targets: logo, y: 200, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    label(this, W / 2, 302, 'AVENTURA DE LABIRINTOS', 26, UI.text, true).setAlpha(0.9).setStyle({ letterSpacing: 7 } as any);
    this.add.graphics().fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1).fillRect(W / 2 - 150, 340, 300, 5);

    button(this, W / 2, 1000, 520, 118, 'Jogar', () => this.scene.start('Worlds'), 'primary', 44);
    button(this, W / 2 - 135, 1136, 250, 88, 'Galeria', () => this.scene.start('Gallery'), 'ghost', 28);
    const snd = button(this, W / 2 + 135, 1136, 250, 88, save.mute ? 'Som: off' : 'Som: on', () => {
      sfx.setMute(!save.mute);
      snd.txt.setText(save.mute ? 'Som: off' : 'Som: on');
    }, 'ghost', 28);
    label(this, W / 2, 1236, 'v0.2 · Mundo 1: Jardim Sebe', 20, UI.textDim as string);
    this.input.once('pointerdown', () => sfx.unlock());

    this.events.once('shutdown', () => { this.ev?.remove(); stage.stop(); });
    this.attract();
  }

  /** Modo "vitrina": o Uli percorre a ilha, deixando o trilho de luz; depois nasce outro labirinto. */
  private attract() {
    const wd = getWorld('jardim');
    const m = generate({ cols: 9, rows: 11, mask: 'heart', seed: this.seed, loops: 0.06, dyn: 0, rosas: 3 });
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
