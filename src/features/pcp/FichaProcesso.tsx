/**
 * A rota legada de Ficha de Processo deve reutilizar o módulo canônico de
 * Engenharia, que mantém BOM, roteiro, recursos e planos de inspeção nas
 * tabelas reais do ERP. Evita uma segunda implementação incompatível com o
 * schema (`erp_pcp_roteiro_operacoes` / `erp_postos_trabalho`).
 */
export { default } from '../../pages/FichaEngenharia'
