import Phaser from 'phaser';
import { FONT, UI, W, H, toHex } from './theme';
import { sfx } from './audio';

export interface Btn extends Phaser.GameObjects.Container { txt: Phaser.GameObjects.Text }

function pill(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath();
}

export type Variant = 'primary' | 'ghost';

export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string,
  cb: () => void, variant: Variant = 'primary', fontSize = 32): Btn {
  const key = `btn_${variant}_${w}_${h}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, w, h)!;
    const ctx = tex.getContext();
    if (variant === 'primary') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#3b74f2'); g.addColorStop(0.55, '#8a4bea'); g.addColorStop(1, '#e02bc0');
      ctx.fillStyle = g; pill(ctx, w, h, h / 2); ctx.fill();
      const hl = ctx.createLinearGradient(0, 0, 0, h);
      hl.addColorStop(0, 'rgba(255,255,255,.22)'); hl.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl; pill(ctx, w, h, h / 2); ctx.fill();
    } else {
      ctx.fillStyle = toHex(UI.surf); pill(ctx, w, h, h / 2); ctx.fill();
      ctx.strokeStyle = toHex(UI.line); ctx.lineWidth = 3;
      ctx.save(); ctx.translate(1.5, 1.5); pill(ctx, w - 3, h - 3, (h - 3) / 2); ctx.stroke(); ctx.restore();
    }
    tex.refresh();
  }
  const img = scene.add.image(0, 0, key);
  const txt = scene.add.text(0, -1, label, { fontFamily: FONT, fontSize: `${fontSize}px`, color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
  const c = scene.add.container(x, y, [img, txt]) as Btn;
  c.txt = txt;
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (p.getDistance() > 16) return;
    sfx.unlock(); sfx.ui();
    scene.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true });
    cb();
  });
  return c;
}

/** Botão redondo de vidro (semitransparente), com legenda pequena opcional. */
export function roundBtn(scene: Phaser.Scene, x: number, y: number, r: number, label: string, sub: string, cb: () => void, size = 40): Btn {
  const g = scene.add.graphics();
  g.fillStyle(0x0a0b10, 0.42); g.fillCircle(0, 0, r);
  g.lineStyle(3, UI.blue, 0.55); g.strokeCircle(0, 0, r);
  g.lineStyle(2, UI.fuchsia, 0.35); g.strokeCircle(0, 0, r - 7);
  const txt = scene.add.text(0, sub ? -8 : 0, label, { fontFamily: FONT, fontSize: `${size}px`, color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
  const items: Phaser.GameObjects.GameObject[] = [g, txt];
  if (sub) items.push(scene.add.text(0, r * 0.52, sub, { fontFamily: FONT, fontSize: '17px', color: UI.textDim as string }).setOrigin(0.5));
  const c = scene.add.container(x, y, items) as Btn;
  c.txt = txt;
  c.setSize(r * 2, r * 2).setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
  c.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (p.getDistance() > 16) return;
    sfx.unlock(); sfx.ui();
    scene.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true });
    cb();
  });
  return c;
}

/** Texto com o gradiente de assinatura. */
export function gradText(scene: Phaser.Scene, x: number, y: number, s: string, size: number): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
  const g = t.context.createLinearGradient(0, 0, t.width, t.height);
  g.addColorStop(0, '#5b92ff'); g.addColorStop(0.55, '#a46bff'); g.addColorStop(1, '#ff4fd8');
  t.setFill(g);
  return t;
}

export function label(scene: Phaser.Scene, x: number, y: number, s: string, size = 26, color: string = UI.text, bold = false) {
  return scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' }).setOrigin(0.5);
}

/** Fundo com gradiente vertical. */
export function bgGradient(scene: Phaser.Scene, top: number, bottom: number) {
  const g = scene.add.graphics();
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, W, H);
  return g;
}

/** Linha de assinatura sob o cabeçalho. */
export function signatureLine(scene: Phaser.Scene, y: number) {
  const g = scene.add.graphics();
  g.fillGradientStyle(UI.g1, UI.g3, UI.g1, UI.g3, 1);
  g.fillRect(0, y, W, 4);
  return g;
}

/** Lista com scroll por arrasto. */
export function enableScroll(scene: Phaser.Scene, list: Phaser.GameObjects.Container, top: number, viewH: number, contentH: number) {
  const minY = Math.min(top, top - (contentH - viewH));
  let startY = 0, startList = 0, dragging = false;
  list.y = top;
  scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => { dragging = true; startY = p.y; startList = list.y; });
  scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (!dragging || !p.isDown) return;
    list.y = Phaser.Math.Clamp(startList + (p.y - startY), minY, top);
  });
  scene.input.on('pointerup', () => { dragging = false; });
  scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
    list.y = Phaser.Math.Clamp(list.y - dy * 0.6, minY, top);
  });
}

export function burst(scene: Phaser.Scene, x: number, y: number, colors: number[], n = 18, depth = 50) {
  for (let i = 0; i < n; i++) {
    const c = scene.add.circle(x, y, 4 + Math.random() * 6, colors[i % colors.length]).setDepth(depth);
    const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 110;
    scene.tweens.add({
      targets: c, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + 30, alpha: 0, scale: 0.2,
      duration: 600 + Math.random() * 400, ease: 'Cubic.Out', onComplete: () => c.destroy(),
    });
  }
}
