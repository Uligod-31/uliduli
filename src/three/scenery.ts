import * as THREE from 'three';
import { Pal, mix } from '../core/theme';
import { glowTexture, makeCheckerTexture, makeClockTexture, disposeTree } from './common';
import { mulberry32 } from '../core/rng';

export interface SceneTheme { top: number; mid: number; horizon: number; ground: number; ground2: number; sun: number }

/** Tema do céu/solo de cada mundo (Jardim: crepúsculo dalinesco ouro e verde-azulado). */
export function themeFor(id: string, pal: Pal): SceneTheme {
  if (id === 'jardim') return { top: 0x04202b, mid: 0x1c6c78, horizon: 0xffa35c, ground: 0xc7a374, ground2: 0x9c7a50, sun: 0xffd9a0 };
  return {
    top: mix(pal.bgBot, 0x000000, 0.2), mid: mix(pal.bgTop, pal.accent, 0.35), horizon: mix(pal.accent, 0xffffff, 0.25),
    ground: mix(pal.floorA, pal.accent, 0.3), ground2: mix(pal.floorB, pal.bgBot, 0.4), sun: mix(pal.accent, 0xffffff, 0.5),
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
  ground: THREE.Mesh;
  clocks: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; rot: number; base: THREE.Vector3; phase: number }[] = [];
  elephants: { g: THREE.Group; legs: THREE.Object3D[]; ang: number; speed: number; r: number; shadow: THREE.Mesh }[] = [];
  clouds: THREE.Sprite[] = [];
  motes: THREE.Points;
  islandShadow: THREE.Mesh;
  cubes: THREE.Mesh[] = [];
  readonly groundY = -34;
  sunDir = new THREE.Vector3(0.35, 0.16, -1).normalize();
  private tex: THREE.Texture[] = [];

  constructor(theme: SceneTheme, islandR: number, accent: number, hx: number, hz: number) {
    const rng = mulberry32(7);
    const c = (x: number) => new THREE.Color(x);

    // céu
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: c(theme.top) }, mid: { value: c(theme.mid) }, hor: { value: c(theme.horizon) }, sunCol: { value: c(theme.sun) }, sunDir: { value: this.sunDir }, dark: { value: 1 } },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), this.skyMat);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.group.add(this.sky);

    // plano de xadrez a fugir para o horizonte
    const chk = makeCheckerTexture('#' + c(theme.ground).getHexString(), '#' + c(theme.ground2).getHexString(), 8);
    chk.repeat.set(36, 36);
    this.tex.push(chk);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.95, metalness: 0 }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.position.y = this.groundY;
    this.ground.receiveShadow = false;
    this.group.add(this.ground);

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
        uniforms: { map: { value: clockTex }, time: { value: 0 }, size: { value: s }, droop: { value: 0.32 + (k % 3) * 0.12 }, dark: { value: 1 } },
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

    // sombra suave da ilha no chão
    this.islandShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    this.islandShadow.rotation.x = -Math.PI / 2; this.islandShadow.position.y = this.groundY + 0.15;
    this.islandShadow.scale.setScalar(islandR * 3.2);
    this.group.add(this.islandShadow);

    // cubos de xadrez flutuantes
    const ctex = makeCheckerTexture('#f4efe6', '#1a1a22', 4); this.tex.push(ctex);
    for (let i = 0; i < 4; i++) {
      const s = 2 + rng() * 3.2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({ map: ctex, roughness: 0.35, metalness: 0.2 }));
      const a = rng() * Math.PI * 2, d = islandR + 14 + rng() * 26;
      m.position.set(Math.cos(a) * d, -6 + rng() * 26, Math.sin(a) * d - 12);
      this.group.add(m); this.cubes.push(m);
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
    const v = 1 - 0.96 * d;
    this.skyMat.uniforms.dark.value = v;
    for (const c of this.clocks) c.mat.uniforms.dark.value = v;
    (this.ground.material as THREE.MeshStandardMaterial).color.setScalar(1 - 0.9 * d);
  }

  update(t: number, cam: THREE.Vector3) {
    this.sky.position.copy(cam);
    this.islandShadow.position.x = 0; this.islandShadow.position.z = 0;
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
