import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Maze } from '../core/maze';
import { Pal } from '../core/theme';
import { mulberry32 } from '../core/rng';
import { collectWalls } from '../art/render';
import { hedgeTexture, smooth, vnoise, disposeTree, hdr } from './common';
import { buildPlanetBody } from './planet';
import { wallPBR, floorPBR } from './pbr2';
import { buildDecor } from './decor';

export const WALL_H = 0.52;
export const WALL_T = 0.27;
export const FLOOR_T = 0.45;

export interface DynWall { group: THREE.Group; closed: boolean; cur: number; vel: number; target: number }

export interface Island {
  group: THREE.Group;
  dyn: DynWall[];
  radius: number;
  cellPos(i: number, out?: THREE.Vector3): THREE.Vector3;
  gridPos(gx: number, gy: number, out?: THREE.Vector3): THREE.Vector3;
  update(dt: number, t?: number): void;
  pulse(p: number): void;
  dispose(): void;
}

function paint(g: THREE.BufferGeometry, v: number) {
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3).fill(v);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
}

/** Parede macia, "a derreter": topo caído, lábio inchado, pingos e linha neon. */
function wallParts(len: number, rng: () => number) {
  const h = WALL_H, t = WALL_T;
  const g = new THREE.BoxGeometry(len, h, t, Math.max(4, Math.round(len * 8)), 7, 2);
  const ph = rng() * 50;
  const droop = rng() < 0.3 ? 0.16 + rng() * 0.18 : 0.03 + rng() * 0.04;
  const topDrop = (x: number) => h * (0.05 * vnoise(x * 2.4 + ph) + droop * Math.max(0, 1 - Math.pow((2 * x) / len, 2)));
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = (y + h / 2) / h;
    const n = vnoise(x * 2.4 + ph);
    pos.setY(i, y - topDrop(x) * smooth(0.4, 1, u));
    pos.setZ(i, z + Math.sign(z) * 0.045 * smooth(0.35, 0.95, u) * (0.4 + n));
    const v = (0.46 + 0.54 * Math.pow(u, 0.85)) * (0.88 + 0.12 * n);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.translate(0, h / 2, 0);
  g.computeVertexNormals();
  {
    const uv = g.attributes.uv, nrm = g.attributes.normal, off = ph * 0.37;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      if (ny > 0.6) uv.setXY(i, x * 1.1 + off, z * 1.1); else if (nx > 0.6) uv.setXY(i, z * 1.1 + off, y * 1.1); else uv.setXY(i, x * 1.1 + off, y * 1.1);
    }
  }

  const parts: THREE.BufferGeometry[] = [g];
  const drips = rng() < 0.6 ? 1 + Math.floor(rng() * 2) : 0;
  for (let k = 0; k < drips; k++) {
    const d = new THREE.SphereGeometry(0.045, 8, 6);
    const x = (rng() - 0.5) * len * 0.8;
    d.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(x, h - topDrop(x) - 0.1, (rng() < 0.5 ? -1 : 1) * (t / 2 + 0.035)),
      new THREE.Quaternion(), new THREE.Vector3(1, 2.4 + rng() * 2.2, 1)));
    paint(d, 0.95);
    parts.push(d);
  }
  // espinhos nas sebes (o jardim morde)
  const thorns = 2 + Math.floor(rng() * 3);
  for (let k = 0; k < thorns; k++) {
    const x = (rng() - 0.5) * len * 0.85, side = rng() < 0.5 ? -1 : 1;
    const c = new THREE.ConeGeometry(0.028, 0.15 + rng() * 0.08, 5);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(side * (0.5 + rng() * 0.5), 0, (rng() - 0.5) * 0.5));
    c.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, h - topDrop(x) + 0.03, side * t * 0.32), q, new THREE.Vector3(1, 1, 1)));
    paint(c, 0.4);
    parts.push(c);
  }
  // linha neon no topo (a "Maze Art" a brilhar)
  const s = new THREE.BoxGeometry(len * 0.94, 0.022, 0.05, Math.max(4, Math.round(len * 8)), 1, 1);
  const sp = s.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setY(i, h - topDrop(sp.getX(i)) + 0.012 + sp.getY(i));
  return { solid: parts, strip: s };
}

export function buildIsland(m: Maze, pal: Pal, seed: number, planet = false, look?: { wall: string; floor: string; decor: string }): Island {
  const L = look ?? { wall: 'stone', floor: 'flag', decor: planet ? 'planet' : 'garden' };
  const group = new THREE.Group();
  const { cols, rows } = m;
  const rng = mulberry32(seed * 977 + 13);
  const open: number[] = [];
  for (let i = 0; i < cols * rows; i++) if (!m.solid[i]) open.push(i);
  const px = (i: number) => (i % cols) + 0.5 - cols / 2;
  const pz = (i: number) => ((i / cols) | 0) + 0.5 - rows / 2;
  let R = 0;
  for (const i of open) R = Math.max(R, Math.hypot(px(i), pz(i)));

  const flag = floorPBR(L.floor);
  const fk = L.floor;
  // chão em xadrez (o plano de xadrez surreal de Dalí)
  const boxG = new THREE.BoxGeometry(0.985, FLOOR_T, 0.985);
  const nA = open.filter((i) => ((i % cols) + ((i / cols) | 0)) % 2 === 0);
  const nB = open.filter((i) => ((i % cols) + ((i / cols) | 0)) % 2 === 1);
  const mk = (list: number[], color: number) => {
    const mesh = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), fk === 'flag' ? 0.32 : 0.86), map: flag.map, normalMap: flag.normal, normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: fk === 'ice' ? 0.12 : fk === 'obsidian' ? 0.3 : fk === 'wood' ? 0.8 : fk === 'metal' ? 0.5 : planet ? 0.92 : 0.62,
      metalness: fk === 'metal' ? 0.55 : 0.03, envMapIntensity: fk === 'ice' ? 1.8 : 0.7,
      emissiveMap: flag.emissive, emissive: flag.emissive ? new THREE.Color(0xffffff) : new THREE.Color(0x000000), emissiveIntensity: flag.emissive ? 1.4 : 0,
    }), list.length);
    const mat = new THREE.Matrix4();
    list.forEach((i, k) => mesh.setMatrixAt(k, mat.makeTranslation(px(i), -FLOOR_T / 2, pz(i))));
    mesh.receiveShadow = true;
    return mesh;
  };
  group.add(mk(nA, pal.floorA), mk(nB, pal.floorB));

  let planetAnim: ((t: number) => void) | undefined;
  if (planet) {
    const pb = buildPlanetBody(open.map((i) => new THREE.Vector2(px(i), pz(i))), R, rng);
    group.add(pb.group); planetAnim = pb.anim;
  } else {
    // ventre rochoso (estalactites) — a ilha flutua
    const cone = new THREE.ConeGeometry(0.72, 1, 4, 1, false).rotateY(Math.PI / 4).rotateX(Math.PI);
    const rocks = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), open.length);
    const mat = new THREE.Matrix4();
    const cA = new THREE.Color(0x3a2a30), cB = new THREE.Color(0x6a4a3c), cc = new THREE.Color();
    open.forEach((i, k) => {
      const dn = Math.hypot(px(i), pz(i)) / Math.max(R, 1);
      const depth = (1.5 + 6.5 * Math.pow(1 - dn, 1.4)) * (0.75 + 0.5 * rng());
      mat.compose(new THREE.Vector3(px(i), -FLOOR_T - depth / 2, pz(i)), new THREE.Quaternion(), new THREE.Vector3(1, depth, 1));
      rocks.setMatrixAt(k, mat);
      rocks.setColorAt(k, cc.copy(cA).lerp(cB, rng()));
    });
    rocks.castShadow = false;
    group.add(rocks);

  }

  // paredes fixas
  const segs = collectWalls(m);
  const solids: THREE.BufferGeometry[] = [], strips: THREE.BufferGeometry[] = [];
  segs.forEach((s, k) => {
    const { solid, strip } = wallParts(1 + WALL_T, mulberry32(seed * 31 + k * 7 + 1));
    const cx = (s.x1 + s.x2) / 2 - cols / 2, cz = (s.y1 + s.y2) / 2 - rows / 2;
    const m4 = new THREE.Matrix4().compose(
      new THREE.Vector3(cx, 0, cz),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.y1 === s.y2 ? 0 : Math.PI / 2),
      new THREE.Vector3(1, 1, 1));
    for (const g of solid) { g.applyMatrix4(m4); solids.push(g); }
    strip.applyMatrix4(m4); strips.push(strip);
  });
  const stone = wallPBR(L.wall);
  const wk = L.wall;
  const hedgeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(pal.wall).lerp(new THREE.Color(0xffffff), wk === 'stone' ? 0.82 : 0.93), map: stone.map, normalMap: stone.normal, normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: wk === 'ice' ? 0.22 : wk === 'brass' ? 0.5 : wk === 'obsidian' ? 0.4 : wk === 'shelves' ? 0.85 : 0.92,
    metalness: wk === 'brass' ? 0.6 : wk === 'ice' ? 0.1 : 0, vertexColors: true, envMapIntensity: wk === 'ice' ? 1.7 : 0.6,
    emissiveMap: stone.emissive, emissive: stone.emissive ? new THREE.Color(0xffffff) : new THREE.Color(0x000000), emissiveIntensity: stone.emissive ? 1.6 : 0,
  });
  const walls = new THREE.Mesh(mergeGeometries(solids, false)!, hedgeMat);
  walls.castShadow = true; walls.receiveShadow = true;
  group.add(walls);
  const stripMat = new THREE.MeshBasicMaterial({ color: hdr(pal.accent, planet ? 0.8 : 1.05), toneMapped: false });
  group.add(new THREE.Mesh(mergeGeometries(strips, false)!, stripMat));
  const stripBase = stripMat.color.clone();
  solids.forEach((g) => g.dispose()); strips.forEach((g) => g.dispose());

  // sebes dinâmicas (flores brancas): sobem e descem com mola
  const dyn: DynWall[] = [];
  const dynMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(pal.wall).lerp(new THREE.Color(pal.accent), 0.45), map: hedgeTexture(), roughness: 0.8,
    vertexColors: true, emissive: new THREE.Color(pal.accent), emissiveIntensity: 0.18,
  });
  const blossomMat = new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 1.4), toneMapped: false });
  m.dyn.forEach((e, k) => {
    const horizontal = e.dir === 2;
    const r2 = mulberry32(seed * 53 + k);
    const { solid, strip } = wallParts(1 + WALL_T, r2);
    const g = new THREE.Group();
    const body = new THREE.Mesh(mergeGeometries(solid, false)!, dynMat);
    body.castShadow = true;
    g.add(body, new THREE.Mesh(strip, new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 1.6), toneMapped: false })));
    for (let b = -1; b <= 1; b++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), blossomMat);
      f.position.set(b * 0.3, WALL_H + 0.02, 0);
      g.add(f);
    }
    g.position.set((e.a % cols) + (horizontal ? 0.5 : 1) - cols / 2, 0, ((e.a / cols) | 0) + (horizontal ? 1 : 0.5) - rows / 2);
    if (!horizontal) g.rotation.y = Math.PI / 2;
    group.add(g);
    dyn.push({ group: g, closed: true, cur: 1, vel: 0, target: 1 });
  });

  // detalhe de cenário: musgo, poças, ossos, lápides, velas, archotes
  const reserved = new Set<number>([m.start, m.exit, ...m.rosas]);
  const decor = buildDecor({ cols, rows, open, reserved, segs, rng: mulberry32(seed * 71 + 5), style: L.decor as 'garden' | 'planet' | 'ice' | 'hell' | 'clock' | 'library', accent: pal.accent, wallH: WALL_H, wallT: WALL_T });
  group.add(decor.group);

  return {
    group, dyn, radius: R,
    pulse(p: number) { stripMat.color.copy(stripBase).multiplyScalar(1 + 1.1 * p); },
    cellPos: (i, out = new THREE.Vector3()) => out.set(px(i), 0, pz(i)),
    gridPos: (gx, gy, out = new THREE.Vector3()) => out.set(gx - cols / 2, 0, gy - rows / 2),
    update(dt: number, t = 0) {
      planetAnim?.(t);
      decor.update(t);
      for (const d of dyn) {
        d.vel += (d.target - d.cur) * 190 * dt;
        d.vel *= Math.exp(-9 * dt);
        d.cur += d.vel * dt;
        const s = Math.max(0.001, d.cur);
        d.group.scale.y = s;
        d.group.visible = d.cur > 0.03 || d.target > 0.5;
      }
    },
    dispose() { disposeTree(group); },
  };
}
