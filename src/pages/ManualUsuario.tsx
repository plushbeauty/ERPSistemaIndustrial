/**
 * Desenvolvedor: FernandoSch
 * Status do Build Local: Não executado — validação será feita no gate remoto.
 */
import { BookOpen, Boxes, CheckCircle2, FileText, Factory, HelpCircle, KeyRound, Package, ShieldCheck, ShoppingCart, Wrench, Truck, Users, BarChart3 } from 'lucide-react'

type ManualSection = {
  id: string
  title: string
  intro: string
  icon: typeof BookOpen
  steps: string[]
  fields: string[]
  flow: string[]
}

const sections: ManualSection[] = [
  {
    id:'login', title:'Login e acesso', icon:KeyRound,
    intro:'Como entrar, recuperar acesso e entender por que uma tela pode ficar bloqueada.',
    steps:['Informe empresa, usuário/e-mail e senha.','Use Esqueci minha senha somente pelo fluxo oficial de recuperação.','Se o acesso for negado, preserve a mensagem exibida e informe o horário ao suporte.'],
    fields:['Empresa: empresa autorizada para sua conta.','Usuário/e-mail: identidade cadastrada.','Senha: credencial pessoal; nunca compartilhe.'],
    flow:['Login','Validação de sessão','Empresa e permissões','Dashboard']
  },
  {
    id:'vendas', title:'Vendas e Pedidos', icon:ShoppingCart,
    intro:'Cadastre clientes, monte pedidos, acompanhe disponibilidade e encaminhe faltas para PCP.',
    steps:['Clique NOVO para iniciar um pedido.','Escolha o cliente pelo código + lupa e informe pedido do cliente e prazo.','Preencha o item e clique ADD ITEM; isso apenas adiciona uma linha ao mesmo pedido.','Revise a grade e clique GRAVAR quando o pedido estiver completo.','Se houver falta de produto fabricado, o sistema apresenta a necessidade de produção antes de gerar a OP.'],
    fields:['Cliente: código/consulta do cadastro.','Produto: código/consulta do produto ativo.','Quantidade: quantidade solicitada pelo cliente.','Cód. cliente: referência do item no cliente, quando aplicável.','Entrega: data prometida.'],
    flow:['Cliente','Pedido','Itens','Estoque/reserva','Falta','OP/PCP','Expedição/NF']
  },
  {
    id:'pcp', title:'PCP Industrial', icon:Factory,
    intro:'Planeje demanda, capacidade e produção. A programação deve considerar máquina, molde, lados A/B, setup e operadores.',
    steps:['Consulte Demanda para identificar o que precisa ser produzido.','Abra a OP e confirme produto, quantidade, prazo, BOM e roteiro.','Na Programação, escolha máquina, molde, lado quando aplicável, operadores, ciclo, cavidades, setup e datas.','Confira conflitos e a linha do tempo/Gantt antes de liberar.','Registre apontamentos e paradas no Chão de Fábrica.'],
    fields:['Máquina: recurso produtivo real.','Molde: ferramental que será usado; uma prensa pode trabalhar com mais de um molde em períodos diferentes.','Lado A/B: posições independentes quando a máquina permitir operação simultânea.','Setup: tempo de preparação/troca.','Ciclo e cavidades: parâmetros usados para capacidade e planejamento.'],
    flow:['Demanda','MRP/MPS','OP','Capacidade','Programação/Gantt','Chão de Fábrica','Apontamento']
  },
  {
    id:'engenharia', title:'Engenharia e BOM', icon:Package,
    intro:'Mantenha produtos, fichas técnicas, versões, operações e estruturas que alimentam PCP/MRP.',
    steps:['Pesquise o produto pelo código.','Confira a versão ativa da ficha técnica.','Revise componentes, quantidades, perdas e operações.','Só programe produção usando estrutura/roteiro válidos.'],
    fields:['Código do produto: identificação única do item.','Versão: revisão vigente da engenharia.','Componente: matéria-prima ou componente consumido.','Operação: etapa do processo produtivo.'],
    flow:['Produto','BOM/ficha','Roteiro','MRP','PCP']
  },
  {
    id:'estoque', title:'Estoque e Almoxarifado', icon:Boxes,
    intro:'Consulte saldo, disponibilidade, lotes e movimentações sem confundir estoque físico com estoque reservado.',
    steps:['Consulte o produto antes de movimentar.','Confira saldo, reservado e disponível.','Use lote quando a rastreabilidade for obrigatória.','Registre entrada, saída, transferência ou ajuste pela rotina correspondente.'],
    fields:['Produto: item do estoque.','Lote: identificação da matéria-prima/produto quando aplicável.','Quantidade: quantidade efetivamente movimentada.','Origem/destino: local ou processo relacionado.'],
    flow:['Recebimento','Lote','Estoque','Reserva','Consumo','Produto acabado']
  },
  {
    id:'compras', title:'Compras', icon:Truck,
    intro:'Trate necessidades de materiais, fornecedores, cotações, pedidos e recebimento.',
    steps:['Consulte a necessidade originada pelo MRP ou pela operação.','Selecione fornecedor cadastrado e valide condições.','Grave a solicitação/pedido conforme a rotina.','No recebimento, confira quantidade, lote e inspeção quando exigida.'],
    fields:['Item: código do material.','Quantidade: necessidade de compra.','Fornecedor: cadastro homologado.','Data: prazo solicitado/confirmado.'],
    flow:['Necessidade','Cotação','Fornecedor','Pedido','Recebimento','Estoque/Qualidade']
  },
  {
    id:'qualidade', title:'Qualidade / SGQ', icon:ShieldCheck,
    intro:'Registre inspeções, RNC, CAPA, causa raiz, auditorias, documentos, FMEA e riscos.',
    steps:['Escolha a rotina correta: Recebimento, Processo ou Final.','Registre evidência e resultado da inspeção.','Quando houver não conformidade, abra RNC e registre contenção, causa e ação.','Use 5 Porquês/Ishikawa para causa raiz e 5W2H/CAPA para tratamento.','Mantenha documentos, revisões e evidências rastreáveis.'],
    fields:['Lote/OP: origem da inspeção.','Característica: o que está sendo verificado.','Resultado: conforme/não conforme conforme o plano.','Evidência: informação que sustenta a decisão.'],
    flow:['Inspeção','RNC','Causa','CAPA','Verificação de eficácia','Encerramento']
  },
  {
    id:'producao', title:'Produção e Chão de Fábrica', icon:Wrench,
    intro:'Transforme programação em apontamento real, com produção boa, refugo, paradas e rastreabilidade.',
    steps:['Selecione a OP e operação correta.','Informe quantidades reais produzidas e refugadas.','Registre defeitos e paradas no momento em que ocorrerem.','Confira o resultado antes de finalizar a etapa.'],
    fields:['OP: ordem que está sendo executada.','Quantidade boa: produção conforme.','Refugo: perda identificada.','Parada: motivo e duração.'],
    flow:['OP liberada','Setup','Produção','Parada/refugo','Qualidade','Estoque']
  },
  {
    id:'fiscal', title:'Fiscal / NF-e', icon:FileText,
    intro:'Emita e acompanhe documentos fiscais somente com dados fiscais e integrações reais.',
    steps:['Confira cliente, produtos, impostos e origem do pedido.','Gere a NF-e pela rotina fiscal configurada.','Acompanhe processamento e retorno da SEFAZ.','Consulte XML/DANFE somente quando o arquivo real estiver disponível.'],
    fields:['Pedido: documento comercial de origem.','Natureza/operação: operação fiscal correta.','Impostos: valores calculados pela configuração fiscal.','Chave/protocolo: retorno efetivo da SEFAZ.'],
    flow:['Pedido','Fiscal','NF-e','SEFAZ','XML/DANFE','Expedição']
  },
  {
    id:'expedicao', title:'Expedição', icon:Truck,
    intro:'Separe, confira, embale, gere romaneio e libere a entrega com rastreabilidade.',
    steps:['Selecione o pedido/NF autorizado.','Separe os itens conforme quantidade e lote.','Faça a conferência de volumes.','Registre romaneio/transportadora e finalize a saída.'],
    fields:['Pedido/NF: origem da expedição.','Lote: rastreabilidade.','Volumes: quantidade física conferida.','Transportadora: responsável pela entrega.'],
    flow:['Pedido/NF','Separação','Conferência','Embalagem','Romaneio','Entrega']
  },
  {
    id:'financeiro', title:'Financeiro e Custos', icon:BarChart3,
    intro:'Acompanhe valores derivados dos documentos e lançamentos financeiros persistidos.',
    steps:['Consulte lançamentos e vencimentos reais.','Analise custos por produto/OP quando disponíveis.','Faça baixa somente pela rotina financeira autorizada.','Não digite valores apenas para preencher indicadores.'],
    fields:['Documento: origem do lançamento.','Vencimento: data financeira real.','Valor: valor persistido.','Status: situação do lançamento.'],
    flow:['Pedido/NF','Lançamento','Vencimento','Baixa','Fluxo de caixa','Indicadores']
  },
  {
    id:'administracao', title:'Administração e Segurança', icon:Users,
    intro:'Cadastre usuários, perfis, permissões, empresas e consulte auditoria.',
    steps:['Crie usuários somente para pessoas autorizadas.','Associe o perfil adequado ao trabalho executado.','Revise permissões antes de liberar acesso.','Use Logs para investigar alterações e acessos.'],
    fields:['Usuário: identidade real.','Perfil: conjunto de permissões.','Empresa: contexto de acesso.','Situação: ativo/inativo.'],
    flow:['Empresa','Usuário','Perfil','Permissões','Sessão','Auditoria']
  },
]

function Toolbar(){return <div className="manual-toolbar">{['NOVO','EDITAR','GRAVAR','EXCLUIR','PESQUISAR','FILTRAR','IMPRIMIR','HISTÓRICO'].map(x=><span key={x} className="manual-button">{x}</span>)}</div>}

export default function ManualUsuario(){
  return <main className="manual-page">
    <header className="manual-hero">
      <div><span className="manual-eyebrow">SGQ ERP • MANUAL OPERACIONAL</span><h1>Manual do Usuário</h1><p>Guia de preenchimento: o que cada módulo faz, quais campos preencher, quais botões usar e para onde o registro segue.</p></div>
      <div className="manual-badge"><BookOpen size={22}/> Operação guiada</div>
    </header>
    <div className="manual-grid">
      {sections.map(section=>{
        const Icon=section.icon
        return <section id={section.id} className="manual-section" key={section.id}>
          <div className="manual-section-head"><div className="manual-icon"><Icon size={22}/></div><div><h2>{section.title}</h2><p>{section.intro}</p></div></div>
          <Toolbar/>
          <div className="manual-panels">
            <div className="manual-panel"><strong>COMO PREENCHER</strong>{section.fields.map(x=><span key={x}>{x}</span>)}</div>
            <div className="manual-panel"><strong>FLUXO DO MÓDULO</strong>{section.flow.map((x,i)=><span key={x}>{i+1}. {x}</span>)}</div>
          </div>
          <div className="manual-actions">
            {section.steps.map((text,i)=><article key={text}><div className="manual-number">{i+1}</div><div><strong>{text.split(':')[0]}</strong>{text.includes(':')?<p>{text.slice(text.indexOf(':')+1).trim()}</p>:<p>{text}</p>}</div></article>)}
          </div>
        </section>
      })}
    </div>
    <footer className="manual-footer"><HelpCircle size={18}/> Regra do ERP: não invente código, quantidade, lote, data ou valor. Se não souber o campo, use a lupa/consulta ou abra a Ajuda da tela. Em caso de erro, preserve a mensagem exibida para o suporte.</footer>
  </main>
}
