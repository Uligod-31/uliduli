import Phaser from 'phaser';
import { W, H, UI, FONT, toHex, lighten, brandAt } from '../core/theme';
import { button, gradText, label, roundBtn, Btn } from '../core/ui';
import { Maze, DIRS, OPP, canPass, neighbor, pathTo, distFrom } from '../core/maze';
import { mulberry32, shuffle } from '../core/rng';
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
  private guards: number[] = [];
  private guardPrev: number[] = [];

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
    this.pad.id = -1; this.pad.dir = -1; this.pad.kx = 0; this.pad.ky = 0; this.padArrows = [];
  }

  create() {
    const { def } = this;
    const m = (this.m = levelMaze(def));
    this.idx = m.start;
    this.trail = [m.start];
    this.rosas = new Set(m.rosas);

    // Espadas: nascem longe do início, nunca em cima de rosas ou da saída
    this.guards = []; this.guardPrev = [];
    if (def.guards) {
      const rng = mulberry32(def.seed * 17 + 3);
      const dist = distFrom(m, m.start);
      const far = Array.from({ length: m.cols * m.rows }, (_, i) => i)
        .filter((i) => !m.solid[i] && i !== m.exit && i !== m.start && !m.rosas.includes(i) && dist[i] >= Math.max(7, m.shortest * 0.35));
      shuffle(far, rng);
      for (const c of far) {
        if (this.guards.length >= def.guards) break;
        if (this.guards.every((g) => Math.abs((g % m.cols) - (c % m.cols)) + Math.abs(((g / m.cols) | 0) - ((c / m.cols) | 0)) >= 5)) this.guards.push(c);
      }
      this.guardPrev = this.guards.map(() => -1);
    }
    stage.load(m, this.wd, def.seed, { intro: !this.skipIntro });
    stage.setGuards(this.guards);
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
    bot.fillGradientStyle(0x0a0b10, 0x0a0b10, 0x0a0b10, 0x0a0b10, 0, 0, 0.7, 0.7);
    bot.fillRect(0, H - 520, W, 520);

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

    // rodapé: três botões numa linha; o joystick fica por cima deles
    this.hintBtn = button(this, 175, H - 70, 300, 88, 'Vagalume ✦2', () => this.useHint(), 'primary', 28).setDepth(31);
    button(this, 385, H - 70, 100, 88, '◎', () => this.toggleView(), 'ghost', 38).setDepth(31);
    button(this, 575, H - 70, 220, 88, 'Reiniciar', () => this.scene.restart({ world: wd.id, level: this.li, skipIntro: true }), 'ghost', 24).setDepth(31);
    this.buildPad();
  }

  // ───────────────────────── Joystick de vidro ─────────────────────────
  private pad = { cx: W / 2, cy: H - 335, r: 150, id: -1, dir: -1, kx: 0, ky: 0 };
  private padSince = 0;
  private padArrows: Phaser.GameObjects.Graphics[] = [];
  private padKnob!: Phaser.GameObjects.Graphics;

  private buildPad() {
    const { cx, cy, r } = this.pad;
    const base = this.add.graphics().setDepth(31);
    base.fillStyle(0x0a0b10, 0.34); base.fillCircle(cx, cy, r);
    for (let i = 0; i < 40; i++) {            // anel com o gradiente de assinatura
      const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1.15) / 40) * Math.PI * 2;
      base.lineStyle(5, brandAt(0.5 - 0.5 * Math.cos(a0)), 0.55);
      base.beginPath(); base.arc(cx, cy, r, a0, a1); base.strokePath();
    }
    base.lineStyle(2, 0xffffff, 0.12); base.strokeCircle(cx, cy, r - 12);
    const orbit = this.add.graphics().setDepth(31);   // arcos que giram devagar (um "mini labirinto" em órbita)
    for (let k = 0; k < 4; k++) {
      orbit.lineStyle(3, UI.fuchsia, 0.3);
      orbit.beginPath(); orbit.arc(0, 0, r - 30, k * 1.57 + 0.2, k * 1.57 + 0.95); orbit.strokePath();
    }
    orbit.setPosition(cx, cy);
    this.tweens.add({ targets: orbit, rotation: Math.PI * 2, duration: 14000, repeat: -1 });

    for (let d = 0; d < 4; d++) {
      const g = this.add.graphics().setDepth(32);
      this.padArrows.push(g);
      this.drawArrow(d, false);
    }
    this.padKnob = this.add.graphics().setDepth(33);
    this.drawKnob();
    this.tweens.add({ targets: this.padKnob, alpha: 0.78, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private drawArrow(d: number, active: boolean) {
    const { cx, cy } = this.pad;
    const ux = DIRS[d].dx, uy = DIRS[d].dy, px = -uy, py = ux;
    const c = brandAt([0.1, 0.45, 0.9, 0.7][d]);
    const g = this.padArrows[d];
    g.clear();
    const mx = cx + ux * 98, my = cy + uy * 98;
    if (active) { g.fillStyle(c, 0.28); g.fillCircle(mx, my, 58); g.fillStyle(0xffffff, 0.12); g.fillCircle(mx, my, 36); }
    const tip = [mx + ux * 34, my + uy * 34], l = [mx - ux * 18 + px * 40, my - uy * 18 + py * 40], rr = [mx - ux * 18 - px * 40, my - uy * 18 - py * 40];
    g.fillStyle(active ? c : 0xffffff, active ? 0.92 : 0.26);
    g.fillTriangle(tip[0], tip[1], l[0], l[1], rr[0], rr[1]);
    g.lineStyle(3, c, active ? 1 : 0.7);
    g.strokeTriangle(tip[0], tip[1], l[0], l[1], rr[0], rr[1]);
  }

  private drawKnob() {
    const { cx, cy, kx, ky } = this.pad;
    const g = this.padKnob;
    g.clear();
    g.fillStyle(UI.g2, 0.22); g.fillCircle(cx + kx, cy + ky, 54);
    g.fillStyle(UI.g2, 0.6); g.fillCircle(cx + kx, cy + ky, 36);
    g.lineStyle(3, 0xffffff, 0.55); g.strokeCircle(cx + kx, cy + ky, 36);
    g.fillStyle(0xffffff, 0.75); g.fillCircle(cx + kx - 9, cy + ky - 10, 9);
    g.fillStyle(UI.fuchsia, 0.8); g.fillCircle(cx + kx, cy + ky, 8);
  }

  private setPadDir(d: number) {
    if (d === this.pad.dir) return;
    if (this.pad.dir >= 0) this.drawArrow(this.pad.dir, false);
    this.pad.dir = d;
    // toque = um passo; só segurar (≥ 0,2 s) dá avanço contínuo
    if (d >= 0) { this.drawArrow(d, true); this.queued = { dir: d, run: false }; this.padSince = this.time.now; sfx.unlock(); }
  }

  private toggleView() {
    if (this.done) return;
    this.overview = !this.overview;
    stage.setView(this.overview ? 'overview' : 'follow');
  }

  private updateHud() {
    this.rosaTxt.setText(`✿ ${this.collected}/${this.m.rosas.length}` + (this.guards.length ? `   ☠ ${this.guards.length}` : ''));
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
    const P = this.pad;
    const read = (p: Phaser.Input.Pointer) => {
      const dx = p.x - P.cx, dy = p.y - P.cy, len = Math.hypot(dx, dy);
      const k = Math.min(1, len / 90) * 24;
      P.kx = len > 0 ? (dx / len) * k : 0; P.ky = len > 0 ? (dy / len) * k : 0;
      if (len < 34) return -1;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.blocked || this.done || P.id >= 0) return;
      if (Math.hypot(p.x - P.cx, p.y - P.cy) > P.r + 30) return;
      P.id = p.id; this.setPadDir(read(p));
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.id === P.id) this.setPadDir(read(p)); });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== P.id) return;
      P.id = -1; P.kx = 0; P.ky = 0; this.setPadDir(-1);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  update() {
    if (this.padKnob) this.drawKnob();
    if (this.blocked || this.done || this.moving) return;
    const k = this.keys;
    let dir = -1;
    // joystick segurado: continua a andar (sem repetir o "toc" na parede)
    if (this.pad.dir >= 0 && !this.queued && this.time.now - this.padSince > 200 && canPass(this.m, this.idx, this.pad.dir, this.phase)) this.queued = { dir: this.pad.dir, run: false };
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
    if (this.guards.includes(ni)) { this.caught(); return; }
    if (m.dyn.length && this.moves % this.def.shift === 0) {
      this.phase ^= 1; stage.setPhase(this.phase, true); stop = true;
      sfx.shift(); stage.shake(0.35);
    }
    if (this.guards.length && this.moves % 2 === 0) { this.tickGuards(); if (this.done) return; }
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

  /** Os Espadas movem-se de 2 em 2 passos: caçam se estiveres a ≤ 6 casas, senão patrulham. */
  private tickGuards() {
    const m = this.m;
    const dist = distFrom(m, this.idx, this.phase);
    this.guards.forEach((g, i) => {
      const opts: number[] = [];
      for (let d = 0; d < 4; d++) if (canPass(m, g, d, this.phase)) opts.push(neighbor(m, g, d));
      if (!opts.length) return;
      let pick: number;
      const hunting = dist[g] >= 0 && dist[g] <= 6;
      if (hunting) {
        const best = Math.min(...opts.map((o) => (dist[o] < 0 ? 99 : dist[o])));
        const cands = opts.filter((o) => (dist[o] < 0 ? 99 : dist[o]) === best && !this.guards.some((h, j) => j !== i && h === o));
        pick = (cands.length ? cands : opts.filter((o) => (dist[o] < 0 ? 99 : dist[o]) === best))[0];
      } else {
        const fwd = opts.filter((o) => o !== this.guardPrev[i]);
        const pool = fwd.length ? fwd : opts;
        pick = pool[Math.floor(Math.random() * pool.length)];
      }
      this.guardPrev[i] = g;
      this.guards[i] = pick;
      stage.moveGuard(i, pick);
    });
    if (this.guards.includes(this.idx)) { this.blocked = true; this.time.delayedCall(160, () => this.caught()); }
  }

  private caught() {
    if (this.done) return;
    this.done = true;
    sfx.bump(); sfx.shift();
    stage.shake(1.1);
    const p = stage.worldPos(this.idx);
    stage.burst(p.x, p.z, [0xff2030, 0xff7a3a, 0xffffff], 40, 0.5);
    this.cameras.main.flash(260, 255, 30, 40);
    const root = this.add.container(0, 0).setDepth(160);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x200006, 0.62).setInteractive();
    const title = gradText(this, W / 2, 470, 'APANHADO', 120);
    title.setFill('#ff2a3d');
    const quips = ['Os Espadas não perdoam.', 'A Rainha manda cumprimentos.', 'Aprende o ritmo deles, rebelde.', 'Quase. Tenta outra vez.'];
    const q = this.add.text(W / 2, 580, quips[Math.floor(Math.random() * quips.length)], { fontFamily: FONT, fontSize: '30px', color: '#ffd0d4' }).setOrigin(0.5);
    root.add([dim, title, q]);
    root.add(button(this, W / 2, 740, 520, 110, 'Tentar outra vez', () => this.scene.restart({ world: this.wd.id, level: this.li, skipIntro: true }), 'primary', 38));
    root.add(button(this, W / 2, 880, 520, 90, 'Níveis', () => this.scene.start('Levels', { world: this.wd.id }), 'ghost', 30));
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 260 });
    this.tweens.add({ targets: title, scale: { from: 1.25, to: 1 }, duration: 320, ease: 'Back.Out' });
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
