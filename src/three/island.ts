import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Maze, neighbor, DIRS } from '../core/maze';
import { buildIceFx, buildLavaFx, buildWarpFx, buildHoleFx, buildHazardFx, buildCloudFx, IceFx, LavaFx, WorldFx } from './mechfx';
import { Pal } from '../core/theme';
import { mulberry32 } from '../core/rng';
import { collectWalls } from '../art/render';
import { hedgeTexture, smooth, vnoise, disposeTree, hdr } from './common';
import { buildPlanetBody } from './planet';
import { wallPBR, floorPBR } from './pbr2';
import { buildDecor, DecorOpts } from './decor';

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
  layers?: THREE.Group[];                 // anéis: um grupo por camada (roda inteiro)
  setRingTarget?(layer: number): void;    // assinala o anel que o botão vai rodar
  ice?: IceFx;
  lava?: LavaFx;
  fx?: WorldFx;
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
  const floorAt = new Map<number, [THREE.InstancedMesh, number][]>(); // para as nuvens poderem abrir um buraco
  const nA = open.filter((i) => ((i % cols) + ((i / cols) | 0)) % 2 === 0);
  const nB = open.filter((i) => ((i % cols) + ((i / cols) | 0)) % 2 === 1);
  const mk = (list: number[], color: number) => {
    const mesh = new THREE.InstancedMesh(boxG, new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), fk === 'flag' ? 0.32 : 0.86), map: flag.map, normalMap: flag.normal, normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: fk === 'ice' ? 0.12 : fk === 'obsidian' ? 0.3 : fk === 'wood' ? 0.8 : fk === 'metal' ? 0.5 : planet ? 0.92 : 0.62,
      metalness: fk === 'metal' ? 0.55 : 0.03, envMapIntensity: fk === 'ice' ? 1.8 : 0.7,
      emissiveMap: flag.emissive, emissive: flag.emissive ? new THREE.Color(0xffffff) : new THREE.Color(0x000000), emissiveIntensity: flag.emissive ? (m.mech === 'lava' ? 0.22 : 1.4) : 0,
    }), list.length);
    const mat = new THREE.Matrix4();
    list.forEach((i, k) => { mesh.setMatrixAt(k, mat.makeTranslation(px(i), -FLOOR_T / 2, pz(i))); (floorAt.get(i) ?? floorAt.set(i, []).get(i)!).push([mesh, k]); });
    mesh.receiveShadow = true;
    return mesh;
  };
  const R2 = m.rings;
  const layers: THREE.Group[] = [];
  if (R2) {
    // cada anel tem o seu chão (mais quente para o centro) e roda como uma peça só
    for (let l = 0; l <= R2.n; l++) {
      const g = new THREE.Group(); g.rotation.y = -R2.rot[l] * Math.PI / 2; layers.push(g); group.add(g);
      // cores bem distintas, para se ver de relance o que roda: bronze escuro (fixo), ouro, fúcsia
      const [ca, cb] = ([[0x4a3828, 0x3e2e20], [0xe8a018, 0xc98608], [0xd83a98, 0xb82a80]] as const)[l];
      for (const [list, color] of [[nA, ca], [nB, cb]] as const) {
        const mesh = mk(list.filter((i) => R2.layer[i] === l), color);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.map = null; mat.color.setHex(color); mat.roughness = 0.5; mat.metalness = 0.25;
        g.add(mesh);
      }
    }
  } else group.add(mk(nA, pal.floorA), mk(nB, pal.floorB));

  let planetAnim: ((t: number) => void) | undefined;
  if (planet) {
    const pb = buildPlanetBody(open.map((i) => new THREE.Vector2(px(i), pz(i))), R, rng);
    group.add(pb.group); planetAnim = pb.anim;
  } else {
    // ventre rochoso (estalactites) — a ilha flutua
    const cone = new THREE.ConeGeometry(0.72, 1, 4, 1, false).rotateY(Math.PI / 4).rotateX(Math.PI);
    const rocks = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), open.length);
    const mat = new THREE.Matrix4();
    const bellyP: Record<string, [number, number]> = { angel: [0xb8b4d4, 0xf0ecff], ink: [0x0a1a3a, 0x1a4a8a], neon: [0x1a1030, 0x3a2060], space: [0x2a3040, 0x5a6878], stars: [0x10163a, 0x2a3470], egypt: [0x6a4a22, 0xa88040], mandala: [0x5a2a0a, 0xa86a20], animal: [0x4a3418, 0x8a6a30], rock: [0x14141a, 0x34343e] };
    const bp = bellyP[L.decor] ?? [0x3a2a30, 0x6a4a3c];
    const cA = new THREE.Color(bp[0]), cB = new THREE.Color(bp[1]), cc = new THREE.Color();
    open.forEach((i, k) => {
      const dn = Math.hypot(px(i), pz(i)) / Math.max(R, 1);
      const depth = (1.5 + 6.5 * Math.pow(1 - dn, 1.4)) * (0.75 + 0.5 * rng());
      mat.compose(new THREE.Vector3(px(i), -FLOOR_T - depth / 2, pz(i)), new THREE.Quaternion(), new THREE.Vector3(1, depth, 1));
      rocks.setMatrixAt(k, mat);
      (floorAt.get(i) ?? floorAt.set(i, []).get(i)!).push([rocks, k]);
      rocks.setColorAt(k, cc.copy(cA).lerp(cB, rng()));
    });
    rocks.castShadow = false;
    group.add(rocks);

  }

  // paredes fixas (nos anéis, cada camada tem as suas; as de fronteira são meias paredes recuadas, com as portas abertas)
  interface WSeg { x1: number; y1: number; x2: number; y2: number; ix?: number; iy?: number }
  const wallSets: WSeg[][] = [];
  if (R2) {
    for (let l = 0; l <= R2.n; l++) {
      const list: WSeg[] = [];
      for (let u = 0; u < cols * rows; u++) {
        if (R2.layer[u] !== l) continue;
        const c = u % cols, r = (u / cols) | 0;
        const edge = [[c, r, c + 1, r], [c + 1, r, c + 1, r + 1], [c, r + 1, c + 1, r + 1], [c, r, c, r + 1]];
        for (let d = 0; d < 4; d++) {
          const v = neighbor(m, u, d), [x1, y1, x2, y2] = edge[d];
          if (v < 0) list.push({ x1, y1, x2, y2 });
          else if (R2.layer[v] === l) { if (u < v && !R2.intra[l].has(u * 10000 + v)) list.push({ x1, y1, x2, y2 }); }
          else if (!R2.door[l].has(u * 10000 + v)) list.push({ x1, y1, x2, y2, ix: -DIRS[d].dx, iy: -DIRS[d].dy });
        }
      }
      wallSets.push(list);
    }
  } else wallSets.push(collectWalls(m));
  const segs: WSeg[] = R2 ? wallSets[0].filter((w) => w.ix === undefined) : wallSets[0];
  const built = wallSets.map((set, l) => {
    const solids: THREE.BufferGeometry[] = [], strips: THREE.BufferGeometry[] = [];
    set.forEach((w, k) => {
      const { solid, strip } = wallParts(1 + WALL_T, mulberry32(seed * 31 + (k + l * 500) * 7 + 1));
      const half = w.ix !== undefined;
      const cx = (w.x1 + w.x2) / 2 - cols / 2 + (half ? w.ix! * 0.076 : 0), cz = (w.y1 + w.y2) / 2 - rows / 2 + (half ? w.iy! * 0.076 : 0);
      const m4 = new THREE.Matrix4().compose(
        new THREE.Vector3(cx, 0, cz),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), w.y1 === w.y2 ? 0 : Math.PI / 2),
        new THREE.Vector3(1, 1, half ? 0.52 : 1));
      for (const g of solid) { g.applyMatrix4(m4); solids.push(g); }
      strip.applyMatrix4(m4); strips.push(strip);
    });
    return { solids, strips };
  });
  const stone = wallPBR(L.wall);
  const wk = L.wall;
  const hedgeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(pal.wall).lerp(new THREE.Color(0xffffff), wk === 'stone' ? 0.82 : 0.93), map: stone.map, normalMap: stone.normal, normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: wk === 'ice' ? 0.22 : wk === 'brass' ? 0.5 : wk === 'obsidian' ? 0.4 : wk === 'shelves' ? 0.85 : 0.92,
    metalness: wk === 'brass' ? 0.6 : wk === 'ice' ? 0.1 : 0, vertexColors: true, envMapIntensity: wk === 'ice' ? 1.7 : 0.6,
    emissiveMap: stone.emissive, emissive: stone.emissive ? new THREE.Color(0xffffff) : new THREE.Color(0x000000), emissiveIntensity: stone.emissive ? 1.6 : 0,
  });
  const stripMat = new THREE.MeshBasicMaterial({ color: hdr(pal.accent, planet ? 0.8 : 1.05), toneMapped: false });
  built.forEach(({ solids, strips }, l) => {
    const target = layers[l] ?? group;
    let wm = hedgeMat, sm = stripMat;
    if (R2) {
      wm = hedgeMat.clone(); wm.color.setHex([0x8a7462, 0xffd878, 0xff9ad8][l]);
      sm = stripMat.clone(); sm.color.copy(hdr([0x8a6a40, 0xffd24a, 0xff4fd8][l], l ? 1.5 : 0.8));
    }
    const walls = new THREE.Mesh(mergeGeometries(solids, false)!, wm);
    walls.castShadow = true; walls.receiveShadow = true;
    target.add(walls, new THREE.Mesh(mergeGeometries(strips, false)!, sm));
    solids.forEach((g) => g.dispose()); strips.forEach((g) => g.dispose());
  });
  const stripBase = stripMat.color.clone();

  // anéis: moldura de luz em cada fronteira (com quatro losangos que mostram a rotação) e destaque do anel-alvo
  const marks: THREE.Mesh[] = [];
  if (R2) {
    const half = (cols - 1) / 2;
    for (let l = 1; l <= R2.n; l++) {
      let rad = 0;
      for (let i = 0; i < cols * rows; i++) if (R2.layer[i] === l) rad = Math.max(rad, Math.abs((i % cols) - half), Math.abs(((i / cols) | 0) - half));
      const side = 2 * rad + 1, tone = hdr(l === 1 ? 0xffd24a : 0xff5ad0, 1.8);
      const frame = new THREE.MeshBasicMaterial({ color: tone, toneMapped: false });
      const mark = new THREE.MeshBasicMaterial({ color: tone, toneMapped: false, transparent: true, opacity: 0, depthWrite: false });
      for (let k = 0; k < 4; k++) {
        const rot = new THREE.Matrix4().makeRotationY((k * Math.PI) / 2);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(side - 0.02, 0.022, 0.09).translate(0, 0.018, side / 2 - 0.03).applyMatrix4(rot), frame);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13).scale(1, 0.7, 1).translate(0, WALL_H + 0.2, side / 2).applyMatrix4(rot), frame);
        const glowBar = new THREE.Mesh(new THREE.BoxGeometry(side + 0.04, 0.02, 0.17).translate(0, WALL_H + 0.09, side / 2).applyMatrix4(rot), mark);
        glowBar.userData.layer = l; marks.push(glowBar);
        layers[l].add(bar, gem, glowBar);
      }
    }
  }
  let ringTargetL = 0;

  // sebes dinâmicas (flores brancas): sobem e descem com mola
  const dyn: DynWall[] = [];
  const dynMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(pal.wall).lerp(new THREE.Color(pal.accent), 0.45), map: hedgeTexture(), roughness: 0.8,
    vertexColors: true, emissive: new THREE.Color(pal.accent), emissiveIntensity: 0.18,
  });
  const blossomMat = new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 1.4), toneMapped: false });
  // biblioteca: as paredes que a página troca são fúcsia; quando descem deixam uma marca azul no chão
  const page = m.mech === 'page';
  if (page) { dynMat.color.set(0xff4fd8); dynMat.emissive.set(0xc8179f); dynMat.emissiveIntensity = 0.55; }
  const ghosts: THREE.Mesh[] = [];
  const ghostGeo = page ? new THREE.PlaneGeometry(0.92, 0.2).rotateX(-Math.PI / 2) : undefined;
  const ghostMat = page ? new THREE.MeshBasicMaterial({ color: 0x3b74f2, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }) : undefined;
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
    if (ghostGeo) {
      const gh = new THREE.Mesh(ghostGeo, ghostMat!);
      gh.position.set(g.position.x, 0.025, g.position.z); gh.rotation.y = g.rotation.y;
      group.add(gh); ghosts.push(gh);
    }
    dyn.push({ group: g, closed: true, cur: 1, vel: 0, target: 1 });
  });

  // detalhe de cenário: musgo, poças, ossos, lápides, velas, archotes
  const reserved = new Set<number>([m.start, m.exit, ...m.rosas]);
  // com mecânica, o chão fica limpo: nada se pode confundir com neve, lava ou anéis (nos anéis só o exterior tem adereços)
  const decorOpen = R2 ? open.filter((i) => R2.layer[i] === 0) : m.mech ? [] : open;
  const decor = buildDecor({ cols, rows, open: decorOpen, reserved, segs, rng: mulberry32(seed * 71 + 5), style: L.decor as DecorOpts['style'], accent: pal.accent, wallH: WALL_H, wallT: WALL_T });
  group.add(decor.group);

  const cellPos = (i: number, out = new THREE.Vector3()) => out.set(px(i), 0, pz(i));
  const ice = m.mech === 'ice' ? buildIceFx(m, cellPos) : undefined;
  const lava = m.mech === 'lava' ? buildLavaFx(m, cellPos) : undefined;
  if (ice) group.add(ice.group);
  if (lava) group.add(lava.mesh);
  const hideFloor = (c: number) => { const zero = new THREE.Matrix4().makeScale(0, 0, 0); for (const [mesh, k] of floorAt.get(c) ?? []) { mesh.setMatrixAt(k, zero); mesh.instanceMatrix.needsUpdate = true; } };
  const fx = m.warp ? buildWarpFx(m, cellPos) : m.holes ? buildHoleFx(m, cellPos) : m.haz ? buildHazardFx(m, cellPos) : m.clouds ? buildCloudFx(m, cellPos, hideFloor) : undefined;
  if (fx) group.add(fx.group);

  return {
    group, dyn, radius: R, ice, lava, fx,
    layers: R2 ? layers : undefined,
    setRingTarget: R2 ? (l: number) => { ringTargetL = l; } : undefined,
    pulse(p: number) { stripMat.color.copy(stripBase).multiplyScalar(1 + 1.1 * p); },
    cellPos,
    gridPos: (gx, gy, out = new THREE.Vector3()) => out.set(gx - cols / 2, 0, gy - rows / 2),
    update(dt: number, t = 0) {
      planetAnim?.(t);
      decor.update(t);
      ice?.update(t);
      lava?.update(dt, t);
      fx?.update(dt, t);
      for (const g of marks) (g.material as THREE.MeshBasicMaterial).opacity = g.userData.layer === ringTargetL ? 0.35 + 0.3 * Math.sin(t * 4.5) : 0;
      for (const d of dyn) {
        d.vel += (d.target - d.cur) * 190 * dt;
        d.vel *= Math.exp(-9 * dt);
        d.cur += d.vel * dt;
        const s = Math.max(0.001, d.cur);
        d.group.scale.y = s;
        d.group.visible = d.cur > 0.03 || d.target > 0.5;
      }
      ghosts.forEach((gh, k) => { gh.visible = dyn[k].cur < 0.5; });
      if (ghostMat) ghostMat.opacity = 0.62 + 0.26 * Math.sin(t * 3);
    },
    dispose() { disposeTree(group); },
  };
}
