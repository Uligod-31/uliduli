import Phaser from 'phaser';
import { W, H, UI, FONT, FONT_HEAD, toHex, lighten, brandAt } from '../core/theme';
import { button, gradText, label, roundBtn, Btn } from '../core/ui';
import { Maze, DIRS, OPP, canPass, neighbor, pathTo, distFrom } from '../core/maze';
import { mulberry32, shuffle } from '../core/rng';
import { levelMaze } from '../art/thumb';
import { travel, solve, rotCell, setRot, ringTarget, hazardAt, hazardIn, cloudBit, BRASAS } from '../core/mech';
import { ELEMENTS, PUDDLE, REVIVE, LURE_R, LURE_TICKS, GAS_R, LOW, barrierNear, openBarrier } from '../core/viva';
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
  private gone = 0;               // nuvens já desfeitas (um bit por nuvem)
  private actionBtn?: Btn;
  private mechTxt?: Phaser.GameObjects.Text;
  private mechPips!: Phaser.GameObjects.Graphics;
  // Chama Viva
  private light = 0;
  private lightMax = 1;
  private lightShown = 1;
  private relit = false;          // apanhou uma chama neste passo
  private soak = 0;               // luz extra perdida em poças neste passo
  private puddles = new Set<number>();
  private lure = 0;               // vezes que os guardas ainda vão atrás do clarão
  private facing = 2;
  private warned = false;
  private bumpTip = false;
  private lightG!: Phaser.GameObjects.Graphics;
  private lightTxt!: Phaser.GameObjects.Text;
  private blowBtn?: Btn;
  private blowRing?: Phaser.GameObjects.Graphics;
  private blowTip?: Phaser.GameObjects.Text;

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
    this.brasas = BRASAS; this.armed = false; this.gone = 0; this.actionBtn = undefined; this.mechTxt = undefined;
    this.relit = false; this.soak = 0; this.puddles = new Set(); this.lure = 0; this.facing = 2; this.warned = false; this.bumpTip = false;
    this.blowBtn = undefined; this.blowRing = undefined; this.blowTip = undefined; this.lightShown = 1;
    this.pad.id = -1; this.pad.dir = -1; this.pad.kx = 0; this.pad.ky = 0; this.padArrows = [];
  }

  create() {
    this.cameras.main.fadeIn(380, 5, 6, 11);
    const { def } = this;
    const m = (this.m = levelMaze(def));
    this.idx = m.start;
    this.light = this.lightMax = m.light ?? 99;
    this.trail = [m.start];
    this.rosas = new Set(m.rosas);

    // Espadas: nascem longe do início, nunca em cima de chamas ou da saída
    this.guards = []; this.guardPrev = [];
    if (def.guards) {
      const rng = mulberry32(def.seed * 17 + 3);
      const dist = distFrom(m, m.start, m.mech === 'page' ? 0 : -1);
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
    if (m.mech === 'rings' || m.mech === 'planet' || m.mech === 'holes') { this.overview = true; stage.setView('overview'); } // é preciso ver as ligações
    if (def.fog) stage.setDark(def.fog * 1.0);
    this.events.once('shutdown', () => stage.stop());

    if (m.haz) stage.setHazard(0);
    this.buildHud();
    this.setupInput();
    this.updateHud();

    const go = () => this.introCards(() => { this.blocked = false; this.updateHud(); });
    if (this.skipIntro || !def.intro.length) go();
    else this.time.delayedCall(1300, () => playDialogue(this, def.intro, go));
  }

  /** Na primeira vez de cada regra (a Chama Viva, o sopro do mundo, a mecânica), um cartão curto explica-a. */
  private introCards(done: () => void) {
    const cards: [string, string, string][] = [['viva', 'CHAMA VIVA', 'A tua luz é a tua vida: cada passo gasta 1, e cada chama que apanhas reacende-te por inteiro.\n\nSe a luz acabar, um Vagalume que te sobre reacende-te. Sem nenhum, apagas-te.']];
    const kind = this.m.barriers?.[0]?.kind;
    if (kind) cards.push(['sopro_' + kind, ELEMENTS[kind].name, ELEMENTS[kind].text + '\n\nÉ um atalho: encosta-te e carrega em Soprar.']);
    const mech = this.m.mech;
    if (mech) {
      const info = ({
        ice: ['GELO', 'Aqui não se caminha: desliza-se até à parede ou até à neve. Os aros no chão mostram onde vais parar.\n\nO botão Brasa (3 cargas) faz o próximo passo ter só uma casa e derrete o chão numa poça onde podes travar.'],
        lava: ['A LAVA', 'Ao fim de uns passos, a lava nasce onde começaste e avança sempre.\n\nO chão que vai arder racha primeiro. Escolhe bem a ordem das chamas: só andas tu, só anda ela.'],
        rings: ['OS ANÉIS', 'O labirinto é feito de anéis. O botão Rodar gira o anel assinalado (leva-te se estiveres em cima dele) e conta como um passo.\n\nAlinha as portas e chega ao centro.'],
        planet: ['PLANETA REDONDO', 'Os arcos de luz da mesma cor ligam os dois lados do mundo: sais por um e entras pelo outro.\n\nOs guardas também os usam.'],
        holes: ['BURACOS DE VERME', 'Ao pisares um redemoinho, sais no redemoinho da mesma cor.\n\nSão atalhos: escondem o caminho mais curto até às chamas.'],
        tide: ['A MARÉ', 'A cada 12 passos o mar enche durante 4. As poças azuis são zonas baixas: se lá estiveres quando a água subir, és levado.\n\nO botão Esperar deixa passar um passo.'],
        beat: ['A BATIDA', 'As colunas rebentam à vez, por cores: rosa, azul e amarelo, dois passos cada. A que pisca é a seguinte.\n\nO botão Esperar deixa passar um passo.'],
        page: ['VIRAR A PÁGINA', 'O botão Virar troca de página: umas passagens abrem-se e outras fecham-se. Conta como um passo.\n\nAs estantes fúcsia são as que se movem; a marca azul no chão mostra onde podem voltar.'],
        clouds: ['NUVENS', 'Os tufos desfazem-se quando sais de cima deles, e fica um buraco.\n\nPensa no caminho de volta antes de ires às chamas.'],
      } as Record<string, string[]>)[mech];
      cards.push(['mech_' + mech, info[0], info[1]]);
    }
    const next = () => { const c = cards.shift(); if (!c) { done(); return; } this.card(c[0], c[1], c[2], next); };
    next();
  }

  private card(id: string, head: string, text: string, done: () => void) {
    const key = 'uliduli_' + id;
    let seen = false; try { seen = !!localStorage.getItem(key); } catch { /* ok */ }
    if (seen) { done(); return; }
    const root = this.add.container(0, 0).setDepth(170);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05060b, 0.72).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(0x1e2025, 0.97); g.fillRoundedRect(60, 340, W - 120, 660, 34);
    g.lineStyle(3, UI.line, 1); g.strokeRoundedRect(60, 340, W - 120, 660, 34);
    g.fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1); g.fillRect(100, 466, W - 200, 5);
    const title = gradText(this, W / 2, 410, head, 56);
    const body = this.add.text(W / 2, 500, text, { fontFamily: FONT, fontSize: '30px', color: '#eceef3', align: 'center', wordWrap: { width: W - 200 }, lineSpacing: 8 }).setOrigin(0.5, 0);
    root.add([dim, g, title, body]);
    root.add(button(this, W / 2, 928, 420, 100, 'Entendi', () => {
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
    this.lightG = this.add.graphics().setDepth(30);
    this.lightTxt = this.add.text(W / 2, 135, '', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', fontStyle: 'bold', stroke: '#05060b', strokeThickness: 4 }).setOrigin(0.5).setDepth(30);

    button(this, 70, 70, 100, 70, '‹', () => this.scene.start('Levels', { world: wd.id }), 'ghost', 40).setDepth(31);
    const snd = button(this, W - 80, 70, 120, 70, save.mute ? '♪ off' : '♪ on', () => {
      sfx.setMute(!save.mute); snd.txt.setText(save.mute ? '♪ off' : '♪ on');
    }, 'ghost', 26).setDepth(31);

    this.rosaTxt = this.add.text(50, 176, '', { fontFamily: FONT, fontSize: '30px', color: '#ff9ecb', fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(30);
    this.movesTxt = this.add.text(W - 50, 176, '', { fontFamily: FONT, fontSize: '25px', color: '#fff', fontStyle: 'bold' }).setOrigin(1, 0.5).setDepth(30);
    this.pips = this.add.graphics().setDepth(30);
    this.guardPips = this.add.graphics().setDepth(30);
    if (this.m.dyn.length && this.m.mech !== 'page') label(this, W / 2, 168, 'sebes mudam', 17, UI.textDim as string).setDepth(30);

    // rodapé: três botões numa linha; o joystick fica por cima deles
    this.hintBtn = button(this, 175, H - 70, 300, 88, 'Vagalume ✦' + HINTS, () => this.useHint(), 'primary', 28).setDepth(31);
    button(this, 385, H - 70, 100, 88, '◎', () => this.toggleView(), 'ghost', 38).setDepth(31);
    button(this, 575, H - 70, 220, 88, 'Reiniciar', () => this.scene.restart({ world: wd.id, level: this.li, skipIntro: true }), 'ghost', 24).setDepth(31);
    this.buildPad();
    this.buildMech();
    this.buildBlow();
  }

  /** A barra de luz (com o gradiente de assinatura; âmbar e vermelho quando está a acabar). */
  private drawLight() {
    const g = this.lightG, x = 24, y = 122, w = W - 48, h = 26;
    this.lightShown += (this.light / this.lightMax - this.lightShown) * 0.18;
    const f = Math.max(0, Math.min(1, this.lightShown)), end = x + 3 + (w - 6) * f;
    const low = this.light <= this.lightMax * LOW, beat = low ? 0.5 + 0.5 * Math.sin(this.time.now / 130) : 0;
    g.clear();
    g.fillStyle(0x0a0b10, 0.74); g.fillRoundedRect(x, y, w, h, 13);
    if (f > 0.004) {
      if (low) { g.fillStyle(this.light <= this.lightMax * 0.12 ? 0xff3b30 : 0xff9f1a, 0.75 + 0.25 * beat); g.fillRect(x + 3, y + 4, end - x - 3, h - 8); }
      else { g.fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1); g.fillRect(x + 3, y + 4, end - x - 3, h - 8); }
      g.fillStyle(0xffb040, 0.28 + 0.2 * beat); g.fillCircle(end, y + h / 2, 17);
      g.fillStyle(0xffe9a0, 0.95); g.fillCircle(end, y + h / 2, 7);
    }
    g.lineStyle(2, low ? 0xffb040 : UI.line, 1); g.strokeRoundedRect(x, y, w, h, 13);
  }

  /** Botão «Soprar»: só aparece quando o Uli está encostado a uma barreira. */
  private buildBlow() {
    const kind = this.m.barriers?.[0]?.kind;
    if (!kind) return;
    const x = 88, y = H - 495, E = ELEMENTS[kind];
    this.blowRing = this.add.graphics().setDepth(30).setPosition(x, y).setVisible(false);
    this.blowRing.lineStyle(6, E.hex, 0.95); this.blowRing.strokeCircle(0, 0, 72);
    this.tweens.add({ targets: this.blowRing, scale: 1.09, alpha: 0.5, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // no botão vê-se logo quanta luz custa
    this.blowBtn = roundBtn(this, x, y, 64, `−${E.cost}`, 'Soprar', () => this.blow(), 40).setDepth(31).setVisible(false);
    this.blowBtn.txt.setColor(E.color);
    this.blowTip = this.add.text(W / 2, 268, E.tip, { fontFamily: FONT, fontSize: '22px', color: E.color, fontStyle: 'bold', stroke: '#05060b', strokeThickness: 5 }).setOrigin(0.5).setDepth(30).setVisible(false);
  }

  private refreshBlow() {
    const hit = this.done || this.moving ? null : barrierNear(this.m, this.idx, this.facing);
    stage.nearBarrier(hit ? hit.k : -1);
    const show = !!hit;
    if (show && this.blowBtn && !this.blowBtn.visible) { this.blowBtn.setScale(0.4); this.tweens.add({ targets: this.blowBtn, scale: 1, duration: 240, ease: 'Back.Out' }); }
    this.blowBtn?.setVisible(show); this.blowRing?.setVisible(show); this.blowTip?.setVisible(show);
    if (hit && this.blowBtn) this.blowBtn.setAlpha(this.light > ELEMENTS[this.m.barriers![hit.k].kind].cost ? 1 : 0.45);
  }

  /** Soprar: gasta luz para abrir a barreira. Cada elemento reage à sua maneira. Conta como um passo. */
  private blow() {
    if (this.blocked || this.done || this.moving) return;
    const hit = barrierNear(this.m, this.idx, this.facing);
    if (!hit) return;
    const m = this.m, kind = m.barriers![hit.k].kind, E = ELEMENTS[kind];
    if (this.light <= E.cost) { sfx.bump(); this.say('Pouca luz para soprar', '#ffb0a0'); return; }
    this.moving = true; this.run = false; this.queued = null; this.facing = hit.side;
    const dx = DIRS[hit.side].dx, dz = DIRS[hit.side].dy;
    stage.player.dir = Math.atan2(dx, dz);
    this.refreshBlow();
    sfx.blow(); stage.breath(dx, dz, E.hex); navigator.vibrate?.(20);
    this.time.delayedCall(300, () => {
      openBarrier(m, hit.k); stage.burnBarrier(hit.k, E.hex);
      this.light -= E.cost - E.back - 1;           // o passo desconta o que falta
      if (E.back) this.say(`+${E.back} de luz: era lenha`, E.color);
      if (kind === 'gelo') { this.puddles.add(hit.other); stage.puddle(hit.other); }
      if (kind === 'gas') {
        const d = distFrom(m, this.idx, this.phase);
        this.guards.forEach((g, i) => { if (d[g] >= 0 && d[g] <= GAS_R) { this.stun[i] = GUARD_STUN; stage.setGuardStun(i, true); } });
        sfx.shift(); navigator.vibrate?.([30, 20, 60]);
      } else if (this.guards.length) {
        this.lure = LURE_TICKS;
        const d = distFrom(m, this.idx, this.phase);
        if (this.guards.some((g, i) => !this.stun[i] && d[g] >= 0 && d[g] <= LURE_R)) this.say('Os guardas viram o clarão!', '#ff9a8a');
      }
      this.flameStop = true;
      this.endTurn();
    });
  }

  /** Linha de estado da mecânica e, no gelo e nos anéis, o botão de ação (à direita do joystick). */
  private buildMech() {
    this.mechPips = this.add.graphics().setDepth(30);
    const mech = this.m.mech;
    if (!mech) return;
    this.mechTxt = this.add.text(W / 2, 232, '', { fontFamily: FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#05060b', strokeThickness: 5 }).setOrigin(0.5).setDepth(30);
    const ACT: Record<string, [string, string, number]> = { ice: ['🔥' + BRASAS, 'Brasa', 34], rings: ['⟳', 'Rodar', 50], page: ['⇄', 'Virar', 50], tide: ['⏳', 'Esperar', 40], beat: ['⏳', 'Esperar', 40] };
    const act = ACT[mech];
    if (!act) return;
    this.actionBtn = roundBtn(this, W - 88, H - 345, 66, act[0], act[1], () => this.action(), act[2]).setDepth(31);
    const ring = this.add.graphics().setDepth(30).setPosition(W - 88, H - 345);
    for (let i = 0; i < 40; i++) { const a0 = (i / 40) * Math.PI * 2; ring.lineStyle(5, brandAt(0.5 - 0.5 * Math.cos(a0)), 0.9); ring.beginPath(); ring.arc(0, 0, 74, a0, a0 + 0.18); ring.strokePath(); }
    this.tweens.add({ targets: ring, scale: 1.07, alpha: 0.55, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private action() {
    if (this.blocked || this.done) return;
    const mech = this.m.mech;
    if (mech === 'rings') { this.rotate(); return; }
    if (mech === 'page' || mech === 'tide' || mech === 'beat') {
      if (this.moving) return;
      this.run = false; this.queued = null; this.flameStop = true;
      if (mech === 'page') { this.phase ^= 1; stage.setPhase(this.phase, true); sfx.shift(); stage.shake(0.3); navigator.vibrate?.(26); }
      else { sfx.step(); const a = { t: 0 }; this.tweens.add({ targets: a, t: 1, duration: 160, onUpdate: () => { stage.player.h = Math.sin(a.t * Math.PI) * 0.35; } }); }
      this.endTurn();
      return;
    }
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
    this.lightTxt.setText(`LUZ ${Math.max(0, this.light)}`);
    stage.setLife(this.light / this.lightMax);
    this.refreshBlow();
    this.rosaTxt.setText(`🔥 ${this.collected}/${this.m.rosas.length}` + (this.guards.length ? `   ☠ ${this.guards.length}` : ''));
    this.movesTxt.setText(`Passos ${this.moves}  (par ${this.m.par})`);
    this.pips.clear();
    if (this.m.dyn.length && this.m.mech !== 'page') {
      const n = this.def.shift, done = this.moves % n;
      const gap = 22, x0 = W / 2 - ((n - 1) * gap) / 2;
      for (let i = 0; i < n; i++) {
        this.pips.fillStyle(i < done ? this.wd.pal.accent : UI.line, 1);
        this.pips.fillCircle(x0 + i * gap, 193, 7);
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
      // onde se vai parar em cada direção (com a Brasa pronta, só uma casa)
      const ends: number[] = [];
      for (let d = 0; d < 4 && !this.moving && !this.done; d++) {
        const p = travel(m, this.idx, d, (i, dd) => canPass(m, i, dd, this.phase));
        if (p.length) ends.push(this.armed ? p[0] : p[p.length - 1]);
      }
      stage.setTargets(ends);
      this.actionBtn!.txt.setText('🔥' + this.brasas);
      this.actionBtn!.setAlpha(this.brasas > 0 ? 1 : 0.45);
      this.mechTxt.setText(this.armed ? 'Brasa pronta: o próximo passo derrete o chão' : 'Os aros mostram onde vais parar').setColor(this.armed ? '#ffc457' : '#cfeaff');
      if (this.armed) { g.lineStyle(6, 0xffc457, 0.95); g.strokeCircle(W - 88, H - 345, 84); }
    } else if (m.mech === 'rings') {
      stage.setRingTarget(ringTarget(m, this.idx));
      const inner = ringTarget(m, this.idx) === 2;
      this.mechTxt.setText(m.rings!.n === 2 ? `Rodar gira o anel ${inner ? 'rosa (centro)' : 'dourado'}` : 'Rodar gira o anel dourado').setColor(inner ? '#ff9ae6' : '#ffe28a');
    } else if (m.mech === 'planet') this.mechTxt.setText('Arcos da mesma cor ligam os dois lados').setColor('#8affee');
    else if (m.mech === 'holes') this.mechTxt.setText('Redemoinhos da mesma cor: entras num, sais no outro').setColor('#c9a8ff');
    else if (m.mech === 'page') this.mechTxt.setText(`📖 Página ${this.phase ? 'B' : 'A'}  ·  Virar troca as passagens`).setColor('#ffd9a0');
    else if (m.mech === 'clouds') { const n = m.clouds!.length, left = n - m.clouds!.filter((_, i) => this.gone & (1 << i)).length; this.mechTxt.setText(`☁ Nuvens inteiras: ${left} de ${n}`).setColor('#dfe8ff'); }
    else if (m.mech === 'tide') {
      const high = hazardIn(m, 1, this.moves) === 0;
      let n = 0; while (n < 13 && (hazardIn(m, 1, this.moves + n) === 0) === high) n++;
      this.mechTxt.setText(high ? `🌊 Maré cheia: desce em ${n}` : `🌊 A maré enche em ${n} ${n === 1 ? 'passo' : 'passos'}`).setColor(high ? '#5ad8ff' : n <= 2 ? '#ffd45a' : '#cfeaff');
    } else if (m.mech === 'beat') {
      const NAMES = ['rosa', 'azul', 'amarelo'], COL = ['#ff6ac8', '#5ab4ff', '#ffe04a'];
      const on = Math.floor(this.moves % 6 / 2), nxt = (on + 1) % 3, k = 2 - (this.moves % 2);
      this.mechTxt.setText(`♫ Rebenta: ${NAMES[on]}  ·  em ${k}: ${NAMES[nxt]}`).setColor(COL[on]);
    } else if (m.mech === 'lava') {
      const L = m.lava!, wait = L.delay - this.moves;
      const left = L.at[this.idx] - this.moves;
      this.mechTxt.setText(wait > 0 ? `🌋 A lava acorda em ${wait} ${wait === 1 ? 'passo' : 'passos'}` : left <= 4 ? `CORRE! O chão arde em ${Math.max(0, left)}` : `🌋 A lava avança de ${L.k} em ${L.k} passos`)
        .setColor(wait > 6 ? '#ffd0a0' : left <= 4 ? '#ff4a30' : '#ff9a40');
    }
  }

  // ───────────────────────── Entrada ─────────────────────────
  private setupInput() {
    this.keys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,E') as any;
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
    if (this.lightG) this.drawLight();
    if (this.blocked || this.done || this.moving) return;
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.E)) { this.blow(); return; }
    if (Phaser.Input.Keyboard.JustDown(k.SPACE)) { if (this.actionBtn) this.action(); else this.blow(); return; }
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
    this.facing = dir;
    stage.player.dir = Math.atan2(DIRS[dir].dx, DIRS[dir].dy);
    let path = travel(m, this.idx, dir, (i, d) => canPass(m, i, d, this.phase));
    const wet = path.length > 0 && path.some((c) => hazardAt(m, c, this.moves + 1));
    const lost = path.length > 0 && path.some((c) => { const b = cloudBit(m, c); return b >= 0 && (this.gone & (1 << b)) !== 0; });
    if (wet) this.say(m.mech === 'tide' ? 'A água está lá!' : 'Fora de tempo!', '#ffb0a0');
    if (!path.length || wet || lost) {
      this.refreshBlow();
      if (!path.length && !this.bumpTip && barrierNear(m, this.idx, dir)?.side === dir) { this.bumpTip = true; this.say('Sopra para abrir!', '#ffe28a'); }
      sfx.bump(); this.run = false; navigator.vibrate?.(8);
      const a = { t: 0 };
      this.tweens.add({ targets: a, t: 1, duration: 120, onUpdate: () => { stage.player.h = Math.sin(a.t * Math.PI) * 0.25; } });
      return;
    }
    const brasa = this.armed && m.mech === 'ice';
    if (brasa) path = path.slice(0, 1);
    this.moving = true; this.lastDir = dir; this.flameStop = false;
    this.refreshBlow();
    sfx.step();
    if (m.mech === 'ice') { stage.setTargets([]); if (path.length > 1) { stage.sliding = 1; sfx.shift(); } }
    const pts = [this.idx, ...path], len = path.length, slide = len > 1;
    const xy = (c: number) => ({ x: (c % m.cols) + 0.5, y: ((c / m.cols) | 0) + 0.5 });
    const a = { t: 0 };
    let reached = 0;
    const advance = (upTo: number) => {
      while (reached < upTo && !this.done) {
        reached++;
        const from = pts[reached - 1];
        if (reached === 1) this.leaveCloud(from);
        this.enter(pts[reached], from);
        if (slide && !this.done && m.mech === 'ice') stage.frost(pts[reached]);
        if (Math.abs((from % m.cols) - (pts[reached] % m.cols)) + Math.abs(((from / m.cols) | 0) - ((pts[reached] / m.cols) | 0)) > 1) { stage.warpBurst(pts[reached], 0x8affee); sfx.shift(); }
      }
    };
    const tw = this.tweens.add({
      targets: a, t: len, duration: m.mech === 'ice' && slide ? 70 * len + 90 : slide ? 150 * len : path.some((c) => !!m.warp) && Math.abs((pts[0] % m.cols) - (pts[1] % m.cols)) + Math.abs(((pts[0] / m.cols) | 0) - ((pts[1] / m.cols) | 0)) > 1 ? 240 : 112,
      ease: slide && m.mech === 'ice' ? 'Sine.Out' : slide ? 'Linear' : (this.pad.dir >= 0 || this.queued || this.run) ? 'Linear' : 'Sine.InOut',
      onUpdate: () => {
        if (this.done) return;
        const i = Math.min(len - 1, Math.floor(a.t)), f = a.t - i, p = xy(pts[i]), q = xy(pts[i + 1]);
        if (Math.abs(p.x - q.x) + Math.abs(p.y - q.y) < 1.5) {
          stage.player.x = p.x + (q.x - p.x) * f; stage.player.y = p.y + (q.y - p.y) * f; stage.player.h = slide && m.mech === 'ice' ? 0 : f % 1; stage.uliScale = 1;
        } else if (m.holes?.get(pts[i]) === pts[i + 1]) {
          // buraco de verme: encolhe de um lado e cresce no outro
          const at = f < 0.5 ? p : q;
          stage.player.x = at.x; stage.player.y = at.y; stage.player.h = 0; stage.uliScale = Math.max(0.05, Math.abs(1 - f * 2));
        } else {
          // arco do planeta: sai por um lado e entra pelo outro
          const ux = DIRS[dir].dx, uy = DIRS[dir].dy;
          if (f < 0.5) { stage.player.x = p.x + ux * f; stage.player.y = p.y + uy * f; } else { stage.player.x = q.x - ux * (1 - f); stage.player.y = q.y - uy * (1 - f); }
          stage.player.h = 0;
        }
        advance(Math.floor(a.t + 1e-6));
        if (this.done) { stage.sliding = 0; stage.setTargets([]); tw.stop(); const e = xy(this.idx); stage.player.x = e.x; stage.player.y = e.y; stage.player.h = 0; }
      },
      onComplete: () => {
        stage.player.h = 0; stage.uliScale = 1;
        const e = xy(pts[len]); stage.player.x = e.x; stage.player.y = e.y;
        advance(len);
        stage.sliding = 0;
        if (this.done) return;
        if (brasa) {
          this.armed = false;
          if (!m.grip![this.idx]) { m.grip![this.idx] = 1; this.brasas--; stage.melt(this.idx); sfx.shift(); navigator.vibrate?.(24); }
        }
        if (slide) { if (m.mech === 'ice') stage.shake(0.14); this.run = false; }
        this.endTurn();
      },
    });
  }

  /** Nuvens: a casa de onde se sai desfaz-se. */
  private leaveCloud(from: number) {
    const b = cloudBit(this.m, from);
    if (b >= 0 && !(this.gone & (1 << b))) { this.gone |= 1 << b; stage.dropCloud(from); sfx.shift(); this.flameStop = true; }
  }

  /** Aviso grande e curto a meio do ecrã. */
  private say(msg: string, color: string) {
    const t = this.add.text(W / 2, 290, msg, { fontFamily: FONT_HEAD, fontSize: '40px', color, stroke: '#05060b', strokeThickness: 8, align: 'center' }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: 270, alpha: 0, delay: 1300, duration: 600, onComplete: () => t.destroy() });
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
      this.relit = true; stage.relight();
    }
    if (this.puddles.has(ni)) { this.soak += PUDDLE; this.say('A água apaga-te!', '#8fdcff'); sfx.bump(); }
    if (ni === m.exit) { this.moves++; this.moving = false; this.updateHud(); this.finish(); return; }
    if (this.guards.some((g, i) => g === ni && !this.stun[i])) { this.moves++; this.moving = false; this.caught(); }
  }

  /** Fim de um passo: o mundo reage (sebes, guardas, lava). */
  private endTurn() {
    const m = this.m, ni = this.idx;
    this.moving = false; this.moves++;
    let stop = this.flameStop;
    if (m.dyn.length && m.mech !== 'page' && this.moves % this.def.shift === 0) {
      this.phase ^= 1; stage.setPhase(this.phase, true); stop = true;
      sfx.shift(); stage.shake(0.35); navigator.vibrate?.(26);
    }
    if (this.guards.length && this.moves % guardEvery(this.def) === 0) { this.tickGuards(); if (this.done) return; }
    if (this.stun.some((v) => v > 0)) {
      this.stun = this.stun.map((v, i) => { const n = Math.max(0, v - 1); if (v > 0 && n === 0) stage.setGuardStun(i, false); return n; });
      if (this.guards.some((g, i) => g === ni && !this.stun[i])) { this.caught(); return; }
    }
    if (m.haz) {
      stage.setHazard(this.moves);
      if (m.mech === 'tide' && this.moves % m.haz.period === m.haz.period - 4) { sfx.shift(); stage.shake(0.25); }
      if (hazardAt(m, this.idx, this.moves)) { this.updateHud(); this.caught(m.mech === 'tide' ? 'tide' : 'beat'); return; }
    }
    if (m.clouds && this.gone) {
      const st = { cell: this.idx, flames: [...this.rosas], t: this.moves, gone: this.gone };
      if (!solve(m, st, { needAll: false })) this.say('O caminho desfez-se: reinicia', '#ff6a50');
    }
    if (m.lava) {
      if (this.moves === m.lava.delay) { sfx.shift(); stage.shake(0.6); navigator.vibrate?.([40, 30, 80]); }
      stage.setLava(this.moves);
      if (m.lava.at[this.idx] <= this.moves) { this.updateHud(); this.caught('lava'); return; }
    }
    // Chama Viva: cada passo gasta luz; uma chama apanhada neste passo reacende-a por inteiro
    this.light = this.relit ? this.lightMax : this.light - 1 - this.soak;
    this.relit = false; this.soak = 0;
    if (this.light <= 0) {
      this.light = 0;
      if (this.hints <= 0) { this.updateHud(); this.caught('dark'); return; }
      this.hints--; this.light = Math.ceil(this.lightMax * REVIVE); stop = true; this.warned = false;
      stage.relight(); sfx.hint(); this.say('O Vagalume reacendeu-te!', '#ffe28a'); navigator.vibrate?.([30, 40, 30]);
    } else if (this.light <= this.lightMax * LOW) {
      if (!this.warned) { this.warned = true; stop = true; this.say('A tua chama está a morrer!', '#ffb040'); }
      if (this.light % 2 === 0) sfx.heartbeat();
    } else this.warned = false;
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
      for (let d = 0; d < 4; d++) if (canPass(m, g, d, this.phase)) { const n = neighbor(m, g, d), cb = cloudBit(m, n); if (cb < 0 || !(this.gone & (1 << cb))) opts.push(n); }
      if (!opts.length) return;
      let pick: number;
      const hunting = dist[g] >= 0 && (dist[g] <= GUARD_HUNT || (this.lure > 0 && dist[g] <= LURE_R));
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
    if (this.lure > 0) this.lure--;
    if (this.guards.some((g, i) => g === this.idx && !this.stun[i])) { this.blocked = true; this.time.delayedCall(160, () => this.caught()); }
  }

  private caught(by: 'guard' | 'lava' | 'tide' | 'beat' | 'dark' = 'guard') {
    if (this.done) return;
    this.done = true;
    this.refreshBlow();
    const dark = by === 'dark';
    if (dark) { sfx.snuff(); stage.snuff(); navigator.vibrate?.([40, 60, 40]); this.cameras.main.flash(300, 20, 12, 8); }
    else {
      sfx.bump(); sfx.shift(); navigator.vibrate?.([60, 40, 120]);
      stage.shake(1.1);
      const p = stage.worldPos(this.idx);
      stage.burst(p.x, p.z, [0xff2030, 0xff7a3a, 0xffffff], 40, 0.5);
      this.cameras.main.flash(260, 255, 30, 40);
    }
    const root = this.add.container(0, 0).setDepth(160);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, dark ? 0x040308 : 0x200006, dark ? 0.7 : 0.62).setInteractive();
    const title = gradText(this, W / 2, 470, { guard: 'APANHADO', lava: 'QUEIMADO', tide: 'LEVADO', beat: 'EXPLODIU', dark: 'APAGASTE-TE' }[by], dark ? 92 : 120);
    title.setFill({ guard: '#ff2a3d', lava: '#ff7a20', tide: '#3ac8ff', beat: '#ff4fd8', dark: '#ffb040' }[by]);
    const QUIPS = {
      guard: ['Os Espadas não perdoam.', 'A Rainha manda cumprimentos.', 'Aprende o ritmo deles, rebelde.'],
      lava: ['A lava não espera por ninguém.', 'Muda a ordem das chamas.', 'Os becos queimam primeiro.'],
      tide: ['O mar não avisa duas vezes.', 'Conta os passos até à maré.'],
      beat: ['Fora de tempo!', 'Ouve a cor que pisca.'],
      dark: ['As chamas reacendem-te.', 'Escolhe melhor a ordem das chamas.', 'Guarda um Vagalume para o fim.'],
    };
    const quips = [...QUIPS[by], 'Quase. Tenta outra vez.'];
    const q = this.add.text(W / 2, 580, quips[Math.floor(Math.random() * quips.length)], { fontFamily: FONT, fontSize: '30px', color: '#ffd0d4' }).setOrigin(0.5);
    root.add([dim, title, q]);
    root.add(button(this, W / 2, 740, 520, 110, 'Tentar outra vez', () => this.scene.restart({ world: this.wd.id, level: this.li, skipIntro: true }), 'primary', 38));
    root.add(button(this, W / 2, 880, 520, 90, 'Níveis', () => this.scene.start('Levels', { world: this.wd.id }), 'ghost', 30));
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 260, delay: dark ? 700 : 0 });   // deixa ver a chama apagar-se
    this.tweens.add({ targets: title, scale: { from: 1.25, to: 1 }, duration: 320, delay: dark ? 700 : 0, ease: 'Back.Out' });
  }

  private useHint() {
    if (this.hints <= 0 || this.blocked || this.done) return;
    this.hints--; sfx.hint(); this.updateHud();
    if (this.m.mech) this.mechHint();
    else {
      const d = distFrom(this.m, this.idx, this.phase);
      const near = [...this.rosas].filter((r) => d[r] >= 0).sort((a, b) => d[a] - d[b])[0];
      stage.hint(pathTo(this.m, this.idx, near ?? this.m.exit, this.phase).slice(1, 12));
    }
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
    const st = { cell: this.idx, flames: [...this.rosas], t: this.moves, phase: this.phase, gone: this.gone };
    const sol = solve(this.m, st) ?? solve(this.m, st, { needAll: false });
    if (!sol) { this.say('Já não há caminho: reinicia', '#ff6a50'); return; }
    const first = sol[0];
    if (first.type !== 'move') {
      this.say({ rot: 'Roda agora!', flip: 'Vira a página!', wait: 'Espera!' }[first.type], '#ffe28a');
      if (this.actionBtn) this.tweens.add({ targets: this.actionBtn, scale: 1.3, duration: 220, yoyo: true, repeat: 3 });
      return;
    }
    const cells: number[] = [];
    for (const a of sol) { if (a.type !== 'move' || cells.length >= 14) break; cells.push(...a.path); }
    stage.hint(cells.slice(0, 14));
    const next = sol.find((a) => a.type !== 'move');
    if (next && cells.length < 4) this.say({ rot: 'Depois, roda o anel', flip: 'Depois, vira a página', wait: 'Depois, espera', move: '' }[next.type], '#ffe28a');
  }

  // ───────────────────────── Fim de nível ─────────────────────────
  private finish() {
    this.done = true;
    this.refreshBlow();
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
