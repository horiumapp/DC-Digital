import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { useToast } from '../../components/common/Toast';
import {
  carregarFeriados,
  incluirFeriadosNacionais,
  removerFeriado,
  salvarFeriado,
  type Feriado,
} from '../../services/feriados';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function iso(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export default function TabFeriados() {
  const { showSuccess, showError } = useToast();
  const [ano, setAno] = useState(APP_CONFIG.YEAR);
  const [mes, setMes] = useState(new Date().getMonth());
  const [lista, setLista] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState('');

  const carregar = useCallback(async (anoLetivo: number) => {
    setLoading(true);
    try {
      setLista(await carregarFeriados(anoLetivo));
    } catch {
      showError('Não foi possível carregar os feriados da rede.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    carregar(ano);
  }, [ano, carregar]);

  const porData = useMemo(() => new Map(lista.map(item => [item.data, item.nome])), [lista]);

  const dias = useMemo(() => {
    const primeiro = new Date(ano, mes, 1).getDay();
    const total = new Date(ano, mes + 1, 0).getDate();
    const celulas: Array<number | null> = Array.from({ length: primeiro }, () => null);
    for (let dia = 1; dia <= total; dia += 1) celulas.push(dia);
    return celulas;
  }, [ano, mes]);

  const escolherDia = (dia: number) => {
    const data = iso(ano, mes, dia);
    setDiaSelecionado(data);
    setNome(porData.get(data) || '');
  };

  const gravar = async () => {
    if (!diaSelecionado) return;
    setSalvando(true);
    try {
      await salvarFeriado(diaSelecionado, nome);
      setLista(await carregarFeriados(ano));
      showSuccess('Feriado salvo para toda a rede.');
    } catch {
      showError('Não foi possível salvar o feriado. Confira se o seu acesso é de administrador ou SEMEC.');
    } finally {
      setSalvando(false);
    }
  };

  const apagar = async () => {
    if (!diaSelecionado) return;
    setSalvando(true);
    try {
      await removerFeriado(diaSelecionado);
      setLista(await carregarFeriados(ano));
      setNome('');
      showSuccess('Feriado removido. O dia volta a contar como aula quando estiver no horário.');
    } catch {
      showError('Não foi possível remover o feriado.');
    } finally {
      setSalvando(false);
    }
  };

  const incluirNacionais = async () => {
    setSalvando(true);
    try {
      const incluidos = await incluirFeriadosNacionais(ano);
      setLista(await carregarFeriados(ano));
      showSuccess(incluidos > 0 ? `${incluidos} feriados nacionais incluídos. Confira o mês e ajuste o que for municipal.` : 'Os feriados nacionais deste ano já estavam no calendário.');
    } catch {
      showError('Não foi possível incluir os feriados nacionais.');
    } finally {
      setSalvando(false);
    }
  };

  const doMes = lista.filter(item => item.data.startsWith(`${ano}-${String(mes + 1).padStart(2, '0')}`));

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Feriados da rede</h2>
          <p className="text-sm text-slate-500 mt-1">Um dia marcado aqui não tem aula em nenhuma escola. O lançamento já gravado permanece.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="p-2 rounded-lg border border-slate-200" aria-label="Ano anterior" onClick={() => setAno(valor => valor - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-16 text-center font-bold text-slate-800">{ano}</span>
          <button type="button" className="p-2 rounded-lg border border-slate-200" aria-label="Próximo ano" onClick={() => setAno(valor => valor + 1)}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={incluirNacionais}
        disabled={salvando}
        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-sm font-bold hover:bg-slate-200 disabled:opacity-50"
      >
        Incluir feriados nacionais de {ano}
      </button>

      <div className="flex items-center justify-between">
        <button type="button" className="p-2 rounded-lg border border-slate-200" aria-label="Mês anterior" onClick={() => setMes(valor => valor === 0 ? 11 : valor - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-slate-800">{MESES[mes]}</h3>
        <button type="button" className="p-2 rounded-lg border border-slate-200" aria-label="Próximo mês" onClick={() => setMes(valor => valor === 11 ? 0 : valor + 1)}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando os feriados…</p>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {SEMANA.map(dia => (
            <div key={dia} className="text-center text-[11px] font-bold text-slate-400 py-1">{dia}</div>
          ))}
          {dias.map((dia, indice) => {
            if (!dia) return <div key={`vazio-${indice}`} />;
            const data = iso(ano, mes, dia);
            const marcado = porData.get(data);
            const ativo = diaSelecionado === data;
            return (
              <button
                key={data}
                type="button"
                onClick={() => escolherDia(dia)}
                className={`min-h-14 rounded-lg border text-left px-1.5 py-1 ${marcado ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'} ${ativo ? 'ring-2 ring-[#6354c7]' : ''}`}
                aria-label={marcado ? `${dia} de ${MESES[mes]}, feriado ${marcado}` : `${dia} de ${MESES[mes]}`}
              >
                <span className="block text-sm font-bold text-slate-800">{dia}</span>
                {marcado && <span className="block text-[10px] leading-tight text-amber-800 line-clamp-2">{marcado}</span>}
              </button>
            );
          })}
        </div>
      )}

      {diaSelecionado && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm font-bold text-slate-800">Dia {diaSelecionado.split('-').reverse().join('/')}</p>
          <label className="block text-xs font-bold text-slate-500" htmlFor="nome-feriado">Nome do feriado</label>
          <input
            id="nome-feriado"
            value={nome}
            maxLength={80}
            onChange={event => setNome(event.target.value)}
            placeholder="Ex.: Aniversário da cidade"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={gravar} disabled={salvando || !nome.trim()} className="px-4 py-2 rounded-xl bg-[#6354c7] text-white text-sm font-bold disabled:opacity-50">
              Salvar feriado
            </button>
            {porData.has(diaSelecionado) && (
              <button type="button" onClick={apagar} disabled={salvando} className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 text-sm font-bold disabled:opacity-50">
                Remover
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-2">Neste mês</h3>
        {doMes.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum feriado em {MESES[mes]}.</p>
        ) : (
          <ul className="space-y-1">
            {doMes.map(item => (
              <li key={item.data} className="text-sm text-slate-700">
                <button type="button" className="font-bold text-[#6354c7]" onClick={() => { setDiaSelecionado(item.data); setNome(item.nome); }}>
                  {item.data.split('-').reverse().join('/')}
                </button>
                {' — '}{item.nome}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
