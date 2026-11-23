import * as THREE from 'three';

/** Chuva em riscos finos que acompanha a câmara (um único LineSegments, calculada no vertex shader). */
export class Rain {
  mesh: THREE.LineSegments;
  private mat: THREE.ShaderMaterial;

  constructor(n = 700) {
    const pos = new Float32Array(n * 2 * 3), tip = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = Math.random(), y = Math.random(), z = Math.random();
      pos.set([x, y, z, x, y, z], i * 6); tip[i * 2] = 0; tip[i * 2 + 1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { time: { value: 0 }, center: { value: new THREE.Vector3() }, strength: { value: 1 } },
      vertexShader: `
        attribute float tip; uniform float time; uniform vec3 center; varying float vA;
        void main(){
          vec3 p = position;
          float y = fract(p.y - time * (0.9 + p.x * 0.5));
          vec3 w = center + vec3((p.x - 0.5) * 36.0, y * 24.0 - 3.0, (p.z - 0.5) * 36.0);
          w += tip * vec3(0.22, 0.95, 0.08);
          vA = (1.0 - tip * 0.85) * smoothstep(0.0, 0.08, y) * smoothstep(1.0, 0.8, y);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: `uniform float strength; varying float vA; void main(){ gl_FragColor = vec4(0.62, 0.76, 1.0, vA * 0.34 * strength); }`,
    });
    this.mesh = new THREE.LineSegments(g, this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
  }

  update(t: number, center: THREE.Vector3) { this.mat.uniforms.time.value = t * 0.35; this.mat.uniforms.center.value.copy(center); }
  setStrength(s: number) { this.mat.uniforms.strength.value = s; }
}
