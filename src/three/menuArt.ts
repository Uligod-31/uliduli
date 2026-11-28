import { logoPath, LOGO_W, LOGO_TOP, LOGO_H } from '../core/logo';
// Arte do menu, desenhada por código a alta resolução: céu com lua, moldura de ramos mortos com corvos,
// logótipo metálico com extrusão e relâmpagos, e placas de metal rebitadas para os botões.

type Ctx = CanvasRenderingContext2D;
const mkRnd = (seed: number) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!; g.lineJoin = 'round'; g.lineCap = 'round';
  return [c, g];
}

function star4(g: Ctx, x: number, y: number, r: number, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.25, `rgba(190,215,255,${a * 0.5})`); gr.addColorStop(1, 'rgba(120,160,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
  g.strokeStyle = `rgba(255,255,255,${a * 0.85})`; g.lineWidth = Math.max(1, r * 0.04);
  g.beginPath(); g.moveTo(x - r * 1.5, y); g.lineTo(x + r * 1.5, y); g.moveTo(x, y - r * 1.5); g.lineTo(x, y + r * 1.5); g.stroke();
  g.lineWidth = Math.max(0.8, r * 0.025); g.beginPath();
  g.moveTo(x - r * 0.8, y - r * 0.8); g.lineTo(x + r * 0.8, y + r * 0.8); g.moveTo(x + r * 0.8, y - r * 0.8); g.lineTo(x - r * 0.8, y + r * 0.8); g.stroke();
}

// ═════════════════════════ CÉU ═════════════════════════
/** Fundo pintado: noite azul, lua enorme com crateras, nuvens, estrelas, ruínas ao longe e névoa. 720x1280 lógicos. */
export function drawSky(px = 1080): HTMLCanvasElement {
  const S = px / 720, [c, g] = canvas(px, Math.round(1280 * S));
  g.scale(S, S);
  const R = mkRnd(4141);
  const rr = (a: number, b: number) => a + (b - a) * R();

  const sky = g.createLinearGradient(0, 0, 0, 1280);
  sky.addColorStop(0, '#02030a'); sky.addColorStop(0.28, '#071433'); sky.addColorStop(0.55, '#0d2b63'); sky.addColorStop(0.8, '#14397a'); sky.addColorStop(1, '#0a1a3d');
  g.fillStyle = sky; g.fillRect(0, 0, 720, 1280);

  // pinceladas largas de tinta azul (aspeto pintado)
  for (let i = 0; i < 90; i++) {
    const y = rr(0, 1280), x = rr(-100, 720), l = rr(180, 520);
    const gr = g.createLinearGradient(x, y, x + l, y + rr(-30, 30));
    const a = rr(0.03, 0.09);
    gr.addColorStop(0, 'rgba(60,110,230,0)'); gr.addColorStop(0.5, `rgba(70,120,240,${a})`); gr.addColorStop(1, 'rgba(60,110,230,0)');
    g.strokeStyle = gr; g.lineWidth = rr(14, 46); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + rr(-40, 40), x + l, y + rr(-30, 30)); g.stroke();
  }

  // estrelas
  for (let i = 0; i < 320; i++) {
    const x = rr(0, 720), y = rr(0, 900), r2 = rr(0.4, 1.7), a = rr(0.3, 1);
    g.fillStyle = `rgba(${200 + (R() * 55) | 0},${215 + (R() * 40) | 0},255,${a})`; g.beginPath(); g.arc(x, y, r2, 0, 6.28); g.fill();
  }
  for (let i = 0; i < 9; i++) star4(g, rr(30, 690), rr(30, 700), rr(5, 11), 0.8);

  // lua cheia
  const mx = 470, my = 400, mr = 170;
  const halo = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3.2);
  halo.addColorStop(0, 'rgba(255,238,170,.5)'); halo.addColorStop(0.35, 'rgba(180,200,255,.18)'); halo.addColorStop(1, 'rgba(60,100,220,0)');
  g.fillStyle = halo; g.fillRect(0, 0, 720, 1280);
  g.save(); g.beginPath(); g.arc(mx, my, mr, 0, 6.28); g.clip();
  const mg = g.createRadialGradient(mx - 40, my - 50, 10, mx, my, mr);
  mg.addColorStop(0, '#fff6c8'); mg.addColorStop(0.6, '#f0dc93'); mg.addColorStop(1, '#b89d58');
  g.fillStyle = mg; g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
  // mares e crateras
  for (let i = 0; i < 9; i++) { const x = mx + rr(-120, 120), y = my + rr(-120, 120); const gr = g.createRadialGradient(x, y, 2, x, y, rr(30, 70)); gr.addColorStop(0, 'rgba(120,96,40,.38)'); gr.addColorStop(1, 'rgba(120,96,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 80, 0, 6.28); g.fill(); }
  for (let i = 0; i < 36; i++) {
    const x = mx + rr(-150, 150), y = my + rr(-150, 150), r2 = rr(4, 20);
    g.strokeStyle = 'rgba(90,68,28,.7)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, r2, 0, 6.28); g.stroke();
    g.strokeStyle = 'rgba(255,250,215,.55)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x + 1.2, y + 1.2, r2 - 1.2, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
    g.fillStyle = 'rgba(100,76,30,.2)'; g.beginPath(); g.arc(x, y, r2 - 1, 0, 6.28); g.fill();
  }
  // hachuras de sombra à direita
  g.strokeStyle = 'rgba(70,52,20,.45)'; g.lineWidth = 1.2;
  for (let i = 0; i < 160; i++) { const a = rr(-1.2, 1.2), d = rr(0.55, 1) * mr, x = mx + Math.cos(a) * d + 50, y = my + Math.sin(a) * d; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(4, 10), y + rr(5, 12)); g.stroke(); }
  g.restore();
  g.strokeStyle = 'rgba(40,30,10,.7)'; g.lineWidth = 2.5; g.beginPath(); g.arc(mx, my, mr, 0, 6.28); g.stroke();

  // nuvens iluminadas pela lua
  for (let i = 0; i < 26; i++) {
    const x = rr(-60, 780), y = rr(180, 760), w = rr(120, 380), h = rr(14, 40);
    const near = Math.max(0, 1 - Math.hypot(x - mx, y - my) / 460);
    const gr = g.createRadialGradient(x, y, 4, x, y, w / 2);
    gr.addColorStop(0, `rgba(${120 + near * 120},${150 + near * 90},${210 + near * 40},${0.12 + near * 0.22})`); gr.addColorStop(1, 'rgba(40,70,150,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, w / 2, h, rr(-0.08, 0.08), 0, 6.28); g.fill();
  }

  // ruínas góticas e cemitério ao longe
  g.fillStyle = '#04060f';
  g.beginPath(); g.moveTo(0, 1000);
  let x = 0;
  while (x < 720) {
    const w = rr(22, 60), h = rr(30, 120);
    if (R() < 0.35) { g.lineTo(x, 1000 - h); g.lineTo(x + w / 2, 1000 - h - rr(24, 50)); g.lineTo(x + w, 1000 - h); } else { g.lineTo(x, 1000 - h * 0.4); g.lineTo(x + w, 1000 - h * 0.4); }
    x += w;
  }
  g.lineTo(720, 1000); g.lineTo(720, 1280); g.lineTo(0, 1280); g.closePath(); g.fill();
  // cruzes e lápides
  for (let i = 0; i < 14; i++) { const cx = rr(10, 710), cy = rr(940, 1020), s2 = rr(10, 22); g.fillStyle = '#03050c'; g.fillRect(cx - 2, cy - s2, 4, s2 * 1.6); g.fillRect(cx - s2 / 2, cy - s2 * 0.7, s2, 4); }
  // contorno azul de luar nas silhuetas
  g.strokeStyle = 'rgba(110,160,255,.35)'; g.lineWidth = 1.5; g.stroke();

  // névoa baixa
  for (let i = 0; i < 18; i++) {
    const x2 = rr(-80, 800), y = rr(900, 1180), w = rr(240, 520);
    const gr = g.createRadialGradient(x2, y, 6, x2, y, w / 2);
    gr.addColorStop(0, 'rgba(120,160,235,.22)'); gr.addColorStop(1, 'rgba(60,90,190,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x2, y, w / 2, rr(26, 60), 0, 0, 6.28); g.fill();
  }

  // estrelas-holofote em fila diagonal (palco)
  for (const [sx, sy, sr] of [[640, 520, 30], [596, 590, 22], [548, 650, 16], [512, 700, 11]] as const) star4(g, sx, sy, sr, 0.95);

  // grão de tela
  for (let i = 0; i < 12000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(180,200,255,.04)'; g.fillRect(rr(0, 720), rr(0, 1280), rr(0.7, 2), rr(0.7, 2)); }
  return c;
}

// ═════════════════════════ MOLDURA ═════════════════════════
function corvo(g: Ctx, x: number, y: number, s: number, flip: number) {
  g.save(); g.translate(x, y); g.scale(s * flip, s);
  g.fillStyle = '#04060c'; g.strokeStyle = 'rgba(120,170,255,.45)'; g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(0, -14, 20, 11, -0.35, 0, 6.28); g.fill(); g.stroke();             // corpo
  g.beginPath(); g.arc(18, -26, 8.5, 0, 6.28); g.fill(); g.stroke();                           // cabeça
  g.beginPath(); g.moveTo(25, -28); g.lineTo(40, -23); g.lineTo(25, -22); g.closePath(); g.fill(); // bico
  g.beginPath(); g.moveTo(-14, -9); g.lineTo(-48, 4); g.lineTo(-40, -8); g.lineTo(-18, -18); g.closePath(); g.fill(); g.stroke(); // cauda
  g.beginPath(); g.moveTo(-3, -18); g.quadraticCurveTo(-18, -34, -34, -18); g.quadraticCurveTo(-18, -14, -3, -8); g.closePath(); g.fill(); // asa
  g.strokeStyle = '#04060c'; g.lineWidth = 2; g.beginPath(); g.moveTo(2, -4); g.lineTo(2, 6); g.moveTo(10, -4); g.lineTo(10, 6); g.stroke();
  g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(20, -28, 1.8, 0, 6.28); g.fill();
  g.restore();
}

function chainHang(g: Ctx, x: number, y: number, n: number, R: () => number) {
  for (let i = 0; i < n; i++) {
    const face = i % 2 === 0, yy = y + i * 17, xx = x + Math.sin(i * 0.4 + x) * 3;
    g.lineWidth = 8; g.strokeStyle = '#03050b'; g.beginPath(); g.ellipse(xx, yy, face ? 8 : 4, 11, 0, 0, 6.28); g.stroke();
    const gr = g.createLinearGradient(xx - 8, 0, xx + 8, 0); gr.addColorStop(0, '#2c3650'); gr.addColorStop(0.4, '#b8c6e6'); gr.addColorStop(1, '#3a4562');
    g.lineWidth = 4; g.strokeStyle = gr; g.beginPath(); g.ellipse(xx, yy, face ? 8 : 4, 11, 0, 0, 6.28); g.stroke();
  }
  void R;
}

/** Moldura de primeiro plano (transparente no centro): ramos mortos, corvos, correntes, lanterna e vinheta. */
export function drawFrame(px = 1080): HTMLCanvasElement {
  const S = px / 720, [c, g] = canvas(px, Math.round(1280 * S));
  g.scale(S, S);
  const R = mkRnd(777);
  const rr = (a: number, b: number) => a + (b - a) * R();

  function branch(x: number, y: number, ang: number, len: number, w: number, depth: number) {
    if (depth <= 0 || w < 0.5) return;
    const segs = 7, pts: [number, number][] = [[x, y]];
    let cx = x, cy = y, a = ang;
    for (let i = 0; i < segs; i++) { a += rr(-0.34, 0.34); cx += Math.cos(a) * (len / segs); cy += Math.sin(a) * (len / segs); pts.push([cx, cy]); }
    for (let i = 0; i < segs; i++) {
      const lw = w * (1 - (i / segs) * 0.45);
      g.lineWidth = lw; g.strokeStyle = '#04060d'; g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke();
    }
    // luz fria de luar num dos lados
    g.strokeStyle = 'rgba(105,155,255,.5)'; g.lineWidth = Math.max(0.6, w * 0.22);
    g.beginPath(); pts.forEach(([px2, py2], i) => (i ? g.lineTo(px2 - w * 0.28, py2 - w * 0.28) : g.moveTo(px2 - w * 0.28, py2 - w * 0.28))); g.stroke();
    const [ex, ey] = pts[segs];
    const kids = depth > 2 ? 3 : 2;
    for (let k = 0; k < kids; k++) branch(ex, ey, a + rr(-0.9, 0.9), len * rr(0.55, 0.78), w * rr(0.5, 0.7), depth - 1);
    for (let k = 1; k < 4; k++) if (R() < 0.7) { const [mx, my] = pts[k * 2 > segs ? segs - 1 : k * 2]; branch(mx, my, a + (R() < 0.5 ? 1 : -1) * rr(0.5, 1.2), len * rr(0.35, 0.55), w * rr(0.35, 0.55), depth - 2); }
  }

  // troncos retorcidos nos cantos de cima, a avançar sobre o ecrã
  branch(-30, -20, 0.55, 330, 38, 7);
  branch(-40, 210, 0.2, 240, 28, 6);
  branch(750, -20, Math.PI - 0.5, 340, 40, 7);
  branch(760, 230, Math.PI - 0.15, 250, 28, 6);
  branch(-30, 1000, -0.35, 230, 30, 6);
  branch(750, 1010, Math.PI + 0.35, 230, 30, 6);

  // limpar o centro: os ramos ficam só nas margens
  g.globalCompositeOperation = 'destination-out';
  const clr = g.createRadialGradient(360, 640, 210, 360, 640, 470);
  clr.addColorStop(0, 'rgba(0,0,0,1)'); clr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = clr; g.fillRect(0, 0, 720, 1280);
  g.globalCompositeOperation = 'source-over';

  // correntes penduradas
  chainHang(g, 130, 150, 9, R); chainHang(g, 596, 130, 11, R);
  // lanterna acesa
  g.fillStyle = '#05070e'; g.fillRect(588, 292, 18, 6); g.fillRect(582, 346, 30, 8);
  g.strokeStyle = '#05070e'; g.lineWidth = 3; g.strokeRect(586, 298, 22, 48);
  const lg = g.createRadialGradient(597, 322, 2, 597, 322, 70); lg.addColorStop(0, 'rgba(255,200,110,.95)'); lg.addColorStop(0.3, 'rgba(255,130,40,.45)'); lg.addColorStop(1, 'rgba(255,80,20,0)');
  g.fillStyle = lg; g.beginPath(); g.arc(597, 322, 70, 0, 6.28); g.fill();
  g.fillStyle = '#ffe9b0'; g.beginPath(); g.ellipse(597, 326, 5, 11, 0, 0, 6.28); g.fill();

  // corvos pousados nos ramos
  corvo(g, 70, 296, 0.95, 1); corvo(g, 664, 420, 1.05, -1); corvo(g, 120, 760, 0.8, 1);
  // morcegos em voo
  g.fillStyle = '#03050b';
  for (const [bx, by, bs] of [[300, 90, 1], [420, 60, 0.7], [540, 210, 0.8]] as const) {
    g.save(); g.translate(bx, by); g.scale(bs, bs); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-14, -16, -34, -6); g.quadraticCurveTo(-24, 0, -20, 8); g.quadraticCurveTo(-12, 0, -6, 6); g.quadraticCurveTo(0, 2, 6, 6); g.quadraticCurveTo(12, 0, 20, 8); g.quadraticCurveTo(24, 0, 34, -6); g.quadraticCurveTo(14, -16, 0, 0); g.fill(); g.restore();
  }

  // vinheta pesada
  const v = g.createRadialGradient(360, 620, 280, 360, 640, 900);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.72)');
  g.fillStyle = v; g.fillRect(0, 0, 720, 1280);
  return c;
}

// ═════════════════════════ LOGÓTIPO ═════════════════════════
/** Texto em metal cromado com extrusão, brilho elétrico e riscos. 1440x420. */
export function drawChrome(text: string, w: number, h: number, fontPx: number, bolts = true, shape?: Path2D): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const R = mkRnd(31337);
  const FONT = `900 ${fontPx}px "Bebas Neue","Oswald",Impact,"Haettenschweiler","Arial Narrow Bold",sans-serif`;
  const ex = fontPx / 290;
  g.font = FONT; g.textBaseline = 'middle'; g.textAlign = 'center';
  /** pinta o texto, ou o caminho vetorial, deslocado de (dx, dy) */
  const fillAt = (ctx: Ctx, dx: number, dy: number) => { if (!shape) { ctx.fillText(text, dx, dy); return; } ctx.save(); ctx.translate(dx, dy); ctx.fill(shape, 'evenodd'); ctx.restore(); };
  const strokeAt = (ctx: Ctx, dx: number, dy: number) => { if (!shape) { ctx.strokeText(text, dx, dy); return; } ctx.save(); ctx.translate(dx, dy); ctx.lineJoin = 'round'; ctx.stroke(shape); ctx.restore(); };
  const tw = shape ? LOGO_W * (fontPx / 135) : g.measureText(text).width, sc = Math.min(1, (w - 150) / (tw + 30));
  const cx = w / 2 - 14, cy = h / 2 - 6;
  const skew = (ctx: Ctx) => { ctx.translate(cx, cy); ctx.transform(1, 0, -0.17, 1, 0, 0); ctx.scale(sc, sc); };

  // brilho elétrico por trás
  g.save(); skew(g); g.font = FONT; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.shadowColor = 'rgba(70,130,255,.95)'; g.shadowBlur = 55; g.fillStyle = '#0b1230';
  for (let i = 0; i < 2; i++) fillAt(g, 0, 0);
  g.restore();
  // extrusão (profundidade)
  g.save(); skew(g); g.font = FONT; g.textBaseline = 'middle'; g.textAlign = 'center';
  for (let i = 26; i >= 1; i--) { const t = i / 26; g.fillStyle = `rgb(${Math.round(24 + 26 * (1 - t))},${Math.round(26 + 24 * (1 - t))},${Math.round(44 + 36 * (1 - t))})`; fillAt(g, i * 0.95 * ex, i * 1.25 * ex); }
  g.lineWidth = 7; g.strokeStyle = '#03040a'; strokeAt(g, 26 * 0.95 * ex, 26 * 1.25 * ex);
  g.restore();
  // fuchsia na aresta inferior da extrusão
  g.save(); skew(g); g.font = FONT; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.shadowColor = '#e02bc0'; g.shadowBlur = 14; g.strokeStyle = 'rgba(224,43,192,.85)'; g.lineWidth = 2.5; strokeAt(g, 27 * 0.95 * ex, 27 * 1.25 * ex);
  g.restore();

  // face cromada, numa camada à parte para poder riscar
  const [fc, fg] = canvas(w, h);
  fg.save(); skew(fg); fg.font = FONT; fg.textBaseline = 'middle'; fg.textAlign = 'center';
  const gr = fg.createLinearGradient(0, -170 * ex, 0, 150 * ex);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.28, '#dbe6ff'); gr.addColorStop(0.46, '#8da2d6'); gr.addColorStop(0.5, '#1c264a'); gr.addColorStop(0.6, '#5d71aa'); gr.addColorStop(0.82, '#c4d2f4'); gr.addColorStop(1, '#6a77a3');
  fg.fillStyle = gr; fillAt(fg, 0, 0);
  fg.lineWidth = 6; fg.strokeStyle = '#02030a'; strokeAt(fg, 0, 0);
  fg.restore();
  fg.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 70; i++) { fg.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,.55)' : 'rgba(10,14,35,.5)'; fg.lineWidth = 0.8 + R() * 1.4; const x = R() * w, y = R() * h; fg.beginPath(); fg.moveTo(x, y); fg.lineTo(x + 20 + R() * 90, y - 4 + R() * 8); fg.stroke(); }
  for (let i = 0; i < 2600; i++) { fg.fillStyle = R() < 0.5 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.08)'; fg.fillRect(R() * w, R() * h, 1.6, 1.6); }
  fg.globalCompositeOperation = 'source-over';
  g.drawImage(fc, 0, 0);

  // brilho no topo das letras
  g.save(); skew(g); g.font = FONT; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 1.6; strokeAt(g, -1.5, -1.5);
  g.restore();

  // relâmpagos a rasgar o logótipo
  function bolt(x0: number, y0: number, x1: number, y1: number, jit: number) {
    const pts: [number, number][] = [[x0, y0]];
    for (let i = 1; i < 9; i++) { const t = i / 9, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, o = (R() - 0.5) * 2 * jit; pts.push([x0 + (x1 - x0) * t + (nx / l) * o, y0 + (y1 - y0) * t + (ny / l) * o]); }
    pts.push([x1, y1]);
    for (const [lw, col] of [[10, 'rgba(90,150,255,.25)'], [4.5, 'rgba(130,180,255,.7)'], [1.8, '#ffffff']] as const) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
  }
  if (bolts) { bolt(80, 40, 340, 210, 26); bolt(1380, 60, 1090, 250, 26); bolt(700, 12, 760, 120, 14); bolt(240, 400, 420, 330, 16); bolt(1180, 410, 1020, 330, 16); }
  return c;
}

/** O nome do jogo, em vetor (ver core/logo.ts). */
export function drawLogo(w = 1440, h = 420): HTMLCanvasElement {
  const fontPx = 290, k = fontPx / 135, shape = new Path2D();
  shape.addPath(new Path2D(logoPath()), new DOMMatrix().scale(k).translate(-LOGO_W / 2, -(LOGO_TOP + LOGO_H / 2)));
  return drawChrome('ÜLidÜLi', w, h, fontPx, true, shape);
}

// ═════════════════════════ PLACAS DE BOTÃO ═════════════════════════
/** Placa de metal rebitada e riscada. `hot`: aço em brasa, com línguas de fogo no topo. Devolve canvas com folga de 44 px em cima. */
export function drawPlate(w: number, h: number, hot: boolean, scale = 2, accent?: string): HTMLCanvasElement {
  const PAD = 44, [c, g] = canvas(Math.round(w * scale), Math.round((h + PAD) * scale));
  g.scale(scale, scale); g.translate(0, PAD);
  const R = mkRnd(w * 13 + h * 7 + (hot ? 99 : 0));
  const rr = (a: number, b: number) => a + (b - a) * R();
  const cut = Math.round(h * 0.34);
  const shape = (i: number) => { g.beginPath(); g.moveTo(i + cut, i); g.lineTo(w - i, i); g.lineTo(w - i, h - cut - i); g.lineTo(w - cut - i, h - i); g.lineTo(i, h - i); g.lineTo(i, cut + i); g.closePath(); };

  if (hot) {
    // línguas de fogo no topo
    for (let i = 0; i < 22; i++) {
      const x = rr(cut, w - 12), fh = rr(14, PAD - 4), fw = rr(8, 18);
      const gr = g.createLinearGradient(0, 0, 0, -fh); gr.addColorStop(0, 'rgba(255,120,30,.95)'); gr.addColorStop(0.6, 'rgba(255,70,120,.7)'); gr.addColorStop(1, 'rgba(255,40,200,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - fw, 4); g.quadraticCurveTo(x - fw * 0.2, -fh * 0.5, x + rr(-5, 5), -fh); g.quadraticCurveTo(x + fw * 0.3, -fh * 0.4, x + fw, 4); g.closePath(); g.fill();
    }
    const gl = g.createRadialGradient(w / 2, 0, 10, w / 2, 0, w * 0.55); gl.addColorStop(0, 'rgba(255,90,60,.4)'); gl.addColorStop(1, 'rgba(255,60,120,0)');
    g.fillStyle = gl; g.fillRect(0, -PAD, w, PAD + h);
  }

  // chapa
  shape(0);
  const base = g.createLinearGradient(0, 0, 0, h);
  if (hot) { base.addColorStop(0, '#3a2230'); base.addColorStop(0.5, '#20151f'); base.addColorStop(1, '#4a1d1f'); }
  else { base.addColorStop(0, '#323746'); base.addColorStop(0.5, '#1b1e28'); base.addColorStop(1, '#0f1118'); }
  g.fillStyle = base; g.fill();
  g.save(); shape(0); g.clip();
  // escovado
  for (let i = 0; i < 260; i++) { g.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.18)'; g.lineWidth = rr(0.5, 1.5); const y = rr(0, h); g.beginPath(); g.moveTo(rr(0, w), y); g.lineTo(rr(0, w), y + rr(-1, 1)); g.stroke(); }
  // riscos fundos
  for (let i = 0; i < 18; i++) { const x = rr(0, w), y = rr(0, h); g.strokeStyle = 'rgba(210,225,255,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-60, 60), y + rr(-14, 14)); g.stroke(); }
  // ferrugem e sangue seco
  for (let i = 0; i < 14; i++) { const x = rr(0, w), y = rr(0, h); const gr = g.createRadialGradient(x, y, 1, x, y, rr(10, 36)); gr.addColorStop(0, hot ? 'rgba(160,50,30,.35)' : 'rgba(120,70,35,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 40, 0, 6.28); g.fill(); }
  // brilho no topo e sombra em baixo (bisel)
  const bev = g.createLinearGradient(0, 0, 0, h); bev.addColorStop(0, 'rgba(255,255,255,.2)'); bev.addColorStop(0.12, 'rgba(255,255,255,0)'); bev.addColorStop(0.85, 'rgba(0,0,0,0)'); bev.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = bev; g.fillRect(0, 0, w, h);
  if (hot) { const heat = g.createLinearGradient(0, h, 0, h * 0.35); heat.addColorStop(0, 'rgba(255,90,40,.5)'); heat.addColorStop(1, 'rgba(255,60,120,0)'); g.fillStyle = heat; g.fillRect(0, 0, w, h); }
  g.restore();

  // contorno
  let st: string | CanvasGradient = g.createLinearGradient(0, 0, w, h); st.addColorStop(0, '#3b74f2'); st.addColorStop(0.55, '#8a4bea'); st.addColorStop(1, '#e02bc0');
  if (accent) st = accent;
  g.lineWidth = 6; g.strokeStyle = '#05060b'; shape(1); g.stroke();
  g.lineWidth = hot ? 4 : 3; g.strokeStyle = st; g.shadowColor = accent ?? (hot ? 'rgba(255,90,160,.9)' : 'rgba(80,130,255,.8)'); g.shadowBlur = hot ? 16 : 9; shape(3.5); g.stroke(); g.shadowBlur = 0;
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.25)'; shape(8); g.stroke();

  // rebites
  const rivet = (x: number, y: number, r: number) => {
    const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r); rg.addColorStop(0, '#e6edff'); rg.addColorStop(0.5, '#6d7894'); rg.addColorStop(1, '#161a26');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1; g.stroke();
  };
  for (const [x, y] of [[cut + 8, 16], [w - 16, 16], [16, h - 16], [w - cut - 8, h - 16], [16, cut + 6], [w - 16, h - cut - 6]] as const) rivet(x, y, hot ? 6 : 5);
  // espigões nos cantos
  g.fillStyle = '#9aa6c4'; g.strokeStyle = '#05060b'; g.lineWidth = 1.5;
  for (const [x, y, d] of [[w - 4, 4, 1], [w - 4, h - cut - 4, 1]] as const) { g.beginPath(); g.moveTo(x - 4, y - 5); g.lineTo(x + 18 * d, y + 2); g.lineTo(x - 4, y + 12); g.closePath(); g.fill(); g.stroke(); }
  // marcas técnicas
  g.fillStyle = '#ff4fd8'; g.fillRect(cut + 22, h - 13, 34, 3); g.fillStyle = '#5b92ff'; g.fillRect(cut + 60, h - 13, 12, 3);
  return c;
}

/** O herói (cabeça-chama) para ecrãs vazios. 400x520. */
export function drawFlameHero(): HTMLCanvasElement {
  const [c, g] = canvas(400, 520);
  const halo = g.createRadialGradient(200, 230, 10, 200, 230, 200); halo.addColorStop(0, 'rgba(255,150,60,.5)'); halo.addColorStop(1, 'rgba(255,90,40,0)'); g.fillStyle = halo; g.fillRect(0, 0, 400, 520);
  g.fillStyle = '#2b3a52'; g.beginPath(); g.moveTo(80, 520); g.bezierCurveTo(90, 400, 140, 370, 200, 370); g.bezierCurveTo(260, 370, 310, 400, 320, 520); g.closePath(); g.fill(); g.lineWidth = 5; g.strokeStyle = '#05070d'; g.stroke();
  g.fillStyle = '#f2b73c'; g.beginPath(); g.moveTo(135, 372); g.quadraticCurveTo(200, 412, 265, 372); g.lineTo(265, 400); g.quadraticCurveTo(200, 438, 135, 400); g.closePath(); g.fill(); g.stroke();
  const fl = g.createLinearGradient(0, 360, 0, 20); fl.addColorStop(0, '#ff6a14'); fl.addColorStop(0.6, '#ffa63a'); fl.addColorStop(1, '#ffe2a0');
  g.shadowColor = '#ff8a30'; g.shadowBlur = 30; g.fillStyle = fl;
  g.beginPath(); g.moveTo(206, 20); g.bezierCurveTo(226, 80, 290, 120, 290, 220); g.bezierCurveTo(290, 310, 250, 370, 200, 370); g.bezierCurveTo(150, 370, 110, 310, 110, 220); g.bezierCurveTo(110, 160, 150, 120, 176, 70); g.bezierCurveTo(184, 100, 196, 106, 206, 20); g.closePath(); g.fill();
  g.shadowBlur = 0; g.lineWidth = 4; g.strokeStyle = 'rgba(80,20,0,.7)'; g.stroke();
  g.fillStyle = '#fff1c4'; g.beginPath(); g.moveTo(202, 130); g.bezierCurveTo(222, 175, 256, 205, 256, 250); g.bezierCurveTo(256, 300, 232, 336, 200, 336); g.bezierCurveTo(168, 336, 144, 300, 144, 250); g.bezierCurveTo(144, 210, 176, 186, 190, 160); g.closePath(); g.fill();
  g.fillStyle = '#1a0c05'; for (const x of [172, 228]) { g.beginPath(); g.ellipse(x, 260, 15, 28, 0, 0, 6.28); g.fill(); }
  g.fillStyle = '#fff'; for (const x of [177, 233]) { g.beginPath(); g.arc(x, 249, 4.5, 0, 6.28); g.fill(); }
  return c;
}
