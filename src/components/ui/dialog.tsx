/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * ID da Revisão: REV-060
 * Alterações: Aceitar className opcional nos componentes de diálogo para páginas claras.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

/**
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-PADRAO-COR-CLARO-20261104-01 — superficie padrao do modal convertida do tema escuro para o padrao industrial claro (fundo branco, texto #123B50); o scrim bg-black/70 atras do modal permanece permitido; nenhuma alteracao de logica
 * @AUTOR: FernandoSch
 * @STATUS_APROVACAO: PADRAO UNICO DE COR APLICADO POR ORDEM DO PROPRIETARIO EM 2026-11-04
 */

import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
type StyledProps={children:ReactNode;className?:string}
export function Dialog({open,onOpenChange,children}:{open:boolean;onOpenChange:(v:boolean)=>void;children:ReactNode}){return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>{children}</DialogPrimitive.Root>}
export const DialogContent=({children,className}:StyledProps)=><DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"/><DialogPrimitive.Content className={className ?? "fixed left-1/2 top-1/2 z-50 w-[min(1100px,94vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border border-[#CFE1E7] bg-white p-7 text-[#123B50] shadow-2xl focus:outline-none"}>{children}<DialogPrimitive.Close className="absolute right-5 top-5 rounded-md border border-slate-300 px-3 py-2 text-base hover:bg-[#EAF6FA]">×</DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>
export const DialogTitle=({children,className}:StyledProps)=><DialogPrimitive.Title className={className ?? "text-2xl font-bold tracking-tight"}>{children}</DialogPrimitive.Title>
export const DialogDescription=({children,className}:StyledProps)=><DialogPrimitive.Description className={className ?? "mt-1 text-base text-slate-500"}>{children}</DialogPrimitive.Description>