import Phaser from 'phaser';

export type CharKind = 'uli' | 'pimpa' | 'lagarta' | 'sorriso' | 'rainha';

export const CHAR_NAMES: Record<CharKind, string> = {
  uli: 'Uli',
  pimpa: 'Pimpa, a Lebre Pontual',
  lagarta: 'Madame Lagarta',
  sorriso: 'Sorriso',
  rainha: 'Rainha Roseira',
};
export const CHAR_COLORS: Record<CharKind, number> = {
  uli: 0x5b92ff,
  pimpa: 0xc9a8ff,
  lagarta: 0x7be08f,
  sorriso: 0xb98aff,
  rainha: 0xff6b8f,
};

type G = Phaser.GameObjects.Graphics;

function ell(g: G, x: number, y: number, w: number, h: number, rot: number, col: number, a = 1) {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(rot);
  g.fillStyle(col, a);
  g.fillEllipse(0, 0, w, h);
  g.restore();
}

function eyes(g: G, x: number, y: number, gap: number, r: number) {
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x - gap, y, r);
  g.fillCircle(x + gap, y, r);
}

export interface Char {
  root: Phaser.GameObjects.Container;
  inner: Phaser.GameObjects.Container;
  look(dx: number, dy: number): void;
}

/** Desenha uma personagem num espaço de ~100 unidades; `size` = altura em píxeis. */
export function makeChar(scene: Phaser.Scene, kind: CharKind, size: number): Char {
  const g = scene.add.graphics();
  const pupils = scene.add.graphics();
  let pupilR = 5, pupilGap = 13, pupilY = -6, pupilCol = 0x15161a;

  switch (kind) {
    case 'uli': {
      ell(g, 0, 46, 62, 12, 0, 0x000000, 0.25);
      ell(g, -17, 40, 20, 12, 0, 0x2a5fe0);
      ell(g, 17, 40, 20, 12, 0, 0x2a5fe0);
      g.fillStyle(0x3b74f2, 1); g.fillCircle(0, 0, 42);
      ell(g, -13, -18, 34, 18, -0.5, 0xffffff, 0.3);
      ell(g, 0, 16, 46, 34, 0, 0xdfe7ff);
      // tufo fúcsia
      ell(g, -7, -46, 11, 26, -0.4, 0xe02bc0);
      ell(g, 8, -47, 11, 22, 0.5, 0x8a4bea);
      // cachecol
      g.fillStyle(0xe02bc0, 1); g.fillRoundedRect(-33, 12, 66, 13, 6);
      g.fillRoundedRect(14, 16, 12, 26, 5);
      eyes(g, 0, -6, 14, 11.5);
      g.lineStyle(4, 0x15161a, 1); g.beginPath(); g.arc(0, 8, 9, 0.25, Math.PI - 0.25); g.strokePath();
      pupilR = 5.5; pupilGap = 14; pupilY = -6;
      break;
    }
    case 'pimpa': {
      ell(g, 0, 46, 66, 12, 0, 0x000000, 0.25);
      ell(g, -16, -64, 17, 52, -0.18, 0xf4f1fa); ell(g, -16, -64, 8, 40, -0.18, 0xff9ecb);
      ell(g, 16, -62, 17, 52, 0.28, 0xf4f1fa); ell(g, 16, -62, 8, 40, 0.28, 0xff9ecb);
      ell(g, 0, 14, 68, 66, 0, 0xf4f1fa);
      ell(g, 0, 20, 48, 46, 0, 0x8a4bea);                       // colete
      g.fillStyle(0xffcf4a, 1); g.fillCircle(-8, 26, 4); g.fillCircle(-8, 38, 4);
      g.fillStyle(0xf4f1fa, 1); g.fillCircle(0, -22, 30);        // cabeça
      g.fillStyle(0xff7ab6, 1); g.fillCircle(0, -12, 6);         // nariz
      eyes(g, 0, -27, 12, 8);
      g.lineStyle(3, 0x15161a, 1); g.lineBetween(-20, -40, -6, -36); g.lineBetween(20, -40, 6, -36); // sobrancelhas aflitas
      // relógio de bolso
      g.lineStyle(2, 0xffcf4a, 1); g.lineBetween(10, 22, 22, 28);
      g.fillStyle(0xffcf4a, 1); g.fillCircle(26, 32, 11);
      g.fillStyle(0xffffff, 1); g.fillCircle(26, 32, 8);
      g.lineStyle(2, 0x15161a, 1); g.lineBetween(26, 32, 26, 26); g.lineBetween(26, 32, 31, 34);
      pupilR = 3.6; pupilGap = 12; pupilY = -27;
      break;
    }
    case 'lagarta': {
      ell(g, 0, 46, 90, 12, 0, 0x000000, 0.25);
      const segs: [number, number, number, number][] = [[-42, 30, 18, 0x3fa05a], [-20, 34, 21, 0x5fbf6a], [4, 30, 21, 0x3fa05a], [26, 14, 22, 0x5fbf6a]];
      for (const [x, y, r, c] of segs) { g.fillStyle(c, 1); g.fillCircle(x, y, r); }
      g.fillStyle(0x7be08f, 1); g.fillCircle(24, -20, 30);         // cabeça
      ell(g, 24, -50, 46, 18, 0, 0xe04a6a);                         // chapéu-cogumelo
      g.fillStyle(0xffffff, 1); g.fillCircle(8, -52, 4); g.fillCircle(26, -57, 4); g.fillCircle(40, -50, 3.5);
      eyes(g, 24, -20, 12, 10);
      g.lineStyle(3, 0x15161a, 1);                                 // óculos
      g.strokeCircle(12, -20, 12); g.strokeCircle(36, -20, 12); g.lineBetween(24 - 1, -20, 24 + 1, -20);
      g.lineStyle(3, 0x15161a, 1); g.beginPath(); g.arc(24, -4, 7, 0.3, Math.PI - 0.3); g.strokePath();
      g.fillStyle(0xffffff, 0.7); g.fillCircle(64, -34, 5); g.fillCircle(74, -48, 8); // bolhas
      pupilR = 4.2; pupilGap = 12; pupilY = -20;
      pupils.x = 24;
      break;
    }
    case 'sorriso': {
      // corpo que se desvanece
      ell(g, 0, 50, 50, 22, 0, 0xb98aff, 0.35); ell(g, 0, 38, 40, 18, 0, 0xb98aff, 0.2);
      g.fillStyle(0xb98aff, 1); g.fillCircle(0, 0, 42);
      g.fillTriangle(-38, -14, -30, -52, -8, -34); g.fillTriangle(38, -14, 30, -52, 8, -34);
      g.fillStyle(0xff9ecb, 1); g.fillTriangle(-32, -22, -28, -44, -14, -34); g.fillTriangle(32, -22, 28, -44, 14, -34);
      g.fillStyle(0x8a4bea, 1); g.fillRect(-4, -38, 3, 12); g.fillRect(3, -38, 3, 12); g.fillRect(-12, -36, 3, 9); g.fillRect(11, -36, 3, 9);
      ell(g, -17, -8, 20, 14, 0.2, 0xffe36b); ell(g, 17, -8, 20, 14, -0.2, 0xffe36b);
      // sorriso enorme
      g.lineStyle(6, 0xffffff, 1); g.beginPath(); g.arc(0, 2, 30, 0.15, Math.PI - 0.15); g.strokePath();
      g.fillStyle(0xffffff, 1); for (let i = -3; i <= 3; i++) g.fillRect(i * 8 - 3, 30 - Math.abs(i) * 2.2, 6, 7);
      pupilR = 2.4; pupilGap = 17; pupilY = -8; pupilCol = 0x15161a;
      break;
    }
    case 'rainha': {
      ell(g, 0, 50, 96, 14, 0, 0x000000, 0.25);
      g.fillStyle(0xd62a5e, 1); g.fillCircle(0, 18, 46);
      for (const [x, y] of [[-22, 14], [0, 30], [24, 12], [-6, 6], [18, 34], [-30, 34]]) {
        g.fillStyle(0xff7a9e, 1); g.fillCircle(x, y, 9); g.fillStyle(0xb01848, 1); g.fillCircle(x, y, 5.5); g.fillStyle(0xff7a9e, 1); g.fillCircle(x, y, 2.5);
      }
      g.fillStyle(0xffd9c0, 1); g.fillCircle(0, -30, 22);
      g.fillStyle(0x2a1b3a, 1); g.fillEllipse(-24, -34, 14, 36); g.fillEllipse(24, -34, 14, 36);
      g.fillStyle(0xffcf4a, 1);
      g.fillRect(-18, -50, 36, 8);
      for (const x of [-18, -6, 6, 18]) g.fillTriangle(x - 6, -50, x + 6, -50, x, -66);
      eyes(g, 0, -30, 8, 5.5);
      g.lineStyle(3.5, 0x15161a, 1); g.lineBetween(-14, -40, -3, -36); g.lineBetween(14, -40, 3, -36);
      g.lineStyle(3, 0xb01848, 1); g.beginPath(); g.arc(0, -14, 6, Math.PI + 0.4, 2 * Math.PI - 0.4); g.strokePath();
      pupilR = 2.8; pupilGap = 8; pupilY = -30;
      break;
    }
  }

  const inner = scene.add.container(0, 0, [g, pupils]);
  const root = scene.add.container(0, 0, [inner]);
  root.setScale(size / 100);
  const draw = (dx: number, dy: number) => {
    pupils.clear();
    pupils.fillStyle(pupilCol, 1);
    const ox = dx * pupilR * 0.45, oy = dy * pupilR * 0.45;
    pupils.fillCircle(-pupilGap + ox, pupilY + oy, pupilR);
    pupils.fillCircle(pupilGap + ox, pupilY + oy, pupilR);
    pupils.fillStyle(0xffffff, 0.9);
    pupils.fillCircle(-pupilGap + ox - pupilR * 0.3, pupilY + oy - pupilR * 0.3, pupilR * 0.3);
    pupils.fillCircle(pupilGap + ox - pupilR * 0.3, pupilY + oy - pupilR * 0.3, pupilR * 0.3);
  };
  draw(0, 0);
  return { root, inner, look: draw };
}
