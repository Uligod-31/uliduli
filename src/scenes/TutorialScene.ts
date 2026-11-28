import Phaser from 'phaser';
import { W, H, UI, FONT, FONT_HEAD, brandAt } from '../core/theme';
import { button, gradText, bgGradient, signatureLine } from '../core/ui';

type Pt = [number, number];
type Root = Phaser.GameObjects.Container;
interface Page { title: string; body: string; draw: (root: Root) => void }
interface MapPos { cx: (x: number) => number; cy: (y: number) => number; cs: number; rows: string[] }

/** Labirinto de demonstração (# parede, . chão, P início, E saída). A rota certa dá a volta; a coluna da esquerda e o corredor de baixo são becos. */
const MAP_A = [
  '#########',
  '#P..#...#',
  '#.#.#.#.#',
  '#.#...#.#',
  '#.#####.#',
  '#.....#E#',
  '#########',
];
const ROUTE: Pt[] = [[1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [4, 3], [5, 3], [5, 2], [5, 1], [6, 1], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]];

const PX = 40, PY = 170, PW = W - 80, PH = 520;    // painel da ilustração
const CS = 64;

export class TutorialScene extends Phaser.Scene {
  private page = 0;
  private root?: Root;
  private anim: { remove: () => void }[] = [];
  private dots!: Phaser.GameObjects.Graphics;
  private pager!: Phaser.GameObjects.Text;
  private prevBtn!: Phaser.GameObjects.Container;
  private nextBtn!: ReturnType<typeof button>;
  private busy = false;
  private pages: Page[] = [];

  constructor() { super('Tutorial'); }

  create() {
    this.page = 0; this.root = undefined; this.anim = []; this.busy = false;
    this.cameras.main.fadeIn(260, 5, 6, 11);
    bgGradient(this, 0x1a1c22, 0x0b0c10);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x373a43, 0.35);
    for (let x = 0; x <= W; x += 60) { grid.beginPath(); grid.moveTo(x, 0); grid.lineTo(x, H); grid.strokePath(); }
    for (let y = 0; y <= H; y += 60) { grid.beginPath(); grid.moveTo(0, y); grid.lineTo(W, y); grid.strokePath(); }

    // cabeçalho
    this.add.text(W / 2, 52, 'COMO SE JOGA', { fontFamily: FONT_HEAD, fontSize: '46px', color: '#f4f7ff', fontStyle: 'bold' }).setOrigin(0.5).setStyle({ letterSpacing: 8 } as any);
    this.pager = this.add.text(W / 2, 100, '', { fontFamily: FONT, fontSize: '20px', color: UI.textDim as string }).setOrigin(0.5);
    signatureLine(this, 134);
    button(this, W - 80, 66, 120, 70, '✕', () => this.leave(), 'ghost', 30).setDepth(5);

    // painel da ilustração
    const panel = this.add.graphics();
    panel.fillStyle(0x0d0e12, 0.92); panel.fillRoundedRect(PX, PY, PW, PH, 30);
    panel.lineStyle(3, UI.line, 1); panel.strokeRoundedRect(PX, PY, PW, PH, 30);
    panel.lineStyle(2, UI.blue, 0.35); panel.strokeRoundedRect(PX + 8, PY + 8, PW - 16, PH - 16, 24);

    this.pages = this.buildPages();
    this.dots = this.add.graphics();

    this.prevBtn = button(this, 190, 1196, 280, 92, 'Anterior', () => this.go(-1), 'ghost', 28);
    this.nextBtn = button(this, 530, 1196, 360, 92, 'Seguinte', () => this.go(1), 'primary', 32);

    this.show(0, 0);
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const dx = p.x - p.downX, dy = p.y - p.downY;
      if (Math.abs(dx) > 90 && Math.abs(dy) < 140) this.go(dx < 0 ? 1 : -1);
    });
    this.events.once('shutdown', () => this.clearAnim());
  }

  private leave() {
    if (this.busy) return;
    this.busy = true;
    this.cameras.main.fadeOut(200, 5, 6, 11);
    this.time.delayedCall(210, () => this.scene.start('Title'));
  }

  private clearAnim() { this.anim.forEach((a) => { try { a.remove(); } catch { /* já removido */ } }); this.anim = []; }

  private go(d: number) {
    if (this.busy) return;
    const n = this.page + d;
    if (n < 0) return;
    if (n >= this.pages.length) { this.leave(); return; }
    this.show(n, d);
  }

  private show(n: number, dir: number) {
    this.page = n;
    this.clearAnim();
    const old = this.root;
    if (old) {
      this.busy = true;
      this.tweens.add({ targets: old, x: -dir * 120, alpha: 0, duration: 200, ease: 'Sine.In', onComplete: () => old.destroy() });
    }
    const root = this.add.container(0, 0);
    this.root = root;
    const pg = this.pages[n];
    pg.draw(root);
    root.add(gradText(this, W / 2, 748, pg.title, 54));
    root.add(this.add.text(W / 2, 800, pg.body, { fontFamily: FONT, fontSize: '29px', color: '#eceef3', align: 'center', wordWrap: { width: 620 }, lineSpacing: 9 }).setOrigin(0.5, 0));
    if (old) {
      root.setAlpha(0); root.x = dir * 120;
      this.tweens.add({ targets: root, x: 0, alpha: 1, duration: 260, delay: 120, ease: 'Sine.Out', onComplete: () => { this.busy = false; } });
    }
    this.pager.setText(`${n + 1} / ${this.pages.length}`);
    this.prevBtn.setAlpha(n === 0 ? 0.3 : 1);
    this.nextBtn.txt.setText(n === this.pages.length - 1 ? 'Percebi!' : 'Seguinte');
    const g = this.dots; g.clear();
    const N = this.pages.length, gap = 34, x0 = W / 2 - ((N - 1) * gap) / 2;
    for (let i = 0; i < N; i++) {
      if (i === n) { g.fillStyle(brandAt(i / (N - 1)), 1); g.fillCircle(x0 + i * gap, 1108, 9); } else { g.fillStyle(0x4a4f5e, 1); g.fillCircle(x0 + i * gap, 1108, 5); }
    }
  }

  // ───────────────────────── Peças de desenho ─────────────────────────
  private map(root: Root, ox: number, oy: number, cs: number, rows: string[], skip?: Set<string>): MapPos {
    const g = this.add.graphics(); root.add(g);
    rows.forEach((r, y) => [...r].forEach((c, x) => {
      const wall = c === '#' && !skip?.has(x + ',' + y);
      const px = ox + x * cs, py = oy + y * cs;
      if (wall) {
        g.fillStyle(0x2b3f77, 1); g.fillRoundedRect(px + 2, py + 2, cs - 4, cs - 4, 8);
        g.fillStyle(0x4a6fcf, 1); g.fillRoundedRect(px + 2, py + 2, cs - 4, 9, { tl: 8, tr: 8, bl: 0, br: 0 });
      } else {
        g.fillStyle(0x1b1e26, 1); g.fillRoundedRect(px + 3, py + 3, cs - 6, cs - 6, 6);
      }
    }));
    return { cx: (x) => ox + x * cs + cs / 2, cy: (y) => oy + y * cs + cs / 2, cs, rows };
  }

  /** O Uli nas ilustrações: uma chama que anda, com o aro azul do jogador. */
  private token(root: Root, x: number, y: number, cs: number) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const prof: Pt[] = [[0, 0], [0.12, 0.02], [0.2, 0.12], [0.19, 0.24], [0.12, 0.37], [0.05, 0.47], [0, 0.55]];
    const poly = (k: number, dy: number) => [...prof.map(([r, h]) => new Phaser.Math.Vector2(r * k, dy - h * k)), ...prof.slice(0, -1).reverse().map(([r, h]) => new Phaser.Math.Vector2(-r * k, dy - h * k))];
    g.lineStyle(4, UI.blue, 0.95); g.strokeEllipse(0, cs * 0.3, cs * 0.76, cs * 0.34);
    g.fillStyle(0xe0400a, 1); g.fillPoints(poly(cs * 1.45, cs * 0.34), true);
    g.fillStyle(0xff9a24, 1); g.fillPoints(poly(cs * 1.1, cs * 0.3), true);
    g.fillStyle(0xfff1c4, 1); g.fillPoints(poly(cs * 0.74, cs * 0.24), true);
    g.fillStyle(0x1a0c05, 1); g.fillEllipse(-cs * 0.065, cs * 0.04, cs * 0.065, cs * 0.12); g.fillEllipse(cs * 0.065, cs * 0.04, cs * 0.065, cs * 0.12);
    c.add(g); root.add(c);
    return c;
  }

  private portal(root: Root, x: number, y: number, cs: number) {
    const g = this.add.graphics({ x, y });
    g.fillStyle(UI.fuchsia, 0.35); g.fillCircle(0, 0, cs * 0.42);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(0, 0, cs * 0.1);
    for (let r = 0; r < 2; r++) {
      g.lineStyle(4, r ? UI.blue : UI.fuchsia, 0.95);
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, 0, cs * (0.26 + r * 0.12), k * 2.09, k * 2.09 + 1.3); g.strokePath(); }
    }
    root.add(g);
    this.anim.push(this.tweens.add({ targets: g, rotation: Math.PI * 2, duration: 4200, repeat: -1 }));
    return g;
  }

  /** Chama de vela (o coletável): gota laranja com núcleo creme, a tremeluzir. */
  private rose(root: Root, x: number, y: number, cs: number) {
    const c = this.add.container(x, y + cs * 0.3);
    const prof: Pt[] = [[0, 0], [0.06, 0.01], [0.105, 0.07], [0.1, 0.14], [0.065, 0.24], [0.03, 0.33], [0, 0.43]];
    const poly = (k: number) => [...prof.map(([r, h]) => new Phaser.Math.Vector2(r * k, -h * k)), ...prof.slice(0, -1).reverse().map(([r, h]) => new Phaser.Math.Vector2(-r * k, -h * k))];
    const g = this.add.graphics();
    g.fillStyle(0xff8a2a, 0.22); g.fillCircle(0, -cs * 0.55, cs * 0.62);
    g.fillStyle(0xff7a1a, 1); g.fillPoints(poly(cs * 2.1), true);
    g.fillStyle(0xffc457, 1); g.fillPoints(poly(cs * 1.6), true);
    g.fillStyle(0xfff1c4, 1); g.fillPoints(poly(cs * 1.2), true);
    g.fillStyle(0x1a0c05, 1); g.fillEllipse(-cs * 0.09, -cs * 0.24, cs * 0.09, cs * 0.15); g.fillEllipse(cs * 0.09, -cs * 0.24, cs * 0.09, cs * 0.15);
    g.fillStyle(0xffffff, 1); g.fillCircle(-cs * 0.075, -cs * 0.27, cs * 0.022); g.fillCircle(cs * 0.105, -cs * 0.27, cs * 0.022);
    c.add(g); root.add(c);
    this.anim.push(this.tweens.add({ targets: c, scaleY: 1.14, scaleX: 0.94, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
    return c;
  }

  private guard(root: Root, x: number, y: number, cs: number) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xff2030, 0.22); g.fillCircle(0, 0, cs * 0.5);
    g.fillStyle(0x8a1020, 1); g.fillTriangle(0, -cs * 0.34, -cs * 0.34, cs * 0.34, cs * 0.34, cs * 0.34);
    g.fillStyle(0x2a0a10, 1); g.fillCircle(0, -cs * 0.12, cs * 0.2);
    g.fillStyle(0xffe9a0, 1); g.fillCircle(-cs * 0.075, -cs * 0.13, cs * 0.045); g.fillCircle(cs * 0.075, -cs * 0.13, cs * 0.045);
    c.add(g); root.add(c);
    return c;
  }

  private bfs(rows: string[], sx: number, sy: number, max: number): Map<string, number> {
    const d = new Map<string, number>([[sx + ',' + sy, 0]]);
    const q: Pt[] = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift()!;
      const k = d.get(x + ',' + y)!;
      if (k >= max) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (rows[ny]?.[nx] === undefined || rows[ny][nx] === '#' || d.has(nx + ',' + ny)) continue;
        d.set(nx + ',' + ny, k + 1); q.push([nx, ny]);
      }
    }
    return d;
  }

  private tint(root: Root, mp: MapPos, cells: Map<string, number>, color: number, alpha: number) {
    const g = this.add.graphics(); root.add(g);
    g.fillStyle(color, alpha);
    cells.forEach((_, k) => { const [x, y] = k.split(',').map(Number); g.fillRoundedRect(mp.cx(x) - mp.cs / 2 + 3, mp.cy(y) - mp.cs / 2 + 3, mp.cs - 6, mp.cs - 6, 6); });
    return g;
  }

  /** Uma personagem a percorrer um caminho em ciclo, a desenhar o trilho pelo caminho. */
  private walk(root: Root, mp: MapPos, path: Pt[], dur: number, trail: boolean, extra?: (t: number) => void) {
    const tg = trail ? this.add.graphics() : null;
    if (tg) root.add(tg);
    const tok = this.token(root, mp.cx(path[0][0]), mp.cy(path[0][1]), mp.cs);
    const n = path.length - 1, o = { t: 0 };
    this.anim.push(this.tweens.add({
      targets: o, t: n, duration: dur, repeat: -1, repeatDelay: 900, ease: 'Linear',
      onUpdate: () => {
        const i = Math.min(n - 1, Math.floor(o.t)), f = o.t - i, a = path[i], b = path[i + 1];
        tok.setPosition(mp.cx(a[0] + (b[0] - a[0]) * f), mp.cy(a[1] + (b[1] - a[1]) * f));
        if (tg) {
          tg.clear();
          for (let k = 0; k <= i; k++) {
            const p = path[k], q = k === i ? [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] : path[k + 1];
            tg.lineStyle(9, brandAt(k / n), 0.9);
            tg.beginPath(); tg.moveTo(mp.cx(p[0]), mp.cy(p[1])); tg.lineTo(mp.cx(q[0]), mp.cy(q[1])); tg.strokePath();
          }
        }
        extra?.(o.t);
      },
    }));
    return tok;
  }

  private finger(root: Root, x: number, y: number) {
    const g = this.add.graphics({ x, y });
    g.fillStyle(0xffffff, 0.22); g.fillCircle(0, 0, 44);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(0, 0, 26);
    g.lineStyle(3, 0xffffff, 0.9); g.strokeCircle(0, 0, 26);
    root.add(g);
    return g;
  }

  // ───────────────────────── Páginas ─────────────────────────
  private buildPages(): Page[] {
    const ox = W / 2 - (9 * CS) / 2, oy = PY + (PH - 7 * CS) / 2;
    return [
      {
        title: 'O objetivo',
        body: 'Chega ao portal de saída do labirinto. Cada nível é um labirinto novo, visto de cima e em 3D.\nPensa antes de correr: há becos sem saída por todo o lado.',
        draw: (root) => {
          const mp = this.map(root, ox, oy, CS, MAP_A);
          this.portal(root, mp.cx(7), mp.cy(5), CS);
          this.walk(root, mp, ROUTE, 5200, true);
          const t = this.add.text(mp.cx(7) - 50, mp.cy(5) + 6, 'SAÍDA', { fontFamily: FONT_HEAD, fontSize: '26px', color: '#ff86e8', stroke: '#05060b', strokeThickness: 5 }).setOrigin(1, 0.5);
          root.add(t);
        },
      },
      {
        title: 'Como mexer',
        body: 'Arrasta o joystick de vidro para um lado e a personagem anda nessa direção.\nSe o seguras, ela avança sozinha pelo corredor e dobra nas esquinas. Para na parede.',
        draw: (root) => {
          const cx = W / 2, cy = PY + PH / 2, r = 150;
          const base = this.add.graphics(); root.add(base);
          base.fillStyle(0x0a0b10, 0.6); base.fillCircle(cx, cy, r);
          for (let i = 0; i < 40; i++) {
            const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1.15) / 40) * Math.PI * 2;
            base.lineStyle(6, brandAt(0.5 - 0.5 * Math.cos(a0)), 0.8); base.beginPath(); base.arc(cx, cy, r, a0, a1); base.strokePath();
          }
          base.lineStyle(2, 0xffffff, 0.15); base.strokeCircle(cx, cy, r - 12);
          const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
          const arrows = DIRS.map(([ux, uy], d) => {
            const g = this.add.graphics(); root.add(g);
            const px = -uy, py = ux, mx = cx + ux * 98, my = cy + uy * 98, c = brandAt([0.1, 0.45, 0.9, 0.7][d]);
            g.fillStyle(c, 1); g.fillTriangle(mx + ux * 34, my + uy * 34, mx - ux * 18 + px * 40, my - uy * 18 + py * 40, mx - ux * 18 - px * 40, my - uy * 18 - py * 40);
            g.lineStyle(3, 0xffffff, 0.9); g.strokeTriangle(mx + ux * 34, my + uy * 34, mx - ux * 18 + px * 40, my - uy * 18 + py * 40, mx - ux * 18 - px * 40, my - uy * 18 - py * 40);
            return g;
          });
          const knob = this.add.graphics(); root.add(knob);
          knob.fillStyle(UI.g2, 0.3); knob.fillCircle(0, 0, 54); knob.fillStyle(UI.g2, 0.8); knob.fillCircle(0, 0, 36);
          knob.lineStyle(3, 0xffffff, 0.8); knob.strokeCircle(0, 0, 36); knob.fillStyle(0xffffff, 0.8); knob.fillCircle(-9, -10, 9);
          knob.setPosition(cx, cy);
          const fg = this.finger(root, cx + 4, cy + 8);
          const o = { t: 0 };
          this.anim.push(this.tweens.add({
            targets: o, t: 4, duration: 7200, repeat: -1, ease: 'Linear',
            onUpdate: () => {
              const k = Math.floor(o.t) % 4, m = Math.sin((o.t % 1) * Math.PI);
              knob.setPosition(cx + DIRS[k][0] * 70 * m, cy + DIRS[k][1] * 70 * m);
              fg.setPosition(knob.x + 4, knob.y + 8);
              arrows.forEach((a, i) => a.setAlpha(i === k ? 0.3 + 0.7 * m : 0.3));
            },
          }));
        },
      },
      {
        title: 'Chamas',
        body: 'As chamas 🔥 estão escondidas pelo labirinto. Ao apanhares uma, a personagem pára um instante, e ela conta para as tuas estrelas.\nO contador 🔥 no topo diz quantas já tens.',
        draw: (root) => {
          const mp = this.map(root, ox, oy, CS, MAP_A);
          this.portal(root, mp.cx(7), mp.cy(5), CS);
          const spots: { i: number; p: Pt }[] = [{ i: 4, p: [3, 3] }, { i: 8, p: [5, 1] }, { i: 12, p: [7, 3] }];
          const roses = spots.map((s) => this.rose(root, mp.cx(s.p[0]), mp.cy(s.p[1]), CS));
          const plus = this.add.text(0, 0, '+1 🔥', { fontFamily: FONT_HEAD, fontSize: '34px', color: '#ffb0e0', stroke: '#05060b', strokeThickness: 6 }).setOrigin(0.5).setAlpha(0);
          const hud = this.add.text(PX + 34, PY + 30, '', { fontFamily: FONT, fontSize: '30px', color: '#ff9ecb', fontStyle: 'bold' });
          root.add([plus, hud]);
          let last = -1;
          this.walk(root, mp, ROUTE, 6400, false, (t) => {
            let got = 0;
            spots.forEach((s, k) => { const on = t < s.i; roses[k].setVisible(on); if (!on) got++; });
            hud.setText(`🔥 ${got}/3`);
            if (got !== last && got > 0) {
              const s = spots[got - 1]; plus.setPosition(mp.cx(s.p[0]), mp.cy(s.p[1]) - 30).setAlpha(1);
              this.tweens.add({ targets: plus, y: plus.y - 40, alpha: 0, duration: 800 });
            }
            last = got;
          });
        },
      },
      {
        title: 'As estrelas',
        body: 'Cada nível dá até 3 estrelas. O «par» aparece no topo, ao lado dos teus passos.\nÉ sempre possível fazer as 3 estrelas: o par já conta com as chamas.',
        draw: (root) => {
          const rows: [number, string][] = [[1, 'Chegar à saída'], [2, 'Apanhar todas as chamas 🔥'], [3, 'Chegar dentro do par']];
          rows.forEach(([n, label], r) => {
            const y = PY + 90 + r * 135;
            for (let i = 0; i < 3; i++) {
              const s = this.add.text(PX + 78 + i * 74, y, '★', { fontFamily: FONT, fontSize: '72px', color: i < n ? '#ffd45a' : '#3b3e48', stroke: '#05060b', strokeThickness: 6 }).setOrigin(0.5).setScale(0);
              root.add(s);
              this.anim.push(this.tweens.add({ targets: s, scale: 1, duration: 360, delay: 200 + r * 450 + i * 120, ease: 'Back.Out' }));
            }
            const t = this.add.text(PX + 310, y, label, { fontFamily: FONT, fontSize: '28px', color: '#eceef3', fontStyle: 'bold', wordWrap: { width: 300 } }).setOrigin(0, 0.5).setAlpha(0);
            root.add(t);
            this.anim.push(this.tweens.add({ targets: t, alpha: 1, duration: 300, delay: 300 + r * 450 }));
          });
          const hud = this.add.graphics(); root.add(hud);
          hud.fillStyle(0x1e2025, 1); hud.fillRoundedRect(W / 2 - 250, PY + PH - 78, 500, 54, 16);
          hud.lineStyle(2, UI.blue, 0.6); hud.strokeRoundedRect(W / 2 - 250, PY + PH - 78, 500, 54, 16);
          root.add(this.add.text(W / 2 - 220, PY + PH - 51, '🔥 3/3', { fontFamily: FONT, fontSize: '26px', color: '#ff9ecb', fontStyle: 'bold' }).setOrigin(0, 0.5));
          root.add(this.add.text(W / 2 + 220, PY + PH - 51, 'Passos 14  (par 16)', { fontFamily: FONT, fontSize: '26px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0.5));
        },
      },
      {
        title: 'Os guardas',
        body: 'Alguns níveis têm guardas ☠. Movem-se de 3 em 3 dos teus passos e farejam-te a 4 casas (a zona vermelha): aí perseguem-te.\nSe te apanharem, o nível recomeça. Aprende o ritmo deles.',
        draw: (root) => {
          const mp = this.map(root, ox, oy, CS, MAP_A);
          const sx = 5, sy = 3;
          const zone = this.bfs(MAP_A, sx, sy, 4);
          const zg = this.tint(root, mp, zone, 0xff2030, 0.2);
          this.anim.push(this.tweens.add({ targets: zg, alpha: 0.45, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
          this.token(root, mp.cx(sx), mp.cy(sy), CS);
          const gpath: Pt[] = [[7, 5], [7, 4], [7, 3], [7, 2], [7, 1], [6, 1], [5, 1], [5, 2]];
          const gd = this.guard(root, mp.cx(7), mp.cy(5), CS);
          const bang = this.add.text(0, 0, '!', { fontFamily: FONT_HEAD, fontSize: '54px', color: '#ff3040', stroke: '#ffffff', strokeThickness: 5 }).setOrigin(0.5).setAlpha(0);
          root.add(bang);
          const n = gpath.length - 1, o = { t: 0 };
          this.anim.push(this.tweens.add({
            targets: o, t: n, duration: 5600, repeat: -1, repeatDelay: 1000, ease: 'Linear',
            onUpdate: () => {
              const i = Math.min(n - 1, Math.floor(o.t)), f = o.t - i, a = gpath[i], b = gpath[i + 1];
              gd.setPosition(mp.cx(a[0] + (b[0] - a[0]) * f), mp.cy(a[1] + (b[1] - a[1]) * f));
              const inZone = zone.has(Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f));
              bang.setPosition(gd.x, gd.y - 52).setAlpha(inZone ? 1 : 0);
            },
          }));
        },
      },
      {
        title: 'Vagalume ✦',
        body: 'Tens 3 vagalumes por nível. Cada um mostra o caminho até à saída e ofusca os guardas a até 6 casas durante 8 passos: ficam parados e podes passar por eles.',
        draw: (root) => {
          const mp = this.map(root, ox, oy, CS, MAP_A);
          this.portal(root, mp.cx(7), mp.cy(5), CS);
          const sx = 3, sy = 3;
          const glow = this.tint(root, mp, this.bfs(MAP_A, sx, sy, 6), 0xffd45a, 0.13);
          this.anim.push(this.tweens.add({ targets: glow, alpha: 0.5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
          const path: Pt[] = [[3, 3], [4, 3], [5, 3], [5, 2], [5, 1], [6, 1], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]];
          const dots = path.slice(1, 10).map((p) => {
            const c = this.add.circle(mp.cx(p[0]), mp.cy(p[1]), 9, 0xffd45a, 0.95); root.add(c); return c;
          });
          const o = { t: 0 };
          this.anim.push(this.tweens.add({
            targets: o, t: dots.length + 3, duration: 2600, repeat: -1, ease: 'Linear',
            onUpdate: () => dots.forEach((c, i) => { c.setScale(0.55 + 0.9 * Math.max(0, 1 - Math.abs(o.t - i) / 2.2)); }),
          }));
          this.token(root, mp.cx(sx), mp.cy(sy), CS);
          const gd = this.guard(root, mp.cx(5), mp.cy(2), CS);
          gd.setAlpha(0.55);
          const z = this.add.text(mp.cx(5) + 24, mp.cy(2) - 36, 'z z z', { fontFamily: FONT_HEAD, fontSize: '28px', color: '#ffe9a0', stroke: '#05060b', strokeThickness: 5 }).setOrigin(0.5);
          root.add(z);
          this.anim.push(this.tweens.add({ targets: z, y: z.y - 12, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 }));
        },
      },
      {
        title: 'Sebes que mudam',
        body: 'Em alguns mundos há paredes vivas (as cor-de-rosa) que mudam de sítio a cada poucos passos. As bolinhas no topo contam quantos faltam.\nQuando mudam, a personagem pára: planeia a rota.',
        draw: (root) => {
          const dyn: Pt[] = [[4, 1], [6, 3]];
          const skip = new Set(dyn.map((p) => p[0] + ',' + p[1]));
          const mp = this.map(root, ox, oy, CS, MAP_A, skip);
          this.portal(root, mp.cx(7), mp.cy(5), CS);
          const wall = this.add.graphics(); root.add(wall);
          const pips = this.add.graphics(); root.add(pips);
          const draw = (closed: boolean) => {
            wall.clear();
            dyn.forEach((p) => {
              const x = mp.cx(p[0]) - CS / 2, y = mp.cy(p[1]) - CS / 2;
              if (closed) { wall.fillStyle(0x9a2a8a, 1); wall.fillRoundedRect(x + 2, y + 2, CS - 4, CS - 4, 8); wall.fillStyle(UI.fuchsia, 1); wall.fillRoundedRect(x + 2, y + 2, CS - 4, 9, { tl: 8, tr: 8, bl: 0, br: 0 }); }
              else { wall.lineStyle(3, UI.fuchsia, 0.8); wall.strokeRoundedRect(x + 6, y + 6, CS - 12, CS - 12, 8); }
            });
          };
          const o = { t: 0 };
          let lastP = -1;
          this.anim.push(this.tweens.add({
            targets: o, t: 6, duration: 7200, repeat: -1, ease: 'Linear',
            onUpdate: () => {
              const step = Math.floor(o.t), closed = step % 6 < 3;
              if (step !== lastP) {
                lastP = step; draw(closed);
                pips.clear();
                for (let i = 0; i < 3; i++) { pips.fillStyle(i < step % 3 + 1 ? UI.fuchsia : 0x4a4f5e, 1); pips.fillCircle(W / 2 - 22 + i * 22, PY + 34, 7); }
              }
            },
          }));
        },
      },
      {
        title: 'Gelo',
        body: 'No Glaciar não se anda: desliza-se até à parede ou à neve (também as chamas se apanham pelo caminho).\nA Brasa, com 3 cargas, faz o próximo passo ter só uma casa e deixa uma poça onde travas.',
        draw: (root) => {
          const rows = ['#########', '#P.....S#', '#.#.###.#', '#.#.#...#', '#.#.#.#.#', '#...S.#E#', '#########'];
          const mp = this.map(root, ox, oy, CS, rows);
          const g = this.add.graphics(); root.add(g);
          rows.forEach((r, y) => [...r].forEach((c, x) => {
            if (c === '#') return;
            const px = mp.cx(x), py = mp.cy(y);
            if (c === 'S') { g.fillStyle(0xf4f8ff, 1); g.fillEllipse(px, py + 4, CS * 0.82, CS * 0.62); g.fillStyle(0x4a5868, 1); g.fillCircle(px - 12, py + 6, 4); g.fillCircle(px + 10, py - 2, 3); }
            else { g.fillStyle(0x2f8fd0, 0.45); g.fillRoundedRect(px - CS / 2 + 3, py - CS / 2 + 3, CS - 6, CS - 6, 6); g.lineStyle(3, 0xcff0ff, 0.55); g.beginPath(); g.moveTo(px - 18, py + 12); g.lineTo(px + 4, py - 14); g.strokePath(); }
          }));
          this.portal(root, mp.cx(7), mp.cy(5), CS);
          const tok = this.token(root, mp.cx(1), mp.cy(1), CS);
          const o = { t: 0 };
          this.anim.push(this.tweens.add({
            targets: o, t: 5, duration: 5200, repeat: -1, ease: 'Linear',
            onUpdate: () => {
              const e = (a: number, b: number) => Phaser.Math.Easing.Sine.Out(Phaser.Math.Clamp((o.t - a) / (b - a), 0, 1));
              const first = e(0.6, 2), second = e(2.8, 4.2);
              tok.setPosition(mp.cx(1 + 6 * first), mp.cy(1 + 4 * second));
            },
          }));
        },
      },
      {
        title: 'Lava',
        body: 'No Abismo a lava nasce onde começaste e avança sempre, ao ritmo dos teus passos.\nO chão racha antes de arder. Os becos junto ao início são os primeiros a desaparecer: escolhe bem a ordem das chamas.',
        draw: (root) => {
          const mp = this.map(root, ox, oy, CS, MAP_A);
          this.portal(root, mp.cx(7), mp.cy(5), CS);
          const dist = this.bfs(MAP_A, 1, 1, 99);
          const g = this.add.graphics(); root.add(g);
          const tok = this.token(root, mp.cx(1), mp.cy(1), CS);
          const o = { t: 0 };
          this.anim.push(this.tweens.add({
            targets: o, t: 14, duration: 6800, repeat: -1, repeatDelay: 800, ease: 'Linear',
            onUpdate: () => {
              const lava = o.t - 3;
              g.clear();
              dist.forEach((d, k) => {
                const [x, y] = k.split(',').map(Number), px = mp.cx(x) - CS / 2, py = mp.cy(y) - CS / 2;
                if (d <= lava) {
                  const f = 0.5 + 0.5 * Math.sin(this.time.now / 180 + d);
                  g.fillStyle(0xd83a08, 1); g.fillRoundedRect(px + 2, py + 2, CS - 4, CS - 4, 8);
                  g.fillStyle(0xffb030, 0.35 + 0.55 * f); g.fillCircle(mp.cx(x) - 8 + 12 * f, mp.cy(y) + 6 - 10 * f, 13);
                } else if (d <= lava + 2) { g.lineStyle(4, 0xff6a20, 0.5 + 0.5 * Math.sin(this.time.now / 100)); g.strokeRoundedRect(px + 7, py + 7, CS - 14, CS - 14, 6); }
              });
              const t = Math.min(ROUTE.length - 1, o.t * 1.15), i = Math.min(ROUTE.length - 2, Math.floor(t)), f = t - i, a = ROUTE[i], b = ROUTE[i + 1];
              tok.setPosition(mp.cx(a[0] + (b[0] - a[0]) * f), mp.cy(a[1] + (b[1] - a[1]) * f));
            },
          }));
        },
      },
      {
        title: 'Anéis',
        body: 'A Mandala é feita de anéis. O botão Rodar gira o anel assinalado um quarto de volta (leva-te, se estiveres em cima dele) e conta como um passo.\nAlinha as portas e chega ao centro.',
        draw: (root) => {
          const cx = W / 2, cy = PY + PH / 2;
          /** moldura quadrada de lado 2r com uma porta em cima */
          const ringShape = (g: Phaser.GameObjects.Graphics, r: number, color: number) => {
            g.lineStyle(22, color, 1);
            const door = 34;
            const seg = (x1: number, y1: number, x2: number, y2: number) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath(); };
            seg(-r, -r, -door, -r); seg(door, -r, r, -r); seg(r, -r - 11, r, r + 11); seg(r, r, -r, r); seg(-r, r + 11, -r, -r - 11);
          };
          const outer = this.add.graphics({ x: cx, y: cy }); ringShape(outer, 200, 0x34508f); root.add(outer);
          const inner = this.add.graphics({ x: cx, y: cy }); ringShape(inner, 110, 0xd9a22b);
          inner.fillStyle(0xffd24a, 0.12); inner.fillRect(-99, -99, 198, 198); root.add(inner);
          this.portal(root, cx, cy, CS);
          const path = this.add.graphics(); root.add(path);
          const tok = this.token(root, cx, cy - 230, CS * 0.8);
          const btn = this.add.container(cx + 262, cy + 180);
          const bg = this.add.graphics(); bg.fillStyle(0x0a0b10, 0.8); bg.fillCircle(0, 0, 44); bg.lineStyle(4, UI.fuchsia, 0.9); bg.strokeCircle(0, 0, 44);
          btn.add([bg, this.add.text(0, -2, '⟳', { fontFamily: FONT, fontSize: '50px', color: '#ffffff' }).setOrigin(0.5)]); root.add(btn);
          const o = { t: 0 };
          this.anim.push(this.tweens.add({
            targets: o, t: 6, duration: 6600, repeat: -1, ease: 'Linear',
            onUpdate: () => {
              // começa desalinhado (porta à esquerda); três toques no botão trazem-na para cima
              const k = Math.min(3, Math.floor(Math.max(0, o.t - 0.4))), f = k >= 3 ? 0 : Phaser.Math.Easing.Cubic.InOut(Phaser.Math.Clamp((o.t - 0.4 - k) * 1.6, 0, 1));
              inner.rotation = (1 + k + f) * (Math.PI / 2);
              btn.setScale(k < 3 && f > 0 && f < 0.5 ? 1.2 : 1);
              const go = Phaser.Math.Clamp((o.t - 3.8) / 1.5, 0, 1);
              tok.setPosition(cx, cy - 230 + 230 * go);
              path.clear();
              if (k >= 3) { path.lineStyle(8, brandAt(0.7), 0.8); path.beginPath(); path.moveTo(cx, cy - 230); path.lineTo(cx, cy - 230 + 230 * go); path.strokePath(); }
            },
          }));
        },
      },
      {
        title: 'Cada mundo, uma regra',
        body: 'Na primeira vez em cada mundo aparece um cartão com a regra.\nO botão redondo, à direita do joystick, é a ação do mundo (Rodar, Virar, Esperar ou Brasa). O Vagalume também te diz quando a usar.',
        draw: (root) => {
          const list: [string, string, number][] = [['◠', 'B-612: o planeta dá a volta', 0x2fe6d0], ['◎', 'Intergaláctico: buracos de verme', 0x9a6bff], ['≈', 'Viking: a maré enche', 0x3ac8ff], ['♫', 'Rockstar: rebenta ao ritmo', 0xff4fd8], ['⇄', 'Biblioteca: vira a página', 0xffb860], ['☁', 'Angélico: nuvens que caem', 0xdfe8ff], ['❄', 'Glaciar: gelo que escorrega', 0x9bd8ff], ['▲', 'Abismo: lava que avança', 0xff6a20], ['⟳', 'Mandala: anéis que rodam', 0xffd24a]];
          list.forEach(([icon, text, color], i) => {
            const y = PY + 42 + i * 55;
            const g = this.add.graphics(); root.add(g);
            g.fillStyle(0x1e2025, 1); g.fillRoundedRect(PX + 26, y - 23, PW - 52, 46, 14);
            g.fillStyle(color, 0.9); g.fillCircle(PX + 56, y, 17);
            const a = this.add.text(PX + 56, y - 1, icon, { fontFamily: FONT, fontSize: '22px', color: '#0a0b10', fontStyle: 'bold' }).setOrigin(0.5);
            const b = this.add.text(PX + 90, y, text, { fontFamily: FONT, fontSize: '26px', color: '#eceef3', fontStyle: 'bold' }).setOrigin(0, 0.5);
            root.add([a, b]);
            for (const o of [g, a, b]) { o.setAlpha(0); this.anim.push(this.tweens.add({ targets: o, alpha: 1, duration: 260, delay: 120 + i * 90 })); }
          });
        },
      },
      {
        title: 'A câmara',
        body: '1 dedo no mapa: roda e inclina o labirinto.\n2 dedos: arrasta e faz zoom.\nToca no centro do joystick (ou na bússola) para voltar à personagem. O botão ◎ mostra o labirinto todo.',
        draw: (root) => {
          const c = this.add.container(W / 2, PY + PH / 2 - 10);
          root.add(c);
          const mp = this.map(c, -(9 * CS) / 2, -(7 * CS) / 2, CS, MAP_A);
          this.portal(c, mp.cx(7), mp.cy(5), CS);
          this.token(c, mp.cx(1), mp.cy(1), CS);
          c.setScale(0.7);
          const fg = this.finger(root, W / 2, PY + PH - 60);
          const o = { t: 0 };
          this.anim.push(this.tweens.add({
            targets: o, t: Math.PI * 2, duration: 6400, repeat: -1, ease: 'Linear',
            onUpdate: () => {
              c.setRotation(Math.sin(o.t) * 0.5);
              c.setScale(0.7, 0.7 * (0.8 + 0.2 * Math.cos(o.t * 2)));
              fg.setPosition(W / 2 + Math.sin(o.t) * 190, PY + PH - 60 - Math.cos(o.t * 2) * 14);
            },
          }));
        },
      },
      {
        title: 'Mundos e Galeria',
        body: 'Cada mundo tem 7 níveis e um bónus, que só abre com 3 estrelas nos 7. Cada um traz personagens, guardas e regras próprias.\nO teu trilho pinta uma obra: vê-as na Galeria.',
        draw: (root) => {
          const fx = W / 2, fy = PY + 240, fw = 440, fh = 320;
          const fr = this.add.graphics(); root.add(fr);
          fr.fillStyle(0x3a2d14, 1); fr.fillRoundedRect(fx - fw / 2 - 16, fy - fh / 2 - 16, fw + 32, fh + 32, 12);
          fr.lineStyle(4, 0xffd45a, 0.9); fr.strokeRoundedRect(fx - fw / 2 - 16, fy - fh / 2 - 16, fw + 32, fh + 32, 12);
          fr.fillStyle(0x0a0b10, 1); fr.fillRect(fx - fw / 2, fy - fh / 2, fw, fh);
          const pts: Pt[] = []; let px = 0, py = 0;
          const seq = [[1, 0], [0, 1], [1, 0], [0, -1], [1, 0], [0, 1], [0, 1], [1, 0], [0, -1], [0, -1], [1, 0], [0, 1], [0, 1]];
          pts.push([px, py]);
          seq.forEach(([dx, dy]) => { px += dx; py += dy; pts.push([px, py]); });
          const mx = Math.max(...pts.map((p) => p[0])), my = Math.max(...pts.map((p) => p[1]));
          const sc = Math.min((fw - 60) / mx, (fh - 60) / my);
          const tx = (p: Pt) => fx - (mx * sc) / 2 + p[0] * sc, ty = (p: Pt) => fy - (my * sc) / 2 + p[1] * sc;
          const tr = this.add.graphics(); root.add(tr);
          const o = { t: 0 };
          this.anim.push(this.tweens.add({
            targets: o, t: pts.length - 1, duration: 4200, repeat: -1, repeatDelay: 1200, ease: 'Linear',
            onUpdate: () => {
              tr.clear();
              const i = Math.min(pts.length - 2, Math.floor(o.t)), f = o.t - i;
              for (let k = 0; k <= i; k++) {
                const a = pts[k], b = pts[k + 1], e: Pt = k === i ? [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] : b;
                tr.lineStyle(14, brandAt(k / pts.length), 0.25); tr.beginPath(); tr.moveTo(tx(a), ty(a)); tr.lineTo(tx(e), ty(e)); tr.strokePath();
                tr.lineStyle(6, brandAt(k / pts.length), 1); tr.beginPath(); tr.moveTo(tx(a), ty(a)); tr.lineTo(tx(e), ty(e)); tr.strokePath();
              }
            },
          }));
          // 7 níveis + bónus
          for (let i = 0; i < 8; i++) {
            const x = W / 2 - 7 * 32 + i * 64 - 0, y = PY + PH - 58;
            const g = this.add.graphics(); root.add(g);
            if (i < 7) { g.fillStyle(brandAt(i / 7), 1); g.fillCircle(x, y, 20); g.lineStyle(2, 0xffffff, 0.5); g.strokeCircle(x, y, 20); root.add(this.add.text(x, y, String(i + 1), { fontFamily: FONT_HEAD, fontSize: '26px', color: '#ffffff' }).setOrigin(0.5)); }
            else { g.fillStyle(0x3b3e48, 1); g.fillCircle(x, y, 20); g.lineStyle(3, 0xffd45a, 1); g.strokeCircle(x, y, 20); root.add(this.add.text(x, y - 1, '★', { fontFamily: FONT, fontSize: '26px', color: '#ffd45a' }).setOrigin(0.5)); }
          }
        },
      },
      {
        title: 'Dicas',
        body: '• Usa ◎ para ver o mapa todo antes de arriscares.\n• Chamas primeiro, saída depois: o par já conta com elas.\n• Com guardas por perto, gasta um vagalume e passa.\n• Preso? «Reiniciar» não custa nada.',
        draw: (root) => {
          const cx = W / 2, cy = PY + PH / 2;
          const g = this.add.graphics({ x: cx, y: cy }); root.add(g);
          for (let i = 0; i < 40; i++) {
            const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1.15) / 40) * Math.PI * 2;
            g.lineStyle(10, brandAt(0.5 - 0.5 * Math.cos(a0)), 1); g.beginPath(); g.arc(0, 0, 150, a0, a1); g.strokePath();
          }
          g.fillStyle(UI.blue, 0.18); g.fillCircle(0, 0, 138);
          const i = this.add.text(cx, cy + 6, 'i', { fontFamily: "Georgia,'Times New Roman',serif", fontSize: '230px', color: '#ffffff', fontStyle: 'bold italic', stroke: '#05060b', strokeThickness: 8 }).setOrigin(0.5);
          root.add(i);
          try { (i as any).postFX?.addGlow(UI.fuchsia, 3, 0, false, 0.1, 10); } catch { /* sem FX */ }
          this.anim.push(this.tweens.add({ targets: g, scale: 1.05, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' }));
        },
      },
    ];
  }
}
