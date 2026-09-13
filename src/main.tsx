import React from 'react'
import ReactDOM from 'react-dom/client'
import AppEntry from './AppEntryV2'
import GlobalHelp from './GlobalHelp'
import ERPHeaderActions from './components/ERPHeaderActions'
import GlobalErrorBoundary from './components/GlobalErrorBoundary'
import PwaInstallButton from './components/PwaInstallButton'
import './styles/app.css'
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>undefined))
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><GlobalErrorBoundary><AppEntry/><ERPHeaderActions/><GlobalHelp/><PwaInstallButton/></GlobalErrorBoundary></React.StrictMode>)
