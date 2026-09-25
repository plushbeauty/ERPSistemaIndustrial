import type { SVGProps } from 'react'

type GlyphProps=SVGProps<SVGSVGElement>&{name:'factory'|'planning'|'quality'|'warehouse'|'maintenance'|'engineering'|'orders'|'materials'}
const paths:Record<GlyphProps['name'],JSX.Element>={
 factory:<><path d="M4 20V8l5 3V8l5 3V5h6v15"/><path d="M4 20h18M8 16h2M13 16h2M18 16h2"/></>,
 planning:<><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16M8 13h3M13 13h3M8 16h3"/></>,
 quality:<><circle cx="11" cy="11" r="6"/><path d="m8.5 11 1.8 1.8 3.7-4M15.5 15.5 20 20"/></>,
 warehouse:<><path d="m3 9 9-5 9 5v11H3zM3 9h18M8 13h8v7H8z"/></>,
 maintenance:<><path d="m14 6 4-3 4 4-3 4-3-1-5 5 1 3-4 3-4-4 3-4 3 1 5-5z"/></>,
 engineering:<><path d="M4 20V5h16v15M8 9h8M8 13h8M8 17h5"/></>,
 orders:<><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
 materials:<><path d="m4 8 8-4 8 4-8 4zM4 8v8l8 4 8-4V8M8 10v8"/></>
}
export default function IndustrialGlyph({name,...props}:GlyphProps){
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
