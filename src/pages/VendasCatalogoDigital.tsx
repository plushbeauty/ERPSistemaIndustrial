import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Copy, Plus, Search, Send, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Produto={id:string;codigo:string;nome:string;descricao:string|null;preco_venda:number|null;estoque_atual:number|null;unidade:string;foto_url:string|null;catalogo_disponivel:boolean;grupo:string|null;subgrupo:string|null;codigo_barras:string|null;referencia_interna:string|null}

const brl=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0)

export default function VendasCatalogoDigital(){
 const [produtos,setProdutos]=useState<Produto[]>([])
 const [filtro,setFiltro]=useState('')
 const [categoria,setCategoria]=useState('TODOS')
 const [selected,setSelected]=useState<Record<string,boolean>>({})
 const [quantidades,setQuantidades]=useState<Record<string,number>>({})
 const [detalhe,setDetalhe]=useState<Produto|null>(null)
 const [busy,setBusy]=useState(true),[error,setError]=useState('')
 const load=async()=>{setBusy(true);setError('');try{const e=await supabase.rpc('erp_current_empresa_id');if(e.error||!e.data)throw e.error??new Error('Empresa não identificada.');const r=await supabase.from('erp_produtos').select('id,codigo,nome,descricao,preco_venda,estoque_atual,unidade,foto_url,catalogo_disponivel,grupo,subgrupo,codigo_barras,referencia_interna').eq('empresa_id',String(e.data)).eq('ativo',true).eq('catalogo_disponivel',true).order('grupo').order('subgrupo').order('codigo');if(r.error)throw r.error;setProdutos((r.data??[]) as Produto[])}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar catálogo.')}finally{setBusy(false)}}
 useEffect(()=>{void load()},[])
 const categorias=useMemo(()=>Array.from(new Set(produtos.map(p=>p.grupo||'SEM GRUPO'))).sort(),[produtos])
 const rows=useMemo(()=>produtos.filter(p=>{const q=filtro.trim().toLowerCase();const cat=categoria==='TODOS'||(p.grupo||'SEM GRUPO')===categoria;return cat&&(!q||[p.codigo,p.nome,p.descricao??'',p.grupo??'',p.subgrupo??'',p.referencia_interna??'',p.codigo_barras??''].join(' ').toLowerCase().includes(q))}),[produtos,filtro,categoria])
 const cart=produtos.filter(p=>selected[p.id]).map(p=>({produto_id:p.id,codigo:p.codigo,descricao:p.nome,quantidade:Math.max(1,quantidades[p.id]??1)}))
 const link=window.location.origin+'/vendas/catalogo-digital'
 const copy=async()=>{await navigator.clipboard.writeText(link)}
 const send=async()=>{const text='Catálogo: '+link+'\\n\\nItens selecionados:\\n'+cart.map(x=>x.codigo+' - '+x.descricao+' x '+x.quantidade).join('\\n');if(navigator.share)await navigator.share({title:'Solicitação de cotação',text}).catch(()=>undefined);else await navigator.clipboard.writeText(text)}
 return <VendasLayout title="Catálogo Digital" subtitle="Produtos industriais publicados" onRefresh={()=>void load()}>
  <main className="space-y-2 text-[11px]">
   <header className="flex flex-wrap items-center justify-between gap-2 border border-slate-300 bg-white px-3 py-2">
    <div><span className="text-[9px] font-medium tracking-wide text-[#2D8DB8]">VENDAS • CATÁLOGO</span><h1 className="text-base font-medium text-[#123B50]">Catálogo Digital de Produtos</h1></div>
    <div className="flex gap-1"><button type="button" onClick={()=>window.location.assign('/vendas')} className="flex h-8 items-center gap-1 border border-slate-300 px-2 text-[10px]"><ArrowLeft size={13}/>Voltar</button><button type="button" onClick={()=>void copy()} className="flex h-8 items-center gap-1 border border-slate-300 px-2 text-[10px]"><Copy size={13}/>Copiar link</button><button type="button" disabled={!cart.length} onClick={()=>void send()} className="flex h-8 items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-2 text-[10px] text-white"><Send size={13}/>Enviar seleção</button></div>
   </header>
   {error&&<div className="border border-red-300 bg-red-50 px-2 py-1 text-red-800">{error}</div>}
   <section className="border border-slate-300 bg-white p-2">
    <div className="flex flex-wrap items-end gap-2"><label className="min-w-64 flex-1 text-[9px] uppercase text-slate-500">Pesquisar<input value={filtro} onChange={e=>setFiltro(e.target.value)} className="mt-0.5 h-8 w-full border border-slate-300 px-2 text-[11px]" placeholder="Código, produto, referência..."/></label><span className="text-[9px] text-slate-500">{rows.length} produto(s)</span></div>
    <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-200 pt-2"><button type="button" onClick={()=>setCategoria('TODOS')} className={`h-7 border px-2 text-[9px] ${categoria==='TODOS'?'bg-[#2D8DB8] text-white':'bg-white'}`}>TODOS</button>{categorias.map(cat=><button type="button" key={cat} onClick={()=>setCategoria(cat)} className={`h-7 border px-2 text-[9px] ${categoria===cat?'bg-[#2D8DB8] text-white':'bg-white'}`}>{cat}</button>)}</div>
   </section>
   <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
    {busy&&<div className="col-span-full border bg-white p-8 text-center text-slate-500">Carregando catálogo...</div>}
    {!busy&&rows.map(p=><article key={p.id} className="overflow-hidden border border-slate-300 bg-white">
      <button type="button" onClick={()=>setDetalhe(p)} className="block w-full text-left"><div className="flex h-32 items-center justify-center bg-slate-50">{p.foto_url?<img src={p.foto_url} alt={p.nome} className="h-full w-full object-contain"/>:<span className="text-[10px] text-slate-400">Sem imagem</span>}</div><div className="p-2"><div className="font-mono text-[9px] text-slate-500">{p.codigo}</div><h2 className="mt-1 text-[12px] font-medium text-[#123B50]">{p.nome}</h2><div className="mt-1 flex justify-between text-[10px]"><span>{p.unidade}</span><strong>{brl(Number(p.preco_venda??0))}</strong></div></div></button>
      <div className="flex items-center justify-between border-t border-slate-200 px-2 py-1.5"><label className="flex items-center gap-1 text-[9px]"><input type="checkbox" checked={!!selected[p.id]} onChange={e=>setSelected(v=>({...v,[p.id]:e.target.checked}))}/>Selecionar</label><button type="button" onClick={()=>setDetalhe(p)} className="h-7 border border-[#2D8DB8] px-2 text-[9px] text-[#2D8DB8]">Detalhes</button></div>
    </article>)}
    {!busy&&!rows.length&&<div className="col-span-full border bg-white p-8 text-center text-slate-500">Nenhum produto publicado para este filtro.</div>}
   </section>
   <section className="border border-slate-300 bg-white p-2"><div className="flex items-center justify-between"><div><h2 className="text-sm font-medium text-[#123B50]">Seleção para pedido</h2><span className="text-[9px] text-slate-500">{cart.length} item(ns)</span></div></div>{cart.length?<table className="mt-2 w-full border-collapse text-[10px]"><thead><tr className="bg-slate-100 text-left"><th className="p-1">Código</th><th>Produto</th><th>Qtd.</th><th></th></tr></thead><tbody>{cart.map(item=><tr key={item.produto_id} className="border-t"><td className="p-1">{item.codigo}</td><td>{item.descricao}</td><td><input type="number" min="1" value={quantidades[item.produto_id]??1} onChange={e=>setQuantidades(v=>({...v,[item.produto_id]:Math.max(1,Number(e.target.value)||1)}))} className="h-7 w-16 border px-1"/></td><td className="text-right"><button type="button" title="Remover" onClick={()=>setSelected(v=>({...v,[item.produto_id]:false}))} className="h-7 w-7 border"><Trash2 size={12}/></button></td></tr>)}</tbody></table>:<p className="py-4 text-center text-slate-500">Selecione produtos na grade.</p>}</section>
   {detalhe&&<><button type="button" aria-label="Fechar ficha" onClick={()=>setDetalhe(null)} className="fixed inset-0 z-40 bg-black/20"/><aside className="fixed inset-y-0 right-0 z-50 w-[min(390px,94vw)] border-l border-slate-300 bg-white shadow-xl"><header className="flex h-10 items-center justify-between border-b px-3"><strong className="text-[11px] text-[#123B50]">FICHA DO PRODUTO</strong><button type="button" onClick={()=>setDetalhe(null)} className="h-7 w-7 border">×</button></header><div className="p-3">{detalhe.foto_url&&<img src={detalhe.foto_url} alt={detalhe.nome} className="mb-3 h-40 w-full border bg-slate-50 object-contain"/>}<div className="font-mono text-[9px] text-slate-500">{detalhe.codigo}</div><h2 className="mt-1 text-lg font-medium text-[#123B50]">{detalhe.nome}</h2><div className="mt-3 grid grid-cols-2 gap-1.5 text-[9px]"><div className="border p-2"><span className="text-slate-500">Grupo</span><b className="mt-1 block">{detalhe.grupo||'—'}</b></div><div className="border p-2"><span className="text-slate-500">Subgrupo</span><b className="mt-1 block">{detalhe.subgrupo||'—'}</b></div><div className="border p-2"><span className="text-slate-500">Unidade</span><b className="mt-1 block">{detalhe.unidade}</b></div><div className="border p-2"><span className="text-slate-500">Estoque</span><b className="mt-1 block">{Number(detalhe.estoque_atual??0).toLocaleString('pt-BR')}</b></div><div className="border p-2"><span className="text-slate-500">Referência</span><b className="mt-1 block">{detalhe.referencia_interna||'—'}</b></div><div className="border p-2"><span className="text-slate-500">Cód. barras</span><b className="mt-1 block">{detalhe.codigo_barras||'—'}</b></div></div><div className="mt-2 border p-2 text-[10px] leading-5 text-slate-600">{detalhe.descricao||'Sem descrição cadastrada.'}</div><button type="button" onClick={()=>setSelected(v=>({...v,[detalhe.id]:true}))} className="mt-3 flex h-9 w-full items-center justify-center gap-1 bg-[#2D8DB8] text-[10px] text-white"><Plus size={13}/>Adicionar ao Pedido</button></div></aside></>}
  </main>
 </VendasLayout>
}
