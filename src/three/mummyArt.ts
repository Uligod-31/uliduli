// Ilustração "desenhada à mão" de uma múmia horrenda: ligaduras sobrepostas, tinta, hachuras,
// olhos de luz fria, dentes humanos cerrados, correntes e relâmpagos. Desenhada em canvas, a alta resolução.

export const MUMMY_W = 1000;
export const MUMMY_H = 1250;
/** olhos em coordenadas lógicas (0..1000, 0..1250) */
export const MUMMY_EYES: [number, number][] = [[412, 452], [588, 452]];

type Ctx = CanvasRenderingContext2D;

const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function shade(c: string, a: number): string {
  const [r, g, b] = hex(c), t = a < 0 ? 0 : 255, k = Math.abs(a);
  const m = (v: number) => Math.round(v + (t - v) * k);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

export function drawMummy(px = 1536): HTMLCanvasElement {
  const S = px / MUMMY_W;
  const cv = document.createElement('canvas');
  cv.width = px; cv.height = Math.round(MUMMY_H * S);
  const g = cv.getContext('2d')!;
  g.scale(S, S);
  g.lineJoin = 'round'; g.lineCap = 'round';
  let seed = 90210;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = (a: number, b: number) => a + (b - a) * rnd();

  const LINEN = ['#c9bd98', '#b8ac88', '#a89c78', '#d3c7a4', '#9a8f6e', '#bfb08a'];
  const INK = 'rgba(20,14,8,.92)';

  // ───────── linhas auxiliares ─────────
  const wobblePath = (ctx: Ctx, pts: [number, number][], closed = true, j = 2.2) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const px2 = x + R(-j, j), py2 = y + R(-j, j); if (i) ctx.lineTo(px2, py2); else ctx.moveTo(px2, py2); });
    if (closed) ctx.closePath();
  };
  const bez = (p0: number[], p1: number[], p2: number[], p3: number[], t: number): [number, number] => {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  };

  // ───────── uma tira de ligadura ─────────
  function strip(cx: number, cy: number, ang: number, len: number, w: number) {
    const tone = LINEN[(rnd() * LINEN.length) | 0];
    g.save(); g.translate(cx, cy); g.rotate(ang);
    const curv = R(-22, 22), endJ = R(-8, 8);
    g.beginPath();
    g.moveTo(-len / 2, -w / 2); g.quadraticCurveTo(0, -w / 2 + curv, len / 2, -w / 2 + endJ);
    g.lineTo(len / 2 + R(-8, 8), w / 2 + endJ); g.quadraticCurveTo(0, w / 2 + curv, -len / 2, w / 2);
    g.closePath();
    const gr = g.createLinearGradient(0, -w / 2, 0, w / 2);
    gr.addColorStop(0, shade(tone, -0.42)); gr.addColorStop(0.22, shade(tone, 0.1)); gr.addColorStop(0.72, tone); gr.addColorStop(1, shade(tone, -0.5));
    g.fillStyle = gr; g.fill();
    g.lineWidth = 2.8; g.strokeStyle = INK; g.stroke();
    g.save(); g.clip();
    // trama do tecido
    g.strokeStyle = 'rgba(45,32,15,.2)'; g.lineWidth = 1;
    for (let x = -len / 2; x < len / 2; x += 6) { g.beginPath(); g.moveTo(x, -w / 2); g.lineTo(x + R(-2, 2), w / 2); g.stroke(); }
    g.strokeStyle = 'rgba(45,32,15,.12)';
    for (let y = -w / 2; y < w / 2; y += 5) { g.beginPath(); g.moveTo(-len / 2, y); g.lineTo(len / 2, y + R(-1, 1)); g.stroke(); }
    // rugas e fios soltos
    g.strokeStyle = 'rgba(28,20,8,.5)'; g.lineWidth = 1.6;
    for (let k = 0; k < 4; k++) { const x0 = R(-len / 2, len / 2), y0 = R(-w / 2, w / 2); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + R(-25, 25), y0 + R(-10, 10), x0 + R(-45, 45), y0 + R(-12, 12)); g.stroke(); }
    // manchas de humidade e sangue velho
    for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(${70 + (rnd() * 50) | 0},${40 + (rnd() * 20) | 0},${15},.2)`; g.beginPath(); g.ellipse(R(-len / 2, len / 2), R(-w / 2, w / 2), R(8, 30), R(5, 14), R(0, 3), 0, 6.28); g.fill(); }
    // sombra por hachuras junto à borda inferior
    g.strokeStyle = 'rgba(15,10,4,.5)'; g.lineWidth = 1.3;
    for (let x = -len / 2; x < len / 2; x += 9) { g.beginPath(); g.moveTo(x, w / 2); g.lineTo(x + 5, w / 2 - R(6, 13)); g.stroke(); }
    g.restore();
    // pontas desfiadas
    g.strokeStyle = 'rgba(30,22,10,.8)'; g.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) { const y0 = R(-w / 2, w / 2); g.beginPath(); g.moveTo(len / 2, y0); g.lineTo(len / 2 + R(6, 18), y0 + R(-6, 6)); g.stroke(); }
    g.restore();
  }

  // enrola uma forma com tiras (a forma tem de estar já em "clip")
  function wrap(bx: number, by: number, bw: number, bh: number, n: number, base: number, fan: number, wMin: number, wMax: number) {
    for (let i = 0; i < n; i++) {
      const cx = R(bx, bx + bw), cy = R(by, by + bh);
      const layer = i % 2 ? 1 : -1;
      const ang = base * layer + ((cx - (bx + bw / 2)) / (bw / 2)) * fan * layer + R(-0.14, 0.14);
      strip(cx, cy, ang, R(260, 520), R(wMin, wMax));
    }
  }

  // ───────── relâmpagos (por trás de tudo) ─────────
  const halo = g.createRadialGradient(500, 470, 40, 500, 470, 620);
  halo.addColorStop(0, 'rgba(80,130,255,.42)'); halo.addColorStop(0.5, 'rgba(60,70,200,.16)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo; g.fillRect(0, 0, MUMMY_W, MUMMY_H);
  function bolt(x0: number, y0: number, x1: number, y1: number, jit: number, col: string) {
    const pts: [number, number][] = [[x0, y0]];
    const n = 11;
    for (let i = 1; i < n; i++) {
      const t = i / n, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, o = R(-jit, jit);
      pts.push([x0 + (x1 - x0) * t + (nx / l) * o, y0 + (y1 - y0) * t + (ny / l) * o]);
    }
    pts.push([x1, y1]);
    for (const [w, a, c] of [[16, 0.16, col], [7, 0.45, col], [2.6, 1, '#ffffff']] as const) {
      g.strokeStyle = c === col ? col.replace('A', String(a)) : `rgba(255,255,255,${a})`; g.lineWidth = w;
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    }
  }
  for (const [x0, y0, x1, y1] of [[120, 120, 330, 380], [880, 140, 690, 360], [40, 560, 300, 520], [960, 620, 700, 560], [260, 20, 400, 250], [760, 30, 610, 230], [60, 900, 240, 760], [950, 880, 760, 760]]) {
    bolt(x0, y0, x1, y1, 38, 'rgba(110,160,255,A)');
    if (rnd() < 0.6) bolt((x0 + x1) / 2, (y0 + y1) / 2, (x0 + x1) / 2 + R(-90, 90), (y0 + y1) / 2 + R(60, 150), 22, 'rgba(110,160,255,A)');
  }

  // ───── cabelo grisalho em madeixas, a escorrer por trás da cabeça ─────
  const HAIR = ['#d9dce2', '#b5b9c4', '#8d92a0', '#eef0f4', '#6a6f7e'];
  const hw = (y: number) => (y < 440 ? 242 * Math.sin(((Math.max(168, y) - 168) / 272) * (Math.PI / 2)) : 242 - (y - 440) * 0.28);
  for (let k = 0; k < 230; k++) {
    const sd = k % 2 ? 1 : -1, y0 = R(210, 560), x0 = 500 + sd * (hw(y0) - 26);
    const c1: [number, number] = [x0 + sd * R(40, 120), y0 + R(30, 120)], c2: [number, number] = [x0 + sd * R(30, 160), y0 + R(160, 340)], e: [number, number] = [x0 + sd * R(0, 190), Math.min(980, y0 + R(300, 540))];
    g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
    const lw = R(0.9, 2.6);
    g.strokeStyle = 'rgba(8,8,14,.75)'; g.lineWidth = lw + 1.6; g.stroke();
    g.strokeStyle = HAIR[(R(0, HAIR.length)) | 0]; g.globalAlpha = R(0.55, 0.98); g.lineWidth = lw; g.stroke(); g.globalAlpha = 1;
  }

  // ───────── tronco e ombros enfaixados ─────────
  const torso = () => {
    g.beginPath();
    g.moveTo(340, 790); g.bezierCurveTo(250, 830, 120, 880, 60, 1010); g.lineTo(20, 1250); g.lineTo(980, 1250); g.lineTo(940, 1010);
    g.bezierCurveTo(880, 880, 750, 830, 660, 790); g.closePath();
  };
  g.save(); torso(); g.fillStyle = '#241d12'; g.fill(); g.clip();
  wrap(0, 780, 1000, 480, 42, 0.5, 0.35, 46, 84);
  // sombra volumétrica
  g.globalCompositeOperation = 'multiply';
  const ts = g.createLinearGradient(0, 780, 0, 1250); ts.addColorStop(0, 'rgba(255,255,255,1)'); ts.addColorStop(1, 'rgba(70,60,50,1)');
  g.fillStyle = ts; g.fillRect(0, 780, 1000, 470);
  g.globalCompositeOperation = 'source-over';
  g.restore();
  g.lineWidth = 5; g.strokeStyle = INK; torso(); g.stroke();

  // ombreiras com espigões de aço
  for (const sd of [-1, 1]) {
    const bx = 500 + sd * 335, by = 960;
    g.save(); g.translate(bx, by); g.scale(sd, 1);
    const sg = g.createLinearGradient(-30, 0, 30, 0); sg.addColorStop(0, '#2d3548'); sg.addColorStop(0.45, '#d4dcf0'); sg.addColorStop(1, '#3a4358');
    g.fillStyle = '#6b7690'; g.strokeStyle = INK; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 20, 44, 20, 0, 0, 6.28); g.fill(); g.stroke();
    for (let k = 0; k < 3; k++) { const kx = -22 + k * 22, kh = 70 + (k === 1 ? 40 : 0); g.fillStyle = sg; g.beginPath(); g.moveTo(kx - 14, 14); g.lineTo(kx + 4 - k * 3, -kh); g.lineTo(kx + 14, 14); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(kx - 4, 8); g.lineTo(kx + 2 - k * 3, -kh + 14); g.stroke(); g.strokeStyle = INK; g.lineWidth = 4; }
    g.restore();
  }

  // punhos cerrados nos cantos, a agarrar as correntes
  for (const fx of [185, 815]) {
    g.save();
    g.beginPath(); g.ellipse(fx, 1150, 125, 100, fx < 500 ? 0.25 : -0.25, 0, 6.28); g.fillStyle = '#2a2216'; g.fill(); g.clip();
    wrap(fx - 130, 1050, 260, 200, 16, 0.3, 0.5, 34, 58);
    g.restore();
    g.lineWidth = 4.5; g.strokeStyle = INK; g.beginPath(); g.ellipse(fx, 1150, 125, 100, fx < 500 ? 0.25 : -0.25, 0, 6.28); g.stroke();
    // nós dos dedos
    for (let k = 0; k < 4; k++) { const kx = fx - 78 + k * 52, ky = 1085 + Math.abs(k - 1.5) * 8; g.fillStyle = 'rgba(255,240,200,.18)'; g.beginPath(); g.ellipse(kx, ky, 22, 14, 0, 0, 6.28); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.beginPath(); g.moveTo(kx - 22, ky + 16); g.quadraticCurveTo(kx, ky + 40, kx + 22, ky + 16); g.stroke(); }
  }

  // ───────── cabeça ─────────
  const head = () => {
    g.beginPath();
    g.moveTo(500, 168);
    g.bezierCurveTo(655, 168, 748, 290, 742, 440);
    g.bezierCurveTo(738, 540, 712, 590, 682, 650);
    g.bezierCurveTo(655, 722, 585, 790, 500, 792);
    g.bezierCurveTo(415, 790, 345, 722, 318, 650);
    g.bezierCurveTo(288, 590, 262, 540, 258, 440);
    g.bezierCurveTo(252, 290, 345, 168, 500, 168);
    g.closePath();
  };
  // pescoço
  g.save();
  g.beginPath(); g.moveTo(405, 700); g.lineTo(595, 700); g.lineTo(640, 830); g.lineTo(360, 830); g.closePath(); g.fillStyle = '#1e180f'; g.fill(); g.clip();
  wrap(350, 690, 300, 150, 12, 0.18, 0.3, 36, 54);
  g.restore();
  g.lineWidth = 4; g.strokeStyle = INK; g.beginPath(); g.moveTo(405, 700); g.lineTo(360, 830); g.moveTo(595, 700); g.lineTo(640, 830); g.stroke();
  // coleira de couro com espigões
  {
    g.beginPath(); g.moveTo(372, 786); g.quadraticCurveTo(500, 836, 628, 786); g.lineTo(636, 826); g.quadraticCurveTo(500, 880, 364, 826); g.closePath();
    const cg = g.createLinearGradient(0, 786, 0, 880); cg.addColorStop(0, '#3a2c20'); cg.addColorStop(0.5, '#1c140d'); cg.addColorStop(1, '#0a0705'); g.fillStyle = cg; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    for (let k = 0; k < 9; k++) {
      const t = (k + 0.5) / 9, x = 372 + 256 * t + (t < 0.5 ? 0 : 0), y = 792 + Math.sin(t * Math.PI) * 38 + 14;
      const sg = g.createLinearGradient(x - 9, y, x + 9, y); sg.addColorStop(0, '#3a445c'); sg.addColorStop(0.5, '#e2e9fa'); sg.addColorStop(1, '#4a5470');
      g.fillStyle = sg; g.beginPath(); g.moveTo(x - 10, y + 8); g.lineTo(x, y + 8 + 34); g.lineTo(x + 10, y + 8); g.closePath(); g.fill(); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
      g.fillStyle = '#9aa6c4'; g.beginPath(); g.arc(x, y + 6, 6, 0, 6.28); g.fill(); g.stroke();
    }
  }

  g.save(); head(); g.fillStyle = '#2b2316'; g.fill(); g.clip();
  wrap(240, 150, 520, 660, 78, 0.34, 0.5, 40, 76);
  // faixas extra de testa (sobrancelha zangada) e queixo
  for (let k = 0; k < 4; k++) { strip(430 + k * 38, 392 - k * 6, -0.34 + k * 0.02, 260, 40); strip(570 - k * 38, 392 - k * 6, 0.34 - k * 0.02, 260, 40); }
  // carne apodrecida a rasgar a ligadura
  const patch = (cx: number, cy: number, rx: number, ry: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, k = R(0.72, 1.22); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    wobblePath(g, pts, true, 1.5);
    const pg = g.createRadialGradient(cx, cy, 2, cx, cy, Math.max(rx, ry)); pg.addColorStop(0, '#1b0305'); pg.addColorStop(0.7, '#4a0e12'); pg.addColorStop(1, '#6e1a1c');
    g.fillStyle = pg; g.fill(); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke();
    g.strokeStyle = 'rgba(200,80,70,.75)'; g.lineWidth = 1.5;
    for (let k = 0; k < 9; k++) { const a = R(0, 6.28), r1 = Math.max(rx, ry) * R(0.2, 0.5), r2 = Math.max(rx, ry) * R(0.7, 1); g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.quadraticCurveTo(cx + Math.cos(a + 0.4) * (r1 + r2) / 2, cy + Math.sin(a + 0.4) * (r1 + r2) / 2, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke(); }
    g.fillStyle = 'rgba(255,150,130,.18)'; g.beginPath(); g.ellipse(cx - rx * 0.2, cy - ry * 0.3, rx * 0.35, ry * 0.18, -0.4, 0, 6.28); g.fill();
  };
  patch(618, 548, 46, 58); patch(342, 300, 36, 44); patch(560, 250, 26, 30);
  // correias de couro com rebites
  const stud = (x: number, y: number, r: number) => {
    const sg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.4, '#b6c0da'); sg.addColorStop(1, '#2a3248');
    g.fillStyle = sg; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill(); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
  };
  const strap = (x0: number, y0: number, x1: number, y1: number, w: number) => {
    g.save(); const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0); g.translate(x0, y0); g.rotate(a);
    const gr = g.createLinearGradient(0, -w / 2, 0, w / 2); gr.addColorStop(0, '#3c2e22'); gr.addColorStop(0.25, '#4a392b'); gr.addColorStop(0.7, '#1b130d'); gr.addColorStop(1, '#0a0705');
    g.fillStyle = gr; g.fillRect(0, -w / 2, len, w); g.lineWidth = 3; g.strokeStyle = INK; g.strokeRect(0, -w / 2, len, w);
    g.strokeStyle = 'rgba(205,185,135,.6)'; g.lineWidth = 1.4; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(0, -w / 2 + 5); g.lineTo(len, -w / 2 + 5); g.moveTo(0, w / 2 - 5); g.lineTo(len, w / 2 - 5); g.stroke(); g.setLineDash([]);
    for (let x = 16; x < len; x += 34) stud(x, 0, 7.5);
    g.restore();
  };
  strap(236, 318, 764, 292, 34);
  strap(304, 170, 294, 772, 26); strap(696, 170, 706, 772, 26);

  // volume: escurecer as bordas e a base, luz de cima-esquerda
  g.globalCompositeOperation = 'multiply';
  const vol = g.createRadialGradient(440, 400, 30, 500, 470, 400);
  vol.addColorStop(0, 'rgba(255,255,255,1)'); vol.addColorStop(0.55, 'rgba(200,185,160,1)'); vol.addColorStop(1, 'rgba(50,38,28,1)');
  g.fillStyle = vol; g.fillRect(240, 150, 520, 660);
  g.globalCompositeOperation = 'source-over';
  // luz de palco: azul à esquerda, vermelha à direita
  const rimB = g.createLinearGradient(250, 0, 420, 0); rimB.addColorStop(0, 'rgba(70,130,255,.5)'); rimB.addColorStop(1, 'rgba(70,130,255,0)');
  g.globalCompositeOperation = 'screen'; g.fillStyle = rimB; g.fillRect(240, 150, 200, 660);
  const rimR = g.createLinearGradient(760, 0, 600, 0); rimR.addColorStop(0, 'rgba(255,50,60,.42)'); rimR.addColorStop(1, 'rgba(255,50,60,0)');
  g.fillStyle = rimR; g.fillRect(560, 150, 200, 660);
  g.globalCompositeOperation = 'source-over';
  // hachuras de sombra nas faces
  g.strokeStyle = 'rgba(12,8,4,.55)'; g.lineWidth = 1.5;
  for (let k = 0; k < 120; k++) {
    const sd = rnd() < 0.5 ? -1 : 1, y = R(330, 760), edge = sd < 0 ? 262 + (y - 330) * 0.05 : 738 - (y - 330) * 0.05, x = edge - sd * R(0, 60);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - sd * R(8, 22), y + R(6, 16)); g.stroke();
  }
  // maçãs do rosto encovadas
  for (const sd of [-1, 1]) {
    const hg = g.createRadialGradient(500 + sd * 190, 600, 5, 500 + sd * 190, 610, 90);
    hg.addColorStop(0, 'rgba(0,0,0,.55)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hg; g.fillRect(500 + sd * 190 - 100, 500, 200, 220);
  }
  g.restore();

  // ───── olhos: cavidades rasgadas com luz fria ─────
  const ragged = (cx: number, cy: number, rx: number, ry: number, rot: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, k = R(0.84, 1.14); pts.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]); }
    g.save(); g.translate(cx, cy); g.rotate(rot); wobblePath(g, pts, true, 1.5); return () => g.restore();
  };
  MUMMY_EYES.forEach(([ex, ey], i) => {
    const sd = i ? 1 : -1, rot = sd * 0.32;
    const done = ragged(ex, ey, 66, 44, rot);
    const sg = g.createRadialGradient(0, 0, 4, 0, 0, 70); sg.addColorStop(0, '#05080f'); sg.addColorStop(1, '#010101');
    g.fillStyle = sg; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
    done();
    // fios de ligadura rasgados sobre a cavidade
    g.strokeStyle = 'rgba(190,175,135,.85)'; g.lineWidth = 3;
    for (let k = 0; k < 4; k++) { const x0 = ex - 50 + k * 30, y0 = ey - 38; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + R(-8, 8), y0 + 20, x0 + R(-10, 10), y0 + R(26, 40)); g.stroke(); }
    // luz do olhar
    const glow = g.createRadialGradient(ex, ey, 2, ex, ey, 130);
    glow.addColorStop(0, 'rgba(210,230,255,.55)'); glow.addColorStop(0.35, 'rgba(90,150,255,.22)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(ex, ey, 130, 0, 6.28); g.fill();
    const eg = g.createRadialGradient(ex, ey, 1, ex, ey, 34);
    eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.35, 'rgba(225,238,255,1)'); eg.addColorStop(0.7, 'rgba(110,170,255,.75)'); eg.addColorStop(1, 'rgba(60,110,255,0)');
    g.fillStyle = eg; g.beginPath(); g.ellipse(ex, ey, 40, 26, rot, 0, 6.28); g.fill();
    // estrela de brilho
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ex - 70, ey); g.lineTo(ex + 70, ey); g.moveTo(ex, ey - 54); g.lineTo(ex, ey + 54); g.stroke();
    // sobrancelha: faixa pesada e escura
    g.strokeStyle = 'rgba(14,9,4,.95)'; g.lineWidth = 15;
    g.beginPath(); g.moveTo(ex - sd * 70, ey - 78 + sd * -0); g.quadraticCurveTo(ex, ey - 62 - sd * 0, ex + sd * 74, ey - 34 - 0); g.stroke();
  });

  // veias e sangue a escorrer das cavidades
  MUMMY_EYES.forEach(([ex, ey], i) => {
    const sd = i ? 1 : -1;
    g.strokeStyle = 'rgba(110,12,22,.75)'; g.lineWidth = 1.3;
    for (let k = 0; k < 9; k++) { const a = R(0, 6.28), r1 = 64, r2 = R(86, 130); g.beginPath(); g.moveTo(ex + Math.cos(a) * r1, ey + Math.sin(a) * r1 * 0.7); g.quadraticCurveTo(ex + Math.cos(a + 0.3) * (r1 + r2) / 2, ey + Math.sin(a + 0.3) * (r1 + r2) / 2 * 0.7, ex + Math.cos(a) * r2, ey + Math.sin(a) * r2 * 0.7); g.stroke(); }
    for (let k = 0; k < 3; k++) {
      const x0 = ex + sd * R(-24, 30), y0 = ey + 36, len = R(60, 190);
      g.strokeStyle = 'rgba(100,8,14,.95)'; g.lineWidth = R(3.5, 6); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + sd * R(-6, 12), y0 + len * 0.5, x0 + sd * R(-4, 10), y0 + len); g.stroke();
      g.strokeStyle = 'rgba(255,120,110,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0 - 1, y0 + 4); g.lineTo(x0 - 1, y0 + len * 0.8); g.stroke();
      g.fillStyle = 'rgba(110,10,16,.95)'; g.beginPath(); g.arc(x0 + sd * 5, y0 + len + 4, 4.5, 0, 6.28); g.fill();
    }
  });

  // nariz de caveira: nariz achatado e cavidade escura
  g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.moveTo(500, 520); g.quadraticCurveTo(470, 585, 482, 600); g.lineTo(518, 600); g.quadraticCurveTo(530, 585, 500, 520); g.fill();
  g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  g.fillStyle = 'rgba(255,240,205,.18)'; g.beginPath(); g.ellipse(486, 560, 7, 26, 0.1, 0, 6.28); g.fill();

  // ───── boca: rasgada, com dentes humanos cerrados ─────
  g.save(); g.translate(500, 690); g.scale(1.2, 1.26); g.translate(-500, -690);
  const mouthP = () => {
    g.beginPath();
    g.moveTo(372, 648);
    g.bezierCurveTo(430, 628, 570, 628, 628, 648);
    g.lineTo(640, 664); g.bezierCurveTo(655, 715, 600, 762, 500, 768);
    g.bezierCurveTo(400, 762, 345, 715, 360, 664); g.closePath();
  };
  g.save(); mouthP(); const mgr = g.createLinearGradient(0, 630, 0, 770); mgr.addColorStop(0, '#2a0709'); mgr.addColorStop(1, '#050101'); g.fillStyle = mgr; g.fill(); g.clip();
  const teethRow = (y0: number, n: number, x0: number, x1: number, hgt: number, down: boolean) => {
    for (let k = 0; k < n; k++) {
      const x = x0 + ((x1 - x0) * (k + 0.5)) / n, w = (x1 - x0) / n - 2.5;
      const arch = Math.pow((x - 500) / 125, 2) * 14, h = hgt * R(0.9, 1.12) - Math.abs(x - 500) * 0.05;
      const ty = down ? y0 + arch * 0 + 4 + Math.abs(x - 500) * 0.1 : y0 + arch * 0 - 3;
      const top = down ? ty : ty - h;
      const tg = g.createLinearGradient(0, top, 0, top + h); tg.addColorStop(0, '#f1e6bc'); tg.addColorStop(0.6, '#d8c995'); tg.addColorStop(1, '#8a7a45');
      g.fillStyle = tg; g.beginPath(); if ((g as any).roundRect) (g as any).roundRect(x - w / 2, top, w, h, down ? [3, 3, 8, 8] : [8, 8, 3, 3]); else g.rect(x - w / 2, top, w, h); g.fill();
      g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
      g.strokeStyle = 'rgba(70,50,20,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + R(-3, 3), top + 4); g.lineTo(x + R(-3, 3), top + h - 5); g.stroke();
    }
  };
  // gengivas
  g.fillStyle = '#5a1018'; g.fillRect(360, 640, 290, 18); g.fillRect(360, 728, 290, 40);
  teethRow(700, 8, 392, 608, 50, false);
  teethRow(706, 8, 396, 604, 44, true);
  g.restore();
  g.lineWidth = 5; g.strokeStyle = INK; mouthP(); g.stroke();
  g.restore();
  // pontos de costura nos cantos da boca
  g.strokeStyle = 'rgba(15,10,5,.95)'; g.lineWidth = 3.5;
  for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { const x = 500 + sd * (146 + k * 17), y = 652 - k * 5; g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x + sd * 3, y + 16); g.stroke(); }

  // contorno da cabeça, em tinta irregular
  for (let k = 0; k < 2; k++) {
    g.lineWidth = k ? 2.6 : 6.5; g.strokeStyle = INK; g.save(); g.translate(R(-1.5, 1.5), R(-1.5, 1.5)); head(); g.stroke(); g.restore();
  }
  // fendas e pele a rasgar a ligadura
  g.strokeStyle = 'rgba(12,8,3,.9)'; g.lineWidth = 2.6;
  for (let k = 0; k < 9; k++) {
    const sd = k % 2 ? 1 : -1, x = 500 + sd * R(60, 220), y = R(230, 520); g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 4; j++) g.lineTo(x + sd * R(-30, 30), y + (j + 1) * R(14, 28)); g.stroke();
  }
  for (let k = 0; k < 46; k++) {
    const x0 = 500 + R(-150, 150), y0 = 168 + Math.abs(x0 - 500) * 0.12 + R(0, 20), sd = x0 < 500 ? -1 : 1;
    g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + sd * R(10, 40), y0 - R(30, 70), x0 + sd * R(30, 90), y0 - R(60, 130), x0 + sd * R(40, 130), y0 - R(20, 150) + R(0, 120));
    const lw = R(0.9, 2.3);
    g.strokeStyle = 'rgba(8,8,14,.75)'; g.lineWidth = lw + 1.5; g.stroke();
    g.strokeStyle = HAIR[(R(0, HAIR.length)) | 0]; g.lineWidth = lw; g.stroke();
  }
  // tiras soltas a pender
  const tails: [number, number, number, number][] = [[300, 520, 250, 780], [330, 640, 340, 860], [700, 520, 760, 800], [668, 650, 650, 880]];
  for (const [x0, y0, x1, y1] of tails) {
    const w = R(22, 34), tone = LINEN[(rnd() * LINEN.length) | 0];
    g.beginPath(); g.moveTo(x0 - w / 2, y0); g.bezierCurveTo(x0 - w, (y0 + y1) / 2 - 40, x1 - w, (y0 + y1) / 2 + 30, x1 - w / 2, y1);
    g.lineTo(x1 + w / 2 + R(-4, 4), y1 + R(4, 14)); g.bezierCurveTo(x1 + w, (y0 + y1) / 2 + 30, x0 + w, (y0 + y1) / 2 - 40, x0 + w / 2, y0); g.closePath();
    const tg = g.createLinearGradient(x0 - w, 0, x0 + w, 0); tg.addColorStop(0, shade(tone, -0.4)); tg.addColorStop(0.45, shade(tone, 0.08)); tg.addColorStop(1, shade(tone, -0.5));
    g.fillStyle = tg; g.fill(); g.lineWidth = 2.6; g.strokeStyle = INK; g.stroke();
    g.strokeStyle = 'rgba(40,28,12,.4)'; g.lineWidth = 1;
    for (let k = 0; k < 8; k++) { const t = k / 8, [bx, by] = bez([x0, y0], [x0 - w, (y0 + y1) / 2 - 40], [x1 - w, (y0 + y1) / 2 + 30], [x1, y1], t); g.beginPath(); g.moveTo(bx - w / 2, by); g.lineTo(bx + w / 2, by + 3); g.stroke(); }
  }

  // ───── correntes: dos cantos da boca aos punhos ─────
  function chain(p0: number[], p1: number[], p2: number[], p3: number[]) {
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const t = i / N, [x, y] = bez(p0, p1, p2, p3, t), [x2, y2] = bez(p0, p1, p2, p3, Math.min(1, t + 0.02));
      const ang = Math.atan2(y2 - y, x2 - x) + Math.PI / 2, face = i % 2 === 0;
      g.save(); g.translate(x, y); g.rotate(ang);
      const rx = face ? 15 : 7, ry = 22;
      g.lineWidth = 11; g.strokeStyle = INK; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.28); g.stroke();
      const sg = g.createLinearGradient(-rx, 0, rx, 0); sg.addColorStop(0, '#3b4558'); sg.addColorStop(0.4, '#c3cde2'); sg.addColorStop(1, '#4a5468');
      g.lineWidth = 6; g.strokeStyle = sg; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.28); g.stroke();
      g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(-1, -1, rx - 2, ry - 2, 0, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
      g.restore();
    }
  }
  chain([452, 672], [430, 820], [300, 960], [236, 1090]);
  chain([548, 672], [570, 820], [700, 960], [764, 1090]);

  // ───── textura de papel e tinta: grão, salpicos, vinheta ─────
  g.globalCompositeOperation = 'source-atop';
  for (let k = 0; k < 9000; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.09)' : 'rgba(255,245,220,.05)'; g.fillRect(R(0, 1000), R(0, 1250), R(0.8, 2.2), R(0.8, 2.2)); }
  for (let k = 0; k < 60; k++) { g.fillStyle = 'rgba(10,6,3,.55)'; g.beginPath(); g.arc(R(230, 770), R(180, 830), R(0.8, 2.8), 0, 6.28); g.fill(); }
  const vig = g.createRadialGradient(500, 600, 340, 500, 640, 760);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = vig; g.fillRect(0, 0, MUMMY_W, MUMMY_H);
  g.globalCompositeOperation = 'source-over';
  return cv;
}

/** Textura de ligaduras (repetível) para as mãos da múmia: tiras com tinta, trama, manchas e hachuras. */
export function drawBandageTex(px = 512): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const g = cv.getContext('2d')!; g.lineJoin = 'round';
  let seed = 515; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = (a: number, b: number) => a + (b - a) * rnd();
  const tones = ['#c9bd98', '#b8ac88', '#a89c78', '#d3c7a4', '#9a8f6e'];
  g.fillStyle = '#2a2217'; g.fillRect(0, 0, px, px);
  for (let i = 0; i < 46; i++) {
    const cx = R(0, px), cy = R(0, px), ang = R(-0.5, 0.5) + (i % 2 ? 0.9 : 0), len = R(200, 380), w = R(40, 84);
    const tone = tones[(rnd() * tones.length) | 0];
    for (const [ox, oy] of [[0, 0], [-px, 0], [px, 0], [0, -px], [0, px]]) {
      g.save(); g.translate(cx + ox, cy + oy); g.rotate(ang);
      const gr = g.createLinearGradient(0, -w / 2, 0, w / 2); gr.addColorStop(0, '#5a5038'); gr.addColorStop(0.25, tone); gr.addColorStop(0.75, tone); gr.addColorStop(1, '#4a412e');
      g.fillStyle = gr; g.fillRect(-len / 2, -w / 2, len, w);
      g.lineWidth = 3; g.strokeStyle = 'rgba(20,14,8,.9)'; g.strokeRect(-len / 2, -w / 2, len, w);
      g.strokeStyle = 'rgba(45,32,15,.22)'; g.lineWidth = 1;
      for (let x = -len / 2; x < len / 2; x += 6) { g.beginPath(); g.moveTo(x, -w / 2); g.lineTo(x, w / 2); g.stroke(); }
      g.strokeStyle = 'rgba(15,10,4,.5)';
      for (let x = -len / 2; x < len / 2; x += 9) { g.beginPath(); g.moveTo(x, w / 2); g.lineTo(x + 5, w / 2 - R(6, 13)); g.stroke(); }
      g.restore();
    }
  }
  for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(80,45,20,.16)'; g.beginPath(); g.ellipse(R(0, px), R(0, px), R(10, 34), R(6, 18), R(0, 3), 0, 6.28); g.fill(); }
  return cv;
}
