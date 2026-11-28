// Ecrã inicial «Sistema Uli»: os mundos são planetas-labirinto em órbita de um sol-labirinto, e o Uli salta entre eles.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowSprite, glowTexture, hdr } from './common';
import { makeUli, animateFlame } from './nightmare';
import { makeFlame } from './actors';
import { mulberry32 } from '../core/rng';
import { brandAt } from '../core/theme';

/** Cores de cada planeta: [chão, paredes, luz do topo das paredes]. */
const LOOK: Record<string, [number, number, number]> = {
  egipto: [0xc9964a, 0x7a5224, 0x2fe6d0], b612: [0x8a7a66, 0x4c453c, 0xffd27a], jardim: [0x3a7a34, 0x1c4a20, 0xff9ae0],
  demoniaco: [0x2c0c10, 0x5a1c18, 0xff6a14], glaciar: [0x78bce8, 0xdcf2ff, 0xffffff], relogio: [0x7a5a28, 0x4a3414, 0xffc24a],
  biblioteca: [0x6a3c24, 0x38200e, 0xffd9a0], elfico: [0x1c5c3c, 0x0c3020, 0xa8ff70], viking: [0x34465e, 0x1c2638, 0xff8a30],
  mandala: [0xd08418, 0x80420a, 0xfff1b0], tinta: [0x1a4ca0, 0x0a2254, 0x44e0ff], neon: [0x1c0c46, 0x32166a, 0xff2bd6],
  galactico: [0x2c2c70, 0x181840, 0x39f2d0], estelar: [0x141e5c, 0x0a1034, 0xffe08a], angelico: [0xdcd8f4, 0xa898d8, 0xffd86b],
  animal: [0xb08c38, 0x4c7024, 0x7be08f], rockstar: [0x241a2e, 0x3c2040, 0xff2b8a],
};
const R = 0.54;

/** Chão do planeta: manchas suaves na cor do mundo. */
function groundTexture(color: number, seed: number) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d')!, r = mulberry32(seed), base = new THREE.Color(color);
  g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 160; i++) {
    const k = base.clone().offsetHSL((r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.22);
    g.fillStyle = '#' + k.getHexString(); g.globalAlpha = 0.55;
    const x = r() * 256, y = r() * 128, w = 4 + r() * 22;
    for (const ox of [-256, 0, 256]) { g.beginPath(); g.ellipse(x + ox, y, w, w * (0.35 + r() * 0.4), r() * 3, 0, 6.29); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/** Labirinto verdadeiro enrolado numa esfera (árvore de passagens numa grelha latitude × longitude), em paredes 3D. */
function mazeSphere(seed: number) {
  const LA = 7, LO = 14, r = mulberry32(seed), open = new Set<number>(), seen = new Set([0]), st = [0];
  const key = (a: number, b: number) => Math.min(a, b) * 1000 + Math.max(a, b);
  while (st.length) {
    const c = st[st.length - 1], y = (c / LO) | 0, x = c % LO;
    const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([, j]) => j >= 0 && j < LA).map(([i, j]) => j * LO + ((i + LO) % LO)).filter((n) => !seen.has(n));
    if (!nb.length) { st.pop(); continue; }
    const n = nb[(r() * nb.length) | 0]; open.add(key(c, n)); seen.add(n); st.push(n);
  }
  const lat = (j: number) => -1.2 + (2.4 * j) / LA, lon = (i: number) => (i / LO) * Math.PI * 2;
  const segs: [number, number, number, number][] = [];
  for (let j = 0; j < LA; j++) for (let i = 0; i < LO; i++) {
    const c = j * LO + i;
    if (!open.has(key(c, j * LO + ((i + 1) % LO)))) segs.push([lat(j), lon(i + 1), lat(j + 1), lon(i + 1)]);
    if (j + 1 < LA && !open.has(key(c, c + LO))) segs.push([lat(j + 1), lon(i), lat(j + 1), lon(i + 1)]);
  }
  for (let i = 0; i < LO; i++) { segs.push([lat(0), lon(i), lat(0), lon(i + 1)]); segs.push([lat(LA), lon(i), lat(LA), lon(i + 1)]); }
  const point = (la: number, lo: number, h: number) => new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)).multiplyScalar(h);
  const walls: THREE.BufferGeometry[] = [], tops: THREE.BufferGeometry[] = [];
  const M = new THREE.Matrix4();
  for (const [a1, o1, a2, o2] of segs) {
    for (let s = 0; s < 3; s++) {
      const p = point(a1 + (a2 - a1) * s / 3, o1 + (o2 - o1) * s / 3, 1), q = point(a1 + (a2 - a1) * (s + 1) / 3, o1 + (o2 - o1) * (s + 1) / 3, 1);
      const mid = p.clone().add(q).normalize(), along = q.clone().sub(p), len = along.length() * R;
      along.normalize(); const side = new THREE.Vector3().crossVectors(along, mid).normalize();
      M.makeBasis(along, mid, side);
      const wall = new THREE.BoxGeometry(len + R * 0.04, R * 0.09, R * 0.045); wall.applyMatrix4(M.clone().setPosition(mid.clone().multiplyScalar(R * 1.035))); walls.push(wall);
      const top = new THREE.BoxGeometry(len + R * 0.02, R * 0.012, R * 0.018); top.applyMatrix4(M.clone().setPosition(mid.clone().multiplyScalar(R * 1.086))); tops.push(top);
    }
  }
  const spots = Array.from({ length: 4 }, () => point(lat(1 + r() * (LA - 2)), r() * Math.PI * 2, R * 1.1));
  const out = { walls: mergeGeometries(walls, false)!, tops: mergeGeometries(tops, false)!, spots };
  walls.forEach((x) => x.dispose()); tops.forEach((x) => x.dispose());
  return out;
}

interface Planet { id: string; g: THREE.Group; spin: THREE.Group; ring: number; phase: number; scale: number }

export class OrbitTitle {
  group = new THREE.Group();
  background = new THREE.Color(0x07070f);
  private planets: Planet[] = [];
  private uli = makeUli();
  private sun = new THREE.Group();
  private sunRings: THREE.Mesh[] = [];
  private stars: THREE.Points;
  private sparks: THREE.Points;
  private sparkP: { v: THREE.Vector3; life: number }[] = [];
  private sparkI = 0;
  private marker: THREE.Mesh;
  private t = 0;
  private cur = 0;
  private from = 0;
  private u = 1;           // 0..1 do salto
  private wait = 2.4;
  private land = 9;
  private diveT = -1;
  private diveCb?: () => void;
  private look = new THREE.Vector2();
  private tiltV = new THREE.Vector2();
  private tmp = new THREE.Vector3();
  /** avisa quando o Uli escolhe outro planeta */
  onSelect?: (i: number) => void;
  onFlash?: (a: number) => void;

  constructor(readonly ids: string[]) {
    const inner = Math.min(6, Math.floor(ids.length * 0.36));
    ids.forEach((id, i) => {
      const [ground, wall, light] = LOOK[id] ?? [0x556070, 0x303844, 0x5b92ff];
      const g = new THREE.Group(), spin = new THREE.Group();
      const m = mazeSphere(31 + i * 17);
      const body = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), new THREE.MeshStandardMaterial({ map: groundTexture(ground, i * 7 + 2), roughness: 0.75, emissive: new THREE.Color(ground), emissiveIntensity: 0.18 }));
      spin.add(body,
        new THREE.Mesh(m.walls, new THREE.MeshStandardMaterial({ color: wall, roughness: 0.6, emissive: new THREE.Color(wall), emissiveIntensity: 0.22 })),
        new THREE.Mesh(m.tops, new THREE.MeshBasicMaterial({ color: hdr(light, id === 'glaciar' || id === 'angelico' ? 1.1 : 1.6), toneMapped: false })));
      // chamas com olhos escondidas em alguns planetas
      if (i % 3 === 0) { const f = makeFlame(0); f.scale.setScalar(0.28); const p = m.spots[0]; f.position.copy(p); f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize()); spin.add(f); }
      const halo = glowSprite(light, R * 3.6, 0.3); halo.renderOrder = -1;
      g.add(halo, spin);
      if (id === 'mandala' || id === 'galactico') for (let k = 0; k < 2; k++) { const rr = new THREE.Mesh(new THREE.TorusGeometry(R * (1.45 + k * 0.2), R * 0.025, 6, 80), new THREE.MeshBasicMaterial({ color: hdr(k ? 0xff4fd8 : light, 1.4), toneMapped: false })); rr.rotation.set(1.25, 0.3, 0); g.add(rr); }
      spin.rotation.z = (i % 5 - 2) * 0.14;
      const ring = i < inner ? 0 : 1, count = ring ? ids.length - inner : inner, k = ring ? i - inner : i;
      this.planets.push({ id, g, spin, ring, phase: (k / count) * Math.PI * 2 + (ring ? 0.35 : 0), scale: 1 });
      this.group.add(g);
    });

    // sol-labirinto: núcleo de luz com arcos concêntricos a rodar
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), new THREE.MeshBasicMaterial({ color: hdr(0xffd9a0, 2.2), toneMapped: false }));
    this.sun.add(core, glowSprite(0xff7ad8, 3.4, 0.75), glowSprite(0x5b92ff, 5.2, 0.35));
    for (let i = 0; i < 4; i++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.22, 0.032, 8, 90, Math.PI * (1.35 + (i % 2) * 0.35)), new THREE.MeshBasicMaterial({ color: hdr(brandAt(i / 3), 2.0), toneMapped: false }));
      arc.rotation.x = -Math.PI / 2; this.sunRings.push(arc); this.sun.add(arc);
    }
    this.group.add(this.sun);
    // órbitas ponteadas
    for (const ring of [0, 1]) {
      const [rx, rz] = this.radii(ring), pts: THREE.Vector3[] = [];
      for (let a = 0; a < 160; a++) pts.push(new THREE.Vector3(Math.cos((a / 160) * 6.2832) * rx, -0.05, Math.sin((a / 160) * 6.2832) * rz));
      this.group.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: 0x8a6aea, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false })));
    }
    // estrelas
    const r = mulberry32(404), sp: number[] = [];
    for (let i = 0; i < 900; i++) { const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(40 + r() * 40); sp.push(v.x, v.y, v.z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 0.22, transparent: true, opacity: 0.85, depthWrite: false }));
    this.group.add(this.stars);
    for (const [x, y, z, col, s] of [[-14, -4, -22, 0x3b2a9a, 26], [16, -8, -18, 0x7a1a6a, 22], [2, -14, -12, 0x14306a, 24]] as const) { const n = glowSprite(col, s, 0.5); n.position.set(x, y, z); this.group.add(n); }
    // faíscas do salto
    const N = 220, pos = new Float32Array(N * 3).fill(999), col = new Float32Array(N * 3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.sparks = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.2, map: glowTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.sparks.frustumCulled = false; this.group.add(this.sparks);
    for (let i = 0; i < N; i++) this.sparkP.push({ v: new THREE.Vector3(), life: 0 });
    // aro sob o planeta escolhido
    this.marker = new THREE.Mesh(new THREE.TorusGeometry(R * 1.55, 0.028, 8, 70), new THREE.MeshBasicMaterial({ color: hdr(0x5b92ff, 2.2), toneMapped: false }));
    this.marker.rotation.x = Math.PI / 2; this.group.add(this.marker);
    this.uli.scale.setScalar(0.92);
    (this.uli.userData.shadow as THREE.Mesh).visible = false;
    this.group.add(this.uli);
    this.group.add(new THREE.HemisphereLight(0xcfd8ff, 0x3a1a4a, 1.5));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.0); key.position.set(-4, 8, 7); this.group.add(key);
    const core2 = new THREE.PointLight(0xffb0e0, 14, 14, 1.4); core2.position.y = 0.6; this.group.add(core2);
  }

  private radii(ring: number): [number, number] { return ring ? [2.9, 4.15] : [1.72, 2.3]; }

  reset() { this.diveT = -1; this.diveCb = undefined; this.u = 1; this.wait = 2.4; this.land = 9; this.onSelect?.(this.cur); }
  get selected() { return this.cur; }

  /** O Uli salta para o planeta i. */
  jump(i: number, hold = 3.6) {
    const n = this.planets.length; i = ((i % n) + n) % n;
    this.wait = hold;
    if (this.u < 1 || i === this.cur || this.diveT >= 0) return;
    this.from = this.cur; this.cur = i; this.u = 0; this.onSelect?.(i);
  }
  step(d: number) { this.jump(this.cur + d, 7); }

  /** Toque no ecrã (coordenadas -1..1): escolhe o planeta mais próximo do dedo. */
  tap(nx: number, ny: number, camera: THREE.Camera) {
    let best = -1, bd = 0.17;
    this.planets.forEach((p, i) => {
      this.tmp.copy(p.g.position).project(camera);
      const d = Math.hypot(this.tmp.x - nx, (this.tmp.y - ny) * 1.5);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) this.jump(best, 7);
  }
  lookAt(x: number, y: number) { this.look.set(x, y); }
  tilt(gamma: number, beta: number) { this.tiltV.set(Math.max(-1, Math.min(1, gamma / 30)), Math.max(-1, Math.min(1, (beta - 45) / 30))); }
  /** «Jogar»: a câmara mergulha no planeta escolhido. */
  dive(cb: () => void) { if (this.diveT < 0) { this.diveT = performance.now(); this.diveCb = cb; } }

  private emit(p: THREE.Vector3, n: number) {
    for (let k = 0; k < n; k++) {
      const s = this.sparkP[this.sparkI = (this.sparkI + 1) % this.sparkP.length];
      s.life = 1; s.v.set((Math.random() - 0.5) * 1.2, Math.random() * 0.6 - 0.1, (Math.random() - 0.5) * 1.2);
      const a = this.sparks.geometry.attributes.position as THREE.BufferAttribute;
      a.setXYZ(this.sparkI, p.x + (Math.random() - 0.5) * 0.18, p.y + 0.35 + (Math.random() - 0.5) * 0.2, p.z + (Math.random() - 0.5) * 0.18);
    }
  }

  update(dt: number, camera: THREE.PerspectiveCamera, pulse: number) {
    this.t += dt;
    const t = this.t;
    // órbitas e rotação dos planetas
    this.planets.forEach((p, i) => {
      const [rx, rz] = this.radii(p.ring), a = p.phase + t * (p.ring ? 0.045 : -0.07);
      p.g.position.set(Math.cos(a) * rx, Math.sin(t * 1.1 + i) * 0.08, Math.sin(a) * rz);
      const want = i === this.cur ? 1.32 + pulse * 0.08 : 0.96;
      p.scale += (want - p.scale) * (1 - Math.exp(-dt * 6)); p.g.scale.setScalar(p.scale);
      p.spin.rotation.y = t * (0.22 + (i % 4) * 0.05) + i;
    });
    this.sunRings.forEach((r, i) => { r.rotation.z = t * (i % 2 ? -0.7 : 0.5) + i * 1.4; });
    this.sun.scale.setScalar(1 + 0.05 * Math.sin(t * 2.2) + pulse * 0.1);
    this.stars.rotation.y = t * 0.006;
    // salto automático
    if (this.u >= 1 && this.diveT < 0) { this.wait -= dt; if (this.wait <= 0) this.jump(this.cur + 1, 2.6); }
    const was = this.u;
    this.u = Math.min(1, this.u + dt * 1.15);
    const top = (i: number) => this.planets[i].g.position.clone().add(new THREE.Vector3(0, R * this.planets[i].scale * 1.08, 0));
    const a = top(this.from), b = top(this.cur), e = this.u < 0.5 ? 2 * this.u * this.u : 1 - (-2 * this.u + 2) ** 2 / 2;
    const pos = this.u < 1 ? a.lerp(b, e) : b;
    const air = this.u < 1 ? Math.sin(Math.PI * this.u) : 0;
    pos.y += air * 2.1;
    this.uli.position.copy(pos);
    if (was < 1 && this.u >= 1) { this.land = 0; this.emit(pos, 22); }
    this.land += dt;
    const squash = this.u < 1 ? 1 + air * 0.22 : 1 - 0.24 * Math.max(0, 1 - this.land * 5);
    const s = 0.92;
    this.uli.scale.set(s * (2 - squash), s * squash, s * (2 - squash));
    // vira-se para onde salta; parado, olha para quem joga
    const dir = this.planets[this.cur].g.position.clone().sub(this.planets[this.from].g.position);
    const yaw = this.u < 1 ? Math.atan2(dir.x, dir.z) * 0.7 : Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z) + Math.sin(t * 0.9) * 0.25;
    let d = yaw - this.uli.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); this.uli.rotation.y += d * (1 - Math.exp(-dt * 10));
    const U = this.uli.userData;
    (U.armL as THREE.Object3D).rotation.z = 0.1 - air * 2.2 - (this.u >= 1 ? Math.max(0, Math.sin(t * 1.7)) * 0.15 : 0);
    (U.armR as THREE.Object3D).rotation.z = -0.1 + air * 2.2;
    (U.legL as THREE.Object3D).rotation.x = air * 0.9; (U.legR as THREE.Object3D).rotation.x = -air * 0.5;
    animateFlame(U.head as THREE.Object3D, t, air, 0, air);
    (U.scarf as THREE.Mesh[]).forEach((sc, i) => { sc.position.set(Math.sin(t * 5 - i * 0.9) * 0.035, 0.5 + air * 0.05 * i + Math.sin(t * 6.5 - i * 0.7) * 0.03, -0.1 - i * 0.085); sc.rotation.z = Math.sin(t * 5 - i * 0.9) * 0.3; });
    if (this.u < 1) this.emit(pos, 3);
    // faíscas
    const pa = this.sparks.geometry.attributes.position as THREE.BufferAttribute, ca = this.sparks.geometry.attributes.color as THREE.BufferAttribute;
    this.sparkP.forEach((p, i) => {
      if (p.life <= 0) { ca.setXYZ(i, 0, 0, 0); return; }
      p.life -= dt * 1.5; p.v.y -= dt * 1.6;
      pa.setXYZ(i, pa.getX(i) + p.v.x * dt, pa.getY(i) + p.v.y * dt, pa.getZ(i) + p.v.z * dt);
      const l = Math.max(0, p.life); ca.setXYZ(i, 1.6 * l, 0.75 * l * l, 0.25 * l * l * l);
    });
    pa.needsUpdate = true; ca.needsUpdate = true;
    const sel = this.planets[this.cur].g.position;
    this.marker.position.set(sel.x, sel.y - R * 0.4, sel.z); this.marker.rotation.z = t; this.marker.visible = this.u >= 1;
    this.marker.scale.setScalar(1 + 0.05 * Math.sin(t * 4));
    // câmara: enquadra o sistema entre o logótipo e os botões, com paralaxe
    const fit = Math.max(1, 0.5625 / Math.max(0.3, camera.aspect));
    const cam = new THREE.Vector3(this.look.x * 0.5 + this.tiltV.x * 0.8 + Math.sin(t * 0.23) * 0.25, 12.4 - this.look.y * 0.4 - this.tiltV.y * 0.5, 14.2).multiplyScalar(fit * 1.21);
    const target = new THREE.Vector3(0, -0.1, 0.72);
    if (this.diveT >= 0) {
      const k = Math.min(1, (performance.now() - this.diveT) / 1050), q = k * k * (3 - 2 * k);
      cam.lerp(this.tmp.copy(sel).add(new THREE.Vector3(0, 0.55, 1.25)), q); target.lerp(sel, Math.min(1, q * 1.4));
      this.onFlash?.(Math.max(0, (k - 0.6) / 0.4));
      if (k >= 1 && this.diveCb) { const cb = this.diveCb; this.diveCb = undefined; cb(); }
    }
    camera.position.copy(cam); camera.lookAt(target);
    if (camera.fov !== 40) { camera.fov = 40; camera.updateProjectionMatrix(); }
  }
}
