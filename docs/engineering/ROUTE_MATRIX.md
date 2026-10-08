# ROUTE MATRIX

| Módulo | Rota | Componente | Auth/RBAC | Status |
|---|---|---|---|---|
| M01 Acesso | /login | IndustrialLoginDirect | Supabase Auth | VALIDAR |
| M02 Organizações | /configuracoes-adm | ConfiguracoesADM | ERP auth | VALIDAR |
| M03 Permissões | /configuracoes-adm | ConfiguracoesADM | users.read | VALIDAR |
| M04 Dashboard | /erp-industrial | AppIndustrial | ERP auth | EXISTENTE |
| M05 Ocorrências | /qualidade/rnc | QualidadeRNC | audit.read | VALIDAR |
| M06 Não Conformidades | /qualidade/rnc | QualidadeRNC | audit.read | VALIDAR |
| M07 Ações 5W2H | /qualidade/metodologia-8d | QualidadeMetodologia8D | audit.read | VALIDAR |
| M08 Causa Raiz | /qualidade/metodologia-8d | QualidadeMetodologia8D | audit.read | VALIDAR |
| M09 Evidências | /documentos-qualidade | DocumentosQualidadeControle | audit.read | VALIDAR |
| M10 Aprovações | — | — | — | NÃO COMPROVADO |
| M11 Eficácia | /qualidade/rnc | QualidadeRNC | audit.read | VALIDAR |
| M12 Notificações | — | — | — | NÃO COMPROVADO |
| M13 Auditorias | /qualidade/auditoria-5s | QualidadeAuditoria5S | audit.read | VALIDAR |
| M14 Documentos | /documentos-qualidade | DocumentosQualidadeControle | audit.read | VALIDAR |
| M15 Indicadores | /pcp/dashboard-oee | PCPDashboardOEE | — | VALIDAR |
| M16 Riscos | /qualidade/pfmea | QualidadePFMEA | — | VALIDAR |
| M17 Fornecedores | /fornecedores | FornecedoresIndustrial | purchases.read | VALIDAR |
| M18 Treinamentos | /rh | RHIndustrial | — | VALIDAR |
| M19 Calibração | /calibracao | CalibracaoIndustrial | — | VALIDAR |
| M20 Relatórios | /qualidade/relatorios-documentos | QualidadeRelatoriosDocumentos | audit.read | VALIDAR |
| M21 Configurações | /configuracoes-adm | ConfiguracoesADM | users.read | VALIDAR |
| M22 Auditoria Sistema | /admin/logs | AdminLogs | users.read/audit | VALIDAR |

Rotas são estado de auditoria, não autorização para inventar endpoints.
