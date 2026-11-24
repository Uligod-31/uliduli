import * as THREE from 'three';
import { glowSprite, hdr, disposeTree } from './common';
import { makeUli, animateFlame } from './nightmare';

/**
 * O OLHO: ecrã inicial. Um olho colossal a flutuar no vazio. A íris é um labirinto circular de neon,
 * a pupila é um portal e o Uli percorre a íris até lá. O olho pisca, chora, segue o dedo e, ao tocar em
 * Jogar, a câmara mergulha pela pupila.
 */
const TAU = Math.PI * 2;
const RS = 6, ZC = -2.4;            // globo ocular (raio e centro em z)
const RL = 6.9;                      // pele das pálpebras (esfera um pouco maior)
const PR = 0.92, IR = 3.65, RD = 7;   // pupila, íris, curvatura da íris
const HW = 3.9, HU = 3.2, HL = 2.35, YC = -0.9;   // abertura: meia-largura, alturas, linha de fecho
const XO = 6.6, EYO = 6.0;           // extensão da pele (vai esbatendo para o vazio)
const CAM_D = 24;

const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function mulberry(a: number) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/** Ruído de valor 2D periódico em ambos os eixos (fx, fy células por textura). */
function pn(x: number, y: number, fx: number, fy: number, o = 0): number {
  const h = (i: number, j: number) => { let n = (((i % fx) + fx) % fx) * 374761393 + (((j % fy) + fy) % fy) * 668265263 + o * 2147483647; n = (n ^ (n >>> 13)) * 1274126177; return (((n ^ (n >>> 16)) >>> 0) % 10000) / 10000; };
  const X = x * fx, Y = y * fy, ix = Math.floor(X), iy = Math.floor(Y), u = X - ix, v = Y - iy, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  return (h(ix, iy) * (1 - su) + h(ix + 1, iy) * su) * (1 - sv) + (h(ix, iy + 1) * (1 - su) + h(ix + 1, iy + 1) * su) * sv;
}
function mkTex(c: HTMLCanvasElement, srgb: boolean, wrapX = false) {
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrapX) t.wrapS = THREE.RepeatWrapping;
  return t;
}
/** Mapa de normais a partir de um campo de alturas. */
function normalFrom(w: number, h: number, hf: (x: number, y: number) => number, k: number, wrapX = false): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!, im = g.createImageData(w, h);
  const hm = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) hm[y * w + x] = hf(x / w, y / h);
  const H = (x: number, y: number) => hm[Math.min(h - 1, Math.max(0, y)) * w + (wrapX ? (x + w) % w : Math.min(w - 1, Math.max(0, x)))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return c;
}

// ───────────── texturas ─────────────
function irisTextures() {
  const W = 1024, H = 256;
  // altura das fibras (periódica no ângulo)
  const fib = (u: number, v: number) => {
    const f = pn(u, v, 120, 5, 1) * 0.55 + pn(u, v, 40, 3, 2) * 0.3 + pn(u, v, 220, 9, 3) * 0.15;
    const crypt = pn(u, v, 18, 4, 4) > 0.72 ? -0.25 : 0;
    return Math.max(0, Math.min(1, f + crypt));
  };
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!, im = g.createImageData(W, H);
  const stops: [number, number, number, number][] = [
    [0, 255, 190, 80], [0.1, 255, 90, 200], [0.3, 200, 60, 230], [0.55, 110, 80, 240], [0.78, 50, 110, 245], [0.93, 14, 26, 90], [1, 4, 5, 26],
  ];
  const ramp = (f: number) => { for (let i = 1; i < stops.length; i++) if (f <= stops[i][0]) { const a = stops[i - 1], b = stops[i], k = (f - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k]; } return [4, 5, 26]; };
  for (let y = 0; y < H; y++) {
    const f = 1 - y / (H - 1);
    for (let x = 0; x < W; x++) {
      const [r, gg, b] = ramp(f), n = fib(x / W, f), k = 0.55 + n * 0.95, i = (y * W + x) * 4;
      im.data[i] = Math.min(255, r * k); im.data[i + 1] = Math.min(255, gg * k); im.data[i + 2] = Math.min(255, b * k); im.data[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return { map: mkTex(c, true, true), normal: mkTex(normalFrom(512, 128, (u, v) => fib(u, 1 - v), 3.2, true), false, true) };
}
function scleraTexture() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!;
  const bg = g.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S * 0.5);
  bg.addColorStop(0, '#f1eefc'); bg.addColorStop(0.45, '#d2c9ee'); bg.addColorStop(0.8, '#8a78bc'); bg.addColorStop(1, '#4a3a80');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  // manchas de cor
  const r = mulberry(5);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(190,120,200,${0.03 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * S, r() * S, 20 + r() * 60, 12 + r() * 30, r() * 3, 0, TAU); g.fill(); }
  // veias a partir dos cantos
  g.lineCap = 'round';
  const branch = (x: number, y: number, a: number, len: number, w: number, d: number) => {
    if (d > 3 || len < 8) return;
    g.strokeStyle = `rgba(230,60,150,${0.28 - d * 0.05})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(x, y);
    let cx = x, cy = y;
    for (let k = 0; k < 6; k++) { a += (r() - 0.5) * 0.7; cx += Math.cos(a) * len / 6; cy += Math.sin(a) * len / 6; g.lineTo(cx, cy); }
    g.stroke();
    branch(cx, cy, a + 0.5 * (r() < 0.5 ? 1 : -1), len * 0.6, w * 0.7, d + 1);
    if (r() < 0.7) branch(x + (cx - x) * 0.5, y + (cy - y) * 0.5, a - 0.6 + r() * 1.2, len * 0.5, w * 0.6, d + 1);
  };
  for (let i = 0; i < 11; i++) { branch(S * 0.04, S * (0.38 + r() * 0.24), -0.3 + r() * 0.6, 150 + r() * 90, 2.6, 0); branch(S * 0.96, S * (0.38 + r() * 0.24), Math.PI - 0.3 + r() * 0.6, 150 + r() * 90, 2.6, 0); }
  return mkTex(c, true);
}
function skinTextures() {
  const S = 512;
  const hf = (u: number, v: number) => {
    const crease = Math.sin((v * 22 + pn(u, v, 6, 6, 7) * 3) * TAU * 0.5);
    return Math.max(0, Math.min(1, 0.5 + crease * 0.18 + pn(u, v, 48, 48, 8) * 0.25 + pn(u, v, 12, 12, 9) * 0.2));
  };
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!, im = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const h = hf(x / S, y / S), i = (y * S + x) * 4, k = 0.55 + h * 0.9;
    im.data[i] = 46 * k; im.data[i + 1] = 28 * k; im.data[i + 2] = 78 * k; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const m = mkTex(c, true), n = mkTex(normalFrom(S, S, hf, 4.5, true), false);
  for (const t of [m, n]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.4, 1.1); }
  return { map: m, normal: n };
}

// ───────────── pálpebras (malha que se actualiza ao piscar) ─────────────
const edgeY = (x: number, side: 1 | -1, o: number) => {
  const ax = Math.abs(x);
  if (ax >= HW) return YC * 0 ;
  const s = Math.pow(Math.max(0, 1 - (x / HW) * (x / HW)), 0.82);
  const skew = 0.22 * (x / HW);
  return side > 0 ? s * (YC + (HU - YC) * o) + skew * s : s * (YC - (YC + HL) * o) + skew * s * 0.5;
};
class Lid {
  mesh: THREE.Mesh; rim: THREE.Mesh;
  private N = 64; private M = 10;
  private pos: Float32Array; private col: Float32Array; private rimPos: Float32Array;
  constructor(private side: 1 | -1, mat: THREE.Material, rimMat: THREE.Material) {
    const { N, M } = this;
    this.pos = new Float32Array((N + 1) * (M + 1) * 3);
    this.col = new Float32Array((N + 1) * (M + 1) * 4);
    const uv = new Float32Array((N + 1) * (M + 1) * 2), idx: number[] = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j <= M; j++) {
      const k = i * (M + 1) + j;
      if (i < N && j < M) { const a = k, b = k + M + 1, c = k + M + 2, d = k + 1; if (side > 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false;
    // fita luminosa ao longo da borda
    this.rimPos = new Float32Array((N + 1) * 2 * 3);
    const rg = new THREE.BufferGeometry(), ri: number[] = [];
    for (let i = 0; i < N; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; ri.push(a, b, c, b, d, c); }
    rg.setAttribute('position', new THREE.BufferAttribute(this.rimPos, 3)); rg.setIndex(ri);
    this.rim = new THREE.Mesh(rg, rimMat); this.rim.frustumCulled = false;
    this.update(1);
  }
  update(o: number) {
    const { N, M, side } = this;
    const uv = (this.mesh.geometry.attributes.uv as THREE.BufferAttribute);
    for (let i = 0; i <= N; i++) {
      const x = -XO + (2 * XO * i) / N;
      const e = edgeY(x, side, o);
      const yo = side * EYO * Math.sqrt(Math.max(0, 1 - (x / XO) * (x / XO)));
      for (let j = 0; j <= M; j++) {
        const t = Math.pow(j / M, 1.35), y = e + (yo - e) * t;
        const z = ZC + Math.sqrt(Math.max(0.01, RL * RL - x * x - y * y));
        const k = i * (M + 1) + j;
        this.pos[k * 3] = x; this.pos[k * 3 + 1] = y; this.pos[k * 3 + 2] = z;
        const rho = Math.hypot(x / XO, y / EYO);
        const a = 1 - sstep(0.84, 1.0, rho);
        const rimGlow = (1 - sstep(0, 0.22, t)) * 0.9;   // borda mais clara junto à abertura
        this.col[k * 4] = 1 + rimGlow * 0.5; this.col[k * 4 + 1] = 1 + rimGlow * 0.15; this.col[k * 4 + 2] = 1 + rimGlow * 0.9; this.col[k * 4 + 3] = a;
        uv.setXY(k, x / 11 + 0.5, y / 8 + 0.5);
      }
      // fita
      const tw = 0.1, nx = 0, z0 = ZC + Math.sqrt(Math.max(0.01, RL * RL - x * x - e * e)) + 0.025;
      const ya = e - side * 0.01, yb = e + side * tw * (1 - Math.pow(Math.abs(x) / HW, 6));
      const vis = Math.abs(x) < HW ? 1 : 0;
      this.rimPos.set([x, ya, z0, x, ya + (yb - ya) * vis, z0], i * 6);
      void nx;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
    uv.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.rim.geometry.attributes.position.needsUpdate = true;
  }
}


/** Faixa que segue a pálpebra (khol, linhas de ouro): fn(u, o) devolve x e as duas bordas em y. */
class Band {
  mesh: THREE.Mesh; private pos: Float32Array;
  constructor(private n: number, private fn: (u: number, o: number) => [number, number, number], mat: THREE.Material, private dz: number) {
    this.pos = new Float32Array((n + 1) * 2 * 3);
    const g = new THREE.BufferGeometry(), idx: number[] = [];
    for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.update(1);
  }
  update(o: number) {
    for (let i = 0; i <= this.n; i++) {
      const [x, ya, yb] = this.fn(i / this.n, o);
      const za = ZC + Math.sqrt(Math.max(0.01, RL * RL - x * x - ya * ya)) + this.dz, zb = ZC + Math.sqrt(Math.max(0.01, RL * RL - x * x - yb * yb)) + this.dz;
      this.pos.set([x, ya, za, x, yb, zb], i * 6);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}
/** Fita estática sobre a pele: pontos (x,y) com largura que afina. */
function ribbon(pts: THREE.Vector2[], w: (t: number) => number, mat: THREE.Material, dz: number): THREE.Mesh {
  const n = pts.length, pos = new Float32Array(n * 2 * 3), idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l, hw = w(i / (n - 1)) / 2;
    for (const [k, sgn] of [[0, 1], [1, -1]] as const) {
      const x = pts[i].x + nx * hw * sgn, y = pts[i].y + ny * hw * sgn;
      pos.set([x, y, ZC + Math.sqrt(Math.max(0.01, RL * RL - x * x - y * y)) + dz], (i * 2 + k) * 3);
    }
    if (i < n - 1) { const a2 = i * 2; idx.push(a2, a2 + 1, a2 + 2, a2 + 1, a2 + 3, a2 + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m;
}

// ───────────── labirinto polar (com um caminho garantido) ─────────────
function makeMaze(seed: number) {
  const R = mulberry(seed);
  const rc = (c: number) => PR + 0.32 + (c - 1) * (IR - 0.32 - PR - 0.3) / 4;       // raio do círculo c (1..5)
  const gaps = [0, 0.4, 2.5, 4.7, 1.3, 3.4];
  const arc = (a: number, b: number) => { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
  // caminho: da periferia, pelos buracos, até à pupila
  const pts: { r: number; a: number }[] = [{ r: IR - 0.14, a: gaps[5] }];
  const mid = (c: number) => (rc(c) + rc(c + 1)) / 2;
  for (let c = 5; c >= 1; c--) {
    pts.push({ r: rc(c), a: gaps[c] });                     // atravessa o círculo c pelo buraco
    if (c > 1) {                                            // anda pelo corredor entre c-1 e c até ao buraco de c-1
      const m = mid(c - 1), d = arc(gaps[c], gaps[c - 1]), steps = Math.max(2, Math.ceil(Math.abs(d) / 0.12));
      pts.push({ r: m, a: gaps[c] });
      for (let s = 1; s <= steps; s++) pts.push({ r: m, a: gaps[c] + d * (s / steps) });
    }
  }
  pts.push({ r: PR + 0.14, a: gaps[1] });
  const corr: [number, number][] = [];   // intervalos angulares ocupados por corredor (c-1)
  const interval = (c: number) => { const a0 = gaps[c], d = arc(gaps[c], gaps[c - 1]); return [a0, d] as const; };
  const blocked = (c: number, a: number) => { // c = corredor entre c e c+1 → caminho vai de gaps[c+1] até gaps[c]
    const [a0, d] = interval(c + 1);
    let x = arc(a0, a); if (d >= 0) return x > -0.14 && x < d + 0.14; return x < 0.14 && x > d - 0.14;
  };
  // paredes
  type Wall = { r: number; a: number; len: number; radial: boolean };
  const walls: Wall[] = [];
  for (let c = 1; c <= 5; c++) {
    const r = rc(c), n = 40 + c * 14, half = 0.27 / r;
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * TAU;
      if (Math.abs(arc(gaps[c], a)) < half + 0.5 * TAU / n) continue;
      walls.push({ r, a, len: (TAU / n) * r * 1.06, radial: false });
    }
  }
  for (let c = 1; c <= 4; c++) {       // corredor entre c e c+1: paredes radiais aleatórias, fora do caminho
    const n = 12 + c * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + R() * 0.2;
      if (R() < 0.55 || blocked(c, a)) continue;
      walls.push({ r: (rc(c) + rc(c + 1)) / 2, a, len: rc(c + 1) - rc(c), radial: true });
    }
  }
  return { pts, walls };
}
const domeZ = (r: number) => (3.62 - ZC) - (r * r) / (2 * RD);

// ───────────── o olho ─────────────
export class EyeTitle {
  group = new THREE.Group();
  env: THREE.Texture;
  private ball = new THREE.Group();
  private iris = new THREE.Group();
  private mazePivot = new THREE.Group();
  private mazeIn = new THREE.Group();
  private wallData: { base: THREE.Vector3; q: THREE.Quaternion; nrm: THREE.Vector3; len: number; r: number; thick: number }[] = [];
  private wallBody!: THREE.InstancedMesh;
  private gear = new THREE.Group();
  private sparks!: THREE.InstancedMesh;
  private sparkData: { c: number; a: number; v: number }[] = [];
  private shockT = -1;
  private shockedCycle = -1;
  private wallTop!: THREE.InstancedMesh;
  private upper: Lid; private lower: Lid;
  private lashesU: THREE.InstancedMesh; private lashesL: THREE.InstancedMesh;
  private uli = makeUli();
  private trailGeo: THREE.TubeGeometry;
  private pathLen = 1;
  private path: THREE.Vector3[] = [];
  private pathCum: number[] = [];
  private pupilMat: THREE.ShaderMaterial;
  private rings: THREE.Mesh[] = [];
  private moons: { m: THREE.Mesh; ring: number; ph: number; sp: number }[] = [];
  private debris: THREE.InstancedMesh;
  private debrisData: { r: number; a: number; y: number; s: number; v: number }[] = [];
  private tear: THREE.Mesh;
  private tearT = -1;
  private dust: THREE.Points;
  private halo: THREE.Sprite;
  private light = new THREE.PointLight(0xff4fd8, 0, 40, 2);
  private t = 0;
  private blinkAt = 2.4; private blinkT = -1; private double = false;
  private look = new THREE.Vector2(); private lookT = new THREE.Vector2(); private idle = true; private idleT = 0;
  private walkS = 0;
  private dive = -1; private diveCb?: () => void;
  private flash = 0;
  /** tempo desde a primeira pintura (0..1) para a entrada */
  private intro = 0;
  onFlash?: (a: number) => void;
  private tmpV = new THREE.Vector3(); private tmpQ = new THREE.Quaternion(); private tmpQ2 = new THREE.Quaternion(); private tmpM = new THREE.Matrix4();
  private open = 1;
  private goldMat!: THREE.MeshBasicMaterial;
  private bands: Band[] = [];

  constructor(renderer: THREE.WebGLRenderer) {
    const R = mulberry(77);
    this.group.add(this.ball);
    this.ball.position.z = ZC;

    // ambiente: caixas de luz suaves (reflexos no globo e na córnea)
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(30, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0a0618, side: THREE.BackSide })));
    const box = (c: number, k: number, w: number, h: number, p: [number, number, number]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: hdr(c, k), side: THREE.DoubleSide }));
      m.position.set(...p); m.lookAt(0, 0, 0); envScene.add(m);
    };
    box(0xdfe8ff, 7, 14, 6, [-14, 14, 14]); box(0xff4fd8, 5, 6, 16, [16, -2, 8]); box(0x5b92ff, 4, 16, 4, [0, -16, 10]); box(0xffffff, 3, 3, 3, [8, 12, 18]);
    const pm = new THREE.PMREMGenerator(renderer);
    this.env = pm.fromScene(envScene, 0.03).texture; pm.dispose();
    envScene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });

    // globo ocular
    const sg = new THREE.SphereGeometry(RS, 96, 48, 0, TAU, 0, Math.asin(4.7 / RS)); sg.rotateX(Math.PI / 2);
    const p = sg.attributes.position, uvA = sg.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) uvA.setXY(i, p.getX(i) / 9.6 + 0.5, p.getY(i) / 9.6 + 0.5);
    const sclera = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({ map: scleraTexture(), roughness: 0.34, clearcoat: 0.85, clearcoatRoughness: 0.12, envMapIntensity: 1.1 }));
    sclera.position.z = -0.95; this.ball.add(sclera);
    // saia da íris: esconde o vão entre a íris e o globo
    const skirt = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(IR - 0.02, domeZ(IR)), new THREE.Vector2(IR + 0.5, domeZ(IR) - 1.05)], 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a2a8a, emissive: 0x241a70, emissiveIntensity: 0.6, roughness: 0.6, side: THREE.DoubleSide }));
    this.ball.add(skirt);

    // íris (ring em cúpula) + fibras + relevo
    const IT = irisTextures();
    const RN = 30, SG = 128, vtx: number[] = [], uvs: number[] = [], idx: number[] = [];
    for (let i = 0; i <= RN; i++) for (let j = 0; j <= SG; j++) {
      const r = PR + (IR - PR) * (i / RN), a = (j / SG) * TAU;
      vtx.push(Math.cos(a) * r, Math.sin(a) * r, domeZ(r)); uvs.push(j / SG, i / RN);
      if (i < RN && j < SG) { const k = i * (SG + 1) + j; idx.push(k, k + 1, k + SG + 1, k + 1, k + SG + 2, k + SG + 1); }
    }
    const ig = new THREE.BufferGeometry();
    ig.setAttribute('position', new THREE.Float32BufferAttribute(vtx, 3)); ig.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); ig.setIndex(idx); ig.computeVertexNormals();
    const irisMesh = new THREE.Mesh(ig, new THREE.MeshStandardMaterial({ map: IT.map, normalMap: IT.normal, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.5, metalness: 0.15, emissive: 0xffffff, emissiveMap: IT.map, emissiveIntensity: 0.16, side: THREE.DoubleSide }));
    this.ball.add(this.iris); this.iris.add(irisMesh);

    // pupila-portal
    this.pupilMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      uniforms: { time: { value: 0 }, glow: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float time; uniform float glow; varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
          float sp = sin(a * 3.0 + 9.0 * log(r + 0.03) - time * 2.2);
          float arm = smoothstep(0.62, 1.0, sp) * smoothstep(1.0, 0.25, r);
          vec3 col = mix(vec3(0.0), mix(vec3(1.7, 0.35, 1.6), vec3(0.4, 0.8, 2.2), r), arm);
          col += vec3(2.6, 1.4, 2.6) * smoothstep(0.05 + 0.05 * glow, 0.0, r) * (0.1 + glow);
          col += vec3(1.8, 0.8, 1.8) * smoothstep(0.05, 0.0, abs(r - 0.94)) * (0.6 + glow);
          float al = smoothstep(1.02, 0.94, r);
          gl_FragColor = vec4(col, al);
        }`,
    });
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(PR * 1.03, 48), this.pupilMat);
    pupil.position.z = domeZ(PR) - 0.4; this.iris.add(pupil);
    const pg = glowSprite(0xff4fd8, 2.2, 0.1); pg.position.z = domeZ(PR) + 0.1; this.iris.add(pg);

    // córnea (vidro)
    const cg = new THREE.SphereGeometry(4.4, 64, 24, 0, TAU, 0, Math.asin(4.05 / 4.4)); cg.rotateX(Math.PI / 2); cg.translate(0, 0, -0.5 - ZC);
    const cornea = new THREE.Mesh(cg, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 3.2, depthWrite: false }));
    cornea.renderOrder = 3; this.ball.add(cornea);

    // labirinto 3D sobre a íris
    const mz = makeMaze(31);
    const wallH = 0.36, thick = 0.075;
    const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1a2fa0, metalness: 0.3, roughness: 0.4, emissive: 0x0e1f70, emissiveIntensity: 0.5 }), mz.walls.length);
    const top = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), mz.walls.length);
    const cF = new THREE.Color(), cB = new THREE.Color();
    mz.walls.forEach((w, k) => {
      const x = Math.cos(w.a) * w.r, y = Math.sin(w.a) * w.r, z = domeZ(w.r), phi = Math.atan(w.r / RD);
      this.tmpQ.setFromAxisAngle(new THREE.Vector3(-Math.sin(w.a), Math.cos(w.a), 0), phi);
      this.tmpQ2.setFromAxisAngle(new THREE.Vector3(0, 0, 1), w.a + (w.radial ? 0 : Math.PI / 2));
      const q = this.tmpQ.clone().multiply(this.tmpQ2);
      const nrm = new THREE.Vector3(Math.sin(phi) * Math.cos(w.a), Math.sin(phi) * Math.sin(w.a), Math.cos(phi));
      this.wallData.push({ base: new THREE.Vector3(x, y, z), q, nrm, len: w.len, r: w.r, thick });
      this.tmpM.compose(new THREE.Vector3(x, y, z).addScaledVector(nrm, wallH / 2), q, new THREE.Vector3(w.len, thick, wallH)); body.setMatrixAt(k, this.tmpM);
      this.tmpM.compose(new THREE.Vector3(x, y, z).addScaledVector(nrm, wallH + 0.005), q, new THREE.Vector3(w.len, thick * 1.05, 0.03)); top.setMatrixAt(k, this.tmpM);
      top.setColorAt(k, (R() < 0.5 ? cF.set(0xff4fd8).multiplyScalar(1.9) : cB.set(0x7aa8ff).multiplyScalar(1.8)));
    });
    this.wallBody = body; this.wallTop = top;
    body.frustumCulled = top.frustumCulled = false;
    this.mazeIn.add(body, top);

    // caminho (rasto) e Uli
    this.path = mz.pts.map((q) => new THREE.Vector3(Math.cos(q.a) * q.r, Math.sin(q.a) * q.r, domeZ(q.r) + 0.03));
    const curve = new THREE.CatmullRomCurve3(this.path, false, 'centripetal');
    this.trailGeo = new THREE.TubeGeometry(curve, 420, 0.03, 5, false);
    const trail = new THREE.Mesh(this.trailGeo, new THREE.MeshBasicMaterial({ color: hdr(0xff4fd8, 2.4), toneMapped: false }));
    this.mazeIn.add(trail);
    this.pathCum = [0]; for (let i = 1; i < this.path.length; i++) this.pathCum.push(this.pathCum[i - 1] + this.path[i].distanceTo(this.path[i - 1]));
    this.pathLen = this.pathCum[this.pathCum.length - 1];
    this.uli.scale.setScalar(0.82); this.mazeIn.add(this.uli);
    // engrenagem dourada no limbo da íris, a rodar ao contrário do labirinto
    const NT = 56, gearM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NT);
    const gcol = new THREE.Color();
    for (let i = 0; i < NT; i++) {
      const a = (i / NT) * TAU, r = IR - 0.06, phi = Math.atan(r / RD), big = i % 2 === 0;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-Math.sin(a), Math.cos(a), 0), phi).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a));
      this.tmpM.compose(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, domeZ(r) + 0.07), q, new THREE.Vector3(big ? 0.3 : 0.17, 0.09, 0.12));
      gearM.setMatrixAt(i, this.tmpM); gearM.setColorAt(i, big ? gcol.set(0xffc65a).multiplyScalar(1.6) : gcol.set(0xff4fd8).multiplyScalar(1.5));
    }
    gearM.frustumCulled = false; this.gear.add(gearM); this.iris.add(this.gear);
    // faíscas a correr pelos corredores, cada anel num sentido
    const NS = 44;
    this.sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NS);
    for (let i = 0; i < NS; i++) {
      const c = 1 + (i % 5);
      this.sparkData.push({ c, a: R() * TAU, v: (c % 2 ? 1 : -1) * (0.35 + R() * 0.55) / (0.6 + c * 0.25) });
      this.sparks.setColorAt(i, i % 3 === 0 ? gcol.set(0xffd98a).multiplyScalar(2.4) : i % 3 === 1 ? gcol.set(0xff4fd8).multiplyScalar(2.2) : gcol.set(0x7aa8ff).multiplyScalar(2.2));
    }
    this.sparks.frustumCulled = false; this.mazeIn.add(this.sparks);
    // o labirinto roda e passeia em 3D à volta do seu centro (pivô no meio da íris)
    const zc = domeZ(1.8);
    this.mazePivot.position.z = zc; this.mazeIn.position.z = -zc; this.mazePivot.add(this.mazeIn); this.iris.add(this.mazePivot);

    // pálpebras
    const skin = skinTextures();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: skin.map, normalMap: skin.normal, normalScale: new THREE.Vector2(0.45, 0.45), vertexColors: true, transparent: true, roughness: 0.55, metalness: 0.08, envMapIntensity: 0.8, side: THREE.DoubleSide, depthWrite: true, alphaTest: 0.02 });
    const rimMat = new THREE.MeshBasicMaterial({ color: hdr(0xff4fd8, 2.0), toneMapped: false, side: THREE.DoubleSide });
    this.upper = new Lid(1, skinMat, rimMat); this.lower = new Lid(-1, skinMat, rimMat);
    this.group.add(this.upper.mesh, this.lower.mesh, this.upper.rim, this.lower.rim);

    // pestanas
    const lg = new THREE.ConeGeometry(0.05, 1, 5).translate(0, 0.5, 0);
    const lm = new THREE.MeshStandardMaterial({ color: 0x07040f, roughness: 0.4, metalness: 0.2, emissive: 0x280a30, emissiveIntensity: 0.6 });
    this.lashesU = new THREE.InstancedMesh(lg, lm, 24); this.lashesL = new THREE.InstancedMesh(lg, lm, 12);
    this.lashesU.frustumCulled = this.lashesL.frustumCulled = false;
    const lc = new THREE.Color();
    for (let i = 0; i < 24; i++) this.lashesU.setColorAt(i, i % 5 === 2 ? lc.set(0xff4fd8).multiplyScalar(1.6) : lc.set(0xffffff));
    for (let i = 0; i < 12; i++) this.lashesL.setColorAt(i, lc.set(0xffffff));
    this.lashesU.visible = this.lashesL.visible = false;
    this.group.add(this.lashesU, this.lashesL);


    // ── traços egípcios, à nossa maneira: khol com asa, sobrancelha de glifos-labirinto, linha e espiral por baixo ──
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x06030c, roughness: 0.22, metalness: 0.65, envMapIntensity: 1.6, side: THREE.DoubleSide });
    this.goldMat = new THREE.MeshBasicMaterial({ color: hdr(0xffc65a, 1.9), toneMapped: false, side: THREE.DoubleSide });
    const neonMat = new THREE.MeshBasicMaterial({ color: hdr(0xff4fd8, 1.8), toneMapped: false, side: THREE.DoubleSide });
    const WX = 6.5;
    const kohl = (u: number, o: number): [number, number, number] => {
      const x = -HW - 0.12 + u * (WX + HW + 0.12);
      if (x <= HW) { const e = edgeY(x, 1, o), q = Math.max(0, 1 - (x / HW) * (x / HW)); return [x, e - 0.04, e + 0.16 + 0.34 * Math.pow(q, 0.6)]; }
      const k = (x - HW) / (WX - HW), y = -0.15 - 1.05 * Math.pow(k, 1.15), th = 0.2 * (1 - Math.pow(k, 1.4)) + 0.015;
      return [x, y - th / 2, y + th / 2];
    };
    const kb = new Band(90, kohl, blackMat, 0.03);
    const kg = new Band(90, (u, o) => { const r = kohl(u, o); return [r[0], r[2], r[2] + 0.05]; }, this.goldMat, 0.045);
    const low = new Band(60, (u, o) => { const x = -HW + u * 2 * HW, e = edgeY(x, -1, o); return [x, e - 0.2 * Math.pow(Math.max(0, 1 - (x / HW) * (x / HW)), 0.5) - 0.03, e - 0.02]; }, blackMat, 0.03);
    this.bands = [kb, kg, low];
    this.group.add(kb.mesh, kg.mesh, low.mesh);
    // sobrancelha: arco largo, com friso de paredes-de-labirinto por baixo
    const browY = (x: number) => 3.8 + 0.7 * (1 - (x / 5.2) * (x / 5.2)) - 0.35 * Math.pow(Math.abs(x) / 5.2, 3);
    const brow: THREE.Vector2[] = [];
    for (let i = 0; i <= 60; i++) { const x = -4.9 + 9.8 * i / 60; brow.push(new THREE.Vector2(x, browY(x))); }
    this.group.add(ribbon(brow, (t) => 0.34 * Math.sin(Math.PI * t) + 0.08, blackMat, 0.03));
    this.group.add(ribbon(brow.map((p) => new THREE.Vector2(p.x, p.y + 0.24)), (t) => 0.05 * Math.sin(Math.PI * t) + 0.01, this.goldMat, 0.05));
    const glyph = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 26);
    const gc = new THREE.Color();
    for (let i = 0; i < 26; i++) {
      const x = -4.3 + 8.6 * i / 25, y = browY(x) - 0.42, z = ZC + Math.sqrt(RL * RL - x * x - y * y) + 0.05;
      const horiz = i % 3 === 1, L = 0.16 + ((i * 7) % 4) * 0.07;
      this.tmpM.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.35 * (x / 5))), horiz ? new THREE.Vector3(L * 1.6, 0.05, 0.02) : new THREE.Vector3(0.05, L, 0.02));
      glyph.setMatrixAt(i, this.tmpM); glyph.setColorAt(i, i % 2 ? gc.set(0x7aa8ff).multiplyScalar(1.8) : gc.set(0xff4fd8).multiplyScalar(1.8));
    }
    this.group.add(glyph);
    // linha que desce do olho e acaba numa espiral (o labirinto em miniatura)
    const spi: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) spi.push(new THREE.Vector2(0.75, -2.7 - 0.7 * i / 14));
    const cx = 0.75 + 0.6, cy = -3.4, TT = 3.6 * Math.PI;
    for (let i = 1; i <= 90; i++) { const th = TT * i / 90, r = 0.6 - 0.48 * th / TT; spi.push(new THREE.Vector2(cx - Math.cos(th) * r, cy - Math.sin(th) * r)); }
    this.group.add(ribbon(spi, (t) => 0.2 - 0.07 * t, blackMat, 0.03), ribbon(spi, (t) => 0.07 - 0.03 * t, this.goldMat, 0.05));
    // cauda curva do lado oposto, a acabar num ponto
    const tl: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; tl.push(new THREE.Vector2(-1.5 - 1.6 * t - 0.5 * t * t, -2.55 - 1.0 * t + 0.35 * Math.sin(t * Math.PI))); }
    this.group.add(ribbon(tl, (t) => 0.2 * (1 - t) + 0.03, blackMat, 0.03), ribbon(tl, (t) => 0.06 * (1 - t) + 0.01, neonMat, 0.05));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), neonMat); dot.position.set(-3.6, -3.55, ZC + Math.sqrt(RL * RL - 3.6 * 3.6 - 3.55 * 3.55) + 0.1); this.group.add(dot);

    // lágrima
    this.tear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.7, roughness: 0.05, emissive: 0x3a78c8, emissiveIntensity: 0.6, envMapIntensity: 2.5, clearcoat: 1 }));
    this.tear.visible = false; this.group.add(this.tear);

    // vazio: halo, estrelas, órbitas com luas, detritos, poeira da pupila
    this.halo = glowSprite(0xe02bc0, 30, 0.34); this.halo.position.z = -5; this.group.add(this.halo);
    const halo2 = glowSprite(0x3b74f2, 44, 0.22); halo2.position.set(-3, 3, -14); this.group.add(halo2);
    const sp = new Float32Array(520 * 3), sc = new Float32Array(520 * 3);
    for (let i = 0; i < 520; i++) {
      const a = R() * TAU, b = (R() - 0.5) * 2.2, rr = 38 + R() * 40;
      sp.set([Math.cos(a) * rr * 0.9, b * 24, -14 - Math.abs(Math.sin(a)) * rr * 0.6 - 4], i * 3);
      const k = 0.5 + R() * 0.8; const c = R() < 0.18 ? [1, 0.3, 0.85] : R() < 0.4 ? [0.4, 0.6, 1] : [0.85, 0.9, 1];
      sc.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
    }
    const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sgm.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    this.group.add(new THREE.Points(sgm, new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true, toneMapped: false })));
    const ringCols = [0x8a4bea, 0x3b74f2, 0xe02bc0];
    [9.6, 11.4, 13.4].forEach((rad, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.022, 6, 160), new THREE.MeshBasicMaterial({ color: hdr(ringCols[i], 1.7), transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false }));
      m.rotation.set(1.18 + i * 0.05, 0.08 * (i - 1), -0.14 + i * 0.07); m.position.z = -1; this.group.add(m); this.rings.push(m);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.2 + i * 0.05, 14, 10), new THREE.MeshBasicMaterial({ color: hdr(i % 2 ? 0x7aa8ff : 0xff4fd8, 2.2), toneMapped: false }));
      moon.add(glowSprite(i % 2 ? 0x5b92ff : 0xff4fd8, 2.2, 0.7)); this.group.add(moon);
      this.moons.push({ m: moon, ring: i, ph: R() * TAU, sp: 0.16 + i * 0.05 });
    });
    const rock = new THREE.IcosahedronGeometry(1, 0);
    this.debris = new THREE.InstancedMesh(rock, new THREE.MeshStandardMaterial({ color: 0x2a2146, roughness: 0.8, flatShading: true, emissive: 0x1a0f40, emissiveIntensity: 0.5 }), 26);
    for (let i = 0; i < 26; i++) this.debrisData.push({ r: 8 + R() * 8, a: R() * TAU, y: (R() - 0.5) * 7, s: 0.07 + R() * 0.2, v: 0.03 + R() * 0.09 });
    this.group.add(this.debris);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.1, color: hdr(0xff9af0, 1.3), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.dust.frustumCulled = false; this.ball.add(this.dust);

    // luzes
    const key = new THREE.DirectionalLight(0xdfe8ff, 1.5); key.position.set(-8, 10, 14); this.group.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xff4fd8, 1.1); rim.position.set(12, -4, 6); this.group.add(rim);
    const blue = new THREE.DirectionalLight(0x5b92ff, 0.7); blue.position.set(0, -10, 8); this.group.add(blue);
    this.light.position.set(0, 0, 5); this.group.add(this.light);
    this.group.add(new THREE.HemisphereLight(0x8a7ad8, 0x180a30, 0.3));
  }

  /** Olhar para (x, y) em -1..1 (ecrã). */
  setLook(x: number, y: number) { this.lookT.set(x, y); this.idle = false; this.idleT = 0; }
  /** Pisca já (ex.: ao tocar). */
  blink() { if (this.blinkT < 0) this.blinkT = 0; }
  startDive(cb: () => void) { if (this.dive >= 0) return; this.dive = 0; this.diveCb = cb; this.blinkT = -1; }
  get diving() { return this.dive >= 0; }

  update(dt: number, camera: THREE.PerspectiveCamera, pulse: number) {
    this.t += dt; const t = this.t;
    this.intro = Math.min(1, this.intro + dt / 1.8);
    // olhar: segue o dedo; sem toque, passeia o olhar devagar
    this.idleT += dt; if (this.idleT > 6) this.idle = true;
    if (this.idle) this.lookT.set(Math.sin(t * 0.37) * 0.55, Math.sin(t * 0.23 + 1) * 0.3);
    this.look.lerp(this.lookT, 1 - Math.exp(-dt * 4));
    this.ball.rotation.y = this.look.x * 0.30; this.ball.rotation.x = this.look.y * 0.24;
    this.ball.rotation.z = Math.sin(t * 0.3) * 0.02;
    this.iris.rotation.z = t * 0.035;
    // labirinto: rotação própria + inclinação 3D + translação suave, e uma onda a subir pelos anéis
    const mp = this.mazePivot;
    mp.rotation.set(Math.sin(t * 0.5) * 0.09 + this.look.y * 0.05, Math.cos(t * 0.41) * 0.09 - this.look.x * 0.05, t * 0.16);
    mp.position.x = Math.sin(t * 0.7) * 0.14; mp.position.y = Math.cos(t * 0.53) * 0.11; mp.position.z = domeZ(1.8) + Math.sin(t * 0.9) * 0.12;
    this.waveWalls(t, pulse);
    this.gear.rotation.z = -t * 0.32;
    for (let i = 0; i < this.sparkData.length; i++) {
      const d = this.sparkData[i], r = PR + 0.32 + (d.c - 1) * (IR - 0.32 - PR - 0.3) / 4 + ((d.c % 2) ? 0.19 : -0.19), a = d.a + d.v * t;
      this.tmpV.set(Math.cos(a) * r, Math.sin(a) * r, domeZ(r) + 0.2 + 0.05 * Math.sin(t * 5 + i));
      this.tmpM.compose(this.tmpV, this.tmpQ.identity(), new THREE.Vector3(1, 1, 1)); this.sparks.setMatrixAt(i, this.tmpM);
    }
    this.sparks.instanceMatrix.needsUpdate = true;
    if (this.shockT >= 0) { this.shockT += dt; if (this.shockT > 1.6) this.shockT = -1; }

    // piscar
    this.blinkAt -= dt;
    if (this.blinkT < 0 && this.blinkAt <= 0 && this.dive < 0) { this.blinkT = 0; this.double = Math.random() < 0.3; this.blinkAt = 3 + Math.random() * 3.6; }
    let o = 1;
    if (this.blinkT >= 0) {
      this.blinkT += dt; const d = 0.3, u = this.blinkT / d;
      o = u < 0.4 ? 1 - sstep(0, 0.4, u) : sstep(0.4, 1, u);
      if (u >= 1) { this.blinkT = -1; if (this.double) { this.double = false; this.blinkAt = 0.12; } }
    }
    const breathe = 0.97 + 0.03 * Math.sin(t * 1.3);
    const wide = this.dive >= 0 ? Math.min(1.15, 1 + this.dive * 0.4) : 1;
    this.open += ((Math.max(0.03, o * breathe * wide) - this.open) * (1 - Math.exp(-dt * 40)));
    this.upper.update(this.open); this.lower.update(this.open);
    for (const b of this.bands) b.update(this.open);
    this.goldMat.color.copy(hdr(0xffc65a, 1.6 + 1.1 * pulse + 0.3 * Math.sin(t * 2)));

    // pestanas

    // Uli percorre a íris; no fim mergulha na pupila e recomeça
    const speed = 1.15, cycle = this.pathLen / speed + 2.4;
    const ct = (t * 1 + 1.2) % cycle, walking = ct < this.pathLen / speed, s = walking ? ct * speed : this.pathLen;
    const p = this.pointAt(s), p2 = this.pointAt(Math.min(this.pathLen, s + 0.05));
    const fin = walking ? 0 : Math.min(1, (ct - this.pathLen / speed) / 1.2);
    const rr = Math.hypot(p.x, p.y), phi = Math.atan(rr / RD), ang = Math.atan2(p.y, p.x);
    this.tmpQ.setFromAxisAngle(this.tmpV.set(-Math.sin(ang), Math.cos(ang), 0), phi);
    const dx = p2.x - p.x, dy = p2.y - p.y;
    // a íris roda, mas o Uli está no referencial dela: o rumo vem só do caminho
    const th = Math.atan2(dx, -dy);
    this.tmpQ2.setFromAxisAngle(new THREE.Vector3(0, 0, 1), th);
    const q3 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    this.uli.quaternion.copy(this.tmpQ).multiply(this.tmpQ2).multiply(q3);
    this.uli.position.copy(p).setZ(p.z - 0.03 + fin * 0.4);
    this.uli.scale.setScalar(0.82 * (1 - fin));
    this.uli.visible = fin < 0.99;
    const cyc = Math.floor((t + 1.2) / cycle);
    if (!walking && fin > 0.9 && this.shockedCycle !== cyc) { this.shockedCycle = cyc; this.shockT = 0; }
    const U = this.uli.userData, sw = Math.sin(t * 9) * 0.85 * (walking ? 1 : 0);
    (U.legL as THREE.Object3D).rotation.x = sw; (U.legR as THREE.Object3D).rotation.x = -sw;
    (U.armL as THREE.Object3D).rotation.x = -sw * 0.9; (U.armR as THREE.Object3D).rotation.x = sw * 0.9;
    (U.body as THREE.Object3D).position.y = Math.abs(Math.sin(t * 9)) * 0.05 * (walking ? 1 : 0);
    animateFlame(U.head as THREE.Object3D, t, walking ? 0.8 : 0, 0, fin);
    // rasto até onde o Uli chegou
    const total = this.trailGeo.index!.count;
    this.trailGeo.setDrawRange(0, Math.max(0, Math.floor((s / this.pathLen) * (total / 30)) * 30));
    this.pupilMat.uniforms.time.value = t;
    this.pupilMat.uniforms.glow.value = Math.min(1.5, fin * 1.6 + pulse * 0.6 + (this.dive >= 0 ? this.dive * 2 : 0));
    this.light.intensity = 4 + 14 * pulse + fin * 60;

    // lágrima
    if (this.tearT < 0 && Math.random() < dt / 7 && this.dive < 0) { this.tearT = 0; this.tear.visible = true; }
    if (this.tearT >= 0) {
      this.tearT += dt; const u = this.tearT / 2.6;
      const x = 1.7, y0 = edgeY(x, -1, this.open) - 0.06, y = y0 - (u * u) * 5.2 - u * 0.4;
      this.tear.position.set(x, y, ZC + Math.sqrt(RL * RL - x * x - y * y) + 0.05);
      this.tear.scale.set(0.8 + Math.min(1, u * 3) * 0.2, 1 + u * 1.3, 0.8); this.tear.visible = u < 1;
      (this.tear.material as THREE.MeshPhysicalMaterial).opacity = 0.7 * (1 - sstep(0.7, 1, u));
      if (u >= 1) this.tearT = -1;
    }

    // luas, detritos, pó
    for (const m of this.moons) {
      const rg = this.rings[m.ring], rad = (rg.geometry as THREE.TorusGeometry).parameters.radius, a = m.ph + t * m.sp;
      this.tmpV.set(Math.cos(a) * rad, Math.sin(a) * rad, 0).applyEuler(rg.rotation).add(rg.position); m.m.position.copy(this.tmpV);
    }
    this.debrisData.forEach((d, i) => {
      const a = d.a + t * d.v; this.tmpM.compose(new THREE.Vector3(Math.cos(a) * d.r, d.y + Math.sin(t * 0.4 + i) * 0.3, Math.sin(a) * d.r * 0.55 - 3), this.tmpQ.setFromEuler(new THREE.Euler(t * 0.2 + i, t * 0.15, i)), new THREE.Vector3(d.s, d.s, d.s)); this.debris.setMatrixAt(i, this.tmpM);
    });
    this.debris.instanceMatrix.needsUpdate = true;
    const dp = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < 60; i++) {
      const ph = (t * 0.25 + i / 60) % 1, a = i * 2.399 + t * 0.2, r0 = PR * (0.2 + 0.8 * ((i * 7) % 10) / 10);
      dp.setXYZ(i, Math.cos(a) * (r0 + ph * 0.5), Math.sin(a) * (r0 + ph * 0.5), domeZ(PR) - 0.2 + ph * 3.2);
    }
    dp.needsUpdate = true;
    this.halo.material.opacity = 0.3 + 0.12 * pulse;

    // câmara: respira; no mergulho voa pela pupila
    const asp = camera.aspect, d = CAM_D * (asp > 0.62 ? 0.95 : 1.17) * (1.12 - 0.12 * this.intro);
    let fov = 40;
    const ty = 0.55;
    if (this.dive < 0) {
      camera.position.set(Math.sin(t * 0.3) * 0.5 - this.look.x * 0.5, Math.cos(t * 0.23) * 0.3 + this.look.y * 0.3 + ty * 0, d);
      camera.lookAt(0, ty, 0);
    } else {
      this.dive += dt / 1.15; const u = Math.min(1, this.dive), e = u * u * u;
      const target = this.ball.localToWorld(new THREE.Vector3(0, 0, domeZ(PR) - 0.4));
      camera.position.set(THREE.MathUtils.lerp(0, target.x, e), THREE.MathUtils.lerp(0, target.y, e), THREE.MathUtils.lerp(d, target.z + 0.3, e));
      camera.lookAt(THREE.MathUtils.lerp(0, target.x, e), THREE.MathUtils.lerp(ty, target.y, e), THREE.MathUtils.lerp(0, target.z - 2, e));
      fov = 40 + 80 * e;
      this.flash = sstep(0.78, 1, u);
      if (u >= 1 && this.diveCb) { const cb = this.diveCb; this.diveCb = undefined; cb(); }
    }
    this.onFlash?.(this.flash);
    camera.fov = fov - 1.2 * pulse; camera.updateProjectionMatrix();
  }

  private waveWalls(t: number, pulse: number) {
    const base = 0.36;
    for (let i = 0; i < this.wallData.length; i++) {
      const d = this.wallData[i], bump = this.shockT >= 0 ? 1.4 * Math.exp(-Math.pow(d.r - (0.9 + this.shockT * 3.2), 2) * 3) * (1 - this.shockT / 1.6) : 0;
      const h = base * (1 + 0.4 * Math.sin(t * 1.7 - d.r * 2.6) + 0.3 * pulse + bump);
      this.tmpV.copy(d.base).addScaledVector(d.nrm, h / 2);
      this.tmpM.compose(this.tmpV, d.q, new THREE.Vector3(d.len, d.thick, h)); this.wallBody.setMatrixAt(i, this.tmpM);
      this.tmpV.copy(d.base).addScaledVector(d.nrm, h + 0.005);
      this.tmpM.compose(this.tmpV, d.q, new THREE.Vector3(d.len, d.thick * 1.05, 0.03)); this.wallTop.setMatrixAt(i, this.tmpM);
    }
    this.wallBody.instanceMatrix.needsUpdate = true; this.wallTop.instanceMatrix.needsUpdate = true;
  }
  private placeLashes(im: THREE.InstancedMesh, side: 1 | -1, n: number, o: number, len: number) {
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = -HW * 0.94 + u * HW * 1.88;
      const e = edgeY(x, side, o), e2 = edgeY(x + 0.05, side, o), slope = (e2 - e) / 0.05;
      const dir = new THREE.Vector3(-slope * 0.6 + (u - 0.5) * 1.1, side, 0.35).normalize();
      const L = (0.28 + Math.sin(u * Math.PI) * 0.55) * len * (0.8 + 0.4 * ((i * 37) % 7) / 7);
      const z = ZC + Math.sqrt(Math.max(0.01, RL * RL - x * x - e * e)) + 0.03;
      this.tmpQ.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.tmpM.compose(new THREE.Vector3(x, e, z), this.tmpQ, new THREE.Vector3(1, L, 1)); im.setMatrixAt(i, this.tmpM);
    }
    im.instanceMatrix.needsUpdate = true;
  }
  private pointAt(s: number): THREE.Vector3 {
    const c = this.pathCum; let i = 1; while (i < c.length - 1 && c[i] < s) i++;
    const k = Math.min(1, Math.max(0, (s - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1])));
    return this.tmpV.clone().lerpVectors(this.path[i - 1], this.path[i], k);
  }

  dispose() {
    this.env.dispose();
    disposeTree(this.group);
  }
}
