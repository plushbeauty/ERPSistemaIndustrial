import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, X, ArrowRight, ClipboardCheck, Factory } from 'lucide-react'

type HelpEntry = {
  title: string
  purpose: string
  prerequisites: string[]
  steps: string[]
  rules: string[]
  integrates: string
  errors: string[]
}

const HELP: Record<string, HelpEntry> = {
  '/pcp/ordens-industriais': {
    title: 'Ordens industriais',
    purpose: 'Consultar e controlar OPs reais, sua origem comercial, quantidade planejada, execução e situação.',
    prerequisites: ['Pedido de venda liberado para produção ou necessidade industrial identificada.', 'Produto ativo e ficha técnica/roteiro revisados.'],
    steps: ['Localize a OP pelo número ou pedido de origem.', 'Confirme produto, quantidade, prazo, prioridade e item comercial vinculado.', 'Libere somente após validar materiais, roteiro e capacidade.', 'Acompanhe os apontamentos até o encerramento.'],
    rules: ['O número da OP é gerado no banco; não digite números manuais.', 'Não repita a criação para resolver um erro sem antes verificar se a OP já existe.'],
    integrates: 'Vendas → Engenharia/BOM → MRP → Agenda e capacidade → Execução → Estoque e Qualidade.',
    errors: ['OP sem ficha: completar a ficha/roteiro antes da liberação.', 'Vínculo comercial ausente: conferir pedido e linha de origem.', 'Saldo insuficiente: executar MRP e encaminhar falta para Compras ou fabricação.']
  },
  '/pcp/apontamentos': {
    title: 'Apontamentos de produção',
    purpose: 'Registrar quantidades boas e refugadas, operação, operador, centro de trabalho e tempos reais.',
    prerequisites: ['OP existente e liberada.', 'Operador e centro de trabalho válidos para a empresa atual.'],
    steps: ['Selecione a OP e operação.', 'Informe início/fim, quantidade boa e refugo.', 'Classifique o refugo e a parada quando aplicável.', 'Revise e grave; confira o saldo remanescente.'],
    rules: ['Quantidade e tempos devem refletir a execução real.', 'Não duplique o lançamento após timeout sem consultar o histórico.'],
    integrates: 'PCP → Custos industriais → Estoque → Qualidade/RNC → Reprogramação.',
    errors: ['Operação não listada: revisar roteiro.', 'Refugo sem motivo: selecionar motivo de falha ativo.', 'Saldo não atualizado: confirmar o retorno da transação antes de repetir.']
  },
  '/pcp/engenharia-bom': {
    title: 'Estrutura de materiais (BOM)',
    purpose: 'Manter a composição do produto e as quantidades de componentes consumidas por unidade.',
    prerequisites: ['Produto pai e componentes cadastrados na mesma empresa.', 'Unidades de medida e perdas validadas.'],
    steps: ['Abra a estrutura vigente do produto pai.', 'Inclua cada componente, quantidade e unidade.', 'Valide ciclos, duplicidades e perdas.', 'Salve e execute MRP de conferência antes de liberar OPs.'],
    rules: ['Use códigos técnicos reais e estrutura aprovada.', 'Mudanças devem preservar rastreabilidade da versão vigente.'],
    integrates: 'Engenharia → MRP → Compras/Estoque → PCP → Custo do produto.',
    errors: ['Componente não encontrado: verificar cadastro e empresa.', 'Necessidade inesperada: revisar unidade, quantidade e percentual de perda.']
  },
  '/pcp/roteiro-operacoes': {
    title: 'Roteiro de operações',
    purpose: 'Definir a sequência operacional, centros de trabalho e tempos necessários para fabricar um produto.',
    prerequisites: ['Produto técnico cadastrado.', 'Centros de trabalho, máquinas e tempos de processo validados.'],
    steps: ['Selecione o produto e a versão do roteiro.', 'Cadastre as operações na sequência real.', 'Informe posto, tempo e parâmetros aplicáveis.', 'Valide a rota com Engenharia e Produção antes de programar.'],
    rules: ['A sequência deve representar o fluxo físico real.', 'Não atribua máquina inativa ou de outra empresa.'],
    integrates: 'Engenharia → Capacidade → Sequenciamento → Execução → OEE.',
    errors: ['Sem máquina sugerida: vincular posto/máquina à operação.', 'Tempo incorreto: confirmar ficha de processo e ciclo real.']
  },
  '/pcp/ficha-processo': {
    title: 'Ficha de processo',
    purpose: 'Centralizar parâmetros de fabricação, ciclo, setup, ferramental, inspeções e critérios de aceitação.',
    prerequisites: ['Produto e processo identificados.', 'Parâmetros técnicos aprovados por Engenharia/Qualidade.'],
    steps: ['Localize o produto pelo código.', 'Confira máquina, ferramental, ciclo, setup e condições de operação.', 'Registre limites e pontos de inspeção aprovados.', 'Use a ficha vigente na programação e na execução.'],
    rules: ['Não invente parâmetros quando a ficha técnica não estiver disponível.', 'Alterações críticas precisam de revisão e rastreabilidade.'],
    integrates: 'Engenharia → PCP → Produção → Qualidade → Manutenção.',
    errors: ['Ficha ausente: interromper liberação e solicitar validação técnica.', 'Parâmetro divergente: comparar versão vigente com a OP.']
  },
  '/pcp/postos-trabalho': {
    title: 'Postos de trabalho',
    purpose: 'Manter centros de trabalho utilizados no roteiro, no cálculo de capacidade e nos apontamentos.',
    prerequisites: ['Identificação e capacidade operacional confirmadas.'],
    steps: ['Consulte o código e a descrição do posto.', 'Confira taxa/capacidade e situação.', 'Associe o posto às operações pertinentes.', 'Teste a seleção no roteiro e na agenda.'],
    rules: ['Não cadastrar duplicidade de código na mesma empresa.', 'Posto inativo não deve receber novas programações.'],
    integrates: 'Engenharia → Capacidade → Agenda → Apontamentos.',
    errors: ['Posto não aparece: conferir ativo, empresa e permissões.', 'Capacidade divergente: revisar cadastro com Engenharia/Produção.']
  },
  '/pcp/painel-ordens': {
    title: 'Painel de ordens',
    purpose: 'Acompanhar o conjunto de OPs e identificar atrasos, bloqueios e prioridades de produção.',
    prerequisites: ['OPs e prazos cadastrados corretamente.'],
    steps: ['Filtre por situação, prazo, produto ou máquina.', 'Priorize ordens vencidas ou bloqueadas.', 'Abra a OP para revisar material, roteiro e apontamentos.', 'Atualize o planejamento após mudanças de prioridade.'],
    rules: ['Indicadores refletem os dados gravados; painel não substitui apontamento.', 'Não encerre OP com saldo ou pendência de qualidade.'],
    integrates: 'Vendas → PCP → MRP → Agenda → Execução → Qualidade.',
    errors: ['Indicador vazio: aplique filtros e confirme a empresa ativa.', 'OP atrasada: revisar capacidade, setup, material e sequência.']
  },
  '/pcp/apuracao-turno': {
    title: 'Apuração de turno',
    purpose: 'Identificar o operador e registrar eventos de turno com trilha de auditoria.',
    prerequisites: ['Sessão autenticada e empresa ativa.', 'Crachá válido e operador cadastrado.'],
    steps: ['Leia o crachá ou informe o código autorizado.', 'Confira o operador identificado.', 'Associe a OP/máquina quando solicitado.', 'Confirme o evento e verifique a mensagem de retorno.'],
    rules: ['Não compartilhar credenciais ou registrar evento em nome de outra pessoa.', 'Se não identificar o operador, não contorne o bloqueio.'],
    integrates: 'RH/Operadores → PCP → Tempos → OEE e Custos.',
    errors: ['Empresa não identificada: renovar sessão e validar vínculo do usuário.', 'Crachá inválido: conferir cadastro com RH.']
  },
  '/pcp/ordens': {
    title: 'Planejador de OPs',
    purpose: 'Criar OPs vinculadas a pedido e linha de venda e analisar a necessidade de materiais.',
    prerequisites: ['Pedido e item de venda existentes.', 'Produto ativo e marcado corretamente para fabricação.'],
    steps: ['Selecione o pedido comercial.', 'Selecione a linha exata do pedido e confira produto/quantidade.', 'Informe parâmetros técnicos validados e crie a OP.', 'Revise a explosão MRP e resolva faltas antes de programar.'],
    rules: ['A OP deve conservar o vínculo com o item de venda.', 'O número é gerado no banco e a falta líquida orienta a fabricação.'],
    integrates: 'Vendas → OP → BOM/MRP → Compras/Estoque → Agenda.',
    errors: ['Item não pertence ao pedido: selecione novamente a linha correta.', 'MRP indisponível: conferir BOM vigente e acesso aos dados técnicos.']
  },
  '/pcp/demanda': {
    title: 'Demanda de produção',
    purpose: 'Transformar demanda comercial e previsões válidas em necessidades de fabricação rastreáveis.',
    prerequisites: ['Pedidos comerciais atualizados e itens identificados.'],
    steps: ['Filtre a demanda por prazo e situação.', 'Compare quantidade pedida, saldo disponível e reserva.', 'Identifique falta líquida de itens fabricados.', 'Gere ou acompanhe a OP vinculada à linha de venda.'],
    rules: ['Não produzir novamente quantidade já coberta por saldo/reserva.', 'Itens comprados seguem fluxo de Compras.'],
    integrates: 'Vendas → Estoque → MRP → PCP → Compras.',
    errors: ['Demanda divergente: confira item, reserva e saldo do estoque.', 'Produto não fabricado: encaminhar necessidade para Compras.']
  },
  '/pcp/materiais': {
    title: 'Materiais e MRP',
    purpose: 'Calcular necessidades brutas/líquidas por BOM e comparar com estoque e reservas reais.',
    prerequisites: ['OP ou demanda selecionada e BOM vigente.'],
    steps: ['Selecione a OP/produto e quantidade.', 'Execute a explosão MRP.', 'Revise estoque, reservas, necessidade líquida e sugestão.', 'Encaminhe compras/fabricação conforme a política do item.'],
    rules: ['A necessidade líquida considera consumo e disponibilidade; valide unidades e perdas.', 'Não ajustar estoque manualmente para eliminar alerta.'],
    integrates: 'Engenharia/BOM → Estoque → Compras → PCP.',
    errors: ['BOM vazia: validar estrutura e versão.', 'Saldo inconsistente: conferir reservas e movimentações do estoque.']
  },
  '/pcp/paradas': {
    title: 'Paradas de máquina',
    purpose: 'Registrar indisponibilidade, motivo, duração e efeito no plano de produção.',
    prerequisites: ['Máquina cadastrada e motivo de parada identificado.'],
    steps: ['Selecione máquina e OP afetada.', 'Registre início, fim ou parada ainda aberta.', 'Classifique o motivo e inclua observação objetiva.', 'Revise o impacto e replaneje as ordens seguintes.'],
    rules: ['Não fechar parada sem horário final real.', 'Falha de manutenção deve seguir o fluxo de manutenção.'],
    integrates: 'PCP → Manutenção → Agenda → OEE → Custos.',
    errors: ['Máquina não disponível: conferir cadastro/empresa.', 'Plano não recalculado: revisar agenda após encerrar a parada.']
  },
  '/pcp/sequenciamento': {
    title: 'Sequenciamento',
    purpose: 'Ordenar OPs por prioridade, prazo, setup e restrições de máquina/ferramental.',
    prerequisites: ['OPs liberadas, tempos de processo e recursos atualizados.'],
    steps: ['Revise prioridades e datas prometidas.', 'Agrupe por recurso quando isso reduzir setup sem violar prazo.', 'Verifique conflitos e capacidade por turno.', 'Confirme a sequência e confira a agenda resultante.'],
    rules: ['Não sobrepor a mesma máquina ou molde em intervalos conflitantes.', 'Setup e turno devem entrar no cálculo do tempo disponível.'],
    integrates: 'PCP → Capacidade → Agenda → Execução.',
    errors: ['Conflito de recurso: mover horário ou escolher recurso compatível.', 'Prazo impossível: escalar a decisão e registrar a exceção.']
  },
  '/pcp/planejamento': {
    title: 'Planejamento industrial',
    purpose: 'Balancear demanda, materiais, recursos e datas de entrega para o horizonte de produção.',
    prerequisites: ['Pedidos, BOM, roteiros, calendários e disponibilidade de máquina atualizados.'],
    steps: ['Analise demanda e atrasos.', 'Confira materiais e restrições de capacidade.', 'Defina prioridades e janela de produção.', 'Publique a programação e monitore desvios.'],
    rules: ['Planejamento não substitui a confirmação real de produção.', 'Replaneje quando houver parada, refugo ou alteração de pedido.'],
    integrates: 'Vendas → MRP → Capacidade → Sequenciamento → Execução.',
    errors: ['Carga excessiva: redistribuir recursos ou ajustar o plano com aprovação.', 'Falta de material: tratar antes da liberação.']
  },
  '/pcp/capacidade': {
    title: 'Capacidade industrial',
    purpose: 'Comparar carga de OPs com horas disponíveis por máquina e turno.',
    prerequisites: ['Calendário de trabalho, setup, ciclo e eficiência cadastrados.'],
    steps: ['Selecione recurso e período.', 'Confira carga planejada, horas de turno e eficiência.', 'Identifique gargalos e períodos ociosos.', 'Ajuste a sequência e valide novamente.'],
    rules: ['Capacidade nominal não equivale a capacidade efetiva.', 'Descontar setup e indisponibilidades conhecidas.'],
    integrates: 'Roteiro → Calendário → Agenda → Sequenciamento.',
    errors: ['Capacidade zerada: revisar turno e ciclo.', 'Sobrecarga: dividir janelas e reordenar OPs sem sobreposição.']
  },
  '/pcp/agenda-maquinas': {
    title: 'Agenda de máquinas',
    purpose: 'Programar OPs em intervalos reais sem conflitos de máquina e respeitando calendário e setup.',
    prerequisites: ['OP liberada, máquina ativa, calendário e tempos de processo disponíveis.'],
    steps: ['Selecione OP, máquina e quantidade.', 'Defina início; calcule duração com setup, ciclo, cavidades e eficiência.', 'Confirme turno e calendário de trabalho.', 'Grave e confira conflitos ou reprogramações.'],
    rules: ['O banco bloqueia intervalos sobrepostos para a mesma máquina.', 'Após apontamento, recalcule o saldo e as próximas programações.'],
    integrates: 'OP → Calendário → Capacidade → Execução → Replanejamento.',
    errors: ['Conflito de agenda: escolha intervalo livre.', 'Fim fora do turno: ajustar janela considerando calendário.']
  },
  '/pcp/mrp-ii': {
    title: 'MRP II',
    purpose: 'Integrar necessidade de materiais ao planejamento de capacidade e recursos produtivos.',
    prerequisites: ['BOM e roteiros vigentes, estoque e reservas consistentes, recursos cadastrados.'],
    steps: ['Execute MRP para a demanda escolhida.', 'Revise faltas de materiais e ordens sugeridas.', 'Compare carga requerida com capacidade por recurso.', 'Trate exceções antes de liberar a sequência.'],
    rules: ['Não confundir necessidade de material com capacidade de máquina.', 'Propostas devem respeitar empresa e dados reais.'],
    integrates: 'Vendas → BOM/MRP → Compras/Estoque → Capacidade → PCP.',
    errors: ['Resultado sem componente: revisar BOM.', 'Capacidade insuficiente: replanejar horizonte e recurso.']
  },
  '/pcp/execucao-industrial': {
    title: 'Execução industrial',
    purpose: 'Acompanhar ordens em execução e registrar avanço, perdas, tempos e encerramento.',
    prerequisites: ['OP liberada e programação válida.', 'Operador, máquina e critérios de qualidade definidos.'],
    steps: ['Abra a OP programada.', 'Confira operação, máquina e instruções da ficha.', 'Registre produção boa, refugo e paradas.', 'Confira saldo remanescente e pendências de qualidade antes de encerrar.'],
    rules: ['Não declarar produção sem apontamento.', 'Refugo deve ter motivo e tratamento conforme Qualidade.'],
    integrates: 'PCP → Estoque → Qualidade → Custos → OEE.',
    errors: ['OP bloqueada: resolver material, setup ou qualidade.', 'Saldo divergente: revisar apontamentos confirmados.']
  },
  '/pcp/dashboard-oee': {
    title: 'Indicadores OEE',
    purpose: 'Acompanhar disponibilidade, desempenho e qualidade com base em eventos reais de produção.',
    prerequisites: ['Apontamentos, paradas, quantidade boa/refugada e tempos válidos.'],
    steps: ['Selecione o período e recurso.', 'Compare disponibilidade, desempenho e qualidade.', 'Investigue perdas por parada, ciclo e refugo.', 'Abra a rotina de origem para corrigir o dado ou executar a ação.'],
    rules: ['Indicador só é confiável com apontamentos completos.', 'Não editar indicador calculado para mascarar perda.'],
    integrates: 'Execução → Paradas → Qualidade → Manutenção → Melhoria contínua.',
    errors: ['OEE sem dados: confira apontamentos e intervalo.', 'Taxa anormal: revisar duração e quantidades registradas.']
  },
  '/pcp/tablet-operador': {
    title: 'Tablet do operador',
    purpose: 'Oferecer uma rotina direta para o chão de fábrica com foco na OP ativa e nos apontamentos.',
    prerequisites: ['Sessão autenticada, operador identificado e máquina atribuída.'],
    steps: ['Identifique o operador.', 'Confirme OP, operação e máquina antes de iniciar.', 'Registre produção, refugo e parada no momento em que ocorrerem.', 'Confirme o retorno de gravação antes de trocar de OP.'],
    rules: ['Não compartilhar usuário e senha.', 'Não registrar operação em máquina diferente da real.'],
    integrates: 'Operador → PCP → Qualidade → Estoque → OEE.',
    errors: ['Sem OP ativa: consultar o PCP antes de iniciar.', 'Falha de gravação: confirmar histórico antes de reenviar.']
  },
  '/mrp': {
    title: 'Planejamento de necessidades (MRP)',
    purpose: 'Calcular materiais necessários para atender demanda real, considerando a estrutura do produto.',
    prerequisites: ['Produto, BOM e quantidades válidos.', 'Saldo e reservas atualizados.'],
    steps: ['Escolha demanda/produto e quantidade.', 'Execute o cálculo.', 'Analise necessidade bruta, saldo, reserva e falta líquida.', 'Encaminhe a ação recomendada para Compras ou PCP.'],
    rules: ['A necessidade deve seguir a BOM vigente e suas unidades.', 'Não criar estoque fictício para zerar falta.'],
    integrates: 'Vendas → Engenharia → Estoque → Compras/PCP.',
    errors: ['Sem explosão: conferir BOM e permissões.', 'Falta incorreta: revisar reservas e perdas.']
  },
  '/configuracao-lote-pcp': {
    title: 'Configuração de lote do PCP',
    purpose: 'Definir parâmetros controlados de lote e rastreabilidade aplicáveis à produção.',
    prerequisites: ['Política de lote e rastreabilidade aprovada.'],
    steps: ['Confira os parâmetros atuais da empresa.', 'Defina lote mínimo/múltiplo somente conforme regra aprovada.', 'Valide o efeito sobre quantidade da OP e rastreabilidade.', 'Teste com uma OP controlada antes de ampliar o uso.'],
    rules: ['Não altere lotes históricos.', 'Parâmetros precisam respeitar unidade e política do produto.'],
    integrates: 'Cadastro técnico → PCP → Produção → Estoque e rastreabilidade.',
    errors: ['Lote inválido: conferir unidade e múltiplo.', 'Rastreabilidade incompleta: revisar apontamentos e movimentações.']
  },
  '/vendas/pcp': {
    title: 'Integração Vendas e PCP',
    purpose: 'Analisar itens comerciais que precisam de fabricação e manter rastreabilidade até a OP.',
    prerequisites: ['Pedido de venda e linhas de item válidas.'],
    steps: ['Localize pedido e item.', 'Confirme saldo, reserva e quantidade faltante.', 'Gere/acompanhе a OP vinculada à linha exata.', 'Retorne ao pedido para acompanhar prazo e atendimento.'],
    rules: ['Não misture linhas do mesmo produto sem selecionar o item de origem.', 'Número da OP é gerado pelo banco.'],
    integrates: 'Pedido → Item → OP → MRP → Agenda → Expedição.',
    errors: ['Produto não fabricado: encaminhar a Compras.', 'OP duplicada: consultar a rastreabilidade antes de criar outra.']
  },
  '/vendas/mrp': {
    title: 'MRP da carteira comercial',
    purpose: 'Conferir cobertura de estoque e necessidades de fabricação para pedidos de venda.',
    prerequisites: ['Carteira comercial atualizada e estrutura dos produtos vigente.'],
    steps: ['Filtre os pedidos pendentes.', 'Confira cobertura, reserva e falta líquida.', 'Separe itens fabricados dos comprados.', 'Gere a ação operacional e monitore o atendimento.'],
    rules: ['Usar dados reais de estoque e reservas.', 'Não gerar necessidade duplicada para item já coberto.'],
    integrates: 'Vendas → Estoque → MRP → PCP/Compras.',
    errors: ['Cobertura divergente: revisar reservas.', 'Item sem BOM: encaminhar à Engenharia.']
  }
}

const QUICK_LINKS = [
  { label: 'Ordens', path: '/pcp/ordens' },
  { label: 'Agenda de máquinas', path: '/pcp/agenda-maquinas' },
  { label: 'Sequenciamento', path: '/pcp/sequenciamento' },
  { label: 'MRP II', path: '/pcp/mrp-ii' },
  { label: 'Execução', path: '/pcp/execucao-industrial' },
  { label: 'Qualidade / RNC', path: '/qualidade/industrial' }
]

export default function PCPPageHelp() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const path = location.pathname
  const isPcp = path.startsWith('/pcp') || path === '/mrp' || path === '/vendas/mrp' || path === '/vendas/pcp' || path === '/configuracao-lote-pcp'
  if (!isPcp || path === '/pcp') return null
  const page = HELP[path] ?? {
    title: 'Ajuda do PCP',
    purpose: 'Use esta página para executar a etapa indicada no título e mantenha a rastreabilidade da ordem.',
    prerequisites: ['Sessão autenticada e empresa correta selecionada.', 'OP, produto, roteiro e dados operacionais válidos.'],
    steps: ['Confira os filtros e selecione um registro real.', 'Revise os dados de origem antes de gravar.', 'Confirme a mensagem de sucesso e consulte o histórico.', 'Se houver divergência, corrija a origem em vez de inserir dados artificiais.'],
    rules: ['Respeite o vínculo entre empresa, pedido, item e OP.', 'Não repita uma transação sem verificar se ela já foi gravada.'],
    integrates: 'Vendas → Engenharia/MRP → PCP → Produção → Qualidade e Estoque.',
    errors: ['Registro ausente: conferir cadastro, empresa e permissões.', 'Falha ao gravar: leia a mensagem e consulte o histórico antes de tentar novamente.']
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-3 right-3 z-[80] inline-flex h-8 items-center gap-2 rounded-[2px] border border-sky-800 bg-sky-800 px-3 text-[10px] font-bold uppercase text-white shadow-lg hover:bg-sky-900" aria-label="Abrir ajuda contextual do PCP">
        <BookOpen size={14} /> Ajuda desta página
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/50 p-3" role="presentation" onClick={() => setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="pcp-help-title" className="mx-auto mt-[4vh] max-h-[92vh] max-w-3xl overflow-y-auto rounded-[2px] border border-slate-300 bg-white text-slate-900 shadow-2xl" onClick={event => event.stopPropagation()}>
            <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div><p className="text-[9px] font-bold uppercase tracking-wider text-sky-800">Manual operacional · PCP Industrial</p><h2 id="pcp-help-title" className="mt-1 text-sm font-bold">{page.title}</h2><p className="mt-1 text-[11px] text-slate-600">{page.purpose}</p></div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] border border-slate-300" aria-label="Fechar ajuda"><X size={14} /></button>
            </header>
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <article className="border border-slate-200 p-3"><h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase"><ClipboardCheck size={14} /> Antes de começar</h3><ul className="list-disc space-y-1 pl-4 text-[11px]">{page.prerequisites.map(item => <li key={item}>{item}</li>)}</ul></article>
              <article className="border border-slate-200 p-3"><h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase"><Factory size={14} /> Regras de negócio</h3><ul className="list-disc space-y-1 pl-4 text-[11px]">{page.rules.map(item => <li key={item}>{item}</li>)}</ul></article>
              <article className="border border-slate-200 p-3 md:col-span-2"><h3 className="mb-2 text-[10px] font-bold uppercase">Passo a passo</h3><ol className="list-decimal space-y-1 pl-4 text-[11px]">{page.steps.map(item => <li key={item}>{item}</li>)}</ol></article>
              <article className="border border-slate-200 p-3"><h3 className="mb-2 text-[10px] font-bold uppercase">Integrações</h3><p className="text-[11px]">{page.integrates}</p></article>
              <article className="border border-amber-200 bg-amber-50 p-3"><h3 className="mb-2 text-[10px] font-bold uppercase text-amber-900">Problemas comuns</h3><ul className="list-disc space-y-1 pl-4 text-[11px] text-amber-950">{page.errors.map(item => <li key={item}>{item}</li>)}</ul></article>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3"><span className="text-[10px] text-slate-500">Ajuda contextual: consulte sempre o registro e a empresa ativos.</span><div className="flex flex-wrap gap-1">{QUICK_LINKS.map(link => <button key={link.path} type="button" onClick={() => { setOpen(false); navigate(link.path) }} className="inline-flex h-7 items-center gap-1 rounded-[2px] border border-slate-300 px-2 text-[10px] font-bold hover:bg-slate-100">{link.label} <ArrowRight size={11} /></button>)}</div></footer>
          </section>
        </div>
      )}
    </>
  )
}
