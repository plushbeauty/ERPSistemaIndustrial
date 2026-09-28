/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 11:43 BRT
 * Desenvolvedor: IA Co-Pilot (Homologado por Fernando)
 * ID da Revisão: REV-060
 * Alterações: Aceitar className opcional nos componentes de diálogo para páginas claras.
 * Status do Build Local: Não executado — ambiente local sem acesso de rede ao repositório.
 * =========================================================================
 */

import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
type StyledProps={children:ReactNode;className?:string}
export function Dialog({open,onOpenChange,children}:{open:boolean;onOpenChange:(v:boolean)=>void;children:ReactNode}){return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>{children}</DialogPrimitive.Root>}
export const DialogContent=({children,className}:StyledProps)=><DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"/><DialogPrimitive.Content className={className ?? "fixed left-1/2 top-1/2 z-50 w-[min(1100px,94vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-7 text-slate-100 shadow-2xl focus:outline-none"}>{children}<DialogPrimitive.Close className="absolute right-5 top-5 rounded-md border border-slate-700 px-3 py-2 text-base">×</DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>
export const DialogTitle=({children,className}:StyledProps)=><DialogPrimitive.Title className={className ?? "text-2xl font-bold tracking-tight"}>{children}</DialogPrimitive.Title>
export const DialogDescription=({children,className}:StyledProps)=><DialogPrimitive.Description className={className ?? "mt-1 text-base text-slate-400"}>{children}</DialogPrimitive.Description>