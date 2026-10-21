import * as React from 'react'
import { Check, ChevronRight, Circle } from 'lucide-react'

type NativeProps = React.HTMLAttributes<HTMLDivElement>
type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>
const cn = (...values: Array<string | undefined | false>) => values.filter(Boolean).join(' ')

function Menubar({ className, ...props }: NativeProps) {
  return <div role="menubar" data-slot="menubar" className={cn('flex h-9 items-center gap-1 rounded-md border border-blue-800/30 bg-[#123B50] p-1 text-white shadow-sm', className)} {...props} />
}
function MenubarMenu({ className, ...props }: NativeProps) { return <div data-slot="menubar-menu" className={cn('relative', className)} {...props} /> }
function MenubarGroup({ className, ...props }: NativeProps) { return <div role="group" className={className} {...props} /> }
function MenubarPortal({ children }: { children?: React.ReactNode }) { return <>{children}</> }
function MenubarRadioGroup({ className, ...props }: NativeProps) { return <div role="group" className={className} {...props} /> }
function MenubarSub({ className, ...props }: NativeProps) { return <div data-slot="menubar-sub" className={cn('relative', className)} {...props} /> }
function MenubarTrigger({ className, ...props }: TriggerProps) { return <button type="button" role="menuitem" className={cn('flex h-7 cursor-pointer select-none items-center rounded px-3 text-xs font-bold text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-300', className)} {...props} /> }
function MenubarSubTrigger({ className, children, ...props }: TriggerProps) { return <button type="button" role="menuitem" className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium hover:bg-blue-50 hover:text-blue-800', className)} {...props}>{children}<ChevronRight className="ml-auto h-4 w-4" /></button> }
function MenubarSubContent({ className, ...props }: NativeProps) { return <div role="menu" className={cn('absolute left-full top-0 z-50 min-w-32 rounded-md border border-slate-200 bg-white p-1 text-slate-700 shadow-lg', className)} {...props} /> }
function MenubarContent({ className, ...props }: NativeProps) { return <div role="menu" className={cn('absolute left-0 top-full z-50 mt-1 min-w-48 rounded-md border border-slate-200 bg-white p-1 text-slate-700 shadow-lg', className)} {...props} /> }
function MenubarItem({ className, ...props }: TriggerProps) { return <button type="button" role="menuitem" className={cn('flex w-full items-center rounded px-2 py-1.5 text-left text-sm font-medium outline-none hover:bg-blue-50 hover:text-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500', className)} {...props} /> }
function MenubarCheckboxItem({ className, children, checked, ...props }: TriggerProps & { checked?: boolean }) { return <button type="button" role="menuitemcheckbox" aria-checked={checked} className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-blue-50', className)} {...props}>{checked ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}{children}</button> }
function MenubarRadioItem({ className, children, checked, ...props }: TriggerProps & { checked?: boolean }) { return <button type="button" role="menuitemradio" aria-checked={checked} className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-blue-50', className)} {...props}>{checked ? <Circle className="h-3 w-3 fill-current" /> : <span className="h-3 w-3" />}{children}</button> }
function MenubarLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-500', className)} {...props} /> }
function MenubarSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div role="separator" className={cn('my-1 h-px bg-slate-200', className)} {...props} /> }
function MenubarShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) { return <span className={cn('ml-auto pl-4 text-[10px] tracking-widest text-slate-400', className)} {...props} /> }

export { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarSeparator, MenubarLabel, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarPortal, MenubarSubContent, MenubarSubTrigger, MenubarGroup, MenubarSub, MenubarShortcut }
