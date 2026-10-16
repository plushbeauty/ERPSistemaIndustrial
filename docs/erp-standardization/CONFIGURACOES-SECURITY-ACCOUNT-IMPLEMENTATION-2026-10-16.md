# Configurações — Segurança da conta atual
Data: 2026-10-16
Branch: main
Status: implementação de código submetida; aguarda validação de build e autenticação real.

## Implementado

Arquivo `src/pages/configuracoes/ConfiguracaoSeguranca.tsx`, conectado à rota `/configuracoes-adm/seguranca` no shell `ConfiguracoesADM.tsx`.

- Consulta o usuário autenticado e o nível de garantia de autenticação através do Supabase Auth.
- Lista fatores MFA TOTP e permite iniciar inscrição, apresentar QR/chave manual e validar o código de seis dígitos.
- Permite alterar a senha da própria conta usando `supabase.auth.updateUser`, com mínimo de 12 caracteres e confirmação local.
- Permite encerrar a sessão local atual com `supabase.auth.signOut({ scope: 'local' })`.
- Não afirma revogar sessões de outros dispositivos, administrar fatores MFA de terceiros ou alterar senhas de outros usuários.
- Estados de carregamento, erro e sucesso explícitos; interface segue campos e botões compactos de 30 px, bordas de 2 px e paleta industrial.

## Limitações que continuam abertas

- O build ainda precisa confirmar a assinatura TypeScript exata das APIs MFA na versão instalada de `@supabase/supabase-js`.
- Inscrição MFA precisa ser testada com uma conta real e um aplicativo autenticador; não foi realizada nesta sessão.
- Gestão administrativa de sessões de terceiros e revogação global não estão implementadas.
- Política efetiva de senha, expiração de convite, troca obrigatória e revogação após redefinição dependem da configuração real do Supabase e de testes de integração.
- O status Vercel observado nos commits recentes continua em falha; não considerar este trabalho homologado até pipeline completo.

## Próximas páginas na fila

1. RBAC — contrato remoto de `erp_admin_save_role`, parâmetros e escopo.
2. Empresa e identidade — autorização de atualização e isolamento tenant.
3. Codificação e áreas — autorização de RPCs, tenant e concorrência da sequência.
4. Logs — políticas RLS e minimização dos dados sensíveis na origem.
5. Backups — documentar retenção, RPO/RTO e teste real de restauração.
6. Integrações e parâmetros globais — inventário de configurações persistidas e segredos no backend.
