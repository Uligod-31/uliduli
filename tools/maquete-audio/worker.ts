// Calcula uma música fora do fio principal, a avisar em que etapa vai.
import { renderSteps } from '../../src/audio/render';
import { SONGS } from '../../src/audio/songs';

const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

self.onmessage = (e: MessageEvent<{ id: string }>) => {
  const id = e.data.id;
  try {
    const g = renderSteps(SONGS.find((s) => s.id === id)!);
    for (;;) {
      const r = g.next();
      if (r.done) { const v = r.value; post({ id, done: v }, [v.l.buffer, v.r.buffer]); return; }
      post({ id, stage: r.value });
    }
  } catch (err) { post({ id, error: String(err) }); }
};
