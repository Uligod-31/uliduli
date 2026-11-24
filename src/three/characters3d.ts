import * as THREE from 'three';
import { CharKind } from '../art/characters';
import { glowSprite, hdr, makeClockTexture } from './common';
import { makeUli } from './nightmare';
import { pimpa as pimpaD, lagarta as lagartaD, sorriso as sorrisoD, rainha as rainhaD, carcereiro as carcereiroD, geada as geadaD, relojoeiro as relojoeiroD, bibliotecario as bibliotecarioD } from './chars_dark';

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


/** A Raposa: magra, de olhos que não perdoam, cauda enorme. */
function raposa(): THREE.Group {
  const g = new THREE.Group();
  const fur = gloss(0xb8602a, 0.85, { clearcoat: 0 }), cream = gloss(0xe9d9bd, 0.9, { clearcoat: 0 }), dk = gloss(0x1a110b, 0.8, { clearcoat: 0 });
  g.add(mesh(sph(0.55, 0.8, 1.25, 0.8), fur, 0, 1.0, 0));
  g.add(mesh(sph(0.3, 0.7, 1.1, 0.5), cream, 0, 0.95, 0.3));
  const head = new THREE.Group(); head.position.set(0, 2.05, 0.05); g.add(head);
  head.add(mesh(sph(0.42, 1.05, 0.9, 0.95), fur));
  const snout = mesh(new THREE.ConeGeometry(0.2, 0.55, 8), cream, 0, -0.1, 0.45); snout.rotation.x = Math.PI / 2; head.add(snout);
  head.add(mesh(sph(0.055), dk, 0, -0.04, 0.72));
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.17, 0.7, 4), fur, s * 0.27, 0.5, -0.02); ear.rotation.z = -s * 0.28; head.add(ear);
    head.add(mesh(new THREE.ConeGeometry(0.09, 0.45, 4), dk, s * 0.28, 0.52, 0.04).rotateZ(-s * 0.28));
    const eye = mesh(sph(0.065, 1.5, 0.7, 0.5), emit(0xffd24a, 2.4), s * 0.17, 0.09, 0.36); eye.rotation.z = -s * 0.35; head.add(eye);
    head.add(mesh(sph(0.018, 0.4, 2, 0.4), new THREE.MeshBasicMaterial({ color: 0x000000 }), s * 0.17, 0.09, 0.4));
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.0, 8), dk, s * 0.22, 0.5, 0.05));
  }
  const tail = mesh(sph(0.42, 0.7, 0.7, 2.0), fur, -0.55, 0.55, -0.8); tail.rotation.y = 0.5;
  const tip = mesh(sph(0.3, 0.7, 0.7, 0.9), cream, -0.95, 0.62, -1.55);
  g.add(tail, tip);
  const scarf = mesh(new THREE.TorusGeometry(0.34, 0.07, 8, 24), gloss(0xf2b73c, 0.8, { clearcoat: 0 }), 0, 1.62, 0.03); scarf.rotation.x = Math.PI / 2; g.add(scarf);
  return g;
}

/** O Rei Sem Súbditos: coroa maior do que a cabeça, manto vazio, dedo apontado. */
function rei(): THREE.Group {
  const g = new THREE.Group();
  const robe = gloss(0x6a1a26, 0.9, { clearcoat: 0, side: THREE.DoubleSide }), ermine = gloss(0xe9e2d4, 0.95, { clearcoat: 0 }), skin = gloss(0xd0c0a6, 0.85, { clearcoat: 0 });
  const goldM = gloss(0xd9ad3c, 0.35, { metalness: 0.7, emissive: 0x5a3c08, emissiveIntensity: 0.7 });
  g.add(mesh(new THREE.CylinderGeometry(0.3, 1.2, 2.4, 20, 1, true), robe, 0, 1.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.48, 0.4, 0.34, 20), ermine, 0, 2.38, 0));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.add(mesh(sph(0.04, 1, 2.4, 1), new THREE.MeshBasicMaterial({ color: 0x15100e }), Math.cos(a) * 0.46, 2.3, Math.sin(a) * 0.46)); }
  g.add(mesh(sph(0.26, 0.9, 1.15, 0.95), skin, 0, 2.8, 0.04));
  for (const s of [-1, 1]) {
    g.add(mesh(sph(0.05, 1.4, 0.7, 0.5), emit(0xffd36a, 2.2), s * 0.09, 2.82, 0.26));
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x20120c }), s * 0.09, 2.92, 0.27).rotateZ(s * 0.35));
  }
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.012, 0.02), new THREE.MeshBasicMaterial({ color: 0x20120c }), 0, 2.68, 0.28));
  const crown = new THREE.Group(); crown.position.y = 3.15;
  crown.add(mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.2, 16, 1, true), goldM, 0, 0, 0));
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; crown.add(mesh(new THREE.ConeGeometry(0.075, 0.34, 5), goldM, Math.cos(a) * 0.33, 0.25, Math.sin(a) * 0.33)); }
  crown.add(mesh(sph(0.06), emit(0xff2b50, 2.2), 0, 0.02, 0.36));
  crown.rotation.z = 0.12; g.add(crown);
  // braço comprido a apontar
  const arm = mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 8), robe, 0.75, 2.0, 0.35); arm.rotation.set(0.5, 0, -1.2); g.add(arm);
  g.add(mesh(sph(0.09, 1, 1.4, 0.6), skin, 1.25, 1.75, 0.7));
  const sc = mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), goldM, -0.8, 1.3, 0.3); g.add(sc, mesh(sph(0.14), goldM, -0.8, 2.55, 0.3));
  return g;
}

/** O Acendedor: fino como o próprio candeeiro, de costas curvadas, a segurar a única luz. */
function acendedor(): THREE.Group {
  const g = new THREE.Group();
  const coat = gloss(0x1c1f26, 0.9, { clearcoat: 0 }), skin = gloss(0xd0c0a6, 0.85, { clearcoat: 0 }), dk = gloss(0x0c0b0a, 0.8, { clearcoat: 0 });
  for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.5, 8), dk, s * 0.14, 0.75, 0));
  const torso = mesh(new THREE.CapsuleGeometry(0.28, 0.9, 6, 14), coat, 0, 1.9, 0); torso.rotation.x = 0.28; g.add(torso);
  g.add(mesh(sph(0.19, 0.9, 1.15, 0.95), skin, 0, 2.95, 0.3));
  for (const s of [-1, 1]) g.add(mesh(sph(0.04, 1.4, 0.8, 0.5), emit(0xffc060, 2.4), s * 0.07, 2.97, 0.46));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), dk, 0, 3.12, 0.3));
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.32, 14), dk, 0, 3.3, 0.3));
  const arm = mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 8), coat, 0.38, 2.2, 0.2); arm.rotation.z = -0.5; g.add(arm);
  const pole = mesh(new THREE.CylinderGeometry(0.025, 0.03, 3.6, 8), dk, 0.85, 1.8, 0.2); g.add(pole);
  g.add(mesh(sph(0.16), emit(0xffd98a, 3), 0.85, 3.68, 0.2));
  const gl = glowSprite(0xffc060, 3.4, 0.8); gl.position.set(0.85, 3.68, 0.2); g.add(gl);
  return g;
}

/** Pesadelo: tira cor e brilho de plástico a tudo o que não seja luz própria. */
function grimy(g: THREE.Group, k = 0.5) {
  g.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (!m || (m as THREE.MeshBasicMaterial).isMeshBasicMaterial) return;
    const sm = m as THREE.MeshPhysicalMaterial;
    if (sm.color) { const hsl = { h: 0, s: 0, l: 0 }; sm.color.getHSL(hsl); sm.color.setHSL(hsl.h, hsl.s * (1 - k), hsl.l * 0.8); }
    if ('roughness' in sm) sm.roughness = Math.max(sm.roughness, 0.8);
    if ('clearcoat' in sm) sm.clearcoat = 0;
    if ('emissiveIntensity' in sm) sm.emissiveIntensity *= 0.5;
  });
}

export function buildPortrait(kind: CharKind): { group: THREE.Group; center: THREE.Vector3; dist: number } {
  const r = buildPortraitRaw(kind);
  if (kind === 'raposa' || kind === 'rei') grimy(r.group, 0.6);
  return r;
}

function buildPortraitRaw(kind: CharKind): { group: THREE.Group; center: THREE.Vector3; dist: number } {
  switch (kind) {
    case 'uli': {
      const u = makeUli(); u.scale.setScalar(3.4);
      const U = u.userData; (U.armR as THREE.Object3D).rotation.z = -0.5; (U.armL as THREE.Object3D).rotation.z = 0.15;
      (U.scarf as THREE.Mesh[]).forEach((s, i) => { s.position.set(Math.sin(i * 0.9) * 0.05, 0.5 + i * 0.012, -0.1 - i * 0.085); s.rotation.z = Math.sin(i * 0.9) * 0.3; });
      u.rotation.y = 0.5;
      return { group: u, center: new THREE.Vector3(0, 1.45, 0), dist: 9.2 };
    }
    case 'pimpa': return { group: pimpaD(), center: new THREE.Vector3(0.1, 2.55, 0), dist: 11 };
    case 'lagarta': return { group: lagartaD(), center: new THREE.Vector3(-0.3, 2.3, 0), dist: 12.5 };
    case 'sorriso': return { group: sorrisoD(), center: new THREE.Vector3(0, 2.0, 0), dist: 7.6 };
    case 'raposa': return { group: raposa(), center: new THREE.Vector3(-0.1, 1.45, 0), dist: 8.6 };
    case 'rei': return { group: rei(), center: new THREE.Vector3(0.2, 1.9, 0), dist: 9.2 };
    case 'acendedor': return { group: acendedor(), center: new THREE.Vector3(0.4, 2.0, 0), dist: 10.6 };
    case 'carcereiro': return { group: carcereiroD(), center: new THREE.Vector3(0, 2.3, 0), dist: 9.2 };
    case 'geada': return { group: geadaD(), center: new THREE.Vector3(0.2, 2.4, 0), dist: 8.8 };
    case 'relojoeiro': return { group: relojoeiroD(), center: new THREE.Vector3(0, 2.2, 0), dist: 8.2 };
    case 'bibliotecario': return { group: bibliotecarioD(), center: new THREE.Vector3(0, 2.5, 0), dist: 8.6 };
    case 'rainha': return { group: rainhaD(), center: new THREE.Vector3(0.5, 2.35, 0), dist: 10.5 };
  }
}
