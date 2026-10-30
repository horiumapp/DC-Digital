// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ClassWorkspace,Metric} from '../components/common/PortalUI';
import type {Turma} from '../contexts/TurmaContext';
const classes:Turma[]=[{id:'class-one',fase:'6º Ano A',componente:'Matemática',ensino:'Fundamental',professor:'Marina',escola:'Escola',turno:'Matutino',diasDeAula:[],tempos:[],metricas:{frequencia:0,objetosMinistrados:0,objetosPlanejados:0,avaliacoesCadastradas:0,avaliacoesPrevistas:0,notasLancadas:0,notasPrevistas:0}},{id:'class-two',fase:'7º Ano B',componente:'Ciências',ensino:'Fundamental',professor:'Marina',escola:'Escola',turno:'Vespertino',diasDeAula:[],tempos:[],metricas:{frequencia:0,objetosMinistrados:0,objetosPlanejados:0,avaliacoesCadastradas:0,avaliacoesPrevistas:0,notasLancadas:0,notasPrevistas:0}}];
function mount(preferenceKey='teacher-one'){return render(<MemoryRouter><ClassWorkspace name="Marina" school="Escola" year={2026} classes={classes} search="" onSearch={vi.fn()} view="cards" onView={vi.fn()} onOpen={vi.fn()} preferenceKey={preferenceKey}/></MemoryRouter>)}
beforeEach(()=>localStorage.clear());afterEach(cleanup);
describe('Personalização local do painel docente',()=>{
 it('combina filtro de turno com favoritos e restaura o favorito em uma nova visita',()=>{const view=mount();fireEvent.click(screen.getByRole('button',{name:'Favoritar 6º Ano A, Matemática'}));fireEvent.click(screen.getByRole('button',{name:'Favoritas'}));expect(screen.queryByRole('button',{name:'Abrir diário de 7º Ano B, Ciências'})).toBeNull();fireEvent.change(screen.getByLabelText('Filtrar turmas por turno'),{target:{value:'Vespertino'}});expect(screen.getByText('Suas favoritas aparecem aqui')).toBeTruthy();view.unmount();mount();expect(screen.getByRole('button',{name:'Remover dos favoritos 6º Ano A, Matemática'}).getAttribute('aria-pressed')).toBe('true')});
 it('mantém as preferências separadas por usuário',()=>{const view=mount();fireEvent.click(screen.getByRole('button',{name:'Favoritar 6º Ano A, Matemática'}));view.unmount();mount('teacher-two');expect(screen.getByRole('button',{name:'Favoritar 6º Ano A, Matemática'}).getAttribute('aria-pressed')).toBe('false')});
 it('apresenta o percentual sem inventar progresso para indicadores sem dados',()=>{render(<><Metric label="Frequência" value="65%" detail="13 de 20"/><Metric label="Conteúdo" value="—" detail="Sem dados"/></>);expect(screen.getByRole('progressbar',{name:'Frequência'}).getAttribute('aria-valuenow')).toBe('65');expect(screen.queryByRole('progressbar',{name:'Conteúdo'})).toBeNull()});
});
