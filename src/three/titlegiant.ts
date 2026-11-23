import * as THREE from 'three';
import { hdr } from './common';

export interface TitleGiant {
  group: THREE.Group;
  head: THREE.Group;
  target: THREE.Object3D;
  spots: THREE.SpotLight[];
  cones: THREE.Mesh[];
  hands: THREE.Group[];
  fingers: { pivot: THREE.Group; ph: number }[];
  update(t: number, aim: THREE.Vector3): void;
}

/**
 * O Crescido colossal do menu: debruça-se sobre o planeta, de braços longuíssimos e mãos enormes
 * a agarrar o rebordo. Os olhos acendem-se e iluminam o labirinto (e o Uli) como holofotes.
 */
export function makeTitleGiant(Rd: number): TitleGiant {
  const group = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x15131a, roughness: 0.95 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb4a98f, roughness: 0.9 });
  const skinD = new THREE.MeshStandardMaterial({ color: 0x8f8670, roughness: 0.95 });
  const cast = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; return m; };

  // tronco debruçado
  const torso = cast(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), cloth));
  torso.scale.set(6.5, 8.5, 3.6); torso.position.set(0, -0.5, -21); torso.rotation.x = 0.35;
  group.add(torso);

  // pescoço comprido e cabeça pequena (a cabeça gira para o jogador)
  const neck = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 5, 10), skinD));
  neck.position.set(0, 4.6, -17.6); neck.rotation.x = -0.75;
  group.add(neck);
  const head = new THREE.Group(); head.position.set(0, 7.4, -14.2); group.add(head);
  const skull = cast(new THREE.Mesh(new THREE.SphereGeometry(2.3, 24, 18), skin)); skull.scale.set(0.9, 1.1, 1); head.add(skull);
  const brim = cast(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.18, 24), cloth)); brim.position.y = 1.9; brim.rotation.x = -0.1; head.add(brim);
  const hat = cast(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.0, 3.4, 20), cloth)); hat.position.y = 3.6; head.add(hat);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.02, 0.35, 20), new THREE.MeshStandardMaterial({ color: 0x8a1c2a, roughness: 0.8 })); band.position.y = 2.2; head.add(band);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x050403 })); mouth.position.set(0, -0.9, 2.1); head.add(mouth);
  for (let k = -3; k <= 3; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.06), new THREE.MeshBasicMaterial({ color: 0x050403 })); st.position.set(k * 0.22, -0.9, 2.12); head.add(st); }

  // olhos: fendas a arder + holofotes + feixes de luz volumétricos
  const spots: THREE.SpotLight[] = [], cones: THREE.Mesh[] = [];
  const target = new THREE.Object3D(); group.add(target);
  for (const s of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), new THREE.MeshBasicMaterial({ color: 0x050403 })); socket.scale.set(1.25, 0.8, 0.5); socket.position.set(s * 0.85, 0.35, 2.0); head.add(socket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), new THREE.MeshBasicMaterial({ color: hdr(0xffd86a, 3.2), toneMapped: false, fog: false })); eye.scale.set(1.2, 0.7, 0.5); eye.position.set(s * 0.85, 0.35, 2.12); head.add(eye);
    const sp = new THREE.SpotLight(0xffd070, 2600, 0, 0.42, 0.75, 2);
    sp.position.set(s * 0.85, 0.35, 2.3); sp.target = target;
    head.add(sp); spots.push(sp);
    const L = 20;
    const cg = new THREE.ConeGeometry(3.2, L, 28, 1, true); cg.translate(0, -L / 2, 0); cg.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    cone.position.set(s * 0.85, 0.35, 2.3); head.add(cone); cones.push(cone);
  }

  // braços longuíssimos até ao rebordo do planeta
  const hands: THREE.Group[] = [];
  const fingers: { pivot: THREE.Group; ph: number }[] = [];
  for (const s of [-1, 1]) {
    const hx = s * (Rd + 0.9);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 5.6, 4.5, -20), new THREE.Vector3(s * 11, 3.2, -16), new THREE.Vector3(s * (Rd + 4), 1.6, -8), new THREE.Vector3(hx + s * 0.5, 0.45, -3.4),
    ]);
    group.add(cast(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.8, 10), cloth)));
    const hand = new THREE.Group(); hand.position.set(hx + s * 0.9, 0.35, -2.2); group.add(hand); hands.push(hand);
    const cuff = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.6, 14), cloth)); cuff.rotation.z = Math.PI / 2; cuff.position.set(s * 0.9, 0.05, -1.2); cuff.rotation.y = 0.5 * s; hand.add(cuff);
    const palm = cast(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skin)); palm.scale.set(1.6, 0.8, 2.1); palm.position.set(0.1 * s, 0.1, 0); hand.add(palm);
    // quatro dedos nodosos que arqueiam sobre o rebordo, mais o polegar
    for (let f = 0; f < 5; f++) {
      const thumb = f === 4;
      const z0 = thumb ? 1.8 : -1.5 + f * 1.0;
      const pivot = new THREE.Group(); pivot.position.set(-s * 1.2, 0.2, z0); hand.add(pivot);
      fingers.push({ pivot, ph: f * 0.7 });
      let px = 0, py = 0, pz = 0;
      const segs = thumb ? [0.9, 0.8] : [1.15, 1.0, 0.8];
      segs.forEach((len, j) => {
        const ang = thumb ? 0.25 + j * 0.3 : 0.28 + j * 0.55;   // arco crescente (garra)
        const dx = -s * Math.cos(ang) * len, dy = Math.sin(ang) * len * (j === 0 ? 1.2 : -0.4);
        const seg = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.2 - j * 0.03, 0.26 - j * 0.03, len, 8), skin));
        seg.position.set(px + dx / 2, py + dy / 2, pz); seg.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
        pivot.add(seg);
        const kn = cast(new THREE.Mesh(new THREE.SphereGeometry(0.27 - j * 0.03, 8, 6), skinD)); kn.position.set(px + dx, py + dy, pz); pivot.add(kn);
        px += dx; py += dy;
      });
      const nail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.6 })); nail.position.set(px - s * 0.12, py - 0.05, pz); nail.rotation.z = s * Math.PI / 2; pivot.add(nail);
    }
  }

  return {
    group, head, target, spots, cones, hands, fingers,
    update(t, aim) {
      // a cabeça segue o jogador; a luz dos olhos acompanha
      target.position.lerp(group.worldToLocal(aim.clone()), 0.08);
      head.lookAt(group.localToWorld(target.position.clone()));
      const fl = 0.9 + 0.1 * Math.sin(t * 7) + 0.05 * Math.sin(t * 23);
      spots.forEach((sp, i) => { sp.intensity = 2600 * fl * (i ? 1 : 0.95); });
      cones.forEach((c) => { (c.material as THREE.MeshBasicMaterial).opacity = 0.07 * fl; });
      // as mãos apertam e relaxam, devagar
      fingers.forEach((f) => { f.pivot.rotation.z = Math.sin(t * 0.7 + f.ph) * 0.05; f.pivot.position.y = 0.2 + Math.sin(t * 0.7 + f.ph) * 0.05; });
      group.position.y = Math.sin(t * 0.5) * 0.12;
    },
  };
}
