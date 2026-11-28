// O robô-jogador: joga um nível com as mesmas regras do GameScene (guardas, mecânicas, Chama Viva).
import { distFrom, canPass, neighbor, Maze } from '../src/core/maze';
import { buildLevel, cloneMaze, solve, travel, rotCell, setRot, hazardAt, cloudBit, Act } from '../src/core/mech';
import { LevelDef, levelOpts, GUARD_STUN, GUARD_STUN_R, HINTS, guardEvery } from '../src/worlds/index';
import { living, REVIVE } from '../src/core/viva';
import { RULES, isRule, startState, phaseOf } from '../src/core/rules';
import { spawnGuards, guardDist, guardMove, collision, sunlit, ZAP_STUN } from '../src/core/guards';

export const build = (def: LevelDef) => living(buildLevel(def, levelOpts(def)), def);

/** Joga uma vez. `wander` = fração de passos ao acaso (sem guardas), para medir o aperto da luz. */
export function play(base: Maze, def: LevelDef, rnd: () => number, wander = 0) {
  const m = cloneMaze(base);
  const rule = isRule(m.mech) ? RULES[m.mech] : undefined;
  let guards = wander ? [] : spawnGuards(m, def.guards ?? 0, def.seed);
  const spawned = guards.length;
  const prev = guards.map(() => -1), stun = guards.map(() => 0);
  const max = Number(process.env.LIGHT ?? m.light);
  let at = m.start, moves = 0, phase = 0, charges = HINTS, gone = 0, light = max, revives = 0, low = 1;
  let w = rule ? startState(m) : 0;
  const left = new Set(m.rosas);
  const res = (win: boolean, why = '') => ({ win, moves, got: 3 - left.size, why, spawned, revives, low });
  let stuck = 0; // passos sem apanhar nada: um jogador, farto de rondar, gasta o Vagalume e passa
  const dist = (from: number) => (rule ? guardDist(m, from, { phase, w, gone }) : distFrom(m, from, phase));

  let queue: Act[] = []; // plano em curso: só se pensa de novo quando há um guarda por perto ou o plano se esgota
  for (let it = 0; it < 600; it++) {
    const calm = !wander && queue.length > 0 && (() => { if (!guards.length) return true; const d = dist(at); return guards.every((g, i) => stun[i] > 0 || d[g] < 0 || d[g] > 7); })();
    const near = calm ? [] : guards.map((g) => dist(g));
    const harmless = collision(m, w) === 'stun';
    const mk = (r: number) => (c: number, t: number) => !harmless && guards.some((_, i) => stun[i] < t - moves && near[i][c] >= 0 && near[i][c] <= r && t - moves <= 7);
    const st = { cell: at, flames: [...left], t: moves, phase, gone, w: rule ? w : undefined };
    const tryPlan = (): Act[] | null => solve(m, st, { block: mk(2) }) ?? solve(m, st, { block: mk(1) }) ?? solve(m, st, { block: mk(0) }) ?? solve(m, st, { needAll: false, block: mk(1) });
    let plan: Act[] | null = calm ? queue : guards.length ? tryPlan() : solve(m, st);
    const dazzle = () => { const d = dist(at); guards.forEach((g, i) => { if (d[g] >= 0 && d[g] <= GUARD_STUN_R) stun[i] = GUARD_STUN; }); };
    if (!calm && charges > 0 && guards.length && !harmless) {
      const d = dist(at);
      const close = guards.some((g, i) => !stun[i] && d[g] >= 0 && d[g] <= 3);
      if ((!plan && close) || guards.some((g, i) => !stun[i] && d[g] >= 0 && d[g] <= 2)) { charges--; dazzle(); plan = solve(m, st, { block: mk(0) }) ?? tryPlan(); }
    }
    if (++stuck > 24 && charges > 0 && guards.length && !calm) {
      const d = dist(at);
      if (guards.some((g, i) => !stun[i] && d[g] >= 0 && d[g] <= GUARD_STUN_R)) { charges--; stuck = 0; dazzle(); plan = solve(m, st, { block: mk(0) }) ?? tryPlan(); }
    }
    plan ??= solve(m, st) ?? solve(m, st, { needAll: false });
    // nas raízes pode já não haver caminho com a luz que resta: um Vagalume reacende
    if (!plan && m.mech === 'roots' && charges > 0) { charges--; revives++; light = w = Math.ceil(max * REVIVE); continue; }
    if (!plan) return res(false, m.mech === 'roots' ? 'luz' : 'sem caminho');
    let a = plan[0];
    queue = plan.slice(1);
    if (wander && rnd() < wander) {
      queue = [];
      // um passo ao acaso (como quem se engana no caminho), sem se atirar à água, à lava ou a um buraco
      const open = [0, 1, 2, 3].map((dir) => {
        if (rule) { const r = rule.step(m, at, dir, w); return { dir, path: r?.path ?? [] }; }
        return { dir, path: travel(m, at, dir, (i, d) => canPass(m, i, d, phase)) };
      }).filter((o) => {
        if (!o.path.length || o.path.includes(m.exit)) return false;
        if (o.path.some((c) => hazardAt(m, c, moves + 1) || cloudBit(m, c) >= 0)) return false;
        if (rule && m.mech !== 'roots' && m.mech !== 'echo') return true;
        return !(m.lava && m.lava.at[o.path[o.path.length - 1]] <= moves + 2);
      });
      if (open.length) { const o = open[Math.floor(rnd() * open.length)]; a = { type: 'move', dir: o.dir, path: o.path }; }
    }
    const before = left.size;
    if (a.type === 'flip') phase ^= 1;
    else if (a.type === 'wait' || a.type === 'turn') {
      if (rule) { const r = rule.acts(m, at, w).find((x) => x.type === a.type); if (!r) return res(false, 'ação'); w = r.w; }
    } else if (a.type === 'rot') {
      const R = m.rings!, L = a.layer, map = (c: number) => (c >= 0 && R.layer[c] === L ? rotCell(m, c, 1) : c);
      at = map(at); const nl = [...left].map(map); left.clear(); nl.forEach((c) => left.add(c));
      guards = guards.map(map); for (let i = 0; i < prev.length; i++) prev[i] = map(prev[i]);
      const rot = R.rot.slice(); rot[L] = (rot[L] + 1) % 4; setRot(m, rot);
    } else {
      let path: number[];
      if (rule) { const r = rule.step(m, at, a.dir, w, a.glitch); if (!r) return res(false, 'bloqueado'); path = r.path; w = r.w; }
      else path = travel(m, at, a.dir, (i, d) => canPass(m, i, d, phase));
      if (!path.length) return res(false, 'bloqueado');
      const b = cloudBit(m, at); if (b >= 0) gone |= 1 << b;
      for (const c of path) {
        at = c; left.delete(c);
        if (at === m.exit) { moves++; return res(true); }
        const hit = guards.findIndex((g, i) => g === at && !stun[i]);
        if (hit >= 0) { if (collision(m, w) === 'catch') { moves++; return res(false, 'guarda'); } stun[hit] = GUARD_STUN; }
      }
    }
    moves++;
    if (m.dyn.length && m.mech !== 'page' && m.mech !== 'glitch' && moves % def.shift === 0) phase ^= 1;
    if (m.mech === 'glitch') phase = phaseOf(w);
    if (hazardAt(m, at, moves)) return res(false, 'mare');
    if (rule && m.mech !== 'roots') w = rule.end(m, at, w, left.size < before)!;
    if (guards.length && moves % guardEvery(def) === 0) {
      const d = dist(at);
      for (let i = 0; i < guards.length; i++) {
        if (stun[i] > 0) continue;
        const to = guardMove(m, guards[i], prev[i], guards.filter((_, j) => j !== i), d, { phase, w, gone }, rnd);
        if (to === null) continue;
        prev[i] = guards[i]; guards[i] = to;
        if (to === at && collision(m, w) === 'stun') stun[i] = GUARD_STUN;
      }
      if (guards.some((g, i) => g === at && !stun[i])) return res(false, 'guarda');
    }
    for (let i = 0; i < stun.length; i++) if (stun[i] > 0) stun[i]--;
    if (m.mech === 'sun') { const lit = sunlit(m, w); guards.forEach((g, i) => { if (lit.has(g)) stun[i] = Math.max(stun[i], ZAP_STUN); }); }
    if (guards.some((g, i) => g === at && !stun[i])) { if (collision(m, w) === 'catch') return res(false, 'guarda'); }
    if (m.lava && m.lava.at[at] <= moves) return res(false, 'lava');
    if (left.size < before) stuck = 0;
    light = left.size < before ? max : light - 1;
    low = Math.min(low, light / max);
    if (light <= 0) { if (charges <= 0) return res(false, 'luz'); charges--; revives++; light = Math.ceil(max * REVIVE); }
    if (m.mech === 'roots') w = light;
  }
  return res(false, 'tempo');
}
export { neighbor };
