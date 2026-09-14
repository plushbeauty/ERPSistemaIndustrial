import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
export default function ThemeToggleButton(){const{theme,toggleTheme}=useTheme();return <button type="button" className="sgq-theme-toggle" onClick={toggleTheme} aria-label={theme==='dark'?'Ativar modo claro':'Ativar modo escuro'} title={theme==='dark'?'Modo claro':'Modo escuro'}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button>}
