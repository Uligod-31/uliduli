import { MaskKind } from '../core/maze';
import { Pal, mkPal } from '../core/theme';
import { CharKind } from '../art/characters';

export interface Line { who: CharKind; text: string }

export interface LevelDef {
  title: string;
  cols: number;
  rows: number;
  mask: MaskKind;
  seed: number;
  dyn: number;
  shift: number;   // passos entre mudanças das sebes dinâmicas
  loops: number;
  fog: number;     // 0 = sem nevoeiro; senão raio de visão em células
  guards?: number; // Espadas: guardas que perseguem o jogador
  intro: Line[];
  outro?: Line[];
}

export interface WorldDef {
  id: string;
  name: string;
  tagline: string;   // a "personalidade" do mundo
  rule: string;      // regra/mecânica própria
  pal: Pal;
  ready: boolean;
  preview: { mask: MaskKind; cols: number; rows: number; seed: number };
  levels: LevelDef[];
}

const soon = (id: string, name: string, tagline: string, rule: string, pal: Pal, mask: MaskKind, seed: number): WorldDef => ({
  id, name, tagline, rule, pal, ready: false, levels: [],
  preview: { mask, cols: mask === 'rect' ? 7 : 9, rows: mask === 'rect' ? 7 : 9, seed },
});

// ───────────────────────── Mundo 1: Jardim Sebe ─────────────────────────
// Inspirado no imaginário dos jardins fantásticos de contos clássicos (relógios, chás, rainhas),
// mas com personagens, nomes e regras originais.
const jardim: WorldDef = {
  id: 'jardim',
  name: 'Jardim Sebe',
  tagline: 'Sebes que mordem, relógios que mentem e uma rainha com mau perder.',
  rule: 'Sebes rebeldes: mudam de lugar de N em N passos.',
  pal: mkPal(0x0a0710, 0x4b4f58, 0x1c6a40, 0xff4fd8),
  ready: true,
  preview: { mask: 'heart', cols: 9, rows: 9, seed: 5 },
  levels: [
    {
      title: 'Primeiros Passos', cols: 5, rows: 7, mask: 'rect', seed: 11, dyn: 0, shift: 8, loops: 0, fog: 0,
      intro: [
        { who: 'pimpa', text: 'Estás atrasado. Eu também. A diferença é que eu não peço desculpa a ninguém.' },
        { who: 'pimpa', text: 'Bem-vindo ao Jardim Sebe. Aqui as sebes têm opinião, e não é boa.' },
        { who: 'uli', text: 'Só quero a saída. Sem conversa.' },
        { who: 'pimpa', text: 'Gosto de ti. Usa o joystick, um toque é um passo, segura para arrancar. Rosas? Apanha-as. Ou não. Ninguém te manda.' },
      ],
      outro: [{ who: 'pimpa', text: 'Hm. Nada mau para um principiante. Não te habitues.' }],
    },
    {
      title: 'Sebes Rebeldes', cols: 6, rows: 9, mask: 'rect', seed: 22, dyn: 3, shift: 8, loops: 0.06, fog: 0,
      intro: [
        { who: 'lagarta', text: 'Quem... és... tu?' },
        { who: 'uli', text: 'Ninguém que precises de conhecer.' },
        { who: 'lagarta', text: 'Gosto dele. As sebes de flores brancas mudam de lado de oito em oito passos. Não confies em nada que floresça.' },
        { who: 'lagarta', text: 'Mas são os atalhos que separam os fracos dos rápidos.' },
      ],
    },
    {
      title: 'O Diamante', cols: 9, rows: 13, mask: 'diamond', seed: 33, dyn: 4, shift: 8, loops: 0.08, fog: 0, guards: 1,
      intro: [
        { who: 'pimpa', text: 'Um diamante. Corta o tempo, e corta quem se atrasa.' },
        { who: 'uli', text: 'Então vou cortar caminho.' },
        { who: 'pimpa', text: 'Cuidado com os Espadas. Os guardas da Rainha. Mexem-se de dois em dois passos e farejam-te de longe.' },
        { who: 'uli', text: 'E se me apanham?' },
        { who: 'pimpa', text: 'Voltas ao início. Ou pior. Aprende o ritmo deles.' },
      ],
    },
    {
      title: 'Nevoeiro de Orvalho', cols: 8, rows: 12, mask: 'circle', seed: 44, dyn: 2, shift: 8, loops: 0.05, fog: 3.1, guards: 1,
      intro: [
        { who: 'sorriso', text: 'Nevoeiro. A minha casa. Aqui ninguém me vê a rir de ti.' },
        { who: 'sorriso', text: 'Só vês o que está perto de ti. Como na vida real.' },
        { who: 'uli', text: 'E o Vagalume?' },
        { who: 'sorriso', text: 'Duas vezes. Gasta bem.' },
      ],
    },
    {
      title: 'Coração de Roseira', cols: 10, rows: 12, mask: 'heart', seed: 55, dyn: 4, shift: 7, loops: 0.08, fog: 0, guards: 2,
      intro: [
        { who: 'lagarta', text: 'Um labirinto em forma de coração. Alguém desenhou isto a sofrer.' },
        { who: 'uli', text: 'Gosto.' },
        { who: 'lagarta', text: 'Claro que gostas. Cuidado com os becos: o amor também tem.' },
      ],
    },
    {
      title: 'O Palácio da Rainha', cols: 10, rows: 14, mask: 'rect', seed: 66, dyn: 6, shift: 6, loops: 0.07, fog: 4.2, guards: 3,
      intro: [
        { who: 'rainha', text: 'QUEM É QUE PISOU O MEU RELVADO?!' },
        { who: 'uli', text: 'Passava por aqui.' },
        { who: 'rainha', text: 'Pinto as sebes de vermelho e elas crescem à vontade. Rebeldes. Como tu.' },
        { who: 'rainha', text: 'Se chegares à saída, deixo-te ir. Spoiler: não chegas.' },
      ],
      outro: [
        { who: 'rainha', text: 'Hmpf. Passaste. Isto não fica assim.' },
        { who: 'sorriso', text: 'O próximo mundo roda, Uli. Aperta o cinto.' },
      ],
    },
  ],
};

// ───────────────────── Próximos mundos (em desenvolvimento) ─────────────────────
export const WORLDS: WorldDef[] = [
  jardim,
  soon('mandala', 'Mandala Solar', 'Anéis de luz que giram devagar, sem pressa e sem piedade.', 'Os anéis rodam: sincroniza as aberturas.', mkPal(0x2a1608, 0xffe2a8, 0xd9822b, 0xffd24a), 'circle', 3),
  soon('relogio', 'Cidade-Relógio', 'Engrenagens, latão e um tique-taque que decide as paredes.', 'As paredes seguem o tempo.', mkPal(0x1f1710, 0xe8d3a8, 0xa8742f, 0xffb347), 'rect', 4),
  soon('tinta', 'Oceano de Tinta', 'Nadas às cegas: só a tinta revela o caminho.', 'As paredes só aparecem quando lá tocas.', mkPal(0x06162e, 0x9fd3ff, 0x1d4f9c, 0x44e0ff), 'diamond', 5),
  soon('biblioteca', 'Biblioteca Infinita', 'Estantes que se reorganizam quando ninguém olha.', 'Os livros trocam de lugar.', mkPal(0x1c120c, 0xeed9b5, 0x7a4a26, 0xffc86b), 'rect', 6),
  soon('glaciar', 'Glaciar Espelhado', 'Gelo liso onde se desliza até bater na parede.', 'Deslizas até ao obstáculo.', mkPal(0x08202b, 0xdcf6ff, 0x4aa7c9, 0x9be7ff), 'diamond', 7),
  soon('neon', 'Neon Glitch', 'Uma cidade que se reescreve a cada passo errado.', 'Certas casas reescrevem o labirinto.', mkPal(0x0b0714, 0x1b1530, 0x27d3ff, 0xff2bd6), 'cross', 8),
  soon('escher', 'Sonho Escher', 'Escadas impossíveis e gravidade que se dobra.', 'A gravidade muda de lado.', mkPal(0x1b1830, 0xe9e2ff, 0x7a6bd6, 0xffa6e0), 'circle', 9),
  soon('galactico', 'Intergaláctico', 'Estações perdidas entre nebulosas e buracos negros.', 'Portais ligam salas distantes.', mkPal(0x070a1f, 0x1a1f4a, 0x5a3fd6, 0x39f2d0), 'ring', 10),
  soon('viking', 'Fiorde Viking', 'Runas, gelo e machados com mau feitio.', 'Runas abrem e fecham portões.', mkPal(0x10181c, 0xcfd8dc, 0x5b6f78, 0xe0703a), 'rect', 11),
  soon('abstrato', 'Abstrato', 'Linhas, cor e geometria pura: o labirinto é uma pintura.', 'As cores definem as regras.', mkPal(0x101010, 0xf4f0e6, 0x161616, 0xe63a2a), 'cross', 12),
  soon('estelar', 'Estelar', 'Constelações que se desenham enquanto andas.', 'Ligas estrelas para abrir o caminho.', mkPal(0x070d24, 0x16224f, 0xc8a34a, 0xffe08a), 'ring', 13),
  soon('elfico', 'Floresta Élfica', 'Luz dourada, raízes vivas e cantos de arco.', 'Raízes crescem e fecham passagens.', mkPal(0x0a1f16, 0xdff5c9, 0x2d9b6a, 0xffd98a), 'heart', 14),
  soon('demoniaco', 'Abismo Demoníaco', 'Brasas, correntes e portas que riem de ti.', 'Lava avança de trás para a frente.', mkPal(0x1a0508, 0x3a1218, 0xd62a2a, 0xff8a2b), 'diamond', 15),
  soon('angelico', 'Céu Angélico', 'Nuvens, harpas e escadas de luz.', 'Nuvens sustentam-te só por instantes.', mkPal(0x1b2440, 0xfff7e0, 0xc9b6ff, 0xffd86b), 'circle', 16),
  soon('elementais', 'Reino dos Elementos', 'Fogo, água, terra e ar: quatro povos, quatro regras.', 'Mudas de elemento para atravessar.', mkPal(0x0d1c24, 0xe6f2e0, 0x2c8f8f, 0xff8a3b), 'cross', 17),
  soon('animal', 'Reino Animal', 'Savana, selva e quintal: cada bicho tem o seu caminho.', 'Cada animal tem uma habilidade.', mkPal(0x1c1408, 0xf3e0a8, 0x8a6a2b, 0x7be08f), 'rect', 18),
  soon('rockstar', 'Palco Rockstar', 'Amplificadores, luzes e um solo de guitarra a abrir portas.', 'O ritmo abre e fecha as paredes.', mkPal(0x0a0a0f, 0x1a1a22, 0xff2b8a, 0xffe14a), 'heart', 19),
];

export const getWorld = (id: string) => WORLDS.find((w) => w.id === id)!;
