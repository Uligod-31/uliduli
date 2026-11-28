// Efeitos 3D das mecânicas: neve e brilho do gelo, e a lava que avança (shader próprio).
import * as THREE from 'three';
import { Maze } from '../core/maze';
import { mulberry32 } from '../core/rng';
import { glowTexture, hdr } from './common';

type CellPos = (i: number, out?: THREE.Vector3) => THREE.Vector3;

const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
`;

// ───────────────────────── Gelo ─────────────────────────
export interface IceFx { group: THREE.Group; update(t: number): void; melt(cell: number): void }

export function buildIceFx(m: Maze, cellPos: CellPos): IceFx {
  const group = new THREE.Group();
  const rng = mulberry32(m.start * 977 + m.exit * 13 + 5);
  const open: number[] = [];
  for (let i = 0; i < m.cols * m.rows; i++) if (!m.solid[i]) open.push(i);
  const M = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  // gelo vivo: azul fundo com reflexos que correm (diz «aqui escorrega»)
  const ice = open.filter((i) => !m.grip![i]);
  const iceMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec2 vW; varying vec2 vU; void main(){ vU = uv; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float time; varying vec2 vW; varying vec2 vU; ${NOISE}
      void main(){
        float n = fbm(vW * 1.7);
        float crack = 1.0 - smoothstep(0.0, 0.018, abs(fbm(vW * 2.6 + 11.0) - 0.5));
        float band = fract((vW.x * 0.8 + vW.y * 0.55) * 0.42 - time * 0.16);
        float glint = smoothstep(0.0, 0.07, band) * (1.0 - smoothstep(0.07, 0.2, band));
        float edge = smoothstep(0.34, 0.5, max(abs(vU.x - 0.5), abs(vU.y - 0.5)));
        vec3 col = mix(vec3(0.006, 0.07, 0.2), vec3(0.025, 0.22, 0.46), n);
        col += vec3(0.55, 0.9, 1.0) * (glint * 0.75 + crack * 0.28 + edge * 0.18);
        gl_FragColor = vec4(col, 0.84 + glint * 0.14);
      }`,
  });
  const iceMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.97, 0.97).rotateX(-Math.PI / 2), iceMat, ice.length);
  ice.forEach((c, k) => { cellPos(c, v); iceMesh.setMatrixAt(k, M.makeTranslation(v.x, 0.008, v.z)); });
  group.add(iceMesh);

  // neve: montículos fofos com pedrinhas (aqui travas)
  const snow = open.filter((i) => m.grip![i] && i !== m.exit);
  const dome = new THREE.SphereGeometry(0.4, 26, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dp = dome.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    const x = dp.getX(i), z = dp.getZ(i), a = Math.atan2(z, x);
    const k = 1 + 0.13 * Math.sin(a * 3 + 1) + 0.08 * Math.sin(a * 7 + 2);
    dp.setXYZ(i, x * k, dp.getY(i) * 0.17 * (1 + 0.35 * Math.sin(x * 17) * Math.cos(z * 13)), z * k);
  }
  dome.computeVertexNormals();
  const snowMesh = new THREE.InstancedMesh(dome, new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.95, emissive: 0x5a6a80, emissiveIntensity: 0.35 }), snow.length);
  snow.forEach((c, k) => { cellPos(c, v); snowMesh.setMatrixAt(k, M.compose(v.setY(0.006), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6.28), s.set(0.96 + rng() * 0.12, 1, 0.96 + rng() * 0.12))); });
  snowMesh.receiveShadow = true;
  group.add(snowMesh);
  const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x4a5868, roughness: 1, flatShading: true }), snow.length * 4);
  let p = 0;
  for (const c of snow) for (let k = 0; k < 4; k++) {
    cellPos(c, v); const a = rng() * 6.28, r = 0.08 + rng() * 0.24, sz = 0.018 + rng() * 0.022;
    pebbles.setMatrixAt(p++, M.compose(v.set(v.x + Math.cos(a) * r, 0.07 - r * 0.09, v.z + Math.sin(a) * r), q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, 0)), s.set(sz, sz * 0.6, sz)));
  }
  group.add(pebbles);

  return {
    group,
    update(t) { iceMat.uniforms.time.value = t; },
    melt(cell) {
      const k = ice.indexOf(cell);
      if (k >= 0) { iceMesh.setMatrixAt(k, ZERO); iceMesh.instanceMatrix.needsUpdate = true; }
      cellPos(cell, v);
      const g = new THREE.Group(); g.position.set(v.x, 0.012, v.z);
      const wet = new THREE.Mesh(new THREE.CircleGeometry(0.38, 28).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.15, metalness: 0.4 }));
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: hdr(0xff8a2a, 2.4), transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false }));
      rim.position.y = 0.006;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff7a1a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(1.1); halo.position.y = 0.12;
      g.add(wet, rim, halo); group.add(g);
    },
  };
}

// ───────────────────────── Lava ─────────────────────────
export interface LavaFx { mesh: THREE.InstancedMesh; set(moves: number, instant?: boolean): number[]; update(dt: number, t: number): void }

export function buildLavaFx(m: Maze, cellPos: CellPos): LavaFx {
  const cells: number[] = [];
  for (let i = 0; i < m.cols * m.rows; i++) if (!m.solid[i]) cells.push(i);
  const n = cells.length;
  const geo = new THREE.PlaneGeometry(1.0, 1.0, 10, 10).rotateX(-Math.PI / 2);
  const heat = new THREE.InstancedBufferAttribute(new Float32Array(n), 1), warn = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
  heat.setUsage(THREE.DynamicDrawUsage); warn.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aHeat', heat); geo.setAttribute('aWarn', warn);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    uniforms: { time: { value: 0 } },
    vertexShader: `attribute float aHeat; attribute float aWarn; uniform float time; varying vec2 vW; varying vec2 vU; varying float vH; varying float vWn;
      void main(){ vU = uv; vH = aHeat; vWn = aWarn; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xz;
        w.y += aHeat * (0.075 + 0.022 * sin(w.x * 5.3 + time * 2.1) * cos(w.z * 4.1 + time * 1.7));
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float time; varying vec2 vW; varying vec2 vU; varying float vH; varying float vWn; ${NOISE}
      void main(){
        if (vH > 0.001) {
          vec2 p = vW * 1.9;
          float w1 = fbm(p * 0.8 + vec2(time * 0.11, -time * 0.07));
          float nz = fbm(p + w1 * 2.2 + vec2(-time * 0.16, time * 0.22));
          vec3 hot = vec3(0.82, 0.12, 0.0), mid = vec3(0.22, 0.006, 0.0), crust = vec3(0.025, 0.003, 0.002);
          vec3 col = mix(hot, mid, smoothstep(0.30, 0.50, nz));
          col = mix(col, crust, smoothstep(0.46, 0.60, nz));
          col *= 0.9 + 0.1 * sin(time * 3.0 + nz * 18.0);
          float edge = max(abs(vU.x - 0.5), abs(vU.y - 0.5)) * 1.25 + fbm(vW * 5.0) * 0.45;
          float a = smoothstep(0.0, 0.12, vH * 1.55 - edge);
          col += vec3(1.2, 0.45, 0.02) * (1.0 - smoothstep(0.0, 0.2, vH * 1.55 - edge)) * a;
          gl_FragColor = vec4(col, a);
        } else if (vWn > 0.001) {
          float c = 1.0 - smoothstep(0.0, 0.055, abs(fbm(vW * 3.4) - 0.5));
          float pulse = 0.5 + 0.5 * sin(time * (3.0 + vWn * 5.0));
          float border = smoothstep(0.38, 0.5, max(abs(vU.x - 0.5), abs(vU.y - 0.5)));
          float a = vWn * (c * 0.95 + border * 0.5 + 0.1) * (0.55 + 0.45 * pulse);
          gl_FragColor = vec4(vec3(1.5, 0.3, 0.01), a);
        } else discard;
      }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const M = new THREE.Matrix4(), v = new THREE.Vector3();
  cells.forEach((c, k) => { cellPos(c, v); mesh.setMatrixAt(k, M.makeTranslation(v.x, 0.014, v.z)); });
  mesh.renderOrder = 1; mesh.frustumCulled = false;
  const target = new Float32Array(n);
  return {
    mesh,
    set(moves, instant = false) {
      const fresh: number[] = [], at = m.lava!.at, k = m.lava!.k;
      cells.forEach((c, i) => {
        const left = at[c] - moves, burn = left <= 0 ? 1 : 0;
        if (burn && !target[i]) fresh.push(c);
        target[i] = burn;
        warn.setX(i, burn ? 0 : left <= k ? 1 : left <= k * 2 + 1 ? 0.42 : 0);
        if (instant) heat.setX(i, burn);
      });
      warn.needsUpdate = true; heat.needsUpdate = true;
      return fresh;
    },
    update(dt, t) {
      mat.uniforms.time.value = t;
      let dirty = false;
      for (let i = 0; i < n; i++) {
        const h = heat.getX(i);
        if (h !== target[i]) { heat.setX(i, target[i] ? Math.min(1, h + dt * 2.2) : Math.max(0, h - dt * 3)); dirty = true; }
      }
      if (dirty) heat.needsUpdate = true;
    },
  };
}
