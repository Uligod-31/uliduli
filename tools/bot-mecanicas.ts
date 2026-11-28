// Robô que joga todos os níveis (mecânicas, guardas e Chama Viva). Correr: npx esbuild tools/bot-mecanicas.ts --bundle --platform=node --format=esm --outfile=%TEMP%/bot.mjs && node %TEMP%/bot.mjs
// Variáveis: ONLY=mandala  TRIALS=100  WANDER=0.2 (fração de passos ao acaso, sem guardas, para medir a luz)  TUNE=1 CAND=8 LV=4,5
import { cloneMaze, solve, iceSound } from '../src/core/mech';
import { WORLDS } from '../src/worlds/index';
import { mulberry32 } from '../src/core/rng';
import { routeLegs, openBarrier } from '../src/core/viva';
import { isRule } from '../src/core/rules';
import { play, build } from './jogador';

const TRIALS = Number(process.env.TRIALS ?? 60);
const WANDER = Number(process.env.WANDER ?? 0.2);
if (process.env.TUNE) {
  // para cada nível com guardas, procura uma semente em que se ganhe e se consigam as 3 estrelas
  for (const wd of WORLDS) {
    if (!wd.ready || (process.env.ONLY && process.env.ONLY !== wd.id)) continue;
    wd.levels.forEach((base, li) => {
      if (!base.guards || (process.env.LV && !process.env.LV.split(",").includes(String(li)))) return;
      let best = { seed: base.seed, sc: -1e9, v: 0, s3: 0 };
      for (let k = 0; k < Number(process.env.CAND ?? 6); k++) {
        const def = { ...base, seed: base.seed + k * 1009 };
        const m = build(def); const rnd = mulberry32(99 + li + def.seed);
        let win = 0, s3 = 0, sp = 0;
        for (let t = 0; t < TRIALS; t++) { const r = play(m, def, rnd); sp = r.spawned; if (r.win) { win++; if (r.got === 3 && r.moves <= m.par) s3++; } }
        const v = (100 * win) / TRIALS, q = (100 * s3) / TRIALS;
        const sc = Math.min(v, 95) + Math.min(q, 75) - (sp < def.guards! ? 100 : 0);
        if (sc > best.sc) best = { seed: def.seed, sc, v, s3: q };
        if (v >= 90 && q >= 60 && sp >= def.guards!) break;
      }
      console.log(`SEED ${wd.id} ${li} ${base.seed} -> ${best.seed} v${Math.round(best.v)} s3:${Math.round(best.s3)}`);
    });
  }
  process.exit(0);
}
for (const wd of WORLDS) {
  if (!wd.ready) continue;
  if (process.env.ONLY && process.env.ONLY !== wd.id) continue;
  wd.levels.forEach((def, li) => {
    const t0 = Date.now();
    const m = build(def);
    const ms = Date.now() - t0;
    const st = { cell: m.start, flames: m.rosas, t: 0 };
    const s = solve(m, st);
    if (!s) { console.log(wd.id, li + 1, 'SEM SOLUCAO'); return; }
    // quanto poupa cada barreira aberta sozinha (passos na melhor rota)
    const gains = (m.barriers ?? []).map((_, k) => { const c = cloneMaze(m); openBarrier(c, k); return s.length - (solve(c, st)?.length ?? 999); });
    const legs = routeLegs(m);
    const open = m.solid.filter((x) => !x).length;
    const extra = m.mech === 'ice' ? `gelo ${Math.round(100 - (100 * m.grip!.reduce((a, b) => a + b, 0)) / open)}% desl.max ${Math.max(...s.map((a) => (a.type === 'move' ? a.path.length : 0)))} sound ${iceSound(m)}`
      : !m.mech ? '' : isRule(m.mech) ? `${m.mech} q${def.amount} esperas ${s.filter((a) => a.type === 'wait').length} rodar ${s.filter((a) => a.type === 'turn').length} glitch ${s.filter((a) => a.type === 'move' && a.glitch).length} portoes ${m.gates?.length ?? 0} itens ${m.items?.length ?? 0} agua ${m.water?.length ?? 0}` : m.mech === 'lava' ? `atraso ${m.lava!.delay} k ${m.lava!.k}` : m.mech === 'rings' ? `rodar ${s.filter((a) => a.type === 'rot').length}`
        : `${m.mech} q${def.amount} viradas ${s.filter((a) => a.type === 'flip').length} esperas ${s.filter((a) => a.type === 'wait').length} nuvens ${m.clouds?.length ?? 0} arcos ${(m.warp?.size ?? 0) / 2} pares ${(m.holes?.size ?? 0) / 2} (sem regra ${solve({ ...m, warp: undefined, holes: undefined, haz: undefined, clouds: undefined } as any, { cell: m.start, flames: m.rosas, t: 0 })?.length})`;
    const rnd = mulberry32(99 + li + def.seed);
    let win = 0, s3 = 0, spawned = 0, rev = 0; const why: Record<string, number> = {};
    for (let t = 0; t < TRIALS; t++) { const r = play(m, def, rnd); spawned = r.spawned; rev += r.revives; if (r.win) { win++; if (r.got === 3 && r.moves <= m.par) s3++; } else why[r.why] = (why[r.why] ?? 0) + 1; }
    // quem se engana no caminho: quantas vezes é a luz que o trava
    let dark = 0, wrev = 0;
    for (let t = 0; t < TRIALS; t++) { const r = play(m, def, rnd, WANDER); wrev += r.revives ? 1 : 0; if (r.why === 'luz') dark++; }
    console.log(`${wd.id.slice(0, 4)}${li + 1} otimo ${s.length} par ${m.par} luz ${m.light} trocos ${legs.join('/')} barr ${gains.join(',') || '-'} ${extra} g${spawned}/${def.guards ?? 0} | vence ${Math.round((100 * win) / TRIALS)}% 3* ${Math.round((100 * s3) / TRIALS)}% reac ${(rev / TRIALS).toFixed(1)} ${JSON.stringify(why)} | errante: reacende ${Math.round((100 * wrev) / TRIALS)}% apaga ${Math.round((100 * dark) / TRIALS)}% ${ms}ms`);
  });
}
