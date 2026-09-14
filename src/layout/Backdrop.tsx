import { useSidebar } from '../context/SidebarContext'
export default function Backdrop(){const{isMobileOpen,closeMobileSidebar}=useSidebar();return isMobileOpen?<div className="sgq-sidebar-backdrop" role="presentation" onClick={closeMobileSidebar}/>:null}
