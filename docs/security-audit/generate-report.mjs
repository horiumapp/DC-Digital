import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlFilePath = path.join(__dirname, 'relatorio.html');
const pdfFilePath = path.join(__dirname, 'relatorio-auditoria-seguranca.pdf');

// Caminho do executável do Microsoft Edge no Windows
const edgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

const browserExe = edgePaths.find((p) => fs.existsSync(p));

if (!browserExe) {
  console.error('Nenhum navegador compatível (Edge ou Chrome) encontrado para geração do PDF.');
  process.exit(1);
}

console.log(`Utilizando motor de renderização: ${browserExe}`);

// Comando para imprimir em PDF com fidelidade de impressão e margens CSS
const cmd = `"${browserExe}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfFilePath}" --no-pdf-header-footer "${htmlFilePath}"`;

console.log('Gerando PDF a partir do HTML auditado...');
try {
  execSync(cmd, { stdio: 'inherit' });
  if (fs.existsSync(pdfFilePath)) {
    const stats = fs.statSync(pdfFilePath);
    console.log(`PDF gerado com sucesso em: ${pdfFilePath} (${stats.size} bytes)`);
  } else {
    console.error('Falha: o arquivo PDF não foi encontrado após o comando.');
    process.exit(1);
  }
} catch (err) {
  console.error('Erro ao executar o comando de renderização headless:', err);
  process.exit(1);
}
