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
    const gm = this.ground.material as THREE.MeshStandardMaterial;
    const mk = (n: number, draw: (g: CanvasRenderingContext2D) => void, rep: number) => {
      const c = document.createElement('canvas'); c.width = c.height = n; draw(c.getContext('2d')!);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; this.tex.push(t); return t;
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
    (this.ground.material as THREE.MeshStandardMaterial).color.setScalar(1 - 0.7 * d);
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
