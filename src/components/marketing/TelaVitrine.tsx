/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-VITRINE-TELAS-REAIS-20261101-01
 * @STATUS_APROVACAO: APLICACAO A VITRINE PUBLICA AUTORIZADA PELO PROPRIETARIO EM 2026-11-01
 *
 * Ordem recebida em 2026-11-01: a vitrine não pode anunciar tela que não existe. As artes
 * geradas em public/images/telas/ mostravam painéis que o ERP não tem, então saem de cena e
 * entram réplicas montadas com o próprio vocabulário visual do sistema: rail escuro, cartões
 * de índice e tabela. Cada rótulo abaixo foi copiado da tela indicada em `fonte`, e o endereço
 * da barra é a rota real registrada em AppEntryV2 — se a tela mudar, muda aqui, e não ao
 * contrário. Os números são demonstrativos: a chamada diz isso para ninguém ler saldo de
 * exemplo como se fosse da própria empresa.
 */

export type TelaVitrine = {
  /** Chave do slide/seção que usa a réplica. */
  key: 'pcp' | 'qualidade' | 'estoque' | 'chao-de-fabrica'
  /** Rota real registrada no AppEntryV2, mostrada na barra do navegador. */
  rota: string
  /** Arquivo de onde os rótulos foram copiados — revisado junto com a tela. */
  fonte: string
  /** Título do rail, igual ao cabeçalho do rail dentro do módulo. */
  modulo: string
  /** Itens do rail, na mesma ordem e com os mesmos nomes da navegação. */
  itens: string[]
  /** Índice do item marcado como ativo no rail. */
  ativo: number
  /** Cartões de índice: rótulo verbatim da tela e valor demonstrativo. */
  indices: { label: string; valor: string }[]
  /** Cabeçalhos da tabela, na ordem real. */
  colunas: string[]
  /** Linhas demonstrativas, uma célula por coluna. */
  linhas: string[][]
}

export const telasVitrine: Record<TelaVitrine['key'], TelaVitrine> = {
  pcp: {
    key: 'pcp',
    rota: '/pcp',
    fonte: 'src/pages/PCPDashboard.tsx · src/config/moduleNav.ts',
    modulo: 'PCP',
    itens: ['Dashboard', 'Central PCP', 'Fichas de Processo', 'Roteiro de Operações', 'Carga e Capacidade', 'Portal do Operador', 'Postos de Trabalho'],
    ativo: 0,
    indices: [
      { label: 'Ordens abertas', valor: '12' },
      { label: 'Eficiência', valor: '94,2%' },
      { label: 'Refugo', valor: '1,8%' },
      { label: 'Em setup', valor: '2' },
    ],
    colunas: ['OP', 'Produto', 'Quantidade', 'Produzido', 'Máquina', 'Status'],
    linhas: [
      ['OP 4.812', 'Injetado PP 240 ml', '1.200', '1.180', 'Prensa 03', 'Em produção'],
      ['OP 4.813', 'Tampa rosca 28 mm', '8.000', '8.000', 'Injetora 07', 'Concluída'],
      ['OP 4.814', 'Caixa montada 12 un', '640', '0', 'Montagem 01', 'Liberada'],
    ],
  },
  qualidade: {
    key: 'qualidade',
    rota: '/qualidade/rpnc',
    fonte: 'src/pages/QualidadeRPNC.tsx · src/config/erpNavigation.ts',
    modulo: 'Qualidade',
    itens: ['Paquímetro Digital', 'RPNC', 'Formulário RPNC', 'Auditorias da Qualidade', 'GED / Documentos da Qualidade'],
    ativo: 1,
    indices: [
      { label: 'RPNCs abertas', valor: '5' },
      { label: 'Críticas', valor: '1' },
      { label: 'CAPA no prazo', valor: '8' },
      { label: 'Vencidas', valor: '2' },
    ],
    colunas: ['Protocolo', 'Descrição', 'Origem', 'Severidade', 'Status', 'Abertura', 'Ações'],
    linhas: [
      ['RPNC 00318', 'Rebarba na tampa 28 mm', 'Interna', 'Maior', 'Em análise', '28/10/2026', 'Ver'],
      ['RPNC 00317', 'Dimensão fora da tolerância', 'Cliente', 'Crítica', 'CAPA', '22/10/2026', 'Ver'],
      ['RPNC 00316', 'Risco estético no corpo', 'Fornecedor', 'Menor', 'Encerrada', '15/10/2026', 'Ver'],
    ],
  },
  estoque: {
    key: 'estoque',
    rota: '/almoxarifado',
    fonte: 'src/pages/EstoqueAlmoxarifado.tsx · src/config/moduleNav.ts',
    modulo: 'Estoque',
    itens: ['Almoxarifado', 'Auditoria de Saldos', 'Balanço de Estoque', 'Regras de Depreciação', 'Cadastro de Produtos', 'Portal do Operador'],
    ativo: 0,
    indices: [
      { label: 'Itens com saldo', valor: '412' },
      { label: 'Valor em estoque', valor: 'R$ 184.300' },
      { label: 'Recompra necessária', valor: '9' },
      { label: 'Movimentações (7 dias)', valor: '37' },
    ],
    colunas: ['Endereço', 'Item', 'Em estoque', 'Reservado', 'Disponível', 'Ponto de reposição', 'Situação'],
    linhas: [
      ['A-01-03', 'PP copolímero 240 ml', '1.850', '420', '1.430', '600', 'OK'],
      ['A-02-11', 'Master cor azul', '48', '0', '48', '60', 'Recomprar'],
      ['B-04-02', 'Tampa rosca 28 mm', '12.400', '3.200', '9.200', '2.000', 'OK'],
    ],
  },
  'chao-de-fabrica': {
    key: 'chao-de-fabrica',
    rota: '/pcp/portal-operador',
    fonte: 'src/pages/PCPAreaFuncionario.tsx · src/config/erpNavigation.ts',
    modulo: 'Chão de Fábrica',
    itens: ['Portal do Operador', 'Postos de Trabalho'],
    ativo: 0,
    indices: [
      { label: 'Ordem de produção', valor: 'OP 4.812' },
      { label: 'Máquina', valor: 'Prensa 03' },
      { label: 'Peças boas', valor: '1.180' },
      { label: 'Peças refugadas', valor: '22' },
    ],
    colunas: ['Cartão de Processo Produtivo', 'Quantidade planejada', 'Parada / motivo (se ocorreu)', 'Defeito / observações', 'Ficha de processo vigente'],
    linhas: [
      ['Início planejado 06:00', '1.200', '12 min · troca de ferramenta', 'Rebarba bico 3', 'Rev. 4'],
      ['Término planejado 14:00', '8.000', '—', '—', 'Rev. 2'],
    ],
  },
}

export function TelaVitrineReplica({ tela, compacta = false }: { tela: TelaVitrine; compacta?: boolean }) {
  return (
    <div className={`ph-replica${compacta ? ' ph-replica--compacta' : ''}`}>
      <aside className="ph-replica-rail" aria-hidden="true">
        <strong>{tela.modulo}</strong>
        <ul>
          {tela.itens.map((item, indice) => (
            <li key={item} className={indice === tela.ativo ? 'is-ativo' : undefined}>{item}</li>
          ))}
        </ul>
      </aside>
      <div className="ph-replica-corpo">
        <div className="ph-replica-indices">
          {tela.indices.map(indice => (
            <div key={indice.label}>
              <span>{indice.label}</span>
              <strong>{indice.valor}</strong>
            </div>
          ))}
        </div>
        <table className="ph-replica-tabela">
          <thead>
            <tr>{tela.colunas.map(coluna => <th key={coluna}>{coluna}</th>)}</tr>
          </thead>
          <tbody>
            {tela.linhas.map((linha, i) => (
              <tr key={linha.join('|') + i}>{linha.map((celula, j) => <td key={`${celula}-${j}`}>{celula}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="ph-replica-nota">Réplica da tela <code>{tela.rota}</code> · números demonstrativos, não são dados da sua empresa.</p>
      </div>
    </div>
  )
}

export default TelaVitrineReplica
