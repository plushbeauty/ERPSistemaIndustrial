import { useSidebar } from '../context/SidebarContext'
export default function Backdrop(){const{isMobileOpen,closeMobileSidebar}=useSidebar();if(!isMobileOpen)return null;return <div className="industrial-backdrop" onClick={closeMobileSidebar} aria-hidden="true"/>}
