/**
 * Utilitários para exportação e importação de dados em formato CSV
 * com compatibilidade para Excel (UTF-8 com BOM) e detecção inteligente de delimitadores.
 */

export function downloadCsvFile(content: string, fileName: string): void {
  // \uFEFF é o Byte Order Mark (BOM) UTF-8, garantindo que o Excel abra acentos corretamente
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Analisador robusto de texto delimitado (CSV / TSV)
 * Suporta separadores comuns (; , \t) e campos delimitados por aspas duplas.
 */
export function parseDelimitedText(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return { headers: [], rows: [] };

  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detecta o melhor delimitador na primeira linha (; ou , ou \t)
  const firstLine = lines[0];
  const countSemi = (firstLine.match(/;/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;

  let delimiter = ';';
  if (countTab > countSemi && countTab > countComma) delimiter = '\t';
  else if (countComma > countSemi) delimiter = ',';

  function splitLine(line: string): string[] {
    const entries: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        entries.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    entries.push(cur.trim());
    return entries;
  }

  const parsedLines = lines.map(splitLine);
  const headers = parsedLines[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = parsedLines.slice(1).filter(r => r.some(c => c.length > 0));

  return { headers, rows };
}

// ============================================================
// 1. ESCOLAS
// ============================================================

export function exportEscolasToCsv(escolas: Array<{
  nome: string;
  distrito?: string;
  inep?: string;
  diretor?: string;
  secretario?: string;
  status?: string;
}>): string {
  const header = ['Nome da Escola', 'Distrito / Endereço', 'Código INEP', 'Diretor(a)', 'Secretário(a)', 'Status'];
  const lines = [header.join(';')];

  for (const esc of escolas) {
    lines.push([
      escapeCsvField(esc.nome),
      escapeCsvField(esc.distrito || ''),
      escapeCsvField(esc.inep || ''),
      escapeCsvField(esc.diretor || ''),
      escapeCsvField(esc.secretario || ''),
      escapeCsvField(esc.status || 'Ativa')
    ].join(';'));
  }

  return lines.join('\r\n');
}

export function getEscolaTemplateCsv(): string {
  return [
    'Nome da Escola;Distrito / Endereço;Código INEP;Diretor(a);Secretário(a);Status',
    'Escola Municipal Exemplo;Centro;12345678;Maria Silva;João Santos;Ativa',
    'Escola Estadual Primavera;Zona Rural;87654321;Carlos Oliveira;Ana Costa;Ativa'
  ].join('\r\n');
}

export function parseEscolasCsv(text: string): {
  valid: Array<{ nome: string; distrito?: string; inep?: string; diretor?: string; secretario?: string; status: string }>;
  errors: string[];
} {
  const { headers, rows } = parseDelimitedText(text);
  const valid: Array<{ nome: string; distrito?: string; inep?: string; diretor?: string; secretario?: string; status: string }> = [];
  const errors: string[] = [];

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const headerMap: Record<string, number> = {};

  headers.forEach((h, idx) => {
    const key = norm(h);
    if (key.includes('nome')) headerMap['nome'] = idx;
    else if (key.includes('distrito') || key.includes('endereco') || key.includes('local')) headerMap['distrito'] = idx;
    else if (key.includes('inep')) headerMap['inep'] = idx;
    else if (key.includes('diretor') || key.includes('gestor')) headerMap['diretor'] = idx;
    else if (key.includes('secretari')) headerMap['secretario'] = idx;
    else if (key.includes('status')) headerMap['status'] = idx;
  });

  if (headerMap['nome'] === undefined) {
    headerMap['nome'] = 0;
  }

  rows.forEach((row, i) => {
    const nome = (row[headerMap['nome'] ?? 0] || '').trim();
    if (!nome) {
      errors.push(`Linha ${i + 2}: Nome da escola em branco.`);
      return;
    }

    valid.push({
      nome,
      distrito: row[headerMap['distrito'] ?? 1]?.trim() || undefined,
      inep: row[headerMap['inep'] ?? 2]?.trim() || undefined,
      diretor: row[headerMap['diretor'] ?? 3]?.trim() || undefined,
      secretario: row[headerMap['secretario'] ?? 4]?.trim() || undefined,
      status: row[headerMap['status'] ?? 5]?.trim() || 'Ativa'
    });
  });

  return { valid, errors };
}

// ============================================================
// 2. TURMAS
// ============================================================

export function exportTurmasToCsv(turmas: Array<{
  nome: string;
  turno: string;
  ano_letivo?: string | number;
  ensino?: string;
  escolas?: { nome?: string } | { nome?: string }[] | null;
}>): string {
  const header = ['Nome da Turma', 'Turno', 'Ano Letivo', 'Segmento / Ensino', 'Escola'];
  const lines = [header.join(';')];

  for (const t of turmas) {
    const escolaNome = Array.isArray(t.escolas) ? t.escolas[0]?.nome : t.escolas?.nome;
    lines.push([
      escapeCsvField(t.nome),
      escapeCsvField(t.turno || 'Matutino'),
      escapeCsvField(t.ano_letivo || '2026'),
      escapeCsvField(t.ensino || 'Ensino Fundamental'),
      escapeCsvField(escolaNome || '')
    ].join(';'));
  }

  return lines.join('\r\n');
}

export function getTurmasTemplateCsv(): string {
  return [
    'Nome da Turma;Turno;Ano Letivo;Segmento / Ensino;Nome da Escola',
    '1º Ano A;Matutino;2026;Ensino Fundamental;Escola Municipal Exemplo',
    '2º Ano B;Vespertino;2026;Ensino Fundamental;Escola Municipal Exemplo',
    '9º Ano Único;Matutino;2026;Ensino Fundamental;Escola Municipal Exemplo'
  ].join('\r\n');
}

export function parseTurmasCsv(
  text: string, 
  escolas: Array<{ id: string; nome: string }>,
  defaultEscolaId?: string
): {
  valid: Array<{ nome: string; turno: string; ano_letivo: string; ensino: string; escola_id: string }>;
  errors: string[];
} {
  const { headers, rows } = parseDelimitedText(text);
  const valid: Array<{ nome: string; turno: string; ano_letivo: string; ensino: string; escola_id: string }> = [];
  const errors: string[] = [];

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const headerMap: Record<string, number> = {};

  headers.forEach((h, idx) => {
    const key = norm(h);
    if (key.includes('turma') || key === 'nome') headerMap['nome'] = idx;
    else if (key.includes('turno')) headerMap['turno'] = idx;
    else if (key.includes('ano') || key.includes('letivo')) headerMap['ano_letivo'] = idx;
    else if (key.includes('ensino') || key.includes('segmento')) headerMap['ensino'] = idx;
    else if (key.includes('escola')) headerMap['escola'] = idx;
  });

  const escolaMapByName = new Map<string, string>();
  escolas.forEach(e => escolaMapByName.set(norm(e.nome), e.id));

  rows.forEach((row, i) => {
    const nome = (row[headerMap['nome'] ?? 0] || '').trim();
    if (!nome) {
      errors.push(`Linha ${i + 2}: Nome da turma em branco.`);
      return;
    }

    const turno = (row[headerMap['turno'] ?? 1] || 'Matutino').trim();
    const anoLetivo = (row[headerMap['ano_letivo'] ?? 2] || '2026').trim();
    const ensino = (row[headerMap['ensino'] ?? 3] || 'Ensino Fundamental').trim();

    let escolaId = defaultEscolaId;
    if (headerMap['escola'] !== undefined) {
      const escolaStr = (row[headerMap['escola']] || '').trim();
      if (escolaStr) {
        const found = escolaMapByName.get(norm(escolaStr));
        if (found) escolaId = found;
        else if (!defaultEscolaId) {
          errors.push(`Linha ${i + 2}: Escola "${escolaStr}" não encontrada no sistema.`);
          return;
        }
      }
    }

    if (!escolaId) {
      errors.push(`Linha ${i + 2}: Escola vinculada não informada.`);
      return;
    }

    valid.push({
      nome,
      turno,
      ano_letivo: anoLetivo,
      ensino,
      escola_id: escolaId
    });
  });

  return { valid, errors };
}

// ============================================================
// 3. PROFESSORES
// ============================================================

export function exportProfessoresToCsv(professores: Array<{
  nome: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  departamento?: string;
  disciplinas?: string[];
  vinculo?: string;
  status?: string;
}>): string {
  const header = ['Nome do Professor', 'E-mail Institucional', 'CPF', 'Telefone', 'Departamento', 'Disciplinas (separadas por vírgula)', 'Vínculo', 'Status'];
  const lines = [header.join(';')];

  for (const p of professores) {
    lines.push([
      escapeCsvField(p.nome),
      escapeCsvField(p.email || ''),
      escapeCsvField(p.cpf || ''),
      escapeCsvField(p.telefone || ''),
      escapeCsvField(p.departamento || 'Geral'),
      escapeCsvField((p.disciplinas || []).join(', ')),
      escapeCsvField(p.vinculo || 'Concursado'),
      escapeCsvField(p.status || 'Ativo')
    ].join(';'));
  }

  return lines.join('\r\n');
}

export function getProfessoresTemplateCsv(): string {
  return [
    'Nome do Professor;E-mail Institucional;CPF;Telefone;Departamento;Disciplinas;Vínculo;Status',
    'Maria Souza;maria.souza@escola.gov.br;11122233344;11999998888;Ensino Fundamental;Português, Redação;Concursado;Ativo',
    'José Carlos;jose.carlos@escola.gov.br;55566677788;11988887777;Ensino Fundamental;Matemática, Geometria;Contrato;Ativo'
  ].join('\r\n');
}

export function parseProfessoresCsv(text: string): {
  valid: Array<{
    nome: string;
    email: string;
    cpf?: string;
    telefone?: string;
    departamento: string;
    disciplinas: string[];
    vinculo: string;
    status: string;
  }>;
  errors: string[];
} {
  const { headers, rows } = parseDelimitedText(text);
  const valid: Array<{
    nome: string;
    email: string;
    cpf?: string;
    telefone?: string;
    departamento: string;
    disciplinas: string[];
    vinculo: string;
    status: string;
  }> = [];
  const errors: string[] = [];

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const headerMap: Record<string, number> = {};

  headers.forEach((h, idx) => {
    const key = norm(h);
    if (key.includes('nome')) headerMap['nome'] = idx;
    else if (key.includes('mail') || key.includes('email')) headerMap['email'] = idx;
    else if (key.includes('cpf')) headerMap['cpf'] = idx;
    else if (key.includes('telefone') || key.includes('celular') || key.includes('contato')) headerMap['telefone'] = idx;
    else if (key.includes('departamento') || key.includes('area')) headerMap['departamento'] = idx;
    else if (key.includes('disciplina') || key.includes('componente')) headerMap['disciplinas'] = idx;
    else if (key.includes('vinculo')) headerMap['vinculo'] = idx;
    else if (key.includes('status')) headerMap['status'] = idx;
  });

  rows.forEach((row, i) => {
    const nome = (row[headerMap['nome'] ?? 0] || '').trim();
    const email = (row[headerMap['email'] ?? 1] || '').trim().toLowerCase();

    if (!nome) {
      errors.push(`Linha ${i + 2}: Nome do professor obrigatório.`);
      return;
    }
    if (!email || !email.includes('@')) {
      errors.push(`Linha ${i + 2}: E-mail inválido para ${nome}.`);
      return;
    }

    const disciplinasRaw = (row[headerMap['disciplinas'] ?? 5] || '').trim();
    const disciplinas = disciplinasRaw ? disciplinasRaw.split(/[,/|]/).map(d => d.trim()).filter(Boolean) : [];

    valid.push({
      nome,
      email,
      cpf: row[headerMap['cpf'] ?? 2]?.replace(/\D/g, '') || undefined,
      telefone: row[headerMap['telefone'] ?? 3]?.trim() || undefined,
      departamento: row[headerMap['departamento'] ?? 4]?.trim() || 'Geral',
      disciplinas,
      vinculo: row[headerMap['vinculo'] ?? 6]?.trim() || 'Concursado',
      status: row[headerMap['status'] ?? 7]?.trim() || 'Ativo'
    });
  });

  return { valid, errors };
}

// ============================================================
// 4. ALUNOS
// ============================================================

export function exportAlunosToCsv(alunos: Array<{
  nome: string;
  matricula?: string;
  cpf?: string;
  data_nascimento?: string;
  sexo?: string;
  nome_responsavel?: string;
  telefone?: string;
  endereco?: string;
  status?: string;
  escolas?: { nome?: string } | { nome?: string }[] | null;
  turmas?: { nome?: string; turno?: string } | { nome?: string; turno?: string }[] | null;
}>): string {
  const header = ['Nome do Aluno', 'Matrícula', 'CPF', 'Data de Nascimento', 'Sexo', 'Responsável', 'Telefone', 'Endereço', 'Escola', 'Turma', 'Status'];
  const lines = [header.join(';')];

  for (const a of alunos) {
    const escolaObj = Array.isArray(a.escolas) ? a.escolas[0] : a.escolas;
    const turmaObj = Array.isArray(a.turmas) ? a.turmas[0] : a.turmas;
    const turmaStr = turmaObj?.nome ? `${turmaObj.nome}${turmaObj.turno ? ` (${turmaObj.turno})` : ''}` : '';

    lines.push([
      escapeCsvField(a.nome),
      escapeCsvField(a.matricula || ''),
      escapeCsvField(a.cpf || ''),
      escapeCsvField(a.data_nascimento || ''),
      escapeCsvField(a.sexo || ''),
      escapeCsvField(a.nome_responsavel || ''),
      escapeCsvField(a.telefone || ''),
      escapeCsvField(a.endereco || ''),
      escapeCsvField(escolaObj?.nome || ''),
      escapeCsvField(turmaStr),
      escapeCsvField(a.status || 'Ativo')
    ].join(';'));
  }

  return lines.join('\r\n');
}

export function getAlunosTemplateCsv(): string {
  return [
    'Nome do Aluno;CPF;Data de Nascimento;Sexo;Responsável;Telefone;Endereço;Nome da Turma;Status',
    'Lucas Gabriel Pereira;12345678901;2015-05-14;M;Carla Pereira;11999990000;Rua das Flores 123;1º Ano A;Ativo',
    'Sophia Helena Ribeiro;98765432100;2015-08-22;F;Rodrigo Ribeiro;11988881111;Av Brasil 456;1º Ano A;Ativo'
  ].join('\r\n');
}

export function parseAlunosCsv(
  text: string,
  turmas: Array<{ id: string; nome: string; escola_id: string }>,
  defaultEscolaId?: string
): {
  valid: Array<{
    nome: string;
    cpf?: string;
    data_nascimento: string;
    sexo?: string;
    nome_responsavel: string;
    telefone: string;
    endereco: string;
    turma_id?: string;
    escola_id: string;
    status: string;
  }>;
  errors: string[];
} {
  const { headers, rows } = parseDelimitedText(text);
  const valid: Array<{
    nome: string;
    cpf?: string;
    data_nascimento: string;
    sexo?: string;
    nome_responsavel: string;
    telefone: string;
    endereco: string;
    turma_id?: string;
    escola_id: string;
    status: string;
  }> = [];
  const errors: string[] = [];

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const headerMap: Record<string, number> = {};

  headers.forEach((h, idx) => {
    const key = norm(h);
    if (key.includes('aluno') || key === 'nome') headerMap['nome'] = idx;
    else if (key.includes('cpf')) headerMap['cpf'] = idx;
    else if (key.includes('nasc')) headerMap['nasc'] = idx;
    else if (key.includes('sexo') || key.includes('genero')) headerMap['sexo'] = idx;
    else if (key.includes('responsavel') || key.includes('mae') || key.includes('pai')) headerMap['responsavel'] = idx;
    else if (key.includes('telefone') || key.includes('celular') || key.includes('contato')) headerMap['telefone'] = idx;
    else if (key.includes('endereco') || key.includes('rua')) headerMap['endereco'] = idx;
    else if (key.includes('turma')) headerMap['turma'] = idx;
    else if (key.includes('status')) headerMap['status'] = idx;
  });

  const turmaMapByName = new Map<string, { id: string; escola_id: string }>();
  turmas.forEach(t => turmaMapByName.set(norm(t.nome), { id: t.id, escola_id: t.escola_id }));

  rows.forEach((row, i) => {
    const nome = (row[headerMap['nome'] ?? 0] || '').trim();
    if (!nome) {
      errors.push(`Linha ${i + 2}: Nome do aluno em branco.`);
      return;
    }

    let turmaId: string | undefined = undefined;
    let escolaId = defaultEscolaId;

    if (headerMap['turma'] !== undefined) {
      const turmaStr = (row[headerMap['turma']] || '').trim();
      if (turmaStr) {
        const found = turmaMapByName.get(norm(turmaStr));
        if (found) {
          turmaId = found.id;
          escolaId = found.escola_id;
        } else {
          errors.push(`Linha ${i + 2}: Turma "${turmaStr}" não encontrada no sistema.`);
        }
      }
    }

    if (!escolaId) {
      errors.push(`Linha ${i + 2}: Aluno ${nome} sem escola vinculada definida.`);
      return;
    }

    // Normaliza data de nascimento (aceita DD/MM/AAAA ou AAAA-MM-DD)
    let dataNascimento = (row[headerMap['nasc'] ?? 2] || '').trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataNascimento)) {
      const [d, m, y] = dataNascimento.split('/');
      dataNascimento = `${y}-${m}-${d}`;
    }
    if (!dataNascimento || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      dataNascimento = '2015-01-01'; // Fallback seguro
    }

    const cpfRaw = row[headerMap['cpf'] ?? 1]?.replace(/\D/g, '') || undefined;
    const cpf = (cpfRaw && cpfRaw.length === 11) ? cpfRaw : undefined;

    valid.push({
      nome,
      cpf,
      data_nascimento: dataNascimento,
      sexo: row[headerMap['sexo'] ?? 3]?.trim() || undefined,
      nome_responsavel: row[headerMap['responsavel'] ?? 4]?.trim() || 'Responsável Legal',
      telefone: row[headerMap['telefone'] ?? 5]?.trim() || '(00) 00000-0000',
      endereco: row[headerMap['endereco'] ?? 6]?.trim() || 'Endereço não informado',
      turma_id: turmaId,
      escola_id: escolaId,
      status: row[headerMap['status'] ?? 8]?.trim() || 'Ativo'
    });
  });

  return { valid, errors };
}
