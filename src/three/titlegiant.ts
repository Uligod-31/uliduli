import * as THREE from 'three';
import { hdr, glowTexture } from './common';
import { drawMummy, drawBandageTex, MUMMY_W, MUMMY_H, MUMMY_EYES } from './mummyArt';
import { drawSky } from './menuArt';

export interface TitleGiant {
  group: THREE.Group;
  update(t: number, aim: THREE.Vector3): void;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
let mummyTex: THREE.CanvasTexture | undefined;
let skyTex: THREE.CanvasTexture | undefined;

/**
 * O gigante do menu: uma múmia horrenda desenhada à mão (ilustração em canvas, alta resolução),
 * de olhos que iluminam o labirinto como holofotes, com duas mãos colossais a agarrar o mundo pelos lados.
 */
export function makeTitleGiant(Rd: number): TitleGiant {
  const group = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x15131a, roughness: 0.95 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x070405 });
  const handMats: THREE.Material[] = [];
  const inkM = new THREE.MeshBasicMaterial({ color: 0x05060a, side: THREE.BackSide, fog: false });
  const cast = <T extends THREE.Mesh>(m: T) => {
    m.castShadow = true;
    if (handMats.includes(m.material as THREE.Material)) { const o = new THREE.Mesh(m.geometry, inkM); o.scale.setScalar(1.09); m.add(o); }   // contorno de tinta
    return m;
  };

  // ───────── céu pintado, muito ao fundo ─────────
  if (!skyTex) { skyTex = new THREE.CanvasTexture(drawSky(1080)); skyTex.colorSpace = THREE.SRGBColorSpace; skyTex.anisotropy = 4; }
  const skyP = new THREE.Mesh(new THREE.PlaneGeometry(76, 135), new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false, fog: false, toneMapped: false }));
  skyP.position.set(0, 14, -62); skyP.renderOrder = -5; group.add(skyP);

  // ───────── a ilustração ─────────
  if (!mummyTex) {
    mummyTex = new THREE.CanvasTexture(drawMummy(1536));
    mummyTex.colorSpace = THREE.SRGBColorSpace; mummyTex.anisotropy = 8; mummyTex.generateMipmaps = true; mummyTex.minFilter = THREE.LinearMipmapLinearFilter;
  }
  const PW = 21, PH = (PW * MUMMY_H) / MUMMY_W, YC = 5.6, PZ = -13.6;
  const art = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: mummyTex, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  art.position.set(0, YC, PZ); art.renderOrder = -2; group.add(art);
  const eyePos = MUMMY_EYES.map(([ex, ey]) => V(((ex - MUMMY_W / 2) / MUMMY_W) * PW, YC + PH / 2 - (ey / MUMMY_H) * PH, PZ + 0.3));

  // ───────── olhos: brilho pulsante, holofotes e feixes ─────────
  const target = new THREE.Object3D(); group.add(target);
  const spots: THREE.SpotLight[] = [], cones: THREE.Mesh[] = [], glows: THREE.Sprite[] = [];
  eyePos.forEach((ep) => {
    const sp = new THREE.SpotLight(0xcfe0ff, 3000, 0, 0.4, 0.75, 2);
    sp.position.copy(ep); sp.target = target; group.add(sp); spots.push(sp);
    const L = 20;
    const cg = new THREE.ConeGeometry(2.6, L, 28, 1, true); cg.translate(0, -L / 2, 0); cg.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xbcd2ff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    cone.position.copy(ep); group.add(cone); cones.push(cone);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xaecbff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    gl.scale.set(4.2, 4.2, 1); gl.position.copy(ep); group.add(gl); glows.push(gl);
  });
  // luzes de palco, para as mãos
  const blue = new THREE.DirectionalLight(0x2f6bff, 2.4); blue.position.set(-14, 6, 6); blue.target.position.set(0, -1, 0); group.add(blue, blue.target);
  const red = new THREE.DirectionalLight(0xff2a3a, 2.2); red.position.set(14, 4, 6); red.target.position.set(0, -1, 0); group.add(red, red.target);

  // ───────── mãos gigantes a agarrar o mundo PELOS LADOS ─────────
  // O mundo tem um ventre rochoso: a palma encosta-se ao flanco e os dedos contornam-no, por baixo do labirinto.
  const bandTex = new THREE.CanvasTexture(drawBandageTex(512)); bandTex.wrapS = bandTex.wrapT = THREE.RepeatWrapping; bandTex.colorSpace = THREE.SRGBColorSpace; bandTex.anisotropy = 4;
  const hskin = new THREE.MeshStandardMaterial({ map: bandTex, color: 0xffffff, roughness: 0.95 });
  const hskinD = new THREE.MeshStandardMaterial({ map: bandTex, color: 0x8a8578, roughness: 0.95 });
  handMats.push(hskin, hskinD);
  const wrapM = new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.98 });
  const metalM = new THREE.MeshStandardMaterial({ color: 0x8f98aa, metalness: 0.9, roughness: 0.3 });
  const nailM = new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 0.5, metalness: 0.4 });
  const Rr = Rd + 0.1, depth = 0.95 * Rd;
  const rockR = (y: number) => (y > -0.35 ? Rr : Rr * Math.sqrt(Math.max(0.05, 1 - ((-y - 0.35) / depth) ** 2)));
  const bone = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, parent: THREE.Object3D, m: THREE.Material) => {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const o = cast(new THREE.Mesh(new THREE.CapsuleGeometry((r0 + r1) / 2, Math.max(0.01, len - r0 - r1), 5, 10), m));
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    parent.add(o); return o;
  };
  const fingerGroups: { g: THREE.Group; s: number; ph: number }[] = [];
  for (const s of [-1, 1]) {
    const th0 = 0.62;                                         // a palma pousa um pouco à frente do flanco
    const P = (th: number, y: number, off: number) => { const r = rockR(y) + off; return V(s * r * Math.cos(th), y, r * Math.sin(th)); };
    const handG = new THREE.Group(); group.add(handG);
    // palma: placa carnuda encostada ao flanco
    const pp = P(th0, -1.55, 0.55);
    const palm = cast(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), hskin)); palm.scale.set(2.2, 2.4, 0.75);
    palm.position.copy(pp); palm.lookAt(0, -1.55, 0); handG.add(palm);
    const heel = cast(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), hskin)); heel.scale.set(1.2, 1.7, 0.55);
    heel.position.copy(P(th0 - 0.22, -1.55, 0.55)); heel.lookAt(0, -1.55, 0); handG.add(heel);
    // quatro dedos: contornam o ventre, empilhados na vertical, com as pontas a apertar
    [-0.35, -1.25, -2.15, -2.95].forEach((y, idx) => {
      const fg = new THREE.Group(); handG.add(fg); fingerGroups.push({ g: fg, s, ph: idx * 0.7 });
      const lens = [1.9 - idx * 0.1, 1.6 - idx * 0.08, 1.25 - idx * 0.06];
      let th = th0 + 0.08;
      let prev = P(th, y, 0.4);
      const kn = cast(new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), hskinD)); kn.position.copy(prev); fg.add(kn);
      lens.forEach((len, j) => {
        th += len / (rockR(y) + 0.3);
        const nxt = P(th, y - j * 0.08, 0.32 - j * 0.1);
        bone(prev, nxt, 0.58 - j * 0.07, 0.52 - j * 0.08, fg, hskin);
        const jt = cast(new THREE.Mesh(new THREE.SphereGeometry(0.54 - j * 0.08, 10, 8), hskinD)); jt.position.copy(nxt); fg.add(jt);
        const wr = new THREE.Mesh(new THREE.TorusGeometry(0.4 - j * 0.07, 0.02, 4, 12), dark); wr.position.copy(nxt); wr.lookAt(nxt.clone().add(nxt.clone().sub(prev))); fg.add(wr);
        prev = nxt;
      });
      const nail = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 4, 8), nailM)); nail.position.copy(prev); nail.lookAt(0, prev.y, 0); fg.add(nail);
    });
    // polegar a contornar o lado de trás
    {
      const fg = new THREE.Group(); handG.add(fg); fingerGroups.push({ g: fg, s: -s, ph: 2.4 });
      let th = th0 - 0.12, prev = P(th, -0.1, 0.45);
      [1.7, 1.3].forEach((len, j) => {
        th -= len / (rockR(-0.1) + 0.3);
        const nxt = P(th, -0.1 - j * 0.05, 0.3);
        bone(prev, nxt, 0.5 - j * 0.07, 0.46 - j * 0.08, fg, hskin);
        const jt = cast(new THREE.Mesh(new THREE.SphereGeometry(0.46 - j * 0.08, 10, 8), hskinD)); jt.position.copy(nxt); fg.add(jt);
        prev = nxt;
      });
    }
    // antebraço enfaixado a entrar pelo lado de trás, com grilhão
    const a0 = P(th0 - 0.25, -1.55, 0.7), a1 = a0.clone().add(V(s * 11, 1.6, -9));
    bone(a0, a1, 1.0, 1.35, handG, hskin);
    const axis = a1.clone().sub(a0).normalize(), qa = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), axis);
    for (let k = 0; k < 15; k++) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(1.02 + k * 0.016, 0.1, 6, 20), wrapM);
      w.position.copy(a0).addScaledVector(axis, 1.3 + k * 0.78); w.quaternion.copy(qa).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((k % 2 ? 0.3 : -0.3), (k % 3) * 0.2, 0))); handG.add(w);
    }
    const cuff = cast(new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.2, 8, 22), metalM)); cuff.position.copy(a0).addScaledVector(axis, 0.7); cuff.quaternion.copy(qa); handG.add(cuff);
    for (let k = 0; k < 5; k++) { const cl = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 12), metalM); cl.position.copy(a0).addScaledVector(axis, 0.7).add(V(0, -1.2 - k * 0.45, 0)); cl.rotation.y = k % 2 ? Math.PI / 2 : 0; cl.scale.set(0.75, 1.2, 1); handG.add(cl); }
  }

  // ───────── archotes à frente do planeta + brasas a subir ─────────
  const flames: { g: THREE.Group; ph: number }[] = [];
  for (const sx of [-1, 1]) {
    const tx = sx * (Rd + 1.1), tz = 4.2;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 2.6, 8), cloth); pole.position.set(tx, 1.0, tz); group.add(pole);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.14, 0.34, 10), cloth); bowl.position.set(tx, 2.4, tz); group.add(bowl);
    const fg = new THREE.Group(); fg.position.set(tx, 2.55, tz); group.add(fg);
    fg.add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 10), new THREE.MeshBasicMaterial({ color: hdr(0xff7a1a, 1.8), transparent: true, opacity: 0.9, toneMapped: false, fog: false })).translateY(0.55));
    fg.add(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 8), new THREE.MeshBasicMaterial({ color: hdr(0xffe6a0, 2.2), toneMapped: false, fog: false })).translateY(0.38));
    const g1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff7a2a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); g1.scale.set(3.4, 3.4, 1); g1.position.y = 0.6; fg.add(g1);
    flames.push({ g: fg, ph: sx });
  }
  const EM = 140, ep = new Float32Array(EM * 3), ev = new Float32Array(EM);
  for (let i = 0; i < EM; i++) { ep[i * 3] = (Math.random() - 0.5) * (Rd * 2.6); ep[i * 3 + 1] = Math.random() * 12 - 2; ep[i * 3 + 2] = Math.random() * 14 - 8; ev[i] = 0.5 + Math.random() * 1.2; }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: hdr(0xff8a3a, 2), size: 0.16, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
  embers.frustumCulled = false; group.add(embers);

  const tmpW = new THREE.Vector3();
  return {
    group,
    update(t, aim) {
      // os olhos seguem o jogador
      target.position.lerp(group.worldToLocal(tmpW.copy(aim)), 0.08);
      const fl = 0.9 + 0.1 * Math.sin(t * 7) + 0.05 * Math.sin(t * 23);
      spots.forEach((sp, i) => { sp.intensity = 3000 * fl * (i ? 1 : 0.95); });
      const tw = group.localToWorld(target.position.clone());
      cones.forEach((c) => { (c.material as THREE.MeshBasicMaterial).opacity = 0.08 * fl; c.lookAt(tw); });
      glows.forEach((gl, i) => { gl.scale.setScalar(4.2 * (0.92 + 0.14 * fl + 0.05 * Math.sin(t * 3 + i))); (gl.material as THREE.SpriteMaterial).opacity = 0.32 + 0.3 * fl; });
      // a ilustração respira e balança
      art.rotation.z = Math.sin(t * 0.31) * 0.012; art.position.y = YC + Math.sin(t * 0.5) * 0.12; art.scale.setScalar(1 + 0.006 * Math.sin(t * 1.4));
      // os dedos apertam e relaxam
      fingerGroups.forEach((f) => { f.g.rotation.y = -f.s * (0.018 + 0.016 * Math.sin(t * 0.8 + f.ph)); });
      flames.forEach((f) => { const q = 0.9 + 0.15 * Math.sin(t * 15 + f.ph * 3) + 0.07 * Math.sin(t * 27 + f.ph); f.g.scale.set(1 - 0.1 * Math.sin(t * 9 + f.ph), q, 1); f.g.rotation.z = Math.sin(t * 4 + f.ph) * 0.12; });
      const pa = eg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < EM; i++) { let y = pa.getY(i) + ev[i] * 0.022; if (y > 13) y = -2; pa.setY(i, y); pa.setX(i, pa.getX(i) + Math.sin(t * 1.3 + i) * 0.006); }
      pa.needsUpdate = true;
    },
  };
}
