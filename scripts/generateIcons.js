/**
 * Script para gerar ícones PWA a partir do logo.png existente.
 * Usa canvas nativo do Node.js via sharp (ou fallback para cópia simples).
 * 
 * Uso: node scripts/generateIcons.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const LOGO_PATH = path.join(ROOT, 'public', 'logo.png');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  // Create icons directory
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Try to use sharp for proper resizing
  try {
    const sharp = (await import('sharp')).default;
    const logoBuffer = fs.readFileSync(LOGO_PATH);

    for (const size of SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      await sharp(logoBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 248, g: 250, b: 252, alpha: 1 } })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${size}x${size}`);
    }

    // Maskable icon (with padding for safe zone)
    const maskablePath = path.join(ICONS_DIR, 'maskable-icon-512x512.png');
    await sharp(logoBuffer)
      .resize(410, 410, { fit: 'contain', background: { r: 15, g: 40, b: 81, alpha: 1 } })
      .extend({ top: 51, bottom: 51, left: 51, right: 51, background: { r: 15, g: 40, b: 81, alpha: 1 } })
      .png()
      .toFile(maskablePath);
    console.log('✓ Generated maskable 512x512');

  } catch {
    // Fallback: copy logo as-is for all sizes (user can replace later)
    console.log('⚠ sharp não encontrado. Copiando logo.png para todos os tamanhos...');
    console.log('  Para ícones otimizados, execute: npm install -D sharp && node scripts/generateIcons.js');
    
    const logoBuffer = fs.readFileSync(LOGO_PATH);
    for (const size of SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      fs.writeFileSync(outputPath, logoBuffer);
      console.log(`✓ Copied logo as icon-${size}x${size}.png`);
    }
    const maskablePath = path.join(ICONS_DIR, 'maskable-icon-512x512.png');
    fs.writeFileSync(maskablePath, logoBuffer);
    console.log('✓ Copied logo as maskable-icon-512x512.png');
  }

  console.log('\n✅ Ícones PWA gerados em public/icons/');
}

main().catch(console.error);
