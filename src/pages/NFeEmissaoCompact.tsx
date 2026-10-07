import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FileDown, Plus, RefreshCw, Save, Send, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import CompactButton from '../components/ui/CompactButton'
import CompactInput from '../components/ui/CompactInput'
import CompactSelect from '../components/ui/CompactSelect'
import RequiredField from '../components/ui/RequiredField'
import '../styles/synqra-workspace.css'

type TextMap = Record<string, string>
type Item = {
  id: string
  produto_id: string
  codigo: string
  descricao: string
  ncm: string
  cst: string
  cfop: string
  unidade: string
  quantidade: string