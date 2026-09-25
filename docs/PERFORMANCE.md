# DC-Digital — Arquitetura de Performance, Segurança e Concorrência

> Documentação técnica consolidada da 2ª Auditoria de Performance do DC-Digital.  
> Atualizado em: 2026-09-25.

---

## 1. Arquitetura Atual

O **DC-Digital** adota uma arquitetura híbrida de alto desempenho:

```
[ Frontend: React 19 + TypeScript ]
               │
               ▼
      [ IndexedDB: Dexie 4.x ] ◄── Cache local e fila de mutações offline
               │
               ▼ (Sincronização em segundo plano / SyncEngine)
     [ Supabase / PostgREST ]
               │
               ▼
    [ Connection Pool: Supavisor ]
               │
               ▼
[ PostgreSQL 15+ com RLS e RPCs Transacionais ]
```

### 1.1. Principais Camadas
1. **Frontend / Cliente:** React 19, Vite, TailwindCSS, TypeScript estrito. Consultas operacionais usam APIs com escopo específico (`fetchFaltasPeriodo`, `fetchConteudosPeriodo`), evitando o carregamento de históricos de meses fora do escopo da tela ativa.
2. **Armazenamento Local e Offline-First:** IndexedDB gerenciado via Dexie. Operações de diário são salvas localmente com latência de milissegundos e enfileiradas na `syncQueue` com tolerância a falhas (Dead Letter Queue e auto-recuperação de quota de disco).
3. **Segurança no Banco (RLS):** Toda consulta HTTP via PostgREST passa pelo Row Level Security (RLS) do PostgreSQL, garantindo isolamento entre escolas e turmas baseado no perfil (`ADMIN`, `GESTOR`, `SECRETARIO`, `PROFESSOR`, `ALUNO`).
4. **Agregação e Transações:** Lógicas críticas de múltiplos registros (como substituição de grade de horários e apuração de pendências pedagógicas) executam nativamente dentro do banco via RPCs transacionais, eliminando roundtrips de rede e riscos de inconsistência.

---

## 2. Auditoria e Correção de Segurança em RPCs (SECURITY DEFINER)

### 2.1. O Problema Identificado
Na rodada inicial de otimização, três funções foram criadas com a cláusula `SECURITY DEFINER`:
1. `get_lancamentos_datas_frequencias`
2. `get_alunos_count_por_escola`
3. `get_frequencias_distinct_lote`

No PostgreSQL, `SECURITY DEFINER` faz com que o corpo da função execute com os privilégios do **criador da função** (superusuário/postgres). Quando isso ocorre:
- **As políticas RLS das tabelas são ignoradas por padrão.**
- A verificação isolada `IF auth.uid() IS NULL THEN` valida apenas que o usuário possui uma sessão ativa, mas **NÃO confere autorização sobre os dados solicitados**.
- Um aluno ou professor autenticado poderia passar o `turma_id` de outra escola e inspecionar datas de lançamentos ou contagens de alunos de escolas alheias (vazamento cross-school e cross-turma).

### 2.2. A Solução Implementada
Na migration `20260925000001_fix_rpc_security_and_indexes.sql`:
1. **Migração para `SECURITY INVOKER`:** As funções agora executam com a identidade e permissões do usuário que as chamou. Com isso, as políticas de RLS das tabelas `frequencias` e `alunos` são aplicadas automaticamente em cada linha.
2. **Defesa em Profundidade:**
   - Em `get_lancamentos_datas_frequencias`: validação explícita com `public.p_acesso_por_turma(p_turma_id)`. Se o chamador não tiver permissão para aquela turma, a query é abortada imediatamente.
   - Em `get_alunos_count_por_escola`: restrição explícita de perfil para `ADMIN`, `GESTOR` e `SECRETARIO`.
3. **Revogação Explícita:**
   - `REVOKE ALL ON FUNCTION ... FROM PUBLIC;`
   - `REVOKE ALL ON FUNCTION ... FROM anon;`
   - `GRANT EXECUTE ON FUNCTION ... TO authenticated;`

---

## 3. Revisão e Limpeza de Índices Redundantes

A criação indiscriminada de índices sobrecarrega o storage e degrada drasticamente a performance de operações de escrita (`INSERT`, `UPDATE`, `DELETE`), pois o Postgres precisa atualizar a árvore B-Tree de cada índice a cada mutação de registro.

Após análise comparativa com as constraints existentes, **três índices foram identificados como estritamente redundantes e removidos**:

| Índice Removido | Tabela | Motivo da Remoção / Redundância |
| :--- | :--- | :--- |
| `idx_fechamentos_turma_disciplina_bimestre` | `fechamentos_bimestres` | Já existia a constraint `unique_fechamento_turma_disciplina_bimestre UNIQUE (turma_id, disciplina, bimestre)`. O Postgres gera automaticamente um índice B-Tree idêntico para a constraint. |
| `idx_notas_avaliacao_id` | `notas` | Já existia a constraint `notas_avaliacao_id_aluno_id_key UNIQUE (avaliacao_id, aluno_id)`. Como `avaliacao_id` é a coluna inicial (leading column) da chave composta, consultas com `WHERE avaliacao_id = ?` utilizam esse índice com eficiência idêntica. |
| `idx_professor_horarios_professor_id` | `professor_horarios` | Já existia a constraint `professor_horarios_professor_id_dia_semana_tempo_ordem_key UNIQUE (professor_id, dia_semana, tempo_ordem)`. A coluna `professor_id` é o prefixo líder da chave composta. |

### 3.1. Índices Úteis Mantidos e Justificados
- `frequencias (turma_id, disciplina, data)`: Acelera as consultas de diário e relatórios.
- `conteudos (turma_id, disciplina, data)`: Acelera a recuperação de plano de aula por dia/período.
- `avaliacoes (turma_id, disciplina, bimestre)`: Acelera listagens do diário de notas.
- `alunos (turma_id, status)`: Acelera filtragem de chamada e listagens escolares.
- `professor_horarios (turma_id, componente)`: Acelera montagem da grade e apuração de pendências.
- `notas (aluno_id)`: Mantido porque `aluno_id` é a **segunda** coluna da constraint única, logo requer índice próprio para buscas por aluno (boletim).

---

## 4. Novas RPCs Transacionais e de Agregação

### 4.1. `replace_professor_horarios`
- **Problema anterior:** `ScheduleModal.tsx` fazia `SELECT * (backup)` -> `DELETE horários` -> `INSERT novos`. Se a conexão caísse entre o delete e o insert, a grade do professor era perdida. Além disso, expunha `select('*')`.
- **Solução:** Função PL/pgSQL atômica `replace_professor_horarios(p_professor_id, p_escola_id, p_horarios)`. Executa delete e inserts na mesma transação. Se qualquer validação ou inserção falhar, o Postgres reverte tudo automaticamente.

### 4.2. `get_pendencias_docentes`
- **Problema anterior:** `pendenciasService.ts` baixava para o navegador até 5000 horários e todas as avaliações, alunos, notas e conteúdos de múltiplos lotes de turmas para calcular pendências em JavaScript via Maps e loops. Escolas grandes tinham dados truncados pelo limite de 5000.
- **Solução:** RPC server-side que utiliza Common Table Expressions (CTEs), agregação relacional e a fórmula matemática $O(1)$ de dias letivos (`count_weekdays_in_range`). Retorna apenas os registros consolidados prontos para exibição paginada.

---

## 5. Como Monitorar o Supabase

Durante picos de uso (ex: 7h30 às 8h15 e 13h00 às 13h45) ou durante testes de carga, acompanhe as seguintes métricas no painel do Supabase:

1. **Database Connections (Conexões):**
   - Garanta que o frontend conecte via pooler (Supavisor, porta 6543 no modo transação).
   - O número de conexões ativas não deve se aproximar do `max_connections` da instância PostgreSQL.
2. **CPU Utilization:**
   - Leituras otimizadas devem manter CPU < 40% em regime normal.
   - Picos momentâneos de até 75% em rajadas de escrita são esperados, mas não devem se sustentar por mais de 1 minuto.
3. **Memory & Swap:**
   - O uso de RAM deve ser estável; consumo de Swap indica `work_mem` ou `shared_buffers` subdimensionados para queries com ordenação em disco.
4. **Cache Hit Ratio (Buffer Cache):**
   - Deve permanecer acima de **99%**. Se cair abaixo de 95%, significa que o banco está lendo páginas do disco com frequência (necessidade de mais RAM ou índices mais compactos).

---

## 6. Como Executar Testes com k6 e Interpretar Métricas

### 6.1. Execução
Consulte o guia detalhado em [`load-tests/README.md`](file:///e:/DC%20Digital/load-tests/README.md).

Comando básico:
```powershell
k6 run `
  -e SUPABASE_URL="https://seu-projeto.supabase.co" `
  -e SUPABASE_ANON_KEY="sua_anon_key" `
  -e TEST_ACCESS_TOKEN="seu_token_jwt" `
  -e TEST_TURMA_ID="uuid-de-turma-valida" `
  load-tests/simulation.js
```

### 6.2. Interpretação das Métricas
- **RPS (Requests Per Second):** Taxa de transferência total. Em 200 VUs, espera-se entre 150 e 400 RPS dependendo do tempo de sono (`sleep`) configurado.
- **p50 (Mediana):** O tempo que metade dos usuários experimenta. Idealmente < 200ms para consultas HTTP.
- **p95 (Percentil 95):** O tempo de resposta para 95% das requisições. Deve ficar rigorosamente abaixo de **1000ms**.
- **p99 (Percentil 99):** Casos extremos (cold starts, contenção de pool). Deve ficar abaixo de **2500ms**.
- **Error Rate (`http_req_failed`):** Deve ser **inferior a 1%**. Qualquer valor acima de 1% aponta para saturação de pool de conexões (HTTP 502/503/504) ou rejeição de RLS.

---

## 7. Checklist para Testes de Concorrência

> ⚠️ **Aviso de Responsabilidade:**  
> Nenhuma análise de código estática pode atestar que um sistema "suporta 500 usuários simultâneos" sem comprovação empírica no hardware e plano específico de infraestrutura. Execute o checklist progressivo abaixo para validar cada patamar:

- [ ] **20 Usuários Simultâneos (Aquecimento)**
  - Validar ausência de erros 401/403 de RLS.
  - Verificar se p95 < 300ms.
- [ ] **50 Usuários Simultâneos (Carga Normal)**
  - Validar comportamento das RPCs `get_lancamentos_datas_frequencias`.
  - CPU do banco < 25%.
- [ ] **100 Usuários Simultâneos (Abertura de Turno)**
  - Monitorar consumo de conexões do Supavisor.
  - p95 < 600ms em todas as rotas de leitura.
- [ ] **200 Usuários Simultâneos (Pico Escolar)**
  - Executar com `READ_ONLY=false` para incluir lançamentos particionados de frequência.
  - Validar ausência de conflitos em chaves únicas (`frequencias_uniqueness`).
- [ ] **300 Usuários Simultâneos (Alta Concorrência)**
  - Acompanhar se o tempo de resposta das transações de gravação permanece < 2000ms.
  - Cache Hit Ratio > 98%.
- [ ] **500 Usuários Simultâneos (Estresse Máximo)**
  - Realizar em ambiente de homologação espelhado ou janela autorizada.
  - Avaliar se a instância requer upgrade de computação (ex: Compute Add-on no Supabase) para evitar degradação de p99.
