// Escolhe, para cada nível da Vaga 3, o melhor candidato do gerador: tem de ter solução (e não ter becos sem
// saída, o que o gerador já garante), usar bem a regra, e o robô tem de o conseguir ganhar com os guardas.
// Correr: npx esbuild tools/gerar-vaga3.ts --bundle --platform=node --format=esm --outfile=%TEMP%/gerar.mjs && node %TEMP%/gerar.mjs
// Variáveis: ONLY=egipto  CAND=24 (candidatos válidos a comparar)  TRIALS=30
import { WORLDS, levelOpts } from '../src/worlds/index';
import { candidate } from '../src/core/rulegen';
import { isRule } from '../src/core/rules';
import { mulberry32 } from '../src/core/rng';
import { play, build } from './jogador';

const WANT = Number(process.env.CAND ?? 16), TRIALS = Number(process.env.TRIALS ?? 30);
const LIMIT = Number(process.env.MS ?? 9000);

for (const wd of WORLDS) {
  if (!wd.ready || !isRule(wd.levels[0]?.mech) || (process.env.ONLY && !process.env.ONLY.split(',').includes(wd.id))) continue;
  const picks: number[] = [];
  wd.levels.forEach((def, li) => {
    const t0 = Date.now();
    const found: { k: number; score: number }[] = [];
    let k = 0;
    for (; k < 3000 && found.length < WANT && !(found.length >= 3 && Date.now() - t0 > LIMIT); k++) {
      const c = candidate({ ...def, pick: undefined }, levelOpts(def), k);
      if (c) found.push({ k, score: c.score });
      if (Date.now() - t0 > LIMIT * 6) break;
    }
    if (!found.length) { console.log(`${wd.id} ${li + 1}: NENHUM candidato em ${k} tentativas`); picks.push(-1); return; }
    // dos mais interessantes, fica o que o robô ganha melhor (e com as três estrelas ao alcance)
    found.sort((a, b) => b.score - a.score);
    let best = { k: found[0].k, total: -1e9, v: 0, s3: 0, score: found[0].score };
    for (const f of found.slice(0, 6)) {
      const d = { ...def, pick: f.k };
      const m = build(d), rnd = mulberry32(99 + li + def.seed);
      let win = 0, s3 = 0, sp = 0;
      for (let t = 0; t < TRIALS; t++) { const r = play(m, d, rnd); sp = r.spawned; if (r.win) { win++; if (r.got === 3 && r.moves <= m.par) s3++; } }
      const v = (100 * win) / TRIALS, q = (100 * s3) / TRIALS;
      const total = f.score + Math.min(v, 95) * 1.2 + Math.min(q, 75) * 0.6 - (sp < (def.guards ?? 0) ? 80 : 0);
      if (total > best.total) best = { k: f.k, total, v, s3: q, score: f.score };
      if (!def.guards) break;
    }
    picks.push(best.k);
    console.log(`${wd.id} ${li + 1}: pick ${best.k} (validos ${found.length}/${k}) interesse ${Math.round(best.score)} vence ${Math.round(best.v)}% 3* ${Math.round(best.s3)}% ${Date.now() - t0}ms`);
  });
  console.log(`PICKS ${wd.id} [${picks.join(', ')}]`);
}
