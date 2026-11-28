import Phaser from 'phaser';
import { W, H, UI, FONT, FONT_HEAD, toHex, lighten, brandAt } from '../core/theme';
import { button, gradText, label, roundBtn, Btn } from '../core/ui';
import { Maze, DIRS, OPP, canPass, neighbor, pathTo, distFrom } from '../core/maze';
import { mulberry32, shuffle } from '../core/rng';
import { levelMaze } from '../art/thumb';
import { travel, solve, rotCell, setRot, ringTarget, BRASAS } from '../core/mech';
import { LevelDef, WorldDef, getWorld, isUnlocked, GUARD_HUNT, GUARD_STUN, GUARD_STUN_R, HINTS, guardEvery } from '../worlds';
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
  private hints = HINTS;
  private overview = false;
  private guards: number[] = [];
  private guardPrev: number[] = [];
  private stun: number[] = []; // passos que cada guarda ainda fica ofuscado
  // mecânicas do mundo
  private brasas = BRASAS;
  private armed = false;          // Brasa pronta (gelo)
  private flameStop = false;      // apanhou uma chama neste passo
  private actionBtn?: Btn;
  private mechTxt?: Phaser.GameObjects.Text;
  private mechPips!: Phaser.GameObjects.Graphics;

  private pips!: Phaser.GameObjects.Graphics;
  private guardPips!: Phaser.GameObjects.Graphics;
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
    this.run = false; this.lastDir = -1; this.queued = null; this.collected = 0; this.hints = HINTS; this.overview = false;
    this.brasas = BRASAS; this.armed = false; this.actionBtn = undefined; this.mechTxt = undefined;
    this.pad.id = -1; this.pad.dir = -1; this.pad.kx = 0; this.pad.ky = 0; this.padArrows = [];
  }

  create() {
    this.cameras.main.fadeIn(380, 5, 6, 11);
    const { def } = this;
    const m = (this.m = levelMaze(def));
    this.idx = m.start;
    this.trail = [m.start];
    this.rosas = new Set(m.rosas);

    // Espadas: nascem longe do início, nunca em cima de chamas ou da saída
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
    this.stun = this.guards.map(() => 0);
    stage.load(m, this.wd, def.seed, { intro: !this.skipIntro });
    stage.setGuards(this.guards, this.wd.guardStyle ?? 0);
    stage.setWeather(def.weather ?? this.wd.weather ?? 'none');
    stage.start('game');
    // nos anéis é preciso ver a mandala toda: começa na vista geral (◎ volta a seguir a personagem)
    if (m.mech === 'rings') { this.overview = true; stage.setView('overview'); }
    if (def.fog) stage.setDark(def.fog * 1.0);
    this.events.once('shutdown', () => stage.stop());

    this.buildHud();
    this.setupInput();
    this.updateHud();

    const go = () => this.mechCard(() => { this.blocked = false; });
    if (this.skipIntro || !def.intro.length) go();
    else this.time.delayedCall(1300, () => playDialogue(this, def.intro, go));
  }

  /** Na primeira vez de cada mecânica, um cartão curto explica a regra antes de começar. */
  private mechCard(done: () => void) {
    const mech = this.m.mech;
    const key = 'uliduli_mech_' + mech;
    let seen = false; try { seen = !!localStorage.getItem(key); } catch { /* ok */ }
    if (!mech || seen) { done(); return; }
    const info = {
      ice: ['GELO', 'Aqui não se caminha: desliza-se até à parede ou até à neve.\n\nO botão Brasa (3 cargas) faz o próximo passo ter só uma casa e derrete o chão numa poça onde podes travar.'],
      lava: ['A LAVA', 'Ao fim de uns passos, a lava nasce onde começaste e avança sempre.\n\nO chão que vai arder racha primeiro. Escolhe bem a ordem das chamas: só andas tu, só anda ela.'],
      rings: ['OS ANÉIS', 'O labirinto é feito de anéis. O botão Rodar gira o anel assinalado (leva-te se estiveres em cima dele) e conta como um passo.\n\nAlinha as portas e chega ao centro.'],
    }[mech];
    const root = this.add.container(0, 0).setDepth(170);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05060b, 0.72).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(0x1e2025, 0.97); g.fillRoundedRect(60, 360, W - 120, 560, 34);
    g.lineStyle(3, UI.line, 1); g.strokeRoundedRect(60, 360, W - 120, 560, 34);
    g.fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1); g.fillRect(100, 466, W - 200, 5);
    const title = gradText(this, W / 2, 420, info[0], 56);
    const body = this.add.text(W / 2, 500, info[1], { fontFamily: FONT, fontSize: '30px', color: '#eceef3', align: 'center', wordWrap: { width: W - 200 }, lineSpacing: 8 }).setOrigin(0.5, 0);
    root.add([dim, g, title, body]);
    root.add(button(this, W / 2, 852, 420, 100, 'Entendi', () => {
      try { localStorage.setItem(key, '1'); } catch { /* ok */ }
      root.destroy(); this.time.delayedCall(60, done);
    }, 'primary', 36));
    root.setAlpha(0); this.tweens.add({ targets: root, alpha: 1, duration: 220 });
  }

  // ───────────────────────── HUD (vidro sobre o 3D) ─────────────────────────
  private buildHud() {
    const { wd, def } = this;
    const top = this.add.graphics().setDepth(29);
    top.fillGradientStyle(0x0a0b10, 0x0a0b10, 0x0a0b10, 0x0a0b10, 0.62, 0.62, 0, 0);
    top.fillRect(0, 0, W, 230);
    const bot = this.add.graphics().setDepth(29);
    bot.fillGradientStyle(0x0a0b10, 0x0a0b10, 0x0a0b10, 0x0a0b10, 0, 0, 0.5, 0.5);
    bot.fillRect(0, H - 420, W, 420);

    this.add.text(W / 2, 54, wd.name.toUpperCase(), { fontFamily: FONT, fontSize: '22px', color: toHex(lighten(wd.pal.accent, 0.35)), fontStyle: 'bold' }).setOrigin(0.5).setDepth(30).setStyle({ letterSpacing: 5 } as any);
    this.add.text(W / 2, 96, `${def.bonus ? '★ Bónus' : 'Nível ' + (this.li + 1)} · ${def.title}`, { fontFamily: FONT, fontSize: '30px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(30);
    const line = this.add.graphics().setDepth(30);
    line.fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1); line.fillRect(0, 132, W, 4);

    button(this, 70, 70, 100, 70, '‹', () => this.scene.start('Levels', { world: wd.id }), 'ghost', 40).setDepth(31);
    const snd = button(this, W - 80, 70, 120, 70, save.mute ? '♪ off' : '♪ on', () => {
      sfx.setMute(!save.mute); snd.txt.setText(save.mute ? '♪ off' : '♪ on');
    }, 'ghost', 26).setDepth(31);

    this.rosaTxt = this.add.text(50, 176, '', { fontFamily: FONT, fontSize: '30px', color: '#ff9ecb', fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(30);
    this.movesTxt = this.add.text(W - 50, 176, '', { fontFamily: FONT, fontSize: '25px', color: '#fff', fontStyle: 'bold' }).setOrigin(1, 0.5).setDepth(30);
    this.pips = this.add.graphics().setDepth(30);
    this.guardPips = this.add.graphics().setDepth(30);
    if (this.m.dyn.length) label(this, W / 2, 160, 'as sebes mudam em', 18, UI.textDim as string).setDepth(30);

    // rodapé: três botões numa linha; o joystick fica por cima deles
    this.hintBtn = button(this, 175, H - 70, 300, 88, 'Vagalume ✦' + HINTS, () => this.useHint(), 'primary', 28).setDepth(31);
    button(this, 385, H - 70, 100, 88, '◎', () => this.toggleView(), 'ghost', 38).setDepth(31);
    button(this, 575, H - 70, 220, 88, 'Reiniciar', () => this.scene.restart({ world: wd.id, level: this.li, skipIntro: true }), 'ghost', 24).setDepth(31);
    this.buildPad();
    this.buildMech();
  }

  /** Linha de estado da mecânica e, no gelo e nos anéis, o botão de ação (à direita do joystick). */
  private buildMech() {
    this.mechPips = this.add.graphics().setDepth(30);
    const mech = this.m.mech;
    if (!mech) return;
    this.mechTxt = this.add.text(W / 2, 232, '', { fontFamily: FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#05060b', strokeThickness: 5 }).setOrigin(0.5).setDepth(30);
    if (mech === 'lava') return;
    const ice = mech === 'ice';
    this.actionBtn = roundBtn(this, W - 88, H - 345, 66, ice ? '🔥' + BRASAS : '⟳', ice ? 'Brasa' : 'Rodar', () => this.action(), ice ? 34 : 50).setDepth(31);
    const ring = this.add.graphics().setDepth(30).setPosition(W - 88, H - 345);
    for (let i = 0; i < 40; i++) { const a0 = (i / 40) * Math.PI * 2; ring.lineStyle(5, brandAt(0.5 - 0.5 * Math.cos(a0)), 0.9); ring.beginPath(); ring.arc(0, 0, 74, a0, a0 + 0.18); ring.strokePath(); }
    this.tweens.add({ targets: ring, scale: 1.07, alpha: 0.55, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private action() {
    if (this.blocked || this.done) return;
    if (this.m.mech === 'rings') { this.rotate(); return; }
    if (this.brasas <= 0) { sfx.bump(); return; }
    this.armed = !this.armed; sfx.hint(); this.updateHud();
  }

  /** Anéis: roda o anel assinalado um quarto de volta. Conta como um passo. */
  private rotate() {
    if (this.moving || this.done || this.blocked) return;
    const m = this.m, R = m.rings!, L = ringTarget(m, this.idx);
    this.moving = true; this.run = false; this.queued = null;
    sfx.shift(); stage.beginSpin(L); stage.shake(0.18); navigator.vibrate?.(30);
    const a = { t: 0 };
    this.tweens.add({
      targets: a, t: 1, duration: 620, ease: 'Cubic.InOut',
      onUpdate: () => stage.spinStep(a.t),
      onComplete: () => {
        const map = (c: number) => (c >= 0 && R.layer[c] === L ? rotCell(m, c, 1) : c);
        this.idx = map(this.idx);
        this.rosas = new Set([...this.rosas].map(map));
        this.guards = this.guards.map(map); this.guardPrev = this.guardPrev.map(map);
        const rot = R.rot.slice(); rot[L] = (rot[L] + 1) % 4; setRot(m, rot);
        stage.endSpin(map);
        sfx.bump(); stage.shake(0.3);
        this.flameStop = true;
        this.endTurn();
      },
    });
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
    if (d >= 0) { this.drawArrow(d, true); this.queued = { dir: this.mapDir(d), run: false }; this.padSince = this.time.now; sfx.unlock(); }
  }

  /** O joystick é relativo ao ecrã: roda com a vista (quartos de volta). */
  private mapDir(d: number) { return (d + stage.camQuarter) % 4; }

  private toggleView() {
    if (this.done) return;
    this.overview = !this.overview;
    stage.setView(this.overview ? 'overview' : 'follow');
  }

  private updateHud() {
    this.rosaTxt.setText(`🔥 ${this.collected}/${this.m.rosas.length}` + (this.guards.length ? `   ☠ ${this.guards.length}` : ''));
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
    // ritmo dos guardas: quando só falta um ponto, o teu próximo passo faz os guardas mexerem-se
    this.guardPips.clear();
    if (this.guards.length) {
      const gp = guardEvery(this.def), done = this.moves % gp, dazzled = this.stun.some((v) => v > 0);
      stage.setGuardsArmed(done === gp - 1);
      for (let i = 0; i < gp; i++) { this.guardPips.fillStyle(dazzled ? 0xffd45a : i < done ? 0xff3040 : UI.line, 1); this.guardPips.fillCircle(W - 50 - (gp - 1 - i) * 26, 206, 8); }
    }
    this.hintBtn.txt.setText(`Vagalume ✦${this.hints}`);
    this.hintBtn.setAlpha(this.hints > 0 ? 1 : 0.45);
    this.updateMech();
  }

  private updateMech() {
    const m = this.m, g = this.mechPips;
    g.clear();
    if (!this.mechTxt) return;
    if (m.mech === 'ice') {
      this.actionBtn!.txt.setText('🔥' + this.brasas);
      this.actionBtn!.setAlpha(this.brasas > 0 ? 1 : 0.45);
      this.mechTxt.setText(this.armed ? 'Brasa pronta: o próximo passo derrete o chão' : 'No gelo deslizas até à parede ou à neve').setColor(this.armed ? '#ffc457' : '#cfeaff');
      if (this.armed) { g.lineStyle(6, 0xffc457, 0.95); g.strokeCircle(W - 88, H - 345, 84); }
    } else if (m.mech === 'rings') {
      stage.setRingTarget(ringTarget(m, this.idx));
      const inner = ringTarget(m, this.idx) === 2;
      this.mechTxt.setText(m.rings!.n === 2 ? `Rodar gira o anel ${inner ? 'rosa (centro)' : 'dourado'}` : 'Rodar gira o anel dourado').setColor(inner ? '#ff9ae6' : '#ffe28a');
    } else if (m.mech === 'lava') {
      const L = m.lava!, wait = L.delay - this.moves;
      const left = L.at[this.idx] - this.moves;
      this.mechTxt.setText(wait > 0 ? `🌋 A lava acorda em ${wait} ${wait === 1 ? 'passo' : 'passos'}` : left <= 4 ? `CORRE! O chão arde em ${Math.max(0, left)}` : `🌋 A lava avança de ${L.k} em ${L.k} passos`)
        .setColor(wait > 6 ? '#ffd0a0' : left <= 4 ? '#ff4a30' : '#ff9a40');
    }
  }

  // ───────────────────────── Entrada ─────────────────────────
  private setupInput() {
    this.keys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE') as any;
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
    this.setupMapGestures();
  }

  // ───────────────────────── Gestos no mapa ─────────────────────────
  private camPtrs = new Map<number, { x: number; y: number }>();
  private camTouched = false;
  private compass!: Phaser.GameObjects.Graphics;
  private camHint?: Phaser.GameObjects.Text;

  private setupMapGestures() {
    this.input.addPointer(2);
    const P = this.pad;
    const centre = () => { // toque no centro do joystick (ou na bússola): volta a centrar na personagem
      stage.camRecenter();
      try { navigator.vibrate?.(14); } catch { /* sem vibração */ }
      this.tweens.add({ targets: this.padKnob, scale: 1.25, duration: 110, yoyo: true });
      this.recFlash = 1;
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.blocked || this.done) return;
      const dpad = Math.hypot(p.x - P.cx, p.y - P.cy);
      if (dpad < 34) { centre(); return; }                          // centro do joystick
      if (dpad <= P.r + 30) return;                                  // resto do joystick
      if (Math.hypot(p.x - 84, p.y - (H - 350)) < 52) { centre(); return; }   // bússola
      if (p.y < 232 || p.y > H - 120) return;                        // cabeçalho e rodapé
      if (this.input.hitTestPointer(p).length) return;               // botões
      this.camPtrs.set(p.id, { x: p.x, y: p.y });
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const prev = this.camPtrs.get(p.id);
      if (!prev) return;
      if (this.camPtrs.size === 1) {
        // um dedo: vira o labirinto (esquerda/direita) e inclina-o (cima/baixo)
        stage.camGesture({ yaw: -(p.x - prev.x) * 0.0072, pitch: (p.y - prev.y) * 0.0042 });
      } else {
        // dois dedos: arrasta o mapa, aproxima/afasta e roda
        const other = [...this.camPtrs.entries()].find(([id]) => id !== p.id)![1];
        const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(p.x - other.x, p.y - other.y);
        if (d0 > 30 && d1 > 30) stage.camGesture({ zoom: d0 / d1 });
        const a0 = Math.atan2(prev.y - other.y, prev.x - other.x), a1 = Math.atan2(p.y - other.y, p.x - other.x);
        let da = a1 - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
        stage.camGesture({ yaw: -da * 0.5, panX: (p.x - prev.x) / 2 / W, panY: (p.y - prev.y) / 2 / H });
      }
      prev.x = p.x; prev.y = p.y;
      if (!this.camTouched) { this.camTouched = true; this.camHint?.destroy(); try { localStorage.setItem('uliduli_camhint', '1'); } catch { /* ok */ } }
    });
    const up = (p: Phaser.Input.Pointer) => { if (this.camPtrs.delete(p.id) && this.camPtrs.size === 0) stage.camRelease(); };
    this.input.on('pointerup', up); this.input.on('pointerupoutside', up);

    // bússola: o norte do labirinto; toca para centrar
    this.compass = this.add.graphics().setDepth(31);
    // dica única, nas primeiras vezes
    let seen = false; try { seen = !!localStorage.getItem('uliduli_camhint'); } catch { /* ok */ }
    if (!seen) {
      this.camHint = this.add.text(W / 2, 262, 'Arrasta o mapa para o virar  ·  toca no centro do joystick para centrar', { fontFamily: FONT, fontSize: '20px', color: '#cfe0ff', stroke: '#05060b', strokeThickness: 5, align: 'center', wordWrap: { width: W - 90 } }).setOrigin(0.5).setDepth(30).setAlpha(0);
      this.tweens.add({ targets: this.camHint, alpha: 0.95, duration: 500, delay: 1200, yoyo: true, hold: 4200, onComplete: () => this.camHint?.destroy() });
    }
  }
  private recFlash = 0;

  private drawCompass() {
    const g = this.compass, cx = 84, cy = H - 350, r = 38, yaw = stage.camYaw, off = stage.camOffset;
    g.clear();
    g.fillStyle(0x0a0b10, 0.42); g.fillCircle(cx, cy, r);
    g.lineStyle(3, off > 0.05 ? UI.fuchsia : UI.blue, off > 0.05 ? 0.95 : 0.5); g.strokeCircle(cx, cy, r);
    // agulha: aponta para o "cima" original do labirinto (roda ao contrário da vista)
    const a = yaw, nx = Math.sin(a), ny = -Math.cos(a);
    g.fillStyle(0xff4fd8, 0.95); g.fillTriangle(cx + nx * (r - 6), cy + ny * (r - 6), cx - ny * 8 - nx * 4, cy + nx * 8 - ny * 4, cx + ny * 8 - nx * 4, cy - nx * 8 - ny * 4);
    g.fillStyle(0xffffff, 0.5); g.fillTriangle(cx - nx * (r - 8), cy - ny * (r - 8), cx - ny * 7 + nx * 4, cy + nx * 7 + ny * 4, cx + ny * 7 + nx * 4, cy - nx * 7 + ny * 4);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(cx, cy, 4);
    if (off > 0.05) { const k = 0.5 + 0.5 * Math.sin(this.time.now / 180); g.lineStyle(2, UI.fuchsia, 0.35 + 0.4 * k); g.strokeCircle(this.pad.cx, this.pad.cy, 46 + 8 * k); }
    if (this.recFlash > 0) { g.lineStyle(5, 0xffffff, this.recFlash * 0.8); g.strokeCircle(this.pad.cx, this.pad.cy, 46 + (1 - this.recFlash) * 70); this.recFlash = Math.max(0, this.recFlash - 0.06); }
  }

  update() {
    if (this.padKnob) this.drawKnob();
    if (this.compass) this.drawCompass();
    if (this.blocked || this.done || this.moving) return;
    const k = this.keys;
    if (this.actionBtn && Phaser.Input.Keyboard.JustDown(k.SPACE)) { this.action(); return; }
    let dir = -1;
    // joystick segurado: continua a andar (sem repetir o "toc" na parede). No gelo, cada deslize pede um toque.
    if (this.m.mech !== 'ice' && this.pad.dir >= 0 && !this.queued && this.time.now - this.padSince > 150 && canPass(this.m, this.idx, this.mapDir(this.pad.dir), this.phase)) this.queued = { dir: this.mapDir(this.pad.dir), run: false };
    if (k.UP.isDown || k.W.isDown) dir = 0;
    else if (k.RIGHT.isDown || k.D.isDown) dir = 1;
    else if (k.DOWN.isDown || k.S.isDown) dir = 2;
    else if (k.LEFT.isDown || k.A.isDown) dir = 3;
    if (this.m.mech === 'ice' && !['UP', 'DOWN', 'LEFT', 'RIGHT', 'W', 'A', 'S', 'D'].some((n) => Phaser.Input.Keyboard.JustDown(k[n]))) dir = -1;
    if (dir >= 0) this.queued = { dir: this.mapDir(dir), run: false };
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
    let path = travel(m, this.idx, dir, (i, d) => canPass(m, i, d, this.phase));
    if (!path.length) {
      sfx.bump(); this.run = false; navigator.vibrate?.(8);
      const a = { t: 0 };
      this.tweens.add({ targets: a, t: 1, duration: 120, onUpdate: () => { stage.player.h = Math.sin(a.t * Math.PI) * 0.25; } });
      return;
    }
    const brasa = this.armed && m.mech === 'ice';
    if (brasa) path = path.slice(0, 1);
    this.moving = true; this.lastDir = dir; this.flameStop = false;
    sfx.step();
    const pts = [this.idx, ...path], len = path.length, slide = len > 1;
    const xy = (c: number) => ({ x: (c % m.cols) + 0.5, y: ((c / m.cols) | 0) + 0.5 });
    const a = { t: 0 };
    let reached = 0;
    const advance = (upTo: number) => {
      while (reached < upTo && !this.done) {
        reached++;
        this.enter(pts[reached], pts[reached - 1]);
        if (slide && !this.done) stage.frost(pts[reached]);
      }
    };
    const tw = this.tweens.add({
      targets: a, t: len, duration: slide ? 70 * len + 90 : 112,
      ease: slide ? 'Sine.Out' : (this.pad.dir >= 0 || this.queued || this.run) ? 'Linear' : 'Sine.InOut',
      onUpdate: () => {
        if (this.done) return;
        const i = Math.min(len - 1, Math.floor(a.t)), f = a.t - i, p = xy(pts[i]), q = xy(pts[i + 1]);
        stage.player.x = p.x + (q.x - p.x) * f; stage.player.y = p.y + (q.y - p.y) * f; stage.player.h = slide ? 0 : f;
        advance(Math.floor(a.t + 1e-6));
        if (this.done) { tw.stop(); const e = xy(this.idx); stage.player.x = e.x; stage.player.y = e.y; stage.player.h = 0; }
      },
      onComplete: () => {
        stage.player.h = 0;
        advance(len);
        if (this.done) return;
        if (brasa) {
          this.armed = false;
          if (!m.grip![this.idx]) { m.grip![this.idx] = 1; this.brasas--; stage.melt(this.idx); sfx.shift(); navigator.vibrate?.(24); }
        }
        if (slide) { stage.shake(0.14); this.run = false; }
        this.endTurn();
      },
    });
  }

  /** A personagem entra numa casa (num deslize há várias por passo). */
  private enter(ni: number, prev: number) {
    const m = this.m;
    this.idx = ni;
    // nos anéis, o trilho guardado fica em coordenadas de origem (a obra da Galeria não roda)
    this.trail.push(m.rings ? rotCell(m, ni, -m.rings.rot[m.rings.layer[ni]]) : ni);
    stage.addTrail(prev, ni, this.trail.length - 1);
    if (this.rosas.has(ni)) {
      this.rosas.delete(ni); this.collected++; this.flameStop = true;
      sfx.collect(); stage.removeRose(ni); navigator.vibrate?.(18);
    }
    if (ni === m.exit) { this.moves++; this.moving = false; this.updateHud(); this.finish(); return; }
    if (this.guards.some((g, i) => g === ni && !this.stun[i])) { this.moves++; this.moving = false; this.caught(); }
  }

  /** Fim de um passo: o mundo reage (sebes, guardas, lava). */
  private endTurn() {
    const m = this.m, ni = this.idx;
    this.moving = false; this.moves++;
    let stop = this.flameStop;
    if (m.dyn.length && this.moves % this.def.shift === 0) {
      this.phase ^= 1; stage.setPhase(this.phase, true); stop = true;
      sfx.shift(); stage.shake(0.35); navigator.vibrate?.(26);
    }
    if (this.guards.length && this.moves % guardEvery(this.def) === 0) { this.tickGuards(); if (this.done) return; }
    if (this.stun.some((v) => v > 0)) {
      this.stun = this.stun.map((v, i) => { const n = Math.max(0, v - 1); if (v > 0 && n === 0) stage.setGuardStun(i, false); return n; });
      if (this.guards.some((g, i) => g === ni && !this.stun[i])) { this.caught(); return; }
    }
    if (m.lava) {
      if (this.moves === m.lava.delay) { sfx.shift(); stage.shake(0.6); navigator.vibrate?.([40, 30, 80]); }
      stage.setLava(this.moves);
      if (m.lava.at[this.idx] <= this.moves) { this.updateHud(); this.caught('lava'); return; }
    }
    this.updateHud();
    if (this.blocked) return;

    if (this.queued) {
      const q = this.queued; this.queued = null;
      if (canPass(m, ni, q.dir, this.phase)) { this.run = q.run; this.step(q.dir); return; }
    }
    if (m.mech === 'ice') { this.run = false; return; }
    // joystick segurado: fluxo contínuo, sem pausas, e dobra sozinho nas esquinas de um corredor
    if (!stop && this.pad.dir >= 0 && this.time.now - this.padSince > 150) {
      const held = this.mapDir(this.pad.dir);
      if (canPass(m, ni, held, this.phase)) { this.step(held); return; }
      const opts: number[] = [];
      for (let d = 0; d < 4; d++) if (d !== OPP[this.lastDir] && canPass(m, ni, d, this.phase)) opts.push(d);
      if (opts.length === 1) { this.step(opts[0]); return; }
    }
    if (this.run && !stop) {
      const opts: number[] = [];
      for (let d = 0; d < 4; d++) if (d !== OPP[this.lastDir] && canPass(m, ni, d, this.phase)) opts.push(d);
      if (opts.length === 1) { this.step(opts[0]); return; }
    }
    this.run = false;
  }

  /** Os Espadas movem-se de gp em gp passos: caçam se estiveres a ≤ 4 casas, senão patrulham. Ofuscados ficam parados. */
  private tickGuards() {
    const m = this.m;
    const dist = distFrom(m, this.idx, this.phase);
    this.guards.forEach((g, i) => {
      if (this.stun[i] > 0) return;
      const opts: number[] = [];
      for (let d = 0; d < 4; d++) if (canPass(m, g, d, this.phase)) opts.push(neighbor(m, g, d));
      if (!opts.length) return;
      let pick: number;
      const hunting = dist[g] >= 0 && dist[g] <= GUARD_HUNT;
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
    if (this.guards.some((g, i) => g === this.idx && !this.stun[i])) { this.blocked = true; this.time.delayedCall(160, () => this.caught()); }
  }

  private caught(by: 'guard' | 'lava' = 'guard') {
    if (this.done) return;
    const lava = by === 'lava';
    this.done = true;
    sfx.bump(); sfx.shift(); navigator.vibrate?.([60, 40, 120]);
    stage.shake(1.1);
    const p = stage.worldPos(this.idx);
    stage.burst(p.x, p.z, [0xff2030, 0xff7a3a, 0xffffff], 40, 0.5);
    this.cameras.main.flash(260, 255, 30, 40);
    const root = this.add.container(0, 0).setDepth(160);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x200006, 0.62).setInteractive();
    const title = gradText(this, W / 2, 470, lava ? 'QUEIMADO' : 'APANHADO', 120);
    title.setFill(lava ? '#ff7a20' : '#ff2a3d');
    const quips = lava ? ['A lava não espera por ninguém.', 'Muda a ordem das chamas.', 'Os becos queimam primeiro.', 'Quase. Tenta outra vez.']
      : ['Os Espadas não perdoam.', 'A Rainha manda cumprimentos.', 'Aprende o ritmo deles, rebelde.', 'Quase. Tenta outra vez.'];
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
    if (this.m.mech) this.mechHint();
    else stage.hint(pathTo(this.m, this.idx, this.m.exit, this.phase).slice(1, 12));
    // a luz do Vagalume ofusca os guardas por perto: ficam parados e podes passar por eles
    if (this.guards.length) {
      const d = distFrom(this.m, this.idx, this.phase);
      let any = false;
      this.guards.forEach((g, i) => {
        if (d[g] >= 0 && d[g] <= GUARD_STUN_R) {
          this.stun[i] = GUARD_STUN; stage.setGuardStun(i, true); any = true;
          const p = stage.worldPos(g); stage.burst(p.x, p.z, [0xffe9a0, 0xffd45a, 0xffffff], 18, 0.7);
        }
      });
      if (any) { navigator.vibrate?.(30); stage.shake(0.2); this.updateHud(); }
    }
  }

  /** Vagalume nos mundos com mecânica: o mesmo solver mostra os próximos passos da melhor rota (ou diz quando rodar). */
  private mechHint() {
    const st = { cell: this.idx, flames: [...this.rosas], t: this.moves };
    const sol = solve(this.m, st) ?? solve(this.m, st, { needAll: false });
    const say = (msg: string, color: string) => {
      const t = this.add.text(W / 2, 290, msg, { fontFamily: FONT_HEAD, fontSize: '40px', color, stroke: '#05060b', strokeThickness: 8, align: 'center' }).setOrigin(0.5).setDepth(40);
      this.tweens.add({ targets: t, y: 270, alpha: 0, delay: 1500, duration: 600, onComplete: () => t.destroy() });
    };
    if (!sol) { say('Já não há caminho: reinicia', '#ff6a50'); return; }
    if (sol[0].type === 'rot') {
      say('Roda agora!', '#ffe28a');
      if (this.actionBtn) this.tweens.add({ targets: this.actionBtn, scale: 1.3, duration: 220, yoyo: true, repeat: 3 });
      return;
    }
    const cells: number[] = [];
    for (const a of sol) { if (a.type !== 'move' || cells.length >= 14) break; cells.push(...a.path); }
    stage.hint(cells.slice(0, 14));
    if (this.m.mech === 'rings' && sol.some((a) => a.type === 'rot') && cells.length < 4) say('Depois, roda o anel', '#ffe28a');
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
    save.setLevel(this.wd.id, this.li, { stars, moves: this.moves, trail: this.trail, rev: this.def.rev });

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
    root.add(this.add.text(cx, cy - 10, `Passos ${this.moves} (par ${this.m.par})  ·  Chamas ${this.collected}/${this.m.rosas.length}`, { fontFamily: FONT, fontSize: '24px', color: UI.text }).setOrigin(0.5));

    const nextIdx = this.li + 1, levels = this.wd.levels;
    const hasNext = nextIdx < levels.length && isUnlocked(this.wd, nextIdx, save);
    const bonusNow = hasNext && !!levels[nextIdx].bonus;
    if (bonusNow) root.add(this.add.text(cx, cy + 14, '★ Nível bónus desbloqueado! ★', { fontFamily: FONT, fontSize: '26px', color: '#ffe28a', fontStyle: 'bold', stroke: '#05060b', strokeThickness: 5 }).setOrigin(0.5));
    const lastNormal = nextIdx === levels.length - 1 && !!levels[nextIdx].bonus && !hasNext;
    if (lastNormal) root.add(this.add.text(cx, cy + 14, 'Bónus: precisas de todas as ★ do mundo', { fontFamily: FONT, fontSize: '22px', color: UI.textDim as string, stroke: '#05060b', strokeThickness: 4 }).setOrigin(0.5));
    const label = hasNext ? (bonusNow ? 'Nível bónus' : 'Próximo nível') : this.def.bonus ? 'Voltar aos mundos' : 'Voltar aos níveis';
    root.add(button(this, cx, cy + 76, 480, 84, label, () =>
      hasNext ? this.scene.start('Game', { world: this.wd.id, level: nextIdx }) : this.def.bonus ? this.scene.start('Worlds') : this.scene.start('Levels', { world: this.wd.id }), 'primary', 32));
    root.add(button(this, cx - 125, cy + 170, 230, 72, 'Repetir', () => this.scene.restart({ world: this.wd.id, level: this.li, skipIntro: true }), 'ghost', 24));
    root.add(button(this, cx + 125, cy + 170, 230, 72, 'Galeria', () => this.scene.start('Gallery'), 'ghost', 24));
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 300 });
  }
}
