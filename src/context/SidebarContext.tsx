import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type SidebarContextValue = { isExpanded:boolean; isMobileOpen:boolean; toggleSidebar:()=>void; toggleMobileSidebar:()=>void; closeMobileSidebar:()=>void }
const SidebarContext=createContext<SidebarContextValue|undefined>(undefined)
const STORAGE_KEY='sgq-erp-sidebar-expanded'
export function SidebarProvider({children}:{children:ReactNode}){
 const[isExpanded,setExpanded]=useState(true),[isMobileOpen,setMobileOpen]=useState(false)
 useEffect(()=>{if(localStorage.getItem(STORAGE_KEY)==='false')setExpanded(false)},[])
 useEffect(()=>{document.documentElement.classList.toggle('sgq-collapsed',!isExpanded);document.documentElement.dataset.sidebarMobile=isMobileOpen?'open':'closed'},[isExpanded,isMobileOpen])
 const toggleSidebar=()=>setExpanded(v=>{const n=!v;localStorage.setItem(STORAGE_KEY,String(n));return n})
 const toggleMobileSidebar=()=>setMobileOpen(v=>!v),closeMobileSidebar=()=>setMobileOpen(false)
 return <SidebarContext.Provider value={{isExpanded,isMobileOpen,toggleSidebar,toggleMobileSidebar,closeMobileSidebar}}>{children}</SidebarContext.Provider>
}
export function useSidebar(){const context=useContext(SidebarContext);if(!context)throw new Error('useSidebar must be used within SidebarProvider');return context}
