// O nome do jogo, «ÜLidÜLi», desenhado em vetor: fica igual em todos os telemóveis (sem depender de tipos de letra),
// com os dois tremas bem separados e o i e o d minúsculos.
const GLYPHS: Record<string, { w: number; d: [string, number[]][] }> = {
  // cada comando: letra SVG + pares x,y (a altura das maiúsculas é 100; os tremas ficam acima)
  U: { w: 84, d: [['M', [0, 0]], ['L', [30, 0]], ['L', [30, 60]], ['Q', [30, 73, 42, 73]], ['Q', [54, 73, 54, 60]], ['L', [54, 0]], ['L', [84, 0]], ['L', [84, 60]], ['Q', [84, 100, 42, 100]], ['Q', [0, 100, 0, 60]], ['Z', []],
    ['M', [3, -34]], ['L', [31, -34]], ['L', [31, -11]], ['L', [3, -11]], ['Z', []], ['M', [53, -34]], ['L', [81, -34]], ['L', [81, -11]], ['L', [53, -11]], ['Z', []]] },
  L: { w: 62, d: [['M', [0, 0]], ['L', [30, 0]], ['L', [30, 73]], ['L', [62, 73]], ['L', [62, 100]], ['L', [0, 100]], ['Z', []]] },
  i: { w: 30, d: [['M', [0, 28]], ['L', [30, 28]], ['L', [30, 100]], ['L', [0, 100]], ['Z', []], ['M', [0, -2]], ['L', [30, -2]], ['L', [30, 19]], ['L', [0, 19]], ['Z', []]] },
  d: { w: 78, d: [['M', [48, -2]], ['L', [78, -2]], ['L', [78, 100]], ['L', [48, 100]], ['L', [48, 94]], ['Q', [40, 101, 28, 101]], ['Q', [0, 101, 0, 64]], ['Q', [0, 27, 28, 27]], ['Q', [40, 27, 48, 34]], ['Z', []],
    ['M', [48, 56]], ['Q', [44, 50, 38, 50]], ['Q', [29, 50, 29, 64]], ['Q', [29, 78, 38, 78]], ['Q', [44, 78, 48, 72]], ['Z', []]] },
};
const NAME = ['U', 'L', 'i', 'd', 'U', 'L', 'i'];
const GAP = 13;
export const LOGO_W = NAME.reduce((a, k) => a + GLYPHS[k].w, 0) + GAP * (NAME.length - 1);
export const LOGO_TOP = -34, LOGO_H = 135;

/** Caminho SVG do nome, com a origem no canto superior esquerdo das maiúsculas. */
export function logoPath(): string {
  let x = 0;
  return NAME.map((k) => {
    const g = GLYPHS[k];
    const s = g.d.map(([c, p]) => c + p.map((v, i) => (i % 2 ? v : v + x)).join(' ')).join('');
    x += g.w + GAP;
    return s;
  }).join('');
}
