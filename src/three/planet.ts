import * as THREE from 'three';
import { glowSprite, hdr, vnoise } from './common';

/** Ruído de valor 2D periódico (a textura repete sem costuras); f = nº de células por textura. */
function pn(x: number, y: number, f: number, o = 0): number {
  const h = (i: number, j: number) => { let n = (((i % f) + f) % f) * 374761393 + (((j % f) + f) % f) * 668265263 + o * 2147483647; n = (n ^ (n >>> 13)) * 1274126177; return (((n ^ (n >>> 16)) >>> 0) % 10000) / 10000; };
  const fx = x * f, fy = y * f, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  return (h(ix, iy) * (1 - su) + h(ix + 1, iy) * su) * (1 - sv) + (h(ix, iy + 1) * (1 - su) + h(ix + 1, iy + 1) * su) * sv;
}

/** Textura procedural (cor + relevo) a partir de uma função de altura; o relevo vira mapa de normais. */
function surfaceTex(size: number, seed: number, base: [number, number, number], height: (x: number, y: number, r: () => number) => number, tint: number, contrast: number) {
  let s = seed >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const hmap = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) hmap[y * size + x] = height(x / size, y / size, r);
  const col = document.createElement('canvas'), nor = document.createElement('canvas');
  col.width = col.height = nor.width = nor.height = size;
  const cc = col.getContext('2d')!, nc = nor.getContext('2d')!;
  const ci = cc.createImageData(size, size), ni = nc.createImageData(size, size);
  const H = (x: number, y: number) => hmap[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, h = H(x, y);
    const k = 1 + (h - 0.5) * contrast, g = 1 + (r() - 0.5) * tint;
    ci.data[i] = Math.min(255, base[0] * k * g); ci.data[i + 1] = Math.min(255, base[1] * k * g); ci.data[i + 2] = Math.min(255, base[2] * k * g); ci.data[i + 3] = 255;
    const dx = (H(x + 1, y) - H(x - 1, y)) * 5, dy = (H(x, y + 1) - H(x, y - 1)) * 5, l = Math.hypot(dx, dy, 1);
    ni.data[i] = (-dx / l * 0.5 + 0.5) * 255; ni.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; ni.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; ni.data[i + 3] = 255;
  }
  cc.putImageData(ci, 0, 0); nc.putImageData(ni, 0, 0);
  const mk = (c: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: mk(col, true), normal: mk(nor, false) };
}

/** Corpo de um asteroide à moda do pequeno príncipe: disco de areia, ventre rochoso e três vulcões, baobás e um candeeiro à volta. */
export function buildPlanetBody(cells: THREE.Vector2[], R: number, rng: () => number): { group: THREE.Group; anim: (t: number) => void } {
  const group = new THREE.Group();
  const Rd = R + 1.15;

  // ventre: calote esférica rugosa, a pairar no vazio
  const prof: THREE.Vector2[] = [];
  prof.push(new THREE.Vector2(0.001, -0.06), new THREE.Vector2(Rd, -0.06), new THREE.Vector2(Rd + 0.12, -0.2));
  const steps = 16, depth = Rd * 0.95;
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    prof.push(new THREE.Vector2(Math.max(0.001, (Rd + 0.1) * Math.cos(a)), -0.35 - depth * Math.sin(a)));
  }
  const body = new THREE.LatheGeometry(prof, 56);
  const p = body.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < -0.3) {
      const n = vnoise(x * 1.3 + z * 0.7 + y * 0.9) - 0.5, m = vnoise(z * 2.1 - x * 1.7 + 40) - 0.5;
      const k = 1 + n * 0.22 + m * 0.1;
      p.setXYZ(i, x * k, y - Math.abs(n) * 0.35, z * k);
    }
  }
  body.computeVertexNormals();
  // rocha: estratos irregulares, fendas e grão
  const rockT = surfaceTex(256, 7, [150, 136, 118], (x, y) => {
    const n = pn(x, y, 8) * 0.5 + pn(x, y, 24, 1) * 0.3 + pn(x, y, 64, 2) * 0.2;
    const band = 0.5 + 0.5 * Math.sin((y * 8 + pn(x, y, 4, 3) * 1.5) * Math.PI * 2);
    const crack = Math.abs(pn(x, y, 6, 4) - 0.5) < 0.02 ? -0.35 : 0;
    return Math.max(0, Math.min(1, n * 0.6 + band * 0.4 + crack));
  }, 0.25, 0.9);
  rockT.map.repeat.set(5, 2); rockT.normal.repeat.set(5, 2);
  const rock = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ color: 0x8a7e70, map: rockT.map, normalMap: rockT.normal, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 1, flatShading: true }));
  rock.receiveShadow = true;
  group.add(rock);

  // areia do disco (por baixo das casas)
  // dunas em ondulação, grão fino e seixos
  const sandT = surfaceTex(256, 21, [190, 168, 130], (x, y) => {
    const dune = 0.5 + 0.5 * Math.sin((x * 4 + y * 3 + pn(x, y, 4, 5) * 1.6) * Math.PI * 2);
    const grain = pn(x, y, 128, 6);
    const pebble = pn(x, y, 16, 7) > 0.8 ? 0.35 : 0;
    return Math.max(0, Math.min(1, dune * 0.45 + grain * 0.3 + pebble + 0.1));
  }, 0.3, 0.7);
  const rep = Math.max(2, Rd / 2.2);
  sandT.map.repeat.set(rep, rep); sandT.normal.repeat.set(rep, rep);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(Rd, 56), new THREE.MeshStandardMaterial({ color: 0xb09a78, map: sandT.map, normalMap: sandT.normal, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.y = -0.055; sand.receiveShadow = true;
  group.add(sand);

  // pontos do rebordo livres de casas
  const free = (x: number, z: number, margin: number) => !cells.some((c) => Math.hypot(c.x - x, c.y - z) < margin);
  const rim = (r: number, tries = 40): THREE.Vector3 | null => {
    for (let k = 0; k < tries; k++) {
      const a = rng() * Math.PI * 2, rr = r + rng() * 0.25;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (free(x, z, 1.0)) return new THREE.Vector3(x, 0, z);
    }
    return null;
  };
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1, flatShading: true });
  const smokers: { s: THREE.Sprite; base: THREE.Vector3; ph: number }[] = [];
  const lights: THREE.Sprite[] = [];

  // três vulcões: dois activos e um extinto (o pequeno príncipe limpava-os)
  [0, 1, 2].forEach((k) => {
    const pos = rim(Rd - 0.7);
    if (!pos) return;
    const h = 0.38 + rng() * 0.2, r = 0.3 + rng() * 0.08;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.38, r, h, 9, 1, true), new THREE.MeshStandardMaterial({ color: 0x2c241d, roughness: 1, flatShading: true, side: THREE.DoubleSide }));
    cone.position.set(pos.x, h / 2 - 0.05, pos.z); cone.castShadow = true;
    group.add(cone);
    if (k < 2) {
      const lava = new THREE.Mesh(new THREE.CircleGeometry(r * 0.36, 12), new THREE.MeshBasicMaterial({ color: hdr(0xff6a1f, 2.4), toneMapped: false }));
      lava.rotation.x = -Math.PI / 2; lava.position.set(pos.x, h - 0.07, pos.z);
      const g = glowSprite(0xff5a1a, 1.6, 0.6); g.position.set(pos.x, h + 0.08, pos.z);
      group.add(lava, g); lights.push(g);
      for (let s = 0; s < 3; s++) {
        const sm = glowSprite(0x3a3430, 0.55 + s * 0.18, 0.3); sm.position.set(pos.x, h + 0.2 + s * 0.3, pos.z);
        group.add(sm); smokers.push({ s: sm, base: sm.position.clone(), ph: s * 1.7 + k });
      }
    } else {
      const lid = new THREE.Mesh(new THREE.CircleGeometry(r * 0.36, 12), new THREE.MeshStandardMaterial({ color: 0x0f0d0b, roughness: 1 }));
      lid.rotation.x = -Math.PI / 2; lid.position.set(pos.x, h - 0.07, pos.z); group.add(lid);
    }
  });

  // baobás ainda rebentos (a ameaça): tronco torcido e copa chata
  for (let i = 0; i < 3; i++) {
    const pos = rim(Rd - 0.55);
    if (!pos) continue;
    const g = new THREE.Group(); g.position.copy(pos);
    const h = 0.5 + rng() * 0.35;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, h, 7), dark); trunk.position.y = h / 2; trunk.rotation.z = (rng() - 0.5) * 0.3; trunk.castShadow = true;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2c3a2a, roughness: 1, flatShading: true })); crown.scale.set(1.3, 0.55, 1.3); crown.position.y = h + 0.04; crown.castShadow = true;
    g.add(trunk, crown);
    for (let r = 0; r < 4; r++) {
      const root = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.32, 5), dark);
      const a = (r / 4) * Math.PI * 2 + rng(); root.position.set(Math.cos(a) * 0.11, 0.05, Math.sin(a) * 0.11); root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1); g.add(root);
    }
    group.add(g);
  }

  // candeeiro do acendedor: a única luz quente do planeta
  const lp = rim(Rd - 0.5, 80);
  if (lp) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 1.0, 6), dark); pole.position.set(lp.x, 0.5, lp.z); pole.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: hdr(0xffd98a, 3), toneMapped: false })); head.position.set(lp.x, 1.04, lp.z);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.07, 8), dark); hood.position.set(lp.x, 1.12, lp.z);
    const g = glowSprite(0xffc060, 2.6, 0.55); g.position.set(lp.x, 1.04, lp.z);
    group.add(pole, head, hood, g); lights.push(g);
  }

  // pedras e erva seca no rebordo
  for (let i = 0; i < 14; i++) {
    const pos = rim(Rd - 0.25);
    if (!pos) continue;
    const s = 0.05 + rng() * 0.12;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), dark); st.position.set(pos.x, s * 0.4, pos.z); st.rotation.set(rng() * 3, rng() * 3, 0); group.add(st);
  }

  return {
    group,
    anim(t: number) {
      for (const s of smokers) {
        const u = (t * 0.25 + s.ph) % 1;
        s.s.position.set(s.base.x + Math.sin(t + s.ph) * 0.05 * u, s.base.y + u * 0.9, s.base.z);
        s.s.material.opacity = 0.32 * (1 - u);
        s.s.scale.setScalar(0.5 + u * 0.9);
      }
      lights.forEach((l, i) => { l.material.opacity = 0.5 + 0.12 * Math.sin(t * 3 + i * 2) + 0.06 * Math.sin(t * 11 + i); });
    },
  };
}
