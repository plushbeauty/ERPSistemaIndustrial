/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: FernandoSch
 * ID da Revisão: REV-062
 * Alterações: Converter tipo desconhecido de manutenção preventiva para texto antes de renderizar.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: FernandoSch
 * ID da Revisão: REV-045
 * Alterações: Proteger empresa_id nulo na apresentação do tenant.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowLeft, ArrowUpRight, CalendarDays, Clock3, FilePlus2, HelpCircle, LayoutDashboard, MoreHorizontal, Package, Pencil, Plus, RefreshCw, Search, Settings2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Field={key:string;label:string;type?:'text'|'number'|'date'|'email';required?:boolean}
type Module={name:string;title:string;description:string;icon:LucideIcon;table?:string;fields?:Field[]}
type Profile={nome:string;empresa_id:string|null;nivel_admin:number;is_master?:boolean;perfil?:string}
type Row=Record<string,unknown>&{id:string}

const sourceMap:Record<string,string>={
  Financeiro:'erp_contas_pagar',Fiscal:'erp_documentos_fiscais',Vendas:'erp_pedidos_venda',Compras:'erp_solicitacoes_compra',
  Almoxarifado:'erp_almoxarifados',Estoque:'erp_estoque_movimentos','Matéria-prima':'erp_estoque_movimentos',Expedição:'erp_expedicoes',
  Manutenção:'erp_manutencao',RPNC:'erp_rpnc',Auditorias:'erp_auditorias',Treinamentos:'erp_treinamentos',
  Calibração:'erp_equipamentos_calibracoes',Documentos:'erp_documentos_qualidade',OEE:'erp_pcp_paradas',
  Refugo:'erp_refugos_retrabalhos',Processos:'erp_ficha_operacoes',Engenharia:'erp_fichas_tecnicas',Máquinas:'erp_maquinas',
  'Moldes e Ferramentas':'erp_moldes',Produtos:'erp_produtos',Clientes:'erp_clientes',Fornecedores:'erp_fornecedores',
  Funcionários:'erp_funcionarios',RH:'erp_funcionarios',Qualidade:'erp_inspecoes','Ordens de Produção':'erp_ordens_producao',
  Apontamentos:'erp_producao_conferencias',Setup:'erp_pcp_paradas',Rastreabilidade:'erp_estoque_movimentos',Custos:'erp_financeiro_lancamentos',
  Relatórios:'erp_financeiro_lancamentos'
}

const fieldsMap:Record<string,Field[]>={
  erp_clientes:[
    {key:'nome',label:'Nome / Razão social',required:true},{key:'documento',label:'CPF / CNPJ'},{key:'email',label:'E-mail',type:'email'},
    {key:'telefone',label:'Telefone'},{key:'endereco',label:'Endereço'},{key:'cidade',label:'Cidade'},{key:'estado',label:'Estado'},{key:'tipo_cliente',label:'Tipo de cliente'}
  ],
  erp_produtos:[
    {key:'codigo',label:'Código',required:true},{key:'nome',label:'Descrição',required:true},{key:'codigo_barras',label:'Código de barras'},
    {key:'grupo',label:'Grupo'},{key:'subgrupo',label:'Subgrupo'},{key:'marca',label:'Marca'},{key:'unidade',label:'Unidade',required:true},
    {key:'unidade_compra',label:'Unidade de compra',required:true},{key:'unidade_venda',label:'Unidade de venda',required:true},{key:'categoria',label:'Categoria'},
    {key:'ncm',label:'NCM'},{key:'cest',label:'CEST'},{key:'preco_venda',label:'Preço de venda',type:'number'},
    {key:'estoque_maximo',label:'Estoque máximo',type:'number',required:true},{key:'ponto_reposicao',label:'Ponto de reposição',type:'number',required:true},
    {key:'peso_liquido',label:'Peso líquido',type:'number',required:true},{key:'peso_bruto',label:'Peso bruto',type:'number',required:true},
    {key:'comprimento_mm',label:'Comprimento (mm)',type:'number',required:true},{key:'largura_mm',label:'Largura (mm)',type:'number',required:true},
    {key:'altura_mm',label:'Altura (mm)',type:'number',required:true},{key:'observacoes',label:'Observações'}
  ],
  erp_contas_pagar:[
    {key:'descricao',label:'Descrição',required:true},{key:'documento',label:'Documento'},{key:'valor',label:'Valor',type:'number',required:true},
    {key:'vencimento',label:'Vencimento',type:'date',required:true},{key:'pagamento',label:'Pagamento',type:'date'},{key:'status',label:'Status',required:true}
  ],
  erp_documentos_fiscais:[
    {key:'tipo',label:'Tipo',required:true},{key:'modelo',label:'Modelo'},{key:'serie',label:'Série',type:'number'},{key:'numero',label:'Número',type:'number'},
    {key:'status',label:'Status',required:true},{key:'natureza_operacao',label:'Natureza da operação'},{key:'data_emissao',label:'Data de emissão',type:'date'},
    {key:'destinatario_nome',label:'Destinatário'},{key:'destinatario_documento',label:'Documento do destinatário'},{key:'valor_total',label:'Valor total',type:'number',required:true}
  ],
  erp_solicitacoes_compra:[
    {key:'descricao',label:'Material / necessidade',required:true},{key:'prioridade',label:'Prioridade',required:true},{key:'status',label:'Status',required:true},
    {key:'email_destino',label:'E-mail destino',type:'email'},{key:'observacoes',label:'Observações'}
  ],
  erp_almoxarifados:[{key:'codigo',label:'Código',required:true},{key:'nome',label:'Nome',required:true},{key:'tipo',label:'Tipo',required:true}],
  erp_estoque_movimentos:[
    {key:'produto_id',label:'Produto ID'},{key:'tipo',label:'Tipo de movimento',required:true},{key:'quantidade',label:'Quantidade',type:'number',required:true},
    {key:'origem',label:'Origem'},{key:'documento',label:'Documento'},{key:'ordem_producao_id',label:'OP ID'},{key:'pedido_venda_id',label:'Pedido de venda ID'},{key:'observacao',label:'Observação'}
  ],
  erp_expedicoes:[
    {key:'numero',label:'Número',type:'number',required:true},{key:'status',label:'Status',required:true},{key:'transportadora',label:'Transportadora'},
    {key:'rastreio',label:'Rastreio'},{key:'data_expedicao',label:'Data de expedição',type:'date'},{key:'observacoes',label:'Observações'}
  ],
  erp_manutencao:[{key:'maquina',label:'Máquina'},{key:'tipo',label:'Tipo',required:true},{key:'status',label:'Status',required:true},{key:'descricao',label:'Descrição'}],
  erp_rpnc:[{key:'numero_rpnc',label:'Número RPNC',required:true},{key:'descricao_nao_conformidade',label:'Não conformidade',required:true},{key:'acao_corretiva',label:'Ação corretiva'},{key:'status',label:'Status',required:true}],
  erp_auditorias:[{key:'auditor',label:'Auditor'},{key:'criterio',label:'Critério'},{key:'data_auditoria',label:'Data',type:'date'},{key:'resultado',label:'Resultado'},{key:'evidencia',label:'Evidência'}],
  erp_treinamentos:[{key:'titulo',label:'Treinamento',required:true},{key:'instrutor',label:'Instrutor'},{key:'data',label:'Data',type:'date'},{key:'carga_horas',label:'Carga horária',type:'number'},{key:'status',label:'Status',required:true}],
  erp_equipamentos_calibracoes:[{key:'equipamento_id',label:'Equipamento ID',required:true},{key:'data_calibracao',label:'Data da calibração',type:'date',required:true},{key:'proxima_calibracao',label:'Próxima calibração',type:'date'},{key:'resultado',label:'Resultado'},{key:'laboratorio',label:'Laboratório'},{key:'observacao',label:'Observação'}],
  erp_documentos_qualidade:[{key:'codigo',label:'Código',required:true},{key:'sigla',label:'Sigla'},{key:'titulo',label:'Título',required:true},{key:'area',label:'Área'},{key:'status',label:'Status',required:true},{key:'revisao',label:'Revisão',type:'number',required:true},{key:'proxima_revisao',label:'Próxima revisão',type:'date'},{key:'conteudo',label:'Conteúdo'}],
  erp_refugos_retrabalhos:[{key:'ordem_producao_id',label:'OP ID'},{key:'produto_id',label:'Produto ID'},{key:'tipo',label:'Tipo',required:true},{key:'quantidade',label:'Quantidade',type:'number',required:true},{key:'motivo',label:'Motivo',required:true},{key:'custo',label:'Custo',type:'number'}],
  erp_pcp_paradas:[{key:'maquina_id',label:'Máquina ID'},{key:'ordem_producao_id',label:'OP ID'},{key:'motivo',label:'Motivo'},{key:'inicio',label:'Início',type:'date'},{key:'fim',label:'Fim',type:'date'}],
  erp_ficha_operacoes:[{key:'ficha_id',label:'Ficha ID',required:true},{key:'sequencia',label:'Sequência',type:'number',required:true},{key:'operacao',label:'Operação',required:true}],
  erp_fichas_tecnicas:[{key:'produto_id',label:'Produto ID',required:true},{key:'versao',label:'Versão',type:'number',required:true},{key:'rendimento',label:'Rendimento',type:'number'},{key:'unidade_rendimento',label:'Unidade'},{key:'observacoes',label:'Observações'}],
  erp_maquinas:[{key:'codigo',label:'Código',required:true},{key:'nome',label:'Nome',required:true},{key:'tipo',label:'Tipo',required:true},{key:'fabricante',label:'Fabricante'},{key:'modelo',label:'Modelo'},{key:'status',label:'Status'}],
  erp_moldes:[{key:'codigo',label:'Código',required:true},{key:'nome',label:'Nome',required:true},{key:'tipo',label:'Tipo'},{key:'status',label:'Status'},{key:'cavidades',label:'Cavidades',type:'number'}],
  erp_fornecedores:[{key:'nome',label:'Nome / Razão social',required:true},{key:'documento',label:'CPF / CNPJ'},{key:'email',label:'E-mail',type:'email'},{key:'telefone',label:'Telefone'}],
  erp_funcionarios:[{key:'nome',label:'Nome',required:true},{key:'cpf',label:'CPF'},{key:'email',label:'E-mail',type:'email'},{key:'telefone',label:'Telefone'}]
}

const tabsMap:Record<string,string[]>={
  Clientes:['Cadastro','Contatos','Documentos','Histórico','Pedidos'],
  Produtos:['Dados gerais','Estoque','Fiscal','Produção','Qualidade','Documentos','Histórico'],
  Engenharia:['Estrutura / BOM','Roteiro','Versões','Custos','Documentos'],
  Máquinas:['Cadastro','Capacidade','Paradas','Manutenção','Indicadores'],
  PCP:['Visão geral','Demandas','MPS','MRP','Programação','Capacidade','Produção','Qualidade'],
  MRP:['Necessidades','Disponibilidade','Compras sugeridas','Produção sugerida','Explosão BOM'],
  'Matéria-prima':['Saldos','Lotes','Reservas','Consumo','Rastreabilidade'],
  Estoque:['Saldo','Entrada','Saída','Transferência','Inventário'],
  Compras:['Solicitações','Cotações','Pedidos','Recebimento','Fornecedores'],
  Qualidade:['Inspeções','Documentos','RPNC','Auditorias','Indicadores'],
  RPNC:['Abertas','Causa raiz','Ação corretiva','Eficácia','Histórico'],
  Financeiro:['Visão geral','Contas a pagar','Contas a receber','Caixa','Conciliação'],
  Fiscal:['Documentos','NF-e','XML','Liberações','Relatórios'],
  RH:['Funcionários','Ponto','Faltas','Treinamentos','Competências'],
  Almoxarifado:['Depósitos','Localizações','Entradas','Requisições','Inventário'],
  Expedição:['Fila','Separação','Conferência','Romaneio','Entregas'],
  Manutenção:['Ordens','Preventiva','Corretiva','Peças','Histórico'],
  OEE:['Disponibilidade','Performance','Qualidade','Paradas','OEE'],
  Refugo:['Registros','Causas','Retrabalho','Por OP','Indicadores'],
  Relatórios:['Produção','Estoque','Qualidade','Financeiro','Gerenciais']
}

const sourceFor=(m:Module)=>sourceMap[m.name]??m.table
const fieldsFor=(m:Module)=>fieldsMap[sourceFor(m)??'']??m.fields??[]
const emptyForm=(f:Field[])=>Object.fromEntries(f.map(x=>[x.key,''])) as Record<string,string>
const norm=(v:unknown)=>v==null?'':String(v)

export default function IndustrialModuleWorkspace({module,profile,onBack}:{module:Module;profile:Profile;onBack:()=>void}){
  const table=sourceFor(module)
  const fields=fieldsFor(module)
  const tabs=tabsMap[module.name]??['Visão geral','Cadastro','Operação','Movimentações','Relatórios']
  const [tab,setTab]=useState(tabs[0])
  const [rows,setRows]=useState<Row[]>([])
  const [query,setQuery]=useState('')
  const [form,setForm]=useState<Record<string,string>>(emptyForm(fields))
  const [editing,setEditing]=useState<string|null>(null)
  const [selected,setSelected]=useState<Row|null>(null)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [help,setHelp]=useState(false)

  const special:Record<string,string>={Qualidade:'/qualidade',Fiscal:'/fiscal',PCP:'/pcp',Produtos:'/produtos-vendas','Moldes e Ferramentas':'/moldes-injecao',Apontamentos:'/operacao-industrial','Recebimento de Materiais':'/recebimento-materiais','Solicitações de Compra':'/compras-solicitacao',Usuários:'/usuarios'}
  const openSpecial=()=>{if(special[module.name])location.href=special[module.name]}

  const load=async()=>{
    if(!table)return
    setBusy(true);setMessage('')
    try{
      if (!profile.empresa_id) { setRows([]); setMessage('Master autenticado. Selecione uma empresa para operar registros deste módulo.'); return }
      let req=supabase.from(table).select('*').eq('empresa_id',profile.empresa_id).limit(200)
      const q=query.trim().replace(/[%_]/g,'')
      if(q){
        const searchFields=fields.filter(f=>f.type!=='number'&&f.type!=='date').slice(0,5).map(f=>f.key+'.ilike.%'+q+'%')
        if(searchFields.length)req=req.or(searchFields.join(','))
      }
      const {data,error}=await req
      if(error)throw error
      setRows((data??[]) as Row[])
    }catch(e){setRows([]);setMessage(e instanceof Error?e.message:'Falha ao carregar os dados reais.')}
    finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[table,profile.empresa_id])

  const stats=useMemo(()=>{
    const status=rows.map(r=>norm(r.status).toLowerCase())
    return {total:rows.length,open:status.filter(s=>s&&!['concluido','concluída','concluida','encerrada','cancelada','cancelado','pago','recebido'].includes(s)).length,alerts:status.filter(s=>['pendente','atrasado','crítico','critico','bloqueado','reprovado'].includes(s)).length}
  },[rows])

  const openNew=()=>{setEditing(null);setForm(emptyForm(fields));setMessage('');setTab(tabs[1]??tabs[0])}
  const edit=(r:Row)=>{setEditing(r.id);setForm(Object.fromEntries(fields.map(f=>[f.key,norm(r[f.key])])));setTab(tabs[1]??tabs[0])}

  const save=async(e:FormEvent)=>{
    e.preventDefault();if(!table)return
    setBusy(true);setMessage('')
    try{
      const payload:Record<string,unknown>={empresa_id:profile.empresa_id}
      for(const f of fields){
        const v=(form[f.key]??'').trim()
        if(f.required&&!v)throw new Error('Informe '+f.label+'.')
        payload[f.key]=f.type==='number'&&v!==''?Number(v):v||null
      }
      const result=editing
        ? await supabase.from(table).update(payload).eq('id',editing).eq('empresa_id',profile.empresa_id)
        : await supabase.from(table).insert(payload)
      if(result.error)throw result.error
      setMessage(editing?'Registro atualizado no banco.':'Registro criado no banco.')
      setEditing(null);setForm(emptyForm(fields));await load();setTab(tabs[0])
    }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar no banco.')}
    finally{setBusy(false)}
  }

  const actionLabels=module.name==='Estoque'||module.name==='Almoxarifado'?['Entrada de material','Saída / consumo','Transferência','Inventário']
    :module.name==='Financeiro'?['Nova conta a pagar','Nova conta a receber','Lançamento de caixa','Conciliação']
    :module.name==='RH'?['Novo funcionário','Registrar ponto','Lançar ausência','Agendar treinamento']
    :module.name==='Qualidade'?['Nova inspeção','Novo RPNC','Documento controlado','Auditoria']
    :module.name==='Fiscal'?['Novo documento fiscal','Liberar pedido','Consultar XML','Relatório fiscal']
    :module.name==='Compras'?['Nova solicitação','Nova cotação','Pedido de compra','Recebimento']
    :module.name==='Expedição'?['Nova expedição','Separar pedido','Conferir volumes','Romaneio']
    :module.name==='Manutenção'?['Nova ordem','Preventiva','Corretiva','Histórico']
    :['Novo cadastro','Pesquisar','Atualizar dados','Relatório']

  const runAction=(a:string)=>{
    if(a==='Entrada de material'||a==='Saída / consumo'||a==='Transferência'){
      openNew()
      const tipo=a==='Entrada de material'?'entrada':a==='Saída / consumo'?'saida':'transferencia'
      setForm({...emptyForm(fields),tipo})
      return
    }
    if(a.startsWith('Nova')||a.startsWith('Novo')||a.startsWith('Registrar')||a.startsWith('Lançar')){
      if(special[module.name]){openSpecial();return}
      openNew();return
    }
    if(a==='Novo RPNC'){location.href='/qualidade';return}
    setMessage('Rotina '+a+' selecionada. Use os registros abaixo para continuar a operação.')
  }

  const steps=module.name==='PCP'?['Demanda','MRP','Material','OP','Programação','Produção','Qualidade','Estoque','Expedição']
    :module.name==='Compras'?['Solicitação','Cotação','Pedido','Recebimento','Estoque','Financeiro']
    :module.name==='Qualidade'?['Plano','Inspeção','RPNC','Ação','Eficácia','Histórico']
    :module.name==='Financeiro'?['Título','Vencimento','Pagamento/Recebimento','Conciliação','Relatório']
    :['Cadastro','Análise','Execução','Conferência','Histórico']

  return <div className="module-workspace-v3">
    <header className="mw3-head">
      <div className="mw3-breadcrumb"><button onClick={onBack}><ArrowLeft size={16}/> ERP</button><span>/</span><b>{module.title}</b></div>
      <div className="mw3-head-actions"><button className="mw3-btn secondary" onClick={()=>setHelp(true)}><HelpCircle size={16}/> Como usar</button>{special[module.name]&&<button className="mw3-btn secondary" onClick={openSpecial}><ArrowUpRight size={16}/> Abrir módulo completo</button>}<button className="mw3-btn primary" onClick={openNew}><Plus size={16}/> Novo</button></div>
    </header>

    <section className="mw3-hero"><div><span>SGQ ERP • {module.name.toUpperCase()}</span><h1>{module.title}</h1><p>{module.description}</p></div><div className="mw3-tenant"><span>EMPRESA</span><strong>{profile.empresa_id ? profile.empresa_id.slice(0,8) + '…' : 'MASTER'}</strong><small>Dados isolados por tenant</small></div></section>

    <section className="mw3-kpis"><article><LayoutDashboard/><span>Registros</span><strong>{stats.total}</strong><small>dados reais</small></article><article><Activity/><span>Em andamento</span><strong>{stats.open}</strong><small>status operacionais</small></article><article><AlertTriangle/><span>Atenção</span><strong>{stats.alerts}</strong><small>pendentes / críticos</small></article><article><Clock3/><span>Consulta</span><strong>{busy?'…':'OK'}</strong><small>Supabase atual</small></article></section>

    <nav className="mw3-tabs">{tabs.slice(0,8).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}<button onClick={()=>setHelp(true)}><HelpCircle size={15}/> Ajuda</button></nav>

    <section className="mw3-body">
      <aside className="mw3-actions"><div className="mw3-actions-head"><b>Ações da rotina</b><Settings2 size={16}/></div>{actionLabels.map((a,i)=><button key={a} onClick={()=>runAction(a)}><span>{i+1}</span><div><b>{a}</b><small>Executar rotina</small></div><ArrowUpRight size={15}/></button>)}<button className="mw3-help-action" onClick={()=>setHelp(true)}><HelpCircle size={16}/> Manual desta tela</button></aside>
      <main className="mw3-main">
        {message&&<div className="mw3-notice">{message}</div>}
        {module.name==='Manutenção'&&<PreventiveMaintenancePanel empresaId={profile.empresa_id}/>}
        {tab===tabs[0]&&<Overview module={module} rows={rows} fields={fields} steps={steps} stats={stats} onSelect={setSelected} onEdit={edit} onRefresh={()=>void load()}/>}
        {tab===tabs[1]&&<FormPanel module={module} fields={fields} form={form} setForm={setForm} onSubmit={save} busy={busy} editing={editing} onCancel={()=>setTab(tabs[0])}/>}
        {tab!==tabs[0]&&tab!==tabs[1]&&<section className="mw3-card"><div className="mw3-card-head"><div><span>{tab.toUpperCase()}</span><h2>{tab}</h2><p>Rotina vinculada aos registros reais desta empresa.</p></div><div className="mw3-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void load()} placeholder="Pesquisar"/><button onClick={()=>void load()}><Search size={14}/> Pesquisar</button></div></div><div className="mw3-action-strip">{actionLabels.map(a=><button key={a} onClick={()=>runAction(a)}><Plus size={14}/>{a}</button>)}</div><DataTable rows={rows} fields={fields} onSelect={setSelected} onEdit={edit}/></section>}
      </main>
    </section>

    <footer className="mw3-footer"><span>SGQ ERP Industrial</span><span>Tablet operacional • controles ≥ 10px</span><span>FernandoSch_System</span></footer>

    {selected&&<div className="mw3-modal-backdrop" onMouseDown={()=>setSelected(null)}><div className="mw3-modal" onMouseDown={e=>e.stopPropagation()}><header><div><span>DETALHE DO REGISTRO</span><h2>{module.title}</h2></div><button onClick={()=>setSelected(null)}><X size={18}/></button></header><div className="mw3-detail-grid">{fields.map(f=><div key={f.key}><span>{f.label}</span><strong>{norm(selected[f.key])||'—'}</strong></div>)}</div><footer><button className="mw3-btn secondary" onClick={()=>{edit(selected);setSelected(null)}}><Pencil size={15}/> Editar</button><button className="mw3-btn secondary" onClick={()=>setSelected(null)}>Fechar</button></footer></div></div>}
    {help&&<div className="mw3-modal-backdrop" onMouseDown={()=>setHelp(false)}><div className="mw3-help-modal" onMouseDown={e=>e.stopPropagation()}><HelpPanel module={module} tabs={tabs} onClose={()=>setHelp(false)}/></div></div>}
  </div>
}


function PreventiveMaintenancePanel({empresaId}:{empresaId:string|null}){
 const [machines,setMachines]=useState<Row[]>([]),[plans,setPlans]=useState<Row[]>([]),[year,setYear]=useState(new Date().getFullYear()),[machineId,setMachineId]=useState(''),[frequency,setFrequency]=useState('Mensal'),[task,setTask]=useState('Inspeção preventiva'),[message,setMessage]=useState(''),[loading,setLoading]=useState(false)
 const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
 const load=async()=>{if(!empresaId)return;setLoading(true);setMessage('');try{const[m,p]=await Promise.all([supabase.from('erp_maquinas').select('*').eq('empresa_id',empresaId).order('codigo').limit(500),supabase.from('erp_manutencao').select('*').eq('empresa_id',empresaId).order('criado_em',{ascending:false}).limit(1000)]);if(m.error)throw m.error;if(p.error)throw p.error;setMachines((m.data||[]) as Row[]);setPlans((p.data||[]) as Row[])}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível carregar o cronograma real.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[empresaId,year])
 const machineName=(id:string)=>{const m=machines.find(x=>x.id===id);return m?(norm(m.nome)||norm(m.codigo)||'Máquina sem nome'):'Selecione a máquina'}
 const planned=(machine:Row,month:number)=>{const id=String(machine.id);return plans.some(p=>{if(String(p.maquina_id||p.maquina||'')!==id&&String(p.maquina||'')!==norm(machine.codigo))return false;const d=String(p.descricao||'').toLowerCase(),f=String(p.tipo||'').toLowerCase();if(!d.includes(String(year)))return false;if(f.includes('mensal')||f.includes('semanal'))return true;if(f.includes('trimestral'))return month%3===0;if(f.includes('semestral'))return month===0||month===6;if(f.includes('anual'))return month===0;return false})}
 const savePlan=async()=>{if(!empresaId||!machineId){setMessage('Cadastre e selecione uma máquina antes de criar o plano.');return}setLoading(true);setMessage('');try{const r=await supabase.from('erp_manutencao').insert({empresa_id:empresaId,maquina:machineName(machineId),tipo:frequency,status:'Agendado',descricao:JSON.stringify({formulario:null,ano:year,tarefa:task,frequencia:frequency,maquina_id:machineId,observacao:'Plano gerado a partir do cadastro do cliente.'})});if(r.error)throw r.error;setMessage('Plano preventivo criado. A identificação do formulário permanece definida pelo cliente e não foi inventada pelo ERP.');await load()}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar o plano.')}finally{setLoading(false)}}
 if(!empresaId)return <section className="mw3-card"><h2>Cronograma de Manutenção Preventiva</h2><p>Selecione uma empresa para operar o cronograma.</p></section>
 return <section className="mw3-card" style={{marginBottom:16}}>
  <div className="mw3-card-head"><div><span>MANUTENÇÃO PREVENTIVA • CRONOGRAMA ANUAL</span><h2>Cronograma de Manutenção Preventiva — Máquinas</h2><p>As máquinas aparecem automaticamente a partir do cadastro do cliente. O ERP não traz números da Plastibor e não inventa número de formulário.</p></div><CalendarDays size={22}/></div>
  <div className="mw3-form-grid" style={{marginBottom:14}}>
   <label>Ano<input type="number" value={year} onChange={e=>setYear(Number(e.target.value)||new Date().getFullYear())}/></label>
   <label>Máquina cadastrada<select value={machineId} onChange={e=>setMachineId(e.target.value)}><option value="">Selecione uma máquina</option>{machines.map(m=><option key={m.id} value={m.id}>{norm(m.codigo)} — {norm(m.nome)}</option>)}</select></label>
   <label>Periodicidade<select value={frequency} onChange={e=>setFrequency(e.target.value)}><option>Semanal</option><option>Mensal</option><option>Trimestral</option><option>Semestral</option><option>Anual</option><option>Por horas de operação</option></select></label>
   <label>Tarefa preventiva<input value={task} onChange={e=>setTask(e.target.value)} placeholder="Ex.: lubrificação, inspeção, troca de filtro"/></label>
  </div>
  <div className="mw3-action-strip"><button onClick={()=>void savePlan()} disabled={loading}><Plus size={14}/> Criar plano preventivo</button><button onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> Atualizar máquinas</button></div>
  {message&&<div className="mw3-notice" style={{marginTop:10}}>{message}</div>}
  <div className="mw3-table-wrap" style={{marginTop:14,overflowX:'auto'}}><table><thead><tr><th>Máquina</th><th>Periodicidade</th>{months.map(m=><th key={m} title={m}>{m.slice(0,3)}</th>)}</tr></thead><tbody>
   {machines.map(m=><tr key={m.id}><td><b>{norm(m.codigo)||'—'}</b><br/><small>{norm(m.nome)||'Máquina sem nome'}</small></td><td>{String(plans.find(p=>String(p.maquina||'')===norm(m.nome)||String(p.maquina||'')===norm(m.codigo))?.tipo ?? '—')}</td>{months.map((_,i)=><td key={i} style={{textAlign:'center'}}><span title={planned(m,i)?'Planejado':'Sem manutenção programada'}>{planned(m,i)?'●':'·'}</span></td>)}</tr>)}
   {!machines.length&&<tr><td colSpan={14} className="mw3-empty">Nenhuma máquina cadastrada. Cadastre as máquinas do cliente e este cronograma será preenchido automaticamente.</td></tr>}
  </tbody></table></div>
  <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:12,fontSize:13,fontWeight:700}}><span>● Programado</span><span>✓ Programado e executado</span><span>⚠ Em atraso</span></div>
  <div className="mw3-help-grid" style={{marginTop:14}}><article><h3>Identificação do formulário</h3><p>O código/número do formulário não é pré-preenchido. O cliente define sua identificação; o ERP poderá gerar revisões e histórico depois dessa definição, sem reutilizar códigos da Plastibor.</p></article><article><h3>Estrutura do calendário</h3><p>Máquina, periodicidade, tarefa e meses. A estrutura segue modelos atuais de CMMS que usam ativo, frequência, última execução, próxima execução, responsável e observações.</p></article></div>
 </section>
}

function Overview({module,rows,fields,steps,stats,onSelect,onEdit,onRefresh}:{module:Module;rows:Row[];fields:Field[];steps:string[];stats:{total:number;open:number;alerts:number};onSelect:(r:Row)=>void;onEdit:(r:Row)=>void;onRefresh:()=>void}){
 return <div className="mw3-overview"><div className="mw3-overview-grid"><article className="mw3-card wide"><div className="mw3-card-head"><div><span>FLUXO OPERACIONAL</span><h2>Visão da rotina</h2></div><Activity size={20}/></div><div className="mw3-process">{steps.map((s,i)=><div key={s} className="mw3-process-step"><span>{i+1}</span><b>{s}</b>{i<steps.length-1&&<i/>}</div>)}</div></article><article className="mw3-card"><div className="mw3-card-head"><div><span>ATENÇÃO</span><h2>Controle</h2></div><AlertTriangle size={20}/></div><strong className="mw3-big-number">{stats.alerts}</strong><p>{stats.alerts?'registro(s) precisam de tratamento.':'Nenhum alerta nos registros carregados.'}</p></article></div><article className="mw3-card"><div className="mw3-card-head"><div><span>DADOS REAIS</span><h2>Últimos registros</h2></div><button className="mw3-btn secondary small" onClick={onRefresh}><RefreshCw size={14}/> Atualizar</button></div><DataTable rows={rows.slice(0,12)} fields={fields} onSelect={onSelect} onEdit={onEdit}/></article></div>
}

function FormPanel({module,fields,form,setForm,onSubmit,busy,editing,onCancel}:{module:Module;fields:Field[];form:Record<string,string>;setForm:(v:Record<string,string>)=>void;onSubmit:(e:FormEvent)=>void;busy:boolean;editing:string|null;onCancel:()=>void}){
 return <form className="mw3-card mw3-form" onSubmit={onSubmit}><div className="mw3-card-head"><div><span>{editing?'EDITAR':'NOVO CADASTRO'}</span><h2>{editing?'Editar '+module.title:'Cadastrar '+module.title}</h2><p>Campos ligados ao banco real do ERP.</p></div><FilePlus2 size={20}/></div>{fields.length?<div className="mw3-form-grid">{fields.map(f=><label key={f.key}>{f.label}{f.required?' *':''}<input type={f.type??'text'} value={form[f.key]??''} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.key.endsWith('_id')?'UUID relacionado':f.label}/></label>)}</div>:<div className="mw3-empty">Este módulo não possui campos transacionais mapeados nesta camada.</div>}<footer><button type="button" className="mw3-btn secondary" onClick={onCancel}>Cancelar</button><button className="mw3-btn primary" disabled={busy}>{busy?'Salvando…':editing?'Salvar alterações':'Salvar cadastro'}</button></footer></form>
}

function DataTable({rows,fields,onSelect,onEdit}:{rows:Row[];fields:Field[];onSelect:(r:Row)=>void;onEdit:(r:Row)=>void}){
 if(!rows.length)return <div className="mw3-empty"><Package size={25}/><strong>Nenhum registro encontrado</strong><span>Não há dados carregados para esta empresa nesta rotina.</span></div>
 return <div className="mw3-table-wrap"><table><thead><tr>{fields.slice(0,8).map(f=><th key={f.key}>{f.label}</th>)}<th>Ações</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} onClick={()=>onSelect(r)}>{fields.slice(0,8).map(f=><td key={f.key}>{norm(r[f.key])||'—'}</td>)}<td><button type="button" onClick={e=>{e.stopPropagation();onEdit(r)}}><MoreHorizontal size={16}/></button></td></tr>)}</tbody></table></div>
}

function HelpPanel({module,tabs,onClose}:{module:Module;tabs:string[];onClose:()=>void}){
 return <div className="mw3-card mw3-help"><header><div><span>MANUAL RÁPIDO</span><h2>Como usar {module.title}</h2></div><HelpCircle size={20}/></header><div className="mw3-help-grid"><article><h3>Rotinas desta tela</h3>{tabs.map((t,i)=><div className="mw3-help-item" key={t}><b>{i+1}</b><span>{t}</span></div>)}</article><article><h3>Execução</h3>{['Escolha a ação na lateral para iniciar uma rotina.','Preencha o formulário e salve para gravar no Supabase.','Clique em uma linha para ver o detalhe completo.','Use Editar para corrigir e salvar novamente.','Atualize a tela para conferir o estado real.'].map((s,i)=><div className="mw3-help-item" key={s}><b>{i+1}</b><span>{s}</span></div>)}<button className="mw3-btn secondary" onClick={onClose}>Voltar</button></article></div></div>
}
