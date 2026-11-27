import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer, Download, Save, AlertTriangle } from 'lucide-react'
import { useDadosReaisEtiqueta } from '../../hooks/useDadosReaisEtiqueta'
import { generateThermalLabel, validateThermalLabel, type ThermalLabelConfig, type ThermalLanguage } from '../../utils/thermalLabelGenerator'
import { supabase } from '../../lib/supabaseClient'
import Code128Preview from './Code128Preview'

export type EtiquetaProdutoInicial = { id: string; codigo: string; codigoBarras: string; descricao: string; unidade: string; clienteId: string | null }
type Props={onClose:()=>void; initialProduct?:EtiquetaProdutoInicial}
const printers=[
 {name:'Argox OS-214EX PRO / OS-214 Plus',language:'PPLB' as ThermalLanguage,max:108},
 {name:'Zebra ZD220 / ZD230 / ZT231 / ZT411',language:'ZPL' as ThermalLanguage,max:104},
 {name:'Elgin L42 Pro / TT042 Plus',language:'ZPL' as ThermalLanguage,max:108},
 {name:'TSC TE200 / TE210',language:'TSPL' as ThermalLanguage,max:108},
 {name:'Honeywell PC42t',language:'ZPL' as ThermalLanguage,max:104},
 {name:'Argox / Elgin legado',language:'PPLA' as ThermalLanguage,max:108},
] as const
const presets=[
 {name:'Padrão 2" 50x30mm',width:50,height:30,columns:1 as const,gap:0},
 {name:'Expedição/Cliente 100x100mm',width:100,height:100,columns:1 as const,gap:0},
 {name:'Almoxarifado/SGQ 80x50mm',width:80,height:50,columns:1 as const,gap:0},
]
export default function ConfiguracaoEtiquetaModal({onClose,initialProduct}:Props){
 const [customerId,setCustomerId]=useState(initialProduct?.clienteId||'')
 const {empresa,cliente,empresaId,loading,error}=useDadosReaisEtiqueta(customerId||undefined)
 const [printerIndex,setPrinterIndex]=useState(0),[language,setLanguage]=useState<ThermalLanguage>('PPLB')
 const [preset,setPreset]=useState(initialProduct?2:0)
 const [width,setWidth]=useState(initialProduct?80:50),[height,setHeight]=useState(initialProduct?50:30),[columns,setColumns]=useState<1|2>(1),[gap,setGap]=useState(0)
 const [orientation,setOrientation]=useState<'portrait'|'landscape'>('portrait')
 const [code,setCode]=useState(initialProduct?.codigoBarras||initialProduct?.codigo||''),[description,setDescription]=useState(initialProduct?.descricao||''),[lot,setLot]=useState('')
 const [quantity,setQuantity]=useState(''),[unit,setUnit]=useState(initialProduct?.unidade||''),[address,setAddress]=useState('')
 const [trace,setTrace]=useState('')
 const [templateName,setTemplateName]=useState(initialProduct?'Almoxarifado/SGQ 80x50mm':'Padrão 2" 50x30mm')
 const [message,setMessage]=useState(''),[failure,setFailure]=useState('')
 const printer=printers[printerIndex]
 const config:ThermalLabelConfig=useMemo(()=>({language,printer:printer.name,printerMaxWidthMm:printer.max,widthMm:width,heightMm:height,columns,columnGapMm:gap,orientation,company:empresa?.razao_social||'',cnpj:empresa?.cnpj||'',customer:cliente?.razao_social||'',customerDocument:cliente?.documento||'',productCode:code,description,lot,quantity,unit,physicalAddress:address,traceability:trace||lot||code}),[language,printer, width,height,columns,gap,orientation,empresa,cliente,code,description,lot,quantity,unit,address,trace])
 const validation=validateThermalLabel(config)
 const prn=()=>generateThermalLabel(config).content
 const applyPreset=(index:number)=>{const p=presets[index];setPreset(index);setWidth(p.width);setHeight(p.height);setColumns(p.columns);setGap(p.gap);setTemplateName(p.name)}
 const save=async()=>{
  setFailure('');setMessage('')
  if(!empresaId||!validation.valid){setFailure(!empresaId?'Empresa não identificada.':validation.errors.join(' '));return}
  const {error}=await supabase.from('erp_label_templates').insert({empresa_id:empresaId,nome:templateName,modelo_base:presets[preset].name,impressora_alvo:printer.name,linguagem_nativa:language,largura_mm:width,altura_mm:height,colunas:columns,espacamento_colunas_mm:gap,orientacao:orientation,campos_ativos:{codigo:true,descricao:true,lote:true,qr:true,cliente:Boolean(cliente)},padrao_empresa:false,ativo:true})
  if(error)setFailure(error.message);else setMessage('Modelo salvo na empresa.')
 }
 const download=()=>{setFailure('');try{const blob=new Blob([prn()],{type:'application/octet-stream'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='sysnqra-etiqueta.prn';a.click();URL.revokeObjectURL(url);setMessage('Arquivo PRN gerado. Envie-o à impressora pela ferramenta/ponte local compatível.')}catch(e){setFailure(e instanceof Error?e.message:'Falha ao gerar PRN.')}}
 const print=()=>{if(!validation.valid){setFailure(validation.errors.join(' '));return}window.print()}
 const qr=trace||lot||code||''
 const physicalWidth=orientation==='landscape'?height:width
 const physicalHeight=orientation==='landscape'?width:height
 return <div className="label-config-dialog fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/50 p-2" role="dialog" aria-modal="true" aria-label="Configuração de Etiqueta">
  <div className="flex max-h-[calc(100dvh-16px)] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded border border-slate-300 bg-white text-slate-800 shadow-2xl">
   <header className="no-print z-20 flex flex-none items-center justify-between border-b border-slate-200 bg-white p-3"><div><h2 className="text-sm font-bold text-[#123B50]">Configuração de Etiqueta</h2><p className="text-[10px] text-slate-500">Emitente e destinatário consultados nos cadastros reais.</p></div><button className="erp-btn" onClick={onClose}><X size={15}/> Fechar</button></header>
   {(error||failure)&&<p className="no-print m-3 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{failure||error}</p>}
   {message&&<p className="no-print m-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p>}
   <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
    <section className="no-print grid content-start grid-cols-2 gap-2 text-xs">
     <label className="col-span-2 grid gap-1">Impressora<select className="erp-input" value={printerIndex} onChange={e=>{const i=Number(e.target.value);setPrinterIndex(i);setLanguage(printers[i].language)}}>{printers.map((p,i)=><option key={p.name} value={i}>{p.name} · {p.max}mm</option>)}</select></label>
     <label className="col-span-2 grid gap-1">Linguagem nativa<select className="erp-input" value={language} onChange={e=>setLanguage(e.target.value as ThermalLanguage)}>{(['PPLB','PPLA','ZPL','TSPL'] as ThermalLanguage[]).map(x=><option key={x}>{x}</option>)}</select></label>
     <label className="col-span-2 grid gap-1">Modelo pronto<select className="erp-input" value={preset} onChange={e=>applyPreset(Number(e.target.value))}>{presets.map((p,i)=><option key={p.name} value={i}>{p.name}</option>)}</select></label>
     <label className="grid gap-1">Largura (mm)<input className="erp-input" type="number" min="20" max="110" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
     <label className="grid gap-1">Altura (mm)<input className="erp-input" type="number" min="20" max="200" value={height} onChange={e=>setHeight(Number(e.target.value))}/></label>
     <label className="grid gap-1">Colunas<select className="erp-input" value={columns} onChange={e=>setColumns(Number(e.target.value) as 1|2)}><option value={1}>1</option><option value={2}>2</option></select></label>
     <label className="grid gap-1">Gap (mm)<input className="erp-input" type="number" min="0" max="20" value={gap} onChange={e=>setGap(Number(e.target.value))}/></label>
     <label className="col-span-2 grid gap-1">Orientação<div className="flex gap-2"><button type="button" className={orientation==='portrait'?'erp-btn-primary':'erp-btn'} onClick={()=>setOrientation('portrait')}>Retrato</button><button type="button" className={orientation==='landscape'?'erp-btn-primary':'erp-btn'} onClick={()=>setOrientation('landscape')}>Paisagem</button></div></label>
     <label className="col-span-2 grid gap-1">Nome do modelo<input className="erp-input" value={templateName} onChange={e=>setTemplateName(e.target.value)}/></label>
     <label className="grid gap-1">Código<input className="erp-input" value={code} onChange={e=>setCode(e.target.value)} /></label>
     <label className="grid gap-1">Lote<input className="erp-input" value={lot} onChange={e=>setLot(e.target.value)} /></label>
     <label className="col-span-2 grid gap-1">Descrição<input className="erp-input" value={description} onChange={e=>setDescription(e.target.value)} /></label>
     <label className="grid gap-1">Quantidade<input className="erp-input" value={quantity} onChange={e=>setQuantity(e.target.value)} /></label>
     <label className="grid gap-1">Unidade<input className="erp-input" value={unit} onChange={e=>setUnit(e.target.value)} /></label>
     <label className="col-span-2 grid gap-1">Endereço físico<input className="erp-input" value={address} onChange={e=>setAddress(e.target.value)} /></label>
     <label className="col-span-2 grid gap-1">ID do cliente cadastrado<input className="erp-input" value={customerId} onChange={e=>setCustomerId(e.target.value)} placeholder="UUID do cadastro em erp_clientes"/></label>
     {cliente&&<p className="col-span-2 rounded border border-slate-200 bg-slate-50 p-2 text-[10px]">{cliente.razao_social} · {cliente.documento} · {cliente.endereco} · {cliente.cidade}/{cliente.estado}</p>}
     {!validation.valid&&<div className="col-span-2 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-amber-900"><AlertTriangle size={14}/><div>{validation.errors.map(x=><p key={x}>{x}</p>)}</div></div>}

    </section>
    <section className="grid content-start gap-2">
     <div className="no-print flex items-center justify-between text-[10px] text-slate-500"><span>Prévia 1:1 · {physicalWidth} × {physicalHeight} mm</span><span>Máximo {printer.max} mm · total {validation.totalWidthMm.toFixed(1)} mm</span></div>
     <article className={`label-print mx-auto flex ${orientation === "landscape" ? "flex-row" : "flex-col"} justify-between overflow-hidden border border-slate-400 bg-white p-[3mm] font-mono text-black shadow`} style={{width:physicalWidth+'mm',height:physicalHeight+'mm',maxWidth:'100%',aspectRatio:physicalWidth+'/'+physicalHeight}}>
      {empresa?.logo_impressao_url||empresa?.logo_url?<img src={empresa.logo_impressao_url||empresa.logo_url||''} alt="Logo da empresa" className="max-h-[12mm] max-w-[35mm] object-contain"/>:null}
      <div className="text-[7pt] font-bold">{empresa?.razao_social||'Emitente não cadastrado'}</div>
      <div className="text-[6pt]">{empresa?.cnpj||''} · {empresa?.endereco||''} · {empresa?.cidade||''}/{empresa?.uf||''}</div>
      <div className="text-[8pt] font-black">{code||'Código do item'} · {description||'Descrição do produto'}</div>
      <div className="text-[7pt]">Lote: {lot||'—'} · Qtd: {quantity||'—'} {unit}</div>
      <Code128Preview value={code} className="label-barcode w-full" caption={code}/>
      <div className="text-[6pt]">{cliente?.razao_social||''} · {cliente?.documento||''}</div>
      <div className="flex items-end justify-between gap-1"><div className="text-[6pt]">{cliente?.endereco||address}<br/>{cliente?.cidade||''}/{cliente?.estado||''}</div>{qr&&<QRCodeSVG value={qr} size={Math.min(112,Math.max(64,Math.round(Math.min(physicalWidth,physicalHeight)*2.5)))} level="M"/>}</div>
     </article>
     <p className="no-print text-[10px] text-slate-500">{loading?'Carregando cadastros…':error||'Dados reais do emitente vinculados à empresa da sessão.'}</p>
    </section>
   </div></div>
   <footer className="no-print z-20 flex flex-none flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-3 py-3 shadow-[0_-4px_12px_rgba(18,59,80,.08)]"><button className="erp-btn" type="button" disabled={!validation.valid||loading} onClick={()=>void save()}><Save size={14}/> Salvar modelo</button><button className="erp-btn" type="button" disabled={!validation.valid} onClick={download}><Download size={14}/> Baixar .PRN</button><button className="erp-btn-primary" type="button" disabled={!validation.valid} onClick={print}><Printer size={14}/> Imprimir</button></footer>
   <style>{`@page{size:${physicalWidth}mm ${physicalHeight}mm;margin:0}@media print{body *{visibility:hidden!important}.label-print,.label-print *{visibility:visible!important}.label-print{position:fixed!important;left:0!important;top:0!important;margin:0!important;box-shadow:none!important;border:0!important} .label-barcode{display:block;width:100%;height:10mm;max-width:100%}.label-config-dialog .label-print{flex-shrink:0}@media(max-width:640px),(pointer:coarse){.label-config-dialog .erp-input{height:44px!important;min-height:44px!important;font-size:14px!important}}.no-print{display:none!important}}`}</style>
  </div>
 </div>
}
