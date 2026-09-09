import React from 'react'
import ReactDOM from 'react-dom/client'
import AppEntry from './AppEntry'
import './styles/index.css'
import './styles/sgq-overrides.css'
import './styles/public-industrial.css'
import './styles/industrial-enhancements.css'
import './styles/public-home-v2.css'

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>undefined))
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppEntry /></React.StrictMode>)
