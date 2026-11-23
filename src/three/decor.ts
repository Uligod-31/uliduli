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
  style: 'garden' | 'planet';
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
  {
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
  // ── entulho (pedras) ──
  {
    const l = pick(0.34);
    const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), l.length);
    const cc = new THREE.Color();
    place(l, (_i, x, z) => { const s = 0.02 + rng() * 0.05; return compose(x, s * 0.4, z, rng() * 6.28, s * (1 + rng() * 0.8), s * 0.7, s); }, mesh);
    l.forEach((_, k) => mesh.setColorAt(k, cc.setHex(0x4a463e).lerp(new THREE.Color(0x7a746a), rng())));
    mesh.castShadow = true; group.add(mesh);
  }
  // ── ervas secas / tufos ──
  {
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
  {
    const l = pick(o.style === 'garden' ? 0.07 : 0.025);
    const bone = (() => { const a = new THREE.CapsuleGeometry(0.012, 0.11, 3, 6).rotateZ(Math.PI / 2); const b = a.clone().rotateY(0.8); return merge([col(a.translate(0, 0.012, 0), 0xcfc7ad), col(b.translate(0, 0.012, 0), 0xbfb79c)]); })();
    const mesh = new THREE.InstancedMesh(bone, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), l.length);
    place(l, (_i, x, z) => compose(x, 0, z, rng() * 6.28, 1 + rng() * 0.5), mesh);
    group.add(mesh);
    const ls = pick(o.style === 'garden' ? 0.035 : 0.01);
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
  } else {
    const l = pick(0.1);
    const parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 3; k++) { const st = new THREE.CylinderGeometry(0.012, 0.018, 0.07 + k * 0.02, 6); st.translate(k * 0.04 - 0.04, 0.04, (k % 2) * 0.03); parts.push(col(st, 0xcfd6d0)); const cap = new THREE.SphereGeometry(0.045 - k * 0.008, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); cap.translate(k * 0.04 - 0.04, 0.075 + k * 0.02, (k % 2) * 0.03); parts.push(col(cap, k % 2 ? 0x37d6c0 : 0x4aa8ff)); }
    const mesh = new THREE.InstancedMesh(merge(parts), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), l.length);
    l.forEach((i, k) => { const c = corner(i); mesh.setMatrixAt(k, compose(c.x, 0, c.z, rng() * 6.28, 1 + rng() * 0.5)); const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x40e0d0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); gs.position.set(c.x, 0.1, c.z); gs.scale.setScalar(0.45); group.add(gs); glowSprites.push({ s: gs, ph: rng() * 6, base: 0.5 }); });
    group.add(mesh);
  }
  // ── velas com chama (os dois mundos) ──
  const flames: { g: THREE.Group; ph: number }[] = [];
  {
    const l = pick(o.style === 'garden' ? 0.07 : 0.04);
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
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), new THREE.MeshBasicMaterial({ color: hdr(0xff8a2a, 2.2), toneMapped: false, transparent: true, opacity: 0.95 })); flame.position.y = 0.14;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff9a40, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(0.8); glow.position.y = 0.15;
      g.add(b, c2, flame, glow); group.add(g);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xff8a30, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
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
      for (const g of glowSprites) g.s.material.opacity = g.base * (0.7 + 0.3 * Math.sin(t * 1.6 + g.ph));
    },
  };
}
