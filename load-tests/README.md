# DC-Digital — Testes de Carga e Estresse (k6)

> ⚠️ **AVISO DE SEGURANÇA E COMPLIANCE**  
> **NÃO EXECUTAR EM AMBIENTE DE PRODUÇÃO SEM AUTORIZAÇÃO EXPRESSA E JANELA DE MANUTENÇÃO APROVADA.**  
> Testes de estresse com centenas de conexões simultâneas podem esgotar o pool de conexões do PostgreSQL (PgBouncer), consumir 100% de CPU/RAM da instância e gerar indisponibilidade para os usuários reais do sistema escolar.

---

## 1. Visão Geral

Este diretório contém os scripts oficiais de teste de carga para validar a capacidade do sistema **DC-Digital** sob alta concorrência (início de turno escolar, fechamento de bimestres e chamadas simultâneas).

O teste foi desenhado para testar:
- Leituras mais frequentes: Horários, Alunos Ativos, Fechamentos, Lançamentos (RPC), Frequências e Conteúdos.
- Escritas em lote: Chamadas de frequência com particionamento por VU (Virtual User) para evitar bloqueios artificiais (lock contention).
- Modo estritamente de leitura (`READ_ONLY=true`) para medição de capacidade sem alteração de dados no banco.

---

## 2. Pré-requisitos

Instale o **k6** oficial em seu ambiente:

- **Windows (winget):**
  ```powershell
  winget install k6 --source winget
  ```
- **Windows (Chocolatey):**
  ```powershell
  choco install k6
  ```
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update
  sudo apt-get install k6
  ```
- **macOS (Homebrew):**
  ```bash
  brew install k6
  ```

---

## 3. Variáveis de Ambiente

O script `simulation.js` lê os parâmetros a partir de variáveis de ambiente do k6 (`-e NOME=VALOR`):

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `SUPABASE_URL` | URL base do Supabase (local ou staging) | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Chave pública (`anon`) do projeto | `eyJh...` |
| `TEST_ACCESS_TOKEN` | Token JWT de um usuário autenticado | `eyJhbGciOi...` |
| `TEST_TURMA_ID` | UUID de uma turma válida com dados | `11111111-1111-1111-1111-111111111111` |
| `TEST_DISCIPLINA` | Disciplina a consultar | `Matemática` |
| `READ_ONLY` | Desativa escritas (`true` ou `false`) | `true` |

---

## 4. Como Executar

### 4.1. Teste de Leitura em Staging/Local (Recomendado Primeiro)
```powershell
k6 run `
  -e SUPABASE_URL="https://seu-projeto-staging.supabase.co" `
  -e SUPABASE_ANON_KEY="sua_anon_key" `
  -e TEST_ACCESS_TOKEN="seu_jwt_de_teste" `
  -e TEST_TURMA_ID="uuid-da-turma" `
  -e TEST_DISCIPLINA="Matemática" `
  -e READ_ONLY="true" `
  load-tests/simulation.js
```

### 4.2. Teste Completo (Leitura + Escrita Particionada)
```powershell
k6 run `
  -e SUPABASE_URL="https://seu-projeto-staging.supabase.co" `
  -e SUPABASE_ANON_KEY="sua_anon_key" `
  -e TEST_ACCESS_TOKEN="seu_jwt_de_teste" `
  -e TEST_TURMA_ID="uuid-da-turma" `
  -e TEST_DISCIPLINA="Matemática" `
  -e READ_ONLY="false" `
  load-tests/simulation.js
```

---

## 5. Estágios de Concorrência (Ramp-up)

O plano de teste executa um ramp-up gradual com duração total de **16 minutos**:

```
500 VUs |                           [300-500 VUs: 6m]
        |                    /-----------------------------\
300 VUs |             /-----/                               \
        |            /                                       \
100 VUs |     /-----/                                         \
 20 VUs | ---/                                                 \---
        +------------------------------------------------------------
        0m   1m    3m     5m       8m            11m     14m   16m
```

1. **20 VUs (1 min):** Aquecimento de pools, caches e validação inicial de integridade.
2. **50 VUs (2 min):** Simula fluxo normal de professores acessando o diário.
3. **100 VUs (2 min):** Abertura de turno (início das aulas da manhã).
4. **200 VUs (3 min):** Pico de chamadas simultâneas.
5. **300 VUs (3 min):** Alta concorrência de rede em horário de pico.
6. **500 VUs (3 min):** Estresse extremo de infraestrutura.
7. **Ramp-down (2 min):** Resfriamento gradual para validar recuperação do banco.

---

## 6. Critérios de Aceitação (Thresholds)

O k6 falhará automaticamente a execução se qualquer um dos seguintes critérios for violado:

- **`http_req_failed < 1%`**: Menos de 1 erro em cada 100 requisições HTTP.
- **`read_duration p(95) < 1000ms`**: 95% das consultas de leitura devem responder em menos de 1 segundo.
- **`read_duration p(99) < 2500ms`**: 99% das consultas de leitura devem responder em menos de 2.5 segundos.
- **`write_duration p(95) < 2000ms`**: 95% das gravações em lote devem responder em menos de 2 segundos.
- **`custom_error_rate < 1%`**: Verificações de integridade de payload e status HTTP de sucesso.

---

## 7. O que Observar no Dashboard do Supabase Durante o Teste

Durante a execução, acompanhe no painel do Supabase (`Reports` e `Database`):
1. **CPU Usage:** Não deve permanecer em 100% por mais de 30 segundos consecutivos.
2. **RAM Usage:** Garantir que não atinja o limite do swap da instância.
3. **Active Connections:** Conferir se as conexões ficam dentro do pool configurado no PgBouncer/Supavisor (geralmente modo transação porta 6543).
4. **Disk IOPS / Disk Throughput:** Avaliar se há throttling de I/O em virtude de writes frequentes.
