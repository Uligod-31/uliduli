// A Discoteca: as bandas de todos os mundos, os temas de cada nível e «A minha música» (ficheiros do próprio telemóvel).
import type Phaser from 'phaser';
import { BANDS } from '../audio/bands';
import { library, MyFile } from '../audio/library';
import { MENU, TrackRef, music } from '../audio/player';
import { sfx } from '../core/audio';
import { save } from '../core/save';
import { WORLDS } from '../worlds';

const CSS = `
#disco { position: fixed; inset: 0; z-index: 20; overflow-y: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
  background: #15161a; color: #eceef3; font: 15px/1.5 'Trebuchet MS', system-ui, sans-serif; }
#disco * { box-sizing: border-box; }
#disco .col { max-width: 560px; margin: 0 auto; padding: 0 max(16px, env(safe-area-inset-right, 0px)) calc(32px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px)); }
#disco header { position: sticky; top: 0; z-index: 2; background: #15161a; padding: calc(14px + env(safe-area-inset-top, 0px)) 0 12px; display: flex; align-items: center; gap: 12px;
  border-bottom: 3px solid; border-image: linear-gradient(135deg, #3b74f2, #8a4bea 55%, #e02bc0) 1; }
#disco h1 { flex: 1; margin: 0; font: 700 30px/1.1 Oswald, 'Trebuchet MS', sans-serif; text-transform: uppercase; }
#disco button, #disco label.mine { font: inherit; color: inherit; cursor: pointer; border: 1px solid #373a43; background: #2a2c33; border-radius: 10px; }
#disco button:focus-visible, #disco label.mine:focus-within { outline: 3px solid #5b92ff; outline-offset: 2px; }
#disco .close { width: 44px; height: 44px; font-size: 24px; line-height: 1; }
#disco p.lead { color: #a3a8b6; margin: 12px 2px 14px; }
#disco section { background: #1e2025; border: 1px solid #373a43; border-radius: 14px; margin-bottom: 10px; overflow: hidden; }
#disco section.on { border-color: #ff4fd8; }
#disco .head { width: 100%; display: flex; align-items: center; gap: 12px; text-align: left; padding: 12px 14px; border: 0; border-radius: 0; background: none; }
#disco .head div { flex: 1; min-width: 0; }
#disco .head small { display: block; color: #5b92ff; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
#disco .head strong { display: block; font-size: 19px; line-height: 1.25; }
#disco .head span { display: block; color: #a3a8b6; font-size: 13px; }
#disco .head i { font-style: normal; font-size: 20px; color: #a3a8b6; transition: transform .2s; }
#disco section.open .head i { transform: rotate(90deg); }
#disco .body { padding: 0 14px 14px; }
#disco .story { margin: 0 0 10px; color: #a3a8b6; font-size: 13.5px; }
#disco ol { list-style: none; margin: 0 0 12px; padding: 0; display: grid; gap: 6px; }
#disco ol button { width: 100%; display: flex; gap: 10px; align-items: center; text-align: left; padding: 10px 12px; }
#disco ol button b { width: 20px; flex: none; color: #5b92ff; text-align: center; }
#disco ol button span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
#disco ol button em { font-style: normal; font-size: 12.5px; color: #ff4fd8; }
#disco ol button.playing { background: linear-gradient(135deg, #3b74f2, #8a4bea 55%, #e02bc0); border-color: transparent; }
#disco ol button.playing b, #disco ol button.playing em { color: #fff; }
#disco .actions { display: flex; flex-wrap: wrap; gap: 8px; }
#disco label.mine, #disco .actions button { padding: 10px 14px; }
#disco label.mine input { position: absolute; opacity: 0; width: 1px; height: 1px; }
#disco .warn { color: #ffd45a; font-size: 13px; margin: 8px 0 0; }
`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export function openJukebox(scene: Phaser.Scene, focus?: string) {
  if (document.getElementById('disco')) return;
  sfx.unlock(); sfx.ui();
  const before = music.wanted;
  if (!document.getElementById('disco-css')) { const s = el('style'); s.id = 'disco-css'; s.textContent = CSS; document.head.appendChild(s); }
  scene.input.enabled = false;
  const root = el('div'); root.id = 'disco';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Discoteca');
  for (const t of ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup', 'wheel']) root.addEventListener(t, (e) => { if (t.endsWith('up') || t === 'touchend') sfx.unlock(); e.stopPropagation(); });

  const col = el('div', 'col'), head = el('header'), close = el('button', 'close', '×');
  close.type = 'button'; close.setAttribute('aria-label', 'Fechar a Discoteca');
  head.append(el('h1', '', 'Discoteca'), close);
  col.append(head, el('p', 'lead', 'Cada mundo tem a sua banda e cada nível o seu tema. Também podes pôr músicas tuas num mundo: ficam só neste aparelho.'));
  if (save.mute) col.append(el('p', 'warn', 'O som do jogo está desligado. Liga-o no menu para ouvires.'));
  root.append(col);

  const worlds = [{ id: 'menu', name: 'Menu inicial', titles: [MENU.title] }, ...WORLDS.filter((w) => w.ready).map((w) => ({ id: w.id, name: w.name, titles: w.levels.map((l) => l.title) }))];
  let asked = '';
  const painters: (() => void)[] = [];

  for (const w of worlds) {
    const band = BANDS[w.id];
    const card = el('section'), top = el('button', 'head'), info = el('div'), name = el('strong', '', band.band), style = el('span', '', band.style);
    top.type = 'button'; top.setAttribute('aria-expanded', 'false');
    info.append(el('small', '', w.name), name, style);
    top.append(info, el('i', '', '›'));
    const body = el('div', 'body'); body.hidden = true;
    card.append(top, body); col.append(card);
    let mine: MyFile[] = [], warn = '';

    const paint = () => {
      name.textContent = mine.length ? 'A minha música' : band.band;
      style.textContent = mine.length ? (mine.length === 1 ? '1 ficheiro teu' : `${mine.length} ficheiros teus`) : band.style;
      card.classList.toggle('on', music.now?.world === w.id);
      if (body.hidden) return;
      body.textContent = '';
      body.append(el('p', 'story', mine.length ? `A tocar os teus ficheiros em vez de ${band.band}.` : band.story));
      const list = el('ol');
      w.titles.forEach((title, level) => {
        const b = el('button'), key = `${w.id}:${level}`, playing = music.now?.world === w.id && music.now.level === level;
        b.type = 'button'; b.classList.toggle('playing', playing);
        const file = mine.length ? mine[level % mine.length].name : '';
        b.append(el('b', '', playing ? '♫' : String(level + 1)), el('span', '', file ? `${title}: ${file}` : title));
        if (asked === key && !playing) b.append(el('em', '', 'a preparar…'));
        b.addEventListener('click', () => { asked = key; sfx.unlock(); music.play({ world: w.id, level, title }); painters.forEach((p) => p()); });
        list.append(b);
      });
      const actions = el('div', 'actions'), pick = el('label', 'mine', mine.length ? 'Escolher outros ficheiros' : '＋ Pôr a minha música'), input = el('input');
      input.type = 'file'; input.accept = 'audio/*,.mp3,.m4a,.aac,.ogg,.wav,.flac'; input.multiple = true;
      input.addEventListener('change', async () => {
        const chosen = input.files;
        const files = Array.from({ length: chosen?.length ?? 0 }, (_, i) => chosen![i]).sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }));
        if (!files.length) return;
        mine = files.map((f) => ({ name: f.name, blob: f }));
        warn = (await library.set(w.id, mine)) ? '' : 'Não houve espaço para guardar: os ficheiros ficam só até fechares o jogo.';
        asked = `${w.id}:0`; music.play({ world: w.id, level: 0, title: w.titles[0] }); music.refresh(); paint();
      });
      pick.append(input); actions.append(pick);
      if (mine.length) {
        const back = el('button', '', `Voltar a ${band.band}`); back.type = 'button';
        back.addEventListener('click', async () => { await library.remove(w.id); mine = []; warn = ''; music.refresh(); paint(); });
        actions.append(back);
      }
      body.append(list, actions);
      if (w.id !== 'menu') body.append(el('p', 'story', 'Com vários ficheiros, vão por ordem de nome: o primeiro no nível 1, o segundo no nível 2, e assim por diante.'));
      if (warn) body.append(el('p', 'warn', warn));
    };
    const toggle = (open = body.hidden) => { body.hidden = !open; card.classList.toggle('open', open); top.setAttribute('aria-expanded', String(open)); paint(); };
    top.addEventListener('click', () => toggle());
    painters.push(paint);
    void library.get(w.id).then((f) => { mine = f; paint(); });
    if (focus === w.id) { toggle(true); requestAnimationFrame(() => card.scrollIntoView({ block: 'center' })); }
  }

  const off = music.onNow((n) => { if (asked === `${n.world}:${n.level}`) asked = ''; painters.forEach((p) => p()); });
  const shut = (restore: boolean) => {
    if (!root.isConnected) return;
    off(); root.remove();
    scene.events.off('shutdown', gone);
    if (restore && before) music.play(before as TrackRef);
    window.setTimeout(() => { scene.input.enabled = true; }, 60);
  };
  const gone = () => shut(false);
  scene.events.once('shutdown', gone);
  close.addEventListener('click', () => shut(true));
  document.body.appendChild(root);
}
