import * as THREE from 'three';
import { glowSprite, hdr } from './common';

const cast = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; return m; };

/**
 * Uli, o miúdo perdido: casacão azul-ardósia demasiado grande, cabelo desalinhado de ouro,
 * olhos enormes e escuros e o CACHECOL DOURADO (herança do pequeno príncipe) que flutua atrás.
 * Pés em y = 0. Altura ≈ 0.8.
 */
export function makeUli(): THREE.Group {
  const root = new THREE.Group();
  const fig = new THREE.Group();
  root.add(fig);
  const skin = new THREE.MeshStandardMaterial({ color: 0xeedccb, roughness: 0.7 });
  const coat = new THREE.MeshStandardMaterial({ color: 0x2b3a52, roughness: 0.92, side: THREE.DoubleSide });
  const coatD = new THREE.MeshStandardMaterial({ color: 0x1b2638, roughness: 0.95 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2b73c, emissive: 0x7a4e0c, emissiveIntensity: 0.7, roughness: 0.75 });
  const hair = new THREE.MeshStandardMaterial({ color: 0xe6b84e, roughness: 0.8 });

  const mkLeg = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.2, 0);
    const l = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0xd9c9b4, roughness: 0.8 }))); l.position.y = -0.07;
    const b = cast(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.07, 0.15), boot)); b.position.set(0, -0.165, 0.02);
    const t = cast(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), boot)); t.scale.set(1, 0.8, 1); t.position.set(0, -0.155, 0.09);
    p.add(l, b, t); fig.add(p); return p;
  };
  const legL = mkLeg(-0.055), legR = mkLeg(0.055);

  // casacão em sino (largo, a tapar quase tudo) + gola alta + remendo + estrela
  const bell = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.215, 0.36, 18, 1, true), coat)); bell.position.y = 0.34;
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.012, 6, 24), coatD); hem.rotation.x = Math.PI / 2; hem.position.y = 0.16;
  const shoulders = cast(new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12), coat)); shoulders.scale.set(1.08, 0.7, 0.85); shoulders.position.y = 0.5;
  const collar = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.07, 14, 1, true), coatD)); collar.position.y = 0.55;
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 1 })); patch.position.set(0.07, 0.3, 0.19); patch.rotation.set(0.1, 0.25, 0.2);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.026), new THREE.MeshBasicMaterial({ color: hdr(0xffd36a, 2.2), toneMapped: false })); star.scale.set(1, 1, 0.3); star.position.set(-0.07, 0.43, 0.125);
  fig.add(bell, hem, shoulders, collar, patch, star);

  // mangas compridas: as mãos mal espreitam
  const mkArm = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.49, 0);
    const a = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.15, 6, 10), coat)); a.position.y = -0.1;
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12), coatD); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.2;
    const hand = cast(new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), skin)); hand.position.y = -0.225;
    p.add(a, cuff, hand); fig.add(p); return p;
  };
  const armL = mkArm(-0.155), armR = mkArm(0.155);

  // cabeça grande, pálida; olhos enormes e escuros; cabelo bravo
  const head = new THREE.Group(); head.position.y = 0.67; fig.add(head);
  head.add(cast(new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20), skin)));
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), new THREE.MeshStandardMaterial({ color: 0x07080b, roughness: 0.2, metalness: 0.2 }));
    e.scale.set(0.9, 1.3, 0.5); e.position.set(s * 0.058, -0.01, 0.13); head.add(e);
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); sp.position.set(s * 0.058 + 0.012, 0.012, 0.145); head.add(sp);
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), new THREE.MeshBasicMaterial({ color: 0xd98a7a, transparent: true, opacity: 0.35 })); blush.position.set(s * 0.09, -0.06, 0.12); blush.rotation.y = s * 0.6; head.add(blush);
  }
  const cap = cast(new THREE.Mesh(new THREE.SphereGeometry(0.158, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), hair)); cap.position.y = 0.012; cap.rotation.x = -0.18; head.add(cap);
  const tufts = [[-0.1, 0.1, 0.05, 0.9], [0.0, 0.15, 0.0, 0.0], [0.1, 0.1, 0.04, -0.9], [-0.06, 0.12, -0.08, 0.6], [0.07, 0.12, -0.08, -0.5], [0.0, 0.1, 0.1, 0.0]];
  for (const [x, y, z, r] of tufts) {
    const t = cast(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), hair)); t.position.set(x, y + 0.03, z); t.rotation.set(z > 0.05 ? 0.9 : -0.2, 0, r); head.add(t);
  }

  // cachecol dourado (marca registada)
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.03, 8, 20), gold); neck.rotation.x = Math.PI / 2; neck.position.y = 0.55; fig.add(neck);
  const scarf: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.095 - i * 0.004, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: i % 3 === 2 ? 0xc98a24 : 0xf2b73c, emissive: 0x7a4e0c, emissiveIntensity: 0.65 - i * 0.04, roughness: 0.8 }));
    seg.castShadow = true; fig.add(seg); scarf.push(seg);
  }
  const halo = glowSprite(0xffc866, 0.5, 0.28); halo.position.set(0, 0.5, -0.2); fig.add(halo);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
  root.userData = { body: fig, shadow, legL, legR, armL, armR, scarf, head };
  return root;
}

/**
 * Crescido: os adultos do pequeno príncipe, em pesadelo. Altos, curvados, de braços até ao chão,
 * cabeça minúscula e pálida, mãos enormes.
 * variant: 0 = Rei (coroa e capa), 1 = Vaidoso (chapéu-alto), 2 = Homem de Negócios (chapéu de coco e pasta).
 */
export function makeGuard(variant = 0): THREE.Group {
  const root = new THREE.Group();
  const fig = new THREE.Group();
  root.add(fig);
  const v = variant % 3;
  const cloth = new THREE.MeshStandardMaterial({ color: [0x2a2224, 0x23262d, 0x1f2a25][v], roughness: 0.95 });
  const clothL = new THREE.MeshStandardMaterial({ color: [0x4a2f2c, 0x3a3f4a, 0x2d3d35][v], roughness: 0.95 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xcdbfa6, roughness: 0.85 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x0d0c0b, roughness: 0.7 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xc9a13a, emissive: 0x5a3c08, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.6 });
  const eyeM = new THREE.MeshBasicMaterial({ color: hdr(0xffd36a, 2.6), toneMapped: false });

  const mkLeg = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.66, 0);
    const l = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.62, 8), darkM)); l.position.y = -0.33;
    const foot = cast(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.22), darkM)); foot.position.set(0, -0.64, 0.05);
    p.add(l, foot); fig.add(p); return p;
  };
  const legL = mkLeg(-0.085), legR = mkLeg(0.085);

  // tronco curvado e barrigudo
  const up = new THREE.Group(); up.position.y = 0.66; up.rotation.x = 0.32; fig.add(up);
  const belly = cast(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), cloth)); belly.scale.set(1, 1.25, 0.95); belly.position.y = 0.25; up.add(belly);
  const chest = cast(new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), clothL)); chest.scale.set(1.15, 0.9, 0.85); chest.position.set(0, 0.5, 0.02); up.add(chest);
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), goldM); b.position.set(0, 0.2 + k * 0.1, 0.19 - k * 0.012); up.add(b); }

  // braços compridíssimos, mãos enormes
  const mkArm = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.52, 0.02);
    const a = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.78, 8), cloth)); a.position.y = -0.4;
    const hand = cast(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skin)); hand.scale.set(1, 1.3, 0.7); hand.position.y = -0.84;
    p.add(a, hand);
    for (let f = -1; f <= 1; f++) { const fi = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, 0.14, 5), skin)); fi.position.set(f * 0.03, -0.96, 0); fi.rotation.z = f * 0.12; p.add(fi); }
    up.add(p); return p;
  };
  const armL = mkArm(-0.24), armR = mkArm(0.24);

  // cabeça pequena e pálida, pescoço fino, olhos fundos a brilhar
  const neck = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.16, 8), skin)); neck.position.set(0, 0.68, 0.05); neck.rotation.x = -0.2; up.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.8, 0.1); up.add(head);
  const skull = cast(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skin)); skull.scale.set(0.9, 1.15, 1); head.add(skull);
  for (const s of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), darkM); socket.scale.set(1.1, 0.8, 0.5); socket.position.set(s * 0.04, 0.01, 0.085); head.add(socket);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), eyeM); e.position.set(s * 0.04, 0.01, 0.097); head.add(e);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.008, 0.01), darkM); mouth.position.set(0, -0.055, 0.1); head.add(mouth);

  if (v === 0) {
    // Rei: coroa e capa de arminho
    const crown = new THREE.Group(); crown.position.y = 0.12;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const c = cast(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 5), goldM)); c.position.set(Math.cos(a) * 0.07, 0.03, Math.sin(a) * 0.07); crown.add(c); }
    const band = cast(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 16), goldM)); band.rotation.x = Math.PI / 2; crown.add(band);
    head.add(crown);
    const cape = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.8, 14, 1, true, Math.PI * 0.55, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: 0x5c1620, roughness: 0.9, side: THREE.DoubleSide })));
    cape.position.set(0, 0.2, -0.16); cape.rotation.x = -0.1; up.add(cape);
  } else if (v === 1) {
    // Vaidoso: chapéu-alto absurdo com uma pena
    const brim = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.015, 16), darkM)); brim.position.y = 0.09; head.add(brim);
    const top = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.4, 14), darkM)); top.position.y = 0.3; head.add(top);
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.04, 14), goldM); rib.position.y = 0.14; head.add(rib);
    const pen = cast(new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0x8a1c2a, roughness: 0.8 }))); pen.position.set(0.08, 0.34, 0); pen.rotation.z = -0.5; head.add(pen);
  } else {
    // Homem de Negócios: chapéu de coco e pasta pesada
    const bowler = cast(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), darkM)); bowler.position.y = 0.06; head.add(bowler);
    const brim = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 16), darkM)); brim.position.y = 0.065; head.add(brim);
    const brief = cast(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.07), new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.6 }))); brief.position.set(0, -1.02, 0); armR.add(brief);
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.075), goldM); clasp.position.set(0, -0.93, 0); armR.add(clasp);
  }

  const glow = glowSprite(0xffb347, 1.4, 0.32); glow.position.set(0, 0.95, 0); fig.add(glow);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
  root.userData = { body: fig, legL, legR, armL, armR, head };
  return root;
}
