import * as THREE from 'three';
import { glowSprite, hdr } from './common';
import { noiseNormal } from './pbr';

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
  const coat = new THREE.MeshStandardMaterial({ color: 0x2b3a52, roughness: 0.92, side: THREE.DoubleSide, normalMap: noiseNormal(1.2), normalScale: new THREE.Vector2(0.9, 0.9) });
  const coatD = new THREE.MeshStandardMaterial({ color: 0x1b2638, roughness: 0.95 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2b73c, emissive: 0x7a4e0c, emissiveIntensity: 0.7, roughness: 0.75 });
  
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
  // botões de latão e bolso remendado
  for (const [by, bz] of [[0.46, 0.15], [0.38, 0.165], [0.3, 0.18], [0.22, 0.195]] as const) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), gold); b.position.set(0, by, bz); b.scale.z = 0.6; fig.add(b); }
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.012), coatD); pocket.position.set(-0.08, 0.24, 0.2); pocket.rotation.set(0.12, -0.3, 0); fig.add(pocket);
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

  // cabeça: uma CHAMA DE VELA viva (dobra-se com o movimento, ver animateFlame)
  const head = new THREE.Group(); head.position.y = 0.57; fig.add(head);
  const prof = [[0, 0], [0.07, 0.01], [0.115, 0.07], [0.13, 0.15], [0.112, 0.23], [0.07, 0.31], [0.028, 0.39], [0, 0.47]].map(([r, y]) => new THREE.Vector2(r, y));
  const outerGeo = new THREE.LatheGeometry(prof, 20);
  const outer = new THREE.Mesh(outerGeo, new THREE.MeshBasicMaterial({ color: hdr(0xff7a1a, 1.5), transparent: true, opacity: 0.92, toneMapped: false }));
  const coreGeo = new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(v.x * 0.6, v.y * 0.82 + 0.015)), 16);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: hdr(0xffe6a0, 1.9), toneMapped: false }));
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: hdr(0x3a6bff, 1.6), transparent: true, opacity: 0.8, toneMapped: false }));
  base.scale.set(1.2, 0.5, 1.2); base.position.y = 0.025;
  head.add(outer, core, base);
  for (const sd of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshBasicMaterial({ color: 0x1a0c05 }));
    e.scale.set(0.8, 1.35, 0.5); e.position.set(sd * 0.05, 0.17, 0.112); head.add(e);
  }
  const flameGlow = glowSprite(0xffa040, 1.4, 0.55); flameGlow.position.y = 0.2; head.add(flameGlow);
  head.userData = { outerGeo, coreGeo, outerBase: Float32Array.from(outerGeo.attributes.position.array as ArrayLike<number>), coreBase: Float32Array.from(coreGeo.attributes.position.array as ArrayLike<number>), glow: flameGlow, outer, core };

  // cachecol dourado (marca registada)
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.03, 8, 20), gold); neck.rotation.x = Math.PI / 2; neck.position.y = 0.55; fig.add(neck);
  const scarf: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.095 - i * 0.004, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: i % 3 === 2 ? 0xc98a24 : 0xf2b73c, emissive: 0x7a4e0c, emissiveIntensity: 0.65 - i * 0.04, roughness: 0.8 }));
    seg.castShadow = true; fig.add(seg); scarf.push(seg);
  }
  const halo = glowSprite(0xffc866, 0.5, 0.2); halo.position.set(0, 0.5, -0.2); fig.add(halo);

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
export function makeGuard(variant = 0, style = 0): THREE.Group {
  const root = new THREE.Group();
  const fig = new THREE.Group();
  root.add(fig);
  const v = variant % 3;
  const S = style >= 3 ? style - 3 : -1;   // 0 Carcereiro, 1 Sentinela de gelo, 2 Autómato, 3 Livro vivo
  const cloth = new THREE.MeshStandardMaterial({ color: S >= 0 ? [0x140a0a, 0x7fa8c4, 0x5a4220, 0x2a1c14, 0x2e2416, 0x2a3238, 0x14141c][S] : [0x2a2224, 0x23262d, 0x1f2a25][v], roughness: S === 1 ? 0.25 : S === 2 ? 0.4 : S === 5 ? 0.5 : 0.95, metalness: S === 2 ? 0.8 : S === 1 ? 0.15 : S === 5 ? 0.5 : 0 });
  const clothL = new THREE.MeshStandardMaterial({ color: S >= 0 ? [0x3a1612, 0xaed4ea, 0x8a6a2f, 0x4a2a1a, 0x4e3c22, 0x56646e, 0xc9a13a][S] : [0x4a2f2c, 0x3a3f4a, 0x2d3d35][v], roughness: S === 1 ? 0.2 : S === 2 ? 0.35 : S === 5 ? 0.45 : 0.95, metalness: S === 2 ? 0.85 : S === 5 ? 0.55 : 0 });
  const skin = new THREE.MeshStandardMaterial({ color: S >= 0 ? [0xcdbfa6, 0xcfe6f2, 0xb98a3a, 0xcdbfa6, 0x7a6a44, 0x9fb4b8, 0x1a1a22][S] : 0xcdbfa6, roughness: S === 1 ? 0.2 : 0.85, metalness: S === 2 ? 0.8 : 0 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x0d0c0b, roughness: 0.7 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xc9a13a, emissive: 0x5a3c08, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.6 });
  const eyeM = new THREE.MeshBasicMaterial({ color: hdr(S >= 0 ? [0xff4a1a, 0x7fd8ff, 0xff3030, 0xffa040, 0xa8ff6a, 0xff8a30, 0x2fe6d0][S] : 0xffd36a, 2.6), toneMapped: false });

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

  const glow = glowSprite(S >= 0 ? [0xff5a2a, 0x7fd8ff, 0xffb347, 0xffd98a, 0xa8ff6a, 0xff8a30, 0x2fe6d0][S] : 0xffb347, 1.4, 0.32); glow.position.set(0, 0.95, 0); fig.add(glow);
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
  const fl = 0.9 + 0.1 * Math.sin(t * 19) + 0.06 * Math.sin(t * 31 + 1);
  (U.glow as THREE.Sprite).material.opacity = 0.45 * fl + 0.1 * lean;
  (U.glow as THREE.Sprite).scale.setScalar(1.4 * (0.95 + 0.1 * fl));
}
