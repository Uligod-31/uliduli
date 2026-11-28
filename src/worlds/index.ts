import { MaskKind, MazeOpts, MechKind, Element } from '../core/maze';
import { Pal, mkPal } from '../core/theme';
import { CharKind } from '../art/characters';

export type Weather = 'none' | 'rain' | 'snow' | 'embers' | 'ash' | 'dust' | 'pages' | 'mist' | 'fireflies';

/** Regras dos guardas: ritmo, alcance do faro e Vagalume (ofusca-os). */
export const GUARD_HUNT = 4;      // casas (caminho) a que farejam
export const GUARD_STUN = 8;      // passos que ficam ofuscados
export const GUARD_STUN_R = 6;    // alcance do Vagalume
export const HINTS = 3;           // cargas do Vagalume por nível
export const guardEvery = (d: { gp?: number }) => d.gp ?? 3;

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
  gp?: number;     // os guardas mexem-se de gp em gp passos teus (por defeito 3)
  weather?: Weather; // clima deste nível (por cima do do mundo)
  bonus?: boolean; // nível bónus: só abre com todas as estrelas dos outros
  mech?: MechKind; // mecânica do mundo
  amount?: number; // quanto há da mecânica (passagens, pares, zonas, nuvens)
  rings?: number;  // anéis: quantos rodam (1 ou 2)
  grip?: number;   // gelo: fração extra de neve (mais fácil)
  lavaK?: number;  // lava: passos por cada casa que avança
  slack?: number;  // lava: passos de folga antes de ela acordar
  rev?: number;    // versão do desenho do nível (os trilhos guardados de outra versão não se mostram)
  lightK?: number; // Chama Viva: folga da luz sobre o troço mais longo
  element?: Element; // elemento das barreiras de sopro deste mundo
  barriers?: number; // quantas barreiras
  pick?: number;   // Vaga 3: candidato escolhido pela ferramenta tools/gerar-vaga3.ts
  level?: number;  // posição do nível no mundo (a Vaga 3 apresenta as coisas aos poucos)
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
  guardStyle?: number; // aspeto dos guardas (0-2 Crescidos, 3 Carcereiro, 4 Sentinela de gelo, 5 Autómato, 6 Livro vivo, 7 Espírito de Raiz, 8 Draugr, 9 Guarda de Anúbis, 10-17 guardas dos mundos novos)
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
// adultos altos demais, uma chama sob vidro e uma raposa que sabe mais do que diz.
const b612: WorldDef = {
  id: 'b612',
  name: 'Asteroide B-612',
  tagline: 'Planetas do tamanho de uma casa, uma chama sob vidro e adultos demasiado altos.',
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
        { who: 'raposa', text: 'As chamas sob vidro são tuas. Apanha-as, ninguém mais as quer.' },
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
        { who: 'raposa', text: 'Mexem-se de três em três passos teus e cheiram-te a quatro casas. Se te apanham, voltas ao início.' },
        { who: 'uli', text: 'Então corro.' },
        { who: 'raposa', text: 'Corre de lado. E se estiverem em cima de ti, acende o Vagalume: a luz ofusca-os e podes passar por eles.' },
      ],
    },
    {
      title: 'O Homem dos Números', cols: 9, rows: 11, mask: 'circle', seed: 7167, dyn: 3, shift: 8, loops: 0.05, fog: 3.2, guards: 1,
      intro: [
        { who: 'acendedor', text: 'Não acendas nada. Ele conta tudo. As estrelas, os passos, os teus dias.' },
        { who: 'acendedor', text: 'Fica escuro. Só vês o que está perto de ti. Eu só tenho três centelhas para te dar.' },
        { who: 'uli', text: 'O Vagalume.' },
        { who: 'acendedor', text: 'Gasta-as bem.' },
      ],
    },
    {
      title: 'O Acendedor', cols: 10, rows: 12, mask: 'heart', seed: 3132, dyn: 4, shift: 7, loops: 0.08, fog: 0, guards: 2,
      intro: [
        { who: 'acendedor', text: 'Acendo o candeeiro de manhã. Apago à noite. O meu planeta gira depressa. Nunca descanso.' },
        { who: 'rei', text: 'Ordeno que ele descanse!' },
        { who: 'acendedor', text: 'A ordem é a ordem. Foge, pequeno. Há dois Crescidos neste planeta.' },
      ],
    },
    {
      title: 'O Deserto da Raposa', cols: 11, rows: 14, mask: 'circle', seed: 9187, dyn: 6, shift: 6, loops: 0.07, fog: 4.2, guards: 3,
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
    lv('O Planeta Esquecido', 11, 13, 'circle', 8179, { dyn: 5, shift: 6, loops: 0.08, fog: 3.6, guards: 2 }, [
      { who: 'acendedor', text: 'Este planeta ninguém visita. Os Crescidos esqueceram-se dele.' },
      { who: 'raposa', text: 'Esqueceram-se do planeta, não de ti. Cuidado com o escuro.' },
    ]),
    lv('A Chama Sob o Vidro', 13, 15, 'circle', 6162, { dyn: 8, shift: 6, loops: 0.09, fog: 4, guards: 3, bonus: true }, [
      { who: 'raposa', text: 'Só chega aqui quem apanhou todas as estrelas. O Pequeno Príncipe teria orgulho.' },
      { who: 'uli', text: 'Quero a minha chama.' },
      { who: 'raposa', text: 'Então cativa-a. Três Crescidos, névoa e sebes que mentem. Boa sorte.' },
    ], [{ who: 'raposa', text: 'És o único que cativou a chama sem a apanhar. Isso sim é magia.' }]),
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
        { who: 'pimpa', text: 'Gosto de ti. Usa o joystick, um toque é um passo, segura para arrancar. Chamas? Apanha-as. Ou não. Ninguém te manda.' },
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
      title: 'O Diamante', cols: 9, rows: 13, mask: 'diamond', seed: 1042, dyn: 4, shift: 8, loops: 0.08, fog: 0, guards: 1,
      intro: [
        { who: 'pimpa', text: 'Um diamante. Corta o tempo, e corta quem se atrasa.' },
        { who: 'uli', text: 'Então vou cortar caminho.' },
        { who: 'pimpa', text: 'Cuidado com os Espadas. Os guardas da Rainha. Mexem-se de três em três passos e farejam-te a quatro casas.' },
        { who: 'uli', text: 'E se me apanham?' },
        { who: 'pimpa', text: 'Voltas ao início. Ou pior. Aprende o ritmo deles, os pontos vermelhos no canto. E se te cercarem, o Vagalume ofusca-os e passas por eles.' },
      ],
    },
    {
      title: 'Nevoeiro de Orvalho', cols: 8, rows: 12, mask: 'circle', seed: 3071, dyn: 2, shift: 8, loops: 0.05, fog: 3.1, guards: 1,
      intro: [
        { who: 'sorriso', text: 'Nevoeiro. A minha casa. Aqui ninguém me vê a rir de ti.' },
        { who: 'sorriso', text: 'Só vês o que está perto de ti. Como na vida real.' },
        { who: 'uli', text: 'E o Vagalume?' },
        { who: 'sorriso', text: 'Três vezes. Gasta bem.' },
      ],
    },
    {
      title: 'Coração de Roseira', weather: 'rain', cols: 10, rows: 12, mask: 'heart', seed: 8127, dyn: 4, shift: 7, loops: 0.08, fog: 0, guards: 2,
      intro: [
        { who: 'lagarta', text: 'Um labirinto em forma de coração. Alguém desenhou isto a sofrer.' },
        { who: 'uli', text: 'Gosto.' },
        { who: 'lagarta', text: 'Claro que gostas. Cuidado com os becos: o amor também tem.' },
      ],
    },
    {
      title: 'O Palácio da Rainha', cols: 10, rows: 14, mask: 'rect', seed: 9147, dyn: 6, shift: 6, loops: 0.07, fog: 4.2, guards: 3,
      intro: [
        { who: 'rainha', text: 'QUEM É QUE PISOU O MEU RELVADO?!' },
        { who: 'uli', text: 'Passava por aqui.' },
        { who: 'rainha', text: 'Mandei plantar sebes por todo o lado. Rebeldes como tu não passam.' },
        { who: 'rainha', text: 'Se chegares à saída, deixo-te ir. Spoiler: não chegas.' },
      ],
      outro: [
        { who: 'rainha', text: 'Hmpf. Passaste. Isto não fica assim.' },
        { who: 'sorriso', text: 'O próximo mundo roda, Uli. Aperta o cinto.' },
      ],
    },
    lv('A Roseira Infinita', 12, 12, 'ring', 8139, { weather: 'rain', dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [
      { who: 'sorriso', text: 'Rodas, rodas, e a saída não aparece. Divertido, não?' },
      { who: 'lagarta', text: 'A roseira não acaba. Quem entra, pergunta-se se saiu.' },
    ]),
    lv('O Trono da Rainha', 13, 17, 'cross', 2086, { dyn: 9, shift: 5, loops: 0.09, fog: 4, guards: 4, bonus: true }, [
      { who: 'rainha', text: 'APANHASTE TODAS AS ESTRELAS?! Ninguém me tira as estrelas!' },
      { who: 'uli', text: 'Já tirei.' },
      { who: 'rainha', text: 'Então chega ao meu trono, rebelde. Os meus Espadas a guardá-lo. Corta-te a cabeça quem lá chegar... ou quase.' },
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
    lv('A Sala das Correntes', 9, 12, 'diamond', 1212, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'carcereiro', text: 'Os meus ajudantes têm fome. Fome de passos teus.' }]),
    lv('Fornalha', 10, 12, 'circle', 4240, { dyn: 4, shift: 7, loops: 0.07, fog: 4.2, guards: 1 }, [{ who: 'carcereiro', text: 'Fumo. Escuridão. Só vês o que arde perto de ti.' }]),
    lv('O Coração Negro', 10, 13, 'heart', 6259, { dyn: 4, shift: 7, loops: 0.08, guards: 2 }, [{ who: 'carcereiro', text: 'Dizem que o inferno tem um coração. Eu comi-o.' }]),
    lv('Escadaria Invertida', 11, 15, 'rect', 9287, { dyn: 6, shift: 6, loops: 0.08, fog: 4.5, guards: 2 }),
    lv('O Trono do Carcereiro', 12, 15, 'cross', 6261, { dyn: 6, shift: 6, loops: 0.08, fog: 3.6, guards: 3 }, [
      { who: 'carcereiro', text: 'Chegaste ao meu trono. Ninguém chega ao meu trono.' },
      { who: 'uli', text: 'Estou aqui.' },
    ]),
    lv('O Último Círculo', 14, 17, 'circle', 4244, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [
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
    lv('Lago Espelhado', 9, 11, 'circle', 5348, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'geada', text: 'As minhas sentinelas não sentem frio. Nem pena.' }]),
    lv('Tempestade Branca', 9, 12, 'rect', 304, { dyn: 3, loops: 0.07, fog: 3.4, guards: 1 }),
    lv('Caverna Azul', 10, 13, 'diamond', 5350, { dyn: 4, shift: 7, loops: 0.08, guards: 1 }),
    lv('Palácio de Gelo', 11, 14, 'rect', 7369, { dyn: 5, shift: 6, loops: 0.08, fog: 4, guards: 2 }, [{ who: 'geada', text: 'O meu palácio nunca derrete. É o único amor que me restou.' }]),
    lv('O Trono Congelado', 12, 12, 'ring', 7370, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'geada', text: 'Cada passo teu aquece o meu trono. Não gosto.' }]),
    lv('Coração de Inverno', 13, 15, 'heart', 7371, { dyn: 8, shift: 5, loops: 0.09, fog: 3.4, guards: 3, bonus: true }, [
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
    lv('Torre do Sino', 9, 13, 'diamond', 8475, { dyn: 5, shift: 5, loops: 0.07, guards: 1 }, [{ who: 'relojoeiro', text: 'Os autómatos nunca se atrasam. Tu vais atrasar-te.' }]),
    lv('Fumo e Vapor', 10, 12, 'circle', 404, { dyn: 3, loops: 0.07, fog: 3.4 }),
    lv('Oficina Infinita', 10, 14, 'rect', 7468, { dyn: 6, shift: 5, loops: 0.08, guards: 2 }),
    lv('O Pêndulo', 11, 13, 'heart', 406, { dyn: 6, shift: 4, loops: 0.08, guards: 2 }, [{ who: 'relojoeiro', text: 'Tic. Tac. Tic. Tac. Já ouves?' }]),
    lv('Meia-Noite', 12, 15, 'ring', 8479, { dyn: 8, shift: 4, loops: 0.09, fog: 4, guards: 3 }, [{ who: 'relojoeiro', text: 'À meia-noite tudo reinicia. Menos eu.' }]),
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
    lv('Sala Sem Luz', 9, 12, 'rect', 2522, { dyn: 3, loops: 0.07, fog: 3, guards: 1 }, [{ who: 'bibliotecario', text: 'Os Livros Vivos preferem o escuro. Lêem-te devagar.' }]),
    lv('Cripta de Pergaminhos', 10, 13, 'diamond', 6559, { dyn: 4, shift: 7, loops: 0.08, guards: 2 }),
    lv('Labirinto de Capas', 11, 14, 'cross', 506, { dyn: 7, shift: 5, loops: 0.08, guards: 2 }),
    lv('Índice Proibido', 12, 15, 'rect', 7570, { dyn: 6, shift: 6, loops: 0.09, fog: 3.8, guards: 3 }, [{ who: 'bibliotecario', text: 'Este corredor não vem no índice. Foi apagado.' }]),
    lv('O Livro Final', 14, 17, 'heart', 2526, { dyn: 9, shift: 5, loops: 0.09, fog: 3.4, guards: 3, bonus: true }, [
      { who: 'bibliotecario', text: 'O último capítulo, só para quem leu tudo. Todas as estrelas.' },
      { who: 'uli', text: 'Quero acabar a história.' },
    ], [{ who: 'bibliotecario', text: 'Escreve tu o final, então. Eu fico a ler-te.' }]),
  ],
};

// ───────────────────────── Mundo 6: Floresta Élfica ─────────────────────────
const elfico: WorldDef = {
  id: 'elfico', name: 'Floresta Élfica',
  tagline: 'Luz dourada entre troncos enormes, raízes que se mexem sozinhas e uma dama que nunca pestaneja.',
  rule: 'As raízes crescem e fecham passagens. Os Espíritos de Raiz seguem-te.',
  pal: mkPal(0x0a1f16, 0x7a9a5a, 0x4a3a22, 0xa8f070), ready: true, guardStyle: 7, weather: 'fireflies',
  look: { wall: 'bark', floor: 'moss', decor: 'elfic' },
  preview: { mask: 'heart', cols: 9, rows: 9, seed: 31 },
  levels: [
    lv('Orla do Bosque', 7, 9, 'rect', 601, {}, [
      { who: 'dama', text: 'Uma chama! Há séculos que ninguém acende luz nesta floresta.' },
      { who: 'uli', text: 'Estou só de passagem.' },
      { who: 'dama', text: 'Todos estão. Depois as raízes agarram-nos.' },
    ]),
    lv('Clareira dos Pirilampos', 8, 10, 'rect', 602, { dyn: 3, loops: 0.05 }, [{ who: 'dama', text: 'As raízes crescem quando ninguém olha. Anda devagar e olha sempre.' }]),
    lv('Raízes Vivas', 9, 12, 'diamond', 603, { dyn: 3, loops: 0.07, guards: 1, weather: 'mist' }, [{ who: 'dama', text: 'Os meus Espíritos de Raiz mexem-se de três em três passos teus. Cheiram-te a quatro casas.' }]),
    lv('Ponte de Cipós', 9, 12, 'rect', 8676, { dyn: 4, shift: 7, loops: 0.07, fog: 3.6, guards: 1, weather: 'rain' }, [{ who: 'dama', text: 'Chove. As raízes bebem. A tua chama é que não gosta.' }]),
    lv('Cogumelos Gigantes', 10, 13, 'circle', 5650, { dyn: 4, shift: 7, loops: 0.08, guards: 2 }, [{ who: 'dama', text: 'Não toques nos chapéus brilhantes. Têm opinião.' }]),
    lv('Coração da Floresta', 11, 14, 'heart', 6660, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2, weather: 'mist' }, [{ who: 'dama', text: 'Ouves? É o coração da floresta. Bate mais depressa quando estás perto.' }]),
    lv('Trono de Raízes', 12, 15, 'cross', 8679, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [
      { who: 'dama', text: 'Chegaste ao meu trono. Há séculos que não tenho visitas.' },
      { who: 'uli', text: 'E não vais gostar da minha.' },
    ]),
    lv('A Árvore-Mãe', 14, 17, 'circle', 7671, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [
      { who: 'dama', text: 'Todas as estrelas. A Árvore-Mãe quer conhecer-te.' },
      { who: 'uli', text: 'Diz-lhe que tenho pressa.' },
      { who: 'dama', text: 'Ela tem mil anos. Nunca teve.' },
    ], [{ who: 'dama', text: 'Leva uma semente de luz. Uma chama só nunca devia andar sozinha.' }]),
  ],
};

// ───────────────────────── Mundo 7: Fiorde Viking ─────────────────────────
const viking: WorldDef = {
  id: 'viking', name: 'Fiorde Viking',
  tagline: 'Gelo negro, drácares a arder ao largo e um jarl que fala com corvos.',
  rule: 'As runas abrem e fecham os portões. Os Draugr patrulham o fiorde.',
  pal: mkPal(0x0a1220, 0x7a8a9a, 0x3a4250, 0xff8a30), ready: true, guardStyle: 8, weather: 'snow',
  look: { wall: 'runes', floor: 'planks', decor: 'viking' },
  preview: { mask: 'rect', cols: 8, rows: 8, seed: 33 },
  levels: [
    lv('Cais de Gelo', 7, 9, 'rect', 701, {}, [
      { who: 'jarl', text: 'Um fogo pequeno, num cais grande. Os corvos já falaram de ti.' },
      { who: 'uli', text: 'Disseram coisas boas?' },
      { who: 'jarl', text: 'Disseram que ardes. Para os meus convidados é sempre o mesmo fim.' },
    ]),
    lv('Aldeia Adormecida', 8, 10, 'rect', 702, { dyn: 3, loops: 0.05, weather: 'none' }, [{ who: 'jarl', text: 'As runas nas pedras abrem e fecham os portões. Aprende-lhes o ritmo.' }]),
    lv('Salão das Runas', 9, 12, 'rect', 12811, { dyn: 4, loops: 0.07, guards: 1 }, [{ who: 'jarl', text: 'Os meus Draugr não dormem. Andam de três em três passos teus e cheiram-te a quatro casas.' }]),
    lv('Fiorde Negro', 9, 12, 'diamond', 2722, { dyn: 3, loops: 0.07, fog: 3.4, guards: 1, weather: 'rain' }, [{ who: 'jarl', text: 'A água é negra e a chuva também. Só os corvos sabem onde acaba o chão.' }]),
    lv('Estaleiro', 10, 13, 'rect', 12813, { dyn: 5, shift: 6, loops: 0.08, guards: 3 }, [{ who: 'jarl', text: 'Aqui construímos os barcos que levam os mortos. Há sempre lugar a bordo.' }]),
    lv('Cume dos Corvos', 11, 14, 'cross', 13823, { dyn: 6, shift: 6, loops: 0.09, fog: 4, guards: 3, weather: 'mist' }, [{ who: 'jarl', text: 'Sobe, pequeno fogo. Lá em cima o vento apaga tudo. Menos a minha raiva.' }]),
    lv('Salão de Valhalla', 12, 15, 'rect', 9788, { dyn: 7, shift: 5, loops: 0.09, fog: 3.6, guards: 4 }, [
      { who: 'jarl', text: 'O meu salão. Cheio de heróis que ficaram. Queres lugar?' },
      { who: 'uli', text: 'Quero a saída.' },
    ]),
    lv('Ragnarök', 14, 17, 'circle', 708, { dyn: 11, shift: 4, loops: 0.1, fog: 3.2, guards: 5, bonus: true }, [
      { who: 'jarl', text: 'Todas as estrelas. Só os que contam as lendas chegam aqui.' },
      { who: 'uli', text: 'Eu não conto lendas. Acendo-as.' },
      { who: 'jarl', text: 'Então que o fim do mundo veja como arde uma.' },
    ], [{ who: 'jarl', text: 'Vai, chama. Os corvos cantarão o teu nome. Não prometo que seja bonito.' }]),
  ],
};

// ───────────────────────── Mundo 8: Reino das Areias (Egito) ─────────────────────────
const egipto: WorldDef = {
  id: 'egipto', name: 'Reino das Areias',
  tagline: 'Pirâmides que sussurram, hieróglifos a brilhar e uma esfinge que só fala por enigmas.',
  rule: 'Portas de pedra abrem e fecham ao ritmo do sol. Os Guardas de Anúbis seguem-te.',
  pal: mkPal(0x140c1e, 0xc9a25a, 0x8a6a3a, 0x2fe6d0), ready: true, guardStyle: 9, weather: 'dust',
  look: { wall: 'hiero', floor: 'sand', decor: 'egypt' },
  preview: { mask: 'diamond', cols: 9, rows: 9, seed: 41 },
  levels: [
    lv('Portal das Dunas', 7, 9, 'rect', 801, {}, [
      { who: 'esfinge', text: 'Uma chama a caminhar nas minhas areias! Há quatro mil anos que ninguém ousa.' },
      { who: 'uli', text: 'Só procuro a saída.' },
      { who: 'esfinge', text: 'Todos procuram. Eu guardo a pergunta: qual é o caminho que não existe?' },
    ]),
    lv('Oásis Perdido', 8, 10, 'rect', 802, { dyn: 3, loops: 0.05 }, [{ who: 'esfinge', text: 'As portas de pedra respiram com o sol. Abrem, fecham, enganam. Aprende-lhes o ritmo.' }]),
    lv('Vale dos Obeliscos', 9, 12, 'diamond', 6857, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'esfinge', text: 'Os Guardas de Anúbis pesam corações. Andam de três em três passos teus e cheiram-te a quatro casas.' }]),
    lv('Tempestade de Areia', 9, 12, 'rect', 3831, { dyn: 4, shift: 7, loops: 0.07, fog: 3.6, guards: 1 }, [{ who: 'esfinge', text: 'O vento esconde tudo. Até eu, às vezes, me perco no meu próprio enigma.' }]),
    lv('Sala das Colunas', 10, 13, 'rect', 10895, { dyn: 5, shift: 6, loops: 0.08, guards: 2 }, [{ who: 'esfinge', text: 'Cada coluna é uma pergunta. Quase todos respondem mal.' }]),
    lv('Barca do Sol', 11, 14, 'cross', 6860, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2, weather: 'mist' }, [{ who: 'esfinge', text: 'À noite, o sol viaja pelo mundo dos mortos. Segue-lhe a luz, pequena chama.' }]),
    lv('Câmara do Faraó', 12, 15, 'rect', 9888, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [
      { who: 'esfinge', text: 'A câmara do faraó. Ouro, silêncio e uma maldição simpática.' },
      { who: 'uli', text: 'Simpática como?' },
      { who: 'esfinge', text: 'Só te devora no fim.' },
    ]),
    lv('A Grande Pirâmide', 14, 17, 'diamond', 4844, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [
      { who: 'esfinge', text: 'Todas as estrelas. A pirâmide deixa-se subir por quem as merece.' },
      { who: 'uli', text: 'E o enigma?' },
      { who: 'esfinge', text: 'Já o resolveste. O caminho que não existe é o que ainda não andaste.' },
    ], [{ who: 'esfinge', text: 'Vai, chama. O deserto vai contar que uma luz atravessou o meu labirinto.' }]),
  ],
};

// ───────────────────────── Mundos 10-17 ─────────────────────────
const mandala: WorldDef = {
  id: 'mandala', name: 'Mandala Solar',
  tagline: "Anéis de luz que giram devagar, sem pressa e sem piedade.",
  rule: "Os anéis rodam e abrem as portas ao ritmo do sol. Os Monges de Luz seguem-te.",
  pal: mkPal(0x2a1608, 0xffe2a8, 0xd9822b, 0xffd24a), ready: true, guardStyle: 10, weather: 'dust',
  look: { wall: 'mandala', floor: 'mosaic', decor: 'mandala' },
  preview: { mask: 'circle', cols: 9, rows: 9, seed: 3 },
  levels: [
    lv('Pétala Inicial', 7, 9, 'rect', 901, {  }, [{ who: 'mestra', text: 'Uma chama pequena a entrar no meu círculo. Bem-vinda ao centro de tudo.' }, { who: 'uli', text: 'Só quero atravessar.' }, { who: 'mestra', text: 'Todos atravessam. Poucos chegam ao centro.' }]),
    lv('Jardim dos Anéis', 8, 10, 'rect', 902, { dyn: 3, loops: 0.05 }, [{ who: 'mestra', text: 'Os anéis giram sem pressa. Aprende o compasso e as portas abrem-se.' }]),
    lv('Templo dos Sinos', 9, 12, 'diamond', 5948, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'mestra', text: 'Os Monges de Luz meditam em movimento: três passos teus, um passo deles. Cheiram-te a quatro casas.' }]),
    lv('Névoa de Incenso', 9, 12, 'rect', 1913, { dyn: 4, shift: 7, loops: 0.07, fog: 3.6, guards: 1, weather: 'mist' }, [{ who: 'mestra', text: 'O incenso esconde o caminho. Confia na tua própria luz.' }]),
    lv('Salão do Ouro', 10, 13, 'rect', 5950, { dyn: 5, shift: 6, loops: 0.08, guards: 2 }, [{ who: 'mestra', text: 'Cada espelho de ouro mostra um caminho. Só um é verdadeiro.' }]),
    lv('Roda do Sol', 11, 14, 'cross', 4942, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2 }, [{ who: 'mestra', text: 'A roda do sol não pára. Corre com ela, pequena chama.' }]),
    lv('Santuário da Luz', 12, 15, 'rect', 5952, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'mestra', text: 'O santuário. Aqui até a luz tem de pedir licença.' }, { who: 'uli', text: 'Eu não peço.' }, { who: 'mestra', text: 'Por isso és interessante.' }]),
    lv('A Mandala Perfeita', 14, 17, 'circle', 8980, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [{ who: 'mestra', text: 'Todas as estrelas. A mandala só se completa com quem a percorre.' }, { who: 'uli', text: 'E depois?' }, { who: 'mestra', text: 'Depois começa outra.' }], [{ who: 'mestra', text: "Leva um anel de luz. Para a próxima mandala que não souberes terminar." }]),
  ],
};

const tinta: WorldDef = {
  id: 'tinta', name: 'Oceano de Tinta',
  tagline: "Nadas às cegas: só a tinta revela o caminho.",
  rule: "A corrente levanta e baixa as paredes. As Lulas de Tinta seguem-te.",
  pal: mkPal(0x06162e, 0x9fd3ff, 0x1d4f9c, 0x44e0ff), ready: true, guardStyle: 11, weather: 'mist',
  look: { wall: 'ink', floor: 'wet', decor: 'ink' },
  preview: { mask: 'diamond', cols: 9, rows: 9, seed: 5 },
  levels: [
    lv('Maré Baixa', 7, 9, 'rect', 911, {  }, [{ who: 'polvo', text: 'Uma luz no meu oceano! Cuidado, pinga! Estou a meio de uma frase.' }, { who: 'uli', text: 'Quem és tu?' }, { who: 'polvo', text: 'O escritor. Oito braços, nenhum rascunho.' }]),
    lv('Recife de Páginas', 8, 10, 'rect', 912, { dyn: 3, loops: 0.05 }, [{ who: 'polvo', text: 'As paredes sobem e descem com a corrente. É a minha pontuação.' }]),
    lv('Gruta das Medusas', 9, 12, 'diamond', 2931, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'polvo', text: 'As minhas Lulas de Tinta nadam de três em três passos teus e cheiram-te a quatro casas.' }]),
    lv('Corrente Negra', 9, 12, 'rect', 914, { dyn: 4, shift: 7, loops: 0.07, fog: 3.4, guards: 1 }, [{ who: 'polvo', text: 'A corrente negra é funda e comprida. Mede bem a tua tinta.' }]),
    lv('Biblioteca Afundada', 10, 13, 'rect', 3942, { dyn: 5, shift: 6, loops: 0.08, guards: 2 }, [{ who: 'polvo', text: 'Estes livros já não se secam. Mas ainda se lêem.' }]),
    lv('Abismo de Tinta', 11, 14, 'cross', 3943, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2 }, [{ who: 'polvo', text: 'Lá em baixo, até a escuridão tem medo do escuro.' }]),
    lv('Coração do Polvo', 12, 15, 'rect', 9998, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'polvo', text: 'Estás no meu coração. Bate três vezes por capítulo.' }]),
    lv('O Grande Tinteiro', 14, 17, 'diamond', 9999, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [{ who: 'polvo', text: 'Todas as estrelas. O tinteiro é teu. Escreve o que quiseres.' }, { who: 'uli', text: 'Escrevo uma saída.' }, { who: 'polvo', text: 'Boa primeira linha.' }], [{ who: 'polvo', text: "Leva uma gota de tinta. Nunca se sabe quando falta uma palavra." }]),
  ],
};

const neon: WorldDef = {
  id: 'neon', name: 'Neon Glitch',
  tagline: "Uma cidade que se reescreve a cada passo errado.",
  rule: "As paredes reescrevem-se ao ritmo da cidade. Os Glitch seguem-te.",
  pal: mkPal(0x0b0714, 0x1b1530, 0x27d3ff, 0xff2bd6), ready: true, guardStyle: 12, weather: 'rain',
  look: { wall: 'circuit', floor: 'grid', decor: 'neon' },
  preview: { mask: 'cross', cols: 9, rows: 9, seed: 8 },
  levels: [
    lv('Beco do Pixel', 7, 9, 'rect', 921, {  }, [{ who: 'glitch', text: 'ERRO: utilizador inesperado. A reiniciar boas-vindas... bem-vindo.' }, { who: 'uli', text: 'És uma máquina?' }, { who: 'glitch', text: 'Sou a cidade. Tu és o bug.' }]),
    lv('Rua dos Sinais', 8, 10, 'rect', 922, { dyn: 3, loops: 0.05 }, [{ who: 'glitch', text: 'Os semáforos reescrevem as paredes. Verde, vermelho, labirinto.' }]),
    lv('Metro Corrompido', 9, 12, 'diamond', 1932, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'glitch', text: 'Os meus Glitch patrulham de três em três passos teus e farejam-te a quatro casas.' }]),
    lv('Chuva Ácida', 9, 12, 'rect', 5969, { dyn: 4, shift: 7, loops: 0.07, fog: 3.4, guards: 1, weather: 'rain' }, [{ who: 'glitch', text: 'Chove código. Não abras a boca.' }]),
    lv('Servidor 404', 10, 13, 'rect', 1934, { dyn: 5, shift: 6, loops: 0.08, guards: 2 }, [{ who: 'glitch', text: 'Este corredor não foi encontrado. Tu também não devias ter sido.' }]),
    lv('Arranha-Céus', 11, 14, 'cross', 8998, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2 }, [{ who: 'glitch', text: 'Cem andares de anúncios. Nenhum é para ti.' }]),
    lv('Núcleo da IA', 12, 15, 'rect', 12026, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'glitch', text: 'O meu núcleo. Aqui dentro tudo é verdade. Menos eu.' }]),
    lv('Reboot', 14, 17, 'cross', 2946, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [{ who: 'glitch', text: 'Todas as estrelas. Vou reiniciar-me por tua causa.' }, { who: 'uli', text: 'Obrigado.' }, { who: 'glitch', text: 'Não agradeças. Ainda vou lembrar-me de ti.' }], [{ who: 'glitch', text: "Leva este fragmento de código. Se me esqueceres, ele lembra-te." }]),
  ],
};

const galactico: WorldDef = {
  id: 'galactico', name: 'Intergaláctico',
  tagline: "Estações perdidas entre nebulosas e buracos negros.",
  rule: "As escotilhas abrem e fecham com o pulsar da estação. Os Alienígenas seguem-te.",
  pal: mkPal(0x070a1f, 0x1a1f4a, 0x5a3fd6, 0x39f2d0), ready: true, guardStyle: 13, weather: 'dust',
  look: { wall: 'hull', floor: 'deck', decor: 'space' },
  preview: { mask: 'ring', cols: 9, rows: 9, seed: 10 },
  levels: [
    lv('Doca de Partida', 7, 9, 'rect', 931, {  }, [{ who: 'comandante', text: 'Terráqueo! Não. Chama. Uma chama a bordo da minha estação. Fascinante.' }, { who: 'uli', text: 'Procuro a saída.' }, { who: 'comandante', text: 'Aqui, a saída é sempre outra estação.' }]),
    lv('Corredor de Gravidade', 8, 10, 'rect', 932, { dyn: 3, loops: 0.05 }, [{ who: 'comandante', text: 'As escotilhas obedecem ao pulsar da estação. Conta as batidas.' }]),
    lv('Estufa Orbital', 9, 12, 'diamond', 13041, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'comandante', text: 'Os meus Alienígenas deslizam de três em três passos teus e cheiram-te a quatro casas.' }]),
    lv('Tempestade Solar', 9, 12, 'rect', 17078, { dyn: 4, shift: 7, loops: 0.07, fog: 3.4, guards: 1 }, [{ who: 'comandante', text: 'Radiação a bombordo. Mantém a luz baixa.' }]),
    lv('Sala de Máquinas', 10, 13, 'rect', 17079, { dyn: 5, shift: 6, loops: 0.08, guards: 2 }, [{ who: 'comandante', text: 'Os motores cantam em frequências que não gostas.' }]),
    lv('Nebulosa Roxa', 11, 14, 'cross', 9008, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2 }, [{ who: 'comandante', text: 'Aqui nascem estrelas. E desaparecem sondas.' }]),
    lv('Ponte de Comando', 12, 15, 'rect', 26162, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'comandante', text: 'A minha ponte. Podes sentar-te no leme. Ou tentar.' }]),
    lv('Buraco Negro', 14, 17, 'ring', 31208, { dyn: 7, shift: 5, loops: 0.12, fog: 3.2, guards: 3, bonus: true }, [{ who: 'comandante', text: 'Todas as estrelas. Nem a luz foge do buraco negro. Tu és a exceção.' }], [{ who: 'comandante', text: "Leva este mapa de estrelas. Mostra onde ainda há luz." }]),
  ],
};

const estelar: WorldDef = {
  id: 'estelar', name: 'Estelar',
  tagline: "Constelações que se desenham enquanto andas.",
  rule: "Ligas estrelas para abrir o caminho: as portas seguem o céu. As Sentinelas Estelares seguem-te.",
  pal: mkPal(0x070d24, 0x16224f, 0xc8a34a, 0xffe08a), ready: true, guardStyle: 14, weather: 'fireflies',
  look: { wall: 'astral', floor: 'chart', decor: 'stars' },
  preview: { mask: 'ring', cols: 9, rows: 9, seed: 13 },
  levels: [
    lv('Observatório Velho', 7, 9, 'rect', 941, {  }, [{ who: 'cartografa', text: 'Uma estrela que anda! Fica quieta um instante. Preciso de te marcar no mapa.' }, { who: 'uli', text: 'Estou com pressa.' }, { who: 'cartografa', text: 'As estrelas também. E ainda aqui estão.' }]),
    lv('Mapa de Cassiopeia', 8, 10, 'rect', 942, { dyn: 3, loops: 0.05 }, [{ who: 'cartografa', text: 'As portas seguem as constelações. Quando o céu muda, o caminho muda.' }]),
    lv('Cometa Perdido', 9, 12, 'diamond', 9015, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'cartografa', text: 'As Sentinelas Estelares cintilam de três em três passos teus e farejam-te a quatro casas.' }]),
    lv('Eclipse', 9, 12, 'rect', 16079, { dyn: 4, shift: 7, loops: 0.07, fog: 3.4, guards: 1 }, [{ who: 'cartografa', text: 'Um eclipse. Durante o escuro, só se vê quem brilha.' }]),
    lv('Roda dos Signos', 10, 13, 'rect', 19107, { dyn: 5, shift: 6, loops: 0.08, guards: 2 }, [{ who: 'cartografa', text: 'Doze signos, doze histórias. Nenhum diz a verdade ao primeiro olhar.' }]),
    lv('Via Láctea', 11, 14, 'cross', 946, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2 }, [{ who: 'cartografa', text: 'A estrada de leite do céu. Mas ninguém a pavimentou para pés.' }]),
    lv('Trono das Constelações', 12, 15, 'rect', 15073, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'cartografa', text: 'O trono onde se sentam as constelações. Hoje está vago. Convém não o aquecer.' }]),
    lv('Big Bang', 14, 17, 'ring', 17092, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 3, bonus: true }, [{ who: 'cartografa', text: 'Todas as estrelas. O mapa completo é o princípio de tudo.' }, { who: 'uli', text: 'E a saída?' }, { who: 'cartografa', text: 'É o início de outro mapa.' }], [{ who: 'cartografa', text: "Leva esta estrela de bolso. Desenha o teu próprio céu." }]),
  ],
};

const angelico: WorldDef = {
  id: 'angelico', name: 'Céu Angélico',
  tagline: "Nuvens, harpas e escadas de luz.",
  rule: "As nuvens sustentam-te só por instantes: as paredes dissolvem e voltam. Os Anjos Caídos seguem-te.",
  pal: mkPal(0x1b2440, 0xfff7e0, 0xc9b6ff, 0xffd86b), ready: true, guardStyle: 15, weather: 'snow',
  look: { wall: 'cloud', floor: 'pearl', decor: 'angel' },
  preview: { mask: 'circle', cols: 9, rows: 9, seed: 16 },
  levels: [
    lv('Portão de Nuvem', 7, 9, 'rect', 951, {  }, [{ who: 'serafim', text: 'Uma chama no céu! Ninguém sobe com fogo. Deves ser ou muito corajosa ou muito perdida.' }, { who: 'uli', text: 'As duas.' }, { who: 'serafim', text: 'Então entra.' }]),
    lv('Jardim das Harpas', 8, 10, 'rect', 952, { dyn: 3, loops: 0.05 }, [{ who: 'serafim', text: 'As nuvens dissolvem-se e voltam ao som das harpas. Escuta.' }]),
    lv('Escada de Luz', 9, 12, 'diamond', 12052, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'serafim', text: 'Os Anjos Caídos descem de três em três passos teus e cheiram-te a quatro casas.' }]),
    lv('Nevoeiro Dourado', 9, 12, 'rect', 4990, { dyn: 4, shift: 7, loops: 0.07, fog: 3.6, guards: 1 }, [{ who: 'serafim', text: 'A bruma dourada esconde o caminho. Segue o brilho que não é teu.' }]),
    lv('Coro Celestial', 10, 13, 'rect', 8018, { dyn: 5, shift: 6, loops: 0.08, guards: 2 }, [{ who: 'serafim', text: 'O coro canta uma nota só. Quando muda, o caminho muda.' }]),
    lv('Ponte Arco-Íris', 11, 14, 'cross', 1965, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2 }, [{ who: 'serafim', text: 'Sete cores, sete degraus. Só se atravessa por cima dos medos.' }]),
    lv('Trono Celeste', 12, 15, 'rect', 10038, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'serafim', text: 'O trono celeste. Só se senta quem não quer sentar-se.' }]),
    lv('Paraíso', 14, 17, 'circle', 9030, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [{ who: 'serafim', text: 'Todas as estrelas. O paraíso também tem labirinto. Chama-se saudade.' }], [{ who: 'serafim', text: "Vai, chama. O céu ficará um pouco mais quente por tua causa." }]),
  ],
};

const animal: WorldDef = {
  id: 'animal', name: 'Reino Animal',
  tagline: "Savana, selva e quintal: cada bicho tem o seu caminho.",
  rule: "Os portões de bambu abrem ao ritmo da manada. Os Leões seguem-te.",
  pal: mkPal(0x1c1408, 0xf3e0a8, 0x8a6a2b, 0x7be08f), ready: true, guardStyle: 16, weather: 'dust',
  look: { wall: 'jungle', floor: 'savanna', decor: 'animal' },
  preview: { mask: 'rect', cols: 9, rows: 9, seed: 18 },
  levels: [
    lv('Clareira', 7, 9, 'rect', 961, {  }, [{ who: 'leao', text: 'Um fogo pequeno no meu reino. Há quanto tempo não via luz que andasse.' }, { who: 'uli', text: 'És o rei?' }, { who: 'leao', text: 'Já fui. Agora sou apenas o mais velho.' }]),
    lv('Poço de Água', 8, 10, 'rect', 962, { dyn: 3, loops: 0.05 }, [{ who: 'leao', text: 'Os portões de bambu abrem com a manada. Segue o ritmo dos passos.' }]),
    lv('Termiteiro', 9, 12, 'diamond', 1972, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'leao', text: 'As minhas leoas andam de três em três passos teus e cheiram-te a quatro casas.' }]),
    lv('Selva Densa', 9, 12, 'rect', 10045, { dyn: 4, shift: 7, loops: 0.07, fog: 3.4, guards: 1 }, [{ who: 'leao', text: 'Na selva, tudo te vê. Poucos te avisam.' }]),
    lv('Planície dos Gnus', 10, 13, 'rect', 1974, { dyn: 5, shift: 6, loops: 0.08, guards: 2 }, [{ who: 'leao', text: 'Mil gnus a correr. Não te metas no meio.' }]),
    lv('Pântano', 11, 14, 'cross', 966, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2, weather: 'mist' }, [{ who: 'leao', text: 'O pântano guarda segredos. E crocodilos.' }]),
    lv('Toca do Leão', 12, 15, 'rect', 967, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'leao', text: 'A minha toca. Cheira a história e a ossos.' }]),
    lv('A Grande Migração', 14, 17, 'rect', 7022, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [{ who: 'leao', text: 'Todas as estrelas. Mereces a minha juba. Guarda-a bem.' }], [{ who: 'leao', text: "Vai, pequena chama. A savana vai falar de ti ao pôr do sol." }]),
  ],
};

const rockstar: WorldDef = {
  id: 'rockstar', name: 'Palco Rockstar',
  tagline: "Amplificadores, luzes e um solo de guitarra a abrir portas.",
  rule: "O ritmo abre e fecha as paredes. Os Seguranças seguem-te.",
  pal: mkPal(0x0a0a0f, 0x1a1a22, 0xff2b8a, 0xffe14a), ready: true, guardStyle: 17, weather: 'embers',
  look: { wall: 'amp', floor: 'stage', decor: 'rock' },
  preview: { mask: 'heart', cols: 9, rows: 9, seed: 19 },
  levels: [
    lv('Bastidores', 7, 9, 'rect', 971, {  }, [{ who: 'lenda', text: 'Ei, uma chama! Perfeito para o espetáculo. Entras já no encore.' }, { who: 'uli', text: 'Que espetáculo?' }, { who: 'lenda', text: 'O meu último. Dura para sempre.' }]),
    lv('Passagem de Som', 8, 10, 'rect', 972, { dyn: 3, loops: 0.05 }, [{ who: 'lenda', text: 'Cada riff abre uma porta. Cada pausa fecha-a. Toca ao ritmo.' }]),
    lv('Camarins', 9, 12, 'diamond', 973, { dyn: 3, loops: 0.07, guards: 1 }, [{ who: 'lenda', text: 'Os meus Seguranças andam de três em três passos teus e cheiram-te a quatro casas. Têm óculos escuros. Não os provoques.' }]),
    lv('Fumo e Strobes', 9, 12, 'rect', 5010, { dyn: 4, shift: 7, loops: 0.07, fog: 3.4, guards: 1 }, [{ who: 'lenda', text: 'Fumo e luzes a piscar. Não vês nada? É o espetáculo.' }]),
    lv('Pit da Multidão', 10, 13, 'rect', 1984, { dyn: 5, shift: 6, loops: 0.08, guards: 2 }, [{ who: 'lenda', text: 'Dez mil pessoas a gritar o teu nome. Mesmo que não saibam qual é.' }]),
    lv('Truss Suspenso', 11, 14, 'cross', 976, { dyn: 6, shift: 6, loops: 0.08, fog: 4, guards: 2 }, [{ who: 'lenda', text: 'Lá em cima, nos holofotes. Cuidado: queimam.' }]),
    lv('Palco Principal', 12, 15, 'rect', 7031, { dyn: 6, shift: 6, loops: 0.09, fog: 3.6, guards: 3 }, [{ who: 'lenda', text: 'O palco principal. Dá o teu melhor solo.' }]),
    lv('Encore', 14, 17, 'heart', 2996, { dyn: 9, shift: 5, loops: 0.09, fog: 3.2, guards: 4, bonus: true }, [{ who: 'lenda', text: 'Todas as estrelas. O público pede mais uma. Tu és a música.' }], [{ who: 'lenda', text: "Fica com a palheta. O resto do concerto é teu." }]),
  ],
};

// ───────────────────── Próximos mundos (em desenvolvimento) ─────────────────────
export const WORLDS: WorldDef[] = [
  egipto,
  b612,
  jardim,
  demoniaco,
  glaciar,
  relogio,
  biblioteca,
  elfico,
  viking,
  mandala,
  tinta,
  neon,
  galactico,
  estelar,
  angelico,
  animal,
  rockstar,
  soon('escher', 'Sonho Escher', 'Escadas impossíveis e gravidade que se dobra.', 'A gravidade muda de lado.', mkPal(0x1b1830, 0xe9e2ff, 0x7a6bd6, 0xffa6e0), 'circle', 9),
  soon('abstrato', 'Abstrato', 'Linhas, cor e geometria pura: o labirinto é uma pintura.', 'As cores definem as regras.', mkPal(0x101010, 0xf4f0e6, 0x161616, 0xe63a2a), 'cross', 12),
  soon('elementais', 'Reino dos Elementos', 'Fogo, água, terra e ar: quatro povos, quatro regras.', 'Mudas de elemento para atravessar.', mkPal(0x0d1c24, 0xe6f2e0, 0x2c8f8f, 0xff8a3b), 'cross', 17),
];

// ───────────────────── Mecânicas dos mundos (Vaga 1) ─────────────────────
// Cada nível redesenhado leva rev: 2, para os trilhos antigos não aparecerem sobre o labirinto novo.
function mechanics(wd: WorldDef, rule: string, per: Partial<LevelDef>[], intros: Record<number, Line[]> = {}) {
  wd.rule = rule;
  wd.levels.forEach((l, i) => { Object.assign(l, { rev: 2 }, per[i] ?? {}); if (intros[i]) l.intro = intros[i]; });
}

// Gelo: escorrega-se até à parede ou à neve. As sebes dinâmicas dão lugar ao gelo.
mechanics(glaciar, 'Escorregas até à parede ou à neve. A Brasa derrete o chão e dá-te onde travar.',
  [0.42, 0.32, 0.26, 0.24, 0.2, 0.16, 0.14, 0.12].map((grip, i) => ({ mech: 'ice' as const, dyn: 0, grip, guards: [0, 0, 1, 1, 1, 1, 2, 2][i], rev: 3 })),
  {
    1: [{ who: 'geada', text: 'Aqui não se caminha: desliza-se. Só a neve te segura.' }, { who: 'uli', text: 'Então derreto onde quiser parar.' }, { who: 'geada', text: 'Três vezes. Depois és meu.' }],
  });

// Lava: nasce no ponto de partida e avança sem parar.
mechanics(demoniaco, 'A lava nasce atrás de ti e nunca pára. Escolhe bem a ordem das chamas.',
  [[3, 18], [3, 12], [2, 10], [2, 9], [2, 8], [2, 8], [2, 7], [2, 6]].map(([lavaK, slack], i) => ({ mech: 'lava' as const, lavaK, slack, guards: [0, 0, 1, 1, 1, 2, 2, 3][i] })),
  {
    1: [{ who: 'carcereiro', text: 'Ouves? O rio acordou. Não olhes para trás: ele não pára.' }],
  });

// Anéis: a mandala roda quando tu mandas.
mechanics(mandala, 'Roda os anéis da mandala para alinhar as portas e chegar ao centro.',
  ([[9, 1, 0], [9, 1, 0], [11, 1, 1], [11, 2, 0], [11, 2, 1], [13, 2, 1], [13, 2, 2], [13, 2, 2]] as const).map(([n, rings, guards]) => ({ mech: 'rings' as const, cols: n, rows: n, rings, guards, dyn: 0, mask: 'rect' as const })),
  {
    1: [{ who: 'mestra', text: 'Os anéis não giram sozinhos. Giram quando tu mandas. Pensa antes de mandar.' }],
    3: [{ who: 'mestra', text: 'Agora são dois anéis. O de dentro só obedece a quem está sobre ele.' }, { who: 'mestra', text: 'O incenso esconde o caminho. Confia na tua própria luz.' }],
  });

// ───────────────────── Mecânicas dos mundos (Vaga 2) ─────────────────────
const wave2 = (mech: MechKind, amount: number[], guards: number[]) => amount.map((a, i) => ({ mech, amount: a, guards: guards[i] }));

mechanics(b612, 'O planeta é redondo: sai por um arco de luz e entras pelo arco da mesma cor, do outro lado.',
  wave2('planet', [3, 3, 4, 4, 5, 5, 6, 6], [0, 0, 1, 1, 1, 2, 2, 3]),
  { 1: [{ who: 'raposa', text: 'Isto é um planeta pequeno. Se andares sempre em frente, voltas a casa.' }, { who: 'uli', text: 'Então os becos têm saída?' }, { who: 'raposa', text: 'Alguns. Procura os arcos.' }] });
mechanics(galactico, 'Buracos de verme: entra num portal e sais no outro da mesma cor.',
  wave2('holes', [1, 2, 2, 2, 3, 3, 3, 4], [0, 0, 1, 1, 1, 2, 2, 3]),
  { 1: [{ who: 'comandante', text: 'Buracos de verme a bordo. Entra num, sais no gémeo. Não perguntes pela física.' }] });
mechanics(viking, 'A maré sobe e desce ao ritmo dos teus passos. Nas zonas baixas, quem fica é levado.',
  wave2('tide', [0.24, 0.28, 0.3, 0.32, 0.34, 0.36, 0.38, 0.4], [0, 0, 0, 1, 1, 1, 2, 2]),
  { 1: [{ who: 'jarl', text: 'O mar respira a cada doze passos. Quando enche, as zonas baixas são dele.' }, { who: 'uli', text: 'E eu apago-me.' }, { who: 'jarl', text: 'Então aprende a esperar.' }] });
mechanics(rockstar, 'O palco explode ao ritmo: três cores de colunas rebentam à vez. Passa entre as batidas.',
  wave2('beat', [0.16, 0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.32], [0, 0, 0, 1, 1, 1, 2, 2]),
  { 1: [{ who: 'lenda', text: 'Ouve a batida, miúdo. Rosa, azul, amarelo. Quem pisa fora de tempo, voa do palco.' }] });
mechanics(biblioteca, 'Vira a página quando quiseres: umas passagens abrem e outras fecham.',
  wave2('page', [5, 6, 7, 8, 9, 10, 11, 12], [0, 0, 1, 0, 1, 1, 2, 2]),
  { 1: [{ who: 'bibliotecario', text: 'Cada sala tem duas páginas. Vira com cuidado: o que se abre de um lado fecha-se do outro.' }] });
mechanics(angelico, 'As nuvens desfazem-se depois de as pisares. Pensa no caminho de volta.',
  wave2('clouds', [3, 4, 5, 5, 6, 6, 7, 7], [0, 0, 0, 1, 1, 1, 2, 2]),
  { 1: [{ who: 'serafim', text: 'Pisa a nuvem uma vez. Ela não te segura duas.' }] });
for (const w of [b612, galactico, viking, rockstar, biblioteca, angelico]) w.levels.forEach((l) => { if (l.mech === 'tide' || l.mech === 'beat' || l.mech === 'clouds' || l.mech === 'page') l.dyn = 0; });

// sementes afinadas com o robô (tools/bot-mecanicas.ts): ganha-se e as 3 estrelas são alcançáveis mesmo com guardas
const tuned: [WorldDef, Record<number, number>][] = [
  [b612, { 2: 4139, 3: 8176, 4: 4141 }],
  [galactico, { 2: 14050, 6: 28180, 7: 32217 }],
  [viking, { 3: 3731, 7: 2726 }],
  [rockstar, { 5: 1985, 6: 9049, 7: 4005 }],
  [biblioteca, { 2: 6557, 4: 13622, 5: 8578, 6: 8579, 7: 4544 }],
  [angelico, { 6: 11047 }],
  [glaciar, { 5: 9387 }],
];
for (const [w, seeds] of tuned) for (const [i, seed] of Object.entries(seeds)) w.levels[Number(i)].seed = seed;

// ───────────────────── Mecânicas dos mundos (Vaga 3) ─────────────────────
const wave3 = (mech: MechKind, amount: number[], guards: number[]) => amount.map((a, i) => ({ mech, amount: a, guards: guards[i], dyn: 0, level: i }));
const GUARDS3 = [0, 0, 1, 1, 1, 2, 2, 2];

mechanics(egipto, 'Roda os espelhos para guiar o sol até aos selos: as portas de pedra abrem, e quem fica no raio adormece.',
  wave3('sun', [1, 1, 1, 2, 2, 2, 2, 2], GUARDS3),
  { 1: [{ who: 'esfinge', text: 'O sol só abre o que alguém lhe aponta. Roda os meus espelhos, pequena chama.' }, { who: 'uli', text: 'E os teus guardas?' }, { who: 'esfinge', text: 'Quem fica no raio, adormece. Escolhe quando.' }] });
mechanics(jardim, 'Cogumelos vermelhos encolhem, azuis fazem crescer. Pequeno passas nas fendas; gigante saltas as sebes baixas.',
  wave3('size', [2, 2, 2, 3, 3, 3, 4, 4], GUARDS3),
  { 1: [{ who: 'lagarta', text: 'Um lado faz-te... pequeno. O outro... enorme. Qual é qual, adivinha.' }, { who: 'uli', text: 'Vermelho encolhe, azul estica.' }, { who: 'lagarta', text: 'Pequeno, os guardas não te veem. Gigante, são eles que fogem.' }] });
mechanics(relogio, 'Pisa um botão: seis passos depois o teu eco aparece lá e segura o portão da mesma cor. Chega a tempo.',
  wave3('echo', [1, 2, 2, 2, 2, 3, 3, 3], GUARDS3),
  { 1: [{ who: 'relojoeiro', text: 'Aqui o tempo repete-se. Dá corda a um botão e o teu eco há-de lá passar.' }, { who: 'uli', text: 'E eu?' }, { who: 'relojoeiro', text: 'Tu corres para o portão. Seis passos. Nem mais, nem menos.' }] });
mechanics(elfico, 'A floresta sente a tua chama: as flores de lua só abrem quando ela está fraca; as raízes de sol, quando está forte.',
  wave3('roots', [1, 1, 2, 2, 2, 2, 3, 3], GUARDS3),
  { 1: [{ who: 'dama', text: 'A minha floresta lê-te a chama. Há flores que só se abrem a quem quase se apaga.' }, { who: 'uli', text: 'Então espero.' }, { who: 'dama', text: 'Esperar gasta-te. É esse o preço.' }] });
mechanics(tinta, 'Enche-te de tinta nos tinteiros e pinta o teu caminho sobre a água. O que pintas fica.',
  wave3('ink', [1, 2, 2, 2, 3, 3, 3, 4], GUARDS3),
  { 1: [{ who: 'polvo', text: 'Onde há água não há caminho. Há folha em branco!' }, { who: 'uli', text: 'E com que escrevo?' }, { who: 'polvo', text: 'Com a minha tinta, claro. Não a desperdices.' }] });
mechanics(neon, 'Os interruptores trocam os blocos ciano e magenta. O Glitch deixa-te atravessar uma parede, poucas vezes.',
  wave3('glitch', [4, 5, 6, 6, 7, 8, 9, 10], GUARDS3),
  { 1: [{ who: 'glitch', text: 'Interruptor: metade das paredes muda de ideias. Glitch: tu ignoras uma. É ilegal.' }, { who: 'uli', text: 'Quantas vezes?' }, { who: 'glitch', text: 'Conta as cargas. Eu conto-as todas.' }] });
mechanics(estelar, 'Liga as estrelas pela ordem certa: a constelação completa faz nascer uma ponte de luz.',
  wave3('stars', [3, 3, 4, 4, 4, 4, 4, 4], [0, 0, 1, 1, 1, 2, 2, 2]),
  { 1: [{ who: 'cartografa', text: 'Primeiro a um, depois a dois. O céu não aceita atalhos na contagem.' }, { who: 'uli', text: 'E se me enganar?' }, { who: 'cartografa', text: 'Nada acontece. É essa a crueldade.' }] });
mechanics(animal, 'Monta os animais: o elefante parte rochas, o macaco passa pelos ramos, a gazela corre até ao próximo cruzamento.',
  wave3('mounts', [1, 2, 2, 3, 3, 3, 4, 4], GUARDS3),
  { 1: [{ who: 'leao', text: 'No meu reino ninguém vai longe sozinho. Sobe. Eles não mordem. Quase.' }] });
for (const w of [egipto, jardim, relogio, elfico, tinta, neon, estelar, animal]) w.levels.forEach((l) => { l.rev = 3; });

// ───────────────────────── Chama Viva ─────────────────────────
// A luz é igual para todos (mais folgada nos primeiros níveis). O sopro tem um elemento por mundo; o Glaciar fica
// com a sua Brasa (abrir paredes no gelo podia prender o jogador) e a Mandala com os anéis, que rodam.
const SOPRO: Partial<Record<string, Element>> = {
  b612: 'heras', jardim: 'heras', elfico: 'heras', animal: 'heras',
  viking: 'gelo',
  egipto: 'runa', biblioteca: 'runa', tinta: 'runa', estelar: 'runa', angelico: 'runa',
  demoniaco: 'gas', relogio: 'gas', neon: 'gas', galactico: 'gas', rockstar: 'gas',
};
for (const w of WORLDS) w.levels.forEach((l, i) => {
  l.lightK = [2.3, 2.1, 1.95, 1.9, 1.85, 1.85, 1.85, 1.85][i] ?? 1.85;
  const e = SOPRO[w.id];
  if (e) { l.element = e; l.barriers = [2, 3, 3, 3, 3, 4, 4, 4][i] ?? 3; }
});

// Candidatos escolhidos com tools/gerar-vaga3.ts (se mudar o gerador, as regras, os tamanhos ou as sementes, voltar a correr).
const PICKS: [WorldDef, number[]][] = [
  [egipto, [93, 56, 39, 65, 63, 55, 82, 94]],
  [jardim, [94, 163, 118, 101, 73, 74, 79, 122]],
  [relogio, [18, 76, 24, 34, 13, 51, 75, 51]],
  [elfico, [6, 2, 51, 36, 14, 2, 10, 30]],
  [tinta, [23, 14, 18, 18, 37, 25, 10, 33]],
  [neon, [22, 65, 70, 38, 64, 325, 90, 140]],
  [estelar, [36, 33, 49, 5, 66, 11, 2, 59]],
  [animal, [31, 20, 6, 16, 31, 67, 92, 37]],
];
for (const [w, picks] of PICKS) picks.forEach((k, i) => { w.levels[i].pick = k; });

export const getWorld = (id: string) => WORLDS.find((w) => w.id === id)!;

/** Um nível está aberto se o anterior foi concluído; o bónus só abre com todas as estrelas dos restantes. */
export function isUnlocked(wd: WorldDef, i: number, st: { level(w: string, i: number): { stars: number } | undefined; unlocked(w: string, i: number): boolean }): boolean {
  if (!wd.levels[i]?.bonus) return st.unlocked(wd.id, i);
  for (let k = 0; k < i; k++) if ((st.level(wd.id, k)?.stars ?? 0) < 3) return false;
  return true;
}

/** Parâmetros de geração de um nível: com guardas há sempre voltas (para os poderes contornar) e mais folga no par. */
export function levelOpts(def: LevelDef): MazeOpts {
  const g = def.guards ?? 0;
  let loops = g ? Math.max(def.loops, 0.15) : def.loops;
  if (def.mech === 'ice') loops = Math.max(loops, 0.34); // no gelo, corredores abertos = deslizes longos
  return { cols: def.cols, rows: def.rows, mask: def.mask, seed: def.seed, dyn: def.dyn, loops, parExtra: g * 6 };
}
