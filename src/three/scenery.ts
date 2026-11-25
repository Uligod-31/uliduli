import * as THREE from 'three';
import { Pal, mix } from '../core/theme';
import { glowSprite, glowTexture, makeCheckerTexture, makeClockTexture, disposeTree } from './common';
import { mulberry32 } from '../core/rng';
import { floorPBR, wallPBR } from './pbr2';

export interface SceneTheme { kind?: string; dali?: boolean; top: number; mid: number; horizon: number; ground: number; ground2: number; sun: number; planet?: boolean; fogNear?: number; fogFar?: number;
  /** luz e grading (Pequenos Pesadelos): cor/intensidades por mundo */
  grade?: number; sunC?: number; sunI?: number; hemiI?: number; rimI?: number; lampI?: number; lampD?: number; expo?: number; dim?: number }

/** Tema do céu/solo de cada mundo (Jardim: crepúsculo dalinesco ouro e verde-azulado). */
export function themeFor(id: string, pal: Pal): SceneTheme {
  const t = themeFor0(id, pal); t.kind = id; return t;
}

function themeFor0(id: string, pal: Pal): SceneTheme {
  // Asteroide B-612: noite fria, névoa verde-ardósia, lua pálida (pesadelo em miniatura)
  if (id === 'b612') return { top: 0x04070a, mid: 0x101c20, horizon: 0x2c3f3e, ground: 0x0a0e10, ground2: 0x060809, sun: 0xcfe6d8, planet: true, fogNear: 14, fogFar: 80, grade: 1, sunC: 0xb9d0c8, sunI: 2.3, hemiI: 1.0, rimI: 1.1, lampI: 2.2, lampD: 9, expo: 1.32 };
  if (id === 'demoniaco') return { top: 0x0a0204, mid: 0x3a0a0c, horizon: 0xe04a16, ground: 0x2a0a08, ground2: 0x120404, sun: 0xff7a3a, fogNear: 40, fogFar: 260, grade: 0.9, sunC: 0xffb890, sunI: 2.4, hemiI: 1.05, rimI: 1.3, lampI: 2.2, lampD: 9, expo: 1.4, dim: 0.5 };
  if (id === 'glaciar') return { top: 0x050c18, mid: 0x143a5a, horizon: 0x88c6e4, ground: 0x6a9cbc, ground2: 0x4a7a9c, sun: 0xe8f6ff, fogNear: 26, fogFar: 190, grade: 0.5, sunC: 0xcfe8ff, sunI: 2.5, hemiI: 1.35, rimI: 1.1, lampI: 1.8, lampD: 9, expo: 1.35, dim: 0.5 };
  if (id === 'relogio') return { top: 0x0d0904, mid: 0x3a2a14, horizon: 0xd8a050, ground: 0x2a2012, ground2: 0x120c06, sun: 0xffc060, fogNear: 22, fogFar: 170, grade: 0.7, sunC: 0xffd090, sunI: 2.5, hemiI: 1.15, rimI: 1.2, lampI: 2.0, lampD: 9, expo: 1.38, dim: 0.5 };
  if (id === 'biblioteca') return { top: 0x070403, mid: 0x241408, horizon: 0x8a5a2a, ground: 0x1c120a, ground2: 0x0c0804, sun: 0xffc880, fogNear: 18, fogFar: 150, grade: 0.8, sunC: 0xffd8a0, sunI: 2.3, hemiI: 1.15, rimI: 1.0, lampI: 2.2, lampD: 9, expo: 1.4, dim: 0.5 };
  if (id === 'elfico') return { top: 0x030a06, mid: 0x0c2414, horizon: 0x3a5c28, ground: 0x142210, ground2: 0x0a1408, sun: 0xffe6a0, fogNear: 16, fogFar: 150, grade: 0.85, sunC: 0xffe2a0, sunI: 2.5, hemiI: 1.7, rimI: 1.3, lampI: 2.2, lampD: 9, expo: 1.55, dim: 0.5 };
  if (id === 'viking') return { top: 0x050914, mid: 0x16223a, horizon: 0x44546e, ground: 0x0e1c34, ground2: 0x08101e, sun: 0xffb070, fogNear: 22, fogFar: 180, grade: 0.7, sunC: 0xffc8a0, sunI: 2.7, hemiI: 1.8, rimI: 1.3, lampI: 2.0, lampD: 9, expo: 1.55, dim: 0.5 };
  if (id === 'egipto') return { top: 0x070518, mid: 0x3a1f58, horizon: 0xf2a152, ground: 0x45331c, ground2: 0x2a1d0e, sun: 0xffc060, fogNear: 70, fogFar: 520, grade: 0.55, sunC: 0xffd49a, sunI: 2.7, hemiI: 1.3, rimI: 1.2, lampI: 2.0, lampD: 9, expo: 1.42, dim: 0.5 };
  if (id === 'mandala') return { top: 0x1a0a04, mid: 0x5a2a0c, horizon: 0xffb04a, ground: 0x6a3a10, ground2: 0x3a1c06, sun: 0xffd070, fogNear: 60, fogFar: 480, grade: 0.5, sunC: 0xffe0a0, sunI: 2.6, hemiI: 1.3, rimI: 1.2, lampI: 2.0, lampD: 9, expo: 1.4, dim: 0.5 };
  if (id === 'tinta') return { top: 0x020812, mid: 0x08234a, horizon: 0x1a6aa8, ground: 0x061a34, ground2: 0x030c1c, sun: 0x80e8ff, fogNear: 14, fogFar: 150, grade: 0.7, sunC: 0x9ad8ff, sunI: 2.3, hemiI: 1.25, rimI: 1.2, lampI: 2.2, lampD: 9, expo: 1.4, dim: 0.5 };
  if (id === 'neon') return { top: 0x08040f, mid: 0x2a0a4a, horizon: 0xff2bd6, ground: 0x120a24, ground2: 0x08040f, sun: 0x27d3ff, fogNear: 40, fogFar: 380, grade: 0.4, sunC: 0xff9aea, sunI: 2.4, hemiI: 1.2, rimI: 1.4, lampI: 2.0, lampD: 9, expo: 1.42, dim: 0.5 };
  if (id === 'galactico') return { top: 0x02030a, mid: 0x140a3a, horizon: 0x3a2a9a, ground: 0x0a0c24, ground2: 0x04050f, sun: 0x39f2d0, fogNear: 60, fogFar: 600, grade: 0.4, sunC: 0xa0c8ff, sunI: 2.4, hemiI: 1.2, rimI: 1.3, lampI: 2.0, lampD: 9, expo: 1.4, dim: 0.5 };
  if (id === 'estelar') return { top: 0x03051a, mid: 0x0e1a52, horizon: 0x3a4aa0, ground: 0x0a1030, ground2: 0x050818, sun: 0xffe08a, fogNear: 60, fogFar: 560, grade: 0.4, sunC: 0xffe8b0, sunI: 2.4, hemiI: 1.25, rimI: 1.2, lampI: 2.0, lampD: 9, expo: 1.4, dim: 0.5 };
  if (id === 'angelico') return { top: 0x6a88d0, mid: 0xb8c8f0, horizon: 0xfff0d0, ground: 0xe8e0f0, ground2: 0xc8c0e0, sun: 0xffffff, fogNear: 50, fogFar: 360, grade: 0.1, sunC: 0xfff4d8, sunI: 2.5, hemiI: 1.5, rimI: 0.9, lampI: 1.0, lampD: 7, expo: 0.92, dim: 0.9 };
  if (id === 'animal') return { top: 0x1a1a3a, mid: 0xa04a2a, horizon: 0xffb050, ground: 0x8a6a2a, ground2: 0x5a4418, sun: 0xffc060, fogNear: 60, fogFar: 480, grade: 0.45, sunC: 0xffd49a, sunI: 2.6, hemiI: 1.3, rimI: 1.2, lampI: 2.0, lampD: 9, expo: 1.4, dim: 0.5 };
  if (id === 'rockstar') return { top: 0x040208, mid: 0x1a0a2a, horizon: 0x6a0a4a, ground: 0x0a0810, ground2: 0x050408, sun: 0xff2b8a, fogNear: 30, fogFar: 300, grade: 0.5, sunC: 0xff9ac8, sunI: 2.3, hemiI: 1.1, rimI: 1.5, lampI: 2.0, lampD: 9, expo: 1.45, dim: 0.5 };
  // Jardim Sebe: entardecer doente, névoa verde-oliva, sebes apodrecidas e um sol pálido a morrer
  if (id === 'jardim') return { dali: true, top: 0x040604, mid: 0x1a281c, horizon: 0x56613f, ground: 0x1b2014, ground2: 0x0c0f09, sun: 0xd9cf94, fogNear: 16, fogFar: 150, grade: 0.9, sunC: 0xd6cc9c, sunI: 2.7, hemiI: 1.2, rimI: 1.2, lampI: 2.2, lampD: 9, expo: 1.4, dim: 0.5 };
  return {
    top: mix(pal.bgBot, 0x000000, 0.2), mid: mix(pal.bgTop, pal.accent, 0.35), horizon: mix(pal.accent, 0xffffff, 0.25),
    ground: mix(pal.floorA, pal.accent, 0.3), ground2: mix(pal.floorB, pal.bgBot, 0.4), sun: mix(pal.accent, 0xffffff, 0.5),
    fogNear: 30, fogFar: 260, grade: 0.55, sunI: 2.0, hemiI: 0.85, rimI: 1.1, lampI: 1.0, lampD: 6, expo: 1.3, dim: 0.7,
  };
}

const SKY_V = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const SKY_F = `
varying vec3 vDir; uniform vec3 top, mid, hor, sunCol, sunDir; uniform float dark;
void main(){
  float h = vDir.y;
  vec3 c = mix(hor, mid, smoothstep(0.0, 0.32, h));
  c = mix(c, top, smoothstep(0.25, 0.95, h));
  float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
  c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 40.0) * 0.55 + pow(s, 6.0) * 0.18);
  c += 0.012 * sin(h * 90.0);
  c = mix(c, hor * 0.55, smoothstep(0.0, -0.25, h));
  gl_FragColor = vec4(c * dark, 1.0);
}`;

const CLOCK_V = `
uniform float time; uniform float droop; uniform float size; varying vec2 vUv;
void main(){ vUv = uv; vec3 p = position;
  float s = uv.x - 0.5;
  float edge = s*s*4.0;
  p.y -= size * droop * (0.1 + 0.55*edge*edge) + size*0.012*sin(time*1.1 + s*9.0);
  p.z += size*0.03*sin(time*0.9 + uv.y*8.0);
  gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;
const CLOCK_F = `
uniform sampler2D map; uniform float dark; varying vec2 vUv;
void main(){ vec4 t = texture2D(map, vUv); if(t.a < 0.5) discard; gl_FragColor = vec4(t.rgb * dark, 1.0); }`;

export class Scenery {
  group = new THREE.Group();
  sky: THREE.Mesh;
  skyMat: THREE.ShaderMaterial;
  ground!: THREE.Mesh;
  clocks: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; rot: number; base: THREE.Vector3; phase: number }[] = [];
  elephants: { g: THREE.Group; legs: THREE.Object3D[]; ang: number; speed: number; r: number; shadow: THREE.Mesh }[] = [];
  clouds: THREE.Sprite[] = [];
  motes!: THREE.Points;
  islandShadow!: THREE.Mesh;
  cubes: THREE.Mesh[] = [];
  readonly groundY = -34;
  sunDir = new THREE.Vector3(0.35, 0.16, -1).normalize();
  private tex: THREE.Texture[] = [];
  stars?: THREE.Points;
  private worldAnim: ((t: number) => void)[] = [];
  mist = new THREE.Group();
  private dimBase = 1;
  private groundTint?: THREE.Color;
  rocks: { g: THREE.Group; base: THREE.Vector3; ph: number }[] = [];

  constructor(theme: SceneTheme, islandR: number, accent: number, hx: number, hz: number) {
    const rng = mulberry32(7);
    const c = (x: number) => new THREE.Color(x);
    this.dimBase = theme.dim ?? 1;
    this.group.add(this.mist);
    // bruma baixa a rodear a ilha (profundidade e ameaça)
    {
      const mm = (col: number) => new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: theme.planet ? 0.16 : 0.2, depthWrite: false, fog: false });
      for (let i = 0; i < 16; i++) {
        const sp = new THREE.Sprite(mm(mix(theme.horizon, 0xffffff, 0.1)));
        const a = (i / 16) * Math.PI * 2 + rng(), d = islandR * (0.9 + rng() * 0.9) + 2;
        sp.position.set(Math.cos(a) * d, -1.2 - rng() * 2.5, Math.sin(a) * d);
        sp.scale.set(14 + rng() * 14, 3 + rng() * 3, 1);
        this.mist.add(sp);
      }
    }

    // céu
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: c(theme.top) }, mid: { value: c(theme.mid) }, hor: { value: c(theme.horizon) }, sunCol: { value: c(theme.sun) }, sunDir: { value: this.sunDir }, dark: { value: 1 } },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), this.skyMat);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.group.add(this.sky);

    if (theme.planet) {
      this.buildPlanet(theme, islandR, accent, rng);
      return;
    }

    // plano de xadrez a fugir para o horizonte
    const chk = makeCheckerTexture('#' + c(theme.ground).getHexString(), '#' + c(theme.ground2).getHexString(), 8);
    chk.repeat.set(36, 36);
    this.tex.push(chk);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.95, metalness: 0 }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.position.y = this.groundY;
    this.ground.receiveShadow = false;
    this.group.add(this.ground);

    this.buildWorld(theme, islandR, rng);

    // formações rochosas ao longe (Cap de Creus)
    const rockM = new THREE.MeshStandardMaterial({ color: mix(theme.ground2, 0x000000, 0.55), roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = rng() * Math.PI * 2, d = 520 + rng() * 380;
      const g = new THREE.IcosahedronGeometry(1, 1);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (1 + rng() * 0.4), p.getY(k) * (1 + rng() * 0.7), p.getZ(k) * (1 + rng() * 0.4));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, rockM);
      m.scale.set(60 + rng() * 90, 30 + rng() * 120, 60 + rng() * 90);
      m.position.set(Math.cos(a) * d, this.groundY + 10, Math.sin(a) * d);
      this.group.add(m);
    }

    if (theme.dali) {
    // relógios moles
    const clockTex = makeClockTexture(); this.tex.push(clockTex);
    // relógios moles "pendurados" nas bordas da ilha e a flutuar à volta
    const spots: [number, number, number, number][] = [
      [-hx - 1.0, 0.2, hz * 0.15, 3.4], [hx + 1.3, 0.5, -hz * 0.35, 2.8], [hx * 0.2, 7, -hz - 6, 7],
      [-hx - 10, 10, -hz * 0.6, 8], [hx + 14, 16, hz * 0.2, 10],
    ];
    spots.forEach(([x, y, z, s], k) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: CLOCK_V, fragmentShader: CLOCK_F, side: THREE.DoubleSide,
        uniforms: { map: { value: clockTex }, time: { value: 0 }, size: { value: s }, droop: { value: 0.32 + (k % 3) * 0.12 }, dark: { value: this.dimBase } },
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s, s, 28, 28), mat);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      this.clocks.push({ mesh, mat, rot: (rng() - 0.5) * 0.3, base: mesh.position.clone(), phase: rng() * 6 });
    });

    // elefantes de pernas finíssimas (Dalí)
    for (let i = 0; i < 4; i++) {
      const e = this.makeElephant(theme);
      const r = islandR + 20 + i * 16;
      const ang = (i / 4) * Math.PI * 2 + 0.9;
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(14, 120), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = this.groundY + 0.2;
      this.group.add(e.g, shadow);
      this.elephants.push({ ...e, ang, speed: 0.004 + i * 0.0012, r, shadow });
    }

    }

    if (theme.dali) {
      // árvores mortas e retorcidas ao longe, a recortar o céu
      const bark = new THREE.MeshStandardMaterial({ color: mix(theme.ground2, 0x000000, 0.5), roughness: 1, flatShading: true });
      const limb = (g: THREE.Group, x: number, y: number, z: number, ax: number, az: number, len: number, rad: number, depth: number) => {
        if (depth <= 0 || rad < 0.25) return;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.62, rad, len, 5), bark);
        m.position.set(x, y, z); m.position.add(new THREE.Vector3(0, len / 2, 0).applyEuler(new THREE.Euler(ax, 0, az))); m.rotation.set(ax, 0, az); g.add(m);
        const tip = new THREE.Vector3(x, y, z).add(new THREE.Vector3(0, len, 0).applyEuler(new THREE.Euler(ax, 0, az)));
        for (let k = 0; k < 2; k++) limb(g, tip.x, tip.y, tip.z, ax + (rng() - 0.5) * 1.3, az + (rng() - 0.5) * 1.5, len * 0.72, rad * 0.62, depth - 1);
      };
      for (let i = 0; i < 16; i++) {
        const g = new THREE.Group(), a = rng() * Math.PI * 2, d = 180 + rng() * 360;
        limb(g, 0, 0, 0, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3, 38 + rng() * 40, 3.2 + rng() * 2, 5);
        g.position.set(Math.cos(a) * d, this.groundY, Math.sin(a) * d); this.group.add(g);
      }
      // peças de xadrez colossais (Dalí): torre, peão e rei de pernas finas
      const lathe = (pts: [number, number][], mat: THREE.Material) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 20), mat);
      const stone = new THREE.MeshStandardMaterial({ color: mix(theme.ground, 0x9a948a, 0.35), roughness: 0.8 });
      const pieces: [number, number][][] = [
        [[0, 0], [10, 0], [10, 3], [6, 5], [6, 30], [9, 33], [9, 38], [11, 38], [11, 44], [9, 44], [9, 41], [0, 41]],
        [[0, 0], [9, 0], [9, 3], [5, 6], [3.5, 22], [7, 24], [4.5, 26], [8, 28], [7, 36], [0, 44]],
        [[0, 0], [8, 0], [8, 3], [4, 5], [3, 34], [6, 37], [3, 40], [4, 46], [0, 50]],
      ];
      for (let i = 0; i < 7; i++) {
        const prof = pieces[i % 3], m = lathe(prof, stone), a = (i / 7) * Math.PI * 2 + 0.4, d = 330 + (i % 3) * 70, s2 = 1.6 + (i % 3) * 0.6;
        m.scale.setScalar(s2); m.position.set(Math.cos(a) * d, this.groundY, Math.sin(a) * d); m.rotation.z = (rng() - 0.5) * 0.12; this.group.add(m);
      }
      // bando de corvos em círculo
      const cn = 70, cp = new Float32Array(cn * 3);
      for (let i = 0; i < cn; i++) { const a = rng() * Math.PI * 2, d = 120 + rng() * 140; cp[i * 3] = Math.cos(a) * d; cp[i * 3 + 1] = 70 + rng() * 60; cp[i * 3 + 2] = Math.sin(a) * d; }
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3));
      const flock = new THREE.Points(cg, new THREE.PointsMaterial({ color: 0x02030a, size: 3.2, sizeAttenuation: true, transparent: true, opacity: 0.9, fog: false }));
      this.group.add(flock); this.worldAnim.push((t) => { flock.rotation.y = t * 0.03; });
    }

    // sombra suave da ilha no chão
    this.islandShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    this.islandShadow.rotation.x = -Math.PI / 2; this.islandShadow.position.y = this.groundY + 0.15;
    this.islandShadow.scale.setScalar(islandR * 3.2);
    this.group.add(this.islandShadow);

    if (theme.dali) {
    // cubos de xadrez flutuantes
    const ctex = makeCheckerTexture('#f4efe6', '#1a1a22', 4); this.tex.push(ctex);
    for (let i = 0; i < 4; i++) {
      const s = 2 + rng() * 3.2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({ map: ctex, roughness: 0.35, metalness: 0.2 }));
      const a = rng() * Math.PI * 2, d = islandR + 14 + rng() * 26;
      m.position.set(Math.cos(a) * d, -6 + rng() * 26, Math.sin(a) * d - 12);
      this.group.add(m); this.cubes.push(m);
    }

    }

    // nuvens quentes
    const cm = (col: number) => new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: 0.38, depthWrite: false, fog: false });
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(cm(i % 3 ? mix(theme.horizon, 0xffffff, 0.3) : mix(theme.mid, 0xffffff, 0.2)));
      const a = rng() * Math.PI * 2, d = 260 + rng() * 700;
      s.position.set(Math.cos(a) * d, 25 + rng() * 150, Math.sin(a) * d);
      s.scale.set(180 + rng() * 280, 30 + rng() * 40, 1);
      this.group.add(s); this.clouds.push(s);
    }

    // pó luminoso
    const N = 260, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (rng() - 0.5) * (islandR * 2 + 30); pos[i * 3 + 1] = -4 + rng() * 26; pos[i * 3 + 2] = (rng() - 0.5) * (islandR * 2 + 30); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pm = new THREE.PointsMaterial({ map: glowTexture(), color: new THREE.Color(accent).lerp(new THREE.Color(0xffe0a0), 0.5).multiplyScalar(1.6), size: 0.35, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.motes = new THREE.Points(pg, pm);
    this.group.add(this.motes);
  }

  /** Céu do asteroide: estrelas, lua, névoa baixa, pequenos asteroides com adultos ridículos e pirilampos. */
  /** Chão e cenografia de cada mundo: lava, gelo e aurora, engrenagens gigantes, torres de estantes. */
  private buildWorld(theme: SceneTheme, islandR: number, rng: () => number) {
    const kind = theme.kind;
    const pillarFx: [number, number, number, number, number][] = [];
    const gm = this.ground.material as THREE.MeshStandardMaterial;
    const mk = (n: number, draw: (g: CanvasRenderingContext2D) => void, rep: number) => {
      const c = document.createElement('canvas'); c.width = c.height = n; draw(c.getContext('2d')!);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; this.tex.push(t); return t;
    };
    const glow = (col: number, size: number, op: number) => new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const ring = (n: number, r0: number, r1: number, f: (a: number, d: number, i: number) => void) => { for (let i = 0; i < n; i++) f(rng() * Math.PI * 2, r0 + rng() * (r1 - r0), i); };
    const gear = (r: number, teeth: number, mat: THREE.Material) => {
      const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.1, 8, 48), mat));
      for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2, t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.24, r * 0.3, r * 0.16), mat); t.position.set(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1, 0); t.rotation.z = a; g.add(t); }
      for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 2, r * 0.08, r * 0.1), mat); sp.rotation.z = (i / 4) * Math.PI; g.add(sp); }
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, r * 0.2, 14).rotateX(Math.PI / 2), mat));
      return g;
    };

    if (kind === 'demoniaco') {
      gm.map = mk(512, (g) => { g.fillStyle = '#1a0a0a'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${22 + (rng() * 16) | 0},8,8,.55)`; g.beginPath(); g.ellipse(rng() * 512, rng() * 512, 20 + rng() * 60, 14 + rng() * 40, rng() * 3, 0, 6.28); g.fill(); } for (let i = 0; i < 18; i++) { let x = rng() * 512, y = rng() * 512; const pts: [number, number][] = [[x, y]]; for (let k = 0; k < 9; k++) { x += (rng() - 0.5) * 80; y += (rng() - 0.5) * 80; pts.push([x, y]); } for (const [w, col] of [[18, 'rgba(255,80,20,.28)'], [6, '#ff7a22'], [2.2, '#ffd27a']] as const) { g.strokeStyle = col; g.lineWidth = w; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.beginPath(); pts.forEach(([px, py], j) => (j ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy))); g.stroke(); } } } }, 70);
      gm.emissiveMap = gm.map; gm.emissive = new THREE.Color(0xffffff); gm.emissiveIntensity = 0.5; gm.color.set(0x3a3030); gm.roughness = 0.7;
      this.worldAnim.push((t) => { gm.emissiveIntensity = 0.5 + 0.12 * Math.sin(t * 0.8) + 0.05 * Math.sin(t * 2.3); });
      const rock = new THREE.MeshStandardMaterial({ color: 0x1a1214, roughness: 1, flatShading: true });
      ring(18, 240, 560, (a, d) => { const h = 50 + rng() * 130, r = 12 + rng() * 22, c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), rock); c.position.set(Math.cos(a) * d, this.groundY + h / 2, Math.sin(a) * d); this.group.add(c); const gl = glow(0xff5a1a, 1, 0.5); gl.scale.set(r * 5, r * 3, 1); gl.position.set(c.position.x, this.groundY + 6, c.position.z); this.group.add(gl); });
      const vol = new THREE.Mesh(new THREE.ConeGeometry(190, 260, 14, 1, true), rock); vol.position.set(-260, this.groundY + 130, -760); this.group.add(vol);
      const cr = glow(0xff6a20, 1, 0.9); cr.scale.set(240, 120, 1); cr.position.set(-260, this.groundY + 262, -760); this.group.add(cr);
      for (let i = 0; i < 6; i++) { const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x3a2828, transparent: true, opacity: 0.4, depthWrite: false, fog: false })); sm.scale.set(160 + i * 50, 120 + i * 30, 1); sm.position.set(-260 + i * 25, this.groundY + 300 + i * 90, -760); this.group.add(sm); this.clouds.push(sm); }
    } else if (kind === 'glaciar') {
      gm.map = mk(512, (g) => { g.fillStyle = '#5a8cae'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 70; i++) { g.fillStyle = rng() < 0.5 ? 'rgba(220,240,255,.22)' : 'rgba(30,70,120,.25)'; g.beginPath(); g.ellipse(rng() * 512, rng() * 512, 20 + rng() * 80, 10 + rng() * 40, rng() * 3, 0, 6.28); g.fill(); } for (let i = 0; i < 26; i++) { let x = rng() * 512, y = rng() * 512; const pts: [number, number][] = [[x, y]]; for (let k = 0; k < 7; k++) { x += (rng() - 0.5) * 90; y += (rng() - 0.5) * 90; pts.push([x, y]); } for (const [w, col] of [[5, 'rgba(15,40,80,.35)'], [1.8, 'rgba(225,245,255,.8)']] as const) { g.strokeStyle = col; g.lineWidth = w; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.beginPath(); pts.forEach(([px, py], j) => (j ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy))); g.stroke(); } } } }, 70);
      gm.color.set(0xffffff); gm.roughness = 0.35; gm.envMapIntensity = 1.5;
      const ice = new THREE.MeshPhysicalMaterial({ color: 0xbfe3f5, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.88, emissive: 0x2a5a8a, emissiveIntensity: 0.35, flatShading: true });
      ring(20, 220, 560, (a, d) => { const h = 40 + rng() * 120, r = 8 + rng() * 20, c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), ice); c.position.set(Math.cos(a) * d, this.groundY + h / 2, Math.sin(a) * d); c.rotation.z = (rng() - 0.5) * 0.25; this.group.add(c); });
      // aurora: faixas verdes, ciano e violeta a ondular no céu
      for (let k = 0; k < 3; k++) {
        const am = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
          uniforms: { time: { value: 0 }, off: { value: k * 1.7 } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader: `varying vec2 vUv; uniform float time, off;
            void main(){
              float w = sin(vUv.x * 7.0 + time * 0.25 + off + sin(vUv.y * 4.0 + time * 0.2) * 1.4);
              float band = smoothstep(0.1, 0.55, vUv.y) * (1.0 - smoothstep(0.62, 1.0, vUv.y));
              float a = band * (0.35 + 0.65 * (0.5 + 0.5 * w)) * (1.0 - abs(vUv.x - 0.5) * 1.3);
              vec3 c = mix(vec3(0.15, 1.0, 0.55), vec3(0.55, 0.3, 1.0), smoothstep(0.35, 0.95, vUv.y + 0.2 * sin(vUv.x * 5.0 + off)));
              gl_FragColor = vec4(c, a * 0.34);
            }` });
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(1100, 300), am); pl.position.set(-160 + k * 170, 230 + k * 18, -520 - k * 60); pl.rotation.y = 0.2 - k * 0.15; pl.renderOrder = -6; this.group.add(pl);
        this.worldAnim.push((t) => { am.uniforms.time.value = t; });
      }
    } else if (kind === 'relogio') {
      const fm = floorPBR('metal').map; gm.map = fm; fm.repeat.set(110, 110); gm.color.set(0x7a6a4c); gm.roughness = 0.45; gm.metalness = 0.5;
      const brass = new THREE.MeshStandardMaterial({ color: 0x8a6a2c, roughness: 0.4, metalness: 0.85, emissive: 0x3a2506, emissiveIntensity: 0.5, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.3, d = 300 + (i % 3) * 90, r = 28 + (i % 4) * 14, g = gear(r, 12 + (i % 4) * 3, brass);
        g.position.set(Math.cos(a) * d, 30 + (i % 3) * 40, Math.sin(a) * d); g.lookAt(0, 30, 0); this.group.add(g);
        const dir = i % 2 ? 1 : -1; this.worldAnim.push((t) => { g.rotateZ(dir * 0.0006 * (30 / r) * 12); void t; });
      }
      const ct = makeClockTexture(); this.tex.push(ct);
      const moon = new THREE.Mesh(new THREE.CircleGeometry(150, 48), new THREE.MeshBasicMaterial({ map: ct, transparent: true, alphaTest: 0.4, fog: false, toneMapped: false })); moon.position.set(120, 240, -700); this.group.add(moon);
      ring(8, 200, 460, (a, d) => { const h = 80 + rng() * 120, c = new THREE.Mesh(new THREE.CylinderGeometry(7, 10, h, 10), new THREE.MeshStandardMaterial({ color: 0x2a2014, roughness: 0.6, metalness: 0.5 })); c.position.set(Math.cos(a) * d, this.groundY + h / 2, Math.sin(a) * d); this.group.add(c); const sm = glow(0xcfc8b8, 1, 0.3); sm.scale.set(60, 60, 1); sm.position.set(c.position.x, this.groundY + h + 20, c.position.z); this.group.add(sm); });
    } else if (kind === 'biblioteca') {
      const wm = floorPBR('wood').map; gm.map = wm; wm.repeat.set(110, 110); gm.color.set(0xb8a898); gm.roughness = 0.7;
      const sm0 = wallPBR('shelves').map;
      ring(14, 190, 440, (a, dd) => { const h = 120 + rng() * 140; const t = sm0.clone(); t.needsUpdate = true; t.repeat.set(4, 10); this.tex.push(t); const b = new THREE.Mesh(new THREE.BoxGeometry(36, h, 36), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); b.position.set(Math.cos(a) * dd, this.groundY + h / 2, Math.sin(a) * dd); b.rotation.y = a; this.group.add(b); for (let k = 0; k < 3; k++) { const w = glow(0xffb860, 1, 0.55); w.scale.set(16, 22, 1); w.position.set(b.position.x, this.groundY + h * (0.35 + k * 0.2), b.position.z); this.group.add(w); } });
      const lamp = glow(0xffc880, 1, 0.5); lamp.scale.set(260, 260, 1); lamp.position.set(0, 160, -600); this.group.add(lamp);
    } else if (kind === 'elfico') {
      gm.map = mk(512, (g) => {
        g.fillStyle = '#1a2a12'; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 90; i++) { g.fillStyle = rng() < 0.5 ? 'rgba(70,120,40,.3)' : 'rgba(6,16,6,.4)'; g.beginPath(); g.ellipse(rng() * 512, rng() * 512, 14 + rng() * 60, 8 + rng() * 34, rng() * 3, 0, 6.28); g.fill(); }
        for (let i = 0; i < 14; i++) { let x = rng() * 512, y = rng() * 512; const pts: [number, number][] = [[x, y]]; for (let k = 0; k < 8; k++) { x += (rng() - 0.5) * 90; y += (rng() - 0.5) * 90; pts.push([x, y]); } for (const [w, col] of [[10, 'rgba(10,6,2,.55)'], [4, '#4a3622']] as const) { g.strokeStyle = col; g.lineWidth = w; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.beginPath(); pts.forEach(([px, py], j) => (j ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy))); g.stroke(); } } }
        for (let i = 0; i < 70; i++) { const x = rng() * 512, y = rng() * 512, gr = g.createRadialGradient(x, y, 0, x, y, 7); gr.addColorStop(0, rng() < 0.5 ? 'rgba(255,236,150,.95)' : 'rgba(180,255,150,.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 7, 0, 6.28); g.fill(); }
      }, 80);
      gm.color.set(0xffffff); gm.roughness = 0.95; gm.emissiveMap = gm.map; gm.emissive = new THREE.Color(0x335522); gm.emissiveIntensity = 0.2;
      const bt = wallPBR('bark').map;
      const trunkM = new THREE.MeshStandardMaterial({ roughness: 1, color: 0x8a7a68 });
      ring(26, 190, 560, (a, d) => {
        const h = 160 + rng() * 220, r = 9 + rng() * 11, t = bt.clone(); t.needsUpdate = true; t.repeat.set(3, h / 50); this.tex.push(t);
        const m = trunkM.clone(); m.map = t;
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, h, 11), m); tr.position.set(Math.cos(a) * d, this.groundY + h / 2, Math.sin(a) * d); this.group.add(tr);
        for (let k = 0; k < 5; k++) { const ra = k * 1.26 + rng(), rt = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, r * 2.6, 5), m); rt.position.set(tr.position.x + Math.cos(ra) * r * 0.9, this.groundY + r * 0.9, tr.position.z + Math.sin(ra) * r * 0.9); rt.rotation.set(Math.sin(ra) * 0.8, 0, -Math.cos(ra) * 0.8); this.group.add(rt); }
        const cn = glow(0x0e2a14, 1, 0.92); cn.scale.set(r * 14, r * 7, 1); cn.position.set(tr.position.x, this.groundY + h, tr.position.z); this.group.add(cn);
        const cg = glow(0xb8f070, 1, 0.16); cg.scale.set(r * 9, r * 4, 1); cg.position.set(tr.position.x, this.groundY + h * 0.96, tr.position.z); this.group.add(cg);
      });
      for (let i = 0; i < 8; i++) { const a = rng() * Math.PI * 2, d = 120 + rng() * 340, sh = glow(0xffe9a0, 1, 0.075); sh.scale.set(18 + rng() * 22, 300, 1); sh.position.set(Math.cos(a) * d, this.groundY + 130, Math.sin(a) * d); this.group.add(sh); this.worldAnim.push((t) => { (sh.material as THREE.SpriteMaterial).opacity = 0.06 + 0.03 * Math.sin(t * 0.4 + i * 1.7); }); }
      const moon = glow(0xe8ffd0, 1, 0.55); moon.scale.set(190, 190, 1); moon.position.set(160, 260, -720); this.group.add(moon);
      ring(34, 120, 420, (a, d) => { const g = new THREE.Group(), sz = 2 + rng() * 5; for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.SphereGeometry(sz * (0.5 + k * 0.2), 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(k % 2 ? 0x7be8c0 : 0xffd870).multiplyScalar(2), toneMapped: false })); c.scale.y = 0.62; c.position.set((k - 1) * sz * 0.9, 0, k * 0.4); g.add(c); } const gl = glow(0x80f0c0, sz * 9, 0.4); gl.position.y = sz * 0.5; g.add(gl); g.position.set(Math.cos(a) * d, this.groundY + 1, Math.sin(a) * d); this.group.add(g); });
    } else if (kind === 'viking') {
      gm.map = mk(512, (g) => {
        g.fillStyle = '#0f1e34'; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 520; i++) { const y = rng() * 512, x = rng() * 512, w = 20 + rng() * 80; g.strokeStyle = rng() < 0.82 ? `rgba(70,120,170,${0.1 + rng() * 0.22})` : `rgba(230,244,255,${0.18 + rng() * 0.3})`; g.lineWidth = 1 + rng() * 1.6; for (const ox of [-512, 0, 512]) { g.beginPath(); g.moveTo(x + ox, y); g.quadraticCurveTo(x + ox + w / 2, y - 3 - rng() * 4, x + ox + w, y); g.stroke(); } }
      }, 90);
      gm.color.set(0xffffff); gm.roughness = 0.22; gm.metalness = 0.25; gm.envMapIntensity = 1.4;
      const slate = new THREE.MeshStandardMaterial({ color: 0x1d2735, roughness: 0.95, flatShading: true }), snowM = new THREE.MeshStandardMaterial({ color: 0xe6eef6, roughness: 0.9, flatShading: true });
      ring(15, 230, 600, (a, d) => {
        const h = 100 + rng() * 220, r = 40 + rng() * 60, c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6 + ((rng() * 3) | 0)), slate); c.position.set(Math.cos(a) * d, this.groundY + h / 2, Math.sin(a) * d); c.rotation.y = rng() * 3; this.group.add(c);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.36, h * 0.3, 7), snowM); cap.position.set(c.position.x, this.groundY + h * 0.86, c.position.z); this.group.add(cap);
        if (rng() < 0.45) { const bf = glow(0xff7a2a, 1, 0.8); bf.scale.set(26, 34, 1); bf.position.set(c.position.x + r * 0.15, this.groundY + h * 0.97, c.position.z); this.group.add(bf); this.worldAnim.push((t) => { (bf.material as THREE.SpriteMaterial).opacity = 0.65 + 0.2 * Math.sin(t * 7 + a * 5) + 0.1 * Math.sin(t * 13 + a); }); }
      });
      const pineM = new THREE.MeshStandardMaterial({ color: 0x0f1c18, roughness: 1, flatShading: true });
      ring(46, 120, 430, (a, d) => { const g = new THREE.Group(), h = 26 + rng() * 40; for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.3 - k * 0.055), h * 0.45, 7), pineM); c.position.y = h * (0.26 + k * 0.2); g.add(c); const sn = new THREE.Mesh(new THREE.ConeGeometry(h * (0.2 - k * 0.04), h * 0.16, 7), snowM); sn.position.y = h * (0.4 + k * 0.2); g.add(sn); } g.position.set(Math.cos(a) * d, this.groundY, Math.sin(a) * d); this.group.add(g); });
      // drácares ao largo: casco, proa de dragão, mastro e vela
      const hullM = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.85 });
      const sailTex = mk(128, (g) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#a82a1a' : '#e8dcc0'; g.fillRect(i * 16, 0, 16, 128); } g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 128, 6); g.fillRect(0, 122, 128, 6); }, 1);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + 0.6, d = 130 + (i % 3) * 70, ship = new THREE.Group();
        const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), hullM); hull.scale.set(11, 3.4, 3.2); hull.position.y = 2.2; ship.add(hull);
        for (const sd of [-1, 1]) { const pr = new THREE.Mesh(new THREE.ConeGeometry(0.7, 6.5, 6), hullM); pr.position.set(sd * 10.4, 4.6, 0); pr.rotation.z = -sd * 0.55; ship.add(pr); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), hullM); hd.position.set(sd * 12.3, 7.6, 0); ship.add(hd); }
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 17, 6), hullM); mast.position.y = 10; ship.add(mast);
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshStandardMaterial({ map: sailTex, side: THREE.DoubleSide, roughness: 0.9, emissive: 0x2a1008, emissiveIntensity: 0.4 })); sail.position.y = 11.5; ship.add(sail);
        for (let k = 0; k < 8; k++) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.15, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: [0xa82a1a, 0xc9a13a, 0x2a4a6a, 0x8a8a90][k % 4], roughness: 0.7 })); sh.position.set(-8 + k * 2.3, 4.2, 3.0); ship.add(sh); }
        const lamp2 = glow(0xff9a50, 1, 0.8); lamp2.scale.set(9, 9, 1); lamp2.position.set(0, 4.6, 0); ship.add(lamp2);
        ship.position.set(Math.cos(a) * d, this.groundY + 0.5, Math.sin(a) * d); ship.rotation.y = a + 1.2; this.group.add(ship);
        const ph = rng() * 6; this.worldAnim.push((t) => { ship.position.y = this.groundY + 0.5 + Math.sin(t * 0.5 + ph) * 0.7; ship.rotation.z = Math.sin(t * 0.4 + ph) * 0.03; });
      }
    } else if (kind === 'egipto') {
      gm.map = mk(512, (g) => {
        g.fillStyle = '#a07a44'; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 90; i++) { g.fillStyle = rng() < 0.5 ? 'rgba(236,200,140,.28)' : 'rgba(70,44,18,.3)'; g.beginPath(); g.ellipse(rng() * 512, rng() * 512, 20 + rng() * 70, 8 + rng() * 28, rng() * 3, 0, 6.28); g.fill(); }
        for (let i = 0; i < 260; i++) { const y = rng() * 512, x = rng() * 512, w = 30 + rng() * 110; g.strokeStyle = `rgba(${rng() < 0.5 ? '255,230,170' : '60,36,14'},${0.1 + rng() * 0.2})`; g.lineWidth = 1 + rng() * 1.6; for (const ox of [-512, 0, 512]) { g.beginPath(); g.moveTo(x + ox, y); g.quadraticCurveTo(x + ox + w / 2, y - 3 - rng() * 4, x + ox + w, y); g.stroke(); } }
      }, 170);
      gm.color.set(0x2c2114); gm.roughness = 1;
      const duneM = new THREE.MeshStandardMaterial({ color: 0x8a6636, roughness: 1 });
      ring(22, 200, 640, (a, d) => { const r = 50 + rng() * 110, m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), duneM); m.scale.set(r * 1.5, r * 0.22, r * 0.9); m.position.set(Math.cos(a) * d, this.groundY + 2, Math.sin(a) * d); m.rotation.y = rng() * 3; this.group.add(m); });
      // pirâmides ao longe, com a ponta a brilhar
      const pyrM = new THREE.MeshStandardMaterial({ color: 0xb08a50, roughness: 0.95, flatShading: true, emissive: 0x3a2208, emissiveIntensity: 0.4 });
      for (const [x, z, r, h] of [[-260, -800, 230, 260], [130, -900, 170, 190], [430, -640, 120, 140], [-540, -430, 95, 115]] as const) {
        const p = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4).rotateY(Math.PI / 4), pyrM); p.position.set(x, this.groundY + h / 2, z); this.group.add(p);
        const cap = glow(0xffd070, 1, 0.9); cap.scale.set(r * 0.5, r * 0.5, 1); cap.position.set(x, this.groundY + h + 4, z); this.group.add(cap);
      }
      // esfinge colossal em silhueta, de olhos turquesa
      const sphM = new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 1, flatShading: true, emissive: 0x2a1a08, emissiveIntensity: 0.3 });
      const sx = new THREE.Group();
      const bx = (w: number, h: number, d: number, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sphM); m.position.set(x, y, z); sx.add(m); return m; };
      bx(72, 26, 28, 0, 13, 0); bx(26, 22, 26, 34, 18, 0); bx(30, 8, 9, -52, 4, 10); bx(30, 8, 9, -52, 4, -10); bx(18, 24, 17, -46, 38, 0);
      bx(8, 26, 4, -46, 30, 11); bx(8, 26, 4, -46, 30, -11); bx(10, 6, 20, -46, 52, 0);
      for (const sd of [-1, 1]) { const eg = glow(0x2fe6d0, 1, 0.95); eg.scale.set(5, 5, 1); eg.position.set(-55, 40, sd * 4.5); sx.add(eg); }
      sx.position.set(-170, this.groundY, -340); sx.rotation.y = 0.5; this.group.add(sx);
      // obeliscos altos de ponta dourada
      const obM = new THREE.MeshStandardMaterial({ color: 0xc4a066, roughness: 0.85, flatShading: true, emissive: 0x3a2208, emissiveIntensity: 0.35 }), goldM2 = new THREE.MeshStandardMaterial({ color: 0xe6b84a, roughness: 0.3, metalness: 0.8, emissive: 0x5a3a08, emissiveIntensity: 0.8 });
      ring(11, 220, 470, (a, d) => {
        const h = 60 + rng() * 70, w = 3.5 + rng() * 2.5, px = Math.cos(a) * d, pz = Math.sin(a) * d;
        const o = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.6, w, h, 4).rotateY(Math.PI / 4), obM); o.position.set(px, this.groundY + h / 2, pz); this.group.add(o);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(w * 0.6, w * 1.6, 4).rotateY(Math.PI / 4), goldM2); tip.position.set(px, this.groundY + h + w * 0.8, pz); this.group.add(tip);
        const gl = glow(0xffc860, 1, 0.7); gl.scale.set(20, 28, 1); gl.position.set(px, this.groundY + h + w * 0.8, pz); this.group.add(gl);
        const gs = glow(0x2fe6d0, 1, 0.5); gs.scale.set(5, 24, 1); gs.position.set(px, this.groundY + h * 0.55, pz); this.group.add(gs);
      });
      // palmeiras em silhueta
      const trunkM = new THREE.MeshStandardMaterial({ color: 0x1c140c, roughness: 1 }), frondM = new THREE.MeshStandardMaterial({ color: 0x0d1a10, roughness: 1, side: THREE.DoubleSide, flatShading: true });
      ring(28, 120, 420, (a, d) => {
        const g = new THREE.Group(), h = 22 + rng() * 20;
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.5, h, 6), trunkM); tr.position.y = h / 2; tr.rotation.z = (rng() - 0.5) * 0.2; g.add(tr);
        for (let k = 0; k < 8; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(1.7, 17, 4).translate(0, 8.5, 0), frondM); f.scale.z = 0.22; f.position.y = h; f.rotation.set(0, k * 0.785, 1.15 + (k % 2) * 0.2); g.add(f); }
        g.position.set(Math.cos(a) * d, this.groundY, Math.sin(a) * d); g.rotation.y = rng() * 3; this.group.add(g);
      });
      // sol baixo e grande, e estrelas no alto
      const sunG = glow(0xffb050, 1, 0.95); sunG.scale.set(330, 330, 1); sunG.position.set(-170, 70, -860); this.group.add(sunG);
      const sunH = glow(0xff7a3a, 1, 0.34); sunH.scale.set(760, 520, 1); sunH.position.set(-170, 60, -860); this.group.add(sunH);
      const NS = 420, sp2 = new Float32Array(NS * 3);
      for (let i = 0; i < NS; i++) { const a = rng() * Math.PI * 2, b = 0.35 + rng() * 1.1; sp2[i * 3] = Math.cos(a) * Math.cos(b) * 1300; sp2[i * 3 + 1] = Math.sin(b) * 1300; sp2[i * 3 + 2] = Math.sin(a) * Math.cos(b) * 1300; }
      const sg2 = new THREE.BufferGeometry(); sg2.setAttribute('position', new THREE.BufferAttribute(sp2, 3));
      const stars2 = new THREE.Points(sg2, new THREE.PointsMaterial({ size: 2.6, color: 0xfff0d0, sizeAttenuation: false, fog: false, depthWrite: false, transparent: true, opacity: 0.8, toneMapped: false })); stars2.frustumCulled = false; this.group.add(stars2);
    } else if (kind === 'mandala') {
      const mand = (size: number, c1: string, c2: string, c3: string) => (g: CanvasRenderingContext2D) => {
        const h = size / 2; g.clearRect(0, 0, size, size);
        for (let k = 1; k <= 10; k++) { g.strokeStyle = k % 3 === 0 ? c1 : k % 3 === 1 ? c2 : c3; g.lineWidth = 3 + (k % 3) * 2; g.beginPath(); g.arc(h, h, k * h / 11, 0, 6.28); g.stroke(); }
        for (let r2 = 1; r2 <= 4; r2++) for (let p = 0; p < 6 * r2 + 6; p++) { const a = (p / (6 * r2 + 6)) * 6.28 + r2, rr = r2 * h / 5; g.fillStyle = r2 % 2 ? c1 : c3; g.beginPath(); g.ellipse(h + Math.cos(a) * rr, h + Math.sin(a) * rr, h / 28, h / 11, a, 0, 6.28); g.fill(); }
      };
      gm.map = mk(512, (g) => { g.fillStyle = '#4a2a0c'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 80; i++) { g.fillStyle = rng() < 0.5 ? 'rgba(210,140,50,.22)' : 'rgba(20,8,0,.3)'; g.beginPath(); g.ellipse(rng() * 512, rng() * 512, 20 + rng() * 60, 10 + rng() * 30, rng() * 3, 0, 6.28); g.fill(); } }, 90);
      gm.color.set(0x9a7040); gm.roughness = 0.9;
      const cv = document.createElement('canvas'); cv.width = cv.height = 1024; mand(1024, '#ffd45a', '#ff8a2a', '#c8501a')(cv.getContext('2d')!);
      const mt = new THREE.CanvasTexture(cv); mt.colorSpace = THREE.SRGBColorSpace; this.tex.push(mt);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(900, 64), new THREE.MeshBasicMaterial({ map: mt, transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = this.groundY + 0.4; this.group.add(disc);
      this.worldAnim.push((t) => { disc.rotation.z = t * 0.012; });
      const sunM = new THREE.Mesh(new THREE.CircleGeometry(330, 64), new THREE.MeshBasicMaterial({ map: mt, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false, fog: false })); sunM.position.set(60, 270, -900); this.group.add(sunM);
      this.worldAnim.push((t) => { sunM.rotation.z = -t * 0.05; });
      const sg = glow(0xffc060, 1, 0.5); sg.scale.set(900, 900, 1); sg.position.set(60, 270, -905); this.group.add(sg);
      const pil = new THREE.MeshStandardMaterial({ color: 0xc88a3a, roughness: 0.5, metalness: 0.6, emissive: 0x5a3008, emissiveIntensity: 0.5 });
      ring(16, 200, 520, (a, d) => { const h = 70 + rng() * 90, p = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, h, 10), pil); p.position.set(Math.cos(a) * d, this.groundY + h / 2, Math.sin(a) * d); this.group.add(p); for (let k = 0; k < 3; k++) { const rg = new THREE.Mesh(new THREE.TorusGeometry(7.4, 0.9, 6, 16).rotateX(Math.PI / 2), pil); rg.position.set(p.position.x, this.groundY + h * (0.25 + k * 0.3), p.position.z); this.group.add(rg); } const gl = glow(0xffb030, 1, 0.6); gl.scale.set(30, 40, 1); gl.position.set(p.position.x, this.groundY + h + 6, p.position.z); this.group.add(gl); });
    } else if (kind === 'tinta') {
      gm.map = mk(512, (g) => { g.fillStyle = '#06182c'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(80,200,255,${0.05 + rng() * 0.16})`; g.lineWidth = 1 + rng() * 2; g.beginPath(); const x = rng() * 512, y = rng() * 512; g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 30, x + 60, y + 30, x + 90, y); g.stroke(); } }, 80);
      gm.color.set(0xffffff); gm.roughness = 0.4; gm.metalness = 0.2; gm.envMapIntensity = 1.2;
      const jM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x60d8ff).multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
      ring(10, 160, 520, (a, d) => { const g = new THREE.Group(), s = 14 + rng() * 26; g.add(new THREE.Mesh(new THREE.SphereGeometry(s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), jM)); for (let k = 0; k < 7; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.15, s * 3, 5), jM); t.position.set(Math.cos(k * 0.9) * s * 0.6, -s * 1.4, Math.sin(k * 0.9) * s * 0.6); g.add(t); } const gl = glow(0x44e0ff, 1, 0.45); gl.scale.set(s * 5, s * 5, 1); g.add(gl); g.position.set(Math.cos(a) * d, this.groundY + 60 + rng() * 140, Math.sin(a) * d); this.group.add(g); const ph = rng() * 6, y0 = g.position.y; this.worldAnim.push((t) => { g.position.y = y0 + Math.sin(t * 0.3 + ph) * 6; g.scale.y = 1 + Math.sin(t * 0.8 + ph) * 0.06; }); });
      const kelp = new THREE.MeshStandardMaterial({ color: 0x0a3a3a, roughness: 0.8, emissive: 0x0a4a4a, emissiveIntensity: 0.4 });
      ring(30, 100, 460, (a, d) => { const h = 60 + rng() * 120, k = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(6, h * 0.4, 0), new THREE.Vector3(-5, h * 0.7, 3), new THREE.Vector3(4, h, 0)]), 14, 1.4, 5), kelp); k.position.set(Math.cos(a) * d, this.groundY, Math.sin(a) * d); this.group.add(k); });
      for (let i = 0; i < 12; i++) { const a = rng() * 6.28, d = 100 + rng() * 360, sh = glow(0x80e8ff, 1, 0.1); sh.scale.set(26, 360, 1); sh.position.set(Math.cos(a) * d, this.groundY + 150, Math.sin(a) * d); this.group.add(sh); }
    } else if (kind === 'neon') {
      gm.map = mk(512, (g) => { g.fillStyle = '#0a0614'; g.fillRect(0, 0, 512, 512); for (let i = 0; i <= 8; i++) { g.strokeStyle = i % 2 ? '#27d3ff' : '#ff2bd6'; g.lineWidth = 2; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); } g.globalAlpha = 1; }, 140);
      gm.color.set(0xffffff); gm.emissiveMap = gm.map; gm.emissive = new THREE.Color(0x884488); gm.emissiveIntensity = 0.5; gm.roughness = 0.5;
      const win = mk(128, (g) => { g.fillStyle = '#0c0a18'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) if (rng() < 0.55) { g.fillStyle = rng() < 0.5 ? '#ff2bd6' : rng() < 0.5 ? '#27d3ff' : '#ffe14a'; g.fillRect(x * 16 + 3, y * 8 + 2, 10, 4); } }, 1);
      ring(34, 140, 560, (a, d) => { const h = 60 + rng() * 220, w = 20 + rng() * 26, t = win.clone(); t.needsUpdate = true; t.repeat.set(w / 20, h / 40); this.tex.push(t); const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), m); b.position.set(Math.cos(a) * d, this.groundY + h / 2, Math.sin(a) * d); b.rotation.y = a; this.group.add(b); if (rng() < 0.4) { const gl = glow(rng() < 0.5 ? 0xff2bd6 : 0x27d3ff, 1, 0.5); gl.scale.set(w * 2, 14, 1); gl.position.set(b.position.x, this.groundY + h + 4, b.position.z); this.group.add(gl); } });
      const sunN = new THREE.Mesh(new THREE.CircleGeometry(190, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: 'varying vec2 vUv; void main(){ float y = vUv.y; vec3 c = mix(vec3(1.0,0.17,0.84), vec3(1.0,0.88,0.3), y); float cut = step(0.5, fract(y*9.0 + 0.15)) * step(y, 0.55) ; if (cut > 0.5 && y < 0.5) discard; gl_FragColor = vec4(c*1.6, 1.0); }' })); sunN.position.set(-80, 150, -880); this.group.add(sunN);
      for (let i = 0; i < 12; i++) { const a = rng() * 6.28, d = 100 + rng() * 380; pillarFx.push([rng() < 0.5 ? 0xff2bd6 : 0x27d3ff, Math.cos(a) * d, Math.sin(a) * d, 60 + rng() * 80, 4 + rng() * 4]); }
    } else if (kind === 'galactico') {
      const dk = floorPBR('deck').map; gm.map = dk; dk.repeat.set(120, 120); gm.color.set(0x9aa8b8); gm.roughness = 0.5; gm.metalness = 0.6;
      const planet = new THREE.Mesh(new THREE.SphereGeometry(190, 40, 24), new THREE.MeshStandardMaterial({ color: 0x3a2a9a, roughness: 0.8, emissive: 0x140a4a, emissiveIntensity: 0.6 })); planet.position.set(-260, 260, -820); this.group.add(planet);
      const pr = new THREE.Mesh(new THREE.TorusGeometry(300, 10, 3, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8a7aff).multiplyScalar(1.3), transparent: true, opacity: 0.6, toneMapped: false })); pr.position.copy(planet.position); pr.rotation.set(1.25, 0.2, 0); this.group.add(pr);
      for (const [x, y, z, c, s] of [[300, 180, -700, 0xff2bd6, 560], [-420, 100, -500, 0x39f2d0, 460], [80, 330, -900, 0x5a3fd6, 700]] as const) { const n = glow(c, 1, 0.3); n.scale.set(s, s * 0.6, 1); n.position.set(x, y, z); this.group.add(n); }
      const metal = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 0.35, metalness: 0.8, emissive: 0x0a2a2a, emissiveIntensity: 0.5 });
      ring(7, 240, 520, (a, d) => { const g = new THREE.Group(), r = 40 + rng() * 40; g.add(new THREE.Mesh(new THREE.TorusGeometry(r, 4, 8, 40), metal)); for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 2, 1.5, 1.5), metal); sp.rotation.z = k * 0.52; g.add(sp); } const hub = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8), metal); g.add(hub); const gl = glow(0x39f2d0, 1, 0.5); gl.scale.set(r * 1.6, r * 1.6, 1); g.add(gl); g.position.set(Math.cos(a) * d, this.groundY + 70 + rng() * 120, Math.sin(a) * d); g.lookAt(0, g.position.y, 0); this.group.add(g); this.worldAnim.push(() => { g.rotateZ(0.002); }); });
      const NS = 600, sp = new Float32Array(NS * 3); for (let i = 0; i < NS; i++) { const a = rng() * 6.28, b = rng() * 1.4; sp[i * 3] = Math.cos(a) * Math.cos(b) * 1300; sp[i * 3 + 1] = Math.sin(b) * 1300; sp[i * 3 + 2] = Math.sin(a) * Math.cos(b) * 1300; }
      const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const stars3 = new THREE.Points(sgm, new THREE.PointsMaterial({ size: 2.6, color: 0xdfe8ff, sizeAttenuation: false, fog: false, depthWrite: false, transparent: true, opacity: 0.85, toneMapped: false })); stars3.frustumCulled = false; this.group.add(stars3);
    } else if (kind === 'estelar') {
      const ch = floorPBR('chart').map; gm.map = ch; ch.repeat.set(36, 36); gm.color.set(0xb8c0e8); gm.roughness = 0.6;
      const NS = 700, sp = new Float32Array(NS * 3); for (let i = 0; i < NS; i++) { const a = rng() * 6.28, b = rng() * 1.45; sp[i * 3] = Math.cos(a) * Math.cos(b) * 1300; sp[i * 3 + 1] = Math.sin(b) * 1300; sp[i * 3 + 2] = Math.sin(a) * Math.cos(b) * 1300; }
      const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const stars3 = new THREE.Points(sgm, new THREE.PointsMaterial({ size: 3, color: 0xfff0c8, sizeAttenuation: false, fog: false, depthWrite: false, transparent: true, opacity: 0.9, toneMapped: false })); stars3.frustumCulled = false; this.group.add(stars3);
      for (let k = 0; k < 7; k++) { const a0 = rng() * 6.28, pts: THREE.Vector3[] = []; let x = Math.cos(a0) * 600, z = Math.sin(a0) * 600, y = 120 + rng() * 260; for (let s2 = 0; s2 < 6; s2++) { pts.push(new THREE.Vector3(x, y, z)); x += (rng() - 0.5) * 220; z += (rng() - 0.5) * 220; y += (rng() - 0.5) * 120; } const lg = new THREE.BufferGeometry().setFromPoints(pts); this.group.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xe6c060, transparent: true, opacity: 0.55, fog: false }))); for (const p of pts) { const s2 = glow(0xffe08a, 1, 0.9); s2.scale.set(22, 22, 1); s2.position.copy(p); this.group.add(s2); } }
      const gal = glow(0x8a7aff, 1, 0.35); gal.scale.set(900, 500, 1); gal.position.set(0, 320, -800); this.group.add(gal);
      const gold = new THREE.MeshStandardMaterial({ color: 0xc8a34a, roughness: 0.3, metalness: 0.85, emissive: 0x4a3606, emissiveIntensity: 0.6 });
      ring(7, 260, 540, (a, d) => { const g = new THREE.Group(), r = 36 + rng() * 40; for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * (1 - k * 0.22), 1.6, 6, 48), gold); t.rotation.set(k * 1.0, k * 0.7, 0); g.add(t); } const s2 = glow(0xffe08a, 1, 0.7); s2.scale.set(r * 0.8, r * 0.8, 1); g.add(s2); g.position.set(Math.cos(a) * d, this.groundY + 90 + rng() * 120, Math.sin(a) * d); this.group.add(g); this.worldAnim.push((t) => { g.rotation.y = t * 0.1 + a; g.rotation.x = Math.sin(t * 0.2 + a) * 0.3; }); });
    } else if (kind === 'angelico') {
      gm.map = mk(512, (g) => { g.fillStyle = '#f4f0f8'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 160; i++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 50); const x = rng() * 512, y = rng() * 512, r2 = 20 + rng() * 60; const gg = g.createRadialGradient(x, y, 0, x, y, r2); gg.addColorStop(0, rng() < 0.5 ? 'rgba(255,255,255,.9)' : 'rgba(190,205,245,.5)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gg; g.beginPath(); g.arc(x, y, r2, 0, 6.28); g.fill(); void gr; } }, 70);
      gm.color.set(0x8a96c0); gm.roughness = 1;
      for (let i = 0; i < 26; i++) { const a = rng() * 6.28, d = 160 + rng() * 560, c = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, fog: false })); c.scale.set(180 + rng() * 260, 80 + rng() * 120, 1); c.position.set(Math.cos(a) * d, this.groundY + 20 + rng() * 150, Math.sin(a) * d); this.group.add(c); }
      const step = new THREE.MeshStandardMaterial({ color: 0xfff4d0, roughness: 0.4, metalness: 0.3, emissive: 0xaa8a30, emissiveIntensity: 0.4 });
      for (let k = 0; k < 24; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(80 - k * 1.8, 5, 18), step); b.position.set(60, this.groundY + 6 + k * 9, -380 - k * 18); this.group.add(b); }
      const gate = new THREE.Mesh(new THREE.TorusGeometry(70, 5, 8, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe9a0).multiplyScalar(2), toneMapped: false })); gate.position.set(60, this.groundY + 280, -830); this.group.add(gate);
      const gl = glow(0xfff0c0, 1, 0.9); gl.scale.set(520, 520, 1); gl.position.copy(gate.position); this.group.add(gl);
      for (let i = 0; i < 10; i++) { const a = rng() * 6.28, d = 140 + rng() * 380, sh = glow(0xfff4c8, 1, 0.12); sh.scale.set(30, 400, 1); sh.position.set(Math.cos(a) * d, this.groundY + 180, Math.sin(a) * d); this.group.add(sh); }
      const col2 = new THREE.MeshStandardMaterial({ color: 0xf4f0f8, roughness: 0.4, emissive: 0x8a90b0, emissiveIntensity: 0.4 });
      ring(14, 160, 500, (a, d) => { const h = 70 + rng() * 80, c = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, h, 12), col2); c.position.set(Math.cos(a) * d, this.groundY + h / 2, Math.sin(a) * d); this.group.add(c); });
    } else if (kind === 'animal') {
      const sv = floorPBR('savanna').map; gm.map = sv; sv.repeat.set(120, 120); gm.color.set(0xb09060); gm.roughness = 1;
      const hillM = new THREE.MeshStandardMaterial({ color: 0x5a3a18, roughness: 1 });
      ring(14, 260, 680, (a, d) => { const r = 60 + rng() * 120, m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), hillM); m.scale.set(r * 1.6, r * 0.4, r); m.position.set(Math.cos(a) * d, this.groundY, Math.sin(a) * d); this.group.add(m); });
      const trunk = new THREE.MeshStandardMaterial({ color: 0x1c1208, roughness: 1 }), crown = new THREE.MeshStandardMaterial({ color: 0x1c2a10, roughness: 1, flatShading: true });
      ring(22, 120, 460, (a, d) => { const g = new THREE.Group(), h = 22 + rng() * 18; const t = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, h, 6), trunk); t.position.y = h / 2; g.add(t); const c = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), crown); c.scale.set(14 + rng() * 8, 2.4, 14 + rng() * 8); c.position.y = h + 1; g.add(c); g.position.set(Math.cos(a) * d, this.groundY, Math.sin(a) * d); this.group.add(g); });
      ring(5, 200, 440, (a, d) => { const g = new THREE.Group(), h = 40 + rng() * 20, t = new THREE.Mesh(new THREE.CylinderGeometry(7, 11, h, 10), trunk); t.position.y = h / 2; g.add(t); for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 22, 5), trunk); b.position.set(Math.cos(k) * 5, h + 8, Math.sin(k) * 5); b.rotation.set(Math.sin(k) * 0.9, 0, -Math.cos(k) * 0.9); g.add(b); const lf = new THREE.Mesh(new THREE.SphereGeometry(4, 6, 5), crown); lf.position.set(Math.cos(k) * 12, h + 17, Math.sin(k) * 12); g.add(lf); } g.position.set(Math.cos(a) * d, this.groundY, Math.sin(a) * d); this.group.add(g); });
      ring(7, 150, 420, (a, d) => { const g = new THREE.Group(), bd = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 5), trunk); bd.position.y = 14; g.add(bd); for (const [x, z] of [[-5, -1.6], [5, -1.6], [-5, 1.6], [5, 1.6]] as const) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 14, 5), trunk); l.position.set(x, 7, z); g.add(l); } const nk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 16, 6), trunk); nk.position.set(6, 22, 0); nk.rotation.z = -0.25; g.add(nk); const hd = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 2.4), trunk); hd.position.set(8, 30, 0); g.add(hd); g.position.set(Math.cos(a) * d, this.groundY, Math.sin(a) * d); g.rotation.y = rng() * 6.28; this.group.add(g); });
      const sunA = glow(0xffb050, 1, 0.95); sunA.scale.set(360, 360, 1); sunA.position.set(120, 80, -860); this.group.add(sunA); const sunB = glow(0xff7a3a, 1, 0.3); sunB.scale.set(900, 500, 1); sunB.position.set(120, 70, -860); this.group.add(sunB);
    } else if (kind === 'rockstar') {
      const st = floorPBR('stage').map; gm.map = st; st.repeat.set(150, 150); gm.color.set(0x8a8a98); gm.roughness = 0.5;
      const am = wallPBR('amp').map;
      ring(18, 150, 520, (a, d) => { const h = 50 + rng() * 90, w = 24 + rng() * 20, t = am.clone(); t.needsUpdate = true; t.repeat.set(w / 30, h / 30); this.tex.push(t); const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.7), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })); b.position.set(Math.cos(a) * d, this.groundY + h / 2, Math.sin(a) * d); b.rotation.y = a + Math.PI / 2; this.group.add(b); });
      const beamM = (c: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) { const c = [0xff2b8a, 0xffe14a, 0x27d3ff][i % 3], b = new THREE.Mesh(new THREE.ConeGeometry(34, 560, 16, 1, true), beamM(c)); b.geometry.translate(0, -280, 0); b.position.set((i - 4) * 120, this.groundY + 520, -520 - (i % 3) * 80); b.rotation.z = 0.5 + 0.2 * i; this.group.add(b); this.worldAnim.push((t) => { b.rotation.z = Math.sin(t * 0.5 + i) * 0.7; b.rotation.x = Math.cos(t * 0.4 + i * 2) * 0.5; }); }
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(520, 220), new THREE.ShaderMaterial({ uniforms: { time: { value: 0 } }, fog: false, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: 'varying vec2 vUv; uniform float time; void main(){ float w = sin(vUv.x*14.0 + time*2.0) * 0.5 + 0.5; float b = sin(vUv.y*20.0 - time*3.0) * 0.5 + 0.5; vec3 c = mix(vec3(1.0,0.17,0.54), vec3(1.0,0.88,0.29), w); c = mix(c, vec3(0.15,0.8,1.0), b*0.4); gl_FragColor = vec4(c*1.4*(0.6+0.4*b), 1.0); }' })); scr.position.set(0, this.groundY + 230, -820); this.group.add(scr); this.worldAnim.push((t) => { (scr.material as THREE.ShaderMaterial).uniforms.time.value = t; });
      const NP = 700, pp = new Float32Array(NP * 3), pc = new Float32Array(NP * 3); for (let i = 0; i < NP; i++) { const a = rng() * 6.28, d = 90 + rng() * 360; pp[i * 3] = Math.cos(a) * d; pp[i * 3 + 1] = this.groundY + 2 + rng() * 3; pp[i * 3 + 2] = Math.sin(a) * d; const lit = rng() < 0.18; pc[i * 3] = lit ? 1 : 0.02; pc[i * 3 + 1] = lit ? 0.95 : 0.02; pc[i * 3 + 2] = lit ? 0.8 : 0.03; }
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3)); this.group.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 4.5, vertexColors: true, sizeAttenuation: true, toneMapped: false })));
    }

    // ── detritos flutuantes junto à ilha: o que se vê no ecrã vertical, por baixo e ao lado do labirinto ──
    const near = (n: number, make: (i: number) => THREE.Object3D, r0 = 10, r1 = 48, y0 = -3, y1 = -26) => {
      for (let i = 0; i < n; i++) {
        const o = make(i), a = (i / n) * Math.PI * 2 + rng() * 0.7, d = islandR + r0 + rng() * (r1 - r0), y = y0 + rng() * (y1 - y0);
        o.position.set(Math.cos(a) * d, y, Math.sin(a) * d); o.rotation.set((rng() - 0.5) * 0.6, rng() * 6.28, (rng() - 0.5) * 0.6); this.group.add(o);
        const ph = rng() * 6.28, sp = 0.25 + rng() * 0.3, rs = (rng() - 0.5) * 0.5;
        this.worldAnim.push((t) => { o.position.y = y + Math.sin(t * sp + ph) * 0.9; o.rotation.y += rs * 0.004; });
      }
    };
    const rockGeo = (s: number, rr: () => number) => { const g = new THREE.IcosahedronGeometry(s, 1); const q = g.attributes.position; for (let k = 0; k < q.count; k++) { const f = 1 + (rr() - 0.5) * 0.45; q.setXYZ(k, q.getX(k) * f, q.getY(k) * f * 0.7, q.getZ(k) * f); } g.computeVertexNormals(); return g; };
    const pillar = (col: number, x: number, z: number, h: number, w: number) => {
      const sp: THREE.Sprite[] = [];
      for (let k = 0; k < 9; k++) { const q = glow(col, 1, 0.34 - k * 0.025); q.scale.set(w * (1 - k * 0.06), h / 6, 1); q.position.set(x, this.groundY + (k / 8) * h, z); this.group.add(q); sp.push(q); }
      const ph = rng() * 6; this.worldAnim.push((t) => { sp.forEach((q, k) => { q.position.x = x + Math.sin(t * 0.7 + ph + k * 0.5) * w * 0.12; (q.material as THREE.SpriteMaterial).opacity = (0.34 - k * 0.025) * (0.8 + 0.2 * Math.sin(t * 2.1 + ph + k)); }); });
    };
    for (const [c, x, z, h, w] of pillarFx) pillar(c, x, z, h, w);
    if (kind === 'demoniaco') {
      const obs = new THREE.MeshStandardMaterial({ color: 0x1b1316, roughness: 0.55, metalness: 0.4, flatShading: true, emissive: 0x3a0a06, emissiveIntensity: 0.6 });
      near(22, () => { const g = new THREE.Group(), sz = 0.9 + rng() * 2.4; g.add(new THREE.Mesh(rockGeo(sz, rng), obs)); const sp = new THREE.Mesh(new THREE.ConeGeometry(sz * 0.7, sz * 1.8, 6), obs); sp.rotation.x = Math.PI; sp.position.y = -sz * 1.2; g.add(sp); const gl = glow(0xff5a1a, sz * 6, 0.5); gl.position.y = -sz * 1.4; g.add(gl); return g; });
      for (let i = 0; i < 12; i++) { const a = rng() * Math.PI * 2, d = islandR + 34 + rng() * 120; pillar(0xff5a1a, Math.cos(a) * d, Math.sin(a) * d, 40 + rng() * 40, 7 + rng() * 8); }
    } else if (kind === 'glaciar') {
      const ic = new THREE.MeshPhysicalMaterial({ color: 0xcfeaf8, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9, emissive: 0x2a5a8a, emissiveIntensity: 0.4, flatShading: true, clearcoat: 1 });
      near(20, () => { const g = new THREE.Group(), sz = 1.2 + rng() * 2.6; const slab = new THREE.Mesh(new THREE.CylinderGeometry(sz, sz * 0.85, 0.35, 6), ic); g.add(slab); const sn = new THREE.Mesh(new THREE.CylinderGeometry(sz * 0.95, sz * 0.95, 0.08, 6), new THREE.MeshStandardMaterial({ color: 0xf4faff, roughness: 0.95 })); sn.position.y = 0.2; g.add(sn); const under = new THREE.Mesh(new THREE.ConeGeometry(sz * 0.85, sz * 1.6, 6), ic); under.rotation.x = Math.PI; under.position.y = -sz * 0.95; g.add(under); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.18 + rng() * 0.2, 0.9 + rng() * 1.4, 5), ic); c.position.set((rng() - 0.5) * sz * 1.1, 0.7, (rng() - 0.5) * sz * 1.1); c.rotation.z = (rng() - 0.5) * 0.4; g.add(c); } const gl = glow(0x9fe0ff, sz * 4, 0.3); gl.position.y = -sz * 0.4; g.add(gl); return g; });
      for (let i = 0; i < 8; i++) { const a = rng() * Math.PI * 2, d = islandR + 40 + rng() * 110; pillar(0x9fe0ff, Math.cos(a) * d, Math.sin(a) * d, 50 + rng() * 40, 9 + rng() * 8); }
    } else if (kind === 'relogio') {
      const bm = new THREE.MeshStandardMaterial({ color: 0x9a7430, roughness: 0.38, metalness: 0.88, emissive: 0x3a2506, emissiveIntensity: 0.5, side: THREE.DoubleSide });
      near(16, (i) => { const r = 1.0 + rng() * 2.4, w = new THREE.Group(), g = gear(r, 10 + (i % 4) * 2, bm); g.rotation.x = Math.PI / 2; w.add(g); const dir = i % 2 ? 1 : -1; this.worldAnim.push(() => { w.rotation.y += dir * 0.012 * (1.6 / r); }); return w; }, 8, 44, -2, -24);
      const pipe = new THREE.MeshStandardMaterial({ color: 0x3a2e1a, roughness: 0.5, metalness: 0.8 });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 30 + rng() * 100, h = 30 + rng() * 50, px = Math.cos(a) * d, pz = Math.sin(a) * d; const c = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, h, 10), pipe); c.position.set(px, this.groundY + h / 2, pz); this.group.add(c); pillar(0xe6dccb, px, pz, h + 38, 12); }
    } else if (kind === 'biblioteca') {
      const BC = [0x6a1c1c, 0x1c3a5a, 0x2c4a2c, 0x7a4a1c, 0x4a2c5a, 0x8a6a2c];
      const paper = new THREE.MeshStandardMaterial({ color: 0xe0d2ae, roughness: 0.9 });
      near(26, (i) => { const g = new THREE.Group(), s = 0.8 + rng() * 1.3, cov = new THREE.MeshStandardMaterial({ color: BC[i % BC.length], roughness: 0.7 }); if (i % 3 === 0) { for (const sd of [-1, 1]) { const h = new THREE.Group(); h.rotation.z = sd * 0.35; h.position.x = sd * 0.45 * s; h.add(new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.05 * s, 1.2 * s), cov)); const pg = new THREE.Mesh(new THREE.BoxGeometry(0.84 * s, 0.05 * s, 1.14 * s), paper); pg.position.y = 0.05 * s; h.add(pg); g.add(h); } } else { g.add(new THREE.Mesh(new THREE.BoxGeometry(1.1 * s, 0.26 * s, 0.8 * s), cov)); const pg = new THREE.Mesh(new THREE.BoxGeometry(1.0 * s, 0.2 * s, 0.74 * s), paper); pg.position.set(0.04 * s, 0, 0.02 * s); g.add(pg); g.add(new THREE.Mesh(new THREE.BoxGeometry(1.1 * s, 0.27 * s, 0.07 * s), new THREE.MeshStandardMaterial({ color: 0xc9a13a, metalness: 0.7, roughness: 0.4 })).translateZ(0.38 * s)); } return g; });
      near(10, () => { const g = new THREE.Group(); const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), paper); g.add(fl); const f = glow(0xffb060, 2.2, 0.9); f.position.y = 0.34; g.add(f); const c = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb870).multiplyScalar(2.5), toneMapped: false })); c.position.y = 0.3; g.add(c); return g; }, 6, 34, 6, -14);
    } else if (kind === 'elfico') {
      const rootM = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1, flatShading: true }), mossM = new THREE.MeshStandardMaterial({ color: 0x3f6a2c, roughness: 1, flatShading: true });
      near(24, () => {
        const g = new THREE.Group(), sz = 0.9 + rng() * 2.2;
        g.add(new THREE.Mesh(rockGeo(sz, rng), rootM)); const top = new THREE.Mesh(new THREE.SphereGeometry(sz * 0.95, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2.4), mossM); top.scale.y = 0.45; top.position.y = sz * 0.28; g.add(top);
        for (let k = 0; k < 5; k++) { const rt = new THREE.Mesh(new THREE.ConeGeometry(0.1 + rng() * 0.1, sz * (1.2 + rng()), 5), rootM); rt.position.set((rng() - 0.5) * sz, -sz * 0.8, (rng() - 0.5) * sz); rt.rotation.x = Math.PI + (rng() - 0.5) * 0.5; rt.rotation.z = (rng() - 0.5) * 0.5; g.add(rt); }
        if (rng() < 0.6) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1 + rng() * 0.1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xb8ff80).multiplyScalar(2.2), toneMapped: false })); b.position.set((rng() - 0.5) * sz * 0.8, sz * 0.5, (rng() - 0.5) * sz * 0.8); g.add(b); const gl = glow(0xa8ff6a, 2.4, 0.8); gl.position.copy(b.position); g.add(gl); }
        return g;
      });
      near(18, () => { const g = new THREE.Group(), s2 = 0.35 + rng() * 0.6, o = glow(rng() < 0.5 ? 0xa8ff6a : 0xffe070, s2 * 5, 0.9); g.add(o); const c = new THREE.Mesh(new THREE.SphereGeometry(s2 * 0.2, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf4ffd0).multiplyScalar(2.5), toneMapped: false })); g.add(c); return g; }, 4, 40, 8, -12);
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 36 + rng() * 120; pillar(0xffe9a0, Math.cos(a) * d, Math.sin(a) * d, 70 + rng() * 60, 10 + rng() * 10); }
    } else if (kind === 'viking') {
      const wood = new THREE.MeshStandardMaterial({ color: 0x3a2814, roughness: 0.85 }), stoneM = new THREE.MeshStandardMaterial({ color: 0x3a424e, roughness: 0.9, flatShading: true }), rn = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff8a30).multiplyScalar(2.4), toneMapped: false });
      const SC = [0xa82a1a, 0xc9a13a, 0x2a4a6a, 0x8a8a90];
      near(26, (i) => {
        const g = new THREE.Group(), k = i % 3;
        if (k === 0) { const s2 = 1.3 + rng() * 1.8; const sl = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s2, 2.2 * s2, 0.5 * s2), stoneM); g.add(sl); const v = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s2, 1.2 * s2, 0.05), rn); v.position.set(0, 0.1 * s2, 0.28 * s2); g.add(v); for (const [dy, dx] of [[0.4, 0.2], [0.05, -0.2], [-0.35, 0.18]] as const) { const br = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s2, 0.06 * s2, 0.05), rn); br.position.set(dx * s2, dy * s2, 0.28 * s2); br.rotation.z = dx > 0 ? -0.5 : 0.5; g.add(br); } const gl = glow(0xff7a2a, s2 * 3.4, 0.4); gl.position.z = 0.6; g.add(gl); }
        else if (k === 1) { const s2 = 0.9 + rng() * 1.1, sh = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * s2, 1.2 * s2, 0.14 * s2, 18).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: SC[(rng() * 4) | 0], roughness: 0.7 })); g.add(sh); const rim = new THREE.Mesh(new THREE.TorusGeometry(1.2 * s2, 0.07 * s2, 6, 24), new THREE.MeshStandardMaterial({ color: 0x6a6e76, metalness: 0.8, roughness: 0.4 })); g.add(rim); const bs = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a8e96, metalness: 0.8, roughness: 0.4 })); bs.position.z = 0.07 * s2; g.add(bs); }
        else { const s2 = 1 + rng() * 1.4; for (let p = 0; p < 3; p++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(2.6 * s2, 0.16, 0.5), wood); pl.position.set((p - 1) * 0.2, 0, (p - 1) * 0.56); pl.rotation.y = (rng() - 0.5) * 0.3; g.add(pl); } const ar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4 * s2, 5), wood); ar.rotation.z = Math.PI / 2; ar.position.set(0, 0.3, 0.2); g.add(ar); }
        return g;
      });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(0xff7a2a, Math.cos(a) * d, Math.sin(a) * d, 36 + rng() * 40, 7 + rng() * 6); }
    } else if (kind === 'egipto') {
      const sandM = new THREE.MeshStandardMaterial({ color: 0xb48c52, roughness: 0.9, flatShading: true }), tqM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2fe6d0).multiplyScalar(2.4), toneMapped: false }), goldN = new THREE.MeshStandardMaterial({ color: 0xe6b84a, roughness: 0.3, metalness: 0.85, emissive: 0x5a3a08, emissiveIntensity: 0.7 });
      near(26, (i) => {
        const g = new THREE.Group(), k = i % 3;
        if (k === 0) { const s2 = 1.2 + rng() * 1.8; g.add(new THREE.Mesh(new THREE.BoxGeometry(1.5 * s2, 0.9 * s2, 1.5 * s2), sandM)); const v = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s2, 0.6 * s2, 0.04), tqM); v.position.set(0, 0, 0.77 * s2); g.add(v); for (const dy of [0.2, -0.15]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s2, 0.06 * s2, 0.04), tqM); b.position.set(0, dy * s2, 0.77 * s2); g.add(b); } const gl = glow(0x2fe6d0, s2 * 3.2, 0.3); gl.position.z = 0.9 * s2; g.add(gl); }
        else if (k === 1) { const s2 = 1 + rng() * 1.4; const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * s2, 0.55 * s2, 2.4 * s2, 4).rotateY(Math.PI / 4), sandM); g.add(ob); const tp = new THREE.Mesh(new THREE.ConeGeometry(0.4 * s2, 0.7 * s2, 4).rotateY(Math.PI / 4), goldN); tp.position.y = 1.5 * s2; g.add(tp); const gl = glow(0xffc860, s2 * 3, 0.5); gl.position.y = 1.5 * s2; g.add(gl); }
        else { const s2 = 1.1 + rng() * 0.9; g.add(new THREE.Mesh(new THREE.TorusGeometry(0.5 * s2, 0.07 * s2, 6, 20).translate(0, 0.9 * s2, 0), tqM)); const st = new THREE.Mesh(new THREE.BoxGeometry(0.1 * s2, 1.5 * s2, 0.1 * s2), tqM); st.position.y = -0.2 * s2; g.add(st); const ar = new THREE.Mesh(new THREE.BoxGeometry(0.95 * s2, 0.1 * s2, 0.1 * s2), tqM); ar.position.y = 0.3 * s2; g.add(ar); const gl = glow(0x2fe6d0, s2 * 4, 0.45); gl.position.y = 0.4 * s2; g.add(gl); }
        return g;
      });
      near(14, () => { const g = new THREE.Group(), s2 = 0.3 + rng() * 0.4; const b = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s2, 10, 8), goldN); b.scale.set(1, 0.55, 1.4); g.add(b); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s2, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1c3fb0, roughness: 0.4, metalness: 0.4 })); hd.position.z = 0.7 * s2; g.add(hd); const gl = glow(0xffc860, s2 * 6, 0.5); g.add(gl); return g; }, 6, 40, 4, -12);
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(0xffc860, Math.cos(a) * d, Math.sin(a) * d, 40 + rng() * 40, 8 + rng() * 6); }
    } else if (kind === 'mandala') {
      const goldN = new THREE.MeshStandardMaterial({ color: 0xe8b040, roughness: 0.3, metalness: 0.85, emissive: 0x6a3a08, emissiveIntensity: 0.7 });
      near(24, (i) => { const g = new THREE.Group(), k = i % 3; if (k === 0) { const s2 = 0.9 + rng() * 1.2; for (let p = 0; p < 10; p++) { const pt = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s2, 1.2 * s2, 4).scale(1, 1, 0.3).translate(0, 0.6 * s2, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(p % 2 ? 0xffb0c8 : 0xffe0a0).multiplyScalar(1.5), toneMapped: false })); pt.rotation.set(0, p * 0.628, 1.0); g.add(pt); } const gl = glow(0xffb030, s2 * 4, 0.5); gl.position.y = 0.3 * s2; g.add(gl); } else if (k === 1) { const s2 = 1.2 + rng() * 1.6, w = new THREE.Group(); for (let r2 = 1; r2 <= 3; r2++) w.add(new THREE.Mesh(new THREE.TorusGeometry(0.4 * r2 * s2, 0.05 * s2, 6, 32), goldN)); g.add(w); const dir = i % 2 ? 1 : -1; this.worldAnim.push(() => { w.rotation.z += dir * 0.01; }); const gl = glow(0xffc060, s2 * 4, 0.35); g.add(gl); } else { const s2 = 0.8 + rng() * 0.8, b = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s2, 12, 8, 0, 6.28, 0, 1.9), goldN); b.rotation.x = Math.PI; g.add(b); const gl = glow(0xffb030, s2 * 3, 0.4); g.add(gl); } return g; });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(0xffb030, Math.cos(a) * d, Math.sin(a) * d, 40 + rng() * 40, 8 + rng() * 6); }
    } else if (kind === 'tinta') {
      const jM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x60d8ff).multiplyScalar(1.7), toneMapped: false, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
      near(20, (i) => { const g = new THREE.Group(), s2 = 0.6 + rng() * 1.3; if (i % 2) { g.add(new THREE.Mesh(new THREE.SphereGeometry(s2, 12, 8, 0, 6.28, 0, 1.57), jM)); for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, s2 * 3, 4), jM); t.position.set(Math.cos(k * 1.05) * s2 * 0.6, -s2 * 1.5, Math.sin(k * 1.05) * s2 * 0.6); g.add(t); } } else { const b = new THREE.Mesh(new THREE.SphereGeometry(s2 * 0.6, 12, 8), new THREE.MeshStandardMaterial({ color: 0x0a2a5a, roughness: 0.05, metalness: 0.3, emissive: 0x1a6aa8, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 })); g.add(b); } const gl = glow(0x44e0ff, s2 * 4, 0.4); g.add(gl); return g; });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(0x80e8ff, Math.cos(a) * d, Math.sin(a) * d, 40 + rng() * 40, 8 + rng() * 6); }
    } else if (kind === 'neon') {
      near(22, (i) => { const g = new THREE.Group(), s2 = 0.8 + rng() * 1.4, c = i % 2 ? 0x27d3ff : 0xff2bd6; const bx = new THREE.Mesh(new THREE.BoxGeometry(s2, s2, s2), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.35), toneMapped: false, transparent: true, opacity: 0.5 })); g.add(bx); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s2, s2, s2)), new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2), toneMapped: false }))); const gl = glow(c, s2 * 4, 0.4); g.add(gl); return g; });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(rng() < 0.5 ? 0xff2bd6 : 0x27d3ff, Math.cos(a) * d, Math.sin(a) * d, 40 + rng() * 60, 6 + rng() * 6); }
    } else if (kind === 'galactico') {
      const rockM = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.9, flatShading: true });
      near(22, (i) => { const g = new THREE.Group(), s2 = 0.9 + rng() * 2; g.add(new THREE.Mesh(rockGeo(s2, rng), rockM)); if (i % 3 === 0) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.25 * s2, s2, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x39f2d0).multiplyScalar(2), toneMapped: false })); c.position.y = s2 * 0.7; g.add(c); const gl = glow(0x39f2d0, s2 * 3.5, 0.5); gl.position.y = s2 * 0.8; g.add(gl); } else if (i % 3 === 1) { const sat = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s2, 0.3 * s2, 0.5 * s2), new THREE.MeshStandardMaterial({ color: 0x9aa8b8, metalness: 0.8, roughness: 0.3 })); sat.position.y = s2; g.add(sat); for (const sd of [-1, 1]) { const pn = new THREE.Mesh(new THREE.BoxGeometry(1.2 * s2, 0.04, 0.5 * s2), new THREE.MeshStandardMaterial({ color: 0x1c3fb0, metalness: 0.5, roughness: 0.3, emissive: 0x0a1a5a, emissiveIntensity: 0.6 })); pn.position.set(sd * 0.9 * s2, s2, 0); g.add(pn); } } return g; });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(0x39f2d0, Math.cos(a) * d, Math.sin(a) * d, 40 + rng() * 60, 7 + rng() * 6); }
    } else if (kind === 'estelar') {
      near(26, (i) => { const g = new THREE.Group(), s2 = 0.5 + rng() * 1.1; const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe08a).multiplyScalar(2.4), toneMapped: false }); const a = new THREE.Mesh(new THREE.OctahedronGeometry(s2, 0).scale(1, 1.6, 0.5), m), b = new THREE.Mesh(new THREE.OctahedronGeometry(s2, 0).scale(1.6, 1, 0.5), m); g.add(a, b); if (i % 4 === 0) { const rg = new THREE.Mesh(new THREE.TorusGeometry(s2 * 2, 0.06, 6, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe6c060).multiplyScalar(1.6), toneMapped: false })); rg.rotation.x = 1.2; g.add(rg); } const gl = glow(0xffe08a, s2 * 6, 0.6); g.add(gl); return g; });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(0xffe08a, Math.cos(a) * d, Math.sin(a) * d, 40 + rng() * 60, 7 + rng() * 6); }
    } else if (kind === 'angelico') {
      near(26, (i) => { const g = new THREE.Group(), s2 = 0.9 + rng() * 1.6; if (i % 3 === 0) { for (let k = 0; k < 4; k++) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, fog: false })); c.scale.set(s2 * 3, s2 * 2, 1); c.position.set((k - 1.5) * s2, (k % 2) * 0.3 * s2, k * 0.2); g.add(c); } } else if (i % 3 === 1) { for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s2, (1.4 - k * 0.12) * s2, 0.03), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, emissive: 0xa0a8d0, emissiveIntensity: 0.4 })); f.geometry.translate(0, 0.7 * s2, 0); f.rotation.z = sd * (0.5 + k * 0.25); g.add(f); } } else { const h = new THREE.Mesh(new THREE.TorusGeometry(0.6 * s2, 0.05 * s2, 6, 28).rotateX(1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd86b).multiplyScalar(2), toneMapped: false })); g.add(h); } const gl = glow(0xfff0c0, s2 * 3.5, 0.35); g.add(gl); return g; });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(0xfff0c0, Math.cos(a) * d, Math.sin(a) * d, 50 + rng() * 60, 9 + rng() * 6); }
    } else if (kind === 'animal') {
      const earth = new THREE.MeshStandardMaterial({ color: 0x6a4a22, roughness: 1, flatShading: true }), grass = new THREE.MeshStandardMaterial({ color: 0x6a7a2a, roughness: 1, flatShading: true });
      near(24, (i) => { const g = new THREE.Group(), s2 = 1 + rng() * 2; g.add(new THREE.Mesh(rockGeo(s2, rng), earth)); const top = new THREE.Mesh(new THREE.SphereGeometry(s2 * 0.95, 9, 5, 0, 6.28, 0, 1.2), grass); top.scale.y = 0.4; top.position.y = s2 * 0.3; g.add(top); if (i % 3 === 0) { for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(k % 2 ? 0xff7a2a : 0xffc040).multiplyScalar(1.6), toneMapped: false })); f.position.set((rng() - 0.5) * s2, s2 * 0.5, (rng() - 0.5) * s2); g.add(f); } } return g; });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(0xffb050, Math.cos(a) * d, Math.sin(a) * d, 36 + rng() * 40, 8 + rng() * 6); }
    } else if (kind === 'rockstar') {
      const vin = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.25, metalness: 0.5 });
      near(24, (i) => { const g = new THREE.Group(), s2 = 0.9 + rng() * 1.4; if (i % 3 === 0) { g.add(new THREE.Mesh(new THREE.CylinderGeometry(s2, s2, 0.08, 28), vin)); const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s2, 0.3 * s2, 0.09, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2b8a).multiplyScalar(1.6), toneMapped: false })); g.add(lb); } else if (i % 3 === 1) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.7 * s2, 0.7 * s2, 0.05, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe14a).multiplyScalar(1.8), toneMapped: false })); b.rotation.x = Math.PI / 2; g.add(b); } else { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.2 * s2, 1.6 * s2, 0.8 * s2), new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.7 })); g.add(sp); for (const dy of [0.35, -0.3]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s2, 0.3 * s2, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x4a4a56, roughness: 0.4, metalness: 0.7 })); c.rotation.x = Math.PI / 2; c.position.set(0, dy * s2, 0.42 * s2); g.add(c); } } const gl = glow(i % 2 ? 0xff2b8a : 0xffe14a, s2 * 3.5, 0.35); g.add(gl); return g; });
      for (let i = 0; i < 9; i++) { const a = rng() * Math.PI * 2, d = islandR + 38 + rng() * 120; pillar(i % 2 ? 0xff2b8a : 0xffe14a, Math.cos(a) * d, Math.sin(a) * d, 40 + rng() * 60, 6 + rng() * 6); }
    }
  }

  private buildPlanet(theme: SceneTheme, islandR: number, accent: number, rng: () => number) {
    const c = (x: number) => new THREE.Color(x);
    // sem chão: o planeta flutua no vazio
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()); this.ground.visible = false;
    this.islandShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()); this.islandShadow.visible = false;
    this.group.add(this.ground, this.islandShadow);

    // estrelas
    const N = 1100, sp = new Float32Array(N * 3), sc = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = rng() * Math.PI * 2, b = Math.acos(1 - rng() * 1.7), r = 1100;
      sp[i * 3] = Math.sin(b) * Math.cos(a) * r; sp[i * 3 + 1] = Math.cos(b) * r; sp[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r;
      const k = 0.35 + rng() * 0.65, warm = rng() < 0.2;
      sc[i * 3] = k * (warm ? 1 : 0.8); sc[i * 3 + 1] = k * (warm ? 0.85 : 0.95); sc[i * 3 + 2] = k * (warm ? 0.6 : 1);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 3.2, vertexColors: true, sizeAttenuation: false, fog: false, depthWrite: false, transparent: true, opacity: 0.9, toneMapped: false }));
    stars.frustumCulled = false; this.group.add(stars); this.stars = stars;

    // névoa baixa: camadas de bruma à volta do planeta
    const cm = (col: number, o: number) => new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: o, depthWrite: false, fog: false });
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(cm(i % 2 ? 0x3c5654 : 0x253538, 0.22));
      const a = rng() * Math.PI * 2, d = islandR * 1.2 + 6 + rng() * 60;
      s.position.set(Math.cos(a) * d, -islandR * 0.8 - 4 - rng() * 28, Math.sin(a) * d);
      s.scale.set(70 + rng() * 120, 18 + rng() * 22, 1);
      this.group.add(s); this.clouds.push(s);
    }

    // asteroides vizinhos, cada um com o seu adulto-peça
    const rock = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 1, flatShading: true });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a13a, emissive: 0x5a3c08, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.6 });
    const defs: [number, number, number, number, number][] = [[-26, 8, -34, 5.5, 0], [34, 14, -48, 7.5, 1], [-44, -8, -64, 6.5, 2], [12, 22, -86, 9, 3], [52, 2, -32, 4, 4]];
    for (const [x, y, z, r, k] of defs) {
      const g = new THREE.Group(); g.position.set(x, y, z);
      const geo = new THREE.IcosahedronGeometry(r, 1); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const kk = 1 + (rng() - 0.5) * 0.28; p.setXYZ(i, p.getX(i) * kk, p.getY(i) * kk * 0.9, p.getZ(i) * kk); }
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, rock));
      if (k === 0) { const cr = new THREE.Mesh(new THREE.ConeGeometry(r * 0.35, r * 0.4, 6), gold); cr.position.y = r * 1.05; g.add(cr); }
      if (k === 1) { const lamp = glowSprite(0xffc060, r * 1.8, 0.6); lamp.position.y = r * 1.5; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, r * 1.0, 6), rock); pole.position.y = r * 1.0; g.add(pole, lamp); }
      if (k === 2) { const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.26, r * 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 0.7 })); top.position.y = r * 1.3; g.add(top); }
      if (k === 3) { const bb = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 9, 7), new THREE.MeshStandardMaterial({ color: 0x24301f, roughness: 1, flatShading: true })); bb.scale.set(1.3, 0.5, 1.3); bb.position.y = r * 1.1; const tr = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.2, r * 0.9, 7), rock); tr.position.y = r * 0.8; g.add(tr, bb); }
      this.group.add(g); this.rocks.push({ g, base: g.position.clone(), ph: rng() * 6 });
    }

    // pirilampos dourados
    const M = 200, pos = new Float32Array(M * 3);
    for (let i = 0; i < M; i++) { pos[i * 3] = (rng() - 0.5) * (islandR * 2 + 20); pos[i * 3 + 1] = -3 + rng() * 14; pos[i * 3 + 2] = (rng() - 0.5) * (islandR * 2 + 20); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pm = new THREE.PointsMaterial({ map: glowTexture(), color: c(0xffd070).multiplyScalar(1.5), size: 0.3, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.motes = new THREE.Points(pg, pm);
    this.group.add(this.motes);
    void theme; void accent;
  }

  private makeElephant(theme: SceneTheme) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: mix(theme.ground2, 0x1a0f16, 0.7), roughness: 0.7 });
    const S = 2.5;
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat); body.scale.set(2.6, 1.5, 1.5); body.position.y = 11 * S / 2.2 + 2; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat); head.scale.set(1.1, 1.2, 1.1); head.position.set(3.1, body.position.y + 0.6, 0); g.add(head);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(3.9, body.position.y, 0), new THREE.Vector3(5.2, body.position.y - 1.6, 0), new THREE.Vector3(5.4, body.position.y - 3.6, 0), new THREE.Vector3(4.6, body.position.y - 5.4, 0)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.38, 8), mat));
    for (const z of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat); ear.scale.set(0.2, 1.1, 1); ear.position.set(2.7, head.position.y, z * 1.4); g.add(ear); }
    const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.2, 4), new THREE.MeshStandardMaterial({ color: 0xd6a85a, emissive: 0x6a4a18, roughness: 0.4, metalness: 0.5 }));
    obelisk.position.set(-0.4, body.position.y + 3.0, 0); g.add(obelisk);
    const legs: THREE.Object3D[] = [];
    const legH = body.position.y - 0.2;
    for (const [lx, lz] of [[1.5, 0.8], [1.5, -0.8], [-1.5, 0.8], [-1.5, -0.8]]) {
      const pivot = new THREE.Group(); pivot.position.set(lx, body.position.y - 0.6, lz);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, legH, 8), mat); leg.position.y = -legH / 2;
      pivot.add(leg); g.add(pivot); legs.push(pivot);
    }
    g.scale.setScalar(S);
    return { g, legs };
  }

  setDark(d: number) {
    const v = 1 - 0.78 * d;
    this.skyMat.uniforms.dark.value = v;
    for (const c of this.clocks) c.mat.uniforms.dark.value = v * this.dimBase;
    const gm = this.ground.material as THREE.MeshStandardMaterial;
    if (!this.groundTint) this.groundTint = gm.color.clone();
    gm.color.copy(this.groundTint).multiplyScalar(1 - 0.7 * d);
  }

  update(t: number, cam: THREE.Vector3) {
    this.sky.position.copy(cam);
    for (const f of this.worldAnim) f(t);
    this.islandShadow.position.x = 0; this.islandShadow.position.z = 0;
    this.mist.rotation.y = t * 0.012;
    if (this.stars) { this.stars.position.copy(cam); this.stars.rotation.y = t * 0.004; }
    for (const r of this.rocks) { r.g.position.y = r.base.y + Math.sin(t * 0.3 + r.ph) * 0.6; r.g.rotation.y = t * 0.03 + r.ph; }
    for (const c of this.clocks) {
      c.mat.uniforms.time.value = t + c.phase;
      c.mesh.position.y = c.base.y + Math.sin(t * 0.5 + c.phase) * 0.35;
      c.mesh.lookAt(cam.x, c.mesh.position.y + 2, cam.z);
      c.mesh.rotation.z += c.rot * 0.004;
    }
    for (const e of this.elephants) {
      e.ang += (e.speed * 0.02 * 90) / e.r;
      e.g.position.set(Math.cos(e.ang) * e.r, this.groundY, Math.sin(e.ang) * e.r);
      e.g.rotation.y = -e.ang - Math.PI / 2 + Math.PI;
      e.legs.forEach((l, i) => (l.rotation.z = Math.sin(t * 0.7 + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.2 : 0)) * 0.12));
      // sombra longa, a fugir do sol
      const sx = -this.sunDir.x, sz = -this.sunDir.z;
      const ang = Math.atan2(sx, sz);
      e.shadow.position.set(e.g.position.x + sx * 55, this.groundY + 0.2, e.g.position.z + sz * 55);
      e.shadow.rotation.set(-Math.PI / 2, 0, -ang);
    }
    for (const [i, c] of this.clouds.entries()) { c.position.x += 0.012 * (1 + (i % 4)); if (c.position.x > 900) c.position.x = -900; }
    this.cubes.forEach((m, i) => { m.rotation.x += 0.0016 * (i + 1); m.rotation.y += 0.0022; m.position.y += Math.sin(t * 0.4 + i) * 0.004; });
    const p = this.motes.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i) + 0.006 + (i % 5) * 0.001; if (y > 24) y = -5; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * 0.002); }
    p.needsUpdate = true;
  }

  dispose() { disposeTree(this.group); this.tex.forEach((x) => x.dispose()); }
}
