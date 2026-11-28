import * as THREE from 'three';
import { glowSprite, hdr } from './common';
import { noiseNormal } from './pbr';

const cast = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; return m; };

/** Perfil de chama (raio, altura) para as peças do Uli. */
const lathe = (pts: [number, number][], seg = 22) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const fire = (r: number, g: number, b: number, opacity = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), transparent: opacity < 1, opacity, depthWrite: opacity > 0.8, toneMapped: false });

/**
 * Uli, a chama que anda: corpo, braços e pés feitos de fogo vivo, cabeça de vela com olhos enormes
 * e, atrás, um cachecol de labaredas que acaba no fúcsia da assinatura.
 * Pés em y = 0. Altura ≈ 1.
 */
export function makeUli(): THREE.Group {
  const root = new THREE.Group();
  const fig = new THREE.Group();
  root.add(fig);
  const tongues: { m: THREE.Object3D; ph: number; base: number }[] = [];
  const soft: { geo: THREE.BufferGeometry; base: Float32Array; amp: number; y0: number; y1: number; ph: number }[] = [];
  const wave = (geo: THREE.BufferGeometry, amp: number, y0: number, y1: number, ph: number) => soft.push({ geo, base: Float32Array.from(geo.attributes.position.array as ArrayLike<number>), amp, y0, y1, ph });

  // pés: duas brasas em gota que pisam o chão
  const mkLeg = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.2, 0);
    const l = cast(new THREE.Mesh(lathe([[0, -0.17], [0.045, -0.15], [0.05, -0.1], [0.032, -0.03], [0, 0.03]], 12), fire(0.75, 0.07, 0.0)));
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), fire(1.05, 0.24, 0.0)); toe.scale.set(0.95, 0.55, 1.35); toe.position.set(0, -0.172, 0.035);
    p.add(l, toe); fig.add(p); return p;
  };
  const legL = mkLeg(-0.07), legR = mkLeg(0.07);

  // corpo: três camadas de fogo (vermelho-laranja por fora, ouro, coração claro)
  const shell: [number, number][] = [[0, 0.115], [0.11, 0.125], [0.185, 0.19], [0.19, 0.28], [0.15, 0.39], [0.108, 0.49], [0.062, 0.575], [0, 0.61]];
  const g1 = lathe(shell), g2 = lathe(shell.map(([r, y]) => [r * 0.74, 0.14 + (y - 0.115) * 0.9])), g3 = lathe(shell.map(([r, y]) => [r * 0.44, 0.17 + (y - 0.115) * 0.7]), 16);
  const outerBody = cast(new THREE.Mesh(g1, fire(0.62, 0.035, 0.0, 0.7)));
  const midBody = new THREE.Mesh(g2, fire(0.95, 0.14, 0.0, 0.9));
  const heart = new THREE.Mesh(g3, fire(1.5, 0.7, 0.08)); heart.position.z = 0.06;
  midBody.renderOrder = 1; outerBody.renderOrder = 2;
  fig.add(heart, midBody, outerBody);
  wave(g1, 0.026, 0.12, 0.61, 0); wave(g2, 0.018, 0.14, 0.6, 1.7);
  // labaredas à volta da bainha, sempre a tremer
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.35;
    const t = new THREE.Mesh(lathe([[0, 0], [0.035, 0.025], [0.032, 0.065], [0.012, 0.125], [0, 0.165]], 8), fire(k % 2 ? 0.95 : 0.65, k % 2 ? 0.14 : 0.035, 0.0, 0.9));
    const holder = new THREE.Group(); holder.position.set(Math.cos(a) * 0.165, 0.15, Math.sin(a) * 0.165);
    holder.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); holder.add(t); fig.add(holder);
    tongues.push({ m: t, ph: k * 2.1, base: 0.75 + (k % 3) * 0.2 });
  }

  // braços: línguas de fogo com mãos de faísca
  const mkArm = (x: number) => {
    const p = new THREE.Group(); p.position.set(x, 0.45, 0);
    const a = cast(new THREE.Mesh(lathe([[0, -0.22], [0.024, -0.19], [0.042, -0.11], [0.04, -0.04], [0, 0.03]], 12), fire(0.85, 0.11, 0.0)));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.033, 10, 8), fire(1.4, 0.65, 0.07)); hand.position.y = -0.215;
    const tip = new THREE.Mesh(lathe([[0, 0], [0.022, 0.015], [0.012, 0.055], [0, 0.09]], 8), fire(1.0, 0.2, 0.0, 0.9)); tip.position.set(0, -0.215, -0.01); tip.rotation.x = -2.5;
    tongues.push({ m: tip, ph: x * 20, base: 1 });
    p.add(a, hand, tip); fig.add(p); return p;
  };
  const armL = mkArm(-0.165), armR = mkArm(0.165);

  // cabeça: uma CHAMA DE VELA viva (dobra-se com o movimento, ver animateFlame)
  const head = new THREE.Group(); head.position.y = 0.57; fig.add(head);
  const prof = [[0, 0], [0.07, 0.01], [0.115, 0.07], [0.13, 0.15], [0.112, 0.23], [0.07, 0.31], [0.028, 0.39], [0, 0.47]].map(([r, y]) => new THREE.Vector2(r, y));
  const outerGeo = new THREE.LatheGeometry(prof, 20);
  const outer = new THREE.Mesh(outerGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.15, 0.0), transparent: true, opacity: 0.93, toneMapped: false }));
  const coreGeo = new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(v.x * 0.6, v.y * 0.82 + 0.015)), 16);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.55, 0.82, 0.16), toneMapped: false }));
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: hdr(0x3a6bff, 1.6), transparent: true, opacity: 0.8, toneMapped: false }));
  base.scale.set(1.2, 0.5, 1.2); base.position.y = 0.025;
  head.add(outer, core, base);
  const eyes: THREE.Group[] = [];
  for (const sd of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(sd * 0.05, 0.17, 0.116);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.033, 14, 12), new THREE.MeshBasicMaterial({ color: 0x1a0c05 }));
    e.scale.set(0.82, 1.38, 0.5);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); shine.position.set(0.008, 0.017, 0.018);
    eg.add(e, shine); head.add(eg); eyes.push(eg);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0055, 6, 14, Math.PI * 0.85), new THREE.MeshBasicMaterial({ color: 0x3a1204 }));
  smile.position.set(0, 0.112, 0.126); smile.rotation.z = Math.PI + Math.PI * 0.075; head.add(smile);
  const flameGlow = glowSprite(0xffa040, 1.15, 0.45); flameGlow.position.y = 0.2; head.add(flameGlow);
  head.userData = { eyes, soft, tongues, outerGeo, coreGeo, outerBase: Float32Array.from(outerGeo.attributes.position.array as ArrayLike<number>), coreBase: Float32Array.from(coreGeo.attributes.position.array as ArrayLike<number>), glow: flameGlow, outer, core };

  // cachecol de labaredas (marca registada): do ouro ao fúcsia da assinatura
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.022, 8, 24), fire(1.5, 0.12, 0.75)); neck.rotation.x = Math.PI / 2; neck.position.y = 0.555; fig.add(neck);
  const scarf: THREE.Mesh[] = [];
  const hot = new THREE.Color(1.8, 0.75, 0.05), pink = new THREE.Color(1.4, 0.06, 0.8);
  for (let i = 0; i < 8; i++) {
    const c = hot.clone().lerp(pink, i / 7);
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.058 - i * 0.0048, 10, 8), fire(c.r, c.g, c.b, 0.95 - i * 0.085));
    seg.scale.set(1.05, 0.36, 1.35); fig.add(seg); scarf.push(seg);
  }
  const halo = glowSprite(0xff7a1a, 0.95, 0.3); halo.position.set(0, 0.36, -0.14); fig.add(halo);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
  // marca do jogador: aro azul no chão, para nunca o confundir com as chamas a apanhar
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.32, 40), new THREE.MeshBasicMaterial({ color: hdr(0x3b74f2, 2.0), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
  mark.rotation.x = -Math.PI / 2; mark.position.y = 0.02; root.add(mark);
  root.userData = { body: fig, shadow, legL, legR, armL, armR, scarf, head };
  return root;
}

/**
 * Crescido: os adultos do pequeno príncipe, em pesadelo. Altos, curvados, de braços até ao chão,
 * cabeça minúscula e pálida, mãos enormes.
 * variant: 0 = Rei (coroa e capa), 1 = Vaidoso (chapéu-alto), 2 = Homem de Negócios (chapéu de coco e pasta).
 */
export function makeGuard(variant = 0, style = 0): THREE.Group {
  const root = new THREE.Group();
  const fig = new THREE.Group();
  root.add(fig);
  const v = variant % 3;
  const S = style >= 3 ? style - 3 : -1;   // 0 Carcereiro, 1 Sentinela de gelo, 2 Autómato, 3 Livro vivo
  const cloth = new THREE.MeshStandardMaterial({ color: S >= 0 ? [0x140a0a, 0x7fa8c4, 0x5a4220, 0x2a1c14, 0x2e2416, 0x2a3238, 0x14141c, 0x7a3a0a, 0x0a1a3a, 0x14101e, 0x2a3a4a, 0x10163a, 0xe8e0d0, 0x5a3a1a, 0x14141a][S] : [0x2a2224, 0x23262d, 0x1f2a25][v], roughness: S === 1 ? 0.25 : S === 2 ? 0.4 : S === 5 ? 0.5 : 0.95, metalness: S === 2 ? 0.8 : S === 1 ? 0.15 : S === 5 ? 0.5 : 0 });
  const clothL = new THREE.MeshStandardMaterial({ color: S >= 0 ? [0x3a1612, 0xaed4ea, 0x8a6a2f, 0x4a2a1a, 0x4e3c22, 0x56646e, 0xc9a13a, 0xffb347, 0x1c4a8a, 0x27d3ff, 0x6a8aa8, 0xc8a34a, 0xfff4d0, 0xd08a3a, 0x2a2a34][S] : [0x4a2f2c, 0x3a3f4a, 0x2d3d35][v], roughness: S === 1 ? 0.2 : S === 2 ? 0.35 : S === 5 ? 0.45 : 0.95, metalness: S === 2 ? 0.85 : S === 5 ? 0.55 : 0 });
  const skin = new THREE.MeshStandardMaterial({ color: S >= 0 ? [0xcdbfa6, 0xcfe6f2, 0xb98a3a, 0xcdbfa6, 0x7a6a44, 0x9fb4b8, 0x1a1a22, 0xe0b070, 0x0e2a4a, 0x1a1a2a, 0x9ab0a8, 0xdcd0a0, 0xf0e0d0, 0xc89048, 0xc8a890][S] : 0xcdbfa6, roughness: S === 1 ? 0.2 : 0.85, metalness: S === 2 ? 0.8 : 0 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x0d0c0b, roughness: 0.7 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xc9a13a, emissive: 0x5a3c08, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.6 });
  const eyeM = new THREE.MeshBasicMaterial({ color: hdr(S >= 0 ? [0xff4a1a, 0x7fd8ff, 0xff3030, 0xffa040, 0xa8ff6a, 0xff8a30, 0x2fe6d0, 0xffd45a, 0x44e0ff, 0xff2bd6, 0x39f2d0, 0xffe08a, 0xffd86b, 0xffe040, 0xff2b8a][S] : 0xffd36a, 2.6), toneMapped: false });

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

  if (S >= 0) {
    if (S === 0) {            // Carcereiro: chifres de carneiro e correntes
      for (const sd of [-1, 1]) { const horn = cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sd * 0.06, 0.1, 0), new THREE.Vector3(sd * 0.17, 0.17, -0.02), new THREE.Vector3(sd * 0.22, 0.02, 0.02), new THREE.Vector3(sd * 0.18, -0.08, 0.06)]), 14, 0.025, 6), skin)); head.add(horn); }
      for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 10), goldM); l.position.set(-0.1 + k * 0.05, 0.05 - (k % 2) * 0.03, 0.2); up.add(l); }
    } else if (S === 1) {     // Sentinela de gelo: cristais nos ombros e na cabeça
      for (let k = 0; k < 7; k++) { const c = cast(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12 + (k % 3) * 0.06, 5), new THREE.MeshBasicMaterial({ color: hdr(0x8fe0ff, 1.6), toneMapped: false }))); const a = (k / 7) * Math.PI * 2; c.position.set(Math.cos(a) * 0.06, 0.12, Math.sin(a) * 0.06); c.rotation.z = -Math.cos(a) * 0.5; c.rotation.x = Math.sin(a) * 0.5; head.add(c); }
      for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const c = cast(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 5), cloth)); c.position.set(sd * (0.2 + k * 0.05), 0.6 + k * 0.03, 0.03); c.rotation.z = -sd * (0.9 + k * 0.15); up.add(c); }
    } else if (S === 2) {     // Autómato: cabeça cilíndrica com uma lente e engrenagem às costas
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), eyeM); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.01, 0.1); head.add(lens);
      const tube = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.07, 14), goldM)); tube.rotation.x = Math.PI / 2; tube.position.set(0, 0.01, 0.12); head.add(tube);
      const gg = new THREE.Group(); gg.position.set(0, 0.35, -0.2); up.add(gg); gg.add(cast(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 18), goldM)));
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.03), goldM); t.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0); t.rotation.z = a; gg.add(t); }
    } else if (S === 4) {     // Espírito de Raiz: hastes de ramos, musgo nos ombros, rebentos a brilhar e trepadeiras
      const sprout = new THREE.MeshBasicMaterial({ color: hdr(0xa8ff6a, 1.8), toneMapped: false }), moss = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 1 });
      for (const sd of [-1, 1]) {
        const main = cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sd * 0.05, 0.1, 0), new THREE.Vector3(sd * 0.1, 0.22, 0), new THREE.Vector3(sd * 0.2, 0.34, 0.0), new THREE.Vector3(sd * 0.26, 0.46, -0.02)]), 12, 0.012, 5), cloth)); head.add(main);
        for (const [x0, y0, x1, y1] of [[0.1, 0.22, 0.2, 0.2], [0.17, 0.3, 0.1, 0.42], [0.2, 0.36, 0.3, 0.34]] as const) head.add(cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sd * x0, y0, 0), new THREE.Vector3(sd * x1, y1, 0)]), 6, 0.008, 4), cloth)));
        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), sprout); bud.position.set(sd * 0.26, 0.47, -0.02); head.add(bud);
        const sh = cast(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), moss)); sh.scale.set(1.3, 0.6, 1); sh.position.set(sd * 0.22, 0.6, 0.02); up.add(sh);
        for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.07, 5), sprout); s.position.set(sd * (0.2 + k * 0.04), 0.68, 0.02 + (k % 2) * 0.03); up.add(s); }
      }
      for (let k = 0; k < 5; k++) { const vn = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.34 + (k % 3) * 0.12, 4), moss)); vn.position.set(-0.12 + k * 0.06, 0.1 - (k % 2) * 0.05, 0.16); up.add(vn); }
    } else if (S === 5) {     // Draugr: elmo com chifres, escudo redondo e machado, olhos de runa
      const horn = new THREE.MeshStandardMaterial({ color: 0xcfc6ae, roughness: 0.6 }), steel = new THREE.MeshStandardMaterial({ color: 0x6a747c, roughness: 0.35, metalness: 0.85 });
      const helm = cast(new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), steel)); helm.position.y = 0.045; helm.scale.set(1, 1.05, 1.04); head.add(helm);
      const nasal = cast(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.012), steel)); nasal.position.set(0, -0.005, 0.105); head.add(nasal);
      for (const sd of [-1, 1]) head.add(cast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sd * 0.11, 0.07, 0), new THREE.Vector3(sd * 0.2, 0.09, 0), new THREE.Vector3(sd * 0.25, 0.2, 0), new THREE.Vector3(sd * 0.22, 0.3, 0)]), 12, 0.02, 6), horn)));
      const shield = new THREE.Group(); shield.position.set(-0.06, -0.55, 0.12); shield.rotation.y = Math.PI / 2; armL.add(shield);
      shield.add(cast(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 18).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a2a1a, roughness: 0.7 }))));
      shield.add(cast(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.016, 6, 22), steel))); const boss = cast(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), steel)); boss.position.z = 0.02; shield.add(boss);
      const axe = new THREE.Group(); axe.position.set(0.0, -0.86, 0.05); axe.rotation.z = -0.2; armR.add(axe);
      const sh = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x4a2c16, roughness: 0.8 }))); sh.position.y = 0.18; axe.add(sh);
      const blade = cast(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.015), steel)); blade.position.set(0.1, 0.4, 0); axe.add(blade);
    } else if (S === 6) {     // Guarda de Anúbis: cabeça de chacal, orelhas altas, colar de ouro e ceptro-ankh
      const lapis = new THREE.MeshStandardMaterial({ color: 0x1c3fb0, roughness: 0.35, metalness: 0.4 }), turq = new THREE.MeshBasicMaterial({ color: hdr(0x2fe6d0, 2.2), toneMapped: false });
      const snout = cast(new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.22, 7).rotateX(Math.PI / 2), skin)); snout.position.set(0, -0.03, 0.2); head.add(snout);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.2, metalness: 0.4 })); nose.position.set(0, -0.012, 0.31); head.add(nose);
      for (const sd of [-1, 1]) {
        const ear = cast(new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.23, 5), skin)); ear.position.set(sd * 0.065, 0.19, -0.01); ear.rotation.z = -sd * 0.14; ear.scale.z = 0.5; head.add(ear);
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.15, 5), goldM); inner.position.set(sd * 0.066, 0.17, 0.003); inner.rotation.z = -sd * 0.14; inner.scale.z = 0.4; head.add(inner);
        const lap = cast(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.1), goldM)); lap.position.set(sd * 0.1, -0.07, 0.0); lap.rotation.z = -sd * 0.16; head.add(lap);
        for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.018, 0.102), lapis); st.position.set(sd * (0.1 + k * 0.006), -0.02 - k * 0.07, 0.0); st.rotation.z = -sd * 0.16; head.add(st); }
        const kw = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.01), darkM); kw.position.set(sd * 0.075, 0.012, 0.094); kw.rotation.z = -sd * 0.12; head.add(kw);
      }
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.034, 6, 18), goldM); collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.62, 0.05); up.add(collar);
      const collar2 = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 18), lapis); collar2.rotation.x = Math.PI / 2; collar2.position.set(0, 0.59, 0.05); up.add(collar2);
      const kilt = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.3, 14, 1, true), clothL)); kilt.material = new THREE.MeshStandardMaterial({ color: 0xe8d9a8, roughness: 0.8, side: THREE.DoubleSide }); kilt.position.set(0, 0.08, 0.02); up.add(kilt);
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 6, 18), lapis); belt.rotation.x = Math.PI / 2; belt.position.set(0, 0.22, 0.02); up.add(belt);
      const staff = new THREE.Group(); staff.position.set(0, -0.86, 0.05); armR.add(staff);
      const shaft = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1.5, 6), goldM)); shaft.position.y = 0.5; staff.add(shaft);
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14), turq); loop.position.y = 1.36; staff.add(loop);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.014, 0.014), turq); bar.position.y = 1.24; staff.add(bar);
      const tipG = glowSprite(0x2fe6d0, 0.28, 0.6); tipG.position.y = 1.36; staff.add(tipG);
    } else if (S === 7) {     // Monge de Luz: halo de anéis dourados, hábito açafrão e missangas
      const gl2 = new THREE.MeshBasicMaterial({ color: hdr(0xffc860, 2), toneMapped: false });
      for (const [r2, w] of [[0.2, 0.012], [0.15, 0.01], [0.1, 0.008]] as const) { const h2 = new THREE.Mesh(new THREE.TorusGeometry(r2, w, 6, 28), gl2); h2.position.set(0, 0.06, -0.09); head.add(h2); }
      const robe = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 0.42, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xe88a1a, roughness: 0.9, side: THREE.DoubleSide }))); robe.position.set(0, 0.12, 0.02); up.add(robe);
      const mala = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.014, 6, 20), goldM); mala.rotation.x = Math.PI / 2; mala.position.set(0, 0.6, 0.06); up.add(mala);
      const lot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), gl2); lot.position.set(0, 0.45, 0.19); up.add(lot);
    } else if (S === 8) {     // Lula de Tinta: tentáculos a escorrer da cabeça e pontos de luz
      const tent = new THREE.MeshStandardMaterial({ color: 0x0a2a5a, roughness: 0.3, emissive: 0x0a3a6a, emissiveIntensity: 0.6 }), dot = new THREE.MeshBasicMaterial({ color: hdr(0x44e0ff, 2), toneMapped: false });
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, c = new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a) * 0.05, -0.04, 0.06 + Math.sin(a) * 0.04), new THREE.Vector3(Math.cos(a) * 0.1, -0.14, 0.1 + Math.sin(a) * 0.06), new THREE.Vector3(Math.cos(a) * 0.12, -0.26, 0.06 + Math.sin(a) * 0.1), new THREE.Vector3(Math.cos(a) * 0.06, -0.36, 0.1)]); const t = cast(new THREE.Mesh(new THREE.TubeGeometry(c, 10, 0.014, 5), tent)); head.add(t); const d = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), dot); d.position.copy(c.getPoint(0.7)); head.add(d); }
      skull.scale.set(0.9, 1.5, 1); const cape = cast(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8, 1, true), tent)); cape.position.set(0, 0.2, -0.05); cape.rotation.x = 0.25; head.add(cape);
    } else if (S === 9) {     // Glitch: ecrã por cara, antena e ombros de neon
      skull.visible = false; const scr = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.05), new THREE.MeshStandardMaterial({ color: 0x0a0814, roughness: 0.3, metalness: 0.5 })); head.add(scr);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshBasicMaterial({ color: hdr(0xff2bd6, 1.6), toneMapped: false })); face.position.z = 0.027; head.add(face);
      for (const sd of [-1, 1]) { const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.01), new THREE.MeshBasicMaterial({ color: 0x0a0814 })); e2.position.set(sd * 0.04, 0.01, 0.03); head.add(e2); const sh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.06), new THREE.MeshBasicMaterial({ color: hdr(0x27d3ff, 2), toneMapped: false })); sh.position.set(sd * 0.2, 0.62, 0.02); up.add(sh); }
      const an = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 4), darkM); an.position.set(0.06, 0.18, 0); head.add(an); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), new THREE.MeshBasicMaterial({ color: hdr(0xffe14a, 2.4), toneMapped: false })); tip.position.set(0.06, 0.3, 0); head.add(tip);
    } else if (S === 10) {    // Alienígena: cabeça grande, olhos negros inclinados, capacete de vidro
      skull.scale.set(1.05, 1.5, 1.1);
      for (const sd of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0x020204, roughness: 0.1, metalness: 0.4 })); ey.scale.set(1.4, 0.7, 0.4); ey.rotation.z = -sd * 0.45; ey.position.set(sd * 0.055, 0.01, 0.1); head.add(ey); const gl3 = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 5), eyeM); gl3.position.set(sd * 0.055, 0.01, 0.12); head.add(gl3); }
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xaaddff, transparent: true, opacity: 0.18, roughness: 0.02, clearcoat: 1 })); dome.position.y = 0.03; head.add(dome);
      const rg = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 6, 20), new THREE.MeshStandardMaterial({ color: 0x8a98a8, metalness: 0.8, roughness: 0.3 })); rg.rotation.x = Math.PI / 2; rg.position.y = -0.1; head.add(rg);
    } else if (S === 11) {    // Sentinela Estelar: cabeça-estrela a brilhar
      skull.visible = false; const stM = new THREE.MeshBasicMaterial({ color: hdr(0xffe08a, 2.2), toneMapped: false });
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + Math.PI / 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), stM); c.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0); c.rotation.z = a - Math.PI / 2; head.add(c); }
      head.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), stM));
      for (let k = 0; k < 3; k++) { const o2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), stM); o2.position.set(Math.cos(k * 2.1) * 0.22, 0.05 + k * 0.04, Math.sin(k * 2.1) * 0.22); head.add(o2); }
      const rb = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.01, 6, 28), goldM); rb.rotation.x = 1.2; rb.position.y = 0.55; up.add(rb);
    } else if (S === 12) {    // Anjo Caído: asas de penas, halo partido e túnica clara
      const wing = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, emissive: 0x8a90b0, emissiveIntensity: 0.4 });
      for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) { const f = cast(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4 - k * 0.04, 0.012).translate(0, 0.2, 0), wing)); f.position.set(sd * 0.1, 0.4, -0.12); f.rotation.z = sd * (0.5 + k * 0.22); up.add(f); }
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 24, Math.PI * 1.6), new THREE.MeshBasicMaterial({ color: hdr(0xffd86b, 2.2), toneMapped: false })); halo.rotation.x = Math.PI / 2; halo.position.y = 0.2; head.add(halo);
      const rb = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 0.4, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff4e0, roughness: 0.8, side: THREE.DoubleSide }))); rb.position.set(0, 0.1, 0.02); up.add(rb);
    } else if (S === 13) {    // Leão: juba de cones, focinho e orelhas redondas
      const mane = new THREE.MeshStandardMaterial({ color: 0xb8561a, roughness: 1 });
      for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2, c = cast(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 5), mane)); c.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.02); c.rotation.z = a - Math.PI / 2; c.rotation.x = 0.2; head.add(c); }
      const sn = cast(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skin)); sn.scale.set(1.1, 0.8, 1.3); sn.position.set(0, -0.03, 0.12); head.add(sn); const ns = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), darkM); ns.position.set(0, -0.01, 0.18); head.add(ns);
      for (const sd of [-1, 1]) { const ea = cast(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), skin)); ea.position.set(sd * 0.09, 0.12, 0.0); head.add(ea); }
    } else if (S === 14) {    // Segurança de rock: óculos escuros, crista rosa, jaqueta com tachas
      const shades = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.03), new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.1, metalness: 0.6 })); shades.position.set(0, 0.015, 0.1); head.add(shades);
      for (const sd of [-1, 1]) { const g2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.005), new THREE.MeshBasicMaterial({ color: hdr(0xff2b8a, 2.2), toneMapped: false })); g2.position.set(sd * 0.04, 0.02, 0.117); head.add(g2); }
      for (let k = 0; k < 7; k++) { const c = cast(new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1 + (k % 3) * 0.03, 4), new THREE.MeshBasicMaterial({ color: hdr(0xff2b8a, 1.8), toneMapped: false }))); c.position.set(0, 0.08 + (k % 2) * 0.01, -0.07 + k * 0.025); head.add(c); }
      for (let k = 0; k < 6; k++) { const st = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 5), new THREE.MeshStandardMaterial({ color: 0xc0c0cc, metalness: 0.9, roughness: 0.3 })); st.position.set(-0.12 + k * 0.05, 0.62, 0.1); st.rotation.x = Math.PI / 2; up.add(st); }
      const gt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.03), new THREE.MeshStandardMaterial({ color: 0xff2b8a, roughness: 0.4, emissive: 0x6a0a30, emissiveIntensity: 0.5 })); gt.position.set(0.2, 0.15, -0.2); gt.rotation.z = -0.4; up.add(gt);
    } else {                  // Livro vivo: um livro aberto no lugar da cara
      skull.visible = false;
      for (const sd of [-1, 1]) {
        const cov = cast(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.02), new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.7 }))); cov.position.set(sd * 0.075, 0, -0.01); cov.rotation.y = sd * 0.5; head.add(cov);
        const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.18), new THREE.MeshBasicMaterial({ color: hdr(0xffe9b0, 1.4), toneMapped: false, side: THREE.DoubleSide })); pg.position.set(sd * 0.07, 0, 0.0); pg.rotation.y = sd * 0.5; head.add(pg);
      }
    }
  } else if (v === 0) {
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

  const glow = glowSprite(S >= 0 ? [0xff5a2a, 0x7fd8ff, 0xffb347, 0xffd98a, 0xa8ff6a, 0xff8a30, 0x2fe6d0, 0xffd45a, 0x44e0ff, 0xff2bd6, 0x39f2d0, 0xffe08a, 0xffd86b, 0xffe040, 0xff2b8a][S] : 0xffb347, 1.4, 0.32); glow.position.set(0, 0.95, 0); fig.add(glow);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
  root.userData = { body: fig, legL, legR, armL, armR, head, glow };
  return root;
}

/**
 * Anima a chama-cabeça: dobra a ponta contra o movimento, oscila, estica ao saltar e tremeluz.
 * lean = velocidade (0..1) para trás da direção do corpo; side = inclinação lateral (curvas); lift = salto/celebração.
 */
export function animateFlame(head: THREE.Object3D, t: number, lean: number, side = 0, lift = 0) {
  const U = head.userData;
  if (!U.outerGeo) return;
  const apply = (geo: THREE.BufferGeometry, base: Float32Array, k: number, ph: number) => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const u = Math.min(1, Math.max(0, y / 0.47)), w = u * u;
      const wob = Math.sin(t * 9 + ph + y * 11) * 0.012 * w + Math.sin(t * 5.3 + ph * 2) * 0.02 * w;
      p.setXYZ(i,
        x * (1 - 0.18 * lean * u) + (side * 0.12 + wob) * w * k,
        y * (1 + 0.1 * lean + 0.22 * lift + 0.04 * Math.sin(t * 13 + ph)) ,
        z - lean * 0.2 * w * k + Math.cos(t * 7 + ph) * 0.01 * w);
    }
    p.needsUpdate = true;
  };
  apply(U.outerGeo, U.outerBase, 1, 0);
  apply(U.coreGeo, U.coreBase, 0.8, 1.3);
  // corpo: as camadas ondulam (mais em cima) e as labaredas esticam-se
  for (const w of (U.soft ?? []) as { geo: THREE.BufferGeometry; base: Float32Array; amp: number; y0: number; y1: number; ph: number }[]) {
    const p = w.geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = w.base[i * 3], y = w.base[i * 3 + 1], z = w.base[i * 3 + 2];
      const u = Math.min(1, Math.max(0, (y - w.y0) / (w.y1 - w.y0))), ang = Math.atan2(z, x);
      const k = 1 + (Math.sin(ang * 5 + t * 7 + w.ph + y * 22) + 0.6 * Math.sin(ang * 3 - t * 11 + y * 31)) * w.amp * 3.2 * Math.sin(u * Math.PI);
      p.setXYZ(i, x * k + side * 0.04 * u, y, z * k - lean * 0.07 * u);
    }
    p.needsUpdate = true;
  }
  for (const f of (U.tongues ?? []) as { m: THREE.Object3D; ph: number; base: number }[]) {
    const s = f.base * (0.85 + 0.35 * Math.abs(Math.sin(t * 8.5 + f.ph)) + 0.2 * Math.sin(t * 15 + f.ph * 1.7) + lean * 0.3);
    f.m.scale.set(1, s, 1);
  }
  // pisca de vez em quando
  const blink = (t % 3.4) > 3.24 ? 0.12 : 1;
  for (const e of (U.eyes ?? []) as THREE.Object3D[]) e.scale.y = blink;
  const fl = 0.9 + 0.1 * Math.sin(t * 19) + 0.06 * Math.sin(t * 31 + 1);
  (U.glow as THREE.Sprite).material.opacity = 0.36 * fl + 0.1 * lean;
  (U.glow as THREE.Sprite).scale.setScalar(1.15 * (0.95 + 0.1 * fl));
}
