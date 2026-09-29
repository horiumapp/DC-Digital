# Implantação LGPD - Diário Digital

Este documento descreve os passos e as configurações necessárias para colocar os novos recursos de conformidade com a LGPD em produção no sistema Diário Digital, sem quebrar funcionalidades existentes.

## 1. Banco de Dados (Supabase)

As seguintes tabelas e políticas de segurança precisam ser criadas no banco de dados de produção.

### Tabelas Criadas

1.  **`user_consents`**: Armazena o registro de consentimento dos usuários (Termos de Uso e Política de Privacidade).
2.  **`lgpd_requests`**: Armazena as solicitações dos titulares de dados (exportação, exclusão, correção, contato com o DPO).
3.  **`security_logs`**: Armazena logs de auditoria de ações sensíveis (login, alterações de permissão, exportação de dados).

### Script SQL para Implantação

Você pode executar o seguinte SQL diretamente no SQL Editor do Supabase de produção:

```sql
-- Habilitar a extensão uuid-ossp se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela user_consents
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('accepted', 'declined', 'revoked')),
    ip_address TEXT,
    user_agent TEXT,
    policy_version TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para user_consents
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios consentimentos"
ON user_consents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios consentimentos"
ON user_consents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Administradores podem ver todos os consentimentos"
ON user_consents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'coordenador')
  )
);

-- 2. Tabela lgpd_requests
CREATE TABLE lgpd_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete', 'correction', 'dpo_contact')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    details TEXT,
    protocol_number TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS para lgpd_requests
ALTER TABLE lgpd_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias solicitações"
ON lgpd_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias solicitações"
ON lgpd_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Administradores podem ver todas as solicitações"
ON lgpd_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'coordenador')
  )
);

CREATE POLICY "Administradores podem atualizar as solicitações"
ON lgpd_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'coordenador')
  )
);

-- 3. Tabela security_logs
CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para security_logs (Apenas inserção por autenticados, visualização apenas por admin)
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer usuário logado pode inserir logs de suas próprias ações"
ON security_logs FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Somente administradores podem ver os logs"
ON security_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Funções utilitárias
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_consents_updated_at
BEFORE UPDATE ON user_consents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## 2. Configurações de Ambiente (Vercel)

Não há novas variáveis de ambiente obrigatórias para o frontend Vercel, pois a aplicação reaproveita as variáveis de conexão com o Supabase já existentes:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

O código novo já trata os casos de falta de conexão com o banco adequadamente e faz *graceful degradation* quando possível.

## 3. Implantação e Deploy

Para efetuar o deploy das alterações para produção na Vercel:

1. Certifique-se de que os testes unitários (`npm run test`) passaram.
2. Certifique-se de que o linter não acusou erros (`npm run lint`).
3. Certifique-se de que o build foi realizado com sucesso (`npm run build`).
4. Execute o script SQL no Supabase de Produção para criar a infraestrutura das novas tabelas.
5. Faça o commit das alterações no repositório vinculado à Vercel. A Vercel fará o deploy automático.
6. Após o deploy, valide os componentes no ambiente de produção usando o roteiro em `docs/lgpd-testes-manuais.md`.

## 4. O que testar após o Deploy

1. Acesse a página inicial em modo anônimo e verifique se o **Banner de Cookies** aparece.
2. Tente fazer **login**. Se der erro de "Failed to fetch", certifique-se de que a tabela `security_logs` existe no Supabase e que o RLS permite `INSERT` (de acordo com as permissões acima).
3. Após login, clique no rodapé em "Minha Privacidade" e teste gerar um protocolo de exportação de dados.
4. Entre no painel "Administração", na aba "Painel LGPD" e visualize os logs de consentimento e as solicitações recém-criadas.
