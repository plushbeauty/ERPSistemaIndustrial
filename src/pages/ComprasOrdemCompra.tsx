/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { BarChart3, ClipboardList, LayoutGrid, PackageCheck, Plus, RefreshCw, Search, ShoppingCart, Truck, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ERPHeader from '../components/layout/ERPHeader'
import { supabase } from '../lib/supabaseClient'
import { fetchAllPages } from '../lib/supabasePagination'

type Tab='dashboard'|'solicitacoes'|'pedidos'|'fornecedores'|'recebimentos'
type Supplier={id:string;razao_social:string;nome_fantasia:string|null;documento:string|null;iso_9001_certificado:boolean;ativo:boolean}