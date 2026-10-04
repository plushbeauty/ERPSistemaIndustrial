import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
export default function ThemeToggleButton(){const{theme,toggleTheme}=useTheme();const dark=theme==='dark';return <button type="button" className="sgq-theme-toggle" onClick={toggleTheme} aria-label={dark?'Ativar modo claro':'Ativar modo escuro'} title={dark?'Modo claro':'Modo escuro'}>{dark?<Sun size={18}/>:<Moon size={18}/>}<span>{dark?'Claro':'Escuro'}</span></button>}
