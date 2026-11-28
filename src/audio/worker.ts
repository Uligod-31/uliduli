// Calcula os temas fora do fio principal: primeiro só a introdução (para a música começar depressa), depois o tema inteiro.
import { compose } from './composer';
import { Rendered, renderSong } from './render';

export interface Job { key: string; world: string; level: number; title: string }

const scope = self as unknown as Worker;

self.onmessage = (e: MessageEvent<Job>) => {
  const { key, world, level, title } = e.data;
  const send = (kind: 'intro' | 'full', r: Rendered) => scope.postMessage({ key, kind, l: r.l, r: r.r, sampleRate: r.sampleRate, kicks: r.kicks }, [r.l.buffer, r.r.buffer]);
  try {
    const song = compose(world, level, title);
    send('intro', renderSong({ ...song, form: song.form.slice(0, 1) }));
    send('full', renderSong(song));
  } catch (err) { scope.postMessage({ key, kind: 'error', message: String(err) }); }
};
