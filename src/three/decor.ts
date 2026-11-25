import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowTexture, hdr } from './common';
import { mossDecal, puddleBlob } from './pbr';

export interface DecorOpts {
  cols: number;
  rows: number;
  open: number[];
  reserved: Set<number>;
  segs: { x1: number; y1: number; x2: number; y2: number }[];
  rng: () => number;
  style: 'garden' | 'planet' | 'ice' | 'hell' | 'clock' | 'library' | 'elfic' | 'viking' | 'egypt' | 'mandala' | 'ink' | 'neon' | 'space' | 'stars' | 'angel' | 'animal' | 'rock';
  accent: number;
  wallH: number;
  wallT: number;
}

export interface Decor {
  group: THREE.Group;
  update(t: number): void;
}

const col = (g: THREE.BufferGeometry, hex: number) => {
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};
const merge = (gs: THREE.BufferGeometry[]) => {
  const flat = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of flat) { g.deleteAttribute('uv'); }
  return mergeGeometries(flat, false)!;
};

/**
 * Detalhe de cenário: musgo, poças, entulho, ossos, caveiras, ervas secas, lápides, velas, cogumelos
 * e archotes nas paredes. Tudo em malhas instanciadas (poucas chamadas de desenho).
 */
export function buildDecor(o: DecorOpts): Decor {
  const group = new THREE.Group();
  const { cols, rows, rng } = o;
  const px = (i: number) => (i % cols) + 0.5 - cols / 2;
  const pz = (i: number) => ((i / cols) | 0) + 0.5 - rows / 2;
  const free = o.open.filter((i) => !o.reserved.has(i));
  const pick = (frac: number) => free.filter(() => rng() < frac);
  const place = (list: number[], make: (i: number, x: number, z: number) => THREE.Matrix4, mesh: THREE.InstancedMesh) => {
    list.forEach((i, k) => { const x = px(i) + (rng() - 0.5) * 0.7, z = pz(i) + (rng() - 0.5) * 0.7; mesh.setMatrixAt(k, make(i, x, z)); });
    mesh.instanceMatrix.needsUpdate = true;
  };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  const compose = (x: number, y: number, z: number, ry: number, sx: number, sy = sx, sz = sx) => M.compose(new THREE.Vector3(x, y, z), Q.setFromEuler(E.set(0, ry, 0)), new THREE.Vector3(sx, sy, sz)).clone();

  // ── musgo (decalques) ──
  if (o.style === 'garden' || o.style === 'planet') {
    const l = pick(0.3);
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: mossDecal(), transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }), l.length);
    place(l, (_i, x, z) => compose(x, 0.004, z, rng() * 6.28, 0.5 + rng() * 0.7), mesh);
    mesh.receiveShadow = true; group.add(mesh);
  }
  // ── poças reflectoras ──
  if (o.style === 'garden') {
    const l = pick(0.1);
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0a1018, alphaMap: puddleBlob(), transparent: true, opacity: 0.95, roughness: 0.03, metalness: 0.15, envMapIntensity: 2.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), l.length);
    place(l, (_i, x, z) => compose(x, 0.006, z, rng() * 6.28, 0.35 + rng() * 0.3, 1, 0.25 + rng() * 0.3), mesh);
    group.add(mesh);
  }
  // ── manchas do mundo: geada, lava, óleo, pó ──
  if (o.style !== 'garden' && o.style !== 'planet') {
    const spec = { ice: [0xeaf6ff, 0.38, false, 0.28], hell: [0xff5a1a, 0.6, true, 0.2], clock: [0x2a1a08, 0.5, false, 0.2], library: [0xd8c8a0, 0.2, false, 0.3], elfic: [0x9be07a, 0.4, true, 0.22], viking: [0xe6f0fa, 0.34, false, 0.3], egypt: [0xeed49a, 0.34, false, 0.3], mandala: [0xffd070, 0.4, true, 0.2], ink: [0x44e0ff, 0.3, true, 0.22], neon: [0xff2bd6, 0.3, true, 0.18], space: [0x39f2d0, 0.24, true, 0.16], stars: [0xffe08a, 0.3, true, 0.2], angel: [0xffffff, 0.5, false, 0.3], animal: [0x3a2a10, 0.4, false, 0.26], rock: [0xff2b8a, 0.3, true, 0.2] }[o.style] as [number, number, boolean, number];
    const l = pick(spec[3]);
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: puddleBlob(), color: spec[0], transparent: true, opacity: spec[1], depthWrite: false, blending: spec[2] ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2, fog: !spec[2] }), l.length);
    place(l, (_i, x, z) => compose(x, 0.005, z, rng() * 6.28, 0.5 + rng() * 0.6, 1, 0.4 + rng() * 0.4), mesh);
    group.add(mesh);
  }
  // ── entulho (pedras) ──
  {
    const l = pick(0.34);
    const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), l.length);
    const cc = new THREE.Color();
    place(l, (_i, x, z) => { const s = 0.02 + rng() * 0.05; return compose(x, s * 0.4, z, rng() * 6.28, s * (1 + rng() * 0.8), s * 0.7, s); }, mesh);
    const RC: Record<string, [number, number]> = { garden: [0x4a463e, 0x7a746a], planet: [0x4a463e, 0x7a746a], ice: [0xaac8dc, 0xe8f4fa], hell: [0x2a2228, 0x4a3a40], clock: [0x8a6a2f, 0xb08a3c], library: [0xcfc4a8, 0xefe6cc], elfic: [0x5a6a48, 0x8a9a6a], viking: [0x4a5058, 0x8a929a], egypt: [0x8a6e3e, 0xc9a468], mandala: [0x8a4a14, 0xd8a040], ink: [0x1a3a6a, 0x3a6aa8], neon: [0x2a2040, 0x5a4a90], space: [0x4a5a6a, 0x9aaab8], stars: [0x2a3070, 0x6a78c0], angel: [0xe0dcd0, 0xffffff], animal: [0x6a5a30, 0xb09a58], rock: [0x2a2a32, 0x5a5a66] };
    l.forEach((_, k) => mesh.setColorAt(k, cc.setHex(RC[o.style][0]).lerp(new THREE.Color(RC[o.style][1]), rng())));
    mesh.castShadow = true; group.add(mesh);
  }
  // ── ervas secas / tufos ──
  if (o.style === 'garden' || o.style === 'planet') {
    const l = pick(0.6);
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 7; k++) {
      const c = new THREE.ConeGeometry(0.012, 0.12 + (k % 3) * 0.04, 4);
      c.translate(0, 0.07, 0); c.rotateZ((Math.random() - 0.5) * 0.7); c.rotateY(k * 0.9); c.translate((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05);
      parts.push(col(c, k % 2 ? (o.style === 'garden' ? 0x4a5a2a : 0x6a6a3a) : 0x7a7438));
    }
    const mesh = new THREE.InstancedMesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), l.length);
    place(l, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 0.7 + rng() * 0.8), mesh);
    group.add(mesh);
  }
  // ── ossos e caveiras ──
  if (o.style === 'garden' || o.style === 'hell' || o.style === 'planet' || o.style === 'viking' || o.style === 'egypt') {
    const l = pick(o.style === 'planet' ? 0.025 : o.style === 'viking' ? 0.05 : o.style === 'egypt' ? 0.04 : 0.07);
    const bone = (() => { const a = new THREE.CapsuleGeometry(0.012, 0.11, 3, 6).rotateZ(Math.PI / 2); const b = a.clone().rotateY(0.8); return merge([col(a.translate(0, 0.012, 0), 0xcfc7ad), col(b.translate(0, 0.012, 0), 0xbfb79c)]); })();
    const mesh = new THREE.InstancedMesh(bone, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), l.length);
    place(l, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 1 + rng() * 0.5), mesh);
    group.add(mesh);
    const ls = pick(o.style === 'planet' ? 0.01 : o.style === 'hell' ? 0.06 : o.style === 'viking' ? 0.04 : o.style === 'egypt' ? 0.02 : 0.035);
    const sk = new THREE.SphereGeometry(0.05, 10, 8); sk.scale(1, 0.9, 1.05); sk.translate(0, 0.045, 0);
    const jaw = new THREE.BoxGeometry(0.05, 0.025, 0.05); jaw.translate(0, 0.012, 0.03);
    const eyes = [-1, 1].map((s) => { const e = new THREE.SphereGeometry(0.012, 6, 5); e.translate(s * 0.02, 0.05, 0.043); return col(e, 0x050403); });
    const skull = merge([col(sk, 0xd4ccb2), col(jaw, 0xbfb79c), ...eyes]);
    const sm = new THREE.InstancedMesh(skull, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), ls.length);
    place(ls, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 1.1), sm);
    sm.castShadow = true; group.add(sm);
  }
  // ── lápides (jardim) / cogumelos luminosos (asteroide) ──
  const glowSprites: { s: THREE.Sprite; ph: number; base: number }[] = [];
  const corner = (i: number) => ({ x: px(i) + (rng() < 0.5 ? -1 : 1) * 0.34, z: pz(i) + (rng() < 0.5 ? -1 : 1) * 0.34 });
  if (o.style === 'garden') {
    const l = pick(0.11);
    const stone = merge([col(new THREE.BoxGeometry(0.13, 0.17, 0.035).translate(0, 0.085, 0), 0x6b6a66), col(new THREE.CylinderGeometry(0.065, 0.065, 0.035, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).translate(0, 0.17, 0), 0x726f6a), col(new THREE.BoxGeometry(0.012, 0.07, 0.04).translate(0, 0.1, 0.002), 0x2a2925), col(new THREE.BoxGeometry(0.05, 0.012, 0.04).translate(0, 0.115, 0.002), 0x2a2925)]);
    const mesh = new THREE.InstancedMesh(stone, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), l.length);
    l.forEach((i, k) => { const c = corner(i); mesh.setMatrixAt(k, compose(c.x, 0, c.z, (rng() - 0.5) * 0.8, 1 + rng() * 0.3, 1 + rng() * 0.3, 1).multiply(new THREE.Matrix4().makeRotationZ((rng() - 0.5) * 0.18))); });
    mesh.castShadow = true; group.add(mesh);
  } else if (o.style === 'planet') {
    const l = pick(0.1);
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 3; k++) { const st = new THREE.CylinderGeometry(0.012, 0.018, 0.07 + k * 0.02, 6); st.translate(k * 0.04 - 0.04, 0.04, (k % 2) * 0.03); parts.push(col(st, 0xcfd6d0)); const cap = new THREE.SphereGeometry(0.045 - k * 0.008, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); cap.translate(k * 0.04 - 0.04, 0.075 + k * 0.02, (k % 2) * 0.03); parts.push(col(cap, k % 2 ? 0x37d6c0 : 0x4aa8ff)); }
    const mesh = new THREE.InstancedMesh(merge(parts), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), l.length);
    l.forEach((i, k) => { const c = corner(i); mesh.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.5)); const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x40e0d0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); gs.position.set(c.x, 0.1, c.z); gs.scale.setScalar(0.45); group.add(gs); glowSprites.push({ s: gs, ph: rng() * 6, base: 0.5 }); });
    group.add(mesh);
  }
  // ── adereços de estilo ──
  const steamVents: { sprites: THREE.Sprite[]; ph: number }[] = [];
  if (o.style === 'ice') {
    const l = pick(0.12);
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 6; k++) { const c = new THREE.ConeGeometry(0.03 + (k % 3) * 0.012, 0.12 + (k % 4) * 0.07, 5); c.translate(0, 0.07, 0); c.rotateZ((Math.random() - 0.5) * 0.7); c.rotateY(k * 1.1); c.translate((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08); parts.push(col(c, k % 2 ? 0xbfe6ff : 0x8fd0f4)); }
    const mesh = new THREE.InstancedMesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.1, emissive: 0x2a6a9a, emissiveIntensity: 0.7, envMapIntensity: 1.8 }), l.length);
    l.forEach((i, k) => { const c = corner(i); mesh.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 0.9 + rng() * 0.9)); });
    mesh.castShadow = true; group.add(mesh);
    const ls = pick(0.2), snow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 0.9 }), ls.length);
    place(ls, (_i, x, z) => { const s = 0.07 + rng() * 0.1; return compose(x, 0, z, 0, s * 1.4, s * 0.45, s); }, snow);
    group.add(snow);
  }
  if (o.style === 'hell') {
    const l = pick(0.1);
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) { const c = new THREE.ConeGeometry(0.025, 0.16 + (k % 2) * 0.1, 5); c.translate(0, 0.09, 0); c.rotateZ((Math.random() - 0.5) * 0.4); c.translate((k - 1.5) * 0.045, 0, (k % 2) * 0.03); parts.push(col(c, 0x2a2a30)); }
    const mesh = new THREE.InstancedMesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.8 }), l.length);
    l.forEach((i, k) => { const c = corner(i); mesh.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.6)); });
    mesh.castShadow = true; group.add(mesh);
    for (const i of pick(0.06)) { const c = corner(i); const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff5a1a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); gs.position.set(c.x, 0.07, c.z); gs.scale.setScalar(0.5); group.add(gs); glowSprites.push({ s: gs, ph: rng() * 6, base: 0.7 }); }
  }
  if (o.style === 'clock') {
    const gearG = (() => { const parts: THREE.BufferGeometry[] = []; const ring = new THREE.TorusGeometry(0.1, 0.018, 5, 18).rotateX(Math.PI / 2); parts.push(col(ring, 0xb08a3c)); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, t = new THREE.BoxGeometry(0.035, 0.03, 0.04); t.rotateY(-a); t.translate(Math.cos(a) * 0.125, 0, Math.sin(a) * 0.125); parts.push(col(t, 0x9a7430)); } for (let i = 0; i < 3; i++) { const sp = new THREE.BoxGeometry(0.2, 0.015, 0.015); sp.rotateY((i / 3) * Math.PI); parts.push(col(sp, 0x8a6a2c)); } parts.push(col(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), 0xd0a850)); return merge(parts); })();
    const l = pick(0.13);
    const mesh = new THREE.InstancedMesh(gearG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.85 }), l.length);
    place(l, (_i, x, z) => compose(x, 0.02, z, rng() * 6.28, 0.6 + rng() * 1.0), mesh);
    mesh.castShadow = true; group.add(mesh);
    for (const i of pick(0.05)) {
      const c = corner(i), sprites: THREE.Sprite[] = [];
      for (let k = 0; k < 3; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xe8e0d0, transparent: true, opacity: 0, depthWrite: false })); sp.scale.setScalar(0.3); group.add(sp); sprites.push(sp); }
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x3a2e1a, metalness: 0.8, roughness: 0.4 })); vent.position.set(c.x, 0.025, c.z); group.add(vent);
      (sprites as any).pos = c; steamVents.push({ sprites, ph: rng() * 6 });
    }
  }
  if (o.style === 'elfic') {
    // cogumelos luminosos em três tamanhos
    const l = pick(0.16), parts: THREE.BufferGeometry[] = [], caps = [0x7be8c0, 0xffd870, 0xa8f088];
    for (let k = 0; k < 3; k++) {
      const h = 0.07 + k * 0.045, rr = 0.045 + k * 0.022, ox = (k - 1) * 0.075, oz = (k % 2) * 0.05;
      parts.push(col(new THREE.CylinderGeometry(rr * 0.22, rr * 0.3, h, 6).translate(ox, h / 2, oz), 0xe8e0c0));
      parts.push(col(new THREE.SphereGeometry(rr, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.62, 1).translate(ox, h, oz), caps[k]));
    }
    const mm = new THREE.InstancedMesh(merge(parts), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), l.length);
    l.forEach((i, k) => { const c = corner(i); mm.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 0.9 + rng() * 0.8)); const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x80f0c0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); gs.position.set(c.x, 0.1, c.z); gs.scale.setScalar(0.55); group.add(gs); glowSprites.push({ s: gs, ph: rng() * 6, base: 0.45 }); });
    group.add(mm);
    // fetos
    const lf = pick(0.28), fp: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 7; k++) { const c = new THREE.ConeGeometry(0.02, 0.3, 4); c.scale(1, 1, 0.35); c.translate(0, 0.15, 0); c.rotateZ(0.9); c.rotateY(k * 0.9); fp.push(col(c, k % 2 ? 0x3a6a2a : 0x4c8030)); }
    const fm = new THREE.InstancedMesh(merge(fp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), lf.length);
    place(lf, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 0.7 + rng() * 0.7), fm); group.add(fm);
  }
  if (o.style === 'viking') {
    // pedras rúnicas erguidas, com a runa a arder
    const l = pick(0.1), runeM = new THREE.MeshBasicMaterial({ color: hdr(0xff8a30, 2.2), toneMapped: false });
    const slab = col(new THREE.BoxGeometry(0.16, 0.34, 0.06).translate(0, 0.17, 0), 0x5a6068);
    const mesh = new THREE.InstancedMesh(slab, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), l.length);
    const rune = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.17, 0.01).translate(0, 0.19, 0.034), runeM, l.length), rune2 = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.012, 0.01).translate(0.02, 0.22, 0.034), runeM, l.length);
    l.forEach((i, k) => { const c = corner(i), m4 = compose(c.x, 0, c.z, (rng() - 0.5) * 1.2, 1 + rng() * 0.4); mesh.setMatrixAt(k, m4); rune.setMatrixAt(k, m4); rune2.setMatrixAt(k, m4); const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff7a2a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); gs.position.set(c.x, 0.2, c.z); gs.scale.setScalar(0.5); group.add(gs); glowSprites.push({ s: gs, ph: rng() * 6, base: 0.5 }); });
    mesh.castShadow = true; group.add(mesh, rune, rune2);
    // escudos redondos caídos
    const ls = pick(0.07);
    const sp: THREE.BufferGeometry[] = [col(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 14).translate(0, 0.012, 0), 0x6a4a2a), col(new THREE.CylinderGeometry(0.095, 0.095, 0.022, 14).translate(0, 0.013, 0), 0x8a2a1a), col(new THREE.SphereGeometry(0.03, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.024, 0), 0xaaaaaa)];
    const sh = new THREE.InstancedMesh(merge(sp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.2 }), ls.length);
    place(ls, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 0.9 + rng() * 0.4), sh); sh.castShadow = true; group.add(sh);
    const ln = pick(0.18), snow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ color: 0xeef4fa, roughness: 0.9 }), ln.length);
    place(ln, (_i, x, z) => { const s = 0.06 + rng() * 0.09; return compose(x, 0, z, 0, s * 1.5, s * 0.4, s); }, snow); group.add(snow);
  }
  if (o.style === 'egypt') {
    // obeliscos pequenos de ponta dourada, com um glifo de turquesa a brilhar
    const l = pick(0.11), tq = new THREE.MeshBasicMaterial({ color: hdr(0x2fe6d0, 2.2), toneMapped: false });
    const obe = merge([col(new THREE.CylinderGeometry(0.035, 0.065, 0.44, 4).rotateY(Math.PI / 4).translate(0, 0.22, 0), 0xc9a468), col(new THREE.ConeGeometry(0.046, 0.09, 4).rotateY(Math.PI / 4).translate(0, 0.485, 0), 0xe6b84a)]);
    const om = new THREE.InstancedMesh(obe, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), l.length);
    const gm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.2, 0.01).translate(0, 0.22, 0.052), tq, l.length), gm2 = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.012, 0.01).translate(0, 0.28, 0.052), tq, l.length);
    l.forEach((i, k) => { const c = corner(i), m4 = compose(c.x, 0, c.z, (rng() - 0.5) * 1.4, 1 + rng() * 0.5); om.setMatrixAt(k, m4); gm.setMatrixAt(k, m4); gm2.setMatrixAt(k, m4); const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffc860, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); gs.position.set(c.x, 0.5, c.z); gs.scale.setScalar(0.4); group.add(gs); glowSprites.push({ s: gs, ph: rng() * 6, base: 0.5 }); });
    om.castShadow = true; group.add(om, gm, gm2);
    // ankh luminosos de pé
    const la = pick(0.07);
    const ank = merge([col(new THREE.TorusGeometry(0.046, 0.012, 6, 16).translate(0, 0.2, 0), 0xffffff), col(new THREE.BoxGeometry(0.015, 0.16, 0.015).translate(0, 0.095, 0), 0xffffff), col(new THREE.BoxGeometry(0.1, 0.015, 0.015).translate(0, 0.14, 0), 0xffffff)]);
    const am = new THREE.InstancedMesh(ank, new THREE.MeshBasicMaterial({ vertexColors: true, color: hdr(0x2fe6d0, 2.2), toneMapped: false }), la.length);
    la.forEach((i, k) => { const c = corner(i); am.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.6)); const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x2fe6d0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); gs.position.set(c.x, 0.15, c.z); gs.scale.setScalar(0.5); group.add(gs); glowSprites.push({ s: gs, ph: rng() * 6, base: 0.45 }); });
    group.add(am);
    // escaravelhos de ouro e vasos canopos
    const ls = pick(0.06);
    const sc = merge([col(new THREE.SphereGeometry(0.05, 10, 8).scale(1, 0.55, 1.35).translate(0, 0.03, 0), 0xe6b84a), col(new THREE.SphereGeometry(0.03, 8, 6).translate(0, 0.035, 0.07), 0x1c3fb0), ...[-1, 1].map((sd) => col(new THREE.BoxGeometry(0.05, 0.008, 0.012).translate(sd * 0.07, 0.015, 0.02), 0xc9a13a))]);
    const sm = new THREE.InstancedMesh(sc, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.8 }), ls.length);
    place(ls, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 1 + rng() * 0.5), sm); sm.castShadow = true; group.add(sm);
    const lj = pick(0.07);
    const jar = merge([col(new THREE.CylinderGeometry(0.04, 0.055, 0.15, 10).translate(0, 0.075, 0), 0xe0d2b0), col(new THREE.SphereGeometry(0.044, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.15, 0), 0xc9a468), col(new THREE.TorusGeometry(0.043, 0.008, 5, 12).rotateX(Math.PI / 2).translate(0, 0.1, 0), 0x1c3fb0)]);
    const jm = new THREE.InstancedMesh(jar, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), lj.length);
    lj.forEach((i, k) => { const c = corner(i); jm.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.4)); }); jm.castShadow = true; group.add(jm);
    // dunas pequenas encostadas às paredes
    const ln = pick(0.2), dn = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ color: 0xdcc088, roughness: 1 }), ln.length);
    place(ln, (_i, x, z) => { const s = 0.08 + rng() * 0.13; return compose(x, 0, z, rng() * 6.28, s * 1.6, s * 0.34, s); }, dn); group.add(dn);
  }
  const glowAt = (x: number, y: number, z: number, hex: number, sz: number, op: number) => { const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: hex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); gs.position.set(x, y, z); gs.scale.setScalar(sz); group.add(gs); glowSprites.push({ s: gs, ph: rng() * 6, base: op }); };
  const hdrM = (hex: number, k = 2) => new THREE.MeshBasicMaterial({ color: hdr(hex, k), toneMapped: false });
  if (o.style === 'mandala') {         // lótus-lâmpada e discos de anéis dourados de pé
    const l = pick(0.1), pet: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 8; k++) { const p = new THREE.ConeGeometry(0.028, 0.12, 4); p.scale(1, 1, 0.35); p.translate(0, 0.06, 0); p.rotateZ(0.9); p.rotateY(k * 0.785); pet.push(col(p, k % 2 ? 0xffb0c8 : 0xffe0a0)); }
    pet.push(col(new THREE.SphereGeometry(0.03, 8, 6).translate(0, 0.05, 0), 0xffc860));
    const lm = new THREE.InstancedMesh(merge(pet), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: hdr(0xffffff, 1.4) }), l.length);
    l.forEach((i, k) => { const c = corner(i); lm.setMatrixAt(k, compose(c.x, 0.02, c.z, rng() * 6.28, 1 + rng() * 0.6)); glowAt(c.x, 0.1, c.z, 0xffb030, 0.5, 0.5); }); group.add(lm);
    const l2 = pick(0.08), disc = merge([col(new THREE.TorusGeometry(0.1, 0.012, 6, 24).translate(0, 0.14, 0), 0xe8b040), col(new THREE.TorusGeometry(0.065, 0.01, 6, 20).translate(0, 0.14, 0), 0xff9a30), col(new THREE.TorusGeometry(0.03, 0.01, 6, 16).translate(0, 0.14, 0), 0xffe080), col(new THREE.CylinderGeometry(0.012, 0.02, 0.14, 6).translate(0, 0.07, 0), 0x8a5a18)]);
    const dm = new THREE.InstancedMesh(disc, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.8, emissive: 0x6a3a08, emissiveIntensity: 0.8 }), l2.length);
    l2.forEach((i, k) => { const c = corner(i); dm.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.5)); }); group.add(dm);
  }
  if (o.style === 'ink') {             // alforrecas-lâmpada e bolhas de tinta
    const l = pick(0.1), jf = merge([col(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.16, 0), 0x80e8ff), ...[0, 1, 2, 3, 4].map((k) => col(new THREE.CylinderGeometry(0.004, 0.002, 0.16, 4).translate(Math.cos(k * 1.26) * 0.04, 0.08, Math.sin(k * 1.26) * 0.04), 0x44c0e0))]);
    const jm = new THREE.InstancedMesh(jf, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: hdr(0xffffff, 1.3), transparent: true, opacity: 0.9 }), l.length);
    l.forEach((i, k) => { const c = corner(i); jm.setMatrixAt(k, compose(c.x, 0.02 + rng() * 0.05, c.z, rng() * 6.28, 1 + rng() * 0.7)); glowAt(c.x, 0.16, c.z, 0x44e0ff, 0.6, 0.55); }); group.add(jm);
    const lb = pick(0.2), bb = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0x9ae8ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2, emissive: 0x1a5a8a, emissiveIntensity: 0.4 }), lb.length);
    place(lb, (_i, x, z) => { const s = 0.02 + rng() * 0.05; return compose(x, 0.04 + rng() * 0.2, z, 0, s); }, bb); group.add(bb);
  }
  if (o.style === 'neon') {            // cubos holográficos e barras de glitch
    const l = pick(0.1), wire = merge([...[[0.1, 0.004, 0.004], [0.004, 0.1, 0.004], [0.004, 0.004, 0.1]].flatMap(([a, b, c2]) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => col(new THREE.BoxGeometry(a, b, c2).translate(a === 0.1 ? 0 : sx * 0.05, b === 0.1 ? 0 : (a === 0.1 ? sy * 0.05 : sy * 0.05), c2 === 0.1 ? 0 : sx * 0.05).translate(0, 0.14, 0), 0xffffff)))]);
    const wm = new THREE.InstancedMesh(wire, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: hdr(0x27d3ff, 2.2) }), l.length);
    l.forEach((i, k) => { const c = corner(i); wm.setMatrixAt(k, compose(c.x, 0.02, c.z, rng() * 6.28, 0.8 + rng() * 0.8)); glowAt(c.x, 0.16, c.z, 0x27d3ff, 0.5, 0.4); }); group.add(wm);
    const lg = pick(0.12), gb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.012, 0.03).translate(0, 0.02, 0), hdrM(0xff2bd6, 2.2), lg.length);
    place(lg, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 0.6 + rng() * 1.4), gb); group.add(gb);
  }
  if (o.style === 'space') {           // caixotes de carga e antenas com luz a piscar
    const l = pick(0.1), cr = merge([col(new THREE.BoxGeometry(0.14, 0.12, 0.14).translate(0, 0.06, 0), 0x5a6a7a), col(new THREE.BoxGeometry(0.15, 0.02, 0.15).translate(0, 0.02, 0), 0xe8c020), col(new THREE.BoxGeometry(0.15, 0.02, 0.15).translate(0, 0.1, 0), 0xe8c020), col(new THREE.BoxGeometry(0.04, 0.03, 0.01).translate(0, 0.06, 0.075), 0x39f2d0)]);
    const cm = new THREE.InstancedMesh(cr, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.6 }), l.length);
    l.forEach((i, k) => { const c = corner(i); cm.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 3, 1 + rng() * 0.5)); }); cm.castShadow = true; group.add(cm);
    const la = pick(0.07), an = merge([col(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 6).translate(0, 0.15, 0), 0x9aa8b8), col(new THREE.SphereGeometry(0.02, 8, 6).translate(0, 0.31, 0), 0xffffff)]);
    const am = new THREE.InstancedMesh(an, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.7, emissive: 0x39f2d0, emissiveIntensity: 0.6 }), la.length);
    la.forEach((i, k) => { const c = corner(i); am.setMatrixAt(k, compose(c.x, 0, c.z, 0, 1 + rng() * 0.6)); glowAt(c.x, 0.32, c.z, 0x39f2d0, 0.35, 0.5); }); group.add(am);
  }
  if (o.style === 'stars') {           // estrelas de ouro e anéis astrolábio a pairar
    const l = pick(0.1), st = merge([col(new THREE.OctahedronGeometry(0.05, 0).scale(1, 1.5, 0.4).translate(0, 0.16, 0), 0xffffff), col(new THREE.OctahedronGeometry(0.05, 0).scale(1.5, 1, 0.4).translate(0, 0.16, 0), 0xffffff)]);
    const sm = new THREE.InstancedMesh(st, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: hdr(0xffe08a, 2.2) }), l.length);
    l.forEach((i, k) => { const c = corner(i); sm.setMatrixAt(k, compose(c.x, 0.02 + rng() * 0.1, c.z, rng() * 6.28, 0.8 + rng() * 0.9)); glowAt(c.x, 0.18, c.z, 0xffe08a, 0.55, 0.55); }); group.add(sm);
    const l2 = pick(0.07), ast = merge([col(new THREE.TorusGeometry(0.1, 0.008, 6, 28).translate(0, 0.16, 0), 0xe6c060), col(new THREE.TorusGeometry(0.1, 0.008, 6, 28).rotateX(Math.PI / 2).translate(0, 0.16, 0), 0xc8a34a), col(new THREE.SphereGeometry(0.018, 8, 6).translate(0, 0.16, 0), 0xfff2b0), col(new THREE.CylinderGeometry(0.01, 0.02, 0.14, 6).translate(0, 0.07, 0), 0x6a5a28)]);
    const am = new THREE.InstancedMesh(ast, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.85, emissive: 0x5a4208, emissiveIntensity: 0.6 }), l2.length);
    l2.forEach((i, k) => { const c = corner(i); am.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.5)); }); group.add(am);
  }
  if (o.style === 'angel') {           // penas, harpas e halos a pairar
    const l = pick(0.18), fe = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.16, 5).scale(1, 1, 0.12).rotateZ(Math.PI / 2 + 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, emissive: 0x9aa0c0, emissiveIntensity: 0.35 }), l.length);
    place(l, (_i, x, z) => compose(x, 0.01, z, rng() * 6.28, 0.8 + rng() * 0.9), fe); group.add(fe);
    const lh = pick(0.07), hp = merge([col(new THREE.TorusGeometry(0.09, 0.008, 6, 22, Math.PI * 1.3).translate(0, 0.14, 0), 0xe6b84a), col(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 4).translate(0.07, 0.14, 0), 0xe6b84a), ...[0, 1, 2, 3].map((k) => col(new THREE.CylinderGeometry(0.002, 0.002, 0.14 - k * 0.02, 3).translate(-0.04 + k * 0.035, 0.14, 0), 0xffffff))]);
    const hm = new THREE.InstancedMesh(hp, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.8, emissive: 0x6a4a08, emissiveIntensity: 0.5 }), lh.length);
    lh.forEach((i, k) => { const c = corner(i); hm.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.5)); }); group.add(hm);
    const l3 = pick(0.07), ha = new THREE.InstancedMesh(new THREE.TorusGeometry(0.07, 0.008, 6, 24).rotateX(Math.PI / 2), hdrM(0xffd86b, 2), l3.length);
    l3.forEach((i, k) => { const c = corner(i); ha.setMatrixAt(k, compose(c.x, 0.2 + rng() * 0.12, c.z, 0, 1 + rng() * 0.6)); glowAt(c.x, 0.22, c.z, 0xffd86b, 0.4, 0.5); }); group.add(ha);
  }
  if (o.style === 'animal') {          // flores da savana, montes de térmitas e pegadas
    const l = pick(0.22), fl: THREE.BufferGeometry[] = [col(new THREE.CylinderGeometry(0.005, 0.006, 0.14, 4).translate(0, 0.07, 0), 0x4a7a20)];
    for (let k = 0; k < 6; k++) { const p = new THREE.SphereGeometry(0.02, 6, 5).scale(1, 0.5, 1.5).translate(Math.cos(k * 1.05) * 0.03, 0.15, Math.sin(k * 1.05) * 0.03); fl.push(col(p, k % 2 ? 0xff7a2a : 0xffc040)); }
    const fm = new THREE.InstancedMesh(merge(fl), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: 0x3a2008, emissiveIntensity: 0.4 }), l.length);
    place(l, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 0.8 + rng() * 0.7), fm); group.add(fm);
    const lt = pick(0.07), tm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.24, 7).translate(0, 0.12, 0), new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 1, flatShading: true }), lt.length);
    lt.forEach((i, k) => { const c = corner(i); tm.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 0.8 + rng() * 0.8, 0.7 + rng() * 0.8, 0.8 + rng() * 0.8)); }); tm.castShadow = true; group.add(tm);
  }
  if (o.style === 'rock') {            // palhetas, pedestais de microfone e holofotes de chão
    const l = pick(0.12), pk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 3).translate(0, 0.004, 0), new THREE.MeshStandardMaterial({ color: 0xff2b8a, roughness: 0.4, emissive: 0x6a0a30, emissiveIntensity: 0.6 }), l.length);
    place(l, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 0.8 + rng() * 0.6), pk); group.add(pk);
    const l2 = pick(0.07), mic = merge([col(new THREE.CylinderGeometry(0.006, 0.01, 0.36, 5).translate(0, 0.18, 0), 0x2a2a30), col(new THREE.CylinderGeometry(0.04, 0.05, 0.012, 8).translate(0, 0.006, 0), 0x2a2a30), col(new THREE.SphereGeometry(0.025, 8, 6).translate(0.03, 0.38, 0), 0x9a9aa8)]);
    const mm = new THREE.InstancedMesh(mic, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.7 }), l2.length);
    l2.forEach((i, k) => { const c = corner(i); mm.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.3)); }); mm.castShadow = true; group.add(mm);
    const l3 = pick(0.06), sp = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.1, 8).translate(0, 0.05, 0), new THREE.MeshStandardMaterial({ color: 0x18181e, roughness: 0.5, metalness: 0.7 }), l3.length);
    l3.forEach((i, k) => { const c = corner(i); sp.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.4)); glowAt(c.x, 0.1, c.z, rng() < 0.5 ? 0xff2b8a : 0xffe14a, 0.7, 0.6); }); group.add(sp);
  }
  if (o.style === 'library') {
    const l = pick(0.1);
    const BC = [0x6a1c1c, 0x1c3a5a, 0x2c4a2c, 0x7a4a1c, 0x4a2c5a];
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) { const b = new THREE.BoxGeometry(0.15 - k * 0.012, 0.03, 0.1); b.rotateY((k - 1.5) * 0.15); b.translate(0, 0.015 + k * 0.03, 0); parts.push(col(b, BC[k % BC.length])); parts.push(col(new THREE.BoxGeometry(0.152 - k * 0.012, 0.006, 0.102).rotateY((k - 1.5) * 0.15).translate(0, 0.03 + k * 0.03 - 0.012, 0), 0xe8dcc0)); }
    const mesh = new THREE.InstancedMesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), l.length);
    l.forEach((i, k) => { const c = corner(i); mesh.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 0.9 + rng() * 0.5)); });
    mesh.castShadow = true; group.add(mesh);
  }

  // ── paredes vivas: heras, algas, pingentes de gelo, neve nos topos e fendas de lava ──
  {
    const dbl = THREE.DoubleSide;
    const onWall = () => {
      const s = o.segs[Math.floor(rng() * o.segs.length)];
      const horiz = s.y1 === s.y2, u = rng();
      const cx = s.x1 + (s.x2 - s.x1) * u - cols / 2, cz = s.y1 + (s.y2 - s.y1) * u - rows / 2;
      const side = rng() < 0.5 ? -1 : 1;
      return { horiz, side, cx, cz, ry: horiz ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2) };
    };
    const lateral = (w: ReturnType<typeof onWall>, d: number, along = 0) => ({ x: w.cx + (w.horiz ? along : w.side * d), z: w.cz + (w.horiz ? w.side * d : along) });
    const leafShape = new THREE.Shape(); leafShape.moveTo(0, -0.045); leafShape.quadraticCurveTo(0.055, -0.005, 0, 0.05); leafShape.quadraticCurveTo(-0.055, -0.005, 0, -0.045);
    const vines: Record<string, { c: number[]; n: number; glow?: number }> = {
      garden: { c: [0x2f5a26, 0x3e7a30, 0x254a20, 0x4a8a38], n: 58 }, elfic: { c: [0x3a7a3a, 0x58a048, 0x2a5a30], n: 64, glow: 0x80f0c0 },
      animal: { c: [0x5a8a2a, 0x7aa83a, 0x3e6a20], n: 44 }, ink: { c: [0x1a7a6a, 0x2ab090, 0x136a58], n: 44, glow: 0x44e0ff }, planet: { c: [0x2a6a5a, 0x3a9a7a], n: 8, glow: 0x40e0d0 },
    };
    const vn = vines[o.style];
    if (vn && o.segs.length) {
      const per = 9, total = vn.n * per;
      const leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(leafShape), new THREE.MeshStandardMaterial({ roughness: 0.75, side: dbl }), total);
      const cc = new THREE.Color(); let k = 0;
      const berries: THREE.Vector3[] = [];
      for (let s = 0; s < vn.n; s++) {
        const w = onWall(), top = o.wallH * (0.55 + rng() * 0.45), len = 0.35 + rng() * 0.5 * o.wallH;
        for (let j = 0; j < per && k < total; j++, k++) {
          const f = j / per, y = top - f * len, a = lateral(w, o.wallT / 2 + 0.008 + rng() * 0.012, Math.sin(j * 1.7 + s) * 0.05 + (rng() - 0.5) * 0.04);
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rng() - 0.5) * 0.5, w.ry, (rng() - 0.5) * 2.2));
          leaves.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(a.x, Math.max(0.05, y), a.z), q, new THREE.Vector3().setScalar(1.3 + rng() * 0.9)));
          leaves.setColorAt(k, cc.setHex(vn.c[(rng() * vn.c.length) | 0]).offsetHSL(0, 0, (rng() - 0.5) * 0.08));
          if (vn.glow && j % 4 === 3 && rng() < 0.6) berries.push(new THREE.Vector3(a.x, Math.max(0.05, y), a.z));
        }
      }
      leaves.count = k; leaves.receiveShadow = true; group.add(leaves);
      if (berries.length) {
        const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.013, 6, 5), new THREE.MeshBasicMaterial({ color: hdr(vn.glow!, 2.4), toneMapped: false }), berries.length);
        berries.forEach((p, i) => bm.setMatrixAt(i, M.makeTranslation(p.x, p.y, p.z))); group.add(bm);
        berries.filter((_, i) => i % 5 === 0).forEach((p) => glowAt(p.x, p.y, p.z, vn.glow!, 0.22, 0.5));
      }
    }
    // pingentes de gelo e neve nos topos das paredes
    if ((o.style === 'ice' || o.style === 'viking') && o.segs.length) {
      const n = o.style === 'ice' ? 56 : 34;
      const ic = new THREE.InstancedMesh(new THREE.ConeGeometry(0.018, 0.16, 5).rotateX(Math.PI), new THREE.MeshStandardMaterial({ color: 0xd6efff, emissive: 0x3a86b8, emissiveIntensity: 0.55, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.88, envMapIntensity: 2 }), n);
      const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ color: 0xf2f8ff, roughness: 0.9 }), n);
      for (let i = 0; i < n; i++) {
        const w = onWall(), len = 0.5 + rng() * 1.5, a = lateral(w, o.wallT / 2 - 0.012, (rng() - 0.5) * 0.3);
        ic.setMatrixAt(i, M.compose(new THREE.Vector3(a.x, o.wallH - 0.08 * len, a.z), Q.identity(), new THREE.Vector3(1, len, 1)).clone());
        const c = lateral(w, 0, (rng() - 0.5) * 0.5), s = 0.06 + rng() * 0.08;
        caps.setMatrixAt(i, M.compose(new THREE.Vector3(c.x, o.wallH + 0.005, c.z), Q.setFromEuler(E.set(0, w.horiz ? 0 : Math.PI / 2, 0)), new THREE.Vector3(s * 2.1, s * 0.5, o.wallT * 0.62)).clone());
      }
      group.add(ic, caps);
    }
    // fendas de lava nas paredes e poças a ferver no chão
    if (o.style === 'hell' && o.segs.length) {
      const n = 26, cr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.15, 0.006), new THREE.MeshBasicMaterial({ color: hdr(0xff5a14, 2.6), toneMapped: false }), n);
      for (let i = 0; i < n; i++) {
        const w = onWall(), a = lateral(w, o.wallT / 2 + 0.004, (rng() - 0.5) * 0.2), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, w.ry, (rng() - 0.5) * 1.4));
        cr.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(a.x, 0.1 + rng() * o.wallH * 0.7, a.z), q, new THREE.Vector3(1, 0.6 + rng() * 2.2, 1)));
        if (i % 6 === 0) glowAt(a.x, 0.18 + rng() * 0.3, a.z, 0xff5a14, 0.5, 0.5);
      }
      group.add(cr);
      const lp = pick(0.09);
      const pools = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: hdr(0xff6a16, 2.4), toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }), lp.length);
      lp.forEach((i, k) => { const x = px(i), z = pz(i), s = 0.12 + rng() * 0.12; pools.setMatrixAt(k, compose(x + (rng() - 0.5) * 0.3, 0.007, z + (rng() - 0.5) * 0.3, 0, s, 1, s * (0.6 + rng() * 0.5))); glowAt(x, 0.1, z, 0xff5a14, 0.9, 0.55); });
      group.add(pools);
    }
  }

  // ── velas com chama (os dois mundos) ──
  const flames: { g: THREE.Group; ph: number }[] = [];
  {
    const l = pick(({ garden: 0.07, planet: 0.04, library: 0.16, ice: 0, hell: 0, clock: 0, elfic: 0, viking: 0, egypt: 0, mandala: 0, ink: 0, neon: 0, space: 0, stars: 0, angel: 0, animal: 0, rock: 0 } as Record<string, number>)[o.style]);
    const waxG = new THREE.CylinderGeometry(0.018, 0.02, 0.09, 8), waxM = new THREE.MeshStandardMaterial({ color: 0xe9e0c4, roughness: 0.8 });
    const flameG = new THREE.ConeGeometry(0.014, 0.05, 6), flameM = new THREE.MeshBasicMaterial({ color: hdr(0xffa040, 2), toneMapped: false });
    l.forEach((i) => {
      const c = corner(i), g = new THREE.Group(); g.position.set(c.x, 0, c.z);
      for (let k = 0; k < 3; k++) {
        const h = 0.6 + rng() * 0.9, w = new THREE.Mesh(waxG, waxM); w.scale.y = h; w.position.set((k - 1) * 0.04, 0.045 * h, (k % 2) * 0.03); w.castShadow = true;
        const f = new THREE.Mesh(flameG, flameM); f.position.set((k - 1) * 0.04, 0.09 * h + 0.03, (k % 2) * 0.03); g.add(w, f);
      }
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff9a40, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
      gl.scale.setScalar(0.7); gl.position.y = 0.14; g.add(gl);
      // poça de luz quente no chão
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xff8a30, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); pool.position.y = 0.007; g.add(pool);
      group.add(g); flames.push({ g, ph: rng() * 6 });
    });
  }
  // ── archotes nas paredes ──
  const torches: { flame: THREE.Mesh; glow: THREE.Sprite; pool: THREE.Mesh; ph: number }[] = [];
  {
    const TC: Record<string, [number, number]> = { garden: [0xff8a2a, 0xff9a40], planet: [0xff8a2a, 0xff9a40], ice: [0x7fd8ff, 0x9fe0ff], hell: [0xff4a1a, 0xff5a20], clock: [0xffc060, 0xffd080], library: [0xffa040, 0xffb860], elfic: [0x9be07a, 0xb8f090], viking: [0xff7a2a, 0xff9a50], egypt: [0xffb43a, 0xffc860], mandala: [0xffb030, 0xffd070], ink: [0x44e0ff, 0x80f0ff], neon: [0xff2bd6, 0xff80e8], space: [0x39f2d0, 0x80ffe8], stars: [0xffe08a, 0xfff0b0], angel: [0xffe9a0, 0xfff4cc], animal: [0xff9a2a, 0xffb860], rock: [0xff2b8a, 0xff80b8] };
    const tc = TC[o.style];
    const n = Math.max(2, Math.min(7, Math.round(o.segs.length / 13)));
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0x1b1713, roughness: 0.6, metalness: 0.5 }));
    const cup = new THREE.CylinderGeometry(0.04, 0.02, 0.05, 8), cupM = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.5, metalness: 0.6 });
    for (let k = 0; k < n; k++) {
      const s = o.segs[Math.floor(rng() * o.segs.length)];
      const horiz = s.y1 === s.y2, cx = (s.x1 + s.x2) / 2 - cols / 2, cz = (s.y1 + s.y2) / 2 - rows / 2;
      const side = rng() < 0.5 ? -1 : 1, off = o.wallT / 2 + 0.03;
      const tx = cx + (horiz ? (rng() - 0.5) * 0.4 : side * off), tz = cz + (horiz ? side * off : (rng() - 0.5) * 0.4);
      const g = new THREE.Group(); g.position.set(tx, o.wallH * 0.82, tz);
      const b = bracket.clone(); b.position.y = -0.03; const c2 = new THREE.Mesh(cup, cupM); c2.position.y = 0.075;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), new THREE.MeshBasicMaterial({ color: hdr(tc[0], 2.2), toneMapped: false, transparent: true, opacity: 0.95 })); flame.position.y = 0.14;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: tc[1], transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(0.8); glow.position.y = 0.15;
      g.add(b, c2, flame, glow); group.add(g);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTexture(), color: tc[0], transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      pool.position.set(tx + (horiz ? 0 : side * 0.5), 0.008, tz + (horiz ? side * 0.5 : 0)); group.add(pool);
      torches.push({ flame, glow, pool, ph: rng() * 6 });
    }
  }

  return {
    group,
    update(t: number) {
      for (const k of torches) {
        const f = 0.85 + 0.15 * Math.sin(t * 14 + k.ph) + 0.07 * Math.sin(t * 31 + k.ph * 2);
        k.flame.scale.set(1 - 0.12 * Math.sin(t * 9 + k.ph), f, 1); k.flame.rotation.z = Math.sin(t * 4 + k.ph) * 0.12;
        k.glow.material.opacity = 0.55 + 0.25 * f; (k.pool.material as THREE.MeshBasicMaterial).opacity = 0.28 + 0.14 * f;
      }
      for (const k of flames) { const f = 0.85 + 0.15 * Math.sin(t * 13 + k.ph); k.g.children.forEach((c) => { if ((c as THREE.Mesh).geometry && (c as THREE.Mesh).geometry.type === 'ConeGeometry') c.scale.set(1, f, 1); }); }
      for (const v of steamVents) {
        const c = (v.sprites as any).pos as { x: number; z: number };
        v.sprites.forEach((sp, k) => { const u = ((t * 0.28 + v.ph + k / 3) % 1); sp.position.set(c.x + Math.sin(t + k) * 0.03, 0.06 + u * 0.55, c.z); sp.material.opacity = 0.3 * Math.sin(u * Math.PI); sp.scale.setScalar(0.2 + u * 0.5); });
      }
      for (const g of glowSprites) g.s.material.opacity = g.base * (0.7 + 0.3 * Math.sin(t * 1.6 + g.ph));
    },
  };
}
