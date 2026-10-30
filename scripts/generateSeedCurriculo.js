import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parseCurriculoText
} from '../src/utils/curriculoParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const desktopPath = 'C:\\Users\\JACKISON\\Desktop\\Conteúdos.txt';
let content = '';
if (fs.existsSync(desktopPath)) {
  content = fs.readFileSync(desktopPath, 'latin1');
} else {
  console.error('Arquivo Conteúdos.txt não encontrado em:', desktopPath);
  process.exit(1);
}

const result = parseCurriculoText(content);
console.log(`Parsed ${result.records.length} units with ${result.totalObjetos} objects.`);

let sql = `-- Carga de Conteúdos Curriculares (BNCC)
-- Gerado a partir de Conteúdos.txt (${result.records.length} unidades / ${result.totalObjetos} conteúdos)

DO $$
DECLARE
  v_unidade_id uuid;
BEGIN
`;

for (const item of result.records) {
  const nomeEscaped = item.nome.replace(/'/g, "''");
  const modEscaped = item.modalidade.replace(/'/g, "''");
  const anoEscaped = item.ano.replace(/'/g, "''");
  const discEscaped = item.disciplina.replace(/'/g, "''");
  const bimEscaped = item.bimestre.replace(/'/g, "''");

  sql += `  -- ${item.ano} | ${item.disciplina} | ${item.bimestre}\n`;
  sql += `  DELETE FROM public.curriculo_unidades WHERE modalidade = '${modEscaped}' AND ano = '${anoEscaped}' AND disciplina = '${discEscaped}' AND bimestre = '${bimEscaped}';\n`;
  sql += `  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)\n`;
  sql += `  VALUES ('${modEscaped}', '${anoEscaped}', '${discEscaped}', '${bimEscaped}', '${nomeEscaped}')\n`;
  sql += `  RETURNING id INTO v_unidade_id;\n\n`;

  if (item.objetos.length > 0) {
    sql += `  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES\n`;
    const objSqlLines = item.objetos.map(o => `    (v_unidade_id, '${o.replace(/'/g, "''")}')`);
    sql += objSqlLines.join(',\n') + ';\n\n';
  }
}

sql += 'END $$;\n';

const outPath = path.resolve(__dirname, '../supabase/seed_curriculo.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`Seed SQL gerado com sucesso em: ${outPath}`);
