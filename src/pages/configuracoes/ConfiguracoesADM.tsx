// src/pages/configuracoes/ConfiguracoesADM.tsx
import React, { useState } from 'react';

// Importação das páginas individuais criadas para o menu lateral
import CodificacaoAreas from './CodificacaoAreas';
import ControlePermissoes from './ControlePermissoes';
import Perfis from './Perfis';
import Logs from './Logs';
import Backups from './Backups';

type PaginasConfig = 'codificacao' | 'permissoes' | 'perfis' | 'logs' | 'backups';

export default function ConfiguracoesADM() {
  // Gerencia qual página individual do menu lateral está ativa no Workspace central
  const [paginaAtiva, setPaginaAtiva] = useState<PaginasConfig>('codificacao');

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100 font-sans antialiased select-none">
      
      {/* 📋 BARRA LATERAL FIXA DE CONFIGURAÇÕES (BOTÕES EM ALTO RELEVO ESTILO DELPHI) */}
      <aside className="w-72 bg-gray-800 border-r border-gray-700 p-4 flex flex-col justify-between shadow-2xl flex-shrink-0">
        <div className="space-y-6">
          <div className="px-2 flex items-center space-x-2 border-b border-gray-700 pb-4">
            <span className="text-xl font-black text-blue-400 tracking-wider">🛠️ CONFIGURAÇÕES</span>
          </div>
          
          <nav className="space-y-2">
            {[
              { id: 'codificacao', label: '🔢 Codificação de Áreas' },
              { id: 'permissoes', label: '🔒 Controle de Permissões' },
              { id: 'perfis', label: '👥 Perfis de Usuários' },
              { id: 'logs', label: '📝 Logs do Sistema' },
              { id: 'backups', label: '💾 Backups da Base' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPaginaAtiva(item.id as PaginasConfig)}
                className={`w-full flex items-center px-4 py-4 text-sm font-bold rounded-xl border-b-4 active:scale-98 transition-all text-left ${
                  paginaAtiva === item.id
                    ? 'bg-blue-600 text-white border-blue-800 shadow-inner'
                    : 'bg-gray-750 text-gray-300 border-gray-900 hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Retorno seguro para a mesa central de módulos do tablet */}
        <button className="w-full py-4 bg-red-750 border-b-4 border-red-950 text-white font-black text-sm rounded-xl tracking-wider active:scale-95 transition-all">
          🏠 VOLTAR AOS MÓDULOS TABLET
        </button>
      </aside>

      {/* 🌆 WORKSPACE CENTRAL: RENDERIZA A PÁGINA ESPECÍFICA SELECIONADA NO MENU */}
      <main className="flex-1 p-8 bg-gray-900 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          {paginaAtiva === 'codificacao' && <CodificacaoAreas />}
          
          {paginaAtiva === 'permissoes' && <ControlePermissoes />}
          
          {paginaAtiva === 'perfis' && <Perfis />}
          
          {paginaAtiva === 'logs' && <Logs />}
          
          {paginaAtiva === 'backups' && <Backups />}

        </div>
      </main>
    </div>
  );
}
