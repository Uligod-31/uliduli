// Identidade visual do UliDUli (assinatura): azul + cinzento escuro + fúcsia, gradiente 135°.
export const W = 720;
export const H = 1280;

export const UI = {
  bg: 0x15161a,
  card: 0x1e2025,
  surf: 0x2a2c33,
  line: 0x373a43,
  text: '#eceef3',
  textDim: '#9aa0ae',
  blue: 0x5b92ff,
  fuchsia: 0xff4fd8,
  g1: 0x3b74f2,
  g2: 0x8a4bea,
  g3: 0xe02bc0,
  ok: 0x4cd08a,
  warn: 0xffc457,
};

export const FONT = "'Trebuchet MS','Segoe UI',system-ui,sans-serif";

export const rgb = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255] as const;
export const toHex = (c: number) => '#' + c.toString(16).padStart(6, '0');

export function mix(a: number, b: number, t: number): number {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
export const lighten = (c: number, t: number) => mix(c, 0xffffff, t);
export const darken = (c: number, t: number) => mix(c, 0x000000, t);

/** Cor ao longo do gradiente de assinatura (0 = azul, 0.55 = violeta, 1 = fúcsia). */
export function brandAt(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t < 0.55 ? mix(UI.g1, UI.g2, t / 0.55) : mix(UI.g2, UI.g3, (t - 0.55) / 0.45);
}

/** Paleta de um mundo (derivada de 4 cores base, para cada mundo ter personalidade). */
export interface Pal {
  bgTop: number;
  bgBot: number;
  floorA: number;
  floorB: number;
  wallDark: number;
  wall: number;
  wallLight: number;
  voidC: number;
  leafA: number;
  leafB: number;
  dyn: number;
  accent: number;
}
export function mkPal(bg: number, floor: number, wall: number, accent: number): Pal {
  return {
    bgTop: lighten(bg, 0.08),
    bgBot: darken(bg, 0.45),
    floorA: floor,
    floorB: mix(floor, wall, 0.14),
    wallDark: darken(wall, 0.5),
    wall,
    wallLight: lighten(wall, 0.32),
    voidC: mix(darken(bg, 0.2), wall, 0.22),
    leafA: lighten(wall, 0.18),
    leafB: darken(wall, 0.18),
    dyn: mix(wall, accent, 0.5),
    accent,
  };
}
