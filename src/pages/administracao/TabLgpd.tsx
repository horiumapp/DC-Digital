import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Search, ShieldAlert, CheckCircle2, AlertCircle, Eye, RefreshCw, Mail, MessageSquare, Calendar } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { listLgpdRequests, updateLgpdRequest, LgpdRequest } from '../../services/lgpdService';
import { logSecurityEvent } from '../../services/securityLogService';

export default function TabLgpd() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [requests, setRequests] = useState<LgpdRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  
  const [selectedRequest, setSelectedRequest] = useState<LgpdRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [respostaAdmin, setRespostaAdmin] = useState('');
  const [novoStatus, setNovoStatus] = useState<'recebida' | 'em_analise' | 'concluida' | 'recusada'>('recebida');
  const [isSaving, setIsSaving] = useState(false);

  const STATUSES = ['TODAS', 'recebida', 'em_analise', 'concluida', 'recusada'];

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await listLgpdRequests();
      if (error) throw error;
      setRequests(data);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar solicitações LGPD.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Log administrative access on mount
  useEffect(() => {
    // eslint-disable-next-line
    fetchRequests();
    logSecurityEvent({
      userId: user?.id,
      userEmail: user?.email,
      action: 'ADMIN_ACCESS',
      entity: 'lgpd_requests',
      metadata: { acao: 'Leitura da lista de solicitacoes LGPD' },
    });
  }, [fetchRequests, user]);

  const requestsFiltrados = requests.filter(r => {
    const searchString = `${r.nome || ''} ${r.email || ''} ${r.mensagem || ''}`.toLowerCase();
    const matchBusca = searchString.includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'TODAS' || r.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'recebida':
        return { text: 'Recebida', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'em_analise':
        return { text: 'Em Análise', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'concluida':
        return { text: 'Concluída', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'recusada':
        return { text: 'Recusada', color: 'bg-red-50 text-red-700 border-red-200' };
      default:
        return { text: status, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'acesso': return 'Acesso aos Dados';
      case 'correcao': return 'Correção de Dados';
      case 'exclusao': return 'Exclusão de Dados';
      case 'revogacao': return 'Revogação de Consentimento';
      case 'compartilhamento': return 'Info Compartilhamento';
      default: return 'Outro';
    }
  };

  const handleOpenTratar = (req: LgpdRequest) => {
    setSelectedRequest(req);
    setRespostaAdmin(req.resposta_admin || '');
    setNovoStatus(req.status);
    setModalOpen(true);
  };

  const handleSalvarTratamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsSaving(true);
    try {
      const { error } = await updateLgpdRequest(selectedRequest.id, novoStatus, respostaAdmin);
      if (error) throw error;

      showSuccess('Solicitação LGPD atualizada com sucesso!');
      setModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();

      // Log security event for modification
      await logSecurityEvent({
        userId: user?.id,
        userEmail: user?.email,
        action: 'PERSONAL_DATA_CHANGE',
        entity: 'lgpd_requests',
        entityId: selectedRequest.id,
        metadata: {
          novo_status: novoStatus,
          solicitacao_id: selectedRequest.id,
          solicitante_email: selectedRequest.email,
        },
      });
    } catch (err) {
      showError('Erro ao atualizar solicitação.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 gap-4 bg-white shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#0f2851]" />
            Solicitações LGPD / Direitos do Titular
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Gerencie, responda e alterne status de solicitações de privacidade enviadas pelos titulares.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar max-w-[90vw]">
            {STATUSES.map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setFiltroStatus(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filtroStatus === status 
                    ? 'bg-white text-[#0f2851] shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {status === 'TODAS' ? 'Todas' : getStatusConfig(status).text}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar solicitante ou e-mail..."
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2851] focus:border-[#0f2851] bg-slate-50/50 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Solicitações */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f2851]"></div>
          </div>
        ) : requestsFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <ShieldAlert className="w-12 h-12 text-slate-200" />
            <p className="font-medium">Nenhuma solicitação de privacidade encontrada.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Titular</th>
                    <th className="px-6 py-4">E-mail</th>
                    <th className="px-6 py-4">Tipo de Solicitação</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Data da Solicitação</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {requestsFiltrados.map((r) => {
                    const statusCfg = getStatusConfig(r.status);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800">{r.nome}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {r.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-[#0f2851] bg-[#eef2ff] px-2 py-0.5 rounded text-xs border border-blue-50">
                            {getTipoLabel(r.tipo)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${statusCfg.color}`}>
                            {statusCfg.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium tabular-nums">
                          {new Date(r.created_at).toLocaleDateString('pt-BR') + ' às ' + new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleOpenTratar(r)}
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[#0f2851] hover:text-white transition-all rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Tratar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Tratamento de Solicitação */}
      {modalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0f2851] text-white p-6">
              <h3 className="text-base font-black flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-300" />
                Processar Solicitação LGPD
              </h3>
              <p className="text-xs text-blue-200 mt-1">Titular: {selectedRequest.nome}</p>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSalvarTratamento} className="p-6 space-y-4">
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl text-xs leading-relaxed border border-slate-100 max-h-40 overflow-y-auto">
                <div className="flex items-center gap-1.5 font-bold text-[#0f2851]">
                  <MessageSquare className="w-4 h-4" />
                  Mensagem Enviada pelo Titular:
                </div>
                <p className="text-slate-600 italic">"{selectedRequest.mensagem}"</p>
                <div className="flex items-center gap-1.5 text-slate-400 pt-2 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  Solicitado em: {new Date(selectedRequest.created_at).toLocaleString('pt-BR')}
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label htmlFor="modal_status" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Alterar Status do Pedido
                </label>
                <select
                  id="modal_status"
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value as 'recebida' | 'em_analise' | 'concluida' | 'recusada')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="recebida">Recebida</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="concluida">Concluída (Atendida)</option>
                  <option value="recusada">Recusada</option>
                </select>
              </div>

              {/* Resposta Admin */}
              <div className="space-y-1.5">
                <label htmlFor="modal_resposta" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Resposta Administrativa / Justificativa
                </label>
                <textarea
                  id="modal_resposta"
                  value={respostaAdmin}
                  onChange={(e) => setRespostaAdmin(e.target.value)}
                  placeholder="Escreva a resposta formal ou justificativa legal para o titular..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 font-medium resize-none"
                  required
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setSelectedRequest(null); }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0f2851] hover:bg-[#1a3a6d] disabled:bg-slate-400 text-white font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer"
                >
                  {isSaving ? (
                    'Salvando...'
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
