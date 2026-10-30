/**
 * DC Digital — Teste de carga (k6)
 *
 * Mede a abertura do diário: horário, alunos, fechamento, datas de chamada,
 * frequência do dia, conteúdo e avaliações. Não grava nada.
 *
 * Perfis:
 *   smoke    1 pessoa, 20s. Confere se o roteiro está certo.
 *   escola   até 40 ao mesmo tempo, ~2 min. Pico realista de um turno.
 *   estresse até 500 ao mesmo tempo, ~16 min. Só com CONFIRM_STRESS=sim
 *            e fora do horário de aula. O pool do banco aceita 200 clientes.
 *
 *   k6 run -e PROFILE=smoke -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... -e TEST_ACCESS_TOKEN=... -e TEST_TURMA_ID=... load-tests/simulation.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const readDuration = new Trend('read_duration', true);
const errorRate = new Rate('custom_error_rate');

const PROFILE = (__ENV.PROFILE || 'smoke').toLowerCase();

const stages = {
  smoke: [
    { duration: '20s', target: 1 },
  ],
  escola: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 40 },
    { duration: '30s', target: 0 },
  ],
  estresse: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '3m', target: 200 },
    { duration: '3m', target: 300 },
    { duration: '3m', target: 500 },
    { duration: '2m', target: 0 },
  ],
};

export const options = {
  stages: stages[PROFILE] || stages.smoke,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    custom_error_rate: ['rate<0.01'],
    read_duration: ['p(95)<1000', 'p(99)<2500'],
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const TEST_ACCESS_TOKEN = __ENV.TEST_ACCESS_TOKEN || '';
const TEST_TURMA_ID = __ENV.TEST_TURMA_ID || '';
const TEST_DISCIPLINA = __ENV.TEST_DISCIPLINA || 'Matemática';
const TEST_DATA = __ENV.TEST_DATA || '2026-05-06';

export function setup() {
  if (!stages[PROFILE]) {
    throw new Error('PROFILE deve ser smoke, escola ou estresse.');
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_ACCESS_TOKEN || !TEST_TURMA_ID) {
    throw new Error('Informe SUPABASE_URL, SUPABASE_ANON_KEY, TEST_ACCESS_TOKEN e TEST_TURMA_ID.');
  }
  if (TEST_ACCESS_TOKEN === 'cole_o_TOKEN' || TEST_ACCESS_TOKEN.split('.').length < 3) {
    throw new Error('TEST_ACCESS_TOKEN ainda é o exemplo. No console do navegador, copie só o texto depois de TOKEN=.');
  }
  if (!TEST_DISCIPLINA.trim()) {
    throw new Error('TEST_DISCIPLINA está vazio. Use Matemática.');
  }
  if (PROFILE === 'estresse' && (__ENV.CONFIRM_STRESS || '').toLowerCase() !== 'sim') {
    throw new Error('O perfil estresse chega a 500 acessos ao mesmo tempo. Rode fora do horário de aula com CONFIRM_STRESS=sim.');
  }
}

const headers = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
};

function ler(nome, url) {
  const inicio = Date.now();
  const res = http.get(url, { headers, tags: { name: nome } });
  readDuration.add(Date.now() - inicio);
  const ok = check(res, { [`${nome} 200`]: (r) => r.status === 200 });
  if (!ok) {
    console.error(`${nome} respondeu ${res.status}: ${String(res.body || '').slice(0, 160)}`);
  }
  errorRate.add(!ok);
  return res;
}

export default function () {
  const disciplina = encodeURIComponent(TEST_DISCIPLINA);
  const base = `${SUPABASE_URL}/rest/v1`;

  group('horario', () => {
    ler('horarios', `${base}/professor_horarios?select=dia_semana,tempo_ordem,componente&turma_id=eq.${TEST_TURMA_ID}`);
  });
  sleep(0.4);

  group('turma', () => {
    ler('alunos', `${base}/alunos?select=id,nome,status&turma_id=eq.${TEST_TURMA_ID}&order=nome`);
    ler('fechamentos', `${base}/fechamentos_bimestres?select=bimestre,status,disciplina&turma_id=eq.${TEST_TURMA_ID}&disciplina=eq.${disciplina}`);
  });
  sleep(0.4);

  group('chamada', () => {
    const rpc = http.post(
      `${base}/rpc/get_lancamentos_datas_frequencias`,
      JSON.stringify({ p_turma_id: TEST_TURMA_ID, p_disciplina: TEST_DISCIPLINA }),
      { headers, tags: { name: 'datas' } },
    );
    const ok = check(rpc, { 'datas 200': (r) => r.status === 200 });
    if (!ok) {
      console.error(`datas respondeu ${rpc.status}: ${String(rpc.body || '').slice(0, 160)}`);
    }
    errorRate.add(!ok);
    readDuration.add(rpc.timings.duration);

    ler(
      'frequencia do dia',
      `${base}/frequencias?select=aluno_id,status,participacao,data,tempo,disciplina&turma_id=eq.${TEST_TURMA_ID}&data=eq.${TEST_DATA}&disciplina=eq.${disciplina}`,
    );
  });
  sleep(0.4);

  group('diario', () => {
    ler(
      'conteudos',
      `${base}/conteudos?select=id,data,tempo,objetos,descricao,disciplina&turma_id=eq.${TEST_TURMA_ID}&data=eq.${TEST_DATA}`,
    );
    ler(
      'avaliacoes',
      `${base}/avaliacoes?select=id,tipo,data,bimestre,valor_maximo,disciplina&turma_id=eq.${TEST_TURMA_ID}&disciplina=eq.${disciplina}`,
    );
  });

  sleep(1);
}
