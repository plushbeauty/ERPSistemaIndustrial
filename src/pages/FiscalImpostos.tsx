import FiscalSidebar from '../components/fiscal/FiscalSidebar'

export default function FiscalImpostos() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-300 bg-white p-5">
        <h1 className="text-xl font-bold text-slate-950">[☰] ERP INDUSTRIAL | MÓDULO: FISCAL &gt; MATRIZ DE REGRAS TRIBUTÁRIAS</h1>
      </header>
      <div className="flex flex-col lg:flex-row">
        <FiscalSidebar />
        <section className="flex-1 p-5">
          <div className="mb-5 flex justify-end gap-2">
            <button className="min-h-[54px] rounded-md bg-slate-700 px-5 font-bold text-white">➕ NOVA REGRA FISCAL</button>
            <button className="min-h-[54px] rounded-md bg-blue-600 px-5 font-bold text-white">💾 SALVAR MATRIZ</button>
            <button className="min-h-[54px] rounded-md bg-red-600 px-5 font-bold text-white">❌ DELETAR EXCEÇÃO</button>
          </div>
          <section className="rounded-md border border-slate-300 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-slate-950">👉 1. PARÂMETROS DE APLICAÇÃO DA REGRA</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-base font-semibold">NCM Origem<input className="mt-2 min-h-[54px] w-full rounded-md border border-slate-400 px-3 text-base text-slate-900"/><button className="mt-2 min-h-[54px] rounded-md bg-slate-700 px-4 font-bold text-white">🔍 Lupa</button></label>
              <label className="text-base font-semibold">CFOP Operação<input className="mt-2 min-h-[54px] w-full rounded-md border border-slate-400 px-3 text-base text-slate-900"/><button className="mt-2 min-h-[54px] rounded-md bg-slate-700 px-4 font-bold text-white">🔍 Lupa</button></label>
              <label className="text-base font-semibold">Regime Empresa<select className="mt-2 min-h-[54px] w-full rounded-md border border-slate-400 bg-white px-3 text-base text-slate-900"><option>Lucro Presumido</option><option>Lucro Real</option><option>Simples Nacional</option></select></label>
              <label className="text-base font-semibold">UF Destino<select className="mt-2 min-h-[54px] w-full rounded-md border border-slate-400 bg-white px-3 text-base text-slate-900"><option>SP - São Paulo</option></select></label>
            </div>
            <h2 className="mb-5 mt-7 text-xl font-bold text-slate-950">👉 2. CONFIGURAÇÃO DE ALÍQUOTAS EFETIVAS</h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <label className="text-base font-semibold">ICMS<input type="number" step="0.01" className="mt-2 min-h-[54px] w-full rounded-md border border-slate-400 px-3 text-base text-slate-900" placeholder="0,00 %"/></label>
              <label className="text-base font-semibold">IPI<input type="number" step="0.01" className="mt-2 min-h-[54px] w-full rounded-md border border-slate-400 px-3 text-base text-slate-900" placeholder="0,00 %"/></label>
              <label className="text-base font-semibold">PIS<input type="number" step="0.01" className="mt-2 min-h-[54px] w-full rounded-md border border-slate-400 px-3 text-base text-slate-900" placeholder="0,00 %"/></label>
              <label className="text-base font-semibold">COFINS<input type="number" step="0.01" className="mt-2 min-h-[54px] w-full rounded-md border border-slate-400 px-3 text-base text-slate-900" placeholder="0,00 %"/></label>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
