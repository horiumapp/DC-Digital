import { describe, it, expect } from 'vitest';

/**
 * Testes unitários para as regras de segurança adicionadas na auditoria forense:
 * 1. Restrição estrita de CORS nas Edge Functions (SEC-02).
 * 2. Prevenção de BOLA/IDOR de Aluno por spoofing de CPF em user_metadata (SEC-01).
 * 3. Prevenção de Auto-Registro involuntário com cargo PROFESSOR (SEC-03).
 */

// ============================================================
// 1. CORS Rules Test
// ============================================================
const STATIC_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://ddigital-lbr.vercel.app',
  'https://dc-digital.vercel.app',
];
const ALLOWED_VERCEL_REGEX = /^https:\/\/(dc-digital|ddigital-lbr)(-[a-z0-9-]+)?\.vercel\.app$/;

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  return STATIC_ALLOWED_ORIGINS.includes(origin) || ALLOWED_VERCEL_REGEX.test(origin);
}

describe('Security Hardening — CORS Validation in Edge Functions', () => {
  it('deve autorizar o domínio de produção oficial https://ddigital-lbr.vercel.app', () => {
    expect(isOriginAllowed('https://ddigital-lbr.vercel.app')).toBe(true);
  });

  it('deve autorizar o domínio secundário oficial https://dc-digital.vercel.app', () => {
    expect(isOriginAllowed('https://dc-digital.vercel.app')).toBe(true);
  });

  it('deve autorizar preview legítimo na Vercel', () => {
    expect(isOriginAllowed('https://ddigital-lbr-git-feat-sec.vercel.app')).toBe(true);
    expect(isOriginAllowed('https://dc-digital-preview-123.vercel.app')).toBe(true);
  });

  it('deve autorizar origens locais de desenvolvimento', () => {
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:5173')).toBe(true);
  });

  it('BLOQUEIO APT: deve rejeitar domínio arbitrário na Vercel (ex: attacker.vercel.app)', () => {
    expect(isOriginAllowed('https://attacker.vercel.app')).toBe(false);
    expect(isOriginAllowed('https://phishing-school.vercel.app')).toBe(false);
    expect(isOriginAllowed('https://evil-site.vercel.app')).toBe(false);
  });

  it('BLOQUEIO APT: deve rejeitar domínios externos arbitrários', () => {
    expect(isOriginAllowed('https://google.com')).toBe(false);
    expect(isOriginAllowed('https://ddigital-lbr.vercel.app.attacker.com')).toBe(false);
  });
});

// ============================================================
// 2. Aluno Access Rules Test (Anti-Spoofing RLS Logic)
// ============================================================
interface AlunoRecord {
  id: string;
  usuario_id?: string | null;
  cpf: string;
  turma_id: string;
}

interface AuthJwt {
  uid: string;
  email?: string;
  user_metadata?: {
    cpf?: string;
  };
}

/**
 * Simula a função aluno_tem_acesso_a_turma corrigida na migration 20260907000020
 */
function evaluateAlunoAcessoTurma(
  turmaId: string,
  alunoRecord: AlunoRecord,
  jwt: AuthJwt,
  role: string
): boolean {
  if (role !== 'ALUNO') return false;
  if (alunoRecord.turma_id !== turmaId) return false;

  // 1. Vínculo relacional direto via usuario_id ou id
  if (alunoRecord.usuario_id && alunoRecord.usuario_id === jwt.uid) return true;
  if (alunoRecord.id === jwt.uid) return true;

  // 2. Vínculo seguro pelo e-mail institucional oficial (<cpf>@aluno.dcdigital.local)
  const email = jwt.email || '';
  if (email.endsWith('@aluno.dcdigital.local')) {
    const emailCpf = email.split('@')[0];
    const alunoCpfClean = alunoRecord.cpf.replace(/\D/g, '');
    if (alunoCpfClean && alunoCpfClean === emailCpf) {
      return true;
    }
  }

  // Cláusula vulnerável antiga (auth.jwt()->'user_metadata'->>'cpf') foi REMOVIDA.
  return false;
}

describe('Security Hardening — Aluno Anti-Spoofing RLS Rules', () => {
  const ALUNO_VITIMA: AlunoRecord = {
    id: 'aluno-uuid-1234',
    usuario_id: 'user-uuid-1234',
    cpf: '11122233344',
    turma_id: 'turma-uuid-9999',
  };

  it('deve autorizar o próprio aluno via usuario_id legítimo', () => {
    const jwtLegitimo: AuthJwt = {
      uid: 'user-uuid-1234',
      email: '11122233344@aluno.dcdigital.local',
    };
    expect(evaluateAlunoAcessoTurma('turma-uuid-9999', ALUNO_VITIMA, jwtLegitimo, 'ALUNO')).toBe(true);
  });

  it('deve autorizar o aluno via e-mail oficial @aluno.dcdigital.local', () => {
    const jwtLegitimoEmail: AuthJwt = {
      uid: 'outro-uuid-legitimo',
      email: '11122233344@aluno.dcdigital.local',
    };
    expect(evaluateAlunoAcessoTurma('turma-uuid-9999', ALUNO_VITIMA, jwtLegitimoEmail, 'ALUNO')).toBe(true);
  });

  it('deve autorizar o aluno mesmo quando o CPF no banco possui pontuação e máscara', () => {
    const alunoComMascara: AlunoRecord = {
      id: 'aluno-uuid-mask',
      usuario_id: null,
      cpf: '111.222.333-44',
      turma_id: 'turma-uuid-9999',
    };
    const jwtLegitimo: AuthJwt = {
      uid: 'outro-uuid-mask',
      email: '11122233344@aluno.dcdigital.local',
    };
    expect(evaluateAlunoAcessoTurma('turma-uuid-9999', alunoComMascara, jwtLegitimo, 'ALUNO')).toBe(true);
  });

  it('BLOQUEIO APT: deve REJEITAR acesso de atacante que forjou CPF da vítima em user_metadata', () => {
    // Atacante possui conta de aluno legítima, mas manipulou seu user_metadata com o CPF da vítima
    const jwtAtacante: AuthJwt = {
      uid: 'user-atacante-666',
      email: '99988877700@aluno.dcdigital.local', // CPF real do atacante
      user_metadata: {
        cpf: '11122233344', // CPF forjado da vítima
      },
    };

    // A regra corrigida NÃO confia em user_metadata e deve negar acesso
    expect(evaluateAlunoAcessoTurma('turma-uuid-9999', ALUNO_VITIMA, jwtAtacante, 'ALUNO')).toBe(false);
  });
});

// ============================================================
// 3. New User Role Fallback Test (Anti-Escalation)
// ============================================================
function resolveNewUserRole(rawAppMetaData?: { role?: string }): string {
  return rawAppMetaData?.role || 'PENDENTE';
}

describe('Security Hardening — User Signup Role Assignment', () => {
  it('deve manter o cargo PROFESSOR se provisionado explicitamente pelo admin', () => {
    expect(resolveNewUserRole({ role: 'PROFESSOR' })).toBe('PROFESSOR');
  });

  it('deve manter o cargo ALUNO se provisionado pelo admin', () => {
    expect(resolveNewUserRole({ role: 'ALUNO' })).toBe('ALUNO');
  });

  it('BLOQUEIO APT: cadastro avulso sem role deve receber PENDENTE e não PROFESSOR', () => {
    expect(resolveNewUserRole(undefined)).toBe('PENDENTE');
    expect(resolveNewUserRole({})).toBe('PENDENTE');
  });
});
