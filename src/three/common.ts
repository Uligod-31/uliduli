import * as THREE from 'three';

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const h1 = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
/** Ruído de valor 1D suave (0..1). */
export function vnoise(x: number): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return h1(i) * (1 - u) + h1(i + 1) * u;
}

function canvas(w: number, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

let _hedge: THREE.CanvasTexture | undefined;
/** Textura de folhagem em tons de cinzento (a cor vem do material). */
export function hedgeTexture(): THREE.CanvasTexture {
  if (_hedge) return _hedge;
  const c = canvas(256), g = c.getContext('2d')!;
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 256, 256);
  let s = 12345;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    const v = 90 + Math.floor(r() * 150);
    g.fillStyle = `rgba(${v},${v},${v},0.55)`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 3 + r() * 9, 2 + r() * 5, r() * 3.14, 0, 6.28);
    g.fill();
  }
  _hedge = new THREE.CanvasTexture(c);
  _hedge.wrapS = _hedge.wrapT = THREE.RepeatWrapping;
  _hedge.repeat.set(2, 1);
  _hedge.colorSpace = THREE.SRGBColorSpace;
  return _hedge;
}

let _glow: THREE.CanvasTexture | undefined;
export function glowTexture(): THREE.CanvasTexture {
  if (_glow) return _glow;
  const c = canvas(128), g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}

export function glowSprite(color: number, size: number, opacity = 1): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  m.toneMapped = false;
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  return s;
}

/** Cor "HDR" para o bloom (valores > 1 brilham). */
export function hdr(color: number, k = 2): THREE.Color {
  return new THREE.Color(color).multiplyScalar(k);
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse((n: any) => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) {
      const ms = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of ms) m.dispose();
    }
  });
}

export function makeClockTexture(): THREE.CanvasTexture {
  const S = 512, c = canvas(S), g = c.getContext('2d')!;
  const gr = g.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S / 2);
  gr.addColorStop(0, '#fff6dc'); gr.addColorStop(0.8, '#e8c98a'); gr.addColorStop(1, '#b98a3a');
  g.fillStyle = gr; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 6, 0, 6.283); g.fill();
  g.lineWidth = 14; g.strokeStyle = '#6a4a18'; g.stroke();
  g.fillStyle = '#3a2a10'; g.font = 'bold 54px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const rom = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  rom.forEach((t, i) => {
    const a = (i / 12) * 6.283 - 1.5708;
    g.fillText(t, S / 2 + Math.cos(a) * 190, S / 2 + Math.sin(a) * 190);
  });
  g.strokeStyle = '#2a1a08'; g.lineCap = 'round';
  g.lineWidth = 16; g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + 90, S / 2 - 70); g.stroke();
  g.lineWidth = 10; g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 - 40, S / 2 - 140); g.stroke();
  g.fillStyle = '#2a1a08'; g.beginPath(); g.arc(S / 2, S / 2, 16, 0, 6.283); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeCheckerTexture(a: string, b: string, n = 8): THREE.CanvasTexture {
  const S = 256, c = canvas(S), g = c.getContext('2d')!;
  const s = S / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
