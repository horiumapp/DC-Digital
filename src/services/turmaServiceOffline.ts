/**
 * turmaServiceOffline.ts — Wrapper offline-first para o TurmaService
 * 
 * Intercepta todas as operações CRUD:
 * - Escritas: salva no IndexedDB + enfileira para sync
 * - Leituras: tenta servidor primeiro, fallback para IndexedDB
 * 
 * Este módulo substitui as chamadas diretas ao turmaService original
 * na camada de contexto (TurmaContext).
 */
import { supabase } from '../lib/supabase';
import { getBimestrePorData } from '../utils/dateUtils';
import type { Aluno, Avaliacao, Conteudo, Horario, Lancamento } from '../contexts/TurmaContext';
import type { FrequenciaRecord, NotaRecord } from './turmaService';
import { TurmaService } from './turmaService';
import * as OfflineStorage from './offlineStorage';
import * as Queue from './offlineQueue';
import * as SyncEngine from './syncEngine';

import { getTid, normalizarDataISO } from '../utils/turmaUtils';

// ============================================================
// Flag de conectividade (atualizada externamente pelo OfflineContext)
// ============================================================
let _isOnline = navigator.onLine;

export function setOnlineStatus(online: boolean): void {
  _isOnline = online;
}

// ============================================================
// LEITURAS — Servidor primeiro, fallback local
// ============================================================

export async function fetchHorario(turmaId: string | number, disciplina: string): Promise<Horario[]> {
  const tid = getTid(turmaId);
  try {
    if (!_isOnline) throw new Error('Offline');
    const result = await TurmaService.fetchHorario(turmaId, disciplina);
    // Cache local
    await OfflineStorage.cacheHorarios(tid, result.map(h => ({
      turma_id: tid,
      dia_semana: h.dia_semana,
      tempo_ordem: h.tempo_ordem,
      componente: disciplina,
    })), disciplina);
    return result;
  } catch {
    // Fallback local
    const local = await OfflineStorage.getHorariosLocal(tid);
    // Filtra no cliente local: incluir quando o componente bate com a disciplina OU está vazio/null
    const filtered = local.filter(h => {
      const comp = (h.componente || '').trim();
      return comp === '' || comp.toLowerCase() === disciplina.toLowerCase();
    });
    return filtered.map(h => ({ dia_semana: h.dia_semana, tempo_ordem: h.tempo_ordem }));
  }
}

export async function fetchAlunos(turmaId: string | number): Promise<Aluno[]> {
  const tid = getTid(turmaId);
  try {
    if (!_isOnline) throw new Error('Offline');
    const result = await TurmaService.fetchAlunos(turmaId);
    // Cache local
    await OfflineStorage.cacheAlunos(result.map(a => ({
      id: a.id,
      nome: a.nome,
      cpf: a.cpf,
      turma_id: tid,
    })));
    return result;
  } catch {
    // Fallback local
    const { alunos: local, decryptionFailed } = await OfflineStorage.getCachedAlunos(tid);

    // FIX: Se a chave de criptografia foi perdida (troca de dispositivo, limpeza de browser),
    // avisar o usuário claramente em vez de exibir '[DADOS PROTEGIDOS - RECONECTE PARA ATUALIZAR]'.
    if (decryptionFailed) {
      console.error('[turmaServiceOffline] Chave de criptografia perdida — dados de alunos offline inacessíveis. Reconecte à internet para re-sincronizar.');
    }

    return local.map(a => {
      const cpfClean = a.cpf ? a.cpf.replace(/\D/g, '') : '';
      const matriculaDisplay = cpfClean.length === 11
        ? `${cpfClean.substring(0, 3)}.${cpfClean.substring(3, 6)}.${cpfClean.substring(6, 9)}-${cpfClean.substring(9, 11)}`
        : 'CPF Pendente';
      return {
        id: a.id,
        nome: decryptionFailed ? '⚠️ Dados protegidos — reconecte para visualizar' : a.nome,
        cpf: a.cpf,
        matricula: matriculaDisplay,
        freq: 'P',
        part: 'Presencial',
        notas: {},
      };
    });
  }
}

export async function fetchLancamentos(turmaId: string | number, disciplina: string): Promise<Lancamento[]> {
  try {
    if (!_isOnline) throw new Error('Offline');
    return await TurmaService.fetchLancamentos(turmaId, disciplina);
  } catch {
    // Construir lançamentos a partir dos dados locais
    const tid = getTid(turmaId);
    const [freqs, conts] = await Promise.all([
      OfflineStorage.getAllFrequenciasLocal(tid, disciplina),
      OfflineStorage.getAllConteudosLocal(tid, disciplina),
    ]);
    
    const lancamentos: Lancamento[] = [];
    const uniqueFreqs = new Set(freqs.map(f => `${f.data}|${f.tempo}`));
    uniqueFreqs.forEach(val => {
      const [data, tempo] = val.split('|');
      lancamentos.push({ turmaId: tid, data, tempo, tipo: 'frequencia' });
    });
    conts.forEach(c => {
      lancamentos.push({ turmaId: tid, data: c.data, tempo: c.tempo, tipo: 'conteudo' });
    });
    return lancamentos;
  }
}

export async function fetchAvaliacoes(turmaId: string | number, disciplina: string): Promise<{ avaliacoes: Avaliacao[], notasData: NotaRecord[] }> {
  const tid = getTid(turmaId);
  try {
    if (!_isOnline) throw new Error('Offline');
    const result = await TurmaService.fetchAvaliacoes(turmaId, disciplina);
    
    // Cache avaliações
    if (result.avaliacoes.length > 0) {
      await OfflineStorage.cacheAvaliacoes(result.avaliacoes.map(av => ({
        id: av.id,
        turma_id: tid,
        tipo: av.tipo,
        data: av.data,
        instrumento: av.instrumento,
        objetos: av.objetos,
        bimestre: av.bimestre || getBimestrePorData(av.data),
        valor_maximo: av.valorMaximo || 10,
        disciplina,
        parent_id: av.parent_id,
      })));
    }
    
    // Cache notas
    if (result.notasData.length > 0) {
      await OfflineStorage.cacheNotas(result.notasData.map(n => ({
        avaliacao_id: n.avaliacao_id.toString(),
        aluno_id: n.aluno_id.toString(),
        valor: n.valor,
      })));
    }
    
    // Mesclar com avaliações locais pendentes (que ainda não foram sincronizadas com o servidor)
    const localAvs = await OfflineStorage.getAvaliacoesLocal(tid, disciplina);
    const localPending = localAvs.filter(a => a.syncStatus === 'pending');

    const mergedAvaliacoes = [...result.avaliacoes];
    for (const pending of localPending) {
      const formatted: Avaliacao = {
        id: pending.id || pending.serverId || `local_${pending.localId}`,
        turmaId: pending.turma_id,
        tipo: pending.tipo,
        data: pending.data,
        instrumento: pending.instrumento,
        objetos: pending.objetos,
        bimestre: pending.bimestre,
        valorMaximo: pending.valor_maximo,
        parent_id: pending.parent_id,
      };

      const existingIdx = mergedAvaliacoes.findIndex(a => a.id === formatted.id);
      if (existingIdx >= 0) {
        mergedAvaliacoes[existingIdx] = formatted;
      } else {
        mergedAvaliacoes.push(formatted);
      }
    }

    // Mesclar notas do servidor com notas salvas localmente no IndexedDB
    const avIds = mergedAvaliacoes.map(a => a.id);
    const localNotas = await OfflineStorage.getNotasLocal(avIds);

    const mergedNotasMap = new Map<string, NotaRecord>();
    result.notasData.forEach(n => {
      mergedNotasMap.set(`${n.avaliacao_id}_${n.aluno_id}`, {
        avaliacao_id: n.avaliacao_id.toString(),
        aluno_id: n.aluno_id.toString(),
        valor: n.valor,
      });
    });
    localNotas.forEach(n => {
      mergedNotasMap.set(`${n.avaliacao_id}_${n.aluno_id}`, {
        avaliacao_id: n.avaliacao_id.toString(),
        aluno_id: n.aluno_id.toString(),
        valor: n.valor,
      });
    });

    return {
      avaliacoes: mergedAvaliacoes,
      notasData: Array.from(mergedNotasMap.values()),
    };
  } catch {
    // Fallback local
    const localAvs = await OfflineStorage.getAvaliacoesLocal(tid, disciplina);
    const avaliacoes: Avaliacao[] = localAvs.map(av => ({
      id: av.id || av.serverId || `local_${av.localId}`,
      turmaId: av.turma_id,
      tipo: av.tipo,
      data: av.data,
      instrumento: av.instrumento,
      objetos: av.objetos,
      bimestre: av.bimestre,
      valorMaximo: av.valor_maximo,
      parent_id: av.parent_id,
    }));

    const avIds = avaliacoes.map(a => a.id);
    const localNotas = await OfflineStorage.getNotasLocal(avIds);
    const notasData: NotaRecord[] = localNotas.map(n => ({
      avaliacao_id: n.avaliacao_id,
      aluno_id: n.aluno_id,
      valor: n.valor,
    }));

    return { avaliacoes, notasData };
  }
}

export async function fetchAllFrequencias(turmaId: string | number, disciplina: string): Promise<FrequenciaRecord[]> {
  const tid = getTid(turmaId);
  try {
    if (!_isOnline) throw new Error('Offline');
    const result = await TurmaService.fetchAllFrequencias(turmaId, disciplina);
    // Cache
    await OfflineStorage.cacheFrequencias(tid, result.map(f => ({
      turma_id: tid,
      aluno_id: f.aluno_id,
      data: f.data || '',
      tempo: f.tempo || '',
      status: f.status,
      participacao: f.participacao || 'Presencial',
      disciplina: f.disciplina || disciplina,
    })));
    return result;
  } catch {
    const local = await OfflineStorage.getAllFrequenciasLocal(tid, disciplina);
    return local.map(f => ({
      aluno_id: f.aluno_id,
      status: f.status,
      data: f.data,
      tempo: f.tempo,
      participacao: f.participacao,
      disciplina: f.disciplina,
    }));
  }
}

export async function fetchAllConteudos(turmaId: string | number, disciplina: string): Promise<Conteudo[]> {
  const tid = getTid(turmaId);
  try {
    if (!_isOnline) throw new Error('Offline');
    const result = await TurmaService.fetchAllConteudos(turmaId, disciplina);
    // Cache
    await OfflineStorage.cacheConteudos(tid, result.map(c => ({
      turma_id: tid,
      data: c.data,
      tempo: c.tempo,
      objetos: c.objetos,
      habilidades: c.habilidades,
      descricao: c.descricao,
      disciplina,
    })));
    return result;
  } catch {
    const local = await OfflineStorage.getAllConteudosLocal(tid, disciplina);
    return local.map(c => ({
      id: c.serverId || `local_${c.localId}`,
      turmaId: c.turma_id,
      data: c.data,
      tempo: c.tempo,
      objetos: c.objetos,
      habilidades: c.habilidades,
      descricao: c.descricao,
    }));
  }
}

export async function fetchFechamentos(turmaId: string | number, disciplina: string): Promise<Record<string, boolean>> {
  const tid = getTid(turmaId);
  try {
    if (!_isOnline) throw new Error('Offline');
    const result = await TurmaService.fetchFechamentos(turmaId, disciplina);
    // Cache
    const records = Object.entries(result).map(([bimestre, isFechado]) => ({
      turma_id: tid,
      disciplina,
      bimestre,
      status: isFechado ? 'FECHADO' : 'ABERTO',
    }));
    await OfflineStorage.cacheFechamentos(tid, disciplina, records);
    return result;
  } catch {
    const local = await OfflineStorage.getFechamentosLocal(tid, disciplina);
    const map: Record<string, boolean> = {};
    local.forEach(f => { map[f.bimestre] = f.status === 'FECHADO'; });
    return map;
  }
}

export async function buscarFrequencia(turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<FrequenciaRecord[]> {
  const tid = getTid(turmaId);
  const dataISO = normalizarDataISO(data);
  try {
    if (!_isOnline) throw new Error('Offline');
    return await TurmaService.buscarFrequencia(turmaId, disciplina, data, tempo);
  } catch {
    const local = await OfflineStorage.getFrequenciasLocal(tid, disciplina, dataISO, tempo);
    return local.map(f => ({
      aluno_id: f.aluno_id,
      status: f.status,
      participacao: f.participacao,
    }));
  }
}

export async function buscarConteudo(turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<Conteudo | null> {
  const tid = getTid(turmaId);
  const dataISO = normalizarDataISO(data);
  try {
    if (!_isOnline) throw new Error('Offline');
    return await TurmaService.buscarConteudo(turmaId, disciplina, data, tempo);
  } catch {
    const local = await OfflineStorage.getConteudoLocal(tid, disciplina, dataISO, tempo);
    if (!local) return null;
    return {
      id: local.serverId || `local_${local.localId}`,
      turmaId: local.turma_id,
      data: local.data,
      tempo: local.tempo,
      objetos: local.objetos,
      habilidades: local.habilidades,
      descricao: local.descricao,
    };
  }
}

export async function buscarFrequenciaPorDia(turmaId: string | number, disciplina: string, data: string): Promise<FrequenciaRecord[]> {
  const tid = getTid(turmaId);
  const dataISO = normalizarDataISO(data);
  try {
    if (!_isOnline) throw new Error('Offline');
    return await TurmaService.buscarFrequenciaPorDia(turmaId, disciplina, data);
  } catch {
    const local = await OfflineStorage.getAllFrequenciasLocal(tid, disciplina);
    return local
      .filter(f => f.data === dataISO)
      .map(f => ({
        aluno_id: f.aluno_id,
        status: f.status,
        disciplina: f.disciplina,
      }));
  }
}

// ============================================================
// ESCRITAS — IndexedDB primeiro, depois enfileira sync
// ============================================================

export async function salvarFrequencia(
  turmaId: string | number,
  disciplina: string,
  data: string,
  tempo: string,
  alunosFreq: Aluno[]
): Promise<void> {
  const tid = getTid(turmaId);
  const dataISO = normalizarDataISO(data);

  // 1. Salvar localmente
  const records = alunosFreq.map(aluno => ({
    turma_id: tid,
    aluno_id: aluno.id,
    data: dataISO,
    tempo,
    status: aluno.freq || 'P',
    participacao: aluno.part || 'Presencial',
    disciplina,
  }));

  await OfflineStorage.saveFrequenciasBulk(records);

  // 2. Enfileirar para sync (batch como um único item)
  const upserts = records.map(r => ({
    turma_id: r.turma_id,
    aluno_id: r.aluno_id,
    data: r.data,
    tempo: r.tempo,
    status: r.status,
    participacao: r.participacao,
    disciplina: r.disciplina,
  }));

  await Queue.enqueue('frequencias', 'UPSERT', { records: upserts });

  // 3. Se online, tentar sincronizar imediatamente
  if (_isOnline) {
    SyncEngine.scheduleSync();
  }
}

export async function salvarConteudo(
  turmaId: string | number,
  disciplina: string,
  cont: Conteudo
): Promise<void> {
  const tid = getTid(turmaId);
  const dataISO = normalizarDataISO(cont.data);

  const payload = {
    turma_id: tid,
    data: dataISO,
    tempo: cont.tempo,
    objetos: cont.objetos,
    habilidades: cont.habilidades,
    descricao: cont.descricao,
    disciplina,
  };

  // 1. Salvar localmente
  await OfflineStorage.saveConteudoLocal(payload);

  // 2. Enfileirar
  await Queue.enqueue('conteudos', 'UPSERT', payload);

  // 3. Sync
  if (_isOnline) {
    SyncEngine.scheduleSync();
  }
}

export async function salvarAvaliacao(
  av: Avaliacao,
  turmaId: string | number,
  disciplina: string
): Promise<string> {
  const tid = getTid(turmaId);

  const payload = {
    ...(av.id && !av.id.startsWith('temp_') ? { id: av.id } : {}),
    turma_id: tid,
    tipo: av.tipo,
    data: av.data,
    instrumento: av.instrumento,
    objetos: av.objetos,
    bimestre: av.bimestre || getBimestrePorData(av.data),
    valor_maximo: av.valorMaximo || 10,
    disciplina,
    parent_id: av.parent_id,
  };

  // 1. Salvar localmente
  const localId = await OfflineStorage.saveAvaliacaoLocal(payload);

  // 2. Enfileirar
  await Queue.enqueue('avaliacoes', av.id && !av.id.startsWith('temp_') ? 'UPDATE' : 'INSERT', payload, localId);

  // 3. Sync
  if (_isOnline) {
    SyncEngine.scheduleSync();
  }

  return av.id || `temp_${localId}`;
}

export async function removerAvaliacao(id: string): Promise<void> {
  // 1. Remover localmente
  await OfflineStorage.deleteAvaliacaoLocal(id);

  // 2. Enfileirar se tem server ID
  if (id && !id.startsWith('temp_') && !id.startsWith('local_')) {
    await Queue.enqueue('avaliacoes', 'DELETE', { id });
    if (_isOnline) {
      SyncEngine.scheduleSync();
    }
  }
}

export async function salvarNotas(
  avaliacaoId: string,
  notas: { alunoId: string; valor: string }[]
): Promise<void> {
  // 1. Salvar localmente
  const records = notas.map(n => ({
    avaliacao_id: avaliacaoId,
    aluno_id: n.alunoId,
    valor: parseFloat(n.valor.replace(',', '.')),
  }));

  await OfflineStorage.saveNotasLocal(records);

  // 2. Enfileirar (batch como um item)
  await Queue.enqueue('notas', 'UPSERT', { records });

  // 3. Sync
  if (_isOnline) {
    SyncEngine.scheduleSync();
  }
}

export async function removerFrequencia(
  turmaId: string | number,
  disciplina: string,
  data: string,
  tempo: string
): Promise<void> {
  const tid = getTid(turmaId);
  const dataISO = normalizarDataISO(data);

  // 1. Remover localmente
  await OfflineStorage.deleteFrequenciasLocal(tid, disciplina, dataISO, tempo);

  // 2. Enfileirar
  await Queue.enqueue('frequencias', 'DELETE', {
    turma_id: tid,
    data: dataISO,
    tempo,
    disciplina,
  });

  if (_isOnline) {
    SyncEngine.scheduleSync();
  }
}

export async function removerConteudo(
  turmaId: string | number,
  disciplina: string,
  data: string,
  tempo: string
): Promise<void> {
  const tid = getTid(turmaId);
  const dataISO = normalizarDataISO(data);

  // 1. Remover localmente
  await OfflineStorage.deleteConteudoLocal(tid, disciplina, dataISO, tempo);

  // 2. Enfileirar
  await Queue.enqueue('conteudos', 'DELETE', {
    turma_id: tid,
    data: dataISO,
    tempo,
    disciplina,
  });

  if (_isOnline) {
    SyncEngine.scheduleSync();
  }
}

export async function salvarFechamento(
  turmaId: string | number,
  disciplina: string,
  bimestre: string,
  status: 'ABERTO' | 'FECHADO',
  userId: string
): Promise<void> {
  const tid = getTid(turmaId);

  const payload = {
    turma_id: tid,
    disciplina,
    bimestre,
    status,
    usuario_fechamento_id: userId,
  };

  // 1. Salvar localmente
  await OfflineStorage.saveFechamentoLocal(payload);

  // 2. Enfileirar
  await Queue.enqueue('fechamentos', status === 'ABERTO' ? 'DELETE' : 'UPSERT', payload);

  if (_isOnline) {
    SyncEngine.scheduleSync();
  }
}
