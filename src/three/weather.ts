import * as THREE from 'three';
import { Rain } from './rain';
import { glowTexture } from './common';
import type { Weather as WeatherMode } from '../worlds';

interface Preset { col: [number, number, number]; size: number; fall: number; dir: 1 | -1; drift: number; alpha: number; add: boolean; page: boolean }
const PRESETS: Record<string, Preset> = {
  snow: { col: [0.93, 0.97, 1], size: 6, fall: 0.07, dir: 1, drift: 1.6, alpha: 0.85, add: false, page: false },
  embers: { col: [1, 0.48, 0.14], size: 7, fall: 0.09, dir: -1, drift: 0.9, alpha: 1, add: true, page: false },
  ash: { col: [0.62, 0.62, 0.66], size: 6, fall: 0.045, dir: 1, drift: 1.2, alpha: 0.5, add: false, page: false },
  dust: { col: [1, 0.82, 0.5], size: 3.6, fall: 0.012, dir: 1, drift: 2.2, alpha: 0.5, add: true, page: false },
  fireflies: { col: [0.78, 1, 0.42], size: 3.2, fall: 0.012, dir: -1, drift: 3.2, alpha: 0.85, add: true, page: false },
  pages: { col: [0.96, 0.9, 0.72], size: 9, fall: 0.03, dir: 1, drift: 2.6, alpha: 0.6, add: false, page: true },
};

/** Clima: chuva em riscos, ou partículas (neve, brasas, cinza, pó, páginas) que acompanham a câmara. */
export class Weather {
  group = new THREE.Group();
  private rain = new Rain();
  private pts: THREE.Points;
  private mat: THREE.ShaderMaterial;

  constructor(n = 380) {
    const pos = new Float32Array(n * 3), rnd = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos.set([Math.random(), Math.random(), Math.random()], i * 3); rnd[i] = Math.random(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      uniforms: { time: { value: 0 }, center: { value: new THREE.Vector3() }, col: { value: new THREE.Vector3(1, 1, 1) }, size: { value: 8 }, fall: { value: 0.05 }, dir: { value: 1 }, drift: { value: 1 }, alpha: { value: 1 }, page: { value: 0 } },
      vertexShader: `
        attribute float rnd; uniform float time, size, fall, dir, drift, alpha, page; uniform vec3 center; varying float vA; varying float vRot;
        void main(){
          vec3 p = position;
          float y = fract(p.y - dir * time * fall * (0.55 + rnd * 0.9));
          vec3 w = center + vec3((p.x - 0.5) * 30.0 + sin(time * 0.4 + rnd * 6.28) * drift, y * 20.0 - 2.0, (p.z - 0.5) * 30.0 + cos(time * 0.33 + rnd * 9.0) * drift);
          vec4 mv = viewMatrix * vec4(w, 1.0);
          gl_PointSize = clamp(size * 200.0 / max(0.5, -mv.z), 1.0, page > 0.5 ? 40.0 : 18.0);
          vA = alpha * smoothstep(0.0, 0.1, y) * smoothstep(1.0, 0.82, y) * smoothstep(1.5, 6.0, -mv.z); vRot = rnd * 6.28 + time * (0.4 + rnd);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 col; uniform float page; varying float vA; varying float vRot;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float a;
          if (page > 0.5) { float s = sin(vRot), k = cos(vRot); c = vec2(k * c.x - s * c.y, s * c.x + k * c.y); a = step(abs(c.x), 0.26) * step(abs(c.y), 0.34); a *= 0.85; }
          else a = smoothstep(0.5, 0.08, length(c));
          gl_FragColor = vec4(col, a * vA);
        }`,
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 6;
    this.group.add(this.rain.mesh, this.pts);
    this.set('none');
  }

  set(mode: WeatherMode) {
    this.rain.mesh.visible = mode === 'rain';
    const pr = PRESETS[mode];
    this.pts.visible = !!pr;
    if (!pr) return;
    const u = this.mat.uniforms;
    u.col.value.set(pr.col[0], pr.col[1], pr.col[2]); u.size.value = pr.size; u.fall.value = pr.fall; u.dir.value = pr.dir; u.drift.value = pr.drift; u.alpha.value = pr.alpha; u.page.value = pr.page ? 1 : 0;
    this.mat.blending = pr.add ? THREE.AdditiveBlending : THREE.NormalBlending; this.mat.needsUpdate = true;
  }

  update(t: number, center: THREE.Vector3) { this.mat.uniforms.time.value = t; this.rain.update(t, center); }
  get visible() { return this.group.visible; }
  set visible(v: boolean) { this.group.visible = v; }
}

/** Bruma baixa e macia: véus de nevoeiro a deslizar rente ao chão em volta do jogador. */
export class Mist {
  group = new THREE.Group();
  private sprites: { s: THREE.Sprite; ox: number; oz: number; ph: number; base: number; sp: number }[] = [];
  private color = new THREE.Color(0x889aa8);

  constructor(n = 22) {
    const map = glowTexture();
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: 0x889aa8, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      const sc = 4 + Math.random() * 6; s.scale.set(sc * 1.8, sc * 0.55, 1);
      this.group.add(s);
      this.sprites.push({ s, ox: (Math.random() - 0.5) * 22, oz: (Math.random() - 0.5) * 22, ph: Math.random() * 6.28, base: 0.55 + Math.random() * 0.45, sp: 0.15 + Math.random() * 0.25 });
    }
    this.group.renderOrder = 4;
  }

  setColor(c: THREE.Color) { this.color.copy(c); for (const k of this.sprites) k.s.material.color.copy(c); }

  /** density 0..1: a bruma permanente é muito ténue; nos níveis de nevoeiro sobe, mas sempre suave. */
  update(t: number, center: THREE.Vector3, density: number) {
    for (const k of this.sprites) {
      const x = center.x + ((k.ox + t * k.sp * 1.4 + 11) % 22) - 11, z = center.z + k.oz + Math.sin(t * 0.2 + k.ph) * 1.6;
      k.s.position.set(x, 0.25 + 0.35 * Math.sin(t * 0.3 + k.ph), z);
      const edge = 1 - Math.min(1, Math.abs(x - center.x) / 11);
      k.s.material.opacity = k.base * (0.05 + 0.2 * density) * edge;
    }
  }
}
