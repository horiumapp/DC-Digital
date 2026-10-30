export function retratoPorSexo(sexo?: string | null): string | null {
  const valor = (sexo || '').trim().toLowerCase();
  if (valor === 'masculino' || valor === 'm') return '/aluno-masculino.jpg';
  if (valor === 'feminino' || valor === 'f') return '/aluna-feminino.jpg';
  return null;
}
