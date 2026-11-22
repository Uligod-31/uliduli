// Progresso local (offline-first). Mais tarde pode sincronizar com Supabase.
export interface LevelSave { stars: number; moves: number; trail: number[] }
interface SaveData { v: 1; worlds: Record<string, Record<number, LevelSave>>; mute: boolean }

const KEY = 'uliduli.save.v1';
let data: SaveData = { v: 1, worlds: {}, mute: false };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = { ...data, ...JSON.parse(raw) };
} catch { /* sem armazenamento: joga na mesma */ }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignora */ }
}

export const save = {
  get mute() { return data.mute; },
  set mute(v: boolean) { data.mute = v; persist(); },
  level(world: string, i: number): LevelSave | undefined { return data.worlds[world]?.[i]; },
  setLevel(world: string, i: number, s: LevelSave) {
    const w = (data.worlds[world] ??= {});
    const old = w[i];
    if (!old || s.stars >= old.stars) w[i] = { ...s, trail: s.trail.slice(0, 700) };
    persist();
  },
  unlocked(world: string, i: number) { return i === 0 || !!data.worlds[world]?.[i - 1]; },
  stars(world: string) {
    return Object.values(data.worlds[world] ?? {}).reduce((a, l) => a + l.stars, 0);
  },
  completed(world: string) { return Object.keys(data.worlds[world] ?? {}).length; },
};
