import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
export const Tabs=TabsPrimitive.Root
export const TabsList=({children}:{children:ReactNode})=><TabsPrimitive.List className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-2">{children}</TabsPrimitive.List>
export const TabsTrigger=({value,children}:{value:string;children:ReactNode})=><TabsPrimitive.Trigger value={value} className="rounded-md px-4 py-3 text-base font-semibold text-slate-300 transition data-[state=active]:bg-cyan-600 data-[state=active]:text-white">{children}</TabsPrimitive.Trigger>
export const TabsContent=({value,children}:{value:string;children:ReactNode})=><TabsPrimitive.Content value={value} className="mt-5 focus:outline-none">{children}</TabsPrimitive.Content>