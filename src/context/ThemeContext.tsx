import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
type Theme='light'|'dark'
type ThemeContextType={theme:Theme;toggleTheme:()=>void;setTheme:(theme:Theme)=>void}
const STORAGE_KEY='sgq-erp-theme'
const ThemeContext=createContext<ThemeContextType|undefined>(undefined)
function isValidTheme(value:string|null):value is Theme{return value==='light'||value==='dark'}
export function ThemeProvider({children}:{children:React.ReactNode}){const[theme,setThemeState]=useState<Theme>('light');const[initialized,setInitialized]=useState(false);useEffect(()=>{const saved=localStorage.getItem(STORAGE_KEY);setThemeState(isValidTheme(saved)?saved:'light');setInitialized(true)},[]);useEffect(()=>{if(!initialized)return;const root=document.documentElement;root.classList.toggle('dark',theme==='dark');root.setAttribute('data-color-scheme',theme);root.setAttribute('data-sgq-theme',theme);localStorage.setItem(STORAGE_KEY,theme)},[theme,initialized]);const setTheme=useCallback((next:Theme)=>setThemeState(next),[]);const toggleTheme=useCallback(()=>setThemeState(v=>v==='dark'?'light':'dark'),[]);return <ThemeContext.Provider value={{theme,toggleTheme,setTheme}}>{children}</ThemeContext.Provider>}
export function useTheme():ThemeContextType{const context=useContext(ThemeContext);if(!context)throw new Error('useTheme must be used within ThemeProvider');return context}
