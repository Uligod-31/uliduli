import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Maze } from '../core/maze';
import { WorldDef } from '../worlds';
import { buildIsland, Island } from './island';
import { Scenery, themeFor } from './scenery';
import { makeRose, makePortal, Trail } from './actors';
import { makeUli, makeGuard, animateFlame } from './nightmare';
import { makeTitleGiant, TitleGiant } from './titlegiant';
import { sfx } from '../core/audio';
import { mix, brandAt } from '../core/theme';
import { glowSprite, hdr, disposeTree } from './common';

export type ViewMode = 'follow' | 'overview';

export class Stage {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(58, 9 / 16, 0.1, 4000);
  el: HTMLCanvasElement;

  hemi = new THREE.HemisphereLight(0xffffff, 0x886644, 1.05);
  sun = new THREE.DirectionalLight(0xffe2b0, 2.4);
  rim = new THREE.DirectionalLight(0xffa060, 1.4);
  lamp = new THREE.PointLight(0xffe8c0, 0.5, 6, 1.6);

  island?: Island;
  scenery?: Scenery;
  maze?: Maze;
  uli = makeUli();
  portal = makePortal();
  trail = new Trail();
  roses = new Map<number, THREE.Group>();
  orbs: { m: THREE.Group; life: number; delay: number; base: THREE.Vector3 }[] = [];
  parts: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = [];

  guards: { g: THREE.Group; x: number; y: number; tx: number; ty: number; dir: number; walk: number }[] = [];
  /** posição do jogador em unidades de grelha (células, fracionário), salto e direção */
  player = { x: 0, y: 0, h: 0, dir: 0 };
  view: ViewMode = 'follow';
  mode: 'off' | 'game' | 'title' = 'off';
  introT = 1;
  celebrate = 0;
  private dark = 0;
  private darkTarget = 0;
  private darkR = 4;
  private t = 0;
  private shakeT = 0;
  private last = 0;
  private w = 0;
  private h = 0;
  private camPos = new THREE.Vector3(0, 12, 10);
  private camLook = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private raf = 0;
  private titleAng = 0;
  private fx: ShaderPass;
  private dangerCur = 0;
  private pulseCur = 0;
  private fogBase = new THREE.Color();
  private planet = false;
  private giant?: TitleGiant;
  private th: ReturnType<typeof themeFor> = { top: 0, mid: 0, horizon: 0, ground: 0, ground2: 0, sun: 0 };
  private fogNear = 90;
  private fogFar = 900;
  private prevP = new THREE.Vector3();
  private speed = 0;
  private walkT = 0;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.el = this.renderer.domElement;
    Object.assign(this.el.style, { position: 'fixed', left: '0', top: '0', zIndex: '0', display: 'none' });
    document.body.insertBefore(this.el, document.body.firstChild);

    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 0 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.75, 0.9);
    // buffers de 8 bits no bloom: compatíveis com todas as GPUs/browsers móveis
    const b = this.bloom;
    for (const t of [b.renderTargetBright, ...b.renderTargetsHorizontal, ...b.renderTargetsVertical]) { t.texture.type = THREE.UnsignedByteType; t.dispose(); }
    this.composer.addPass(this.bloom);
    // grão, vinheta e aberração cromática: ar de filme sujo / punk
    this.fx = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, time: { value: 0 }, pulse: { value: 0 }, danger: { value: 0 }, grade: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float pulse; uniform float danger; uniform float grade; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          vec2 c = vUv - 0.5; float d = dot(c,c);
          vec2 off = c * (d * 0.028 + pulse * 0.012 + danger * 0.02);
          vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
          col *= 1.0 - smoothstep(0.12, 0.62, d) * (0.6 + 0.3 * grade);
          float lu = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col, vec3(lu), 0.4 * grade);
          col *= mix(vec3(1.0), vec3(0.93, 1.03, 1.02), grade);
          col = mix(col, col * col * 1.6, 0.25 * grade);
          col += vec3(0.55, 0.0, 0.06) * danger * smoothstep(0.08, 0.5, d) * (0.65 + 0.35 * sin(time * 0.6));
          col += (h(vUv * 900.0 + time) - 0.5) * 0.07;
          col *= 0.97 + 0.03 * sin(vUv.y * 900.0);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.composer.addPass(this.fx);
    this.composer.addPass(new OutputPass());

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sun, this.sun.target, this.rim, this.lamp);
    this.scene.add(this.uli, this.portal, this.trail.mesh, this.trail.dots);
  }

  // ───────────────────────── carregar um nível ─────────────────────────
  load(m: Maze, wd: WorldDef, seed: number, opts: { intro?: boolean } = {}) {
    this.clear();
    this.maze = m;
    const pal = wd.pal;
    const theme = themeFor(wd.id, pal);
    this.planet = !!wd.planet;
    this.island = buildIsland(m, pal, seed, this.planet);
    this.scenery = new Scenery(theme, this.island.radius, pal.accent, m.cols / 2, m.rows / 2);
    this.scene.add(this.island.group, this.scenery.group);
    this.fogBase.set(theme.horizon);
    this.fogNear = theme.fogNear ?? 90; this.fogFar = theme.fogFar ?? 900;
    this.scene.fog = new THREE.Fog(theme.horizon, this.fogNear, this.fogFar);
    this.th = theme;
    this.fx.uniforms.grade.value = theme.grade ?? 0;
    this.renderer.toneMappingExposure = theme.expo ?? 1.4;

    // luzes: sol-chave frontal-esquerda, contra-luz no horizonte
    this.hemi.color.set(mix(theme.mid, 0xffffff, 0.55)); this.hemi.groundColor.set(mix(theme.horizon, 0x553322, 0.4));
    this.sun.color.set(theme.sunC ?? 0xffe2b0);
    const R = this.island.radius + 3;
    this.sun.position.set(-R * 1.1, R * 1.6, R * 0.9);
    this.sun.target.position.set(0, 0, 0);
    const cam = this.sun.shadow.camera;
    cam.left = -R * 1.15; cam.right = R * 1.15; cam.top = R * 1.15; cam.bottom = -R * 1.15; cam.near = 1; cam.far = R * 6;
    cam.updateProjectionMatrix();
    this.rim.color.set(theme.horizon);
    this.rim.position.set(this.scenery.sunDir.x * 80, 22, this.scenery.sunDir.z * 80);

    // pré-filtrar o céu como mapa de ambiente (reflexos no chão e no orbe)
    const pm = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.add(this.scenery.sky.clone());
    this.scene.environment = pm.fromScene(envScene, 0.04).texture;
    this.scene.environmentIntensity = 0.9;
    pm.dispose();

    // atores
    this.trail.reset();
    const portalPos = this.island.cellPos(m.exit);
    this.portal.position.copy(portalPos);
    this.tintPortal(this.planet);
    const accent = pal.accent;
    for (const ri of m.rosas) {
      const r = makeRose(accent);
      r.position.copy(this.island.cellPos(ri));
      this.scene.add(r); this.roses.set(ri, r);
    }
    this.player.x = (m.start % m.cols) + 0.5; this.player.y = ((m.start / m.cols) | 0) + 0.5;
    this.player.h = 0; this.player.dir = 0;
    this.view = 'follow';
    this.introT = opts.intro === false ? 1 : 0;
    this.celebrate = 0;
    this.darkTarget = this.dark = 0;
    this.scenery.setDark(0);
    this.setPhase(0, false);
    // câmara inicial
    this.placeCamera(0, true);
  }

  /** Saída: no asteroide é uma porta de luz quente; nos outros mundos, o gradiente de assinatura. */
  private tintPortal(warm: boolean) {
    const ch = this.portal.children as THREE.Mesh[];
    const cols = warm ? [0xfff0c8, 0xffc968, 0xffe6a8, 0xffd27a, 0xffb347] : [brandAt(0), brandAt(0.5), brandAt(1), 0xa46bff, 0xe02bc0];
    const ks = warm ? [2.2, 2.2, 2.2, 1.2, 1.6] : [2.4, 2.4, 2.4, 1.2, 1.6];
    for (let i = 0; i < 5; i++) { const mat = ch[i].material as THREE.MeshBasicMaterial; mat.color.copy(hdr(cols[i], ks[i])); }
  }

  private clear() {
    for (const r of this.roses.values()) this.scene.remove(r), disposeTree(r);
    this.roses.clear();
    for (const o of this.orbs) this.scene.remove(o.m), disposeTree(o.m);
    this.orbs = [];
    for (const p of this.parts) this.scene.remove(p.m), disposeTree(p.m);
    this.parts = [];
    for (const G of this.guards) this.scene.remove(G.g), disposeTree(G.g);
    this.guards = [];
    if (this.island) { this.scene.remove(this.island.group); this.island.dispose(); this.island = undefined; }
    if (this.scenery) { this.scene.remove(this.scenery.group); this.scenery.dispose(); this.scenery = undefined; }
    if (this.scene.environment) { this.scene.environment.dispose(); this.scene.environment = null; }
  }

  // ───────────────────────── API do jogo ─────────────────────────
  setPhase(phase: number, animate: boolean) {
    if (!this.island || !this.maze) return;
    this.maze.dyn.forEach((e, k) => {
      const d = this.island!.dyn[k];
      d.closed = e.group === phase;
      d.target = d.closed ? 1 : 0;
      if (!animate) { d.cur = d.target; d.vel = 0; }
    });
  }

  addTrail(a: number, b: number, k: number) {
    const m = this.maze!, I = this.island!;
    const pa = I.cellPos(a), pb = I.cellPos(b);
    this.trail.add(pa.x, pa.z, pb.x, pb.z, k);
  }

  setGuards(cells: number[]) {
    for (const G of this.guards) this.scene.remove(G.g), disposeTree(G.g);
    this.guards = cells.map((c, gi) => {
      const g = makeGuard(gi);
      const x = (c % this.maze!.cols) + 0.5, y = ((c / this.maze!.cols) | 0) + 0.5;
      this.scene.add(g);
      return { g, x, y, tx: x, ty: y, dir: 0, walk: Math.random() * 6 };
    });
  }
  moveGuard(i: number, cell: number) {
    const G = this.guards[i];
    G.tx = (cell % this.maze!.cols) + 0.5; G.ty = ((cell / this.maze!.cols) | 0) + 0.5;
  }

  removeRose(idx: number) {
    const r = this.roses.get(idx);
    if (!r) return;
    this.roses.delete(idx);
    this.burst(r.position.x, r.position.z, [0xff3f9c, 0xff9ecb, 0xffffff]);
    this.scene.remove(r); disposeTree(r);
  }

  burst(wx: number, wz: number, colors: number[], n = 22, y = 0.5) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random() * 0.04, 8, 6), new THREE.MeshBasicMaterial({ color: hdr(colors[i % colors.length], 2), toneMapped: false, transparent: true }));
      m.position.set(wx, y, wz);
      const a = Math.random() * Math.PI * 2, s = 1.2 + Math.random() * 2.6;
      this.parts.push({ m, v: new THREE.Vector3(Math.cos(a) * s, 2 + Math.random() * 3, Math.sin(a) * s), life: 1 });
      this.scene.add(m);
    }
  }

  hint(cells: number[]) {
    cells.forEach((ci, k) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({ color: hdr(0xffe9a0, 2.6), toneMapped: false })));
      g.add(glowSprite(0xffd45a, 0.7, 0.9));
      const base = this.island!.cellPos(ci); base.y = 0.45;
      g.position.copy(base); g.scale.setScalar(0.001);
      this.scene.add(g);
      this.orbs.push({ m: g, life: 2.6, delay: k * 0.11, base });
    });
  }

  setDark(radiusCells: number) { this.darkTarget = radiusCells > 0 ? 1 : 0; if (radiusCells > 0) this.darkR = radiusCells; }
  shake(s = 0.35) { this.shakeT = s; }
  setView(v: ViewMode) { this.view = v; }
  win() { this.celebrate = 1; this.view = 'overview'; this.setDark(0); }

  start(mode: 'game' | 'title') {
    this.mode = mode;
    if (mode === 'title' && !this.giant && this.island) {
      // um Crescido colossal debruçado sobre o planeta, de olhos acesos e mãos a agarrar o rebordo
      this.giant = makeTitleGiant(this.island.radius + 1.2);
      this.scene.add(this.giant.group);
    }
    if (mode !== 'title' && this.giant) this.dropGiant();
    this.el.style.display = 'block';
    this.sync(true);
    if (!this.raf) { this.last = performance.now(); this.loop(); }
  }
  private dropGiant() {
    if (!this.giant) return;
    this.scene.remove(this.giant.group); disposeTree(this.giant.group); this.giant = undefined;
  }
  stop() {
    this.mode = 'off';
    if (this.giant) this.dropGiant();
    this.el.style.display = 'none';
    cancelAnimationFrame(this.raf); this.raf = 0;
  }

  // ───────────────────────── ciclo ─────────────────────────
  private sync(force = false) {
    const pc = document.querySelector('#game canvas') as HTMLCanvasElement | null;
    if (!pc) return;
    const r = pc.getBoundingClientRect();
    if (!force && Math.abs(r.width - this.w) < 0.5 && Math.abs(r.height - this.h) < 0.5) return;
    this.w = r.width; this.h = r.height;
    const s = this.el.style;
    s.left = `${r.left}px`; s.top = `${r.top}px`; s.width = `${r.width}px`; s.height = `${r.height}px`;
    this.renderer.setSize(r.width, r.height, false);
    this.composer.setSize(r.width, r.height);
    this.camera.aspect = r.width / Math.max(1, r.height);
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.fx.uniforms.time.value = (this.t * 37) % 100;
    this.sync();
    this.step(dt);
    this.composer.render();
  };

  private worldPlayer(out: THREE.Vector3) {
    return this.island!.gridPos(this.player.x, this.player.y, out);
  }

  private placeCamera(dt: number, snap = false) {
    if (!this.island) return;
    const R = this.island.radius + 2.5;
    const want = new THREE.Vector3(), look = new THREE.Vector3();
    const asp = this.camera.aspect;
    if (this.mode === 'title') {
      this.titleAng += dt * 0.11;
      const d = R * (asp < 1 ? 4.1 : 2.8);
      want.set(Math.sin(this.titleAng * 0.8) * d * 0.2, R * 1.05, d);
      look.set(0, R * 0.7, 0);
    } else if (this.view === 'overview') {
      const d = R * (asp < 1 ? 2.3 : 1.75);
      want.set(0, d * 0.82, d * 0.72);
      look.set(0, 0, 0);
      if (this.celebrate > 0) { this.titleAng += dt * 0.35; want.set(Math.sin(this.titleAng) * d * 0.5, d * 0.78, Math.cos(this.titleAng) * d * 0.72); }
    } else {
      const p = this.worldPlayer(this.tmp);
      const k = asp < 0.8 ? 0.74 : 0.62;
      const dist = (this.darkTarget ? 0.8 : 1) * k;
      const e = this.introT;
      const ease = e * e * (3 - 2 * e);
      const follow = new THREE.Vector3(p.x, 7.0 * dist, p.z + 7.6 * dist);
      const ovD = R * (asp < 1 ? 2.3 : 1.75);
      const ov = new THREE.Vector3(Math.sin((1 - ease) * 1.3) * ovD * 0.6, ovD * 0.82, Math.cos((1 - ease) * 1.3) * ovD * 0.72);
      want.copy(ov).lerp(follow, ease);
      look.set(0, 0, 0).lerp(this.tmp.set(p.x, 0.2, p.z + 1.2), ease);
    }
    if (snap) { this.camPos.copy(want); this.camLook.copy(look); }
    else {
      const f = 1 - Math.exp(-dt * (this.view === 'follow' && this.mode === 'game' ? 5 : 2.4));
      this.camPos.lerp(want, f); this.camLook.lerp(look, f);
    }
    this.camera.position.copy(this.camPos);
    this.camera.position.x += Math.sin(this.t * 0.45) * 0.1;
    this.camera.position.y += Math.sin(this.t * 0.37) * 0.06;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeT * 0.5;
      this.camera.position.x += (Math.random() - 0.5) * s; this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.camLook);
  }

  private step(dt: number) {
    if (!this.island || !this.scenery) return;
    const I = this.island;
    if (this.introT < 1) this.introT = Math.min(1, this.introT + dt / 2.6);
    I.update(dt, this.t);
    if (this.giant) this.giant.update(this.t, this.worldPlayer(new THREE.Vector3()).setY(0.4));
    this.placeCamera(dt);
    this.scenery.update(this.t, this.camera.position);

    // jogador
    const wp = this.worldPlayer(this.tmp);
    this.uli.position.set(wp.x, 0, wp.z);
    const body = this.uli.userData.body as THREE.Group;
    // marcha: velocidade a partir do deslocamento
    const spd = dt > 0 ? Math.hypot(wp.x - this.prevP.x, wp.z - this.prevP.z) / dt : 0;
    this.prevP.set(wp.x, 0, wp.z);
    this.speed += (Math.min(1, spd / 6) - this.speed) * (1 - Math.exp(-dt * 12));
    this.walkT += dt * (6 + this.speed * 10);
    const sw = Math.sin(this.walkT) * 0.85 * this.speed;
    const U = this.uli.userData;
    body.position.y = Math.abs(Math.sin(this.walkT)) * 0.05 * this.speed + Math.sin(this.t * 2.4) * 0.008 * (1 - this.speed);
    (U.legL as THREE.Object3D).rotation.x = sw;
    (U.legR as THREE.Object3D).rotation.x = -sw;
    (U.armL as THREE.Object3D).rotation.x = -sw * 0.9 + Math.sin(this.t * 1.7) * 0.05;
    (U.armR as THREE.Object3D).rotation.x = sw * 0.9 - Math.sin(this.t * 1.7) * 0.05;
    (U.armL as THREE.Object3D).rotation.z = 0.08; (U.armR as THREE.Object3D).rotation.z = -0.08;
    const celeb = this.celebrate > 0;
    if (celeb) { (U.armL as THREE.Object3D).rotation.z = 2.6 + Math.sin(this.t * 9) * 0.3; (U.armR as THREE.Object3D).rotation.z = -2.6 - Math.sin(this.t * 9) * 0.3; (U.armL as THREE.Object3D).rotation.x = 0; (U.armR as THREE.Object3D).rotation.x = 0; body.position.y = Math.abs(Math.sin(this.t * 6)) * 0.12; }
    (U.head as THREE.Object3D).rotation.z = Math.sin(this.t * 1.3) * 0.04;
    animateFlame(U.head as THREE.Object3D, this.t, this.speed, Math.sin(this.walkT * 0.5) * 0.15 * this.speed, celeb ? 1 : Math.min(1, this.player.h));
    // cachecol neon a flutuar atrás
    (U.scarf as THREE.Mesh[]).forEach((s, i) => {
      const lift = this.speed * 0.05 * i;
      s.position.set(Math.sin(this.t * 5 - i * 0.9) * 0.03 * (0.4 + this.speed), 0.5 + lift + Math.sin(this.t * 6.5 - i * 0.7) * 0.03, -0.1 - i * 0.085);
      s.rotation.z = Math.sin(this.t * 5 - i * 0.9) * 0.3; s.rotation.x = -0.15 * this.speed;
    });
    let da = this.player.dir - this.uli.rotation.y;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    this.uli.rotation.y += da * (1 - Math.exp(-dt * 14));
    (this.uli.userData.shadow as THREE.Mesh).scale.setScalar(1 - Math.min(1, this.player.h) * 0.25);
    this.lamp.position.set(wp.x, 1.4, wp.z);

    // Espadas: deslizam até à nova casa, viram-se para onde vão
    let danger = 0;
    for (const G of this.guards) {
      const f = 1 - Math.exp(-dt * 9);
      const dx = G.tx - G.x, dy = G.ty - G.y;
      G.x += dx * f; G.y += dy * f;
      const moving = Math.hypot(dx, dy) > 0.05;
      if (moving) { const a = Math.atan2(dx, dy); let da = a - G.dir; da = Math.atan2(Math.sin(da), Math.cos(da)); G.dir += da * (1 - Math.exp(-dt * 14)); G.walk += dt * 11; }
      const gp = I.gridPos(G.x, G.y, new THREE.Vector3());
      G.g.position.set(gp.x, 0, gp.z); G.g.rotation.y = G.dir;
      const U = G.g.userData, sw = moving ? Math.sin(G.walk) * 0.7 : 0;
      (U.body as THREE.Object3D).position.y = moving ? Math.abs(Math.sin(G.walk)) * 0.04 : Math.sin(this.t * 2 + G.walk) * 0.01;
      (U.legL as THREE.Object3D).rotation.x = sw; (U.legR as THREE.Object3D).rotation.x = -sw;
      (U.armL as THREE.Object3D).rotation.x = -sw * 0.8; (U.armR as THREE.Object3D).rotation.x = sw * 0.8;
      (U.head as THREE.Object3D).rotation.y = Math.sin(this.t * 1.2 + G.walk) * 0.4;
      const dist = Math.hypot(G.x - this.player.x, G.y - this.player.y);
      danger = Math.max(danger, Math.max(0, 1 - dist / 4.5));
    }
    this.dangerCur += (danger - this.dangerCur) * (1 - Math.exp(-dt * 6));
    this.fx.uniforms.danger.value = this.dangerCur;
    // ritmo: o bumbo faz a imagem, o neon e a câmara pulsarem
    const pulse = sfx.pulse();
    this.pulseCur += (pulse - this.pulseCur) * 0.6;
    this.bloom.strength = 0.62 + 0.5 * this.pulseCur + this.dangerCur * 0.3;
    this.fx.uniforms.pulse.value = this.pulseCur;
    const fov = 58 - 1.6 * this.pulseCur;
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    I.pulse(this.pulseCur);

    // roses e portal
    for (const [i, r] of this.roses) {
      const b = r.userData.body as THREE.Group;
      b.rotation.y += dt * 1.3; b.position.y = 0.45 + Math.sin(this.t * 2 + i) * 0.07;
    }
    const rings = this.portal.userData.rings as THREE.Mesh[];
    rings.forEach((r, k) => { r.rotation.x += dt * (0.9 + k * 0.5); r.rotation.y += dt * (1.3 - k * 0.4); });
    this.portal.position.y = Math.sin(this.t * 1.6) * 0.04;
    this.portal.scale.setScalar(1 + (this.celebrate > 0 ? 0.35 * Math.sin(this.t * 6) * 0.3 + 0.35 : 0));

    // escuridão com lanterna (níveis de nevoeiro)
    this.dark += (this.darkTarget - this.dark) * (1 - Math.exp(-dt * 3));
    const d = this.dark;
    const T = this.th;
    this.sun.intensity = (T.sunI ?? 2.4) * (1 - d); this.rim.intensity = (T.rimI ?? 1.4) * (1 - d); this.hemi.intensity = (T.hemiI ?? 1.05) * (1 - d) + 0.03 * d;
    this.scene.environmentIntensity = 0.9 * (1 - d) + 0.04 * d;
    this.scenery.setDark(d);
    this.lamp.intensity = (T.lampI ?? 0.5) + d * 13;
    this.lamp.distance = (T.lampD ?? 3) + (this.darkR * 1.15) * d + 2 * (1 - d);
    this.scenery.skyMat.uniforms.dark.value = 1 - 0.97 * d;
    (this.scene.fog as THREE.Fog).near = this.fogNear * (1 - d) + 10 * d;
    (this.scene.fog as THREE.Fog).far = this.fogFar * (1 - d) + 60 * d;
    (this.scene.fog as THREE.Fog).color.copy(this.fogBase).multiplyScalar(1 - 0.96 * d);

    // orbes de pista
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      if (o.delay > 0) { o.delay -= dt; continue; }
      o.life -= dt;
      const a = Math.min(1, (2.6 - o.life) * 4) * Math.min(1, o.life * 2);
      o.m.scale.setScalar(Math.max(0.001, a));
      o.m.position.y = o.base.y + Math.sin(this.t * 3 + i) * 0.08;
      if (o.life <= 0) { this.scene.remove(o.m); disposeTree(o.m); this.orbs.splice(i, 1); }
    }
    // partículas
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt * 1.1;
      p.v.y -= 9 * dt;
      p.m.position.addScaledVector(p.v, dt);
      (p.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life);
      if (p.life <= 0) { this.scene.remove(p.m); disposeTree(p.m); this.parts.splice(i, 1); }
    }
  }

  /** Mostra o mapa para um nível de título (sem lógica de jogo). */
  worldPos(i: number, out = new THREE.Vector3()) { return this.island!.cellPos(i, out); }
}

export const stage = new Stage();
