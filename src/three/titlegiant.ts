import * as THREE from 'three';
import { hdr } from './common';

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
  const skin = new THREE.MeshStandardMaterial({ color: 0xcfc6ae, roughness: 0.85 });
  const skinD = new THREE.MeshStandardMaterial({ color: 0x9d9380, roughness: 0.9 });
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
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 6), skinD); nose.position.set(0, -0.25, surf(0, -0.3) + 0.2); nose.rotation.x = Math.PI / 2 - 0.35; head.add(nose);
  for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), dark); n.scale.set(0.8, 1.4, 0.5); n.position.set(s * 0.18, -0.65, surf(0.18, -0.65) + 0.28); n.rotation.z = s * 0.3; head.add(n); }

  // olhos: cavidades fundas + chama amarela inclinada + sobrancelhas más
  const spots: THREE.SpotLight[] = [], cones: THREE.Mesh[] = [];
  const target = new THREE.Object3D(); group.add(target);
  for (const s of [-1, 1]) {
    const ex = s * 1.0, ey = 0.85, ez = surf(ex, ey);
    const sock = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), dark); sock.scale.set(0.82, 0.5, 0.3); sock.position.set(ex, ey, ez - 0.1); sock.rotation.z = s * 0.36; head.add(sock);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: hdr(0xffd24a, 3.4), toneMapped: false, fog: false }));
    eye.scale.set(0.58, 0.19, 0.16); eye.position.set(ex, ey - 0.02, ez + 0.34); eye.rotation.z = s * 0.36; head.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x120800 })); pup.scale.set(0.05, 0.19, 0.06); pup.position.set(ex + s * 0.02, ey - 0.02, ez + 0.5); head.add(pup);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.2), dark); brow.position.set(ex, ey + 0.62, surf(ex, ey + 0.62) + 0.06); brow.rotation.z = s * 0.38; head.add(brow);
    const bag = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 6, 20, Math.PI), dark); bag.position.set(ex, ey - 0.35, surf(ex, ey - 0.35) + 0.02); bag.rotation.z = Math.PI + s * 0.1; head.add(bag);
    const sp = new THREE.SpotLight(0xffd070, 2800, 0, 0.4, 0.75, 2);
    sp.position.set(ex, ey, ez + 0.4); sp.target = target; head.add(sp); spots.push(sp);
    const L = 9;
    const cg = new THREE.ConeGeometry(1.5, L, 28, 1, true); cg.translate(0, -L / 2, 0); cg.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    cone.position.set(ex, ey, ez + 0.3); cone.rotation.x = 0.6; head.add(cone); cones.push(cone);
  }
  // luz de baixo (vela) para os dentes se verem
  const under = new THREE.PointLight(0xff9a50, 520, 0, 2); under.position.set(0, -3.2, 5.5); head.add(under);

  const fill = new THREE.PointLight(0xffc880, 110, 0, 2); fill.position.set(0, 5, -4); group.add(fill);

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
  // dentes irregulares nas duas filas
  const toothM = new THREE.MeshStandardMaterial({ color: 0xe6dcb8, roughness: 0.5, emissive: 0x3a2e14, emissiveIntensity: 0.6 });
  const NT = 15;
  for (let i = 0; i < NT; i++) {
    const x = -W * 0.9 + (2 * W * 0.9 * i) / (NT - 1);
    const j = 0.8 + 0.4 * Math.abs(Math.sin(i * 2.7));
    const gp = gap(x);
    const lenU = Math.min(0.55 * j, gp * 0.62 + 0.12), lenL = Math.min(0.5 * j, gp * 0.58 + 0.1);
    const tu = cast(new THREE.Mesh(new THREE.ConeGeometry(0.115, lenU, 5), toothM));
    tu.rotation.x = Math.PI; tu.position.set(ox + x, upper(x) - lenU / 2 + 0.03, surf(x, upper(x)) + 0.09); head.add(tu);
    const tl = cast(new THREE.Mesh(new THREE.ConeGeometry(0.105, lenL, 5), toothM));
    tl.position.set(ox + x + 0.09, lower(x) + lenL / 2 - 0.02, surf(x, lower(x)) + 0.09); head.add(tl);
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

  // ───────── braços e mãos, a agarrar o planeta por trás ─────────
  const hskin = new THREE.MeshStandardMaterial({ color: 0x8c826e, roughness: 0.9 }), hskinD = new THREE.MeshStandardMaterial({ color: 0x625a4b, roughness: 0.95 });
  const fingers: { pivot: THREE.Group; ph: number }[] = [];
  const bone = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, parent: THREE.Object3D, m: THREE.Material) => {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const o = cast(new THREE.Mesh(new THREE.CapsuleGeometry((r0 + r1) / 2, Math.max(0.01, len - r0 - r1), 5, 10), m));
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    parent.add(o); return o;
  };
  for (const s of [-1, 1]) {
    const wz = -(Rd + 0.5), wx = s * 4.3;
    const curve = new THREE.CatmullRomCurve3([V(s * 8.5, -1, -21), V(s * 10.5, 4.5, -19), V(s * 8.2, 3, -(Rd + 7)), V(wx + s * 0.4, 1.0, wz - 2.0)]);
    group.add(cast(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.95, 12), cloth)));
    const hand = new THREE.Group(); hand.position.set(wx, 0.35, wz); hand.rotation.y = -s * 0.12; group.add(hand);
    const cuff = cast(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.8, 16), cloth)); cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0.05, -1.7); hand.add(cuff);
    // palma: placa larga e carnuda + dorso nodoso
    const palm = cast(new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), hskin)); palm.scale.set(1.75, 0.62, 1.5); palm.position.set(0, 0.2, -0.1); hand.add(palm);
    const heel = cast(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), hskin)); heel.scale.set(1.2, 0.55, 0.9); heel.position.set(0, 0.1, -1.0); hand.add(heel);
    // dedos: 3 falanges cada, arqueados sobre o rebordo do planeta, com articulações e unhas
    const spec = [{ x: -1.3, l: [1.25, 1.05, 0.85] }, { x: -0.45, l: [1.45, 1.2, 0.95] }, { x: 0.42, l: [1.4, 1.15, 0.9] }, { x: 1.28, l: [1.1, 0.9, 0.75] }];
    spec.forEach((f, idx) => {
      const pivot = new THREE.Group(); pivot.position.set(f.x * (s > 0 ? 1 : 1), 0.38, 1.05); hand.add(pivot); fingers.push({ pivot, ph: idx * 0.8 + (s > 0 ? 0 : 0.4) });
      const kn = cast(new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), hskinD)); pivot.add(kn);
      let p = V(0, 0, 0);
      const pitch = [0.42, -0.1, -0.75];
      f.l.forEach((len, j) => {
        const splay = (idx - 1.5) * 0.04;
        const dir = V(splay, Math.sin(pitch[j]), Math.cos(pitch[j])).normalize();
        const q = p.clone().addScaledVector(dir, len);
        bone(p, q, 0.3 - j * 0.045, 0.27 - j * 0.05, pivot, hskin);
        const jt = cast(new THREE.Mesh(new THREE.SphereGeometry(0.28 - j * 0.045, 10, 8), hskinD)); jt.position.copy(q); pivot.add(jt);
        // vincos da pele na articulação
        const wr = new THREE.Mesh(new THREE.TorusGeometry(0.27 - j * 0.045, 0.018, 4, 12), dark); wr.position.copy(q); wr.rotation.y = Math.PI / 2; pivot.add(wr);
        p = q;
      });
      const nail = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 4, 8), new THREE.MeshStandardMaterial({ color: 0x3a342a, roughness: 0.5 })));
      nail.position.copy(p).add(V(0, -0.08, 0.12)); nail.rotation.x = Math.PI / 2 - 0.5; pivot.add(nail);
    });
    // polegar a apertar de lado
    const tp = new THREE.Group(); tp.position.set(-s * 1.55, 0.25, 0.25); hand.add(tp); fingers.push({ pivot: tp, ph: 2.1 });
    let p = V(0, 0, 0);
    [[1.1, 0.35, 0.55], [0.9, -0.2, 0.7]].forEach(([len, pit, yaw], j) => {
      const dir = V(-s * Math.sin(yaw), Math.sin(pit), Math.cos(yaw)).normalize();
      const q = p.clone().addScaledVector(dir, len);
      bone(p, q, 0.34 - j * 0.05, 0.3 - j * 0.05, tp, hskin);
      const jt = cast(new THREE.Mesh(new THREE.SphereGeometry(0.3 - j * 0.05, 10, 8), hskinD)); jt.position.copy(q); tp.add(jt);
      p = q;
    });
  }

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
    },
  };
}



