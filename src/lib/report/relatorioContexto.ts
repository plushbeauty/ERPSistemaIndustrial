import { supabase } from '../supabaseClient'

/*
 * SYSNQRA ERP INDUSTRIAL — contexto de cabeçalho dos relatórios profissionais
 *
 * Ordem geral do proprietário (2026-11-05, item 5): todo relatório impresso precisa de
 * "Logo oficial do SYSNQRA e identificação da empresa", "Data e hora de emissão",
 * "Responsável pela emissão" e "Identificação da empresa e, quando aplicável, da unidade".
 * Estas quatro informações vêm do banco, nunca de texto fixo no componente.
 *
 * Colunas usadas — todas provadas em migrations e já selecionadas por telas existentes
 * (src/components/CompanySettings.tsx:21 e src/pages/DashboardComercial.tsx:118):
 *   erp_empresas: razao_social, nome_fantasia, cnpj, endereco, cidade, uf, telefone, email,
 *                logo_impressao_url, logo_url, cabecalho_relatorios, rodape_relatorios
 *   erp_usuarios: nome, email, perfil
 * Nada aqui pede coluna sem confirmação (regra aprendida no HTTP 400 / 42703 de erp_usuarios).
 */

export type ContextoRelatorio = {
  empresaId: string | null
  empresaNome: string
  empresaRazao: string | null
  empresaCnpj: string | null
  empresaEndereco: string | null
  empresaCidadeUf: string | null
  empresaContato: string | null
  logoUrl: string | null
  cabecalho: string | null
  rodape: string | null
  emitenteNome: string
  emitentePerfil: string | null
  unidade: string | null
}

let cache: ContextoRelatorio | null = null
let promesa: Promise<ContextoRelatorio> | null = null

function texto(valor: unknown): string | null {
  const s = String(valor ?? '').trim()
  return s ? s : null
}

function local(texto: string | null): string | null {
  return texto ? texto.replace(/[|·]\s*$/u, '').trim() || null : null
}

export function limparCacheContextoRelatorio(): void {
  cache = null
  promesa = null
}

export async function carregarContextoRelatorio(): Promise<ContextoRelatorio> {
  if (cache) return cache
  if (promesa) return promesa

  promesa = (async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError || !auth.user) throw new Error('Sem sessão autenticada: não é possível identificar o responsável pela emissão do relatório.')

    const { data: usuario, error: usuarioError } = await supabase
      .from('erp_usuarios')
      .select('id,empresa_id,nome,email,perfil,setor_id')
      .eq('auth_user_id', auth.user.id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .maybeSingle()
    if (usuarioError) throw new Error(`Não foi possível identificar o emissor no banco: ${usuarioError.message}`)
    if (!usuario) throw new Error('O usuário autenticado não está vinculado ao ERP; o relatório não será emitido sem responsável identificado.')

    const empresaId = texto(usuario.empresa_id)
    let empresa: Record<string, unknown> | null = null

    if (empresaId) {
      const { data, error } = await supabase
        .from('erp_empresas')
        .select('id,razao_social,nome_fantasia,cnpj,endereco,cidade,uf,telefone,email,logo_url,logo_impressao_url,cabecalho_relatorios,rodape_relatorios')
        .eq('id', empresaId)
        .maybeSingle()
      if (error) throw new Error(`Não foi possível ler a identificação da empresa no banco: ${error.message}`)
      empresa = data as Record<string, unknown> | null
    }

    // Unidade: vem do setor do usuário quando o banco tem o vínculo; nunca é inventada.
    let unidade: string | null = null
    const setorId = texto(usuario.setor_id)
    if (setorId) {
      const { data: setor } = await supabase
        .from('erp_setores')
        .select('nome')
        .eq('id', setorId)
        .maybeSingle()
      unidade = local(texto(setor?.nome))
    }

    const cidade = texto(empresa?.cidade)
    const uf = texto(empresa?.uf)

    const contexto: ContextoRelatorio = {
      empresaId,
      empresaNome: texto(empresa?.nome_fantasia) ?? texto(empresa?.razao_social) ?? 'SYSNQRA',
      empresaRazao: texto(empresa?.razao_social),
      empresaCnpj: texto(empresa?.cnpj),
      empresaEndereco: texto(empresa?.endereco),
      empresaCidadeUf: cidade ? `${cidade}${uf ? ' / ' + uf : ''}` : uf,
      empresaContato: [texto(empresa?.telefone), texto(empresa?.email)].filter(Boolean).join(' · ') || null,
      logoUrl: texto(empresa?.logo_impressao_url) ?? texto(empresa?.logo_url),
      cabecalho: texto(empresa?.cabecalho_relatorios),
      rodape: texto(empresa?.rodape_relatorios),
      emitenteNome: texto(usuario.nome) ?? texto(usuario.email) ?? 'Não identificado',
      emitentePerfil: texto(usuario.perfil),
      unidade,
    }

    cache = contexto
    return contexto
  })()

  try {
    return await promesa
  } finally {
    promesa = null
  }
}
