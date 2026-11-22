import * as THREE from 'three';
import { CharKind } from '../art/characters';
import { glowSprite, hdr, makeClockTexture } from './common';
import { makeUli } from './actors';

const gloss = (color: number, rough = 0.22, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: 1, clearcoatRoughness: 0.1, ...extra });
const emit = (color: number, k = 2) => new THREE.MeshBasicMaterial({ color: hdr(color, k), toneMapped: false });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o;
};
const sph = (r: number, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 40, 28); g.scale(sx, sy, sz); return g; };

function eyes(g: THREE.Group, y: number, gap: number, r: number, pupil = 0x0a0c18, z = 0) {
  for (const s of [-1, 1]) {
    g.add(mesh(sph(r, 1, 1.15, 0.6), emit(0xffffff, 1.3), s * gap, y, z));
    g.add(mesh(sph(r * 0.48), new THREE.MeshBasicMaterial({ color: pupil }), s * gap + s * -r * 0.08, y - r * 0.05, z + r * 0.45));
  }
}

function pimpa(): THREE.Group {
  const g = new THREE.Group();
  const pearl = gloss(0xf1eefc, 0.18, { sheen: 1, sheenColor: new THREE.Color(0xc9a8ff) });
  g.add(mesh(sph(0.5, 0.85, 1.15, 0.8), pearl, 0, 1.55, 0));
  g.add(mesh(sph(0.33), pearl, 0, 2.5, 0.05));
  g.add(mesh(sph(0.085), gloss(0xff6fae, 0.3), 0, 2.42, 0.35));
  eyes(g, 2.56, 0.13, 0.085, 0x2a1a08, 0.27);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.CapsuleGeometry(0.1, 0.85, 8, 16), pearl, s * 0.17, 3.2, 0); ear.rotation.z = -s * 0.22;
    const inner = mesh(new THREE.CapsuleGeometry(0.055, 0.6, 6, 12), gloss(0xff9ecb, 0.4), s * 0.18, 3.2, 0.07); inner.rotation.z = -s * 0.22;
    g.add(ear, inner);
    const brow = mesh(new THREE.BoxGeometry(0.18, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0x20142a }), s * 0.13, 2.7, 0.3); brow.rotation.z = s * 0.45;
    g.add(brow);
    // pernas finíssimas à Dalí
    const leg = mesh(new THREE.CylinderGeometry(0.045, 0.07, 1.4, 12), pearl, s * 0.2, 0.75, 0);
    const foot = mesh(sph(0.1, 1, 0.5, 2), pearl, s * 0.2, 0.04, 0.12);
    g.add(leg, foot);
  }
  const vest = mesh(new THREE.CylinderGeometry(0.46, 0.4, 0.55, 40, 1, true), gloss(0x15161a, 0.3, { side: THREE.DoubleSide }), 0, 1.4, 0);
  g.add(vest);
  for (const y of [1.6, 1.4, 1.2]) g.add(mesh(new THREE.ConeGeometry(0.035, 0.09, 6), new THREE.MeshStandardMaterial({ color: 0xc8ccd6, metalness: 0.9, roughness: 0.25 }), 0.2, y, 0.42));
  for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14), emit(0xff4fd8, 1.6), s * 0.33, 2.6, 0.05));
  // muleta
  const crutch = mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 8), gloss(0x7a5232, 0.6), 0.95, 1.15, 0.1); crutch.rotation.z = 0.12;
  const fork = mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), gloss(0x7a5232, 0.6), 0.82, 2.28, 0.1);
  g.add(crutch, fork);
  // relógio mole pendurado da muleta
  const ct = makeClockTexture();
  const cg = new THREE.CircleGeometry(0.42, 40);
  const p = cg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, p.getY(i) - 0.28 * (x / 0.42) ** 2 - 0.05); }
  const clock = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: ct, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
  clock.position.set(1.05, 1.5, 0.15);
  g.add(clock);
  g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), emit(0xffcf4a, 1), 1.0, 1.95, 0.12));
  return g;
}

function lagarta(): THREE.Group {
  const g = new THREE.Group();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const r = 0.44 - i * 0.015;
    const col = i % 2 ? 0x3fbf6a : 0x7be08f;
    g.add(mesh(sph(r), gloss(col, 0.2, { emissive: col, emissiveIntensity: 0.08 }), Math.sin(i * 0.75) * 0.55, 0.45 + i * 0.5, Math.cos(i * 0.75) * 0.12));
    if (i < n - 1) for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6), gloss(0x2a7a44, 0.5), Math.sin(i * 0.75) * 0.55 + s * 0.22, 0.12 + i * 0.5, 0.12));
  }
  const hx = Math.sin((n - 1) * 0.75) * 0.55, hy = 0.45 + (n - 1) * 0.5, hz = Math.cos((n - 1) * 0.75) * 0.12;
  const head = new THREE.Group(); head.position.set(hx, hy, hz);
  eyes(head, 0.02, 0.15, 0.1, 0x10301a, 0.3);
  head.add(mesh(new THREE.TorusGeometry(0.15, 0.018, 10, 32), emit(0xffcf4a, 1.6), 0.15, 0.02, 0.37)); // monóculo
  const cap = new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, 0.7, 1);
  head.add(mesh(cap, gloss(0xe04a6a, 0.3, { emissive: 0xe04a6a, emissiveIntensity: 0.15 }), 0, 0.28, 0));
  for (const [x, z] of [[-0.2, 0.2], [0.18, 0.28], [0.05, -0.25], [0.3, -0.05], [-0.32, -0.1]]) head.add(mesh(sph(0.065, 1, 0.5, 1), emit(0xffffff, 1.1), x, 0.5 - Math.abs(x) * 0.35 - Math.abs(z) * 0.1, z));
  const smile = mesh(new THREE.TorusGeometry(0.11, 0.015, 8, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0x20301a }), 0, -0.14, 0.38); smile.rotation.z = Math.PI;
  head.add(smile);
  g.add(head);
  // fumo de cachimbo
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(sph(0.1 + i * 0.06), new THREE.MeshBasicMaterial({ color: 0xd8c8ff, transparent: true, opacity: 0.34 - i * 0.045, depthWrite: false }));
    s.position.set(hx + 0.5 + i * 0.14 + Math.sin(i * 1.7) * 0.12, hy - 0.2 + i * 0.28, 0.25);
    g.add(s);
  }
  return g;
}

function sorriso(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(sph(0.9 + (i % 3) * 0.3), new THREE.MeshBasicMaterial({ color: 0x3a1a6a, transparent: true, opacity: 0.16, depthWrite: false }));
    m.position.set(Math.sin(i * 2.1) * 0.9, 1.5 + Math.cos(i * 1.3) * 0.7, -0.4 + Math.sin(i) * 0.3);
    g.add(m);
  }
  for (const s of [-1, 1]) {
    const e = mesh(sph(0.22, 1.5, 0.85, 0.4), emit(0xffe36b, 2.4), s * 0.62, 1.95, 0.2); e.rotation.z = -s * 0.35;
    g.add(e, mesh(sph(0.05, 0.4, 2.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x10051f }), s * 0.62, 1.95, 0.4));
    const ear = mesh(new THREE.ConeGeometry(0.28, 0.6, 3), new THREE.MeshBasicMaterial({ color: 0x4a2a8a }), s * 1.0, 2.7, -0.1); ear.rotation.z = -s * 0.35;
    g.add(ear);
    for (const k of [-1, 0, 1]) { const w = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 5), emit(0xb98aff, 1.2), s * 1.3, 1.3 + k * 0.1, 0.1); w.rotation.z = Math.PI / 2 + k * 0.18; g.add(w); }
  }
  const smile = mesh(new THREE.TorusGeometry(1.15, 0.075, 12, 64, Math.PI * 0.8), emit(0xffffff, 2.2), 0, 1.5, 0.2);
  smile.rotation.z = Math.PI + Math.PI * 0.1;
  g.add(smile);
  for (let i = -5; i <= 5; i++) {
    const a = Math.PI * 1.5 + i * 0.12;
    const t = mesh(new THREE.BoxGeometry(0.1, 0.18, 0.05), emit(0xffffff, 1.8), Math.cos(a) * 1.15, 1.5 + Math.sin(a) * 1.15 + 0.12, 0.2);
    t.rotation.z = a + Math.PI / 2;
    g.add(t);
  }
  g.add(glowSprite(0xb98aff, 5, 0.35)); (g.children[g.children.length - 1] as THREE.Sprite).position.set(0, 1.7, -0.5);
  return g;
}

function rainha(): THREE.Group {
  const g = new THREE.Group();
  const roseA = gloss(0xd62a5e, 0.28, { emissive: 0x8a1038, emissiveIntensity: 0.4 }), roseB = gloss(0xff7a9e, 0.28, { emissive: 0xff3f7a, emissiveIntensity: 0.2 });
  for (let j = 0; j < 7; j++) {
    const r = 1.05 - j * 0.14, y = 0.22 + j * 0.27, n = Math.max(6, Math.round(15 - j * 1.4));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + j * 0.4;
      const rose = mesh(sph(0.2 - j * 0.012, 1, 0.7, 1), (i + j) % 2 ? roseA : roseB, Math.cos(a) * r, y, Math.sin(a) * r);
      g.add(rose);
    }
  }
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.3, 0.7, 24), gloss(0xf4e8f0, 0.2), 0, 2.2, 0));
  g.add(mesh(sph(0.34, 0.9, 1.1, 0.9), gloss(0xf6ece6, 0.15), 0, 2.78, 0));
  for (const s of [-1, 1]) {
    const eye = mesh(sph(0.075, 1.8, 0.6, 0.4), emit(0xff3050, 2), s * 0.13, 2.82, 0.28); eye.rotation.z = -s * 0.35; g.add(eye);
    const brow = mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0x20081a }), s * 0.13, 2.95, 0.3); brow.rotation.z = s * 0.4; g.add(brow);
  }
  g.add(mesh(sph(0.04, 1.6, 0.6, 0.5), emit(0xb01848, 1.2), 0, 2.64, 0.3));
  const crown = new THREE.Group(); crown.position.set(0, 3.25, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const c = mesh(new THREE.ConeGeometry(0.075, 0.38, 6), emit(0xffcf4a, 1.8), Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3); crown.add(c);
  }
  crown.add(mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 40), emit(0xffcf4a, 1.8)).rotateX(Math.PI / 2));
  crown.add(mesh(sph(0.07), emit(0xff2b88, 2.6), 0, 0.28, 0));
  g.add(crown);
  const sc = mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 8), emit(0xffcf4a, 1.3), 1.35, 1.5, 0.2);
  g.add(sc, mesh(sph(0.2, 1, 0.8, 1), roseB, 1.35, 3.05, 0.2), glowSprite(0xff3f7a, 1.2, 0.8));
  (g.children[g.children.length - 1] as THREE.Sprite).position.set(1.35, 3.05, 0.2);
  return g;
}

export function buildPortrait(kind: CharKind): { group: THREE.Group; center: THREE.Vector3; dist: number } {
  switch (kind) {
    case 'uli': {
      const u = makeUli(); u.scale.setScalar(3.4);
      const U = u.userData; (U.armR as THREE.Object3D).rotation.z = -0.5; (U.armL as THREE.Object3D).rotation.z = 0.15;
      (U.scarf as THREE.Mesh[]).forEach((s, i) => { s.position.set(Math.sin(i * 0.9) * 0.05, 0.5 + i * 0.012, -0.1 - i * 0.085); s.rotation.z = Math.sin(i * 0.9) * 0.3; });
      u.rotation.y = 0.5;
      return { group: u, center: new THREE.Vector3(0, 1.45, 0), dist: 9.2 };
    }
    case 'pimpa': return { group: pimpa(), center: new THREE.Vector3(0.3, 1.85, 0), dist: 7.4 };
    case 'lagarta': return { group: lagarta(), center: new THREE.Vector3(0.1, 2.15, 0), dist: 9.4 };
    case 'sorriso': return { group: sorriso(), center: new THREE.Vector3(0, 1.7, 0), dist: 6.4 };
    case 'rainha': return { group: rainha(), center: new THREE.Vector3(0.3, 1.8, 0), dist: 8.0 };
  }
}
