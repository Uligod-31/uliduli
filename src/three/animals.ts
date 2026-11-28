// Os três animais do Reino Animal (e montarias do Uli): formas simples e expressivas, com contorno que se lê
// de longe. Cada um sabe animar-se (respirar, andar, abanar a cauda e as orelhas).
import * as THREE from 'three';
import { hdr } from './common';

export type Beast = 'elephant' | 'monkey' | 'gazelle';
export interface Animal { group: THREE.Group; ride: number; animate(t: number, speed: number): void }
export const BEAST_COLOR: Record<Beast, number> = { elephant: 0x9fb4ff, monkey: 0xffa24a, gazelle: 0xffe27a };

const mat = (color: number, emissive = 0.22) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, emissive: new THREE.Color(color), emissiveIntensity: emissive });
const ball = (r: number, m: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), m); s.position.set(x, y, z); s.scale.set(sx, sy, sz); s.castShadow = true; return s;
};
const leg = (m: THREE.Material, x: number, z: number, h: number, r: number) => {
  const g = new THREE.Group(); g.position.set(x, h, z);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, h, 10).translate(0, -h / 2, 0), m); c.castShadow = true; g.add(c); return g;
};
function eyes(head: THREE.Object3D, y: number, z: number, gap: number, r: number) {
  const white = new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 1.3), toneMapped: false }), black = new THREE.MeshBasicMaterial({ color: 0x07070c });
  for (const s of [-1, 1]) { head.add(ball(r, white, s * gap, y, z)); head.add(ball(r * 0.55, black, s * gap, y, z + r * 0.72)); }
}

export function makeAnimal(kind: Beast): Animal {
  const group = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  group.add(body); body.add(head);
  const legs: THREE.Group[] = [];
  let tail: THREE.Object3D, ride: number, wag: THREE.Object3D[] = [];
  if (kind === 'elephant') {
    const skin = mat(0x8e9ac4), pink = mat(0xff9ad0, 0.35), ivory = mat(0xfff4d8, 0.5);
    body.add(ball(0.25, skin, 0, 0.3, -0.04, 1.05, 0.88, 1.2));
    head.position.set(0, 0.36, 0.24);
    head.add(ball(0.17, skin, 0, 0, 0));
    for (const s of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(s * 0.13, 0.03, -0.03);
      ear.add(ball(0.13, skin, s * 0.07, 0, 0, 1, 1.15, 0.22), ball(0.085, pink, s * 0.07, 0, 0.025, 1, 1.15, 0.12));
      head.add(ear); wag.push(ear);
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.15, 8), ivory); tusk.position.set(s * 0.07, -0.1, 0.15); tusk.rotation.x = 2.2; head.add(tusk);
    }
    const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.02, 0.13), new THREE.Vector3(0, -0.14, 0.22), new THREE.Vector3(0, -0.24, 0.2), new THREE.Vector3(0, -0.26, 0.28)]);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(trunk, 20, 0.045, 10), skin));
    eyes(head, 0.05, 0.14, 0.07, 0.03);
    for (const [x, z] of [[-0.13, 0.12], [0.13, 0.12], [-0.13, -0.2], [0.13, -0.2]]) { const l = leg(skin, x, z, 0.2, 0.065); legs.push(l); body.add(l); }
    tail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6).translate(0, -0.09, 0), skin); tail.position.set(0, 0.36, -0.33); body.add(tail);
    ride = 0.46;
  } else if (kind === 'monkey') {
    const fur = mat(0xb8672e), face = mat(0xffd2a0, 0.35);
    body.add(ball(0.15, fur, 0, 0.25, -0.03, 1, 1.15, 0.95), ball(0.09, face, 0, 0.23, 0.07, 1, 1.2, 0.6));
    head.position.set(0, 0.47, 0.06);
    head.add(ball(0.13, fur, 0, 0, 0), ball(0.085, face, 0, -0.02, 0.075, 1.1, 1, 0.65));
    for (const s of [-1, 1]) { head.add(ball(0.052, fur, s * 0.14, 0.02, 0, 1, 1, 0.4), ball(0.03, face, s * 0.145, 0.02, 0.022, 1, 1, 0.3)); }
    eyes(head, 0.02, 0.12, 0.045, 0.026);
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(s * 0.14, 0.34, 0);
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.2, 4, 8).translate(0, -0.12, 0), fur); arm.add(a, ball(0.04, face, 0, -0.25, 0)); arm.rotation.z = s * 0.45; body.add(arm); wag.push(arm);
      const l = leg(fur, s * 0.07, -0.02, 0.13, 0.038); legs.push(l); body.add(l);
    }
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.04, -0.16), new THREE.Vector3(0.05, 0.14, -0.24), new THREE.Vector3(0.1, 0.24, -0.14)]);
    tail = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.022, 8), fur); tail.position.set(0, 0.18, -0.12); body.add(tail);
    ride = 0.5;
  } else {
    const hide = mat(0xe8b04e), belly = mat(0xfff0cc, 0.4), dark = mat(0x3a2410, 0.1);
    body.add(ball(0.14, hide, 0, 0.36, -0.03, 0.9, 0.85, 1.55), ball(0.1, belly, 0, 0.31, -0.02, 0.9, 0.6, 1.5));
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.24, 10), hide); neck.position.set(0, 0.48, 0.18); neck.rotation.x = 0.55; body.add(neck);
    head.position.set(0, 0.6, 0.27);
    head.add(ball(0.082, hide, 0, 0, 0, 1, 0.95, 1.2), ball(0.045, belly, 0, -0.025, 0.09), ball(0.018, dark, 0, -0.015, 0.135));
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.013, 6, 16, 1.7), dark); horn.position.set(s * 0.04, 0.11, -0.09); horn.rotation.set(0, Math.PI / 2, 0.15); head.add(horn);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 8), hide); ear.position.set(s * 0.09, 0.06, -0.02); ear.rotation.z = -s * 0.9; head.add(ear); wag.push(ear);
    }
    eyes(head, 0.025, 0.07, 0.045, 0.022);
    for (const [x, z] of [[-0.075, 0.13], [0.075, 0.13], [-0.075, -0.18], [0.075, -0.18]]) { const l = leg(hide, x, z, 0.28, 0.027); l.add(ball(0.03, dark, 0, -0.27, 0)); legs.push(l); body.add(l); }
    tail = ball(0.04, belly, 0, 0.42, -0.26); body.add(tail);
    ride = 0.46;
  }
  const baseTail = tail.rotation.clone();
  return {
    group, ride,
    animate(t, speed) {
      const run = Math.min(1, speed), f = t * (kind === 'gazelle' ? 16 : kind === 'monkey' ? 13 : 9);
      body.position.y = Math.abs(Math.sin(f)) * 0.05 * run + Math.sin(t * 2.2) * 0.008;
      legs.forEach((l, i) => { l.rotation.x = Math.sin(f + (i % 2 === 0 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * 0.6 * run; });
      head.rotation.y = Math.sin(t * 0.9) * 0.16 * (1 - run); head.rotation.x = Math.sin(t * 1.4) * 0.05;
      tail.rotation.z = baseTail.z + Math.sin(t * 3.4) * 0.3;
      wag.forEach((e, i) => { const s = i % 2 ? 1 : -1; if (kind === 'elephant') e.rotation.y = s * Math.sin(t * 2.6) * 0.28; else if (kind === 'monkey') e.rotation.x = Math.sin(f + i * Math.PI) * 0.7 * run; });
    },
  };
}
