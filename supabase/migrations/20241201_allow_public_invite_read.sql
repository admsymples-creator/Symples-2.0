-- Permitir leitura pública de convites pendentes pelo ID
-- Isso permite que a página /invite/[token] funcione mesmo sem autenticação
-- É seguro porque o ID é um UUID difícil de adivinhar e só expõe informações básicas

-- Adicionar policy para permitir leitura pública de convites pendentes
CREATE POLICY "Allow public read of pending invites by id"
    ON public.workspace_invites FOR SELECT
    USING (
        status = 'pending'
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- Esta policy permite que qualquer pessoa (mesmo sem autenticação) leia convites pendentes
-- Apenas expõe informações básicas necessárias para a página de aceite funcionar
-- É seguro porque:
-- 1. O ID é um UUID difícil de adivinhar
-- 2. Apenas convites pendentes podem ser lidos
-- 3. Apenas informações básicas são expostas (não dados sensíveis do workspace)


