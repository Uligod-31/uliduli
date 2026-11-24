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

/** Mão com dedos curvados: palma + 4 dedos de duas falanges. */
const hand = (g: THREE.Group, at: THREE.Vector3, dir: THREE.Vector3, m: THREE.Material, len = 0.2, curl = 0.5) => {
  g.add(mesh(sph(0.075, 1, 0.8, 1.1), m, at.x, at.y, at.z));
  const d = dir.clone().normalize();
  const side = new THREE.Vector3().crossVectors(d, V(0, 0, 1)); if (side.lengthSq() < 0.01) side.set(1, 0, 0); side.normalize();
  for (let f = 0; f < 4; f++) {
    const p0 = at.clone().addScaledVector(side, (f - 1.5) * 0.042).addScaledVector(d, 0.06);
    const mid = p0.clone().addScaledVector(d, len * 0.55);
    const p1 = mid.clone().addScaledVector(d, len * 0.45 * (1 - curl)).add(V(0, -len * 0.45 * curl, 0.05 * curl));
    g.add(limb(p0, mid, 0.015, 0.012, m)); g.add(limb(mid, p1, 0.012, 0.008, m));
  }
};

/** Corrente de elos a seguir uma curva. */
const chainAlong = (g: THREE.Group, pts: THREE.Vector3[], n: number, m: THREE.Material, r = 0.035) => {
  const cv = new THREE.CatmullRomCurve3(pts);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = cv.getPoint(t), tan = cv.getTangent(t);
    const l = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.3, 6, 12), m); l.position.copy(p);
    l.quaternion.setFromUnitVectors(V(0, 0, 1), tan); l.rotateZ(i % 2 ? Math.PI / 2 : 0); l.scale.set(1, 1.5, 1); l.castShadow = true; g.add(l);
  }
};

/** Chave de esqueleto: argola, haste e dentes. */
const skeletonKey = (m: THREE.Material, s = 1) => {
  const k = new THREE.Group();
  k.add(mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 14), m, 0, 0.0, 0));
  k.add(mesh(new THREE.BoxGeometry(0.026, 0.34, 0.022), m, 0, -0.22, 0));
  k.add(mesh(new THREE.BoxGeometry(0.09, 0.03, 0.022), m, 0.05, -0.34, 0));
  k.add(mesh(new THREE.BoxGeometry(0.07, 0.03, 0.022), m, 0.04, -0.28, 0));
  k.scale.setScalar(s); return k;
};

/** O Carcereiro: gigante de capa rasgada, ombreiras de ferro, chifres de carneiro, máscara de osso cosida a agrafos, bandoleira de chaves e uma lanterna de prisão. */
export function carcereiro(): THREE.Group {
  const g = new THREE.Group();
  const cloak = new THREE.MeshStandardMaterial({ color: 0x150e0e, roughness: 0.98, side: THREE.DoubleSide });
  const lining = new THREE.MeshStandardMaterial({ color: 0x3a1010, roughness: 0.95, side: THREE.DoubleSide });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2c33, roughness: 0.42, metalness: 0.88 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 0.55, metalness: 0.7 });
  const bone = dull(0xcfc7b0, 0.78), black = dull(0x050303, 0.4);
  // capa em cone com bainha rasgada
  g.add(mesh(new THREE.CylinderGeometry(0.44, 1.32, 2.9, 26, 1, true), cloak, 0, 1.45, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.4, 1.26, 2.86, 26, 1, true), lining, 0, 1.45, 0));
  for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2, c = mesh(new THREE.ConeGeometry(0.15, 0.5 + (k % 4) * 0.2, 4), cloak, Math.cos(a) * 1.3, 0.34, Math.sin(a) * 1.3); c.rotation.set(Math.PI, a, 0); g.add(c); }
  // ombreiras de ferro com picos e rebites
  for (const s of [-1, 1]) {
    g.add(mesh(sph(0.36, 1.25, 0.7, 1.05), iron, s * 0.62, 2.88, 0));
    for (let k = 0; k < 4; k++) { const sp = mesh(new THREE.ConeGeometry(0.055, 0.42 - k * 0.05, 6), iron, s * (0.5 + k * 0.17), 3.15 - k * 0.05, 0.02); sp.rotation.z = -s * (0.75 + k * 0.28); g.add(sp); }
    for (let k = 0; k < 6; k++) { const a = k * 1.05; g.add(mesh(sph(0.028), rust, s * 0.62 + Math.cos(a) * 0.3, 2.9 + Math.sin(a) * 0.07, Math.sin(a) * 0.3)); }
    g.add(limb(V(s * 0.6, 2.75, 0.05), V(s * 1.02, 1.75, 0.58), 0.13, 0.095, cloak));
    g.add(limb(V(s * 1.02, 1.75, 0.58), V(s * 1.0, 1.3, 0.95), 0.09, 0.07, cloak));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), iron, s * 1.0, 1.32, 0.94).rotateX(0.5));   // braçadeira
  }
  hand(g, V(-1.0, 1.25, 0.98), V(0.15, -1, 0.2), bone, 0.2, 0.9);
  hand(g, V(1.0, 1.25, 0.98), V(-0.1, -1, 0.2), bone, 0.2, 0.9);
  // colar de ferro e bandoleira de correntes com chaves
  g.add(mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 24), iron, 0, 3.02, 0.02).rotateX(Math.PI / 2));
  const surf = (x: number, y: number, off = 0.06) => { const r = 0.44 + 0.88 * (2.9 - y) / 2.9 + off; return V(x, y, Math.sqrt(Math.max(0.01, r * r - x * x))); };
  chainAlong(g, [surf(-0.5, 2.8), surf(-0.22, 2.3), surf(0.2, 1.8), surf(0.55, 1.2)], 28, iron, 0.036);
  chainAlong(g, [surf(0.5, 2.8), surf(0.22, 2.3), surf(-0.2, 1.8), surf(-0.55, 1.2)], 28, iron, 0.036);
  g.add(mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 20), iron, 0, 1.96, surf(0, 1.96, 0.08).z));   // argola das chaves
  for (let k = 0; k < 6; k++) { const x = -0.5 + k * 0.2, y = 1.78 - Math.abs(k - 2.5) * 0.06, key = skeletonKey(k % 2 ? iron : rust, 1.1 + (k % 3) * 0.12); key.position.copy(surf(x, y, 0.1)); key.rotation.z = (k - 2.5) * 0.1; g.add(key); }
  // cinto
  g.add(mesh(new THREE.CylinderGeometry(0.74, 0.8, 0.12, 24, 1, true), iron, 0, 1.0, 0));
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.18, 0.05), rust, 0, 1.0, 0.76));
  // capuz e cabeça de osso
  g.add(mesh(sph(0.5, 1.2, 1.1, 0.8), cloak, 0, 3.3, -0.36));
  const head = new THREE.Group(); head.position.set(0, 3.36, 0.1); g.add(head);
  head.add(mesh(sph(0.31, 0.82, 1.2, 0.92), bone));
  head.add(mesh(sph(0.1, 1.5, 0.35, 0.6), dull(0xb7ae96, 0.8), 0, 0.17, 0.22));  // testa
  for (const s of [-1, 1]) {
    head.add(mesh(sph(0.085, 1.3, 0.75, 0.55), black, s * 0.115, 0.07, 0.24).rotateZ(-s * 0.2));
    head.add(mesh(sph(0.036, 1.7, 0.55, 0.5), emit(0xff6a1a, 3.2), s * 0.115, 0.065, 0.285).rotateZ(-s * 0.2));
    head.add(mesh(new THREE.BoxGeometry(0.17, 0.03, 0.05), black, s * 0.12, 0.17, 0.26).rotateZ(-s * 0.3));  // sobrancelha
    // chifres de carneiro: espiral grossa com anéis
    const hp = [V(s * 0.2, 0.18, 0), V(s * 0.5, 0.34, -0.06), V(s * 0.76, 0.12, 0.02), V(s * 0.82, -0.2, 0.18), V(s * 0.66, -0.34, 0.3)];
    const cv = new THREE.CatmullRomCurve3(hp);
    for (let k = 0; k < 14; k++) { const t = k / 13, p = cv.getPoint(t), rr = 0.1 - t * 0.07; const ring = mesh(new THREE.TorusGeometry(rr, 0.016, 6, 14), dull(0x2e241b, 0.75), p.x, p.y, p.z); ring.quaternion.setFromUnitVectors(V(0, 0, 1), cv.getTangent(t)); head.add(ring); }
    const horn = new THREE.Mesh(new THREE.TubeGeometry(cv, 28, 0.065, 8), dull(0x3a2e24, 0.7)); horn.castShadow = true; head.add(horn);
  }
  // boca cosida com agrafos de ferro
  head.add(mesh(new THREE.BoxGeometry(0.24, 0.02, 0.03), black, 0, -0.18, 0.27));
  for (let k = -4; k <= 4; k++) { head.add(mesh(new THREE.BoxGeometry(0.012, 0.075, 0.022), black, k * 0.028, -0.18, 0.275)); head.add(mesh(new THREE.BoxGeometry(0.016, 0.02, 0.026), iron, k * 0.028, -0.145, 0.28)); }
  head.add(mesh(new THREE.ConeGeometry(0.03, 0.12, 5), black, 0, -0.01, 0.3).rotateX(-1.2));   // nariz de caveira
  // lanterna de prisão na mão direita
  const lan = new THREE.Group(); lan.position.set(-1.02, 0.86, 1.02); lan.scale.setScalar(1.25); g.add(lan);
  lan.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.38, 10, 1, true), iron));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; lan.add(mesh(new THREE.BoxGeometry(0.018, 0.4, 0.018), iron, Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17)); }
  lan.add(mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 10), iron, 0, 0.21, 0)); lan.add(mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 10), iron, 0, -0.21, 0));
  lan.add(mesh(new THREE.SphereGeometry(0.09, 12, 10), emit(0xffa040, 3.4), 0, 0, 0));
  const lg = glowSprite(0xff7a2a, 1.4, 0.8); lg.position.set(0, 0, 0); lan.add(lg);
  lan.add(limb(V(0, 0.21, 0), V(0.0, 0.5, -0.05), 0.012, 0.012, iron));
  const lp = new THREE.PointLight(0xff7a2a, 7, 5.5, 2); lp.position.set(-0.9, 1.1, 1.5); g.add(lp);
  // bola de ferro com picos, presa por corrente à mão esquerda
  chainAlong(g, [V(1.0, 1.15, 0.98), V(1.18, 0.7, 1.05), V(1.3, 0.35, 1.0)], 8, iron, 0.03);
  const ball = new THREE.Group(); ball.position.set(1.3, 0.3, 1.0); g.add(ball);
  ball.add(mesh(sph(0.2), iron));
  for (let k = 0; k < 14; k++) { const u = (k + 0.5) / 14, th = Math.acos(1 - 2 * u), ph = k * 2.4; const sp = mesh(new THREE.ConeGeometry(0.03, 0.13, 5), iron, 0, 0, 0); const n = V(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)); sp.position.copy(n).multiplyScalar(0.23); sp.quaternion.setFromUnitVectors(V(0, 1, 0), n); ball.add(sp); }
  const gl = glowSprite(0xff5a1a, 7, 0.38); gl.position.set(0, 1.8, -1.2); g.add(gl);
  return g;
}

/** Dona Geada: figura pálida de vestido de gelo em camadas, colar de cristais, cabelo de pingentes, coroa gélida e um espelho de gelo nas mãos. */
export function geada(): THREE.Group {
  const g = new THREE.Group();
  const ice = new THREE.MeshPhysicalMaterial({ color: 0xaed4ea, roughness: 0.16, metalness: 0.1, transparent: true, opacity: 0.88, clearcoat: 1 });
  const iceD = new THREE.MeshPhysicalMaterial({ color: 0x6fa0c4, roughness: 0.22, metalness: 0.1, transparent: true, opacity: 0.9, clearcoat: 1, side: THREE.DoubleSide });
  const skin = dull(0xdce6ee, 0.55), lip = dull(0x5a7fa8, 0.5), crystal = new THREE.MeshBasicMaterial({ color: hdr(0x8fe0ff, 1.9), toneMapped: false });
  // vestido em três camadas, cada uma mais larga, com bainha de cristais
  const tiers: [number, number, number, number][] = [[0.36, 0.82, 1.05, 1.9], [0.78, 1.12, 0.9, 1.0], [1.1, 1.5, 0.85, 0.35]];
  for (const [r0, r1, h, y] of tiers) {
    g.add(mesh(new THREE.CylinderGeometry(r0, r1, h, 26, 1, true), iceD, 0, y + h / 2 - 0.15, 0));
    const n = Math.round(r1 * 20);
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, c = mesh(new THREE.ConeGeometry(0.05, 0.22 + (k % 4) * 0.1, 5), ice, Math.cos(a) * r1, y - 0.1, Math.sin(a) * r1); c.rotation.set(Math.PI + Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); g.add(c); }
  }
  // corpete, ombros largos e pescoço
  g.add(mesh(new THREE.CapsuleGeometry(0.3, 0.42, 6, 16), ice, 0, 2.55, 0));
  g.add(mesh(sph(0.3, 1.9, 0.5, 0.95), iceD, 0, 2.86, 0));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, c = mesh(new THREE.ConeGeometry(0.045, 0.24 + (k % 3) * 0.08, 5), crystal, Math.cos(a) * 0.2, 3.02, Math.sin(a) * 0.2); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(c); }
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; g.add(limb(V(Math.cos(a) * 0.42, 2.8, Math.sin(a) * 0.42), V(Math.cos(a) * 1.25, 0.4, Math.sin(a) * 1.25), 0.012, 0.012, new THREE.MeshBasicMaterial({ color: hdr(0xbfeaff, 1.2), toneMapped: false, transparent: true, opacity: 0.45 }))); }
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.38, 12), skin, 0, 3.12, 0));
  // colar de cristais
  for (let k = 0; k < 11; k++) { const a = -0.9 + (k / 10) * 1.8 + Math.PI / 2 - Math.PI / 2; const x = Math.sin(a) * 0.3, c = mesh(new THREE.ConeGeometry(0.035, 0.16 + (k % 3) * 0.06, 5), crystal, x, 2.98 - Math.abs(x) * 0.18, 0.2 + Math.cos(a) * 0.08); c.rotation.x = Math.PI; g.add(c); }
  const head = new THREE.Group(); head.position.set(0, 3.52, 0.03); head.rotation.z = -0.05; g.add(head);
  head.add(mesh(sph(0.28, 0.82, 1.18, 0.92), skin));
  for (const s of [-1, 1]) {
    head.add(mesh(sph(0.075, 1.3, 0.85, 0.5), dull(0x05080c, 0.4), s * 0.105, 0.03, 0.235).rotateZ(-s * 0.18));
    head.add(mesh(sph(0.032, 1.6, 0.7, 0.5), emit(0x7fd8ff, 3.2), s * 0.105, 0.03, 0.285).rotateZ(-s * 0.18));
    head.add(mesh(new THREE.BoxGeometry(0.14, 0.012, 0.02), dull(0x203a52, 0.5), s * 0.105, 0.11, 0.26).rotateZ(-s * 0.25));   // sobrancelha geada
  }
  head.add(mesh(new THREE.BoxGeometry(0.1, 0.022, 0.03), lip, 0, -0.14, 0.25));
  head.add(mesh(new THREE.ConeGeometry(0.02, 0.1, 5), skin, 0, -0.03, 0.27).rotateX(-1.3));
  // cabelo: cascata de pingentes por trás dos ombros
  for (let k = 0; k < 34; k++) { const sd = k % 2 ? 1 : -1, x = sd * (0.16 + (k % 7) * 0.05), len = 0.8 + (k % 6) * 0.3; const c = mesh(new THREE.ConeGeometry(0.032, len, 5), ice, x, 3.4 - len / 2 - (k % 3) * 0.04, -0.12 - (k % 4) * 0.05); c.rotation.x = Math.PI; g.add(c); }
  // coroa de cristais (alta) e halo de geada
  const crown = new THREE.Group(); crown.position.y = 0.3; head.add(crown);
  for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2, h = 0.36 + (i % 3) * 0.22; const sp = mesh(new THREE.ConeGeometry(0.042, h, 5), crystal, Math.cos(a) * 0.23, h / 2, Math.sin(a) * 0.23); sp.rotation.z = -Math.cos(a) * 0.32; sp.rotation.x = Math.sin(a) * 0.32; crown.add(sp); }
  const halo = mesh(new THREE.TorusGeometry(0.62, 0.012, 6, 40), new THREE.MeshBasicMaterial({ color: hdr(0xbfeaff, 1.6), toneMapped: false, transparent: true, opacity: 0.7 }), 0, 0.2, -0.2); head.add(halo);
  // os dois braços seguram um espelho de gelo diante do peito
  const mir = new THREE.Group(); mir.position.set(0.0, 2.2, 0.72); g.add(mir);
  mir.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32), new THREE.MeshPhysicalMaterial({ color: 0xe6f6ff, roughness: 0.02, metalness: 0.9, clearcoat: 1 }), 0, 0, 0).rotateX(Math.PI / 2));
  const mrim = mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 32), crystal, 0, 0, 0); mir.add(mrim);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const sp = mesh(new THREE.ConeGeometry(0.04, 0.2, 5), crystal, Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0); sp.rotation.z = a - Math.PI / 2; mir.add(sp); }
  const refl = mesh(new THREE.CircleGeometry(0.36, 28), new THREE.MeshBasicMaterial({ color: hdr(0x8fe0ff, 0.9), transparent: true, opacity: 0.4, toneMapped: false }), 0, 0, 0.03); mir.add(refl);
  for (const s of [-1, 1]) {
    g.add(limb(V(s * 0.5, 2.85, 0.05), V(s * 0.58, 2.35, 0.55), 0.08, 0.055, ice));
    g.add(limb(V(s * 0.58, 2.35, 0.55), V(s * 0.44, 2.2, 0.78), 0.055, 0.04, skin));
    hand(g, V(s * 0.42, 2.2, 0.8), V(-s * 0.5, 0.3, 0.4), skin, 0.14, 0.3);
  }
  // hálito gelado
  for (let k = 0; k < 7; k++) { const sp = glowSprite(0xcfeaff, 0.35 + k * 0.17, 0.2 - k * 0.022); sp.position.set(0.06 + k * 0.16, 3.38 - k * 0.07, 0.4 + k * 0.1); g.add(sp); }
  const gl = glowSprite(0x7fd8ff, 5, 0.28); gl.position.set(0, 2.2, -0.5); g.add(gl);
  return g;
}

/** O Relojoeiro: velho curvado de chapéu de latão, monóculo enorme, auréola de engrenagens, relógios de bolso presos a correntes e braços a mais com ferramentas. */
export function relojoeiro(): THREE.Group {
  const g = new THREE.Group();
  const coat = dull(0x2a2118, 0.95), coatL = dull(0x3b2e20, 0.9), brass = new THREE.MeshStandardMaterial({ color: 0xb78a3a, roughness: 0.32, metalness: 0.88, emissive: 0x3a2506, emissiveIntensity: 0.6 }), steel = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.3, metalness: 0.9 }), skin = dull(0xc9b79d, 0.85), hair = dull(0xe4ddd0, 0.9);
  const body = mesh(new THREE.CapsuleGeometry(0.46, 1.0, 8, 18), coat, 0, 1.55, 0); body.rotation.x = 0.25; g.add(body);
  g.add(mesh(sph(0.5, 1.2, 0.55, 0.9), coatL, 0, 2.2, 0.1));   // ombros
  for (const s of [-1, 1]) { g.add(limb(V(s * 0.22, 1.0, 0), V(s * 0.28, 0.12, 0.1), 0.11, 0.08, coat)); g.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 0.44), dull(0x15100b, 0.7), s * 0.28, 0.04, 0.2)); }
  // relógio na barriga + corrente de relógios de bolso
  const ct = makeClockTexture(); const face = new THREE.Mesh(new THREE.CircleGeometry(0.3, 30), new THREE.MeshBasicMaterial({ map: ct, side: THREE.DoubleSide, color: 0xdcc890 })); face.position.set(0, 1.5, 0.47); face.rotation.x = 0.25; g.add(face);
  g.add(mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 30), brass, 0, 1.5, 0.47).rotateX(0.25));
  chainAlong(g, [V(-0.4, 2.0, 0.42), V(-0.5, 1.5, 0.52), V(-0.3, 1.0, 0.55)], 14, brass, 0.025);
  for (let k = 0; k < 3; k++) { const pw = new THREE.Group(); pw.position.set(-0.3 + k * 0.28, 0.82 - k * 0.04, 0.58); pw.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 20), brass).rotateX(Math.PI / 2)); pw.add(mesh(new THREE.CircleGeometry(0.085, 20), new THREE.MeshBasicMaterial({ color: 0xe8dcb8 }), 0, 0, 0.025)); pw.add(mesh(new THREE.BoxGeometry(0.01, 0.06, 0.005), dull(0x120c06), 0, 0.02, 0.03)); g.add(pw); }
  // cabeça: calva com tufos, nariz grande, monóculo e chapéu de latão
  const head = new THREE.Group(); head.position.set(0, 2.55, 0.3); head.rotation.x = 0.22; g.add(head);
  head.add(mesh(sph(0.38, 1, 1.12, 1), skin));
  head.add(mesh(sph(0.14, 1.1, 0.85, 1.1), skin, 0, -0.06, 0.37));   // nariz
  for (const s of [-1, 1]) { for (let k = 0; k < 6; k++) { const t = mesh(new THREE.ConeGeometry(0.035, 0.2 + (k % 3) * 0.08, 5), hair, s * 0.36, 0.1 - k * 0.04, -0.05 + (k % 2) * 0.06); t.rotation.z = s * (1.2 + k * 0.1); head.add(t); } }
  for (let k = 0; k < 9; k++) { const sd = (k - 4) / 4; const t = mesh(new THREE.ConeGeometry(0.04, 0.2 + (k % 3) * 0.1, 5), hair, sd * 0.2, -0.3, 0.3); t.rotation.set(Math.PI + 0.2, 0, sd * 0.4); head.add(t); }  // bigode/barba
  head.add(mesh(sph(0.1, 1, 0.6, 0.5), dull(0x0b0705, 0.4), -0.16, 0.1, 0.32));
  head.add(mesh(sph(0.04), emit(0xffe9a0, 3), -0.16, 0.1, 0.37));
  head.add(mesh(new THREE.BoxGeometry(0.16, 0.02, 0.03), dull(0x201510, 0.6), -0.16, 0.2, 0.34).rotateZ(0.25));  // sobrancelha
  const mono = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 28), brass); mono.position.set(0.15, 0.1, 0.34); head.add(mono);
  head.add(mesh(new THREE.CircleGeometry(0.22, 28), new THREE.MeshBasicMaterial({ color: hdr(0xffe9a0, 1.1), transparent: true, opacity: 0.7, toneMapped: false }), 0.15, 0.1, 0.345));
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; head.add(mesh(new THREE.BoxGeometry(0.03, 0.07, 0.01), brass, 0.15 + Math.cos(a) * 0.15, 0.1 + Math.sin(a) * 0.15, 0.352).rotateZ(a)); }  // íris de engrenagem
  chainAlong(head, [V(0.15, -0.14, 0.34), V(0.3, -0.5, 0.3), V(0.35, -0.9, 0.3)], 8, brass, 0.02);
  head.add(mesh(new THREE.BoxGeometry(0.22, 0.03, 0.02), dull(0x201510, 0.6), 0, -0.25, 0.36));
  const hat = new THREE.Group(); hat.position.set(0, 0.42, 0); hat.rotation.z = 0.12; head.add(hat);
  hat.add(mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.34, 24), brass, 0, 0.12, 0)); hat.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 28), brass, 0, -0.06, 0));
  hat.add(mesh(new THREE.TorusGeometry(0.29, 0.03, 8, 28), dull(0x2a1a0a, 0.7), 0, 0.0, 0).rotateX(Math.PI / 2));
  hat.add(mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ map: makeClockTexture(), color: 0xdcc890 }), 0, 0.12, 0.3));
  // auréola de engrenagens
  const gear = (r: number, n: number, x: number, y: number, z: number, rot: number) => { const gg = new THREE.Group(); gg.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.12, 6, 24), brass)); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.26, r * 0.3, r * 0.14), brass); t.position.set(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12, 0); t.rotation.z = a; gg.add(t); } for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 1.9, r * 0.08, r * 0.06), brass); sp.rotation.z = (i / 3) * Math.PI; gg.add(sp); } gg.position.set(x, y, z); gg.rotation.z = rot; return gg; };
  g.add(gear(0.8, 14, 0, 3.15, -0.55, 0), gear(0.45, 9, 0.95, 3.5, -0.45, 0.4), gear(0.32, 8, -0.9, 3.5, -0.4, 0.2), gear(0.28, 8, 0.55, 2.3, -0.7, 0.9));
  // quatro braços com ferramentas (pinça, chave de parafusos, lupa, martelo)
  for (let k = 0; k < 4; k++) {
    const s = k % 2 ? 1 : -1, low = k > 1, y = 1.95 + (low ? -0.35 : 0.1), ex = s * (0.95 + (low ? 0.12 : 0)), ey = y - 0.25, ez = 0.55 + k * 0.05;
    g.add(limb(V(s * 0.42, y, 0.05), V(ex, ey, ez), 0.075, 0.05, coat));
    g.add(limb(V(ex, ey, ez), V(s * (1.2 + k * 0.03), ey + 0.3, 0.8), 0.05, 0.035, coat));
    const hp = V(s * (1.2 + k * 0.03), ey + 0.32, 0.82);
    hand(g, hp, V(s * 0.3, 0.9, 0.2), skin, 0.1, 0.5);
    if (k === 0) { g.add(limb(hp, hp.clone().add(V(-0.05, 0.5, 0.1)), 0.012, 0.004, steel)); g.add(limb(hp, hp.clone().add(V(0.05, 0.5, 0.1)), 0.012, 0.004, steel)); }
    if (k === 1) g.add(limb(hp, hp.clone().add(V(0.1, 0.55, 0.1)), 0.02, 0.008, steel));
    if (k === 2) { g.add(mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 18), brass, hp.x, hp.y + 0.2, hp.z + 0.1)); g.add(limb(hp, hp.clone().add(V(0, 0.15, 0.1)), 0.012, 0.012, brass)); }
    if (k === 3) { g.add(limb(hp, hp.clone().add(V(0, 0.3, 0.1)), 0.015, 0.015, dull(0x4a2a12))); g.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 0.08), steel, hp.x, hp.y + 0.36, hp.z + 0.1)); }
  }
  const gl = glowSprite(0xe8b04a, 4.4, 0.3); gl.position.set(0, 2.4, -0.6); g.add(gl);
  return g;
}

/** O Bibliotecário: figura esguia de manto forrado a lombadas de livros, com um livro aberto de olhos a arder no lugar da cara e páginas a flutuar. */
export function bibliotecario(): THREE.Group {
  const g = new THREE.Group();
  const robe = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.96, side: THREE.DoubleSide }), leather = dull(0x5a2e1a, 0.6), leatherD = dull(0x3a1c10, 0.7), gold = new THREE.MeshStandardMaterial({ color: 0xc9a13a, metalness: 0.8, roughness: 0.35, emissive: 0x4a3008, emissiveIntensity: 0.7 }), paper = dull(0xdccfae, 0.9);
  g.add(mesh(new THREE.CylinderGeometry(0.34, 1.12, 2.7, 22, 1, true), robe, 0, 1.35, 0));
  g.add(mesh(sph(0.46, 1.15, 0.8, 0.85), robe, 0, 2.78, 0));
  // saia coberta de lombadas de livros
  const BC = [0x6a1c1c, 0x1c3a5a, 0x2c4a2c, 0x7a4a1c, 0x4a2c5a, 0x8a6a2c, 0x2a2a3a];
  for (let row = 0; row < 3; row++) {
    const y = 0.35 + row * 0.55, r = 1.1 - row * 0.2, n = 24 - row * 3;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2; if (Math.sin(a) < -0.3) continue;   // só a parte da frente
      const h = 0.34 + ((k * 7) % 5) * 0.04, w = 0.09 + ((k * 3) % 3) * 0.02;
      const b = mesh(new THREE.BoxGeometry(w, h, 0.1), dull(BC[(k + row) % BC.length], 0.7), Math.cos(a) * (r + 0.02), y, Math.sin(a) * (r + 0.02)); b.rotation.y = -a + Math.PI / 2; g.add(b);
      g.add(mesh(new THREE.BoxGeometry(w * 0.9, 0.012, 0.102), gold, Math.cos(a) * (r + 0.021), y + h * 0.2, Math.sin(a) * (r + 0.021)).rotateY(-a + Math.PI / 2));
    }
  }
  for (const s of [-1, 1]) {
    g.add(limb(V(s * 0.45, 2.7, 0.05), V(s * 0.88, 1.9, 0.55), 0.09, 0.055, robe));
    hand(g, V(s * 0.9, 1.84, 0.6), V(-s * 0.2, -0.7, 0.4), dull(0xcdbfa6, 0.8), 0.17, 0.7);
  }
  // pena de escrever numa mão e candeia na outra
  g.add(limb(V(0.9, 1.78, 0.62), V(1.1, 2.5, 0.7), 0.012, 0.004, dull(0xe6dcc0, 0.8)));
  g.add(mesh(new THREE.ConeGeometry(0.06, 0.45, 6), dull(0xe6dcc0, 0.8), 1.16, 2.7, 0.72).rotateZ(-0.3));
  const can = new THREE.Group(); can.position.set(-0.95, 1.55, 0.75); g.add(can);
  can.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.06, 12), gold, 0, -0.04, 0)); can.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), paper, 0, 0.07, 0));
  can.add(mesh(new THREE.SphereGeometry(0.035, 8, 8), emit(0xffa040, 3.4), 0, 0.17, 0)); const cg = glowSprite(0xffa040, 1.0, 0.8); cg.position.set(0, 0.17, 0); can.add(cg);
  // cabeça: livro aberto virado para nós (as páginas fazem o rosto)
  const head = new THREE.Group(); head.position.set(0, 3.45, 0.1); head.scale.setScalar(1.5); g.add(head);
  const spineBox = mesh(new THREE.BoxGeometry(0.1, 0.72, 0.12), leatherD, 0, 0, -0.1); head.add(spineBox);
  head.add(mesh(new THREE.BoxGeometry(0.11, 0.7, 0.14), gold, 0, 0, -0.1));
  for (const s of [-1, 1]) {
    const hf = new THREE.Group(); hf.position.set(s * 0.04, 0, -0.04); hf.rotation.y = -s * 0.5; head.add(hf);
    hf.add(mesh(new THREE.BoxGeometry(0.5, 0.7, 0.05), leather, s * 0.25, 0, -0.045));          // capa por trás
    for (let p = 0; p < 4; p++) hf.add(mesh(new THREE.BoxGeometry(0.46, 0.66, 0.008), paper, s * 0.25, 0, -0.012 + p * 0.007));   // folhas
    hf.add(mesh(new THREE.PlaneGeometry(0.44, 0.64), new THREE.MeshBasicMaterial({ color: hdr(0xffe9b0, 0.9), toneMapped: false, side: THREE.DoubleSide }), s * 0.25, 0, 0.02));
    for (let k = 0; k < 9; k++) hf.add(mesh(new THREE.BoxGeometry(0.28 - (k % 3) * 0.06, 0.012, 0.004), dull(0x3a2a14, 0.7), s * 0.25, 0.25 - k * 0.055, 0.024));
    hf.add(mesh(new THREE.BoxGeometry(0.5, 0.03, 0.06), gold, s * 0.25, 0.34, -0.045)); hf.add(mesh(new THREE.BoxGeometry(0.5, 0.03, 0.06), gold, s * 0.25, -0.34, -0.045));  // cantoneiras
    // olho que arde na página
    hf.add(mesh(sph(0.075, 1.2, 0.8, 0.4), dull(0x0b0705, 0.4), s * 0.2, 0.1, 0.03));
    hf.add(mesh(sph(0.04, 1.4, 0.8, 0.4), emit(0xff7a2a, 3.4), s * 0.2, 0.1, 0.045));
  }
  // marcador de fita a pender como uma língua
  const rib = mesh(new THREE.BoxGeometry(0.05, 0.5, 0.006), dull(0x8a1c1c, 0.6), 0, -0.55, 0.0); rib.rotation.x = 0.1; head.add(rib);
  head.add(mesh(new THREE.ConeGeometry(0.03, 0.06, 3), dull(0x8a1c1c, 0.6), 0, -0.83, 0.0).rotateX(Math.PI));
  // páginas e pergaminhos a flutuar
  for (let k = 0; k < 18; k++) { const a = k * 2.4, p = mesh(new THREE.PlaneGeometry(0.34, 0.46), new THREE.MeshBasicMaterial({ color: hdr(0xf2e2b0, 0.9), side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), Math.cos(a) * (0.95 + (k % 4) * 0.28), 1.0 + (k % 8) * 0.38, Math.sin(a) * 0.6 + 0.3); p.rotation.set(k, a, k * 0.5); g.add(p); }
  const gl = glowSprite(0xffd98a, 4, 0.4); gl.position.set(0, 3.3, 0.2); g.add(gl);
  return g;
}
