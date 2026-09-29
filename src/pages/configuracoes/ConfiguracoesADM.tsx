// src/pages/configuracoes/ConfiguracoesADM.tsx
import React, { useState } from 'react';

// Importação das sub-páginas isoladas do menu (Padrão Open-Source Clean Architecture)
import CodificacaoAreas from './CodificacaoAreas';
import ControlePermissoes from './ControlePermissoes';
import Perfis from './Perfis';
import Logs from './Logs';
import Backups from './Backups';

type PaginasConfig = 'codificacao' | 'permissoes' | 'perfis' | 'logs' | 'backups';

export default function ConfiguracoesADM() {
  // Estado mestre de controle de renderização dinâmica do Workspace
  const [paginaAtiva, setPaginaAtiva] = useState<PaginasConfig>('codificacao');

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100 font-sans antialiased select-none">
      
      {/* 📋 MENU LATERAL INDUSTRIAL FIXO (ESTILO HIGH-RELIEF DELPHI COM RELEVO MECÂNICO) */}
      <aside className="w-72 bg-gray-800 border-r border-gray-700 p-4 flex flex-col justify-between shadow-2xl flex-shrink-0 min-h-screen sticky top-0">
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
                className={`w-full flex items-center px-4 py-4 text-sm font-bold rounded-xl border-b-4 active:scale-98 transition-all text-left shadow-lg ${
                  paginaAtiva === item.id
                    ? 'bg-blue-600 text-white border-blue-800 shadow-inner'
                    : 'bg-gray-750 text-gray-300 border-gray-950 hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Botão inferior de escape para retornar à mesa central do tablet */}
        <button className="w-full py-4 bg-red-750 border-b-4 border-red-950 text-white font-black text-sm rounded-xl tracking-wider active:scale-95 transition-all shadow-md">
          🏠 VOLTAR AOS MÓDULOS TABLET
        </button>
      </aside>

      {/* 🌆 ESPAÇO DE TRABALHO DO WORKSPACE (RENDERIZAÇÃO AUTOMÁTICA DA SUB-PÁGINA) */}
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
