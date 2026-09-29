import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const outputDir = path.join(process.cwd(), 'src/config');
const outputFile = path.join(outputDir, 'logos.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(publicDir)
  .filter(file => /\.(png|jpg|jpeg|svg|webp)$/i.test(file))
  .map(file => `/${file}`);

fs.writeFileSync(outputFile, JSON.stringify(files, null, 2));
console.log(`✅ Lista de logos atualizada: ${files.length} arquivos encontrados.`);
