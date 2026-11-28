// Visuais das regras da Vaga 3: portões, objetos no chão, raios de sol, água pintada e constelações.
// `set(w, casa)` leva o cenário ao estado da regra; devolve os sítios onde algo acabou de acontecer (para faíscas).
import * as THREE from 'three';
import { Maze, Gate, Item, neighbor } from '../core/maze';
import {
  smashed, mountOf, ELEPHANT, MONKEY, GAZELLE, echoTimer, echoOpen, ECHO_W, ECHO_K, moonAt, sunAt, painted, phaseOf,
  progressOf, starCount, sealOpen, mirrorBit, traceBeam, SMALL, GIANT,
} from '../core/rules';
import { mulberry32 } from '../core/rng';
import { glowSprite, hdr } from './common';
import { makeAnimal, Animal, Beast, BEAST_COLOR } from './animals';

type CellPos = (i: number, out?: THREE.Vector3) => THREE.Vector3;
export interface RuleEvent { x: number; z: number; color: number; n: number; y?: number }
export interface RuleFx {
  group: THREE.Group;
  set(w: number, cell: number, instant?: boolean): RuleEvent[];
  update(dt: number, t: number): void;
}

const H = 0.54, BEAM_Y = 0.88;
/** cores dos pares (portão, botão ou selo do mesmo número) */
export const PAIR = [0x5b92ff, 0xff4fd8, 0xffc457];
const STARS = [0xffd45a, 0x7ad8ff];

const std = (color: number, emissive: number, k = 0.4, rough = 0.7, metal = 0.1) => new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(emissive), emissiveIntensity: k, roughness: rough, metalness: metal });
const neon = (color: number, k = 1.8, opacity = 1) => new THREE.MeshBasicMaterial({ color: hdr(color, k), toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = shadow; return o; };
const ringMesh = (a: number, b: number, color: number, k = 1.8, opacity = 0.85) => { const r = mesh(new THREE.RingGeometry(a, b, 40).rotateX(-Math.PI / 2), neon(color, k, opacity), 0, 0.03, 0, false); r.renderOrder = 2; return r; };

/** Letreiro com um número ou sinal, que se atualiza. */
function label(color: string, size = 0.5) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
  s.scale.setScalar(size); s.renderOrder = 7;
  let last = '';
  return {
    sprite: s,
    text(v: string) {
      if (v === last) return;
      last = v; s.visible = !!v;
      const g = c.getContext('2d')!; g.clearRect(0, 0, 128, 128);
      if (!v) { tex.needsUpdate = true; return; }
      g.beginPath(); g.arc(64, 64, 46, 0, 6.283); g.fillStyle = 'rgba(10,11,16,.82)'; g.fill(); g.lineWidth = 8; g.strokeStyle = color; g.stroke();
      g.font = 'bold 62px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText(v, 64, 68);
      tex.needsUpdate = true;
    },
  };
}
const css = (n: number) => '#' + n.toString(16).padStart(6, '0');

interface GateObj { g: Gate; root: THREE.Group; open: number; cur: number; apply(u: number, t: number): void; at: THREE.Vector3 }
interface Anim { (dt: number, t: number): void }

export function buildRuleFx(m: Maze, cellPos: CellPos): RuleFx {
  const group = new THREE.Group();
  const rng = mulberry32(m.start * 67 + m.exit * 29 + 3);
  const anims: Anim[] = [];
  const gates: GateObj[] = [];
  const pa = new THREE.Vector3(), pb = new THREE.Vector3();
  /** base de um portão: no meio das duas casas, com o comprimento ao longo de X */
  const gateBase = (g: Gate) => {
    const root = new THREE.Group();
    cellPos(g.a, pa); cellPos(g.b, pb);
    root.position.addVectors(pa, pb).multiplyScalar(0.5);
    if (g.dir === 1) root.rotation.y = Math.PI / 2;
    group.add(root);
    return root;
  };
  const addGate = (g: Gate, root: THREE.Group, apply: GateObj['apply']) => { const o: GateObj = { g, root, open: 0, cur: 0, apply, at: root.position.clone() }; gates.push(o); apply(0, 0); return o; };
  const itemBase = (it: Item) => { const r = new THREE.Group(); cellPos(it.c, r.position); group.add(r); return r; };
  const underfoot: { c: number; on: boolean; cur: number }[] = [];

  // ───────── Jardim: cogumelos, fendas e sebes baixas ─────────
  if (m.mech === 'size') {
    const hedge = std(0x1d4423, 0x07200c, 0.5, 0.95), bloom = neon(0xff9ae0, 1.5);
    const leafGeo = new THREE.IcosahedronGeometry(0.05, 0).scale(1, 0.62, 1), dummy = new THREE.Object3D();
    const leafTone = [std(0x2f7d32, 0x0c3a12, 0.6, 0.85), std(0x6fbf45, 0x22600e, 0.55, 0.85)];
    /** um tufo de folhas a cobrir um bloco (centro e tamanho) */
    const foliage = (root: THREE.Group, x: number, y: number, w: number, h: number, d: number, n: number) => {
      for (const tone of leafTone) {
        const leaves = new THREE.InstancedMesh(leafGeo, tone, n);
        for (let i = 0; i < n; i++) {
          const face = rng(), u = rng() - 0.5, v = rng() - 0.5;
          if (face < 0.4) dummy.position.set(x + u * w, y + h / 2, v * d); // em cima
          else dummy.position.set(x + u * w, y + v * h, (face < 0.7 ? 0.5 : -0.5) * d); // de lado
          dummy.rotation.set(rng() * 3, rng() * 6, rng() * 3); dummy.scale.setScalar(0.75 + rng() * 0.7); dummy.updateMatrix();
          leaves.setMatrixAt(i, dummy.matrix);
        }
        leaves.castShadow = true; root.add(leaves);
      }
    };
    const cap = [std(0xe8303a, 0x9a0a1a, 0.85, 0.5), std(0x2f6cff, 0x0a2fb0, 0.9, 0.5)], dot = [neon(0xffffff, 1.4), neon(0x9ff4ff, 1.9)], stem = std(0xfff0d4, 0x8a6a3a, 0.35);
    for (const it of m.items!) {
      const k = it.kind === 'grow' ? 1 : 0, r = itemBase(it), shroom = new THREE.Group();
      shroom.add(mesh(new THREE.CylinderGeometry(0.065, 0.1, 0.26, 14), stem, 0, 0.13, 0));
      const top = mesh(new THREE.SphereGeometry(0.26, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), cap[k], 0, 0.23, 0); top.scale.y = k ? 1.15 : 0.8; shroom.add(top);
      shroom.add(mesh(new THREE.CircleGeometry(0.26, 24).rotateX(Math.PI / 2), stem, 0, 0.231, 0, false));
      for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283 + rng(), el = 0.5 + rng() * 0.7; shroom.add(mesh(new THREE.SphereGeometry(0.032 + rng() * 0.016, 10, 8), dot[k], Math.cos(a) * Math.cos(el) * 0.26, 0.23 + Math.sin(el) * 0.26 * (k ? 1.15 : 0.8), Math.sin(a) * Math.cos(el) * 0.26, false)); }
      const halo = ringMesh(0.34, 0.41, k ? 0x4a8cff : 0xff4050, 1.7, 0.75), tag = label(k ? '#4a8cff' : '#ff4050', 0.34);
      tag.text(k ? '▲' : '▼'); tag.sprite.position.y = 0.86;
      r.add(shroom, halo, tag.sprite);
      const ph = rng() * 6, foot = { c: it.c, on: false, cur: 0 };
      underfoot.push(foot);
      anims.push((dt, t) => {
        foot.cur += ((foot.on ? 1 : 0) - foot.cur) * Math.min(1, dt * 9);
        shroom.rotation.z = Math.sin(t * 1.8 + ph) * 0.07;
        const k = 1 + 0.05 * Math.sin(t * 3.1 + ph);
        shroom.scale.set(k * (1 + foot.cur * 0.25), k * (1 - foot.cur * 0.78), k * (1 + foot.cur * 0.25)); // pisado: achata-se
        tag.sprite.visible = foot.cur < 0.5;
        tag.sprite.position.y = 0.86 + Math.sin(t * 2.4 + ph) * 0.05;
      });
    }
    for (const g of m.gates!) {
      const root = gateBase(g), low = g.kind === 'low', color = low ? 0x4a8cff : 0xff4050;
      const edge = neon(color, 1.6, 0.9);
      if (low) {
        root.add(mesh(new THREE.BoxGeometry(1.0, 0.17, 0.27), hedge, 0, 0.085, 0), mesh(new THREE.BoxGeometry(0.96, 0.022, 0.07), edge, 0, 0.18, 0, false));
        foliage(root, 0, 0.085, 0.98, 0.16, 0.28, 34);
        for (let i = 0; i < 6; i++) root.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), bloom, -0.4 + i * 0.16, 0.22, (rng() - 0.5) * 0.2, false));
      } else {
        for (const s of [-1, 1]) foliage(root, s * 0.33, H / 2, 0.34, H, 0.29, 30);
        foliage(root, 0, H - 0.04, 0.3, 0.13, 0.28, 12);
        for (const s of [-1, 1]) root.add(mesh(new THREE.BoxGeometry(0.38, H, 0.28), hedge, s * 0.31, H / 2, 0), mesh(new THREE.BoxGeometry(0.024, H, 0.3), edge, s * 0.115, H / 2, 0, false));
        root.add(mesh(new THREE.BoxGeometry(0.26, 0.15, 0.27), hedge, 0, H - 0.05, 0));
      }
      const sign = label(css(color), 0.34); sign.text(low ? '▲' : '▼'); sign.sprite.position.y = H + 0.34; root.add(sign.sprite);
      addGate(g, root, (u, t) => { edge.opacity = 0.45 + 0.55 * u * (0.75 + 0.25 * Math.sin(t * 8)); sign.sprite.scale.setScalar(0.34 + 0.14 * u); });
    }
  }

  // ───────── Reino Animal: montarias, rochas e ramos ─────────
  const beasts: { it: Item; a: Animal; root: THREE.Group }[] = [];
  if (m.mech === 'mounts') {
    for (const it of m.items!) {
      const kind = it.kind as Beast, r = itemBase(it), a = makeAnimal(kind);
      r.add(a.group, ringMesh(0.36, 0.43, BEAST_COLOR[kind], 1.7, 0.8));
      a.group.rotation.y = (rng() - 0.5) * 0.8;
      beasts.push({ it, a, root: r });
      const ph = rng() * 6; anims.push((_d, t) => a.animate(t + ph, 0));
    }
    const stone = std(0x8d8272, 0x3a2f22, 0.45, 0.95), crack = neon(0xffb45a, 1.8), wood = std(0x9a5a22, 0x4a2206, 0.65, 0.9), leafM = std(0xffa22e, 0xb04a00, 0.75), rope = neon(0xffd27a, 1.25);
    for (const g of m.gates!) {
      const root = gateBase(g), parts: { o: THREE.Object3D; v: THREE.Vector3; home: THREE.Vector3 }[] = [];
      if (g.kind === 'rock') {
        for (let i = 0; i < 11; i++) {
          const rad = 0.13 + rng() * 0.09, o = mesh(new THREE.DodecahedronGeometry(rad, 0), stone, -0.36 + (i % 4) * 0.24 + (rng() - 0.5) * 0.07, 0.1 + Math.floor(i / 4) * 0.19, (rng() - 0.5) * 0.1);
          o.rotation.set(rng() * 3, rng() * 3, rng() * 3); root.add(o);
          parts.push({ o, home: o.position.clone(), v: new THREE.Vector3((rng() - 0.5) * 2.2, 1 + rng() * 2, (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 1.4)) });
        }
        for (const z of [-0.17, 0.17]) { const l = mesh(new THREE.BoxGeometry(0.022, 0.3, 0.012), crack, -0.03, 0.27, z, false); l.rotation.z = 0.5; const l2 = mesh(new THREE.BoxGeometry(0.018, 0.17, 0.012), crack, 0.08, 0.17, z, false); l2.rotation.z = -0.7; root.add(l, l2); parts.push({ o: l, home: l.position.clone(), v: new THREE.Vector3(0, 0, 0) }, { o: l2, home: l2.position.clone(), v: new THREE.Vector3(0, 0, 0) }); }
        const sign = label(css(BEAST_COLOR.elephant), 0.32); sign.text('✖'); sign.sprite.position.y = H + 0.34; root.add(sign.sprite);
        let since = 0;
        const o = addGate(g, root, (u) => { sign.sprite.visible = u < 0.05; });
        anims.push((dt) => {
          if (!o.open) return;
          since += dt;
          for (const p of parts) {
            if (!p.v.lengthSq()) { p.o.visible = false; continue; }
            const k = Math.min(since, 0.75);
            p.o.position.set(p.home.x + p.v.x * k * 0.35, Math.max(0.02, p.home.y + p.v.y * k * 0.5 - 4 * k * k * 0.5), p.home.z + p.v.z * k * 0.35);
            p.o.scale.setScalar(Math.max(0.001, 1 - k * 1.15)); p.o.visible = k < 0.74;
          }
        });
      } else {
        for (let i = 0; i < 5; i++) { const y = 0.07 + i * 0.12, b = mesh(new THREE.CylinderGeometry(0.03, 0.036, 1.04, 8), wood, 0, y, (rng() - 0.5) * 0.12); b.rotation.set(0, (rng() - 0.5) * 0.18, Math.PI / 2 + (rng() - 0.5) * 0.24); root.add(b); }
        for (const x of [-0.38, 0.02, 0.4]) {
          root.add(mesh(new THREE.CylinderGeometry(0.045, 0.058, H + 0.1, 8), wood, x, (H + 0.1) / 2, 0));
          for (const y of [0.2, 0.46]) root.add(mesh(new THREE.TorusGeometry(0.062, 0.014, 6, 18).rotateX(Math.PI / 2), rope, x, y, 0, false));
        }
        for (let i = 0; i < 8; i++) { const l = mesh(new THREE.SphereGeometry(0.055, 8, 6).scale(1, 0.35, 0.65), leafM, -0.45 + rng() * 0.9, 0.3 + rng() * 0.32, (rng() - 0.5) * 0.3, false); l.rotation.set(rng() * 3, rng() * 3, rng() * 3); root.add(l); }
        const halo = neon(BEAST_COLOR.monkey, 1.7, 0.9); root.add(mesh(new THREE.BoxGeometry(0.96, 0.022, 0.05), halo, 0, H + 0.08, 0, false));
        const sign = label(css(BEAST_COLOR.monkey), 0.32); sign.text('↷'); sign.sprite.position.y = H + 0.36; root.add(sign.sprite);
        addGate(g, root, (u, t) => { halo.opacity = 0.35 + 0.65 * u * (0.75 + 0.25 * Math.sin(t * 8)); sign.sprite.scale.setScalar(0.32 + 0.14 * u); });
      }
    }
  }

  // ───────── Cidade-Relógio: botões e portões ─────────
  const plates: { it: Item; arc: THREE.Mesh; tag: ReturnType<typeof label>; gear: THREE.Group; last: number }[] = [];
  const doorTags = new Map<number, ReturnType<typeof label>>();
  if (m.mech === 'echo') {
    const brass = std(0xc9973a, 0x6a4408, 0.55, 0.35, 0.75), dark = std(0x2c2118, 0x120a02, 0.4, 0.6, 0.4);
    for (const it of m.items!) {
      const r = itemBase(it), color = PAIR[it.id], gear = new THREE.Group();
      gear.add(mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.06, 32), brass, 0, 0.03, 0));
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283, tooth = mesh(new THREE.BoxGeometry(0.085, 0.055, 0.09), brass, Math.cos(a) * 0.36, 0.028, Math.sin(a) * 0.36); tooth.rotation.y = -a; gear.add(tooth); }
      gear.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 28), neon(color, 1.5), 0, 0.066, 0, false));
      const arc = mesh(new THREE.RingGeometry(0.4, 0.5, 40, 1, 0, 0.001).rotateX(-Math.PI / 2), neon(color, 2.2, 0.95), 0, 0.09, 0, false);
      const tag = label(css(color), 0.42); tag.sprite.position.y = 0.95; tag.text('');
      r.add(gear, arc, tag.sprite);
      plates.push({ it, arc, tag, gear, last: -1 });
    }
    for (const g of m.gates!) {
      const root = gateBase(g), color = PAIR[g.id], grid = new THREE.Group();
      for (let i = 0; i < 6; i++) grid.add(mesh(new THREE.CylinderGeometry(0.027, 0.027, H, 8), brass, -0.4 + i * 0.16, H / 2, 0), mesh(new THREE.ConeGeometry(0.045, 0.09, 8), neon(color, 1.6), -0.4 + i * 0.16, H + 0.045, 0, false));
      grid.add(mesh(new THREE.BoxGeometry(0.94, 0.05, 0.07), dark, 0, H * 0.28, 0), mesh(new THREE.BoxGeometry(0.94, 0.05, 0.07), dark, 0, H * 0.78, 0));
      const disc = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 24).rotateX(Math.PI / 2), neon(color, 1.4), 0, H * 0.53, 0, false); grid.add(disc);
      const hand = mesh(new THREE.BoxGeometry(0.022, 0.12, 0.1), dark, 0, H * 0.53, 0, false); grid.add(hand);
      for (const s of [-1, 1]) root.add(mesh(new THREE.CylinderGeometry(0.075, 0.09, H + 0.12, 10), dark, s * 0.49, (H + 0.12) / 2, 0));
      const base = ringMesh(0.001, 0.001, color); base.visible = false;
      root.add(grid, mesh(new THREE.BoxGeometry(0.94, 0.012, 0.12), neon(color, 1.6, 0.8), 0, 0.012, 0, false));
      const tag = label(css(color), 0.42); tag.sprite.position.y = H + 0.42; tag.text(''); root.add(tag.sprite); doorTags.set(g.id, tag);
      addGate(g, root, (u, t) => { grid.position.y = -u * (H + 0.04); hand.rotation.z = -t * (1 + u * 6); });
    }
  }

  // ───────── Floresta Élfica: raízes de sol e flores de lua ─────────
  if (m.mech === 'roots') {
    const bark = std(0x4a3a1e, 0x241a06, 0.5, 0.95), vine = std(0x2a5a4a, 0x0a3a30, 0.7, 0.9);
    for (const g of m.gates!) {
      const root = gateBase(g), moon = g.kind === 'moon', color = moon ? 0x9f8cff : 0xffb63a;
      const body = new THREE.Group(); root.add(body);
      for (let v = 0; v < 5; v++) {
        const pts: THREE.Vector3[] = [], ph = rng() * 6;
        for (let k = 0; k <= 5; k++) pts.push(new THREE.Vector3(-0.5 + k / 5 + (rng() - 0.5) * 0.06, 0.05 + v * 0.11 + Math.sin(k * 2 + ph) * 0.1, Math.cos(k * 1.5 + ph) * 0.09));
        body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.032, 7), moon ? vine : bark));
      }
      const blooms: THREE.Group[] = [];
      const petal = neon(color, moon ? 1.55 : 1.75), heart = neon(0xffffff, 1.8);
      for (let i = 0; i < 3; i++) {
        const f = new THREE.Group(); f.position.set(-0.3 + i * 0.3, 0.24 + (i % 2) * 0.17, 0);
        for (const z of [-1, 1]) {
          const face = new THREE.Group(); face.position.z = z * 0.13;
          for (let p = 0; p < (moon ? 6 : 8); p++) { const a = (p / (moon ? 6 : 8)) * 6.283; const q = mesh(new THREE.SphereGeometry(0.045, 8, 6).scale(1.6, 0.65, 0.4), petal, Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0, false); q.rotation.z = a; face.add(q); }
          face.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), heart, 0, 0, z * 0.012, false));
          f.add(face);
        }
        body.add(f); blooms.push(f);
      }
      const sign = label(css(color), 0.36); sign.text(moon ? '☾' : '☀'); sign.sprite.position.y = H + 0.4; root.add(sign.sprite);
      const floor = mesh(new THREE.BoxGeometry(0.94, 0.012, 0.14), neon(color, 1.5, 0.75), 0, 0.012, 0, false); root.add(floor);
      addGate(g, root, (u, t) => {
        body.position.y = -u * (H + 0.08); body.scale.x = 1 - u * 0.25;
        blooms.forEach((f, i) => { f.scale.setScalar(1 + 0.12 * Math.sin(t * 2.4 + i * 2) - u * 0.4); f.rotation.z = u * 2.5 + Math.sin(t * 0.8 + i) * 0.15; });
        sign.sprite.position.y = H + 0.4 - u * 0.12 + Math.sin(t * 2) * 0.04;
      });
    }
  }

  // ───────── Oceano de Tinta: água, tinta e tinteiros ─────────
  const strokes: { k: number; o: THREE.Mesh; cur: number; on: boolean }[] = [];
  if (m.mech === 'ink') {
    const time = { value: 0 };
    const water = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, uniforms: { time },
      vertexShader: 'varying vec2 vW; varying vec2 vU; uniform float time; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; w.y += 0.018 * sin(w.x * 6.0 + time * 2.2) * cos(w.z * 5.0 + time * 1.7); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float time; varying vec2 vW; varying vec2 vU;
        void main(){
          float a = sin(vW.x * 7.0 + time * 1.8 + sin(vW.y * 4.0)) * sin(vW.y * 8.0 - time * 1.3 + sin(vW.x * 3.0));
          float foam = smoothstep(0.55, 0.9, a);
          float edge = smoothstep(0.36, 0.5, max(abs(vU.x - 0.5), abs(vU.y - 0.5)));
          vec3 col = mix(vec3(0.0, 0.16, 0.42), vec3(0.02, 0.62, 0.86), 0.5 + 0.5 * a) + vec3(0.8, 1.0, 1.0) * (foam * 0.75 + edge * 0.5);
          gl_FragColor = vec4(col, 0.93); }`,
    });
    const inkMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, uniforms: { time },
      vertexShader: 'varying vec2 vU; varying vec2 vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float time; varying vec2 vU; varying vec2 vW;
        void main(){
          vec2 c = vU - 0.5; float an = atan(c.y, c.x);
          float r = length(c) * (1.0 + 0.12 * sin(an * 5.0 + vW.x * 7.0) + 0.07 * sin(an * 11.0 + vW.y * 9.0));
          if (r > 0.52) discard;
          float swirl = sin(r * 22.0 - an * 2.0 - time * 1.6 + vW.x * 2.0);
          vec3 iris = mix(vec3(0.23, 0.45, 0.96), vec3(1.0, 0.31, 0.85), 0.5 + 0.5 * sin(an + time * 0.7 + vW.y));
          vec3 col = vec3(0.018, 0.012, 0.05) + iris * (smoothstep(0.75, 1.0, swirl) * 0.7 + smoothstep(0.4, 0.52, r) * 1.5);
          gl_FragColor = vec4(col, 0.97); }`,
    });
    const plane = new THREE.PlaneGeometry(0.99, 0.99, 10, 10).rotateX(-Math.PI / 2);
    m.water!.forEach((c, k) => {
      const wm = new THREE.Mesh(plane, water); cellPos(c, wm.position); wm.position.y = 0.045; wm.renderOrder = 1; group.add(wm);
      const o = new THREE.Mesh(plane, inkMat); cellPos(c, o.position); o.position.y = 0.075; o.renderOrder = 2; o.visible = false; group.add(o);
      strokes.push({ k, o, cur: 0, on: false });
    });
    anims.push((_d, t) => { time.value = t; });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fe6ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.42, emissive: 0x1a6ad0, emissiveIntensity: 0.6 });
    const liquid = std(0x14083a, 0x2a0a6a, 0.9, 0.2), rim = neon(0x7ae8ff, 1.9), feather = neon(0xff4fd8, 1.4);
    for (const it of m.items!) {
      const r = itemBase(it), pot = new THREE.Group();
      pot.add(mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.2, 20), liquid, 0, 0.11, 0), mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.25, 20), glass, 0, 0.13, 0, false),
        mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 18), glass, 0, 0.3, 0, false), mesh(new THREE.TorusGeometry(0.095, 0.018, 8, 22).rotateX(Math.PI / 2), rim, 0, 0.345, 0, false));
      const quill = mesh(new THREE.ConeGeometry(0.07, 0.42, 10).scale(1, 1, 0.22), feather, 0.07, 0.55, 0, false); quill.rotation.z = -0.4; pot.add(quill);
      const drop = glowSprite(0x7ae8ff, 0.5, 0.65); drop.position.y = 0.4; pot.add(drop);
      r.add(pot, ringMesh(0.34, 0.41, 0x7ae8ff, 1.7, 0.7));
      const ph = rng() * 6; anims.push((_d, t) => { quill.rotation.z = -0.4 + Math.sin(t * 1.7 + ph) * 0.12; drop.scale.setScalar(0.45 + 0.12 * Math.sin(t * 3 + ph)); });
    }
  }

  // ───────── Neon Glitch: interruptores ─────────
  const pads: { halves: THREE.MeshBasicMaterial[]; root: THREE.Group; spin: number; to: number }[] = [];
  if (m.mech === 'glitch') {
    const frame = std(0x14101f, 0x1a0a30, 0.8, 0.4, 0.6);
    for (const it of m.items!) {
      const r = itemBase(it), pad = new THREE.Group(), halves = [neon(0x27d3ff, 1.8), neon(0xff2bd6, 1.8)];
      pad.add(mesh(new THREE.BoxGeometry(0.66, 0.06, 0.66), frame, 0, 0.03, 0));
      halves.forEach((hm, i) => {
        const z = i ? 0.14 : -0.14;
        pad.add(mesh(new THREE.BoxGeometry(0.5, 0.016, 0.2), hm, 0, 0.068, z, false));
        const tip = mesh(new THREE.ConeGeometry(0.1, 0.17, 3), hm, i ? -0.17 : 0.17, 0.3, z, false); tip.rotation.z = i ? Math.PI / 2 : -Math.PI / 2; pad.add(tip);
      });
      const tag = label('#27d3ff', 0.32); tag.text('⇄'); tag.sprite.position.y = 0.74;
      r.add(pad, tag.sprite);
      pads.push({ halves, root: pad, spin: 0, to: 0 });
    }
    anims.push((dt, t) => pads.forEach((p) => { p.spin += (p.to - p.spin) * Math.min(1, dt * 8); p.root.rotation.y = p.spin + Math.sin(t * 7) * (Math.random() < 0.02 ? 0.25 : 0); }));
  }

  // ───────── Estelar: estrelas, constelações e pontes ─────────
  const stars: { it: Item; body: THREE.Mesh; mat: THREE.MeshBasicMaterial; glow: THREE.Sprite; tag: ReturnType<typeof label>; lit: number }[] = [];
  const lines: { c: number; k: number; o: THREE.Object3D; cur: number; on: boolean }[] = [];
  if (m.mech === 'stars') {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 - 1.5708, r = i % 2 ? 0.095 : 0.22; const x = Math.cos(a) * r, y = -Math.sin(a) * r; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 1 }).translate(0, 0, -0.03);
    for (const it of m.items!) {
      const r = itemBase(it), color = STARS[it.id], sm = neon(color, 0.9);
      const body = mesh(geo, sm, 0, 0.52, 0, false), glow = glowSprite(color, 0.8, 0.35); glow.position.y = 0.52;
      const tag = label(css(color), 0.46); tag.text(String(it.k! + 1)); tag.sprite.position.y = 1.04;
      r.add(body, glow, tag.sprite, ringMesh(0.3, 0.35, color, 1.4, 0.55));
      stars.push({ it, body, mat: sm, glow, tag, lit: 0 });
    }
    // as linhas da constelação, por cima das paredes
    const up = new THREE.Vector3(0, 1, 0);
    for (const s of stars) {
      const next = stars.find((x) => x.it.id === s.it.id && x.it.k === s.it.k! + 1);
      if (!next) continue;
      const a = cellPos(s.it.c).setY(1.12), b = cellPos(next.it.c).setY(1.12), d = b.clone().sub(a);
      const o = mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 6), neon(STARS[s.it.id], 2, 0.85), 0, 0, 0, false);
      o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(up, d.clone().normalize()); o.scale.y = 0.001; o.userData.len = d.length(); o.visible = false;
      group.add(o); lines.push({ c: s.it.id, k: s.it.k! + 1, o, cur: 0, on: false });
    }
    const abyss = new THREE.MeshBasicMaterial({ color: 0x01020a });
    for (const g of m.gates!) {
      const root = gateBase(g), color = STARS[g.id];
      // por formar: um rasgo de céu com um arco pontilhado; formada: tábuas de luz
      root.add(mesh(new THREE.BoxGeometry(0.98, 0.012, 0.42), abyss, 0, 0.014, 0, false));
      const trace = neon(color, 1.7, 0.5);
      const dots = new THREE.Group(), planks = new THREE.Group();
      for (let i = 0; i <= 10; i++) dots.add(mesh(new THREE.SphereGeometry(0.028, 8, 6), neon(color, 1.5, 0.75), -0.45 + i * 0.09, 0.12 + Math.sin((i / 10) * Math.PI) * 0.42, 0, false));
      for (let i = 0; i < 40; i++) dots.add(mesh(new THREE.SphereGeometry(0.008 + rng() * 0.008, 5, 4), neon(0xffffff, 1.2 + rng()), -0.46 + rng() * 0.92, 0.03 + rng() * 0.03, (rng() - 0.5) * 0.36, false));
      for (const s of [-1, 1]) dots.add(mesh(new THREE.BoxGeometry(0.96, 0.014, 0.06), trace, 0, 0.03, s * 0.23, false)); // margens da ponte por formar
      const wall = mesh(new THREE.PlaneGeometry(0.96, H), new THREE.MeshBasicMaterial({ color: hdr(color, 0.9), transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }), 0, H / 2, 0, false); dots.add(wall);
      for (let i = 0; i < 5; i++) { const p = mesh(new THREE.BoxGeometry(0.15, 0.035, 0.62), neon(color, 1.35, 0.92), -0.36 + i * 0.18, 0.045, 0, false); planks.add(p); }
      for (const s of [-1, 1]) planks.add(mesh(new THREE.BoxGeometry(0.92, 0.02, 0.025), neon(0xffffff, 1.6), 0, 0.075, s * 0.31, false));
      const sign = label(css(color), 0.5); sign.text('★'); sign.sprite.position.y = H + 0.46;
      root.add(dots, planks, sign.sprite);
      planks.visible = false;
      addGate(g, root, (u, t) => {
        trace.opacity = 0.35 + 0.3 * Math.abs(Math.sin(t * 2.4));
        dots.visible = u < 0.98; wall.material.opacity = 0.16 * (1 - u) * (0.8 + 0.2 * Math.sin(t * 3));
        planks.visible = u > 0.02; planks.children.forEach((p, i) => { const k = Math.max(0, Math.min(1, u * 1.8 - i * 0.14)); p.position.y = 0.045 + (1 - k) * 0.7; p.scale.setScalar(Math.max(0.001, k)); });
        sign.sprite.visible = u < 0.5; sign.sprite.position.y = H + 0.46 + Math.sin(t * 2.2) * 0.05;
      });
    }
  }

  // ───────── Reino das Areias: sol, espelhos, selos e portas ─────────
  const mirrors: { it: Item; disc: THREE.Group; cur: number; to: number }[] = [];
  const seals: { j: number; mat: THREE.MeshBasicMaterial; glow: THREE.Sprite; spin: THREE.Group; lit: boolean }[] = [];
  const beamGroup = new THREE.Group();
  let beamKey = '';
  if (m.mech === 'sun') {
    const bronze = std(0xd9a441, 0x7a4a08, 0.7, 0.22, 0.85), sandstone = std(0xcfa968, 0x5a3f14, 0.4, 0.9), dark = std(0x3a2c18, 0x150c02, 0.5, 0.8);
    group.add(beamGroup);
    for (const it of m.items!) {
      const r = itemBase(it);
      if (it.kind === 'mirror') {
        const disc = new THREE.Group(); disc.position.y = BEAM_Y;
        disc.add(mesh(new THREE.BoxGeometry(0.56, 0.3, 0.035), std(0xfff2c4, 0xffd45a, 0.9, 0.05, 0.9), 0, 0, 0, false), mesh(new THREE.BoxGeometry(0.62, 0.035, 0.06), bronze, 0, 0.165, 0, false), mesh(new THREE.BoxGeometry(0.62, 0.035, 0.06), bronze, 0, -0.165, 0, false));
        for (const s of [-1, 1]) disc.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), bronze, s * 0.31, 0, 0, false));
        const tag = label('#ffd45a', 0.3); tag.text('↻'); tag.sprite.position.y = BEAM_Y + 0.38;
        r.add(disc, tag.sprite, ringMesh(0.34, 0.42, 0xffd45a, 1.5, 0.8), mesh(new THREE.CircleGeometry(0.2, 24).rotateX(-Math.PI / 2), bronze, 0, 0.022, 0, false));
        mirrors.push({ it, disc, cur: 0, to: 0 });
      } else {
        const color = PAIR[it.id], spin = new THREE.Group(), sm = neon(color, 0.55), glow = glowSprite(color, 1.1, 0.12);
        spin.position.y = BEAM_Y; glow.position.y = BEAM_Y;
        spin.add(mesh(new THREE.OctahedronGeometry(0.2), sm, 0, 0, 0, false), mesh(new THREE.TorusGeometry(0.29, 0.026, 8, 30), bronze, 0, 0, 0, false));
        r.add(spin, glow, ringMesh(0.34, 0.42, color, 1.7, 0.85));
        seals.push({ j: it.id, mat: sm, glow, spin, lit: false });
      }
    }
    for (const [j, B] of m.beams!.entries()) {
      // a fonte: um obelisco encostado à borda, virado para dentro
      const o = new THREE.Group(), at = cellPos(B.src), back = [[0, 1], [-1, 0], [0, -1], [1, 0]][B.dir];
      o.position.set(at.x + back[0] * 0.78, 0, at.z + back[1] * 0.78);
      o.add(mesh(new THREE.CylinderGeometry(0.11, 0.19, BEAM_Y + 0.08, 4), sandstone, 0, (BEAM_Y + 0.08) / 2, 0), mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), dark, 0, 0.05, 0));
      const sun = glowSprite(PAIR[j], 0.95, 0.9); sun.position.y = BEAM_Y + 0.12; o.add(sun, mesh(new THREE.OctahedronGeometry(0.14), neon(0xffe9a0, 2.4), 0, BEAM_Y + 0.12, 0, false));
      group.add(o);
    }
    for (const g of m.gates!) {
      const root = gateBase(g), color = PAIR[g.id], slab = new THREE.Group();
      slab.add(mesh(new THREE.BoxGeometry(0.96, H + 0.04, 0.22), sandstone, 0, (H + 0.04) / 2, 0));
      for (const z of [-0.118, 0.118]) slab.add(mesh(new THREE.TorusGeometry(0.13, 0.022, 8, 28), neon(color, 1.7), 0, H * 0.55, z, false), mesh(new THREE.SphereGeometry(0.05, 12, 10), neon(color, 2.2), 0, H * 0.55, z, false));
      slab.add(mesh(new THREE.BoxGeometry(0.98, 0.045, 0.26), neon(color, 1.5), 0, H + 0.06, 0, false));
      root.add(slab, mesh(new THREE.BoxGeometry(0.96, 0.012, 0.3), neon(color, 1.3, 0.6), 0, 0.012, 0, false));
      addGate(g, root, (u) => { slab.position.y = -u * (H + 0.1); });
    }
    anims.push((dt, t) => {
      for (const x of mirrors) { x.cur += (x.to - x.cur) * Math.min(1, dt * 10); x.disc.rotation.y = x.cur; x.disc.position.y = BEAM_Y + Math.sin(t * 2 + x.it.id) * 0.02; }
      for (const s of seals) { s.spin.rotation.y = t * (s.lit ? 3 : 0.7); s.glow.material.opacity = s.lit ? 0.75 + 0.2 * Math.sin(t * 8) : 0.12; }
      for (const o of beamGroup.children as THREE.Mesh[]) { const u = o.userData as { k: number }; o.scale.x = o.scale.z = u.k * (1 + 0.16 * Math.sin(t * 13 + o.id)); }
    });
  }
  /** refaz os feixes de luz quando os espelhos mudam */
  const drawBeams = (w: number) => {
    const key = m.beams!.map((_, j) => traceBeam(m, j, w).cells.join('.')).join('|');
    if (key === beamKey) return;
    beamKey = key;
    for (const o of [...beamGroup.children] as THREE.Mesh[]) { beamGroup.remove(o); o.geometry.dispose(); (o.material as THREE.Material).dispose(); }
    const up = new THREE.Vector3(0, 1, 0);
    m.beams!.forEach((B, j) => {
      const { cells, hit } = traceBeam(m, j, w);
      const back = [[0, 1], [-1, 0], [0, -1], [1, 0]][B.dir];
      const pts = [cellPos(B.src).add(new THREE.Vector3(back[0] * 0.78, 0, back[1] * 0.78)), ...cells.map((c) => cellPos(c))];
      const last = cells[cells.length - 1];
      if (!hit) { // sai pela borda: o feixe esmorece meia casa depois
        const before = cells.length > 1 ? cellPos(cells[cells.length - 2]) : pts[0], end = cellPos(last);
        const out = [0, 1, 2, 3].map((d) => neighbor(m, last, d)).length ? end.clone().sub(before).normalize() : end;
        const turned = m.items!.find((it) => it.kind === 'mirror' && it.c === last);
        if (!turned) pts.push(end.clone().addScaledVector(out, 0.6));
      }
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i].clone().setY(BEAM_Y), b = pts[i + 1].clone().setY(BEAM_Y), d = b.clone().sub(a), len = d.length();
        if (len < 0.01) continue;
        for (const [rad, k, op] of [[0.022, 2.6, 1], [0.075, 1.2, 0.28]] as const) {
          const o = mesh(new THREE.CylinderGeometry(rad, rad, len + 0.02, 10, 1, true), new THREE.MeshBasicMaterial({ color: hdr(j ? 0xff9ae6 : 0xffd45a, k), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 0, 0, 0, false);
          o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(up, d.clone().normalize()); o.userData.k = 1; o.renderOrder = 5;
          beamGroup.add(o);
        }
      }
    });
  };

  let first = true;
  return {
    group,
    set(w, cell, instant) {
      const ev: RuleEvent[] = [], snap = instant || first;
      const spark = (c: THREE.Vector3, color: number, n = 18, y = 0.5) => { if (!snap) ev.push({ x: c.x, z: c.z, color, n, y }); };
      for (const o of gates) {
        const g = o.g;
        const open = m.mech === 'size' ? (g.kind === 'crack' ? w === SMALL : w === GIANT)
          : m.mech === 'mounts' ? (g.kind === 'rock' ? smashed(w, g.id) : mountOf(w) === MONKEY)
            : m.mech === 'echo' ? echoOpen(w, g.id)
              : m.mech === 'roots' ? (g.kind === 'moon' ? w <= moonAt(m) : w >= sunAt(m))
                : m.mech === 'stars' ? progressOf(w, g.id) >= starCount(m, g.id)
                  : m.mech === 'sun' ? sealOpen(w, g.id) : false;
        const was = o.open;
        o.open = open ? 1 : 0;
        if (snap) { o.cur = o.open; if (m.mech === 'mounts' && g.kind === 'rock' && open) o.root.visible = false; }
        else if (o.open !== was && (open || m.mech === 'echo' || m.mech === 'roots')) {
          const color = m.mech === 'mounts' ? (g.kind === 'rock' ? 0xcbb79a : BEAST_COLOR.monkey) : m.mech === 'echo' || m.mech === 'sun' ? PAIR[g.id] : m.mech === 'stars' ? STARS[g.id] : g.kind === 'moon' || g.kind === 'low' ? 0x9f8cff : 0xffb63a;
          if (m.mech !== 'size' && !(m.mech === 'mounts' && g.kind === 'branch')) spark(o.at, color, g.kind === 'rock' ? 40 : 16, 0.35);
        }
      }
      for (const f of underfoot) { f.on = f.c === cell; if (snap) f.cur = f.on ? 1 : 0; }
      if (m.mech === 'mounts') {
        const ride = mountOf(w), mine = ride === ELEPHANT ? 'elephant' : ride === MONKEY ? 'monkey' : ride === GAZELLE ? 'gazelle' : '';
        for (const b of beasts) b.a.group.visible = !(b.it.c === cell && b.it.kind === mine); // está debaixo do Uli
      }
      for (const p of plates) {
        const c = echoTimer(w, p.it.id);
        if (c !== p.last) {
          const frac = c === 0 ? 0 : c > ECHO_W ? 1 - (c - ECHO_W) / ECHO_K : c / ECHO_W;
          p.arc.geometry.dispose();
          p.arc.geometry = new THREE.RingGeometry(0.4, 0.5, 40, 1, Math.PI / 2 - Math.max(0.001, frac) * 6.283, Math.max(0.001, frac) * 6.283).rotateX(-Math.PI / 2);
          p.arc.visible = c > 0;
          const text = c === 0 ? '' : c > ECHO_W ? String(c - ECHO_W) : String(c);
          p.tag.text(c > ECHO_W ? text : '');
          doorTags.get(p.it.id)?.text(text);
          if (!snap && c > 0 && (p.last === 0 || c === ECHO_W)) spark(cellPos(p.it.c), PAIR[p.it.id], c === ECHO_W ? 26 : 10, 0.2);
          p.last = c;
        }
      }
      for (const s of strokes) { const on = painted(w, s.k); if (on && !s.on) { spark(cellPos(m.water![s.k]), 0x8a4bea, 14, 0.15); } s.on = on; if (snap) s.cur = on ? 1 : 0; }
      pads.forEach((p, i) => {
        const f = phaseOf(w), want = f * Math.PI;
        if (want !== p.to && !snap) spark(cellPos(m.items![i].c), f ? 0xff2bd6 : 0x27d3ff, 14, 0.3);
        p.to = want; if (snap) p.spin = want;
        p.halves[0].color.copy(hdr(0x27d3ff, f ? 0.5 : 2)); p.halves[1].color.copy(hdr(0xff2bd6, f ? 2 : 0.5));
      });
      for (const s of stars) {
        const lit = progressOf(w, s.it.id) > s.it.k! ? 1 : 0, next = progressOf(w, s.it.id) === s.it.k;
        if (lit && !s.lit) spark(cellPos(s.it.c), STARS[s.it.id], 30, 0.6);
        s.lit = lit ? 1 : next ? -1 : 0;
        s.mat.color.copy(hdr(STARS[s.it.id], lit ? 2.6 : next ? 1.5 : 0.55));
        s.tag.sprite.visible = !lit;
      }
      for (const l of lines) { const on = progressOf(w, l.c) > l.k; l.on = on; if (snap) l.cur = on ? 1 : 0; }
      for (const x of mirrors) {
        // «/» e «\» vistos de cima (X para a direita, Z para baixo)
        x.to = mirrorBit(w, x.it.id) ? -Math.PI / 4 : Math.PI / 4;
        if (snap) x.cur = x.to;
      }
      for (const s of seals) { const lit = sealOpen(w, s.j); if (lit && !s.lit) spark(cellPos(m.items!.find((i) => i.kind === 'seal' && i.id === s.j)!.c), PAIR[s.j], 36, BEAM_Y); s.lit = lit; s.mat.color.copy(hdr(PAIR[s.j], lit ? 2.6 : 0.55)); }
      if (m.mech === 'sun') drawBeams(w);
      first = false;
      return ev;
    },
    update(dt, t) {
      for (const a of anims) a(dt, t);
      for (const o of gates) { o.cur += (o.open - o.cur) * Math.min(1, dt * 7); o.apply(o.cur, t); }
      for (const s of strokes) { s.cur += ((s.on ? 1 : 0) - s.cur) * Math.min(1, dt * 6); s.o.visible = s.cur > 0.02; s.o.scale.setScalar(Math.max(0.001, s.cur)); }
      for (const s of stars) { s.body.rotation.y = t * (s.lit === 1 ? 2.4 : 0.9) + s.it.c; s.body.position.y = 0.52 + Math.sin(t * 2 + s.it.c) * 0.05; const k = s.lit === -1 ? 1.35 + 0.22 * Math.sin(t * 6) : 1; s.body.scale.setScalar(k); s.tag.sprite.scale.setScalar(s.lit === -1 ? 0.68 + 0.08 * Math.sin(t * 6) : 0.46); s.glow.scale.setScalar(s.lit === -1 ? 1.35 : 0.8); s.glow.material.opacity = s.lit === 1 ? 0.85 : s.lit === -1 ? 0.45 + 0.3 * Math.sin(t * 6) : 0.15; }
      for (const l of lines) { l.cur += ((l.on ? 1 : 0) - l.cur) * Math.min(1, dt * 4); l.o.visible = l.cur > 0.02; l.o.scale.y = Math.max(0.001, l.cur * (l.o.userData.len as number)); }
    },
  };
}
