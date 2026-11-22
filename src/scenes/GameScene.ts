import Phaser from 'phaser';
import { W, H, UI, FONT, toHex, lighten } from '../core/theme';
import { button, gradText, label, Btn } from '../core/ui';
import { Maze, DIRS, OPP, canPass, neighbor, pathTo } from '../core/maze';
import { levelMaze } from '../art/thumb';
import { LevelDef, WorldDef, getWorld } from '../worlds';
import { sfx } from '../core/audio';
import { save } from '../core/save';
import { playDialogue } from './dialogue';
import { stage } from '../three/Stage';

export class GameScene extends Phaser.Scene {
  private wd!: WorldDef;
  private li = 0;
  private def!: LevelDef;
  private m!: Maze;
  private skipIntro = false;

  private idx = 0;
  private moves = 0;
  private phase = 0;
  private moving = false;
  private done = false;
  private blocked = true;
  private run = false;
  private lastDir = -1;
  private queued: { dir: number; run: boolean } | null = null;
  private trail: number[] = [];
  private collected = 0;
  private rosas = new Set<number>();
  private hints = 2;
  private overview = false;

  private pips!: Phaser.GameObjects.Graphics;
  private movesTxt!: Phaser.GameObjects.Text;
  private rosaTxt!: Phaser.GameObjects.Text;
  private hintBtn!: Btn;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };

  constructor() { super('Game'); }

  init(d: { world: string; level: number; skipIntro?: boolean }) {
    this.wd = getWorld(d.world);
    this.li = d.level;
    this.def = this.wd.levels[d.level];
    this.skipIntro = !!d.skipIntro;
    this.moves = 0; this.phase = 0; this.moving = false; this.done = false; this.blocked = true;
    this.run = false; this.lastDir = -1; this.queued = null; this.collected = 0; this.hints = 2; this.overview = false;
  }

  create() {
    const { def } = this;
    const m = (this.m = levelMaze(def));
    this.idx = m.start;
    this.trail = [m.start];
    this.rosas = new Set(m.rosas);

    stage.load(m, this.wd, def.seed, { intro: !this.skipIntro });
    stage.start('game');
    if (def.fog) stage.setDark(def.fog * 1.0);
    this.events.once('shutdown', () => stage.stop());

    this.buildHud();
    this.setupInput();
    this.updateHud();

    if (this.skipIntro) this.blocked = false;
    else this.time.delayedCall(1300, () => playDialogue(this, def.intro, () => { this.blocked = false; }));
  }

  // ───────────────────────── HUD (vidro sobre o 3D) ─────────────────────────
  private buildHud() {
    const { wd, def } = this;
    const top = this.add.graphics().setDepth(29);
    top.fillGradientStyle(0x0a0b10, 0x0a0b10, 0x0a0b10, 0x0a0b10, 0.78, 0.78, 0, 0);
    top.fillRect(0, 0, W, 230);
    const bot = this.add.graphics().setDepth(29);
    bot.fillGradientStyle(0x0a0b10, 0x0a0b10, 0x0a0b10, 0x0a0b10, 0, 0, 0.85, 0.85);
    bot.fillRect(0, H - 250, W, 250);

    this.add.text(W / 2, 54, wd.name.toUpperCase(), { fontFamily: FONT, fontSize: '22px', color: toHex(lighten(wd.pal.accent, 0.35)), fontStyle: 'bold' }).setOrigin(0.5).setDepth(30).setStyle({ letterSpacing: 5 } as any);
    this.add.text(W / 2, 96, `Nível ${this.li + 1} · ${def.title}`, { fontFamily: FONT, fontSize: '30px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(30);
    const line = this.add.graphics().setDepth(30);
    line.fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1); line.fillRect(0, 132, W, 4);

    button(this, 70, 70, 100, 70, '‹', () => this.scene.start('Levels', { world: wd.id }), 'ghost', 40).setDepth(31);
    const snd = button(this, W - 80, 70, 120, 70, save.mute ? '♪ off' : '♪ on', () => {
      sfx.setMute(!save.mute); snd.txt.setText(save.mute ? '♪ off' : '♪ on');
    }, 'ghost', 26).setDepth(31);

    this.rosaTxt = this.add.text(50, 176, '', { fontFamily: FONT, fontSize: '30px', color: '#ff9ecb', fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(30);
    this.movesTxt = this.add.text(W - 50, 176, '', { fontFamily: FONT, fontSize: '25px', color: '#fff', fontStyle: 'bold' }).setOrigin(1, 0.5).setDepth(30);
    this.pips = this.add.graphics().setDepth(30);
    if (this.m.dyn.length) label(this, W / 2, 160, 'as sebes mudam em', 18, UI.textDim as string).setDepth(30);

    this.hintBtn = button(this, 170, H - 90, 290, 88, 'Vagalume ✦2', () => this.useHint(), 'primary', 28).setDepth(31);
    button(this, 400, H - 90, 130, 88, '◎', () => this.toggleView(), 'ghost', 40).setDepth(31);
    button(this, 560, H - 90, 200, 88, 'Reiniciar', () => this.scene.restart({ world: wd.id, level: this.li, skipIntro: true }), 'ghost', 24).setDepth(31);
  }

  private toggleView() {
    if (this.done) return;
    this.overview = !this.overview;
    stage.setView(this.overview ? 'overview' : 'follow');
  }

  private updateHud() {
    this.rosaTxt.setText(`✿ ${this.collected}/${this.m.rosas.length}`);
    this.movesTxt.setText(`Passos ${this.moves}  (par ${this.m.par})`);
    this.pips.clear();
    if (this.m.dyn.length) {
      const n = this.def.shift, done = this.moves % n;
      const gap = 22, x0 = W / 2 - ((n - 1) * gap) / 2;
      for (let i = 0; i < n; i++) {
        this.pips.fillStyle(i < done ? this.wd.pal.accent : UI.line, 1);
        this.pips.fillCircle(x0 + i * gap, 188, 7);
      }
    }
    this.hintBtn.txt.setText(`Vagalume ✦${this.hints}`);
    this.hintBtn.setAlpha(this.hints > 0 ? 1 : 0.45);
  }

  // ───────────────────────── Entrada ─────────────────────────
  private setupInput() {
    this.keys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D') as any;
    let ox = 0, oy = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { ox = p.x; oy = p.y; sfx.unlock(); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dx = p.x - ox, dy = p.y - oy;
      if (Math.abs(dx) < 34 && Math.abs(dy) < 34) return;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
      ox = p.x; oy = p.y;
      this.queued = { dir, run: true };
    });
  }

  update() {
    if (this.blocked || this.done || this.moving) return;
    const k = this.keys;
    let dir = -1;
    if (k.UP.isDown || k.W.isDown) dir = 0;
    else if (k.RIGHT.isDown || k.D.isDown) dir = 1;
    else if (k.DOWN.isDown || k.S.isDown) dir = 2;
    else if (k.LEFT.isDown || k.A.isDown) dir = 3;
    if (dir >= 0) this.queued = { dir, run: false };
    if (this.queued) {
      const q = this.queued; this.queued = null;
      this.run = q.run;
      this.step(q.dir);
    }
  }

  // ───────────────────────── Movimento ─────────────────────────
  private step(dir: number) {
    if (this.moving || this.done || this.blocked) return;
    const m = this.m;
    stage.player.dir = Math.atan2(DIRS[dir].dx, DIRS[dir].dy);
    if (!canPass(m, this.idx, dir, this.phase)) {
      sfx.bump(); this.run = false;
      const a = { t: 0 };
      this.tweens.add({ targets: a, t: 1, duration: 120, onUpdate: () => { stage.player.h = Math.sin(a.t * Math.PI) * 0.25; } });
      return;
    }
    const ni = neighbor(m, this.idx, dir);
    this.moving = true; this.lastDir = dir;
    sfx.step();
    const fromX = (this.idx % m.cols) + 0.5, fromY = ((this.idx / m.cols) | 0) + 0.5;
    const toX = (ni % m.cols) + 0.5, toY = ((ni / m.cols) | 0) + 0.5;
    const a = { t: 0 };
    this.tweens.add({
      targets: a, t: 1, duration: 120, ease: 'Sine.InOut',
      onUpdate: () => {
        stage.player.x = fromX + (toX - fromX) * a.t; stage.player.y = fromY + (toY - fromY) * a.t; stage.player.h = a.t;
      },
      onComplete: () => { stage.player.h = 0; this.arrive(ni); },
    });
  }

  private arrive(ni: number) {
    const m = this.m;
    const prev = this.idx;
    this.idx = ni; this.moving = false; this.moves++;
    this.trail.push(ni);
    stage.addTrail(prev, ni, this.trail.length - 1);

    let stop = false;
    if (this.rosas.has(ni)) {
      this.rosas.delete(ni); this.collected++; stop = true;
      sfx.collect(); stage.removeRose(ni);
    }
    if (ni === m.exit) { this.updateHud(); this.finish(); return; }
    if (m.dyn.length && this.moves % this.def.shift === 0) {
      this.phase ^= 1; stage.setPhase(this.phase, true); stop = true;
      sfx.shift(); stage.shake(0.35);
    }
    this.updateHud();

    if (this.queued) {
      const q = this.queued; this.queued = null;
      if (canPass(m, ni, q.dir, this.phase)) { this.run = q.run; this.step(q.dir); return; }
    }
    if (this.run && !stop) {
      const opts: number[] = [];
      for (let d = 0; d < 4; d++) if (d !== OPP[this.lastDir] && canPass(m, ni, d, this.phase)) opts.push(d);
      if (opts.length === 1) { this.step(opts[0]); return; }
    }
    this.run = false;
  }

  private useHint() {
    if (this.hints <= 0 || this.blocked || this.done) return;
    this.hints--; sfx.hint(); this.updateHud();
    stage.hint(pathTo(this.m, this.idx, this.m.exit, this.phase).slice(1, 12));
  }

  // ───────────────────────── Fim de nível ─────────────────────────
  private finish() {
    this.done = true;
    sfx.win();
    const m = this.m;
    stage.win();
    stage.burst(stage.worldPos(m.exit).x, stage.worldPos(m.exit).z, [0x3b74f2, 0x8a4bea, 0xe02bc0, 0xffffff], 50, 0.7);

    let stars = 1;
    if (this.collected === m.rosas.length) stars++;
    if (this.moves <= m.par) stars++;
    save.setLevel(this.wd.id, this.li, { stars, moves: this.moves, trail: this.trail });

    const after = () => this.showResult(stars);
    this.time.delayedCall(1400, () => (this.def.outro ? playDialogue(this, this.def.outro, after) : after()));
  }

  private showResult(stars: number) {
    const root = this.add.container(0, 0).setDepth(150);
    const cx = W / 2, cy = 880, cw = 620, ch = 440;
    const card = this.add.graphics();
    card.fillStyle(0x14151a, 0.88); card.fillRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 36);
    card.lineStyle(3, UI.line, 1); card.strokeRoundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 36);
    card.fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1); card.fillRect(cx - cw / 2 + 40, cy - ch / 2 + 82, cw - 80, 5);
    root.add(card);
    root.add(gradText(this, cx, cy - ch / 2 + 46, 'Nível concluído!', 44));

    for (let i = 0; i < 3; i++) {
      const s = this.add.text(cx + (i - 1) * 110, cy - 100, '★', { fontFamily: FONT, fontSize: '96px', color: i < stars ? '#ffd45a' : '#3b3e48' }).setOrigin(0.5).setScale(0);
      root.add(s);
      this.tweens.add({ targets: s, scale: 1, duration: 380, delay: 300 + i * 260, ease: 'Back.Out', onStart: () => { if (i < stars) sfx.collect(); } });
    }
    root.add(this.add.text(cx, cy - 10, `Passos ${this.moves} (par ${this.m.par})  ·  Rosas ${this.collected}/${this.m.rosas.length}`, { fontFamily: FONT, fontSize: '24px', color: UI.text }).setOrigin(0.5));

    const hasNext = this.li + 1 < this.wd.levels.length;
    root.add(button(this, cx, cy + 66, 480, 88, hasNext ? 'Próximo nível' : 'Voltar aos mundos', () =>
      hasNext ? this.scene.start('Game', { world: this.wd.id, level: this.li + 1 }) : this.scene.start('Worlds'), 'primary', 32));
    root.add(button(this, cx - 125, cy + 162, 230, 72, 'Repetir', () => this.scene.restart({ world: this.wd.id, level: this.li, skipIntro: true }), 'ghost', 24));
    root.add(button(this, cx + 125, cy + 162, 230, 72, 'Galeria', () => this.scene.start('Gallery'), 'ghost', 24));
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 300 });
  }
}
