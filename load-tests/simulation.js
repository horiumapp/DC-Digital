/**
 * DC Digital — Teste de Carga e Estresse (k6)
 * Arquivo: load-tests/simulation.js
 *
 * ATENÇÃO / AVISO CRÍTICO:
 * NÃO RODAR EM PRODUÇÃO SEM AUTORIZAÇÃO EXPRESSA E JANELA DE MANUTENÇÃO APROVADA.
 *
 * Uso:
 *   k6 run load-tests/simulation.js
 *
 * Parâmetros via Variáveis de Ambiente (com valores default para desenvolvimento local):
 *   SUPABASE_URL         URL base do Supabase (ex: https://xyz.supabase.co ou http://localhost:54321)
 *   SUPABASE_ANON_KEY    Chave pública (anon) do Supabase
 *   TEST_ACCESS_TOKEN    Token JWT de um usuário autenticado de teste (obrigatório para RLS)
 *   TEST_TURMA_ID        UUID de turma válida para teste de carga
 *   TEST_DISCIPLINA      Nome da disciplina para consultas (default: 'Matemática')
 *   READ_ONLY            Se 'true', pula operações de escrita (default: 'false')
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Métricas customizadas para isolar leitura de escrita
const readDuration = new Trend('read_duration', true);
const writeDuration = new Trend('write_duration', true);
const errorRate = new Rate('custom_error_rate');
const successfulTransactions = new Counter('successful_transactions');

// Configuração de Estágios com Ramp-up Gradual até 500 VUs
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Warm-up inicial
    { duration: '2m', target: 50 },   // Carga leve de início de turno
    { duration: '2m', target: 100 },  // Carga moderada
    { duration: '3m', target: 200 },  // Pico normal de chamada escolar
    { duration: '3m', target: 300 },  // Alta concorrência
    { duration: '3m', target: 500 },  // Teste de estresse máximo
    { duration: '2m', target: 0 },    // Ramp-down / resfriamento
  ],
  thresholds: {
    // Taxa de falhas HTTP abaixo de 1%
    http_req_failed: ['rate<0.01'],
    custom_error_rate: ['rate<0.01'],
    // 95% das consultas de leitura abaixo de 1000ms
    read_duration: ['p(95)<1000', 'p(99)<2500'],
    // 95% das operações de escrita abaixo de 2000ms
    write_duration: ['p(95)<2000', 'p(99)<4000'],
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'dummy_anon_key';
const TEST_ACCESS_TOKEN = __ENV.TEST_ACCESS_TOKEN || '';
const TEST_TURMA_ID = __ENV.TEST_TURMA_ID || '00000000-0000-0000-0000-000000000001';
const TEST_DISCIPLINA = __ENV.TEST_DISCIPLINA || 'Matemática';
const READ_ONLY = (__ENV.READ_ONLY || 'false').toLowerCase() === 'true';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  ...(TEST_ACCESS_TOKEN ? { 'Authorization': `Bearer ${TEST_ACCESS_TOKEN}` } : {}),
};

export default function () {
  // -------------------------------------------------------------
  // CENÁRIO 1: Abrir aplicação / Consultar Horários da Turma
  // -------------------------------------------------------------
  group('1. Consultar Horários da Turma', function () {
    const url = `${SUPABASE_URL}/rest/v1/professor_horarios?select=dia_semana,tempo_ordem,componente&turma_id=eq.${TEST_TURMA_ID}`;
    const start = Date.now();
    const res = http.get(url, { headers, tags: { type: 'read' } });
    readDuration.add(Date.now() - start);

    const ok = check(res, {
      'status 200 horários': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // -------------------------------------------------------------
  // CENÁRIO 2: Carregar Turma (Alunos e Fechamentos)
  // -------------------------------------------------------------
  group('2. Carregar Alunos e Fechamentos', function () {
    const alunosUrl = `${SUPABASE_URL}/rest/v1/alunos?select=id,nome,status,numero_chamada&turma_id=eq.${TEST_TURMA_ID}&status=eq.ATIVO&order=numero_chamada`;
    const fechamentosUrl = `${SUPABASE_URL}/rest/v1/fechamentos_bimestres?select=bimestre,fechado&turma_id=eq.${TEST_TURMA_ID}&disciplina=eq.${encodeURIComponent(TEST_DISCIPLINA)}`;

    const start = Date.now();
    const responses = http.batch([
      ['GET', alunosUrl, null, { headers, tags: { type: 'read' } }],
      ['GET', fechamentosUrl, null, { headers, tags: { type: 'read' } }],
    ]);
    readDuration.add(Date.now() - start);

    const okAlunos = check(responses[0], { 'status 200 alunos': (r) => r.status === 200 });
    const okFech = check(responses[1], { 'status 200 fechamentos': (r) => r.status === 200 });
    errorRate.add(!okAlunos || !okFech);
  });

  sleep(0.5);

  // -------------------------------------------------------------
  // CENÁRIO 3: Consultar Lançamentos de Frequência (RPC Otimizada)
  // -------------------------------------------------------------
  group('3. Consultar Lançamentos via RPC', function () {
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/get_lancamentos_datas_frequencias`;
    const payload = JSON.stringify({
      p_turma_id: TEST_TURMA_ID,
      p_disciplina: TEST_DISCIPLINA,
    });

    const start = Date.now();
    const res = http.post(rpcUrl, payload, { headers, tags: { type: 'read' } });
    readDuration.add(Date.now() - start);

    const ok = check(res, {
      'status 200 RPC lançamentos': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // -------------------------------------------------------------
  // CENÁRIO 4: Consultar Frequência de um Dia Específico
  // -------------------------------------------------------------
  group('4. Consultar Frequência de um Dia', function () {
    const url = `${SUPABASE_URL}/rest/v1/frequencias?select=aluno_id,status,disciplina&turma_id=eq.${TEST_TURMA_ID}&data=eq.2026-03-10&disciplina=eq.${encodeURIComponent(TEST_DISCIPLINA)}`;
    const start = Date.now();
    const res = http.get(url, { headers, tags: { type: 'read' } });
    readDuration.add(Date.now() - start);

    const ok = check(res, {
      'status 200 freq dia': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // -------------------------------------------------------------
  // CENÁRIO 5: Consultar Conteúdos do Dia
  // -------------------------------------------------------------
  group('5. Consultar Conteúdos', function () {
    const url = `${SUPABASE_URL}/rest/v1/conteudos?select=id,turma_id,data,tempo,objetos,habilidades,descricao,disciplina&turma_id=eq.${TEST_TURMA_ID}&data=eq.2026-03-10&tempo=eq.1%C2%BA+TEMPO`;
    const start = Date.now();
    const res = http.get(url, { headers, tags: { type: 'read' } });
    readDuration.add(Date.now() - start);

    const ok = check(res, {
      'status 200 conteúdos': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // -------------------------------------------------------------
  // CENÁRIO 6: Consultar Avaliações e Notas
  // -------------------------------------------------------------
  group('6. Consultar Avaliações e Notas', function () {
    const avsUrl = `${SUPABASE_URL}/rest/v1/avaliacoes?select=id,nome,tipo,data,bimestre,valor_maximo&turma_id=eq.${TEST_TURMA_ID}&disciplina=eq.${encodeURIComponent(TEST_DISCIPLINA)}`;
    const start = Date.now();
    const res = http.get(avsUrl, { headers, tags: { type: 'read' } });
    readDuration.add(Date.now() - start);

    const ok = check(res, {
      'status 200 avaliações': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // -------------------------------------------------------------
  // CENÁRIO 7: Lançamento em Lote de Frequência (Escrita)
  // Particionado por VU e Iteração para evitar conflito artificial
  // -------------------------------------------------------------
  if (!READ_ONLY) {
    group('7. Lançar Frequência em Lote', function () {
      // Gera data e tempo únicos baseados no VU para não colidir
      const vuId = __VU;
      const iter = __ITER % 20;
      const dayOffset = (vuId % 28) + 1;
      const padDay = dayOffset < 10 ? `0${dayOffset}` : `${dayOffset}`;
      const fakeDate = `2026-05-${padDay}`;
      const fakeTempo = `${(iter % 5) + 1}º TEMPO`;

      // Simula chamada de 5 alunos na turma
      const batchPayload = JSON.stringify([
        {
          turma_id: TEST_TURMA_ID,
          aluno_id: '00000000-0000-0000-0000-000000000001',
          data: fakeDate,
          tempo: fakeTempo,
          disciplina: TEST_DISCIPLINA,
          status: 'C',
          participacao: 'Presencial'
        },
        {
          turma_id: TEST_TURMA_ID,
          aluno_id: '00000000-0000-0000-0000-000000000002',
          data: fakeDate,
          tempo: fakeTempo,
          disciplina: TEST_DISCIPLINA,
          status: 'C',
          participacao: 'Presencial'
        }
      ]);

      const writeHeaders = {
        ...headers,
        'Prefer': 'resolution=merge-duplicates',
      };

      const start = Date.now();
      const res = http.post(`${SUPABASE_URL}/rest/v1/frequencias`, batchPayload, {
        headers: writeHeaders,
        tags: { type: 'write' },
      });
      writeDuration.add(Date.now() - start);

      const ok = check(res, {
        'status 201/200/204 lançamento lote': (r) => [200, 201, 204].includes(r.status),
      });
      errorRate.add(!ok);
      if (ok) successfulTransactions.add(1);
    });
  }

  sleep(1);
}
