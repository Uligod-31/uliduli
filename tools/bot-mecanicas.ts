// Robô que joga os níveis com mecânica. Correr: npx esbuild tools/bot-mecanicas.ts --bundle --platform=node --format=esm --outfile=%TEMP%/bot.mjs && node %TEMP%/bot.mjs (ONLY=mandala TRIALS=100)
import { distFrom, canPass, neighbor, Maze } from '../src/core/maze';
import { buildLevel, cloneMaze, solve, travel, rotCell, setRot, iceSound, Act } from '../src/core/mech';
import { WORLDS, LevelDef, levelOpts, GUARD_HUNT, GUARD_STUN, GUARD_STUN_R, HINTS, guardEvery } from '../src/worlds/index';
import { mulberry32, shuffle } from '../src/core/rng';

const TRIALS = Number(process.env.TRIALS ?? 60);

function spawnGuards(m: Maze, n: number, seed: number): number[] {
  const g: number[] = [];
  if (!n) return g;
  const rng = mulberry32(seed * 17 + 3); const dist = distFrom(m, m.start);
  const far = Array.from({ length: m.cols * m.rows }, (_, i) => i).filter((i) => !m.solid[i] && i !== m.exit && i !== m.start && !m.rosas.includes(i) && dist[i] >= Math.max(7, m.shortest * 0.35));
  shuffle(far, rng);
  for (const c of far) { if (g.length >= n) break; if (g.every((x) => Math.abs((x % m.cols) - (c % m.cols)) + Math.abs(((x / m.cols) | 0) - ((c / m.cols) | 0)) >= 5)) g.push(c); }
  return g;
}

/** Joga com as mesmas regras do GameScene; evita guardas perto e usa o Vagalume quando fica encurralado. */
function play(base: Maze, def: LevelDef, rnd: () => number) {
  const m = cloneMaze(base);
  let guards = spawnGuards(m, def.guards ?? 0, def.seed);
  const spawned = guards.length;
  const prev = guards.map(() => -1), stun = guards.map(() => 0);
  let at = m.start, moves = 0, phase = 0, charges = HINTS;
  const left = new Set(m.rosas);
  const res = (win: boolean, why = '') => ({ win, moves, got: 3 - left.size, why, spawned });
  for (let it = 0; it < 600; it++) {
    const near = guards.map((g) => distFrom(m, g, phase));
    const mk = (r: number) => (c: number, t: number) => guards.some((_, i) => stun[i] < t - moves && near[i][c] >= 0 && near[i][c] <= r && t - moves <= 7);
    const st = { cell: at, flames: [...left], t: moves };
    const tryPlan = (): Act[] | null => solve(m, st, { block: mk(2) }) ?? solve(m, st, { block: mk(1) }) ?? solve(m, st, { block: mk(0) }) ?? solve(m, st, { needAll: false, block: mk(1) });
    let plan = tryPlan();
    if (charges > 0 && guards.length) {
      const d = distFrom(m, at, phase);
      const close = guards.some((g, i) => !stun[i] && d[g] >= 0 && d[g] <= 3);
      if (!plan && close || guards.some((g, i) => !stun[i] && d[g] >= 0 && d[g] <= 2)) {
        charges--; guards.forEach((g, i) => { if (d[g] >= 0 && d[g] <= GUARD_STUN_R) stun[i] = GUARD_STUN; });
        plan = solve(m, st, { block: mk(0) }) ?? tryPlan();
      }
    }
    plan ??= solve(m, st) ?? solve(m, st, { needAll: false });
    if (!plan) return res(false, 'sem caminho');
    const a = plan[0];
    if (a.type === 'rot') {
      const R = m.rings!, L = a.layer, map = (c: number) => (c >= 0 && R.layer[c] === L ? rotCell(m, c, 1) : c);
      at = map(at); const nl = [...left].map(map); left.clear(); nl.forEach((c) => left.add(c));
      guards = guards.map(map); for (let i = 0; i < prev.length; i++) prev[i] = map(prev[i]);
      const rot = R.rot.slice(); rot[L] = (rot[L] + 1) % 4; setRot(m, rot);
    } else {
      const path = travel(m, at, a.dir, (i, d) => canPass(m, i, d, phase));
      if (!path.length) return res(false, 'bloqueado');
      for (const c of path) {
        at = c; left.delete(c);
        if (at === m.exit) { moves++; return res(true); }
        if (guards.some((g, i) => g === at && !stun[i])) { moves++; return res(false, 'guarda'); }
      }
    }
    moves++;
    if (m.dyn.length && moves % def.shift === 0) phase ^= 1;
    if (guards.length && moves % guardEvery(def) === 0) {
      const dist = distFrom(m, at, phase);
      for (let i = 0; i < guards.length; i++) {
        if (stun[i] > 0) continue;
        const g = guards[i], opts: number[] = [];
        for (let d = 0; d < 4; d++) if (canPass(m, g, d, phase)) opts.push(neighbor(m, g, d));
        if (!opts.length) continue;
        const dd = (o: number) => (dist[o] < 0 ? 99 : dist[o]);
        let pick: number;
        if (dist[g] >= 0 && dist[g] <= GUARD_HUNT) { const best = Math.min(...opts.map(dd)); pick = opts.filter((o) => dd(o) === best)[0]; }
        else { const f = opts.filter((o) => o !== prev[i]); const pool = f.length ? f : opts; pick = pool[Math.floor(rnd() * pool.length)]; }
        prev[i] = g; guards[i] = pick;
      }
      if (guards.some((g, i) => g === at && !stun[i])) return res(false, 'guarda');
    }
    for (let i = 0; i < stun.length; i++) if (stun[i] > 0) stun[i]--;
    if (guards.some((g, i) => g === at && !stun[i])) return res(false, 'guarda');
    if (m.lava && m.lava.at[at] <= moves) return res(false, 'lava');
  }
  return res(false, 'tempo');
}

for (const wd of WORLDS) {
  if (!wd.ready || !wd.levels[0]?.mech) continue;
  if (process.env.ONLY && process.env.ONLY !== wd.id) continue;
  wd.levels.forEach((def, li) => {
    const t0 = Date.now();
    const m = buildLevel(def, levelOpts(def));
    const ms = Date.now() - t0;
    const s = solve(m, { cell: m.start, flames: m.rosas, t: 0 });
    if (!s) { console.log(wd.id, li + 1, 'SEM SOLUCAO'); return; }
    const open = m.solid.filter((x) => !x).length;
    const extra = m.mech === 'ice' ? `gelo ${Math.round(100 - (100 * m.grip!.reduce((a, b) => a + b, 0)) / open)}% desl.max ${Math.max(...s.map((a) => (a.type === 'move' ? a.path.length : 0)))} sound ${iceSound(m)}`
      : m.mech === 'lava' ? `atraso ${m.lava!.delay} k ${m.lava!.k}` : `rodar ${s.filter((a) => a.type === 'rot').length}`;
    const rnd = mulberry32(99 + li + def.seed);
    let win = 0, s3 = 0, spawned = 0; const why: Record<string, number> = {};
    for (let t = 0; t < TRIALS; t++) { const r = play(m, def, rnd); spawned = r.spawned; if (r.win) { win++; if (r.got === 3 && r.moves <= m.par) s3++; } else why[r.why] = (why[r.why] ?? 0) + 1; }
    console.log(`${wd.id.slice(0, 4)}${li + 1} otimo ${s.length} par ${m.par} flames ${m.rosas.length} ${extra} g${spawned}/${def.guards ?? 0} | vence ${Math.round((100 * win) / TRIALS)}% 3* ${Math.round((100 * s3) / TRIALS)}% ${JSON.stringify(why)} ${ms}ms`);
  });
}
