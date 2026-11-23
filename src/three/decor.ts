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
  style: 'garden' | 'planet' | 'ice' | 'hell' | 'clock' | 'library';
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
    const spec = { ice: [0xeaf6ff, 0.38, false, 0.28], hell: [0xff5a1a, 0.6, true, 0.2], clock: [0x2a1a08, 0.5, false, 0.2], library: [0xd8c8a0, 0.2, false, 0.3] }[o.style] as [number, number, boolean, number];
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
    const RC: Record<string, [number, number]> = { garden: [0x4a463e, 0x7a746a], planet: [0x4a463e, 0x7a746a], ice: [0xaac8dc, 0xe8f4fa], hell: [0x2a2228, 0x4a3a40], clock: [0x8a6a2f, 0xb08a3c], library: [0xcfc4a8, 0xefe6cc] };
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
  if (o.style === 'garden' || o.style === 'hell' || o.style === 'planet') {
    const l = pick(o.style === 'planet' ? 0.025 : 0.07);
    const bone = (() => { const a = new THREE.CapsuleGeometry(0.012, 0.11, 3, 6).rotateZ(Math.PI / 2); const b = a.clone().rotateY(0.8); return merge([col(a.translate(0, 0.012, 0), 0xcfc7ad), col(b.translate(0, 0.012, 0), 0xbfb79c)]); })();
    const mesh = new THREE.InstancedMesh(bone, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), l.length);
    place(l, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 1 + rng() * 0.5), mesh);
    group.add(mesh);
    const ls = pick(o.style === 'planet' ? 0.01 : o.style === 'hell' ? 0.06 : 0.035);
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
  if (o.style === 'library') {
    const l = pick(0.1);
    const BC = [0x6a1c1c, 0x1c3a5a, 0x2c4a2c, 0x7a4a1c, 0x4a2c5a];
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) { const b = new THREE.BoxGeometry(0.15 - k * 0.012, 0.03, 0.1); b.rotateY((k - 1.5) * 0.15); b.translate(0, 0.015 + k * 0.03, 0); parts.push(col(b, BC[k % BC.length])); parts.push(col(new THREE.BoxGeometry(0.152 - k * 0.012, 0.006, 0.102).rotateY((k - 1.5) * 0.15).translate(0, 0.03 + k * 0.03 - 0.012, 0), 0xe8dcc0)); }
    const mesh = new THREE.InstancedMesh(merge(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), l.length);
    l.forEach((i, k) => { const c = corner(i); mesh.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 0.9 + rng() * 0.5)); });
    mesh.castShadow = true; group.add(mesh);
  }

  // ── velas com chama (os dois mundos) ──
  const flames: { g: THREE.Group; ph: number }[] = [];
  {
    const l = pick(({ garden: 0.07, planet: 0.04, library: 0.16, ice: 0, hell: 0, clock: 0 } as Record<string, number>)[o.style]);
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
    const TC: Record<string, [number, number]> = { garden: [0xff8a2a, 0xff9a40], planet: [0xff8a2a, 0xff9a40], ice: [0x7fd8ff, 0x9fe0ff], hell: [0xff4a1a, 0xff5a20], clock: [0xffc060, 0xffd080], library: [0xffa040, 0xffb860] };
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
