"use client";

import React, { useState } from 'react';
import { 
  Settings, Sliders, Users, Database, ShieldAlert, CheckCircle2, 
  Save, ChevronRight, User, LogOut, UserPlus, Shield, UserCheck, 
  Trash2, Key, Mail, Building, Briefcase, Pencil, HelpCircle, History, CloudDownload, Download, Clock, Check
} from 'lucide-react';

interface AreaProduto {
  id: string;
  sigla_tipo: string;
  nome_area: string;
  destinacao: 'Chão de Fábrica' | 'Comercial' | 'Administrativo';
}

interface UsuarioIndustria {
  id: string;
  nome: string;
  email: string;
  departamento: string;
  perfil_acesso: string;
  status: 'Ativo' | 'Inativo';
}

export default function ConfiguracoesAdmGeral() {
  // Estado de controle das abas centrais do painel
  const [abaAtiva, setAbaAtiva] = useState<string>('codificacao');

  // ESTADOS DA TELA 1: CODIFICAÇÃO
  const [siglaEmpresa, setSiglaEmpresa] = useState<string>('PL');
  const [separador, setSeparador] = useState<string>('-');
  const [digitosSequencial, setDigitosSequencial] = useState<number>(4);
  const [novaSigla, setNovaSigla] = useState<string>('');
  const [novoNomeArea, setNovoNomeArea] = useState<string>('');
  const [novaDestinacao, setNovaDestinacao] = useState<'Chão de Fábrica' | 'Comercial' | 'Administrativo'>('Chão de Fábrica');
  const [areas, setAreas] = useState<AreaProduto[]>([
    { id: '1', sigla_tipo: 'MAT', nome_area: 'Matéria-Prima', destinacao: 'Chão de Fábrica' },
    { id: '2', sigla_tipo: 'ACA', nome_area: 'Produto Acabado', destinacao: 'Comercial' }
  ]);

  // ESTADOS DA TELA 3: PERFIS DE USUÁRIOS
  const [nomeUser, setNomeUser] = useState<string>('');
  const [emailUser, setEmailUser] = useState<string>('');
  const [usuarios, setUsuarios] = useState<UsuarioIndustria[]>([
    { id: '1', nome: 'João Silva', email: 'joao.silva@plastibor.com.br', departamento: 'PCP', perfil_acesso: 'Planejador de PCP', status: 'Ativo' }
  ]);

  const gerarPreviewSKU = (siglaTipo: string) => {
    return `${siglaEmpresa.toUpperCase()}${separador}${siglaTipo.toUpperCase()}${separador}${'1'.padStart(digitosSequencial, '0')}`;
  };

  const handleCadastrarArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSigla || !novoNomeArea) return;
    setAreas([...areas, { id: crypto.randomUUID(), sigla_tipo: novaSigla.toUpperCase().substring(0, 3), nome_area: novoNomeArea, destinacao: novaDestinacao }]);
    setNovaSigla(''); setNovoNomeArea('');
  };

  return (
    // CONTÊINER FLEX: PREVINE DE VEZ O ERRO DA IA DE JOGAR A SIDEBAR NO TOPO
    <div className="flex min-h-screen bg-[#F4F7FE] text-slate-800 font-sans antialiased">
      
      {/* ========================================================================= */}
      {/* 1. BARRA LATERAL FIXA (TEXTOS CLAROS EM FUNDO ESCURO CORRETOS)            */}
      {/* ========================================================================= */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full border-r border-slate-800 z-30 shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-900 rounded-xl flex items-center justify-center text-white font-black text-sm">SQ</div>
          <div>
            <span className="text-base font-black text-white block tracking-tight">SGQERP</span>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest block -mt-1">Industrial</span>
          </div>
        </div>
        <nav className="px-4 flex-1 space-y-1 pt-6">
          <button type="button" onClick={() => setAbaAtiva('codificacao')} className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition-all text-xs uppercase tracking-wider text-left ${abaAtiva === 'codificacao' ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
            <span>1. Codificação e Áreas</span><ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setAbaAtiva('usuarios')} className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition-all text-xs uppercase tracking-wider text-left ${abaAtiva === 'usuarios' ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}>
            <span>3. Perfis de Usuários</span><ChevronRight className="w-3.5 h-3.5" />
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between pl-6">
          <span>SUPABASE CONNECTED</span><span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. ÁREA DE TRABALHO CENTRAL (ML-64 PREVINE A SOBREPOSIÇÃO GEOMÉTRICA)     */}
      {/* ========================================================================= */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        
        {/* NAV BAR INALTERÁVEL */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-400">
            <span>Dashboard</span><ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-800 font-extrabold">{abaAtiva.toUpperCase()}</span>
          </div>
          <div className="text-xs font-semibold bg-slate-100 px-3 py-1.5 rounded-lg border text-slate-800">Operador: <strong>Admin</strong></div>
        </header>

        <main className="p-8 flex-1 space-y-6">
          
          {/* TELA 1: CODIFICAÇÃO (CORREÇÃO DE CONTRASTE DA LETRA ESCURA NO CARD BRANCO) */}
          {abaAtiva === 'codificacao' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-150">
              
              {/* CARD DE PARÂMETROS - COMPOSIÇÃO DE TEXTO ESCURO RIGOROSO */}
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-900" /> 1. Regra de Máscara
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Sigla Corporativa</label>
                    <input type="text" maxLength={3} value={siglaEmpresa} onChange={(e) => setSiglaEmpresa(e.target.value.toUpperCase())} className="w-full bg-slate-50 border border-slate-200 p-2 text-sm font-black rounded-xl text-slate-900 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Separador</label>
                      <select value={separador} onChange={(e) => setSeparador(e.target.value)} className="w-full bg-slate-50 border p-2 text-sm font-bold text-slate-900 rounded-xl"><option value="-">Hífen ( - )</option><option value="/">Barra ( / )</option></select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Dígitos</label>
                      <select value={digitosSequencial} onChange={(e) => setDigitosSequencial(Number(e.target.value))} className="w-full bg-slate-50 border p-2 text-sm font-bold text-slate-900 rounded-xl"><option value={4}>4 Dígitos</option><option value={5}>5 Dígitos</option></select>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center shadow-inner">
                    <span className="text-[10px] font-black text-slate-500 block uppercase">Preview SKU Gerado</span>
                    <span className="text-sm font-mono font-black text-blue-600 block mt-1">{gerarPreviewSKU("XXX")}</span>
                  </div>
                </div>
              </div>

              {/* TABELA TÉCNICA - LARGURA INTELIGENTE 2/3 */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2"><Database className="w-4 h-4 text-blue-900" /> Grupos de Produtos Ativos no Supabase</h3>
                <form onSubmit={handleCadastrarArea} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <input type="text" maxLength={3} placeholder="Prefixo" value={novaSigla} onChange={(e) => setNovaSigla(e.target.value.toUpperCase())} className="w-full bg-white border p-2 rounded-xl text-sm font-black text-slate-900 uppercase" />
                  <input type="text" placeholder="Nome do Segmento" value={novoNomeArea} onChange={(e) => setNovoNomeArea(e.target.value)} className="w-full bg-white border p-2 rounded-xl text-sm font-bold text-slate-900" />
                  <select value={novaDestinacao} onChange={(e) => setNovaDestinacao(e.target.value as any)} className="w-full bg-white border p-2 rounded-xl text-sm font-bold text-slate-900"><option value="Chão de Fábrica">Chão de Fábrica</option><option value="Comercial">Comercial</option></select>
Use o código com cuidado.Adicionar GrupoPrefixoNome SegmentoDestinaçãoEstrutura SKU{areas.map(a => ({a.sigla_tipo}{a.nome_area}{a.destinacao}{gerarPreviewSKU(a.sigla_tipo)}))})}{/* TELA 3: PERFIS DE USUÁRIOS */}{abaAtiva === 'usuarios' && ( Vincular Operador<input type="text" required value={nomeUser} onChange={(e) => setNomeUser(e.target.value)} placeholder="Nome do colaborador" className="w-full bg-slate-50 border p-2 rounded-xl text-sm font-bold text-slate-900" /><input type="email" required value={emailUser} onChange={(e) => setEmailUser(e.target.value)} placeholder="usuario@empresa.com" className="w-full bg-slate-50 border p-2 rounded-xl text-sm font-mono text-slate-900" />Salvar ColaboradorNomeE-mailClasse Permissão{usuarios.map(u => ({u.nome}{u.email}{u.perfil_acesso}))})}{/* MANUAL DE AJUDA PADRÃO INTEGRADO NO RODAPÉ */} Manual de Governança Industrial e AuditoriaOs módulos operacionais salvam as modificações em tempo real nas tabelas do Supabase relacional, mantendo as chaves e os logs protegidos por regras internas invioláveis do SGQ.);}
