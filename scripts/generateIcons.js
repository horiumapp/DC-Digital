/**
 * Gera ícones PWA a partir da marca DC Digital.
 * Preferência: public/brand/dc-digital-icon.svg → fallback public/logo.png
 *
 * Uso: node scripts/generateIcons.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const BRAND_ICON_SVG = path.join(ROOT, 'public', 'brand', 'dc-digital-icon.svg');
const BRAND_ICON_PNG = path.join(ROOT, 'public', 'brand', 'dc-digital-icon.ref.png');
const LOGO_PATH = path.join(ROOT, 'public', 'logo.png');
const BRAND_PURPLE = { r: 99, g: 84, b: 199, alpha: 1 }; // #6354C7

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Preferência: PNG de referência oficial → SVG → logo.png
  const sourcePath = fs.existsSync(BRAND_ICON_PNG)
    ? BRAND_ICON_PNG
    : fs.existsSync(BRAND_ICON_SVG)
      ? BRAND_ICON_SVG
      : LOGO_PATH;
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Nenhuma arte de marca encontrada (brand/dc-digital-icon.svg ou logo.png).');
  }

  try {
    const sharp = (await import('sharp')).default;
    const sourceBuffer = fs.readFileSync(sourcePath);

    // Atualiza logo.png do produto (favicon) a partir do ícone — não mexe em logos de escola.
    if (sourcePath === BRAND_ICON_PNG || sourcePath === BRAND_ICON_SVG) {
      await sharp(sourceBuffer)
        .resize(512, 512, { fit: 'contain', background: BRAND_PURPLE })
        .png()
        .toFile(LOGO_PATH);
      console.log('✓ Updated public/logo.png from brand icon');
    }

    for (const size of SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      await sharp(sourceBuffer)
        .resize(size, size, { fit: 'contain', background: BRAND_PURPLE })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${size}x${size}`);
    }

    const maskablePath = path.join(ICONS_DIR, 'maskable-icon-512x512.png');
    await sharp(sourceBuffer)
      .resize(410, 410, { fit: 'contain', background: BRAND_PURPLE })
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: BRAND_PURPLE,
      })
      .png()
      .toFile(maskablePath);
    console.log('✓ Generated maskable 512x512');
  } catch (err) {
    console.log('⚠ sharp indisponível ou falhou:', err instanceof Error ? err.message : err);
    console.log('  Para ícones otimizados: npm install -D sharp && node scripts/generateIcons.js');
    if (!fs.existsSync(LOGO_PATH)) {
      throw new Error('Sem sharp e sem logo.png para fallback.');
    }
    const logoBuffer = fs.readFileSync(LOGO_PATH);
    for (const size of SIZES) {
      fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}x${size}.png`), logoBuffer);
      console.log(`✓ Copied logo as icon-${size}x${size}.png`);
    }
    fs.writeFileSync(path.join(ICONS_DIR, 'maskable-icon-512x512.png'), logoBuffer);
    console.log('✓ Copied logo as maskable-icon-512x512.png');
  }

  console.log('\n✅ Ícones PWA gerados em public/icons/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
