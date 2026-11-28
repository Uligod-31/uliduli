// Efeitos 3D das mecânicas: neve e brilho do gelo, e a lava que avança (shader próprio).
import * as THREE from 'three';
import { Maze, DIRS, OPP } from '../core/maze';
import { hazardAt, hazardIn } from '../core/mech';
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

// ───────────────────────── Efeitos dos outros mundos ─────────────────────────
export interface WorldFx { group: THREE.Group; update(dt: number, t: number): void; set?(moves: number, instant?: boolean): void; drop?(cell: number): void }

/** Cores dos pares (arcos do planeta e buracos de verme). */
export const PAIR_COLORS = [0x2fe6d0, 0xff4fd8, 0xffd45a, 0x7bff6a, 0x5b92ff, 0xff7a2a];
const glowMesh = (geo: THREE.BufferGeometry, color: number, k: number, opacity = 1, add = false) =>
  new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hdr(color, k), transparent: opacity < 1 || add, opacity, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !(opacity < 1 || add), side: THREE.DoubleSide, toneMapped: false }));

/** Planeta: um arco de luz em cada saída do mapa; os dois da mesma cor ligam-se. */
export function buildWarpFx(m: Maze, cellPos: CellPos): WorldFx {
  const group = new THREE.Group(), arrows: { o: THREE.Object3D; base: THREE.Vector3; dir: THREE.Vector3; ph: number }[] = [];
  const done = new Set<number>(); let n = 0;
  for (const [k, to] of m.warp!) {
    if (done.has(k)) continue;
    const d = k % 4, other = to * 4 + OPP[d], color = PAIR_COLORS[n % PAIR_COLORS.length];
    done.add(k); done.add(other);
    for (const [cell, dd] of [[(k / 4) | 0, d], [to, OPP[d]]] as const) {
      const v = cellPos(cell, new THREE.Vector3()), dir = new THREE.Vector3(DIRS[dd].dx, 0, DIRS[dd].dy);
      const g = new THREE.Group(); g.position.copy(v).addScaledVector(dir, 0.52); g.rotation.y = DIRS[dd].dx ? Math.PI / 2 : 0;
      const arch = glowMesh(new THREE.TorusGeometry(0.46, 0.06, 10, 36, Math.PI), color, 1.9); arch.scale.y = 1.35;
      const veil = glowMesh(new THREE.CircleGeometry(0.44, 30, 0, Math.PI), color, 1.2, 0.34, true); veil.scale.y = 1.35;
      const gem = glowMesh(new THREE.OctahedronGeometry(0.1), color, 2.2); gem.position.y = 0.88;
      const floor = glowMesh(new THREE.PlaneGeometry(0.8, 0.3).rotateX(-Math.PI / 2), color, 1.3, 0.5, true); floor.position.y = 0.02;
      g.add(arch, veil, gem, floor); group.add(g);
      const arrow = glowMesh(new THREE.ConeGeometry(0.11, 0.24, 4), color, 2.0);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); const base = v.clone().addScaledVector(dir, 0.2).setY(0.1);
      group.add(arrow); arrows.push({ o: arrow, base, dir, ph: n });
    }
    n++;
  }
  return { group, update(_dt, t) { for (const a of arrows) a.o.position.copy(a.base).addScaledVector(a.dir, ((t * 0.7 + a.ph) % 1) * 0.3); } };
}

/** Buracos de verme: um redemoinho no chão, da cor do par, com um aro que gira. */
export function buildHoleFx(m: Maze, cellPos: CellPos): WorldFx {
  const group = new THREE.Group(), mats: THREE.ShaderMaterial[] = [], rings: THREE.Object3D[] = [];
  const done = new Set<number>(); let n = 0;
  for (const [a, b] of m.holes!) {
    if (done.has(a)) continue; done.add(a); done.add(b);
    const color = PAIR_COLORS[n++ % PAIR_COLORS.length];
    for (const cell of [a, b]) {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
        uniforms: { time: { value: 0 }, col: { value: new THREE.Color(color) } },
        vertexShader: 'varying vec2 vU; void main(){ vU = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float time; uniform vec3 col; varying vec2 vU;
          void main(){ float r = length(vU) * 2.0; if (r > 1.0) discard; float a = atan(vU.y, vU.x);
            float s = 0.5 + 0.5 * sin(a * 4.0 + r * 13.0 - time * 5.0);
            vec3 c = mix(vec3(0.01, 0.0, 0.03), col * 1.9, s * smoothstep(0.12, 0.85, r));
            c += col * 2.2 * smoothstep(0.8, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
            gl_FragColor = vec4(c, 0.97); }`,
      });
      mats.push(mat);
      const g = new THREE.Group(); cellPos(cell, g.position);
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92).rotateX(-Math.PI / 2), mat); disc.position.y = 0.02;
      const ring = glowMesh(new THREE.TorusGeometry(0.4, 0.025, 8, 40), color, 2.0); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3;
      const beam = glowMesh(new THREE.CylinderGeometry(0.34, 0.4, 0.9, 24, 1, true), color, 1.1, 0.14, true); beam.position.y = 0.45;
      g.add(disc, ring, beam); group.add(g); rings.push(ring);
    }
  }
  return { group, update(_dt, t) { mats.forEach((x) => { x.uniforms.time.value = t; }); rings.forEach((r, i) => { r.position.y = 0.28 + 0.14 * Math.sin(t * 2.4 + i); r.rotation.z = t * 1.5; }); } };
}

/** Maré (água que enche as zonas baixas) e batida (três cores de colunas que rebentam à vez). */
export function buildHazardFx(m: Maze, cellPos: CellPos): WorldFx {
  const tide = m.mech === 'tide';
  const cells: number[] = [];
  m.haz!.group.forEach((g, i) => { if (g) cells.push(i); });
  const n = cells.length, group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(0.99, 0.99, 8, 8).rotateX(-Math.PI / 2);
  const level = new THREE.InstancedBufferAttribute(new Float32Array(n), 1), warn = new THREE.InstancedBufferAttribute(new Float32Array(n), 1), hue = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  const COLS = [[1.0, 0.08, 0.55], [0.05, 0.55, 1.0], [1.0, 0.75, 0.03]];
  cells.forEach((c, i) => hue.setXYZ(i, ...(COLS[(m.haz!.group[c] - 1) % 3] as [number, number, number])));
  level.setUsage(THREE.DynamicDrawUsage); warn.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aLevel', level); geo.setAttribute('aWarn', warn); geo.setAttribute('aHue', hue);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, uniforms: { time: { value: 0 } },
    vertexShader: `attribute float aLevel; attribute float aWarn; attribute vec3 aHue; uniform float time; varying vec2 vW; varying vec2 vU; varying float vL; varying float vWn; varying vec3 vC;
      void main(){ vU = uv; vL = aLevel; vWn = aWarn; vC = aHue; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xz;
        ${tide ? 'w.y += aLevel * (0.23 + 0.025 * sin(w.x * 4.0 + time * 2.4) * cos(w.z * 3.3 + time * 1.9));' : 'w.y += aLevel * 0.02;'}
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: tide
      ? `uniform float time; varying vec2 vW; varying vec2 vU; varying float vL; varying float vWn; ${NOISE}
        void main(){
          float edge = max(abs(vU.x - 0.5), abs(vU.y - 0.5));
          float f = fbm(vW * 2.2 + vec2(time * 0.35, -time * 0.22));
          float foam = smoothstep(0.55, 0.72, fbm(vW * 5.0 - vec2(time * 0.5)));
          vec3 water = mix(vec3(0.0, 0.11, 0.3), vec3(0.03, 0.5, 0.68), f) + vec3(0.7) * foam * 0.55;
          float wet = smoothstep(0.38, 0.5, edge) * 0.85 + 0.2 + 0.18 * smoothstep(0.5, 0.7, f);
          float pulse = 0.5 + 0.5 * sin(time * 7.0);
          vec3 dry = vec3(0.02, 0.28, 0.45) + vWn * vec3(0.5, 0.9, 1.1) * pulse * (0.35 + foam);
          vec3 col = mix(dry, water, smoothstep(0.0, 0.5, vL));
          float a = mix(wet * 0.75 + vWn * 0.35 * pulse, 0.84, smoothstep(0.0, 0.5, vL));
          gl_FragColor = vec4(col, a); }`
      : `uniform float time; varying vec2 vW; varying vec2 vU; varying float vL; varying float vWn; varying vec3 vC;
        void main(){
          vec2 c = vU - 0.5; float r = length(c) * 2.0, edge = max(abs(c.x), abs(c.y));
          float ring = smoothstep(0.06, 0.0, abs(r - 0.62)) + smoothstep(0.05, 0.0, abs(r - 0.3));
          float frame = smoothstep(0.38, 0.47, edge);
          float pulse = 0.5 + 0.5 * sin(time * 11.0);
          float wave = 0.5 + 0.5 * sin(r * 20.0 - time * 14.0);
          // em repouso: ladrilho cheio da sua cor (lê-se logo qual é qual), com anéis de coluna de som
          vec3 col = vC * (1.15 + ring * 0.5 + vWn * pulse * 1.1 + vL * (0.8 + wave));
          float a = 0.34 + ring * 0.6 + frame * 0.5 + vWn * (0.12 + 0.3 * pulse) + vL * 0.6;
          gl_FragColor = vec4(col, clamp(a, 0.0, 0.95)); }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const M = new THREE.Matrix4(), v = new THREE.Vector3();
  cells.forEach((c, i) => { cellPos(c, v); mesh.setMatrixAt(i, M.makeTranslation(v.x, 0.016, v.z)); });
  mesh.frustumCulled = false; mesh.renderOrder = 1; group.add(mesh);
  // colunas de luz quando a batida rebenta
  const beams = tide ? undefined : new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.38, 1.5, 16, 1, true).translate(0, 0.75, 0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), n);
  if (beams) { const cc = new THREE.Color(); cells.forEach((_, i) => beams.setColorAt(i, cc.setRGB(hue.getX(i) * 1.6, hue.getY(i) * 1.6, hue.getZ(i) * 1.6))); beams.frustumCulled = false; group.add(beams); }
  const target = new Float32Array(n), grow = new Float32Array(n);
  const place = (i: number) => { if (!beams) return; cellPos(cells[i], v); const k = grow[i]; beams.setMatrixAt(i, M.compose(v, new THREE.Quaternion(), new THREE.Vector3(k, k, k))); };
  cells.forEach((_, i) => place(i));
  return {
    group,
    set(moves, instant = false) {
      cells.forEach((c, i) => {
        const on = hazardAt(m, c, moves) ? 1 : 0;
        const soon = !on && hazardIn(m, m.haz!.group[c], moves) <= (tide ? 2 : 1) ? 1 : 0;
        target[i] = on; warn.setX(i, soon);
        if (instant) { level.setX(i, on); grow[i] = on; place(i); }
      });
      warn.needsUpdate = true; level.needsUpdate = true; if (beams) beams.instanceMatrix.needsUpdate = true;
    },
    update(dt, t) {
      mat.uniforms.time.value = t;
      let dirty = false;
      for (let i = 0; i < n; i++) {
        const h = level.getX(i);
        if (h !== target[i]) { const next = target[i] ? Math.min(1, h + dt * 3) : Math.max(0, h - dt * 3); level.setX(i, next); grow[i] = next; place(i); dirty = true; }
      }
      if (dirty) { level.needsUpdate = true; if (beams) beams.instanceMatrix.needsUpdate = true; }
      if (beams) (beams.material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.14 * Math.sin(t * 13);
    },
  };
}

/** Nuvens: tufos fofos onde se pisa uma só vez; depois caem e deixam o buraco (o chão trata a ilha). */
export function buildCloudFx(m: Maze, cellPos: CellPos, hideFloor: (cell: number) => void): WorldFx {
  const group = new THREE.Group();
  const rng = mulberry32(m.start * 31 + m.exit * 7 + 1);
  const puff = new THREE.SphereGeometry(1, 14, 10);
  const items = new Map<number, { g: THREE.Group; fall: number; mat: THREE.MeshStandardMaterial; ph: number }>();
  for (const c of m.clouds!) {
    const g = new THREE.Group(); cellPos(c, g.position);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8fa8ff, emissiveIntensity: 0.55, roughness: 1, transparent: true, opacity: 0.93 });
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2, r = k ? 0.16 + rng() * 0.06 : 0, s = new THREE.Mesh(puff, mat);
      s.position.set(Math.cos(a) * r, 0.05 + rng() * 0.04, Math.sin(a) * r); const z = 0.09 + rng() * 0.06 + (k ? 0 : 0.08); s.scale.set(z, z * 0.75, z); g.add(s);
    }
    // «céu aberto» por baixo: azul cheio (sem mistura aditiva), para o tufo branco se destacar mesmo em chão claro
    const sky = new THREE.Mesh(new THREE.CircleGeometry(0.48, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a5fe0, transparent: true, opacity: 0.78, depthWrite: false }));
    sky.position.y = 0.018; g.add(sky);
    const rim = glowMesh(new THREE.RingGeometry(0.43, 0.49, 32).rotateX(-Math.PI / 2), 0xff4fd8, 1.5, 0.9, false); rim.position.y = 0.024; g.add(rim);
    group.add(g); items.set(c, { g, fall: 0, mat, ph: rng() * 6 });
  }
  return {
    group,
    drop(cell) { const it = items.get(cell); if (it && !it.fall) { it.fall = 0.001; hideFloor(cell); } },
    update(dt, t) {
      for (const it of items.values()) {
        if (!it.fall) { const k = 1 + 0.05 * Math.sin(t * 2 + it.ph); it.g.scale.set(k, 1 + 0.18 * Math.sin(t * 1.7 + it.ph), k); continue; }
        if (!it.g.visible) continue;
        it.fall += dt; it.g.position.y = -it.fall * it.fall * 3.2; it.g.scale.multiplyScalar(1 - dt * 0.7); it.mat.opacity = Math.max(0, 0.93 - it.fall * 0.9);
        if (it.fall > 1.1) it.g.visible = false;
      }
    },
  };
}
