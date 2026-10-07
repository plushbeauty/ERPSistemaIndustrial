import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  FileCheck2,
  FileText,
  Factory,
  Gauge,
  Handshake,
  Headphones,
  Home,
  Landmark,
  Leaf,
  PackageSearch,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCircle,
  Users,
  Wrench,
} from 'lucide-react'

export type SynqraModule = {
  key: string
  label: string
  route?: string
  permission?: string
  Icon: LucideIcon
}

export const SYNQRA_MODULES: readonly SynqraModule[] = [
  { key: 'inicio', label: 'Início', route: '/comercial', Icon: Home },
  { key: 'dashboard', label: 'Dashboard', route: '/erp-industrial', Icon: BarChart3 },
  { key: 'vendas', label: 'Vendas', route: '/vendas/tablet', permission: 'vendas.ver', Icon: Handshake },
  { key: 'compras', label: 'Compras', route: '/compras/rfq', permission: 'compras.ver', Icon: ShoppingCart },
  { key: 'estoque', label: 'Estoque', route: '/estoque', permission: 'estoque.ver', Icon: Boxes },
  { key: 'fiscal', label: 'Fiscal', route: '/fiscal', permission: 'fiscal.ver', Icon: FileText },
  { key: 'financeiro', label: 'Financeiro', route: '/financeiro/caixa', permission: 'financeiro.ver', Icon: Landmark },
  { key: 'pcp', label: 'PCP', route: '/pcp', Icon: Factory },
  { key: 'qualidade', label: 'Qualidade', route: '/qualidade', permission: 'qualidade.ver', Icon: Award },
  { key: 'sgq', label: 'SGQ', route: '/vendas/sgq', permission: 'qualidade.ver', Icon: ClipboardCheck },
  { key: 'engenharia', label: 'Engenharia', route: '/engenharia', Icon: Activity },
  { key: 'produtos', label: 'Produtos', route: '/produtos', permission: 'produtos.ver', Icon: Boxes },
  { key: 'clientes', label: 'Clientes', route: '/clientes', permission: 'clientes.ver', Icon: Users },
  { key: 'fornecedores', label: 'Fornecedores', route: '/fornecedores', permission: 'fornecedores.ver', Icon: Truck },
  { key: 'rh', label: 'RH', route: '/rh', Icon: Users },
  { key: 'administracao', label: 'Administração / Usuários', route: '/usuarios-admin', permission: 'usuarios.ver', Icon: ClipboardList },
  { key: 'logistica', label: 'Logística', route: '/expedicao/roteirizacao', permission: 'expedicao.ver', Icon: Truck },
  { key: 'manutencao', label: 'Manutenção', route: '/manutencao/ordens', permission: 'manutencao.ver', Icon: Wrench },
  { key: 'materiais', label: 'Controle de Materiais', route: '/pcp/materiais', Icon: PackageSearch },
  { key: 'documentos', label: 'Documentos', route: '/documentos-qualidade', permission: 'qualidade.ver', Icon: FileText },
  { key: 'relatorios', label: 'Relatórios', route: '/vendas/relatorios', permission: 'relatorios.ver', Icon: BarChart3 },
  { key: 'auditorias', label: 'Auditorias', route: '/qualidade/auditoria-5s', permission: 'qualidade.ver', Icon: ClipboardCheck },
  { key: 'planejamento', label: 'Planejamento', route: '/pcp/planejamento', Icon: CalendarDays },
  { key: 'indicadores', label: 'Indicadores', route: '/pcp/dashboard-oee', Icon: Gauge },
  { key: 'configuracoes', label: 'Configurações', route: '/configuracoes-adm', permission: 'usuarios.ver', Icon: Settings },
  { key: 'suporte', label: 'Suporte', route: '/ajuda', Icon: Headphones },
  { key: 'perfil', label: 'Perfil', route: '/usuarios', permission: 'usuarios.ver', Icon: UserCircle },
  { key: 'agenda', label: 'Agenda', Icon: CalendarDays },
  { key: 'treinamentos', label: 'Treinamentos', Icon: BookOpen },
  { key: 'seguranca', label: 'Segurança do Trabalho', Icon: ShieldCheck },
  { key: 'meio-ambiente', label: 'Meio Ambiente', Icon: Leaf },
  { key: 'ti', label: 'TI', Icon: Cpu },
  { key: 'notificacoes', label: 'Notificações', Icon: Bell },
  { key: 'aprovacoes', label: 'Aprovações', Icon: FileCheck2 },
]

const _synqraIconIntegrity: LucideIcon[] = [
  Activity, Award, BarChart3, Bell, BookOpen, Boxes, CalendarDays, ClipboardCheck, ClipboardList,
  Cpu, FileCheck2, FileText, Factory, Gauge, Handshake, Headphones, Home, Landmark, Leaf,
  PackageSearch, Settings, ShieldCheck, ShoppingCart, Truck, UserCircle, Users, Wrench,
]
