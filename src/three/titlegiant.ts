import * as THREE from 'three';
import { hdr, glowTexture } from './common';

export interface TitleGiant {
  group: THREE.Group;
  head: THREE.Group;
  target: THREE.Object3D;
  spots: THREE.SpotLight[];
  cones: THREE.Mesh[];
  fingers: { pivot: THREE.Group; ph: number }[];
  update(t: number, aim: THREE.Vector3): void;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// rosto: elipsoide (a, b, c) virado para +z
const FA = 2.35, FB = 2.75, FC = 2.45;
const surf = (x: number, y: number) => FC * Math.sqrt(Math.max(0, 1 - (x / FA) ** 2 - (y / FB) ** 2));

/**
 * O Crescido colossal do menu: um grande plano da cara, de riso maquiavélico e olhos que acendem
 * como holofotes sobre o labirinto, com mãos enormes a agarrar o planeta por trás.
 */
export function makeTitleGiant(Rd: number): TitleGiant {
  const group = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x15131a, roughness: 0.95 });
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xa9b3c6, roughness: 0.42, metalness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.35 });
  const skinD = new THREE.MeshStandardMaterial({ color: 0x6f7788, roughness: 0.7, metalness: 0.3 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x070405 });
  const cast = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; return m; };

  // corpo escuro lá atrás, só para dar escala
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), cloth);
  torso.scale.set(8, 7, 3.6); torso.position.set(0, -4.5, -22);
  group.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 6, 12), skinD);
  neck.position.set(0, 1.2, -17.5); neck.rotation.x = -0.35;
  group.add(neck);

  // ───────── cabeça (grande plano) ─────────
  const head = new THREE.Group(); head.position.set(0, 8.7, -13.6); head.scale.setScalar(2.55); group.add(head);
  const skull = cast(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 30), skin));
  skull.scale.set(FA, FB, FC); head.add(skull);
  // maçãs do rosto e queixo
  for (const s of [-1, 1]) {
    const ck = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), skin); ck.scale.set(1.3, 0.7, 0.6); ck.position.set(s * 1.55, -0.35, surf(1.55, -0.35) - 0.1); head.add(ck);
    // vincos fundos do nariz à boca
    const cr = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(s * 0.35, 0.2, surf(0.35, 0.2) + 0.02), V(s * 0.7, -0.5, surf(0.7, -0.5) + 0.02), V(s * 1.15, -1.0, surf(1.15, -1.0) + 0.02)]), 14, 0.035, 5), dark); head.add(cr);
  }
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), skin); chin.scale.set(1.3, 0.8, 0.8); chin.position.set(0, -2.35, surf(0, -2.2) - 0.15); head.add(chin);
  // nariz: ossos e duas narinas
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.8, 3), dark); nose.position.set(0, -0.5, surf(0, -0.5) + 0.06); nose.rotation.z = Math.PI; nose.rotation.x = 0.15; head.add(nose);

  // olhos: cavidades fundas + chama amarela inclinada + sobrancelhas más
  const spots: THREE.SpotLight[] = [], cones: THREE.Mesh[] = [];
  const target = new THREE.Object3D(); group.add(target);
  for (const s of [-1, 1]) {
    const ex = s * 1.0, ey = 0.85, ez = surf(ex, ey);
    const sock = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), dark); sock.scale.set(0.82, 0.5, 0.3); sock.position.set(ex, ey, ez - 0.1); sock.rotation.z = s * 0.36; head.add(sock);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: hdr(0xbcd6ff, 3.8), toneMapped: false, fog: false }));
    eye.scale.set(0.58, 0.19, 0.16); eye.position.set(ex, ey - 0.02, ez + 0.34); eye.rotation.z = s * 0.36; head.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x120800 })); pup.scale.set(0.05, 0.19, 0.06); pup.position.set(ex + s * 0.02, ey - 0.02, ez + 0.5); head.add(pup);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.2), dark); brow.position.set(ex, ey + 0.62, surf(ex, ey + 0.62) + 0.06); brow.rotation.z = s * 0.38; head.add(brow);
    const bag = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 6, 20, Math.PI), dark); bag.position.set(ex, ey - 0.35, surf(ex, ey - 0.35) + 0.02); bag.rotation.z = Math.PI + s * 0.1; head.add(bag);
    const sp = new THREE.SpotLight(0xcfe0ff, 2800, 0, 0.4, 0.75, 2);
    sp.position.set(ex, ey, ez + 0.4); sp.target = target; head.add(sp); spots.push(sp);
    const L = 9;
    const cg = new THREE.ConeGeometry(1.5, L, 28, 1, true); cg.translate(0, -L / 2, 0); cg.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xbcd2ff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    cone.position.set(ex, ey, ez + 0.3); cone.rotation.x = 0.6; head.add(cone); cones.push(cone);
  }
  // luz de baixo (vela) para os dentes se verem
  const under = new THREE.PointLight(0xff9a50, 520, 0, 2); under.position.set(0, -3.2, 5.5); head.add(under);


  // ───────── o riso ─────────
  const ox = 0, oy = -0.15, W = 1.85;
  const lower = (x: number) => oy - 1.45 + 1.7 * (x / W) ** 2;
  const gap = (x: number) => 0.06 + 0.78 * Math.max(0, 1 - (x / W) ** 2);
  const upper = (x: number) => lower(x) + gap(x);
  const shape = new THREE.Shape();
  const N = 36;
  for (let i = 0; i <= N; i++) { const x = -W + (2 * W * i) / N; if (i === 0) shape.moveTo(ox + x, lower(x)); else shape.lineTo(ox + x, lower(x)); }
  for (let i = N; i >= 0; i--) { const x = -W + (2 * W * i) / N; shape.lineTo(ox + x, upper(x)); }
  const mg = new THREE.ShapeGeometry(shape, 8);
  const mp = mg.attributes.position;
  for (let i = 0; i < mp.count; i++) mp.setZ(i, surf(mp.getX(i), mp.getY(i)) + 0.04);
  mg.computeVertexNormals();
  head.add(new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0x120305 })));
  // brilho vermelho lá dentro
  const inner = new THREE.Mesh(mg.clone(), new THREE.MeshBasicMaterial({ color: hdr(0x7a0a14, 1.0), transparent: true, opacity: 0.55 }));
  inner.scale.set(0.9, 0.7, 1); inner.position.set(0, (lower(0) + upper(0)) / 2 * 0.3, 0.03); head.add(inner);
  // lábios finos a contornar
  for (const f of [lower, upper]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) { const x = -W + (2 * W * i) / 24; pts.push(V(ox + x, f(x), surf(x, f(x)) + 0.07)); }
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.045, 6), new THREE.MeshBasicMaterial({ color: 0x5a0c18 })));
  }
  // dentes humanos: quadrados, amarelados, apertados em duas filas (um riso fixo, como o de um crânio)
  const toothM = new THREE.MeshStandardMaterial({ color: 0xd9cfa2, roughness: 0.55, emissive: 0x2e2410, emissiveIntensity: 0.5 });
  const NT = 13;
  for (let i = 0; i < NT; i++) {
    const x = -W * 0.8 + (2 * W * 0.8 * i) / (NT - 1);
    const gp = gap(x), slope = Math.atan((3.4 * x) / (W * W));
    const lenU = Math.min(0.44, gp * 0.5), lenL = Math.min(0.4, gp * 0.46), w = 0.235;
    const tu = cast(new THREE.Mesh(new THREE.BoxGeometry(w, lenU, 0.14), toothM));
    tu.position.set(ox + x, upper(x) - lenU / 2 + 0.02, surf(x, upper(x)) + 0.09); tu.rotation.z = slope; head.add(tu);
    const tl = cast(new THREE.Mesh(new THREE.BoxGeometry(w, lenL, 0.14), toothM));
    tl.position.set(ox + x, lower(x) + lenL / 2 - 0.02, surf(x, lower(x)) + 0.09); tl.rotation.z = slope; head.add(tl);
  }
  // pele rachada e faces encovadas
  for (let k = 0; k < 7; k++) {
    const sd = k % 2 ? 1 : -1, x0 = sd * (0.3 + (k % 4) * 0.45), y0 = 2.0 - (k % 3) * 0.7;
    const pts = [V(x0, y0, surf(x0, y0) + 0.02), V(x0 + sd * 0.3, y0 - 0.4, surf(x0 + sd * 0.3, y0 - 0.4) + 0.02), V(x0 + sd * 0.1, y0 - 0.9, surf(x0 + sd * 0.1, y0 - 0.9) + 0.02), V(x0 + sd * 0.45, y0 - 1.3, surf(x0 + sd * 0.45, y0 - 1.3) + 0.02)];
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.02, 4), dark));
  }
  for (const sd of [-1, 1]) {
    const hol = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 }));
    hol.scale.set(0.8, 0.9, 0.22); hol.position.set(sd * 1.72, -0.95, surf(1.72, -0.95) + 0.02); head.add(hol);
  }
  // cicatrizes das comissuras até às maçãs + pontos de costura
  for (const s of [-1, 1]) {
    const c0 = V(s * W, lower(W), surf(W * 0.98, lower(W)) + 0.05);
    const pts = [c0, V(s * 2.05, 0.45, surf(2.0, 0.45) + 0.06), V(s * 2.1, 1.2, surf(2.0, 1.2) + 0.05)];
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.055, 6), new THREE.MeshBasicMaterial({ color: 0x4a0a14 })));
    for (let k = 0; k < 5; k++) {
      const t = (k + 0.5) / 5, p = new THREE.CatmullRomCurve3(pts).getPoint(t);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.035), dark); st.position.copy(p); st.rotation.z = Math.PI / 2 - s * 0.2; head.add(st);
    }
  }

  // ───────── mãos gigantes a agarrar o planeta pelos lados ─────────
  const hskin = new THREE.MeshStandardMaterial({ color: 0x7d8496, roughness: 0.7, metalness: 0.3 }), hskinD = new THREE.MeshStandardMaterial({ color: 0x4b515f, roughness: 0.85, metalness: 0.25 });
  const wrapM = new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.98 });
  const metalM = new THREE.MeshStandardMaterial({ color: 0x8f98aa, metalness: 0.9, roughness: 0.3 });
  const fingers: { pivot: THREE.Group; ph: number }[] = [];
  const bone = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, parent: THREE.Object3D, m: THREE.Material) => {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const o = cast(new THREE.Mesh(new THREE.CapsuleGeometry((r0 + r1) / 2, Math.max(0.01, len - r0 - r1), 5, 10), m));
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    parent.add(o); return o;
  };
  for (const s of [-1, 1]) {
    const hand = new THREE.Group();
    hand.position.set(s * (Rd + 1.6), 0.6, -0.3); hand.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; hand.scale.setScalar(1.55);
    group.add(hand);
    const palm = cast(new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), hskin)); palm.scale.set(1.75, 0.62, 1.5); palm.position.set(0, 0.2, -0.1); hand.add(palm);
    const heel = cast(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), hskin)); heel.scale.set(1.2, 0.55, 0.9); heel.position.set(0, 0.1, -1.0); hand.add(heel);
    // antebraço entra pelo lado do ecrã: enfaixado como uma múmia, com grilhão de metal
    bone(V(0, 0.15, -1.5), V(0, 0.9, -11), 0.8, 1.05, hand, hskin);
    for (let k = 0; k < 14; k++) {
      const r = 0.84 + k * 0.014, wz = -2.0 - k * 0.62;
      const w = new THREE.Mesh(new THREE.TorusGeometry(r, 0.085, 6, 18), wrapM); w.position.set(0, 0.15 + (k * 0.75) / 14 * 0.9 * 0.8, wz); w.rotation.x = Math.PI / 2 + (k % 2 ? 0.28 : -0.28); w.rotation.y = (k % 3) * 0.2; hand.add(w);
    }
    const cuff = cast(new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.17, 8, 20), metalM)); cuff.position.set(0, 0.17, -1.75); cuff.rotation.x = Math.PI / 2; hand.add(cuff);
    for (let k = 0; k < 4; k++) { const cl = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 6, 12), metalM); cl.position.set(0, -0.35 - k * 0.38, -1.75); cl.rotation.y = k % 2 ? Math.PI / 2 : 0; cl.scale.set(0.75, 1.2, 1); hand.add(cl); }
    // quatro dedos nodosos que se enrolam sobre o rebordo, mais o polegar
    const spec = [{ x: -1.3, l: [1.25, 1.05, 0.85] }, { x: -0.45, l: [1.45, 1.2, 0.95] }, { x: 0.42, l: [1.4, 1.15, 0.9] }, { x: 1.28, l: [1.1, 0.9, 0.75] }];
    spec.forEach((f, idx) => {
      const pivot = new THREE.Group(); pivot.position.set(f.x, 0.38, 1.05); hand.add(pivot); fingers.push({ pivot, ph: idx * 0.8 + (s > 0 ? 0 : 0.4) });
      const kn = cast(new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), hskinD)); pivot.add(kn);
      let p = V(0, 0, 0);
      const pitch = [0.3, -0.25, -0.95];
      f.l.forEach((len, j) => {
        const splay = (idx - 1.5) * 0.05;
        const dir = V(splay, Math.sin(pitch[j]), Math.cos(pitch[j])).normalize();
        const q = p.clone().addScaledVector(dir, len);
        bone(p, q, 0.3 - j * 0.045, 0.27 - j * 0.05, pivot, hskin);
        const jt = cast(new THREE.Mesh(new THREE.SphereGeometry(0.28 - j * 0.045, 10, 8), hskinD)); jt.position.copy(q); pivot.add(jt);
        const wr = new THREE.Mesh(new THREE.TorusGeometry(0.27 - j * 0.045, 0.018, 4, 12), dark); wr.position.copy(q); wr.rotation.y = Math.PI / 2; pivot.add(wr);
        p = q;
      });
      const nail = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 0.5, metalness: 0.4 })));
      nail.position.copy(p).add(V(0, -0.08, 0.12)); nail.rotation.x = Math.PI / 2 - 0.5; pivot.add(nail);
    });
    const tp = new THREE.Group(); tp.position.set(s * 1.6, 0.25, 0.25); hand.add(tp); fingers.push({ pivot: tp, ph: 2.1 });
    let p = V(0, 0, 0);
    [[1.1, 0.35, 0.55], [0.9, -0.2, 0.7]].forEach(([len, pit, yaw], j) => {
      const dir = V(-s * Math.sin(yaw), Math.sin(pit), Math.cos(yaw)).normalize();
      const q = p.clone().addScaledVector(dir, len);
      bone(p, q, 0.34 - j * 0.05, 0.3 - j * 0.05, tp, hskin);
      const jt = cast(new THREE.Mesh(new THREE.SphereGeometry(0.3 - j * 0.05, 10, 8), hskinD)); jt.position.copy(q); tp.add(jt);
      p = q;
    });
  }

  // luzes de palco: azul à esquerda, vermelho à direita (como um cartaz de concerto)
  const blue = new THREE.DirectionalLight(0x2f6bff, 2.6); blue.position.set(-14, 10, -2); blue.target = head; group.add(blue);
  const red = new THREE.DirectionalLight(0xff2a3a, 2.4); red.position.set(14, 6, -2); red.target = head; group.add(red);

  // testa: pino de metal com gema e uma chama de vela no alto da cabeça
  const stud = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.28, 4, 10), new THREE.MeshStandardMaterial({ color: 0xcfd6e6, metalness: 0.9, roughness: 0.25 }));
  stud.position.set(0, 1.95, surf(0, 1.95) + 0.12); head.add(stud);
  const gem = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: hdr(0xff2030, 3), toneMapped: false })); gem.position.set(0, 1.95, surf(0, 1.95) + 0.3); head.add(gem);
  const crownFlame = new THREE.Group(); crownFlame.position.set(0, FB * 0.98, 0.3); head.add(crownFlame);
  const fprof = [[0, 0], [0.28, 0.02], [0.45, 0.25], [0.42, 0.6], [0.26, 0.95], [0.1, 1.3], [0, 1.7]].map(([r, y]) => new THREE.Vector2(r, y));
  crownFlame.add(new THREE.Mesh(new THREE.LatheGeometry(fprof, 16), new THREE.MeshBasicMaterial({ color: hdr(0xff7a1a, 1.8), transparent: true, opacity: 0.92, toneMapped: false, fog: false })));
  const fcore = new THREE.Mesh(new THREE.LatheGeometry(fprof.map((v) => new THREE.Vector2(v.x * 0.55, v.y * 0.8 + 0.05)), 12), new THREE.MeshBasicMaterial({ color: hdr(0xffe6a0, 2.2), toneMapped: false, fog: false })); crownFlame.add(fcore);

  // cabelo grisalho em madeixas, a escorrer dos lados do crânio
  const hairM = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.9 });
  const hair = new THREE.Group(); head.add(hair);
  for (let i = 0; i < 34; i++) {
    const sd = i % 2 ? 1 : -1, k = i / 34;
    const x0 = sd * (0.6 + k * 1.5), y0 = FB * (0.92 - k * 0.45);
    const pts = [V(x0, y0, 0.2 - k), V(sd * (FA + 0.3 + k * 0.5), y0 - 1.2, -0.3), V(sd * (FA + 0.5 + Math.sin(i) * 0.4), y0 - 3.0 - k, -0.6), V(sd * (FA + 0.2 + Math.cos(i * 1.7) * 0.5), y0 - 5.2 - k * 1.5, -0.9)];
    hair.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.035 + (i % 3) * 0.012, 5), hairM));
  }

  // correntes penduradas, a balançar diante da cara
  const chains: THREE.Group[] = [];
  const linkM = new THREE.MeshStandardMaterial({ color: 0x9aa3b4, metalness: 0.9, roughness: 0.3 });
  const linkG = new THREE.TorusGeometry(0.34, 0.09, 8, 16);
  for (const sx of [-1, 1]) {
    const ch = new THREE.Group(); ch.position.set(sx * 4.6, 24, -8.5); group.add(ch);
    for (let k = 0; k < 30; k++) {
      const l = new THREE.Mesh(linkG, linkM); l.scale.set(0.8, 1.25, 1); l.position.y = -k * 0.62; l.rotation.y = k % 2 ? Math.PI / 2 : 0; l.castShadow = false; ch.add(l);
    }
    chains.push(ch);
  }

  // archotes diante do planeta + brasas a subir
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

  return {
    group, head, target, spots, cones, fingers,
    update(t, aim) {
      // os olhos seguem o jogador; a cabeça só acena na direção dele
      target.position.lerp(group.worldToLocal(aim.clone()), 0.08);
      const dx = Math.max(-1, Math.min(1, (target.position.x - head.position.x) / 8));
      head.rotation.y += (dx * 0.28 - head.rotation.y) * 0.05;
      head.rotation.x += (0.12 + Math.sin(t * 0.5) * 0.02 - head.rotation.x) * 0.05;
      head.rotation.z = Math.sin(t * 0.31) * 0.025;
      const fl = 0.9 + 0.1 * Math.sin(t * 7) + 0.05 * Math.sin(t * 23);
      spots.forEach((sp, i) => { sp.intensity = 2800 * fl * (i ? 1 : 0.95); });
      cones.forEach((c) => { (c.material as THREE.MeshBasicMaterial).opacity = 0.08 * fl; });
      fingers.forEach((f) => { f.pivot.rotation.x = Math.sin(t * 0.8 + f.ph) * 0.06; });
      head.scale.setScalar(2.55 * (1 + 0.006 * Math.sin(t * 1.4)));   // respira
      group.position.y = Math.sin(t * 0.5) * 0.1;
      chains.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.05; c.rotation.x = Math.sin(t * 0.7 + i) * 0.04; });
      hair.rotation.z = Math.sin(t * 0.6) * 0.015; hair.position.x = Math.sin(t * 0.8) * 0.04;
      const ff = 0.9 + 0.12 * Math.sin(t * 17) + 0.06 * Math.sin(t * 29);
      crownFlame.scale.set(1 - 0.08 * Math.sin(t * 11), ff, 1); crownFlame.rotation.z = Math.sin(t * 3.1) * 0.1; fcore.scale.y = 0.95 + 0.1 * Math.sin(t * 21);
      flames.forEach((f) => { const q = 0.9 + 0.15 * Math.sin(t * 15 + f.ph * 3) + 0.07 * Math.sin(t * 27 + f.ph); f.g.scale.set(1 - 0.1 * Math.sin(t * 9 + f.ph), q, 1); f.g.rotation.z = Math.sin(t * 4 + f.ph) * 0.12; });
      const pa = eg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < EM; i++) { let y = pa.getY(i) + ev[i] * 0.022; if (y > 13) y = -2; pa.setY(i, y); pa.setX(i, pa.getX(i) + Math.sin(t * 1.3 + i) * 0.006); }
      pa.needsUpdate = true;
    },
  };
}





