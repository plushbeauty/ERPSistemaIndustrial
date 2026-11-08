/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-05
 * @REVISAO: REV-RELATORIO-A4-20261105-01 — o botão Imprimir deixa de capturar a tela e passa a emitir a instrução de trabalho em A4 com código, revisão, homologação e conteúdo carregados do banco
 * @STATUS_APROVACAO: ORDEM GERAL DO PROPRIETÁRIO EM 2026-11-05, item 5 — "Não basta adicionar CSS @media print para imprimir a tela atual. Quero uma estrutura própria de relatório."
 * Revisão anterior (2026-11-03): o editor grava a revisão no banco e a cópia local na pasta do PC/rede, conforme ordem do proprietário de 2026-11-03.
 */
import { useEffect,useState,type ChangeEvent,type FormEvent } from 'react'
import { FileEdit,FolderSync,ImageUp,Printer,Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { writeCompanyDocument, windowsSafeName } from '../../lib/companyDocumentFolder'
import { abrirRelatorio } from '../../lib/report/abrirRelatorio'
import type { Bloco } from '../../lib/report/documento'

const escaparHtml = (valor: string) => valor.replace(/[&<>]/g, (caractere) => caractere === '&' ? '&amp;' : caractere === '<' ? '&lt;' : '&gt;')

type CabecalhoDocumento = {
  codigo: string
  titulo: string
  departamento: string
  revisao: number
  data: string
  texto: string
  logoDataUrl: string
}

/**
 * Arquivo no formato que o Word abre (.doc com corpo HTML), na mesma estrutura do modelo
 * IT-CQ-001: cabeçalho com logotipo, título, código, revisão e homologação, e o corpo do
 * procedimento. Serve para o setor ler e imprimir sem internet.
 */
function documentoWord({ codigo, titulo, departamento, revisao, data, texto, logoDataUrl }: CabecalhoDocumento): string {
  const linhas = escaparHtml(texto).replace(/\r\n/g, '\n').split('\n').map(linha => `<p style="margin:0 0 6pt">${linha || '&nbsp;'}</p>`).join('')
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`
    + `<head><meta charset="utf-8" /><title>${escaparHtml(codigo)} ${escaparHtml(titulo)}</title>`
    + `<style>@page{size:A4;margin:2cm}body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111}table{border-collapse:collapse;width:100%}`
    + `td,th{border:1.5pt solid #111;padding:5pt;font-size:9pt;text-transform:uppercase}th{background:#eee;text-align:left}`
    + `.rotulo{font-size:7.5pt;letter-spacing:.5pt;color:#444}.rev{font-size:9pt;font-weight:bold}.logo{width:26%;text-align:center}`
    + `p{margin:0 0 6pt;line-height:1.35}.aviso{border:1.5pt dashed #666;background:#f2f2f2;padding:6pt;text-align:center;font-size:8pt;font-weight:bold}</style></head>`
    + `<body><table><tr>`
    + `<td class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logotipo" style="max-height:44pt;max-width:95%" />` : 'LOGOTIPO'}</td>`
    + `<td colspan="2"><span class="rotulo">TÍTULO</span><br /><strong style="font-size:12pt">${escaparHtml(titulo) || 'SEM TÍTULO'}</strong></td>`
    + `<td style="width:22%"><span class="rotulo">CÓDIGO</span><br /><strong>${escaparHtml(codigo) || '—'}</strong><br />`
    + `<span class="rev">REV. ${revisao || 0} · ${escaparHtml(data) || 'NÃO HOMOLOGADA'}</span></td></tr>`
    + `<tr><th colspan="4">DEPARTAMENTO: ${escaparHtml(departamento)} · CÓPIA LOCAL GERADA PELO SYSNQRA ERP &amp; SGQ INDUSTRIAL</th></tr></table>`
    + `<p class="aviso">CÓPIA LOCAL PARA USO SEM INTERNET — AO VOLTAR A REDE, A REVISÃO VIGENTE É A DO BANCO DE DADOS</p>`
    + `<div>${linhas}</div></body></html>`
}

export default function QualidadeEditorIT(){
const[empresa,setEmpresa]=useState('');const[codigo,setCodigo]=useState('');const[titulo,setTitulo]=useState('');const[departamento,setDepartamento]=useState('QUALIDADE');const[revisao,setRevisao]=useState(0);const[data,setData]=useState('');const[texto,setTexto]=useState('');const[logo,setLogo]=useState('');const[logoUrl,setLogoUrl]=useState('');const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');const[err,setErr]=useState('');const[copiaLocal,setCopiaLocal]=useState('');const[erroLocal,setErroLocal]=useState('');const[gerando,setGerando]=useState(false)
 useEffect(()=>{void (async()=>{const s=await supabase.auth.getSession();if(!s.data.session){setErr('Sessão não autenticada.');return}const u=await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id',s.data.session.user.id).maybeSingle();if(u.error||!u.data?.empresa_id){setErr('Empresa não identificada.');return}setEmpresa(u.data.empresa_id);const d=await supabase.from('erp_qualidade_documentos_editor').select('*').eq('empresa_id',u.data.empresa_id).order('atualizado_em',{ascending:false}).limit(1).maybeSingle();if(d.data){setCodigo(d.data.codigo_documento);setTitulo(d.data.titulo_documento);setDepartamento('QUALIDADE');setRevisao(d.data.revisao);setData(d.data.data_homologacao);setTexto(d.data.conteudo_texto);setLogo(d.data.logo_path??'');if(d.data.logo_path){const s=await supabase.storage.from('erp-qualidade-anexos').createSignedUrl(d.data.logo_path,3600);if(!s.error)setLogoUrl(s.data.signedUrl)}}})()},[])
 const uploadLogo=async(e:ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f||!empresa)return;setBusy(true);setErr('');try{const ext=f.name.split('.').pop()?.toLowerCase()??'png';const path=empresa+'/logos/'+crypto.randomUUID()+'.'+ext;const r=await supabase.storage.from('erp-qualidade-anexos').upload(path,f,{upsert:false,contentType:f.type});if(r.error)throw r.error;setLogo(path);const signed=await supabase.storage.from('erp-qualidade-anexos').createSignedUrl(path,3600);if(!signed.error)setLogoUrl(signed.data.signedUrl);setMsg('Logotipo armazenado no Storage.')}catch(x){setErr(x instanceof Error?x.message:'Falha no upload.')}finally{setBusy(false)}}
 const logotipoEmBase64=async():Promise<string>=>{if(!logoUrl)return '';try{const resposta=await fetch(logoUrl);if(!resposta.ok)return '';const blob=await resposta.blob();return await new Promise<string>((resolve,reject)=>{const leitor=new FileReader();leitor.onload=()=>resolve(typeof leitor.result==='string'?leitor.result:'');leitor.onerror=()=>reject(leitor.error??new Error('Falha ao ler o logotipo.'));leitor.readAsDataURL(blob)})}catch{return ''}}
 const gravarCopia=async(novaRevisao?:number)=>{setGerando(true);setErroLocal('');setCopiaLocal('');try{const rev=novaRevisao??revisao;const nome=windowsSafeName(`${codigo} - ${titulo} REV ${String(rev).padStart(3,'0')}.doc`);const caminho=await writeCompanyDocument(['Procedimentos'],nome,documentoWord({codigo,titulo,departamento,revisao:rev,data,texto,logoDataUrl:await logotipoEmBase64()}));setCopiaLocal(caminho);return true}catch(x){setErroLocal(x instanceof Error?x.message:'Não foi possível gravar a cópia local na pasta escolhida.');return false}finally{setGerando(false)}}
 const save=async(e:FormEvent)=>{e.preventDefault();if(!codigo.trim()||!titulo.trim()){setErr('Código e título são obrigatórios.');return}setBusy(true);setErr('');setMsg('');try{const r=await supabase.rpc('erp_salvar_revisao_documento',{p_codigo:codigo,p_titulo:titulo,p_departamento:departamento,p_conteudo:texto,p_motivo:null,p_logo_path:logo||null});if(r.error)throw r.error;const x=r.data as {revisao:number;status:string};setRevisao(x.revisao);setData('');setMsg('Nova revisão '+x.revisao+' salva em análise. A revisão vigente será preservada até a aprovação.');await gravarCopia(x.revisao)}catch(x){setErr(x instanceof Error?x.message:'Falha ao salvar revisão.')}finally{setBusy(false)}}
 const emitirRelatorioIT=async()=>{setErr('');try{if(!codigo.trim()||!titulo.trim())throw new Error('Informe código e título do documento antes de emitir o relatório.');if(!texto.trim())throw new Error('A instrução de trabalho está sem conteúdo; preencha ou carregue a revisão do banco antes de emitir.');const blocos:Bloco[]=[
  {tipo:'campos',titulo:'Identificação da instrução de trabalho',colunas:2,itens:[
   {rotulo:'Código',valor:codigo},
   {rotulo:'Título',valor:titulo},
   {rotulo:'Departamento / setor',valor:departamento},
   {rotulo:'Revisão gravada',valor:revisao?`Rev. ${String(revisao)}`:'Sem revisão gravada no banco'},
   {rotulo:'Data de homologação',valor:data||'Não homologada'}
  ]},
  {tipo:'texto',titulo:'Conteúdo da instrução de trabalho',texto},
  {tipo:'assinaturas',titulo:'Aprovações',assinantes:[
   {papel:'Responsável pela instrução de trabalho'},
   {papel:'Garantia da Qualidade / SGQ'},
   {papel:'Aprovado pela direção'}
  ]}]
  await abrirRelatorio({modulo:'Qualidade',tipo:'Instrução de Trabalho',titulo,codigo,subtitulo:`${departamento} · ISO 9001`,blocos,observacoes:'Cabeçalho com logotipo, código, revisão e homologação conforme modelo IT-CQ-001; a revisão vigente é sempre a do banco de dados.'})}catch(x){setErr(x instanceof Error?x.message:'Falha ao emitir a instrução de trabalho em A4.')}}
 return <main className="min-h-screen bg-[#F4FBFD] p-3 text-slate-900 print:bg-white print:p-0"><form onSubmit={save}><div className="sticky top-0 z-40 mx-auto mb-5 flex max-w-[1200px] items-center justify-end gap-4 border-b border-slate-200 bg-slate-100/95 py-3 backdrop-blur print:hidden"><div><div className="flex items-center gap-2 text-sky-700"><FileEdit size={22}/><span className="text-xs font-black uppercase tracking-widest">Qualidade › Editor Mestre IT</span></div><h1 className="text-2xl font-black">Instruções de Trabalho · ISO 9001</h1></div><div className="flex gap-2"><label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-black"><ImageUp size={16}/> LOGOTIPO<input hidden type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={e=>void uploadLogo(e)}/></label><button type="button" onClick={()=>void gravarCopia()} disabled={gerando||busy} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-black"><FolderSync size={16}/> {gerando?'GRAVANDO NA PASTA…':'GRAVAR CÓPIA NA PASTA DO PC/REDE'}</button><button type="button" onClick={()=>void emitirRelatorioIT()} className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-black text-white"><Printer size={16}/> PREVIEW</button><button disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-black text-white"><Save size={16}/>{busy?'SALVANDO':'SALVAR NOVA REVISÃO'}</button></div></div>{(err||msg)&&<div className={'mx-auto mb-4 max-w-[1200px] rounded-xl border p-3 font-bold print:hidden '+(err?'border-rose-200 bg-rose-50 text-rose-800':'border-emerald-200 bg-emerald-50 text-emerald-800')}>{err||msg}</div>}{(erroLocal||copiaLocal)&&<div className={'mx-auto mb-4 max-w-[1200px] rounded-xl border p-3 font-bold print:hidden '+(erroLocal?'border-amber-200 bg-amber-50 text-amber-900':'border-emerald-200 bg-emerald-50 text-emerald-800')}>{erroLocal||('Cópia local gravada em '+copiaLocal)}</div>}<section className="mx-auto min-h-[297mm] max-w-[210mm] border border-slate-200 bg-white p-8 shadow-md print:border-0 print:p-0 print:shadow-none"><div className="grid grid-cols-4 border-2 border-slate-900 text-slate-900"><div className="flex h-[54px] items-center justify-center border-r border-slate-900 bg-slate-50 text-xs font-black uppercase">{logoUrl?<img src={logoUrl} alt="Logotipo da empresa" className="max-h-10 max-w-full object-contain"/>:'LOGOTIPO'}</div><label className="col-span-2 flex h-[54px] flex-col justify-center border-r border-slate-900 px-3 text-[10px] font-black uppercase">TÍTULO<input value={titulo} onChange={e=>setTitulo(e.target.value)} className="h-7 bg-transparent text-sm font-black outline-none print:hidden"/><span className="hidden text-sm font-bold normal-case print:block">{titulo}</span></label><div className="flex h-[54px] flex-col justify-center px-3 text-[10px] font-black uppercase">CÓDIGO <input value={codigo} onChange={e=>setCodigo(e.target.value)} className="h-7 bg-transparent text-sm font-black outline-none print:hidden"/><span className="hidden text-sm font-bold normal-case print:block">{codigo}</span><span>REV. {revisao||'NOVA'} · {data||'NÃO HOMOLOGADA'}</span></div></div><div className="hidden print:block mt-4 border-2 border-dashed border-slate-600 bg-slate-100 p-3 text-center text-xs font-black uppercase tracking-wider">⚠️ CÓPIA NÃO CONTROLADA · APENAS PARA CONSULTA LOCAL</div><div className="mt-5 print:mt-4"><textarea value={texto} onChange={e=>setTexto(e.target.value)} className="min-h-[240mm] w-full resize-none border-0 bg-white font-mono text-base font-medium leading-relaxed text-slate-900 outline-none print:hidden"/><div className="hidden min-h-[240mm] w-full whitespace-pre-wrap break-words bg-white font-sans text-[11pt] leading-relaxed text-slate-900 print:block">{texto || "Conteúdo do procedimento ainda não preenchido."}</div></div></section></form><style>{'@media print{body{background:#fff!important}nav,aside,.sgq-app-header,.print\\:hidden,button,input{display:none!important}.print\\:block{display:block!important}textarea{height:auto!important;min-height:260mm!important;overflow:visible!important;white-space:pre-wrap!important}.max-w-\\[210mm\\]{max-width:100%!important;width:100%!important;margin:0!important}}'}</style></main>
}