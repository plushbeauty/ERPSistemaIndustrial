/**
 * PCP — central estável de Fichas de Processo.
 * Revisão: 2026-10-19
 * Mantém os três modelos completos disponíveis na rota oficial para evitar perda de tela.
 */
import { useState } from 'react'
import { Boxes, Factory, FileSliders } from 'lucide-react'
import PCPFichasProcessoCategorias from './PCPFichasProcessoCategorias'
import PCPFichasProcessoCadastro from './PCPFichasProcessoCadastro'
import PCPFichaEngenhariaCompleta from './PCPFichaEngenhariaCompleta'

type Model = 'categorias' | 'cadastro' | 'engenharia'
const models: {id:Model; label:string; description:string; Icon:typeof Boxes}[] = [
 {id:'categorias',label:'Processos por categoria',description:'Injetados, prensados, estamparia e demais processos',Icon:Factory},
 {id:'cadastro',label:'Ficha de processo completa',description:'Identificação, parâmetros, imagem técnica e setup',Icon:FileSliders},
 {id:'engenharia',label:'Engenharia, materiais e qualidade',description:'BOM, operações, fotos, inspeção e revisão',Icon:Boxes},
]
export default function PCPFichasProcesso() {
 const [model,setModel] = useState<Model>('categorias')
 return <div className="min-h-screen bg-[#F4FBFD]">
  <nav aria-label="Modelos de ficha de processo" className="sticky top-0 z-50 border-b border-[#123B50] bg-[#123B50] px-2 py-2 text-white shadow-md print:hidden">
   <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-1">
    <div className="mr-2 flex items-center gap-2 px-2 py-1">
     <FileSliders size={17} className="text-[#48B7C7]"/>
     <span className="text-[11px] font-extrabold uppercase tracking-wide">Fichas de Processo</span>
    </div>
    {models.map(({id,label,description,Icon})=><button key={id} type="button" aria-pressed={model===id} title={description} onClick={()=>setModel(id)} className={model===id?'inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-[#48B7C7] bg-[#2D8DB8] px-3 text-[10px] font-bold text-white':'inline-flex h-[30px] items-center gap-1 rounded-[2px] border border-white/20 bg-[#1a4b61] px-3 text-[10px] font-semibold text-slate-100 hover:bg-[#245d75]'}><Icon size={13}/>{label}</button>)}
   </div>
  </nav>
  <div hidden={model!=='categorias'}><PCPFichasProcessoCategorias/></div>
  <div hidden={model!=='cadastro'}><PCPFichasProcessoCadastro/></div>
  <div hidden={model!=='engenharia'}><PCPFichaEngenhariaCompleta/></div>
 </div>
}
