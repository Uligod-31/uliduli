// Gera os ícones PNG (PWA + Android) a partir de public/icon.svg
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';

const svg = readFileSync('public/icon.svg');
mkdirSync('public/icons', { recursive: true });
for (const s of [192, 512]) {
  await sharp(svg, { density: 384 }).resize(s, s).png().toFile(`public/icons/icon-${s}.png`);
}
// maskable: o desenho já está dentro da zona segura (80 %)
await sharp(svg, { density: 384 }).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png');
// Imagem de partilha
await sharp(svg, { density: 384 }).resize(1024, 1024).png().toFile('public/icons/share-1024.png');
console.log('Ícones gerados em public/icons');
