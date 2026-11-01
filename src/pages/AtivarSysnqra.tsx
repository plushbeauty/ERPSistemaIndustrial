/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-ONBOARDING-20261101-01 — assistente público de ativação em 3 etapas
 * @STATUS_APROVACAO: IMPLEMENTAÇÃO DA MISSÃO DE ONBOARDING AUTORIZADA PELO PROPRIETÁRIO EM 2026-11-01
 *
 * Ativação pública do SYSNQRA ERP & SGQ INDUSTRIAL.
 * Etapa 1 escolha (teste grátis de 15 dias ou contratação), etapa 2 empresa
 * (logo, CNPJ com consulta, endereço, responsável, acesso) e etapa 3
 * infraestrutura (nuvem ou servidor local). O provisionamento acontece na
 * Edge Function erp-onboarding-activate: nada aqui declara sucesso antes da
 * resposta do Supabase, e nada aqui concede privilégio Master.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2, Cloud, Clock3, CreditCard,
  Eye, EyeOff, HardDrive, Loader2, MapPin, Search, ShieldCheck, Upload, UserRound,
} from 'lucide-react'
import { readEdgeFunctionError, readEdgeFunctionMessage, supabase, supabaseConfigurado } from '../lib/supabaseClient'
import '../styles/ativar-sysnqra-20261101.css'

type Plano = { codigo: string; nome: string; preco_mensal: number | null; descricao: string | null }
type Modo = 'trial' | 'pago'
type Infra = 'nuvem' | 'local'

type AtivacaoResultado = {
  ok: boolean
  empresa: { id: string; nome_fantasia: string; logo_url: string | null }
  acesso: { nome_acesso: string; email: string }
  plano: { codigo: string; nome: string; status: string }
  modo: Modo
  trial: { iniciado_em: string; termina_em: string; dias: number } | null
  infraestrutura: { tipo: Infra; status: string; storage_provider: string; pastas: number; hostname: string | null; diretorio: string | null }
  proximos_passos: string[]
  aviso_pagamento: string | null
}

const digitos = (v: string) => v.replace(/\D/g, '')

const mascaraCnpj = (v: string) => digitos(v).slice(0, 14)
  .replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')

const mascaraCep = (v: string) => digitos(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')

const mascaraTelefone = (v: string) => {
  const d = digitos(v).slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

const moeda = (valor: number | null) => {
  const n = Number(valor)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }) : 'Sob consulta'
}

const dataCurta = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const PASSOS = [
  { numero: 1, titulo: 'Como começar', descricao: 'Teste grátis de 15 dias ou contratação de plano', Icon: CreditCard },
  { numero: 2, titulo: 'Dados da empresa', descricao: 'Logotipo, CNPJ, endereço e responsável', Icon: Building2 },
  { numero: 3, titulo: 'Onde vai funcionar', descricao: 'Servidor em nuvem ou computador da empresa', Icon: Cloud },
]

const PASTAS_ANUNCIADAS = ['Logo','Produtos','Engenharia','Desenhos técnicos','Fotos','Qualidade','RNC','Inspeções','Compras','Vendas','Estoque','PCP','Produção','Manutenção','RH','Financeiro','Documentos','Anexos','Backup']

export default function AtivarSysnqra() {
  const parametros = useMemo(() => new URLSearchParams(window.location.search), [])
  const planoDaUrl = parametros.get('plano') ?? ''
  const moduloDaUrl = parametros.get('modulo') ?? ''

  const chaveRef = useRef(crypto.randomUUID())
  const [passo, setPasso] = useState(1)
  const [modo, setModo] = useState<Modo>(parametros.get('modo') === 'pago' ? 'pago' : 'trial')
  const [planos, setPlanos] = useState<Plano[]>([])
  const [planoCodigo, setPlanoCodigo] = useState(planoDaUrl || 'profissional')
  const [carregandoPlanos, setCarregandoPlanos] = useState(true)
  const [falhaPlanos, setFalhaPlanos] = useState('')

  const [empresa, setEmpresa] = useState({
    tipo_documento: 'CNPJ' as 'CNPJ' | 'CPF',
    documento: '', razao_social: '', nome_fantasia: '', inscricao_estadual: '',
    cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    telefone: '', whatsapp: '', email: '',
  })
  const [responsavel, setResponsavel] = useState({ nome: '', email: '', telefone: '' })
  const [acesso, setAcesso] = useState({ nome_acesso: '', senha: '', confirmar: '' })
  const [verSenha, setVerSenha] = useState(false)

  const [logo, setLogo] = useState<{ preview: string | null; base64: string | null; tipo: string | null; nome: string | null }>({ preview: null, base64: null, tipo: null, nome: null })
  const [falhaLogo, setFalhaLogo] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [infra, setInfra] = useState<{ tipo: Infra; hostname: string; diretorio: string }>({ tipo: 'nuvem', hostname: '', diretorio: '' })

  const [consultando, setConsultando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<AtivacaoResultado | null>(null)

  useEffect(() => {
    let vivo = true
    async function carregarPlanos() {
      if (!supabaseConfigurado) {
        setCarregandoPlanos(false)
        setFalhaPlanos('O ambiente do ERP não está configurado. Configure VITE_SUPABASE_URL e a chave pública no ambiente.')
        return
      }
      const { data, error } = await supabase
        .from('erp_planos_catalogo')
        .select('codigo,nome,preco_mensal,descricao')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
      if (!vivo) return
      if (error) {
        setFalhaPlanos('Não foi possível carregar o catálogo de planos do banco: ' + error.message)
      } else {
        setPlanos((data ?? []) as Plano[])
      }
      setCarregandoPlanos(false)
    }
    void carregarPlanos()
    return () => { vivo = false }
  }, [])

  const planoSelecionado = planos.find(p => p.codigo === planoCodigo) ?? null
  const precoExibido = modo === 'trial' ? 0 : (planoSelecionado?.preco_mensal ?? null)
  const nomeExibicao = empresa.nome_fantasia || empresa.razao_social

  function atualizar<K extends keyof typeof empresa>(campo: K, valor: string) {
    setEmpresa(atual => ({ ...atual, [campo]: valor }))
  }

  function definirDocumento(v: string) {
    atualizar('documento', empresa.tipo_documento === 'CNPJ' ? mascaraCnpj(v) : digitos(v).slice(0, 11))
  }

  async function consultarCnpj() {
    setErros({})
    setAviso('')
    const cnpj = digitos(empresa.documento)
    if (cnpj.length !== 14) {
      setErros({ documento: 'Informe o CNPJ completo com 14 dígitos.' })
      return
    }
    setConsultando(true)
    try {
      const { data, error } = await supabase.functions.invoke('consultar-cnpj', { body: { cnpj } })
      if (error) throw new Error((await readEdgeFunctionMessage(error)) ?? 'A consulta de CNPJ falhou agora. Preencha os dados manualmente.')
      const registro = (data ?? {}) as Record<string, unknown>
      const texto = (v: unknown) => String(v ?? '')
      if (!texto(registro.razao_social)) throw new Error('A Receita não retornou este CNPJ. Confira os dígitos ou preencha manualmente.')

      setEmpresa(atual => ({
        ...atual,
        razao_social: texto(registro.razao_social) || atual.razao_social,
        nome_fantasia: texto(registro.nome_fantasia) || atual.nome_fantasia,
        cep: texto(registro.cep) || atual.cep,
        endereco: texto(registro.logradouro) || atual.endereco,
        numero: texto(registro.numero) || atual.numero,
        complemento: texto(registro.complemento) || atual.complemento,
        bairro: texto(registro.bairro) || atual.bairro,
        cidade: texto(registro.cidade) || atual.cidade,
        uf: texto(registro.uf) || atual.uf,
        telefone: texto(registro.telefone) ? mascaraTelefone(texto(registro.telefone)) : atual.telefone,
        email: texto(registro.email) || atual.email,
      }))
      const situacao = texto(registro.situacao_cadastral)
      setAviso(
        situacao && !/ativa/i.test(situacao)
          ? `CNPJ localizado, mas a situação cadastral informada pela Receita é "${situacao}". Confira antes de continuar.`
          : 'Dados da Receita preenchidos. Revise e corrija o que for necessário.',
      )
      if (!acesso.nome_acesso) {
        setAcesso(atual => ({ ...atual, nome_acesso: (texto(registro.nome_fantasia) || texto(registro.razao_social)).trim().split(/\s+/)[0] || '' }))
      }
    } catch (erro) {
      setAviso('')
      setErros({ documento: erro instanceof Error ? erro.message : 'Não foi possível consultar o CNPJ agora.' })
    } finally {
      setConsultando(false)
    }
  }

  async function consultarCep() {
    const cep = digitos(empresa.cep)
    if (cep.length !== 8) {
      setErros({ cep: 'Informe o CEP com 8 dígitos.' })
      return
    }
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const dados = await resposta.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
      if (dados.erro) {
        setErros({ cep: 'CEP não localizado na consulta pública.' })
        return
      }
      setErros(atual => { const { cep: _omitido, ...resto } = atual; return resto })
      setEmpresa(atual => ({
        ...atual,
        endereco: atual.endereco || dados.logradouro || '',
        bairro: atual.bairro || dados.bairro || '',
        cidade: atual.cidade || dados.localidade || '',
        uf: atual.uf || dados.uf || '',
      }))
    } catch {
      setErros({ cep: 'A consulta de CEP está indisponível. Preencha o endereço manualmente.' })
    }
  }

  function aoEscolherLogo(arquivo: File | undefined) {
    setFalhaLogo('')
    if (!arquivo) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type)) {
      setFalhaLogo('Envie o logotipo em PNG, JPG ou WebP.')
      return
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      setFalhaLogo('O logotipo deve ter no máximo 2 MB.')
      return
    }
    const leitor = new FileReader()
    leitor.onload = () => {
      const conteudo = String(leitor.result ?? '')
      const virgula = conteudo.indexOf(',')
      setLogo({
        preview: conteudo,
        base64: virgula >= 0 ? conteudo.slice(virgula + 1) : conteudo,
        tipo: arquivo.type,
        nome: arquivo.name,
      })
    }
    leitor.onerror = () => setFalhaLogo('Não foi possível ler o arquivo escolhido.')
    leitor.readAsDataURL(arquivo)
  }

  function validarPasso1() {
    const erros: Record<string, string> = {}
    if (modo === 'pago' && !planoSelecionado) erros.plano = 'Selecione um plano do catálogo.'
    return erros
  }

  function validarPasso2() {
    const erros: Record<string, string> = {}
    if (digitos(empresa.documento).length !== (empresa.tipo_documento === 'CNPJ' ? 14 : 11)) {
      erros.documento = empresa.tipo_documento === 'CNPJ' ? 'CNPJ incompleto.' : 'CPF incompleto.'
    }
    if (empresa.razao_social.trim().length < 3) erros.razao_social = 'Informe a razão social.'
    if (empresa.nome_fantasia.trim().length < 2) erros.nome_fantasia = 'Informe o nome fantasia.'
    if (digitos(empresa.cep).length !== 8) erros.cep = 'Informe o CEP.'
    if (!empresa.endereco.trim()) erros.endereco = 'Informe o logradouro.'
    if (!empresa.bairro.trim()) erros.bairro = 'Informe o bairro.'
    if (!empresa.cidade.trim()) erros.cidade = 'Informe a cidade.'
    if (!empresa.uf) erros.uf = 'UF'
    if (digitos(empresa.telefone).length < 10) erros.telefone = 'Informe o telefone com DDD.'
    if (!/^\S+@\S+\.\S+$/.test(empresa.email.trim())) erros.email = 'Informe o e-mail empresarial.'
    if (responsavel.nome.trim().length < 3) erros.responsavel_nome = 'Informe o nome do responsável.'
    if (!/^\S+@\S+\.\S+$/.test(responsavel.email.trim())) erros.responsavel_email = 'Informe o e-mail do responsável.'
    if (digitos(responsavel.telefone).length < 10) erros.responsavel_telefone = 'Informe o telefone do responsável.'
    if (!acesso.nome_acesso.trim()) erros.nome_acesso = 'Defina o nome de acesso da empresa.'
    if (acesso.senha.length < 8) erros.senha_acesso = 'A senha de acesso deve ter pelo menos 8 caracteres.'
    else if (!/[a-zA-Z]/.test(acesso.senha) || !/[0-9]/.test(acesso.senha)) erros.senha_acesso = 'Combine letras e números na senha de acesso.'
    if (acesso.senha !== acesso.confirmar) erros.confirmar = 'As senhas não conferem.'
    return erros
  }

  function validarPasso3() {
    const erros: Record<string, string> = {}
    if (infra.tipo === 'local') {
      if (!infra.hostname.trim()) erros.infra_hostname = 'Identifique o computador ou servidor que hospedará o sistema.'
      const raiz = infra.diretorio.trim()
      if (!raiz) erros.infra_diretorio = 'Informe o diretório raiz dos documentos.'
      else if (!/^[a-z]:[\\/].{2,}$/i.test(raiz) && !/^\/[^\s]{2,}$/.test(raiz)) erros.infra_diretorio = 'Use um caminho absoluto (ex.: D:\\SYSNQRA ou /srv/sysnqra).'
    }
    return erros
  }

  function avancar() {
    setErroGeral('')
    const validacao = passo === 1 ? validarPasso1() : passo === 2 ? validarPasso2() : validarPasso3()
    setErros(validacao)
    if (Object.keys(validacao).length) return
    if (passo < 3) setPasso(atual => (atual + 1) as 1 | 2 | 3)
    else void ativar()
  }

  async function ativar() {
    if (!supabaseConfigurado) {
      setErroGeral('O ambiente do ERP não está configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.')
      return
    }
    setEnviando(true)
    setErroGeral('')
    try {
      const corpo = {
        chave_idempotencia: chaveRef.current,
        modo,
        plano_codigo: planoCodigo,
        modulo: moduloDaUrl,
        origem: 'assistente_ativacao',
        logo_base64: logo.base64,
        logo_tipo: logo.tipo,
        empresa: {
          tipo_documento: empresa.tipo_documento,
          documento: digitos(empresa.documento),
          razao_social: empresa.razao_social.trim(),
          nome_fantasia: empresa.nome_fantasia.trim(),
          inscricao_estadual: empresa.inscricao_estadual.trim(),
          cep: digitos(empresa.cep),
          endereco: empresa.endereco.trim(),
          numero: empresa.numero.trim(),
          complemento: empresa.complemento.trim(),
          bairro: empresa.bairro.trim(),
          cidade: empresa.cidade.trim(),
          uf: empresa.uf,
          telefone: digitos(empresa.telefone),
          whatsapp: digitos(empresa.whatsapp),
          email: empresa.email.trim().toLowerCase(),
        },
        responsavel: {
          nome: responsavel.nome.trim(),
          email: responsavel.email.trim().toLowerCase(),
          telefone: digitos(responsavel.telefone),
        },
        acesso: { nome_acesso: acesso.nome_acesso.trim(), senha: acesso.senha },
        infraestrutura: { tipo: infra.tipo, hostname: infra.hostname.trim(), diretorio_raiz: infra.diretorio.trim() },
      }

      const { data, error } = await supabase.functions.invoke('erp-onboarding-activate', { body: corpo })
      if (error) {
        const { message, campos } = await readEdgeFunctionError(error)
        chaveRef.current = crypto.randomUUID()
        setErroGeral(message ?? 'Não foi possível concluir a ativação agora.')
        const chaves = Object.keys(campos)
        if (chaves.length) {
          const errosServidor = { ...campos }
          if (errosServidor.plano_codigo) { errosServidor.plano = errosServidor.plano_codigo; delete errosServidor.plano_codigo }
          setErros(errosServidor)
          const noPasso3 = chaves.some(campo => campo.startsWith('infra') || campo === 'infraestrutura')
          const noPasso1 = chaves.some(campo => campo === 'modo' || campo === 'plano' || campo === 'plano_codigo')
          setPasso(noPasso3 ? 3 : noPasso1 ? 1 : 2)
        } else {
          setPasso((message ?? '').toLowerCase().includes('cnpj') ? 2 : passo)
        }
        window.scrollTo({ top: 0 })
        return
      }
      setResultado(data as AtivacaoResultado)
      window.scrollTo({ top: 0 })
    } catch (erro) {
      chaveRef.current = crypto.randomUUID()
      setErroGeral(erro instanceof Error ? erro.message : 'Falha inesperada na ativação.')
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <main className="sxv-page sxv-conclusion">
        <div className="sxv-conclusion-card">
          <span className="sxv-kicker">{resultado.modo === 'trial' ? 'AMBIENTE DE TESTE LIBERADO' : 'SOLICITAÇÃO REGISTRADA'}</span>
          <h1>{resultado.empresa.nome_fantasia}</h1>
          <p className="sxv-conclusion-lead">
            {resultado.modo === 'trial'
              ? 'Sua empresa foi criada no banco, o primeiro administrador foi vinculado e o teste de 15 dias começou a contar pelo relógio do servidor.'
              : 'Sua empresa foi criada e o plano escolhido foi registrado. A ativação paga depende da confirmação real do pagamento — nada foi cobrado ou simulado nesta etapa.'}
          </p>

          <div className="sxv-summary">
            {logo.preview && <img className="sxv-summary-logo" src={resultado.empresa.logo_url ?? logo.preview} alt={`Logotipo de ${resultado.empresa.nome_fantasia}`} />}
            <dl>
              <div><dt>NOME DE ACESSO</dt><dd>{resultado.acesso.nome_acesso}</dd></div>
              <div><dt>E-MAIL DO ADMINISTRADOR</dt><dd>{resultado.acesso.email}</dd></div>
              <div><dt>PLANO</dt><dd>{resultado.plano.nome} · {resultado.plano.status}</dd></div>
              {resultado.trial && <div><dt>TESTE ATÉ</dt><dd>{dataCurta(resultado.trial.termina_em)}</dd></div>}
              <div><dt>INFRAESTRUTURA</dt><dd>{resultado.infraestrutura.tipo === 'nuvem' ? 'Servidor em nuvem' : 'Servidor local'} · {resultado.infraestrutura.status === 'provisionado' ? `${resultado.infraestrutura.pastas} pastas lógicas provisionadas` : 'aguardando agente de instalação'}</dd></div>
            </dl>
          </div>

          {resultado.aviso_pagamento && <div className="sxv-notice">{resultado.aviso_pagamento}</div>}

          <ol className="sxv-next-steps">
            {resultado.proximos_passos.map((passo, i) => <li key={passo}><b>{String(i + 1).padStart(2, '0')}</b>{passo}</li>)}
          </ol>

          <div className="sxv-conclusion-actions">
            <a className="sxv-btn sxv-btn-primary" href="/login">Entrar no SYSNQRA <ArrowRight size={16} /></a>
            <a className="sxv-btn sxv-btn-ghost" href="/">Voltar ao site</a>
          </div>
          <small className="sxv-watermark">FernandoSch_System · 2026 · dados gravados por erp-onboarding-activate</small>
        </div>
      </main>
    )
  }

  return (
    <main className="sxv-page">
      <header className="sxv-topbar">
        <a href="/" aria-label="SYSNQRA ERP &amp; SGQ INDUSTRIAL"><img src="/logo/logo.png" alt="SYSNQRA ERP &amp; SGQ INDUSTRIAL" /></a>
        <div className="sxv-topbar-actions">
          <span className="sxv-secure"><ShieldCheck size={15} /> Conexão com o Supabase</span>
          <a className="sxv-btn sxv-btn-ghost" href="/login">Já tenho acesso</a>
        </div>
      </header>

      <div className="sxv-shell">
        <aside className="sxv-rail">
          <div className="sxv-rail-head">
            <span className="sxv-kicker">ATIVAÇÃO DE AMBIENTE</span>
            <h2>Ative seu SYSNQRA</h2>
            <p>Sua indústria conectada começa aqui.</p>
          </div>
          <ol className="sxv-steps">
            {PASSOS.map(item => {
              const Icon = item.Icon
              const estado = passo === item.numero ? 'atual' : passo > item.numero ? 'concluido' : 'futuro'
              return (
                <li key={item.numero} className={`sxv-step is-${estado}`}>
                  <span className="sxv-step-icon">{estado === 'concluido' ? <CheckCircle2 size={18} /> : <Icon size={18} />}</span>
                  <div>
                    <strong>Etapa {item.numero} · {item.titulo}</strong>
                    <small>{item.descricao}</small>
                  </div>
                </li>
              )
            })}
          </ol>
          <div className="sxv-rail-foot">
            <BadgeCheck size={16} />
            <span>O primeiro usuário recebe administração da própria empresa. Nenhum acesso Master é criado no cadastro público.</span>
          </div>
        </aside>

        <section className="sxv-panel">
          <div className="sxv-panel-head">
            <span>ETAPA {passo} DE 3</span>
            {passo === 1 && <><h1>Escolha como começar</h1><p>Comece pelo teste completo de 15 dias ou contrate um plano do catálogo.</p></>}
            {passo === 2 && <><h1>Dados da empresa</h1><p>Consultamos o CNPJ na Receita e preenchemos o cadastro. Revise e corrija o que precisar.</p></>}
            {passo === 3 && <><h1>Onde o sistema vai funcionar?</h1><p>A escolha define armazenamento, permissões e backup — não é apenas visual.</p></>}
          </div>

          {erroGeral && <div className="sxv-error" role="alert">{erroGeral}</div>}

          {passo === 1 && (
            <div className="sxv-choice-grid">
              <button type="button" className={`sxv-choice ${modo === 'trial' ? 'is-on' : ''}`} onClick={() => setModo('trial')} aria-pressed={modo === 'trial'}>
                <span className="sxv-choice-icon"><Clock3 size={20} /></span>
                <strong>Teste grátis · 15 dias</strong>
                <small>Experimente o ERP completo antes de contratar. Sem cobrança durante o período experimental.</small>
                <em>{moeda(0)} por 15 dias</em>
              </button>
              <button type="button" className={`sxv-choice ${modo === 'pago' ? 'is-on' : ''}`} onClick={() => setModo('pago')} aria-pressed={modo === 'pago'}>
                <span className="sxv-choice-icon"><CreditCard size={20} /></span>
                <strong>Contratar um plano</strong>
                <small>Compra e ativação após a confirmação do pagamento.</small>
                <em>{planoSelecionado ? `${planoSelecionado.nome} · ${moeda(planoSelecionado.preco_mensal)}/mês` : 'Escolha o plano abaixo'}</em>
              </button>

              <div className="sxv-plans">
                <div className="sxv-field-label">Plano {modo === 'trial' ? 'de referência para o teste' : 'da contratação'}</div>
                {moduloDaUrl && <div className="sxv-notice">Módulo escolhido na comparação de planos: <strong>{moduloDaUrl}</strong>. Ele fica registrado na solicitação de ativação para a implantação.</div>}
                {carregandoPlanos && <div className="sxv-inline-loading"><Loader2 size={15} className="sxv-spin" /> Carregando catálogo do banco…</div>}
                {falhaPlanos && <div className="sxv-notice">{falhaPlanos}</div>}
                {!carregandoPlanos && !falhaPlanos && (
                  <div className="sxv-plan-list">
                    {planos.map(plano => (
                      <button key={plano.codigo} type="button" className={`sxv-plan ${planoCodigo === plano.codigo ? 'is-on' : ''}`} onClick={() => setPlanoCodigo(plano.codigo)} aria-pressed={planoCodigo === plano.codigo}>
                        <strong>{plano.nome}</strong>
                        <span>{plano.preco_mensal === null ? 'Sob consulta' : `${moeda(plano.preco_mensal)}/mês`}</span>
                        <small>{plano.descricao ?? plano.codigo}</small>
                        <code>{plano.codigo}</code>
                      </button>
                    ))}
                  </div>
                )}
                {erros.plano && <span className="sxv-field-error">{erros.plano}</span>}
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="sxv-form">
              <div className="sxv-section">
                <div className="sxv-section-title"><Upload size={15} /> Logotipo da empresa</div>
                <div className="sxv-logo-row">
                  <button type="button" className="sxv-logo-drop" onClick={() => logoInputRef.current?.click()}>
                    {logo.preview
                      ? <img src={logo.preview} alt="Pré-visualização do logotipo enviado" />
                      : <span><Upload size={20} /><small>Enviar PNG, JPG ou WebP · até 2 MB</small></span>}
                  </button>
                  <div className="sxv-logo-meta">
                    <p>{logo.nome ? `Arquivo: ${logo.nome}` : 'O logotipo aparece no login, nos relatórios e nos documentos fiscais da empresa.'}</p>
                    {falhaLogo && <span className="sxv-field-error">{falhaLogo}</span>}
                    {logo.preview && <button type="button" className="sxv-link" onClick={() => { setLogo({ preview: null, base64: null, tipo: null, nome: null }); setFalhaLogo('') }}>Remover logotipo</button>}
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => aoEscolherLogo(e.target.files?.[0])} />
                  </div>
                </div>
              </div>

              <div className="sxv-section">
                <div className="sxv-section-title"><Building2 size={15} /> Identificação fiscal</div>
                <div className="sxv-grid sxv-grid-3">
                  <label>Tipo de documento
                    <select value={empresa.tipo_documento} onChange={e => { setEmpresa(atual => ({ ...atual, tipo_documento: e.target.value as 'CNPJ' | 'CPF', documento: '' })); setAviso('') }}>
                      <option value="CNPJ">CNPJ (empresa)</option>
                      <option value="CPF">CPF (profissional)</option>
                    </select>
                  </label>
                  <label className="sxv-span-2">{empresa.tipo_documento}
                    <div className="sxv-with-button">
                      <input value={empresa.documento} onChange={e => definirDocumento(e.target.value)} inputMode="numeric" placeholder={empresa.tipo_documento === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'} autoComplete="off" />
                      {empresa.tipo_documento === 'CNPJ' && (
                        <button type="button" className="sxv-lookup" onClick={consultarCnpj} disabled={consultando}>
                          {consultando ? <Loader2 size={14} className="sxv-spin" /> : <Search size={14} />} Consultar CNPJ
                        </button>
                      )}
                    </div>
                    {erros.documento && <span className="sxv-field-error">{erros.documento}</span>}
                  </label>
                </div>
                {aviso && <div className="sxv-notice">{aviso}</div>}
                <div className="sxv-grid">
                  <label>Razão social<input value={empresa.razao_social} onChange={e => atualizar('razao_social', e.target.value)} autoComplete="organization" />{erros.razao_social && <span className="sxv-field-error">{erros.razao_social}</span>}</label>
                  <label>Nome fantasia<input value={empresa.nome_fantasia} onChange={e => atualizar('nome_fantasia', e.target.value)} autoComplete="organization" />{erros.nome_fantasia && <span className="sxv-field-error">{erros.nome_fantasia}</span>}</label>
                  <label>Inscrição estadual (se houver)<input value={empresa.inscricao_estadual} onChange={e => atualizar('inscricao_estadual', e.target.value)} autoComplete="off" /></label>
                </div>
              </div>

              <div className="sxv-section">
                <div className="sxv-section-title"><MapPin size={15} /> Endereço e contato</div>
                <div className="sxv-grid sxv-grid-4">
                  <label>CEP
                    <div className="sxv-with-button">
                      <input value={empresa.cep} onChange={e => atualizar('cep', mascaraCep(e.target.value))} inputMode="numeric" placeholder="00000-000" />
                      <button type="button" className="sxv-lookup" onClick={consultarCep} aria-label="Consultar CEP no ViaCEP"><Search size={14} /></button>
                    </div>
                    {erros.cep && <span className="sxv-field-error">{erros.cep}</span>}
                  </label>
                  <label className="sxv-span-2">Logradouro<input value={empresa.endereco} onChange={e => atualizar('endereco', e.target.value)} autoComplete="street-address" />{erros.endereco && <span className="sxv-field-error">{erros.endereco}</span>}</label>
                  <label>Número<input value={empresa.numero} onChange={e => atualizar('numero', e.target.value)} />{erros.numero && <span className="sxv-field-error">{erros.numero}</span>}</label>
                  <label>Complemento<input value={empresa.complemento} onChange={e => atualizar('complemento', e.target.value)} /></label>
                  <label>Bairro<input value={empresa.bairro} onChange={e => atualizar('bairro', e.target.value)} />{erros.bairro && <span className="sxv-field-error">{erros.bairro}</span>}</label>
                  <label>Cidade<input value={empresa.cidade} onChange={e => atualizar('cidade', e.target.value)} autoComplete="address-level2" />{erros.cidade && <span className="sxv-field-error">{erros.cidade}</span>}</label>
                  <label>UF
                    <select value={empresa.uf} onChange={e => atualizar('uf', e.target.value)}>
                      <option value="">Selecione</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                    {erros.uf && <span className="sxv-field-error">{erros.uf}</span>}
                  </label>
                  <label>Telefone<input value={empresa.telefone} onChange={e => atualizar('telefone', mascaraTelefone(e.target.value))} inputMode="tel" placeholder="(00) 0000-0000" />{erros.telefone && <span className="sxv-field-error">{erros.telefone}</span>}</label>
                  <label>WhatsApp<input value={empresa.whatsapp} onChange={e => atualizar('whatsapp', mascaraTelefone(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" />{erros.whatsapp && <span className="sxv-field-error">{erros.whatsapp}</span>}</label>
                  <label className="sxv-span-2">E-mail empresarial<input type="email" value={empresa.email} onChange={e => atualizar('email', e.target.value)} autoComplete="email" />{erros.email && <span className="sxv-field-error">{erros.email}</span>}</label>
                </div>
              </div>

              <div className="sxv-section">
                <div className="sxv-section-title"><UserRound size={15} /> Responsável e primeiro acesso</div>
                <div className="sxv-grid sxv-grid-3">
                  <label>Nome do responsável<input value={responsavel.nome} onChange={e => setResponsavel(atual => ({ ...atual, nome: e.target.value }))} autoComplete="name" />{erros.responsavel_nome && <span className="sxv-field-error">{erros.responsavel_nome}</span>}</label>
                  <label>E-mail do responsável<input type="email" value={responsavel.email} onChange={e => setResponsavel(atual => ({ ...atual, email: e.target.value }))} autoComplete="email" />{erros.responsavel_email && <span className="sxv-field-error">{erros.responsavel_email}</span>}</label>
                  <label>Telefone do responsável<input value={responsavel.telefone} onChange={e => setResponsavel(atual => ({ ...atual, telefone: mascaraTelefone(e.target.value) }))} inputMode="tel" />{erros.responsavel_telefone && <span className="sxv-field-error">{erros.responsavel_telefone}</span>}</label>
                </div>
                <div className="sxv-grid sxv-grid-3">
                  <label>Nome de acesso<input value={acesso.nome_acesso} onChange={e => setAcesso(atual => ({ ...atual, nome_acesso: e.target.value }))} placeholder={nomeExibicao ? nomeExibicao.split(/\s+/)[0] : 'ex.: industrial'} autoComplete="off" />{erros.nome_acesso && <span className="sxv-field-error">{erros.nome_acesso}</span>}</label>
                  <label>Senha de acesso
                    <div className="sxv-with-button">
                      <input type={verSenha ? 'text' : 'password'} value={acesso.senha} onChange={e => setAcesso(atual => ({ ...atual, senha: e.target.value }))} autoComplete="new-password" minLength={8} />
                      <button type="button" className="sxv-eye" aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVerSenha(v => !v)}>{verSenha ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    </div>
                    {erros.senha_acesso && <span className="sxv-field-error">{erros.senha_acesso}</span>}
                  </label>
                  <label>Confirmar senha<input type="password" value={acesso.confirmar} onChange={e => setAcesso(atual => ({ ...atual, confirmar: e.target.value }))} autoComplete="new-password" />{erros.confirmar && <span className="sxv-field-error">{erros.confirmar}</span>}</label>
                </div>
              </div>
            </div>
          )}

          {passo === 3 && (
            <div className="sxv-form">
              <div className="sxv-choice-grid sxv-choice-grid-2">
                <button type="button" className={`sxv-choice ${infra.tipo === 'nuvem' ? 'is-on' : ''}`} onClick={() => setInfra(atual => ({ ...atual, tipo: 'nuvem' }))} aria-pressed={infra.tipo === 'nuvem'}>
                  <span className="sxv-choice-icon"><Cloud size={20} /></span>
                  <strong>Servidor em nuvem <em className="sxv-recommended">recomendado</em></strong>
                  <small>Acesso remoto de qualquer unidade, armazenamento centralizado no Supabase, backup gerenciado e isolamento por empresa com RLS.</small>
                </button>
                <button type="button" className={`sxv-choice ${infra.tipo === 'local' ? 'is-on' : ''}`} onClick={() => setInfra(atual => ({ ...atual, tipo: 'local' }))} aria-pressed={infra.tipo === 'local'}>
                  <span className="sxv-choice-icon"><HardDrive size={20} /></span>
                  <strong>Computador / servidor local</strong>
                  <small>Infraestrutura dentro da empresa, com serviço de armazenamento e backup próprios. Indicado para plantas com rede restrita.</small>
                </button>
              </div>

              <div className="sxv-structure">
                <div className="sxv-section-title">Estrutura de arquivos da empresa</div>
                <p className="sxv-muted">Em <strong>nuvem</strong>, as pastas abaixo são registradas por tenant no Storage do Supabase com política de acesso por <code>empresa_id</code>. Em <strong>servidor local</strong>, a mesma estrutura é registrada como pendente do agente de instalação — o navegador não cria pastas no seu disco, e o sistema não finge que criou.</p>
                <ul className="sxv-folder-chips">
                  {PASTAS_ANUNCIADAS.map(pasta => <li key={pasta}>{pasta}</li>)}
                </ul>
              </div>

              {infra.tipo === 'local' && (
                <div className="sxv-section">
                  <div className="sxv-section-title"><HardDrive size={15} /> Máquina responsável</div>
                  <div className="sxv-grid">
                    <label>Computador ou servidor (hostname / IP)<input value={infra.hostname} onChange={e => setInfra(atual => ({ ...atual, hostname: e.target.value }))} placeholder="SRV-ERP-01" autoComplete="off" />{erros.infra_hostname && <span className="sxv-field-error">{erros.infra_hostname}</span>}</label>
                    <label>Diretório raiz dos documentos<input value={infra.diretorio} onChange={e => setInfra(atual => ({ ...atual, diretorio: e.target.value }))} placeholder="D:\SYSNQRA ou /srv/sysnqra" autoComplete="off" />{erros.infra_diretorio && <span className="sxv-field-error">{erros.infra_diretorio}</span>}</label>
                  </div>
                  <div className="sxv-notice">
                    Requisitos da instalação local: Windows Server ou Linux com serviço de armazenamento, pasta compartilhada com permissão de escrita para o serviço, backup diário fora da máquina e o agente SYSNQRA com permissões explícitas para criar a estrutura. A ativação registra a solicitação; o agente conclui a implantação.
                  </div>
                </div>
              )}

              <div className="sxv-summary-strip">
                <div><span>EMPRESA</span><strong>{nomeExibicao || '—'}</strong></div>
                <div><span>DOCUMENTO</span><strong>{digitos(empresa.documento) || '—'}</strong></div>
                <div><span>PLANO</span><strong>{modo === 'trial' ? `Teste 15 dias · ${planoSelecionado?.nome ?? planoCodigo}` : (planoSelecionado?.nome ?? '—')}</strong></div>
                <div><span>CUSTO INICIAL</span><strong>{precoExibido === 0 ? 'R$ 0,00' : moeda(precoExibido)}</strong></div>
              </div>
            </div>
          )}

          <footer className="sxv-actions">
            {passo > 1
              ? <button type="button" className="sxv-btn sxv-btn-ghost" onClick={() => { setErros({}); setErroGeral(''); setPasso(atual => (atual - 1) as 1 | 2 | 3) }}><ArrowLeft size={16} /> Voltar</button>
              : <a className="sxv-btn sxv-btn-ghost" href="/planos">Ver comparativo de planos</a>}
            <motion.button
              type="button"
              className="sxv-btn sxv-btn-primary"
              disabled={enviando || (passo === 1 && carregandoPlanos)}
              onClick={avancar}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              {enviando
                ? <><Loader2 size={16} className="sxv-spin" /> Ativando ambiente…</>
                : passo < 3 ? <>Continuar <ArrowRight size={16} /></> : <>{modo === 'trial' ? 'Começar meu teste grátis' : 'Ativar meu SYSNQRA'} <ArrowRight size={16} /></>}
            </motion.button>
          </footer>
          <p className="sxv-legal">Ao ativar, você concorda com a criação da empresa e do primeiro administrador no ambiente Supabase. Nenhum pagamento é processado nesta etapa.</p>
        </section>
      </div>
    </main>
  )
}
