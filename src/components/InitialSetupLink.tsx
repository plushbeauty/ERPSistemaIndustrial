import { useEffect, useState } from 'react'

export default function InitialSetupLink(){
 const [visible,setVisible]=useState(false)
 useEffect(()=>{ setVisible(window.location.pathname==='/login') },[])
 if(!visible)return null
 return <a href="/cadastro-master" style={{position:'fixed',right:18,bottom:18,zIndex:9999,display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:42,padding:'0 15px',borderRadius:10,background:'#111',border:'1px solid rgba(201,168,76,.55)',color:'#e0c56f',fontSize:11,fontWeight:900,textDecoration:'none',boxShadow:'0 12px 30px rgba(0,0,0,.3)'}}>Primeiro acesso · cadastrar proprietário Master</a>
}
