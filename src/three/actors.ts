import * as THREE from 'three';
import { brandAt } from '../core/theme';
import { glowSprite, hdr } from './common';

/**
 * Uli, rebelde: jaqueta de cabedal preta com neon, crista em gradiente, visor escuro, brinco e botas pesadas.
 * Toque característico: o CACHECOL NEON que flutua atrás dele. Pés em y = 0.
 */
export function makeUliRebel(): THREE.Group {
  const root = new THREE.Group();
  const fig = new THREE.Group();
  root.add(fig);
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b894, roughness: 0.55 });
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.25, metalness: 0.1 });
  const denim = new THREE.MeshStandardMaterial({ color: 0x20222a, roughness: 0.75 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc8ccd6, roughness: 0.25, metalness: 0.9 });
  const neonB = new THREE.MeshBasicMaterial({ color: hdr(0x5b92ff, 2.2), toneMapped: false });
  const neonF = new THREE.MeshBasicMaterial({ color: hdr(0xff4fd8, 2.2), toneMapped: false });
  const cast = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; return m; };
  const capsule = (r: number, l: number, mat: THREE.Material) => cast(new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), mat));

  // pernas + botas pesadas com sola neon
  const mkLeg = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.27, 0);
    const l = capsule(0.052, 0.13, denim); l.position.y = -0.1;
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.03, 0.02), neonB); knee.position.set(0, -0.09, 0.052);
    const boot = cast(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.075, 0.17), leather)); boot.position.set(0, -0.215, 0.025);
    const toe = cast(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), leather)); toe.scale.set(1, 0.7, 1); toe.position.set(0, -0.2, 0.1);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.2), neonF); sole.position.set(0, -0.258, 0.03);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.014, 0.012), metal); buckle.position.set(0, -0.19, 0.06);
    p.add(l, knee, boot, toe, sole, buckle); fig.add(p); return p;
  };
  const legL = mkLeg(-0.07), legR = mkLeg(0.07);

  // tronco: jaqueta de cabedal com riscas neon e ombros com pontas
  const torso = capsule(0.12, 0.14, leather); torso.position.y = 0.4; torso.scale.set(1.12, 1, 0.88);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.2, 0.012), metal); zip.position.set(0.03, 0.41, 0.108); zip.rotation.z = 0.08;
  fig.add(torso, zip);
  for (const s of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.18, 0.012), neonB); stripe.position.set(s * 0.1, 0.4, 0.088); fig.add(stripe);
    for (let k = 0; k < 3; k++) { const stud = cast(new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), metal)); stud.position.set(s * (0.15 + k * 0.012), 0.53 - k * 0.012, 0); stud.rotation.z = -s * (1.1 + k * 0.1); fig.add(stud); }
  }
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.014, 8, 24), metal);
  belt.rotation.x = Math.PI / 2; belt.position.y = 0.31; belt.scale.set(1.1, 0.88, 1); fig.add(belt);
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), neonF); emblem.position.set(-0.05, 0.45, 0.108); fig.add(emblem);

  // braços de cabedal + pulseira neon
  const mkArm = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.47, 0);
    const a = capsule(0.042, 0.12, leather); a.position.y = -0.09;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.01, 6, 14), neonF); band.rotation.x = Math.PI / 2; band.position.y = -0.17;
    const hand = cast(new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 8), skin)); hand.position.y = -0.21;
    p.add(a, band, hand); fig.add(p); return p;
  };
  const armL = mkArm(-0.175), armR = mkArm(0.175);

  // cabeça: crista (moicano) em gradiente, visor escuro, brinco, sorriso de lado
  const head = new THREE.Group(); head.position.y = 0.66; fig.add(head);
  const skull = cast(new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), skin)); skull.scale.set(1, 1.05, 1); head.add(skull);
  const jaw = cast(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skin)); jaw.scale.set(1.2, 0.8, 1); jaw.position.set(0, -0.1, 0.05); head.add(jaw);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), skin); ear.position.set(s * 0.165, -0.01, 0); head.add(ear);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 14), metal); ring.position.set(-0.17, -0.06, 0); ring.rotation.y = Math.PI / 2; head.add(ring);
  const visor = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 6, 14), new THREE.MeshPhysicalMaterial({ color: 0x08090d, roughness: 0.08, metalness: 0.6, clearcoat: 1 })));
  visor.rotation.z = Math.PI / 2; visor.scale.set(1, 1, 0.6); visor.position.set(0, 0.0, 0.14); head.add(visor);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: hdr(0xff4fd8, 3), toneMapped: false })); slit.position.set(0, 0.0, 0.178); head.add(slit);
  const smirk = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 6, 16, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: 0x4a1a14 }));
  smirk.rotation.z = Math.PI + 0.3; smirk.position.set(0.02, -0.075, 0.155); head.add(smirk);
  // moicano: espigões do gradiente azul → violeta → fúcsia
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const spike = cast(new THREE.Mesh(new THREE.ConeGeometry(0.045 - t * 0.008, 0.2 - Math.abs(t - 0.4) * 0.12, 8),
      new THREE.MeshPhysicalMaterial({ color: brandAt(t), roughness: 0.25, clearcoat: 1, emissive: brandAt(t), emissiveIntensity: 0.55 })));
    spike.position.set(0, 0.17 + Math.sin(t * 2.6) * 0.04, 0.1 - t * 0.2); spike.rotation.x = 0.55 - t * 1.1; head.add(spike);
  }
  const fuzz = new THREE.Mesh(new THREE.SphereGeometry(0.172, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.36), new THREE.MeshStandardMaterial({ color: 0x1a1b22, roughness: 0.9 }));
  fuzz.position.set(0, 0.012, -0.01); head.add(fuzz);

  // cachecol neon (marca registada) + colarinho
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.032, 10, 24), new THREE.MeshBasicMaterial({ color: hdr(0xe02bc0, 1.9), toneMapped: false }));
  collar.rotation.x = Math.PI / 2; collar.position.y = 0.52; fig.add(collar);
  const scarf: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.1 - i * 0.004, 0.022, 0.1),
      new THREE.MeshBasicMaterial({ color: hdr(brandAt(i / 7), 2.3 - i * 0.12), toneMapped: false }));
    fig.add(seg); scarf.push(seg);
  }
  const halo = glowSprite(0xe02bc0, 0.55, 0.45); halo.position.set(0, 0.5, -0.2); fig.add(halo);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
  root.userData = { body: fig, shadow, legL, legR, armL, armR, scarf, head };
  return root;
}

/** (versão anterior, infantil) */
function makeUliKid(): THREE.Group {
  const root = new THREE.Group();
  const fig = new THREE.Group();
  root.add(fig);
  const skin = new THREE.MeshStandardMaterial({ color: 0xf0c3a0, roughness: 0.55 });
  const jacket = new THREE.MeshPhysicalMaterial({ color: 0x3b74f2, roughness: 0.3, clearcoat: 0.7, emissive: 0x0a2a90, emissiveIntensity: 0.28 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x23252c, roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xeceef3, roughness: 0.4 });
  const hairM = new THREE.MeshPhysicalMaterial({ color: 0x8a4bea, roughness: 0.25, clearcoat: 1, emissive: 0x6a1fc0, emissiveIntensity: 0.4 });
  const cast = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; return m; };
  const capsule = (r: number, l: number, mat: THREE.Material) => cast(new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), mat));

  // pernas (pivô na anca) + botas
  const mkLeg = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.27, 0);
    const l = capsule(0.05, 0.13, pants); l.position.y = -0.1;
    const boot = cast(new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), white)); boot.scale.set(0.9, 0.6, 1.45); boot.position.set(0, -0.215, 0.03);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.17), new THREE.MeshBasicMaterial({ color: hdr(0xff4fd8, 1.6), toneMapped: false })); sole.position.set(0, -0.255, 0.03);
    p.add(l, boot, sole); fig.add(p); return p;
  };
  const legL = mkLeg(-0.07), legR = mkLeg(0.07);

  // tronco
  const torso = capsule(0.115, 0.14, jacket); torso.position.y = 0.4; torso.scale.set(1.1, 1, 0.85);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 8, 24), new THREE.MeshBasicMaterial({ color: hdr(0x5b92ff, 1.6), toneMapped: false }));
  belt.rotation.x = Math.PI / 2; belt.position.y = 0.31; belt.scale.set(1.1, 0.85, 1);
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: hdr(0xe02bc0, 2), toneMapped: false })); emblem.position.set(0, 0.42, 0.105);
  fig.add(torso, belt, emblem);

  // braços (pivô no ombro)
  const mkArm = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.47, 0);
    const a = capsule(0.04, 0.12, jacket); a.position.y = -0.09;
    const hand = cast(new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), skin)); hand.position.y = -0.2;
    p.add(a, hand); fig.add(p); return p;
  };
  const armL = mkArm(-0.17), armR = mkArm(0.17);

  // cabeça
  const head = new THREE.Group(); head.position.y = 0.66; fig.add(head);
  const skull = cast(new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 24), skin)); skull.scale.set(1, 1.05, 1); head.add(skull);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), skin); ear.position.set(s * 0.165, -0.01, 0); head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshBasicMaterial({ color: 0x0c0e18 })); eye.scale.set(0.85, 1.25, 0.5); eye.position.set(s * 0.065, 0.0, 0.158); head.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(s * 0.065 + 0.008, 0.015, 0.18); head.add(glint);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x5a2a20 })); smile.rotation.z = Math.PI; smile.position.set(0, -0.065, 0.158); head.add(smile);
  // cabelo (topete rebelde, gradiente violeta→fúcsia)
  const hair = cast(new THREE.Mesh(new THREE.SphereGeometry(0.175, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM)); hair.position.set(0, 0.025, -0.01); head.add(hair);
  const quiff = cast(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), new THREE.MeshPhysicalMaterial({ color: 0xe02bc0, roughness: 0.25, clearcoat: 1, emissive: 0xe02bc0, emissiveIntensity: 0.6 })));
  quiff.position.set(0, 0.2, 0.06); quiff.rotation.x = 0.7; head.add(quiff);
  // óculos-lanterna na testa
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.014, 8, 32), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.4 })); band.rotation.x = Math.PI / 2 - 0.25; band.position.set(0, 0.075, 0); head.add(band);
  for (const s of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 18), new THREE.MeshBasicMaterial({ color: hdr(0xff4fd8, 2.4), toneMapped: false }));
    lens.rotation.x = Math.PI / 2 - 0.25; lens.position.set(s * 0.07, 0.1, 0.15); head.add(lens);
  }

  // cachecol neon: colar + cauda que flutua
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.03, 10, 24), new THREE.MeshBasicMaterial({ color: hdr(0xe02bc0, 1.8), toneMapped: false }));
  collar.rotation.x = Math.PI / 2; collar.position.y = 0.52; fig.add(collar);
  const scarf: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.1 - i * 0.004, 0.022, 0.1),
      new THREE.MeshBasicMaterial({ color: hdr(brandAt(i / 7), 2.3 - i * 0.12), toneMapped: false }));
    fig.add(seg); scarf.push(seg);
  }
  const halo = glowSprite(0xe02bc0, 0.55, 0.45); halo.position.set(0, 0.5, -0.2); fig.add(halo);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
  root.userData = { body: fig, shadow, legL, legR, armL, armR, scarf, head };
  return root;
}

/** (versão anterior, em orbe) */
function makeUliOld(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 40, 28),
    new THREE.MeshPhysicalMaterial({ color: 0x3b74f2, roughness: 0.18, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x0a2a90, emissiveIntensity: 0.35 }),
  );
  body.castShadow = true;
  body.scale.set(1, 0.96, 1);
  const eyeMat = new THREE.MeshBasicMaterial({ color: hdr(0xffffff, 1.8), toneMapped: false });
  const pupMat = new THREE.MeshBasicMaterial({ color: 0x0a0c18 });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), eyeMat);
    e.scale.set(0.9, 1.2, 0.5); e.position.set(sx * 0.11, 0.05, 0.265);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), pupMat);
    p.position.set(sx * 0.11, 0.045, 0.298);
    g.add(e, p);
  }
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.31, 0.034, 14, 48),
    new THREE.MeshStandardMaterial({ color: 0xe02bc0, emissive: 0xe02bc0, emissiveIntensity: 1.2, roughness: 0.3 }),
  );
  ring.rotation.x = Math.PI / 2 + 0.25; ring.position.y = -0.05;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x8a4bea }));
  stem.position.set(0, 0.38, 0); stem.rotation.z = 0.25;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshBasicMaterial({ color: hdr(0xff4fd8, 2.2), toneMapped: false }));
  bulb.position.set(0.05, 0.49, 0);
  const halo = glowSprite(0xff4fd8, 0.42, 0.9); halo.position.copy(bulb.position);
  g.add(body, ring, stem, bulb, halo);
  g.position.y = 0.32;
  const root = new THREE.Group();
  root.add(g);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012;
  root.add(shadow);
  root.userData = { body: g, shadow };
  return root;
}

/** Espada: guarda da Rainha — armadura negra, ombros com pontas, visor vermelho e alabarda. */
export function makeGuardSpade(): THREE.Group {
  const root = new THREE.Group();
  const fig = new THREE.Group();
  root.add(fig);
  const armor = new THREE.MeshPhysicalMaterial({ color: 0x0c0c10, roughness: 0.3, metalness: 0.7, clearcoat: 0.8 });
  const trim = new THREE.MeshBasicMaterial({ color: hdr(0xff2030, 2.4), toneMapped: false });
  const cast = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; return m; };
  const mkLeg = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.3, 0);
    const l = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 6, 10), armor)); l.position.y = -0.13;
    const boot = cast(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.19), armor)); boot.position.set(0, -0.26, 0.025);
    p.add(l, boot); fig.add(p); return p;
  };
  const legL = mkLeg(-0.09), legR = mkLeg(0.09);
  const torso = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.18, 6, 12), armor)); torso.position.y = 0.48; torso.scale.set(1.15, 1, 0.9);
  const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), trim); emblem.scale.set(0.8, 1.2, 0.5); emblem.position.set(0, 0.5, 0.14);
  fig.add(torso, emblem);
  const mkArm = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.58, 0);
    const a = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 6, 10), armor)); a.position.y = -0.1;
    p.add(a); fig.add(p); return p;
  };
  const armL = mkArm(-0.21), armR = mkArm(0.21);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const sp = cast(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.13, 6), armor));
      sp.position.set(s * (0.21 + k * 0.02), 0.65 + k * 0.01, (k - 1) * 0.06); sp.rotation.z = -s * (0.9 + k * 0.1); fig.add(sp);
    }
  }
  const head = new THREE.Group(); head.position.y = 0.8; fig.add(head);
  head.add(cast(new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), armor)));
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.02), trim); visor.position.set(0, 0.01, 0.145); head.add(visor);
  for (const s of [-1, 1]) { const h = cast(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 6), armor)); h.position.set(s * 0.11, 0.15, 0); h.rotation.z = -s * 0.5; head.add(h); }
  const crest = cast(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 6), trim)); crest.position.y = 0.2; head.add(crest);
  // alabarda
  const shaft = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 6), armor)); shaft.position.set(0.28, 0.5, 0.06); fig.add(shaft);
  const blade = cast(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), trim)); blade.position.set(0.28, 1.05, 0.06); fig.add(blade);
  const glow = glowSprite(0xff1020, 1.3, 0.55); glow.position.set(0, 0.45, 0); fig.add(glow);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
  root.userData = { body: fig, legL, legR, armL, armR, head };
  return root;
}

/** Chama de vela flutuante (o coletável): gota laranja com núcleo creme e halo de brasa. */
export function makeFlame(_accent: number): THREE.Group {
  const g = new THREE.Group();
  const prof = (k: number) => [[0, 0], [0.06, 0.01], [0.105, 0.07], [0.1, 0.14], [0.065, 0.24], [0.03, 0.33], [0, 0.43]].map(([r, y]) => new THREE.Vector2(r * k * 1.9, y * k * 1.9));
  const mk = (k: number, lo: number[], hi: number[]) => {
    const geo = new THREE.LatheGeometry(prof(k), 18);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = Math.min(1, Math.max(0, pos.getY(i) / (0.43 * k * 1.9)));
      for (let c = 0; c < 3; c++) col[i * 3 + c] = lo[c] + (hi[c] - lo[c]) * t;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  };
  const outer = mk(1, [1.7, 0.38, 0.02], [2.0, 0.85, 0.12]);
  const inner = mk(0.62, [2.1, 1.3, 0.35], [2.4, 1.9, 0.9]);
  inner.position.y = 0.02;
  const halo = glowSprite(0xff7a1a, 1.15, 0.5); halo.position.y = 0.22;
  const body = new THREE.Group();
  body.add(outer, inner);
  body.position.y = -0.2;
  g.add(body, halo);
  g.position.y = 0.5;
  const root = new THREE.Group();
  // anel de brasa no chão e coluna de luz ténue: vê-se ao longe
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.34, 40), new THREE.MeshBasicMaterial({ color: hdr(0xff7a1a, 1.6), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.2, 1.5, 14, 1, true), new THREE.MeshBasicMaterial({ color: hdr(0xff8a2a, 1.0), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.position.y = 0.78;
  root.add(g, ring, beam);
  root.userData = { body: g, flame: body };
  return root;
}

/** Portal giroscópio com feixe de luz — a saída do labirinto. */
export function makePortal(): THREE.Group {
  const root = new THREE.Group();
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(0.26 + i * 0.1, 0.022, 10, 56),
      new THREE.MeshBasicMaterial({ color: hdr(brandAt(i / 2), 2.4), toneMapped: false }),
    );
    r.position.y = 0.62;
    root.add(r); rings.push(r);
  }
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.34, 3.2, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: hdr(0xa46bff, 1.2), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
  );
  beam.position.y = 1.6;
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.46, 40), new THREE.MeshBasicMaterial({ color: hdr(0xe02bc0, 1.6), transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false }));
  base.rotation.x = -Math.PI / 2; base.position.y = 0.02;
  const halo = glowSprite(0xa46bff, 2.2, 0.6); halo.position.y = 0.62;
  root.add(beam, base, halo);
  root.userData = { rings, beam };
  return root;
}

/** Trilho de tinta luminosa (gradiente de assinatura) em instâncias. */
export class Trail {
  mesh: THREE.InstancedMesh;
  dots: THREE.InstancedMesh;
  n = 0;
  readonly max = 1400;
  private tmpM = new THREE.Matrix4();
  private tmpC = new THREE.Color();
  constructor() {
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.03, 0.15), mat, this.max);
    this.dots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), mat, this.max);
    this.mesh.count = 0; this.dots.count = 0;
    this.mesh.frustumCulled = false; this.dots.frustumCulled = false;
  }
  add(ax: number, az: number, bx: number, bz: number, k: number) {
    if (this.n >= this.max) return;
    const col = this.tmpC.set(brandAt(0.5 - 0.5 * Math.cos(k * 0.14))).multiplyScalar(2.1);
    const horizontal = Math.abs(bx - ax) > Math.abs(bz - az);
    this.tmpM.compose(
      new THREE.Vector3((ax + bx) / 2, 0.03, (az + bz) / 2),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), horizontal ? 0 : Math.PI / 2),
      new THREE.Vector3(1, 1, 1));
    this.mesh.setMatrixAt(this.n, this.tmpM); this.mesh.setColorAt(this.n, col);
    this.tmpM.makeTranslation(bx, 0.03, bz);
    this.dots.setMatrixAt(this.n, this.tmpM); this.dots.setColorAt(this.n, col);
    this.n++;
    this.mesh.count = this.dots.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = this.dots.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true;
  }
  reset() { this.n = 0; this.mesh.count = this.dots.count = 0; }
}
