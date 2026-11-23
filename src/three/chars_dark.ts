import * as THREE from 'three';
import { glowSprite, hdr, makeClockTexture } from './common';

// Retratos 3D do Jardim Sebe — figuras de pesadelo: magras, curvadas, de cores mortas e olhos que brilham.
const dull = (c: number, r = 0.92) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.02 });
const emit = (c: number, k = 2) => new THREE.MeshBasicMaterial({ color: hdr(c, k), toneMapped: false });
const sph = (r: number, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 32, 24); g.scale(sx, sy, sz); return g; };
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o;
};
const limb = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, m: THREE.Material) => {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 8);
  const o = new THREE.Mesh(g, m); o.castShadow = true;
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return o;
};
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Pimpa, a Lebre Pontual: esquelética, de orelhas partidas, sempre a olhar para um relógio que não pára. */
export function pimpa(): THREE.Group {
  const g = new THREE.Group();
  const fur = dull(0x8c867a), furD = dull(0x5f5a52), vest = dull(0x1b1819), brass = new THREE.MeshStandardMaterial({ color: 0x9a7a2c, roughness: 0.45, metalness: 0.7 });
  // pernas longas e dobradas, pés compridos
  for (const s of [-1, 1]) {
    g.add(limb(V(s * 0.2, 1.35, 0), V(s * 0.28, 0.75, 0.22), 0.1, 0.07, fur));
    g.add(limb(V(s * 0.28, 0.75, 0.22), V(s * 0.24, 0.1, 0.05), 0.07, 0.05, fur));
    g.add(mesh(new THREE.BoxGeometry(0.12, 0.07, 0.5), furD, s * 0.24, 0.05, 0.28));
  }
  // tronco curvado para a frente
  const torso = mesh(new THREE.CapsuleGeometry(0.3, 0.95, 8, 16), fur, 0, 1.95, 0.05); torso.rotation.x = 0.28; g.add(torso);
  const vestM = mesh(new THREE.CylinderGeometry(0.335, 0.31, 0.8, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x1b1819, roughness: 0.95, side: THREE.DoubleSide }), 0, 1.78, 0.1); vestM.rotation.x = 0.28; g.add(vestM);
  for (let k = 0; k < 4; k++) g.add(mesh(sph(0.026), brass, 0, 2.05 - k * 0.17, 0.31 + k * 0.045));
  // braços compridos até aos joelhos, mãos de três dedos
  for (const s of [-1, 1]) {
    const sh = V(s * 0.36, 2.3, 0.06), hand = V(s * 0.5, 1.0, 0.3);
    g.add(limb(sh, hand, 0.075, 0.05, fur));
    g.add(mesh(sph(0.075, 1, 1.4, 0.6), furD, hand.x, hand.y - 0.05, hand.z));
    for (let f = -1; f <= 1; f++) g.add(limb(V(hand.x + f * 0.04, hand.y - 0.1, hand.z), V(hand.x + f * 0.06, hand.y - 0.34, hand.z + 0.02), 0.022, 0.012, furD));
  }
  // relógio de bolso ao quadril, a brilhar, com corrente
  const ct = makeClockTexture();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ map: ct, side: THREE.DoubleSide, color: 0xdcc890 }));
  face.position.set(0.55, 1.12, 0.38); g.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 32), brass); rim.position.copy(face.position); g.add(rim);
  const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.18, 2.0, 0.34), V(0.4, 1.7, 0.46), V(0.5, 1.45, 0.42), V(0.55, 1.42, 0.38)]), 16, 0.012, 5), brass); g.add(chain);
  const wg = glowSprite(0xffc060, 1.3, 0.35); wg.position.copy(face.position); wg.position.z += 0.1; g.add(wg);
  // cabeça comprida, focinho, dentes salientes, olhos fundos a arder
  const head = new THREE.Group(); head.position.set(0, 2.95, 0.42); head.rotation.x = 0.2; g.add(head);
  head.add(mesh(sph(0.3, 0.8, 1.05, 1.25), fur));
  head.add(mesh(sph(0.13, 1, 0.8, 1.3), furD, 0, -0.1, 0.42));
  head.add(mesh(sph(0.045), dull(0x120d0d, 0.5), 0, -0.04, 0.7));
  for (const s of [-1, 1]) {
    head.add(mesh(sph(0.075, 1, 1.15, 0.6), dull(0x0b0909), s * 0.15, 0.1, 0.34));
    head.add(mesh(sph(0.026), emit(0xffd24a, 2.8), s * 0.15, 0.1, 0.4));
    head.add(mesh(new THREE.BoxGeometry(0.06, 0.16, 0.03), dull(0xe0d8c4, 0.6), s * 0.035, -0.22, 0.6));
  }
  // orelhas: uma erguida e dobrada ao meio, outra partida a pender
  const tube = (pts: THREE.Vector3[], r: number, m: THREE.Material) => {
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8), m); t.castShadow = true; head.add(t);
    const e = mesh(sph(r), m, pts[pts.length - 1].x, pts[pts.length - 1].y, pts[pts.length - 1].z); head.add(e);
  };
  tube([V(-0.14, 0.2, -0.05), V(-0.16, 0.9, -0.1), V(-0.2, 1.5, -0.1), V(-0.45, 1.85, -0.1), V(-0.8, 1.8, -0.1)], 0.075, fur);
  tube([V(0.18, 0.2, -0.1), V(0.4, 0.55, -0.1), V(0.7, 0.62, -0.1), V(0.95, 0.3, -0.1), V(1.0, -0.2, -0.1)], 0.07, furD);
  return g;
}

/** Madame Lagarta: larva pálida e enorme, de olhos leitosos, a fumar de um narguilé que respira com ela. */
export function lagarta(): THREE.Group {
  const g = new THREE.Group();
  const skin = dull(0xb8ad7e), band = dull(0x5a5236), belly = dull(0xd2c89a);
  const n = 8;
  const pt = (i: number) => V(Math.sin(i * 0.8) * 0.6, 0.5 + i * 0.5, Math.cos(i * 0.8) * 0.16);
  for (let i = 0; i < n; i++) {
    const r = 0.52 - i * 0.02, p = pt(i);
    g.add(mesh(sph(r, 1, 0.9, 1), i % 2 ? skin : belly, p.x, p.y, p.z));
    const b = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.02, 6, 28), band); b.rotation.x = Math.PI / 2; b.position.set(p.x, p.y + r * 0.45, p.z); g.add(b);
    // mãozinhas finas pelos lados
    for (const s of [-1, 1]) if (i < n - 2) g.add(limb(V(p.x + s * r * 0.8, p.y - 0.05, p.z + 0.1), V(p.x + s * (r + 0.3), p.y - 0.28, p.z + 0.2), 0.03, 0.015, band));
  }
  const hp = pt(n - 1);
  const head = new THREE.Group(); head.position.set(hp.x + 0.05, hp.y + 0.05, hp.z + 0.05); g.add(head);
  head.add(mesh(sph(0.48, 1, 0.95, 1), skin));
  for (const s of [-1, 1]) {
    head.add(mesh(sph(0.16, 1, 1.05, 0.7), dull(0xe8e4cf, 0.4), s * 0.2, 0.05, 0.38));
    head.add(mesh(sph(0.035), dull(0x0a0a08, 0.3), s * 0.2 - s * 0.02, 0.0, 0.5));
    head.add(mesh(new THREE.BoxGeometry(0.3, 0.035, 0.03), dull(0x3a3422), s * 0.2, 0.2, 0.46).rotateZ(s * 0.28));
  }
  head.add(mesh(new THREE.TorusGeometry(0.15, 0.016, 6, 20, Math.PI), dull(0x2a2414), 0, -0.2, 0.44).rotateZ(Math.PI));
  // xaile roto à volta do pescoço
  const shawl = mesh(new THREE.TorusGeometry(0.46, 0.09, 8, 24), dull(0x5a3a62, 0.98), hp.x, hp.y - 0.4, hp.z); shawl.rotation.x = Math.PI / 2; g.add(shawl);
  // narguilé: frasco que brilha de verde, mangueira até à boca, fumo a subir
  const jar = mesh(sph(0.36, 1, 1.1, 1), new THREE.MeshPhysicalMaterial({ color: 0x2a4a3a, transparent: true, opacity: 0.55, roughness: 0.2, depthWrite: false }), -1.05, 0.38, 0.5); g.add(jar);
  g.add(mesh(sph(0.2, 1, 0.9, 1), emit(0x4adf8a, 0.9), -1.05, 0.28, 0.5));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 10), dull(0x3a3a34, 0.6), -1.05, 0.95, 0.5));
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-1.0, 1.25, 0.5), V(-0.5, 1.5, 0.8), V(0.0, hp.y - 0.2, 0.95), V(hp.x, hp.y - 0.17, hp.z + 0.5)]), 24, 0.03, 6), dull(0x4a2a36, 0.7)); g.add(hose);
  for (let i = 0; i < 7; i++) {
    const sm = new THREE.Mesh(sph(0.12 + i * 0.07), new THREE.MeshBasicMaterial({ color: 0x9aa89a, transparent: true, opacity: 0.3 - i * 0.04, depthWrite: false }));
    sm.position.set(hp.x + 0.35 + i * 0.12 + Math.sin(i * 1.6) * 0.15, hp.y - 0.05 + i * 0.28, hp.z + 0.5); g.add(sm);
  }
  return g;
}

/** Sorriso: não tem corpo. Só um sorriso de dentes a mais, dois olhos de fenda e o fumo onde se esconde. */
export function sorriso(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 11; i++) {
    const m = new THREE.Mesh(sph(0.9 + (i % 3) * 0.35), new THREE.MeshBasicMaterial({ color: 0x1c1428, transparent: true, opacity: 0.2, depthWrite: false }));
    m.position.set(Math.sin(i * 2.1) * 1.1, 1.5 + Math.cos(i * 1.3) * 0.9, -0.5 + Math.sin(i) * 0.4); g.add(m);
  }
  // orelhas de gato em silhueta
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.32, 0.8, 3), dull(0x120d1a, 1), s * 1.05, 2.85, -0.2); ear.rotation.z = -s * 0.35; g.add(ear);
  }
  // olhos de fenda
  for (const s of [-1, 1]) {
    const e = mesh(sph(0.26, 1.6, 0.55, 0.4), emit(0xd8e04a, 2.6), s * 0.62, 2.1, 0.25); e.rotation.z = -s * 0.42; g.add(e);
    g.add(mesh(sph(0.045, 0.4, 2.8, 0.3), new THREE.MeshBasicMaterial({ color: 0x0a0610 }), s * 0.62, 2.1, 0.42).rotateZ(-s * 0.42));
  }
  // gengivas + dentes irregulares nas duas filas
  const R = 1.35, cy = 1.9;
  const gum = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 8, 64, Math.PI * 0.9), dull(0x3a0e1c, 0.8));
  gum.rotation.z = Math.PI + Math.PI * 0.05; gum.position.set(0, cy, 0.2); g.add(gum);
  for (let i = 0; i < 17; i++) {
    const t = i / 16, a = Math.PI * 1.5 - 0.7 + t * 1.4, h = 0.18 + Math.sin(i * 2.3) * 0.07 + 0.05;
    const lower = mesh(new THREE.ConeGeometry(0.06, h + 0.12, 5), dull(0xece6d2, 0.5), Math.cos(a) * R, cy + Math.sin(a) * R + 0.1 + h / 2, 0.22);
    g.add(lower);
    if (i % 2 === 0) {
      const up = mesh(new THREE.ConeGeometry(0.05, h, 5), dull(0xe0d8c0, 0.5), Math.cos(a) * (R - 0.1), cy + Math.sin(a) * (R - 0.1) + 0.45 - h / 2, 0.22); up.rotation.x = Math.PI; g.add(up);
    }
  }
  const gl = glowSprite(0xc8d03a, 5, 0.22); gl.position.set(0, 1.9, -0.4); g.add(gl);
  return g;
}

/** Rainha Roseira: cabeça minúscula e pálida sobre um vestido de espinhos e rosas negras, coroa de ferro. */
export function rainha(): THREE.Group {
  const g = new THREE.Group();
  const dress = new THREE.MeshStandardMaterial({ color: 0x3e0d17, roughness: 0.95, side: THREE.DoubleSide });
  const vine = dull(0x141a12, 0.95), rose = dull(0x7a1426, 0.85), iron = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.8 });
  const skin = dull(0xd9d2c6, 0.8);
  // saia monumental
  g.add(mesh(new THREE.CylinderGeometry(0.34, 1.45, 2.3, 28, 1, true), dress, 0, 1.15, 0));
  // trepadeiras em hélice com espinhos
  for (let v = 0; v < 3; v++) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40, y = 0.05 + t * 2.15, rr = 1.46 - t * 1.1, a = t * Math.PI * 5 + v * 2.1;
      pts.push(V(Math.cos(a) * rr * 1.02, y, Math.sin(a) * rr * 1.02));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.035, 6), vine));
    for (let k = 3; k < 40; k += 3) {
      const p = pts[k], th = mesh(new THREE.ConeGeometry(0.03, 0.17, 5), vine, p.x * 1.03, p.y, p.z * 1.03);
      th.quaternion.setFromUnitVectors(V(0, 1, 0), V(p.x, 0.2, p.z).normalize()); g.add(th);
      if (k % 9 === 0) g.add(mesh(sph(0.12, 1, 0.7, 1), rose, p.x * 1.05, p.y, p.z * 1.05));
    }
  }
  // tronco e pescoço longo
  g.add(mesh(new THREE.CapsuleGeometry(0.2, 0.5, 6, 14), dress, 0, 2.55, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 10), skin, 0, 3.05, 0));
  const head = new THREE.Group(); head.position.set(0, 3.5, 0.03); head.rotation.z = 0.07; g.add(head);
  head.add(mesh(sph(0.27, 0.85, 1.2, 0.9), skin));
  for (const s of [-1, 1]) {
    head.add(mesh(sph(0.07, 1.1, 1.5, 0.5), dull(0x0a0608, 0.4), s * 0.1, 0.03, 0.22).rotateZ(-s * 0.18));
    head.add(mesh(sph(0.018), emit(0xff2030, 3), s * 0.1, 0.03, 0.27));
  }
  head.add(mesh(new THREE.BoxGeometry(0.2, 0.012, 0.02), dull(0x2a0810, 0.6), 0, -0.14, 0.24));
  for (let k = -3; k <= 3; k++) head.add(mesh(new THREE.BoxGeometry(0.006, 0.05, 0.015), dull(0x2a0810, 0.6), k * 0.03, -0.14, 0.24));
  // coroa de ferro e espinhos
  const crown = new THREE.Group(); crown.position.y = 0.3; head.add(crown);
  crown.add(mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 28), iron).rotateX(Math.PI / 2));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, h = 0.3 + (i % 3) * 0.14;
    const sp = mesh(new THREE.ConeGeometry(0.03, h, 5), iron, Math.cos(a) * 0.22, h / 2, Math.sin(a) * 0.22); sp.rotation.z = -Math.cos(a) * 0.25; sp.rotation.x = Math.sin(a) * 0.25; crown.add(sp);
  }
  crown.add(mesh(sph(0.055), emit(0xff2030, 2.4), 0, 0.05, 0.23));
  // braço longo com cetro: um espadas gigante
  const sh = V(0.24, 2.8, 0.05), hand = V(1.2, 3.0, 0.4);
  g.add(limb(sh, hand, 0.055, 0.04, skin));
  g.add(mesh(sph(0.07, 1, 1.3, 0.6), skin, hand.x, hand.y, hand.z));
  for (let f = 0; f < 4; f++) g.add(limb(V(hand.x + 0.05, hand.y + 0.03, hand.z + (f - 1.5) * 0.04), V(hand.x + 0.28, hand.y + 0.1 + f * 0.02, hand.z + (f - 1.5) * 0.06), 0.014, 0.008, iron));
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.7, 8), iron, 1.25, 1.65, 0.4));
  const spade = mesh(new THREE.OctahedronGeometry(0.3), iron, 1.25, 3.2, 0.4); spade.scale.set(0.85, 1.3, 0.25); g.add(spade);
  g.add(mesh(sph(0.1), emit(0xff2030, 2), 1.25, 3.2, 0.5));
  const gl = glowSprite(0xff2030, 1.6, 0.3); gl.position.set(0, 3.5, 0.3); g.add(gl);
  return g;
}
