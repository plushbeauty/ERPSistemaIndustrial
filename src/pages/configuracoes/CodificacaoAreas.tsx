import { Boxes, CheckCircle2, Code2, Layers3, Plus, Save } from 'lucide-react'

export default function CodificacaoAreas() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <section className="rounded-2xl border border-[#C5DEE6] bg-[#F8FCFD] p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#2D8DB8] to-[#17445A] text-white shadow-lg"><Code2 size={21}/></div>
              <div><h2 className="text-lg font-black text-[#123B50]">Configuração de codificação</h2><p className="text-xs font-bold text-[#5C7480]">Prévia visual — sem conexão com banco.</p></div>
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#17445A] px-4 py-2.5 text-sm font-black text-white"><Save size={16}/>Salvar</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-black text-[#123B50]">Modo de numeração<select defaultValue="PS" className="mt-1 w-full rounded-xl border border-[#B8D5DE] bg-white px-3 py-3 font-bold text-[#123B50]"><option value="NUM">Numérico</option><option value="PS">Prefixo + sequência</option><option value="PGR">Prefixo + grupo + sequência</option></select></label>
            <label className="text-sm font-black text-[#123B50]">Prefixo<input defaultValue="AREA" className="mt-1 w-full rounded-xl border border-[#B8D5DE] bg-white px-3 py-3 font-bold text-[#123B50]"/></label>
            <label className="text-sm font-black text-[#123B50]">Separador<input defaultValue="-" className="mt-1 w-full rounded-xl border border-[#B8D5DE] bg-white px-3 py-3 font-bold text-[#123B50]"/></label>
            <label className="text-sm font-black text-[#123B50]">Sequência atual<input type="number" defaultValue="0" className="mt-1 w-full rounded-xl border border-[#B8D5DE] bg-white px-3 py-3 font-bold text-[#123B50]"/></label>
          </div>
        </section>
        <section className="rounded-2xl bg-[#123B50] p-5 text-white shadow-xl">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#55B8C8] to-[#2D8DB8] shadow-lg"><CheckCircle2 size={21}/></div><div><span className="block text-[9px] font-black tracking-[.16em] text-[#8DE0EA]">PRÉVIA VISUAL</span><h2 className="text-lg font-black">Próximo código</h2></div></div>
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-6 text-center"><span className="font-mono text-3xl font-black tracking-wider">AREA-0001</span></div>
          <button type="button" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#55B8C8] px-4 py-3 text-sm font-black text-[#123B50] shadow-lg"><CheckCircle2 size={18}/>Gerar código</button>
        </section>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#C5DEE6] bg-white p-5">
          <div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2D8DB8] to-[#17445A] text-white shadow-md"><Boxes size={19}/></div><div><h2 className="font-black text-[#123B50]">Grupos</h2><p className="text-xs font-semibold text-[#5C7480]">Estrutura visual do cadastro.</p></div></div>
          <div className="grid gap-2 md:grid-cols-[120px_1fr_auto]"><input placeholder="Código" className="rounded-xl border border-[#B8D5DE] px-3 py-2.5 font-bold"/><input placeholder="Nome" className="rounded-xl border border-[#B8D5DE] px-3 py-2.5 font-bold"/><button type="button" className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#17445A] px-4 py-2.5 font-black text-white"><Plus size={16}/>Adicionar</button></div>
          <div className="mt-4 rounded-xl border border-dashed border-[#C5DEE6] bg-[#F8FCFD] p-5 text-center text-sm font-semibold text-[#6B7F88]">Área visual — nenhum dado real carregado.</div>
        </section>
        <section className="rounded-2xl border border-[#C5DEE6] bg-white p-5">
          <div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#55B8C8] to-[#2D8DB8] text-white shadow-md"><Layers3 size={19}/></div><div><h2 className="font-black text-[#123B50]">Áreas</h2><p className="text-xs font-semibold text-[#5C7480]">Estrutura visual do cadastro.</p></div></div>
          <div className="grid gap-2 md:grid-cols-[120px_1fr_auto]"><input placeholder="Código" className="rounded-xl border border-[#B8D5DE] px-3 py-2.5 font-bold"/><input placeholder="Nome" className="rounded-xl border border-[#B8D5DE] px-3 py-2.5 font-bold"/><button type="button" className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#17445A] px-4 py-2.5 font-black text-white"><Plus size={16}/>Adicionar</button></div>
          <div className="mt-4 rounded-xl border border-dashed border-[#C5DEE6] bg-[#F8FCFD] p-5 text-center text-sm font-semibold text-[#6B7F88]">Área visual — nenhum dado real carregado.</div>
        </section>
      </div>
    </div>
  )
}
