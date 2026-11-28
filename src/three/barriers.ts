// Barreiras de sopro (Chama Viva): heras, gelo, runa e gás. Cada uma tem o seu desenho, um sinal por cima
// (para se ver de longe que dá para soprar), um aro quando o Uli está encostado e a sua forma de desaparecer.
import * as THREE from 'three';
import { Maze } from '../core/maze';
import { mulberry32 } from '../core/rng';
import { glowSprite, hdr } from './common';

type CellPos = (i: number, out?: THREE.Vector3) => THREE.Vector3;

export interface BarrierFx {
  group: THREE.Group;
  update(dt: number, t: number): void;
  burn(k: number): void;
  near(k: number): void;              // destaca a barreira a que o Uli está encostado (-1 = nenhuma)
  puddle(cell: number): void;         // gelo derretido
}

const H = 0.56; // um nada mais alta que as paredes, para se distinguir
const SIGN: Record<string, number> = { heras: 0x6ee87a, gelo: 0x8fdcff, runa: 0xa98bff, gas: 0xc8ff3a };

interface Item {
  root: THREE.Group; body: THREE.Group; sign: THREE.Group; frame: THREE.Mesh; kind: string;
  mats: THREE.Material[]; burn: number; ph: number; anim?: (t: number) => void;
}

function vines(it: Item, rng: () => number) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: 0.9, emissive: 0x163d0c, emissiveIntensity: 0.6, transparent: true });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x5ad04a, roughness: 0.75, emissive: 0x2a8a1c, emissiveIntensity: 0.55, transparent: true, side: THREE.DoubleSide });
  const berry = new THREE.MeshBasicMaterial({ color: hdr(0xff4fd8, 1.7), toneMapped: false, transparent: true });
  for (let v = 0; v < 6; v++) {
    const pts: THREE.Vector3[] = [], y0 = 0.06 + (v / 6) * (H - 0.1), ph = rng() * 6;
    for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3(-0.5 + k / 6, y0 + Math.sin(k * 1.7 + ph) * 0.12, Math.cos(k * 2.1 + ph) * 0.09));
    it.body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 26, 0.026, 6), wood));
  }
  const lg = new THREE.SphereGeometry(0.092, 8, 6).scale(1, 0.34, 0.78);
  for (let k = 0; k < 64; k++) {
    const m = new THREE.Mesh(lg, leaf);
    m.position.set(-0.47 + rng() * 0.94, 0.05 + rng() * H, (rng() - 0.5) * 0.34); m.rotation.set(rng() * 3, rng() * 3, rng() * 3); it.body.add(m);
  }
  const bg = new THREE.SphereGeometry(0.036, 10, 8);
  for (let k = 0; k < 7; k++) { const m = new THREE.Mesh(bg, berry); m.position.set(-0.42 + rng() * 0.84, 0.14 + rng() * (H - 0.14), (rng() < 0.5 ? -1 : 1) * 0.19); it.body.add(m); }
  it.mats.push(wood, leaf, berry);
}

function iceWall(it: Item, rng: () => number) {
  const ice = new THREE.MeshStandardMaterial({ color: 0xaeeaff, roughness: 0.08, metalness: 0.1, emissive: 0x1e7fd0, emissiveIntensity: 0.75, transparent: true, opacity: 0.74 });
  const edge = new THREE.LineBasicMaterial({ color: hdr(0xeaffff, 1.8), toneMapped: false, transparent: true });
  const slab = new THREE.BoxGeometry(0.94, H * 0.82, 0.2).translate(0, H * 0.41, 0);
  it.body.add(new THREE.Mesh(slab, ice), new THREE.LineSegments(new THREE.EdgesGeometry(slab), edge));
  for (let k = 0; k < 6; k++) {
    const h = 0.14 + rng() * 0.2, c = new THREE.Mesh(new THREE.ConeGeometry(0.06 + rng() * 0.03, h, 6), ice);
    c.position.set(-0.4 + k * 0.16, H * 0.82 + h / 2 - 0.02, (rng() - 0.5) * 0.08); c.rotation.z = (rng() - 0.5) * 0.35; it.body.add(c);
  }
  it.mats.push(ice, edge);
}

let _glyph: THREE.CanvasTexture | undefined;
function glyphTexture() {
  if (_glyph) return _glyph;
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 256, 160);
  gr.addColorStop(0, '#5b92ff'); gr.addColorStop(0.55, '#b48cff'); gr.addColorStop(1, '#ff4fd8');
  g.strokeStyle = gr; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#a46bff'; g.shadowBlur = 18;
  g.beginPath(); g.arc(128, 80, 50, 0, 6.283); g.stroke();
  g.beginPath(); g.moveTo(128, 18); g.lineTo(128, 142); g.moveTo(94, 52); g.lineTo(128, 82); g.lineTo(162, 52); g.moveTo(104, 112); g.lineTo(152, 112); g.stroke();
  for (const x of [36, 220]) { g.beginPath(); g.moveTo(x, 34); g.lineTo(x - 16, 70); g.lineTo(x + 14, 92); g.lineTo(x - 6, 128); g.stroke(); }
  _glyph = new THREE.CanvasTexture(c); _glyph.colorSpace = THREE.SRGBColorSpace;
  return _glyph;
}

function runeWall(it: Item) {
  const stone = new THREE.MeshStandardMaterial({ color: 0x232433, roughness: 0.85, emissive: 0x241a52, emissiveIntensity: 0.7, transparent: true });
  const glyph = new THREE.MeshBasicMaterial({ map: glyphTexture(), color: new THREE.Color(1.7, 1.7, 1.7), toneMapped: false, transparent: true, depthWrite: false });
  it.body.add(new THREE.Mesh(new THREE.BoxGeometry(0.94, H, 0.2).translate(0, H / 2, 0), stone));
  const face = new THREE.PlaneGeometry(0.84, H * 0.94).translate(0, H / 2, 0);
  const f = new THREE.Mesh(face, glyph); f.position.z = 0.106;
  const b = new THREE.Mesh(face, glyph); b.position.z = -0.106; b.rotation.y = Math.PI;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.14).rotateX(-Math.PI / 2), glyph); top.position.y = H + 0.004;
  it.body.add(f, b, top);
  it.mats.push(stone, glyph);
  it.anim = (t) => { const k = 1.35 + 0.55 * Math.sin(t * 2.6 + it.ph); if (!it.burn) glyph.color.setRGB(k, k, k); };
}

function gasWall(it: Item, rng: () => number) {
  const tank = new THREE.MeshStandardMaterial({ color: 0x3a3d2a, roughness: 0.55, metalness: 0.45, emissive: 0x2a3a00, emissiveIntensity: 0.8, transparent: true });
  const band = new THREE.MeshBasicMaterial({ color: hdr(0xd8ff3a, 1.5), toneMapped: false, transparent: true });
  const barrel = new THREE.CylinderGeometry(0.14, 0.14, H * 0.8, 16).translate(0, H * 0.4, 0);
  const ring = new THREE.TorusGeometry(0.143, 0.014, 8, 20).rotateX(Math.PI / 2);
  for (const x of [-0.31, 0, 0.31]) {
    const g = new THREE.Group(); g.position.set(x, 0, (rng() - 0.5) * 0.05);
    g.add(new THREE.Mesh(barrel, tank));
    for (const y of [0.2, 0.7]) { const r = new THREE.Mesh(ring, band); r.position.y = H * 0.8 * y; g.add(r); }
    it.body.add(g);
  }
  const puffs: THREE.Sprite[] = [];
  for (let k = 0; k < 6; k++) { const s = glowSprite(0x9ad81a, 0.4, 0.5); s.position.set(-0.4 + rng() * 0.8, H * 0.8, (rng() - 0.5) * 0.2); puffs.push(s); it.body.add(s); it.mats.push(s.material); }
  it.mats.push(tank, band);
  it.anim = (t) => puffs.forEach((s, k) => { const u = (t * 0.45 + k / 6 + it.ph) % 1; s.position.y = H * 0.7 + u * 0.45; s.scale.setScalar(0.24 + u * 0.32); if (!it.burn) s.material.opacity = 0.55 * (1 - u); });
}

export function buildBarrierFx(m: Maze, cellPos: CellPos): BarrierFx {
  const group = new THREE.Group();
  const rng = mulberry32(m.start * 53 + m.exit * 17 + 11);
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const items: Item[] = m.barriers!.map((bar, k) => {
    cellPos(bar.a, a); cellPos(bar.b, b);
    const root = new THREE.Group(), body = new THREE.Group(), sign = new THREE.Group();
    root.position.addVectors(a, b).multiplyScalar(0.5);
    if (bar.dir === 1) root.rotation.y = Math.PI / 2;
    const color = SIGN[bar.kind];
    // sinal: um losango que paira, com halo
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.135).scale(1, 1.4, 1), new THREE.MeshBasicMaterial({ color: hdr(color, 2), toneMapped: false }));
    sign.add(gem, glowSprite(color, 0.95, 0.8)); sign.position.y = H + 0.52;
    // aro no chão dos dois lados, quando se pode soprar
    const frame = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.64, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: hdr(color, 1.6), transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }));
    frame.position.y = 0.06; frame.renderOrder = 3; frame.scale.set(1, 1, 0.8);
    root.add(body, sign, frame); group.add(root);
    const it: Item = { root, body, sign, frame, kind: bar.kind, mats: [], burn: bar.open ? 9 : 0, ph: k * 1.7 + rng(), };
    if (bar.kind === 'heras') vines(it, rng); else if (bar.kind === 'gelo') iceWall(it, rng); else if (bar.kind === 'runa') runeWall(it); else gasWall(it, rng);
    return it;
  });
  let nearK = -1;
  const puddles: THREE.Mesh[] = [];
  return {
    group,
    near(k) { nearK = k; },
    burn(k) { const it = items[k]; if (it && !it.burn) { it.burn = 0.0001; it.sign.visible = false; it.frame.visible = false; } },
    puddle(cell) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.4, 30).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1f7fd8, roughness: 0.05, metalness: 0.3, emissive: 0x0b3f8a, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, depthWrite: false }));
      cellPos(cell, p.position); p.position.y = 0.035; p.scale.setScalar(0.05); puddles.push(p); group.add(p);
    },
    update(dt, t) {
      for (const p of puddles) { const s = p.scale.x + (1 - p.scale.x) * Math.min(1, dt * 4); p.scale.set(s, 1, s * 0.86); }
      items.forEach((it, k) => {
        if (it.burn > 1.2) { it.root.visible = false; return; }
        it.anim?.(t);
        if (!it.burn) {
          it.sign.position.y = H + 0.52 + Math.sin(t * 2.4 + it.ph) * 0.05; it.sign.rotation.y = t * 1.6 + it.ph;
          const on = k === nearK;
          it.sign.scale.setScalar(on ? 1.15 + 0.12 * Math.sin(t * 8) : 1);
          (it.frame.material as THREE.MeshBasicMaterial).opacity = on ? 0.55 + 0.35 * Math.sin(t * 7) : 0;
          return;
        }
        it.burn += dt;
        const u = Math.min(1, it.burn / (it.kind === 'gas' ? 0.35 : 0.9));
        const fade = Math.max(0, 1 - u);
        if (it.kind === 'gas') it.body.scale.setScalar(1 + u * 0.9);                      // explode
        else if (it.kind === 'runa') it.body.position.y = -u * u * (H + 0.1);             // afunda-se, acesa
        else if (it.kind === 'gelo') it.body.scale.set(1 + u * 0.12, Math.max(0.02, fade), 1 + u * 0.5); // derrete
        else it.body.scale.set(1 - u * 0.25, Math.max(0.02, 1 - u * u), 1 - u * 0.4);     // arde e murcha
        for (const mat of it.mats) {
          (mat as THREE.Material & { opacity: number }).opacity = it.kind === 'runa' ? 1 - u * 0.6 : fade;
          const s = mat as THREE.MeshStandardMaterial;
          if (it.kind === 'heras' && s.emissive) { s.emissive.setRGB(1.6 * (1 - u), 0.45 * (1 - u), 0.03); s.color.multiplyScalar(1 - dt * 2.5); }
          if (it.kind === 'runa' && (mat as THREE.MeshBasicMaterial).map) (mat as THREE.MeshBasicMaterial).color.setScalar(1.5 + 3 * Math.sin(u * Math.PI));
        }
        if (u >= 1) it.burn = 2;
      });
    },
  };
}
