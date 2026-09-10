import React from 'react'
import ReactDOM from 'react-dom/client'
import AppEntry from './AppEntryV2'
import './styles/index.css'
import './styles/sgq-overrides.css'
import './styles/public-industrial.css'
import './styles/industrial-enhancements.css'
import './styles/public-home-v2.css'
import './styles/public-modern.css'
import './styles/industrial-v2.css'
import './styles/fiscal-public.css'
import './styles/master.css'
import './styles/industrial-light-theme.css'

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>undefined))
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppEntry /></React.StrictMode>)
