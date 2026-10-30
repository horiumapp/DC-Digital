// @vitest-environment happy-dom
import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import CalendarWidget from '../components/common/CalendarWidget';
const navigate=vi.fn();
vi.mock('react-router-dom',()=>({useNavigate:()=>navigate}));
beforeEach(()=>{localStorage.clear();navigate.mockClear();vi.useFakeTimers();vi.setSystemTime(new Date(2026,9,11));});
afterEach(()=>{cleanup();vi.useRealTimers();});
function mount(){return render(<CalendarWidget year={2026} currentMonth={4} minMonth={4} maxMonth={4} onMonthChange={vi.fn()} turmaAtiva={{id:'t1'}} lancamentos={[{turmaId:'t1',data:'2026-05-04',tipo:'frequencia',tempo:'1º TEMPO'},{turmaId:'t1',data:'2026-05-04',tipo:'conteudo',tempo:'1º TEMPO'}]} avaliacoes={[]} alunos={[]} horarioTurma={[{dia_semana:1,tempo_ordem:1}]} periodoStart="2026-05-01" periodoEnd="2026-05-31" selectedDay={null} onDaySelect={vi.fn()}/>)}
it('filtra a agenda por registros concluídos e pendentes sem mudar os dados',()=>{mount();fireEvent.click(screen.getByRole('button',{name:'Agenda'}));fireEvent.click(screen.getByRole('button',{name:'Concluídas'}));expect(screen.getByLabelText(/4 de Maio, Segunda-feira/)).toBeTruthy();expect(screen.queryByLabelText(/11 de Maio, Segunda-feira/)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'A registrar'}));expect(screen.queryByLabelText(/4 de Maio, Segunda-feira/)).toBeNull();expect(screen.getByLabelText(/11 de Maio, Segunda-feira/)).toBeTruthy();expect(navigate).not.toHaveBeenCalled();});
it('mantém sete dias na grade e os limites do período',()=>{const {container}=mount();fireEvent.click(screen.getByRole('button',{name:'Mês'}));expect(container.querySelectorAll('.portal-weekdays>span').length).toBe(7);expect(screen.getByRole('button',{name:'Mês anterior'}).hasAttribute('disabled')).toBe(true);expect(screen.getByRole('button',{name:'Próximo mês'}).hasAttribute('disabled')).toBe(true);});
it('comunica ausência de avaliações sem esconder o filtro',()=>{mount();fireEvent.click(screen.getByRole('button',{name:'Agenda'}));fireEvent.click(screen.getByRole('button',{name:'Avaliações'}));expect(screen.getByText('Nenhuma aula neste filtro')).toBeTruthy();expect(screen.getByRole('button',{name:'Avaliações'}).getAttribute('aria-pressed')).toBe('true');});
