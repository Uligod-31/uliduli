# UliDUli — Aventura de Labirintos

Jogo de labirintos-arte: o Uli percorre mundos temáticos, conhece personagens e **o seu trilho pinta a obra**, que vai para a Galeria.

Visual (v0.2): **3D real com Three.js** — ilhas de labirinto flutuantes com sebes "a derreter", linhas neon com bloom, sombras,
cenário surreal inspirado em Dalí (relógios moles, elefantes de pernas finíssimas, plano de xadrez até ao horizonte) e retratos 3D das personagens.
O Phaser trata de toque, HUD e diálogos sobre um canvas transparente (`src/three/` = motor 3D).

Stack: **Phaser 3 + Three.js + TypeScript + Vite**, empacotado para Android com **Capacitor** (Google Play) e disponível como **PWA** no browser.

## Correr

```powershell
npm install
npm run dev        # http://localhost:5173  (abrir em modo telemóvel)
npm run build      # produção em dist/
npm run icons      # regenera ícones PNG a partir de public/icon.svg
```

## Android / Google Play

```powershell
npx cap add android        # só na primeira vez (precisa de Android Studio + JDK 17)
npm run android:sync       # build + copiar para o projeto Android
npm run android:open       # abre no Android Studio -> Build > Generate Signed Bundle (AAB)
```

Checklist Play Console (confirmar regras atuais): conta de programador, AAB assinado, nível de API alvo exigido,
política de privacidade, formulário "Segurança dos dados", classificação etária, ícone 512, imagem de destaque 1024x500,
capturas de ecrã, e teste fechado (contas pessoais novas exigem testadores durante um período antes da produção).
Antes do lançamento: trocar `appId` em `capacitor.config.ts` se quiseres outro; ícones adaptativos Android com `@capacitor/assets`.

## Estrutura

```
src/core/     maze (gerador), rng, theme (paleta), ui, audio (sintetizado), save (localStorage)
src/art/      render (sebes, trilho), characters (personagens desenhadas em código), thumb
src/worlds/   definição dos mundos e níveis (data-driven)
src/scenes/   Title, Worlds, Levels, Game, Gallery, dialogue
```

## Como criar um mundo novo

1. Em `src/worlds/index.ts`, trocar o `soon(...)` do mundo por um `WorldDef` com `ready: true` e `levels: [...]`.
2. Cada nível: tamanho, **máscara** (`rect`, `diamond`, `circle`, `heart`, `ring`, `cross`), semente, nº de obstáculos dinâmicos, nevoeiro e diálogos.
3. Personagens novas: adicionar um `case` em `src/art/characters.ts`.
4. Regra própria do mundo (ex.: anéis que giram, gelo que desliza): estender `GameScene` com um "modificador" por mundo.

## Mundo 1 — Jardim Sebe
Inspirado no imaginário dos jardins fantásticos de contos clássicos (relógios, chás, rainhas), com personagens e regras **originais**:
Pimpa (lebre pontual), Madame Lagarta, Sorriso (o gato que desaparece) e a Rainha Roseira.
Regra: **sebes rebeldes** (flores brancas) mudam de lugar de N em N passos; nunca bloqueiam a solução.

## Roadmap
- Mandala Solar (anéis rotativos), Cidade-Relógio, Oceano de Tinta, Biblioteca Infinita, Glaciar, Neon Glitch, Sonho Escher,
  Intergaláctico, Viking, Abstrato, Estelar, Élfico, Demoníaco, Angélico, Elementos, Animal, Rockstar.
- Labirinto do dia (semente por data), rankings e save na nuvem (Supabase), conquistas (Google Play Games Services).
- Partilha da obra (Capacitor Share/Filesystem), música por mundo, mais personagens e animações.
