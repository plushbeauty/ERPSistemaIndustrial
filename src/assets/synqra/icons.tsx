import {
  Boxes, ClipboardCheck, Factory, FileText, Landmark, Package, ShoppingCart, Truck, Users, Wrench, BarChart3, Settings
} from 'lucide-react'

export const SYNQRA_MODULES = [
  { key: 'vendas', label: 'Vendas', route: '/vendas', Icon: ShoppingCart },
  { key: 'compras', label: 'Compras', route: '/compras', Icon: Package },
  { key: 'estoque', label: 'Estoque', route: '/estoque', Icon: Boxes },
  { key: 'producao', label: 'Produção / PCP', route: '/pcp', Icon: Factory },
  { key: 'qualidade', label: 'Qualidade / SGQ', route: '/qualidade', Icon: ClipboardCheck },
  { key: 'expedicao', label: 'Expedição', route: '/expedicao', Icon: Truck },
  { key: 'financeiro', label: 'Financeiro', route: '/financeiro', Icon: Landmark },
  { key: 'fiscal', label: 'Fiscal / NF-e', route: '/fiscal', Icon: FileText },
  { key: 'clientes', label: 'Clientes', route: '/clientes', Icon: Users },
  { key: 'manutencao', label: 'Manutenção', route: '/manutencao', Icon: Wrench },
  { key: 'indicadores', label: 'Indicadores', route: '/indicadores', Icon: BarChart3 },
  { key: 'configuracoes', label: 'Configurações', route: '/configuracoes', Icon: Settings },
]