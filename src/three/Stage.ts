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
import { makeFlame, makePortal, Trail } from './actors';
import { rotCell } from '../core/mech';
import { makeUli, makeGuard, animateFlame } from './nightmare';
import { makeTitleGiant, TitleGiant } from './titlegiant';
import { OrbitTitle } from './orbit';
import { Weather, Mist } from './weather';
import type { Weather as WeatherMode } from '../worlds';
import { sfx } from '../core/audio';
import { mix, brandAt } from '../core/theme';
import { glowSprite, hdr, disposeTree } from './common';

export type ViewMode = 'follow' | 'overview';

const DPR_MAX = 2.25;

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
  private ringTrails: Trail[] = [];
  private targets: THREE.Group[] = [];
  private baseZoom = 1;
  sliding = 0;            // 1 enquanto o Uli desliza
  uliScale = 1;           // encolhe ao entrar num buraco de verme
  private slideCur = 0;
  private spin?: { l: number; from: number; player?: { x: number; y: number; dir: number }; guards: { G: Stage['guards'][number]; x: number; y: number }[]; roses: { c: number; g: THREE.Group }[] };
  private spinLift = 0;
  roses = new Map<number, THREE.Group>();
  orbs: { m: THREE.Group; life: number; delay: number; base: THREE.Vector3 }[] = [];
  parts: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = [];

  guards: { g: THREE.Group; x: number; y: number; tx: number; ty: number; dir: number; walk: number; stun?: boolean }[] = [];
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
  /** vista do jogador: rodar, inclinar, aproximar e arrastar o mapa (alvo e valor suavizado) */
  private vw = { yaw: 0, pitch: 0, zoom: 1, px: 0, pz: 0 };
  private vc = { yaw: 0, pitch: 0, zoom: 1, px: 0, pz: 0 };
  private vVel = { yaw: 0 };
  private camLook = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private raf = 0;
  private titleAng = 0;
  private fx: ShaderPass;
  private dangerCur = 0;
  private pulseCur = 0;
  private fogBase = new THREE.Color();
  frames = 0;
  private ema = 1 / 60;
  private slow = 0;
  quality = 0;
  private planet = false;
  private giant?: TitleGiant;
  orbit?: OrbitTitle;
  private orbitCache?: OrbitTitle;
  /** 0..1: clarão do mergulho num planeta (para o ecrã inicial desenhar por cima) */
  onOrbitFlash?: (a: number) => void;
  private weather = new Weather();
  private mist = new Mist();
  private guardsArmed = false;
  private th: ReturnType<typeof themeFor> = { top: 0, mid: 0, horizon: 0, ground: 0, ground2: 0, sun: 0 };
  private fogNear = 90;
  private fogFar = 900;
  private prevP = new THREE.Vector3();
  private speed = 0;
  private walkT = 0;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_MAX));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.el = this.renderer.domElement;
    Object.assign(this.el.style, { position: 'fixed', left: '0', top: '0', zIndex: '0', display: 'none' });
    document.body.insertBefore(this.el, document.body.firstChild);

    const ext = this.renderer.extensions;
    const msaa = this.renderer.capabilities.isWebGL2 && (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'));
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: msaa ? 4 : 0 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.5, 1.5);
    // buffers de 8 bits no bloom: compatíveis com todas as GPUs/browsers móveis
    const b = this.bloom;
    for (const t of [b.renderTargetBright, ...b.renderTargetsHorizontal, ...b.renderTargetsVertical]) { t.texture.type = THREE.UnsignedByteType; t.dispose(); }
    this.composer.addPass(this.bloom);
    // grão, vinheta e aberração cromática: ar de filme sujo / punk
    this.fx = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, time: { value: 0 }, pulse: { value: 0 }, danger: { value: 0 }, grade: { value: 0 }, tilt: { value: 0 }, lift: { value: 0 }, res: { value: new THREE.Vector2(1 / 400, 1 / 700) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float pulse; uniform float danger; uniform float grade; uniform float tilt; uniform float lift; uniform vec2 res; varying vec2 vUv;
        vec3 smp(vec2 uv, vec2 bp){ vec3 a = texture2D(tDiffuse, uv).rgb * 0.36; a += texture2D(tDiffuse, uv + vec2(bp.x, 0.0)).rgb * 0.16; a += texture2D(tDiffuse, uv - vec2(bp.x, 0.0)).rgb * 0.16; a += texture2D(tDiffuse, uv + vec2(0.0, bp.y)).rgb * 0.16; a += texture2D(tDiffuse, uv - vec2(0.0, bp.y)).rgb * 0.16; return a; }
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          vec2 c = vUv - 0.5; float d = dot(c,c);
          vec2 off = c * (d * 0.005 + pulse * 0.01 + danger * 0.02);
          float bl = smoothstep(0.28, 0.52, abs(vUv.y - 0.5)) * tilt; vec2 bp = res * bl * 4.5;
          vec3 col = bl > 0.02 ? vec3(smp(vUv + off, bp).r, smp(vUv, bp).g, smp(vUv - off, bp).b) : vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
          vec3 nb = (texture2D(tDiffuse, vUv + vec2(res.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(res.x, 0.0)).rgb + texture2D(tDiffuse, vUv + vec2(0.0, res.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, res.y)).rgb) * 0.25;
          col = max(col + clamp(col - nb, -0.3, 0.3) * 0.7, 0.0);
          col = mix(col, max((col - 0.32) * 1.14 + 0.32, 0.0), smoothstep(0.05, 0.5, dot(col, vec3(0.333))));
          col += lift * (1.0 - smoothstep(0.0, 0.32, dot(col, vec3(0.333)))) * (col * 1.2 + 0.012);
          col *= 1.0 - smoothstep(0.2, 0.7, d) * (0.38 + 0.2 * grade);
          float lu = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col, vec3(lu), 0.4 * grade);
          col *= mix(vec3(1.0), vec3(0.93, 1.03, 1.02), grade);
          col = mix(col, col * col * 1.6, 0.25 * grade);
          col += vec3(0.55, 0.0, 0.06) * danger * smoothstep(0.08, 0.5, d) * (0.65 + 0.35 * sin(time * 0.6));
          col += (h(vUv * 900.0 + time) - 0.5) * 0.012;
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
    this.scene.add(this.uli, this.portal, this.trail.mesh, this.trail.dots, this.weather.group, this.mist.group);
  }

  // ───────────────────────── carregar um nível ─────────────────────────
  load(m: Maze, wd: WorldDef, seed: number, opts: { intro?: boolean } = {}) {
    this.clear();
    this.maze = m;
    const pal = wd.pal;
    const theme = themeFor(wd.id, pal);
    this.planet = !!wd.planet;
    this.island = buildIsland(m, pal, seed, this.planet, wd.look);
    this.scenery = new Scenery(theme, this.island.radius, pal.accent, m.cols / 2, m.rows / 2);
    this.scene.add(this.island.group, this.scenery.group);
    this.fogBase.set(theme.horizon);
    this.mist.setColor(new THREE.Color(theme.horizon).lerp(new THREE.Color(0xffffff), 0.3).multiplyScalar(0.8));
    this.fogNear = Math.max(36, (theme.fogNear ?? 90) * 2.4); this.fogFar = Math.max(180, (theme.fogFar ?? 900) * 1.5);
    this.scene.fog = new THREE.Fog(theme.horizon, this.fogNear, this.fogFar);
    this.th = theme;
    this.fx.uniforms.grade.value = theme.grade ?? 0;
    this.fx.uniforms.lift.value = 0.34; // levanta as sombras: o labirinto vê-se mesmo nos mundos noturnos
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
    this.ringTrails = [];
    this.spin = undefined; this.spinLift = 0;
    if (m.rings) for (let l = 1; l <= m.rings.n; l++) { const tr = new Trail(); this.ringTrails[l] = tr; this.island.layers![l].add(tr.mesh, tr.dots); }
    this.island.lava?.set(0, true);
    this.island.fx?.set?.(0, true);
    this.uliScale = 1;
    const portalPos = this.island.cellPos(m.exit);
    this.portal.position.copy(portalPos);
    this.tintPortal(this.planet);
    const accent = pal.accent;
    for (const ri of m.rosas) {
      const r = makeFlame(accent);
      r.position.copy(this.island.cellPos(ri));
      this.scene.add(r); this.roses.set(ri, r);
    }
    this.player.x = (m.start % m.cols) + 0.5; this.player.y = ((m.start / m.cols) | 0) + 0.5;
    this.player.h = 0; this.player.dir = 0;
    this.view = 'follow';
    // no gelo a câmara afasta-se um pouco, para se ver onde o deslize acaba
    this.baseZoom = m.mech === 'ice' ? 1.32 : 1; this.sliding = 0;
    this.vw = { yaw: 0, pitch: 0, zoom: this.baseZoom, px: 0, pz: 0 }; this.vc = { ...this.vw };
    this.setTargets([]);
    this.introT = opts.intro === false ? 1 : 0;
    this.celebrate = 0;
    this.darkTarget = this.dark = 0;
    this.scenery.setDark(0);
    this.setPhase(0, false);
    // câmara inicial
    this.placeCamera(0, true);
  }

  /** Ecrã inicial: o Sistema Uli (planetas-labirinto em órbita; sem labirinto de jogo). */
  loadOrbit(ids: string[], onSelect: (i: number) => void) {
    this.clear();
    this.maze = undefined;
    if (!this.orbitCache) this.orbitCache = new OrbitTitle(ids);
    this.orbit = this.orbitCache;
    this.orbit.onSelect = onSelect; this.orbit.reset();
    this.applyDpr();
    this.orbit.onFlash = (a) => this.onOrbitFlash?.(a);
    this.scene.add(this.orbit.group);
    this.scene.environment = null; this.scene.fog = null; this.scene.background = this.orbit.background;
    this.uli.visible = false; this.portal.visible = false; this.trail.mesh.visible = false; this.trail.dots.visible = false;
    this.hemi.intensity = 0; this.sun.intensity = 0; this.rim.intensity = 0; this.lamp.intensity = 0;
    this.fx.uniforms.grade.value = 0; this.fx.uniforms.lift.value = 0; this.fx.uniforms.danger.value = 0; this.renderer.toneMappingExposure = 1.15;
    this.view = 'follow';
  }
  private dropOrbit() {
    if (!this.orbit) return;
    this.scene.remove(this.orbit.group); this.orbit.onFlash = undefined; this.orbit.onSelect = undefined; this.orbit = undefined; // fica em cache
    this.scene.background = null;
    this.uli.visible = true; this.portal.visible = true; this.trail.mesh.visible = true; this.trail.dots.visible = true;
    this.camera.fov = 58; this.camera.updateProjectionMatrix();
  }
  orbitTap(nx: number, ny: number) { this.orbit?.tap(nx, ny, this.camera); }
  /** Mergulho no planeta: baixa a resolução para o voo ser fluido, mesmo em telemóveis modestos. */
  orbitDive(cb: () => void) {
    if (!this.orbit) { cb(); return; }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.sync(true);
    this.orbit.dive(cb);
  }

  private applyDpr() {
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(this.quality === 0 ? Math.min(dpr, DPR_MAX) : this.quality === 1 ? Math.min(dpr, 1.5) : this.quality === 2 ? Math.min(dpr, 1.25) : 1);
    this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.sync(true);
  }

  /** Saída: no asteroide é uma porta de luz quente; nos outros mundos, o gradiente de assinatura. */
  private tintPortal(warm: boolean) {
    const ch = this.portal.children as THREE.Mesh[];
    const cols = warm ? [0xfff0c8, 0xffc968, 0xffe6a8, 0xffd27a, 0xffb347] : [brandAt(0), brandAt(0.5), brandAt(1), 0xa46bff, 0xe02bc0];
    const ks = warm ? [2.2, 2.2, 2.2, 1.2, 1.6] : [2.4, 2.4, 2.4, 1.2, 1.6];
    for (let i = 0; i < 5; i++) { const mat = ch[i].material as THREE.MeshBasicMaterial; mat.color.copy(hdr(cols[i], ks[i])); }
  }

  private clear() {
    this.dropOrbit();
    for (const g of this.targets) this.scene.remove(g), disposeTree(g);
    this.targets = [];
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
    // nos anéis, o trilho pinta-se em coordenadas do anel de chegada, para rodar com ele
    const l = m.rings ? m.rings.layer[b] : 0;
    if (m.rings && l) { a = rotCell(m, a, -m.rings.rot[l]); b = rotCell(m, b, -m.rings.rot[l]); }
    const pa = I.cellPos(a), pb = I.cellPos(b);
    if (Math.abs(pa.x - pb.x) + Math.abs(pa.z - pb.z) > 1.5) return;   // saltos (arcos e buracos) não deixam trilho
    (this.ringTrails[l] ?? this.trail).add(pa.x, pa.z, pb.x, pb.z, k);
  }

  // ───────────────────────── mecânicas ─────────────────────────
  /** Lava: acende o que chegou ao seu passo e solta faíscas (poucas, para não pesar). */
  setLava(moves: number) {
    const fresh = this.island?.lava?.set(moves) ?? [];
    fresh.slice(0, 6).forEach((c) => { const p = this.island!.cellPos(c); this.burst(p.x, p.z, [0xff5a14, 0xffb040, 0xffe9a0], 7, 0.15); });
    if (fresh.length) this.shake(0.12);
  }
  /** Gelo: a Brasa derrete a célula numa poça que trava. */
  melt(cell: number) {
    this.island?.ice?.melt(cell);
    const p = this.island!.cellPos(cell);
    this.burst(p.x, p.z, [0xffffff, 0xcfeaff, 0xffa040], 26, 0.2);
  }
  frost(cell: number) { const p = this.island!.cellPos(cell); this.burst(p.x, p.z, [0xdff4ff, 0x9bd8ff], 3, 0.08); }
  setRingTarget(l: number) { this.island?.setRingTarget?.(l); }
  /** Maré e batida: acompanha o passo em que se está. */
  setHazard(moves: number) { this.island?.fx?.set?.(moves); }
  dropCloud(cell: number) { this.island?.fx?.drop?.(cell); const p = this.island!.cellPos(cell); this.burst(p.x, p.z, [0xffffff, 0xcfd8ff, 0x9ab8ff], 14, 0.1); }
  /** Salto entre arcos ou buracos: faíscas e a câmara vai direta ao destino. */
  warpBurst(cell: number, color: number) { const p = this.island!.cellPos(cell); this.burst(p.x, p.z, [color, 0xffffff, color], 18, 0.4); }
  /** Gelo: aros no chão que mostram onde vais parar em cada direção. */
  setTargets(cells: number[]) {
    while (this.targets.length < cells.length) {
      const g = new THREE.Group();
      // cores cheias (sem brilho HDR, que no gelo fica branco) e sem teste de profundidade: vê-se mesmo atrás de uma parede
      const mk = (a: number, b: number, color: number, op: number) => { const r = new THREE.Mesh(new THREE.RingGeometry(a, b, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, depthTest: false, toneMapped: false })); r.rotation.x = -Math.PI / 2; r.renderOrder = 3; return r; };
      g.add(mk(0, 0.34, 0x2a5fe0, 0.34), mk(0.28, 0.39, 0xc8179f, 0.95), mk(0.07, 0.14, 0xc8179f, 0.95));
      this.targets.push(g); this.scene.add(g);
    }
    this.targets.forEach((g, i) => { g.visible = i < cells.length; if (g.visible) { this.island!.cellPos(cells[i], g.position); g.position.y = 0.12; } });
  }

  /** Anéis: começa a rodar a camada l; tudo o que está em cima dela viaja junto. */
  beginSpin(l: number) {
    const m = this.maze!, R = m.rings!;
    const inL = (gx: number, gy: number) => R.layer[Math.floor(gy) * m.cols + Math.floor(gx)] === l;
    this.spin = {
      l, from: R.rot[l],
      player: inL(this.player.x, this.player.y) ? { x: this.player.x, y: this.player.y, dir: this.player.dir } : undefined,
      guards: this.guards.filter((G) => inL(G.tx, G.ty)).map((G) => ({ G, x: G.tx, y: G.ty })),
      roses: [...this.roses].filter(([c]) => R.layer[c] === l).map(([c, g]) => ({ c, g })),
    };
  }
  /** a: 0..1 de um quarto de volta (sentido dos ponteiros). */
  spinStep(a: number) {
    const S = this.spin; if (!S) return;
    const m = this.maze!, half = m.cols / 2, th = (a * Math.PI) / 2, c = Math.cos(th), s = Math.sin(th);
    const rot = (x: number, y: number) => ({ x: half + (x - half) * c - (y - half) * s, y: half + (x - half) * s + (y - half) * c });
    const lift = Math.max(0, Math.sin(a * Math.PI)) * 0.16;
    const layer = this.island!.layers![S.l];
    layer.rotation.y = -(S.from + a) * (Math.PI / 2); layer.position.y = lift;
    if (S.player) { const p = rot(S.player.x, S.player.y); this.player.x = p.x; this.player.y = p.y; this.player.dir = S.player.dir - th; }
    this.spinLift = S.player ? lift : 0;
    for (const g of S.guards) { const p = rot(g.x, g.y); g.G.x = g.G.tx = p.x; g.G.y = g.G.ty = p.y; }
    for (const r of S.roses) { const p = rot((r.c % m.cols) + 0.5, ((r.c / m.cols) | 0) + 0.5); this.island!.gridPos(p.x, p.y, r.g.position); r.g.position.y = lift; }
  }
  endSpin(map: (c: number) => number) {
    const S = this.spin; if (!S) return;
    this.spinStep(1);
    for (const r of S.roses) this.roses.delete(r.c);
    for (const r of S.roses) { const to = map(r.c); this.roses.set(to, r.g); this.island!.cellPos(to, r.g.position); }
    const snapC = (v: number) => Math.floor(v) + 0.5;
    this.player.x = snapC(this.player.x); this.player.y = snapC(this.player.y);
    for (const g of S.guards) { g.G.x = g.G.tx = snapC(g.G.x); g.G.y = g.G.ty = snapC(g.G.y); }
    this.island!.layers![S.l].position.y = 0; this.spinLift = 0; this.spin = undefined;
  }

  setGuards(cells: number[], style = 0) {
    for (const G of this.guards) this.scene.remove(G.g), disposeTree(G.g);
    this.guards = cells.map((c, gi) => {
      const g = makeGuard(gi, style);
      const x = (c % this.maze!.cols) + 0.5, y = ((c / this.maze!.cols) | 0) + 0.5;
      this.scene.add(g);
      return { g, x, y, tx: x, ty: y, dir: 0, walk: Math.random() * 6 };
    });
  }
  /** Guarda ofuscado pela luz do Vagalume: pára, baixa a cabeça e brilha em dourado. */
  setGuardStun(i: number, on: boolean) {
    const G = this.guards[i]; if (!G) return;
    G.stun = on;
    const sp = G.g.userData.glow as THREE.Sprite | undefined;
    if (sp) {
      const mat = sp.material as THREE.SpriteMaterial;
      if (G.g.userData.glowHex === undefined) G.g.userData.glowHex = mat.color.getHex();
      mat.color.setHex(on ? 0xffe9a0 : (G.g.userData.glowHex as number));
    }
  }
  moveGuard(i: number, cell: number) {
    const G = this.guards[i];
    G.tx = (cell % this.maze!.cols) + 0.5; G.ty = ((cell / this.maze!.cols) | 0) + 0.5;
    if (Math.hypot(G.tx - G.x, G.ty - G.y) > 1.6) { this.warpBurst(cell, 0xff3040); G.x = G.tx; G.y = G.ty; }   // passou por um arco
  }

  removeRose(idx: number) {
    const r = this.roses.get(idx);
    if (!r) return;
    this.roses.delete(idx);
    this.burst(r.position.x, r.position.z, [0xff8a2a, 0xffc457, 0xffffff]);
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

  setWeather(mode: WeatherMode) { this.weather.set(mode); }
  setGuardsArmed(a: boolean) { this.guardsArmed = a; }
  setDark(radiusCells: number) { this.darkTarget = radiusCells > 0 ? 1 : 0; if (radiusCells > 0) this.darkR = radiusCells; }
  shake(s = 0.35) { this.shakeT = s; }
  setView(v: ViewMode) { this.view = v; }
  /** Gesto no mapa: dyaw/dpitch em radianos, zoom multiplicativo, pan em unidades do ecrã (frações). */
  camGesture(g: { yaw?: number; pitch?: number; zoom?: number; panX?: number; panY?: number }) {
    const w = this.vw;
    if (g.yaw) { const y = Math.max(-0.3, Math.min(0.3, g.yaw)); w.yaw += y; this.vVel.yaw = this.vVel.yaw * 0.6 + y * 0.4; }
    if (g.pitch) w.pitch = Math.max(-0.5, Math.min(0.75, w.pitch + g.pitch));
    if (g.zoom) w.zoom = Math.max(0.55, Math.min(1.9, w.zoom * g.zoom));
    if (g.panX || g.panY) {
      const R = (this.island?.radius ?? 8) + 1;
      const k = 10 * w.zoom;   // unidades do mundo por ecrã inteiro
      const c = Math.cos(this.vc.yaw), s = Math.sin(this.vc.yaw);
      // pan em coordenadas do ecrã → mundo (acompanha a rotação)
      const dx = -(g.panX ?? 0) * k, dz = -(g.panY ?? 0) * k;
      w.px = Math.max(-R, Math.min(R, w.px + dx * c + dz * s)); w.pz = Math.max(-R, Math.min(R, w.pz - dx * s + dz * c));
    }
  }
  /** Ao largar o dedo, o giro continua um pouco e assenta num múltiplo de 90° se estiver perto. */
  camRelease() {
    const w = this.vw; w.yaw += Math.max(-0.5, Math.min(0.5, this.vVel.yaw * 5)); this.vVel.yaw = 0;
    const q = Math.round(w.yaw / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(w.yaw - q) < 0.42) w.yaw = q;
  }
  /** Volta a centrar na personagem, com a vista normal. */
  camRecenter() { this.vw = { yaw: 0, pitch: 0, zoom: this.baseZoom, px: 0, pz: 0 }; this.vVel.yaw = 0; }
  /** 0 = vista normal; maior = mais afastada do normal (para mostrar a dica de recentrar). */
  get camOffset() { const w = this.vw; return Math.abs(w.yaw) + Math.abs(w.pitch) * 2 + Math.abs(w.zoom - this.baseZoom) * 2 + Math.hypot(w.px, w.pz) * 0.3; }
  get camYaw() { return this.vc.yaw; }
  /** Quarto de volta (0..3) em que está a vista: o joystick roda com ela. */
  get camQuarter() { return (((-Math.round(this.vw.yaw / (Math.PI / 2))) % 4) + 4) % 4; }
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
    if (mode === 'title') this.placeCamera(0, true);
    this.sun.castShadow = mode !== 'title' && this.quality < 2;
    this.fx.uniforms.tilt.value = mode === 'title' || this.quality >= 2 ? 0 : 0.12;
    this.weather.visible = mode !== 'title' && this.quality < 3;
    this.mist.group.visible = mode !== 'title';
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
    this.fx.uniforms.res.value.set(1 / (r.width * this.renderer.getPixelRatio()), 1 / (r.height * this.renderer.getPixelRatio()));
    this.weather.setPx(this.renderer.getPixelRatio());
    this.camera.aspect = r.width / Math.max(1, r.height);
    this.camera.updateProjectionMatrix();
  }

  /** Qualidade adaptativa: se o telemóvel não aguenta, baixa a resolução, depois o bloom e as sombras. Só desce. */
  private adapt(dt: number) {
    if (this.frames < 90 || this.quality >= 3) return;
    this.ema += (dt - this.ema) * 0.06;
    this.slow = this.ema > 1 / 34 ? this.slow + 1 : 0;
    if (this.slow < 100) return;
    this.slow = 0; this.quality++;
    const dpr = window.devicePixelRatio || 1;
    if (this.quality === 1) this.renderer.setPixelRatio(Math.min(dpr, 1.5));
    else if (this.quality === 2) { this.renderer.setPixelRatio(Math.min(dpr, 1.25)); this.bloom.enabled = false; this.sun.castShadow = false; this.fx.uniforms.tilt.value = 0; }
    else { this.renderer.setPixelRatio(1); this.weather.visible = false; }
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.sync(true);
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.frames++;
    this.adapt(dt);
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
      want.set(Math.sin(this.titleAng * 0.8) * d * 0.2, R * 1.0, d);
      look.set(0, R * 0.74, 0);
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
    if (this.mode === 'game') {
      const v = this.vc, w = this.vw, a = snap ? 1 : 1 - Math.exp(-dt * 11);
      v.yaw += (w.yaw - v.yaw) * a; v.pitch += (w.pitch - v.pitch) * a; v.zoom += (w.zoom - v.zoom) * a; v.px += (w.px - v.px) * a; v.pz += (w.pz - v.pz) * a;
      const off = this.tmp.copy(want).sub(look), r = off.length() * v.zoom;
      let az = Math.atan2(off.x, off.z) + v.yaw, el = Math.asin(Math.min(1, Math.max(-1, off.y / Math.max(0.001, off.length())))) + v.pitch;
      el = Math.max(0.3, Math.min(1.5, el));
      look.x += v.px; look.z += v.pz;
      want.set(look.x + r * Math.cos(el) * Math.sin(az), look.y + r * Math.sin(el), look.z + r * Math.cos(el) * Math.cos(az));
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

  private stepOrbit(dt: number) {
    const pulse = sfx.pulse();
    this.pulseCur += (pulse - this.pulseCur) * 0.6;
    this.fx.uniforms.pulse.value = this.pulseCur;
    this.fx.uniforms.time.value += dt;
    this.bloom.strength = 0.55 + 0.4 * this.pulseCur;
    this.orbit!.update(dt, this.camera, this.pulseCur);
  }

  private step(dt: number) {
    if (this.orbit) { this.stepOrbit(dt); return; }
    if (!this.island || !this.scenery) return;
    const I = this.island;
    if (this.introT < 1) this.introT = Math.min(1, this.introT + dt / 2.6);
    I.update(dt, this.t);
    if (this.giant) this.giant.update(this.t, this.worldPlayer(new THREE.Vector3()).setY(0.4));
    this.placeCamera(dt);
    this.scenery.update(this.t, this.camera.position);
    this.weather.update(this.t, this.camLook);
    this.mist.update(this.t, this.camLook, 0.25 + 0.75 * this.dark);

    // jogador
    const wp = this.worldPlayer(this.tmp);
    this.uli.position.set(wp.x, this.spinLift, wp.z);
    this.uli.scale.setScalar(this.uliScale);
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
    // a deslizar: inclina-se para a frente, de braços abertos
    this.slideCur += (this.sliding - this.slideCur) * (1 - Math.exp(-dt * 14));
    body.rotation.x = this.slideCur * 0.34;
    if (this.slideCur > 0.02 && !celeb) { (U.armL as THREE.Object3D).rotation.z = 0.08 - this.slideCur * 1.35; (U.armR as THREE.Object3D).rotation.z = -0.08 + this.slideCur * 1.35; }
    this.targets.forEach((g, i) => { if (g.visible) { g.scale.setScalar(1 + 0.12 * Math.sin(this.t * 5 + i)); g.rotation.y += dt; } });
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
      if (U.glow) (U.glow as THREE.Sprite).material.opacity = G.stun ? 0.95 : this.guardsArmed ? 0.55 + 0.2 * Math.sin(this.t * 14) : 0.3;
      const hd = U.head as THREE.Object3D; hd.rotation.x += ((G.stun ? 0.55 : 0) - hd.rotation.x) * (1 - Math.exp(-dt * 8));
      if (G.stun) hd.rotation.y = 0;
      const dist = Math.hypot(G.x - this.player.x, G.y - this.player.y);
      if (!G.stun) danger = Math.max(danger, Math.max(0, 1 - dist / 4.5));
    }
    this.dangerCur += (danger - this.dangerCur) * (1 - Math.exp(-dt * 6));
    this.fx.uniforms.danger.value = this.dangerCur;
    // ritmo: o bumbo faz a imagem, o neon e a câmara pulsarem
    const pulse = sfx.pulse();
    this.pulseCur += (pulse - this.pulseCur) * 0.6;
    this.bloom.strength = 0.4 + 0.5 * this.pulseCur + this.dangerCur * 0.3;
    this.fx.uniforms.pulse.value = this.pulseCur;
    const fov = 58 - 1.6 * this.pulseCur;
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    I.pulse(this.pulseCur);

    // roses e portal
    for (const [i, r] of this.roses) {
      const b = r.userData.body as THREE.Group;
      // viradas para quem as vê, com os olhos postos no Uli; pulam de alegria quando ele se aproxima
      const near = Math.max(0, 1 - Math.hypot(wp.x - r.position.x, wp.z - r.position.z) / 2.4);
      b.rotation.y = Math.atan2(this.camera.position.x - r.position.x, this.camera.position.z - r.position.z);
      b.position.y = 0.45 + Math.sin(this.t * 2 + i) * 0.07 + Math.abs(Math.sin(this.t * 7 + i)) * 0.12 * near;
      const eyes = r.userData.eyes as THREE.Group | undefined;
      if (eyes) {
        const c = Math.cos(b.rotation.y), s = Math.sin(b.rotation.y), dx = wp.x - r.position.x, dz = wp.z - r.position.z, dl = Math.max(0.6, Math.hypot(dx, dz));
        eyes.position.x = ((dx * c - dz * s) / dl) * 0.024; eyes.position.y = -((dx * s + dz * c) / dl) * 0.012;
        const blink = ((this.t + i * 1.37) % 3.1) > 2.95 ? 0.12 : 1;
        for (const l of r.userData.lids as THREE.Group[]) l.scale.y = blink * (1 + 0.18 * near);
      }
      const fl = r.userData.flame as THREE.Group | undefined;
      if (fl) fl.scale.set(1 + 0.07 * Math.sin(this.t * 11 + i * 2), 1 + 0.12 * Math.sin(this.t * 8.3 + i) + 0.05 * Math.sin(this.t * 17 + i), 1 + 0.07 * Math.cos(this.t * 9 + i));
    }
    const rings = this.portal.userData.rings as THREE.Mesh[];
    rings.forEach((r, k) => { r.rotation.x += dt * (0.9 + k * 0.5); r.rotation.y += dt * (1.3 - k * 0.4); });
    this.portal.position.y = Math.sin(this.t * 1.6) * 0.04;
    this.portal.scale.setScalar(1 + (this.celebrate > 0 ? 0.35 * Math.sin(this.t * 6) * 0.3 + 0.35 : 0));

    // escuridão com lanterna (níveis de nevoeiro)
    this.dark += (this.darkTarget - this.dark) * (1 - Math.exp(-dt * 3));
    const d = this.dark;
    const T = this.th;
    this.sun.intensity = (T.sunI ?? 2.4) * (1 - 0.55 * d); this.rim.intensity = (T.rimI ?? 1.4) * (1 - 0.45 * d); this.hemi.intensity = (T.hemiI ?? 1.05) * 1.3 * (1 - 0.35 * d) + 0.18 * d;
    this.scene.environmentIntensity = 0.9 * (1 - 0.5 * d) + 0.15 * d;
    this.scenery.setDark(d);
    this.lamp.intensity = (T.lampI ?? 0.5) + d * 7.5;
    this.lamp.decay = 1.25;
    this.lamp.distance = (T.lampD ?? 3) + (this.darkR * 2.6) * d + 2 * (1 - d);
    this.scenery.skyMat.uniforms.dark.value = 1 - 0.5 * d;
    (this.scene.fog as THREE.Fog).near = this.fogNear * (1 - d) + 12 * d;
    (this.scene.fog as THREE.Fog).far = this.fogFar * (1 - d) + 80 * d;
    (this.scene.fog as THREE.Fog).color.copy(this.fogBase).multiplyScalar(1 - 0.72 * d);

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

if ((import.meta as any).env?.DEV) (window as any).__stage = stage;
