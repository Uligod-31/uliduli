import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Maze } from '../core/maze';
import { WorldDef } from '../worlds';
import { CharKind, CHAR_COLORS } from '../art/characters';
import { buildIsland } from './island';
import { themeFor } from './scenery';
import { Trail } from './actors';
import { buildPortrait } from './characters3d';
import { disposeTree, glowTexture } from './common';
import { noiseNormal } from './pbr';

/** Renderizador "fotográfico": miniaturas 3D (mundos, níveis, galeria) e retratos das personagens. */
class Snap {
  private r?: THREE.WebGLRenderer;
  private comp?: EffectComposer;
  private pass?: RenderPass;
  private bloom?: UnrealBloomPass;

  private init() {
    if (this.r) return;
    this.r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.r.setPixelRatio(1);
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.shadowMap.enabled = true;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.comp = new EffectComposer(this.r, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType }));
    this.pass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.7, 0.9);
    for (const t of [this.bloom.renderTargetBright, ...this.bloom.renderTargetsHorizontal, ...this.bloom.renderTargetsVertical]) { t.texture.type = THREE.UnsignedByteType; t.dispose(); }
    this.comp.addPass(this.pass); this.comp.addPass(this.bloom); this.comp.addPass(new OutputPass());
  }

  private shoot(scene: THREE.Scene, cam: THREE.PerspectiveCamera, w: number, h: number, round = 0): HTMLCanvasElement {
    this.init();
    const r = this.r!;
    r.setSize(w, h, false);
    this.comp!.setSize(w, h);
    this.pass!.scene = scene; this.pass!.camera = cam;
    this.comp!.render();
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const g = out.getContext('2d')!;
    if (round) {
      g.beginPath();
      g.roundRect(0, 0, w, h, round);
      g.clip();
    }
    g.drawImage(r.domElement, 0, 0);
    return out;
  }

  /** Ilha flutuante com o trilho do jogador, vista em perspetiva. */
  island(m: Maze, wd: WorldDef, seed: number, w: number, h: number, trail?: number[]): HTMLCanvasElement {
    const theme = themeFor(wd.id, wd.pal);
    const scene = new THREE.Scene();
    const bgc = document.createElement('canvas'); bgc.width = 4; bgc.height = 256;
    const gg = bgc.getContext('2d')!; const gr = gg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#' + new THREE.Color(theme.top).getHexString()); gr.addColorStop(0.55, '#' + new THREE.Color(theme.mid).getHexString()); gr.addColorStop(1, '#' + new THREE.Color(theme.horizon).getHexString());
    gg.fillStyle = gr; gg.fillRect(0, 0, 4, 256);
    const bg = new THREE.CanvasTexture(bgc); bg.colorSpace = THREE.SRGBColorSpace;
    scene.background = bg;
    const isl = buildIsland(m, wd.pal, seed, !!wd.planet, wd.look);
    scene.add(isl.group);
    scene.add(new THREE.HemisphereLight(theme.mid, theme.ground, 1.2));
    const sun = new THREE.DirectionalLight(0xffe2b0, 2.6);
    const R = isl.radius + 2;
    sun.position.set(-R, R * 1.7, R); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -R * 1.2; sun.shadow.camera.right = R * 1.2; sun.shadow.camera.top = R * 1.2; sun.shadow.camera.bottom = -R * 1.2; sun.shadow.camera.far = R * 6;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(theme.horizon, 1.2); rim.position.set(0, R * 0.6, -R * 2); scene.add(rim);
    const trailObj = new Trail();
    scene.add(trailObj.mesh, trailObj.dots);
    // percursos guardados de versões antigas (labirinto diferente) são ignorados
    const adj = (x: number, y: number) => { const dx = Math.abs((x % m.cols) - (y % m.cols)), dy = Math.abs(((x / m.cols) | 0) - ((y / m.cols) | 0)); return dx + dy === 1 && !m.solid[x] && !m.solid[y]; };
    // nos anéis o trilho vem em coordenadas de origem: só os saltos entre anéis é que se ignoram
    const tr = trail && (m.mech === 'rings' || m.warp || m.holes || !trail.some((c, k) => k > 0 && !adj(trail[k - 1], c))) ? trail : undefined;
    if (tr && tr.length > 1) for (let k = 1; k < tr.length; k++) { if (!adj(tr[k - 1], tr[k])) continue; const a = isl.cellPos(tr[k - 1]), b = isl.cellPos(tr[k]); trailObj.add(a.x, a.z, b.x, b.z, k); }
    const cam = new THREE.PerspectiveCamera(34, w / h, 0.1, 500);
    const d = R * (w / h < 1 ? 2.9 : 2.4);
    cam.position.set(d * 0.18, d * 0.78, d * 0.72);
    cam.lookAt(0, -0.8, 0);
    const out = this.shoot(scene, cam, w, h, 16);
    disposeTree(scene); bg.dispose(); trailObj.mesh.dispose(); trailObj.dots.dispose();
    return out;
  }

  /** Retrato 3D de uma personagem, com iluminação dramática. */
  portrait(kind: CharKind, w: number, h: number): HTMLCanvasElement {
    const accent = CHAR_COLORS[kind];
    const ln = true; // Pequenos Pesadelos: fundo sujo e luz fria
    const scene = new THREE.Scene();
    const bgc = document.createElement('canvas'); bgc.width = 256; bgc.height = 320;
    const g = bgc.getContext('2d')!;
    const rg = g.createRadialGradient(128, 150, 10, 128, 160, 260);
    rg.addColorStop(0, '#' + new THREE.Color(accent).multiplyScalar(ln ? 0.07 : 0.42).getHexString());
    rg.addColorStop(1, ln ? '#05080a' : '#0c0d12');
    g.fillStyle = rg; g.fillRect(0, 0, 256, 320);
    // chão de xadrez dalinesco ao fundo
    g.globalAlpha = 0.18;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#ffffff' : '#000000'; g.fillRect(x * 32, 250 + y * 0, 32, 0); }
    g.globalAlpha = 1;
    const bg = new THREE.CanvasTexture(bgc); bg.colorSpace = THREE.SRGBColorSpace;
    scene.background = bg;

    const { group, center, dist } = buildPortrait(kind);
    scene.add(group);
    // aspeto de ilustração: contorno de tinta + pele/tecido com relevo
    const inkMat = (th: number) => { const m = new THREE.MeshBasicMaterial({ color: 0x04050a, side: THREE.BackSide }); m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${th.toFixed(4)};`); }; return m; };
    const th = kind === 'uli' ? 0.006 : 0.022, ink = inkMat(th), hulls: THREE.Mesh[] = [];
    group.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh || me.userData.noInk) return;
      const mat = me.material as THREE.Material & { transparent?: boolean; isMeshStandardMaterial?: boolean };
      if (mat.isMeshStandardMaterial && !mat.transparent) { const st = mat as THREE.MeshStandardMaterial; if (!st.normalMap) { st.normalMap = noiseNormal(1.3); st.normalScale.set(0.7, 0.7); } if (me.geometry.attributes.normal) hulls.push(me); }
    });
    for (const me of hulls) { const hull = new THREE.Mesh(me.geometry, ink); hull.userData.noInk = true; me.add(hull); }
    scene.fog = new THREE.Fog(0x05080c, dist * 0.9, dist * 2.4);
    const dm = new Float32Array(90 * 3); for (let i = 0; i < 90; i++) { dm[i * 3] = (Math.random() - 0.5) * 9; dm[i * 3 + 1] = Math.random() * 6; dm[i * 3 + 2] = (Math.random() - 0.5) * 6; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dm, 3));
    scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ map: glowTexture(), color: 0xcfe0ff, size: 0.11, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    // plano de xadrez sob a personagem
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cg = cv.getContext('2d')!;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { cg.fillStyle = (x + y) % 2 ? '#2a2c33' : '#15161a'; cg.fillRect(x * 32, y * 32, 32, 32); }
    const ct = new THREE.CanvasTexture(cv); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(8, 8); ct.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.3, metalness: 0.4 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; floor.receiveShadow = true;
    scene.add(floor);

    scene.add(new THREE.HemisphereLight(ln ? 0x9db8b0 : 0xcfd8ff, ln ? 0x0a0f10 : 0x201830, ln ? 0.55 : 1.1));
    const key = new THREE.DirectionalLight(ln ? 0xd8e8dc : 0xfff0dc, ln ? 2.2 : 3.2); key.position.set(-4, 7, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 6; key.shadow.camera.bottom = -2; key.shadow.camera.far = 30;
    scene.add(key);
    const rim = new THREE.DirectionalLight(accent, ln ? 1.6 : 3.4); rim.position.set(5, 4, -5); scene.add(rim);
    const rim2 = new THREE.DirectionalLight(ln ? 0x5a7a74 : 0xff4fd8, ln ? 0.8 : 1.4); rim2.position.set(-6, 2, -4); scene.add(rim2);

    const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    cam.position.set(center.x + 0.8, center.y + 0.4, center.z + dist);
    cam.lookAt(center);
    const out = this.shoot(scene, cam, w, h, 40);
    disposeTree(scene); bg.dispose(); ct.dispose();
    return out;
  }
}

export const snap = new Snap();
