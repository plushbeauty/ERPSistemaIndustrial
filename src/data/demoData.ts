export type ProductionVertical = 'INJECAO' | 'PRENSADOS'
export type MachineStatus = 'PRODUZINDO' | 'SETUP' | 'PARADA' | 'MANUTENCAO'
export interface MoldControl { id:string; codigo:string; descricao:string; cavidadesTotais:number; cavidadesAtivas:number; ciclosAtuais:number; vidaUtilCiclos:number; percentualVidaUtil:number; ultimaManutencao:string; status:'DISPONIVEL'|'EM_USO'|'MANUTENCAO' }
export interface SetupRecord { id:string; maquina:string; moldeOuEstampo:string; trocaMoldeMin:number; aquecimentoCanhaoMin:number; trocaCorMin:number; setupTotalMin:number; setupPadraoMin:number; status:'PROGRAMADO'|'EM_EXECUCAO'|'CONCLUIDO' }
export interface InjectionProduction { op:string; maquina:string; produto:string; cavidadesAtivas:number; cicloTeoricoSec:number; cicloRealSec:number; pecasBoas:number; pecasDefeituosas:number; galhosInjecao:number; refugoTotal:number }
export interface ToolLifeRecord { codigo:string; tipo:'ESTAMPO'|'FACA'; prensa:string; golpesAtuais:number; golpesLimite:number; percentualVidaUtil:number; status:'NORMAL'|'AFIAR_EM_BREVE'|'BLOQUEADO' }
export interface CoilConsumption { op:string; bobina:string; material:string; pesoInicialKg:number; consumoKg:number; consumoMetros:number; retalhoKg:number; sucataKg:number }
export interface ProductionQueueItem { op:string; prioridade:number; maquina:string; produto:string; quantidade:number; quantidadeProduzida:number; setupMin:number; cicloSec:number; status:'AGUARDANDO'|'PROGRAMADA'|'EM_PRODUCAO'|'ATRASADA' }
export interface BlockKEntry { registro:'K200'|'K230'; periodo:string; codigoItem:string; descricao:string; quantidade:number; unidade:string; op?:string }
export const demoMoldes:MoldControl[]=[
{id:'M-001',codigo:'MOL-001',descricao:'Tampa técnica 4 cavidades',cavidadesTotais:4,cavidadesAtivas:4,ciclosAtuais:184200,vidaUtilCiclos:500000,percentualVidaUtil:36.84,ultimaManutencao:'2026-09-12',status:'EM_USO'},
{id:'M-014',codigo:'MOL-014',descricao:'Carcaça ABS 8 cavidades',cavidadesTotais:8,cavidadesAtivas:7,ciclosAtuais:392800,vidaUtilCiclos:500000,percentualVidaUtil:78.56,ultimaManutencao:'2026-08-30',status:'EM_USO'},
{id:'M-021',codigo:'MOL-021',descricao:'Componente PP 2 cavidades',cavidadesTotais:2,cavidadesAtivas:2,ciclosAtuais:74200,vidaUtilCiclos:300000,percentualVidaUtil:24.73,ultimaManutencao:'2026-09-04',status:'DISPONIVEL'}]
export const demoSetups:SetupRecord[]=[
{id:'SET-101',maquina:'Injetora 03',moldeOuEstampo:'MOL-001',trocaMoldeMin:42,aquecimentoCanhaoMin:18,trocaCorMin:12,setupTotalMin:72,setupPadraoMin:65,status:'EM_EXECUCAO'},
{id:'SET-102',maquina:'Injetora 05',moldeOuEstampo:'MOL-014',trocaMoldeMin:55,aquecimentoCanhaoMin:20,trocaCorMin:16,setupTotalMin:91,setupPadraoMin:80,status:'PROGRAMADO'}]
export const demoInjection:InjectionProduction[]=[
{op:'OP-0480',maquina:'Injetora 03',produto:'Tampa técnica',cavidadesAtivas:4,cicloTeoricoSec:21.5,cicloRealSec:22.4,pecasBoas:8420,pecasDefeituosas:148,galhosInjecao:74,refugoTotal:222},
{op:'OP-0491',maquina:'Injetora 05',produto:'Carcaça ABS',cavidadesAtivas:7,cicloTeoricoSec:29,cicloRealSec:30.8,pecasBoas:5160,pecasDefeituosas:96,galhosInjecao:41,refugoTotal:137}]
export const demoTools:ToolLifeRecord[]=[
{codigo:'EST-021',tipo:'ESTAMPO',prensa:'Prensa 01',golpesAtuais:384000,golpesLimite:500000,percentualVidaUtil:76.8,status:'AFIAR_EM_BREVE'},
{codigo:'FAC-014',tipo:'FACA',prensa:'Prensa 02',golpesAtuais:128000,golpesLimite:300000,percentualVidaUtil:42.67,status:'NORMAL'}]
export const demoCoils:CoilConsumption[]=[
{op:'OP-0512',bobina:'BOB-26091',material:'Aço SAE 1020 1,20 mm',pesoInicialKg:1250,consumoKg:982,consumoMetros:1840,retalhoKg:38,sucataKg:24},
{op:'OP-0520',bobina:'BOB-26102',material:'Aço galvanizado 0,90 mm',pesoInicialKg:980,consumoKg:744,consumoMetros:1625,retalhoKg:31,sucataKg:19}]
export const demoProductionQueue:ProductionQueueItem[]=[
{op:'OP-0480',prioridade:1,maquina:'Injetora 03',produto:'Tampa técnica',quantidade:10000,quantidadeProduzida:8420,setupMin:72,cicloSec:22.4,status:'EM_PRODUCAO'},
{op:'OP-0491',prioridade:2,maquina:'Injetora 05',produto:'Carcaça ABS',quantidade:8000,quantidadeProduzida:5160,setupMin:91,cicloSec:30.8,status:'PROGRAMADA'},
{op:'OP-0512',prioridade:1,maquina:'Prensa 01',produto:'Suporte estampado',quantidade:12000,quantidadeProduzida:9400,setupMin:38,cicloSec:4.8,status:'EM_PRODUCAO'},
{op:'OP-0520',prioridade:3,maquina:'Prensa 02',produto:'Chapa conformada',quantidade:7000,quantidadeProduzida:0,setupMin:46,cicloSec:5.2,status:'AGUARDANDO'}]
export const demoBlockK:BlockKEntry[]=[
{registro:'K200',periodo:'09/2026',codigoItem:'MP-ABS-001',descricao:'Resina ABS natural',quantidade:1280,unidade:'KG'},
{registro:'K200',periodo:'09/2026',codigoItem:'CH-1020-120',descricao:'Aço SAE 1020 1,20 mm',quantidade:2680,unidade:'KG'},
{registro:'K230',periodo:'09/2026',codigoItem:'PA-001',descricao:'Tampa técnica',quantidade:8420,unidade:'UN',op:'OP-0480'},
{registro:'K230',periodo:'09/2026',codigoItem:'PA-014',descricao:'Suporte estampado',quantidade:9400,unidade:'UN',op:'OP-0512'}]
export const demoOee={disponibilidade:91.2,performance:95.4,qualidade:98.1,oee:85.5}
