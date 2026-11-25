import * as THREE from 'three';
import { glowSprite, hdr } from './common';

// Retratos 3D dos mundos 10-17: figuras de personagem em primitivas, com olhos e adereços a brilhar.
const dull = (c: number, r = 0.8, m = 0.02) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const emit = (c: number, k = 2) => new THREE.MeshBasicMaterial({ color: hdr(c, k), toneMapped: false });
const sph = (r: number, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 28, 20); g.scale(sx, sy, sz); return g; };
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const limb = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, m: THREE.Material) => {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length(), o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 8), m);
  o.castShadow = true; o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o;
};
const tube = (pts: THREE.Vector3[], r: number, m: THREE.Material, seg = 16) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 6), m);
const hand = (g: THREE.Group, p: THREE.Vector3, m: THREE.Material, s = 0.11) => { g.add(mesh(sph(s, 1, 1.15, 0.7), m, p.x, p.y, p.z)); for (let f = -1; f <= 1; f++) g.add(limb(V(p.x + f * s * 0.5, p.y + s * 0.4, p.z), V(p.x + f * s * 0.7, p.y + s * 1.6, p.z + 0.02), s * 0.22, s * 0.14, m)); };
const eyesFor = (head: THREE.Group, col: number, x = 0.13, y = 0.06, z = 0.3, s = 0.05) => { for (const sd of [-1, 1]) { head.add(mesh(sph(s * 1.5, 1.2, 0.8, 0.5), dull(0x040405, 0.3), sd * x, y, z)); head.add(mesh(sph(s * 0.7), emit(col, 2.6), sd * x, y, z + s * 0.5)); } };

/** A Guardiã dos Anéis (Mandala Solar): figura serena de hábito açafrão, quatro braços e halo de anéis dourados a girar. */
export function mestra(): THREE.Group {
  const g = new THREE.Group(), skin = dull(0xd8a068, 0.55), robe = dull(0xe88a1a, 0.85), gold = dull(0xe8b040, 0.3, 0.85), pink = dull(0xff9ec0, 0.7);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, p = mesh(new THREE.ConeGeometry(0.28, 1.2, 4).scale(1, 1, 0.3), k % 2 ? pink : dull(0xffe0a0, 0.7), Math.cos(a) * 1.2, 0.3, Math.sin(a) * 1.2); p.rotation.set(Math.sin(a) * 1.0, -a, -Math.cos(a) * 1.0); g.add(p); }
  g.add(mesh(new THREE.CylinderGeometry(0.3, 1.0, 2.2, 22, 1, true), robe, 0, 1.4, 0)); g.add(mesh(sph(0.5, 1, 1.4, 0.8), robe, 0, 2.6, 0));
  g.add(mesh(new THREE.TorusGeometry(0.52, 0.04, 6, 26), gold, 0, 2.3, 0).rotateX(Math.PI / 2));
  for (const [s, y, dx, dy] of [[-1, 2.9, 0.9, 0.5], [1, 2.9, 0.9, 0.5], [-1, 2.5, 1.0, -0.2], [1, 2.5, 1.0, -0.2]] as const) { g.add(limb(V(s * 0.4, y, 0), V(s * dx, y + dy, 0.5), 0.09, 0.06, robe)); hand(g, V(s * dx, y + dy, 0.55), skin, 0.1); }
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 10), skin, 0, 3.35, 0));
  const head = new THREE.Group(); head.position.set(0, 3.75, 0.03); g.add(head);
  head.add(mesh(sph(0.36, 0.95, 1.12, 0.95), skin)); head.add(mesh(sph(0.37, 1, 0.7, 1), dull(0x1a1008, 0.8), 0, 0.14, -0.04));
  for (const sd of [-1, 1]) { head.add(mesh(new THREE.BoxGeometry(0.14, 0.014, 0.02), dull(0x2a1a10, 0.5), sd * 0.13, 0.04, 0.32).rotateZ(-sd * 0.12)); head.add(mesh(new THREE.BoxGeometry(0.12, 0.012, 0.02), gold, sd * 0.13, 0.1, 0.32)); }
  head.add(mesh(new THREE.ConeGeometry(0.03, 0.12, 5).rotateX(-1.3), skin, 0, -0.05, 0.34)); head.add(mesh(new THREE.BoxGeometry(0.1, 0.014, 0.02), dull(0xb04a2a, 0.5), 0, -0.14, 0.32));
  head.add(mesh(sph(0.03), emit(0xff4a2a, 2.4), 0, 0.2, 0.34)); head.add(mesh(sph(0.045, 0.8, 1.2, 0.6), emit(0xffd45a, 1.6), 0, 0.28, 0.33));
  const halo = new THREE.Group(); halo.position.set(0, 3.8, -0.6); g.add(halo);
  for (const [r, w, c] of [[1.2, 0.05, 0xffd45a], [0.95, 0.04, 0xff9a30], [0.72, 0.035, 0xffe9a0], [0.5, 0.03, 0xff6a20]] as const) halo.add(mesh(new THREE.TorusGeometry(r, w, 6, 48), emit(c, 2)));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; halo.add(mesh(new THREE.ConeGeometry(0.06, 0.3, 4), emit(0xffc860, 1.8), Math.cos(a) * 1.45, Math.sin(a) * 1.45, 0).rotateZ(a - Math.PI / 2)); }
  const gl = glowSprite(0xffb030, 5, 0.3); gl.position.set(0, 3.5, -0.8); g.add(gl);
  return g;
}

/** O Polvo Escritor (Oceano de Tinta): polvo azul de óculos, tentáculos a enrolar e uma pena a pingar tinta que brilha. */
export function polvo(): THREE.Group {
  const g = new THREE.Group(), body = dull(0x1a4a8a, 0.35, 0.1), bodyL = dull(0x2a7ac0, 0.35), ink = emit(0x44e0ff, 2.2);
  g.add(mesh(sph(1.15, 1, 1.15, 1), body, 0, 3.2, 0)); g.add(mesh(sph(0.8, 1, 0.5, 0.7), bodyL, 0, 2.6, 0.5));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.4, r = 0.7; g.add(tube([V(Math.cos(a) * r * 0.5, 2.5, Math.sin(a) * r * 0.5), V(Math.cos(a) * r * 1.4, 1.6, Math.sin(a) * r * 1.4 + 0.3), V(Math.cos(a) * r * 2.0, 0.8 + (k % 2) * 0.3, Math.sin(a) * r * 1.9 + 0.5), V(Math.cos(a + 0.5) * r * 2.2, 0.2, Math.sin(a + 0.5) * r * 2.0 + 0.9)], 0.17 - (k % 3) * 0.02, k % 2 ? body : bodyL, 20)); }
  for (let s = 0; s < 3; s++) for (const sd of [-1, 1]) g.add(mesh(sph(0.04), dull(0x9ad8ff, 0.3), sd * 0.2 + s * 0, 1.9 - s * 0.35, 1.35 + s * 0.1));
  for (const sd of [-1, 1]) { g.add(mesh(sph(0.34, 1, 1, 0.6), dull(0xf4f4ff, 0.2), sd * 0.45, 3.35, 0.95)); g.add(mesh(sph(0.17, 1, 1, 0.6), dull(0x050810, 0.2), sd * 0.45, 3.35, 1.18)); g.add(mesh(sph(0.05), emit(0x80f0ff, 2.6), sd * 0.4, 3.4, 1.26)); g.add(mesh(new THREE.TorusGeometry(0.4, 0.035, 6, 22), dull(0xc8a34a, 0.3, 0.8), sd * 0.45, 3.35, 1.0)); }
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), dull(0xc8a34a, 0.3, 0.8), 0, 3.4, 1.05));
  g.add(tube([V(0.9, 2.4, 0.9), V(1.4, 3.0, 1.1), V(1.6, 3.8, 1.0)], 0.12, body, 14));
  const pen = mesh(new THREE.ConeGeometry(0.1, 1.5, 5).scale(1, 1, 0.25), dull(0xf0f0ff, 0.6), 1.9, 3.9, 0.9); pen.rotation.z = -0.5; g.add(pen);
  for (let k = 0; k < 7; k++) g.add(mesh(sph(0.06 - k * 0.004), ink, 2.1 + k * 0.05, 3.1 - k * 0.38, 0.9));
  for (let k = 0; k < 14; k++) { const a = k * 1.9; g.add(mesh(new THREE.PlaneGeometry(0.25, 0.3), new THREE.MeshBasicMaterial({ color: hdr(0x44e0ff, 1.2), toneMapped: false, transparent: true, opacity: 0.6, side: THREE.DoubleSide }), Math.cos(a) * 2.2, 1.2 + (k % 6) * 0.55, Math.sin(a) * 0.8 - 0.4).rotateZ(k)); }
  const gl = glowSprite(0x44e0ff, 6, 0.25); gl.position.set(0, 2.8, -0.8); g.add(gl);
  return g;
}

/** A IA Glitch (Neon): corpo de cubos desalinhados, cabeça-ecrã com cara de neon e pixéis a flutuar. */
export function glitch(): THREE.Group {
  const g = new THREE.Group(), dark = dull(0x120e1e, 0.3, 0.6), pk = emit(0xff2bd6, 2), cy = emit(0x27d3ff, 2);
  for (let k = 0; k < 7; k++) { const w = 1.6 - Math.abs(k - 3) * 0.12, ox = Math.sin(k * 2.3) * 0.22; g.add(mesh(new THREE.BoxGeometry(w, 0.42, 0.7), dark, ox, 0.8 + k * 0.42, 0)); g.add(mesh(new THREE.BoxGeometry(w + 0.04, 0.03, 0.72), k % 2 ? pk : cy, ox, 1.0 + k * 0.42, 0)); }
  for (const s of [-1, 1]) { for (let k = 0; k < 4; k++) g.add(mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), dark, s * (1.1 + k * 0.08), 3.1 - k * 0.5, 0.1 + k * 0.1)); g.add(mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), s > 0 ? pk : cy, s * 1.4, 1.1, 0.5)); }
  const head = new THREE.Group(); head.position.set(0, 4.0, 0.1); g.add(head);
  head.add(mesh(new THREE.BoxGeometry(1.4, 1.1, 0.6), dark)); head.add(mesh(new THREE.BoxGeometry(1.5, 0.05, 0.62), pk, 0, 0.58, 0)); head.add(mesh(new THREE.BoxGeometry(1.5, 0.05, 0.62), cy, 0, -0.58, 0));
  head.add(mesh(new THREE.PlaneGeometry(1.2, 0.9), emit(0x2a0a3a, 1), 0, 0, 0.31));
  for (const sd of [-1, 1]) { head.add(mesh(new THREE.BoxGeometry(0.28, 0.34, 0.02), emit(0xff2bd6, 2.6), sd * 0.3, 0.12, 0.32)); head.add(mesh(new THREE.BoxGeometry(0.08, 0.14, 0.02), emit(0xffffff, 2.8), sd * 0.3, 0.12, 0.33)); }
  for (let k = 0; k < 9; k++) head.add(mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), emit(0x27d3ff, 2.4), -0.32 + k * 0.08, -0.28 + Math.abs(k - 4) * 0.03 * -1 + (k > 1 && k < 7 ? -0.04 : 0.02), 0.32));
  for (let k = 0; k < 4; k++) head.add(mesh(new THREE.BoxGeometry(1.1 + k * 0.1, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: hdr(0xff2bd6, 1.4), toneMapped: false, transparent: true, opacity: 0.5 }), (k % 2 ? 0.3 : -0.3), 0.35 - k * 0.22, 0.34));
  head.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4), dark, 0.4, 0.9, 0)); head.add(mesh(sph(0.05), emit(0xffe14a, 3), 0.4, 1.3, 0));
  for (let k = 0; k < 26; k++) { const a = k * 2.4, s = 0.07 + (k % 4) * 0.05; g.add(mesh(new THREE.BoxGeometry(s, s, s), k % 2 ? pk : cy, Math.cos(a) * (1.9 + (k % 5) * 0.3), 1 + (k % 10) * 0.45, Math.sin(a) * 0.8 - 0.4)); }
  const gl = glowSprite(0xff2bd6, 6, 0.22); gl.position.set(0, 3.4, -0.9); g.add(gl);
  return g;
}

/** Comandante Zyx (Intergaláctico): alienígena alto de pele verde-cinza, olhos negros enormes, farda com dragonas e antenas. */
export function comandante(): THREE.Group {
  const g = new THREE.Group(), skin = dull(0x8aa898, 0.45), suit = dull(0x2a3a58, 0.5, 0.3), trim = dull(0x39f2d0, 0.3, 0.6), gold = dull(0xe8c020, 0.3, 0.8);
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.95, 2.3, 18), suit, 0, 1.3, 0)); g.add(mesh(sph(0.75, 1.2, 0.8, 0.8), suit, 0, 2.7, 0));
  g.add(mesh(new THREE.BoxGeometry(1.0, 0.1, 0.05), trim, 0, 2.2, 0.62)); for (let k = 0; k < 4; k++) g.add(mesh(sph(0.04), gold, -0.3 + k * 0.2, 2.5, 0.7));
  for (const s of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(0.5, 0.1, 0.3), gold, s * 0.95, 2.85, 0)); for (let k = 0; k < 4; k++) g.add(mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.2, 4), gold, s * (0.8 + k * 0.1), 2.7, 0.15)); g.add(limb(V(s * 0.85, 2.7, 0), V(s * 1.15, 1.9, 0.4), 0.13, 0.09, suit)); hand(g, V(s * 1.18, 1.75, 0.45), skin, 0.12); }
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 10), skin, 0, 3.35, 0));
  const head = new THREE.Group(); head.position.set(0, 3.9, 0.05); g.add(head);
  head.add(mesh(sph(0.5, 1.0, 1.35, 0.95), skin)); head.add(mesh(sph(0.18, 1, 0.5, 0.6), skin, 0, -0.4, 0.3));
  for (const sd of [-1, 1]) { const e = mesh(sph(0.2, 1.1, 0.5, 0.4), dull(0x020204, 0.1, 0.5), sd * 0.22, 0.05, 0.4); e.rotation.z = -sd * 0.5; head.add(e); head.add(mesh(sph(0.04), emit(0x39f2d0, 2.8), sd * 0.24, 0.05, 0.5)); head.add(mesh(new THREE.ConeGeometry(0.02, 0.5, 4), dull(0x6a8878, 0.5), sd * 0.18, 0.78, 0).rotateZ(-sd * 0.2)); head.add(mesh(sph(0.045), emit(0x39f2d0, 2.6), sd * 0.24, 1.02, 0)); }
  head.add(mesh(new THREE.BoxGeometry(0.16, 0.016, 0.02), dull(0x4a6858, 0.5), 0, -0.44, 0.36));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xaaddff, transparent: true, opacity: 0.12, roughness: 0.03, clearcoat: 1 })); dome.position.y = 0.1; head.add(dome);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 26), dull(0x8a98a8, 0.3, 0.8)); ring.rotation.x = Math.PI / 2; ring.position.y = -0.72; head.add(ring);
  const pl = mesh(sph(0.4), dull(0x3a2a9a, 0.8), 1.9, 3.8, -1.0); g.add(pl); g.add(mesh(new THREE.TorusGeometry(0.75, 0.03, 4, 40), emit(0x8a7aff, 1.4), 1.9, 3.8, -1.0).rotateX(1.2));
  const gl = glowSprite(0x39f2d0, 5, 0.2); gl.position.set(0, 3, -0.9); g.add(gl);
  return g;
}

/** A Cartógrafa das Estrelas (Estelar): senhora de manto azul-noite com constelações, chapéu pontiagudo e astrolábio de anéis dourados. */
export function cartografa(): THREE.Group {
  const g = new THREE.Group(), skin = dull(0xe8d8c0, 0.55), robe = dull(0x10163a, 0.75), gold = dull(0xe6c060, 0.3, 0.85), star = emit(0xffe08a, 2.4);
  g.add(mesh(new THREE.CylinderGeometry(0.4, 1.05, 2.6, 22, 1, true), robe, 0, 1.4, 0)); g.add(mesh(sph(0.58, 1, 1.3, 0.8), robe, 0, 2.7, 0));
  for (let k = 0; k < 40; k++) { const a = k * 2.4, y = 0.4 + (k % 20) * 0.12 + (k > 19 ? 0.9 : 0), r = 0.42 + (3.1 - y) * 0.2; g.add(mesh(sph(0.025), star, Math.cos(a) * r, y, Math.sin(a) * r + 0.1)); }
  for (const s of [-1, 1]) g.add(limb(V(s * 0.5, 2.9, 0), V(s * 0.95, 2.4, 0.6), 0.1, 0.07, robe));
  hand(g, V(-0.95, 2.35, 0.65), skin, 0.1); hand(g, V(0.95, 2.35, 0.65), skin, 0.1);
  const ast = new THREE.Group(); ast.position.set(0, 2.5, 1.05); g.add(ast); for (let k = 0; k < 3; k++) { const t = mesh(new THREE.TorusGeometry(0.5 - k * 0.12, 0.025, 6, 36), gold); t.rotation.set(k * 1.0, k * 0.7, 0); ast.add(t); } ast.add(mesh(sph(0.08), star)); ast.add(glowSprite(0xffe08a, 1.6, 0.6));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 10), skin, 0, 3.3, 0));
  const head = new THREE.Group(); head.position.set(0, 3.65, 0.03); g.add(head);
  head.add(mesh(sph(0.34, 0.95, 1.12, 0.95), skin));
  for (const sd of [-1, 1]) { head.add(mesh(sph(0.055, 1.2, 0.8, 0.5), dull(0x040408, 0.3), sd * 0.12, 0.03, 0.29)); head.add(mesh(sph(0.025), emit(0xffe08a, 2.6), sd * 0.12, 0.03, 0.33)); head.add(mesh(new THREE.TorusGeometry(0.085, 0.01, 6, 18), gold, sd * 0.12, 0.03, 0.31)); }
  head.add(mesh(new THREE.BoxGeometry(0.1, 0.012, 0.02), gold, 0, 0.03, 0.34)); head.add(mesh(new THREE.ConeGeometry(0.03, 0.1, 5).rotateX(-1.3), skin, 0, -0.04, 0.32)); head.add(mesh(new THREE.BoxGeometry(0.09, 0.014, 0.02), dull(0x9a4a5a, 0.5), 0, -0.13, 0.3));
  head.add(mesh(sph(0.4, 1, 0.5, 1), robe, 0, 0.2, -0.03)); const hat = mesh(new THREE.ConeGeometry(0.34, 1.1, 14), robe, 0, 0.8, 0); hat.rotation.z = 0.15; head.add(hat);
  head.add(mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 24), gold, 0, 0.26, 0).rotateX(Math.PI / 2)); for (let k = 0; k < 6; k++) head.add(mesh(sph(0.025), star, Math.cos(k) * 0.2, 0.5 + k * 0.1, Math.sin(k) * 0.2 + 0.06));
  head.add(mesh(sph(0.08), star, 0.1, 1.35, 0));
  for (let k = 0; k < 22; k++) { const a = k * 2.1; g.add(mesh(new THREE.OctahedronGeometry(0.06 + (k % 3) * 0.03, 0), star, Math.cos(a) * (1.7 + (k % 4) * 0.3), 1 + (k % 9) * 0.45, Math.sin(a) * 0.7 - 0.5)); }
  const gl = glowSprite(0xffe08a, 5, 0.2); gl.position.set(0, 3.2, -0.9); g.add(gl);
  return g;
}

/** O Serafim (Céu Angélico): figura de seis asas de penas, halo de ouro, túnica branca e um orbe de luz nas mãos. */
export function serafim(): THREE.Group {
  const g = new THREE.Group(), skin = dull(0xf4e4d4, 0.5), robe = dull(0xfff4e8, 0.8), wing = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, emissive: 0xa0a8d0, emissiveIntensity: 0.45 }), gold = dull(0xe6b84a, 0.3, 0.85);
  g.add(mesh(new THREE.CylinderGeometry(0.4, 1.0, 2.7, 22, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff4e8, roughness: 0.8, side: THREE.DoubleSide }), 0, 1.35, 0)); g.add(mesh(sph(0.55, 1, 1.35, 0.8), robe, 0, 2.7, 0));
  g.add(mesh(new THREE.TorusGeometry(0.5, 0.04, 6, 24), gold, 0, 2.2, 0).rotateX(Math.PI / 2));
  for (const [s, y, sp, len] of [[1, 3.4, 0.35, 2.0], [1, 3.1, 0.2, 2.4], [1, 2.7, 0.05, 2.0]] as const) for (const sd of [-1, 1]) for (let k = 0; k < 8; k++) { const l = len * (1 - k * 0.07), f = mesh(new THREE.BoxGeometry(0.22, l, 0.03).translate(0, l / 2, 0), wing, sd * 0.4, y - 0.7, -0.5 - (y - 2.7) * 0.2); f.rotation.z = sd * (0.3 + k * 0.17 + sp); f.rotation.y = sd * 0.2; g.add(f); void s; }
  for (const s of [-1, 1]) g.add(limb(V(s * 0.5, 2.95, 0), V(s * 0.5, 2.35, 0.7), 0.09, 0.065, robe));
  hand(g, V(-0.38, 2.35, 0.78), skin, 0.1); hand(g, V(0.38, 2.35, 0.78), skin, 0.1);
  const orb = mesh(sph(0.22), emit(0xfff0c0, 2.6), 0, 2.6, 0.95); g.add(orb); g.add(glowSprite(0xfff0c0, 1.6, 0.8)); g.children[g.children.length - 1].position.copy(orb.position);
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.32, 10), skin, 0, 3.4, 0));
  const head = new THREE.Group(); head.position.set(0, 3.78, 0.03); g.add(head);
  head.add(mesh(sph(0.35, 0.95, 1.12, 0.95), skin));
  for (const sd of [-1, 1]) { head.add(mesh(new THREE.BoxGeometry(0.12, 0.012, 0.02), dull(0x8a6a4a, 0.5), sd * 0.12, 0.04, 0.3).rotateZ(sd * 0.05)); head.add(mesh(new THREE.BoxGeometry(0.1, 0.012, 0.02), dull(0xe0d0b0, 0.5), sd * 0.12, 0.08, 0.3)); }
  head.add(mesh(new THREE.ConeGeometry(0.03, 0.1, 5).rotateX(-1.3), skin, 0, -0.04, 0.33)); head.add(mesh(new THREE.BoxGeometry(0.09, 0.014, 0.02), dull(0xc0705a, 0.5), 0, -0.14, 0.31));
  for (let k = 0; k < 26; k++) { const a = (k / 26) * Math.PI * 2; head.add(mesh(new THREE.ConeGeometry(0.05, 0.3 + (k % 3) * 0.06, 5), dull(0xf0d080, 0.8), Math.cos(a) * 0.3, 0.12 + Math.sin(a) * 0.16 - (Math.sin(a) < -0.3 ? 0.1 : 0), -0.1 + Math.sin(a) * 0.08).rotateZ(a - Math.PI / 2 + Math.PI)); }
  const halo = mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 36), emit(0xffd86b, 2.4), 0, 0.68, 0); halo.rotation.x = Math.PI / 2 - 0.2; head.add(halo); head.add(glowSprite(0xffe9a0, 1.8, 0.5)); head.children[head.children.length - 1].position.set(0, 0.68, 0);
  const gl = glowSprite(0xfff4c8, 6, 0.3); gl.position.set(0, 3.2, -0.9); g.add(gl);
  return g;
}

/** O Velho Leão (Reino Animal): leão de juba imensa, cicatriz num olho, olhar dourado e coroa de erva seca. */
export function leao(): THREE.Group {
  const g = new THREE.Group(), fur = dull(0xc89048, 0.9), mane = dull(0x9a4a14, 1), maneD = dull(0x6a2a0c, 1), dark = dull(0x1a0a04, 0.5);
  g.add(mesh(sph(1.3, 1.25, 1.1, 0.9), fur, 0, 1.4, -0.3));
  for (const s of [-1, 1]) { g.add(limb(V(s * 0.55, 1.5, 0.3), V(s * 0.55, 0.3, 1.1), 0.32, 0.26, fur)); g.add(mesh(sph(0.3, 1.05, 0.6, 1.5), fur, s * 0.55, 0.2, 1.3)); }
  const head = new THREE.Group(); head.position.set(0, 3.0, 0.4); g.add(head);
  for (let k = 0; k < 56; k++) { const a = (k / 56) * Math.PI * 2, r = 0.62 + (k % 3) * 0.12, c = mesh(new THREE.ConeGeometry(0.1, 0.7 + (k % 4) * 0.1, 5), k % 2 ? mane : maneD, Math.cos(a) * r, Math.sin(a) * r * 1.1, -0.15 - (k % 3) * 0.05); c.rotation.z = a - Math.PI / 2; c.rotation.x = 0.35; head.add(c); }
  head.add(mesh(sph(0.55, 1, 1.05, 0.95), fur)); head.add(mesh(sph(0.3, 1.1, 0.8, 1.2), dull(0xdcb078, 0.8), 0, -0.2, 0.42)); head.add(mesh(sph(0.1, 1.3, 0.7, 0.8), dark, 0, -0.04, 0.68));
  head.add(mesh(new THREE.BoxGeometry(0.28, 0.025, 0.04), dark, 0, -0.34, 0.62));
  for (const sd of [-1, 1]) {
    head.add(mesh(sph(0.1, 1.3, 0.8, 0.5), dull(0x100a04, 0.3), sd * 0.24, 0.16, 0.46)); head.add(mesh(sph(0.055), emit(0xffe040, 2.8), sd * 0.24, 0.16, 0.52)); head.add(mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), maneD, sd * 0.24, 0.3, 0.5).rotateZ(-sd * 0.3));
    head.add(mesh(sph(0.14, 1, 1, 0.6), fur, sd * 0.42, 0.52, 0.0)); head.add(mesh(sph(0.08, 1, 1, 0.6), dull(0xe8a0a0, 0.7), sd * 0.42, 0.52, 0.06));
    for (let w = 0; w < 3; w++) head.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 3), dull(0xf0e8d0, 0.6), sd * 0.4, -0.12 - w * 0.05, 0.66).rotateZ(Math.PI / 2 + sd * (0.15 - w * 0.08)));
  }
  head.add(mesh(new THREE.BoxGeometry(0.02, 0.34, 0.03), dull(0x7a3a2a, 0.6), -0.25, 0.16, 0.5).rotateZ(0.25));
  for (let k = 0; k < 9; k++) { const a = -0.9 + k * 0.225; head.add(mesh(new THREE.ConeGeometry(0.02, 0.28, 4), dull(0xc8a848, 0.9), Math.sin(a) * 0.55, 0.62 + Math.cos(a) * 0.05, 0.1).rotateZ(-a * 0.8)); }
  const gl = glowSprite(0xffb050, 5.5, 0.25); gl.position.set(0, 3, -0.9); g.add(gl);
  return g;
}

/** A Lenda do Rock (Palco Rockstar): estrela de crista rosa, óculos escuros, jaqueta de cabedal com tachas e guitarra a brilhar. */
export function lenda(): THREE.Group {
  const g = new THREE.Group(), skin = dull(0xd8b09a, 0.55), leather = dull(0x14141a, 0.35, 0.3), steel = dull(0xc0c0cc, 0.3, 0.9), pink = emit(0xff2b8a, 2), yel = emit(0xffe14a, 2);
  for (const s of [-1, 1]) { g.add(limb(V(s * 0.3, 1.5, 0), V(s * 0.38, 0.2, 0.05), 0.2, 0.14, dull(0x1a1a24, 0.6))); g.add(mesh(new THREE.BoxGeometry(0.34, 0.2, 0.6), dull(0x0a0a0e, 0.4, 0.4), s * 0.38, 0.1, 0.15)); }
  g.add(mesh(new THREE.CapsuleGeometry(0.55, 0.9, 8, 18), leather, 0, 2.2, 0)); for (const s of [-1, 1]) { g.add(mesh(sph(0.34, 1.1, 0.8, 1), leather, s * 0.78, 2.85, 0)); for (let k = 0; k < 6; k++) g.add(mesh(new THREE.ConeGeometry(0.035, 0.12, 5), steel, s * (0.65 + k * 0.06), 3.05, 0.05 + (k % 2) * 0.08)); }
  for (let k = 0; k < 8; k++) { g.add(mesh(sph(0.025), steel, 0.2, 1.7 + k * 0.13, 0.54 - k * 0.012)); } g.add(mesh(new THREE.BoxGeometry(0.46, 0.04, 0.04), pink, 0.0, 2.7, 0.55)); g.add(mesh(new THREE.BoxGeometry(0.2, 0.4, 0.04), dull(0x24242c, 0.4), -0.25, 2.4, 0.55).rotateZ(0.3));
  const gx = V(0.15, 1.8, 0.85), guit = new THREE.Group(); guit.position.copy(gx); guit.rotation.z = 0.9; g.add(guit);
  guit.add(mesh(sph(0.5, 1, 0.85, 0.2), dull(0xff2b8a, 0.2, 0.3))); guit.add(mesh(sph(0.34, 1, 0.9, 0.22), dull(0xff2b8a, 0.2, 0.3), 0.4, 0.25, 0)); guit.add(mesh(new THREE.BoxGeometry(1.7, 0.1, 0.06), dull(0x4a2a14, 0.5), 1.4, 0.35, 0)); guit.add(mesh(new THREE.BoxGeometry(0.2, 0.18, 0.05), dull(0x1a1a20, 0.5), 2.3, 0.35, 0));
  for (let k = 0; k < 6; k++) guit.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.9, 3), steel, 1.3, 0.3 + k * 0.012, 0.04).rotateZ(Math.PI / 2)); for (const [x, y] of [[-0.1, 0.12], [0.1, -0.05], [-0.1, -0.2]] as const) guit.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), steel, x, y, 0.06).rotateX(Math.PI / 2));
  guit.add(mesh(new THREE.BoxGeometry(0.5, 0.02, 0.02), yel, 0.0, 0.0, 0.05));
  g.add(limb(V(-0.7, 2.75, 0), V(-0.9, 2.1, 0.7), 0.13, 0.1, leather)); hand(g, V(-0.95, 2.0, 0.78), skin, 0.1); g.add(limb(V(0.7, 2.75, 0), V(0.5, 2.1, 0.8), 0.13, 0.1, leather)); hand(g, V(0.5, 1.95, 0.9), skin, 0.1);
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.3, 10), skin, 0, 3.4, 0));
  const head = new THREE.Group(); head.position.set(0, 3.8, 0.04); g.add(head);
  head.add(mesh(sph(0.4, 0.95, 1.12, 0.95), skin)); head.add(mesh(new THREE.ConeGeometry(0.04, 0.14, 5).rotateX(-1.3), skin, 0, -0.05, 0.38));
  head.add(mesh(new THREE.BoxGeometry(0.34, 0.08, 0.05), dull(0x050507, 0.1, 0.6), 0, 0.06, 0.34)); for (const sd of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.1, 0.012, 0.01), pink, sd * 0.09, 0.075, 0.37));
  head.add(mesh(new THREE.BoxGeometry(0.2, 0.025, 0.03), dull(0xa04a4a, 0.5), 0, -0.17, 0.33));
  for (let k = 0; k < 9; k++) head.add(mesh(new THREE.ConeGeometry(0.05, 0.45 + (k % 3) * 0.1, 5), pink, 0, 0.45 + (k % 2) * 0.03, -0.35 + k * 0.1).rotateX(0.15 - k * 0.04));
  const sp = glowSprite(0xff2b8a, 5.5, 0.32); sp.position.set(0, 3, -0.9); g.add(sp); const sp2 = glowSprite(0xffe14a, 4, 0.2); sp2.position.set(1.4, 3.5, -0.5); g.add(sp2);
  return g;
}
