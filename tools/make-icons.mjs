// Gera os ícones PNG (PWA + Android + Play Store) a partir de public/icon.svg (chama, 1024 px)
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';

const svg = readFileSync('public/icon.svg');
mkdirSync('public/icons', { recursive: true });
const out = (s, f) => sharp(svg, { density: 576 }).resize(s, s).png({ compressionLevel: 9 }).toFile(`public/icons/${f}`);
await Promise.all([
  out(180, 'icon-180.png'), out(192, 'icon-192.png'), out(512, 'icon-512.png'),
  out(1024, 'icon-1024.png'),             // Play Store / máxima resolução
  out(512, 'icon-maskable-512.png'),      // o desenho já está dentro da zona segura (80 %)
  out(1024, 'share-1024.png'),
]);
console.log('Ícones gerados em public/icons');
