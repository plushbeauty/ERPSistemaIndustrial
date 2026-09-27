/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-029
 * Alterações: Reconstrução integral da tela de Calibração Industrial; correção do fluxo de recarga pós-gravação; remoção de referência inexistente freshResultResult; tipagem por guardas de runtime; formulário responsivo Tailwind para tablet.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import {[
                  ['Código', sel.codigo],
                  ['Descrição', sel.descricao],
                  ['Unidade', sel.unidade_medida || '—'],
                  ['Próxima calibração', sel.proxima_calibracao || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <span className="block text-sm font-bold uppercase tracking-wide text-slate-500">{label}</span>
                    <strong className="mt-1 block text-base">{value}</strong>
                  </div>
                ))}
              </div>

              {instrumentBlocked(sel) && <div className="rounded-lg border-2 border-rose-300 bg-rose-50 p-4 text-base font-black text-rose-950">INSTRUMENTO BLOQUEADO PARA USO OPERACIONAL: calibração vencida ou status incompatível.</div>}

              <section className="rounded-xl border border-slate-200 p-4">
                <h2 className="flex items-center gap-2 border-b border-slate-200 pb-3 text-lg font-bold text-[#1e3a8a]"><History size={20} /> Histórico de Laudos e Revisões</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-base">
                    <thead><tr className="h-[54px] border-b border-slate-200 bg-slate-50 text-slate-900"><th className="p-2">Revisão</th><th className="p-2">Certificado</th><th className="p-2">Data</th><th className="p-2">Laboratório</th><th className="p-2">Resultado</th></tr></thead>
                    <tbody>
                      {hist.map(item => <tr key={item.id} className="border-b border-slate-100"><td className="p-2 font-bold">{item.revisao}</td><td className="p-2">{item.numero_certificado}</td><td className="p-2">{item.data_calibracao}</td><td className="p-2">{item.laboratorio || '—'}</td><td className="p-2">{item.resultado}</td></tr>)}
                      {hist.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500">Nenhuma revisão registrada.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2"><Save size={20} className="text-[#1e3a8a]" /><h2 className="text-lg font-bold text-[#1e3a8a]">Registrar Nova Calibração</h2></div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <label className="text-base font-semibold">Certificado<input className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.cert} onChange={e => setForm(current => ({ ...current, cert: e.target.value }))} /></label>
                  <label className="text-base font-semibold">Data<input type="date" className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.data} onChange={e => setForm(current => ({ ...current, data: e.target.value }))} /></label>
                  <label className="text-base font-semibold">Próxima<input type="date" className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.proxima} onChange={e => setForm(current => ({ ...current, proxima: e.target.value }))} /></label>
                  <label className="text-base font-semibold">Resultado<select className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.resultado} onChange={e => setForm(current => ({ ...current, resultado: e.target.value }))}><option>Aprovado</option><option>Reprovado</option><option>Condicional</option></select></label>
                  <label className="text-base font-semibold md:col-span-2">Laboratório<input className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" value={form.laboratorio} onChange={e => setForm(current => ({ ...current, laboratorio: e.target.value }))} /></label>
                  <label className="text-base font-semibold md:col-span-2">Observação<textarea className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base" rows={2} value={form.observacao} onChange={e => setForm(current => ({ ...current, observacao: e.target.value }))} /></label>
                </div>
                <div className="mt-5 flex justify-end">
                  <button type="button" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#1e3a8a] px-5 text-base font-bold text-white disabled:opacity-60" onClick={() => void save()} disabled={busy}><Save size={18} /> Gravar calibração</button>
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
