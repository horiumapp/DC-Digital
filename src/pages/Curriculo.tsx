import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ChevronRight, BookOpen, Layers, Filter, Check, RotateCcw, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/common/Toast';

interface Unidade {
  id: string;
  modalidade: string;
  ano: string;
  disciplina: string;
  bimestre: string;
  nome: string;
  objetos?: Objeto[];
  habilidades?: { id: string; codigo: string }[];
}

interface Objeto {
  id?: string;
  unidade_id?: string;
  descricao: string;
}

const MODALIDADES = [
  "Educação Infantil", 
  "Fundamental Anos Iniciais (1º ao 5º ANO)", 
  "Fundamental Anos Finais (6º ao 9º ANO)", 
  "Médio", 
  "EJA (Educação de Jovens e Adultos)"
];
const ANOS = ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"];
const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
const DISCIPLINAS = ["Português", "Matemática", "Ciências", "História", "Geografia", "Artes", "Educação Física", "Inglês", "Ensino Religioso"];

export default function Curriculo() {
  const { showSuccess, showError, showWarning } = useToast();
  const [loading, setLoading] = useState(false);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  
  // Filtros
  const [filterModalidade, setFilterModalidade] = useState("");
  const [filterAno, setFilterAno] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState("");
  const [filterBimestre, setFilterBimestre] = useState("");

  // Form Novo
  const [newUnidade, setNewUnidade] = useState({
    modalidade: "Fundamental Anos Iniciais (1º ao 5º ANO)",
    ano: "1º Ano",
    disciplina: "Português",
    bimestre: "1º Bimestre",
    nome: ""
  });
  const [newObjetos, setNewObjetos] = useState<string[]>([""]);
  const [newHabilidades, setNewHabilidades] = useState<string[]>([""]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUnidades();
  }, [filterModalidade, filterAno, filterDisciplina, filterBimestre]);

  async function fetchUnidades() {
    setLoading(true);
    try {
      let query = supabase
        .from('curriculo_unidades')
        .select('*, objetos:curriculo_objetos(*), habilidades:curriculo_habilidades(*)');

      if (filterModalidade) query = query.eq('modalidade', filterModalidade);
      if (filterAno) query = query.eq('ano', filterAno);
      if (filterDisciplina) query = query.eq('disciplina', filterDisciplina);
      if (filterBimestre) query = query.eq('bimestre', filterBimestre);

      const { data, error } = await query.order('criado_em', { ascending: false });

      if (error) throw error;
      setUnidades(data || []);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar currículo');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!newUnidade.nome.trim()) {
      showWarning('Informe o nome da Unidade Didática');
      return;
    }

    const validObjetos = newObjetos.filter(o => o.trim() !== "");
    const validHabilidades = newHabilidades.filter(h => h.trim() !== "");
    
    if (validObjetos.length === 0) {
      showWarning('Adicione pelo menos um Objeto de Conhecimento');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        // --- MODO EDIÇÃO ---
        
        // 1. Atualizar Unidade
        const { error: unitError } = await supabase
          .from('curriculo_unidades')
          .update(newUnidade)
          .eq('id', editingId);

        if (unitError) throw unitError;

        // 2. Atualizar Objetos (Deletar e Reinserir para simplificar)
        await supabase.from('curriculo_objetos').delete().eq('unidade_id', editingId);
        
        const objectsToInsert = validObjetos.map(desc => ({
          unidade_id: editingId,
          descricao: desc
        }));

        const { error: objError } = await supabase
          .from('curriculo_objetos')
          .insert(objectsToInsert);

        if (objError) throw objError;

        // 3. Atualizar Habilidades (Deletar e Reinserir)
        await supabase.from('curriculo_habilidades').delete().eq('unidade_id', editingId);
        
        if (validHabilidades.length > 0) {
          const skillsToInsert = validHabilidades.map(code => ({
            unidade_id: editingId,
            codigo: code
          }));

          const { error: skillError } = await supabase
            .from('curriculo_habilidades')
            .insert(skillsToInsert);

          if (skillError) throw skillError;
        }

        showSuccess('Currículo atualizado com sucesso!');
      } else {
        // --- MODO NOVO CADASTRO ---
        
        // 1. Inserir Unidade
        const { data: unitData, error: unitError } = await supabase
          .from('curriculo_unidades')
          .insert([newUnidade])
          .select()
          .single();

        if (unitError) throw unitError;

        // 2. Inserir Objetos
        const objectsToInsert = validObjetos.map(desc => ({
          unidade_id: unitData.id,
          descricao: desc
        }));

        const { error: objError } = await supabase
          .from('curriculo_objetos')
          .insert(objectsToInsert);

        if (objError) throw objError;

        // 3. Inserir Habilidades
        if (validHabilidades.length > 0) {
          const skillsToInsert = validHabilidades.map(code => ({
            unidade_id: unitData.id,
            codigo: code
          }));

          const { error: skillError } = await supabase
            .from('curriculo_habilidades')
            .insert(skillsToInsert);

          if (skillError) throw skillError;
        }

        showSuccess('Currículo cadastrado com sucesso!');
      }

      // Reset Form
      setEditingId(null);
      setNewUnidade({ ...newUnidade, nome: "" });
      setNewObjetos([""]);
      setNewHabilidades([""]);
      await fetchUnidades();
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      showError(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(u: Unidade) {
    setEditingId(u.id);
    setNewUnidade({
      modalidade: u.modalidade,
      ano: u.ano,
      disciplina: u.disciplina,
      bimestre: u.bimestre,
      nome: u.nome
    });
    setNewObjetos(u.objetos?.map(o => o.descricao) || [""]);
    setNewHabilidades(u.habilidades?.map(h => h.codigo) || [""]);
    
    // Scroll para o topo do formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setNewUnidade({ ...newUnidade, nome: "" });
    setNewObjetos([""]);
    setNewHabilidades([""]);
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta unidade curricular?')) return;

    try {
      const { error } = await supabase
        .from('curriculo_unidades')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess('Removido com sucesso');
      fetchUnidades();
    } catch (err) {
      console.error(err);
      showError('Erro ao remover');
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0f2851] tracking-tight">Gestão Curricular (BNCC)</h1>
          <p className="text-slate-500 mt-1">Configure o referencial de Unidades Didáticas e Objetos de Conhecimento.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Cadastro */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 space-y-6 sticky top-24">
            <div className="flex items-center gap-3 text-[#0f2851]">
              <div className="p-2 bg-blue-50 rounded-xl">
                {editingId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <h2 className="font-bold text-lg">{editingId ? 'Editar Registro' : 'Novo Cadastro'}</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Modalidade</label>
                  <select 
                    value={newUnidade.modalidade}
                    onChange={e => setNewUnidade({...newUnidade, modalidade: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Série/Ano</label>
                  <select 
                    value={newUnidade.ano}
                    onChange={e => setNewUnidade({...newUnidade, ano: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Bimestre</label>
                  <select 
                    value={newUnidade.bimestre}
                    onChange={e => setNewUnidade({...newUnidade, bimestre: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    {BIMESTRES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Disciplina</label>
                <select 
                  value={newUnidade.disciplina}
                  onChange={e => setNewUnidade({...newUnidade, disciplina: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                >
                  {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Unidade Didática</label>
                <input 
                  type="text"
                  value={newUnidade.nome}
                  onChange={e => setNewUnidade({...newUnidade, nome: e.target.value})}
                  placeholder="Ex: Frações e Decimais"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 ml-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Objetos de Conhecimento</label>
                  <button 
                    onClick={() => setNewObjetos([...newObjetos, ""])}
                    className="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar mb-4">
                  {newObjetos.map((obj, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        value={obj}
                        onChange={e => {
                          const updated = [...newObjetos];
                          updated[idx] = e.target.value;
                          setNewObjetos(updated);
                        }}
                        placeholder={`Objeto ${idx + 1}`}
                        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                      {newObjetos.length > 1 && (
                        <button 
                          onClick={() => setNewObjetos(newObjetos.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 ml-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase">Habilidades BNCC</label>
                  <button 
                    onClick={() => setNewHabilidades([...newHabilidades, ""])}
                    className="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                  {newHabilidades.map((hab, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        value={hab}
                        onChange={e => {
                          const updated = [...newHabilidades];
                          updated[idx] = e.target.value;
                          setNewHabilidades(updated);
                        }}
                        placeholder="Ex: EF15LP01"
                        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                      {newHabilidades.length > 1 && (
                        <button 
                          onClick={() => setNewHabilidades(newHabilidades.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className={`w-full ${editingId ? 'bg-emerald-600' : 'bg-[#0f2851]'} text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50`}
              >
                <Save className="w-5 h-5" />
                {editingId ? 'Atualizar Currículo' : 'Salvar Currículo'}
              </button>

              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Listagem e Filtros */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400 px-2 border-r border-slate-100">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Filtros</span>
            </div>
            <select 
              value={filterModalidade} 
              onChange={e => setFilterModalidade(e.target.value)}
              className="bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:ring-0"
            >
              <option value="">Modalidade</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select 
              value={filterAno} 
              onChange={e => setFilterAno(e.target.value)}
              className="bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:ring-0"
            >
              <option value="">Série/Ano</option>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select 
              value={filterDisciplina} 
              onChange={e => setFilterDisciplina(e.target.value)}
              className="bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:ring-0"
            >
              <option value="">Disciplina</option>
              {DISCIPLINAS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select 
              value={filterBimestre} 
              onChange={e => setFilterBimestre(e.target.value)}
              className="bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:ring-0"
            >
              <option value="">Bimestre</option>
              {BIMESTRES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <button 
              onClick={() => fetchUnidades()}
              className="ml-auto p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Atualizar lista"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-4">
            {loading && unidades.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : unidades.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Nenhum currículo cadastrado com estes filtros.</p>
              </div>
            ) : (
              unidades.map(unidade => (
                <div key={unidade.id} className="group bg-white rounded-3xl p-6 border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">{unidade.modalidade}</span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase">{unidade.ano}</span>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">{unidade.bimestre}</span>
                        <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase">{unidade.disciplina}</span>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-bold text-[#0f2851] group-hover:text-blue-600 transition-colors">{unidade.nome}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4 pt-4 border-t border-slate-50">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Objetos de Conhecimento</label>
                          <div className="space-y-1.5">
                            {unidade.objetos?.map(obj => (
                              <div key={obj.id} className="flex items-start gap-3">
                                <div className="mt-1.5 p-0.5 bg-emerald-500 rounded-full">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className="text-sm text-slate-600 leading-relaxed">{obj.descricao}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {unidade.habilidades && unidade.habilidades.length > 0 && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Habilidades BNCC</label>
                            <div className="flex flex-wrap gap-2">
                              {unidade.habilidades.map(hab => (
                                <span key={hab.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">
                                  {hab.codigo}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleEdit(unidade)}
                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(unidade.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
