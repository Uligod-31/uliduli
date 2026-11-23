import { MaskKind } from '../core/maze';
import { Pal, mkPal } from '../core/theme';
import { CharKind } from '../art/characters';

export type Weather = 'none' | 'rain' | 'snow' | 'embers' | 'ash' | 'dust' | 'pages' | 'mist';

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
  guards?: number; // guardas que perseguem o jogador
  weather?: Weather; // clima deste nível (por cima do do mundo)
  bonus?: boolean; // nível bónus: só abre com todas as estrelas dos outros
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
  weather?: Weather; // clima base do mundo
  planet?: boolean; // visual de asteroide (Pequenos Pesadelos)
  guardStyle?: number; // aspeto dos guardas (0-2 Crescidos, 3 Carcereiro, 4 Sentinela de gelo, 5 Autómato, 6 Livro vivo)
  look?: { wall: string; floor: string; decor: string }; // texturas e adereços do mundo
}

const soon = (id: string, name: string, tagline: string, rule: string, pal: Pal, mask: MaskKind, seed: number): WorldDef => ({
  id, name, tagline, rule, pal, ready: false, levels: [],
  preview: { mask, cols: mask === 'rect' ? 7 : 9, rows: mask === 'rect' ? 7 : 9, seed },
});

const lv = (title: string, cols: number, rows: number, mask: MaskKind, seed: number, o: Partial<LevelDef> = {}, intro: Line[] = [], outro?: Line[]): LevelDef =>
  ({ title, cols, rows, mask, seed, dyn: 0, shift: 8, loops: 0.05, fog: 0, intro, outro, ...o });

// ───────────────────────── Mundo 0: Asteroide B-612 ─────────────────────────
// Pequenos planetas à deriva, no espírito do pequeno príncipe, vistos por um pesadelo:
// adultos altos demais, uma rosa sob vidro e uma raposa que sabe mais do que diz.
const b612: WorldDef = {
  id: 'b612',
  name: 'Asteroide B-612',
  tagline: 'Planetas do tamanho de uma casa, uma rosa sob vidro e adultos demasiado altos.',
  rule: 'Os Crescidos caçam-te. Foge-lhes de lado.',
  pal: mkPal(0x0a1012, 0x6e6452, 0x34452f, 0xf0b44a),
  ready: true,
  planet: true, weather: 'dust',
  preview: { mask: 'circle', cols: 9, rows: 9, seed: 12 },
  levels: [
    {
      title: 'O Meu Planeta', cols: 7, rows: 7, mask: 'circle', seed: 101, dyn: 0, shift: 8, loops: 0.02, fog: 0,
      intro: [
        { who: 'raposa', text: 'Pequeno. Estás longe de casa. Toda a gente está.' },
        { who: 'uli', text: '...' },
        { who: 'raposa', text: 'Cativa o caminho e ele cativa-te. Dá um passo, depois outro. Aqui um toque é um passo, segurar é correr.' },
        { who: 'raposa', text: 'As rosas sob vidro são tuas. Apanha-as, ninguém mais as quer.' },
      ],
      outro: [{ who: 'raposa', text: 'O essencial é invisível aos olhos. O resto são paredes.' }],
    },
    {
      title: 'O Planeta do Rei', cols: 8, rows: 9, mask: 'circle', seed: 102, dyn: 3, shift: 8, loops: 0.05, fog: 0,
      intro: [
        { who: 'rei', text: 'Súbdito! Ordeno-te que passes por onde eu mandar!' },
        { who: 'uli', text: 'Não tens súbditos.' },
        { who: 'rei', text: 'Tenho-te a ti. Por isso as paredes mudam só quando eu quiser, de oito em oito passos. É uma ordem.' },
      ],
    },
    {
      title: 'O Planeta do Vaidoso', cols: 9, rows: 12, mask: 'diamond', seed: 103, dyn: 4, shift: 8, loops: 0.08, fog: 0, guards: 1,
      intro: [
        { who: 'raposa', text: 'Cuidado. Os Crescidos. Altos, curvados, e cheios de si.' },
        { who: 'raposa', text: 'Mexem-se de dois em dois passos teus e cheiram-te a seis casas. Se te apanham, voltas ao início.' },
        { who: 'uli', text: 'Então corro.' },
        { who: 'raposa', text: 'Corre de lado. Eles só olham em frente.' },
      ],
    },
    {
      title: 'O Homem dos Números', cols: 9, rows: 11, mask: 'circle', seed: 104, dyn: 3, shift: 8, loops: 0.05, fog: 3.2, guards: 1,
      intro: [
        { who: 'acendedor', text: 'Não acendas nada. Ele conta tudo. As estrelas, os passos, os teus dias.' },
        { who: 'acendedor', text: 'Fica escuro. Só vês o que está perto de ti. Eu só tenho duas centelhas para te dar.' },
        { who: 'uli', text: 'O Vagalume.' },
        { who: 'acendedor', text: 'Gasta-as bem.' },
      ],
    },
    {
      title: 'O Acendedor', cols: 10, rows: 12, mask: 'heart', seed: 105, dyn: 4, shift: 7, loops: 0.08, fog: 0, guards: 2,
      intro: [
        { who: 'acendedor', text: 'Acendo o candeeiro de manhã. Apago à noite. O meu planeta gira depressa. Nunca descanso.' },
        { who: 'rei', text: 'Ordeno que ele descanse!' },
        { who: 'acendedor', text: 'A ordem é a ordem. Foge, pequeno. Há dois Crescidos neste planeta.' },
      ],
    },
    {
      title: 'O Deserto da Raposa', cols: 11, rows: 14, mask: 'circle', seed: 106, dyn: 6, shift: 6, loops: 0.07, fog: 4.2, guards: 3,
      intro: [
        { who: 'raposa', text: 'Chegaste. Eu devia ter dito antes: o deserto é grande e as estrelas vigiam.' },
        { who: 'raposa', text: 'Três Crescidos, névoa e sebes que mudam de ideias. Cativa-me ao chegar à saída.' },
        { who: 'uli', text: 'Combinado.' },
      ],
      outro: [
        { who: 'raposa', text: 'Foste cativado. Agora o trigo faz-me lembrar o teu cabelo.' },
        { who: 'acendedor', text: 'Há mais mundos. E nenhum acende sozinho.' },
      ],
    },
    lv('O Planeta Esquecido', 11, 13, 'circle', 107, { dyn: 5, shift: 6, loops: 0.08, fog: 3.6, guards: 2 }, [
      { who: 'acendedor', text: 'Este planeta ninguém visita. Os Crescidos esqueceram-se dele.' },
      { who: 'raposa', text: 'Esqueceram-se do planeta, não de ti. Cuidado com o escuro.' },
    ]),
    lv('A Rosa Sob o Vidro', 13, 15, 'circle', 108, { dyn: 8, shift: 6, loops: 0.09, fog: 4, guards: 3, bonus: true }, [
      { who: 'raposa', text: 'Só chega aqui quem apanhou todas as estrelas. O Pequeno Príncipe teria orgulho.' },
      { who: 'uli', text: 'Quero a minha rosa.' },
      { who: 'raposa', text: 'Então cativa-a. Três Crescidos, névoa e sebes que mentem. Boa sorte.' },
    ], [{ who: 'raposa', text: 'És o único que cativou a rosa sem a apanhar. Isso sim é magia.' }]),
  ],
};

// ───────────────────────── Mundo 1: Jardim Sebe ─────────────────────────
// Inspirado no imaginário dos jardins fantásticos de contos clássicos (relógios, chás, rainhas),
// mas com personagens, nomes e regras originais.
const jardim: WorldDef = {
  id: 'jardim',
  name: 'Jardim Sebe',
  tagline: 'Sebes que mordem, relógios que derretem e uma rainha com mau perder.',
  rule: 'Sebes rebeldes: mudam de lugar de N em N passos.',
  pal: mkPal(0x070a06, 0x6a6650, 0x2c4a30, 0xd98aae),
  ready: true, weather: 'ash',
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
      title: 'Sebes Rebeldes', weather: 'rain', cols: 6, rows: 9, mask: 'rect', seed: 22, dyn: 3, shift: 8, loops: 0.06, fog: 0,
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
      title: 'Coração de Roseira', weather: 'rain', cols: 10, rows: 12, mask: 'heart', seed: 55, dyn: 4, shift: 7, loops: 0.08, fog: 0, guards: 2,
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
    lv('A Roseira Infinita', 12, 12, 'ring', 67, { weather: 'rain', dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [
      { who: 'sorriso', text: 'Rodas, rodas, e a saída não aparece. Divertido, não?' },
      { who: 'lagarta', text: 'A roseira não acaba. Quem entra, pergunta-se se saiu.' },
    ]),
    lv('O Trono da Rainha', 13, 17, 'cross', 68, { dyn: 9, shift: 5, loops: 0.09, fog: 4, guards: 4, bonus: true }, [
      { who: 'rainha', text: 'APANHASTE TODAS AS ESTRELAS?! Ninguém me tira as estrelas!' },
      { who: 'uli', text: 'Já tirei.' },
      { who: 'rainha', text: 'Então chega ao meu trono, rebelde. Quatro Crescidos a guardá-lo. Corta-te a cabeça quem lá chegar... ou quase.' },
    ], [{ who: 'rainha', text: 'Hmpf! Está bem. O jardim é teu. Mas a roseira fica comigo.' }]),
  ],
};


// ───────────────────────── Mundo 2: Abismo Demoníaco ─────────────────────────
const demoniaco: WorldDef = {
  id: 'demoniaco', name: 'Abismo Demoníaco',
  tagline: 'Brasas, correntes e um carcereiro que guarda chaves de portas que já ninguém abre.',
  rule: 'Os Carcereiros caçam-te. As sebes de ferro mudam com as brasas.',
  pal: mkPal(0x1a0508, 0x5a4a48, 0x4a2a2a, 0xff6a2a), ready: true, guardStyle: 3, weather: 'embers',
  look: { wall: 'obsidian', floor: 'obsidian', decor: 'hell' },
  preview: { mask: 'diamond', cols: 9, rows: 9, seed: 15 },
  levels: [
    lv('Portões de Cinza', 7, 9, 'rect', 201, {}, [
      { who: 'carcereiro', text: 'Mais um. Entras por vontade? Tens graça. Sais por vontade? Não tem nenhuma.' },
      { who: 'uli', text: 'Venho buscar a chama que me roubaram.' },
      { who: 'carcereiro', text: 'Todas as chamas me pertencem. Mas deixo-te tentar.' },
    ]),
    lv('Rio de Brasas', 8, 10, 'rect', 202, { dyn: 3, shift: 8, loops: 0.05 }, [{ who: 'carcereiro', text: 'As grades sobem e descem com o calor. Quem não sabe esperar, queima.' }]),
    lv('A Sala das Correntes', 9, 12, 'diamond', 203, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'carcereiro', text: 'Os meus ajudantes têm fome. Fome de passos teus.' }]),
    lv('Fornalha', 10, 12, 'circle', 204, { dyn: 4, shift: 7, loops: 0.07, fog: 4.2, guards: 1 }, [{ who: 'carcereiro', text: 'Fumo. Escuridão. Só vês o que arde perto de ti.' }]),
    lv('O Coração Negro', 10, 13, 'heart', 205, { dyn: 4, shift: 7, loops: 0.08, guards: 2 }, [{ who: 'carcereiro', text: 'Dizem que o inferno tem um coração. Eu comi-o.' }]),
    lv('Escadaria Invertida', 11, 15, 'rect', 206, { dyn: 6, shift: 6, loops: 0.08, fog: 4.5, guards: 2 }),
    lv('O Trono do Carcereiro', 12, 15, 'cross', 207, { dyn: 6, shift: 6, loops: 0.08, fog: 3.6, guards: 3 }, [
      { who: 'carcereiro', text: 'Chegaste ao meu trono. Ninguém chega ao meu trono.' },
      { who: 'uli', text: 'Estou aqui.' },
    ]),
    lv('O Último Círculo', 14, 17, 'circle', 208, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [
      { who: 'carcereiro', text: 'Todas as estrelas. Quem és tu, pequeno?' },
      { who: 'uli', text: 'Uma chama que não quer apagar.' },
      { who: 'carcereiro', text: 'Então arde até ao fim.' },
    ], [{ who: 'carcereiro', text: 'Leva a tua chama. Ou queres antes ficar? Há sempre lugar para mais um.' }]),
  ],
};

// ───────────────────────── Mundo 3: Glaciar Espelhado ─────────────────────────
const glaciar: WorldDef = {
  id: 'glaciar', name: 'Glaciar Espelhado',
  tagline: 'Gelo tão liso que vês o teu fim refletido, e uma rainha que sorri sem calor.',
  rule: 'Sentinelas de gelo caçam-te. O gelo fecha e abre as passagens.',
  pal: mkPal(0x06151f, 0xbfdcec, 0x6aa5c8, 0x9be7ff), ready: true, guardStyle: 4, weather: 'snow',
  look: { wall: 'ice', floor: 'ice', decor: 'ice' },
  preview: { mask: 'circle', cols: 9, rows: 9, seed: 21 },
  levels: [
    lv('Primeira Geada', 7, 9, 'rect', 301, {}, [
      { who: 'geada', text: 'Que pequeno e quente. Vais derreter nos meus corredores.' },
      { who: 'uli', text: 'Sou uma chama.' },
      { who: 'geada', text: 'Então a minha casa será a tua extinção.' },
    ]),
    lv('Cristais', 8, 10, 'rect', 302, { dyn: 3, loops: 0.05 }, [{ who: 'geada', text: 'O gelo fecha as passagens quando respiro.' }]),
    lv('Lago Espelhado', 9, 11, 'circle', 303, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'geada', text: 'As minhas sentinelas não sentem frio. Nem pena.' }]),
    lv('Tempestade Branca', 9, 12, 'rect', 304, { dyn: 3, loops: 0.07, fog: 3.4, guards: 1 }),
    lv('Caverna Azul', 10, 13, 'diamond', 305, { dyn: 4, shift: 7, loops: 0.08, guards: 1 }),
    lv('Palácio de Gelo', 11, 14, 'rect', 306, { dyn: 5, shift: 6, loops: 0.08, fog: 4, guards: 2 }, [{ who: 'geada', text: 'O meu palácio nunca derrete. É o único amor que me restou.' }]),
    lv('O Trono Congelado', 12, 12, 'ring', 307, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'geada', text: 'Cada passo teu aquece o meu trono. Não gosto.' }]),
    lv('Coração de Inverno', 13, 15, 'heart', 308, { dyn: 8, shift: 5, loops: 0.09, fog: 3.4, guards: 3, bonus: true }, [
      { who: 'geada', text: 'Todas as estrelas... és mesmo teimoso.' },
      { who: 'uli', text: 'Tenho de ser.' },
    ], [{ who: 'geada', text: 'Vai. O inverno acaba quando alguém tem a coragem de o atravessar.' }]),
  ],
};

// ───────────────────────── Mundo 4: Cidade-Relógio ─────────────────────────
const relogio: WorldDef = {
  id: 'relogio', name: 'Cidade-Relógio',
  tagline: 'Engrenagens, latão e um tique-taque que decide as paredes.',
  rule: 'As paredes seguem o tempo: mudam depressa. Autómatos vigiam as ruas.',
  pal: mkPal(0x1f1710, 0x7a6a48, 0x8a6a2f, 0xffb347), ready: true, guardStyle: 5, weather: 'dust',
  look: { wall: 'brass', floor: 'brass', decor: 'clock' },
  preview: { mask: 'rect', cols: 8, rows: 8, seed: 24 },
  levels: [
    lv('Ponteiros', 7, 9, 'rect', 401, {}, [
      { who: 'relojoeiro', text: 'Chegas tarde. Ou cedo. Aqui nunca se sabe.' },
      { who: 'uli', text: 'Procuro a saída.' },
      { who: 'relojoeiro', text: 'A saída é só mais uma hora. Dá-me os teus segundos.' },
    ]),
    lv('Engrenagens', 8, 10, 'rect', 402, { dyn: 4, shift: 6 }, [{ who: 'relojoeiro', text: 'As paredes giram de seis em seis passos. Conta comigo.' }]),
    lv('Torre do Sino', 9, 13, 'diamond', 403, { dyn: 5, shift: 5, loops: 0.07, guards: 1 }, [{ who: 'relojoeiro', text: 'Os autómatos nunca se atrasam. Tu vais atrasar-te.' }]),
    lv('Fumo e Vapor', 10, 12, 'circle', 404, { dyn: 3, loops: 0.07, fog: 3.4 }),
    lv('Oficina Infinita', 10, 14, 'rect', 405, { dyn: 6, shift: 5, loops: 0.08, guards: 2 }),
    lv('O Pêndulo', 11, 13, 'heart', 406, { dyn: 6, shift: 4, loops: 0.08, guards: 2 }, [{ who: 'relojoeiro', text: 'Tic. Tac. Tic. Tac. Já ouves?' }]),
    lv('Meia-Noite', 12, 15, 'ring', 407, { dyn: 8, shift: 4, loops: 0.09, fog: 4, guards: 3 }, [{ who: 'relojoeiro', text: 'À meia-noite tudo reinicia. Menos eu.' }]),
    lv('O Relógio Mestre', 14, 16, 'circle', 408, { dyn: 10, shift: 4, loops: 0.09, fog: 3.4, guards: 3, bonus: true }, [
      { who: 'relojoeiro', text: 'Todas as estrelas. Tens tempo de sobra.' },
      { who: 'uli', text: 'Nunca tenho.' },
    ], [{ who: 'relojoeiro', text: 'Pára o relógio, rapaz. Pára-o ou fica comigo para sempre.' }]),
  ],
};

// ───────────────────────── Mundo 5: Biblioteca Infinita ─────────────────────────
const biblioteca: WorldDef = {
  id: 'biblioteca', name: 'Biblioteca Infinita',
  tagline: 'Estantes que se reorganizam quando ninguém olha, e livros que olham de volta.',
  rule: 'As estantes trocam de lugar. Os Livros Vivos seguem-te.',
  pal: mkPal(0x1c120c, 0x8a6a48, 0x5a3a22, 0xffc86b), ready: true, guardStyle: 6, weather: 'pages',
  look: { wall: 'shelves', floor: 'wood', decor: 'library' },
  preview: { mask: 'rect', cols: 8, rows: 8, seed: 26 },
  levels: [
    lv('Entrada', 7, 9, 'rect', 501, {}, [
      { who: 'bibliotecario', text: 'Silêncio. Aqui lê-se, escreve-se... e perde-se.' },
      { who: 'uli', text: 'Procuro uma saída.' },
      { who: 'bibliotecario', text: 'Saídas são capítulos finais. Ninguém os lê até ao fim.' },
    ]),
    lv('Corredor dos Atlas', 8, 11, 'rect', 502, { dyn: 3 }, [{ who: 'bibliotecario', text: 'Os mapas mentem. Os caminhos também.' }]),
    lv('Estantes Móveis', 9, 12, 'rect', 503, { dyn: 6, shift: 6, loops: 0.07 }, [{ who: 'bibliotecario', text: 'Quando fechas os olhos, as estantes dançam.' }]),
    lv('Sala Sem Luz', 9, 12, 'rect', 504, { dyn: 3, loops: 0.07, fog: 3, guards: 1 }, [{ who: 'bibliotecario', text: 'Os Livros Vivos preferem o escuro. Lêem-te devagar.' }]),
    lv('Cripta de Pergaminhos', 10, 13, 'diamond', 505, { dyn: 4, shift: 7, loops: 0.08, guards: 2 }),
    lv('Labirinto de Capas', 11, 14, 'cross', 506, { dyn: 7, shift: 5, loops: 0.08, guards: 2 }),
    lv('Índice Proibido', 12, 15, 'rect', 507, { dyn: 6, shift: 6, loops: 0.09, fog: 3.8, guards: 3 }, [{ who: 'bibliotecario', text: 'Este corredor não vem no índice. Foi apagado.' }]),
    lv('O Livro Final', 14, 17, 'heart', 508, { dyn: 9, shift: 5, loops: 0.09, fog: 3.4, guards: 3, bonus: true }, [
      { who: 'bibliotecario', text: 'O último capítulo, só para quem leu tudo. Todas as estrelas.' },
      { who: 'uli', text: 'Quero acabar a história.' },
    ], [{ who: 'bibliotecario', text: 'Escreve tu o final, então. Eu fico a ler-te.' }]),
  ],
};

// ───────────────────── Próximos mundos (em desenvolvimento) ─────────────────────
export const WORLDS: WorldDef[] = [
  b612,
  jardim,
  demoniaco,
  glaciar,
  relogio,
  biblioteca,
  soon('mandala', 'Mandala Solar', 'Anéis de luz que giram devagar, sem pressa e sem piedade.', 'Os anéis rodam: sincroniza as aberturas.', mkPal(0x2a1608, 0xffe2a8, 0xd9822b, 0xffd24a), 'circle', 3),
  soon('tinta', 'Oceano de Tinta', 'Nadas às cegas: só a tinta revela o caminho.', 'As paredes só aparecem quando lá tocas.', mkPal(0x06162e, 0x9fd3ff, 0x1d4f9c, 0x44e0ff), 'diamond', 5),
  soon('neon', 'Neon Glitch', 'Uma cidade que se reescreve a cada passo errado.', 'Certas casas reescrevem o labirinto.', mkPal(0x0b0714, 0x1b1530, 0x27d3ff, 0xff2bd6), 'cross', 8),
  soon('escher', 'Sonho Escher', 'Escadas impossíveis e gravidade que se dobra.', 'A gravidade muda de lado.', mkPal(0x1b1830, 0xe9e2ff, 0x7a6bd6, 0xffa6e0), 'circle', 9),
  soon('galactico', 'Intergaláctico', 'Estações perdidas entre nebulosas e buracos negros.', 'Portais ligam salas distantes.', mkPal(0x070a1f, 0x1a1f4a, 0x5a3fd6, 0x39f2d0), 'ring', 10),
  soon('viking', 'Fiorde Viking', 'Runas, gelo e machados com mau feitio.', 'Runas abrem e fecham portões.', mkPal(0x10181c, 0xcfd8dc, 0x5b6f78, 0xe0703a), 'rect', 11),
  soon('abstrato', 'Abstrato', 'Linhas, cor e geometria pura: o labirinto é uma pintura.', 'As cores definem as regras.', mkPal(0x101010, 0xf4f0e6, 0x161616, 0xe63a2a), 'cross', 12),
  soon('estelar', 'Estelar', 'Constelações que se desenham enquanto andas.', 'Ligas estrelas para abrir o caminho.', mkPal(0x070d24, 0x16224f, 0xc8a34a, 0xffe08a), 'ring', 13),
  soon('elfico', 'Floresta Élfica', 'Luz dourada, raízes vivas e cantos de arco.', 'Raízes crescem e fecham passagens.', mkPal(0x0a1f16, 0xdff5c9, 0x2d9b6a, 0xffd98a), 'heart', 14),
  soon('angelico', 'Céu Angélico', 'Nuvens, harpas e escadas de luz.', 'Nuvens sustentam-te só por instantes.', mkPal(0x1b2440, 0xfff7e0, 0xc9b6ff, 0xffd86b), 'circle', 16),
  soon('elementais', 'Reino dos Elementos', 'Fogo, água, terra e ar: quatro povos, quatro regras.', 'Mudas de elemento para atravessar.', mkPal(0x0d1c24, 0xe6f2e0, 0x2c8f8f, 0xff8a3b), 'cross', 17),
  soon('animal', 'Reino Animal', 'Savana, selva e quintal: cada bicho tem o seu caminho.', 'Cada animal tem uma habilidade.', mkPal(0x1c1408, 0xf3e0a8, 0x8a6a2b, 0x7be08f), 'rect', 18),
  soon('rockstar', 'Palco Rockstar', 'Amplificadores, luzes e um solo de guitarra a abrir portas.', 'O ritmo abre e fecha as paredes.', mkPal(0x0a0a0f, 0x1a1a22, 0xff2b8a, 0xffe14a), 'heart', 19),
];

export const getWorld = (id: string) => WORLDS.find((w) => w.id === id)!;

/** Um nível está aberto se o anterior foi concluído; o bónus só abre com todas as estrelas dos restantes. */
export function isUnlocked(wd: WorldDef, i: number, st: { level(w: string, i: number): { stars: number } | undefined; unlocked(w: string, i: number): boolean }): boolean {
  if (!wd.levels[i]?.bonus) return st.unlocked(wd.id, i);
  for (let k = 0; k < i; k++) if ((st.level(wd.id, k)?.stars ?? 0) < 3) return false;
  return true;
}
