import {
  Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Factory, Gauge, ListChecks
} from 'lucide-react'
import TabletLaunchpad from './TabletLaunchpad'
import { supabase } from '../lib/supabaseClient'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Props = { onNavigate: (route: string) => void }

type Metrics = {
  ops: number; completedOps: number; produced: number; scrap: number; rpnc: number; products: number
  machines: number; inspections: number; purchases: number; sales: number
}
type ProductionPoint = { date: string; boa: number; refugo: number }
type OrderStatusPoint = { status: string; quantidade: number }
type OrderStatusPoint = { status: string; quantidade: number }
type LatestOP = { id: string; numero_op: number | string; produto: string; status: string; created_at: string | null }

const n = (v: unknown) => {
  const value = Number(v)
  return Number.isFinite(value) ? value : 0
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR').format(v)

