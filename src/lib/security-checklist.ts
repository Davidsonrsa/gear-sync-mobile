// TESTES DE SEGURANÇA - MÓDULO NOTAS FISCAIS
// Este arquivo documenta os testes de segurança e RLS para o módulo

/**
 * CHECKLIST DE SEGURANÇA - NOTAS FISCAIS
 * 
 * ========================================
 * 1. AUTENTICAÇÃO & AUTORIZAÇÃO
 * ========================================
 * 
 * ✅ Usuário não autenticado
 *    - Não consegue acessar /notas-fiscais
 *    - É redirecionado para /auth
 *    
 * ✅ Usuário autenticado SEM permissão
 *    - Vê mensagem "Acesso Negado"
 *    - Não consegue visualizar notas
 *    - Botão "Nova Nota Fiscal" está desabilitado
 *    - Aba de Notas Fiscais NÃO aparece no menu
 *    
 * ✅ Usuário autenticado COM permissão (visualizar)
 *    - Consegue visualizar a listagem
 *    - Consegue clicar em "Visualizar"
 *    - Botão "Nova Nota Fiscal" está desabilitado
 *    - Botão "Editar" está desabilitado na visualização
 *    
 * ✅ Usuário autenticado COM permissão (gerenciar)
 *    - Consegue visualizar a listagem
 *    - Consegue clicar em "Visualizar"
 *    - Botão "Nova Nota Fiscal" está HABILITADO
 *    - Botão "Importar Excel" está HABILITADO
 *    - Botão "Editar" está HABILITADO na visualização
 *    
 * ✅ Admin
 *    - Acesso COMPLETO (visualizar + gerenciar + deletar)
 *    - Botão "Deletar" está HABILITADO
 *    - Mensagem indicando acesso admin
 * 
 * ========================================
 * 2. ROW LEVEL SECURITY (RLS) - Backend
 * ========================================
 * 
 * ✅ SELECT (can_view_notas_fiscais)
 *    - Admin pode ver todas as notas
 *    - Colaborador com visualizar=true pode ver
 *    - Colaborador sem permissão: erro RLS
 *    
 * ✅ INSERT (can_manage_notas_fiscais)
 *    - Admin pode inserir
 *    - Colaborador com gerenciar=true pode inserir
 *    - Colaborador sem permissão: erro RLS
 *    
 * ✅ UPDATE (can_manage_notas_fiscais)
 *    - Admin pode editar
 *    - Colaborador com gerenciar=true pode editar
 *    - Colaborador sem permissão: erro RLS
 *    
 * ✅ DELETE (apenas admin)
 *    - Admin pode deletar
 *    - Colaborador não pode deletar (mesmo com gerenciar=true)
 * 
 * ========================================
 * 3. DADOS & IMPORTAÇÃO
 * ========================================
 * 
 * ✅ Importação de Excel
 *    - Somente usuários com gerenciar=true ou admin podem importar
 *    - Validação de colunas obrigatórias
 *    - Conversão correta de datas (DD/MM/YYYY → YYYY-MM-DD)
 *    - Tratamento de erros adequado
 *    
 * ✅ Datas
 *    - Formato: YYYY-MM-DD (ISO 8601)
 *    - Conversão de Excel funciona
 *    - Datas vazias são NULL
 *    
 * ✅ Valores
 *    - Números com 2 casas decimais
 *    - Conversão de string para float
 *    - NULL para valores vazios
 * 
 * ========================================
 * 4. TESTES MANUAIS
 * ========================================
 * 
 * Cenário 1: Usuário SEM permissão
 * --------------------------------
 * 1. Fazer login com usuário sem permissão em notas_fiscais_permissoes
 * 2. Verificar se:
 *    - Aba "Notas Fiscais" NÃO aparece no menu
 *    - Se tentar acessar /notas-fiscais direto, vê mensagem de acesso negado
 *    - Tenta fazer query ao supabase: erro RLS
 * 
 * Cenário 2: Usuário COM permissão (apenas visualizar)
 * --------------------------------------------------
 * 1. Fazer login com usuário que tem visualizar=true, gerenciar=false
 * 2. Verificar se:
 *    - Aba "Notas Fiscais" aparece no menu
 *    - Consegue ver a listagem de notas
 *    - Consegue abrir visualização de uma nota
 *    - Botão "Nova Nota Fiscal" está desabilitado
 *    - Botão "Importar Excel" está desabilitado
 *    - Botão "Editar" está desabilitado
 *    - Tenta editar via console: erro RLS
 * 
 * Cenário 3: Usuário COM permissão (visualizar + gerenciar)
 * -------------------------------------------------------
 * 1. Fazer login com usuário que tem visualizar=true, gerenciar=true
 * 2. Verificar se:
 *    - Aba "Notas Fiscais" aparece no menu
 *    - Consegue ver a listagem de notas
 *    - Botão "Nova Nota Fiscal" está HABILITADO
 *    - Botão "Importar Excel" está HABILITADO
 *    - Consegue editar uma nota
 *    - Tenta deletar via console: erro RLS (apenas admin pode)
 * 
 * Cenário 4: Admin
 * ----------------
 * 1. Fazer login com usuário admin
 * 2. Verificar se:
 *    - Aba "Notas Fiscais" aparece no menu
 *    - Consegue ver a listagem de notas
 *    - Botão "Nova Nota Fiscal" está HABILITADO
 *    - Botão "Importar Excel" está HABILITADO
 *    - Botão "Editar" está HABILITADO
 *    - Botão "Deletar" está HABILITADO
 *    - Consegue editar uma nota
 *    - Consegue deletar uma nota
 * 
 * ========================================
 * 5. TESTES VIA SQL (Supabase Console)
 * ========================================
 * 
 * Teste 1: Verificar se RLS está habilitado
 * -----------------------------------------
 * SELECT * FROM pg_tables
 * WHERE tablename = 'notas_fiscais' AND schemaname = 'public';
 * 
 * -- Deve mostrar row_security = true
 * 
 * Teste 2: Listar policies
 * -----------------------
 * SELECT * FROM pg_policies
 * WHERE tablename IN ('notas_fiscais', 'notas_fiscais_permissoes');
 * 
 * Teste 3: Testar função can_view_notas_fiscais()
 * -----------------------------------------------
 * -- Conectar como admin
 * SELECT public.can_view_notas_fiscais();  -- Deve retornar true
 * 
 * -- Conectar como colaborador sem permissão
 * SELECT public.can_view_notas_fiscais();  -- Deve retornar false
 * 
 * -- Conectar como colaborador com permissão
 * SELECT public.can_view_notas_fiscais();  -- Deve retornar true
 * 
 * ========================================
 * 6. PONTOS DE ATENÇÃO
 * ========================================
 * 
 * ⚠️ Verificar se auth.uid() está correto no contexto RLS
 * ⚠️ Verificar se private.has_role() funciona corretamente
 * ⚠️ Verificar se as triggers de updated_at estão funcionando
 * ⚠️ Testar com diferentes navegadores/incógnito
 * ⚠️ Testar refresh de token após longa inatividade
 * ⚠️ Testar importação com arquivo corrompido
 * ⚠️ Testar importação com 1000+ linhas
 * ⚠️ Verificar performance de query com filtros
 * 
 * ========================================
 * 7. SCRIPT DE TESTE RÁPIDO (Console do Navegador)
 * ========================================
 */

export const SECURITY_CHECKLIST = [
  {
    category: "Autenticação",
    tests: [
      "Usuário não autenticado é redirecionado para /auth",
      "Usuário autenticado sem permissão vê mensagem de acesso negado",
      "Usuário com permissão consegue visualizar a listagem",
    ],
  },
  {
    category: "Autorização",
    tests: [
      "Usuário com visualizar=false não consegue ver notas",
      "Usuário com visualizar=true consegue ver notas",
      "Usuário com gerenciar=false não consegue editar",
      "Usuário com gerenciar=true consegue editar",
      "Apenas admin consegue deletar",
    ],
  },
  {
    category: "RLS Backend",
    tests: [
      "SELECT policy funciona corretamente",
      "INSERT policy funciona corretamente",
      "UPDATE policy funciona corretamente",
      "DELETE policy funciona corretamente",
    ],
  },
  {
    category: "Importação",
    tests: [
      "Arquivo Excel válido é importado corretamente",
      "Datas são convertidas corretamente",
      "Erros de arquivo são tratados",
      "Somente autorizados conseguem importar",
    ],
  },
];

/**
 * VERIFICAÇÃO RÁPIDA VIA SUPABASE CONSOLE
 * 
 * 1. Ir para SQL Editor no Supabase
 * 2. Executar:
 */

const TEST_QUERIES = {
  check_rls_enabled: `
    SELECT 
      schemaname,
      tablename,
      rowsecurity
    FROM pg_tables 
    WHERE tablename IN ('notas_fiscais', 'notas_fiscais_permissoes');
  `,
  
  check_policies: `
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      cmd
    FROM pg_policies
    WHERE tablename IN ('notas_fiscais', 'notas_fiscais_permissoes')
    ORDER BY tablename, policyname;
  `,
  
  check_user_permissions: `
    SELECT 
      user_id,
      visualizar,
      gerenciar,
      created_at
    FROM public.notas_fiscais_permissoes
    WHERE user_id = auth.uid();
  `,
  
  check_admin_role: `
    SELECT 
      user_id,
      role
    FROM public.user_roles
    WHERE user_id = auth.uid();
  `,
};

/**
 * ESTRUTURA ESPERADA DE PERMISSÕES
 * 
 * Tabela: notas_fiscais_permissoes
 * 
 * Usuário Admin:
 * - Não precisa estar na tabela
 * - Funções RLS verificam private.has_role('admin') primeiro
 * 
 * Colaborador:
 * - Deve ter uma linha em notas_fiscais_permissoes
 * - Coluna "visualizar" = true para poder ler
 * - Coluna "gerenciar" = true para poder editar/criar
 * 
 * Exemplo de dados:
 * 
 * | id | user_id | visualizar | gerenciar | created_at |
 * |----|---------|------------|-----------|----|
 * | 1  | uuid-1  | true       | false     | now |
 * | 2  | uuid-2  | true       | true      | now |
 */
