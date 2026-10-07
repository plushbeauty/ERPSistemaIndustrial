import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BarChart3, ClipboardList, LayoutGrid, PackageCheck, Plus, RefreshCw, Search, ShoppingCart, Truck, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ERPHeader from '../components/layout/ERPHeader'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Tab='dashboard'|'solicitacoes'|'pedidos'|'fornecedores'|'recebimentos'
type Supplier={id:string;razao_social:string;nome_fantasia:string|null;documento:string|null;iso_9001_certificado:boolean;ativo:boolean}