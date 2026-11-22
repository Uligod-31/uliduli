import * as THREE from 'three';
import { brandAt } from '../core/theme';
import { glowSprite, hdr } from './common';

/** Uli em 3D: gota-orbe vítrea com olhos luminosos, anel fúcsia e antena de luz. */
export function makeUli(): THREE.Group {
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

export function makeRose(accent: number): THREE.Group {
  const g = new THREE.Group();
  const petal = new THREE.MeshStandardMaterial({ color: 0xff3f9c, emissive: 0xff2b88, emissiveIntensity: 0.9, roughness: 0.35 });
  for (let ring = 0; ring < 3; ring++) {
    const n = 5 - ring;
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.1 - ring * 0.018, 14, 10), petal);
      p.scale.set(1, 0.55, 1.1);
      const a = (i / n) * Math.PI * 2 + ring;
      p.position.set(Math.cos(a) * (0.11 - ring * 0.035), 0.05 + ring * 0.05, Math.sin(a) * (0.11 - ring * 0.035));
      p.rotation.set(0.5, -a, 0);
      g.add(p);
    }
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: hdr(0xffd0ec, 2), toneMapped: false }));
  core.position.y = 0.17;
  const halo = glowSprite(accent, 0.9, 0.8); halo.position.y = 0.12;
  g.add(core, halo);
  g.position.y = 0.45;
  const root = new THREE.Group();
  root.add(g);
  root.userData = { body: g };
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
