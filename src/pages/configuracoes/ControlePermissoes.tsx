import { HelpCircle, Save, ShieldCheck } from 'lucide-react'

const MODULOS = ['Engenharia','Comercial','MRP','PCP','Fábrica','Qualidade']

export default function ControlePermissoes() {
  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-4"><span className="block text-xs font-bold uppercase tracking-wider text-blue-600">Configurações / Segurança</span><h2 className="text-3xl font-black tracking-tight text-slate-900">Controle de Permissões</h2><p className="mt-1 text-sm text-slate-500">Prévia visual da matriz de acesso — sem conexão com banco.</p></header>
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><ShieldCheck size={17} className="text-[#2D8DB8]"/>Matriz por cargo</div><p className="mt-1 text-sm text-slate-500">Selecione o perfil e visualize os níveis de acesso.</p></div><select className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800"><option>Administrador</option><option>Supervisor</option><option>Operador</option></select></div>
        <div className="mt-5 overflow-auto rounded-2xl border border-slate-100"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[#123B50] text-white"><tr><th className="p-4 text-left">Módulo</th><th className="p-4 text-center">Visualizar</th><th className="p-4 text-center">Editar</th><th className="p-4 text-center">Aprovar</th></tr></thead><tbody>{MODULOS.map((m)=><tr key={m} className="border-t border-slate-100"><td className="p-4 font-black text-slate-800">{m}</td>{['Visualizar','Editar','Aprovar'].map(k=><td key={k} className="p-4 text-center"><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-300">—</button></td>)}</tr>)}</tbody></table></div>
        <div className="mt-5 flex justify-end"><button type="button" className="flex items-center gap-2 rounded-2xl bg-[#2D8DB8] px-5 py-3 text-sm font-black text-white"><Save size={17}/>Salvar Permissões</button></div>
      </section>
      <section className="rounded-3xl border border-cyan-100 bg-[#F4FBFD] p-6"><div className="flex items-center gap-2 font-black text-[#123B50]"><HelpCircle size={18}/>Manual de Uso</div><p className="mt-2 text-sm text-slate-600">Somente visualização nesta etapa. Nenhuma alteração é gravada.</p></section>
    </div>
  )
}
